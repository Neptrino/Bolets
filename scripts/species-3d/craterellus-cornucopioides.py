"""Craterellus cornucopioides (trompeta de la mort): a small group of deep,
hollow, thin-fleshed trumpets. The outer (fertile) face is ash-grey with low
lengthwise wrinkles, darker down the tube; the inner face is brown-black with
flat, darker fibrillose scales; the thin margin is wavy, split in places and
rolled outwards and back.

Each trumpet is one closed surface of revolution whose profile climbs the
outside of a thin sheet, turns over the rolled lip and runs back down the
inside to a hollow bottom. The narrow feet sink into the litter and fuse
where they touch; there is no shared pedestal."""


def _trumpet_profile(height, mouth, base_r, wall_base, wall_rim, curl_r, curl_deg):
    """(profile, lip_index, midline): outside up, round the lip, inside down."""
    mid = []
    z_foot = -0.004
    steps = 70
    for s in range(steps + 1):
        u = s / steps
        z = z_foot + (height - z_foot) * u
        # The foot narrows over the lower 40% into the litter; the funnel
        # widens gradually over the upper half.
        taper = 0.72 + 0.28 * smooth(0.0, 0.4, u)
        flare = 0.18 * u ** 1.5 + 0.82 * max(0.0, (u - 0.38) / 0.62) ** 1.7
        mid.append(Vector((base_r * taper + (mouth - base_r) * flare, z)))
    # The margin turns outwards and rolls down and back.
    t = (mid[-1] - mid[-2]).normalized()
    ang = math.atan2(t.y, t.x)
    centre = mid[-1] + Vector((math.cos(ang - math.pi / 2), math.sin(ang - math.pi / 2))) * curl_r
    a0 = ang + math.pi / 2
    for s in range(1, 15):
        a = a0 - math.radians(curl_deg) * s / 14
        mid.append(centre + Vector((math.cos(a), math.sin(a))) * curl_r)
    n = len(mid)
    outer, inner = [], []
    for k in range(n):
        tan = (mid[min(k + 1, n - 1)] - mid[max(k - 1, 0)]).normalized()
        nrm = Vector((tan.y, -tan.x))  # outward for an upward-running midline
        f = k / (n - 1)
        h = 0.5 * (wall_base + (wall_rim - wall_base) * f ** 0.7)
        outer.append(mid[k] + nrm * h)
        inner.append(mid[k] - nrm * h)
    tip_t = (mid[-1] - mid[-2]).normalized()
    hr = 0.5 * wall_rim
    lip = [mid[-1] + (outer[-1] - mid[-1]) * 0.7 + tip_t * hr * 0.7, mid[-1] + tip_t * hr,
           mid[-1] + (inner[-1] - mid[-1]) * 0.7 + tip_t * hr * 0.7]
    ob = outer[0].x
    # Hollow down to just above the ground; the buried foot is closed and round.
    ib = inner[8].x
    profile = [(0.0, z_foot - 0.0022), (ob * 0.6, z_foot - 0.0018), (ob * 0.92, z_foot - 0.0008)]
    profile += [(p.x, p.y) for p in outer]
    lip_index = len(profile) + 1
    profile += [(p.x, p.y) for p in lip]
    profile += [(p.x, p.y) for p in reversed(inner[8:])]
    zb = inner[8].y
    profile += [(ib * 0.75, zb - 0.0012), (ib * 0.35, zb - 0.0018), (0.0, zb - 0.0019)]
    return profile, lip_index, mid


