"""Lactarius deliciosus (pinetell): depressed, vivid carrot-orange cap with
narrow concentric zones of darker orange flecks, paler salmon patches, a few
small green stains and a slight sheen; a softly rounded, paler margin over
fleshy cap flesh. Crowded, slightly decurrent carrot-orange gills with
lamellulae of mixed lengths, some forking near the stem and a little orange
latex; a pale salmon stem with glossy carrot-orange pits (scrobiculi) and a
little soil at the base."""
import random


def _polar_vec(g, across, along):
    """Object-space vector that changes `across` times per radian around the
    axis and `along` times per metre outwards (no seam), for noise that draws
    radial fibrils or, with a small `across`, short concentric streaks."""
    nrm = g.nt.nodes.new("ShaderNodeVectorMath")
    nrm.operation = "NORMALIZE"
    g.link(g.vec_scale(g.obj, 1, 1, 0), nrm.inputs[0])
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
    return add.outputs[0]


def _obj_z(g):
    sep = g.nt.nodes.new("ShaderNodeSeparateXYZ")
    g.link(g.obj, sep.inputs[0])
    return sep.outputs["Z"]


def _spot_mask(g, spots, soft=0.45, warp=None):
    """Soft mask of round/oval spots [(x, y, z, radius, elongation)] in
    object space (elongation stretches the spot vertically); `warp` (metres)
    roughens their outlines."""
    out = None
    for x, y, z, rad, el in spots:
        d = g.nt.nodes.new("ShaderNodeVectorMath")
        d.operation = "DISTANCE"
        g.link(g.vec_scale(g.obj, 1, 1, 1 / el), d.inputs[0])
        d.inputs[1].default_value = (x, y, z / el)
        dist = d.outputs["Value"] if warp is None else g.math("ADD", d.outputs["Value"], warp)
        one = g.remap(dist, rad, rad * soft)
        out = one if out is None else g.math("MAXIMUM", out, one)
    return out


def _blades(name, cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius, ranks, depth, seed,
            decurrent=0.004, stains=None, stain_mul=(0.0, 0.3, 0.5), margin_taper=0.85, edge_occlusion=0.88):
    """Radial gill blades under the cap. `ranks` lists (angle, t0, merge
    angle or None, depth factor): t0 is where the blade starts (0 = full
    gill from margin to stem, 1 = margin); a blade with a merge angle bends
    onto that neighbour as it ends, so the pair reads as a fork. Full gills
    run `decurrent` metres down the stem. Returns the object and each
    blade's free edge [(t, point, normal)]."""
    prof = catmull(cap_profile, samples)
    j_stem = samples - 1
    for j in range(j_start, samples):
        if prof[j].x <= stem_radius(prof[j].y) - 0.0006:
            j_stem = j
            break
    v_stem = j_stem / (samples - 1)

    def angle(th0, t0, merge, t):
        if merge is None:
            return th0
        return th0 + (merge - th0) * (1 - smooth(t0, t0 + 0.14, t))

    verts, faces, uvs, cols, edges = [], [], [], [], []
    rng = random.Random(3)
    steps = 60
    for gi, (th0, t0, merge, dj) in enumerate(ranks):
        tint = 0.95 + 0.05 * rng.random()
        pts = []
        for s in range(steps):
            t = 1 - (1 - t0) * s / (steps - 1)
            f = j_start + (1 - t) * (j_stem - j_start)
            j0 = min(int(f), samples - 2)
            pr = prof[j0].lerp(prof[j0 + 1], f - j0)
            tan = (prof[min(j0 + 1, samples - 1)] - prof[max(j0 - 1, 0)]).normalized()
            nr, nz = tan.y, -tan.x
            if nz > 0:
                nr, nz = -nr, -nz
            pts.append(("cap", t, pr.x, pr.y, nr, nz, f / (samples - 1)))
        if t0 == 0 and decurrent > 0:
            # Start down the stem from where this gill actually meets it
            # (the cap may be tilted), tapering to a thin ridge.
            z0 = Vector(cap_shape(th0, v_stem, prof[j_stem].x, prof[j_stem].y)).z
            for s in range(1, 11):
                z = z0 - decurrent * s / 10
                pts.append(("stem", -s / 10, stem_radius(z), z, 1.0, 0.0, 0.0))
        row, edge = [], []
        for kind, t, r, z, nr, nz, v in pts:
            th = angle(th0, t0, merge, t)
            n3 = Vector((nr * math.cos(th), nr * math.sin(th), nz))
            if kind == "cap":
                start = smooth(t0, t0 + 0.05, t) if t0 > 0 else 1.0
                if merge is not None:
                    start = 0.4 + 0.6 * start
                d = depth * dj * start * (1 - smooth(margin_taper, 1.0, t)) * (0.55 + 0.45 * smooth(0.0, 0.2, t))
                base = Vector(cap_shape(th, v, r, z))
                top, bot = base - n3 * 0.0005, base + n3 * d
            else:
                d = depth * 0.55 * (1 + t) ** 2.5
                top = Vector(stem_shape(th, 0.0, r - 0.0005, z))
                bot = Vector(stem_shape(th, 0.0, r + d, z))
            edge.append((t, bot, n3))
            stain = stains(gi, th, t) if stains else 0.0
            for e, pos in ((0, top), (1, bot)):
                row.append(len(verts))
                verts.append(pos)
                uvs.append((max(t, 0.0), e))
                occl = edge_occlusion if e == 0 else 1.0
                st = stain * (0.6 + 0.4 * e)
                cols.append([tint * occl * (1 - st * k) for k in stain_mul])
        edges.append(edge)
        for s in range(len(pts) - 1):
            a0, b0 = row[2 * s], row[2 * s + 2]
            faces.append((a0, b0, b0 + 1, a0 + 1))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    uv = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            uv.data[li].uv = uvs[mesh.loops[li].vertex_index]
    attr = mesh.color_attributes.new(name="Col", type="BYTE_COLOR", domain="POINT")
    for k, c in enumerate(cols):
        attr.data[k].color = (*c, 1.0)
    mesh.validate()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj["tex"] = 512
    return obj, edges


