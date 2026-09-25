"""Morchella esculenta (múrgola): an ovoid, slightly conical yellow-ochre
cap made of many deep, irregular, vertically elongated pits separated by
thin, wavy, paler sterile ridges; fused directly at its base (no skirt,
unlike Verpa) to a thick, hollow, whitish-cream, granular stem with
irregular longitudinal folds, widening to a lumpy, soiled foot. No gills
or pores, and no brain-like folds (Gyromitra).

The pits are real geometry: the whole cap surface is pushed inwards along
the ovoid's normal by a warped, vertically stretched 3D Voronoi field whose
cell walls stay standing as thin ridges, so the outline is scalloped by the
pits. The same pit depth is written to a vertex attribute so the material
can darken the pits and pale the ridge crests (the web viewer has no
ambient occlusion)."""
from mathutils import Vector, noise
import math


def cell_edge(q, n_q):
    """Distance from q to the nearest Voronoi cell wall, measured along the
    surface whose normal (in q-space) is n_q, plus the nearest feature point."""
    _, pts = noise.voronoi(q)
    p1 = pts[0]
    e = 1.0
    for pk in pts[1:]:
        m = pk - p1
        sep = m.length
        if sep > 1e-6:
            plane = ((q - pk).length_squared - (q - p1).length_squared) / (2 * sep)
            # A wall the surface grazes would otherwise leave a broad flat ridge.
            graze = math.sqrt(max(0.04, 1 - (m.dot(n_q) / sep) ** 2))
            e = min(e, plane / graze)
    return e, p1


