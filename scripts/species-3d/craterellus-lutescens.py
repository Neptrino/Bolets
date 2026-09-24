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


def _specimen(name, H, R, seed, tex, young=False):
    """One trumpet of total height ~H and cap radius ~R (metres)."""
    zf = H * 0.80  # where the stem flares into the cap
    rs = max(0.0017, R * 0.115)  # stem mid-line radius
    droop = 0.06 if not young else 0.18
    mid = [
        (rs * 0.95, 0.0), (rs * 0.9, H * 0.12), (rs * 0.95, H * 0.35), (rs * 1.08, H * 0.55),
        (rs * 1.35, zf - H * 0.1), (rs * 2.2, zf - H * 0.01), (R * 0.4, zf + H * 0.05),
        (R * 0.58, zf + H * 0.085), (R * 0.78, zf + H * 0.095), (R * 0.92, zf + H * 0.085),
        (R * 1.0, zf + H * (0.065 - droop * 0.3)), (R * (1.02 - droop * 0.2), zf + H * (0.04 - droop * 0.55)),
    ]
    mid = [(p.x, p.y) for p in catmull(mid, 70)]
    n = len(mid)

    def thick(k):
        z = mid[k][1]
        r = mid[k][0]
        stem_t = rs * 0.62
        cap_t = 0.0014 - 0.0008 * smooth(R * 0.4, R, r)
        return stem_t + (cap_t - stem_t) * smooth(zf - H * 0.05, zf + H * 0.03, z)

    hole_k = 22 if not young else 30
    profile, k_tip = _sheet_profile(mid, thick, hole_k)
    kf = min((k for k in range(n) if mid[k][0] < R * 0.45), key=lambda k: abs(mid[k][1] - (zf + H * 0.01)))
    kb = min(range(n), key=lambda k: abs(mid[k][1] - H * 0.09))
    fr = {
        "tip": arc_fraction(profile, k_tip),
        "rim": arc_fraction(profile, 2 + kf - hole_k),  # funnel mouth, inside
        "stem": arc_fraction(profile, k_tip + 1 + (n - 1 - kf)),  # hymenium meets stem
        "base": arc_fraction(profile, k_tip + 1 + (n - 1 - kb)),
    }

    rng = [noise.noise(seed + Vector((k * 1.37, 0.4, 0.9))) for k in range(12)]
    notches = [(rng[k] * math.pi * 2 + k * 2.1, 0.16 + 0.1 * abs(rng[k + 4])) for k in range(3)]
    lean = Vector((math.cos(rng[8] * 6), math.sin(rng[8] * 6))) * H * 0.08
    tilt_dir = rng[9] * 6 + 1.0
    tilt = math.radians(10 + 8 * rng[10])
    groove_th = rng[11] * 6

    def shape(th, v, r, z):
        c, s = math.cos(th), math.sin(th)
        dirn = Vector((c, s, 0))
        # Lobed, wavy, locally torn margin; top and underside move together.
        edge = smooth(R * 0.35, R * 1.0, r)
        lobes = (0.07 * math.sin(3 * th + rng[0] * 4) + 0.05 * math.sin(5 * th + rng[1] * 4)
                 + 0.03 * math.sin(9 * th + rng[2] * 4) + 0.06 * noise.noise(dirn * 2.5 + seed)
                 + 0.02 * noise.noise(dirn * 9 + seed))
        for tn, wn in notches:
            d = math.atan2(math.sin(th - tn), math.cos(th - tn))
            lobes -= wn * math.exp(-(d / 0.045) ** 2) * smooth(0.55, 1.0, r / R)
        r2 = r * (1 + lobes * edge)
        wave = (0.11 * math.sin(4 * th + rng[3] * 5) + 0.07 * math.sin(7 * th + rng[5] * 5)
                + 0.06 * noise.noise(dirn * 3 + seed * 1.3))
        crisp = 0.035 * math.sin(13 * th + 3 * noise.noise(dirn * 4 + seed)) + 0.03 * noise.noise(dirn * 14 + seed)
        z2 = z + R * wave * edge ** 1.5 + R * crisp * edge ** 4
        # Lumpy cap surface.
        capw = smooth(zf - H * 0.02, zf + H * 0.03, z)
        z2 += noise.noise(Vector((r * c, r * s, 0)) * 180 + seed) * 0.0007 * capw
        # Stem: compressed, with a shallow groove, slightly uneven.
        stemw = 1 - smooth(zf - H * 0.12, zf - H * 0.02, z)
        gd = math.atan2(math.sin(th - groove_th), math.cos(th - groove_th))
        r2 *= 1 - 0.24 * math.exp(-(gd / 0.3) ** 2) * stemw
        r2 *= 1 + (noise.noise(Vector((c, s, z * 30)) + seed) * 0.06) * stemw
        x, y = r2 * c * (1 + 0.2 * stemw), r2 * s * (1 - 0.2 * stemw)
        # Cap tilted on the stem, stem leaning and curved.
        tw = smooth(zf - H * 0.15, zf, z)
        x2 = x * math.cos(tilt_dir) + y * math.sin(tilt_dir)
        z2 += x2 * math.tan(tilt) * tw
        k = (max(z, 0.0) / H) ** 1.6
        sway = H * 0.025 * math.sin(math.pi * min(max(z, 0.0) / zf, 1.0))
        x += lean.x * k - lean.y / lean.length * sway
        y += lean.y * k + lean.x / lean.length * sway
        return (x, y, z2)

    obj = revolve(name, profile, 180, 460, shape, True, True)
    obj["tex"] = tex
    return obj, fr


