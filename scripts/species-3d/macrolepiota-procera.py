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
    samples = 170
    CT, ST = math.cos(math.radians(5)), math.sin(math.radians(5))
    CT2, ST2 = math.cos(math.radians(3)), math.sin(math.radians(3))
    um = arc_fraction(cap_profile, 11)  # margin tip

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

    cap = revolve("cap", cap_profile, 288, samples, cap_shape, True, True)
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
    # A thick, double, movable ring: a cuff around the stem whose upper
    # collar flares out and whose lower lip forms a second edge.
    RZ = 0.196
    ring_profile = [
        (0.0101, RZ + 0.0070), (0.0160, RZ + 0.0072), (0.0210, RZ + 0.0060), (0.0245, RZ + 0.0040),
        (0.0251, RZ + 0.0027), (0.0233, RZ + 0.0024), (0.0192, RZ + 0.0031), (0.0156, RZ + 0.0021),
        (0.0142, RZ + 0.0002), (0.0156, RZ - 0.0030), (0.0151, RZ - 0.0062), (0.0126, RZ - 0.0078),
        (0.0101, RZ - 0.0072), (0.0098, RZ), (0.0101, RZ + 0.0070),
    ]

    def ring_shape(th, v, r, z):
        dirn = Vector((math.cos(th), math.sin(th), 0))
        out = max(0.0, r - 0.0101)
        fray = noise.noise(dirn * 7 + seed) * 0.13 + noise.noise(dirn * 30 + seed) * 0.06
        r2 = 0.0101 + out * (1 + fray)
        tilt = 0.0022 * math.cos(th - 0.8)
        z2 = z + tilt + out * 0.12 * noise.noise(dirn * 5 + seed * 1.3)
        o = lean(z)
        return (r2 * math.cos(th) + o.x, r2 * math.sin(th) + o.y, z2)

    ring = revolve("ring", ring_profile, 200, 90, ring_shape, False, False)

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
    # Seamless polar coordinates: a circle for the angle, radius along z,
    # squashed radially so the scales run concentrically.
    pv = _polar(g, 0.06, 2.0)
    wv = _warp(g, pv, 45, 0.01)
    d_in = g.voronoi(60, "DISTANCE_TO_EDGE", vec=wv, rand=0.9)
    wv2 = _warp(g, pv, 110, 0.012)
    d_out = g.voronoi(105, "F1", vec=wv2, rand=1.0)
    s_in = g.remap(d_in, 0.015, 0.05)
    # Discrete, irregular flakes with cream showing between them; smaller outwards.
    s_out = g.remap(g.math("ADD", d_out, g.math("MULTIPLY", rn, 0.1)), 0.56, 0.4)
    s_out = g.math("MULTIPLY", s_out, g.remap(g.math("SUBTRACT", g.noise(22, 3), g.math("MULTIPLY", rn, 0.1)), 0.2, 0.3))
    scales = g.lerp(g.remap(rn, 0.2, 0.55), s_in, s_out)
    fine = g.remap(g.voronoi(420, vec=wv, rand=1.0), 0.0, 0.2, 1.0, 0.0)
    fine = g.math("MULTIPLY", fine, g.math("MULTIPLY", g.remap(rn, 0.3, 0.95), g.remap(g.noise(20, 2), 0.44, 0.56)))
    scale_col = g.ramp(g.noise(30, 3), [(0.35, "#634630"), (0.6, "#77583c"), (0.8, "#8a6b4d")])
    scale_col = g.mix(g.math("MULTIPLY", rn, 0.35), scale_col, "#9b7a55")
    # Radial, felty fibrils on the cream ground between the scales.
    fib = g.remap(g.noise(260, 4, 0.6, vec=g.vec_scale(pv, 1, 1, 0.08)), 0.42, 0.62, 0.0, 0.6)
    ground = g.mix(g.math("MULTIPLY", fib, g.remap(rn, 0.05, 0.6, 1.0, 0.5)), ground, "#b39c7b")
    top = g.mix(g.math("MAXIMUM", scales, g.math("MULTIPLY", fine, 0.7)), ground, scale_col)
    umbo = g.remap(g.math("ADD", rad, g.math("MULTIPLY", g.noise(60, 3), 0.012)), 0.019, 0.026, 1.0, 0.0)
    top = g.mix(umbo, top, g.ramp(g.noise(80, 3), [(0.4, "#553a25"), (0.7, "#664630")]))
    # Paler, woolly fringe at the rim.
    top = g.mix(g.remap(g.v, um - 0.03, um - 0.004, 0.0, 0.8), top, "#efe6d2")
    under = g.remap(g.v, um + 0.002, um + 0.01)
    colour = g.mix(under, top, "#ece4d1")
    roughness = g.lerp(under, g.remap(scales, 0.0, 1.0, 0.8, 0.7), 0.85)
    height = g.math("ADD", g.math("MULTIPLY", scales, 0.7), g.math("MULTIPLY", g.noise(250, 4), 0.3))
    height = g.math("ADD", height, g.math("MULTIPLY", fine, 0.3))
    g.finish(colour, roughness, height, 1.2, 0.0009)
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
    lip = g.math("MAXIMUM", g.math("MULTIPLY", g.remap(z, RZ - 0.002, RZ - 0.006), g.remap(g.radial(), 0.0125, 0.0148)),
                   g.math("MULTIPLY", g.remap(g.radial(), 0.021, 0.025), 0.6))
    lip = g.math("MULTIPLY", lip, g.remap(g.noise(40, 3), 0.35, 0.55))
    colour = g.mix(g.math("MULTIPLY", lip, 0.8), colour, "#8c6a48")
    g.finish(colour, 0.85, g.noise(300, 3), 0.3, 0.0003)
    ring.data.materials.append(m)

    for o in (cap, stem, ring):
        o.data.materials[0].use_backface_culling = True
    views = {"hero": (-30, 16, 1.25, 0.15), "low": (25, 3, 1.2, 0.15), "under": (15, -22, 0.62, 0.22)}
    return [cap, stem, gill, ring], views
