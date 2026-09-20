# clean-images

Batch tool that removes the faint, uniform microtexture (mottling, speckle,
paper grain) that image-generation models leave on illustrations, without
touching silhouettes, large-scale shading, colours, alpha or dimensions.

Everything is deterministic OpenCV + NumPy. No generative model is involved.

## What it does to each image

1. Decodes PNG, JPG, JPEG or WebP, applies the EXIF orientation physically and
   splits the alpha channel off. Alpha is never filtered and is written back
   bit-exact.
2. Bilateral filter on the colour channels. The range sigma is a few times the
   grain amplitude, so flat and gradient areas average out while real colour
   steps are kept.
3. Optional resample round trip: `INTER_AREA` downscale, then `INTER_CUBIC`
   back to the original size. The box averaging removes pixel-scale texture the
   bilateral pass leaves behind.
4. Optional second, lighter bilateral pass to remove interpolation ripple.
5. Edge protection: on strong colour or alpha edges the bilateral-only pixels
   are blended back in, so the resample step cannot soften or halo outlines.
6. Writes a lossless PNG (default) or lossless WebP. JPEG input becomes PNG
   rather than being recompressed.

## Installation

Python 3.10 or newer.

```bash
cd tools/clean-images
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Usage

```bash
# A directory, mirrored recursively into ./output
python clean_images.py ./input ./output --preset medium --recursive

# A single image into a directory (or give an explicit .png/.webp path)
python clean_images.py illustration.png ./output --preset light
python clean_images.py illustration.png ./output/illustration-clean.png

# Override any preset value
python clean_images.py ./input ./output --preset strong --sigma-color 20 --no-resample

# See what would happen first
python clean_images.py ./input ./output --recursive --dry-run

# Use four processes for a large batch
python clean_images.py ./input ./output --recursive --workers 4

# Strong cleaning written as lossless WebP (about 3x smaller than PNG)
python clean_images.py ./input ./output --preset strong --format webp --recursive
```

Existing output files are skipped unless `--overwrite` is given. The tool
refuses to write over a source file unless `--allow-in-place` is given as well.

At the end it prints how many images were processed, skipped and failed, and the
elapsed time. Exit status is 1 if any image failed.

## Presets

| preset | bilateral (d / σcolor / σspace) | resample | second pass | edge protect | intended for |
|--------|---------------------------------|----------|-------------|--------------|--------------|
| light  | 5 / 8 / 3   | off       | off          | off | keep every fine detail, remove only the finest speckle |
| medium | 9 / 14 / 5  | 0.5×      | 5 / 8 / 3    | on  | typical generated illustrations (default) |
| strong | 15 / 24 / 8 | 0.4×      | 7 / 12 / 5   | on  | flat, vector-like artwork where all grain must go |

All preset values live in the `PRESETS` dictionary in `clean_images.py`, built
from the `PipelineConfig` dataclass. Add a new preset by adding one entry.

## Tuning guide

- **`--sigma-color`** is the main lever. Measure the grain: a high-pass residual
  standard deviation of about 1 to 3 levels needs a sigma of roughly 8 to 20.
  Above about 30 the filter starts to flatten soft shading steps and
  anti-aliased edges.
- **`--diameter`** widens the averaging window. Bigger values flatten large
  areas more completely but cost roughly d² time.
- **`--sigma-space`** should stay below half the diameter so the filter remains
  local and does not smear gradients.
- **`--downscale-factor`** below about 0.4 starts to soften small details even
  with edge protection on.
- **`--edge-low` / `--edge-high`** set the Sobel gradient (in 8-bit levels)
  where edge protection starts and where it is total. Lower them if outlines
  look soft, raise them if you see grain surviving next to edges.
- **`--no-edge-protect`** disables the blend entirely if you want the pure
  resample result.

Run `python clean_images.py --help` for the full list of flags.

## Output format and file size

Both output containers are lossless by default. On a cleaned 2048 px
illustration with alpha, lossless WebP is roughly a third the size of PNG:

| output | size |
|---|---|
| PNG (`--png-compression 3`) | 1.91 MB |
| PNG (`--png-compression 9`) | 1.39 MB |
| lossless WebP (`--format webp`) | 0.64 MB |
| lossy WebP (`--webp-quality 90`) | 0.28 MB |

Lossy WebP is available through `--webp-quality` but is not recommended here.
Its block and ringing artifacts land in exactly the flat areas this tool just
cleaned: on the reference image, flat-region texture measured 0.20 after the
strong preset and rose back to 0.31 at quality 90, against 0.48 in the original.
Most of the cleaning is undone to save a further 0.36 MB.

Alpha survives lossy WebP bit-exact, so transparency is never the concern; the
colour channels are.

One thing to expect when comparing a lossless WebP against the PNG of the same
run: they are not byte-identical arrays. The WebP encoder rewrites the hidden
RGB values underneath fully transparent pixels to compress better. Every pixel
with any opacity at all is bit-identical, so nothing visible changes.

## Notes

- 16-bit PNGs are supported. Filtering happens in float32 scaled to 8-bit
  units so sigma values mean the same thing at every bit depth, and the result
  is written back as 16-bit.
- Greyscale and grey+alpha images are handled; grey+alpha is expanded to BGRA.
- `--workers N` uses N processes and divides OpenCV's own thread pool between
  them. With `--workers 1` OpenCV still parallelises each filter internally.
