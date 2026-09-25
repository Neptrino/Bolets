"""Calocybe gambosa (moixernó): a small spring tuft of robust, fleshy, matte
cream-white mushrooms at three stages: a closed hemispherical button, a
convex mid-stage cap and a mature, irregularly flattened cap with a wavy,
lobed margin. Every margin is thinly inrolled; very crowded, fine white gills
run out to it and are notched (emarginate) just before the stem; the stems
are cylindrical and compact, cream down to a crust of soil, with no ring and
no volva."""

# Cap profiles (r, z) in metres, with the index of the inrolled margin tip.
# The thin margin curls just under; the gill surface then rises to the stem
# apex, so the hymenium is a concave bowl as a convex cap requires.
MATURE_CAP = [  # 9.4 cm, convex-flattened: height ~1/3 of the diameter
    (0.000, 0.0915), (0.015, 0.0905), (0.027, 0.0873), (0.036, 0.0822),
    (0.042, 0.0760), (0.0458, 0.0692), (0.0472, 0.0638), (0.0467, 0.0606),
    (0.0451, 0.0596),  # inrolled margin tip (index 8)
    (0.0400, 0.0614), (0.0320, 0.0648), (0.0240, 0.0677), (0.0170, 0.0697), (0.0125, 0.0704), (0.0090, 0.0706),
]
MATURE_STEM = [  # ~2.6 cm thick, very slightly thicker at the base
    (0.0165, 0.0745), (0.0145, 0.0702), (0.0132, 0.0662), (0.0128, 0.0560),
    (0.0130, 0.0420), (0.0136, 0.0280), (0.0143, 0.0150), (0.0145, 0.0070),
    (0.0136, 0.0022), (0.0114, -0.0012), (0.0080, -0.0032), (0.0040, -0.0041), (0.0006, -0.0043),
]
# Lower the mature fruit body so its stem is ~0.65x the cap diameter.
MATURE_CAP = [(r, z - 0.010) for r, z in MATURE_CAP]
MATURE_STEM = [(r, z * 0.866 if z > 0 else z) for r, z in MATURE_STEM]

MID_CAP = [  # 7.3 cm, convex with the margin still inrolled
    (0.000, 0.0740), (0.012, 0.0732), (0.022, 0.0705), (0.030, 0.0655),
    (0.0345, 0.0596), (0.0364, 0.0537), (0.0363, 0.0494), (0.0350, 0.0468),
    (0.0328, 0.0460),  # inrolled margin tip (index 8)
    (0.0285, 0.0478), (0.0225, 0.0504), (0.0165, 0.0524), (0.0118, 0.0533), (0.0082, 0.0536),
]
MID_STEM = [
    (0.0130, 0.0565), (0.0112, 0.0530), (0.0103, 0.0500), (0.0100, 0.0420),
    (0.0102, 0.0300), (0.0107, 0.0180), (0.0112, 0.0085), (0.0108, 0.0035),
    (0.0092, 0.0000), (0.0066, -0.0024), (0.0032, -0.0035), (0.0005, -0.0037),
]

BUTTON_CAP = [  # 5.4 cm, closed and hemispherical, margin curled well under
    (0.000, 0.0520), (0.010, 0.0513), (0.018, 0.0488), (0.0235, 0.0445),
    (0.0262, 0.0395), (0.0269, 0.0345), (0.0260, 0.0306), (0.0240, 0.0286),
    (0.0216, 0.0285),  # inrolled margin tip (index 8)
    (0.0185, 0.0299), (0.0145, 0.0316), (0.0110, 0.0327), (0.0080, 0.0332),
]
BUTTON_STEM = [
    (0.0098, 0.0350), (0.0084, 0.0322), (0.0078, 0.0296), (0.0077, 0.0240),
    (0.0081, 0.0160), (0.0087, 0.0085), (0.0086, 0.0040), (0.0074, 0.0006),
    (0.0052, -0.0018), (0.0024, -0.0029), (0.0004, -0.0031),
]
TIP = 8


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


