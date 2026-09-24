"""Illustrative 3D species models for /bolets/<slug>/3d, generated in Blender.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/species-3d-models.py -- <species-id> <out-dir>

Each species is built from a shape profile and colours read from its
versioned morphology and reference photographs (looked at, never copied):
cap, stem, ring and volva are UV-mapped surfaces of revolution; gills are
double-sided blades with per-gill vertex colour. Procedural materials are
baked to colour, roughness and tangent-space normal textures, so the GLB
(Draco geometry, WebP textures) shows what the preview renders show. Units
are metres, so AR viewers place the model at life size.

Publish a result by copying <out-dir>/<id>.glb to public/models/species/ and
building the stills from <out-dir>/<id>-hero.png (soft radial fade so the
ground shadow never ends in an edge, then a tight crop for the profile link):

    magick <id>-hero.png -channel A -fuzz 12% -trim +repage +channel -gravity center \
      -background none -extent "%[fx:max(w,h)*1.15]x%[fx:max(w,h)*1.15]" sq.png
    magick -size <W>x<W> radial-gradient:white-black -level 29%,48% fade.png
    magick sq.png \( +clone -alpha extract fade.png -compose multiply -composite \) \
      -alpha off -compose copy_opacity -composite -resize 900x900 -quality 82 <id>.webp
    magick <id>.webp -gravity center -crop 66%x66%+0+0 +repage -resize 240x240 -quality 85 <id>-thumb.webp

Then register the species in data/species-3d-models.ts.
"""
import glob
import math
import os
import sys

import bpy
from mathutils import Vector, noise

TEX = 2048
FOREST_HDR = glob.glob(os.path.join(os.path.dirname(bpy.app.binary_path), "..", "Resources", "*", "datafiles", "studiolights", "world", "forest.exr"))[0]


# ---------------------------------------------------------------- geometry

def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def catmull(points, samples):
    """Resample a polyline with Catmull-Rom, parameterised by polyline arc length."""
    pts = [Vector(p) for p in points]
    ext = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    seg = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]
    total = sum(seg)
    out = []
    for s in range(samples):
        d = total * s / (samples - 1)
        i = 0
        while i < len(seg) - 1 and d > seg[i]:
            d -= seg[i]
            i += 1
        t = d / seg[i] if seg[i] else 0
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        t2, t3 = t * t, t * t * t
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return out


def arc_fraction(points, k):
    seg = [(Vector(points[i + 1]) - Vector(points[i])).length for i in range(len(points) - 1)]
    return sum(seg[:k]) / sum(seg)


def revolve(name, profile, segments, samples, shape_fn, pole_start, pole_end):
    """Surface of revolution with a (theta, arc-fraction) UV layout.

    shape_fn(theta, v, r, z) -> (x, y, z) lets each species bend and dent it.
    UVs are per face corner, so the seam shares vertices and shades smoothly.
    """
    prof = catmull(profile, samples)
    verts, faces, uvs = [], [], []
    rings = []
    for j, pt in enumerate(prof):
        v = j / (samples - 1)
        ring = []
        for i in range(segments):
            th = 2 * math.pi * i / segments
            ring.append(len(verts))
            verts.append(shape_fn(th, v, pt.x, pt.y))
        rings.append(ring)
    for j in range(samples - 1):
        a, b = rings[j], rings[j + 1]
        va, vb = j / (samples - 1), (j + 1) / (samples - 1)
        for i in range(segments):
            n = (i + 1) % segments
            ua, ub = i / segments, (i + 1) / segments
            faces.append((a[i], a[n], b[n], b[i]))
            uvs.append(((ua, 1 - va), (ub, 1 - va), (ub, 1 - vb), (ua, 1 - vb)))
    for ring, first, want in ((rings[0], True, pole_start), (rings[-1], False, pole_end)):
        if not want:
            continue
        c = sum((Vector(verts[k]) for k in ring), Vector()) / len(ring)
        ci = len(verts)
        verts.append(tuple(c))
        vv = 1.0 if first else 0.0
        for i in range(segments):
            n = (i + 1) % segments
            ua, ub = i / segments, (i + 1) / segments
            if first:
                faces.append((ring[n], ring[i], ci))
                uvs.append(((ub, vv), (ua, vv), ((ua + ub) / 2, vv)))
            else:
                faces.append((ring[i], ring[n], ci))
                uvs.append(((ua, vv), (ub, vv), ((ua + ub) / 2, vv)))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    uv = mesh.uv_layers.new(name="UVMap")
    for poly, corner_uvs in zip(mesh.polygons, uvs):
        for li, cuv in zip(poly.loop_indices, corner_uvs):
            uv.data[li].uv = cuv
    mesh.validate()
    # The (theta, profile) winding above faces inwards; web viewers cull back
    # faces, so turn every surface outwards.
    mesh.flip_normals()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


# ---------------------------------------------------------------- node helpers

