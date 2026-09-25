# Photo identification: plan and handoff

**Status (25 September 2026): proposed. Nothing is built, committed to runtime code or deployed.** This file records the decisions and measurements so far so the work can continue on another machine (the Windows PC with a 12 GB NVIDIA card) or in a new session.

## Goal

A user photographs a mushroom and Bolets suggests which species it is.

Product rule, agreed in principle and still to be confirmed as a written product decision: the service returns **3–5 candidates with plain-language confidence**, never a single verdict and never an edibility answer. Mushroom photo models miss a meaningful share of cases (the best commercial API claims about 88% for "right species somewhere in the top 3"), and the misses include the lethal look-alikes (farinera borda vs. lloras, Galerina vs. pollancró-type clusters, cortinaris). Every result must therefore:

- show each candidate's dangerous look-alikes (`similarSpecies` with `warning: true`) and its `/compare/<slug>` page;
- lead with a warning when any candidate or look-alike is deadly;
- carry the field checks from `data/identification-method.ts`;
- offer an honest "no ho podem dir / no és a la nostra guia" state when confidence is low;
- state that there is no independent mycological review (AGENTS.md truthful-authorship rule).

## Decision so far: train our own model

Options reviewed on 25 September 2026:

| Option | Verdict |
| --- | --- |
| Kindwise mushroom.id API | Viable fallback and a useful benchmark. About 4,500 fungi taxa, claims ~88% top-3, €0.01–0.05 per identification, 100 free credits, Central-Europe data centres, accepts GPS and date. Its FAQ does not state image retention or whether customer images are used for training. |
| **Own model on BioCLIP 2** | **Chosen direction.** MIT licence, ViT-L/14 image encoder trained on TreeOfLife-200M; model card reports 76.8% zero-shot on Meta-Album fungi (paper: 83.8% on its fungi task). No per-call cost, photos can stay on the device, can be restricted to Catalonia. |
| iNaturalist full vision model | Not available: no open API to the full model. |
| Danish Fungi 2020 dataset | Not usable: non-commercial research only. |
| Observation.org / Naturalis | Model mainly covers the Netherlands and Belgium. |
| General LLM vision (e.g. Claude) | Not reliable for fungal species-level identification; not a classifier. |

## Evidence: available training photos

Counted through the GBIF occurrence API on 25 September 2026 for all 62 catalogue species, using the GBIF keys in `data/species-identifiers.ts`. Numbers are **observations with at least one photo** (many carry several photos). Full table: [photo-identification-gbif-counts-2026-09-25.csv](photo-identification-gbif-counts-2026-09-25.csv).

- Open licences (CC0 or CC-BY, no licence question): about 106,000 observations in total, median about 950 per species. Enough for most of the catalogue.
- The Catalan specialities are the gap:

| Species | CC0/CC-BY | CC-BY-NC | CC0/CC-BY from Spain |
| --- | ---: | ---: | ---: |
| Llenega (*Hygrophorus latitabundus*) | 3 | 133 | 0 |
| Palometa metzinosa (*Lepiota brunneoincarnata*, deadly) | 14 | 169 | 1 |
| Lleterola roja (*Lactifluus rugatus*) | 17 | 121 | 1 |
| Cigró (*Leccinellum lepidum*) | 27 | 652 | 2 |
| Tòfona negra (*Tuber melanosporum*) | 35 | 53 | 2 |
| Gírgola de panical (*Pleurotus eryngii*) | 53 | 753 | 7 |
| Rovelló (*Lactarius sanguifluus*) | 66 | 518 | 7 |
| Marçot (*Hygrophorus marzuolus*) | 72 | 332 | 2 |

Query shape (repeat `license` for OR; add `continent=EUROPE` or `country=ES`):

```
https://api.gbif.org/v1/occurrence/search?taxonKey=<gbif>&mediaType=StillImage&license=CC0_1_0&license=CC_BY_4_0&limit=0
```

GBIF throttles parallel requests; run sequentially with backoff.

## Evidence: training hardware

Measured on the Mac (M4 Pro, 20-core GPU, 24 GB, PyTorch 2.8, MPS) with a synthetic ViT-L/14 (the BioCLIP 2 architecture), random data, 224 px:

| Task | Measured |
| --- | --- |
| Feature extraction, fp16, batch 64 (Stage A) | 33 photos/s → about 1 h 40 min for 200,000 photos |
| Full fine-tune, fp32, batch 16 | 8.8 photos/s (15–17 GB driver memory) |
| Full fine-tune, fp16/bf16 autocast, batch 16 | 9.2–9.3 photos/s (mixed precision barely helps on MPS) |

A typical Stage B run is about 400 classes × 500 photos × 10 epochs ≈ 2 million photo passes: **about 60 h on the Mac** (about 30 h retraining only the last quarter of the blocks).

