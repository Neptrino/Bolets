"""Marasmius oreades (camasec): a small group from a fairy ring in grass.

Three specimens of different ages: a young bell-shaped cap, a convex one
with a broad umbo and a mature, flattened cap. Tan to ochre caps, darker
at the umbo and paler (hygrophanous) towards the margin; broad, cream,
widely spaced free gills; slender, tough, pale stems that darken slightly
and turn finely velvety towards the base.
"""


def _distant_gills(name, cap_profile, samples, j_start, cap_shape, stem_radius, count, depth, seed, free_gap, margin_taper, lam_start):
    """Broad, distant, free gills: a variant of the shared gills() helper.

    Every full gill runs from margin to stem; one lamellula sits in each gap,
    reaching about halfway. Blades are broad near the margin and keep an even,
    rounded edge; lamellulae taper in gently instead of starting as a wedge.
    """
    prof = catmull(cap_profile, samples)
    j_stem = samples - 1
    for j in range(j_start, samples):
        if prof[j].x <= stem_radius(prof[j].y) + free_gap:
            j_stem = j
            break
    rng = [noise.noise(Vector((k * 0.913, 1.7, 0.3)) + seed) * 0.5 + 0.5 for k in range(count * 4)]
    ranks = []
    for k in range(count):
        base = 2 * math.pi * k / count + 0.02 * noise.noise(Vector((k * 1.3, 0.2, 0.1)) + seed)
        ranks.append((base, 0.0))
        ranks.append((base + math.pi / count, lam_start + 0.18 * rng[4 * k]))
    verts, faces, uvs, cols = [], [], [], []
    steps = 44
    for gi, (th, t0) in enumerate(ranks):
        tint = 0.96 + 0.04 * (noise.noise(Vector((gi * 0.21, 3.0, 0.0))) * 0.5 + 0.5)
        row = []
        for s in range(steps):
            t = 1 - (1 - t0) * s / (steps - 1)
            f = j_start + (1 - t) * (j_stem - j_start)
            j0 = min(int(f), samples - 2)
            pr = prof[j0].lerp(prof[j0 + 1], f - j0)
            tan = (prof[min(j0 + 1, samples - 1)] - prof[max(j0 - 1, 0)]).normalized()
            nr, nz = tan.y, -tan.x
            if nz > 0:
                nr, nz = -nr, -nz
            v = f / (samples - 1)
            n3 = Vector((nr * math.cos(th), nr * math.sin(th), nz))
            start = smooth(t0, t0 + 0.16, t) if t0 > 0 else 1.0
            # Rounded (quarter-ellipse) front where the edge curves up to the margin.
            e_m = min(1.0, (1 - t) / (1 - margin_taper))
            front = math.sqrt(max(0.0, 1 - (1 - e_m) ** 2))
            d = depth * start * front * (0.45 + 0.55 * smooth(0.0, 0.4, t)) * smooth(0.0, 0.1, t)
            base = Vector(cap_shape(th, v, pr.x, pr.y))
            for e, pos in ((0, base - n3 * 0.0004 * min(1.0, (1 - t) * 12)), (1, base + n3 * d)):
                row.append(len(verts))
                verts.append(pos)
                uvs.append((t, e))
                occl = 0.9 if e == 0 else 1.0
                cols.append((tint * occl, tint * occl, tint * occl))
        for s in range(steps - 1):
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
    return obj


