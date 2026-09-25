"""Cantharellus cibarius (rossinyol): one mature specimen.

Egg-yolk yellow throughout; an irregular, wavy cap that is shallowly
depressed in the centre, with a thin, wavy, slightly inrolled margin; underneath,
thick, blunt, forking and cross-veined false gills (ridges, not blades) run
far down a thick, nearly cylindrical stem with a blunt base. There is no clean break
between cap and stem, so the whole body is one surface of revolution and the
ridges are displaced out of that surface rather than hung under it.
"""

SEED = Vector((4.4, 2.6, 7.9))

# One continuous profile: cap centre -> upper surface -> margin -> underside
# (an inverted cone) -> stem -> base.
PROFILE = [
    (0.0000, 0.0640), (0.0060, 0.0645), (0.0120, 0.0660), (0.0180, 0.0680),
    (0.0240, 0.0696), (0.0290, 0.0704), (0.0330, 0.0703), (0.0362, 0.0694),
    (0.0384, 0.0678), (0.0396, 0.0657),  # 9: thin margin tip, curling down
    (0.0391, 0.0645), (0.0375, 0.0648),  # 10-11: slight inroll, 1-2 mm of flesh
    (0.0345, 0.0643), (0.0300, 0.0618), (0.0255, 0.0582), (0.0208, 0.0518),
    (0.0170, 0.0448), (0.0145, 0.0370), (0.0129, 0.0292), (0.0121, 0.0214),
    (0.0117, 0.0144), (0.0114, 0.0082), (0.0110, 0.0036), (0.0101, 0.0006),
    (0.0084, -0.0016), (0.0055, -0.0029), (0.0020, -0.0034),
]
SAMPLES = 380
SEGMENTS = 768
K_TIP = 9
N_ROOTS = 21


def _rand(*k):
    return noise.noise(Vector((k[0] * 1.731 + 0.37, (k[1] if len(k) > 1 else 0) * 2.113 + 5.1, 0.71)) + SEED) * 0.5 + 0.5


