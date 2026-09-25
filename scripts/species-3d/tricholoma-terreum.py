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


def _tt_gills(name, cap_profile, samples, j_start, cap_shape, stem_radius, count, depth, seed, margin_z):
    """Emarginate gill blades: the free edge rises into a notch just before
    the stem, then the blade meets the stem with a short tooth. Adapted from
    the generator's gills() helper (no stains, no decurrent run).

    margin_z(th) is the height of the margin tip along each radius: the free
    edge is kept just above it, so no blade hangs below the rim."""
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
        step = 2 * math.pi / count
        if rng[4 * k + 1] > 0.45:
            # A longer lamellula; the short ones near the margin read as
            # teeth, so they are left out.
            ranks.append((base + step * 0.5, 0.55 + 0.12 * rng[4 * k]))
        else:
            ranks.append((base + step * 0.5, 0.6 + 0.14 * rng[4 * k]))
    verts, faces, uvs, cols = [], [], [], []
    steps = 60
    for gi, (th, t0) in enumerate(ranks):
        tint = 0.93 + 0.07 * (noise.noise(Vector((gi * 0.21, 3.0, 0.0)) + seed) * 0.5 + 0.5)
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
            # Lamellulae start as a gentle wedge; every blade tapers to
            # nothing over the outer half, inside the margin.
            start = smooth(t0, t0 + 0.15, t) if t0 > 0 else 1.0
            d = depth * start * (1 - smooth(0.5, 1.0, t)) * (0.7 + 0.3 * smooth(0.1, 0.5, t))
            # Emarginate: a notch rising towards the stem, then a short tooth.
            d *= (0.5 + 0.5 * smooth(0.0, 0.25, t)) * (1 - 0.8 * math.exp(-((t - 0.075) / 0.038) ** 2))
            # Both edges go through the cap's own deformation (tilt, waves,
            # splits), so blades stay straight and perpendicular to the flesh.
            top = Vector(cap_shape(th, v, pr.x - nr * 0.0005, pr.y - nz * 0.0005))
            bot = Vector(cap_shape(th, v, pr.x + nr * d, pr.y + nz * d))
            zmin = margin_z(th) + 0.0003
            if bot.z < zmin:
                bot = top.lerp(bot, max(0.08, (top.z - zmin) / (top.z - bot.z)) if top.z > zmin + 0.0001 else 0.08)
            for e, pos in ((0, top), (1, bot)):
                row.append(len(verts))
                verts.append(pos)
                uvs.append((t, e))
                occl = 0.86 if e == 0 else 1.0
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


