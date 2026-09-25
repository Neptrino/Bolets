"""Illustrative 3D species models for /bolets/<slug>/3d, generated in Blender.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/species-3d-models.py -- <species-id> <out-dir>

Each species is built from a shape profile and colours read from its
versioned morphology and reference photographs (looked at, never copied):
cap, stem, ring and volva are UV-mapped surfaces of revolution; gills are
double-sided blades with per-gill vertex colour. Procedural materials are
baked to colour, roughness and tangent-space normal textures, so the GLB
(Draco geometry, WebP textures) shows what the preview renders show. Units
are metres, so AR viewers place the model at life size.

Publish a result by copying <out-dir>/<id>.glb to public/models/species/ and
building the stills from <out-dir>/<id>-hero.png (soft radial fade so the
ground shadow never ends in an edge, then a tight crop for the profile link):

    magick <id>-hero.png -channel A -fuzz 12% -trim +repage +channel -gravity center \
      -background none -extent "%[fx:max(w,h)*1.15]x%[fx:max(w,h)*1.15]" sq.png
    magick -size <W>x<W> radial-gradient:white-black -level 29%,48% fade.png
    magick sq.png \( +clone -alpha extract fade.png -compose multiply -composite \) \
      -alpha off -compose copy_opacity -composite -resize 900x900 -quality 82 <id>.webp
    magick <id>.webp -gravity center -crop 66%x66%+0+0 +repage -resize 240x240 -quality 85 <id>-thumb.webp

Then register the species in data/species-3d-models.ts.
"""
import glob
import math
import os
import sys

import bpy
from mathutils import Vector, noise

TEX = 2048
FOREST_HDR = glob.glob(os.path.join(os.path.dirname(bpy.app.binary_path), "..", "Resources", "*", "datafiles", "studiolights", "world", "forest.exr"))[0]


# ---------------------------------------------------------------- geometry

def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def catmull(points, samples):
    """Resample a polyline with Catmull-Rom, parameterised by polyline arc length."""
    pts = [Vector(p) for p in points]
    ext = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    seg = [(pts[i + 1] - pts[i]).length for i in range(len(pts) - 1)]
    total = sum(seg)
    out = []
    for s in range(samples):
        d = total * s / (samples - 1)
        i = 0
        while i < len(seg) - 1 and d > seg[i]:
            d -= seg[i]
            i += 1
        t = d / seg[i] if seg[i] else 0
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        t2, t3 = t * t, t * t * t
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return out


def arc_fraction(points, k):
    seg = [(Vector(points[i + 1]) - Vector(points[i])).length for i in range(len(points) - 1)]
    return sum(seg[:k]) / sum(seg)


def revolve(name, profile, segments, samples, shape_fn, pole_start, pole_end):
    """Surface of revolution with a (theta, arc-fraction) UV layout.

    shape_fn(theta, v, r, z) -> (x, y, z) lets each species bend and dent it.
    UVs are per face corner, so the seam shares vertices and shades smoothly.
    """
    prof = catmull(profile, samples)
    verts, faces, uvs = [], [], []
    rings = []
    for j, pt in enumerate(prof):
        v = j / (samples - 1)
        ring = []
        for i in range(segments):
            th = 2 * math.pi * i / segments
            ring.append(len(verts))
            verts.append(shape_fn(th, v, pt.x, pt.y))
        rings.append(ring)
    for j in range(samples - 1):
        a, b = rings[j], rings[j + 1]
        va, vb = j / (samples - 1), (j + 1) / (samples - 1)
        for i in range(segments):
            n = (i + 1) % segments
            ua, ub = i / segments, (i + 1) / segments
            faces.append((a[i], a[n], b[n], b[i]))
            uvs.append(((ua, 1 - va), (ub, 1 - va), (ub, 1 - vb), (ua, 1 - vb)))
    for ring, first, want in ((rings[0], True, pole_start), (rings[-1], False, pole_end)):
        if not want:
            continue
        c = sum((Vector(verts[k]) for k in ring), Vector()) / len(ring)
        ci = len(verts)
        verts.append(tuple(c))
        vv = 1.0 if first else 0.0
        for i in range(segments):
            n = (i + 1) % segments
            ua, ub = i / segments, (i + 1) / segments
            if first:
                faces.append((ring[n], ring[i], ci))
                uvs.append(((ub, vv), (ua, vv), ((ua + ub) / 2, vv)))
            else:
                faces.append((ring[i], ring[n], ci))
                uvs.append(((ua, vv), (ub, vv), ((ua + ub) / 2, vv)))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], faces)
    uv = mesh.uv_layers.new(name="UVMap")
    for poly, corner_uvs in zip(mesh.polygons, uvs):
        for li, cuv in zip(poly.loop_indices, corner_uvs):
            uv.data[li].uv = cuv
    mesh.validate()
    # The (theta, profile) winding above faces inwards; web viewers cull back
    # faces, so turn every surface outwards.
    mesh.flip_normals()
    mesh.shade_smooth()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