def hex_rgba(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


class Graph:
    def __init__(self, mat):
        mat.use_nodes = True
        self.nt = mat.node_tree
        self.nt.nodes.clear()
        self.out = self.nt.nodes.new("ShaderNodeOutputMaterial")
        self.bsdf = self.nt.nodes.new("ShaderNodeBsdfPrincipled")
        self.link(self.bsdf.outputs["BSDF"], self.out.inputs["Surface"])
        tc = self.nt.nodes.new("ShaderNodeTexCoord")
        self.obj = tc.outputs["Object"]
        sep = self.nt.nodes.new("ShaderNodeSeparateXYZ")
        self.link(tc.outputs["UV"], sep.inputs[0])
        self.v = self.math("SUBTRACT", 1.0, sep.outputs["Y"])  # 0 at profile start
        self.uvx = sep.outputs["X"]
        self.uvy = sep.outputs["Y"]

    def radial(self):
        """Horizontal distance from the axis, in metres."""
        n = self.nt.nodes.new("ShaderNodeVectorMath")
        n.operation = "LENGTH"
        self.link(self.vec_scale(self.obj, 1, 1, 0), n.inputs[0])
        return n.outputs["Value"]

    def link(self, a, b):
        self.nt.links.new(a, b)

    def _in(self, sock, val):
        if hasattr(val, "node"):
            self.link(val, sock)
        else:
            sock.default_value = val

    def math(self, op, a, b=0.0):
        n = self.nt.nodes.new("ShaderNodeMath")
        n.operation = op
        self._in(n.inputs[0], a)
        self._in(n.inputs[1], b)
        return n.outputs[0]

    def vec_scale(self, vec, sx, sy, sz):
        n = self.nt.nodes.new("ShaderNodeMapping")
        self._in(n.inputs["Vector"], vec)
        n.inputs["Scale"].default_value = (sx, sy, sz)
        return n.outputs[0]

    def noise(self, scale, detail=4.0, rough=0.55, vec=None, distortion=0.0):
        n = self.nt.nodes.new("ShaderNodeTexNoise")
        self._in(n.inputs["Vector"], vec if vec is not None else self.obj)
        n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = detail
        n.inputs["Roughness"].default_value = rough
        n.inputs["Distortion"].default_value = distortion
        return n.outputs["Fac"]

    def voronoi(self, scale, feature="F1", vec=None, rand=1.0):
        n = self.nt.nodes.new("ShaderNodeTexVoronoi")
        n.feature = feature
        self._in(n.inputs["Vector"], vec if vec is not None else self.obj)
        n.inputs["Scale"].default_value = scale
        n.inputs["Randomness"].default_value = rand
        return n.outputs["Distance"]

    def remap(self, x, a, b, c=0.0, d=1.0):
        n = self.nt.nodes.new("ShaderNodeMapRange")
        n.interpolation_type = "SMOOTHSTEP"
        self._in(n.inputs["Value"], x)
        n.inputs["From Min"].default_value = a
        n.inputs["From Max"].default_value = b
        n.inputs["To Min"].default_value = c
        n.inputs["To Max"].default_value = d
        return n.outputs["Result"]

    def ramp(self, fac, stops):
        n = self.nt.nodes.new("ShaderNodeValToRGB")
        self._in(n.inputs["Fac"], fac)
        els = n.color_ramp.elements
        while len(els) < len(stops):
            els.new(0.5)
        for el, (pos, col) in zip(els, stops):
            el.position = pos
            el.color = hex_rgba(col)
        return n.outputs["Color"]

    def mix(self, fac, a, b, blend="MIX"):
        n = self.nt.nodes.new("ShaderNodeMix")
        n.data_type = "RGBA"
        n.blend_type = blend
        socks = [s for s in n.inputs if s.type == "RGBA"]
        self._in(n.inputs["Factor"], fac)
        self._in(socks[0], hex_rgba(a) if isinstance(a, str) else a)
        self._in(socks[1], hex_rgba(b) if isinstance(b, str) else b)
        return [s for s in n.outputs if s.type == "RGBA"][0]

    def lerp(self, fac, a, b):
        return self.math("ADD", a, self.math("MULTIPLY", fac, self.math("SUBTRACT", b, a)))

    def finish(self, colour, roughness, height, strength, distance):
        self.link(colour, self.bsdf.inputs["Base Color"])
        self._in(self.bsdf.inputs["Roughness"], roughness)
        bump = self.nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = strength
        bump.inputs["Distance"].default_value = distance
        self.link(height, bump.inputs["Height"])
        self.link(bump.outputs["Normal"], self.bsdf.inputs["Normal"])


# ---------------------------------------------------------------- species

def cep():
    seed = Vector((3.1, 7.7, 1.3))

    cap_profile = [
        (0.000, 0.115), (0.020, 0.1140), (0.038, 0.1100), (0.052, 0.1030),
        (0.0615, 0.0935), (0.0675, 0.082), (0.0695, 0.073), (0.067, 0.0660),
        (0.061, 0.0638), (0.051, 0.0648), (0.041, 0.0672), (0.032, 0.0705), (0.024, 0.0745),
    ]
    um = arc_fraction(cap_profile, 7)  # where the cuticle turns under

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * 16 + seed
        w = noise.noise(q) * 0.075 + noise.noise(q * 2.3) * 0.03 + noise.noise(q * 5.1) * 0.008
        edge = smooth(0.1, um, v)
        r2 = r * (1 + w * edge)
        z2 = z + w * 0.016 * edge - 0.004 * edge * (0.5 + 0.5 * math.cos(th - 2.2))
        z2 += noise.noise(p * 70 + seed) * 0.0009 * (1 - smooth(um - 0.05, um, v))
        return (r2 * math.cos(th) + 0.003, r2 * math.sin(th), z2)

    stem_profile = [
        (0.0270, 0.082), (0.0290, 0.073), (0.0335, 0.063), (0.0395, 0.052),
        (0.0445, 0.040), (0.0475, 0.028), (0.0480, 0.018), (0.0455, 0.009),
        (0.0395, 0.0025), (0.0300, -0.0015), (0.0170, -0.0035), (0.0050, -0.004),
    ]

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 20)) + seed * 2
        r *= 1 + noise.noise(p) * 0.045
        bend = 0.004 * (1 - z / 0.082) ** 2  # the base leans slightly
        return (r * math.cos(th) - bend, r * math.sin(th), z)

    cap = revolve("cap", cap_profile, 256, 150, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 256, 110, stem_shape, False, True)
    cap.rotation_euler = (math.radians(5), math.radians(-3), 0)
    cap.location.z = -0.0015

    # Cap: chestnut cuticle mottled darker in the centre, a thin pale rim,
    # cream pores that yellow towards the stem.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    big = g.noise(22, 5, 0.6, distortion=0.3)
    top = g.ramp(big, [(0.32, "#7a4716"), (0.5, "#a0621f"), (0.66, "#b97a2e"), (0.8, "#c9924a")])
    centre = g.remap(g.v, 0.0, um * 0.7, 1.0, 0.0)
    top = g.mix(g.math("MULTIPLY", centre, 0.45), top, "#6a3d14")
    top = g.mix(0.35, top, g.noise(260, 3, 0.5), "OVERLAY")
    streak = g.noise(90, 2, 0.5, vec=g.vec_scale(g.obj, 1, 1, 6))
    top = g.mix(0.15, top, streak, "OVERLAY")
    speck = g.remap(g.voronoi(150, rand=1.0), 0.0, 0.16, 1.0, 0.0)
    speck_mask = g.remap(g.noise(11, 3), 0.5, 0.6)
    top = g.mix(g.math("MULTIPLY", speck, g.math("MULTIPLY", speck_mask, 0.85)), top, "#3b2e22")
    top = g.mix(g.remap(g.v, um - 0.03, um - 0.006), top, "#e0d3b4")
    pore_d = g.voronoi(1300, rand=0.8)
    pores = g.ramp(pore_d, [(0.04, "#cbbd8c"), (0.25, "#e6dec2"), (0.5, "#f1ecdb")])
    pores = g.mix(g.remap(g.v, 0.86, 1.0, 0.0, 0.5), pores, "#e2d59e")
    under = g.remap(g.v, um - 0.002, um + 0.012)
    colour = g.mix(under, top, pores)

    rough_top = g.remap(g.noise(30, 2), 0.3, 0.7, 0.6, 0.78)
    roughness = g.lerp(under, rough_top, 0.9)

    h_top = g.math("ADD", g.math("MULTIPLY", g.noise(180, 4), 0.35), g.math("MULTIPLY", speck, 0.25))
    h_pore = g.remap(pore_d, 0.02, 0.4, 0.0, 1.0)
    g.finish(colour, roughness, g.lerp(under, h_top, h_pore), 0.6, 0.0005)
    cap.data.materials.append(m)

    # Stem: pale, bellied, with a raised white net on the upper half
    # (the cep's key feature) and soil at the base.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    net_d = g.voronoi(420, "DISTANCE_TO_EDGE", vec=g.vec_scale(g.obj, 1, 1, 0.45), rand=0.85)
    net = g.remap(net_d, 0.0, 0.1, 1.0, 0.0)
    net = g.math("MULTIPLY", net, g.remap(g.v, 0.05, 0.5, 1.0, 0.0))
    base = g.ramp(g.noise(50, 4), [(0.35, "#d9ceb4"), (0.65, "#e8e1cf")])
    base = g.mix(g.math("MULTIPLY", g.remap(g.v, 0.05, 0.6, 1.0, 0.0), 0.7), base, "#d0bf9c")
    base = g.mix(g.remap(g.v, 0.45, 0.9, 0.0, 0.45), base, "#c7b690")
    base = g.mix(0.25, base, g.noise(400, 2), "OVERLAY")
    fibres = g.noise(160, 3, 0.5, vec=g.vec_scale(g.obj, 1, 1, 0.08))
    base = g.mix(0.3, base, fibres, "OVERLAY")
    colour = g.mix(net, base, "#f8f5ec")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.12)
    soil_band = g.remap(g.math("ADD", g.v, side), 0.68, 0.86)
    soil = g.math("MULTIPLY", soil_band, g.remap(g.noise(70, 5, 0.65), 0.38, 0.52))
    colour = g.mix(soil, colour, "#5a4633")
    roughness = g.remap(net, 0.0, 1.0, 0.82, 0.74)
    height = g.math("ADD", net, g.math("MULTIPLY", fibres, 0.35))
    g.finish(colour, roughness, height, 0.3, 0.0005)
    stem.data.materials.append(m)

    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    views = {"hero": (-30, 20, 0.6, 0.058), "low": (25, 3, 0.55, 0.06), "under": (10, -14, 0.5, 0.065)}
    return [cap, stem], views


