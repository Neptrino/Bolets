"""Lactarius deliciosus (pinetell): depressed carrot-orange cap with darker
concentric zones and a few green stains, inrolled margin; crowded, slightly
decurrent orange gills with carrot-orange latex spots greening at the edges;
short, stout, hollow pale-orange stem with brighter orange pits (scrobiculi)."""


def build():
    seed = Vector((8.2, 3.6, 1.4))

    cap_profile = [
        (0.000, 0.0468), (0.008, 0.0474), (0.017, 0.0508), (0.027, 0.0550),
        (0.036, 0.0584), (0.0425, 0.0588), (0.0468, 0.0565), (0.0484, 0.0526),
        (0.0472, 0.0490), (0.0446, 0.0474), (0.0405, 0.0466), (0.0350, 0.0458), (0.0265, 0.0434),
        (0.0190, 0.0402), (0.0140, 0.0366), (0.0118, 0.0340),
    ]
    samples = 150
    um = arc_fraction(cap_profile, 8)  # inrolled margin tip

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * 20 + seed
        edge = smooth(0.15, um, v)
        w = noise.noise(q) * 0.08 + noise.noise(q * 2.4) * 0.03 + noise.noise(q * 5.5) * 0.01
        lobes = (0.03 * math.sin(2 * th + 0.4) + 0.018 * math.sin(3 * th + 2.0) + 0.012 * math.sin(5 * th + 0.7)
                 + 0.006 * math.sin(9 * th + 1.3) + 0.02 * noise.noise(Vector((math.cos(th), math.sin(th), 0)) * 3 + seed))
        edge *= smooth(0.014, 0.03, r)
        r2 = r * (1 + (w + lobes) * edge)
        z2 = z + (w * 0.016 + lobes * 0.07) * edge
        top = 1 - smooth(um - 0.05, um, v)
        z2 += (noise.noise(p * 40 + seed) * 0.002 + noise.noise(p * 105 + seed) * 0.0006) * top
        dx, dy = p.x + 0.004, p.y - 0.003
        z2 -= 0.0032 * math.exp(-(dx * dx + dy * dy) / 0.014 ** 2) * top
        for cx, cy, rad, dep in ((0.026, -0.016, 0.005, 0.001), (-0.024, 0.02, 0.0045, 0.0009)):
            ex, ey = p.x - cx, p.y - cy
            z2 -= dep * math.exp(-(ex * ex + ey * ey) / rad ** 2) * top
        # A slight tilt so the cap does not sit lathe-level on the stem.
        x, y = r2 * math.cos(th), r2 * math.sin(th)
        z2 += 0.05 * x - 0.025 * y
        return (x + 0.001, y, z2)

    stem_profile = [
        (0.0190, 0.0430), (0.0158, 0.0390), (0.0145, 0.0345), (0.0142, 0.030), (0.0141, 0.022), (0.0136, 0.013),
        (0.0126, 0.006), (0.0112, 0.0015), (0.0075, -0.0010), (0.0020, -0.0014),
    ]

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 25)) + seed
        r *= 1 + (noise.noise(p) * 0.05 + noise.noise(p * 3) * 0.018) * (1 - smooth(0.029, 0.037, z))
        k = (1 - min(z, 0.039) / 0.039) ** 2
        return (r * math.cos(th) - 0.0025 * k, r * math.sin(th) + 0.002 * k, z)

    cap = revolve("cap", cap_profile, 256, samples, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 160, 80, stem_shape, True, True)
    sp = catmull(stem_profile, 200)

    def stem_radius(z):
        return min(sp, key=lambda p: abs(p.y - z)).x

    ug = arc_fraction(cap_profile, 9)
    j_start = int(round(ug * (samples - 1)))
    gill = gills("gills", cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius, 165, 0.0023, seed,
                 decurrent=0, stains=False, edge_occlusion=0.94)

    # Latex spots: carrot-orange (not wine) that green at the edges, painted
    # in vertex colour so they multiply the baked gill texture.
    col = gill.data.color_attributes["Col"]
    for k, vtx in enumerate(gill.data.vertices):
        p = vtx.co
        s1 = smooth(0.3, 0.46, noise.noise(p * 140 + seed)) * smooth(0.05, 0.3, noise.noise(p * 700 + seed))
        s2 = smooth(0.42, 0.56, noise.noise(p * 90 + seed * 1.3)) * 0.8
        c = list(col.data[k].color)
        orange = (1.0, 0.62, 0.3)
        green = (0.55, 0.72, 0.5)
        for i in range(3):
            c[i] *= 1 - s1 * (1 - orange[i])
            c[i] *= 1 - s2 * s1 * 0.6 * (1 - green[i])
        # Green bruising along the free edge (odd vertices) where handled.
        g2 = smooth(0.45, 0.6, noise.noise(p * 55 + seed * 2.1)) * (0.35 if k % 2 else 0.1)
        for i, gm in enumerate((0.55, 0.78, 0.5)):
            c[i] *= 1 - g2 * 0.75 * (1 - gm)
        col.data[k].color = c

    # Cap: carrot orange with darker, speckled concentric zones, a few green
    # stains (strongest in the depression) and a paler inrolled margin.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    big = g.noise(24, 5, 0.6, distortion=0.4)
    top = g.ramp(big, [(0.3, "#d06a22"), (0.5, "#dc7a2c"), (0.68, "#e58c3a"), (0.82, "#eb9a48")])
    # Concentric zones: blotchy, broken bands of darker orange. The radius
    # is warped by 3D noise (so bands follow the lumpy surface and vary in
    # spacing), interrupted by a low-frequency mask and merged into mottling.
    warp = g.math("ADD", g.math("MULTIPLY", g.noise(28, 3, 0.6, distortion=1.0), 0.005),
                  g.math("MULTIPLY", g.noise(70, 3, 0.6), 0.0005))
    phase = g.math("ADD", g.math("MULTIPLY", g.math("ADD", g.radial(), warp), 1150.0),
                   g.math("MULTIPLY", g.noise(22, 2, distortion=0.5), 6.0))
    band = g.remap(g.math("ADD", g.math("SINE", phase), g.math("MULTIPLY", g.math("SUBTRACT", g.noise(35, 3), 0.5), 1.6)), -0.4, 1.0)
    interrupt = g.remap(g.noise(45, 3, 0.6, distortion=0.9), 0.34, 0.56)
    grain = g.remap(g.noise(260, 3, 0.7, distortion=0.8), 0.38, 0.62)
    mottle = g.remap(g.noise(34, 5, 0.7, distortion=1.2), 0.44, 0.64)
    zone_fac = g.math("MULTIPLY", g.math("MULTIPLY", band, interrupt), g.lerp(grain, 0.72, 1.0))
    zone_fac = g.math("MAXIMUM", zone_fac, g.math("MULTIPLY", mottle, g.lerp(grain, 0.3, 0.75)))
    zone_fac = g.math("MULTIPLY", zone_fac, g.remap(g.v, 0.04, 0.2))
    top = g.mix(g.math("MULTIPLY", zone_fac, 0.9), top, "#ad4a1c")
    # A few small, discreet olive stains, mostly at the margin; orange dominates.
    green_n = g.noise(30, 4, 0.6, distortion=0.9)
    towards = g.math("ADD", g.remap(g.v, um * 0.7, um, 0.0, 0.1), g.remap(g.v, 0.0, um * 0.25, 0.03, 0.0))
    gsum = g.math("ADD", green_n, towards)
    gsum = g.math("ADD", gsum, g.math("MULTIPLY", g.math("SUBTRACT", g.noise(120, 3, 0.7), 0.5), 0.12))
    green = g.remap(gsum, 0.62, 0.71, 0.0, 0.75)
    halo = g.remap(gsum, 0.58, 0.66, 0.0, 0.2)
    gcol = g.ramp(g.noise(50, 3), [(0.35, "#4e5f34"), (0.6, "#63703c"), (0.8, "#7c7a3e")])
    top = g.mix(halo, top, "#94763a")
    top = g.mix(green, top, gcol)
    top = g.mix(0.25, top, g.noise(300, 3), "OVERLAY")
    speck = g.remap(g.voronoi(140), 0.0, 0.1, 1.0, 0.0)
    speck = g.math("MULTIPLY", speck, g.remap(g.noise(9, 2), 0.5, 0.58))
    top = g.mix(speck, top, "#4a3424")
    top = g.mix(g.remap(g.v, um - 0.05, um - 0.005, 0.0, 0.45), top, "#eca25a")
    under = g.remap(g.v, ug - 0.004, ug + 0.006)
    colour = g.mix(under, top, "#ffa64c")
    roughness = g.lerp(under, g.remap(g.noise(30, 2), 0.3, 0.7, 0.52, 0.68), 0.8)
    height = g.math("ADD", g.math("MULTIPLY", g.noise(200, 4), 0.4), g.math("MULTIPLY", zone_fac, 0.4))
    g.finish(colour, roughness, height, 0.35, 0.0005)
    cap.data.materials.append(m)

    # Gills: saturated apricot-orange, deeper towards the stem, paler edge.
    m = bpy.data.materials.new("gills-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#ffa644"), (0.45, "#ffb658"), (1.0, "#ffc470")])
    col = g.mix(g.remap(g.uvy, 0.6, 1.0, 0.0, 0.35), col, "#ffd89a")
    col = g.mix(0.15, col, g.noise(40, 2, vec=g.vec_scale(g.obj, 1, 1, 1)), "OVERLAY")
    g.finish(col, 0.72, g.noise(200, 2), 0.1, 0.0002)
    gill.data.materials.append(m)

    # Stem: orange, a little paler than the cap and paler still at the top,
    # with bright orange pits, green bruising where handled and soil at the base.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    base = g.ramp(g.noise(40, 4), [(0.35, "#e98a40"), (0.65, "#f09e56")])
    base = g.mix(g.remap(g.math("ADD", g.v, g.math("MULTIPLY", g.noise(60, 2), 0.06)), 0.36, 0.2, 0.0, 0.7), base, "#f7c48e")
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
    pits_d = g.voronoi(300, vec=warp.outputs[0], rand=1.0)
    pit_size = g.remap(g.noise(35, 2), 0.3, 0.7, 0.1, 0.34)
    pits = g.math("MULTIPLY", g.math("LESS_THAN", pits_d, pit_size), g.remap(g.noise(18, 2), 0.3, 0.46))
    pits = g.math("MAXIMUM", pits, g.math("MULTIPLY", g.math("LESS_THAN", pits_d, g.math("MULTIPLY", pit_size, 1.6)), g.remap(g.noise(14, 2), 0.55, 0.62)))
    mottle = g.remap(g.noise(85, 5, 0.65, vec=g.vec_scale(g.obj, 1, 1, 0.35), distortion=0.6), 0.45, 0.65, 0.0, 0.6)
    base = g.mix(mottle, base, "#dc7a34")
    base = g.mix(pits, base, "#e8580c")
    base = g.mix(g.remap(g.noise(38, 3, distortion=0.7), 0.66, 0.74, 0.0, 0.35), base, "#6f7444")
    base = g.mix(0.3, base, g.noise(260, 2, vec=g.vec_scale(g.obj, 1, 1, 0.1)), "OVERLAY")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.15)
    soil = g.math("MULTIPLY", g.remap(g.math("ADD", g.v, side), 0.72, 0.9), g.remap(g.noise(70, 5, 0.65), 0.4, 0.52))
    colour = g.mix(soil, base, "#4f3d2d")
    height = g.math("SUBTRACT", g.noise(200, 3), g.math("MULTIPLY", pits, 0.6))
    g.finish(colour, 0.72, height, 0.35, 0.0005)
    stem.data.materials.append(m)

    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    views = {"hero": (-30, 28, 0.42, 0.03), "low": (25, 4, 0.4, 0.032), "under": (15, -28, 0.3, 0.04)}
    return [cap, stem, gill], views
