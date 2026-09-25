"""Macrolepiota procera (apagallums): a mature open parasol. Large, nearly
flat cap with a dark central umbo and brown scales breaking up on a cream,
fibrous background, shaggy margin; free, crowded white-cream gills; a tall,
slender stem banded with a brown snakeskin (zigzag) pattern; a thick, double,
movable ring; bulbous base."""
import math

from mathutils import Vector, noise


def _clamp_gill_edge(gill, margin_z, lift=0.0004, r_min=0.0):
    """Keep every gill's free edge above the margin tip at its own angle, so
    no blade hangs below the rim as a comb. margin_z(th) is the z of the
    margin tip along that radius; the blade shortens towards the flesh."""
    vs = gill.data.vertices
    for k in range(0, len(vs) - 1, 2):
        top, bot = vs[k].co, vs[k + 1].co
        if math.hypot(bot.x, bot.y) < r_min:
            continue
        zmin = margin_z(math.atan2(bot.y, bot.x)) + lift
        if bot.z >= zmin:
            continue
        if top.z - 0.0001 <= zmin:
            vs[k + 1].co = top.lerp(bot, 0.08)
        else:
            vs[k + 1].co = top.lerp(bot, (top.z - zmin) / (top.z - bot.z))
    gill.data.update()


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
    import time
    t_start = time.time()
    seed = Vector((4.4, 2.6, 9.1))
    STEM_TOP = 0.2745

    # ------------------------------------------------------------ cap
    # Open parasol: a low boss (umbo) in the centre, a slight dip around it,
    # then a gently sloping plate to a thin margin. The underside rises gently
    # to the stem, so the hymenium is almost flat, as in an expanded cap.
    # A distinct rounded umbo (~3 cm across, ~1.2 cm proud), thin flesh
    # tapering to 1-2 mm at a slightly down-curved margin.
    cap_profile = [
        (0.000, 0.3000), (0.006, 0.2990), (0.011, 0.2955), (0.015, 0.2900),
        (0.019, 0.2858), (0.026, 0.2836), (0.040, 0.2812), (0.056, 0.2772),
        (0.072, 0.2712), (0.086, 0.2632), (0.096, 0.2558), (0.1020, 0.2500),
        (0.1040, 0.2470), (0.1026, 0.2462), (0.0980, 0.2525), (0.0880, 0.2598),
        (0.0720, 0.2662), (0.0550, 0.2703), (0.0380, 0.2732), (0.0240, 0.2748),
        (0.0150, 0.2757), (0.0100, 0.2764), (0.0060, 0.2770),
    ]
    samples = 230
    CT, ST = math.cos(math.radians(5)), math.sin(math.radians(5))
    CT2, ST2 = math.cos(math.radians(3)), math.sin(math.radians(3))
    um = arc_fraction(cap_profile, 12)  # margin tip

    rec = []  # per-vertex scale attributes, filled while the cap is revolved
    recording = [False]
    core_n = lambda d: 0.02 + 0.003 * noise.noise(d * 4 + seed)

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
        r_in = 0.047 + 0.009 * noise.noise(dirn * 5 + seed * 2)
        inner = rc < r_in
        if inner:
            t = smooth(core, r_in, rc)
            gap = 0.012 + 0.08 * t + 0.08 * t * t + 0.07 * max(0.0, noise.noise(pid * 3.1))
            h0 = 0.0024 - 0.0007 * t
            present = 1.0
        else:
            e, rc, rel, pid = layer(c, s_, r, 0.075, 175.0, 1.9, seed * 5)
            t = smooth(r_in, 0.1, rc)
            gap = 0.08 + 0.12 * t
            h0 = 0.0017 - 0.0006 * t
            rnd = noise.noise(pid * 1.7) * 0.5 + 0.5
            present = smooth(0.03 + 0.17 * t, 0.1 + 0.17 * t, rnd)
            # Scales break up in rough concentric rings.
            ringy = math.sin(rc * 2 * math.pi / 0.013 + 3.0 * noise.noise(dirn * 4 + seed) + 2.0 * noise.noise(pid * 0.9))
            present *= 0.5 + 0.5 * smooth(-0.6, 0.3, ringy)
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
        # A small radial tear in the margin.
        dth = math.atan2(math.sin(th - 1.05), math.cos(th - 1.05))
        r2 -= 0.009 * math.exp(-(dth / 0.035) ** 2) * smooth(0.075, 0.1, r) * (1 - smooth(um + 0.01, um + 0.05, v))
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
        u = min(max(z, 0.0), STEM_TOP) / STEM_TOP
        k = (1 - u) ** 1.6
        bow = math.sin(math.pi * u) * 0.006  # a slight bow along the stem
        return Vector((0.010 * k - bow, -0.004 * k + bow * 0.4, 0.0))

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
    # Deep, crowded, free gills: they round off 4-5 mm short of the stem,
    # leaving a clear collar gap around the stem apex.
    # They begin just inside the lowest point of the margin, taper in over
    # the outer 40 % and keep their free edge above the margin tip, so no
    # plate of gills shows below the shaggy fringe.
    ug = 0.5 * (arc_fraction(cap_profile, 13) + arc_fraction(cap_profile, 14))
    gill = gills("gills", cap_profile, samples, int(round(ug * (samples - 1))), cap_shape, stem_shape,
                 stem_radius, 130, 0.016, seed, decurrent=0, free_gap=0.0048, stains=False,
                 margin_taper=0.6, edge_occlusion=1.0)
    _clamp_gill_edge(gill, lambda th: cap_shape(th, um, 0.1040, 0.2470)[2], r_min=0.04)
    # Crowded gills seen edge-on merge into a plain floor: vary each blade's
    # tone and shade its free edge a little so the lamellae read as fine lines.
    gcol = gill.data.color_attributes["Col"]
    per_blade = 88  # 44 path samples x (flesh, edge); no decurrent tail
    for k, cv in enumerate(gcol.data):
        blade, edge = k // per_blade, k % 2
        f = 0.94 + 0.06 * (noise.noise(Vector((blade * 0.37, 0.5, 1.3)) + seed) * 0.5 + 0.5)
        f *= 0.95 if edge else 1.0
        c = cv.color
        cv.color = (c[0] * f, c[1] * f, c[2] * f, 1.0)

    # ------------------------------------------------------------ ring
    # A compact, thick, sleeve-like double ring (about 1 cm tall): a firm cuff
    # with a rolled upper lip, a groove, and a thickened, frayed lower edge.
    # It sits loose (1-2 mm clear of the stem) and slightly tilted.
    RZ = 0.198
    ring_profile = [
        (0.0110, RZ + 0.0058), (0.0130, RZ + 0.0066), (0.0152, RZ + 0.0065), (0.0161, RZ + 0.0055),
        (0.0151, RZ + 0.0042), (0.0139, RZ + 0.0030), (0.0141, RZ + 0.0005), (0.0147, RZ - 0.0030),
        (0.0156, RZ - 0.0052), (0.0148, RZ - 0.0067), (0.0126, RZ - 0.0066), (0.0112, RZ - 0.0052),
        (0.0108, RZ), (0.0110, RZ + 0.0058),
    ]

    def ring_shape(th, v, r, z):
        dirn = Vector((math.cos(th), math.sin(th), 0))
        out = max(0.0, r - 0.0110)
        r2 = 0.0110 + out * (1 + noise.noise(dirn * 5 + seed) * 0.12 + noise.noise(dirn * 17 + seed) * 0.05)
        # Frayed lower edge: short torn teeth and an uneven hang.
        low = smooth(RZ - 0.003, RZ - 0.0062, z) * smooth(0.0015, 0.004, out)
        tooth = abs(noise.noise(dirn * 70 + seed)) + 0.5 * abs(noise.noise(dirn * 160 + seed * 2))
        z2 = z - low * (0.0012 * (noise.noise(dirn * 6 + seed * 2.1) * 0.5 + 0.5) + 0.0016 * tooth)
        r2 += low * 0.0006 * noise.noise(dirn * 40 + seed)
        z2 += 0.0022 * math.cos(th - 0.8)  # tilted on the stem
        o = lean(z2)
        return (r2 * math.cos(th) + o.x + 0.0006, r2 * math.sin(th) + o.y - 0.0004, z2)

    ring = revolve("ring", ring_profile, 360, 110, ring_shape, False, False)

    # ------------------------------------------------------------ margin fringe
    # Torn, cottony cuticle fibres hanging 2-5 mm past the margin.
    fr_profile = [(0.1036, 0.2474), (0.1040, 0.2455), (0.1043, 0.2430)]

    def fringe_shape(th, v, r, z):
        dirn = Vector((math.cos(th), math.sin(th), 0))
        n1 = abs(math.sin(th * 230 + 3 * noise.noise(dirn * 30 + seed)))
        strand = n1 ** 3 * (0.5 + 0.5 * (noise.noise(dirn * 55 + seed * 1.9) * 0.5 + 0.5))
        length = 0.0015 + 0.0035 * strand * smooth(-0.4, 0.3, noise.noise(dirn * 9 + seed))
        zz = 0.2474 - length * v
        # Follow the displaced cap margin: sample the cap surface at its tip.
        x, y, zc = cap_shape(th, um, 0.1040, 0.2470)
        rr = math.hypot(x, y)
        k = (rr - 0.0004 + 0.0005 * v) / rr
        return (x * k, y * k, zc - 0.0004 - (0.2474 - zz))

    fringe = revolve("fringe", fr_profile, 1440, 8, fringe_shape, False, False)
    fringe["tex"] = 512

    # ------------------------------------------------------------ materials
    # Cap: cream fibrous ground, a solid dark-brown umbo, brown scales that
    # are dense and merged near the centre and break into small flakes
    # towards the shaggy margin.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    rad = g.radial()
    rn = g.remap(rad, 0.012, 0.095)  # 0 at the umbo, 1 at the margin
    ground = g.ramp(g.noise(40, 4, 0.6), [(0.3, "#c9baa0"), (0.55, "#d4c7b0"), (0.8, "#ded3bf")])
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
    ground = g.mix(g.math("MULTIPLY", g.remap(rn, 0.5, 0.1), 0.85), ground, "#9f7f5d")
    scale_col = g.ramp(g.math("ADD", g.math("MULTIPLY", tone, 0.6), g.math("MULTIPLY", g.noise(90, 3), 0.4)),
                       [(0.3, "#4a3322"), (0.55, "#5b412d"), (0.8, "#6e5139")])
    scale_col = g.mix(g.math("MULTIPLY", outer, 0.4), scale_col, "#86664a")
    # Fibrillose streaks on the flakes and a paler, lifted outer edge.
    streak = g.noise(500, 3, 0.6, vec=g.vec_scale(pv, 1, 1, 0.15))
    scale_col = g.mix(0.3, scale_col, streak, "OVERLAY")
    scale_col = g.mix(g.math("MULTIPLY", lip, 0.45), scale_col, "#9f7f5f")
    fine = g.remap(g.voronoi(420, vec=pv, rand=1.0), 0.0, 0.2, 1.0, 0.0)
    fine = g.math("MULTIPLY", fine, g.math("MULTIPLY", g.remap(rn, 0.15, 0.5), g.remap(g.noise(20, 2), 0.4, 0.52)))
    scales = g.math("MAXIMUM", cover, g.math("MULTIPLY", fine, 0.9))
    top = g.mix(scales, ground, scale_col)
    umbo = g.remap(g.math("ADD", rad, g.math("MULTIPLY", g.noise(60, 3), 0.006)), 0.016, 0.021, 1.0, 0.0)
    top = g.mix(umbo, top, g.ramp(g.noise(80, 3), [(0.4, "#3a2517"), (0.7, "#4a3020")]))
    # Paler, woolly fringe at the rim.
    top = g.mix(g.remap(g.v, um - 0.03, um - 0.004, 0.0, 0.8), top, "#efe6d2")
    # The underside strip before the gills is plain cream: no scales or
    # dark cuticle bleed round the margin.
    under = g.remap(g.v, um - 0.004, um + 0.001)
    colour = g.mix(under, top, "#ece4d1")
    roughness = g.lerp(under, g.remap(scales, 0.0, 1.0, 0.8, 0.7), 0.85)
    height = g.math("ADD", g.math("MULTIPLY", streak, 0.4), g.math("MULTIPLY", g.noise(250, 4), 0.3))
    height = g.math("ADD", height, g.math("MULTIPLY", fine, 0.3))
    g.finish(colour, roughness, height, 0.8, 0.0005)
    cap.data.materials.append(m)

    # Gills: white-cream, a touch warmer at the free edge.
    m = bpy.data.materials.new("gills-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#fbf8f0"), (0.5, "#fdfbf5"), (1.0, "#fdfaf3")])
    col = g.mix(g.remap(g.uvy, 0.8, 1.0, 0.0, 0.25), col, "#e6d8c0")
    g.finish(col, 0.78, g.noise(200, 2), 0.1, 0.0002)
    gill.data.materials.append(m)

    # Stem: cream ground, zigzag bands of brown fibrillose scales (snakeskin)
    # below the ring, smoother and paler above it; whitish bulb with soil.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    _, _, z = _xyz(g)
    ground = g.ramp(g.noise(50, 3), [(0.35, "#b9a78b"), (0.65, "#c9b99d")])
    # Snakeskin: dense, broken zigzag bands of brown fibrils, uneven in width
    # and spacing, torn into horizontal patches (about half the surface).
    x, y, _ = _xyz(g)
    ang = g.math("ARCTAN2", y, x)
    zig = g.math("MULTIPLY", g.math("SINE", g.math("ADD", g.math("MULTIPLY", ang, 6.0),
                 g.math("MULTIPLY", g.noise(8, 2), 5.0))), g.remap(g.noise(18, 2), 0.3, 0.7, 0.2, 1.4))
    zz = g.math("ADD", g.math("MULTIPLY", z, 820.0), zig)
    zz = g.math("ADD", zz, g.math("MULTIPLY", g.noise(30, 3, vec=g.vec_scale(g.obj, 1, 1, 0.5)), 7.0))
    zz = g.math("ADD", zz, g.math("MULTIPLY", g.noise(110, 2), 2.0))
    zz = g.math("ADD", zz, g.math("MULTIPLY", g.noise(5, 2, vec=g.vec_scale(g.obj, 1, 1, 1.5)), 16.0))
    bands = g.remap(g.math("ADD", g.math("SINE", zz), g.remap(g.noise(12, 2), 0.3, 0.7, -0.3, 0.45)), -0.65, 0.1)
    broken = g.remap(g.noise(120, 3, vec=g.vec_scale(g.obj, 1, 1, 0.4)), 0.3, 0.44)
    cracks = g.remap(g.voronoi(260, "DISTANCE_TO_EDGE", vec=_warp(g, g.vec_scale(g.obj, 1, 1, 1.8), 200, 0.004)), 0.02, 0.09)
    flecks = g.math("MULTIPLY", g.remap(g.voronoi(700, vec=g.vec_scale(g.obj, 1, 1, 0.5)), 0.0, 0.3, 1.0, 0.0), 0.6)
    snake = g.math("MAXIMUM", g.math("MULTIPLY", g.math("MULTIPLY", bands, broken), cracks), flecks)
    below = g.remap(z, RZ - 0.006, RZ - 0.014)
    above = g.math("MULTIPLY", g.remap(z, RZ + 0.008, RZ + 0.018), 0.22)
    bulb = g.remap(g.math("ADD", z, g.math("MULTIPLY", g.noise(30, 2), 0.012)), 0.058, 0.032)
    snake = g.math("MULTIPLY", snake, g.math("MULTIPLY", g.math("MAXIMUM", below, above), g.math("SUBTRACT", 1.0, bulb)))
    brown = g.ramp(g.noise(25, 3), [(0.35, "#56402e"), (0.65, "#735a44")])
    colour = g.mix(snake, ground, brown)
    # Above the ring: smoother, finely brownish.
    colour = g.mix(g.math("MULTIPLY", g.remap(z, RZ + 0.008, RZ + 0.018), 0.35), colour, "#b39a7c")
    colour = g.mix(0.25, colour, g.noise(300, 2, vec=g.vec_scale(g.obj, 1, 1, 0.1)), "OVERLAY")
    colour = g.mix(g.math("MULTIPLY", bulb, 0.8), colour, "#efe8da")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.006)
    soil = g.math("MULTIPLY", g.remap(g.math("SUBTRACT", z, side), 0.014, 0.002), g.remap(g.noise(70, 5, 0.65), 0.42, 0.56))
    colour = g.mix(g.math("MULTIPLY", soil, 0.85), colour, "#6a543d")
    height = g.math("ADD", g.math("MULTIPLY", snake, 0.6), g.math("MULTIPLY", g.noise(220, 3, vec=g.vec_scale(g.obj, 1, 1, 0.2)), 0.3))
    g.finish(colour, g.remap(snake, 0.0, 1.0, 0.76, 0.84), height, 0.45, 0.0005)
    stem.data.materials.append(m)

    # Ring: white on top, brownish underneath and on the frayed lower edge.
    m = bpy.data.materials.new("ring-proc")
    g = Graph(m)
    _, _, z = _xyz(g)
    colour = g.ramp(g.noise(80, 3), [(0.35, "#e9e3d6"), (0.65, "#f4f0e7")])
    below = g.remap(g.math("ADD", z, g.math("MULTIPLY", g.noise(60, 3), 0.003)), RZ + 0.0035, RZ - 0.004)
    colour = g.mix(g.math("MULTIPLY", below, 0.85), colour, g.ramp(g.noise(50, 3), [(0.4, "#8e7258"), (0.7, "#a88c6f")]))
    colour = g.mix(0.2, colour, g.noise(400, 2, vec=g.vec_scale(g.obj, 1, 1, 0.2)), "OVERLAY")
    g.finish(colour, 0.85, g.noise(300, 3), 0.3, 0.0003)
    ring.data.materials.append(m)

    # Fringe: cottony cream fibres, tinged brown at the tips.
    m = bpy.data.materials.new("fringe-proc")
    g = Graph(m)
    colour = g.mix(g.remap(g.v, 0.3, 1.0, 0.0, 0.45), "#e4dac6", "#a88d6e")
    g.finish(colour, 0.9, g.noise(300, 2), 0.2, 0.0002)
    fringe.data.materials.append(m)

    for o in (cap, stem, ring):
        o.data.materials[0].use_backface_culling = True
    views = {"hero": (-30, 16, 1.25, 0.15), "low": (25, 3, 1.2, 0.15), "under": (15, -22, 0.62, 0.22)}
    if os.environ.get("SPECIES3D_CLOSEUP"):  # scratch iteration only
        views.update({"cap": (-30, 42, 0.5, 0.27), "ring": (40, 5, 0.2, 0.2), "up": (10, -65, 0.45, 0.27)})
        print("BUILD SECONDS", round(time.time() - t_start, 1))
    return [cap, stem, gill, ring, fringe], views