def gills(name, cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius, count, depth, seed, decurrent=0.004, free_gap=None, stains=True, margin_taper=0.72, edge_occlusion=0.82):
    """Radial gill blades hanging under the cap.

    j_start indexes the resampled profile where the gills begin (inside the
    inrolled margin). Each gill follows the underside inwards until it meets
    the stem, then runs a few millimetres down it (decurrent), fading out.
    Full gills alternate with lamellulae that start at irregular distances.
    Every blade is a thin double-sided ribbon of near-constant depth; vertex
    colour carries a per-gill tint, scattered latex stains and a fake
    occlusion towards the flesh, since the web viewer has no ambient occlusion.
    """
    prof = catmull(cap_profile, samples)
    # Where the underside reaches the stem surface.
    j_stem = samples - 1
    for j in range(j_start, samples):
        gap = free_gap if free_gap is not None else (-0.0008 if decurrent == 0 else 0.0004)
        if prof[j].x <= stem_radius(prof[j].y) + gap:
            j_stem = j
            break

    def path(th, t0):
        """(pos_fn, t) samples from the margin (t=1) to the stem and down it (t<0)."""
        pts = []
        steps = 44
        for s in range(steps):
            t = 1 - (1 - t0) * s / (steps - 1) if t0 > 0 else 1 - s / (steps - 1)
            f = j_start + (1 - t) * (j_stem - j_start)
            j0 = min(int(f), samples - 2)
            al = f - j0
            pr = prof[j0].lerp(prof[j0 + 1], al)
            tan = (prof[min(j0 + 1, samples - 1)] - prof[max(j0 - 1, 0)]).normalized()
            nr, nz = tan.y, -tan.x
            if nz > 0:
                nr, nz = -nr, -nz
            v = f / (samples - 1)
            pts.append(("cap", t, pr.x, pr.y, nr, nz, v))
        if t0 == 0 and decurrent > 0:
            z0 = prof[j_stem].y
            for s in range(1, 9):
                z = z0 - decurrent * s / 8
                pts.append(("stem", -s / 8, stem_radius(z), z, 1.0, 0.0, 0.0))
        return pts

    rng = [noise.noise(Vector((k * 0.913, 1.7, 0.3)) + seed) * 0.5 + 0.5 for k in range(count * 4)]
    # Almost every gill runs whole from margin to stem; one short lamellula
    # fills each gap near the margin, where the circumference widens.
    ranks = []
    for k in range(count):
        base = 2 * math.pi * k / count
        ranks.append((base, 0.0))
        ranks.append((base + math.pi / count, 0.72 + 0.14 * rng[4 * k]))
    verts, faces, uvs, cols = [], [], [], []
    for gi, (th0, t0) in enumerate(ranks):
        tint = 0.97 + 0.03 * (noise.noise(Vector((gi * 0.21, 3.0, 0.0))) * 0.5 + 0.5)
        row = []
        pts = path(th0, t0)
        for kind, t, r, z, nr, nz, v in pts:
            th = th0
            n3 = Vector((nr * math.cos(th), nr * math.sin(th), nz))
            if kind == "cap":
                start = smooth(t0, t0 + 0.04, t) if t0 > 0 else 1.0
                d = depth * start * (1 - smooth(margin_taper, 1.0, t)) * (0.55 + 0.45 * smooth(0.0, 0.3, t))
                if free_gap is not None:
                    d *= smooth(0.0, 0.12, t)  # free gills round off before the stem
                base = Vector(cap_shape(th, v, r, z))
                top, bot = base - n3 * 0.0005, base + n3 * d
            else:
                d = depth * 0.55 * (1 + t) ** 2.5
                sv = 0.0
                top = stem_shape(th, sv, r - 0.0004, z)
                bot = stem_shape(th, sv, r + d, z)
            q = Vector((math.cos(th), math.sin(th), t)) * 7 + seed
            q2 = Vector((math.cos(th), math.sin(th), t)) * 40 + seed
            stain = smooth(0.34, 0.5, noise.noise(q)) * smooth(0.0, 0.35, noise.noise(q2)) if stains else 0.0
            for e, pos in ((0, top), (1, bot)):
                row.append(len(verts))
                verts.append(pos)
                uvs.append((max(t, 0.0), e))
                occl = edge_occlusion if e == 0 else 1.0
                st = stain * (0.75 + 0.25 * e)
                c = [tint * occl * (1 - st * 0.45), tint * occl * (1 - st * 0.9), tint * occl * (1 - st * 0.85)]
                cols.append(c)
        for s in range(len(pts) - 1):
            a0, b0 = row[2 * s], row[2 * s + 2]
            faces.append((a0, b0, b0 + 1, a0 + 1))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    uv = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            uv.data[li].uv = uvs[mesh.loops[li].vertex_index]
    attr = mesh.color_attributes.new(name="Col", type="BYTE_COLOR", domain="POINT")
    for k, c in enumerate(cols):
        attr.data[k].color = (*c, 1.0)
    mesh.validate()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj["tex"] = 512
    return obj


