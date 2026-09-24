"""Macrolepiota procera (apagallums): a mature open parasol. Large, nearly
flat cap with a dark central umbo and brown scales breaking up on a cream,
fibrous background, shaggy margin; free, crowded white-cream gills; a tall,
slender stem banded with a brown snakeskin (zigzag) pattern; a thick, double,
movable ring; bulbous base."""
import math

from mathutils import Vector, noise


def _xyz(g):
    sep = g.nt.nodes.new("ShaderNodeSeparateXYZ")
    g.link(g.obj, sep.inputs[0])
    return sep.outputs["X"], sep.outputs["Y"], sep.outputs["Z"]


def _warp(g, vec, scale, amount):
    """Offset a vector by coloured noise so cellular patterns lose their regularity."""
    wn = g.nt.nodes.new("ShaderNodeTexNoise")
    wn.inputs["Scale"].default_value = scale
    wn.inputs["Detail"].default_value = 3
    g.link(vec, wn.inputs["Vector"])
    sub = g.nt.nodes.new("ShaderNodeVectorMath")
    sub.operation = "SUBTRACT"
    g.link(wn.outputs["Color"], sub.inputs[0])
    sub.inputs[1].default_value = (0.5, 0.5, 0.5)
    sc = g.nt.nodes.new("ShaderNodeVectorMath")
    sc.operation = "SCALE"
    sc.inputs["Scale"].default_value = amount
    g.link(sub.outputs[0], sc.inputs[0])
    add = g.nt.nodes.new("ShaderNodeVectorMath")
    add.operation = "ADD"
    g.link(vec, add.inputs[0])
    g.link(sc.outputs[0], add.inputs[1])
    return add.outputs[0]


def _polar(g, circle, radial):
    flat = g.vec_scale(g.obj, 1, 1, 0)
    nrm = g.nt.nodes.new("ShaderNodeVectorMath")
    nrm.operation = "NORMALIZE"
    g.link(flat, nrm.inputs[0])
    sc = g.nt.nodes.new("ShaderNodeVectorMath")
    sc.operation = "SCALE"
    sc.inputs["Scale"].default_value = circle
    g.link(nrm.outputs[0], sc.inputs[0])
    comb = g.nt.nodes.new("ShaderNodeCombineXYZ")
    g.link(g.math("MULTIPLY", g.radial(), radial), comb.inputs["Z"])
    add = g.nt.nodes.new("ShaderNodeVectorMath")
    add.operation = "ADD"
    g.link(sc.outputs[0], add.inputs[0])
    g.link(comb.outputs[0], add.inputs[1])
    return add.outputs[0]


