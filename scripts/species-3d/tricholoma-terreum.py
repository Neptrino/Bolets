"""Tricholoma terreum (fredolic): a small group of three under pines.

Morphology (data/species.ts): grey, fibrillose to slightly scaly cap with a
discreet umbo; white to pale grey, fairly spaced gills; slim whitish stem
with no ring; fragile. The group shows the stages the profile's variation
describes: a young conical-convex cap, a middle one and an expanded cap
with a low umbo and a margin that splits. Gills are notched just before the
stem (emarginate, as in every Tricholoma) and attach to it without running
down.
"""
from mathutils import Euler


def _tt_gills(name, cap_profile, samples, j_start, cap_shape, stem_radius, count, depth, seed):
    """Emarginate gill blades: the free edge rises into a notch just before
    the stem, then the blade meets the stem with a short tooth. Adapted from
    the generator's gills() helper (no stains, no decurrent run)."""
    prof = catmull(cap_profile, samples)
    j_stem = samples - 1
    for j in range(j_start, samples):
        if prof[j].x <= stem_radius(prof[j].y) - 0.0006:
            j_stem = j
            break

    rng = [noise.noise(Vector((k * 0.913, 1.7, 0.3)) + seed) * 0.5 + 0.5 for k in range(count * 4)]
    ranks = []
    for k in range(count):
        base = 2 * math.pi * k / count + 0.012 * noise.noise(Vector((k * 0.37, 0.5, 2.0)) + seed)
        ranks.append((base, 0.0))
        ranks.append((base + math.pi / count, 0.62 + 0.16 * rng[4 * k]))
    verts, faces, uvs, cols = [], [], [], []
    steps = 60
    for gi, (th, t0) in enumerate(ranks):
        tint = 0.955 + 0.045 * (noise.noise(Vector((gi * 0.21, 3.0, 0.0)) + seed) * 0.5 + 0.5)
        row = []
        for s in range(steps):
            t = 1 - (1 - t0) * s / (steps - 1)
            f = j_start + (1 - t) * (j_stem - j_start)
            j0 = min(int(f), samples - 2)
            pr = prof[j0].lerp(prof[j0 + 1], f - j0)
            tan = (prof[min(j0 + 1, samples - 1)] - prof[max(j0 - 1, 0)]).normalized()
            nr, nz = tan.y, -tan.x
            if nz > 0:
                nr, nz = -nr, -nz
            v = f / (samples - 1)
            n3 = Vector((nr * math.cos(th), nr * math.sin(th), nz))
            start = smooth(t0, t0 + 0.05, t) if t0 > 0 else 1.0
            d = depth * start * (1 - smooth(0.88, 1.0, t)) * (0.7 + 0.3 * smooth(0.1, 0.5, t))
            # Emarginate: a notch rising towards the stem, then a short tooth.
            d *= 0.35 + 0.65 * smooth(0.02, 0.2, t)
            base = Vector(cap_shape(th, v, pr.x, pr.y))
            top, bot = base - n3 * 0.0005, base + n3 * d
            for e, pos in ((0, top), (1, bot)):
                row.append(len(verts))
                verts.append(pos)
                uvs.append((t, e))
                occl = 0.93 if e == 0 else 1.0
                cols.append([tint * occl] * 3)
        for s in range(steps - 1):
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


