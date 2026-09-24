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
        # The foot swells slightly where it fuses with its neighbours.
        r = base_r * (1 + 0.45 * (1 - smooth(0.0, 0.16, u))) + (mouth - base_r) * (0.55 * u ** 1.4 + 0.45 * u ** 6)
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
    ob = base_r * 1.45 + wall_base / 2
    ib = base_r * 1.45 - wall_base / 2
    profile = [(0.0, -0.0025), (ob * 0.55, -0.0022), (ob * 0.92, -0.0005), (ob, z0 * 0.6)]
    profile += [(p.x, p.y) for p in outer]
    lip_index = len(profile) + 1
    profile += [(p.x, p.y) for p in lip]
    profile += [(p.x, p.y) for p in reversed(inner)]
    profile += [(ib * 0.9, z0 * 1.2), (ib * 0.6, z0 * 1.5), (0.0, z0 * 1.6)]
    return profile, lip_index, mid


def _trumpet(name, seed, height, mouth, base_r, wall_base, wall_rim, curl_r, curl_deg,
             lobes, tears, tilt, splay_dir=0.0, splay=0.0, samples=520, segments=220):
    profile, lip_index, mid = _trumpet_profile(height, mouth, base_r, wall_base, wall_rim, curl_r, curl_deg)
    vl = arc_fraction(profile, lip_index)
    flare0 = base_r + (mouth - base_r) * 0.25
    # Map every resampled profile point to its nearest point on the sheet's
    # midline. All displacements are evaluated there, so the outer and inner
    # faces of the same spot move together and the wall never self-intersects.
    dense = catmull([(p.x, p.y) for p in mid], 1600)
    prof = catmull(profile, samples)
    anchor = [min(dense, key=lambda q: (q - pt).length_squared) for pt in prof]
    k_mouth = mouth / 0.027

    def shape(th, v, r, z):
        j = int(round(v * (samples - 1)))
        rm, zm = anchor[j].x, anchor[j].y
        dirn = Vector((math.cos(th), math.sin(th), 0.0))
        fl = smooth(flare0, mouth + curl_r, rm)
        uz = max(0.0, min(1.0, zm / height))
        wave = sum(a * math.sin(k * th + ph) for k, a, ph in lobes)
        wave += 0.35 * noise.noise(dirn * 2.5 + seed) + 0.12 * noise.noise(dirn * 7 + seed)
        dr = rm * (0.16 * wave * fl + 0.05 * noise.noise(Vector((math.cos(th), math.sin(th), zm * 30)) + seed) * uz)
        dz = 0.010 * wave * fl * k_mouth + tilt * mouth * math.cos(th - 0.9) * fl
        # Splits: narrow sectors where the margin drops sharply into the flare.
        for t0, w, d in tears:
            dth = abs(math.atan2(math.sin(th - t0), math.cos(th - t0)))
            cut = 1 - smooth(w * 0.25, w, dth)
            dz -= d * cut * fl ** 1.5
            dr -= 0.25 * d * cut * fl ** 1.5
        # Faint lengthwise wrinkles on the tube.
        dr += 0.00022 * noise.noise(dirn * 9 + Vector((0, 0, zm * 9)) + seed) * smooth(0.15, 0.6, uz)
        # Crumpled flare: irregular folds and puckers, strongest towards the margin.
        q = Vector((rm * math.cos(th), rm * math.sin(th), zm)) * 150 + seed
        q2 = q * 2.3
        pk = fl ** 1.2
        dz += (0.0026 * noise.noise(q) + 0.0009 * noise.noise(q2)) * pk * k_mouth
        dr += (0.0018 * noise.noise(q + Vector((7.1, 2.3, 5.5))) + 0.0006 * noise.noise(q2 + Vector((1.3, 8.8, 0.4)))) * pk * k_mouth
        pleat = math.sin(9 * th + 3.5 * noise.noise(dirn * 2 + Vector((0, 0, zm * 25)) + seed))
        dz += 0.0022 * pleat * fl ** 2 * k_mouth
        dz += 0.09 * mouth * noise.noise(dirn * 11 + seed * 1.3) * fl ** 2
        # Ragged margin: small irregular nicks right at the edge.
        rag = smooth(0.85, 1.0, fl)
        dz -= 0.004 * k_mouth * max(0.0, noise.noise(dirn * 34 + seed * 2.1)) ** 1.5 * rag
        # The margin folds down further in places, as in older fruitbodies.
        dz -= 0.35 * mouth * max(0.0, noise.noise(dirn * 3.2 + seed * 0.7)) * fl ** 4
        # A gentle bow in the tube.
        bend = 0.004 * (height / 0.085) * math.sin(math.pi * uz * 0.9)
        # Clumped trumpets rise from a shared foot and curve outwards, the
        # mouth turning to face away from the clump.
        off = splay * height * uz ** 1.8
        dz -= 0.3 * splay * rm * math.cos(th - splay_dir) * fl
        x = (r + dr) * math.cos(th) + bend + off * math.cos(splay_dir)
        y = (r + dr) * math.sin(th) + 0.3 * bend + off * math.sin(splay_dir)
        return (x, y, z + dz)

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
    soil = g.math("MULTIPLY", g.remap(uz, 0.2, 0.04), g.remap(g.noise(70, 5, 0.65), 0.36, 0.52, 0.0, 0.85))
    body = g.mix(soil, body, "#4b3a2b")
    # Inside: dark brown-black, finely scaly and rough, a touch paler near the lip.
    # Fine, irregular scaly roughness rather than regular dots.
    scale_d = g.voronoi(900, vec=g.vec_scale(g.obj, 1, 1, 0.7), rand=1.0)
    scales = g.math("MULTIPLY", g.remap(scale_d, 0.05, 0.35, 1.0, 0.0), g.remap(g.noise(60, 3), 0.4, 0.62, 0.2, 1.0))
    inner = g.ramp(g.noise(40, 4, 0.6), [(0.35, "#2f2621"), (0.65, "#3d322a")])
    inner = g.mix(g.math("MULTIPLY", scales, 0.35), inner, "#4b3e34")
    inner = g.mix(g.remap(g.noise(35, 4, 0.6, distortion=0.4), 0.55, 0.7, 0.0, 0.4), inner, "#4e4036")
    inner = g.mix(g.remap(uz, 0.75, 0.15, 0.0, 0.75), inner, "#1c1512")
    # Scurfy: tiny paler flakes over the dark ground.
    flakes = g.math("MULTIPLY", g.remap(g.voronoi(1500, rand=1.0), 0.0, 0.18, 1.0, 0.0), g.remap(g.noise(120, 3), 0.45, 0.6))
    inner = g.mix(g.math("MULTIPLY", flakes, 0.5), inner, "#5b4c40")
    inner = g.mix(0.25, inner, g.noise(300, 2), "OVERLAY")
    colour = g.mix(inside, body, inner)
    roughness = g.lerp(inside, g.remap(g.noise(25, 2), 0.3, 0.7, 0.62, 0.74), 0.86)
    h_out = g.math("ADD", g.math("MULTIPLY", streak, 0.6), g.math("MULTIPLY", g.noise(200, 3), 0.2))
    h_in = g.math("ADD", g.math("MULTIPLY", g.math("ADD", scales, flakes), 1.4), g.math("MULTIPLY", g.noise(150, 4, 0.7), 0.6))
    g.finish(colour, roughness, g.lerp(inside, h_out, h_in), 0.45, 0.0005)
    obj.data.materials.append(m)
    obj.data.materials[0].use_backface_culling = True
    return obj