def _specimen(tag, seed, h0, cap_rel, tip, stem_r, count, depth, lobe_amp, loc, rot, spin):
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
        lobes = lobe_amp * (math.sin(3 * th + seed.x) * 0.6 + math.sin(5 * th + seed.y) * 0.4
                            + noise.noise(Vector((math.cos(th), math.sin(th), 0)) * 3 + seed))
        r2 = r * (1 + (w + lobes * 0.5) * edge)
        # The margin waves up and down a little and dips on one side.
        z2 = z + (w * 0.12 * rmax + lobes * 0.25 * rmax) * edge
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
        return (r * math.cos(th) + bend * math.cos(spin), r * math.sin(th) + bend * math.sin(spin), z)

    cap = revolve(f"cap-{tag}", cap_profile, 200, samples, cap_shape, True, False)
    stem = revolve(f"stem-{tag}", stem_profile, 96, 90, stem_shape, True, True)
    sp = catmull(stem_profile, 300)

    def stem_radius(z):
        return min(sp, key=lambda p: abs(p.y - z)).x

    ug = arc_fraction(cap_profile, tip + 1) + 0.012
    j_start = int(round(ug * (samples - 1)))
    gill = _distant_gills(f"gills-{tag}", cap_profile, samples, j_start, cap_shape, stem_radius,
                          count, depth, seed, free_gap=0.0009, margin_taper=0.62, lam_start=0.45)

    # Cap: darker tan umbo, ochre body, paler buff (drying) towards the margin,
    # with soft hygrophanous patches; cream flesh between the gills.
    m = bpy.data.materials.new(f"cap-{tag}-proc")
    g = Graph(m)
    base = g.ramp(g.v, [(0.0, "#84522a"), (um * 0.25, "#9a6537"), (um * 0.6, "#b07d4a"), (um * 0.94, "#c9a677")])
    dry = g.remap(g.noise(0.9 / rmax * 2, 3, 0.55, distortion=0.5), 0.52, 0.68, 0.0, 0.3)
    base = g.mix(g.math("MULTIPLY", dry, g.remap(g.v, 0.1, um * 0.6)), base, "#d9b98a")
    base = g.mix(0.25, base, g.noise(14 / rmax * 0.02, 4, 0.6), "OVERLAY")
    base = g.mix(0.12, base, g.noise(240, 3), "OVERLAY")
    under = g.remap(g.v, um + 0.002, um + 0.014)
    colour = g.mix(under, base, "#e2cc9f")
    roughness = g.lerp(under, g.remap(g.noise(30, 2), 0.3, 0.7, 0.6, 0.72), 0.82)
    g.finish(colour, roughness, g.noise(260, 3), 0.25, 0.0003)
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
         (0.0188, 0.0024), (0.0213, 0.0002), (0.0222, -0.0016), (0.0217, -0.0024),
         (0.0205, -0.0020), (0.017, -0.0006), (0.013, 0.0006), (0.009, 0.0015), (0.005, 0.0022),
         (0.0026, 0.0026), (0.0012, 0.0028)],
        8, 0.0022, 26, 0.0042, 0.07, (0.004, 0.006, 0.0), (math.radians(-4), math.radians(5), 0.3), 2.4)
    # Convex with a broad umbo: margin below the stem apex, concave hymenium.
    objs += _specimen(
        "b", Vector((6.1, 2.7, 3.9)), 0.047,
        [(0.000, 0.0094), (0.0028, 0.0092), (0.0048, 0.0082), (0.0068, 0.0068), (0.0100, 0.0052), (0.0128, 0.0026),
         (0.0142, -0.0002), (0.0151, -0.0030), (0.0147, -0.0041), (0.0138, -0.0036),
         (0.011, -0.0017), (0.008, 0.0002), (0.0052, 0.0014), (0.0026, 0.0021), (0.0010, 0.0023)],
        8, 0.0019, 22, 0.0034, 0.025, (-0.030, -0.012, 0.0), (math.radians(6), math.radians(-9), 1.2), 0.3)
    # Young: bell-shaped, margin still curved in against the gills.
    objs += _specimen(
        "c", Vector((3.4, 8.8, 5.2)), 0.030,
        [(0.000, 0.0108), (0.0028, 0.0103), (0.0052, 0.0086), (0.0072, 0.0060), (0.0087, 0.0030),
         (0.0094, -0.0002), (0.0093, -0.0024), (0.0087, -0.0031), (0.0080, -0.0026),
         (0.0065, -0.0010), (0.0048, 0.0004), (0.0030, 0.0013), (0.0010, 0.0017)],
        7, 0.0016, 18, 0.0026, 0.015, (0.026, -0.020, 0.0), (math.radians(-7), math.radians(-5), 4.0), 5.5)
    views = {"hero": (-30, 20, 0.36, 0.036), "low": (20, 3, 0.34, 0.038), "under": (15, -22, 0.27, 0.05)}
    return objs, views
