"""Cantharellus cibarius (rossinyol): one mature specimen.

Egg-yolk yellow throughout; an irregular, wavy cap that is shallowly
depressed in the centre, with a blunt, slightly inrolled margin; underneath,
thick, blunt, forking and cross-veined false gills (ridges, not blades) run
far down a solid stem that tapers towards the base. There is no clean break
between cap and stem, so the whole body is one surface of revolution and the
ridges are displaced out of that surface rather than hung under it.
"""

SEED = Vector((4.4, 2.6, 7.9))

# One continuous profile: cap centre -> upper surface -> margin -> underside
# (an inverted cone) -> stem -> base.
PROFILE = [
    (0.0000, 0.0655), (0.0070, 0.0662), (0.0140, 0.0683), (0.0210, 0.0712),
    (0.0275, 0.0736), (0.0325, 0.0742), (0.0362, 0.0724), (0.0384, 0.0694),
    (0.0390, 0.0668), (0.0382, 0.0648),  # 9: blunt, slightly inrolled margin tip
    (0.0360, 0.0638), (0.0303, 0.0596), (0.0245, 0.0530), (0.0195, 0.0462),
    (0.0155, 0.0388), (0.0128, 0.0308), (0.0111, 0.0228), (0.0097, 0.0150),
    (0.0085, 0.0080), (0.0075, 0.0025), (0.0063, -0.0010), (0.0038, -0.0030), (0.0000, -0.0035),
]
SAMPLES = 300
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
                best = max(best, smooth(w, 0.0, d))
        h = h0 * best ** 0.7
        # Cross-veins: low saddles joining neighbouring ridges here and there.
        for (a, lid), (b, lid2) in zip(angs, angs[1:]):
            if a <= th <= b and (b - a) * r < 0.006:
                gid = hash((lid, lid2)) % 9973
                for q in range(2):
                    if _rand(gid, 10 + q) < 0.6:
                        continue
                    sv = 0.08 + 0.75 * _rand(gid, 20 + q)
                    ds = abs(s - sv)
                    if ds < 0.03:
                        h = max(h, h0 * 0.3 * smooth(0.03, 0.0, ds))
                break
        o = 1.0 - 0.22 * env * (1 - (h / h0 if h0 > 0 else 1)) ** 1.5
        return h, o

    def shape(th, v, r, z):
        j = min(SAMPLES - 1, int(round(v * (SAMPLES - 1))))
        h, o = ridge(th, v, r)
        occl.append(o)
        n = normals[j]
        r1, z1 = r + n.x * h, z + n.y * h
        dirn = Vector((math.cos(th), math.sin(th), 0))
        # Wavy, lobed margin: strongest at the rim, fading to the stem and centre.
        m = smooth(0.012, 0.037, r)
        lobes = (0.055 * math.sin(3 * th + 0.4) + 0.035 * math.sin(5 * th + 2.3)
                 + 0.02 * math.sin(8 * th + 1.1) + 0.05 * noise.noise(dirn * 2.5 + SEED))
        wave = (0.0038 * math.sin(4 * th + 1.7) + 0.002 * math.sin(7 * th + 0.2)
                + 0.0011 * math.sin(12 * th + 2.0 * noise.noise(dirn * 4 + SEED)) + 0.0006 * math.sin(19 * th + 0.9)
                + 0.003 * noise.noise(dirn * 3.2 + SEED * 1.3))
        rr = r1 * (1 + lobes * m ** 1.5 + 0.08 * m)
        zz = z1 + wave * m ** 2 - 0.004 * m * m * (0.5 + 0.5 * math.cos(th - 2.6))
        top = 1 - smooth(v_tip - 0.07, v_tip - 0.02, v)
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        zz += (noise.noise(p * 55 + SEED) * 0.0016 + noise.noise(p * 140 + SEED) * 0.0004) * top * smooth(0.0, 0.01, r + 0.004)
        # Stem: slight lean, irregular below the cap.
        stem = 1 - smooth(0.014, 0.024, z)
        pz = Vector((math.cos(th), math.sin(th), z * 30)) + SEED
        rr *= 1 + noise.noise(pz) * 0.05 * stem * (1 if h == 0 else 0.4)
        lean = 0.004 * (1 - min(max(z, 0.0), 0.03) / 0.03) ** 2
        return (rr * math.cos(th) + 0.0015 - lean, rr * math.sin(th) + 0.0008 * m, zz)

    body = revolve("body", PROFILE, SEGMENTS, SAMPLES, shape, True, True)
    body.rotation_euler = (math.radians(4), math.radians(-3), 0)
    mesh = body.data
    attr = mesh.color_attributes.new(name="Col", type="BYTE_COLOR", domain="POINT")
    for k in range(len(mesh.vertices)):
        o = occl[k] if k < len(occl) else 1.0
        attr.data[k].color = (o, o, o, 1.0)

    # Material: egg-yolk yellow to apricot, a little deeper at the margin,
    # the ridges the same yellow, the stem paler towards the soiled base.
    m = bpy.data.materials.new("body-proc")
    g = Graph(m)
    mottle = g.noise(24, 5, 0.6, distortion=0.3)
    top = g.ramp(mottle, [(0.3, "#eda814"), (0.5, "#f2b61e"), (0.7, "#f6c232")])
    top = g.mix(g.remap(g.v, v_tip * 0.55, v_tip, 0.0, 0.35), top, "#eaa010")
    top = g.mix(g.remap(g.v, 0.0, v_tip * 0.4, 0.2, 0.0), top, "#e49e1c")
    top = g.mix(0.15, top, g.noise(240, 3), "OVERLAY")
    fib = g.noise(70, 2, 0.5, vec=g.vec_scale(g.obj, 1, 1, 8))
    top = g.mix(0.06, top, fib, "OVERLAY")
    under = g.ramp(g.noise(40, 3), [(0.35, "#f4c236"), (0.65, "#f7cd4c")])
    stemc = g.ramp(g.noise(50, 4, vec=g.vec_scale(g.obj, 1, 1, 0.3)), [(0.35, "#f2c03c"), (0.65, "#f5c94e")])
    stemc = g.mix(g.remap(g.v, v_end, 0.98, 0.0, 0.4), stemc, "#f3d57e")
    lower = g.mix(g.remap(g.v, v_end - 0.08, v_end + 0.02), under, stemc)
    colour = g.mix(g.remap(g.v, v_tip - 0.004, v_tip + 0.01), top, lower)
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.05)
    soil = g.math("MULTIPLY", g.remap(g.math("ADD", g.v, side), 0.955, 0.985), g.remap(g.noise(70, 5, 0.65), 0.34, 0.5))
    colour = g.mix(soil, colour, g.ramp(g.noise(30, 3), [(0.4, "#6e5538"), (0.65, "#9a8058")]))
    roughness = g.remap(g.noise(30, 2), 0.3, 0.7, 0.62, 0.76)
    height = g.math("ADD", g.math("MULTIPLY", g.noise(180, 4), 0.4), g.math("MULTIPLY", fib, 0.3))
    g.finish(colour, roughness, height, 0.3, 0.0004)
    body.data.materials.append(m)
    body.data.materials[0].use_backface_culling = True

    views = {"hero": (-30, 26, 0.44, 0.04), "low": (25, 4, 0.42, 0.04), "under": (15, -26, 0.34, 0.044)}
    return [body], views
