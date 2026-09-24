"""Craterellus cornucopioides (trompeta de la mort): a small group of deep,
hollow, thin-fleshed trumpets. The outer (fertile) face is smooth to faintly
wrinkled and ash-grey, paler down the tube; the inner face is dark brown-black
and finely scaly; the flared margin is wavy, torn and rolled back.

Each trumpet is one closed surface of revolution whose profile climbs the
outside of a thin sheet, turns over the rolled lip and runs back down the
inside to a hollow bottom just above the base."""


def _trumpet_profile(height, mouth, base_r, wall_base, wall_rim, curl_r, curl_deg):
    """(profile, lip_index): outside up, round the lip, inside down."""
    mid = []
    z0 = 0.004
    steps = 60
    for s in range(steps + 1):
        u = s / steps
        z = z0 + (height - z0) * u
        r = base_r + (mouth - base_r) * (0.55 * u ** 1.4 + 0.45 * u ** 6)
        mid.append(Vector((r, z)))
    # Flare turning outwards and then rolling down over the margin.
    t = (mid[-1] - mid[-2]).normalized()
    ang = math.atan2(t.y, t.x)
    centre = mid[-1] + Vector((math.cos(ang - math.pi / 2), math.sin(ang - math.pi / 2))) * curl_r
    a0 = ang + math.pi / 2
    for s in range(1, 13):
        a = a0 - math.radians(curl_deg) * s / 12
        mid.append(centre + Vector((math.cos(a), math.sin(a))) * curl_r)
    n = len(mid)
    outer, inner = [], []
    for k in range(n):
        tan = (mid[min(k + 1, n - 1)] - mid[max(k - 1, 0)]).normalized()
        nrm = Vector((tan.y, -tan.x))  # outward for an upward-running midline
        f = k / (n - 1)
        h = 0.5 * (wall_base + (wall_rim - wall_base) * f ** 0.6)
        outer.append(mid[k] + nrm * h)
        inner.append(mid[k] - nrm * h)
    tip_t = (mid[-1] - mid[-2]).normalized()
    hr = 0.5 * wall_rim
    lip = [mid[-1] + (outer[-1] - mid[-1]) * 0.7 + tip_t * hr * 0.7, mid[-1] + tip_t * hr,
           mid[-1] + (inner[-1] - mid[-1]) * 0.7 + tip_t * hr * 0.7]
    ob = base_r + wall_base / 2
    ib = base_r - wall_base / 2
    profile = [(0.0, -0.0025), (ob * 0.55, -0.0022), (ob * 0.92, -0.0005), (ob, z0 * 0.6)]
    profile += [(p.x, p.y) for p in outer]
    lip_index = len(profile) + 1
    profile += [(p.x, p.y) for p in lip]
    profile += [(p.x, p.y) for p in reversed(inner)]
    profile += [(ib * 0.9, z0 * 1.2), (ib * 0.6, z0 * 1.5), (0.0, z0 * 1.6)]
    return profile, lip_index


