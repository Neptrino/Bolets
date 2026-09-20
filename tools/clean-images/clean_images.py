#!/usr/bin/env python3
"""
clean_images.py — batch removal of AI-generation microtexture from illustrations.

Image generators leave a faint, uniform grain (mottling / paper-like speckle)
across surfaces that should be perfectly smooth: flat fills and soft gradients.
This tool removes that grain deterministically with OpenCV while keeping crisp
silhouettes, large-scale shading, colours, alpha and dimensions intact.

Pipeline (per image)
--------------------
1. Decode (PNG / JPG / JPEG / WebP), apply EXIF orientation, split alpha off.
2. Bilateral filter on the colour channels (edge-preserving denoise).
3. Optional resample: INTER_AREA downscale then INTER_CUBIC upscale back to the
   original size. Kills stubborn high-frequency texture the bilateral filter
   leaves behind.
4. Optional second, lighter bilateral pass to mop up interpolation ripple.
5. Edge protection: pixels on strong colour/alpha edges are taken from the
   bilateral-only result so the resample step cannot soften or ring them.
6. Re-attach the untouched alpha and write a lossless PNG (default).

All tunables live in `PipelineConfig`; the three presets live in `PRESETS`.

Usage examples
--------------
    python clean_images.py ./input ./output --preset medium --recursive
    python clean_images.py picture.png ./output --preset light
    python clean_images.py ./input ./output --sigma-color 20 --no-resample
    python clean_images.py ./input ./output --dry-run --recursive
"""

from __future__ import annotations

import argparse
import dataclasses
import logging
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass, replace
from enum import Enum
from pathlib import Path
from typing import Iterable, Iterator, Optional, Sequence

import cv2
import numpy as np
from tqdm import tqdm

try:  # Pillow is only used to read EXIF orientation; decoding is done by OpenCV.
    from PIL import Image as _PILImage
except ImportError:  # pragma: no cover - requirements.txt installs Pillow
    _PILImage = None  # type: ignore[assignment]

log = logging.getLogger("clean_images")

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

SUPPORTED_EXTENSIONS: frozenset[str] = frozenset({".png", ".jpg", ".jpeg", ".webp"})
OUTPUT_FORMATS: tuple[str, ...] = ("png", "webp")


@dataclass(frozen=True)
class PipelineConfig:
    """Every knob of the cleaning pipeline in one place.

    Parameter notes (sigma values are expressed in 8-bit intensity levels, even
    for 16-bit inputs, which are normalised to that range before filtering):

    bilateral_d       Pixel diameter of the neighbourhood. Larger = smoother flat
                      areas but slower (cost grows ~d²). Odd values work best.
    sigma_color       How different two colours may be and still average
                      together. Generated grain is only a few levels deep, so
                      even 8 removes most of it; anything above ~30 starts to
                      eat soft shading steps and anti-aliased edges.
    sigma_space       Spatial falloff inside the neighbourhood. Kept smaller than
                      d/2 so the filter stays local and does not smear shading.
    resample          Enable the INTER_AREA down / INTER_CUBIC up round trip.
    downscale_factor  Intermediate size as a fraction of the original (0.5 = half
                      width and height). INTER_AREA box-averages the texture away;
                      values below ~0.4 visibly soften small details.
    second_pass       Run a lighter bilateral pass after resampling to remove the
                      faint ripple cubic interpolation can introduce.
    second_*          Parameters of that lighter pass.
    edge_protect      Blend the bilateral-only result back in on strong edges so
                      resampling cannot blur or halo silhouettes.
    edge_low/high     Gradient magnitude (Sobel, 8-bit levels) where protection
                      starts (weight 0) and is complete (weight 1).
    edge_dilate       Pixels to grow the protected zone so the whole anti-aliased
                      transition is covered, not just its centre line.
    """

    bilateral_d: int = 9
    sigma_color: float = 14.0
    sigma_space: float = 5.0

    resample: bool = True
    downscale_factor: float = 0.5
    upscale_interpolation: int = cv2.INTER_CUBIC

    second_pass: bool = True
    second_d: int = 5
    second_sigma_color: float = 8.0
    second_sigma_space: float = 3.0

    edge_protect: bool = True
    edge_low: float = 10.0
    edge_high: float = 40.0
    edge_dilate: int = 2

    def validate(self) -> None:
        if self.bilateral_d < 1:
            raise ValueError("bilateral diameter must be >= 1")
        if self.sigma_color <= 0 or self.sigma_space <= 0:
            raise ValueError("sigmaColor and sigmaSpace must be > 0")
        if self.resample and not (0.05 <= self.downscale_factor < 1.0):
            raise ValueError("downscale factor must be in [0.05, 1.0)")
        if self.second_pass and (
            self.second_d < 1 or self.second_sigma_color <= 0 or self.second_sigma_space <= 0
        ):
            raise ValueError("second-pass parameters must be positive")
        if self.edge_protect and self.edge_high <= self.edge_low:
            raise ValueError("edge-high must be greater than edge-low")