# Cap profiles in cap-radius units, relative to the stem apex: centre top,
# over the margin (index 7) and back under to the stem (last point).
_STAGES = {
    # Expanded, low umbo, margin still slightly decurved.
    "mature": [(0.0, 0.31), (0.13, 0.305), (0.28, 0.27), (0.45, 0.2), (0.63, 0.095), (0.8, -0.04),
               (0.93, -0.2), (0.985, -0.31), (0.968, -0.334), (0.85, -0.275), (0.66, -0.165),
               (0.45, -0.075), (0.3, -0.025), (0.22, 0.0)],
    # Convex with a broad umbo, margin turned down.
    "middle": [(0.0, 0.40), (0.14, 0.39), (0.3, 0.335), (0.48, 0.23), (0.66, 0.08), (0.82, -0.11),
               (0.93, -0.30), (0.97, -0.42), (0.95, -0.445), (0.83, -0.37), (0.65, -0.23),
               (0.46, -0.11), (0.31, -0.035), (0.22, 0.0)],
    # Young, conical-convex, margin close to the stem.
    "young": [(0.0, 0.58), (0.14, 0.565), (0.31, 0.48), (0.5, 0.30), (0.68, 0.07), (0.82, -0.18),
              (0.91, -0.40), (0.93, -0.53), (0.88, -0.56), (0.78, -0.45), (0.61, -0.28),
              (0.45, -0.14), (0.33, -0.05), (0.26, 0.0)],
}


def _cap_material(name, um, ug, seed_off):
    m = bpy.data.materials.new(name)
    g = Graph(m)
    # Polar coordinates without a seam: the unit direction (fine across the
    # angle) plus the distance from the axis (coarse), so noise streaks run
    # radially like the cap's fibrils.
    sep = g.nt.nodes.new("ShaderNodeSeparateXYZ")
    g.link(g.obj, sep.inputs[0])
    flat = g.vec_scale(g.obj, 1, 1, 0)
    nrm = g.nt.nodes.new("ShaderNodeVectorMath")
    nrm.operation = "NORMALIZE"
    g.link(flat, nrm.inputs[0])

    def polar(a, b):
        sc = g.nt.nodes.new("ShaderNodeVectorMath")
        sc.operation = "SCALE"
        sc.inputs["Scale"].default_value = a
        g.link(nrm.outputs[0], sc.inputs[0])
        comb = g.nt.nodes.new("ShaderNodeCombineXYZ")
        g.link(g.math("ADD", g.math("MULTIPLY", g.radial(), b), seed_off), comb.inputs["Z"])
        add = g.nt.nodes.new("ShaderNodeVectorMath")
        add.operation = "ADD"
        g.link(sc.outputs[0], add.inputs[0])
        g.link(comb.outputs[0], add.inputs[1])
        return add.outputs[0]

    fib = g.noise(1.0, 4, 0.6, vec=polar(60, 320), distortion=0.6)
    fib2 = g.noise(1.0, 3, 0.5, vec=polar(150, 700))
    scales_d = g.voronoi(1.0, vec=polar(26, 520), rand=1.0)
    centre = g.remap(g.v, 0.0, um * 0.8, 1.0, 0.0)
    big = g.noise(14, 4, 0.6, distortion=0.4)
    base = g.ramp(big, [(0.3, "#58514c"), (0.55, "#645d57"), (0.75, "#716a63")])
    # Felty mottling: dark tufts of fibrils in irregular patches.
    felt = g.noise(70, 6, 0.7, distortion=0.9)
    base = g.mix(g.remap(felt, 0.48, 0.7, 0.0, 0.7), base, "#38322e")
    # Darker, denser felt at the centre; paler, silvery towards the margin.
    base = g.mix(g.math("MULTIPLY", centre, 0.9), base, "#2c2724")
    base = g.mix(g.remap(g.v, um * 0.6, um * 0.97, 0.0, 0.3), base, "#8e8780")
    streak = g.remap(fib, 0.4, 0.68)
    base = g.mix(g.math("MULTIPLY", streak, 0.4), base, "#3a3431")
    base = g.mix(g.math("MULTIPLY", g.remap(fib2, 0.58, 0.75), 0.2), base, "#948e87")
    # Tiny appressed squamules, most visible between centre and mid-cap.
    sq = g.remap(scales_d, 0.0, 0.3, 1.0, 0.0)
    sq_mask = g.math("MULTIPLY", g.remap(g.v, 0.0, um * 0.85, 1.0, 0.15), g.remap(g.noise(30, 2), 0.38, 0.52))
    base = g.mix(g.math("MULTIPLY", sq, g.math("MULTIPLY", sq_mask, 0.7)), base, "#2e2926")
    base = g.mix(0.2, base, g.noise(320, 3), "OVERLAY")
    # A thin pale rim, then the white flesh edge and the underside.
    base = g.mix(g.remap(g.v, um - 0.006, um + 0.002, 0.0, 0.6), base, "#a8a29b")
    under = g.remap(g.v, um + 0.001, ug + 0.006)
    colour = g.mix(under, base, "#c9c5bf")
    roughness = g.lerp(under, g.remap(g.noise(30, 2), 0.3, 0.7, 0.72, 0.84), 0.85)
    height = g.math("ADD", g.math("ADD", g.math("MULTIPLY", streak, 0.4), g.math("MULTIPLY", sq, 0.35)), g.math("MULTIPLY", felt, 0.4))
    g.finish(colour, roughness, height, 0.2, 0.0004)
    return m