def _trumpet(name, seed, height, mouth, base_r, wall_base, wall_rim, curl_r, curl_deg,
             lobes, tears, tilt, tilt_dir, splay_dir=0.0, splay=0.0, squash=0.0, squash_dir=0.0,
             samples=560, segments=240):
    profile, lip_index, mid = _trumpet_profile(height, mouth, base_r, wall_base, wall_rim, curl_r, curl_deg)
    vl = arc_fraction(profile, lip_index)
    flare0 = base_r + (mouth - base_r) * 0.2
    # Every displacement is evaluated at the nearest point of the sheet's
    # midline, so the outer and inner faces of the same spot move together.
    # Displacements vary slowly compared with the wall thickness so the thin
    # wall never folds through itself.
    dense = catmull([(p.x, p.y) for p in mid], 1800)
    prof = catmull(profile, samples)
    anchor = [min(dense, key=lambda q: (q - pt).length_squared) for pt in prof]
    k_mouth = mouth / 0.027

    def shape(th, v, r, z):
        j = int(round(v * (samples - 1)))
        rm, zm = anchor[j].x, anchor[j].y
        dirn = Vector((math.cos(th), math.sin(th), 0.0))
        fl = smooth(flare0, mouth + curl_r, rm)
        uz = max(0.0, min(1.0, zm / height))
        # Broad undulations of the margin.
        wave = sum(a * math.sin(k * th + ph) for k, a, ph in lobes)
        wave += 0.3 * noise.noise(dirn * 2.5 + seed)
        dr = rm * 0.16 * wave * fl
        dz = 0.011 * wave * fl * k_mouth
        # Finer crisping of the edge: smooth waves, not teeth.
        crisp = math.sin(11 * th + 2.5 * noise.noise(dirn * 2 + seed * 0.4))
        dz += 0.0016 * crisp * fl ** 3 * k_mouth
        dz += 0.0022 * noise.noise(dirn * 6 + seed * 1.3) * fl ** 2 * k_mouth
        dr += 0.0012 * noise.noise(dirn * 8 + seed * 2.7) * fl ** 2 * k_mouth
        # Mouth tilted to one side, one side of the rim lower than the other.
        dz += math.tan(tilt) * rm * math.cos(th - tilt_dir) * smooth(0.0, 0.7, uz)
        # Splits: a few sectors where the margin drops away with smooth edges.
        for t0, w, d, reach in tears:
            dth = abs(math.atan2(math.sin(th - t0), math.cos(th - t0)))
            cut = (1 - smooth(w * 0.2, w, dth)) ** 1.5
            depth_mask = smooth(1 - reach, 1.0, uz)
            dz -= d * cut * depth_mask
            dr -= 0.15 * d * cut * depth_mask
        # The margin sags further in places, as in older fruitbodies.
        dz -= 0.2 * mouth * max(0.0, noise.noise(dirn * 3.2 + seed * 0.7)) * fl ** 3
        # Low lengthwise wrinkles and veins along the whole outer length:
        # fast round the tube, slow along it, forking where the noise does.
        q = Vector((rm * math.cos(th) * 520, rm * math.sin(th) * 520, zm * 45)) + seed
        vein = noise.noise(q) + 0.45 * noise.noise(q * 2.1 + Vector((3.1, 0.4, 7.7)))
        dr += 0.0009 * vein * smooth(0.03, 0.25, uz) * (1 - 0.85 * smooth(0.35, 1.0, fl))
        # A gentle bow in the tube.
        bend = 0.004 * (height / 0.085) * math.sin(math.pi * uz * 0.9)
        off = splay * height * uz ** 1.8
        x = (r + dr) * math.cos(th)
        y = (r + dr) * math.sin(th)
        # A collapsed specimen: the funnel pressed flat into an oval.
        if squash:
            c, s_ = math.cos(squash_dir), math.sin(squash_dir)
            a_ = x * c + y * s_
            b_ = -x * s_ + y * c
            a_ *= 1 - squash * smooth(0.2, 0.8, uz)
            b_ *= 1 + 0.35 * squash * smooth(0.2, 0.8, uz)
            x, y = a_ * c - b_ * s_, a_ * s_ + b_ * c
        x += bend + off * math.cos(splay_dir)
        y += 0.3 * bend + off * math.sin(splay_dir)
        return (x, y, z + dz)

    obj = revolve(name, profile, segments, samples, shape, True, True)
    # The profile runs up the outside and back down the inside, the reverse of
    # revolve()'s usual direction, so its faces come out pointing into the wall.
    obj.data.flip_normals()

    m = bpy.data.materials.new(f"{name}-proc")
    g = Graph(m)
    inside = g.remap(g.v, vl - 0.003, vl + 0.003)
    sep = g.nt.nodes.new("ShaderNodeSeparateXYZ")
    g.link(g.obj, sep.inputs[0])
    uz = g.math("DIVIDE", sep.outputs["Z"], height)
    # Outside: cool ash-grey, darker down the tube, with a pale powdery bloom
    # on the upper flare and dark lengthwise veins.
    veins = g.noise(260, 4, 0.6, vec=g.vec_scale(g.obj, 1, 1, 0.08), distortion=0.3)
    body = g.ramp(g.noise(30, 4, 0.6), [(0.35, "#716c66"), (0.65, "#837d77")])
    body = g.mix(g.remap(uz, 0.6, 0.05, 0.0, 0.8), body, "#4c4843")
    bloom = g.math("MULTIPLY", g.remap(g.noise(16, 4, 0.6, distortion=0.5), 0.45, 0.65, 0.0, 0.6), g.remap(uz, 0.5, 0.9))
    body = g.mix(bloom, body, "#a09b95")
    body = g.mix(g.remap(veins, 0.5, 0.7, 0.0, 0.6), body, "#48443f")
    body = g.mix(g.remap(veins, 0.3, 0.42, 0.3, 0.0), body, "#8e8983")
    body = g.mix(0.18, body, g.noise(350, 2), "OVERLAY")
    soil = g.math("MULTIPLY", g.remap(uz, 0.14, 0.0), g.remap(g.noise(70, 5, 0.65), 0.3, 0.5, 0.3, 0.95))
    body = g.mix(soil, body, "#3f3026")
    # Inside: brown-black with flat, darker, fibrillose scales, denser to the rim.
    inner = g.ramp(g.noise(40, 4, 0.6), [(0.35, "#2e2826"), (0.65, "#3c3431")])
    inner = g.mix(g.remap(g.noise(35, 4, 0.6, distortion=0.4), 0.55, 0.7, 0.0, 0.35), inner, "#3e342e")
    fib = g.noise(260, 3, 0.6, vec=g.vec_scale(g.obj, 1, 1, 0.25), distortion=0.6)
    # Torn, irregular flakes rather than round dots: warp the cell lattice
    # and roughen each flake's edge with fine noise.
    wn = g.nt.nodes.new("ShaderNodeTexNoise")
    wn.inputs["Scale"].default_value = 260
    wn.inputs["Detail"].default_value = 4
    g.link(g.obj, wn.inputs["Vector"])
    wsc = g.nt.nodes.new("ShaderNodeVectorMath")
    wsc.operation = "SCALE"
    wsc.inputs["Scale"].default_value = 0.004
    g.link(wn.outputs["Color"], wsc.inputs[0])
    warp = g.nt.nodes.new("ShaderNodeVectorMath")
    warp.operation = "ADD"
    g.link(g.vec_scale(g.obj, 1, 1, 0.2), warp.inputs[0])
    g.link(wsc.outputs[0], warp.inputs[1])
    scale_d = g.voronoi(480, vec=warp.outputs[0], rand=1.0)
    scale_d = g.math("ADD", scale_d, g.math("MULTIPLY", g.math("SUBTRACT", g.noise(700, 4, 0.7), 0.5), 0.45))
    density = g.remap(uz, 0.3, 0.95, 0.25, 0.95)
    scales = g.math("MULTIPLY", g.remap(scale_d, 0.04, 0.42, 1.0, 0.0), g.remap(fib, 0.3, 0.62, 0.35, 1.0))
    scales = g.math("MULTIPLY", scales, g.math("MULTIPLY", g.remap(g.noise(22, 2), 0.35, 0.6, 0.55, 1.0), density))
    inner = g.mix(g.remap(uz, 0.7, 1.0, 0.0, 0.4), inner, "#3f3733")
    inner = g.mix(g.remap(uz, 0.6, 0.1, 0.0, 0.7), inner, "#15110f")
    inner = g.mix(g.math("MINIMUM", g.math("MULTIPLY", scales, 1.1), 0.55), inner, "#0e0b0a")
    inner = g.mix(0.2, inner, fib, "OVERLAY")
    colour = g.mix(inside, body, inner)
    roughness = g.lerp(inside, g.remap(g.noise(25, 2), 0.3, 0.7, 0.66, 0.8), 0.84)
    h_out = g.math("ADD", g.math("MULTIPLY", veins, 1.2), g.math("MULTIPLY", g.noise(200, 3), 0.06))
    h_in = g.math("ADD", g.math("MULTIPLY", scales, 0.45), g.math("MULTIPLY", fib, 0.3))
    g.finish(colour, roughness, g.lerp(inside, h_out, h_in), 0.5, 0.0005)
    obj.data.materials.append(m)
    obj.data.materials[0].use_backface_culling = True
    return obj