def rovello():
    """Lactarius sanguifluus: depressed salmon-orange cap with green patches
    and faint zones, crowded decurrent wine-pink gills, short pinkish stem with
    vinous spots."""
    seed = Vector((5.3, 1.9, 8.4))

    cap_profile = [
        (0.000, 0.0470), (0.008, 0.0478), (0.017, 0.0522), (0.027, 0.0572),
        (0.036, 0.0603), (0.042, 0.0604), (0.0466, 0.0580), (0.0482, 0.0540),
        (0.0470, 0.0503), (0.0445, 0.0486), (0.0405, 0.0478), (0.0350, 0.0472), (0.0265, 0.0448),
        (0.0190, 0.0414), (0.0135, 0.0372), (0.0110, 0.0340),
    ]
    samples = 150
    um = arc_fraction(cap_profile, 8)  # inrolled margin tip

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * 22 + seed
        edge = smooth(0.15, um, v)
        w = noise.noise(q) * 0.09 + noise.noise(q * 2.4) * 0.035 + noise.noise(q * 5.5) * 0.012
        lobes = (0.04 * math.sin(3 * th + 0.8) + 0.025 * math.sin(5 * th + 2.1)
                 + 0.012 * math.sin(8 * th + 0.3) + 0.03 * noise.noise(Vector((math.cos(th), math.sin(th), 0)) * 3 + seed))
        edge *= smooth(0.014, 0.03, r)
        r2 = r * (1 + (w + lobes) * edge)
        z2 = z + (w * 0.016 + lobes * 0.07) * edge
        top = 1 - smooth(um - 0.05, um, v)
        # Lumps, an off-centre depression and a few dents on the upper surface.
        z2 += (noise.noise(p * 45 + seed) * 0.0022 + noise.noise(p * 110 + seed) * 0.0007) * top
        dx, dy = p.x - 0.007, p.y + 0.005
        z2 -= 0.0035 * math.exp(-(dx * dx + dy * dy) / 0.013 ** 2) * top
        for cx, cy, rad, dep in ((0.028, 0.012, 0.005, 0.0012), (-0.02, 0.026, 0.004, 0.001), (-0.03, -0.018, 0.006, 0.0009)):
            ex, ey = p.x - cx, p.y - cy
            z2 -= dep * math.exp(-(ex * ex + ey * ey) / rad ** 2) * top
        return (r2 * math.cos(th), r2 * math.sin(th), z2)

    stem_profile = [
        (0.0185, 0.0425), (0.0152, 0.0385), (0.0138, 0.034), (0.0135, 0.030), (0.0136, 0.023), (0.0130, 0.014),
        (0.0118, 0.006), (0.0105, 0.0015), (0.0070, -0.0010), (0.0020, -0.0014),
    ]

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 25)) + seed
        # Irregular below; smooth where the flare sinks into the cap so the joint stays closed.
        r *= 1 + (noise.noise(p) * 0.06 + noise.noise(p * 3) * 0.02) * (1 - smooth(0.028, 0.036, z))
        k = (1 - min(z, 0.0385) / 0.0385) ** 2
        return (r * math.cos(th) + 0.003 * k, r * math.sin(th) - 0.0015 * k, z)

    cap = revolve("cap", cap_profile, 256, samples, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 160, 80, stem_shape, True, True)
    sp = catmull(stem_profile, 200)

    def stem_radius(z):
        best = min(sp, key=lambda p: abs(p.y - z))
        return best.x

    ug = arc_fraction(cap_profile, 9)  # gills start inside the inrolled rim
    j_start = int(round(ug * (samples - 1)))
    # The flared stem top swallows the gill ends, which reads as decurrent
    # without the blade twisting where it would turn down the stem.
    gill = gills("gills", cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius, 190, 0.0026, seed, decurrent=0)

    # Cap: salmon-orange with faint concentric zones, green-grey patches
    # (strongest in the central depression), paler inrolled margin.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    big = g.noise(26, 5, 0.6, distortion=0.4)
    top = g.ramp(big, [(0.3, "#b0643a"), (0.5, "#c47a48"), (0.68, "#d08e5a"), (0.82, "#d9a06c")])
    zones = g.math("SINE", g.math("MULTIPLY", g.radial(), 520.0))
    zones = g.remap(zones, 0.2, 1.0, 0.0, 0.32)
    top = g.mix(zones, top, "#9c5230")
    green_n = g.noise(16, 4, 0.6, distortion=0.5)
    centre = g.remap(g.v, 0.0, um * 0.6, 0.12, 0.0)
    green = g.remap(g.math("ADD", green_n, centre), 0.5, 0.64, 0.0, 0.8)
    top = g.mix(green, top, g.ramp(g.noise(60, 3), [(0.4, "#62806f"), (0.7, "#8f9d78")]))
    top = g.mix(0.3, top, g.noise(300, 3), "OVERLAY")
    blotch = g.remap(g.noise(35, 4, 0.6, distortion=0.8), 0.55, 0.7, 0.0, 0.5)
    top = g.mix(blotch, top, "#a8582a")
    wine = g.remap(g.noise(20, 3, distortion=0.6), 0.6, 0.7, 0.0, 0.65)
    top = g.mix(wine, top, "#8a3a3a")
    speck = g.remap(g.voronoi(140), 0.0, 0.12, 1.0, 0.0)
    speck = g.math("MULTIPLY", speck, g.remap(g.noise(9, 2), 0.48, 0.56))
    top = g.mix(speck, top, "#3e3024")
    top = g.mix(g.remap(g.v, um - 0.05, um - 0.005, 0.0, 0.5), top, "#dca77a")
    under = g.remap(g.v, ug - 0.004, ug + 0.006)
    colour = g.mix(under, top, "#9c6772")
    roughness = g.lerp(under, g.remap(g.noise(30, 2), 0.3, 0.7, 0.5, 0.68), 0.8)
    height = g.math("ADD", g.math("MULTIPLY", g.noise(200, 4), 0.4), g.math("MULTIPLY", zones, 0.5))
    g.finish(colour, roughness, height, 0.35, 0.0005)
    cap.data.materials.append(m)

    # Gills: pink-lilac, darker towards the stem, paler along the free edge.
    m = bpy.data.materials.new("gills-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#95606f"), (0.45, "#aa7581"), (1.0, "#bb8a8f")])
    col = g.mix(g.remap(g.uvy, 0.6, 1.0, 0.0, 0.35), col, "#cfa09f")
    col = g.mix(0.15, col, g.noise(40, 2, vec=g.vec_scale(g.obj, 1, 1, 1)), "OVERLAY")
    g.finish(col, 0.75, g.noise(200, 2), 0.1, 0.0002)
    gill.data.materials.append(m)

    # Stem: pinkish white, scattered vinous pits, green stains and soil.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    base = g.ramp(g.noise(40, 4), [(0.35, "#cf9f96"), (0.65, "#deb5aa")])
    warp = g.nt.nodes.new("ShaderNodeVectorMath")
    warp.operation = "ADD"
    g.link(g.vec_scale(g.obj, 1, 1, 0.5), warp.inputs[0])
    wn = g.nt.nodes.new("ShaderNodeTexNoise")
    wn.inputs["Scale"].default_value = 90
    g.link(g.obj, wn.inputs["Vector"])
    wsc = g.nt.nodes.new("ShaderNodeVectorMath")
    wsc.operation = "SCALE"
    wsc.inputs["Scale"].default_value = 0.004
    g.link(wn.outputs["Color"], wsc.inputs[0])
    g.link(wsc.outputs[0], warp.inputs[1])
    pits_d = g.voronoi(210, vec=warp.outputs[0], rand=1.0)
    pit_size = g.remap(g.noise(35, 2), 0.35, 0.65, 0.12, 0.38)
    pits = g.math("MULTIPLY", g.math("LESS_THAN", pits_d, pit_size), g.remap(g.noise(18, 2), 0.42, 0.55))
    mottle = g.remap(g.noise(85, 5, 0.65, vec=g.vec_scale(g.obj, 1, 1, 0.35), distortion=0.6), 0.42, 0.62, 0.0, 0.8)
    base = g.mix(mottle, base, "#a45e60")
    pits = g.math("MAXIMUM", pits, g.math("MULTIPLY", g.math("LESS_THAN", pits_d, g.math("MULTIPLY", pit_size, 1.6)), g.remap(g.noise(14, 2), 0.55, 0.62)))
    base = g.mix(pits, base, "#853744")
    base = g.mix(g.remap(g.noise(12, 3, distortion=0.4), 0.54, 0.66, 0.0, 0.65), base, "#7f8a6c")
    base = g.mix(0.3, base, g.noise(260, 2, vec=g.vec_scale(g.obj, 1, 1, 0.1)), "OVERLAY")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.15)
    soil = g.math("MULTIPLY", g.remap(g.math("ADD", g.v, side), 0.55, 0.8), g.remap(g.noise(70, 5, 0.65), 0.36, 0.5))
    colour = g.mix(soil, base, "#4f3d2d")
    height = g.math("SUBTRACT", g.noise(200, 3), g.math("MULTIPLY", pits, 0.6))
    g.finish(colour, 0.74, height, 0.35, 0.0005)
    stem.data.materials.append(m)

    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    views = {"hero": (-30, 28, 0.42, 0.03), "low": (25, 4, 0.4, 0.032), "under": (15, -28, 0.3, 0.04)}
    return [cap, stem, gill], views


