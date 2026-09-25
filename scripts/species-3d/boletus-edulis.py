"""Boletus edulis (cep): convex chestnut-brown cap with a paler margin;
cream pores; pale, bellied stem with a raised white net on its upper half."""


def build():
    seed = Vector((3.1, 7.7, 1.3))

    # A thick, domed cap: the underside is a convex tube cushion that curves
    # up to the margin and dips into a shallow moat round the stem apex.
    cap_profile = [
        (0.000, 0.1600), (0.022, 0.1585), (0.040, 0.1530), (0.054, 0.1440),
        (0.0635, 0.1330), (0.0692, 0.1212), (0.0712, 0.1115), (0.0692, 0.1036),
        (0.0648, 0.1024), (0.0575, 0.1028), (0.0490, 0.1042), (0.0405, 0.1068),
        (0.0335, 0.1102), (0.0290, 0.1142), (0.0258, 0.1190),
    ]
    um = arc_fraction(cap_profile, 7)  # where the cuticle turns under

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * 16 + seed
        w = noise.noise(q) * 0.06 + noise.noise(q * 2.3) * 0.025 + noise.noise(q * 5.1) * 0.007
        edge = smooth(0.1, um, v)
        # A gently wavy margin and a bulge on one side.
        wave = 0.02 * math.sin(3 * th + 1.1) + 0.012 * math.sin(5 * th + 0.4) + 0.025 * math.cos(th - 0.9)
        r2 = r * (1 + (w + wave) * edge)
        z2 = z + w * 0.014 * edge - 0.004 * edge * (0.5 + 0.5 * math.cos(th - 2.2))
        top = 1 - smooth(um - 0.05, um, v)
        z2 += noise.noise(p * 70 + seed) * 0.0009 * top
        # One or two shallow dents on the dome.
        for cx, cy, rad, dep in ((0.022, -0.018, 0.012, 0.0022), (-0.03, 0.02, 0.009, 0.0014)):
            ex, ey = p.x - cx, p.y - cy
            z2 -= dep * math.exp(-(ex * ex + ey * ey) / rad ** 2) * top
        x, y = r2 * math.cos(th) + 0.0008, r2 * math.sin(th)
        z2 += 0.055 * x - 0.02 * y  # the cap tilts a little on the stem
        return (x, y, z2)

    # Egg- or barrel-shaped bulbous stem, widest in its lower third and
    # curving round into the soil; the apex flares slightly into the tubes.
    stem_profile = [
        (0.0280, 0.1270), (0.0278, 0.1180), (0.0282, 0.1080), (0.0305, 0.0960),
        (0.0340, 0.0820), (0.0378, 0.0660), (0.0405, 0.0500), (0.0418, 0.0350),
        (0.0410, 0.0220), (0.0378, 0.0110), (0.0318, 0.0030), (0.0225, -0.0030),
        (0.0110, -0.0060), (0.0030, -0.0068),
    ]

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 20)) + seed * 2
        free = 1 - smooth(0.100, 0.112, z)
        r *= 1 + (noise.noise(p) * 0.045 + 0.035 * math.cos(2 * th + 0.5)) * free
        bend = 0.005 * (1 - z / 0.127) ** 2  # the base sits off-axis
        return (r * math.cos(th) - bend, r * math.sin(th) + 0.002 * (1 - z / 0.127) ** 2, z)

    cap = revolve("cap", cap_profile, 256, 150, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 256, 120, stem_shape, False, True)

    # Cap: warm chestnut-hazel brown, darker in the centre and lighter towards
    # a soft, narrow whitish margin, with a satin sheen;
    # the tubes are white to cream in this young specimen.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    big = g.noise(8, 3, 0.5, distortion=0.2)
    top = g.ramp(g.v, [(0.0, "#78491f"), (um * 0.45, "#845528"), (um * 0.8, "#9a6a36"), (um * 0.93, "#ad8048")])
    top = g.mix(g.remap(big, 0.35, 0.65, 0.0, 0.4), top, "#653c18")
    # Smooth to slightly greasy, wrinkled cuticle with soft, irregular
    # darker and lighter patches and no directional grain.
    wrinkle = g.noise(60, 4, 0.6, distortion=0.4)
    top = g.mix(g.remap(g.noise(16, 3, 0.55, distortion=0.6), 0.52, 0.68, 0.0, 0.35), top, "#5e3614")
    top = g.mix(0.12, top, wrinkle, "OVERLAY")
    top = g.mix(0.12, top, g.noise(260, 3, 0.5), "OVERLAY")
    # Soft, lighter hazel mottling where the cuticle is drier.
    top = g.mix(g.remap(g.noise(24, 4, 0.6, distortion=0.5), 0.55, 0.7, 0.0, 0.4), top, "#b48a54")
    top = g.mix(g.remap(g.v, um - 0.02, um - 0.002, 0.0, 0.75), top, "#e2d6bd")
    pore_d = g.voronoi(1300, rand=0.8)
    pores = g.ramp(pore_d, [(0.04, "#d8cfb4"), (0.25, "#e9e2cc"), (0.5, "#f1ecdc")])
    pores = g.mix(g.remap(g.v, 0.86, 1.0, 0.0, 0.35), pores, "#e6dcb8")
    under = g.remap(g.v, um - 0.002, um + 0.012)
    colour = g.mix(under, top, pores)

    rough_top = g.remap(g.noise(30, 2), 0.3, 0.7, 0.44, 0.56)
    roughness = g.lerp(under, rough_top, 0.9)

    h_top = g.math("ADD", g.math("MULTIPLY", g.noise(180, 4), 0.3), g.math("MULTIPLY", wrinkle, 0.6))
    h_pore = g.remap(pore_d, 0.02, 0.4, 0.0, 1.0)
    g.finish(colour, roughness, g.lerp(under, h_top, h_pore), 0.5, 0.0005)
    cap.data.materials.append(m)

    # Stem: cream-buff, bellied, with a fine raised white net whose meshes
    # stretch lengthways, densest at the apex and fading out by mid-stem
    # (the cep's key feature), and a little earth at the very base.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    net_d = g.voronoi(420, "DISTANCE_TO_EDGE", vec=g.vec_scale(g.obj, 1, 1, 0.4), rand=0.85)
    net = g.remap(net_d, 0.0, 0.13, 1.0, 0.0)
    net = g.math("MULTIPLY", net, g.remap(g.v, 0.08, 0.42, 1.0, 0.0))
    base = g.ramp(g.noise(50, 4), [(0.35, "#cdbd99"), (0.65, "#d8caa9")])
    base = g.mix(g.remap(g.v, 0.05, 0.45, 0.5, 0.0), base, "#bfac84")
    base = g.mix(g.remap(g.v, 0.45, 0.9, 0.0, 0.3), base, "#e4dccb")
    base = g.mix(0.2, base, g.noise(400, 2), "OVERLAY")
    fibres = g.noise(160, 3, 0.5, vec=g.vec_scale(g.obj, 1, 1, 0.08))
    base = g.mix(0.25, base, fibres, "OVERLAY")
    colour = g.mix(net, base, "#fbf9f2")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.05)
    soil_band = g.remap(g.math("ADD", g.v, side), 0.9, 0.99)
    soil = g.math("MULTIPLY", soil_band, g.remap(g.noise(90, 5, 0.65), 0.4, 0.52, 0.0, 0.5))
    colour = g.mix(soil, colour, g.ramp(g.noise(50, 3), [(0.4, "#8f7457"), (0.65, "#a68b6c")]))
    roughness = g.remap(net, 0.0, 1.0, 0.8, 0.72)
    height = g.math("ADD", net, g.math("MULTIPLY", fibres, 0.3))
    g.finish(colour, roughness, height, 0.32, 0.0005)
    stem.data.materials.append(m)

    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
        o.rotation_euler = (math.radians(-3.0), math.radians(3.5), 0)  # a slight lean
    views = {"hero": (-30, 18, 0.72, 0.078), "low": (25, 3, 0.68, 0.078), "under": (10, -16, 0.6, 0.085)}
    return [cap, stem], views