# ---------------------------------------------------------------- node helpers

def hex_rgba(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


class Graph:
    def __init__(self, mat):
        mat.use_nodes = True
        self.nt = mat.node_tree
        self.nt.nodes.clear()
        self.out = self.nt.nodes.new("ShaderNodeOutputMaterial")
        self.bsdf = self.nt.nodes.new("ShaderNodeBsdfPrincipled")
        self.link(self.bsdf.outputs["BSDF"], self.out.inputs["Surface"])
        tc = self.nt.nodes.new("ShaderNodeTexCoord")
        self.obj = tc.outputs["Object"]
        sep = self.nt.nodes.new("ShaderNodeSeparateXYZ")
        self.link(tc.outputs["UV"], sep.inputs[0])
        self.v = self.math("SUBTRACT", 1.0, sep.outputs["Y"])  # 0 at profile start
        self.uvx = sep.outputs["X"]
        self.uvy = sep.outputs["Y"]

    def radial(self):
        """Horizontal distance from the axis, in metres."""
        n = self.nt.nodes.new("ShaderNodeVectorMath")
        n.operation = "LENGTH"
        self.link(self.vec_scale(self.obj, 1, 1, 0), n.inputs[0])
        return n.outputs["Value"]

    def link(self, a, b):
        self.nt.links.new(a, b)

    def _in(self, sock, val):
        if hasattr(val, "node"):
            self.link(val, sock)
        else:
            sock.default_value = val

    def math(self, op, a, b=0.0):
        n = self.nt.nodes.new("ShaderNodeMath")
        n.operation = op
        self._in(n.inputs[0], a)
        self._in(n.inputs[1], b)
        return n.outputs[0]

    def vec_scale(self, vec, sx, sy, sz):
        n = self.nt.nodes.new("ShaderNodeMapping")
        self._in(n.inputs["Vector"], vec)
        n.inputs["Scale"].default_value = (sx, sy, sz)
        return n.outputs[0]

    def noise(self, scale, detail=4.0, rough=0.55, vec=None, distortion=0.0):
        n = self.nt.nodes.new("ShaderNodeTexNoise")
        self._in(n.inputs["Vector"], vec if vec is not None else self.obj)
        n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = detail
        n.inputs["Roughness"].default_value = rough
        n.inputs["Distortion"].default_value = distortion
        return n.outputs["Fac"]

    def voronoi(self, scale, feature="F1", vec=None, rand=1.0):
        n = self.nt.nodes.new("ShaderNodeTexVoronoi")
        n.feature = feature
        self._in(n.inputs["Vector"], vec if vec is not None else self.obj)
        n.inputs["Scale"].default_value = scale
        n.inputs["Randomness"].default_value = rand
        return n.outputs["Distance"]

    def remap(self, x, a, b, c=0.0, d=1.0):
        n = self.nt.nodes.new("ShaderNodeMapRange")
        n.interpolation_type = "SMOOTHSTEP"
        self._in(n.inputs["Value"], x)
        n.inputs["From Min"].default_value = a
        n.inputs["From Max"].default_value = b
        n.inputs["To Min"].default_value = c
        n.inputs["To Max"].default_value = d
        return n.outputs["Result"]

    def ramp(self, fac, stops):
        n = self.nt.nodes.new("ShaderNodeValToRGB")
        self._in(n.inputs["Fac"], fac)
        els = n.color_ramp.elements
        while len(els) < len(stops):
            els.new(0.5)
        for el, (pos, col) in zip(els, stops):
            el.position = pos
            el.color = hex_rgba(col)
        return n.outputs["Color"]

    def mix(self, fac, a, b, blend="MIX"):
        n = self.nt.nodes.new("ShaderNodeMix")
        n.data_type = "RGBA"
        n.blend_type = blend
        socks = [s for s in n.inputs if s.type == "RGBA"]
        self._in(n.inputs["Factor"], fac)
        self._in(socks[0], hex_rgba(a) if isinstance(a, str) else a)
        self._in(socks[1], hex_rgba(b) if isinstance(b, str) else b)
        return [s for s in n.outputs if s.type == "RGBA"][0]

    def lerp(self, fac, a, b):
        return self.math("ADD", a, self.math("MULTIPLY", fac, self.math("SUBTRACT", b, a)))

    def finish(self, colour, roughness, height, strength, distance):
        self.link(colour, self.bsdf.inputs["Base Color"])
        self._in(self.bsdf.inputs["Roughness"], roughness)
        bump = self.nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = strength
        bump.inputs["Distance"].default_value = distance
        self.link(height, bump.inputs["Height"])
        self.link(bump.outputs["Normal"], self.bsdf.inputs["Normal"])


# ---------------------------------------------------------------- shared builders

def gills(name, cap_profile, samples, j_start, cap_shape, stem_shape, stem_radius, count, depth, seed, decurrent=0.004, free_gap=None, stains=True, margin_taper=0.72, edge_occlusion=0.82):
    """Radial gill blades hanging under the cap.

    j_start indexes the resampled profile where the gills begin (inside the
    inrolled margin). Each gill follows the underside inwards until it meets
    the stem, then runs a few millimetres down it (decurrent), fading out.
    Full gills alternate with lamellulae that start at irregular distances.
    Every blade is a thin double-sided ribbon of near-constant depth; vertex
    colour carries a per-gill tint, scattered latex stains and a fake
    occlusion towards the flesh, since the web viewer has no ambient occlusion.
    """
    prof = catmull(cap_profile, samples)
    # Where the underside reaches the stem surface.
    j_stem = samples - 1
    for j in range(j_start, samples):
        gap = free_gap if free_gap is not None else (-0.0008 if decurrent == 0 else 0.0004)
        if prof[j].x <= stem_radius(prof[j].y) + gap:
            j_stem = j
            break

    def path(th, t0):
        """(pos_fn, t) samples from the margin (t=1) to the stem and down it (t<0)."""
        pts = []
        steps = 44
        for s in range(steps):
            t = 1 - (1 - t0) * s / (steps - 1) if t0 > 0 else 1 - s / (steps - 1)
            f = j_start + (1 - t) * (j_stem - j_start)
            j0 = min(int(f), samples - 2)
            al = f - j0
            pr = prof[j0].lerp(prof[j0 + 1], al)
            tan = (prof[min(j0 + 1, samples - 1)] - prof[max(j0 - 1, 0)]).normalized()
            nr, nz = tan.y, -tan.x
            if nz > 0:
                nr, nz = -nr, -nz
            v = f / (samples - 1)
            pts.append(("cap", t, pr.x, pr.y, nr, nz, v))
        if t0 == 0 and decurrent > 0:
            z0 = prof[j_stem].y
            for s in range(1, 9):
                z = z0 - decurrent * s / 8
                pts.append(("stem", -s / 8, stem_radius(z), z, 1.0, 0.0, 0.0))
        return pts

    rng = [noise.noise(Vector((k * 0.913, 1.7, 0.3)) + seed) * 0.5 + 0.5 for k in range(count * 4)]
    # Almost every gill runs whole from margin to stem; one short lamellula
    # fills each gap near the margin, where the circumference widens.
    ranks = []
    for k in range(count):
        base = 2 * math.pi * k / count
        ranks.append((base, 0.0))
        ranks.append((base + math.pi / count, 0.72 + 0.14 * rng[4 * k]))
    verts, faces, uvs, cols = [], [], [], []
    for gi, (th0, t0) in enumerate(ranks):
        tint = 0.97 + 0.03 * (noise.noise(Vector((gi * 0.21, 3.0, 0.0))) * 0.5 + 0.5)
        row = []
        pts = path(th0, t0)
        for kind, t, r, z, nr, nz, v in pts:
            th = th0
            n3 = Vector((nr * math.cos(th), nr * math.sin(th), nz))
            if kind == "cap":
                start = smooth(t0, t0 + 0.04, t) if t0 > 0 else 1.0
                d = depth * start * (1 - smooth(margin_taper, 1.0, t)) * (0.55 + 0.45 * smooth(0.0, 0.3, t))
                if free_gap is not None:
                    d *= smooth(0.0, 0.12, t)  # free gills round off before the stem
                base = Vector(cap_shape(th, v, r, z))
                top, bot = base - n3 * 0.0005, base + n3 * d
            else:
                d = depth * 0.55 * (1 + t) ** 2.5
                sv = 0.0
                top = stem_shape(th, sv, r - 0.0004, z)
                bot = stem_shape(th, sv, r + d, z)
            q = Vector((math.cos(th), math.sin(th), t)) * 7 + seed
            q2 = Vector((math.cos(th), math.sin(th), t)) * 40 + seed
            if callable(stains):
                stain = stains(gi, th, t)
            else:
                stain = smooth(0.34, 0.5, noise.noise(q)) * smooth(0.0, 0.35, noise.noise(q2)) if stains else 0.0
            for e, pos in ((0, top), (1, bot)):
                row.append(len(verts))
                verts.append(pos)
                uvs.append((max(t, 0.0), e))
                occl = edge_occlusion if e == 0 else 1.0
                st = stain * (0.75 + 0.25 * e)
                c = [tint * occl * (1 - st * 0.45), tint * occl * (1 - st * 0.9), tint * occl * (1 - st * 0.85)]
                cols.append(c)
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
    return obj


def solidify(obj, thickness, rim=True):
    """Give a membrane thickness. Very thin ones skip the rim: its collapsed
    UVs sample a dark outline, and the gap is too narrow to see."""
    mod = obj.modifiers.new("solid", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 0.0
    mod.use_even_offset = True
    mod.use_rim = rim


# Species live in scripts/species-3d/<species-id>.py, one file each,
# so they can be written independently. Each file defines build() returning
# (objects, views) and uses the helpers above; see scripts/species-3d/README.md.
SCRIPT_PATH = os.path.abspath(sys.argv[sys.argv.index("-P") + 1]) if "-P" in sys.argv else os.path.abspath(__file__)
SPECIES_DIR = os.path.join(os.path.dirname(SCRIPT_PATH), "species-3d")


def species_builder(sid):
    path = os.path.join(SPECIES_DIR, f"{sid}.py")
    namespace = dict(globals())
    with open(path) as source:
        exec(compile(source.read(), path, "exec"), namespace)
    return namespace["build"]



# ---------------------------------------------------------------- bake + export

def setup_cycles(samples):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = "GPU"
    except Exception:
        pass
    return scene


def bake_object(obj, out_dir):
    nt = obj.data.materials[0].node_tree
    images = {}
    for kind, colourspace in (("color", "sRGB"), ("roughness", "Non-Color"), ("normal", "Non-Color")):
        size = obj.get("tex", TEX)
        img = bpy.data.images.new(f"{obj.name}-{kind}", size, size, alpha=False)
        img.colorspace_settings.name = colourspace
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = img
        for n in nt.nodes:
            n.select = False
        node.select = True
        nt.nodes.active = node
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        if kind == "color":
            bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, margin=16)
        elif kind == "roughness":
            bpy.ops.object.bake(type="ROUGHNESS", margin=16)
        else:
            bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT", margin=16)
        img.filepath_raw = os.path.join(out_dir, "tex", f"{obj.name}-{kind}.png")
        img.file_format = "PNG"
        img.save()
        nt.nodes.remove(node)
        images[kind] = img

    # Swap in the baked material that the GLB carries.
    mat = bpy.data.materials.new(obj.name)
    mat.use_nodes = True
    t = mat.node_tree
    bsdf = t.nodes["Principled BSDF"]
    c = t.nodes.new("ShaderNodeTexImage"); c.image = images["color"]
    r = t.nodes.new("ShaderNodeTexImage"); r.image = images["roughness"]
    n = t.nodes.new("ShaderNodeTexImage"); n.image = images["normal"]
    nm = t.nodes.new("ShaderNodeNormalMap")
    if "Col" in obj.data.color_attributes:
        va = t.nodes.new("ShaderNodeVertexColor")
        va.layer_name = "Col"
        mul = t.nodes.new("ShaderNodeMix")
        mul.data_type = "RGBA"
        mul.blend_type = "MULTIPLY"
        mul.inputs["Factor"].default_value = 1.0
        socks = [s for s in mul.inputs if s.type == "RGBA"]
        t.links.new(c.outputs["Color"], socks[0])
        t.links.new(va.outputs["Color"], socks[1])
        t.links.new([s for s in mul.outputs if s.type == "RGBA"][0], bsdf.inputs["Base Color"])
    else:
        t.links.new(c.outputs["Color"], bsdf.inputs["Base Color"])
    t.links.new(r.outputs["Color"], bsdf.inputs["Roughness"])
    t.links.new(n.outputs["Color"], nm.inputs["Color"])
    t.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    mat.use_backface_culling = obj.data.materials[0].use_backface_culling
    obj.data.materials[0] = mat


def render_previews(out_dir, sid, views):
    scene = setup_cycles(128)
    scene.render.resolution_x = scene.render.resolution_y = 1100
    scene.render.film_transparent = True
    # Khronos PBR Neutral keeps saturated colours honest and matches the
    # neutral tone mapping of web glTF viewers.
    try:
        scene.view_settings.view_transform = "Khronos PBR Neutral"
    except TypeError:
        scene.view_settings.view_transform = "Standard"
    # Keep saturated caps below clipping; overexposure washes orange to pink.
    scene.view_settings.exposure = -0.9

    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    wt = world.node_tree
    env = wt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(FOREST_HDR)
    wt.links.new(env.outputs["Color"], wt.nodes["Background"].inputs["Color"])
    wt.nodes["Background"].inputs["Strength"].default_value = 1.1
    scene.world = world
    key = bpy.data.objects.new("key", bpy.data.lights.new("key", "AREA"))
    key.data.energy = 6
    key.data.size = 0.35
    key.location = (-0.35, -0.3, 0.45)
    key.rotation_euler = (Vector((0, 0, 0.06)) - key.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.collection.objects.link(key)

    bpy.ops.mesh.primitive_plane_add(size=2)
    ground = bpy.context.active_object
    ground.is_shadow_catcher = True

    fill = bpy.data.objects.new("fill", bpy.data.lights.new("fill", "AREA"))
    fill.data.size = 0.25
    bpy.context.collection.objects.link(fill)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 90
    bpy.context.collection.objects.link(cam)
    scene.camera = cam
    for label, (az, el, dist, tz) in views.items():
        target = Vector((0, 0, tz))
        ground.hide_render = el < 0
        a, e = math.radians(az), math.radians(el)
        cam.location = target + Vector((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e))) * dist
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
        # Soft fill from beside the lens, as a field photographer would use.
        fill.location = cam.location + (cam.rotation_euler.to_quaternion() @ Vector((0.08, 0.05, 0)))
        fill.rotation_euler = (target - fill.location).to_track_quat("-Z", "Y").to_euler()
        fill.data.energy = 0.25
        # From below, the forest sky and key light leave the underside in deep
        # shade, which the web viewer's even neutral environment never does.
        # Light that view the same even way so gill and pore colours read true.
        under = el < 0
        key.hide_render = under
        background = wt.nodes["Background"]
        for link in list(background.inputs["Color"].links):
            wt.links.remove(link)
        if under:
            background.inputs["Color"].default_value = (0.8, 0.8, 0.8, 1)
            background.inputs["Strength"].default_value = 2.4
        else:
            wt.links.new(env.outputs["Color"], background.inputs["Color"])
            background.inputs["Strength"].default_value = 1.1
        scene.render.filepath = os.path.join(out_dir, f"{sid}-{label}.png")
        bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    sid, out_dir = argv[0], os.path.abspath(argv[1])
    os.makedirs(os.path.join(out_dir, "tex"), exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs, views = species_builder(sid)()
    setup_cycles(1)
    for o in objs:
        bake_object(o, out_dir)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(out_dir, f"{sid}.glb"),
        use_selection=True,
        export_format="GLB",
        export_image_format="WEBP",
        export_image_quality=85,
        export_tangents=True,
        export_draco_mesh_compression_enable=True,
        export_apply=True,
    )
    render_previews(out_dir, sid, views)


main()
