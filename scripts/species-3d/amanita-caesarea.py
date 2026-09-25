"""Amanita caesarea (ou de reig): smooth, satiny orange-red cap fading to
orange-yellow, with fine irregular striae at the margin; crowded, free,
golden-yellow gills; yellow stem, slightly tapering upwards and clavate at
the base, with faint chevron flecks and a soft, hanging yellow ring; a thick,
close-fitting white sac-like volva torn into a few large lobes."""


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


def build():
    seed = Vector((2.2, 6.1, 4.7))

    cap_profile = [
        # Convex cap: the margin drops well below the stem apex, so the
        # hymenium is a concave bowl rather than a flat plate. The flesh is
        # thick enough that deep gills fill most of the bowl.
        (0.000, 0.1580), (0.016, 0.1568), (0.031, 0.1520), (0.043, 0.1435),
        (0.051, 0.1325), (0.0555, 0.1205), (0.0568, 0.1110), (0.0556, 0.1094),
        (0.0510, 0.1122), (0.0440, 0.1170), (0.0360, 0.1210), (0.0270, 0.1240),
        (0.0180, 0.1262), (0.0115, 0.1274), (0.0090, 0.1278),
    ]
    samples = 160
    um = arc_fraction(cap_profile, 6)  # margin tip

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * 14 + seed
        edge = smooth(0.2, um, v) * smooth(0.014, 0.03, r)
        w = noise.noise(q) * 0.04 + noise.noise(q * 2.6) * 0.012
        # A slightly wavy margin and a bulge on one side.
        wave = 0.012 * math.sin(3 * th + 0.7) + 0.008 * math.sin(5 * th + 2.0) + 0.03 * math.cos(th - 2.6)
        r2 = r * (1 + (w + wave) * edge)
        z2 = z + (w * 0.01 + wave * 0.03) * edge - 0.003 * edge * (0.5 + 0.5 * math.cos(th - 0.6))
        x, y = r2 * math.cos(th), r2 * math.sin(th)
        return (x, y, z2 + 0.06 * x + 0.025 * y)  # the cap tilts a little on the stem

    # Tapers slightly upwards; clavate base inside the volva, rounded below.
    stem_profile = [
        (0.0158, 0.1420), (0.0124, 0.1320), (0.0126, 0.1187), (0.0133, 0.0975),
        (0.0142, 0.0700), (0.0152, 0.0450), (0.0166, 0.0250), (0.0178, 0.0120),
        (0.0170, 0.0040), (0.0135, -0.0010), (0.0070, -0.0035), (0.0020, -0.0042),
    ]

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 18)) + seed
        r *= 1 + (noise.noise(p) * 0.035 + 0.04 * math.cos(2 * th + 1.0)) * (1 - smooth(0.121, 0.13, z))
        k = (1 - min(z, 0.13) / 0.13) ** 2
        return (r * math.cos(th) + 0.003 * k, r * math.sin(th) + 0.001 * k, z)

    cap = revolve("cap", cap_profile, 256, samples, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 160, 120, stem_shape, True, True)
    sp = catmull(stem_profile, 300)

    def stem_radius(z):
        return min(sp, key=lambda p: abs(p.y - z)).x

    # The gills begin just inside the lowest point of the margin and taper
    # in over its outer half, their free edge kept above the margin tip so
    # no yellow teeth hang below the orange rim.
    ug = 0.4 * arc_fraction(cap_profile, 7) + 0.6 * arc_fraction(cap_profile, 8)
    gill = gills("gills", cap_profile, samples, int(round(ug * (samples - 1))), cap_shape, stem_shape,
                 stem_radius, 130, 0.0085, seed, decurrent=0, free_gap=0.0012, stains=False,
                 margin_taper=0.55, edge_occlusion=0.97)
    tip = cap_profile[6]
    _clamp_gill_edge(gill, lambda th: cap_shape(th, um, tip[0], tip[1])[2], lift=0.0003, r_min=0.02)

    # Ring: a thin, soft skirt hanging just below the gills, with irregular
    # folds, an uneven lower edge and one side that has collapsed.
    ring_profile = [(0.0127, 0.1150), (0.0148, 0.1140), (0.0162, 0.1108), (0.0168, 0.1060),
                    (0.0169, 0.1005), (0.0167, 0.0950), (0.0163, 0.0905)]

    def ring_shape(th, v, r, z):
        dirn = Vector((math.cos(th), math.sin(th), 0))
        fold = (0.0016 * noise.noise(dirn * 4 + seed) + 0.0008 * noise.noise(dirn * 8 + seed)
                + 0.0003 * noise.noise(dirn * 15 + seed * 0.5))
        collapse = 0.5 + 0.5 * smooth(-0.6, 0.4, math.cos(th - 2.4))
        # An uneven hem: longer and shorter stretches, one short torn part.
        sag = noise.noise(dirn * 2 + seed * 1.7) * 0.007 + noise.noise(dirn * 4 + seed) * 0.0015
        torn = 0.006 * math.exp(-((math.atan2(math.sin(th - 0.9), math.cos(th - 0.9))) / 0.28) ** 2)
        z2 = z + (sag + torn) * v * v - 0.003 * (1 - collapse) * v
        # Measure from the actual (oval, lumpy) stem surface so the skirt
        # never sinks into it.
        out = max((r - 0.0127) * collapse + fold * v, 0.0004 + 0.0008 * v)
        return stem_shape(th, 0.0, stem_radius(z2) + out, z2)

    ring = revolve("ring", ring_profile, 200, 30, ring_shape, False, False)
    solidify(ring, 0.0004, rim=False)

    # Volva: a thick, close-fitting white sac with a rounded base, about 1.5x
    # the stem width, its top torn into three large irregular lobes.
    volva_profile = [(0.0030, -0.0070), (0.0130, -0.0058), (0.0205, -0.0010), (0.0240, 0.0080),
                     (0.0252, 0.0200), (0.0245, 0.0320), (0.0228, 0.0420), (0.0215, 0.0480)]

    def volva_shape(th, v, r, z):
        dirn = Vector((math.cos(th), math.sin(th), 0))
        # Three lobes of different heights; the gaps between them are low.
        lobe = (0.5 + 0.5 * math.cos(3 * th + 0.4)) ** 0.5 * (0.75 + 0.5 * (noise.noise(dirn * 2 + seed) * 0.5 + 0.5))
        lobe += 0.12 * noise.noise(dirn * 7 + seed)
        lobe = max(0.0, min(1.2, lobe))
        up = smooth(0.45, 1.0, v)
        z2 = z * (1 + up * (0.5 * lobe - 0.42))
        # Broad folds only; one lobe leans against the stem, another falls open.
        fold = noise.noise(dirn * 3 + Vector((0, 0, z * 30)) + seed) * 0.05
        lean = up * (0.14 * math.cos(th - 2.0) - 0.1 * smooth(-0.2, 0.8, math.cos(th + 0.9)))
        r2 = r * (1 + fold + lean)
        return (r2 * math.cos(th) + 0.003, r2 * math.sin(th) + 0.001, z2)

    volva = revolve("volva", volva_profile, 200, 60, volva_shape, True, False)
    solidify(volva, 0.0028)

    # Cap: deep orange-red centre fading to orange-yellow, satiny, with fine
    # grooves of irregular spacing and length only near the margin.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    base = g.ramp(g.v, [(0.0, "#cf400c"), (um * 0.45, "#dc540c"), (um * 0.8, "#e87210"), (um * 0.97, "#ef951a")])
    base = g.mix(0.2, base, g.noise(10, 3, 0.5), "OVERLAY")
    # Soft mottling so the orange is not a flat airbrushed gradient.
    base = g.mix(g.remap(g.noise(14, 4, 0.6, distortion=0.5), 0.5, 0.68, 0.0, 0.3), base, "#c83e10")
    base = g.mix(g.remap(g.noise(22, 3, 0.55, distortion=0.4), 0.55, 0.7, 0.0, 0.22), base, "#f08a2a")
    base = g.mix(0.1, base, g.noise(220, 3), "OVERLAY")
    ang = g.nt.nodes.new("ShaderNodeMath")
    ang.operation = "ARCTAN2"
    sepo = g.nt.nodes.new("ShaderNodeSeparateXYZ")
    g.link(g.obj, sepo.inputs[0])
    g.link(sepo.outputs["Y"], ang.inputs[0])
    g.link(sepo.outputs["X"], ang.inputs[1])
    # 150 is a whole number of periods, so the grooves close without a seam;
    # the noise shifts their spacing and length.
    jitter = g.math("MULTIPLY", g.noise(9, 2), 5.0)
    stri = g.math("SINE", g.math("ADD", g.math("MULTIPLY", ang.outputs[0], 150.0), jitter))
    start = g.math("ADD", um * 0.8, g.math("MULTIPLY", g.noise(40, 2), um * 0.1))
    stri_mask = g.remap(g.math("SUBTRACT", g.v, start), 0.0, um * 0.1)
    stri = g.math("MULTIPLY", g.remap(stri, 0.2, 1.0), stri_mask)
    base = g.mix(g.math("MULTIPLY", stri, 0.3), base, "#bb4d1a")
    # The cuticle stays orange round the margin until the gills begin; a pale
    # strip before them read as an olive line in shade.
    under = g.remap(g.v, ug - 0.001, ug + 0.004)
    colour = g.mix(under, base, "#f0c848")
    roughness = g.lerp(under, g.remap(g.noise(25, 2), 0.3, 0.7, 0.5, 0.56), 0.78)
    height = g.math("ADD", g.math("MULTIPLY", stri, 0.6), g.math("MULTIPLY", g.noise(160, 3), 0.2))
    g.finish(colour, roughness, height, 0.4, 0.0005)
    cap.data.materials.append(m)

    m = bpy.data.materials.new("gills-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#eec23a"), (0.5, "#f0c846"), (1.0, "#f3d25a")])
    col = g.mix(g.remap(g.uvy, 0.75, 1.0, 0.0, 0.4), col, "#f8e08a")
    g.finish(col, 0.72, g.noise(200, 2), 0.1, 0.0002)
    gill.data.materials.append(m)

    # Stem: yellow with faint paler chevron flecks; whitish inside the volva.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    band = g.noise(45, 3, 0.5, vec=g.vec_scale(g.obj, 0.5, 0.5, 1.4), distortion=1.2)
    flecks = g.remap(band, 0.58, 0.68, 0.0, 0.45)
    colour = g.mix(flecks, g.ramp(g.noise(20, 3), [(0.4, "#f2cf52"), (0.65, "#f5d865")]), "#f9e596")
    colour = g.mix(0.15, colour, g.noise(300, 2, vec=g.vec_scale(g.obj, 1, 1, 0.15)), "OVERLAY")
    colour = g.mix(g.remap(g.v, 0.7, 0.86), colour, "#efe6cf")
    g.finish(colour, 0.66, flecks, 0.12, 0.0004)
    stem.data.materials.append(m)

    m = bpy.data.materials.new("ring-proc")
    g = Graph(m)
    colour = g.ramp(g.noise(60, 3), [(0.4, "#f0c850"), (0.65, "#f6d97a")])
    stri = g.noise(8, 2, vec=g.vec_scale(g.obj, 1400, 1400, 1))
    colour = g.mix(0.2, colour, stri, "OVERLAY")
    g.finish(colour, 0.72, stri, 0.12, 0.0003)
    ring.data.materials.append(m)

    # Volva: white, smooth-felty, with a little earth on the lower outside.
    m = bpy.data.materials.new("volva-proc")
    g = Graph(m)
    felt = g.noise(90, 4, 0.55, vec=g.vec_scale(g.obj, 1, 1, 1.8), distortion=0.3)
    colour = g.ramp(felt, [(0.35, "#e9e4d8"), (0.6, "#f6f3ec")])
    soil = g.math("MULTIPLY", g.remap(g.v, 0.55, 0.25), g.remap(g.noise(60, 5, 0.65), 0.38, 0.48, 0.0, 0.85))
    smear = g.math("MULTIPLY", g.remap(g.v, 0.6, 0.35), g.remap(g.noise(18, 4, 0.6, distortion=0.8), 0.55, 0.62, 0.0, 0.6))
    soil = g.math("MAXIMUM", soil, smear)
    specks = g.math("MULTIPLY", g.remap(g.voronoi(120), 0.0, 0.18, 1.0, 0.0), g.remap(g.noise(12, 2), 0.48, 0.56))
    colour = g.mix(g.math("MAXIMUM", soil, specks), colour, g.ramp(g.noise(30, 3), [(0.4, "#7d5c3e"), (0.65, "#957453")]))
    g.finish(colour, 0.86, felt, 0.25, 0.0006)
    volva.data.materials.append(m)

    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    for o in (cap, stem, gill, ring, volva):
        o.rotation_euler = (math.radians(4.0), math.radians(-3.0), 0)  # a slight lean
    views = {"hero": (-30, 14, 0.7, 0.08), "low": (25, 3, 0.66, 0.078), "under": (15, -18, 0.58, 0.086)}
    return [cap, stem, gill, ring, volva], views