def solidify(obj, thickness, rim=True):
    """Give a membrane thickness. Very thin ones skip the rim: its collapsed
    UVs sample a dark outline, and the gap is too narrow to see."""
    mod = obj.modifiers.new("solid", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 0.0
    mod.use_even_offset = True
    mod.use_rim = rim


def ou_de_reig():
    """Amanita caesarea: orange-red cap with a striate margin, free yellow
    gills, yellow stem with a hanging yellow ring, emerging from a tall,
    thick white sac-like volva with torn pointed lobes."""
    seed = Vector((2.2, 6.1, 4.7))

    cap_profile = [
        # Convex cap: the margin drops well below the stem apex, so the
        # hymenium is a concave bowl rather than a flat plate.
        (0.000, 0.1580), (0.016, 0.1568), (0.031, 0.1520), (0.043, 0.1435),
        (0.051, 0.1325), (0.0555, 0.1205), (0.0568, 0.1110), (0.0558, 0.1098),
        (0.0510, 0.1135), (0.0440, 0.1205), (0.0360, 0.1265), (0.0270, 0.1305),
        (0.0180, 0.1335), (0.0110, 0.1350), (0.0085, 0.1355),
    ]
    samples = 160
    um = arc_fraction(cap_profile, 6)  # margin tip

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * 14 + seed
        edge = smooth(0.2, um, v) * smooth(0.014, 0.03, r)
        w = noise.noise(q) * 0.04 + noise.noise(q * 2.6) * 0.012
        r2 = r * (1 + w * edge)
        z2 = z + w * 0.01 * edge - 0.003 * edge * (0.5 + 0.5 * math.cos(th - 0.6))
        return (r2 * math.cos(th), r2 * math.sin(th), z2)

    stem_profile = [
        (0.0160, 0.1420), (0.0122, 0.1300), (0.0123, 0.1187), (0.0130, 0.0975),
        (0.0141, 0.0700), (0.0152, 0.0425), (0.0164, 0.0160), (0.0168, 0.0070),
        (0.0146, 0.0015), (0.0070, -0.0005), (0.0020, -0.0008),
    ]

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 18)) + seed
        r *= 1 + noise.noise(p) * 0.035 * (1 - smooth(0.121, 0.13, z))
        k = (1 - min(z, 0.13) / 0.13) ** 2
        return (r * math.cos(th) + 0.003 * k, r * math.sin(th) + 0.001 * k, z)

    cap = revolve("cap", cap_profile, 256, samples, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 160, 120, stem_shape, True, True)
    sp = catmull(stem_profile, 300)

    def stem_radius(z):
        return min(sp, key=lambda p: abs(p.y - z)).x

    ug = arc_fraction(cap_profile, 7)  # gills run out to the thin margin
    gill = gills("gills", cap_profile, samples, int(round(ug * (samples - 1))), cap_shape, stem_shape,
                 stem_radius, 120, 0.0052, seed, decurrent=0, free_gap=0.0012, stains=False,
                 margin_taper=0.9, edge_occlusion=0.97)

    # Ring: a skirt hanging from high on the stem, with soft folds and a torn edge.
    ring_profile = [(0.0124, 0.1175), (0.0148, 0.1166), (0.0166, 0.1135), (0.0176, 0.1085),
                    (0.0180, 0.1030), (0.0179, 0.0980), (0.0175, 0.0935)]

    def ring_shape(th, v, r, z):
        dirn = Vector((math.cos(th), math.sin(th), 0))
        fold = (0.0018 * noise.noise(dirn * 5 + seed) + 0.0011 * noise.noise(dirn * 12 + seed)
                + 0.0005 * math.sin(17 * th + 3 * noise.noise(dirn * 3 + seed)))
        collapse = 0.55 + 0.45 * smooth(-0.6, 0.4, math.cos(th - 2.4))
        sag = noise.noise(dirn * 3 + seed * 1.7) * 0.007 + noise.noise(dirn * 9 + seed) * 0.002
        r2 = 0.0124 + (r - 0.0124) * collapse + fold * v
        z2 = z + sag * v * v - 0.003 * (1 - collapse) * v
        x, y, _ = stem_shape(th, 0.0, 0.0, z2)
        return (x + r2 * math.cos(th), y + r2 * math.sin(th), z2)

    ring = revolve("ring", ring_profile, 200, 30, ring_shape, False, False)
    solidify(ring, 0.00035, rim=False)

    # Volva: tall, loose white sac with torn, pointed lobes around the stem base.
    volva_profile = [(0.0030, -0.0030), (0.0160, -0.0015), (0.0265, 0.0050), (0.0315, 0.0150),
                     (0.0325, 0.0250), (0.0312, 0.0330), (0.0298, 0.0395)]

    def volva_shape(th, v, r, z):
        dirn = Vector((math.cos(th), math.sin(th), 0))
        # Three to four torn lobes with pointed tips.
        lobe = (1 - abs(math.cos(1.75 * th + 0.4))) ** 1.1 + 0.4 * noise.noise(dirn * 4 + seed) + 0.12 * noise.noise(dirn * 9 + seed)
        lobe = max(0.0, min(1.2, lobe))
        up = v ** 3
        # Lobes flop outwards and droop at the tips instead of standing up.
        z2 = z * (1 + up * (0.45 * lobe - 0.28)) - 0.004 * up * up * lobe
        crumple = (noise.noise(dirn * 7 + Vector((0, 0, z * 50)) + seed) * 0.11
                   + noise.noise(dirn * 18 + Vector((0, 0, z * 140)) + seed) * 0.035
                   + 0.03 * math.sin(13 * th + 6 * noise.noise(dirn * 2 + Vector((0, 0, z * 30)) + seed)))
        r2 = r * (1 + crumple + up * 0.3 * lobe)
        return (r2 * math.cos(th) + 0.002, r2 * math.sin(th), z2)

    volva = revolve("volva", volva_profile, 200, 60, volva_shape, True, False)
    solidify(volva, 0.0022)

    # Cap: deep orange-red centre fading to yellow-orange, glossy, with fine
    # radial striations near the margin.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    base = g.ramp(g.v, [(0.0, "#d0440a"), (um * 0.45, "#df580b"), (um * 0.8, "#eb7810"), (um * 0.97, "#f2a01c")])
    base = g.mix(0.3, base, g.noise(18, 4, 0.6), "OVERLAY")
    base = g.mix(0.15, base, g.noise(220, 3), "OVERLAY")
    ang = g.nt.nodes.new("ShaderNodeMath")
    ang.operation = "ARCTAN2"
    sepo = g.nt.nodes.new("ShaderNodeSeparateXYZ")
    g.link(g.obj, sepo.inputs[0])
    g.link(sepo.outputs["Y"], ang.inputs[0])
    g.link(sepo.outputs["X"], ang.inputs[1])
    stri = g.math("SINE", g.math("MULTIPLY", ang.outputs[0], 150.0))
    stri_mask = g.remap(g.v, um * 0.78, um * 0.95)
    stri = g.math("MULTIPLY", g.remap(stri, -1.0, 1.0), stri_mask)
    base = g.mix(g.math("MULTIPLY", stri, 0.35), base, "#b8481a")
    # The cuticle stays orange round the margin until the gills begin; a pale
    # strip before them read as an olive line in shade.
    under = g.remap(g.v, ug - 0.001, ug + 0.004)
    colour = g.mix(under, base, "#f3df92")
    roughness = g.lerp(under, g.remap(g.noise(25, 2), 0.3, 0.7, 0.42, 0.55), 0.78)
    height = g.math("ADD", stri, g.math("MULTIPLY", g.noise(160, 3), 0.25))
    g.finish(colour, roughness, height, 0.5, 0.0005)
    cap.data.materials.append(m)

    m = bpy.data.materials.new("gills-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#efd571"), (0.5, "#f4df86"), (1.0, "#f6e39a")])
    col = g.mix(g.remap(g.uvy, 0.7, 1.0, 0.0, 0.5), col, "#fbf0c4")
    g.finish(col, 0.75, g.noise(200, 2), 0.1, 0.0002)
    gill.data.materials.append(m)

    # Stem: yellow with paler zigzag (chiné) bands; whitish where it sits in the volva.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    band = g.noise(40, 3, 0.5, vec=g.vec_scale(g.obj, 0.35, 0.35, 1.6), distortion=1.2)
    colour = g.ramp(band, [(0.35, "#eec036"), (0.55, "#f3cc48"), (0.7, "#f6d86e")])
    colour = g.mix(0.2, colour, g.noise(300, 2, vec=g.vec_scale(g.obj, 1, 1, 0.15)), "OVERLAY")
    colour = g.mix(g.remap(g.v, 0.62, 0.8), colour, "#efe6cf")
    g.finish(colour, 0.68, band, 0.25, 0.0004)
    stem.data.materials.append(m)

    m = bpy.data.materials.new("ring-proc")
    g = Graph(m)
    colour = g.ramp(g.noise(60, 3), [(0.4, "#f1cf5e"), (0.65, "#f8e28e")])
    stri = g.noise(8, 2, vec=g.vec_scale(g.obj, 900, 900, 1))
    colour = g.mix(0.25, colour, stri, "OVERLAY")
    g.finish(colour, 0.72, stri, 0.2, 0.0003)
    ring.data.materials.append(m)

    # Volva: white, membranous, wrinkled, with soil on the lower outside.
    m = bpy.data.materials.new("volva-proc")
    g = Graph(m)
    wrink = g.noise(70, 5, 0.6, vec=g.vec_scale(g.obj, 1, 1, 2.5), distortion=0.6)
    colour = g.ramp(wrink, [(0.35, "#e3ddcf"), (0.6, "#f4f1e9")])
    soil = g.math("MULTIPLY", g.remap(g.v, 0.75, 0.25), g.remap(g.noise(45, 5, 0.65), 0.32, 0.5))
    smear = g.math("MULTIPLY", g.remap(g.noise(22, 4, 0.6, distortion=0.8), 0.5, 0.6), 0.85)
    soil = g.math("MAXIMUM", soil, smear)
    specks = g.math("MULTIPLY", g.remap(g.voronoi(120), 0.0, 0.2, 1.0, 0.0), g.remap(g.noise(12, 2), 0.44, 0.54))
    colour = g.mix(g.math("MAXIMUM", soil, specks), colour, g.ramp(g.noise(30, 3), [(0.4, "#4e3b2a"), (0.65, "#8a7355")]))
    g.finish(colour, 0.88, wrink, 0.6, 0.0008)
    volva.data.materials.append(m)

    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    views = {"hero": (-30, 14, 0.7, 0.08), "low": (25, 3, 0.66, 0.078), "under": (15, -18, 0.52, 0.1)}
    return [cap, stem, gill, ring, volva], views


