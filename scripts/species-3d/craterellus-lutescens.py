"""Craterellus lutescens (camagroc): a small tuft of thin-fleshed trumpets.

Morphology (data/species.ts): small funnel-shaped grey-brown wavy cap,
underside smooth or with very discreet folds (greyish), hollow bright yellow
slender stem. Key features: hollow yellow stem, almost smooth hymenium,
funnel-shaped cap.

Each specimen is one continuous thin sheet revolved from a mid-line: the
profile starts at the bottom of the hollow stem, climbs its inner wall, runs
out over the cap top, turns round the margin, comes back along the
hymenium and down the outside of the stem to the base. The funnel opens
straight into the hollow stem and there are no joints to seam.
"""


def _sheet_profile(mid, thick, hole_bottom_k):
    """Offset a mid-line (base -> margin) both ways into a closed profile.

    mid: (r, z) points from the stem base up to the margin tip.
    thick(k): sheet thickness at mid point k.
    hole_bottom_k: index of the mid point where the hollow ends.
    Returns (profile, index of the margin tip in it).
    """
    pts = [Vector((r, z)) for r, z in mid]
    n = len(pts)
    normals = []
    for k in range(n):
        a, b = pts[max(k - 1, 0)], pts[min(k + 1, n - 1)]
        t = (b - a).normalized()
        normals.append(Vector((t.y, -t.x)))  # right of travel (up the stem) = outwards
    outer = [pts[k] + normals[k] * thick(k) * 0.5 for k in range(n)]
    inner = [pts[k] - normals[k] * thick(k) * 0.5 for k in range(n)]
    tip_t = (pts[-1] - pts[-2]).normalized()
    tip = pts[-1] + tip_t * thick(n - 1) * 0.45
    hb = inner[hole_bottom_k]
    # The lumen ends in a rounded blind bottom.
    profile = [(0.0, hb.y - hb.x * 0.9), (hb.x * 0.7, hb.y - hb.x * 0.55)]
    profile += [(p.x, p.y) for p in inner[hole_bottom_k:]]
    k_tip = len(profile)
    profile.append((tip.x, tip.y))
    profile += [(p.x, p.y) for p in reversed(outer)]
    # Rounded base (grows out of the litter, not sawn off).
    base = outer[0]
    profile += [(base.x * 0.86, base.y - base.x * 0.35), (base.x * 0.55, base.y - base.x * 0.7),
                (base.x * 0.2, base.y - base.x * 0.85), (0.0, base.y - base.x * 0.88)]
    return profile, k_tip


