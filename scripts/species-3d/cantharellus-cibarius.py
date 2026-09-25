"""Cantharellus cibarius (rossinyol): one mature specimen.

Warm golden egg-yolk yellow to apricot, matte and slightly felty; a top-shaped,
asymmetric cap, a shallow shelf slightly depressed in the centre, with a
plump, rounded, wavy and lobed lip rolled down and under all round, lifted in
places. Underneath, many narrow, blunt, raised false gills (ridges, not
blades) fork repeatedly and become fine and dense at the margin, are joined
by cross-veins and run down a long cone into a solid, thick, slightly
tapering and bent stem, fading out one by one. The stem is the same yellow,
a little paler, whitish only at the very base. There is no clean
break between cap and stem, so the whole body is one surface of revolution
and the ridges are displaced out of that surface rather than hung under it.
"""

SEED = Vector((4.4, 2.6, 7.9))

# One continuous profile: cap centre -> upper surface -> margin -> underside
# (an inverted cone) -> stem -> base.
PROFILE = [
    (0.0000, 0.0697), (0.0060, 0.0701), (0.0120, 0.0711), (0.0180, 0.0722),
    (0.0240, 0.0731), (0.0290, 0.0736), (0.0325, 0.0734), (0.0352, 0.0724),
    (0.0370, 0.0703), (0.0377, 0.0674),  # 9: plump, rounded lip curling down
    (0.0369, 0.0647), (0.0349, 0.0634),  # 10-11: lip rolled under, 4-6 mm thick
    (0.0302, 0.0614), (0.0263, 0.0571), (0.0226, 0.0517), (0.0193, 0.0454),
    (0.0169, 0.0386), (0.0153, 0.0319), (0.0143, 0.0252), (0.0137, 0.0185),
    (0.0131, 0.0118), (0.0125, 0.0056), (0.0115, 0.0013), (0.0097, -0.0012),
    (0.0066, -0.0027), (0.0025, -0.0033),
]
SAMPLES = 470
SEGMENTS = 1024
K_TIP = 9
# Ridges that come up the stem; each forks up to three times on the way to
# the margin, where spacing is about 2.5 mm (roughly 90-100 ridges).
N_ROOTS = 25
FORKS = ((0.0165, 0.92), (0.0228, 0.78), (0.0285, 0.35), (0.0322, 0.6))
R_HINGE, Z_HINGE = 0.0300, 0.0675


def _rand(*k):
    return noise.noise(Vector((k[0] * 1.731 + 0.37, (k[1] if len(k) > 1 else 0) * 2.113 + 5.1, 0.71)) + SEED) * 0.5 + 0.5