def _stem_material(name, soil_from):
    m = bpy.data.materials.new(name)
    g = Graph(m)
    fibres = g.noise(160, 4, 0.55, vec=g.vec_scale(g.obj, 1, 1, 0.06))
    colour = g.ramp(fibres, [(0.3, "#e0dfdb"), (0.55, "#ecebe8"), (0.75, "#f5f5f2")])
    colour = g.mix(g.math("MULTIPLY", g.remap(fibres, 0.55, 0.8), 0.4), colour, "#aca79e")
    colour = g.mix(0.15, colour, g.noise(300, 2), "OVERLAY")
    # A faint greyish flush below the gills; soil and needle dirt at the base.
    colour = g.mix(g.remap(g.v, 0.0, 0.12, 0.35, 0.0), colour, "#c9c5be")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.12)
    band = g.remap(g.math("ADD", g.v, side), soil_from, soil_from + 0.14)
    soil = g.math("MULTIPLY", band, g.remap(g.noise(70, 5, 0.65), 0.36, 0.5))
    colour = g.mix(soil, colour, g.ramp(g.noise(30, 3), [(0.4, "#6b5a47"), (0.65, "#8f7d66")]))
    g.finish(colour, 0.78, fibres, 0.45, 0.0004)
    return m


def _gill_material(name):
    m = bpy.data.materials.new(name)
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#efeeea"), (0.5, "#f3f2ef"), (1.0, "#ebe9e5")])
    # White to pale grey: the free edge carries a faint grey tint.
    col = g.mix(g.remap(g.uvy, 0.75, 1.0, 0.0, 0.35), col, "#b9b5ae")
    col = g.mix(0.12, col, g.noise(40, 2, vec=g.vec_scale(g.obj, 1, 1, 1)), "OVERLAY")
    g.finish(col, 0.8, g.noise(200, 2), 0.1, 0.0002)
    return m


