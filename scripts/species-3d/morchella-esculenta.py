"""Morchella esculenta (múrgola): an ovoid honey-ochre cap made of deep,
irregular pits separated by paler sterile ridges, fused to a short hollow,
granular cream stem at its base (no skirt, unlike Verpa), and widening,
furrowed and a little soiled at the foot. No gills or pores.

The pits are real geometry: the cap surface is pushed inwards along the
ovoid's normal by a warped 3D Voronoi field, with the cell edges left
standing as ridges. The same pit depth is written to a vertex attribute so
the material can darken the pits and pale the ridges (the web viewer has no
ambient occlusion)."""
from mathutils import Vector, noise
import math


def build():
    seed = Vector((4.3, 2.6, 9.1))

    # Ovoid, slightly conical cap about 7 cm tall and 5 cm wide; the base
    # curls in under itself and ends buried inside the stem apex.
    cap_profile = [
        (0.0000, 0.1120), (0.0060, 0.1108), (0.0115, 0.1070), (0.0162, 0.1005),
        (0.0200, 0.0920), (0.0228, 0.0822), (0.0243, 0.0720), (0.0246, 0.0630),
        (0.0236, 0.0552), (0.0215, 0.0500), (0.0182, 0.0468), (0.0150, 0.0458),
        (0.0125, 0.0462), (0.0100, 0.0475),
    ]
    samples = 340
    segments = 520
    ub = arc_fraction(cap_profile, 9)  # where the cap turns under towards the stem
    uj = arc_fraction(cap_profile, 12)  # the cap–stem junction: pits run down to here

    zc, ea, eb = 0.074, 0.025, 0.040  # ovoid used for the pit direction
    pit_depth = []

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        # Irregular overall form: lumps, a slight lean and a less-than-round section.
        lump = noise.noise(p * 18 + seed) * 0.06 + noise.noise(p * 40 + seed) * 0.035 + noise.noise(p * 80 + seed) * 0.012
        shape_mask = smooth(0.02, 0.2, v) * (1 - smooth(ub - 0.02, ub + 0.05, v))
        sq = 1 + 0.05 * math.cos(2 * th + 0.7) * smooth(0.05, 0.4, v)
        # Pit direction: normal of the reference ovoid.
        n = Vector((p.x / ea ** 2, p.y / ea ** 2, (z - zc) / eb ** 2))
        n = n.normalized() if n.length > 0 else Vector((0, 0, 1))
        # Warped, vertically stretched Voronoi: long vertical ridges and
        # irregular cross ridges, as in the esculenta group.
        q = Vector((p.x * 96, p.y * 96, p.z * 62)) + seed
        q += noise.noise_vector(p * 60 + seed) * 0.35 + noise.noise_vector(p * 170 + seed) * 0.12
        _, pts = noise.voronoi(q)
        p1 = pts[0]
        # Distance to the nearest cell wall: the closest bisector plane.
        # Measure it along the surface: a wall the surface grazes (nearly
        # parallel to it) would otherwise leave a broad flat ridge.
        nq = Vector((n.x / 96, n.y / 96, n.z / 62)).normalized()
        e = 1.0
        for pk in pts[1:]:
            m = pk - p1
            sep = m.length
            if sep > 1e-6:
                plane = ((q - pk).length_squared - (q - p1).length_squared) / (2 * sep)
                graze = math.sqrt(max(0.04, 1 - (m.dot(nq) / sep) ** 2))
                e = min(e, plane / graze)
        # Rounded ridge crest ~1.5 mm wide, steep walls, rounded pit floors.
        d = smooth(0.05, 0.32, e)
        # Low secondary cross-ridges inside the larger pits.
        q2 = q * 2.1 + Vector((1.3, 7.1, 2.2))
        _, pts2 = noise.voronoi(q2)
        e2 = 1.0
        for pk in pts2[1:]:
            m2 = pk - pts2[0]
            if m2.length > 1e-6:
                e2 = min(e2, ((q2 - pk).length_squared - (q2 - pts2[0]).length_squared) / (2 * m2.length))
        sub = (1 - smooth(0.03, 0.18, e2)) * smooth(0.25, 0.5, e) * smooth(0.45, 0.6, noise.noise(pts2[0] * 0.9 + seed) * 0.5 + 0.5)
        d *= 1 - 0.3 * sub
        d = d * (0.8 + 0.25 * (noise.noise(p1 * 1.7 + seed) * 0.5 + 0.5))
        crest = 0.82 + 0.18 * (noise.noise(p * 140 + seed) * 0.5 + 0.5)  # uneven ridge heights
        floor = noise.noise(p * 260 + seed) * 0.12 * d  # small wrinkles inside the pits
        # Shallower pits where the cap turns under, so they never cut through to the stem.
        fade = smooth(0.012, 0.05, v) * (1 - smooth(uj - 0.045, uj - 0.01, v)) * (1 - 0.55 * smooth(ub, uj - 0.02, v))
        depth = (0.005 * (d + floor) + 0.0006 * (1 - crest)) * fade
        pit_depth.append(max(0.0, min(1.0, depth / 0.0052)))
        r2 = r * (1 + lump * shape_mask) * sq ** shape_mask
        x, y, z2 = r2 * math.cos(th), r2 * math.sin(th), z + lump * 0.004 * shape_mask
        # Slight lean of the cap and an off-centre apex.
        lean = smooth(0.045, 0.112, z)
        x += 0.0035 * lean ** 1.5
        y -= 0.0012 * lean ** 2
        return (x - n.x * depth, y - n.y * depth, z2 - n.z * depth)

    stem_profile = [
        (0.0090, 0.0600), (0.0112, 0.0540), (0.0124, 0.0470), (0.0127, 0.0400),
        (0.0130, 0.0320), (0.0145, 0.0230), (0.0166, 0.0140), (0.0182, 0.0070),
        (0.0180, 0.0020), (0.0152, -0.0018), (0.0090, -0.0038), (0.0020, -0.0044),
    ]

    def stem_shape(th, v, r, z):
        dirn = Vector((math.cos(th), math.sin(th), 0))
        low = 1 - smooth(0.002, 0.042, z)
        # Deep, irregular furrows and folds at the swollen base, fading up the stem.
        wob = 2.5 * noise.noise(dirn * 2 + Vector((0, 0, z * 30)) + seed)
        fold = (0.10 * math.sin(5 * th + wob) + 0.05 * math.sin(9 * th + 1.7 * wob + 1.1)
                + 0.08 * noise.noise(dirn * 4 + Vector((0, 0, z * 60)) + seed))
        fold = -abs(fold) * 1.3 + 0.06  # sharp furrows between rounded folds
        lumpy = (noise.noise(dirn * 3 + Vector((0, 0, z * 40)) + seed * 1.3) * 0.05
                 + noise.noise(dirn * 6 + Vector((0, 0, z * 90)) + seed * 0.7) * 0.05 * low)
        grain = noise.noise(Vector((math.cos(th) * 60, math.sin(th) * 60, z * 900)) + seed) * 0.012
        top = 1 - smooth(0.044, 0.05, z)  # smooth where it sinks into the cap
        r2 = r * (1 + (fold * low + lumpy + grain) * top)
        k = (1 - min(max(z, 0.0), 0.05) / 0.05) ** 2
        return (r2 * math.cos(th) - 0.002 * k, r2 * math.sin(th) + 0.001 * k, z)

    cap = revolve("cap", cap_profile, segments, samples, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 256, 120, stem_shape, True, True)

    # Pit depth per vertex (revolve calls cap_shape in vertex order; the
    # apex pole vertex comes last and sits on a ridge-free tip).
    mesh = cap.data
    attr = mesh.color_attributes.new(name="pit", type="FLOAT_COLOR", domain="POINT")
    for k in range(len(mesh.vertices)):
        val = pit_depth[k] if k < len(pit_depth) else 0.0
        attr.data[k].color = (val, val, val, 1.0)

    # Cap: pale ochre-cream ridges, honey-ochre walls, brown pit floors.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    at = g.nt.nodes.new("ShaderNodeAttribute")
    at.attribute_name = "pit"
    pit = at.outputs["Fac"]
    tone = g.noise(18, 4, 0.6, distortion=0.4)
    ridge = g.ramp(tone, [(0.3, "#cfb283"), (0.55, "#dbc095"), (0.8, "#e4cfa8")])
    wall = g.ramp(tone, [(0.35, "#a06a2a"), (0.65, "#b07a34")])
    floor = g.ramp(g.noise(40, 3), [(0.35, "#4a2c10"), (0.65, "#5c3a18")])
    colour = g.mix(g.remap(pit, 0.03, 0.28), ridge, wall)
    colour = g.mix(g.remap(pit, 0.25, 0.85), colour, floor)
    colour = g.mix(0.25, colour, g.noise(320, 3), "OVERLAY")
    roughness = g.remap(pit, 0.0, 1.0, 0.66, 0.8)
    height = g.math("ADD", g.math("MULTIPLY", g.noise(420, 3), 0.5), g.math("MULTIPLY", pit, -0.3))
    g.finish(colour, roughness, height, 0.25, 0.0004)
    cap.data.materials.append(m)

    # Stem: whitish cream, finely granular/scurfy, with soil at the foot.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    base = g.ramp(g.noise(45, 4), [(0.35, "#e0d4b8"), (0.65, "#eee6d2")])
    gran_d = g.voronoi(900, rand=1.0)
    gran = g.remap(gran_d, 0.0, 0.35, 1.0, 0.0)
    base = g.mix(g.math("MULTIPLY", gran, 0.35), base, "#fbf7ee")
    specks = g.math("MULTIPLY", g.remap(g.voronoi(520), 0.0, 0.14, 1.0, 0.0), g.remap(g.noise(20, 2), 0.46, 0.56))
    base = g.mix(g.math("MULTIPLY", specks, 0.5), base, "#c7b28a")
    base = g.mix(g.remap(g.v, 0.55, 0.85, 0.0, 0.45), base, "#d8c7a0")
    base = g.mix(0.2, base, g.noise(200, 2, vec=g.vec_scale(g.obj, 1, 1, 0.12)), "OVERLAY")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.12)
    soil = g.math("MULTIPLY", g.remap(g.math("ADD", g.v, side), 0.6, 0.8), g.remap(g.noise(70, 5, 0.65), 0.34, 0.5))
    colour = g.mix(g.math("MULTIPLY", soil, 0.8), base, "#6e553a")
    height = g.math("ADD", gran, g.math("MULTIPLY", g.noise(300, 3), 0.4))
    g.finish(colour, 0.8, height, 0.35, 0.0004)
    stem.data.materials.append(m)

    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    views = {"hero": (-30, 18, 0.55, 0.056), "low": (25, 3, 0.52, 0.056), "under": (15, -22, 0.45, 0.05)}
    return [cap, stem], views