def wrap(a):
    return (a + math.pi) % (2 * math.pi) - math.pi


def specimen(tag, cap_profile, stem_profile, seed, lobe_amp, wave, gill_count, gill_depth,
             bosses=(), split=None, press=None):
    """bosses: (x, y, radius, height) bumps (negative height = dent) in metres;
    split: (angle, width) of a small shallow crack at the margin; press:
    (angle, amount) where a neighbour has pushed the cap out of shape."""
    samples = 150
    um = arc_fraction(cap_profile, TIP - 1)  # outer edge of the curl
    radius = cap_profile[TIP - 3][0]
    stem_top = stem_profile[1][1]
    ph = [noise.noise(seed + Vector((k * 1.3, 0.2, 0.7))) * 3 for k in range(6)]

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * 15 + seed
        edge = smooth(0.15, um, v) * smooth(0.25 * radius, 0.6 * radius, r)
        w = noise.noise(q) * 0.07 + noise.noise(q * 2.4) * 0.025 + noise.noise(q * 5.3) * 0.006
        dirn = Vector((math.cos(th), math.sin(th), 0))
        lobes = lobe_amp * (math.sin(2 * th + ph[0]) * 0.8 + math.sin(3 * th + ph[1]) * 0.7
                            + math.sin(4 * th + ph[4]) * 0.35 + 1.1 * noise.noise(dirn * 2.2 + seed))
        r2 = r * (1 + (w + lobes * 0.8) * edge)
        # The margin undulates up and down in a few broad waves.
        z2 = z + (w * 0.4 * radius + wave * (math.sin(3 * th + ph[2]) * 0.6 + noise.noise(dirn * 3 + seed * 1.7))) * edge
        upper = 1 - smooth(um - 0.1, um - 0.02, v)
        # Low, lumpy bosses and hollows over the top, plus fine unevenness.
        z2 += (noise.noise(p * 13 + seed * 0.7) * 0.0068 + noise.noise(p * 30 + seed) * 0.0032
               + noise.noise(p * 80 + seed) * 0.0004) * upper * smooth(0.0, 0.3, v)
        for cx, cy, rad, h in bosses:
            ex, ey = p.x - cx, p.y - cy
            z2 += h * math.exp(-(ex * ex + ey * ey) / rad ** 2) * upper
        if press:
            d = wrap(th - press[0])
            f = math.exp(-(d / 0.7) ** 2) * smooth(0.3, um, v)
            r2 *= 1 - press[1] * f
            z2 += press[1] * 0.1 * radius * f
        if split:
            # Only the outer part of the flesh opens, leaving the gill field whole.
            d = abs(wrap(th - split[0]))
            f = max(0.0, 1 - d / split[1]) ** 2 * smooth(um * 0.72, um * 0.97, v)
            r2 *= 1 - 0.07 * f
            z2 += 0.0015 * f
        return (r2 * math.cos(th) + 0.0015, r2 * math.sin(th), z2)

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 22)) + seed
        # Irregular below; smooth where the flare sinks into the cap flesh.
        r *= 1 + (noise.noise(p) * 0.04 + noise.noise(p * 3) * 0.012) * (1 - smooth(stem_top - 0.008, stem_top, z))
        # A few soil granules cling to the rounded foot.
        crust = 1 - smooth(-0.001, 0.004, z)
        g = noise.noise(Vector((math.cos(th), math.sin(th), z * 40)) * 3 + seed * 3)
        r += crust * max(0.0, g) * 0.0004
        k = (1 - min(z, stem_top) / stem_top) ** 2
        return (r * math.cos(th) - 0.003 * k, r * math.sin(th) + 0.0015 * k, z)

    cap = revolve(f"cap{tag}", cap_profile, 256, samples, cap_shape, True, False)
    stem = revolve(f"stem{tag}", stem_profile, 160, 100, stem_shape, True, True)
    sp = catmull(stem_profile, 300)

    def stem_radius(z):
        return min(sp, key=lambda pt: abs(pt.y - z)).x

    j_start = int(round(arc_fraction(cap_profile, TIP) * (samples - 1))) + 2
    # A tiny free gap rounds each gill off just before the stem: the notched
    # (emarginate) attachment of the morphology. The blades taper in over the
    # outer 40 % and keep their free edge above the inrolled margin, so no
    # comb shows below it; no fake occlusion, so the fine crowded gills read
    # white rather than grey.
    gill = gills(f"gills{tag}", cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius,
                 gill_count, gill_depth, seed, decurrent=0, free_gap=0.0004, stains=False,
                 margin_taper=0.6, edge_occlusion=1.0)
    v_tip, tip = arc_fraction(cap_profile, TIP), cap_profile[TIP]
    _clamp_gill_edge(gill, lambda th: cap_shape(th, v_tip, tip[0], tip[1])[2], lift=0.0003, r_min=0.5 * radius)

    cap_material(cap, arc_fraction(cap_profile, TIP), lobe_amp > 0.05)
    gill_material(gill)
    stem_material(stem)
    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    return [cap, stem, gill]