def build():
    prof = catmull(PROFILE, SAMPLES)
    normals = []
    arc = [0.0]
    for j in range(SAMPLES):
        t = prof[min(j + 1, SAMPLES - 1)] - prof[max(j - 1, 0)]
        n = Vector((-t.y, t.x))
        normals.append(n.normalized() if n.length else Vector((0, 1)))
        if j:
            arc.append(arc[-1] + (prof[j] - prof[j - 1]).length)
    v_tip = arc_fraction(PROFILE, K_TIP)
    j_tip = int(round(v_tip * (SAMPLES - 1)))
    # Ridges run well down the stem and fade out gradually, one by one.
    j_end = next(j for j in range(SAMPLES) if j > j_tip and prof[j].y < 0.007)
    v_end = j_end / (SAMPLES - 1)
    span = arc[j_end] - arc[j_tip]

    step = 2 * math.pi / N_ROOTS
    root_angle = [step * k + step * 0.22 * (_rand(k, 5) - 0.5) for k in range(N_ROOTS)]

    leaf_cache = {}

    def leaves(k, j):
        """(id, angle) of every ridge branch of root k at profile sample j."""
        key = (k, j)
        if key in leaf_cache:
            return leaf_cache[key]
        r = prof[j].x
        dist = arc[j] - arc[j_tip]  # metres from the margin along the surface
        branches = [((k,), root_angle[k] + step * 0.16 * noise.noise(Vector((k * 3.1, dist * 90, 0.5)) + SEED), step)]
        for level, (rf0, prob) in enumerate(FORKS):
            nxt = []
            for bid, a, sp in branches:
                rid = hash(bid) % 9973
                rf = rf0 * (1 + 0.16 * (_rand(rid, 11 + level) - 0.5))
                open_ = smooth(rf - 0.0015, rf + 0.0045, r)
                if _rand(rid, 21 + level) > prob or open_ <= 0:
                    nxt.append((bid, a, sp))
                    continue
                # Dichotomous fork, slightly unequal, each child meandering.
                skew = 0.15 * (_rand(rid, 31 + level) - 0.5)
                for c, sgn in enumerate((-1, 1)):
                    cid = bid + (c,)
                    wig = noise.noise(Vector((hash(cid) % 997 * 0.61, dist * (140 + 110 * level), 1.3)) + SEED)
                    ca = a + (sgn * 0.25 + skew) * sp * open_ + (0.15 + 0.1 * level) * sp * wig * open_
                    nxt.append((cid, ca, sp * 0.5))
            branches = nxt
        out = [(bid, a) for bid, a, _ in branches]
        leaf_cache[key] = out
        return out

    occl = []

    def ridge(th, j, r):
        """Ridge height (m) and a 0..1 furrow factor at this underside point."""
        if j <= j_tip or j >= j_end:
            return 0.0, 0.0
        dist = arc[j] - arc[j_tip]
        s = dist / span
        env = smooth(0.0012, 0.005, dist) * (1 - smooth(0.7, 1.0, s))
        if env <= 0:
            return 0.0, 0.0
        # Narrow, raised ridges (about twice as high as wide), lower near the margin.
        # Near the margin they become finer, denser and wavier.
        fine = 1 - smooth(0.02, 0.2, s)
        h0 = (0.0017 + 0.0004 * smooth(0.0, 0.3, s) - 0.0011 * smooth(0.45, 1.0, s) - 0.0006 * fine) * env
        w = 0.00064 - 0.00010 * s - 0.00026 * fine
        k0 = int(round(th / step))
        cand = []
        for k in (k0 - 1, k0, k0 + 1):
            kk = k % N_ROOTS
            for lid, a in leaves(kk, j):
                cand.append((a + (k - kk) * step, lid))  # unwrap across the seam
        best = 0.0
        angs = sorted(cand)
        for a, lid in angs:
            d = abs(th - a) * r
            if d < w:
                # Each ridge has its own height and fades at its own depth.
                rid = hash(lid) % 9973
                e0 = 0.35 + 0.4 * _rand(rid, 91)
                gain = (0.75 + 0.4 * _rand(rid, 90)) * (1 - smooth(e0, e0 + 0.35, s))
                gain *= 0.85 + 0.15 * noise.noise(Vector((rid * 0.3, dist * 300, 2.0)) + SEED)
                # Rounded, blunt crest with steep flanks.
                best = max(best, (1 - (d / w) ** 2) ** 0.6 * gain)
        h = h0 * best
        # Anastomoses: low, smooth cross-veins joining neighbouring ridges,
        # mostly towards the margin; a few die out halfway.
        for (a, lid), (b, lid2) in zip(angs, angs[1:]):
            if a <= th <= b:
                gap = (b - a) * r
                if gap > 0.006 or gap <= 0:
                    break
                gid = hash((lid, lid2)) % 9973
                frac = (th - a) / (b - a)
                for q in range(4):
                    if _rand(gid, 10 + q) < 0.5:
                        continue
                    # Mostly near the margin, smooth and slightly oblique.
                    sv = span * (0.02 + 0.42 * _rand(gid, 20 + q) ** 1.6)
                    sv += gap * 1.2 * (_rand(gid, 30 + q) - 0.5) * (frac - 0.5)
                    ds = abs(dist - sv)
                    wid = 0.00045 + 0.0002 * _rand(gid, 40 + q)
                    if ds >= wid:
                        continue
                    f = frac if _rand(gid, 60 + q) < 0.5 else 1 - frac
                    cut = 1.0 if _rand(gid, 50 + q) < 0.75 else 1 - smooth(0.45, 0.7, f)
                    hv = (0.3 + 0.2 * _rand(gid, 70 + q)) * cut * (1 - smooth(0.45, 0.7, sv / span))
                    # Rises into the flanks so it joins both ridges cleanly.
                    join = 1 + 0.7 * (1 - smooth(0.0, 0.3, min(frac, 1 - frac)))
                    h = max(h, h0 * hv * join * (1 - (ds / wid) ** 2) ** 0.7)
                break
        furrow = env * max(0.0, 1 - (h / h0 if h0 > 0 else 1)) ** 1.6
        return h, furrow

    lifts = ((0.6, 0.0045, 0.45), (2.2, -0.0030, 0.35), (3.4, 0.0035, 0.3), (4.9, -0.0038, 0.5), (5.9, 0.0025, 0.25))

    def shape(th, v, r, z):
        j = min(SAMPLES - 1, int(round(v * (SAMPLES - 1))))
        h, furrow = ridge(th, j, r)
        occl.append(furrow)
        n = normals[j]
        r1, z1 = r + n.x * h, z + n.y * h
        dirn = Vector((math.cos(th), math.sin(th), 0))
        # The lip rolls further down and in on some lobes than on others;
        # the whole flesh rotates about a hinge so the edge keeps its thickness.
        roll = min(1.3, max(0.0, 0.55 + 0.7 * math.sin(2 * th + 1.0) + 0.5 * noise.noise(dirn * 2 + SEED * 0.7)))
        if roll > 0 and r > R_HINGE:
            ang = -0.6 * roll * ((r - R_HINGE) / (0.0377 - R_HINGE)) ** 1.4
            pr, pz = r1 - R_HINGE, z1 - Z_HINGE
            ca, sa = math.cos(ang), math.sin(ang)
            r1, z1 = R_HINGE + pr * ca - pz * sa, Z_HINGE + pr * sa + pz * ca
        # Wavy, lobed margin: strongest at the rim, fading to the stem and centre.
        m = smooth(0.012, 0.036, r)
        lobes = (0.05 * math.sin(3 * th + 0.4) + 0.035 * math.sin(5 * th + 2.3)
                 + 0.025 * math.sin(8 * th + 1.1) + 0.012 * math.sin(13 * th + 0.3)
                 + 0.06 * noise.noise(dirn * 2.5 + SEED))
        wave = (0.0028 * math.sin(4 * th + 1.7) + 0.0016 * math.sin(7 * th + 0.2)
                + 0.0012 * math.sin(11 * th + 2.0 * noise.noise(dirn * 4 + SEED)) + 0.0007 * math.sin(17 * th + 0.9)
                + 0.0025 * noise.noise(dirn * 3.2 + SEED * 1.3))
        rr = r1 * (1 + lobes * m ** 1.5 + 0.08 * m)
        zz = z1 + wave * m ** 2 - 0.004 * m * m * (0.5 + 0.5 * math.cos(th - 2.6))
        # Some lobes lifted, others drooping: broad, smooth, asymmetric.
        for a0, dz, wd in lifts:
            da = math.atan2(math.sin(th - a0), math.cos(th - a0))
            zz += dz * math.exp(-(da / wd) ** 2) * m ** 2.5
        top = 1 - smooth(v_tip - 0.07, v_tip - 0.02, v)
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        # Matte top: faint undulation inside, broad waves at the rim.
        calm = 0.35 + 0.65 * smooth(0.020, 0.033, r)
        # Faint radial ripples towards the margin.
        rip = math.sin(th * 23 + 3.0 * noise.noise(dirn * 3 + SEED * 1.7) + r * 90)
        zz += 0.0008 * rip * smooth(0.022, 0.035, r) ** 2 * top
        zz += (noise.noise(p * 40 + SEED) * 0.0015 + noise.noise(p * 120 + SEED) * 0.00025) * top * calm
        # The shallow depression sits a little off-centre.
        dx, dy = p.x - 0.0025, p.y + 0.0015
        zz -= 0.0035 * math.exp(-(dx * dx + dy * dy) / 0.012 ** 2) * top
        # A few splits and notches of different depths in the margin.
        rim = smooth(0.029, 0.037, r)
        for a0, dep, wd in ((0.9, 0.07, 0.05), (2.7, 0.035, 0.035), (4.3, 0.05, 0.06), (5.6, 0.025, 0.03), (1.8, 0.02, 0.025)):
            da = math.atan2(math.sin(th - a0), math.cos(th - a0))
            rr *= 1 - dep * math.exp(-(da / wd) ** 2) * rim
        # Stem: solid, slightly irregular, a little flattened.
        stem = 1 - smooth(0.014, 0.026, z)
        pz = Vector((math.cos(th), math.sin(th), z * 30)) + SEED
        rr *= 1 + (noise.noise(pz) * 0.05 + 0.04 * math.cos(2 * th - 0.7)) * stem * (1 if h == 0 else 0.4)
        # The stem bends (about 10 degrees) towards its base.
        k = (1 - min(max(z, 0.0), 0.056) / 0.056) ** 1.6
        return (rr * math.cos(th) + 0.0015 - 0.0075 * k, rr * math.sin(th) + 0.0008 * m + 0.0024 * k, zz)

    body = revolve("body", PROFILE, SEGMENTS, SAMPLES, shape, True, True)
    body.rotation_euler = (math.radians(4), math.radians(-3), 0)
    mesh = body.data
    # The pole fans share one UV row, which leaves their tangent space
    # degenerate and bakes a dark, noisy normal disc at the stem base. Give
    # each fan its own thin UV band so both poles shade like the surface.
    e = 1.0 / (SAMPLES - 1)
    first_pole = SAMPLES * SEGMENTS
    uvl = mesh.uv_layers["UVMap"].data
    for loop in mesh.loops:
        uv = uvl[loop.index].uv
        if loop.vertex_index == first_pole:
            uv.y = 1.0
        elif loop.vertex_index == first_pole + 1:
            uv.y = 0.0
        else:
            uv.y = e + uv.y * (1 - 2 * e)
    # Vertex colour: soft shadow deep in the furrows, so the ridges read by
    # relief while keeping the same yellow as the cap.
    attr = mesh.color_attributes.new(name="Col", type="BYTE_COLOR", domain="POINT")
    cols = []
    for k in range(len(mesh.vertices)):
        f = occl[k] if k < len(occl) else 0.0
        cols += (1 - 0.24 * f, 1 - 0.30 * f, 1 - 0.40 * f, 1.0)
    attr.data.foreach_set("color", cols)

    # Material: warm golden egg-yolk to apricot, a touch more orange at the
    # margin; ridges the same yellow, the stem a little paler; matte and felty.
    m = bpy.data.materials.new("body-proc")
    g = Graph(m)
    mottle = g.noise(22, 5, 0.6, distortion=0.3)
    top = g.ramp(mottle, [(0.3, "#e6a41c"), (0.5, "#ebae28"), (0.7, "#efb836")])
    # Fine irregular mottling: paler and deeper flecks under a felty bloom.
    fleck = g.noise(95, 4, 0.6, distortion=0.9)
    top = g.mix(g.remap(fleck, 0.52, 0.68, 0.0, 0.35), top, "#f2c55c")
    top = g.mix(g.remap(fleck, 0.44, 0.30, 0.0, 0.3), top, "#dd9a26")
    # Warmer apricot-orange towards the margin; slightly deeper centre.
    top = g.mix(g.remap(g.v, v_tip * 0.55, v_tip, 0.0, 0.55), top, "#e2962a")
    top = g.mix(g.remap(g.v, 0.0, v_tip * 0.4, 0.2, 0.0), top, "#dca030")
    top = g.mix(0.12, top, g.noise(240, 3), "OVERLAY")
    # Soft, slightly deeper apricot blotches and paler, felty patches.
    blot = g.noise(9, 3, 0.55, distortion=0.6)
    top = g.mix(g.remap(blot, 0.55, 0.72, 0.0, 0.35), top, "#dc9a2c")
    top = g.mix(g.remap(blot, 0.42, 0.28, 0.0, 0.3), top, "#f2c35a")
    felt = g.noise(900, 3, 0.7)
    top = g.mix(0.14, top, felt, "OVERLAY")
    # Underside: the same warm yellow, a touch more orange near the margin.
    under = g.ramp(g.noise(40, 3), [(0.35, "#f1c04e"), (0.65, "#f4c85c")])
    under = g.mix(g.remap(g.v, v_tip + 0.06, v_tip + 0.005, 0.0, 0.6), under, "#e7a634")
    under = g.mix(0.1, under, felt, "OVERLAY")
    stemc = g.ramp(g.noise(50, 4, vec=g.vec_scale(g.obj, 1, 1, 0.3)), [(0.35, "#efc050"), (0.65, "#f2c860")])
    # Fine lengthwise streaks; whitish only at the very base.
    streak = g.noise(260, 3, 0.55, vec=g.vec_scale(g.obj, 1, 1, 0.12))
    stemc = g.mix(g.remap(streak, 0.42, 0.62, 0.0, 0.35), stemc, "#f4d27a")
    stemc = g.mix(g.remap(streak, 0.5, 0.36, 0.0, 0.2), stemc, "#e6b040")
    stemc = g.mix(g.remap(g.v, 0.94, 0.995, 0.0, 0.75), stemc, "#f4e4b8")
    lower = g.mix(g.remap(g.v, v_end - 0.12, v_end), under, stemc)
    colour = g.mix(g.remap(g.v, v_tip - 0.004, v_tip + 0.01), top, lower)
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.05)
    # A very faint soil tint in patches at the base.
    soil = g.math("MULTIPLY", g.remap(g.math("ADD", g.v, side), 0.95, 0.99, 0.0, 0.15), g.remap(g.noise(60, 5, 0.65), 0.38, 0.55))
    colour = g.mix(soil, colour, g.ramp(g.noise(30, 3), [(0.4, "#b89a6a"), (0.65, "#cdb488")]))
    is_top = g.remap(g.v, v_tip - 0.01, v_tip - 0.03)
    roughness = g.lerp(is_top, g.remap(g.noise(30, 2), 0.3, 0.7, 0.78, 0.88), g.remap(felt, 0.3, 0.7, 0.8, 0.9))
    fib = g.noise(70, 2, 0.5, vec=g.vec_scale(g.obj, 1, 1, 8))
    height = g.math("ADD", g.math("MULTIPLY", g.noise(180, 4), 0.35), g.math("MULTIPLY", fib, 0.25))
    height = g.math("ADD", height, g.math("MULTIPLY", felt, 0.5))
    on_stem = g.remap(g.v, v_end - 0.06, v_end)
    height = g.math("ADD", height, g.math("MULTIPLY", on_stem, g.math("MULTIPLY", streak, 0.6)))
    g.finish(colour, roughness, height, 0.25, 0.0003)
    body.data.materials.append(m)
    body.data.materials[0].use_backface_culling = True

    views = {"hero": (-30, 26, 0.44, 0.045), "low": (25, 4, 0.42, 0.042), "under": (15, -26, 0.34, 0.045)}
    return [body], views