def build():
    seed = Vector((4.4, 2.6, 9.1))
    STEM_TOP = 0.268

    # ------------------------------------------------------------ cap
    # Open parasol: a low boss (umbo) in the centre, a slight dip around it,
    # then a gently sloping plate to a thin margin. The underside rises gently
    # to the stem, so the hymenium is almost flat, as in an expanded cap.
    cap_profile = [
        (0.000, 0.2900), (0.006, 0.2893), (0.012, 0.2862), (0.017, 0.2832),
        (0.024, 0.2822), (0.036, 0.2808), (0.052, 0.2770), (0.068, 0.2712),
        (0.082, 0.2628), (0.093, 0.2558), (0.1005, 0.2500), (0.1028, 0.2466),
        (0.1008, 0.2450), (0.0950, 0.2472), (0.0800, 0.2532), (0.0620, 0.2598),
        (0.0440, 0.2638), (0.0280, 0.2664), (0.0165, 0.2678), (0.0110, 0.2690),
        (0.0060, 0.2700),
    ]
    samples = 230
    CT, ST = math.cos(math.radians(5)), math.sin(math.radians(5))
    CT2, ST2 = math.cos(math.radians(3)), math.sin(math.radians(3))
    um = arc_fraction(cap_profile, 11)  # margin tip

    rec = []  # per-vertex scale attributes, filled while the cap is revolved
    recording = [False]
    core_n = lambda d: 0.028 + 0.005 * noise.noise(d * 4 + seed)

    def layer(c, s_, r, A, K, B, off):
        q = Vector((c * A * K, s_ * A * K, r * B * K)) + off
        q += Vector((noise.noise(q * 0.35), noise.noise(q * 0.35 + Vector((5, 1, 3))), noise.noise(q * 0.35 + Vector((2, 7, 1))))) * 0.35
        # Ragged, torn flake edges.
        q += Vector((noise.noise(q * 1.6), noise.noise(q * 1.6 + Vector((3, 9, 4))), noise.noise(q * 1.6 + Vector((8, 2, 6))))) * 0.12
        d, pts = noise.voronoi(q, distance_metric="DISTANCE", exponent=2.5)
        pc = pts[0] - off
        return d[1] - d[0], pc.z / (B * K), (r * B * K + off.z - pts[0].z), pts[0]

    def flake_field(th, r):
        """Brown cuticle: continuous around the umbo, cracking outwards into
        concentric, imbricate flakes that get smaller, paler and sparser
        towards the margin. Returns (height m, cover, tone, raised lip)."""
        c, s_ = math.cos(th), math.sin(th)
        dirn = Vector((c, s_, 0))
        core = core_n(dirn)
        e, rc, rel, pid = layer(c, s_, r, 0.035, 68.0, 1.5, seed * 3)
        r_in = 0.058 + 0.008 * noise.noise(dirn * 5 + seed * 2)
        inner = rc < r_in
        if inner:
            t = smooth(core, r_in, rc)
            gap = 0.004 + 0.09 * t * t
            h0 = 0.0016 - 0.0005 * t
            present = 1.0
        else:
            e, rc, rel, pid = layer(c, s_, r, 0.075, 125.0, 1.9, seed * 5)
            t = smooth(r_in, 0.1, rc)
            gap = 0.1 + 0.14 * t
            h0 = 0.0011 - 0.0005 * t
            rnd = noise.noise(pid * 1.7) * 0.5 + 0.5
            present = smooth(0.1 + 0.35 * t, 0.16 + 0.35 * t, rnd)
        cover = smooth(gap, gap + 0.07, e) * present
        if r < core:
            cover = max(cover, 1 - smooth(core - 0.004, core, r) * (1 - cover))
        lift = max(-0.6, min(0.6, rel))  # outward side of the flake (lifted, shingle-like)
        h = cover * h0 * (0.35 + 1.0 * (lift + 0.6) / 1.2)
        tone = noise.noise(pid * 2.3 + seed) * 0.5 + 0.5
        lip = cover * smooth(0.1, 0.55, lift) * (1 - smooth(gap + 0.07, gap + 0.2, e) * 0.5)
        return h, cover, tone, lip, 0.0 if inner else t

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        dirn = Vector((math.cos(th), math.sin(th), 0))
        q = p * 9 + seed
        edge = smooth(0.25, um, v) * smooth(0.02, 0.05, r)
        # Broad undulations of a large thin cap, plus a lower side.
        w = noise.noise(q) * 0.03 + noise.noise(q * 2.3) * 0.012
        wave = 0.0022 * math.sin(3 * th + 1.1) + 0.0015 * math.sin(5 * th + 0.4) + 0.002 * noise.noise(dirn * 3 + seed)
        # Shaggy, torn margin: fine irregular teeth at the rim only.
        rim = smooth(um - 0.05, um, v) * (1 - smooth(um, um + 0.04, v))
        shag = (noise.noise(dirn * 60 + seed) * 0.5 + noise.noise(dirn * 150 + seed) * 0.35) * rim
        r2 = r * (1 + w * edge) + 0.0035 * shag
        z2 = z + (w * 0.02 + wave) * edge - 0.004 * edge * (0.5 + 0.5 * math.cos(th - 2.4)) - 0.0015 * abs(shag)
        top = 1 - smooth(um - 0.04, um, v)
        z2 += (noise.noise(p * 60 + seed) * 0.0009 + noise.noise(p * 160 + seed) * 0.0003) * top
        if top > 0:
            h, cover, tone, lip, outer = flake_field(th, r)
            z2 += h * top
            r2 += h * 0.3 * top
        else:
            cover = tone = lip = outer = 0.0
        if recording[0]:
            rec.append((cover * top, tone, lip * top, outer))
        # Tilt the whole cap a few degrees about the stem apex (not the ground),
        # so the stem stays sunk in the cap flesh.
        x, y = r2 * math.cos(th), r2 * math.sin(th)
        dz = z2 - STEM_TOP
        x, dz = x * CT + dz * ST, -x * ST + dz * CT
        y, dz = y * CT2 - dz * ST2, y * ST2 + dz * CT2
        return (x, y, dz + STEM_TOP)

    # ------------------------------------------------------------ stem
    stem_profile = [
        (0.0000, STEM_TOP + 0.009), (0.0085, STEM_TOP + 0.008), (0.0104, STEM_TOP + 0.002),
        (0.0098, STEM_TOP - 0.008), (0.0092, 0.240), (0.0094, 0.200), (0.0100, 0.150),
        (0.0106, 0.100), (0.0114, 0.062), (0.0130, 0.040), (0.0170, 0.027), (0.0205, 0.016),
        (0.0212, 0.009), (0.0190, 0.003), (0.0130, -0.0005), (0.0050, -0.0020), (0.0000, -0.0022),
    ]

    def lean(z):
        k = (1 - min(max(z, 0.0), STEM_TOP) / STEM_TOP) ** 1.6
        return Vector((0.010 * k, -0.004 * k, 0.0))

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 14)) + seed
        r *= 1 + (noise.noise(p) * 0.035 + noise.noise(p * 3) * 0.012) * (1 - smooth(STEM_TOP - 0.01, STEM_TOP, z))
        o = lean(z)
        return (r * math.cos(th) + o.x, r * math.sin(th) + o.y, z)

    recording[0] = True
    cap = revolve("cap", cap_profile, 576, samples, cap_shape, True, True)
    recording[0] = False
    attr = cap.data.color_attributes.new(name="Flk", type="FLOAT_COLOR", domain="POINT")
    rec += [(1.0, 0.5, 0.0, 0.0), (0.0, 0.5, 0.0, 0.0)]  # the two poles
    for k, (a, b, c_, d_) in enumerate(rec[:len(attr.data)]):
        attr.data[k].color = (a, b, c_, d_)
    stem = revolve("stem", stem_profile, 160, 160, stem_shape, False, False)
    sp = catmull(stem_profile, 400)

    def stem_radius(z):
        return min(sp, key=lambda p: abs(p.y - z)).x

    # ------------------------------------------------------------ gills
    ug = arc_fraction(cap_profile, 12)
    gill = gills("gills", cap_profile, samples, int(round(ug * (samples - 1))), cap_shape, stem_shape,
                 stem_radius, 170, 0.0085, seed, decurrent=0, free_gap=0.0035, stains=False,
                 margin_taper=0.93, edge_occlusion=1.0)

    # ------------------------------------------------------------ ring
    # A thick, double, movable ring sitting a little loose and tilted on the
    # stem: an upper collar that flares out with a torn, drooping edge, and a
    # lower cuff whose edge hangs unevenly.
    RZ = 0.196
    ring_profile = [
        (0.0108, RZ + 0.0085), (0.0170, RZ + 0.0092), (0.0225, RZ + 0.0078), (0.0262, RZ + 0.0052),
        (0.0268, RZ + 0.0034), (0.0248, RZ + 0.0027), (0.0200, RZ + 0.0035), (0.0165, RZ + 0.0021),
        (0.0150, RZ + 0.0002), (0.0170, RZ - 0.0034), (0.0168, RZ - 0.0076), (0.0140, RZ - 0.0096),
        (0.0108, RZ - 0.0090), (0.0105, RZ), (0.0108, RZ + 0.0085),
    ]

    def ring_shape(th, v, r, z):
        dirn = Vector((math.cos(th), math.sin(th), 0))
        out = max(0.0, r - 0.0108)
        # Upper collar: torn notches and a sagging, wavy edge.
        flare = smooth(0.004, 0.013, out) * smooth(RZ - 0.001, RZ + 0.002, z)
        notch = max(0.0, noise.noise(dirn * 16 + seed)) ** 1.4 + 0.5 * max(0.0, noise.noise(dirn * 40 + seed * 2))
        fray = noise.noise(dirn * 6 + seed) * 0.14 + noise.noise(dirn * 26 + seed) * 0.07
        r2 = 0.0108 + out * (1 + fray - 0.45 * notch * flare)
        z2 = z - flare * (0.0012 + 0.0022 * (noise.noise(dirn * 4 + seed * 1.3) * 0.5 + 0.5))
        z2 += flare * 0.0012 * math.sin(11 * th + 2 * noise.noise(dirn * 3 + seed))
        # Lower cuff: an uneven, hanging edge.
        low = smooth(RZ - 0.002, RZ - 0.008, z) * smooth(0.001, 0.004, out)
        z2 -= low * (0.0035 * (noise.noise(dirn * 5 + seed * 2.1) * 0.5 + 0.5) + 0.0018 * abs(noise.noise(dirn * 21 + seed)))
        r2 += low * out * 0.3 * noise.noise(dirn * 9 + seed * 1.7)
        # Loose on the stem: tilted and pushed to one side.
        z2 += 0.0034 * math.cos(th - 0.8)
        o = lean(z2)
        return (r2 * math.cos(th) + o.x + 0.0009, r2 * math.sin(th) + o.y - 0.0005, z2)

    ring = revolve("ring", ring_profile, 288, 130, ring_shape, False, False)

    # ------------------------------------------------------------ materials
    # Cap: cream fibrous ground, a solid dark-brown umbo, brown scales that
    # are dense and merged near the centre and break into small flakes
    # towards the shaggy margin.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    rad = g.radial()
    rn = g.remap(rad, 0.012, 0.095)  # 0 at the umbo, 1 at the margin
    ground = g.ramp(g.noise(40, 4, 0.6), [(0.3, "#d2c0a0"), (0.55, "#ded0b4"), (0.8, "#e9dec7")])
    fibre = g.noise(6, 3, 0.5, vec=_warp(g, g.obj, 30, 0.02))
    ground = g.mix(0.25, ground, g.noise(420, 2), "OVERLAY")
    ground = g.mix(0.2, ground, fibre, "OVERLAY")
    pv = _polar(g, 0.06, 2.0)
    fa = g.nt.nodes.new("ShaderNodeAttribute")
    fa.attribute_name = "Flk"
    sep = g.nt.nodes.new("ShaderNodeSeparateColor")
    g.link(fa.outputs["Color"], sep.inputs[0])
    cover, tone, lip = sep.outputs[0], sep.outputs[1], sep.outputs[2]
    outer = fa.outputs["Alpha"]
    # Radial, felty fibrils on the cream ground between the scales.
    fib = g.remap(g.noise(260, 4, 0.6, vec=g.vec_scale(pv, 1, 1, 0.08)), 0.42, 0.62, 0.0, 0.6)
    ground = g.mix(g.math("MULTIPLY", fib, g.remap(rn, 0.05, 0.6, 1.0, 0.5)), ground, "#b39c7b")
    ground = g.mix(g.math("MULTIPLY", g.remap(rn, 0.45, 0.1), 0.75), ground, "#b79a74")
    scale_col = g.ramp(g.math("ADD", g.math("MULTIPLY", tone, 0.6), g.math("MULTIPLY", g.noise(90, 3), 0.4)),
                       [(0.3, "#5a3e28"), (0.55, "#6e4f35"), (0.8, "#836246")])
    scale_col = g.mix(g.math("MULTIPLY", outer, 0.55), scale_col, "#9c7d5c")
    # Fibrillose streaks on the flakes and a paler, lifted outer edge.
    streak = g.noise(500, 3, 0.6, vec=g.vec_scale(pv, 1, 1, 0.15))
    scale_col = g.mix(0.3, scale_col, streak, "OVERLAY")
    scale_col = g.mix(g.math("MULTIPLY", lip, 0.55), scale_col, "#b39473")
    fine = g.remap(g.voronoi(420, vec=pv, rand=1.0), 0.0, 0.2, 1.0, 0.0)
    fine = g.math("MULTIPLY", fine, g.math("MULTIPLY", g.remap(rn, 0.4, 0.95), g.remap(g.noise(20, 2), 0.46, 0.56)))
    scales = g.math("MAXIMUM", cover, g.math("MULTIPLY", fine, 0.6))
    top = g.mix(scales, ground, scale_col)
    umbo = g.remap(g.math("ADD", rad, g.math("MULTIPLY", g.noise(60, 3), 0.008)), 0.012, 0.018, 1.0, 0.0)
    top = g.mix(umbo, top, g.ramp(g.noise(80, 3), [(0.4, "#4f3522"), (0.7, "#5f412b")]))
    # Paler, woolly fringe at the rim.
    top = g.mix(g.remap(g.v, um - 0.03, um - 0.004, 0.0, 0.8), top, "#efe6d2")
    under = g.remap(g.v, um + 0.002, um + 0.01)
    colour = g.mix(under, top, "#ece4d1")
    roughness = g.lerp(under, g.remap(scales, 0.0, 1.0, 0.8, 0.7), 0.85)
    height = g.math("ADD", g.math("MULTIPLY", streak, 0.4), g.math("MULTIPLY", g.noise(250, 4), 0.3))
    height = g.math("ADD", height, g.math("MULTIPLY", fine, 0.3))
    g.finish(colour, roughness, height, 0.6, 0.0005)
    cap.data.materials.append(m)

    # Gills: white-cream, a touch warmer at the free edge.
    m = bpy.data.materials.new("gills-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#f5efe1"), (0.5, "#faf5ea"), (1.0, "#fbf7ee")])
    col = g.mix(g.remap(g.uvy, 0.75, 1.0, 0.0, 0.35), col, "#dccbb0")
    g.finish(col, 0.78, g.noise(200, 2), 0.1, 0.0002)
    gill.data.materials.append(m)

    # Stem: cream ground, zigzag bands of brown fibrillose scales (snakeskin)
    # below the ring, smoother and paler above it; whitish bulb with soil.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    _, _, z = _xyz(g)
    ground = g.ramp(g.noise(50, 3), [(0.35, "#d6c5a6"), (0.65, "#e4d6bc")])
    # Snakeskin: close zigzag bands of brown fibrils, broken up irregularly.
    x, y, _ = _xyz(g)
    ang = g.math("ARCTAN2", y, x)
    zig = g.math("MULTIPLY", g.math("SINE", g.math("MULTIPLY", ang, 7.0)), g.remap(g.noise(20, 2), 0.3, 0.7, 0.6, 1.6))
    zz = g.math("ADD", g.math("MULTIPLY", z, 1150.0), zig)
    zz = g.math("ADD", zz, g.math("MULTIPLY", g.noise(35, 3, vec=g.vec_scale(g.obj, 1, 1, 0.5)), 4.0))
    bands = g.remap(g.math("SINE", zz), -0.25, 0.35)
    broken = g.remap(g.noise(160, 3, vec=g.vec_scale(g.obj, 1, 1, 0.6)), 0.3, 0.44)
    cracks = g.remap(g.voronoi(420, "DISTANCE_TO_EDGE", vec=g.vec_scale(g.obj, 1, 1, 0.6)), 0.03, 0.1)
    flecks = g.math("MULTIPLY", g.remap(g.voronoi(700, vec=g.vec_scale(g.obj, 1, 1, 0.5)), 0.0, 0.25, 1.0, 0.0), 0.5)
    snake = g.math("MAXIMUM", g.math("MULTIPLY", g.math("MULTIPLY", bands, broken), cracks), flecks)
    below = g.remap(z, RZ - 0.004, RZ - 0.012)
    above = g.math("MULTIPLY", g.remap(z, RZ + 0.01, RZ + 0.02), 0.35)
    bulb = g.remap(g.math("ADD", z, g.math("MULTIPLY", g.noise(30, 2), 0.012)), 0.058, 0.032)
    snake = g.math("MULTIPLY", snake, g.math("MULTIPLY", g.math("MAXIMUM", below, above), g.math("SUBTRACT", 1.0, bulb)))
    brown = g.ramp(g.noise(25, 3), [(0.35, "#6f563f"), (0.65, "#8c7258")])
    colour = g.mix(snake, ground, brown)
    colour = g.mix(0.25, colour, g.noise(300, 2, vec=g.vec_scale(g.obj, 1, 1, 0.1)), "OVERLAY")
    colour = g.mix(g.math("MULTIPLY", bulb, 0.8), colour, "#efe8da")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.006)
    soil = g.math("MULTIPLY", g.remap(g.math("SUBTRACT", z, side), 0.014, 0.002), g.remap(g.noise(70, 5, 0.65), 0.42, 0.56))
    colour = g.mix(g.math("MULTIPLY", soil, 0.85), colour, "#6a543d")
    height = g.math("ADD", g.math("MULTIPLY", snake, 0.6), g.math("MULTIPLY", g.noise(220, 3, vec=g.vec_scale(g.obj, 1, 1, 0.2)), 0.3))
    g.finish(colour, g.remap(snake, 0.0, 1.0, 0.76, 0.84), height, 0.45, 0.0005)
    stem.data.materials.append(m)

    # Ring: whitish, felty, the lower lip tinged brown at its edge.
    m = bpy.data.materials.new("ring-proc")
    g = Graph(m)
    _, _, z = _xyz(g)
    colour = g.ramp(g.noise(80, 3), [(0.35, "#e6ddcb"), (0.65, "#f2ecdf")])
    lip = g.math("MAXIMUM", g.math("MULTIPLY", g.remap(z, RZ - 0.003, RZ - 0.009), g.remap(g.radial(), 0.013, 0.0165)),
                   g.math("MULTIPLY", g.remap(g.radial(), 0.022, 0.027), 0.6))
    lip = g.math("MULTIPLY", lip, g.remap(g.noise(40, 3), 0.35, 0.55))
    colour = g.mix(g.math("MULTIPLY", lip, 0.8), colour, "#8c6a48")
    g.finish(colour, 0.85, g.noise(300, 3), 0.3, 0.0003)
    ring.data.materials.append(m)

    for o in (cap, stem, ring):
        o.data.materials[0].use_backface_culling = True
    views = {"hero": (-30, 16, 1.25, 0.15), "low": (25, 3, 1.2, 0.15), "under": (15, -22, 0.62, 0.22)}
    return [cap, stem, gill, ring], views
