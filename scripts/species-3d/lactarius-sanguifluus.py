"""Lactarius sanguifluus (rovelló): convex, centrally depressed cap in a dull
apricot-salmon with a wine-pink centre, faint zones of darker spots and a few
small verdigris bruises at the margin, matte and a little frosted; a thick
margin rolled down and inwards. Straight, continuous, crowded, slightly
decurrent wine-pink gills with wine-red latex streaks and beads; a short,
buff-pink stem with a few shallow wine-orange pits (scrobiculi) and a
rounded, soiled base."""
import random


def _radial_fibres(g, across, along):
    """Object-space vector that changes fast around the axis and slowly
    outwards, so noise sampled with it draws radial fibrils without a seam."""
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


def _blades(name, cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius, count, depth, seed,
            decurrent=0.003, lam=(0.5, 0.7), stains=None, stain_mul=(0.45, 0.9, 0.85),
            margin_taper=0.8, edge_occlusion=0.9):
    """Straight radial gill blades, as the shared gills() helper, but with
    longer lamellulae (one per gap, reaching `lam` of the way in) and a
    record of every blade's free edge so latex beads can sit on it."""
    prof = catmull(cap_profile, samples)
    j_stem = samples - 1
    for j in range(j_start, samples):
        if prof[j].x <= stem_radius(prof[j].y) - 0.0006:
            j_stem = j
            break

    def path(t0):
        pts = []
        steps = 56
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
            z0 = prof[j_stem].y
            for s in range(1, 9):
                z = z0 - decurrent * s / 8
                pts.append(("stem", -s / 8, stem_radius(z), z, 1.0, 0.0, 0.0))
        return pts

    rng = random.Random(int(seed.x * 1000))
    ranks = []
    for k in range(count):
        base = 2 * math.pi * k / count
        ranks.append((base, 0.0))
        ranks.append((base + math.pi / count * (1 + rng.uniform(-0.15, 0.15)), rng.uniform(*lam)))
    verts, faces, uvs, cols = [], [], [], []
    edges = []
    for gi, (th0, t0) in enumerate(ranks):
        tint = 0.96 + 0.04 * rng.random()
        dj = 1 + rng.uniform(-0.08, 0.08)
        row, edge = [], []
        pts = path(t0)
        for kind, t, r, z, nr, nz, v in pts:
            th = th0
            n3 = Vector((nr * math.cos(th), nr * math.sin(th), nz))
            if kind == "cap":
                start = smooth(t0, t0 + 0.05, t) if t0 > 0 else 1.0
                d = depth * dj * start * (1 - smooth(margin_taper, 1.0, t)) * (0.55 + 0.45 * smooth(0.0, 0.2, t))
                base = Vector(cap_shape(th, v, r, z))
                top, bot = base - n3 * 0.0005, base + n3 * d
            else:
                d = depth * 0.55 * (1 + t) ** 2.5
                top = Vector(stem_shape(th, 0.0, r - 0.0004, z))
                bot = Vector(stem_shape(th, 0.0, r + d, z))
            edge.append((t, bot, n3))
            stain = stains(gi, th, t) if stains else 0.0
            for e, pos in ((0, top), (1, bot)):
                row.append(len(verts))
                verts.append(pos)
                uvs.append((max(t, 0.0), e))
                # Ease the root shading off near the stem, where the crowded
                # blades already shade each other.
                occl = 1 - (1 - edge_occlusion) * smooth(0.0, 0.3, t) if e == 0 else 1.0
                st = stain * (0.7 + 0.3 * e)
                cols.append([tint * occl * (1 - st * k) for k in stain_mul])
        edges.append((th0, t0, edge))
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
    seed = Vector((5.3, 1.9, 8.4))
    lift = 0.009  # visible stem about 0.45 x cap diameter

    # Convex with a shallow central depression. The flesh thins from about
    # 12 mm in the centre to 5 mm near the rim, where the margin rolls down
    # and back inwards so its rounded lip tucks under the gill ends.
    cap_profile = [(r, z + lift) for r, z in (
        (0.000, 0.0492), (0.008, 0.0499), (0.016, 0.0521), (0.024, 0.0540),
        (0.031, 0.0547), (0.0370, 0.0540), (0.0420, 0.0520), (0.0452, 0.0493),
        (0.0466, 0.0463), (0.0458, 0.0442), (0.0446, 0.0435), (0.0432, 0.0442),
        (0.0400, 0.0453), (0.0350, 0.0455), (0.0290, 0.0440), (0.0220, 0.0412),
        (0.0165, 0.0380), (0.0135, 0.0350), (0.0118, 0.0322),
    )]
    samples = 170
    um = arc_fraction(cap_profile, 8)  # outermost point of the rolled lip
    ul = arc_fraction(cap_profile, 10)  # underside of the roll
    ug = arc_fraction(cap_profile, 11)  # gills start just inside the roll

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * 22 + seed
        edge = smooth(0.15, um, v)
        w = noise.noise(q) * 0.05 + noise.noise(q * 2.4) * 0.02 + noise.noise(q * 5.5) * 0.008
        # A gently wavy, slightly uneven margin (a few per cent, not lobed).
        lobes = (0.022 * math.sin(3 * th + 0.8) + 0.012 * math.sin(5 * th + 2.1)
                 + 0.02 * noise.noise(Vector((math.cos(th), math.sin(th), 0)) * 3 + seed))
        edge *= smooth(0.014, 0.03, r)
        r2 = r * (1 + (w + lobes) * edge)
        z2 = z + (w * 0.012 + lobes * 0.05) * edge
        # The whole cap dips a little on one side.
        z2 -= 0.0022 * edge * (0.5 + 0.5 * math.cos(th - 3.6))
        top = 1 - smooth(um - 0.05, um, v)
        # Lumps, an off-centre depression and a few shallow dents on the upper surface.
        z2 += (noise.noise(p * 45 + seed) * 0.0016 + noise.noise(p * 110 + seed) * 0.0005) * top
        dx, dy = p.x - 0.004, p.y + 0.003
        z2 -= 0.0042 * math.exp(-(dx * dx + dy * dy) / 0.014 ** 2) * top
        for cx, cy, rad, dep in ((0.028, 0.012, 0.005, 0.0009), (-0.03, -0.018, 0.006, 0.0008)):
            ex, ey = p.x - cx, p.y - cy
            z2 -= dep * math.exp(-(ex * ex + ey * ey) / rad ** 2) * top
        return (r2 * math.cos(th) + 0.0015, r2 * math.sin(th), z2)

    # Short, stout stem, slightly bellied low down, narrowing a little to a
    # rounded base sitting in the soil.
    stem_profile = [(r, z + (lift if z > 0.02 else lift * z / 0.02)) for r, z in (
        (0.0134, 0.0420), (0.0137, 0.0380), (0.0138, 0.034), (0.0140, 0.028), (0.0143, 0.021),
        (0.0142, 0.013), (0.0136, 0.0080), (0.0124, 0.0042), (0.0106, 0.0012),
        (0.0082, -0.0010), (0.0054, -0.0022), (0.0022, -0.0028),
    )]
    sp = catmull(stem_profile, 240)

    def stem_radius(z):
        return min(sp, key=lambda p: abs(p.y - z)).x

    # Scrobiculi: shallow depressions over the lower 70% of the stem
    # (angle, height, radius, vertical elongation); a few merge into streaks.
    rng = random.Random(11)
    pit_spots = []
    for k in range(10):
        th = (k * 2.39996 + rng.uniform(-0.3, 0.3)) % (2 * math.pi)
        z = rng.uniform(0.006, 0.029)
        rad = rng.uniform(0.0017, 0.0034)
        el = rng.choice((1.0, 1.25, 1.5, 1.8))
        pit_spots.append((th, z, rad, el))
    # One merging into a short vertical streak.
    pit_spots += [(1.1, 0.013, 0.0016, 1.3), (1.2, 0.0095, 0.0012, 2.2)]

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 25)) + seed
        # Irregular below and slightly oval; smooth where the flare sinks
        # into the cap so the joint stays closed.
        free = 1 - smooth(0.036, 0.044, z)
        r *= 1 + (noise.noise(p) * 0.05 + noise.noise(p * 3) * 0.015 + 0.04 * math.cos(2 * th - 0.7)) * free
        for pth, pz, prad, el in pit_spots:
            dth = (th - pth + math.pi) % (2 * math.pi) - math.pi
            d = math.sqrt((dth * 0.013) ** 2 + ((z - pz) / el) ** 2) / prad
            if d < 1:
                r -= 0.0005 * (1 - d * d) ** 2
        k = (1 - min(z, 0.046) / 0.046) ** 2
        return (r * math.cos(th) + 0.003 * k, r * math.sin(th) - 0.0015 * k, z)

    cap = revolve("cap", cap_profile, 256, samples, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 200, 150, stem_shape, True, True)
    # Keep the base pole off the texture's wrap edge, where bilinear filtering
    # would pick up the whitish apex from the opposite border.
    for d in stem.data.uv_layers[0].data:
        d.uv.y = min(max(d.uv.y, 0.003), 0.997)

    j_start = int(round(ug * (samples - 1)))

    # Wine-red latex: a damaged line crossing about 30 gill edges halfway
    # out, a shorter second one, a few stains near the margin and sparse
    # marks where the gills meet the stem (no continuous ring).
    count = 150
    lat_rng = random.Random(5)
    rim_marks = {lat_rng.randrange(count * 2): lat_rng.uniform(0.84, 0.95) for _ in range(9)}
    stem_marks = {lat_rng.randrange(count) * 2: lat_rng.uniform(0.05, 0.14) for _ in range(7)}

    def damage(th, a0, a1, tc, amp):
        dth = (th - a0 + math.pi) % (2 * math.pi) - math.pi
        span = (a1 - a0) % (2 * math.pi)
        if dth < 0 or dth > span:
            return None
        f = dth / span
        return tc + amp * math.sin(f * math.pi * 1.3), smooth(0.0, 0.12, f) * smooth(1.0, 0.85, f)

    # (start angle, end angle, position from stem to margin, bow); the first
    # two cross about 30 and 15 gills, the rest are short broken smears.
    lines = [(0.35, 1.05, 0.5, 0.05), (3.6, 3.95, 0.66, -0.03), (2.0, 2.12, 0.42, 0.01),
             (5.0, 5.18, 0.78, 0.02), (1.5, 1.58, 0.3, 0.0), (4.4, 4.5, 0.55, 0.0)]

    def latex(gi, th, t):
        s = 0.0
        for a0, a1, tc, amp in lines:
            hit = damage(th, a0, a1, tc, amp)
            if hit:
                tl, fade = hit
                s = max(s, math.exp(-((t - tl) / 0.05) ** 2) * fade)
        if gi in rim_marks:
            s = max(s, math.exp(-((t - rim_marks[gi]) / 0.035) ** 2) * 0.85)
        if gi in stem_marks:
            s = max(s, math.exp(-((t - stem_marks[gi]) / 0.05) ** 2) * 0.8)
        return min(1.0, s)

    gill, edges = _blades("gills", cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius, count, 0.0032,
                          seed, decurrent=0.002, lam=(0.5, 0.7), stains=latex, stain_mul=(0.5, 0.88, 0.8),
                          margin_taper=0.82, edge_occlusion=0.9)

    # Raised latex beads with a wet highlight on the damaged edges and at a
    # few junctions with the stem.
    def edge_at(gi, t):
        th0, t0, e = edges[gi]
        best = min(e, key=lambda s: abs(s[0] - t))
        return best[1], best[2]

    bead_items = []
    for a0, a1, tc, amp in lines:
        n = 5 if a1 - a0 > 0.5 else 3 if a1 - a0 > 0.2 else 1
        for i in range(n):
            th = a0 + (a1 - a0) * (i + 0.5) / n
            gi = int(round(th / (2 * math.pi) * count)) % count * 2
            tl = damage(edges[gi][0], a0, a1, tc, amp)[0]
            pos, n3 = edge_at(gi, tl)
            rad = lat_rng.uniform(0.00045, 0.0008)
            bead_items.append((pos + n3 * rad * 0.2, rad, 0.8))
    for gi, tm in list(stem_marks.items())[:5]:
        pos, n3 = edge_at(gi, tm)
        rad = lat_rng.uniform(0.0004, 0.0007)
        bead_items.append((pos + n3 * rad * 0.2, rad, 0.8))
    beads = _beads("latex", bead_items)

    # Cap: dull apricot-salmon with a wine-pink flush in the centre, faint
    # concentric zones made of darker spots, radial fibrils, two or three
    # grey-green patches on the outer third and over the margin, and a
    # paler, felted, rolled lip; matte and a little frosted.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    rad = g.radial()
    big = g.noise(9, 3, 0.5, distortion=0.2)
    top = g.ramp(big, [(0.35, "#a86f49"), (0.5, "#b47b51"), (0.65, "#be885c")])
    flush = g.math("MULTIPLY", g.remap(rad, 0.021, 0.004, 0.0, 0.75), g.remap(g.noise(7, 2), 0.35, 0.65, 0.6, 1.0))
    top = g.mix(flush, top, "#a26763")
    # Broad, soft verdigris-to-olive staining in the cuticle over the centre
    # and one side (about a third of the cap), blending gradually into the
    # apricot and darkest grey-green in the depression.
    sd = g.nt.nodes.new("ShaderNodeVectorMath")
    sd.operation = "DISTANCE"
    g.link(g.vec_scale(g.obj, 1, 1, 0), sd.inputs[0])
    sd.inputs[1].default_value = (0.011, -0.014, 0)
    swarp = g.math("MULTIPLY", g.math("SUBTRACT", g.noise(22, 4, 0.6, distortion=0.5), 0.5), 0.034)
    stain_zone = g.remap(g.math("ADD", sd.outputs["Value"], swarp), 0.043, 0.012)
    stain_zone = g.math("MULTIPLY", stain_zone, g.remap(g.noise(45, 4, 0.6, distortion=0.3), 0.3, 0.7, 0.62, 0.95))
    verdigris = g.ramp(g.noise(14, 3, 0.55), [(0.35, "#7a8660"), (0.55, "#828a60"), (0.72, "#8a8f60")])
    deep = g.remap(g.math("ADD", g.radial(), g.math("MULTIPLY", g.noise(30, 2), 0.004)), 0.015, 0.004, 0.0, 0.6)
    verdigris = g.mix(deep, verdigris, "#5c6446")
    top = g.mix(stain_zone, top, verdigris)
    wobble = g.math("MULTIPLY", g.noise(10, 3), 0.005)
    ring = g.math("SINE", g.math("MULTIPLY", g.math("ADD", rad, wobble), 900.0))
    ring = g.remap(ring, 0.55, 0.95)
    ring = g.math("MULTIPLY", ring, g.math("MULTIPLY", g.remap(rad, 0.011, 0.017), g.remap(rad, 0.045, 0.039)))
    ring = g.math("MULTIPLY", ring, g.remap(g.noise(5, 2), 0.35, 0.6, 0.35, 1.0))
    dots = g.remap(g.voronoi(300, rand=1.0), 0.45, 0.15)
    zones = g.math("MULTIPLY", ring, g.lerp(dots, 0.25, 1.0))
    top = g.mix(g.math("MULTIPLY", zones, 0.6), top, "#8a513b")
    fib = g.noise(3, 3, 0.55, vec=_radial_fibres(g, 90.0, 60.0))
    top = g.mix(0.16, top, fib, "OVERLAY")
    top = g.mix(0.14, top, g.noise(300, 3), "OVERLAY")
    # A few small, faint, soft-edged olive bruises at the margin.
    warp = g.math("MULTIPLY", g.math("SUBTRACT", g.noise(90, 4, 0.7, distortion=0.8), 0.5), 0.007)
    patches = None
    for pth, pr, prad in ((0.6, 0.046, 0.0070), (1.05, 0.047, 0.0045), (2.4, 0.046, 0.0060), (4.5, 0.045, 0.0055)):
        d = g.nt.nodes.new("ShaderNodeVectorMath")
        d.operation = "DISTANCE"
        g.link(g.vec_scale(g.obj, 1, 1, 0), d.inputs[0])
        d.inputs[1].default_value = (pr * math.cos(pth) + 0.0015, pr * math.sin(pth), 0)
        one = g.remap(g.math("ADD", d.outputs["Value"], warp), prad * 0.75, 0.0)
        patches = one if patches is None else g.math("MAXIMUM", patches, one)
    mottle = g.remap(g.noise(120, 4, 0.65, distortion=0.4), 0.3, 0.7, 0.3, 0.52)
    green = g.math("MULTIPLY", patches, mottle)
    top = g.mix(green, top, g.ramp(g.noise(70, 3), [(0.3, "#6e7a56"), (0.55, "#768258"), (0.8, "#7a8660")]))
    # Paler, felted rolled lip (outer rim and the roll's underside).
    lip = g.math("MULTIPLY", g.remap(g.v, um - 0.05, um - 0.01), g.remap(g.v, ug + 0.004, ug - 0.004))
    lipcol = g.mix(0.3, "#c7a78d", g.noise(400, 3, 0.7), "OVERLAY")
    top = g.mix(g.math("MULTIPLY", lip, g.lerp(green, 0.3, 0.0)), top, lipcol)
    stain = g.math("MULTIPLY", g.remap(g.voronoi(60, rand=1.0), 0.0, 0.12, 1.0, 0.0),
                   g.math("MULTIPLY", g.remap(g.noise(7, 2), 0.56, 0.6),
                          g.remap(g.math("ABSOLUTE", g.math("SUBTRACT", g.v, um)), 0.05, 0.0)))
    top = g.mix(stain, top, "#7a2630")
    under = g.remap(g.v, ug - 0.004, ug + 0.006)
    # Between the gills: the same wine-pink, so the crowded blades near the
    # stem do not read as a dark ring.
    colour = g.mix(under, top, "#d6a9b5")
    roughness = g.lerp(under, g.remap(g.noise(30, 2), 0.3, 0.7, 0.68, 0.8), 0.8)
    frost = g.noise(500, 2, 0.7)
    height = g.math("ADD", g.math("MULTIPLY", g.noise(200, 4), 0.3), g.math("MULTIPLY", frost, 0.25))
    height = g.math("ADD", height, g.math("MULTIPLY", zones, 0.2))
    g.finish(colour, roughness, height, 0.3, 0.0005)
    cap.data.materials.append(m)

    # Gills: wine-pink with a lilac cast, a little paler where they run down the
    # stem and along the free edge; the latex comes from the vertex colour.
    m = bpy.data.materials.new("gills-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#eaccce"), (0.12, "#e4bcc4"), (0.6, "#e2b8c2"), (1.0, "#e6bec4")])
    col = g.mix(g.remap(g.uvy, 0.6, 1.0, 0.0, 0.3), col, "#f4dcdc")
    col = g.mix(0.1, col, g.noise(40, 2, vec=g.vec_scale(g.obj, 1, 1, 1)), "OVERLAY")
    g.finish(col, 0.75, g.noise(200, 2), 0.1, 0.0002)
    gill.data.materials.append(m)

    # Latex beads: glossy wine red.
    m = bpy.data.materials.new("latex-proc")
    g = Graph(m)
    g.finish(g.ramp(g.noise(300, 2), [(0.4, "#5a1620"), (0.6, "#6a1c28")]), 0.12, g.noise(100, 1), 0.0, 0.0001)
    beads.data.materials.append(m)

    # Stem: warm buff-pink, paler under the gills, with a few large,
    # irregular, shallow wine-orange pits (darker rim, glossy floor) and a
    # little soil on the rounded base.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    z = _obj_z(g)
    base = g.ramp(g.noise(40, 4), [(0.35, "#d8a488"), (0.65, "#e2b498")])
    base = g.mix(g.remap(g.noise(9, 3, distortion=0.3), 0.45, 0.65, 0.0, 0.45), base, "#d49a8a")
    base = g.mix(0.2, base, g.noise(260, 2, vec=g.vec_scale(g.obj, 1, 1, 0.1)), "OVERLAY")
    spots = []
    for pth, pz, prad, el in pit_spots:
        x, y, zz = stem_shape(pth, 0.0, stem_radius(pz), pz)
        spots.append((x, y, zz, prad * 1.3, el))
    ragged = g.math("MULTIPLY", g.math("SUBTRACT", g.noise(180, 4, 0.65, distortion=0.5), 0.5), 0.0035)
    pit = _spot_mask(g, spots, 0.6, ragged)
    core = _spot_mask(g, [(x, y, zz, r * 0.8, el) for x, y, zz, r, el in spots], 0.3, ragged)
    pitcol = g.mix(core, "#96483f", g.ramp(g.noise(80, 2), [(0.4, "#a4524a"), (0.6, "#ae5c50")]))
    # Fine vinaceous mottling round the pits on the lower stem.
    halo = _spot_mask(g, [(x, y, zz, r * 1.6, el) for x, y, zz, r, el in spots], 0.4, ragged)
    base = g.mix(g.math("MULTIPLY", halo, 0.4), base, "#c57e6c")
    base = g.mix(pit, base, pitcol)
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.002)
    # Only a faint soil tint on the lowest few millimetres of the rounded foot.
    band = g.remap(g.math("ADD", z, side), 0.004, -0.003)
    soil = g.math("MULTIPLY", band, g.remap(g.noise(90, 5, 0.65), 0.35, 0.55, 0.15, 0.4))
    colour = g.mix(soil, base, g.ramp(g.noise(50, 3), [(0.4, "#9c7c5e"), (0.65, "#b09070")]))
    grains = g.math("MULTIPLY", g.remap(g.voronoi(260), 0.15, 0.0), g.remap(z, 0.002, -0.002, 0.0, 0.35))
    colour = g.mix(grains, colour, "#3f3024")
    roughness = g.math("MAXIMUM", g.lerp(core, 0.76, 0.35), g.math("MULTIPLY", soil, 0.95))
    height = g.math("SUBTRACT", g.math("MULTIPLY", g.noise(200, 3), 0.4), g.math("MULTIPLY", pit, 0.3))
    height = g.math("ADD", height, g.math("MULTIPLY", grains, 0.3))
    g.finish(colour, roughness, height, 0.35, 0.0006)
    stem.data.materials.append(m)

    for o in (cap, stem, beads):
        o.data.materials[0].use_backface_culling = True
    # A slight lean for the whole specimen.
    for o in (cap, stem, gill, beads):
        o.rotation_euler = (math.radians(3.5), math.radians(-2.5), 0)
    views = {"hero": (-30, 28, 0.42, 0.036), "low": (25, 4, 0.4, 0.038), "under": (15, -28, 0.3, 0.046)}
    return [cap, stem, gill, beads], views