# Cap profiles in cap-radius units, relative to the stem apex: centre top
# (with a low, blunt umbo), over the thin margin (tip index given) and back
# under to the stem (last point, inside the stem).
_STAGES = {
    # Convex-expanded, cap height about a quarter of its width, low umbo.
    "mature": ([(0.0, 0.27), (0.07, 0.268), (0.14, 0.255), (0.2, 0.232), (0.3, 0.212), (0.45, 0.178),
                (0.62, 0.115), (0.78, 0.03), (0.9, -0.08), (0.97, -0.18), (1.0, -0.235),
                (0.985, -0.248), (0.9, -0.212), (0.75, -0.152), (0.55, -0.082), (0.38, -0.033),
                (0.26, -0.008), (0.15, 0.0)], 10),
    # Conical-convex with a clearer umbo, margin turned down.
    "middle": ([(0.0, 0.46), (0.08, 0.455), (0.16, 0.43), (0.22, 0.392), (0.32, 0.352), (0.5, 0.25),
                (0.66, 0.11), (0.8, -0.06), (0.9, -0.22), (0.95, -0.33), (0.935, -0.345),
                (0.83, -0.28), (0.66, -0.18), (0.48, -0.09), (0.32, -0.03), (0.15, 0.0)], 9),
    # Young, conical, obvious umbo, margin close to the stem.
    "young": ([(0.0, 0.66), (0.08, 0.655), (0.16, 0.62), (0.22, 0.572), (0.33, 0.5), (0.5, 0.33),
               (0.66, 0.12), (0.79, -0.1), (0.88, -0.3), (0.92, -0.43), (0.905, -0.447),
               (0.8, -0.37), (0.63, -0.24), (0.46, -0.12), (0.32, -0.04), (0.16, 0.0)], 9),
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

    dens = g.remap(g.v, 0.0, um * 0.95, 1.0, 0.0)
    # Paler silver-grey ground, a little browner and darker at the centre.
    big = g.noise(14, 4, 0.6, distortion=0.4)
    base = g.ramp(big, [(0.3, "#726c66"), (0.55, "#7c7670"), (0.75, "#87817b")])
    base = g.mix(g.math("MULTIPLY", g.remap(g.v, 0.0, um * 0.6, 1.0, 0.0), 0.8), base, "#403a36")
    # Fine dark radial fibrils, dense at the centre, sparser towards the
    # margin where the ground shows through; broken up by patches.
    fib = g.noise(1.0, 3, 0.55, vec=polar(45, 260), distortion=0.25)
    fib2 = g.noise(1.0, 2, 0.5, vec=polar(110, 520))
    patch = g.remap(g.noise(35, 4, 0.6, distortion=1.0), 0.3, 0.65, 0.45, 1.0)
    fibril = g.math("MAXIMUM", g.remap(fib, 0.47, 0.64), g.math("MULTIPLY", g.remap(fib2, 0.5, 0.66), 0.7))
    fibril = g.math("MULTIPLY", fibril, g.math("MULTIPLY", patch, g.lerp(dens, 0.4, 1.0)))
    base = g.mix(g.math("MULTIPLY", fibril, 0.9), base, "#2d2825")
    # Felty tufts and tiny appressed squamules, dense at the centre.
    felt = g.noise(70, 6, 0.7, distortion=0.9)
    base = g.mix(g.math("MULTIPLY", g.remap(felt, 0.52, 0.72, 0.0, 0.5), dens), base, "#3a3430")
    sq_d = g.voronoi(1.0, vec=polar(22, 420), rand=1.0)
    sq_size = g.remap(g.noise(90, 2), 0.3, 0.7, 0.1, 0.3)
    sq = g.math("MULTIPLY", g.math("LESS_THAN", sq_d, sq_size), g.remap(g.noise(160, 2), 0.35, 0.6))
    sq = g.math("MULTIPLY", sq, g.math("MULTIPLY", dens, g.remap(g.noise(22, 3, distortion=0.8), 0.3, 0.55, 0.3, 1.0)))
    base = g.mix(g.math("MULTIPLY", sq, 0.8), base, "#2c2724")
    base = g.mix(0.15, base, g.noise(320, 3), "OVERLAY")
    streak, clump = fibril, sq
    # A thin pale rim, then the white flesh edge and the underside.
    base = g.mix(g.remap(g.v, um - 0.004, um + 0.001, 0.0, 0.25), base, "#8a847d")
    under = g.remap(g.v, um + 0.001, ug)
    colour = g.mix(under, base, "#c4c0ba")
    roughness = g.lerp(under, g.remap(g.noise(30, 2), 0.3, 0.7, 0.72, 0.84), 0.85)
    height = g.math("ADD", g.math("ADD", g.math("MULTIPLY", streak, 0.6), g.math("MULTIPLY", sq, 0.5)), g.math("MULTIPLY", felt, 0.25))
    g.finish(colour, roughness, height, 0.45, 0.0003)
    return m


def _stem_material(name, soil_from):
    """Off-white with a faint grey tint, finely fibrillose lengthwise, with
    greyish fibrils near the apex and soil at the base."""
    m = bpy.data.materials.new(name)
    g = Graph(m)
    long_vec = g.vec_scale(g.obj, 1, 1, 0.03)
    fibres = g.noise(750, 4, 0.6, vec=long_vec, distortion=0.3)
    coarse = g.noise(150, 3, 0.55, vec=g.vec_scale(g.obj, 1, 1, 0.08))
    colour = g.ramp(g.noise(35, 3), [(0.3, "#d6d4cf"), (0.6, "#dfddd9"), (0.8, "#e6e4e0")])
    colour = g.mix(g.math("MULTIPLY", g.remap(fibres, 0.52, 0.72), 0.45), colour, "#b3afa9")
    colour = g.mix(g.math("MULTIPLY", g.remap(coarse, 0.58, 0.75), 0.25), colour, "#b8b4ae")
    colour = g.mix(g.math("MULTIPLY", g.remap(fibres, 0.25, 0.4, 1.0, 0.0), 0.35), colour, "#e8e6e1")
    # Greyish fibrils under the gills fading down the upper third.
    top = g.remap(g.v, 0.0, 0.4, 1.0, 0.0)
    grey = g.math("MULTIPLY", top, g.remap(g.noise(90, 4, 0.6, vec=g.vec_scale(g.obj, 1, 1, 0.12)), 0.42, 0.62))
    colour = g.mix(g.math("MULTIPLY", grey, 0.6), colour, "#9a958f")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.04)
    band = g.remap(g.math("ADD", g.v, side), soil_from, soil_from + 0.05)
    soil = g.math("MULTIPLY", band, g.remap(g.noise(70, 5, 0.65), 0.36, 0.5))
    colour = g.mix(soil, colour, g.ramp(g.noise(30, 3), [(0.4, "#6b5a47"), (0.65, "#8f7d66")]))
    roughness = g.remap(fibres, 0.3, 0.7, 0.72, 0.84)
    height = g.math("ADD", g.math("MULTIPLY", fibres, 0.7), g.math("MULTIPLY", coarse, 0.5))
    g.finish(colour, roughness, height, 0.6, 0.0003)
    return m


def _gill_material(name):
    m = bpy.data.materials.new(name)
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#f4f3f0"), (0.5, "#f8f7f5"), (1.0, "#f1f0ed")])
    # White to pale grey: the free edge carries a faint grey tint.
    col = g.mix(g.remap(g.uvy, 0.8, 1.0, 0.0, 0.2), col, "#cfccc7")
    col = g.mix(0.12, col, g.noise(40, 2, vec=g.vec_scale(g.obj, 1, 1, 1)), "OVERLAY")
    g.finish(col, 0.8, g.noise(200, 2), 0.1, 0.0002)
    return m