# Presets. Values were chosen against generated illustrations whose grain has a
# standard deviation of roughly 1–3 levels while real edges differ by 30+ levels:
# a range sigma of 8–24 therefore averages the grain while leaving edges alone.
PRESETS: dict[str, PipelineConfig] = {
    # Minimal smoothing: one small bilateral pass, no resampling. Removes the
    # finest speckle only; hairline strokes and tiny highlights survive intact.
    "light": PipelineConfig(
        bilateral_d=5,
        sigma_color=8.0,
        sigma_space=3.0,
        resample=False,
        second_pass=False,
        edge_protect=False,
    ),
    # Default for typical generated illustrations: a medium bilateral pass, a
    # half-size INTER_AREA round trip to flatten persistent texture, and a
    # light clean-up pass. Silhouettes are protected from the resample blur.
    "medium": PipelineConfig(
        bilateral_d=9,
        sigma_color=14.0,
        sigma_space=5.0,
        resample=True,
        downscale_factor=0.5,
        second_pass=True,
        second_d=5,
        second_sigma_color=8.0,
        second_sigma_space=3.0,
        edge_protect=True,
    ),
    # Vector-like artwork: wide bilateral window with a generous range sigma so
    # flat fills become truly flat, a 0.4× round trip, and a heavier second
    # pass. Edge protection keeps outlines crisp despite the aggressive blur.
    "strong": PipelineConfig(
        bilateral_d=15,
        sigma_color=24.0,
        sigma_space=8.0,
        resample=True,
        downscale_factor=0.4,
        second_pass=True,
        second_d=7,
        second_sigma_color=12.0,
        second_sigma_space=5.0,
        edge_protect=True,
        edge_low=12.0,
        edge_high=48.0,
        edge_dilate=3,
    ),
}


@dataclass(frozen=True)
class OutputOptions:
    """How results are written."""

    fmt: str = "png"  # one of OUTPUT_FORMATS
    png_compression: int = 3  # 0 (fast, big) … 9 (slow, small); all lossless
    # 101 selects WebP's lossless encoder. Values <= 100 are lossy and, on a
    # de-grained illustration, reintroduce block/ringing texture in exactly the
    # flat areas this tool just cleaned, so lossless is the default.
    webp_quality: int = 101
    suffix: str = ""  # appended to the stem, e.g. "_clean"
    overwrite: bool = False  # replace existing files in the output location
    allow_in_place: bool = False  # permit output path == source path


# --------------------------------------------------------------------------- #
# Image I/O
# --------------------------------------------------------------------------- #


def _read_exif_orientation(path: Path) -> int:
    """Return the EXIF orientation tag (1–8), or 1 when absent/unreadable."""
    if _PILImage is None:
        return 1
    try:
        with _PILImage.open(path) as im:  # lazy: headers only, no pixel decode
            return int(im.getexif().get(0x0112, 1))
    except Exception:  # noqa: BLE001 - any metadata problem just means "no rotation"
        return 1