def _beads(name, items):
    """Small closed droplets [(centre, radius, vertical squash)], every face
    wound so its normal points out of the drop."""
    verts, faces, uvs = [], [], []
    n_lon, n_lat = 12, 8
    for c, rad, sq in items:
        rows = []
        for a in range(n_lat + 1):
            ph = math.pi * a / n_lat
            ring = []
            for b in range(n_lon):
                lo = 2 * math.pi * b / n_lon
                ring.append(len(verts))
                verts.append(c + Vector((rad * math.sin(ph) * math.cos(lo), rad * math.sin(ph) * math.sin(lo), rad * sq * math.cos(ph))))
                uvs.append((b / n_lon, 1 - a / n_lat))
            rows.append(ring)
        for a in range(n_lat):
            for b in range(n_lon):
                n = (b + 1) % n_lon
                f = [rows[a][b], rows[a][n], rows[a + 1][n], rows[a + 1][b]]
                if a == 0:
                    f = [rows[0][b], rows[1][n], rows[1][b]]
                elif a == n_lat - 1:
                    f = [rows[a][b], rows[a][n], rows[a + 1][b]]
                p = [verts[i] for i in f]
                nrm = (p[1] - p[0]).cross(p[2] - p[0])
                mid = sum(p, Vector()) / len(p)
                if nrm.dot(mid - c) < 0:
                    f.reverse()
                faces.append(f)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    uv = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            uv.data[li].uv = uvs[mesh.loops[li].vertex_index]
    mesh.validate()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj["tex"] = 64
    return obj