def _specimen(name, H, R, seed, tex, flare, curl, spread, lean_deg):
    """One trumpet of total height ~H and cap radius ~R (metres).

    flare: how steeply the cap opens (depth of the trumpet, in R);
    curl: how far the margin turns outwards and down (in R);
    spread: direction (radians, object space) the stem grows out of the tuft;
    lean_deg: its angle from vertical at the base (it curves back up).
    """
    zf = H - R * (flare + 0.05)  # where the stem widens into the trumpet
    rso = max(0.0023, R * 0.15)  # outer stem radius
    rs = rso / 1.5  # stem mid-line radius (wall = rs, lumen radius ~ rs / 2)
    mid = [
        (rs * 0.9, 0.0), (rs * 0.98, zf * 0.12), (rs * 1.0, zf * 0.45), (rs * 1.08, zf * 0.72),
        (rs * 1.4, zf * 0.93), (R * 0.26, zf + R * flare * 0.28), (R * 0.45, zf + R * flare * 0.62),
        (R * 0.66, zf + R * flare * 0.88), (R * 0.84, zf + R * flare * 1.0),
        (R * 0.98, zf + R * (flare * 0.98 - curl * 0.35)), (R * 1.06, zf + R * (flare * 0.9 - curl)),
    ]
    mid = [(p.x, p.y) for p in catmull(mid, 80)]
    n = len(mid)

    def thick(k):
        z = mid[k][1]
        r = mid[k][0]
        stem_t = rs
        cap_t = 0.0013 - 0.0009 * smooth(R * 0.4, R, r)  # paper-thin at the margin
        return stem_t + (cap_t - stem_t) * smooth(zf - H * 0.06, zf + R * 0.2, z)

    # The lumen is open ~1.5 cm down the stem (deeper would only be dark).
    hole_k = min((k for k in range(n) if mid[k][1] < zf), key=lambda k: abs(mid[k][1] - (zf - min(0.014, H * 0.15))))
    profile, k_tip = _sheet_profile(mid, thick, hole_k)
    kf = min((k for k in range(n) if mid[k][0] < R * 0.45), key=lambda k: abs(mid[k][1] - (zf + R * 0.12)))
    kb = min(range(n), key=lambda k: abs(mid[k][1] - H * 0.12))
    k3 = min(range(n), key=lambda k: abs(mid[k][1] - zf * 0.66))
    seg = [(Vector(profile[i + 1]) - Vector(profile[i])).length for i in range(len(profile) - 1)]
    fr = {
        "tip": arc_fraction(profile, k_tip),
        "rim": arc_fraction(profile, 2 + kf - hole_k),  # funnel mouth, inside
        "stem": arc_fraction(profile, k_tip + 1 + (n - 1 - kf)),  # hymenium meets stem
        "third": arc_fraction(profile, k_tip + 1 + (n - 1 - k3)),  # upper third of the stem
        "base": arc_fraction(profile, k_tip + 1 + (n - 1 - kb)),
        "len": sum(seg),
    }

    rng = [noise.noise(seed + Vector((k * 1.37, 0.4, 0.9))) for k in range(18)]
    notches = [(rng[k] * math.pi * 2 + k * 2.1, 0.12 + 0.1 * abs(rng[k + 4])) for k in range(3)]
    tl = math.tan(math.radians(lean_deg))
    sdir = Vector((math.cos(spread), math.sin(spread)))
    side = Vector((-sdir.y, sdir.x)) * (0.08 * rng[14])  # slight sideways bow
    tilt_dir = spread + 0.6 * rng[9]
    tilt = math.radians(8 + 5 * rng[10])
    squash_th = rng[12] * 3
    twist = 0.9 + 0.6 * rng[15]
    g1, g2 = 0.22 + 0.05 * rng[16], 0.12 + 0.05 * abs(rng[17])

    def shape(th, v, r, z):
        c, s = math.cos(th), math.sin(th)
        dirn = Vector((c, s, 0))
        # Lobed, wavy, locally torn margin; top and underside move together.
        edge = smooth(R * 0.3, R * 1.0, r)
        lobes = (0.1 * math.sin(3 * th + rng[0] * 4) + 0.06 * math.sin(5 * th + rng[1] * 4)
                 + 0.03 * math.sin(9 * th + rng[2] * 4) + 0.08 * noise.noise(dirn * 2.5 + seed)
                 + 0.025 * noise.noise(dirn * 9 + seed))
        for tn, wn in notches:
            d = math.atan2(math.sin(th - tn), math.cos(th - tn))
            lobes -= wn * math.exp(-(d / 0.04) ** 2) * smooth(0.6, 1.0, r / R)
        # In some sectors the margin rolls outwards and down, in others it stands up.
        roll = 0.5 + 0.5 * math.sin(2 * th + rng[13] * 5) + 0.5 * noise.noise(dirn * 1.8 + seed * 0.7)
        roll = max(0.0, min(1.2, roll))
        e3 = smooth(R * 0.7, R * 1.05, r)
        r2 = r * (1 + lobes * edge + 0.1 * roll * e3)
        wave = (0.13 * math.sin(4 * th + rng[3] * 5) + 0.08 * math.sin(7 * th + rng[5] * 5)
                + 0.07 * noise.noise(dirn * 3 + seed * 1.3))
        crisp = 0.04 * math.sin(15 * th + 3 * noise.noise(dirn * 4 + seed)) + 0.035 * noise.noise(dirn * 16 + seed)
        z2 = z + R * wave * edge ** 1.5 + R * crisp * edge ** 4 - R * curl * 1.25 * roll * e3 ** 2
        # Lumpy, crinkled cap surface.
        capw = smooth(zf, zf + R * 0.3, z)
        z2 += noise.noise(Vector((r * c, r * s, 0)) * 180 + seed) * 0.0007 * capw
        # Stem: laterally compressed, twisted, with one or two shallow
        # longitudinal grooves on the flat faces, uneven along its length.
        stemw = 1 - smooth(zf - H * 0.1, zf + R * 0.05, z)
        zs = max(z, 0.0) / zf
        sq = squash_th + twist * zs
        along = smooth(0.0, 0.2, zs) * (1 - smooth(0.75, 1.0, zs))
        for gth, gd_ in ((sq + math.pi / 2 + 0.25 * rng[6], g1), (sq - math.pi / 2 + 0.3 * rng[7], g2)):
            gd = math.atan2(math.sin(th - gth), math.cos(th - gth))
            r2 *= 1 - gd_ * math.exp(-(gd / 0.3) ** 2) * stemw * along
        r2 *= 1 + (0.07 * noise.noise(Vector((0.0, 0.0, z * 40)) + seed) + 0.03 * noise.noise(Vector((c, s, z * 60)) + seed)) * stemw
        # A soft, slightly swollen foot, so touching stems fuse into one tuft.
        r2 *= 1 + 0.5 * (1 - smooth(-0.002, 0.008, z))
        u = c * math.cos(sq) + s * math.sin(sq)
        w = -c * math.sin(sq) + s * math.cos(sq)
        u *= 1 + 0.2 * stemw
        w *= 1 - 0.17 * stemw
        x = r2 * (u * math.cos(sq) - w * math.sin(sq))
        y = r2 * (u * math.sin(sq) + w * math.cos(sq))
        # Cap tilted outwards on the stem.
        tw = smooth(zf - H * 0.15, zf, z)
        x2 = x * math.cos(tilt_dir) + y * math.sin(tilt_dir)
        z2 += x2 * math.tan(tilt) * tw
        # Stem grows out of the tuft at an angle and curves back up.
        zc = min(max(z, 0.0), zf)
        out = tl * (zc - 0.45 * zc * zc / zf)
        bow = math.sin(math.pi * zc / zf) * zf
        x += sdir.x * out + side.x * bow
        y += sdir.y * out + side.y * bow
        return (x, y, z2)

    obj = revolve(name, profile, 200, 520, shape, True, True)
    obj["tex"] = tex
    return obj, fr