def _material(obj, fr, seed_off):
    v_tip, v_rim, v_stem, v_base = fr["tip"], fr["rim"], fr["stem"], fr["base"]
    m = bpy.data.materials.new(obj.name + "-proc")
    g = Graph(m)
    sep = g.nt.nodes.new("ShaderNodeSeparateXYZ")
    off = g.nt.nodes.new("ShaderNodeVectorMath")
    off.operation = "ADD"
    off.inputs[1].default_value = (seed_off, seed_off * 0.7, seed_off * 1.3)
    g.link(g.obj, off.inputs[0])
    vec = off.outputs[0]
    g.link(g.obj, sep.inputs[0])
    ang = g.math("ARCTAN2", sep.outputs["Y"], sep.outputs["X"])

    # Cap top: brown to grey-brown, darker in the funnel, fine radial fibrils,
    # a slightly paler, yellower margin.
    big = g.noise(40, 4, 0.6, vec=vec, distortion=0.4)
    top = g.ramp(big, [(0.3, "#5e3d1e"), (0.5, "#76502a"), (0.7, "#86603a")])
    grey = g.remap(g.noise(14, 3, vec=vec), 0.45, 0.65, 0.0, 0.45)
    top = g.mix(grey, top, "#6b5d4c")
    fib = g.math("SINE", g.math("ADD", g.math("MULTIPLY", ang, 110.0), g.math("MULTIPLY", g.noise(30, 2, vec=vec), 6.0)))
    fib = g.math("MULTIPLY", g.remap(fib, 0.5, 1.0, 0.0, 0.22), g.remap(g.noise(60, 2, vec=vec), 0.4, 0.6))
    top = g.mix(fib, top, "#3f2a17")
    centre = g.remap(g.v, v_rim - 0.03, v_rim + 0.05, 1.0, 0.0)
    top = g.mix(g.math("MULTIPLY", centre, 0.75), top, "#3a2512")
    top = g.mix(g.remap(g.noise(8, 2, vec=vec), 0.5, 0.65, 0.0, 0.35), top, "#4c3218")
    top = g.mix(g.remap(g.v, v_tip - 0.035, v_tip - 0.004, 0.0, 0.55), top, "#9a7440")
    top = g.mix(0.25, top, g.noise(300, 3, vec=vec), "OVERLAY")

    # Hymenium: pale greyish cream with a warm tint, almost smooth with very
    # low, forking veins, turning yellow-orange where it runs into the stem.
    veins = g.math("SINE", g.math("ADD", g.math("MULTIPLY", ang, 34.0),
                                  g.math("MULTIPLY", g.noise(45, 3, vec=vec, distortion=0.5), 5.0)))
    veins = g.remap(veins, 0.55, 1.0)
    hym = g.ramp(g.noise(30, 3, vec=vec), [(0.35, "#f0d8b4"), (0.65, "#f6e2c0")])
    hym = g.mix(g.math("MULTIPLY", veins, 0.18), hym, "#d9b58a")
    hym = g.mix(g.remap(g.v, v_tip + (v_stem - v_tip) * 0.45, v_tip + (v_stem - v_tip) * 0.8, 0.0, 0.6), hym, "#eebe62")
    hym = g.mix(g.remap(g.v, v_tip + (v_stem - v_tip) * 0.75, v_stem), hym, "#eaa232")

    # Stem: bright orange-yellow, longitudinal fibres, paler whitish base
    # with soil and moss debris.
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
    height = g.math("ADD", g.math("MULTIPLY", g.math("MULTIPLY", veins, 0.5), g.math("MULTIPLY", under, g.math("SUBTRACT", 1.0, to_stem))),
                    g.math("MULTIPLY", g.noise(220, 3, vec=vec), 0.25))
    height = g.math("ADD", height, g.math("MULTIPLY", fibres, g.math("MULTIPLY", to_stem, 0.4)))
    # Cap top: radially fibrillose, faintly wrinkled towards the margin.
    wr = g.math("SINE", g.math("ADD", g.math("MULTIPLY", ang, 70.0), g.math("MULTIPLY", g.noise(25, 3, vec=vec, distortion=0.6), 8.0)))
    wr = g.math("MULTIPLY", g.remap(wr, 0.0, 1.0), g.remap(g.v, v_rim, v_tip - 0.01, 0.0, 0.5))
    height = g.math("ADD", height, g.math("MULTIPLY", wr, g.math("SUBTRACT", 1.0, under)))
    g.finish(colour, rough, height, 0.45, 0.0004)
    obj.data.materials.append(m)
    m.use_backface_culling = True


def build():
    specs = [
        # name, height, cap radius, seed, texture, young, location, z-rotation
        ("big", 0.070, 0.022, Vector((1.3, 4.2, 7.1)), 2048, False, (0.002, 0.002, -0.0008), 0.0, 40, 6),
        ("mid", 0.056, 0.016, Vector((6.2, 0.7, 2.9)), 1024, False, (-0.006, -0.002, -0.001), 2.3, 200, 15),
        ("small", 0.036, 0.0100, Vector((3.8, 8.1, 5.5)), 1024, True, (0.004, -0.006, -0.001), 4.4, 300, 20),
    ]
    objs = []
    for i, (nm, H, R, seed, tex, young, loc, rot, psi, a) in enumerate(specs):
        o, fr = _specimen(nm, H, R, seed, tex, young)
        _material(o, fr, i * 3.7)
        o.location = loc
        # Tufted: the stems spread outwards from a shared base.
        phi = math.radians(psi) - rot
        o.rotation_euler = (-math.radians(a) * math.sin(phi), math.radians(a) * math.cos(phi), rot)
        objs.append(o)
    views = {"hero": (-30, 32, 0.42, 0.034), "low": (25, 3, 0.40, 0.036), "under": (15, -22, 0.32, 0.045)}
    return objs, views