def _base(seed, axis_angle):
    """Low, lumpy fused base where the trumpets grow together from the litter."""
    profile = [(0.0, 0.0055), (0.005, 0.0052), (0.0088, 0.0038), (0.0110, 0.0018),
               (0.0114, 0.0002), (0.0098, -0.0016), (0.0050, -0.0026), (0.0, -0.0028)]

    def shape(th, v, r, z):
        dirn = Vector((math.cos(th), math.sin(th), 0.0))
        along = math.cos(th - axis_angle)
        r *= (0.86 + 0.34 * along * along) * (1 + 0.1 * noise.noise(dirn * 3 + seed) + 0.03 * noise.noise(dirn * 6 + seed))
        z += 0.0015 * noise.noise(dirn * 4 + seed * 1.7) * smooth(0.0, 0.3, v)
        return (r * math.cos(th), r * math.sin(th), z)

    obj = revolve("base", profile, 160, 60, shape, True, True)
    m = bpy.data.materials.new("base-proc")
    g = Graph(m)
    sep = g.nt.nodes.new("ShaderNodeSeparateXYZ")
    g.link(g.obj, sep.inputs[0])
    col = g.ramp(g.noise(60, 4, 0.6), [(0.35, "#5f5a54"), (0.65, "#6f6962")])
    col = g.mix(0.3, col, g.noise(40, 3, 0.55, vec=g.vec_scale(g.obj, 1, 1, 0.15)), "OVERLAY")
    soil = g.math("MAXIMUM", g.remap(sep.outputs["Z"], 0.009, 0.0, 0.2, 0.95),
                  g.remap(g.noise(55, 5, 0.65), 0.45, 0.58, 0.0, 0.8))
    soil = g.math("MULTIPLY", soil, g.remap(g.noise(90, 4, 0.6), 0.3, 0.5, 0.55, 1.0))
    col = g.mix(soil, col, g.ramp(g.noise(30, 3), [(0.4, "#3e2f23"), (0.65, "#5a4634")]))
    g.finish(col, 0.84, g.noise(180, 4, 0.6), 0.5, 0.0006)
    obj.data.materials.append(m)
    obj.data.materials[0].use_backface_culling = True
    obj["tex"] = 512
    return obj