def _streaks(g, vec, across, along, detail=5, distortion=0.8):
    """Noise stretched radially: fine across the cap's circumference, long
    along its radius. Built from the horizontal direction (not an angle), so
    it never seams."""
    xy = g.vec_scale(vec, 1, 1, 0)
    nrm = g.nt.nodes.new("ShaderNodeVectorMath")
    nrm.operation = "NORMALIZE"
    g.link(xy, nrm.inputs[0])
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
    return g.noise(1.0, detail, 0.62, vec=add.outputs[0], distortion=distortion)


def _ridges(g, vec, across, along, width):
    """Thin, forking radial lines: the contour of radially stretched noise."""
    n = _streaks(g, vec, across, along, 3, 0.7)
    d = g.math("ABSOLUTE", g.math("SUBTRACT", n, 0.5))
    return g.remap(d, 0.0, width, 1.0, 0.0)


def _material(obj, fr, seed_off, palette):
    v_tip, v_rim, v_stem, v_third, v_base, L = fr["tip"], fr["rim"], fr["stem"], fr["third"], fr["base"], fr["len"]
    m = bpy.data.materials.new(obj.name + "-proc")
    g = Graph(m)
    off = g.nt.nodes.new("ShaderNodeVectorMath")
    off.operation = "ADD"
    off.inputs[1].default_value = (seed_off, seed_off * 0.7, seed_off * 1.3)
    g.link(g.obj, off.inputs[0])
    vec = off.outputs[0]
    fib_c, ground, light, grey_c, edge_c = palette

    # Cap top: ochre-brown ground densely covered by dark radial fibrils and
    # small squamules, darker towards the centre; crinkled; thin pale rim.
    big = g.noise(35, 4, 0.6, vec=vec, distortion=0.5)
    top = g.ramp(big, [(0.3, ground), (0.72, light)])
    top = g.mix(g.remap(g.noise(12, 3, vec=vec, distortion=0.4), 0.5, 0.7, 0.0, 0.4), top, grey_c)
    st2 = _streaks(g, vec, 220.0, 480.0, 3, 1.2)
    centre_w = g.remap(g.v, v_rim, v_tip, 1.0, 0.65)
    fib = g.math("MAXIMUM", _ridges(g, vec, 40.0, 25.0, 0.06),
                 g.math("MULTIPLY", _ridges(g, vec, 85.0, 50.0, 0.05), 0.8))
    # Soft, broken fibrils (never continuous grain) over an irregular mottle.
    fib = g.math("MULTIPLY", fib, g.remap(g.noise(30, 4, vec=vec, distortion=0.8), 0.4, 0.62, 0.0, 0.55))
    mott = g.remap(g.noise(22, 5, 0.65, vec=vec, distortion=1.0), 0.35, 0.7)
    top = g.mix(g.math("MULTIPLY", g.math("SUBTRACT", 1.0, mott), 0.45), top, fib_c)
    top = g.mix(g.math("MULTIPLY", mott, 0.3), top, light)
    top = g.mix(g.math("MULTIPLY", fib, centre_w), top, fib_c)
    scales = g.remap(g.voronoi(700, "F1", vec=vec), 0.0, 0.22, 1.0, 0.0)
    near_c = g.remap(g.v, v_rim, v_rim + (v_tip - v_rim) * 0.6, 0.8, 0.0)
    top = g.mix(g.math("MULTIPLY", scales, near_c), top, fib_c)
    top = g.mix(g.math("MULTIPLY", g.remap(st2, 0.15, 0.35, 0.12, 0.0), g.math("SUBTRACT", 1.0, centre_w)), top, light)
    funnel = g.remap(g.v, v_rim - 0.02, v_rim + 0.04, 1.0, 0.0)
    top = g.mix(g.math("MULTIPLY", funnel, 0.75), top, "#2e1d0c")
    dv = 0.0011 / L  # ~1 mm pale rim
    top = g.mix(g.remap(g.v, v_tip - dv * 1.4, v_tip - dv * 0.2, 0.0, 0.7), top, edge_c)
    top = g.mix(0.2, top, g.noise(300, 3, vec=vec), "OVERLAY")

    # Hymenium: pale greyish cream to faintly pinkish, with very low forking
    # veins, warming into the stem yellow over the stem's upper third.
    veins = g.math("MULTIPLY", _ridges(g, vec, 26.0, 70.0, 0.1), g.remap(g.noise(20, 2, vec=vec), 0.3, 0.6, 0.35, 1.0))
    hf = g.remap(g.v, v_tip, v_third, 0.0, 1.0)
    hym = g.ramp(hf, [(0.0, "#cbb89c"), (0.3, "#d6b8a0"), (0.55, "#e0c28c"), (0.75, "#edbf5e"), (1.0, "#eeb126")])
    hym = g.mix(g.remap(g.noise(22, 3, vec=vec), 0.4, 0.65, 0.0, 0.35), hym, "#dcbfae")
    vein_w = g.math("MULTIPLY", veins, g.remap(g.v, v_stem - 0.01, v_stem + (v_third - v_stem) * 0.4, 1.0, 0.0))
    hym = g.mix(g.math("MULTIPLY", vein_w, 0.5), hym, "#9e8468")

    # Stem: golden egg-yolk yellow, fine longitudinal fibres, paler whitish
    # base with a faint soil tint on the rounded foot.
    fibres = g.noise(120, 3, 0.5, vec=g.vec_scale(vec, 1, 1, 0.08))
    stem = g.ramp(g.noise(25, 3, vec=vec), [(0.35, "#e9a31a"), (0.65, "#f3b822")])
    stem = g.mix(0.45, stem, fibres, "OVERLAY")
    stem = g.mix(g.remap(g.v, v_base - 0.02, 1.0, 0.0, 0.75), stem, "#efdca8")
    soil = g.math("MULTIPLY", g.remap(g.v, v_base + (1 - v_base) * 0.5, 1.0), g.remap(g.noise(60, 5, 0.65, vec=vec), 0.35, 0.55, 0.0, 0.5))
    stem = g.mix(soil, stem, "#8f7656")

    # Inside of the hollow: cap colour darkening to near black down the tube.
    hole = g.mix(g.remap(g.v, v_rim * 0.55, v_rim, 1.0, 0.3), top, "#0e0804")

    under = g.remap(g.v, v_tip - 0.0005, v_tip + 0.002)
    to_stem = g.remap(g.v, v_stem - 0.005, v_third)
    colour = g.mix(under, g.mix(g.remap(g.v, v_rim - 0.01, v_rim + 0.01), hole, top), hym)
    colour = g.mix(g.math("MULTIPLY", g.remap(g.v, v_third, v_third + 0.03), under), colour, stem)

    rough = g.lerp(under, g.remap(g.noise(25, 2, vec=vec), 0.3, 0.7, 0.62, 0.78), 0.78)
    topness = g.math("SUBTRACT", 1.0, under)
    height = g.math("MULTIPLY", g.math("MULTIPLY", vein_w, 2.2), under)
    height = g.math("ADD", height, g.math("MULTIPLY", g.noise(220, 3, vec=vec), 0.2))
    height = g.math("ADD", height, g.math("MULTIPLY", fibres, g.math("MULTIPLY", to_stem, 0.4)))
    height = g.math("ADD", height, g.math("MULTIPLY", g.math("ADD", g.math("MULTIPLY", st2, 0.4), g.math("MULTIPLY", scales, 0.3)), topness))
    g.finish(colour, rough, height, 0.4, 0.0003)
    obj.data.materials.append(m)
    m.use_backface_culling = True