def build():
    seed = Vector((8.2, 3.6, 1.4))
    lift = 0.011  # a stem about half the cap diameter, as in mature field specimens

    # Depressed cap, fleshy (about 11 mm in the centre, 7-8 mm midway). The
    # margin is a plump, inrolled lip about 6 mm thick: the upper surface
    # curves round over the edge like a torus and continues underneath,
    # turning back in and up before the gills start just inside it.
    cap_profile = [(r, z + lift) for r, z in (
        (0.000, 0.0470), (0.008, 0.0477), (0.017, 0.0508), (0.027, 0.0545),
        (0.035, 0.0566), (0.040, 0.0580), (0.0462, 0.0576), (0.0491, 0.0560),
        (0.0506, 0.0530), (0.0501, 0.0494), (0.0481, 0.0469), (0.0453, 0.0463),
        (0.0430, 0.0474), (0.0350, 0.0482), (0.0265, 0.0452), (0.0190, 0.0414), (0.0148, 0.0385), (0.0118, 0.0352),
    )]
    samples = 170
    um = arc_fraction(cap_profile, 8)  # outermost point of the rounded lip
    ug = arc_fraction(cap_profile, 12)  # gills start just inside the roll

    def tilt(x, y):
        return 0.075 * x - 0.03 * y

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * 20 + seed
        edge = smooth(0.15, um, v)
        w = noise.noise(q) * 0.07 + noise.noise(q * 2.4) * 0.025 + noise.noise(q * 5.5) * 0.008
        lobes = (0.028 * math.sin(2 * th + 0.4) + 0.016 * math.sin(3 * th + 2.0) + 0.01 * math.sin(5 * th + 0.7)
                 + 0.005 * math.sin(9 * th + 1.3) + 0.018 * noise.noise(Vector((math.cos(th), math.sin(th), 0)) * 3 + seed))
        edge *= smooth(0.014, 0.03, r)
        r2 = r * (1 + (w + lobes) * edge)
        z2 = z + (w * 0.014 + lobes * 0.06) * edge
        top = 1 - smooth(um - 0.07, um - 0.02, v)
        z2 += (noise.noise(p * 40 + seed) * 0.0018 + noise.noise(p * 105 + seed) * 0.0005) * top
        dx, dy = p.x + 0.004, p.y - 0.003
        z2 -= 0.0032 * math.exp(-(dx * dx + dy * dy) / 0.014 ** 2) * top
        for cx, cy, rad, dep in ((0.026, -0.016, 0.005, 0.001), (-0.024, 0.02, 0.0045, 0.0009)):
            ex, ey = p.x - cx, p.y - cy
            z2 -= dep * math.exp(-(ex * ex + ey * ey) / rad ** 2) * top
        # The cap sits tilted and a little off-centre on the leaning stem.
        x, y = r2 * math.cos(th), r2 * math.sin(th)
        return (x + 0.0015, y - 0.001, z2 + tilt(x, y))

    # No flare: the stem runs straight up into the cap flesh so the gills
    # meet it directly and run a few millimetres down it (no collar).
    top_z = 0.0405 + lift
    stem_profile = [
        (0.0146, top_z), (0.0147, top_z - 0.005), (0.0145, 0.042), (0.0140, 0.034), (0.0129, 0.024), (0.0123, 0.013), (0.0118, 0.0075),
        (0.0108, 0.0035), (0.0092, 0.0005), (0.0070, -0.0017), (0.0044, -0.0030), (0.0015, -0.0036),
    ]
    sp = catmull(stem_profile, 240)

    def stem_radius(z):
        return min(sp, key=lambda p: abs(p.y - z)).x

    # Scrobiculi: glossy, shallow pits (angle, height, radius, elongation),
    # round to drop-shaped, a few merging into vertical smears lower down.
    rng = random.Random(21)
    pit_spots = []
    for k in range(19):
        th = (k * 2.39996 + rng.uniform(-0.25, 0.25)) % (2 * math.pi)
        z = rng.uniform(0.005, 0.043)
        rad = rng.uniform(0.0011, 0.0036)
        el = rng.choice((1.0, 1.2, 1.4, 1.7)) if z > 0.02 else rng.choice((1.3, 1.8, 2.6))
        pit_spots.append((th, z, rad, el))

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 25)) + seed
        r *= 1 + (noise.noise(p) * 0.045 + noise.noise(p * 3) * 0.015) * (1 - smooth(0.03, top_z, z))
        for pth, pz, prad, el in pit_spots:
            dth = (th - pth + math.pi) % (2 * math.pi) - math.pi
            d = math.sqrt((dth * 0.0135) ** 2 + ((z - pz) / el) ** 2) / prad
            if d < 1:
                r -= (0.0005 + 0.0002 * prad / 0.0036) * (1 - d * d) ** 2
        # The base leans out to one side, as a stem growing up through litter.
        k = (1 - min(z, top_z) / top_z) ** 1.6
        return (r * math.cos(th) - 0.0055 * k, r * math.sin(th) + 0.003 * k, z)

    cap = revolve("cap", cap_profile, 256, samples, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 200, 150, stem_shape, True, True)
    for d in stem.data.uv_layers[0].data:
        d.uv.y = min(max(d.uv.y, 0.003), 0.997)
    j_start = int(round(ug * (samples - 1)))

    # Gill layout: full gills at irregular spacing (about +-25%), one to
    # three lamellulae of mixed length (15, 35 and 60% of the radius) in each
    # gap, and some gills forking within 10 mm of the stem.
    count = 118
    grng = random.Random(8)
    full = [2 * math.pi * (k + grng.uniform(-0.25, 0.25)) / count for k in range(count)]
    ranks = []
    for k in range(count):
        a, b = full[k], full[(k + 1) % count] + (2 * math.pi if k == count - 1 else 0)
        ranks.append((a, 0.0, None, 1 + grng.uniform(-0.18, 0.18)))
        if grng.random() < 0.16:
            # A fork: a second blade from the margin that joins this gill near the stem.
            ranks.append((a + (b - a) * 0.5, grng.uniform(0.2, 0.3), a, 1 + grng.uniform(-0.15, 0.1)))
            continue
        n = grng.choice((1, 1, 2, 2, 3))
        lens = sorted(grng.sample((0.4, 0.65, 0.85), n))
        slots = [(i + 1) / (n + 1) for i in range(n)]
        grng.shuffle(slots)
        for t0, f in zip(lens, slots):
            ranks.append((a + (b - a) * (f + grng.uniform(-0.08, 0.08)), t0 + grng.uniform(-0.05, 0.05), None,
                          0.8 + grng.uniform(-0.1, 0.15)))

    # Carrot-orange latex: one damaged patch across a dozen gill edges and a
    # few small marks elsewhere.
    patch = (3.2, 3.55, 0.55)
    marks = {grng.randrange(len(ranks)): grng.uniform(0.3, 0.9) for _ in range(7)}

    def latex(gi, th, t):
        s = 0.0
        a0, a1, tc = patch
        dth = (th - a0) % (2 * math.pi)
        if dth <= a1 - a0:
            f = dth / (a1 - a0)
            s = math.exp(-((t - tc - 0.04 * math.sin(f * 5)) / 0.065) ** 2) * smooth(0.0, 0.15, f) * smooth(1.0, 0.85, f)
        if gi in marks:
            s = max(s, math.exp(-((t - marks[gi]) / 0.04) ** 2) * 0.8)
        return s

    gill, edges = _blades("gills", cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius, ranks, 0.0032,
                          seed, decurrent=0.0025, stains=latex, stain_mul=(0.1, 0.68, 0.92), margin_taper=0.74,
                          edge_occlusion=0.92)

    bead_items = []
    for th in (3.3, 3.45, 0.35):
        gi = min(range(len(ranks)), key=lambda i: abs(ranks[i][0] - th) + (1 if ranks[i][1] > 0 else 0))
        tc = patch[2] if th > 3 else 0.3
        t, pos, n3 = min(edges[gi], key=lambda e: abs(e[0] - tc))
        rad = grng.uniform(0.0008, 0.001)
        bead_items.append((pos + n3 * rad * 0.6, rad, 0.85))
    beads = _beads("latex", bead_items)

    # Cap: vivid carrot orange with paler salmon patches, 4-6 narrow
    # concentric zones of darker orange flecks, a few small green stains,
    # a paler rounded margin and a slight viscid sheen.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    rad = g.radial()
    big = g.noise(14, 4, 0.6, distortion=0.3)
    # Mottled salmon-orange: deeper orange zones, paler salmon patches and a
    # paler centre, never a flat orange.
    top = g.ramp(big, [(0.3, "#cf6f36"), (0.5, "#d98249"), (0.7, "#e2946a")])
    top = g.mix(g.remap(g.noise(5, 3, distortion=0.4), 0.48, 0.68, 0.0, 0.7), top, "#e8ad88")
    top = g.mix(g.remap(g.noise(8, 3, distortion=0.5), 0.55, 0.7, 0.0, 0.45), top, "#c55f28")
    top = g.mix(g.remap(rad, 0.014, 0.003, 0.0, 0.45), top, "#e6a882")
    warp = g.math("ADD", g.math("MULTIPLY", g.noise(22, 3, 0.6, distortion=0.8), 0.006),
                  g.math("MULTIPLY", g.noise(70, 3, 0.6), 0.0012))
    # Many dense concentric zones (colour only) of small brick-orange flecks
    # and short tangential streaks, wobbling and broken, with varying width
    # and spacing, some merging into blotches, between soft paler bands.
    phase = g.math("ADD", g.math("MULTIPLY", g.math("SUBTRACT", g.noise(5, 3, 0.55, distortion=0.6), 0.5), 12.0),
                     g.math("MULTIPLY", g.math("SUBTRACT", g.noise(15, 3, 0.6, distortion=0.8), 0.5), 7.0))
    wave = g.math("SINE", g.math("ADD", g.math("MULTIPLY", g.math("ADD", rad, warp), 1150.0), phase))
    width = g.math("MULTIPLY", g.math("SUBTRACT", g.noise(16, 3, 0.6), 0.5), 2.0)
    ring = g.remap(g.math("ADD", wave, width), -0.3, 1.0)
    pale = g.math("MULTIPLY", g.remap(wave, 0.1, -0.9, 0.0, 0.16), g.remap(g.noise(12, 2), 0.35, 0.6, 0.3, 1.0))
    span = g.math("MULTIPLY", g.remap(rad, 0.006, 0.013), g.remap(rad, 0.054, 0.05))
    ring = g.math("MULTIPLY", ring, span)
    ring = g.math("MULTIPLY", ring, g.remap(g.noise(14, 3, 0.6), 0.3, 0.6, 0.1, 1.0))
    blotch = g.math("MULTIPLY", g.remap(g.noise(24, 4, 0.6, distortion=0.7), 0.58, 0.72, 0.0, 0.7), span)
    ring = g.math("MAXIMUM", ring, blotch)
    top = g.mix(g.math("MULTIPLY", pale, span), top, "#efc9ad")
    flecks = g.remap(g.voronoi(700, rand=1.0), 0.5, 0.1)
    streaks = g.remap(g.noise(1, 3, 0.55, vec=_polar_vec(g, 10.0, 2000.0)), 0.5, 0.64)
    marks = g.math("MAXIMUM", flecks, streaks)
    zones = g.math("MULTIPLY", ring, g.lerp(marks, 0.3, 1.0))
    # Flecks carry on over the rolled rim.
    zones = g.math("MAXIMUM", zones, g.math("MULTIPLY", marks, g.remap(rad, 0.042, 0.047, 0.0, 0.75)))
    top = g.mix(g.math("MULTIPLY", zones, 0.85), top, g.ramp(g.noise(60, 2), [(0.4, "#b24c1e"), (0.65, "#c15a28")]))
    top = g.mix(0.12, top, g.noise(300, 3), "OVERLAY")
    # Paler, rounded lip, over the edge and round underneath to the gills.
    lip = g.math("MULTIPLY", g.remap(rad, 0.0475, 0.051), g.remap(g.v, ug + 0.002, ug - 0.006))
    top = g.mix(g.math("MULTIPLY", lip, 0.35), top, "#e6ae88")
    # Two or three small green stains, under 6 mm, mostly near the margin.
    gwarp = g.math("MULTIPLY", g.math("SUBTRACT", g.noise(90, 4, 0.7, distortion=0.6), 0.5), 0.004)
    stains = []
    for sth, sr, srad in ((1.1, 0.045, 0.0032), (4.2, 0.041, 0.0026), (5.4, 0.047, 0.0024)):
        x, y = sr * math.cos(sth) + 0.0015, sr * math.sin(sth) - 0.001
        stains.append((x, y, 0.0, srad, 1.0))
    gm = None
    for x, y, _, srad, _ in stains:
        d = g.nt.nodes.new("ShaderNodeVectorMath")
        d.operation = "DISTANCE"
        g.link(g.vec_scale(g.obj, 1, 1, 0), d.inputs[0])
        d.inputs[1].default_value = (x, y, 0)
        one = g.remap(g.math("ADD", d.outputs["Value"], gwarp), srad, srad * 0.4)
        gm = one if gm is None else g.math("MAXIMUM", gm, one)
    top = g.mix(g.math("MULTIPLY", gm, 0.85), top, g.ramp(g.noise(80, 3), [(0.35, "#5f6a3a"), (0.65, "#76773f")]))
    under = g.remap(g.v, ug - 0.004, ug + 0.006)
    colour = g.mix(under, top, "#e57e36")
    roughness = g.lerp(under, g.remap(g.noise(30, 2), 0.3, 0.7, 0.4, 0.5), 0.72)
    # Smooth cap with only a very fine, uniform frosted and pitted texture;
    # the zones are colour only.
    pits = g.remap(g.voronoi(900, rand=1.0), 0.18, 0.0)
    height = g.math("SUBTRACT", g.math("MULTIPLY", g.noise(420, 4, 0.7), 0.4), g.math("MULTIPLY", pits, 0.25))
    g.finish(colour, roughness, height, 0.2, 0.0003)
    cap.data.materials.append(m)

    # Gills: carrot orange, brighter than the cap, paler along the free edge.
    m = bpy.data.materials.new("gills-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#f39650"), (0.1, "#f28e40"), (0.45, "#f69a48"), (1.0, "#f8a656")])
    col = g.mix(g.remap(g.uvy, 0.6, 1.0, 0.0, 0.35), col, "#f8b670")
    col = g.mix(0.12, col, g.noise(40, 2, vec=g.vec_scale(g.obj, 1, 1, 1)), "OVERLAY")
    g.finish(col, 0.68, g.noise(200, 2), 0.1, 0.0002)
    gill.data.materials.append(m)

    m = bpy.data.materials.new("latex-proc")
    g = Graph(m)
    g.finish(g.ramp(g.noise(300, 2), [(0.4, "#d8521a"), (0.6, "#e25e1e")]), 0.12, g.noise(100, 1), 0.0, 0.0001)
    beads.data.materials.append(m)

    # Stem: pale salmon with a whitish bloom in the upper third, glossy
    # carrot-orange pits (darker rim), and soil at the base.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    z = _obj_z(g)
    base = g.ramp(g.noise(40, 4), [(0.35, "#e8b690"), (0.65, "#f0c29c")])
    base = g.mix(g.remap(g.noise(9, 3, distortion=0.3), 0.45, 0.65, 0.0, 0.4), base, "#e8a878")
    base = g.mix(0.2, base, g.noise(260, 2, vec=g.vec_scale(g.obj, 1, 1, 0.1)), "OVERLAY")
    base = g.mix(g.remap(g.math("ADD", z, g.math("MULTIPLY", g.noise(40, 2), 0.004)), 0.034, 0.05, 0.0, 0.55), base, "#f4dcc2")
    spots = []
    for pth, pz, prad, el in pit_spots:
        x, y, zz = stem_shape(pth, 0.0, stem_radius(pz), pz)
        spots.append((x, y, zz, prad * 1.05, el))
    ragged = g.math("MULTIPLY", g.math("SUBTRACT", g.noise(260, 3, 0.6), 0.5), 0.002)
    pit = _spot_mask(g, spots, 0.6, ragged)
    core = _spot_mask(g, [(x, y, zz, r * 0.8, el) for x, y, zz, r, el in spots], 0.35, ragged)
    pitcol = g.mix(core, "#c9561a", g.ramp(g.noise(80, 2), [(0.4, "#dc621e"), (0.6, "#e46e28")]))
    base = g.mix(pit, base, pitcol)
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.003)
    # Only a faint soil tint on the lowest few millimetres of the rounded foot.
    band = g.remap(g.math("ADD", z, side), 0.004, -0.003)
    soil = g.math("MULTIPLY", band, g.remap(g.noise(70, 5, 0.65), 0.35, 0.55, 0.15, 0.4))
    colour = g.mix(soil, base, g.ramp(g.noise(50, 3), [(0.4, "#9c7c5e"), (0.65, "#b09070")]))
    roughness = g.math("MAXIMUM", g.lerp(core, 0.72, 0.3), g.math("MULTIPLY", soil, 0.9))
    height = g.math("SUBTRACT", g.math("MULTIPLY", g.noise(200, 3), 0.3), g.math("MULTIPLY", pit, 0.3))
    g.finish(colour, roughness, height, 0.35, 0.0006)
    stem.data.materials.append(m)

    for o in (cap, stem, beads):
        o.data.materials[0].use_backface_culling = True
    views = {"hero": (-30, 26, 0.46, 0.038), "low": (25, 4, 0.44, 0.04), "under": (15, -26, 0.34, 0.048)}
    return [cap, stem, gill, beads], views