def _specimen(tag, stage, R, apex, stem_r, base_r, seed, tilt, splits, gill_count, gill_depth, tex):
    pts, tip = _STAGES[stage]
    prof = [(x * R, apex + z * R) for x, z in pts]
    samples = 150
    tilt_e = Euler(tilt)
    um = arc_fraction(prof, tip)
    # Gills begin just inside the lowest point of the margin.
    ug = 0.5 * (arc_fraction(prof, tip + 1) + arc_fraction(prof, tip + 2))

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * (0.45 / R) + seed
        edge = smooth(0.15, um, v)
        w = noise.noise(q) * 0.06 + noise.noise(q * 2.5) * 0.02 + noise.noise(q * 6.0) * 0.006
        # Wavy margin and a few short radial splits (the rim is pulled in
        # and lifted inside a narrow wedge).
        wave = 0.06 * math.sin(3 * th + seed.x) + 0.035 * math.sin(5 * th + seed.y) + 0.03 * noise.noise(Vector((math.cos(th), math.sin(th), 0)) * 2.5 + seed)
        # Torn splits: a narrow, ragged tear near the margin whose two flaps
        # curl up slightly, not a clean V cut.
        split = 0.0
        curl = 0.0
        for ang, k, reach in splits:
            da = abs(math.atan2(math.sin(th - ang), math.cos(th - ang)))
            sv = smooth(um - reach, um, v) * (1 - smooth(um + 0.01, um + 0.1, v))
            ragged = 0.65 + 0.7 * (noise.noise(Vector((ang, v * 45, 0.3)) + seed) * 0.5 + 0.5)
            wid = 0.03 * ragged * (0.4 + 0.6 * sv)
            if da < wid:
                split += k * sv * (1 - (da / wid) ** 2)
            elif da < wid * 3.5:
                curl += k * sv * (1 - (da - wid) / (wid * 2.5))
        rim = smooth(um - 0.12, um, v) * (1 - smooth(um, um + 0.15, v))
        r2 = r * (1 + (w + wave * rim) * edge - split)
        z2 = z + (w * 0.25 * R + wave * 0.12 * R * rim) * edge + (split * 0.12 + curl * 0.35) * R
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
        dirn = Vector((math.cos(th), math.sin(th), 0))
        uneven = (noise.noise(p) * 0.06 + noise.noise(p * 3) * 0.02
                  + noise.noise(Vector((0, 0, z * (3 / apex))) + seed * 1.3) * 0.07
                  + noise.noise(dirn * 9 + Vector((0, 0, z * (1.5 / apex))) + seed) * 0.012)
        r *= 1 + uneven * (1 - smooth(apex - 0.2 * R, apex, z))
        k = (1 - min(max(z, 0), apex) / apex) ** 2  # the base wanders off-axis
        return (r * math.cos(th) + lean.x * k, r * math.sin(th) + lean.y * k, z)

    cap = revolve(f"cap-{tag}", prof, 256 if R > 0.02 else 192, samples, cap_shape, True, False)
    stem = revolve(f"stem-{tag}", stem_profile, 128, 90, stem_shape, True, True)
    sp = catmull(stem_profile, 300)

    def stem_radius(z):
        return min(sp, key=lambda p: abs(p.y - z)).x

    gill = _tt_gills(f"gills-{tag}", prof, samples, int(round(ug * (samples - 1))), cap_shape, stem_radius,
                     gill_count, gill_depth, seed, lambda th: cap_shape(th, um, prof[tip][0], prof[tip][1])[2])
    cap.data.materials.append(_cap_material(f"cap-{tag}-proc", um, ug, seed.x))
    stem.data.materials.append(_stem_material(f"stem-{tag}-proc", 0.9))
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
    a = _specimen("a", "mature", 0.029, 0.060, 0.0052, 0.0055, Vector((3.3, 8.1, 0.7)),
                  (r(7), r(-4), 0), [(0.6, 0.13, 0.16), (2.9, 0.08, 0.1), (4.5, 0.11, 0.13)], 44, 0.0040, 2048)
    b = _specimen("b", "middle", 0.020, 0.045, 0.0036, 0.0038, Vector((7.1, 2.4, 2.2)),
                  (r(-6), r(5), 0), [(1.8, 0.07, 0.09)], 38, 0.0030, 1024)
    c = _specimen("c", "young", 0.0135, 0.031, 0.0025, 0.0027, Vector((1.2, 5.6, 4.0)),
                  (r(5), r(-6), 0), [], 32, 0.0022, 1024)
    _place(a, (0, 0, 0), (0, 0, 0))
    _place(b, (0.056, -0.004, 0), (r(-4), r(11), r(40)))
    _place(c, (-0.045, -0.014, 0), (r(6), r(-10), r(-20)))
    views = {"hero": (-30, 22, 0.37, 0.036), "low": (25, 4, 0.43, 0.038), "under": (5, -38, 0.4, 0.05)}
    return a + b + c, views
