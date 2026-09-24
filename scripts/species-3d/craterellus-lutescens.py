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
    Returns (profile, key fractions dict).
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
    profile = [(0.0, hb.y - 0.0012), (hb.x * 0.6, hb.y - 0.0008)]
    profile += [(p.x, p.y) for p in inner[hole_bottom_k:]]
    k_tip = len(profile)
    profile.append((tip.x, tip.y))
    profile += [(p.x, p.y) for p in reversed(outer)]
    base = outer[0]
    profile += [(base.x * 0.55, base.y - 0.0008), (0.0, base.y - 0.001)]
    return profile, k_tip


def _specimen(name, H, R, seed, tex, flare, curl):
    """One trumpet of total height ~H and cap radius ~R (metres).

    flare: how steeply the cap opens (depth of the trumpet, in R);
    curl: how far the margin turns outwards and down (in R).
    """
    zf = H - R * (flare + 0.05)  # where the stem widens into the trumpet
    rs = max(0.0021, R * 0.16)  # stem mid-line radius
    mid = [
        (rs * 1.0, 0.0), (rs * 0.95, zf * 0.15), (rs * 1.0, zf * 0.45), (rs * 1.1, zf * 0.72),
        (rs * 1.45, zf * 0.92), (R * 0.26, zf + R * flare * 0.28), (R * 0.45, zf + R * flare * 0.62),
        (R * 0.66, zf + R * flare * 0.88), (R * 0.84, zf + R * flare * 1.0),
        (R * 0.98, zf + R * (flare * 0.98 - curl * 0.35)), (R * 1.06, zf + R * (flare * 0.9 - curl)),
    ]
    mid = [(p.x, p.y) for p in catmull(mid, 70)]
    n = len(mid)

    def thick(k):
        z = mid[k][1]
        r = mid[k][0]
        stem_t = rs * 0.6
        cap_t = 0.0014 - 0.0008 * smooth(R * 0.4, R, r)
        return stem_t + (cap_t - stem_t) * smooth(zf - H * 0.05, zf + R * 0.2, z)

    hole_k = 24
    profile, k_tip = _sheet_profile(mid, thick, hole_k)
    kf = min((k for k in range(n) if mid[k][0] < R * 0.45), key=lambda k: abs(mid[k][1] - (zf + R * 0.12)))
    kb = min(range(n), key=lambda k: abs(mid[k][1] - H * 0.09))
    fr = {
        "tip": arc_fraction(profile, k_tip),
        "rim": arc_fraction(profile, 2 + kf - hole_k),  # funnel mouth, inside
        "stem": arc_fraction(profile, k_tip + 1 + (n - 1 - kf)),  # hymenium meets stem
        "base": arc_fraction(profile, k_tip + 1 + (n - 1 - kb)),
    }

    rng = [noise.noise(seed + Vector((k * 1.37, 0.4, 0.9))) for k in range(14)]
    notches = [(rng[k] * math.pi * 2 + k * 2.1, 0.14 + 0.1 * abs(rng[k + 4])) for k in range(3)]
    lean = Vector((math.cos(rng[8] * 6), math.sin(rng[8] * 6))) * H * 0.08
    tilt_dir = rng[9] * 6 + 1.0
    tilt = math.radians(7 + 5 * rng[10])
    groove_th = rng[11] * 6
    squash_th = rng[12] * 3

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
            lobes -= wn * math.exp(-(d / 0.045) ** 2) * smooth(0.55, 1.0, r / R)
        # In some sectors the margin rolls outwards and down, in others it stands up.
        roll = 0.5 + 0.5 * math.sin(2 * th + rng[13] * 5) + 0.5 * noise.noise(dirn * 1.8 + seed * 0.7)
        roll = max(0.0, min(1.2, roll))
        e3 = smooth(R * 0.7, R * 1.05, r)
        r2 = r * (1 + lobes * edge + 0.1 * roll * e3)
        wave = (0.13 * math.sin(4 * th + rng[3] * 5) + 0.08 * math.sin(7 * th + rng[5] * 5)
                + 0.07 * noise.noise(dirn * 3 + seed * 1.3))
        crisp = 0.035 * math.sin(13 * th + 3 * noise.noise(dirn * 4 + seed)) + 0.03 * noise.noise(dirn * 14 + seed)
        z2 = z + R * wave * edge ** 1.5 + R * crisp * edge ** 4 - R * curl * 1.25 * roll * e3 ** 2
        # Lumpy cap surface.
        capw = smooth(zf, zf + R * 0.3, z)
        z2 += noise.noise(Vector((r * c, r * s, 0)) * 180 + seed) * 0.0007 * capw
        # Stem: laterally compressed with a longitudinal groove, slightly uneven.
        stemw = 1 - smooth(zf - H * 0.1, zf + R * 0.05, z)
        gd = math.atan2(math.sin(th - groove_th), math.cos(th - groove_th))
        r2 *= 1 - 0.3 * math.exp(-(gd / 0.28) ** 2) * stemw
        r2 *= 1 + (noise.noise(Vector((c, s, z * 30)) + seed) * 0.06) * stemw
        u = c * math.cos(squash_th) + s * math.sin(squash_th)
        w = -c * math.sin(squash_th) + s * math.cos(squash_th)
        u *= 1 + 0.32 * stemw
        w *= 1 - 0.3 * stemw
        x = r2 * (u * math.cos(squash_th) - w * math.sin(squash_th))
        y = r2 * (u * math.sin(squash_th) + w * math.cos(squash_th))
        # Cap tilted on the stem, stem leaning and curved.
        tw = smooth(zf - H * 0.15, zf, z)
        x2 = x * math.cos(tilt_dir) + y * math.sin(tilt_dir)
        z2 += x2 * math.tan(tilt) * tw
        k = (max(z, 0.0) / H) ** 1.6
        sway = H * 0.02 * math.sin(math.pi * min(max(z, 0.0) / zf, 1.0))
        x += lean.x * k - lean.y / lean.length * sway
        y += lean.y * k + lean.x / lean.length * sway
        return (x, y, z2)

    obj = revolve(name, profile, 200, 460, shape, True, True)
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


