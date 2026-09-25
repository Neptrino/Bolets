"""Lactarius deliciosus (pinetell): depressed orange cap with soft, broken
concentric zones of brighter orange, a few small green stains and a thin
inrolled margin; crowded, slightly decurrent carrot-orange gills with small
latex spots; a leaning, tapering orange stem with a gill-orange apex and a
few shallow orange pits (scrobiculi)."""


def build():
    seed = Vector((8.2, 3.6, 1.4))
    lift = 0.011  # a stem about half the cap diameter, as in mature field specimens

    # Depressed cap with a thin margin that curls under (about 4 mm of flesh
    # at the edge), so the gills reach almost to the rim.
    cap_profile = [(r, z + lift) for r, z in (
        (0.000, 0.0470), (0.008, 0.0477), (0.017, 0.0508), (0.027, 0.0545),
        (0.035, 0.0566), (0.041, 0.0570), (0.0455, 0.0560), (0.0482, 0.0543),
        (0.0490, 0.0528), (0.0483, 0.0517), (0.0467, 0.0513), (0.0420, 0.0505),
        (0.0350, 0.0488), (0.0265, 0.0458), (0.0190, 0.0420), (0.0148, 0.0385), (0.0122, 0.0355),
    )]
    samples = 150
    um = arc_fraction(cap_profile, 9)  # inrolled margin tip

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * 20 + seed
        edge = smooth(0.15, um, v)
        w = noise.noise(q) * 0.07 + noise.noise(q * 2.4) * 0.025 + noise.noise(q * 5.5) * 0.008
        lobes = (0.028 * math.sin(2 * th + 0.4) + 0.016 * math.sin(3 * th + 2.0) + 0.01 * math.sin(5 * th + 0.7)
                 + 0.005 * math.sin(9 * th + 1.3) + 0.018 * noise.noise(Vector((math.cos(th), math.sin(th), 0)) * 3 + seed))
        edge *= smooth(0.014, 0.03, r)
        r2 = r * (1 + (w + lobes) * edge)
        z2 = z + (w * 0.014 + lobes * 0.06) * edge
        top = 1 - smooth(um - 0.07, um - 0.02, v)
        z2 += (noise.noise(p * 40 + seed) * 0.0018 + noise.noise(p * 105 + seed) * 0.0005) * top
        dx, dy = p.x + 0.004, p.y - 0.003
        z2 -= 0.0032 * math.exp(-(dx * dx + dy * dy) / 0.014 ** 2) * top
        for cx, cy, rad, dep in ((0.026, -0.016, 0.005, 0.001), (-0.024, 0.02, 0.0045, 0.0009)):
            ex, ey = p.x - cx, p.y - cy
            z2 -= dep * math.exp(-(ex * ex + ey * ey) / rad ** 2) * top
        # The cap sits tilted and a little off-centre on the leaning stem.
        x, y = r2 * math.cos(th), r2 * math.sin(th)
        z2 += 0.075 * x - 0.03 * y
        return (x + 0.0015, y - 0.001, z2)

    top_z = 0.0430 + lift
    stem_profile = [
        (0.0192, top_z), (0.0160, top_z - 0.004), (0.0146, top_z - 0.0085), (0.0142, top_z - 0.013),
        (0.0135, 0.036), (0.0128, 0.024), (0.0122, 0.013), (0.0114, 0.0060),
        (0.0100, 0.0022), (0.0077, 0.0000), (0.0045, -0.0012), (0.0015, -0.0016),
    ]
    flare = top_z - 0.0125
    sp = catmull(stem_profile, 240)

    def stem_radius(z):
        return min(sp, key=lambda p: abs(p.y - z)).x

    # Scrobiculi: a few large, shallow, oval pits (angle, height, radius in m).
    pit_spots = [(0.2, 0.037, 0.0028), (0.95, 0.021, 0.0034), (1.9, 0.031, 0.0024), (2.7, 0.013, 0.0030),
                 (3.5, 0.040, 0.0022), (4.3, 0.024, 0.0036), (5.1, 0.033, 0.0026), (5.7, 0.010, 0.0022)]

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 25)) + seed
        r *= 1 + (noise.noise(p) * 0.045 + noise.noise(p * 3) * 0.015) * (1 - smooth(flare - 0.006, flare + 0.002, z))
        for pth, pz, prad in pit_spots:
            dth = (th - pth + math.pi) % (2 * math.pi) - math.pi
            d2 = (dth * 0.014) ** 2 + ((z - pz) * 0.65) ** 2
            r -= 0.0005 * math.exp(-d2 / prad ** 2)
        # The base leans out to one side, as a stem growing up through litter.
        k = (1 - min(z, top_z) / top_z) ** 1.6
        return (r * math.cos(th) - 0.0055 * k, r * math.sin(th) + 0.003 * k, z)

    cap = revolve("cap", cap_profile, 256, samples, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 160, 90, stem_shape, True, True)
    ug = arc_fraction(cap_profile, 10)
    j_start = int(round(ug * (samples - 1)))
    gill = gills("gills", cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius, 135, 0.0030, seed,
                 decurrent=0.0035, stains=False, margin_taper=0.85, edge_occlusion=0.9)

    # Latex spots: small, deeper orange marks on the gills (the latex is
    # carrot-orange, not wine), painted in vertex colour to multiply the texture.
    col = gill.data.color_attributes["Col"]
    for k, vtx in enumerate(gill.data.vertices):
        p = vtx.co
        s1 = smooth(0.34, 0.5, noise.noise(p * 140 + seed)) * smooth(0.1, 0.35, noise.noise(p * 700 + seed))
        c = list(col.data[k].color)
        for i, m in enumerate((0.92, 0.72, 0.55)):
            c[i] *= 1 - s1 * (1 - m)
        col.data[k].color = c

    # Cap: orange, paler salmon towards the margin, with soft concentric zones
    # of slightly deeper, brighter orange made of fine droplets (orange on
    # orange, never brown), a few small discreet green stains and a matte,
    # frosted surface.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    big = g.noise(24, 5, 0.6, distortion=0.4)
    top = g.ramp(big, [(0.3, "#dd8a50"), (0.5, "#e4975c"), (0.7, "#e9a46a"), (0.85, "#edae78")])
    top = g.mix(g.remap(g.v, 0.0, um * 0.45, 0.35, 0.0), top, "#dc7632")
    top = g.mix(g.remap(g.v, um * 0.55, um - 0.01, 0.0, 0.5), top, "#f2b27c")
    # Zones: the radius is warped by 3D noise so the bands wander with the
    # lumpy surface, vary in spacing and break up; each band is a scatter of
    # fine droplets rather than a painted line.
    warp = g.math("ADD", g.math("MULTIPLY", g.noise(26, 3, 0.6, distortion=1.0), 0.004),
                  g.math("MULTIPLY", g.noise(70, 3, 0.6), 0.0006))
    phase = g.math("ADD", g.math("MULTIPLY", g.math("ADD", g.radial(), warp), 1100.0),
                   g.math("MULTIPLY", g.noise(20, 2, distortion=0.5), 5.0))
    band = g.remap(g.math("ADD", g.math("SINE", phase), g.math("MULTIPLY", g.math("SUBTRACT", g.noise(35, 3), 0.5), 1.2)), -0.5, 0.9)
    interrupt = g.remap(g.noise(40, 3, 0.6, distortion=0.9), 0.3, 0.52)
    drops = g.remap(g.voronoi(300, rand=1.0), 0.5, 0.2)
    zone_fac = g.math("MULTIPLY", g.math("MULTIPLY", band, interrupt), g.lerp(drops, 0.6, 1.0))
    zone_fac = g.math("MULTIPLY", zone_fac, g.remap(g.v, 0.05, 0.22))
    zone_fac = g.math("MULTIPLY", zone_fac, g.remap(g.v, um - 0.01, um * 0.8))
    top = g.mix(g.math("MULTIPLY", zone_fac, 0.85), top, "#e0701e")
    # A few small, discreet olive stains, mostly at the margin; orange dominates.
    green_n = g.noise(30, 4, 0.6, distortion=0.9)
    towards = g.math("ADD", g.remap(g.v, um * 0.7, um, 0.0, 0.08), g.remap(g.v, 0.0, um * 0.25, 0.03, 0.0))
    gsum = g.math("ADD", green_n, towards)
    gsum = g.math("ADD", gsum, g.math("MULTIPLY", g.math("SUBTRACT", g.noise(120, 3, 0.7), 0.5), 0.12))
    green = g.remap(gsum, 0.645, 0.72, 0.0, 0.6)
    halo = g.remap(gsum, 0.6, 0.68, 0.0, 0.2)
    gcol = g.ramp(g.noise(50, 3), [(0.35, "#5f6a3a"), (0.6, "#727540"), (0.8, "#857c44")])
    top = g.mix(halo, top, "#b0804a")
    top = g.mix(green, top, gcol)
    top = g.mix(0.18, top, g.noise(300, 3), "OVERLAY")
    frost = g.remap(g.noise(500, 2, 0.7), 0.5, 0.72, 0.0, 0.22)
    top = g.mix(frost, top, "#f6d2ae")
    fleck = g.math("MULTIPLY", g.remap(g.voronoi(700, rand=1.0), 0.3, 0.12, 0.0, 0.35), g.remap(g.noise(18, 2), 0.4, 0.6, 0.4, 1.0))
    top = g.mix(fleck, top, "#cc6420")
    under = g.remap(g.v, ug - 0.004, ug + 0.006)
    colour = g.mix(under, top, "#ee8a3a")
    roughness = g.lerp(under, g.remap(g.noise(30, 2), 0.3, 0.7, 0.62, 0.76), 0.8)
    height = g.math("ADD", g.math("MULTIPLY", g.noise(200, 4), 0.35), g.math("MULTIPLY", zone_fac, 0.15))
    g.finish(colour, roughness, height, 0.3, 0.0005)
    cap.data.materials.append(m)

    # Gills: carrot orange, brighter than the cap, deeper towards the stem,
    # paler along the free edge.
    m = bpy.data.materials.new("gills-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#ea7c2c"), (0.45, "#f08a36"), (1.0, "#f39a48")])
    col = g.mix(g.remap(g.uvy, 0.6, 1.0, 0.0, 0.3), col, "#f8b268")
    col = g.mix(0.12, col, g.noise(40, 2, vec=g.vec_scale(g.obj, 1, 1, 1)), "OVERLAY")
    g.finish(col, 0.7, g.noise(200, 2), 0.1, 0.0002)
    gill.data.materials.append(m)

    # Stem: orange, blending into gill orange at the apex, a few
    # large, shallow, soft-edged pits (scrobiculi) of slightly deeper, glossier
    # orange, and only a little soil at the rounded base.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    base = g.ramp(g.noise(40, 4), [(0.35, "#e99a5c"), (0.65, "#efa96e")])
    mottle = g.remap(g.noise(85, 5, 0.65, vec=g.vec_scale(g.obj, 1, 1, 0.35), distortion=0.6), 0.45, 0.65, 0.0, 0.4)
    base = g.mix(mottle, base, "#e2833c")
    base = g.mix(0.22, base, g.noise(260, 2, vec=g.vec_scale(g.obj, 1, 1, 0.1)), "OVERLAY")
    apex = g.remap(g.math("ADD", g.v, g.math("MULTIPLY", g.noise(60, 2), 0.04)), 0.16, 0.06, 0.0, 0.7)
    base = g.mix(apex, base, "#ea8238")
    pit = None
    rag = g.math("MULTIPLY", g.math("SUBTRACT", g.noise(140, 3, 0.6), 0.5), 0.0022)
    for pth, pz, prad in pit_spots:
        x, y, z = stem_shape(pth, 0.0, stem_radius(pz), pz)
        d = g.nt.nodes.new("ShaderNodeVectorMath")
        d.operation = "DISTANCE"
        g.link(g.vec_scale(g.obj, 1, 1, 0.65), d.inputs[0])
        d.inputs[1].default_value = (x, y, z * 0.65)
        one = g.remap(g.math("ADD", d.outputs["Value"], rag), prad * 1.3, prad * 0.3)
        pit = one if pit is None else g.math("MAXIMUM", pit, one)
    wobble = g.remap(g.noise(180, 3, 0.6), 0.3, 0.7, 0.75, 1.0)
    pits = g.math("MULTIPLY", pit, wobble)
    base = g.mix(g.math("MULTIPLY", pits, 0.65), base, "#e87c30")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.08)
    soil = g.math("MULTIPLY", g.remap(g.math("ADD", g.v, side), 0.88, 0.99), g.remap(g.noise(70, 5, 0.65), 0.4, 0.58, 0.0, 0.45))
    colour = g.mix(soil, base, "#9a7656")
    roughness = g.lerp(pits, 0.74, 0.5)
    height = g.math("SUBTRACT", g.math("MULTIPLY", g.noise(200, 3), 0.3), pits)
    g.finish(colour, roughness, height, 0.4, 0.0008)
    stem.data.materials.append(m)

    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    views = {"hero": (-30, 26, 0.46, 0.038), "low": (25, 4, 0.44, 0.04), "under": (15, -26, 0.34, 0.048)}
    return [cap, stem, gill], views
