"""Calocybe gambosa (moixernó): a small spring tuft of robust, fleshy, matte
cream-white mushrooms. Convex to hemispheric caps with a strongly inrolled,
irregularly lobed margin; very crowded, narrow white gills notched
(emarginate) just before the stem; short, stout, compact white stems with
no ring and no volva, soiled at the base."""

# Cap profiles (r, z) in metres for a specimen of scale 1. The margin rolls
# under and inwards; the gill surface then rises to the stem apex, so the
# hymenium is a concave bowl as a convex cap requires.
MATURE_CAP = [
    (0.000, 0.0740), (0.015, 0.0731), (0.028, 0.0700), (0.038, 0.0645),
    (0.0443, 0.0572), (0.0468, 0.0496), (0.0464, 0.0438), (0.0453, 0.0413),
    (0.0438, 0.0411),  # inrolled margin tip (index 8)
    (0.0345, 0.0436), (0.0275, 0.0466), (0.0210, 0.0488), (0.0165, 0.0498), (0.0120, 0.0502),
]
MATURE_STEM = [
    (0.0205, 0.0545), (0.0178, 0.0495), (0.0160, 0.0450), (0.0154, 0.0380),
    (0.0157, 0.0280), (0.0168, 0.0170), (0.0180, 0.0080), (0.0172, 0.0025),
    (0.0125, -0.0015), (0.0050, -0.0030), (0.0008, -0.0032),
]

YOUNG_CAP = [
    (0.000, 0.0620), (0.012, 0.0612), (0.022, 0.0580), (0.0298, 0.0516),
    (0.0343, 0.0432), (0.0356, 0.0362), (0.0345, 0.0318), (0.0325, 0.0303),
    (0.0302, 0.0310),  # inrolled margin tip (index 8)
    (0.0240, 0.0345), (0.0190, 0.0372), (0.0150, 0.0386), (0.0105, 0.0393),
]
YOUNG_STEM = [
    (0.0170, 0.0430), (0.0142, 0.0388), (0.0128, 0.0350), (0.0125, 0.0280),
    (0.0131, 0.0190), (0.0142, 0.0100), (0.0146, 0.0050), (0.0136, 0.0012),
    (0.0095, -0.0015), (0.0035, -0.0025), (0.0006, -0.0027),
]
TIP = 8


def specimen(tag, cap_profile, stem_profile, scale, seed, lobe_amp, gill_count, gill_depth):
    cap_profile = [(r * scale, z * scale) for r, z in cap_profile]
    stem_profile = [(r * scale, z * scale) for r, z in stem_profile]
    samples = 150
    um = arc_fraction(cap_profile, TIP)
    top_z = cap_profile[0][1]
    stem_top = stem_profile[1][1]
    ph = [noise.noise(seed + Vector((k * 1.3, 0.2, 0.7))) * 3 for k in range(4)]

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z)) / scale
        q = p * 15 + seed
        edge = smooth(0.12, um, v) * smooth(0.012 * scale, 0.028 * scale, r)
        w = noise.noise(q) * 0.09 + noise.noise(q * 2.4) * 0.03 + noise.noise(q * 5.3) * 0.008
        lobes = lobe_amp * (math.sin(2 * th + ph[0]) * 0.8 + math.sin(3 * th + ph[1]) * 0.7
                            + math.sin(5 * th + ph[2]) * 0.35 + noise.noise(Vector((math.cos(th), math.sin(th), 0)) * 2.5 + seed))
        r2 = r * (1 + (w + lobes * 0.8) * edge)
        # The margin rises and falls with the lobes, like the wavy rims in the photos.
        z2 = z + (w * 0.014 + lobes * 0.03) * edge * scale - 0.003 * scale * edge * (0.5 + 0.5 * math.cos(th - ph[3]))
        upper = 1 - smooth(um - 0.06, um, v)
        # Lumpy, knobbly upper surface with a couple of shallow dents.
        z2 += (noise.noise(p * 30 + seed) * 0.0035 + noise.noise(p * 80 + seed) * 0.0008) * upper * scale
        z2 += noise.noise(p * 18 + seed * 1.3) * 0.004 * upper * scale * smooth(0.0, 0.5, v)
        for cx, cy, rad, dep in ((0.012, -0.018, 0.012, 0.003), (-0.02, 0.01, 0.009, 0.002), (0.022, 0.02, 0.008, -0.0015)):
            ex, ey = p.x - cx, p.y - cy
            z2 -= dep * scale * math.exp(-(ex * ex + ey * ey) / rad ** 2) * upper
        return (r2 * math.cos(th) + 0.002 * scale, r2 * math.sin(th), z2)

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z / scale * 22)) + seed
        # Irregular below; smooth where the flare sinks into the cap flesh.
        r *= 1 + (noise.noise(p) * 0.05 + noise.noise(p * 3) * 0.015) * (1 - smooth(stem_top - 0.008 * scale, stem_top, z))
        k = (1 - min(z, stem_top) / stem_top) ** 2
        return (r * math.cos(th) - 0.003 * scale * k, r * math.sin(th) + 0.0015 * scale * k, z)

    cap = revolve(f"cap{tag}", cap_profile, 256, samples, cap_shape, True, False)
    stem = revolve(f"stem{tag}", stem_profile, 160, 90, stem_shape, True, True)
    sp = catmull(stem_profile, 300)

    def stem_radius(z):
        return min(sp, key=lambda pt: abs(pt.y - z)).x

    j_start = int(round(arc_fraction(cap_profile, TIP) * (samples - 1))) + 2
    # A tiny free gap rounds each gill off just before the stem: the notched
    # (emarginate) attachment of the morphology.
    gill = gills(f"gills{tag}", cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius,
                 gill_count, gill_depth * scale, seed, decurrent=0, free_gap=0.0004 * scale, stains=False,
                 margin_taper=0.85, edge_occlusion=0.94)

    cap_material(cap, um, seed)
    gill_material(gill)
    stem_material(stem)
    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    return [cap, stem, gill]