def _material(obj, fr, seed_off, palette):
    v_tip, v_rim, v_stem, v_base = fr["tip"], fr["rim"], fr["stem"], fr["base"]
    m = bpy.data.materials.new(obj.name + "-proc")
    g = Graph(m)
    off = g.nt.nodes.new("ShaderNodeVectorMath")
    off.operation = "ADD"
    off.inputs[1].default_value = (seed_off, seed_off * 0.7, seed_off * 1.3)
    g.link(g.obj, off.inputs[0])
    vec = off.outputs[0]
    dark, mid_c, light, grey_c, edge_c = palette

    # Cap top: brown mottling, soft irregular fibrillose streaks (fine,
    # broken, not a regular grain), darker in the funnel, paler margin.
    big = g.noise(35, 4, 0.6, vec=vec, distortion=0.5)
    top = g.ramp(big, [(0.3, dark), (0.5, mid_c), (0.72, light)])
    top = g.mix(g.remap(g.noise(12, 3, vec=vec, distortion=0.4), 0.45, 0.68, 0.0, 0.55), top, grey_c)
    st1 = _streaks(g, vec, 55.0, 180.0)
    st2 = _streaks(g, vec, 150.0, 420.0, 3, 1.2)
    patch = g.remap(g.noise(18, 3, vec=vec), 0.4, 0.62, 0.25, 1.0)
    fib = g.math("MULTIPLY", g.remap(g.math("ADD", st1, g.math("MULTIPLY", st2, 0.5)), 0.72, 1.05, 0.0, 0.5), patch)
    top = g.mix(fib, top, dark)
    top = g.mix(g.math("MULTIPLY", g.remap(st2, 0.2, 0.4, 0.25, 0.0), patch), top, light)
    centre = g.remap(g.v, v_rim - 0.03, v_rim + 0.05, 1.0, 0.0)
    top = g.mix(g.math("MULTIPLY", centre, 0.7), top, "#3a2512")
    top = g.mix(g.remap(g.v, v_tip - 0.03, v_tip - 0.003, 0.0, 0.5), top, edge_c)
    top = g.mix(0.2, top, g.noise(300, 3, vec=vec), "OVERLAY")

    # Hymenium: pale greyish cream with a warm tint, almost smooth with very
    # low, forking veins, turning yellow-orange where it runs into the stem.
    veins = g.remap(_streaks(g, vec, 22.0, 60.0, 3, 1.0), 0.55, 0.75)
    hym = g.ramp(g.noise(30, 3, vec=vec), [(0.35, "#eed4ae"), (0.65, "#f4dfbc")])
    hym = g.mix(g.math("MULTIPLY", veins, 0.2), hym, "#d6b186")
    hym = g.mix(g.remap(g.v, v_tip + (v_stem - v_tip) * 0.45, v_tip + (v_stem - v_tip) * 0.8, 0.0, 0.6), hym, "#eebe62")
    hym = g.mix(g.remap(g.v, v_tip + (v_stem - v_tip) * 0.75, v_stem), hym, "#eaa232")

    # Stem: bright orange-yellow, longitudinal fibres, a darker groove line,
    # paler base with soil.
    fibres = g.noise(120, 3, 0.5, vec=g.vec_scale(vec, 1, 1, 0.08))
    stem = g.ramp(g.noise(25, 3, vec=vec), [(0.35, "#e8901a"), (0.65, "#f0a526")])
    stem = g.mix(0.3, stem, fibres, "OVERLAY")
    stem = g.mix(g.remap(g.v, v_base - 0.01, 1.0, 0.0, 0.7), stem, "#e8c98a")
    soil = g.math("MULTIPLY", g.remap(g.v, v_base, 1.0), g.remap(g.noise(60, 5, 0.65, vec=vec), 0.35, 0.5))
    stem = g.mix(soil, stem, "#4a3826")

    # Inside of the hollow: cap colour darkening into the tube.
    hole = g.mix(g.remap(g.v, 0.0, v_rim, 0.85, 0.0), top, "#2a1c10")

    under = g.remap(g.v, v_tip - 0.001, v_tip + 0.004)
    to_stem = g.remap(g.v, v_stem - 0.01, v_stem + 0.01)
    colour = g.mix(under, g.mix(g.remap(g.v, v_rim - 0.01, v_rim + 0.01), hole, top), hym)
    colour = g.mix(to_stem, colour, stem)

    rough = g.lerp(under, g.remap(g.noise(25, 2, vec=vec), 0.3, 0.7, 0.62, 0.78), 0.8)
    topness = g.math("SUBTRACT", 1.0, under)
    height = g.math("MULTIPLY", g.math("MULTIPLY", veins, 0.5), g.math("MULTIPLY", under, g.math("SUBTRACT", 1.0, to_stem)))
    height = g.math("ADD", height, g.math("MULTIPLY", g.noise(220, 3, vec=vec), 0.2))
    height = g.math("ADD", height, g.math("MULTIPLY", fibres, g.math("MULTIPLY", to_stem, 0.4)))
    height = g.math("ADD", height, g.math("MULTIPLY", g.math("MULTIPLY", st2, 0.35), topness))
    g.finish(colour, rough, height, 0.35, 0.0003)
    obj.data.materials.append(m)
    m.use_backface_culling = True