def cap_material(cap, um, mature):
    # Matte, dry cream-white with a felty micro-surface, a faintly warmer
    # ivory-ochre centre on the mature cap, and a few sparse blemishes.
    m = bpy.data.materials.new(f"{cap.name}-proc")
    g = Graph(m)
    big = g.noise(14, 4, 0.55, distortion=0.3)
    top = g.ramp(big, [(0.3, "#e6dcc4"), (0.55, "#eee6d4"), (0.78, "#f3eee2")])
    centre = g.remap(g.v, 0.0, um * 0.5, 1.0, 0.0)
    top = g.mix(g.math("MULTIPLY", centre, 0.55 if mature else 0.3), top, "#dac9a4")
    blot = g.remap(g.noise(7, 3, 0.6, distortion=0.6), 0.52, 0.68, 0.0, 0.35)
    top = g.mix(blot, top, "#ddd0b2")
    felt = g.noise(700, 3, 0.6)
    top = g.mix(0.12, top, felt, "OVERLAY")
    spots = g.math("MULTIPLY", g.remap(g.voronoi(90, rand=1.0), 0.0, 0.05, 1.0, 0.0), g.remap(g.noise(6, 2), 0.6, 0.66))
    top = g.mix(g.math("MULTIPLY", spots, 0.45), top, "#b49a72")
    top = g.mix(g.remap(g.v, um - 0.05, um - 0.01, 0.0, 0.4), top, "#f4efe3")
    under = g.remap(g.v, um + 0.002, um + 0.012)
    colour = g.mix(under, top, "#f5efe1")
    roughness = g.remap(g.noise(30, 2), 0.3, 0.7, 0.72, 0.8)
    height = g.math("ADD", g.math("MULTIPLY", felt, 0.5), g.math("MULTIPLY", g.noise(160, 4), 0.3))
    g.finish(colour, roughness, height, 0.55, 0.0004)
    cap.data.materials.append(m)


def gill_material(gill):
    m = bpy.data.materials.new(f"{gill.name}-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#f9f5ec"), (0.5, "#fbf8f1"), (1.0, "#fcfaf4")])
    col = g.mix(g.remap(g.uvy, 0.6, 1.0, 0.0, 0.4), col, "#fcfaf4")
    g.finish(col, 0.78, g.noise(200, 2), 0.08, 0.0002)
    gill.data.materials.append(m)