SPECIES = {"boletus-edulis": cep, "lactarius-sanguifluus": rovello, "amanita-caesarea": ou_de_reig}

# Further species live in scripts/species-3d/<species-id>.py, one file each,
# so they can be written independently. Each file defines build() returning
# (objects, views) and uses the helpers above; see scripts/species-3d/README.md.
SCRIPT_PATH = os.path.abspath(sys.argv[sys.argv.index("-P") + 1]) if "-P" in sys.argv else os.path.abspath(__file__)
SPECIES_DIR = os.path.join(os.path.dirname(SCRIPT_PATH), "species-3d")


def species_builder(sid):
    if sid in SPECIES:
        return SPECIES[sid]
    path = os.path.join(SPECIES_DIR, f"{sid}.py")
    namespace = dict(globals())
    with open(path) as source:
        exec(compile(source.read(), path, "exec"), namespace)
    return namespace["build"]



# ---------------------------------------------------------------- bake + export

def setup_cycles(samples):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = "GPU"
    except Exception:
        pass
    return scene


def bake_object(obj, out_dir):
    nt = obj.data.materials[0].node_tree
    images = {}
    for kind, colourspace in (("color", "sRGB"), ("roughness", "Non-Color"), ("normal", "Non-Color")):
        size = obj.get("tex", TEX)
        img = bpy.data.images.new(f"{obj.name}-{kind}", size, size, alpha=False)
        img.colorspace_settings.name = colourspace
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = img
        for n in nt.nodes:
            n.select = False
        node.select = True
        nt.nodes.active = node
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        if kind == "color":
            bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, margin=16)
        elif kind == "roughness":
            bpy.ops.object.bake(type="ROUGHNESS", margin=16)
        else:
            bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT", margin=16)
        img.filepath_raw = os.path.join(out_dir, "tex", f"{obj.name}-{kind}.png")
        img.file_format = "PNG"
        img.save()
        nt.nodes.remove(node)
        images[kind] = img

    # Swap in the baked material that the GLB carries.
    mat = bpy.data.materials.new(obj.name)
    mat.use_nodes = True
    t = mat.node_tree
    bsdf = t.nodes["Principled BSDF"]
    c = t.nodes.new("ShaderNodeTexImage"); c.image = images["color"]
    r = t.nodes.new("ShaderNodeTexImage"); r.image = images["roughness"]
    n = t.nodes.new("ShaderNodeTexImage"); n.image = images["normal"]
    nm = t.nodes.new("ShaderNodeNormalMap")
    if "Col" in obj.data.color_attributes:
        va = t.nodes.new("ShaderNodeVertexColor")
        va.layer_name = "Col"
        mul = t.nodes.new("ShaderNodeMix")
        mul.data_type = "RGBA"
        mul.blend_type = "MULTIPLY"
        mul.inputs["Factor"].default_value = 1.0
        socks = [s for s in mul.inputs if s.type == "RGBA"]
        t.links.new(c.outputs["Color"], socks[0])
        t.links.new(va.outputs["Color"], socks[1])
        t.links.new([s for s in mul.outputs if s.type == "RGBA"][0], bsdf.inputs["Base Color"])
    else:
        t.links.new(c.outputs["Color"], bsdf.inputs["Base Color"])
    t.links.new(r.outputs["Color"], bsdf.inputs["Roughness"])
    t.links.new(n.outputs["Color"], nm.inputs["Color"])
    t.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    mat.use_backface_culling = obj.data.materials[0].use_backface_culling
    obj.data.materials[0] = mat