PALETTES = {
    # fibrils, ground, light ground, grey patches, pale rim
    "brown": ("#2c1a0a", "#74552f", "#86663b", "#6d604c", "#d6bd86"),
    "ochre": ("#301d0b", "#7c5b30", "#8f6c3c", "#7a6448", "#dcc28a"),
    "grey": ("#2a1e11", "#6e5c45", "#806c51", "#6c645a", "#cdb888"),
}


def build():
    specs = [
        # name, height, cap radius, seed, texture, flare, curl, palette, base xy, z-rotation, spread dir (deg), lean (deg)
        ("big", 0.078, 0.021, Vector((1.3, 4.2, 7.1)), 2048, 0.6, 0.15, "brown", (0.003, 0.004), 3.4, 55, 8),
        ("mid", 0.062, 0.016, Vector((6.2, 0.7, 2.9)), 1024, 0.45, 0.3, "ochre", (-0.005, -0.001), 2.3, 190, 26),
        ("small", 0.046, 0.011, Vector((3.8, 8.1, 5.5)), 1024, 0.5, 0.3, "grey", (0.008, -0.004), 4.4, 315, 30),
        ("young", 0.028, 0.0075, Vector((9.1, 2.6, 4.4)), 512, 0.35, 0.4, "brown", (-0.001, -0.007), 1.1, 250, 26),
    ]
    objs = []
    for i, (nm, H, R, seed, tex, flare, curl, pal, xy, rot, psi, lean) in enumerate(specs):
        o, fr = _specimen(nm, H, R, seed, tex, flare, curl, math.radians(psi) - rot, lean)
        _material(o, fr, i * 3.7, PALETTES[pal])
        o.location = (xy[0] * 0.55, xy[1] * 0.55, -0.001)
        o.rotation_euler = (0.0, 0.0, rot)
        objs.append(o)
    views = {"hero": (-30, 30, 0.46, 0.04), "low": (25, 3, 0.44, 0.04), "under": (15, -22, 0.36, 0.045)}
    return objs, views