PALETTES = {
    # dark, mid, light, grey patches, margin
    "brown": ("#5a3a1c", "#74502b", "#86613b", "#6a5b4a", "#94703f"),
    "ochre": ("#65421e", "#7e5528", "#936837", "#76604a", "#a57a40"),
    "grey": ("#4a3a2a", "#5f4e3c", "#72614e", "#6a6258", "#86704f"),
}


def build():
    specs = [
        # name, height, cap radius, seed, texture, flare, curl, palette, location, z-rotation, spread dir, spread angle
        ("big", 0.060, 0.022, Vector((1.3, 4.2, 7.1)), 2048, 0.6, 0.15, "brown", (0.002, 0.002, -0.0008), 3.4, 40, 6),
        ("mid", 0.049, 0.017, Vector((6.2, 0.7, 2.9)), 1024, 0.75, 0.12, "ochre", (-0.006, -0.002, -0.001), 2.3, 200, 15),
        ("small", 0.033, 0.0105, Vector((3.8, 8.1, 5.5)), 1024, 0.55, 0.3, "grey", (0.006, -0.007, -0.001), 4.4, 310, 22),
    ]
    objs = []
    for i, (nm, H, R, seed, tex, flare, curl, pal, loc, rot, psi, a) in enumerate(specs):
        o, fr = _specimen(nm, H, R, seed, tex, flare, curl)
        _material(o, fr, i * 3.7, PALETTES[pal])
        o.location = loc
        # Tufted: the stems spread outwards from a shared base.
        phi = math.radians(psi) - rot
        o.rotation_euler = (-math.radians(a) * math.sin(phi), math.radians(a) * math.cos(phi), rot)
        objs.append(o)
    views = {"hero": (-30, 32, 0.40, 0.032), "low": (25, 3, 0.38, 0.032), "under": (15, -22, 0.30, 0.04)}
    return objs, views