def build():
    seed = Vector((4.3, 2.6, 9.1))

    # Ovoid, a little conical cap about 6.5 cm tall and 5 cm wide; the base
    # turns under briefly and meets the thick stem, ending buried inside it.
    cap_profile = [
        (0.0000, 0.1110), (0.0068, 0.1094), (0.0130, 0.1050), (0.0186, 0.0980),
        (0.0230, 0.0890), (0.0262, 0.0790), (0.0280, 0.0690), (0.0283, 0.0602),
        (0.0270, 0.0530), (0.0243, 0.0482), (0.0208, 0.0458), (0.0176, 0.0452),
        (0.0156, 0.0460), (0.0138, 0.0476),
    ]
    samples = 310
    segments = 500
    ub = arc_fraction(cap_profile, 9)   # where the cap turns under towards the stem
    uj = arc_fraction(cap_profile, 11)  # the cap–stem junction: pits run down to here

    zc, ea, eb = 0.074, 0.028, 0.037  # ovoid used for the pit direction
    sx, sz = 150.0, 96.0               # pit lattice: ~6.5 mm wide, ~10 mm tall
    pit_depth = []

    def cap_shape(th, v, r, z):
        p = Vector((r * math.cos(th), r * math.sin(th), z))
        # Irregular overall form: lumps, a slight lean and a less-than-round section.
        lump = (noise.noise(p * 14 + seed) * 0.08 + noise.noise(p * 32 + seed) * 0.05
                + noise.noise(p * 70 + seed) * 0.02)
        shape_mask = smooth(0.02, 0.2, v) * (1 - smooth(ub - 0.02, uj, v))
        sq = 1 + 0.06 * math.cos(2 * th + 0.7) * smooth(0.05, 0.4, v)
        n = Vector((p.x / ea ** 2, p.y / ea ** 2, (z - zc) / eb ** 2))
        n = n.normalized() if n.length > 0 else Vector((0, 0, 1))
        n_q = Vector((n.x / sx, n.y / sx, n.z / sz)).normalized()

        # Warped, vertically stretched cells: long, wavy vertical ridges in
        # rough rows and irregular cross ridges.
        q = Vector((p.x * sx, p.y * sx, p.z * sz)) + seed
        q += noise.noise_vector(p * 50 + seed) * 0.6 + noise.noise_vector(p * 190 + seed) * 0.16
        e, p1 = cell_edge(q, n_q)
        # Thin, sharp crest whose thickness varies along the ridge.
        width = 0.035 + 0.05 * (noise.noise(p * 120 + seed * 1.3) * 0.5 + 0.5)
        d = smooth(width * 0.3, width + 0.2, e) ** 0.75
        # Ridges sometimes sag or break, joining neighbouring pits.
        brk = smooth(0.25, 0.45, noise.noise(p * 95 + seed * 0.7)) * 0.75
        d = max(d, brk * (1 - smooth(0.0, 0.25, e)) * 0.85)
        # Lower secondary ridges inside the larger pits.
        q2 = q * 2.0 + Vector((1.3, 7.1, 2.2))
        e2, c2 = cell_edge(q2, n_q)
        big = smooth(0.2, 0.4, e)
        sub = (1 - smooth(0.02, 0.12, e2)) * big * smooth(0.4, 0.6, noise.noise(c2 * 0.9 + seed) * 0.5 + 0.5)
        d *= 1 - 0.4 * sub
        # Cells differ in depth; floors are wrinkled.
        d *= 0.75 + 0.35 * (noise.noise(p1 * 1.7 + seed) * 0.5 + 0.5)
        d += noise.noise(p * 300 + seed) * 0.08 * d
        # Pits run to the junction, shallower where the cap turns under so
        # they never cut through to the stem.
        fade = smooth(0.004, 0.03, v) * (1 - smooth(uj - 0.03, uj, v)) * (1 - 0.5 * smooth(ub, uj - 0.01, v))
        depth = 0.0066 * d * fade - 0.0012 * shape_mask  # ridges stand proud of the base ovoid
        pit_depth.append(max(0.0, min(1.0, d * fade)))

        r2 = r * (1 + lump * shape_mask) * sq ** shape_mask
        x, y, z2 = r2 * math.cos(th), r2 * math.sin(th), z + lump * 0.004 * shape_mask
        # Slight lean of the cap and an off-centre apex.
        lean = smooth(0.046, 0.111, z)
        x += 0.0035 * lean ** 1.5
        y -= 0.0012 * lean ** 2
        return (x - n.x * depth, y - n.y * depth, z2 - n.z * depth)

    # Thick stem, nearly as wide as the cap base, widening to a lumpy foot.
    stem_profile = [
        (0.0100, 0.0600), (0.0145, 0.0550), (0.0168, 0.0490), (0.0172, 0.0440),
        (0.0172, 0.0360), (0.0180, 0.0280), (0.0202, 0.0200), (0.0224, 0.0120),
        (0.0236, 0.0065), (0.0222, 0.0020), (0.0192, -0.0016), (0.0145, -0.0040),
        (0.0085, -0.0054), (0.0025, -0.0058),
    ]

    def stem_shape(th, v, r, z):
        dirn = Vector((math.cos(th), math.sin(th), 0))
        low = 1 - smooth(0.0, 0.03, z)
        wob = 2.2 * noise.noise(dirn * 2 + Vector((0, 0, z * 25)) + seed)
        # Irregular longitudinal folds along the whole stem, deeper at the foot.
        fold = (0.035 * math.sin(5 * th + wob) + 0.06 * noise.noise(dirn * 4 + Vector((0, 0, z * 30)) + seed)
                + 0.03 * noise.noise(dirn * 9 + Vector((0, 0, z * 45)) + seed * 0.6))
        fold = (-abs(fold) + 0.03) * (0.3 + 1.3 * low)
        lumpy = (noise.noise(dirn * 3 + Vector((0, 0, z * 40)) + seed * 1.3) * 0.04
                 + noise.noise(dirn * 6 + Vector((0, 0, z * 90)) + seed * 0.7) * 0.06 * low)
        grain = noise.noise(Vector((math.cos(th) * 80, math.sin(th) * 80, z * 1100)) + seed) * 0.01
        top = 1 - smooth(0.042, 0.047, z)  # smooth where it sinks into the cap
        r2 = r * (1 + (fold + lumpy + grain) * top)
        k = (1 - min(max(z, 0.0), 0.05) / 0.05) ** 2
        return (r2 * math.cos(th) - 0.002 * k, r2 * math.sin(th) + 0.001 * k, z)

    cap = revolve("cap", cap_profile, segments, samples, cap_shape, True, False)
    stem = revolve("stem", stem_profile, 320, 130, stem_shape, True, True)

    # Pit depth per vertex (revolve calls cap_shape in vertex order; the
    # apex pole vertex comes last).
    mesh = cap.data
    attr = mesh.color_attributes.new(name="pit", type="FLOAT_COLOR", domain="POINT")
    for k in range(len(mesh.vertices)):
        val = pit_depth[k] if k < len(pit_depth) else 0.0
        attr.data[k].color = (val, val, val, 1.0)

    # Cap: buff-cream ridge crests, yellow-ochre to honey walls, dark brown floors.
    m = bpy.data.materials.new("cap-proc")
    g = Graph(m)
    at = g.nt.nodes.new("ShaderNodeAttribute")
    at.attribute_name = "pit"
    pit = at.outputs["Fac"]
    tone = g.noise(14, 4, 0.6, distortion=0.4)
    crest = g.ramp(tone, [(0.3, "#d9bc7c"), (0.55, "#e4c98e"), (0.8, "#ecd8a6")])
    wall = g.ramp(tone, [(0.3, "#c08a2a"), (0.55, "#cc9936"), (0.8, "#b8832c")])
    deep = g.ramp(g.noise(40, 3), [(0.35, "#7e5018"), (0.65, "#946220")])
    floor = g.ramp(g.noise(55, 3), [(0.35, "#3e2610"), (0.65, "#553518")])
    colour = g.mix(g.remap(pit, 0.02, 0.22), crest, wall)
    colour = g.mix(g.remap(pit, 0.3, 0.65), colour, deep)
    colour = g.mix(g.remap(pit, 0.6, 1.0), colour, floor)
    colour = g.mix(0.2, colour, g.noise(320, 3), "OVERLAY")
    roughness = g.remap(pit, 0.0, 1.0, 0.66, 0.82)
    height = g.math("ADD", g.math("MULTIPLY", g.noise(420, 3), 0.5), g.math("MULTIPLY", pit, -0.3))
    g.finish(colour, roughness, height, 0.25, 0.0004)
    cap.data.materials.append(m)

    # Stem: whitish cream, granular/scurfy, darker in the furrows, a faint soil tint at the foot.
    m = bpy.data.materials.new("stem-proc")
    g = Graph(m)
    base = g.ramp(g.noise(45, 4), [(0.35, "#dfcfab"), (0.65, "#ece2c8")])
    gran_d = g.voronoi(1000, rand=1.0)
    gran = g.remap(gran_d, 0.0, 0.35, 1.0, 0.0)
    base = g.mix(g.math("MULTIPLY", gran, 0.35), base, "#f7f1e2")
    specks = g.math("MULTIPLY", g.remap(g.voronoi(560), 0.0, 0.14, 1.0, 0.0), g.remap(g.noise(20, 2), 0.44, 0.56))
    base = g.mix(g.math("MULTIPLY", specks, 0.55), base, "#c4ae84")
    streak = g.noise(60, 3, 0.5, vec=g.vec_scale(g.obj, 1, 1, 0.1))
    base = g.mix(g.remap(streak, 0.5, 0.7, 0.0, 0.35), base, "#cdb993")
    side = g.remap(g.noise(3, 1, vec=g.vec_scale(g.obj, 1, 1, 0)), 0.35, 0.65, 0.0, 0.12)
    soil = g.math("MULTIPLY", g.remap(g.math("ADD", g.v, side), 0.84, 0.99), g.remap(g.noise(70, 5, 0.65), 0.36, 0.54))
    colour = g.mix(g.math("MULTIPLY", soil, 0.4), base, "#9a8264")
    height = g.math("ADD", gran, g.math("MULTIPLY", g.noise(300, 3), 0.4))
    g.finish(colour, 0.82, height, 0.4, 0.0004)
    stem.data.materials.append(m)

    for o in (cap, stem):
        o.data.materials[0].use_backface_culling = True
    views = {"hero": (-30, 18, 0.55, 0.056), "low": (25, 3, 0.52, 0.056), "under": (15, -22, 0.45, 0.05)}
    return [cap, stem], views
