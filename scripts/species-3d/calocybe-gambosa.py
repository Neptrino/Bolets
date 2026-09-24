"""Calocybe gambosa (moixernó): a small spring tuft of robust, fleshy, matte
cream-white mushrooms. Convex to hemispheric caps with a strongly inrolled,
irregularly lobed margin; very crowded, narrow white gills notched
(emarginate) just before the stem; short, stout, compact white stems with
no ring and no volva, soiled at the base."""

# Cap profiles (r, z) in metres for a specimen of scale 1, with the index of
# the inrolled margin tip. The thick margin rolls under and inwards; the gill
# surface then rises to the stem apex, so the hymenium is a concave bowl as a
# convex cap requires.
MATURE_CAP = [
    (0.000, 0.0745), (0.015, 0.0736), (0.028, 0.0705), (0.038, 0.0652),
    (0.0445, 0.0580), (0.0476, 0.0505), (0.0480, 0.0445), (0.0468, 0.0400),
    (0.0442, 0.0376), (0.0412, 0.0378),
    (0.0392, 0.0394),  # inrolled margin tip (index 10)
    (0.0340, 0.0425), (0.0275, 0.0460), (0.0210, 0.0484), (0.0165, 0.0495), (0.0120, 0.0500),
]
MATURE_TIP = 10
MATURE_STEM = [
    (0.0205, 0.0545), (0.0178, 0.0495), (0.0160, 0.0450), (0.0154, 0.0380),
    (0.0157, 0.0280), (0.0168, 0.0170), (0.0180, 0.0080), (0.0172, 0.0025),
    (0.0125, -0.0015), (0.0050, -0.0030), (0.0008, -0.0032),
]

YOUNG_CAP = [
    (0.000, 0.0625), (0.012, 0.0617), (0.022, 0.0585), (0.0300, 0.0520),
    (0.0348, 0.0438), (0.0362, 0.0365), (0.0356, 0.0318), (0.0336, 0.0290),
    (0.0306, 0.0282),
    (0.0282, 0.0296),  # inrolled margin tip (index 9)
    (0.0240, 0.0335), (0.0190, 0.0366), (0.0150, 0.0383), (0.0105, 0.0392),
]
YOUNG_TIP = 9
YOUNG_STEM = [
    (0.0170, 0.0430), (0.0142, 0.0388), (0.0128, 0.0350), (0.0125, 0.0280),
    (0.0131, 0.0190), (0.0142, 0.0100), (0.0146, 0.0050), (0.0136, 0.0012),
    (0.0095, -0.0015), (0.0035, -0.0025), (0.0006, -0.0027),
]


def wrap(a):
    return (a + math.pi) % (2 * math.pi) - math.pi