def build():
    prof = catmull(PROFILE, SAMPLES)
    normals = []
    for j in range(SAMPLES):
        t = prof[min(j + 1, SAMPLES - 1)] - prof[max(j - 1, 0)]
        n = Vector((-t.y, t.x))
        normals.append(n.normalized() if n.length else Vector((0, 1)))
    v_tip = arc_fraction(PROFILE, K_TIP)
    # Ridges fade out down the stem, around a third of its height.
    j_end = next(j for j in range(SAMPLES) if j / (SAMPLES - 1) > v_tip and prof[j].y < 0.021)
    v_end = j_end / (SAMPLES - 1)

    step = 2 * math.pi / N_ROOTS
    roots = []
    for k in range(N_ROOTS):
        f1 = 0.50 + 0.18 * (_rand(k, 1) - 0.5)
        f2 = 0.24 + 0.12 * (_rand(k, 2) - 0.5)
        fork2 = (_rand(k, 3) > 0.22, _rand(k, 4) > 0.22)
        roots.append((step * k + step * 0.18 * (_rand(k, 5) - 0.5), f1, f2, fork2))

    def leaves(k, s):
        """Angles of the ridge branches of root k at depth s (0 margin, 1 end)."""
        a0, f1, f2, fork2 = roots[k % N_ROOTS]
        meander = step * 0.16 * noise.noise(Vector((k * 3.1, s * 2.2, 0.5)) + SEED)
        base = a0 + meander
        sp1 = smooth(f1, f1 - 0.13, s)
        if sp1 <= 0:
            return [((k, 0), base)]
        out = []
        for c, sgn in enumerate((-1, 1)):
            a1 = base + sgn * step * 0.25 * sp1 + step * 0.07 * sp1 * noise.noise(Vector((k * 2.3, c * 4.1, s * 3.0)) + SEED)
            sp2 = smooth(f2, f2 - 0.1, s) if fork2[c] else 0.0
            if sp2 <= 0:
                out.append(((k, c + 1, 0), a1))
            else:
                for d, sgn2 in enumerate((-1, 1)):
                    out.append(((k, c + 1, d + 1), a1 + sgn2 * step * 0.125 * sp2))
        return out

    occl = []

    def ridge(th, v, r):
        """Ridge height (m) and occlusion factor at this point of the underside."""
        if v <= v_tip or v >= v_end:
            return 0.0, 1.0
        s = (v - v_tip) / (v_end - v_tip)
        env = smooth(0.015, 0.09, s) * (1 - smooth(0.62, 1.0, s))
        if env <= 0:
            return 0.0, 1.0
        h0 = (0.0015 - 0.0005 * s) * env
        w = 0.00135 - 0.00035 * s
        k0 = int(round(th / step))
        cand = []
        for k in (k0 - 1, k0, k0 + 1):
            kk = k % N_ROOTS
            for lid, a in leaves(kk, s):
                cand.append((a + (k - kk) * step, lid))  # unwrap across the seam
        best = 0.0
        angs = sorted(cand)
        for a, lid in angs:
            d = abs(th - a) * r
            if d < w:
                # Each ridge has its own height and dies out at its own depth
                # down the stem instead of all stopping on one line.
                rid = hash(lid) % 9973
                e0 = 0.45 + 0.35 * _rand(rid, 91)
                gain = (0.7 + 0.55 * _rand(rid, 90)) * (1 - smooth(e0, e0 + 0.3, s))
                best = max(best, smooth(w, 0.0, d) * gain)
        h = h0 * best ** 0.7
        # Anastomoses: fine, low, oblique wrinkles that leave a ridge and
        # often die out before reaching the next one.
        for (a, lid), (b, lid2) in zip(angs, angs[1:]):
            if a <= th <= b and (b - a) * r < 0.006:
                gid = hash((lid, lid2)) % 9973
                frac = (th - a) / (b - a) if b > a else 0.5
                for q in range(3):
                    if _rand(gid, 10 + q) < 0.5:
                        continue
                    tilt = 0.05 * (_rand(gid, 30 + q) - 0.5)
                    sv = 0.05 + 0.45 * _rand(gid, 20 + q) ** 1.4 + tilt * (frac - 0.5)
                    sv += 0.006 * noise.noise(Vector((frac * 3.0, gid * 0.37, q * 1.9)) + SEED)
                    ds = abs(s - sv)
                    wid = 0.009 + 0.004 * _rand(gid, 40 + q)
                    if ds >= wid:
                        continue
                    reach = 0.45 + 0.6 * _rand(gid, 50 + q)
                    f = frac if _rand(gid, 60 + q) < 0.5 else 1 - frac
                    span = 1 - smooth(reach - 0.25, reach, f)
                    hv = (0.12 + 0.08 * _rand(gid, 70 + q)) * span
                    h = max(h, h0 * hv * smooth(wid, 0.0, ds))
                break
        o = 1.0 - 0.22 * env * max(0.0, 1 - (h / h0 if h0 > 0 else 1)) ** 1.5
        return h, o

    def shape(th, v, r, z):
        j = min(SAMPLES - 1, int(round(v * (SAMPLES - 1))))
        h, o = ridge(th, v, r)
        occl.append(o)
        n = normals[j]
        r1, z1 = r + n.x * h, z + n.y * h
        dirn = Vector((math.cos(th), math.sin(th), 0))
        # Wavy, lobed margin: strongest at the rim, fading to the stem and centre.
        m = smooth(0.013, 0.039, r)
        lobes = (0.045 * math.sin(3 * th + 0.4) + 0.03 * math.sin(5 * th + 2.3)
                 + 0.02 * math.sin(8 * th + 1.1) + 0.05 * noise.noise(dirn * 2.5 + SEED))
        wave = (0.0024 * math.sin(4 * th + 1.7) + 0.0014 * math.sin(7 * th + 0.2)
                + 0.0011 * math.sin(12 * th + 2.0 * noise.noise(dirn * 4 + SEED)) + 0.0006 * math.sin(19 * th + 0.9)
                + 0.002 * noise.noise(dirn * 3.2 + SEED * 1.3))
        rr = r1 * (1 + lobes * m ** 1.5 + 0.08 * m)
        zz = z1 + wave * m ** 2 - 0.004 * m * m * (0.5 + 0.5 * math.cos(th - 2.6))
        # The thin edge curls down more on some sides than others.
        curl = smooth(0.033, 0.0398, r) ** 2 * (0.55 + 0.45 * math.sin(2 * th + 1.0) + 0.3 * noise.noise(dirn * 2 + SEED * 0.7))
        zz -= 0.0028 * max(curl, 0.0)
        top = 1 - smooth(v_tip - 0.07, v_tip - 0.02, v)
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        # Smooth, matte top: only faint undulation inside, broad waves at the rim.
        calm = 0.35 + 0.65 * smooth(0.022, 0.036, r)
        zz += (noise.noise(p * 40 + SEED) * 0.0014 + noise.noise(p * 120 + SEED) * 0.0002) * top * calm
        # The shallow funnel sits a little off-centre.
        dx, dy = p.x - 0.0025, p.y + 0.0015
        zz -= 0.003 * math.exp(-(dx * dx + dy * dy) / 0.011 ** 2) * top
        # A few splits and notches of different depths in the thin margin.
        rim = smooth(0.031, 0.0395, r)
        for a0, dep, wd in ((0.9, 0.07, 0.05), (2.7, 0.035, 0.035), (4.3, 0.05, 0.06), (5.6, 0.025, 0.03)):
            da = math.atan2(math.sin(th - a0), math.cos(th - a0))
            rr_notch = dep * math.exp(-(da / wd) ** 2) * rim
            rr *= 1 - rr_notch
        # Stem: slight lean, irregular below the cap.
        stem = 1 - smooth(0.014, 0.024, z)
        pz = Vector((math.cos(th), math.sin(th), z * 30)) + SEED
        rr *= 1 + noise.noise(pz) * 0.05 * stem * (1 if h == 0 else 0.4)
        # The stem curves gently (about 7 degrees) towards its base.
        k = (1 - min(max(z, 0.0), 0.048) / 0.048) ** 1.6
        return (rr * math.cos(th) + 0.0015 - 0.0055 * k, rr * math.sin(th) + 0.0008 * m + 0.0018 * k, zz)

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
    attr = mesh.color_attributes.new(name="Col", type="BYTE_COLOR", domain="POINT")
    cols = []
    for k in range(len(mesh.vertices)):
        o = occl[k] if k < len(occl) else 1.0
        cols += (o, o, o, 1.0)
    attr.data.foreach_set("color", cols)

    # Material: egg-yolk yellow to apricot, a little deeper at the margin,
    # the ridges the same yellow, the stem paler towards the soiled base.
    m = bpy.data.materials.new("body-proc")
    g = Graph(m)
    mottle = g.noise(24, 5, 0.6, distortion=0.3)
    top = g.ramp(mottle, [(0.3, "#eda814"), (0.5, "#f2b61e"), (0.7, "#f6c232")])
    # Fine irregular mottling: paler and deeper flecks under a felty bloom.
    fleck = g.noise(95, 4, 0.6, distortion=0.9)
    top = g.mix(g.remap(fleck, 0.52, 0.66, 0.0, 0.35), top, "#f8cc4c")
    top = g.mix(g.remap(fleck, 0.44, 0.32, 0.0, 0.3), top, "#e59a14")
    top = g.mix(g.remap(g.v, v_tip * 0.4, v_tip, 0.0, 0.18), top, "#ec9a22")
    top = g.mix(g.remap(g.v, 0.0, v_tip * 0.4, 0.2, 0.0), top, "#e49e1c")
    top = g.mix(0.15, top, g.noise(240, 3), "OVERLAY")
    fib = g.noise(70, 2, 0.5, vec=g.vec_scale(g.obj, 1, 1, 8))
    top = g.mix(0.06, top, fib, "OVERLAY")
    felt = g.noise(900, 3, 0.7)
    top = g.mix(0.12, top, felt, "OVERLAY")
    under = g.ramp(g.noise(40, 3), [(0.35, "#f4c236"), (0.65, "#f7cd4c")])
    stemc = g.ramp(g.noise(50, 4, vec=g.vec_scale(g.obj, 1, 1, 0.3)), [(0.35, "#f2c03c"), (0.65, "#f5c94e")])
    stemc = g.mix(g.remap(g.v, v_end, 1.0, 0.0, 0.5), stemc, "#f4d98a")
    lower = g.mix(g.remap(g.v, v_end - 0.08, v_end + 0.02), under, stemc)
    colour = g.mix(g.remap(g.v, v_tip - 0.004, v_tip + 0.01), top, lower)
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.05)
    # A light soil tint in patches at the base, never a dark cap.
    soil = g.math("MULTIPLY", g.remap(g.math("ADD", g.v, side), 0.9, 0.975, 0.0, 0.35), g.remap(g.noise(60, 5, 0.65), 0.38, 0.55))
    colour = g.mix(soil, colour, g.ramp(g.noise(30, 3), [(0.4, "#c8a870"), (0.65, "#dcc28c")]))
    colour = g.mix(g.remap(g.v, 0.965, 0.995, 0.0, 0.85), colour, "#fbecc0")
    is_top = g.remap(g.v, v_tip - 0.01, v_tip - 0.03)
    roughness = g.lerp(is_top, g.remap(g.noise(30, 2), 0.3, 0.7, 0.62, 0.74), g.remap(felt, 0.3, 0.7, 0.72, 0.86))
    height = g.math("ADD", g.math("MULTIPLY", g.noise(180, 4), 0.4), g.math("MULTIPLY", fib, 0.3))
    height = g.math("ADD", height, g.math("MULTIPLY", is_top, g.math("MULTIPLY", felt, 0.6)))
    g.finish(colour, roughness, height, 0.3, 0.0004)
    body.data.materials.append(m)
    body.data.materials[0].use_backface_culling = True

    views = {"hero": (-30, 26, 0.44, 0.04), "low": (25, 4, 0.42, 0.04), "under": (15, -26, 0.34, 0.044)}
    return [body], views