def build():
    big = _trumpet("trumpet-a", Vector((3.3, 1.1, 7.2)), 0.088, 0.026, 0.0042, 0.0014, 0.0005, 0.0036, 145,
                   lobes=[(3, 0.35, 0.4), (5, 0.2, 2.0), (2, 0.15, 1.1)],
                   tears=[(2.3, 0.14, 0.012, 0.18), (4.6, 0.09, 0.007, 0.12)],
                   tilt=math.radians(14), tilt_dir=2.6, splay_dir=math.radians(125), splay=0.08)
    # This one carries a lengthwise split down one side.
    mid = _trumpet("trumpet-b", Vector((8.1, 4.4, 2.6)), 0.066, 0.02, 0.0036, 0.0013, 0.0005, 0.003, 140,
                   lobes=[(2, 0.3, 1.3), (4, 0.25, 0.2), (6, 0.1, 2.5)],
                   tears=[(2.06, 0.24, 0.015, 0.35), (1.4, 0.1, 0.006, 0.12)],
                   tilt=math.radians(18), tilt_dir=-0.4, splay_dir=math.radians(-10), splay=0.62)
    # A small, collapsed trumpet pressed into an oval.
    small = _trumpet("trumpet-c", Vector((1.7, 9.5, 5.3)), 0.046, 0.014, 0.0028, 0.0012, 0.00045, 0.0024, 110,
                     lobes=[(3, 0.3, 2.2), (5, 0.2, 0.7)], tears=[(0.8, 0.12, 0.006, 0.15)],
                     tilt=math.radians(12), tilt_dir=3.6, splay_dir=math.radians(285), splay=0.5,
                     squash=0.4, squash_dir=0.6, samples=460, segments=200)
    # One clump: the narrow feet touch and fuse in the litter, then splay out.
    for o, x, y, spin in ((big, 0.0, 0.0, 0.0), (mid, 0.0056, 0.0024, 40.0), (small, -0.0046, -0.0032, -70.0)):
        o.location = (x, y, 0.0)
        o.rotation_euler = (0.0, 0.0, math.radians(spin))
    for o in (mid, small):
        o["tex"] = 1024
    views = {"hero": (-25, 36, 0.46, 0.048), "low": (20, 4, 0.46, 0.045), "under": (10, -20, 0.42, 0.045)}
    return [big, mid, small], views
