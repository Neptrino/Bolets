"""Marasmius oreades (camasec): a small group from a fairy ring in grass.

Three specimens of different ages: a young bell-shaped cap, a convex one
with a broad umbo and a mature, flattened cap. Tan to ochre caps, darker
at the umbo and paler (hygrophanous) towards the margin; broad, cream,
widely spaced free gills; slender, tough, pale stems that darken slightly
and turn finely velvety towards the base.
"""


def _distant_gills(name, cap_profile, samples, tip, cap_shape, stem_radius, count, depth, seed, free_gap, thick=0.0002, clear=0.0003):
    """Broad, distant, free gills: a variant of the shared gills() helper.

    Blades are flat, vertical and radial in the cap's own frame, so seen from
    below they run straight from stem to margin whatever the cap's tilt or
    waviness. Each blade's free edge follows the cap underside (concave on a
    convex cap, nearly flat on an expanded one) and is kept above the margin
    of the same radius, so from the side the rim stays a clean edge and the
    front of every gill tapers to nothing just inside it. Every full gill runs
    from margin to stem, ending in a small gap (free to adnexed); one
    lamellula sits in most gaps, two in some.
    """
    prof = catmull(cap_profile, samples)
    j_tip = int(round(arc_fraction(cap_profile, tip) * (samples - 1)))
    # The gills start just inwards of the lowest point of the margin; the
    # rim-line limit below makes their fronts taper to nothing there.
    j_low = min(range(j_tip, min(j_tip + 25, samples)), key=lambda j: prof[j].y)
    j_front = j_low + 2
    j_stem = samples - 1
    for j in range(j_front, samples):
        if prof[j].x <= stem_radius(prof[j].y) + free_gap:
            j_stem = j
            break
    rng = [noise.noise(Vector((k * 0.913, 1.7, 0.3)) + seed) * 0.5 + 0.5 for k in range(count * 4)]
    ranks = []
    for k in range(count):
        base = 2 * math.pi * k / count + 0.012 * noise.noise(Vector((k * 1.3, 0.2, 0.1)) + seed)
        ranks.append((base, 0.0))
        if rng[4 * k + 1] > 0.72:
            # Two lamellulae: a longer one and a short one beside it.
            ranks.append((base + 0.36 * 2 * math.pi / count, 0.42 + 0.12 * rng[4 * k]))
            ranks.append((base + 0.68 * 2 * math.pi / count, 0.66 + 0.1 * rng[4 * k + 2]))
        elif rng[4 * k + 1] > 0.1:
            ranks.append((base + math.pi / count, 0.4 + 0.16 * rng[4 * k]))

    def rim_z(th):
        # Lowest point of the margin along this radius.
        return min(cap_shape(th, j / (samples - 1), prof[j].x, prof[j].y)[2]
                   for j in range(max(j_tip - 6, 0), j_low + 3))

    def smin(a, b, k=0.00025):
        m = min(a, b)
        return m - k * math.log(math.exp((m - a) / k) + math.exp((m - b) / k))

    verts, faces, uvs, cols = [], [], [], []
    steps = 48
    for gi, (th, t0) in enumerate(ranks):
        tint = 0.96 + 0.04 * (noise.noise(Vector((gi * 0.21, 3.0, 0.0))) * 0.5 + 0.5)
        floor = rim_z(th) + clear
        side = Vector((-math.sin(th), math.cos(th), 0.0))
        row = []
        for s in range(steps):
            # t: 0 at the stem end, 1 at the front just inside the margin.
            t = 1 - (1 - t0) * s / (steps - 1)
            f = j_front + (1 - t) * (j_stem - j_front)
            j0 = min(int(f), samples - 2)
            pr = prof[j0].lerp(prof[j0 + 1], f - j0)
            v = f / (samples - 1)
            base = Vector(cap_shape(th, v, pr.x, pr.y))
            # Rounded (elliptical) ends: broad blades, a free rear end and a
            # front that thins out to the cap flesh; lamellulae start softly.
            front = math.sqrt(max(0.0, 1 - (1 - min(1.0, (1 - t) / 0.24)) ** 2))
            rear = math.sqrt(max(0.0, 1 - (1 - min(1.0, t / 0.1)) ** 2)) * (0.55 + 0.45 * smooth(0.0, 0.5, t))
            start = math.sqrt(max(0.0, 1 - (1 - min(1.0, (t - t0) / 0.14)) ** 2)) if t0 > 0 else 1.0
            d = depth * front * rear * start
            # Never below the margin: the free edge stays above the rim line.
            d = max(0.0, smin(d, base.z - floor))
            # Thick blades with a blunt, rounded free edge: a five-point
            # cross-section (flesh, side, edge, side, flesh), hanging straight
            # down from a root sunk into the cap flesh.
            sink = base + Vector((0, 0, 0.00035))
            w = thick * (0.5 + 0.5 * min(1.0, d / max(depth * 0.35, 1e-6)))
            rr = min(w * 1.3, 0.45 * d)
            down = Vector((0, 0, -1))
            section = (
                (0.0, sink + side * w),
                (0.8, base + down * (d - rr) + side * w * 0.92),
                (1.0, base + down * d),
                (0.8, base + down * (d - rr) - side * w * 0.92),
                (0.0, sink - side * w),
            )
            for e, pos in section:
                row.append(len(verts))
                verts.append(pos)
                uvs.append((t, e))
                occl = 0.9 if e == 0 else 1.0
                cols.append((tint * occl, tint * occl, tint * occl))
        for s in range(steps - 1):
            for k in range(4):
                a0, b0 = row[5 * s + k], row[5 * s + 5 + k]
                faces.append((a0, a0 + 1, b0 + 1, b0))
    # Wind every face so its normal points out of the blade: on the first
    # full gill, the outer side (index 0 -> 1) must face +side.
    k0 = 5 * (steps // 2)
    p0, p1, p2 = verts[k0], verts[k0 + 1], verts[k0 + 5]
    th0 = ranks[0][0]
    if (p1 - p0).cross(p2 - p0).dot(Vector((-math.sin(th0), math.cos(th0), 0.0))) < 0:
        faces = [tuple(reversed(f)) for f in faces]
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
    return obj


def _specimen(tag, seed, h0, cap_rel, tip, stem_r, count, depth, lobe_amp, loc, rot, spin, wave=0.25, thick=0.0002):
    """One fruit body in local coordinates (stem base at the origin).

    cap_rel is the (r, dz) cap profile relative to the stem apex height h0,
    from the umbo to the margin tip (index `tip`) and back under the cap to
    inside the stem.
    """
    cap_profile = [(r, h0 + dz) for r, dz in cap_rel]
    samples = 150
    um = arc_fraction(cap_profile, tip)
    rmax = max(r for r, _ in cap_rel)

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        q = p * (0.35 / rmax) + seed
        edge = smooth(0.2, um, v) * smooth(0.25 * rmax, 0.6 * rmax, r)
        w = noise.noise(q) * 0.05 + noise.noise(q * 2.5) * 0.02 + noise.noise(q * 6.0) * 0.006
        # Two or three broad, shallow lobes rather than a ruffle.
        lobes = lobe_amp * (math.sin(2 * th + seed.x) * 0.5 + math.sin(3 * th + seed.y) * 0.5
                            + 0.6 * noise.noise(Vector((math.cos(th), math.sin(th), 0)) * 1.5 + seed))
        r2 = r * (1 + (w + lobes * 0.5) * edge)
        # The margin waves up and down a little and dips on one side.
        z2 = z + (w * 0.12 * rmax + lobes * wave * rmax) * edge
        z2 -= 0.06 * rmax * edge * (0.5 + 0.5 * math.cos(th - seed.z))
        top = 1 - smooth(um - 0.06, um, v)
        z2 += noise.noise(p * (2.2 / rmax) + seed) * 0.012 * rmax * top
        return (r2 * math.cos(th), r2 * math.sin(th), z2)

    stem_profile = [
        (stem_r * 1.45, h0 + 0.0030), (stem_r * 1.18, h0 + 0.0006), (stem_r * 1.02, h0 - 0.004),
        (stem_r * 0.98, h0 * 0.62), (stem_r * 1.04, h0 * 0.3), (stem_r * 1.12, 0.006),
        (stem_r * 1.22, 0.0018), (stem_r * 0.95, -0.0006), (stem_r * 0.35, -0.0012),
    ]

    def stem_shape(th, v, r, z):
        p = Vector((math.cos(th), math.sin(th), z * 60)) + seed
        # Slightly compressed and wavy, smooth where it sinks into the cap.
        r *= (1 + noise.noise(p) * 0.07 + 0.06 * math.cos(2 * th + seed.x)) if z < h0 - 0.002 else 1.0
        k = (1 - min(max(z, 0.0), h0) / h0)
        bend = k * k * 0.004 + math.sin(k * math.pi) * 0.0015
        # A gentle S-curve across the lean, so the stem is never a ruler.
        sway = math.sin(k * 2 * math.pi) * 0.0007 * min(1.0, h0 / 0.045)
        return (r * math.cos(th) + bend * math.cos(spin) - sway * math.sin(spin),
                r * math.sin(th) + bend * math.sin(spin) + sway * math.cos(spin), z)

    cap = revolve(f"cap-{tag}", cap_profile, 200, samples, cap_shape, True, False)
    stem = revolve(f"stem-{tag}", stem_profile, 96, 90, stem_shape, True, True)
    sp = catmull(stem_profile, 300)

    def stem_radius(z):
        return min(sp, key=lambda p: abs(p.y - z)).x

    gill = _distant_gills(f"gills-{tag}", cap_profile, samples, tip, cap_shape, stem_radius,
                          count, depth, seed, free_gap=0.0009, thick=thick)

    # Cap: smooth, matte, suede-like. Darker honey-tan umbo, ochre-buff body
    # and a soft hygrophanous band drying to cream-buff over the outer quarter
    # of the radius; only broad, low-frequency tonal variation; cream flesh
    # at the knife-thin margin and between the gills.
    m = bpy.data.materials.new(f"cap-{tag}-proc")
    g = Graph(m)
    rad = g.math("DIVIDE", g.radial(), rmax)
    base = g.ramp(rad, [(0.0, "#8c5c31"), (0.22, "#9b6a3b"), (0.5, "#ae7f4b"), (0.72, "#bc8f5b")])
    # Drying band: an irregular (not ruled) inner edge from a broad noise.
    wob = g.math("MULTIPLY", g.math("SUBTRACT", g.noise(1.2 / rmax, 2, 0.4), 0.5), 0.16)
    band = g.remap(g.math("ADD", rad, wob), 0.62, 0.9)
    base = g.mix(g.math("MULTIPLY", band, 0.8), base, "#d6b989")
    # Broad patches a shade lighter or darker, like drying suede.
    patch = g.remap(g.noise(0.9 / rmax, 2, 0.4, distortion=0.4), 0.42, 0.62)
    base = g.mix(g.math("MULTIPLY", patch, 0.16), base, "#c9a674")
    umbo = g.remap(rad, 0.08, 0.3, 1.0, 0.0)
    base = g.mix(g.math("MULTIPLY", umbo, 0.45), base, "#86592f")
    under = g.remap(g.v, um + 0.004, um + 0.012)
    colour = g.mix(under, base, "#e6d3aa")
    roughness = g.lerp(under, 0.8, 0.84)
    height = g.math("MULTIPLY", g.noise(3.0 / rmax, 2, 0.4), 0.4)
    g.finish(colour, roughness, height, 0.08, 0.0004)
    cap.data.materials.append(m)
    cap["tex"] = 1024

    # Gills: cream buff, a little deeper towards the stem, paler along the free edge.
    m = bpy.data.materials.new(f"gills-{tag}-proc")
    g = Graph(m)
    col = g.ramp(g.uvx, [(0.0, "#e8d2a6"), (0.5, "#f0dfb8"), (1.0, "#f3e4c0")])
    col = g.mix(g.remap(g.uvy, 0.7, 1.0, 0.0, 0.4), col, "#f1e3c3")
    g.finish(col, 0.78, g.noise(200, 2), 0.08, 0.0002)
    gill.data.materials.append(m)

    # Stem: pale buff, fibrous, darker tan and finely velvety towards the base.
    m = bpy.data.materials.new(f"stem-{tag}-proc")
    g = Graph(m)
    fib = g.noise(260, 3, 0.5, vec=g.vec_scale(g.obj, 1, 1, 0.08))
    colour = g.ramp(g.v, [(0.0, "#e2cda3"), (0.45, "#d9bf92"), (0.8, "#c49c68"), (0.95, "#a67a4c")])
    colour = g.mix(0.25, colour, fib, "OVERLAY")
    fuzz = g.noise(900, 2, 0.6)
    velvet = g.remap(g.v, 0.6, 0.9)
    colour = g.mix(g.math("MULTIPLY", velvet, 0.18), colour, fuzz, "OVERLAY")
    soil = g.math("MULTIPLY", g.remap(g.v, 0.9, 0.98), g.remap(g.noise(60, 4, 0.6), 0.4, 0.55))
    colour = g.mix(soil, colour, "#5b4630")
    roughness = g.lerp(velvet, 0.66, 0.86)
    g.finish(colour, roughness, g.math("ADD", fib, g.math("MULTIPLY", fuzz, velvet)), 0.2, 0.0003)
    stem.data.materials.append(m)
    stem["tex"] = 512

    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    objs = [cap, stem, gill]
    for o in objs:
        o.location = loc
        o.rotation_euler = rot
    return objs


def build():
    objs = []
    # Mature: flattened with a broad low umbo, margin just decurved, so the
    # hymenium is nearly flat.
    objs += _specimen(
        "a", Vector((1.3, 4.2, 0.7)), 0.060,
        [(0.000, 0.0078), (0.0035, 0.0076), (0.0065, 0.0068), (0.0090, 0.0057), (0.0120, 0.0050), (0.015, 0.0042),
         (0.0188, 0.0024), (0.0213, 0.0002), (0.0222, -0.0016), (0.0219, -0.0021),
         (0.0208, -0.0011), (0.017, 0.0008), (0.013, 0.0015), (0.009, 0.0020), (0.005, 0.0024),
         (0.0026, 0.0026), (0.0012, 0.0028)],
        8, 0.0022, 24, 0.0048, 0.07, (0.004, 0.006, 0.0), (math.radians(-4), math.radians(5), 0.3), 2.4,
        wave=0.8, thick=0.00028)
    # Convex with a broad umbo: margin below the stem apex, concave hymenium.
    objs += _specimen(
        "b", Vector((6.1, 2.7, 3.9)), 0.047,
        [(0.000, 0.0092), (0.0026, 0.0090), (0.0042, 0.0080), (0.0056, 0.0066), (0.0078, 0.0060), (0.0105, 0.0050),
         (0.0128, 0.0033), (0.0144, 0.0008), (0.0152, -0.0016), (0.0148, -0.0023), (0.0138, -0.0019),
         (0.011, -0.0003), (0.008, 0.0007), (0.0052, 0.0014), (0.0026, 0.0021), (0.0010, 0.0023)],
        9, 0.0019, 22, 0.0037, 0.03, (-0.030, -0.012, 0.0), (math.radians(6), math.radians(-9), 1.2), 0.3,
        wave=0.5, thick=0.00024)
    # Young: convex-campanulate with a small umbo, margin slightly incurved.
    objs += _specimen(
        "c", Vector((3.4, 8.8, 5.2)), 0.030,
        [(0.000, 0.0106), (0.0014, 0.0104), (0.0026, 0.0097), (0.0040, 0.0090), (0.0056, 0.0079), (0.0071, 0.0063),
         (0.0084, 0.0041), (0.0093, 0.0014), (0.0097, -0.0008), (0.0094, -0.0018), (0.0088, -0.0020),
         (0.0078, -0.0009), (0.0064, -0.0002), (0.0048, 0.0005), (0.0030, 0.0011), (0.0010, 0.0014)],
        9, 0.0016, 18, 0.0026, 0.015, (0.026, -0.020, 0.0), (math.radians(-7), math.radians(-5), 4.0), 5.5,
        thick=0.0002)
    views = {"hero": (-30, 20, 0.36, 0.036), "low": (20, 3, 0.34, 0.038), "under": (15, -22, 0.27, 0.05)}
    return objs, views