def _specimen(tag, stage, R, apex, stem_r, base_r, seed, tilt, splits, gill_count, gill_depth, tex):
    prof = [(x * R, apex + z * R) for x, z in _STAGES[stage]]
    samples = 150
    tilt_e = Euler(tilt)
    um = arc_fraction(prof, 7)
    ug = arc_fraction(prof, 8)

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * (0.45 / R) + seed
        edge = smooth(0.15, um, v)
        w = noise.noise(q) * 0.06 + noise.noise(q * 2.5) * 0.02 + noise.noise(q * 6.0) * 0.006
        # Wavy margin and a few short radial splits (the rim is pulled in
        # and lifted inside a narrow wedge).
        wave = 0.06 * math.sin(3 * th + seed.x) + 0.035 * math.sin(5 * th + seed.y) + 0.03 * noise.noise(Vector((math.cos(th), math.sin(th), 0)) * 2.5 + seed)
        split = 0.0
        for ang, k in splits:
            da = math.atan2(math.sin(th - ang), math.cos(th - ang))
            split += k * math.exp(-(da / 0.06) ** 2)
        rim = smooth(um - 0.12, um, v) * (1 - smooth(um, um + 0.15, v))
        r2 = r * (1 + (w + wave * rim) * edge - split * rim)
        z2 = z + (w * 0.25 * R + wave * 0.12 * R * rim) * edge + split * 0.15 * R * rim
        top = 1 - smooth(um - 0.05, um, v)
        z2 += noise.noise(p * (1.6 / R) + seed) * 0.02 * R * top
        # Tilt the cap about the stem apex so the joint stays closed.
        out = Vector((r2 * math.cos(th), r2 * math.sin(th), z2 - apex))
        out.rotate(tilt_e)
        return (out.x, out.y, out.z + apex)

    stem_profile = [
        (stem_r * 1.08, apex + 0.08 * R), (stem_r * 1.0, apex - 0.1 * R), (stem_r * 0.97, apex * 0.7),
        (stem_r * 1.0, apex * 0.45), (base_r, apex * 0.2), (base_r * 1.02, apex * 0.08),
        (base_r * 0.95, 0.002), (base_r * 0.62, -0.0022), (0.001, -0.0032),
    ]
    lean = Vector((math.cos(seed.z), math.sin(seed.z))) * 0.07 * apex

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * (6 / apex))) + seed
        r *= 1 + (noise.noise(p) * 0.05 + noise.noise(p * 3) * 0.015) * (1 - smooth(apex - 0.2 * R, apex, z))
        k = (1 - min(max(z, 0), apex) / apex) ** 2  # the base wanders off-axis
        return (r * math.cos(th) + lean.x * k, r * math.sin(th) + lean.y * k, z)

    cap = revolve(f"cap-{tag}", prof, 256 if R > 0.02 else 192, samples, cap_shape, True, False)
    stem = revolve(f"stem-{tag}", stem_profile, 128, 90, stem_shape, True, True)
    sp = catmull(stem_profile, 300)

    def stem_radius(z):
        return min(sp, key=lambda p: abs(p.y - z)).x

    gill = _tt_gills(f"gills-{tag}", prof, samples, int(round(ug * (samples - 1))), cap_shape, stem_radius,
                     gill_count, gill_depth, seed)
    cap.data.materials.append(_cap_material(f"cap-{tag}-proc", um, ug, seed.x))
    stem.data.materials.append(_stem_material(f"stem-{tag}-proc", 0.82))
    gill.data.materials.append(_gill_material(f"gills-{tag}-proc"))
    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    cap["tex"] = tex
    stem["tex"] = min(tex, 1024)
    return [cap, stem, gill]


def _place(objs, loc, rot):
    for o in objs:
        o.location = loc
        o.rotation_euler = (o.rotation_euler[0] + rot[0], o.rotation_euler[1] + rot[1], o.rotation_euler[2] + rot[2])


def build():
    r = math.radians
    a = _specimen("a", "mature", 0.029, 0.052, 0.0068, 0.0073, Vector((3.3, 8.1, 0.7)),
                  (r(4), r(-3), 0), [(0.6, 0.09), (2.9, 0.06), (4.4, 0.08)], 46, 0.0042, 2048)
    b = _specimen("b", "middle", 0.020, 0.042, 0.0052, 0.0057, Vector((7.1, 2.4, 2.2)),
                  (r(-3), r(5), 0), [(1.8, 0.06)], 40, 0.0032, 1024)
    c = _specimen("c", "young", 0.0135, 0.030, 0.0041, 0.0045, Vector((1.2, 5.6, 4.0)),
                  (r(2), r(2), 0), [], 34, 0.0024, 1024)
    _place(a, (0, 0, 0), (0, 0, 0))
    _place(b, (0.042, 0.026, 0), (r(-7), r(12), r(40)))
    _place(c, (-0.02, -0.034, 0), (r(10), r(-8), r(-20)))
    views = {"hero": (-30, 24, 0.42, 0.03), "low": (25, 4, 0.42, 0.034), "under": (15, -22, 0.38, 0.04)}
    return a + b + c, views