def _trumpet(name, seed, height, mouth, base_r, wall_base, wall_rim, curl_r, curl_deg,
             lobes, tears, tilt, samples=520, segments=220):
    profile, lip_index = _trumpet_profile(height, mouth, base_r, wall_base, wall_rim, curl_r, curl_deg)
    vl = arc_fraction(profile, lip_index)
    flare0 = base_r + (mouth - base_r) * 0.25

    def shape(th, v, r, z):
        # Every displacement depends on position, not on the profile side,
        # so the outer and inner faces move together and the sheet stays thin.
        dirn = Vector((math.cos(th), math.sin(th), 0.0))
        fl = smooth(flare0, mouth + curl_r, r)
        uz = max(0.0, min(1.0, z / height))
        wave = sum(a * math.sin(k * th + ph) for k, a, ph in lobes)
        wave += 0.35 * noise.noise(dirn * 2.5 + seed) + 0.12 * noise.noise(dirn * 7 + seed)
        rr = r * (1 + 0.16 * wave * fl + 0.05 * noise.noise(Vector((math.cos(th), math.sin(th), z * 30)) + seed) * uz)
        zz = z + 0.010 * wave * fl * (mouth / 0.028) + tilt * mouth * math.cos(th - 0.9) * fl
        for t0, w, d in tears:
            dth = math.atan2(math.sin(th - t0), math.cos(th - t0))
            zz -= d * math.exp(-(dth / w) ** 2) * fl ** 2
        # Faint longitudinal wrinkles and a soft ripple on the flare.
        rr += 0.00022 * noise.noise(dirn * 9 + Vector((0, 0, z * 9)) + seed) * smooth(0.15, 0.6, uz)
        zz += 0.0012 * noise.noise(Vector((rr * math.cos(th), rr * math.sin(th), 0)) * 90 + seed) * fl
        zz += 0.09 * mouth * noise.noise(dirn * 11 + seed * 1.3) * fl ** 2
        # The margin folds down further in places, as in older fruitbodies.
        zz -= 0.35 * mouth * max(0.0, noise.noise(dirn * 3.2 + seed * 0.7)) * fl ** 4
        # A gentle bow in the tube.
        bend = 0.004 * (height / 0.085) * math.sin(math.pi * uz * 0.9)
        return (rr * math.cos(th) + bend, rr * math.sin(th) + 0.3 * bend, zz)

    obj = revolve(name, profile, segments, samples, shape, True, True)
    # The profile runs up the outside and back down the inside, the reverse of
    # revolve()'s usual direction, so its faces come out pointing into the wall.
    obj.data.flip_normals()

    m = bpy.data.materials.new(f"{name}-proc")
    g = Graph(m)
    inside = g.remap(g.v, vl - 0.004, vl + 0.004)
    sep = g.nt.nodes.new("ShaderNodeSeparateXYZ")
    g.link(g.obj, sep.inputs[0])
    uz = g.math("DIVIDE", sep.outputs["Z"], height)
    # Outside: ash-grey, paler and slightly brownish down the tube, with a
    # patchy pale bloom and faint lengthwise wrinkles.
    body = g.ramp(g.noise(30, 4, 0.6), [(0.35, "#46423e"), (0.65, "#544f4a")])
    body = g.mix(g.remap(uz, 0.75, 0.15, 0.0, 0.7), body, "#6f6962")
    bloom = g.remap(g.noise(14, 4, 0.6, distortion=0.5), 0.5, 0.66, 0.0, 0.35)
    body = g.mix(bloom, body, "#8d8883")
    streak = g.noise(60, 3, 0.55, vec=g.vec_scale(g.obj, 1, 1, 0.12))
    body = g.mix(0.35, body, streak, "OVERLAY")
    dstreak = g.noise(24, 4, 0.6, vec=g.vec_scale(g.obj, 1, 1, 0.1), distortion=0.4)
    body = g.mix(g.remap(dstreak, 0.52, 0.68, 0.0, 0.55), body, "#3c3834")
    body = g.mix(0.2, body, g.noise(350, 2), "OVERLAY")
    dark_rim = g.remap(uz, 0.8, 1.0, 0.0, 0.45)
    body = g.mix(dark_rim, body, "#38332f")
    soil = g.math("MULTIPLY", g.remap(uz, 0.12, 0.02), g.remap(g.noise(70, 5, 0.65), 0.4, 0.55, 0.0, 0.7))
    body = g.mix(soil, body, "#4b3a2b")
    # Inside: dark brown-black, finely scaly and rough, a touch paler near the lip.
    # Fine, irregular scaly roughness rather than regular dots.
    scale_d = g.voronoi(900, vec=g.vec_scale(g.obj, 1, 1, 0.7), rand=1.0)
    scales = g.math("MULTIPLY", g.remap(scale_d, 0.05, 0.35, 1.0, 0.0), g.remap(g.noise(60, 3), 0.4, 0.62, 0.2, 1.0))
    inner = g.ramp(g.noise(40, 4, 0.6), [(0.35, "#2f2621"), (0.65, "#3d322a")])
    inner = g.mix(g.math("MULTIPLY", scales, 0.35), inner, "#4b3e34")
    inner = g.mix(g.remap(g.noise(35, 4, 0.6, distortion=0.4), 0.55, 0.7, 0.0, 0.4), inner, "#4e4036")
    inner = g.mix(g.remap(uz, 0.75, 0.15, 0.0, 0.75), inner, "#1c1512")
    inner = g.mix(0.25, inner, g.noise(300, 2), "OVERLAY")
    colour = g.mix(inside, body, inner)
    roughness = g.lerp(inside, g.remap(g.noise(25, 2), 0.3, 0.7, 0.62, 0.74), 0.86)
    h_out = g.math("ADD", g.math("MULTIPLY", streak, 0.6), g.math("MULTIPLY", g.noise(200, 3), 0.2))
    h_in = g.math("ADD", scales, g.math("MULTIPLY", g.noise(150, 3), 0.3))
    g.finish(colour, roughness, g.lerp(inside, h_out, h_in), 0.45, 0.0005)
    obj.data.materials.append(m)
    obj.data.materials[0].use_backface_culling = True
    return obj


def build():
    big = _trumpet("trumpet-a", Vector((3.3, 1.1, 7.2)), 0.085, 0.027, 0.0046, 0.0017, 0.0011, 0.0045, 120,
                   lobes=[(3, 0.35, 0.4), (5, 0.25, 2.0), (7, 0.12, 1.1)], tears=[(2.3, 0.13, 0.005)], tilt=0.06)
    mid = _trumpet("trumpet-b", Vector((8.1, 4.4, 2.6)), 0.064, 0.021, 0.0040, 0.0015, 0.0010, 0.0038, 100,
                   lobes=[(2, 0.3, 1.3), (4, 0.3, 0.2), (6, 0.12, 2.5)], tears=[(5.2, 0.12, 0.004)], tilt=0.05)
    small = _trumpet("trumpet-c", Vector((1.7, 9.5, 5.3)), 0.043, 0.0135, 0.0033, 0.0014, 0.0009, 0.003, 80,
                     lobes=[(3, 0.3, 2.2), (5, 0.2, 0.7)], tears=[], tilt=0.04, samples=420, segments=180)
    mid.location = (0.033, 0.013, 0.0)
    mid.rotation_euler = (math.radians(-6), math.radians(14), math.radians(40))
    small.location = (-0.020, -0.017, 0.0)
    small.rotation_euler = (math.radians(12), math.radians(-8), math.radians(-70))
    big.rotation_euler = (math.radians(2), math.radians(-3), 0.0)
    for o in (mid, small):
        o["tex"] = 1024
    views = {"hero": (-25, 36, 0.46, 0.048), "low": (20, 4, 0.46, 0.045), "under": (10, -20, 0.42, 0.045)}
    return [big, mid, small], views