def cap_material(cap, um, seed):
    # Matte cream-white, a little more buff at the centre, fine mottling.
    m = bpy.data.materials.new(f"{cap.name}-proc")
    g = Graph(m)
    big = g.noise(20, 5, 0.6, distortion=0.3)
    top = g.ramp(big, [(0.3, "#e2d8c0"), (0.55, "#ebe4d2"), (0.75, "#f1ece0")])
    centre = g.remap(g.v, 0.0, um * 0.55, 1.0, 0.0)
    top = g.mix(g.math("MULTIPLY", centre, 0.6), top, "#d6c5a0")
    blot = g.remap(g.noise(9, 3, 0.6, distortion=0.6), 0.52, 0.68, 0.0, 0.5)
    top = g.mix(blot, top, "#d9cba9")
    top = g.mix(0.25, top, g.noise(240, 3), "OVERLAY")
    silk = g.noise(60, 2, 0.5, vec=g.vec_scale(g.obj, 6, 6, 1))
    top = g.mix(0.08, top, silk, "OVERLAY")
    top = g.mix(g.remap(g.v, um - 0.05, um - 0.005, 0.0, 0.6), top, "#f3efe4")
    under = g.remap(g.v, um + 0.004, um + 0.02)
    colour = g.mix(under, top, "#f2e9d4")
    roughness = g.remap(g.noise(30, 2), 0.3, 0.7, 0.72, 0.84)
    height = g.math("ADD", g.math("MULTIPLY", g.noise(160, 4), 0.4), g.math("MULTIPLY", big, 0.3))
    g.finish(colour, roughness, height, 0.55, 0.0006)
    cap.data.materials.append(m)


def gill_material(gill):
    m = bpy.data.materials.new(f"{gill.name}-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#f2e8d2"), (0.5, "#f6eedc"), (1.0, "#f8f2e4")])
    col = g.mix(g.remap(g.uvy, 0.6, 1.0, 0.0, 0.4), col, "#fbf7ec")
    col = g.mix(0.1, col, g.noise(40, 2, vec=g.vec_scale(g.obj, 1, 1, 1)), "OVERLAY")
    g.finish(col, 0.78, g.noise(200, 2), 0.1, 0.0002)
    gill.data.materials.append(m)


def stem_material(stem):
    # White, finely fibrillose, a little buff low down, soil at the base.
    m = bpy.data.materials.new(f"{stem.name}-proc")
    g = Graph(m)
    base = g.ramp(g.noise(45, 4), [(0.35, "#e4dcc8"), (0.65, "#efe9dc")])
    base = g.mix(g.remap(g.v, 0.45, 0.9, 0.0, 0.5), base, "#d8cbab")
    fibres = g.noise(150, 3, 0.5, vec=g.vec_scale(g.obj, 1, 1, 0.08))
    base = g.mix(0.25, base, fibres, "OVERLAY")
    base = g.mix(0.2, base, g.noise(380, 2), "OVERLAY")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.14)
    soil_band = g.remap(g.math("ADD", g.v, side), 0.8, 0.95)
    soil = g.math("MULTIPLY", soil_band, g.remap(g.noise(55, 5, 0.65, distortion=0.5), 0.44, 0.56))
    soil = g.math("MAXIMUM", soil, g.remap(g.v, 0.9, 0.95))
    colour = g.mix(soil, base, g.ramp(g.noise(30, 3), [(0.4, "#6a5540"), (0.65, "#94806a")]))
    g.finish(colour, 0.8, g.math("ADD", g.math("MULTIPLY", fibres, 0.5), soil), 0.3, 0.0005)
    stem.data.materials.append(m)


def place(objs, x, y, rz, tilt_x, tilt_y):
    for o in objs:
        o.location = (x, y, 0.0)
        o.rotation_euler = (math.radians(tilt_x), math.radians(tilt_y), math.radians(rz))


def build():
    a = specimen("", MATURE_CAP, MATURE_STEM, 1.0, Vector((4.1, 2.7, 9.3)), 0.085, 180, 0.0045)
    b = specimen("-b", YOUNG_CAP, YOUNG_STEM, 0.9, Vector((8.2, 5.5, 1.6)), 0.06, 140, 0.0042)
    c = specimen("-c", YOUNG_CAP, YOUNG_STEM, 0.62, Vector((1.4, 9.9, 6.2)), 0.035, 96, 0.004)
    place(a, 0.004, 0.018, 0, -3, 2)
    place(b, 0.066, -0.024, 40, 6, 14)
    place(c, -0.046, -0.034, -70, 9, -12)
    views = {"hero": (-30, 24, 0.6, 0.035), "low": (20, 4, 0.6, 0.035), "under": (20, -45, 0.46, 0.04)}
    return a + b + c, views
