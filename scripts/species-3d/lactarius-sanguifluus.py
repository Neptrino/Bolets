"""Lactarius sanguifluus (rovelló): convex, centrally depressed orange-buff cap
with soft concentric zones, grey-green bruises and a thick inrolled margin;
straight, crowded, slightly decurrent wine-pink gills with wine-red latex
stains; short, buff-pink stem tapering to a rounded base, with vinous spots."""


def _radial_fibres(g, across, along):
    """Object-space vector that changes fast around the axis and slowly
    outwards, so noise sampled with it draws radial fibrils without a seam."""
    nrm = g.nt.nodes.new("ShaderNodeVectorMath")
    nrm.operation = "NORMALIZE"
    g.link(g.vec_scale(g.obj, 1, 1, 0), nrm.inputs[0])
    sc = g.nt.nodes.new("ShaderNodeVectorMath")
    sc.operation = "SCALE"
    sc.inputs["Scale"].default_value = across
    g.link(nrm.outputs[0], sc.inputs[0])
    comb = g.nt.nodes.new("ShaderNodeCombineXYZ")
    g.link(g.math("MULTIPLY", g.radial(), along), comb.inputs["Z"])
    add = g.nt.nodes.new("ShaderNodeVectorMath")
    add.operation = "ADD"
    g.link(sc.outputs[0], add.inputs[0])
    g.link(comb.outputs[0], add.inputs[1])
    return add.outputs[0]