def specimen(tag, cap_profile, tip, stem_profile, scale, seed, lobe_amp, gill_count, gill_depth,
             bosses=(), split=None, press=None):
    """bosses: (x, y, radius, height) bumps (negative height = dent) in unit-scale
    metres; split: (angle, width) of a radial crack at the margin; press:
    (angle, amount) where a neighbour has pushed the cap out of shape."""
    cap_profile = [(r * scale, z * scale) for r, z in cap_profile]
    stem_profile = [(r * scale, z * scale) for r, z in stem_profile]
    samples = 150
    um = arc_fraction(cap_profile, tip - 1)  # outer edge of the curl
    stem_top = stem_profile[1][1]
    ph = [noise.noise(seed + Vector((k * 1.3, 0.2, 0.7))) * 3 for k in range(6)]

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z)) / scale
        q = p * 15 + seed
        edge = smooth(0.12, um, v) * smooth(0.012 * scale, 0.028 * scale, r)
        w = noise.noise(q) * 0.1 + noise.noise(q * 2.4) * 0.035 + noise.noise(q * 5.3) * 0.009
        dirn = Vector((math.cos(th), math.sin(th), 0))
        lobes = lobe_amp * (math.sin(2 * th + ph[0]) * 0.8 + math.sin(3 * th + ph[1]) * 0.7
                            + math.sin(4 * th + ph[4]) * 0.45 + math.sin(7 * th + ph[5]) * 0.25
                            + math.sin(5 * th + ph[2]) * 0.35 + 1.2 * noise.noise(dirn * 2.5 + seed))
        r2 = r * (1 + (w + lobes * 0.85) * edge)
        # The thick margin rises and falls with the lobes, like the wavy rims in the photos.
        z2 = z + (w * 0.016 + lobes * 0.034) * edge * scale - 0.003 * scale * edge * (0.5 + 0.5 * math.cos(th - ph[3]))
        upper = 1 - smooth(um - 0.08, um, v)
        # Lumpy, knobbly upper surface: broad bosses and hollows plus fine unevenness.
        z2 += (noise.noise(p * 11 + seed * 0.7) * 0.0065 + noise.noise(p * 26 + seed) * 0.0035
               + noise.noise(p * 70 + seed) * 0.0008) * upper * scale * smooth(0.0, 0.25, v)
        for cx, cy, rad, h in bosses:
            ex, ey = p.x - cx, p.y - cy
            z2 += h * scale * math.exp(-(ex * ex + ey * ey) / rad ** 2) * upper
        if press:
            d = wrap(th - press[0])
            f = math.exp(-(d / 0.75) ** 2) * smooth(0.25, um, v)
            r2 *= 1 - press[1] * f
            z2 += press[1] * 0.12 * scale * f
        if split:
            d = abs(wrap(th - split[0]))
            f = max(0.0, 1 - d / split[1]) ** 1.6 * smooth(um * 0.5, um * 0.95, v)
            r2 *= 1 - 0.24 * f
            z2 += 0.004 * scale * f
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

    j_start = int(round(arc_fraction(cap_profile, tip) * (samples - 1))) + 2
    # A tiny free gap rounds each gill off just before the stem: the notched
    # (emarginate) attachment of the morphology.
    gill = gills(f"gills{tag}", cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius,
                 gill_count, gill_depth * scale, seed, decurrent=0, free_gap=0.0004 * scale, stains=False,
                 margin_taper=0.85, edge_occlusion=0.94)

    cap_material(cap, arc_fraction(cap_profile, tip), seed)
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
    top = g.ramp(big, [(0.3, "#e0d1b2"), (0.55, "#eae0ca"), (0.78, "#f1eadb")])
    centre = g.remap(g.v, 0.0, um * 0.55, 1.0, 0.0)
    top = g.mix(g.math("MULTIPLY", centre, 0.65), top, "#d0bd98")
    warm = g.remap(g.noise(4, 2, 0.5, distortion=0.4), 0.48, 0.66, 0.0, 0.5)
    top = g.mix(warm, top, "#d8c5a0")
    blot = g.remap(g.noise(9, 3, 0.6, distortion=0.6), 0.48, 0.64, 0.0, 0.75)
    top = g.mix(blot, top, "#d4c3a2")
    top = g.mix(0.25, top, g.noise(240, 3), "OVERLAY")
    silk = g.noise(60, 2, 0.5, vec=g.vec_scale(g.obj, 6, 6, 1))
    top = g.mix(0.08, top, silk, "OVERLAY")
    top = g.mix(g.remap(g.v, um - 0.07, um - 0.02, 0.0, 0.5), top, "#efe6d2")
    under = g.remap(g.v, um + 0.004, um + 0.02)
    colour = g.mix(under, top, "#f0e5cc")
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
    # The big cap is split at the front margin and flattened where the young
    # cap presses against it; the young cap is pushed out of round in turn.
    a = specimen("", MATURE_CAP, MATURE_TIP, MATURE_STEM, 1.0, Vector((4.1, 2.7, 9.3)), 0.1, 180, 0.0045,
                 bosses=((0.012, -0.016, 0.011, 0.0035), (-0.018, 0.012, 0.009, 0.003), (0.024, 0.018, 0.008, -0.003),
                         (-0.006, -0.03, 0.007, -0.0025), (0.0, 0.004, 0.006, -0.002)),
                 split=(-1.65, 0.09), press=(-0.59, 0.06))
    b = specimen("-b", YOUNG_CAP, YOUNG_TIP, YOUNG_STEM, 0.9, Vector((8.2, 5.5, 1.6)), 0.075, 140, 0.0042,
                 bosses=((0.008, 0.01, 0.009, 0.003), (-0.012, -0.008, 0.007, -0.0025)),
                 press=(1.85, 0.14))
    c = specimen("-c", YOUNG_CAP, YOUNG_TIP, YOUNG_STEM, 0.62, Vector((1.4, 9.9, 6.2)), 0.08, 96, 0.004,
                 bosses=((0.006, -0.006, 0.008, 0.003),))
    place(a, 0.004, 0.018, 0, -3, 2)
    place(b, 0.062, -0.022, 40, 6, 14)
    place(c, -0.046, -0.034, -70, 9, -12)
    views = {"hero": (-30, 24, 0.6, 0.035), "low": (20, 4, 0.6, 0.035), "under": (20, -45, 0.46, 0.04)}
    return a + b + c, views