Estimates from specifications, **not measured**; replace them with the benchmark below:

| Hardware | Estimated fine-tune speed | One run | Cost per run |
| --- | --- | --- | --- |
| RTX 3060 12 GB | 30–45 photos/s | 12–18 h | own machine |
| RTX 4070 / 5070 12 GB | 60–90 photos/s | 6–9 h | own machine |
| Cloud L40S 48 GB ($1.55/h) | 200–300 photos/s | 2–3 h | about $4 |
| Cloud RTX PRO 6000 96 GB ($1.80/h) | 300–400 photos/s | 1.5–2 h | about $3.5 |
| Cloud H100 ($3.85/h, $4.50 from 1 October 2026) | 600–800 photos/s | about 1 h | about $4–5 |

Cloud prices are from the provider price list the user shared on 25 September 2026. Budget for Stage B: 10–20 experimental runs ≈ 20–40 GPU-hours ≈ $40–80 on an L40S. Before renting, confirm a single GPU can be rented rather than a full 8-GPU node. Every session costs 20–30 minutes of setup regardless of GPU, so faster cards are not cheaper here.

12 GB of VRAM is enough for a ViT-L/14 fine-tune with bf16 autocast plus gradient checkpointing (or partial fine-tuning of the top blocks, or 8-bit AdamW on CUDA). The small browser model trains anywhere.

## Process

Each stage ends with a go/no-go check.

### Stage A: prove it works (about 1 week; Mac or PC, no cloud)