def build():
    seed = Vector((5.3, 1.9, 8.4))
    lift = 0.009  # visible stem about 0.45 x cap diameter

    # Convex with a shallow central depression; the thick margin rolls down
    # and under instead of rising into a tray rim. The underside falls to the
    # stem as a shallow inverted cone, so the gills run down to it.
    cap_profile = [(r, z + lift) for r, z in (
        (0.000, 0.0492), (0.008, 0.0499), (0.016, 0.0522), (0.024, 0.0544),
        (0.032, 0.0556), (0.0385, 0.0553), (0.0435, 0.0537), (0.0468, 0.0508),
        (0.0478, 0.0474), (0.0463, 0.0450), (0.0432, 0.0443), (0.0380, 0.0441),
        (0.0300, 0.0428), (0.0220, 0.0405), (0.0165, 0.0376), (0.0135, 0.0346), (0.0118, 0.0322),
    )]
    samples = 150
    um = arc_fraction(cap_profile, 8)  # inrolled margin tip
    ug = arc_fraction(cap_profile, 10)  # gills start inside the inrolled rim

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * 22 + seed
        edge = smooth(0.15, um, v)
        w = noise.noise(q) * 0.05 + noise.noise(q * 2.4) * 0.02 + noise.noise(q * 5.5) * 0.008
        # A gently wavy, slightly uneven margin (a few per cent, not lobed).
        lobes = (0.022 * math.sin(3 * th + 0.8) + 0.012 * math.sin(5 * th + 2.1)
                 + 0.02 * noise.noise(Vector((math.cos(th), math.sin(th), 0)) * 3 + seed))
        edge *= smooth(0.014, 0.03, r)
        r2 = r * (1 + (w + lobes) * edge)
        z2 = z + (w * 0.012 + lobes * 0.05) * edge
        # The whole cap dips a little on one side.
        z2 -= 0.0022 * edge * (0.5 + 0.5 * math.cos(th - 3.6))
        top = 1 - smooth(um - 0.05, um, v)
        # Lumps, an off-centre depression and a few shallow dents on the upper surface.
        z2 += (noise.noise(p * 45 + seed) * 0.0016 + noise.noise(p * 110 + seed) * 0.0005) * top
        dx, dy = p.x - 0.004, p.y + 0.003
        z2 -= 0.0042 * math.exp(-(dx * dx + dy * dy) / 0.014 ** 2) * top
        for cx, cy, rad, dep in ((0.028, 0.012, 0.005, 0.0009), (-0.03, -0.018, 0.006, 0.0008)):
            ex, ey = p.x - cx, p.y - cy
            z2 -= dep * math.exp(-(ex * ex + ey * ey) / rad ** 2) * top
        return (r2 * math.cos(th) + 0.0015, r2 * math.sin(th), z2)

    # Slightly flared apex, tapering downwards to a rounded base.
    stem_profile = [(r, z + (lift if z > 0.02 else lift * z / 0.02)) for r, z in (
        (0.0180, 0.0400), (0.0150, 0.0362), (0.0138, 0.032), (0.0135, 0.028), (0.0133, 0.021),
        (0.0126, 0.013), (0.0116, 0.0072), (0.0102, 0.0030), (0.0080, -0.0004),
        (0.0052, -0.0024), (0.0022, -0.0034), (0.0006, -0.0036),
    )]

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 25)) + seed
        # Irregular below and slightly oval; smooth where the flare sinks
        # into the cap so the joint stays closed.
        free = 1 - smooth(0.036, 0.044, z)
        r *= 1 + (noise.noise(p) * 0.06 + noise.noise(p * 3) * 0.02 + 0.05 * math.cos(2 * th - 0.7)) * free
        k = (1 - min(z, 0.046) / 0.046) ** 2
        return (r * math.cos(th) + 0.003 * k, r * math.sin(th) - 0.0015 * k, z)

    cap = revolve("cap", cap_profile, 256, samples, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 160, 80, stem_shape, True, True)
    sp = catmull(stem_profile, 200)

    def stem_radius(z):
        best = min(sp, key=lambda p: abs(p.y - z))
        return best.x

    j_start = int(round(ug * (samples - 1)))

    def latex(gi, th, t):
        """Wine-red latex: a broken ring of stains near the stem, a second
        patchy one midway, and a few damaged edges at the margin."""
        d = Vector((math.cos(th), math.sin(th), 0))
        near = math.exp(-((t - 0.12) / 0.045) ** 2) * smooth(0.15, 0.35, noise.noise(d * 6 + seed))
        mid = math.exp(-((t - 0.5) / 0.03) ** 2) * smooth(0.3, 0.48, noise.noise(d * 4 + seed * 1.3))
        rim = smooth(0.93, 0.98, t) * smooth(0.48, 0.58, noise.noise(d * 9 + seed * 0.7))
        return min(1.0, 0.85 * near + 0.8 * mid + 0.9 * rim)

    # The flared stem top swallows the gill ends, which reads as decurrent
    # without the blade twisting where it would turn down the stem.
    gill = gills("gills", cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius, 150, 0.0030, seed,
                 decurrent=0, stains=latex, edge_occlusion=0.93)

    # Cap: dull orange-buff with pinkish-vinaceous tones, soft concentric
    # zones, fine radial fibrils, grey-green bruises towards the margin and
    # a paler, frosted inrolled rim with a few wine-red latex marks.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    big = g.noise(9, 3, 0.5, distortion=0.2)
    top = g.ramp(big, [(0.35, "#c0662e"), (0.5, "#c9743a"), (0.65, "#d18345")])
    top = g.mix(g.remap(g.v, 0.0, um * 0.5, 0.35, 0.0), top, "#a8502a")
    top = g.mix(g.remap(g.noise(6, 2, distortion=0.3), 0.45, 0.65, 0.0, 0.4), top, "#b0584e")
    wobble = g.math("MULTIPLY", g.noise(10, 3), 0.007)
    zones = g.math("SINE", g.math("MULTIPLY", g.math("ADD", g.radial(), wobble), 760.0))
    zones = g.remap(zones, 0.1, 1.0, 0.0, 0.28)
    zones = g.math("MULTIPLY", zones, g.remap(g.noise(5, 2), 0.35, 0.6, 0.3, 1.0))
    top = g.mix(zones, top, "#9a4626")
    fib = g.noise(3, 3, 0.55, vec=_radial_fibres(g, 90.0, 60.0))
    top = g.mix(0.2, top, fib, "OVERLAY")
    top = g.mix(0.18, top, g.noise(300, 3), "OVERLAY")
    # Grey-green bruising: patches near the margin and scattered small spots.
    outer = g.remap(g.v, um * 0.45, um * 0.95)
    patch = g.math("MULTIPLY", g.remap(g.noise(11, 3, 0.55, distortion=0.4), 0.46, 0.6, 0.0, 0.9), outer)
    spots = g.math("MULTIPLY", g.remap(g.voronoi(70, rand=1.0), 0.0, 0.14, 1.0, 0.0),
                   g.remap(g.noise(8, 2), 0.5, 0.58, 0.0, 0.8))
    green = g.math("MAXIMUM", patch, spots)
    top = g.mix(green, top, g.ramp(g.noise(60, 3), [(0.4, "#6f8670"), (0.7, "#8d9a7a")]))
    speck = g.remap(g.voronoi(150), 0.0, 0.1, 1.0, 0.0)
    speck = g.math("MULTIPLY", speck, g.remap(g.noise(9, 2), 0.46, 0.56, 0.0, 0.75))
    top = g.mix(speck, top, "#7d4a33")
    top = g.mix(g.remap(g.v, um - 0.07, um - 0.01, 0.0, 0.55), top, "#d9a070")
    stain = g.math("MULTIPLY", g.remap(g.voronoi(60, rand=1.0), 0.0, 0.12, 1.0, 0.0),
                   g.math("MULTIPLY", g.remap(g.noise(7, 2), 0.56, 0.6),
                          g.remap(g.math("ABSOLUTE", g.math("SUBTRACT", g.v, um)), 0.05, 0.0)))
    top = g.mix(stain, top, "#862b33")
    under = g.remap(g.v, ug - 0.004, ug + 0.006)
    colour = g.mix(under, top, "#bb8780")
    roughness = g.lerp(under, g.remap(g.noise(30, 2), 0.3, 0.7, 0.7, 0.8), 0.8)
    height = g.math("ADD", g.math("MULTIPLY", g.noise(200, 4), 0.35), g.math("MULTIPLY", zones, 0.4))
    g.finish(colour, roughness, height, 0.3, 0.0005)
    cap.data.materials.append(m)

    # Gills: pale vinaceous pink, a little deeper towards the stem and paler
    # along the free edge; the latex stains come from the vertex colour.
    m = bpy.data.materials.new("gills-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#e2a2aa"), (0.45, "#e9b0b3"), (1.0, "#eebdba")])
    col = g.mix(g.remap(g.uvy, 0.6, 1.0, 0.0, 0.4), col, "#ecc4bd")
    col = g.mix(0.1, col, g.noise(40, 2, vec=g.vec_scale(g.obj, 1, 1, 1)), "OVERLAY")
    g.finish(col, 0.75, g.noise(200, 2), 0.1, 0.0002)
    gill.data.materials.append(m)

    # Stem: buff-cream with a pink flush, a whitish frosted apex, sparse
    # wine-red spots and a little earth at the base.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    base = g.ramp(g.noise(40, 4), [(0.35, "#d8ac9c"), (0.65, "#e4c2b2")])
    base = g.mix(g.remap(g.noise(9, 3, distortion=0.3), 0.45, 0.65, 0.0, 0.45), base, "#d19e97")
    base = g.mix(0.25, base, g.noise(260, 2, vec=g.vec_scale(g.obj, 1, 1, 0.1)), "OVERLAY")
    base = g.mix(g.remap(g.v, 0.2, 0.05, 0.0, 0.7), base, "#f1e2d8")
    warp = g.nt.nodes.new("ShaderNodeVectorMath")
    warp.operation = "ADD"
    g.link(g.vec_scale(g.obj, 1, 1, 0.7), warp.inputs[0])
    wn = g.nt.nodes.new("ShaderNodeTexNoise")
    wn.inputs["Scale"].default_value = 120
    wn.inputs["Detail"].default_value = 3
    g.link(g.obj, wn.inputs["Vector"])
    wsc = g.nt.nodes.new("ShaderNodeVectorMath")
    wsc.operation = "SCALE"
    wsc.inputs["Scale"].default_value = 0.005
    g.link(wn.outputs["Color"], wsc.inputs[0])
    g.link(wsc.outputs[0], warp.inputs[1])
    # Irregular, roundish vinous blotches of varied size, with fine
    # speckles gathering round them.
    cells = g.voronoi(120, vec=warp.outputs[0], rand=1.0)
    size = g.remap(g.noise(30, 2), 0.35, 0.65, 0.06, 0.25)
    where = g.remap(g.noise(7, 2, vec=g.vec_scale(g.obj, 1, 1, 0.6)), 0.41, 0.53)
    pits = g.math("MULTIPLY", g.remap(g.math("SUBTRACT", size, cells), -0.04, 0.05), where)
    fine = g.math("MULTIPLY", g.remap(g.voronoi(420, vec=warp.outputs[0]), 0.0, 0.2, 1.0, 0.0),
                  g.math("MULTIPLY", where, g.remap(g.noise(40, 2), 0.5, 0.6, 0.0, 0.8)))
    pits = g.math("MAXIMUM", pits, fine)
    pits = g.math("MULTIPLY", pits, g.remap(g.v, 0.12, 0.2))
    base = g.mix(g.math("MULTIPLY", pits, 0.9), base, g.ramp(g.noise(80, 2), [(0.4, "#8f3a47"), (0.6, "#a4525e")]))
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.06)
    band = g.remap(g.math("ADD", g.v, side), 0.9, 0.99)
    soil = g.math("MULTIPLY", band, g.remap(g.noise(90, 5, 0.65), 0.4, 0.52, 0.0, 0.4))
    colour = g.mix(soil, base, g.ramp(g.noise(50, 3), [(0.4, "#a0826a"), (0.65, "#b49a80")]))
    height = g.math("SUBTRACT", g.noise(200, 3), g.math("MULTIPLY", pits, 1.2))
    g.finish(colour, 0.76, height, 0.4, 0.0006)
    stem.data.materials.append(m)

    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    # A slight lean for the whole specimen.
    for o in (cap, stem, gill):
        o.rotation_euler = (math.radians(3.5), math.radians(-2.5), 0)
    views = {"hero": (-30, 28, 0.42, 0.036), "low": (25, 4, 0.4, 0.038), "under": (15, -28, 0.3, 0.046)}
    return [cap, stem, gill], views
