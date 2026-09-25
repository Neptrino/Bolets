# Species 3D models: authoring guide

Each file `scripts/species-3d/<species-id>.py` adds one species to the Blender
generator in `scripts/species-3d-models.py`. The file is executed inside the
generator's namespace, so every helper below is already in scope (no imports
needed beyond what you want from `math`/`mathutils`). It must define:

```python
def build():
    ...
    return [objects...], {"hero": (az, el, dist, target_z), "low": (...), "under": (...)}
```

Render and export (about a minute):

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/species-3d-models.py -- <species-id> <out-dir>
```

It writes `<out-dir>/<id>.glb` and three previews, `<id>-hero.png`,
`<id>-low.png` and `<id>-under.png` (transparent PNGs; flatten on white to
inspect). The previews use the same neutral tone mapping as the web viewer,
so what you see is what the page shows. The `under` view is lit by an even neutral environment (like the web viewer), so a dark underside there is a real colour problem, not lighting. Study the existing species files in this folder
(`boletus-edulis.py`, `lactarius-sanguifluus.py`, `amanita-caesarea.py`)
before starting; copy their patterns.

## Helpers

- `revolve(name, profile, segments, samples, shape_fn, pole_start, pole_end)`:
  surface of revolution from a list of `(r, z)` points in metres (Catmull-Rom
  resampled by arc length). `shape_fn(theta, v, r, z) -> (x, y, z)` deforms
  it; `v` is the arc fraction 0→1 along the profile. UVs are
  `(theta/2π, 1 − v)`. Normals already face outwards.
- `arc_fraction(profile, k)`: the `v` of profile point `k` (use it to find
  the margin, where gills start, etc.).
- `gills(name, cap_profile, samples, j_start, cap_shape, stem_shape,
  stem_radius, count, depth, seed, decurrent=0.004, free_gap=None,
  stains=True, margin_taper=0.72, edge_occlusion=0.82)`: radial gill blades
  under the cap, following `cap_shape`. `j_start` is the resampled-profile
  index where gills begin (`round(arc_fraction(cap_profile, k) * (samples-1))`).
  `decurrent=0` + `free_gap=None` ends them buried in a flared stem (read as
  decurrent); `free_gap=0.0012` gives free gills. `stains` adds latex spots
  (Lactarius only). It has UVs `(t, edge)` and a vertex colour that multiplies
  the texture; set its material from `g.uvx` (0 stem → 1 margin) and `g.uvy`
  (0 flesh → 1 free edge).
- `solidify(obj, thickness, rim=True)`: give a membrane (ring, volva)
  thickness; use `rim=False` below ~0.5 mm.
- `smooth(e0, e1, x)`, `catmull`, and `mathutils.noise` (`noise.noise`,
  `noise.voronoi`) for shape functions.
- Materials: `m = bpy.data.materials.new("cap-proc"); g = Graph(m)`, then
  `g.noise(scale, detail, rough, vec=None, distortion=0)`,
  `g.voronoi(scale, feature="F1"|"DISTANCE_TO_EDGE", vec=None, rand=1)`,
  `g.ramp(fac, [(pos, "#hex"), ...])`, `g.mix(fac, a, b, blend="MIX"|"OVERLAY"|...)`,
  `g.remap(x, a, b, c=0, d=1)` (smoothstep), `g.math(op, a, b)`, `g.lerp(fac, a, b)`,
  `g.vec_scale(g.obj, sx, sy, sz)`, `g.radial()` (distance from the axis),
  `g.v` (profile fraction), `g.obj` (object coordinates in metres), and finally
  `g.finish(colour, roughness, height, bump_strength, bump_distance)`.
  Append with `obj.data.materials.append(m)`. Set
  `obj.data.materials[0].use_backface_culling = True` on closed surfaces
  (cap, stem); leave gills and membranes double-sided. `obj["tex"] = 512`
  shrinks the baked texture for small parts.

Everything procedural is baked to 2048 px colour/roughness/normal maps, so
use object coordinates (`g.obj`) for patterns that must not seam, and UV-only
inputs on gills (their UVs overlap).

## Rules learned the hard way

- Units are metres and real size (a 10 cm cap is `r = 0.05`). Ground at z = 0;
  a stem base may go a few mm below.
- Shape follows the species' growth stage consistently: a **convex cap has a
  concave hymenium** (margin well below the stem apex, gills rising to the
  stem); a flat, expanded cap has a flat one.
- Gills are **straight, continuous and crowded**; almost every gill runs from
  margin to stem, short lamellulae only near the margin. Never make them look
  broken, draped or toothed.
- Close every joint: sink the stem apex into the cap flesh (a slight flare
  helps); no visible gaps, dark seams or wedges.
- Be irregular: lumps, a slightly off-centre cap, uneven margin, a leaning
  stem, dirt at the base. Lathe-perfect symmetry reads as a toy.
- Mushrooms are **matte to satin**: roughness 0.5–0.85 (only genuinely
  glossy/viscid cuticles go to ~0.4).
- Colours: saturated and true to field photos, never pastel. The previews
  are exposure-matched to the web; if something looks washed out or pink,
  fix the colours, not the renderer.
- No dark outlines on thin membranes; no hard shadow edges.
- It is an **illustration**: never invent identification features the
  species' versioned morphology (in `data/species.ts`) does not describe, and
  keep the key features (`morphology.keyFeatures`) clearly visible.

## References

Read the species' `identity`, `morphology` and `similarSpecies` in
`data/species.ts`. Look at many photographs (as reference only; never copy
pixels): the catalogue images in `data/species-media.ts` /
`data/species-gallery-media.ts` (files under `public/media/`), and Wikimedia
Commons thumbnails, e.g.

```sh
curl -s -A "BoletsRef/1.0" "https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:Cantharellus_cibarius&gcmtype=file&gcmlimit=40&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json"
```

Compare your renders side by side with the references (ImageMagick `magick`
is installed) and iterate until the silhouette, underside, proportions and
colours match a typical mature specimen.