def stem_material(stem):
    # Cream, finely fibrillose, down to a patchy crust of soil granules.
    m = bpy.data.materials.new(f"{stem.name}-proc")
    g = Graph(m)
    base = g.ramp(g.noise(45, 4), [(0.35, "#ebe3d1"), (0.65, "#f2ede1")])
    fibres = g.noise(220, 4, 0.6, vec=g.vec_scale(g.obj, 1, 1, 0.06))
    base = g.mix(0.3, base, fibres, "OVERLAY")
    base = g.mix(0.15, base, g.noise(380, 2), "OVERLAY")
    # Soil: only a faint, patchy tint on the rounded foot, a few specks above.
    sep = g.nt.nodes.new("ShaderNodeSeparateXYZ")
    g.link(g.obj, sep.inputs[0])
    wob = g.math("MULTIPLY", g.noise(9, 2), 0.004)
    band = g.remap(g.math("ADD", sep.outputs["Z"], wob), 0.006, -0.002)
    grains = g.remap(g.voronoi(260, rand=1.0), 0.0, 0.3, 1.0, 0.0)
    patch = g.remap(g.noise(40, 4, 0.6, distortion=0.6), 0.44, 0.56)
    soil = g.math("MULTIPLY", band, g.math("MAXIMUM", g.math("MULTIPLY", patch, 0.55), g.math("MULTIPLY", grains, 0.4)))
    specks = g.math("MULTIPLY", g.remap(g.voronoi(160), 0.0, 0.08, 1.0, 0.0), g.remap(g.noise(8, 2), 0.6, 0.64))
    soil = g.math("MAXIMUM", soil, g.math("MULTIPLY", specks, g.math("MULTIPLY", g.remap(sep.outputs["Z"], 0.02, 0.004), 0.6)))
    soil = g.math("MAXIMUM", soil, g.math("MULTIPLY", g.remap(g.v, 0.96, 1.0), 0.45))
    dirt = g.ramp(g.noise(90, 3), [(0.3, "#8c7657"), (0.55, "#a08b6c"), (0.8, "#b8a687")])
    colour = g.mix(soil, base, dirt)
    height = g.math("ADD", g.math("MULTIPLY", fibres, 0.4), g.math("MULTIPLY", soil, grains))
    g.finish(colour, g.lerp(soil, 0.74, 0.9), height, 0.5, 0.0006)
    stem.data.materials.append(m)


def place(objs, x, y, rz, tilt_x, tilt_y):
    for o in objs:
        o.location = (x, y, 0.0)
        o.rotation_euler = (math.radians(tilt_x), math.radians(tilt_y), math.radians(rz))


def build():
    # Mature cap: lobed, wavy margin and the only (small, shallow) crack.
    a = specimen("", MATURE_CAP, MATURE_STEM, Vector((4.1, 2.7, 9.3)), 0.08, 0.0032, 100, 0.0042,
                 bosses=((0.012, -0.014, 0.012, 0.004), (-0.017, 0.012, 0.010, 0.0035), (0.022, 0.018, 0.009, -0.003),
                         (-0.006, -0.028, 0.008, -0.0025), (0.0, 0.0, 0.007, -0.002)),
                 split=(-1.65, 0.06), press=(-0.63, 0.05))
    # Mid-stage cap, pushed out of round where it leans on the big one.
    b = specimen("-b", MID_CAP, MID_STEM, Vector((8.2, 5.5, 1.6)), 0.05, 0.002, 90, 0.0036,
                 bosses=((0.008, 0.01, 0.009, 0.003), (-0.012, -0.008, 0.007, -0.0025), (0.014, -0.012, 0.007, 0.002)),
                 press=(1.95, 0.07))
    # Closed button.
    c = specimen("-c", BUTTON_CAP, BUTTON_STEM, Vector((1.4, 9.9, 6.2)), 0.035, 0.001, 72, 0.0027,
                 bosses=((0.006, -0.006, 0.008, 0.0025), (-0.008, 0.007, 0.006, -0.0015)))
    place(a, 0.0, 0.016, 0, -3, 2)
    place(b, 0.066, -0.026, 40, 5, 12)
    place(c, -0.044, -0.036, -70, 6, -8)
    views = {"hero": (-30, 22, 0.62, 0.045), "low": (20, 4, 0.62, 0.045), "under": (20, -45, 0.5, 0.05)}
    return a + b + c, views