def render_previews(out_dir, sid, views):
    scene = setup_cycles(128)
    scene.render.resolution_x = scene.render.resolution_y = 1100
    scene.render.film_transparent = True
    # Khronos PBR Neutral keeps saturated colours honest and matches the
    # neutral tone mapping of web glTF viewers.
    try:
        scene.view_settings.view_transform = "Khronos PBR Neutral"
    except TypeError:
        scene.view_settings.view_transform = "Standard"
    # Keep saturated caps below clipping; overexposure washes orange to pink.
    scene.view_settings.exposure = -0.9

    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    wt = world.node_tree
    env = wt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(FOREST_HDR)
    wt.links.new(env.outputs["Color"], wt.nodes["Background"].inputs["Color"])
    wt.nodes["Background"].inputs["Strength"].default_value = 1.1
    scene.world = world
    key = bpy.data.objects.new("key", bpy.data.lights.new("key", "AREA"))
    key.data.energy = 6
    key.data.size = 0.35
    key.location = (-0.35, -0.3, 0.45)
    key.rotation_euler = (Vector((0, 0, 0.06)) - key.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.collection.objects.link(key)

    bpy.ops.mesh.primitive_plane_add(size=2)
    ground = bpy.context.active_object
    ground.is_shadow_catcher = True

    fill = bpy.data.objects.new("fill", bpy.data.lights.new("fill", "AREA"))
    fill.data.size = 0.25
    bpy.context.collection.objects.link(fill)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 90
    bpy.context.collection.objects.link(cam)
    scene.camera = cam
    for label, (az, el, dist, tz) in views.items():
        target = Vector((0, 0, tz))
        ground.hide_render = el < 0
        a, e = math.radians(az), math.radians(el)
        cam.location = target + Vector((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e))) * dist
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
        # Soft fill from beside the lens, as a field photographer would use.
        fill.location = cam.location + (cam.rotation_euler.to_quaternion() @ Vector((0.08, 0.05, 0)))
        fill.rotation_euler = (target - fill.location).to_track_quat("-Z", "Y").to_euler()
        fill.data.energy = 0.8 if el < 0 else 0.25
        scene.render.filepath = os.path.join(out_dir, f"{sid}-{label}.png")
        bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    sid, out_dir = argv[0], os.path.abspath(argv[1])
    os.makedirs(os.path.join(out_dir, "tex"), exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs, views = species_builder(sid)()
    setup_cycles(1)
    for o in objs:
        bake_object(o, out_dir)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(out_dir, f"{sid}.glb"),
        use_selection=True,
        export_format="GLB",
        export_image_format="WEBP",
        export_image_quality=85,
        export_tangents=True,
        export_draco_mesh_compression_enable=True,
        export_apply=True,
    )
    render_previews(out_dir, sid, views)


main()