1. **Species list.** 62 catalogue species + every scientific name in their `similarSpecies` (in `data/species.ts`, `data/reference-species.ts`, `data/reference-species-additions.ts`) + about 300 common European fungi as the "not in our guide" class set. Group taxa that photos cannot separate (e.g. rovelló/pinetell, *Lactarius* sect. *Deliciosi*) while keeping toxic look-alikes such as rovelló de cabra separate. **The user reviews the list before any download.**
2. **Download.** CC0/CC-BY only (until the NC decision below), about 512 px, with a manifest of licence, author, source URL and GBIF occurrence per photo. The public search API is fine for the trial; the final dataset should come from a GBIF download (user's GBIF account) so it can be cited by DOI.
3. **Clean.** Deduplicate (perceptual hash), drop microscopy, spore prints, drawings and dried specimens (zero-shot CLIP filter), cap photos per class, split train/validation/test **by observer**. Build a separate **Catalan test set** from the user's own field photos (see `data/species-media.ts` contributed photos) and public consensus findings; it is only ever used for testing, and the user confirms each identification.
4. **Baseline.** Frozen BioCLIP 2 features + linear classifier.
5. **Report.** Per-species top-1/top-3, calibration, unknown-species rejection, and the safety metric: how often a dangerously toxic species returns an edible species first.

**Check 1:** agree the thresholds before step 4 (for example top-3 ≥ 90% on catalogue species, deadly→edible top-1 near zero, most unknowns rejected). Failing them stops the work or sends it back to the Kindwise option.

### Stage B: make it good and small (2–3 weeks; PC or rented GPU)

6. Fine-tune (full or top blocks), calibrate confidence (temperature scaling), set the "I don't know" threshold, hierarchical group outputs.
7. **Fill the data gaps this season.** It is peak season now: rovelló, llenega and cigró photos taken this autumn avoid waiting a year. Sources: the user's photos and, if approved, an explicit opt-in in finding capture (AGENTS.md: never infer reuse rights from a finding photo).
8. Distil to a small student model, export to ONNX, quantize to about 20–30 MB for the browser (ONNX Runtime Web, WebGPU/WASM). Measure size and latency on a mid-range Android phone; add a parity test between the PyTorch and ONNX outputs.

**Check 2:** the browser model still passes Check 1 and is fast enough on a phone.

### Stage C: product (1–2 weeks)

9. Serve the model as a versioned immutable asset, cached by the service worker for offline use (field capture is offline-first).
10. Results UI (standalone page + optional suggestion in `components/findings/finding-report-form.tsx`), following the product rule above. Map provider or model outputs to catalogue species through the GBIF keys in `data/species-identifiers.ts`; species outside the catalogue show only the scientific name. Strip EXIF/GPS in the browser (`src/lib/findings/photo-exif.ts`); if a server path is ever used, send at most the date and a coarse area and do not store the photo.
11. Legal notice and privacy notice, analytics limited to allowlisted event names (never the species), tests, a decision record here, and an AGENTS.md convention.

### Stage D: beta and launch

12. Private beta (hidden or admin-only) through the rest of autumn.
13. Public launch with an optional, consented "was it right?" signal; retrain each season; version every model and rerun the Catalan test set before shipping it.

## Repository placement

- Training code in a new top-level `ml/` folder (Python), excluded from the Docker build context (`.dockerignore`) and from release archives (`.gitattributes` export rules).
- Photos and intermediate data outside the repository or in git-ignored `artifacts/`; never in git.
- Trained source weights outside git (too large); only the exported browser model becomes a versioned media asset.
- No production secrets on training machines.

## Continuing on the Windows PC

1. Use **WSL2 with Ubuntu** and the NVIDIA driver for WSL, not native Windows Python. Aim for 50–100 GB free SSD and ideally 32 GB RAM.
2. In WSL: create a Python virtual environment and install the CUDA build of PyTorch; later `open_clip_torch` (BioCLIP 2 loads through it) and `pillow`.
3. Run the benchmark below to replace the estimates with measured numbers, and record them in this file.
4. Next task: **draft the Stage A species list** (step 1) for the user's review.

Benchmark (synthetic ViT-L/14, no downloads; picks CUDA or MPS):

```python
import time, torch, torch.nn as nn

dev = torch.device("cuda" if torch.cuda.is_available() else "mps")

def sync():
    torch.cuda.synchronize() if dev.type == "cuda" else torch.mps.synchronize()

class ViTL(nn.Module):
    def __init__(self, classes=400):
        super().__init__()
        self.patch = nn.Conv2d(3, 1024, 14, 14)
        self.cls = nn.Parameter(torch.zeros(1, 1, 1024))
        self.pos = nn.Parameter(torch.zeros(1, 257, 1024))
        layer = nn.TransformerEncoderLayer(1024, 16, 4096, activation="gelu", batch_first=True, norm_first=True, dropout=0.0)
        self.enc = nn.TransformerEncoder(layer, 24, enable_nested_tensor=False)
        self.head = nn.Linear(1024, classes)

    def forward(self, x):
        x = self.patch(x).flatten(2).transpose(1, 2)
        x = torch.cat([self.cls.expand(x.shape[0], -1, -1), x], 1) + self.pos
        return self.head(self.enc(x)[:, 0])

def train(batch, dtype, steps=8):
    model = ViTL().to(dev)
    opt = torch.optim.AdamW(model.parameters(), 1e-5)
    x = torch.randn(batch, 3, 224, 224, device=dev)
    y = torch.randint(0, 400, (batch,), device=dev)
    times = []
    try:
        for _ in range(steps):
            start = time.time()
            with torch.autocast(dev.type, dtype=dtype, enabled=dtype is not None):
                loss = nn.functional.cross_entropy(model(x), y)
            opt.zero_grad()
            loss.backward()
            opt.step()
            sync()
            times.append(time.time() - start)
        per = sum(times[2:]) / len(times[2:])
        print(f"train batch={batch} dtype={dtype}: {batch / per:.1f} photos/s")
    except torch.OutOfMemoryError:
        print(f"train batch={batch} dtype={dtype}: out of memory")
    del model, opt
    torch.cuda.empty_cache() if dev.type == "cuda" else torch.mps.empty_cache()

train(16, None)
train(16, torch.bfloat16)
train(32, torch.bfloat16)

model = ViTL().to(dev).eval()
x = torch.randn(64, 3, 224, 224, device=dev)
with torch.no_grad(), torch.autocast(dev.type, dtype=torch.float16):
    for _ in range(4):
        start = time.time()
        model(x)
        sync()
print(f"inference fp16 batch=64: {64 / (time.time() - start):.1f} photos/s")
```

## Open decisions for the user

- **CC-BY-NC photos:** they add about 5× more data, much more for the Catalan species. Usable only if Bolets is treated as non-commercial; this is a legal call.
- **Finding-photo opt-in:** add a "donate this photo for training" consent to finding capture?
- **Launch thresholds** for Check 1.
- **Placement:** standalone page, suggestion in finding capture, or both.
- **Written product decision** confirming "candidates, never an edibility verdict".

## Sources

- [Kindwise mushroom.id](https://www.kindwise.com/mushroom-id), [Kindwise FAQ](https://www.kindwise.com/faq), [Kindwise pricing](https://www.kindwise.com/pricing)
- [iNaturalist forum: no open vision API](https://forum.inaturalist.org/t/is-there-some-api-identification-request-without-creating-an-observation/41309), [inatVisionAPI](https://github.com/inaturalist/inatVisionAPI)
- [Danish Fungi dataset](https://github.com/BohemianVRA/DanishFungiDataset)
- [BioCLIP 2 model card](https://huggingface.co/imageomics/bioclip-2), [BioCLIP 2 paper](https://arxiv.org/html/2505.23883v2)
- [Naturalis AI](https://www.naturalis.nl/en/ai)
- [GBIF occurrence API](https://api.gbif.org/v1/occurrence/search)