def build():
    big = _trumpet("trumpet-a", Vector((3.3, 1.1, 7.2)), 0.085, 0.027, 0.0046, 0.0017, 0.0011, 0.0045, 120,
                   lobes=[(3, 0.35, 0.4), (5, 0.25, 2.0), (7, 0.12, 1.1)],
                   tears=[(2.3, 0.10, 0.016), (4.6, 0.07, 0.010)], tilt=0.06,
                   splay_dir=math.radians(125), splay=0.08)
    mid = _trumpet("trumpet-b", Vector((8.1, 4.4, 2.6)), 0.064, 0.021, 0.0040, 0.0015, 0.0010, 0.0038, 100,
                   lobes=[(2, 0.3, 1.3), (4, 0.3, 0.2), (6, 0.12, 2.5)], tears=[(5.2, 0.14, 0.010)], tilt=0.05,
                   splay_dir=math.radians(30 - 40), splay=0.72)
    small = _trumpet("trumpet-c", Vector((1.7, 9.5, 5.3)), 0.043, 0.0135, 0.0033, 0.0014, 0.0009, 0.003, 80,
                     lobes=[(3, 0.3, 2.2), (5, 0.2, 0.7)], tears=[(0.8, 0.09, 0.006)], tilt=0.04,
                     splay_dir=math.radians(215 + 70), splay=0.55,
                     samples=420, segments=180)
    # One clump: the bases stand close together and splay outwards.
    for o, x, y, spin in ((big, 0.001, 0.001, 0.0), (mid, 0.0095, 0.005, 40.0), (small, -0.008, -0.006, -70.0)):
        o.location = (x, y, 0.0)
        o.rotation_euler = (0.0, 0.0, math.radians(spin))
    base = _base(Vector((4.4, 2.2, 9.1)), math.radians(35))
    base.location = (0.0005, 0.0, 0.0)
    for o in (mid, small):
        o["tex"] = 1024
    views = {"hero": (-25, 36, 0.46, 0.048), "low": (20, 4, 0.46, 0.045), "under": (10, -20, 0.42, 0.045)}
    return [big, mid, small, base], views