def _apply_orientation(img: np.ndarray, orientation: int) -> np.ndarray:
    """Physically rotate/flip pixels so the output needs no EXIF tag."""
    if orientation == 2:
        return cv2.flip(img, 1)
    if orientation == 3:
        return cv2.rotate(img, cv2.ROTATE_180)
    if orientation == 4:
        return cv2.flip(img, 0)
    if orientation == 5:
        return cv2.transpose(img)
    if orientation == 6:
        return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    if orientation == 7:
        return cv2.rotate(cv2.transpose(img), cv2.ROTATE_180)
    if orientation == 8:
        return cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return img


def load_image(path: Path) -> np.ndarray:
    """Decode an image with OpenCV keeping alpha and bit depth, EXIF-corrected.

    Returns an array of shape (H, W), (H, W, 3) or (H, W, 4) in BGR(A) order.
    `imdecode` from a byte buffer is used instead of `imread` so non-ASCII paths
    work on every platform.
    """
    buffer = np.fromfile(str(path), dtype=np.uint8)
    if buffer.size == 0:
        raise ValueError("empty file")
    img = cv2.imdecode(buffer, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError("OpenCV could not decode the file")
    if img.ndim == 3 and img.shape[2] == 2:  # grey + alpha: expand to BGRA
        grey, alpha = img[..., 0], img[..., 1]
        img = np.dstack((grey, grey, grey, alpha))
    # IMREAD_UNCHANGED deliberately ignores EXIF orientation, so apply it here.
    return _apply_orientation(img, _read_exif_orientation(path))


def encode_image(img: np.ndarray, options: OutputOptions) -> bytes:
    """Encode losslessly in the requested container."""
    if options.fmt == "png":
        params = [cv2.IMWRITE_PNG_COMPRESSION, int(options.png_compression)]
        ext = ".png"
    elif options.fmt == "webp":
        # WebP only stores 8-bit; quality 101 selects the lossless encoder.
        if img.dtype != np.uint8:
            img = _to_uint8(img)
        params = [cv2.IMWRITE_WEBP_QUALITY, int(options.webp_quality)]
        ext = ".webp"
    else:
        raise ValueError(f"unsupported output format: {options.fmt}")
    ok, encoded = cv2.imencode(ext, img, params)
    if not ok:
        raise RuntimeError(f"encoding as {options.fmt} failed")
    return encoded.tobytes()


def _to_uint8(img: np.ndarray) -> np.ndarray:
    if img.dtype == np.uint16:
        return (img.astype(np.float32) / 257.0 + 0.5).astype(np.uint8)
    if img.dtype in (np.float32, np.float64):
        return np.clip(img * 255.0 + 0.5, 0, 255).astype(np.uint8)
    return img.astype(np.uint8)


# --------------------------------------------------------------------------- #
# Filtering
# --------------------------------------------------------------------------- #


def _split_alpha(img: np.ndarray) -> tuple[np.ndarray, Optional[np.ndarray]]:
    """Separate colour from alpha. Alpha is returned as-is (never filtered)."""
    if img.ndim == 2:
        return img, None
    channels = img.shape[2]
    if channels == 3:
        return img, None
    if channels == 4:
        # One contiguous copy of the colour planes is unavoidable: OpenCV needs a
        # packed array. Alpha stays a zero-copy view of the original buffer.
        return np.ascontiguousarray(img[..., :3]), img[..., 3]
    raise ValueError(f"unsupported channel count: {channels}")


def _edge_weight(color: np.ndarray, alpha: Optional[np.ndarray], cfg: PipelineConfig) -> np.ndarray:
    """Soft mask in [0, 1]: 1 on strong edges, 0 on smooth surfaces.

    Computed from the *bilateral-filtered* colour (already grain-free, so the
    grain itself never registers as an edge) plus the alpha channel, so cut-out
    silhouettes are protected even when the colour on both sides is similar.
    """
    grey = cv2.cvtColor(color, cv2.COLOR_BGR2GRAY) if color.ndim == 3 else color
    gx = cv2.Sobel(grey, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(grey, cv2.CV_32F, 0, 1, ksize=3)
    mag = cv2.magnitude(gx, gy)
    if alpha is not None:
        a = alpha.astype(np.float32)
        if alpha.dtype == np.uint16:
            a /= 257.0
        ax = cv2.Sobel(a, cv2.CV_32F, 1, 0, ksize=3)
        ay = cv2.Sobel(a, cv2.CV_32F, 0, 1, ksize=3)
        cv2.max(mag, cv2.magnitude(ax, ay), dst=mag)
    # Sobel ksize=3 sums to 4× the per-pixel step; normalise to intensity levels.
    mag *= 0.25
    weight = (mag - cfg.edge_low) / (cfg.edge_high - cfg.edge_low)
    np.clip(weight, 0.0, 1.0, out=weight)
    if cfg.edge_dilate > 0:
        k = 2 * cfg.edge_dilate + 1
        weight = cv2.dilate(weight, np.ones((k, k), np.uint8))
        # Feather the mask so there is no visible seam between the two sources.
        weight = cv2.GaussianBlur(weight, (0, 0), cfg.edge_dilate * 0.75)
    return weight


def clean_color(color: np.ndarray, alpha: Optional[np.ndarray], cfg: PipelineConfig) -> np.ndarray:
    """Run the microtexture-removal pipeline on colour channels only.

    `color` is uint8 or uint16 (BGR or grey). 16-bit data is filtered in float32
    scaled to 0–255 so sigma values mean the same thing at every bit depth.
    """
    src_dtype = color.dtype
    if src_dtype == np.uint8:
        work = color
    elif src_dtype == np.uint16:
        work = color.astype(np.float32) * (1.0 / 257.0)
    else:
        raise ValueError(f"unsupported pixel type: {src_dtype}")

    # 1) Edge-preserving denoise. With a range sigma a few times larger than the
    #    grain amplitude, flat areas average out while colour steps are kept.
    smoothed = cv2.bilateralFilter(work, cfg.bilateral_d, cfg.sigma_color, cfg.sigma_space)
    result = smoothed

    # 2) Optional resample round trip. INTER_AREA is a box filter, so texture at
    #    the pixel scale is averaged out completely; INTER_CUBIC brings the
    #    image back at full size without the blockiness of nearest/linear.
    if cfg.resample:
        h, w = smoothed.shape[:2]
        small_w = max(1, int(round(w * cfg.downscale_factor)))
        small_h = max(1, int(round(h * cfg.downscale_factor)))
        small = cv2.resize(smoothed, (small_w, small_h), interpolation=cv2.INTER_AREA)
        result = cv2.resize(small, (w, h), interpolation=cfg.upscale_interpolation)

        # 3) Lighter follow-up pass to remove cubic interpolation ripple.
        if cfg.second_pass:
            result = cv2.bilateralFilter(
                result, cfg.second_d, cfg.second_sigma_color, cfg.second_sigma_space
            )

        # 4) Edge protection: cubic upscaling overshoots (halos) and softens
        #    steps. Where the bilateral output has a real edge, use it instead.
        if cfg.edge_protect:
            weight = _edge_weight(smoothed, alpha, cfg)
            if result.ndim == 3:
                weight = weight[..., None]
            res_f = result.astype(np.float32, copy=False)
            smo_f = smoothed.astype(np.float32, copy=False)
            blended = res_f + weight * (smo_f - res_f)
            result = blended if src_dtype != np.uint8 else np.clip(blended + 0.5, 0, 255).astype(np.uint8)
    elif cfg.second_pass:
        # Second pass without resampling is still meaningful for stubborn grain.
        result = cv2.bilateralFilter(result, cfg.second_d, cfg.second_sigma_color, cfg.second_sigma_space)

    if src_dtype == np.uint16:
        result = np.clip(result * 257.0 + 0.5, 0, 65535).astype(np.uint16)
    return result


def clean_image(img: np.ndarray, cfg: PipelineConfig) -> np.ndarray:
    """Full per-image pipeline: split alpha, clean colour, reattach alpha."""
    color, alpha = _split_alpha(img)
    cleaned = clean_color(color, alpha, cfg)
    if alpha is None:
        return cleaned
    return np.dstack((cleaned, alpha))  # alpha copied verbatim, bit-exact


# --------------------------------------------------------------------------- #
# Job planning
# --------------------------------------------------------------------------- #


class Status(str, Enum):
    PROCESSED = "processed"
    SKIPPED = "skipped"
    FAILED = "failed"


@dataclass(frozen=True)
class Job:
    source: Path
    destination: Path


@dataclass(frozen=True)
class Result:
    job: Job
    status: Status
    message: str = ""


def iter_source_files(root: Path, recursive: bool) -> Iterator[Path]:
    """Yield supported image files under `root` in a stable order."""
    if root.is_file():
        yield root
        return
    pattern = "**/*" if recursive else "*"
    for path in sorted(root.glob(pattern)):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


def destination_for(source: Path, input_root: Path, output_root: Path, options: OutputOptions) -> Path:
    """Mirror the input directory structure under the output root.

    JPEG sources become PNG (lossless) rather than being recompressed.
    A single-file input may target either a directory or an explicit file path.
    """
    ext = "." + options.fmt
    if input_root.is_file():
        if output_root.suffix.lower() in {".png", ".webp"}:
            return output_root  # explicit output filename
        return output_root / f"{source.stem}{options.suffix}{ext}"
    relative = source.relative_to(input_root)
    return output_root / relative.with_name(f"{relative.stem}{options.suffix}{ext}")


def plan_jobs(
    input_root: Path, output_root: Path, recursive: bool, options: OutputOptions
) -> tuple[list[Job], list[Result]]:
    """Build the job list and pre-compute skips so the summary is accurate."""
    jobs: list[Job] = []
    skipped: list[Result] = []
    for source in iter_source_files(input_root, recursive):
        dest = destination_for(source, input_root, output_root, options)
        job = Job(source, dest)
        try:
            same_file = dest.resolve() == source.resolve()
        except OSError:
            same_file = False
        if same_file and not options.allow_in_place:
            skipped.append(Result(job, Status.SKIPPED, "output would overwrite the source (use --allow-in-place)"))
        elif dest.exists() and not options.overwrite and not same_file:
            skipped.append(Result(job, Status.SKIPPED, "output exists (use --overwrite)"))
        else:
            jobs.append(job)
    return jobs, skipped


# --------------------------------------------------------------------------- #
# Execution
# --------------------------------------------------------------------------- #


def process_job(job: Job, cfg: PipelineConfig, options: OutputOptions) -> Result:
    """Load → clean → write one image. Never raises; failures become Results."""
    try:
        img = load_image(job.source)
        cleaned = clean_image(img, cfg)
        assert cleaned.shape[:2] == img.shape[:2], "dimensions changed"
        payload = encode_image(cleaned, options)
        job.destination.parent.mkdir(parents=True, exist_ok=True)
        # Write to a sibling temp file and rename so an interrupted run never
        # leaves a truncated output (and an in-place source is replaced atomically).
        tmp = job.destination.with_name(job.destination.name + ".tmp")
        with open(tmp, "wb") as fh:
            fh.write(payload)
        os.replace(tmp, job.destination)
        return Result(job, Status.PROCESSED)
    except Exception as exc:  # noqa: BLE001 - report and keep the batch going
        return Result(job, Status.FAILED, f"{type(exc).__name__}: {exc}")


def _worker_init(threads: int) -> None:
    """Limit OpenCV's internal threading so N processes do not oversubscribe."""
    cv2.setNumThreads(max(1, threads))


def run_jobs(jobs: Sequence[Job], cfg: PipelineConfig, options: OutputOptions, workers: int) -> list[Result]:
    results: list[Result] = []
    bar = tqdm(total=len(jobs), unit="img", dynamic_ncols=True, disable=not jobs)

    def record(result: Result) -> None:
        results.append(result)
        if result.status is Status.FAILED:
            tqdm.write(f"FAILED  {result.job.source}: {result.message}")
        bar.update(1)

    if workers <= 1:
        for job in jobs:
            record(process_job(job, cfg, options))
    else:
        cpu = os.cpu_count() or 1
        per_worker = max(1, cpu // workers)
        with ProcessPoolExecutor(max_workers=workers, initializer=_worker_init, initargs=(per_worker,)) as pool:
            futures = {pool.submit(process_job, job, cfg, options): job for job in jobs}
            for future in as_completed(futures):
                try:
                    record(future.result())
                except Exception as exc:  # noqa: BLE001 - worker crashed hard
                    record(Result(futures[future], Status.FAILED, f"worker error: {exc}"))
    bar.close()
    return results


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="clean_images.py",
        description="Remove AI-generation microtexture from illustrations (deterministic, OpenCV).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("input", type=Path, help="input directory or a single image file")
    parser.add_argument("output", type=Path, help="output directory (or output file for a single image)")
    parser.add_argument("--preset", choices=sorted(PRESETS), default="medium", help="base parameter set")
    parser.add_argument("-r", "--recursive", action="store_true", help="descend into subdirectories, mirroring the tree")

    f = parser.add_argument_group("filter overrides (default: value from the preset)")
    f.add_argument("--diameter", type=int, metavar="D", help="bilateral neighbourhood diameter in pixels")
    f.add_argument("--sigma-color", type=float, metavar="S", help="bilateral range sigma (8-bit levels)")
    f.add_argument("--sigma-space", type=float, metavar="S", help="bilateral spatial sigma (pixels)")
    f.add_argument("--downscale-factor", type=float, metavar="F", help="resample intermediate scale, e.g. 0.5")
    g = f.add_mutually_exclusive_group()
    g.add_argument("--resample", dest="resample", action="store_true", default=None, help="enable the down/upscale round trip")
    g.add_argument("--no-resample", dest="resample", action="store_false", help="disable the down/upscale round trip")
    g2 = f.add_mutually_exclusive_group()
    g2.add_argument("--second-pass", dest="second_pass", action="store_true", default=None, help="enable the lighter second bilateral pass")
    g2.add_argument("--no-second-pass", dest="second_pass", action="store_false", help="disable the second pass")
    f.add_argument("--second-diameter", type=int, metavar="D", help="second-pass diameter")
    f.add_argument("--second-sigma-color", type=float, metavar="S", help="second-pass range sigma")
    f.add_argument("--second-sigma-space", type=float, metavar="S", help="second-pass spatial sigma")
    g3 = f.add_mutually_exclusive_group()
    g3.add_argument("--edge-protect", dest="edge_protect", action="store_true", default=None, help="keep bilateral-only pixels on strong edges")
    g3.add_argument("--no-edge-protect", dest="edge_protect", action="store_false", help="disable edge protection")
    f.add_argument("--edge-low", type=float, metavar="T", help="gradient where edge protection starts")
    f.add_argument("--edge-high", type=float, metavar="T", help="gradient where edge protection is total")

    o = parser.add_argument_group("output")
    o.add_argument("--format", choices=OUTPUT_FORMATS, default="png", help="output container (both lossless by default)")
    o.add_argument("--png-compression", type=int, default=3, choices=range(0, 10), metavar="0-9", help="PNG zlib level")
    o.add_argument(
        "--webp-quality",
        type=int,
        default=101,
        choices=range(1, 102),
        metavar="1-101",
        help="101 = lossless (recommended); lower values are lossy and reintroduce texture in flat areas",
    )
    o.add_argument("--suffix", default="", help="text appended to output file names, e.g. _clean")
    o.add_argument("--overwrite", action="store_true", help="replace existing files in the output location")
    o.add_argument("--allow-in-place", action="store_true", help="permit writing over the source file itself")

    x = parser.add_argument_group("execution")
    x.add_argument("--workers", type=int, default=1, help="parallel processes (1 = single process, OpenCV threads only)")
    x.add_argument("--dry-run", action="store_true", help="list what would be written without processing")
    x.add_argument("-v", "--verbose", action="store_true", help="debug logging")
    return parser


def config_from_args(args: argparse.Namespace) -> PipelineConfig:
    """Start from the preset and apply any explicit CLI overrides."""
    overrides = {
        "bilateral_d": args.diameter,
        "sigma_color": args.sigma_color,
        "sigma_space": args.sigma_space,
        "downscale_factor": args.downscale_factor,
        "resample": args.resample,
        "second_pass": args.second_pass,
        "second_d": args.second_diameter,
        "second_sigma_color": args.second_sigma_color,
        "second_sigma_space": args.second_sigma_space,
        "edge_protect": args.edge_protect,
        "edge_low": args.edge_low,
        "edge_high": args.edge_high,
    }
    cfg = replace(PRESETS[args.preset], **{k: v for k, v in overrides.items() if v is not None})
    cfg.validate()
    return cfg


def describe_config(cfg: PipelineConfig) -> str:
    fields = dataclasses.asdict(cfg)
    fields["upscale_interpolation"] = {cv2.INTER_CUBIC: "INTER_CUBIC", cv2.INTER_LANCZOS4: "INTER_LANCZOS4", cv2.INTER_LINEAR: "INTER_LINEAR"}.get(
        cfg.upscale_interpolation, str(cfg.upscale_interpolation)
    )
    return ", ".join(f"{k}={v}" for k, v in fields.items())


def print_summary(results: Iterable[Result], elapsed: float) -> None:
    counts = {status: 0 for status in Status}
    for r in results:
        counts[r.status] += 1
    print()
    print("Summary")
    print(f"  processed : {counts[Status.PROCESSED]}")
    print(f"  skipped   : {counts[Status.SKIPPED]}")
    print(f"  failed    : {counts[Status.FAILED]}")
    print(f"  elapsed   : {elapsed:.1f}s")


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(levelname)s %(message)s")

    input_root: Path = args.input
    output_root: Path = args.output
    if not input_root.exists():
        log.error("input path does not exist: %s", input_root)
        return 2
    if input_root.is_file() and input_root.suffix.lower() not in SUPPORTED_EXTENSIONS:
        log.error("unsupported file type: %s (supported: %s)", input_root.suffix, ", ".join(sorted(SUPPORTED_EXTENSIONS)))
        return 2

    try:
        cfg = config_from_args(args)
    except ValueError as exc:
        log.error("invalid configuration: %s", exc)
        return 2
    options = OutputOptions(
        fmt=args.format,
        png_compression=args.png_compression,
        webp_quality=args.webp_quality,
        suffix=args.suffix,
        overwrite=args.overwrite,
        allow_in_place=args.allow_in_place,
    )
    log.info("preset=%s  %s", args.preset, describe_config(cfg))

    started = time.perf_counter()
    jobs, skipped = plan_jobs(input_root, output_root, args.recursive, options)
    for r in skipped:
        log.debug("skip %s: %s", r.job.source, r.message)
    if not jobs and not skipped:
        log.warning("no supported images found under %s", input_root)

    if args.dry_run:
        for job in jobs:
            print(f"{job.source}  ->  {job.destination}")
        for r in skipped:
            print(f"{r.job.source}  --  skipped: {r.message}")
        print_summary(skipped, time.perf_counter() - started)
        print(f"  (dry run: {len(jobs)} image(s) would be processed)")
        return 0

    results = run_jobs(jobs, cfg, options, max(1, args.workers))
    results.extend(skipped)
    print_summary(results, time.perf_counter() - started)
    return 1 if any(r.status is Status.FAILED for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
