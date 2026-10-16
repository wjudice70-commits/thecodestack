"""Yavas Yavas - William & Nesrin stylized 3D characters (milestone 1).
Run:  python3 -I build_char.py william|nesrin
Builds rigid-segment stylized characters on a bone rig, makes movement clips,
renders preview stills, saves .blend and exports .glb (with animations).
Characters face -Y (Blender front) => +Z in glTF/Three.js.
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector, Euler, Quaternion

KIND = [a for a in sys.argv if a in ("william", "nesrin")][0]
OUT = "/home/claude/yy"
assert KIND in ("william", "nesrin")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = bpy.data.collections.new(KIND.upper()); scene.collection.children.link(col)
PARTS = []

# ---------------------------------------------------------------- materials
def mat(name, rgb, rough=0.55, metal=0.0, alpha=1.0, spec=0.4, emit=None):
    m = bpy.data.materials.new(f"{KIND}_{name}")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    for k in ("Specular IOR Level", "Specular"):
        if k in b.inputs: b.inputs[k].default_value = spec
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = 1.0
    return m

# ---------------------------------------------------------------- primitives
def _finish(o, m, name, smooth=True, bone=None):
    o.name = name
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.select_set(False)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    o.data.materials.append(m)
    for c in o.users_collection: c.objects.unlink(o)
    col.objects.link(o)
    PARTS.append((o, bone))
    return o

def ell(name, loc, rad, m, bone=None, rot=(0, 0, 0), seg=28, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1, location=loc)
    o = bpy.context.object
    o.scale = rad if hasattr(rad, "__len__") else (rad, rad, rad)
    o.rotation_euler = rot
    return _finish(o, m, name, bone=bone)

def limb(name, p1, p2, r1, r2, m, bone=None, verts=24):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=d.length,
                                    location=(p1 + p2) / 2, end_fill_type='NOTHING')
    o = bpy.context.object
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return _finish(o, m, name, bone=bone)

def hemi(name, loc, rad, m, bone=None, keep_above=-0.05, seg=28, rings=18):
    """sphere cut along a horizontal plane (keeps z/rad > keep_above)."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1, location=(0, 0, 0))
    o = bpy.context.object
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < keep_above], context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.scale = rad if hasattr(rad, "__len__") else (rad, rad, rad)
    o.location = loc
    return _finish(o, m, name, bone=bone)

def tube(name, pts, r, m, bone=None, closed=False):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = r; cu.bevel_resolution = 3; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): sp.points[i].co = (*p, 1)
    sp.use_cyclic_u = closed
    o = bpy.data.objects.new(name, cu); bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    return _finish(o, m, name, bone=bone)

def ring(name, loc, R, r, m, bone=None, rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=32, minor_segments=10, location=loc)
    o = bpy.context.object; o.rotation_euler = rot; o.scale = scale
    return _finish(o, m, name, bone=bone)

# ---------------------------------------------------------------- parameters
W = KIND == "william"
S = 1.0 if W else 0.915          # overall height scale (1.80 m / ~1.65 m)
BW = 1.0 if W else 1.12          # body width factor
hx = 0.098 * BW                  # hip joint half spacing
Z = dict(hip=0.93 * S, knee=0.50 * S, ankle=0.095 * S, sp=1.06 * S, ch=1.24 * S,
         neck=1.43 * S, head=1.505 * S, headtop=1.80 * S, sh=1.395 * S, elb=1.11 * S, wr=0.855 * S)
SH_X = 0.200 * BW + (0.0 if W else 0.0)

# colors
if W:
    SKIN = mat("skin", (0.90, 0.62, 0.46), 0.5)
    HAIR = mat("hair", (0.22, 0.12, 0.06), 0.7)
    BEARD = mat("beard", (0.34, 0.18, 0.08), 0.8)
    CAP = mat("cap", (0.045, 0.06, 0.20), 0.7)
    TOP = mat("shirt", (0.90, 0.85, 0.79), 0.9)
    PANTS = mat("jeans", (0.055, 0.055, 0.065), 0.75)
    EYEIRIS = mat("iris", (0.20, 0.52, 0.85), 0.2)
else:
    SKIN = mat("skin", (0.70, 0.45, 0.33), 0.5)
    HAIR = mat("hair", (0.92, 0.74, 0.36), 0.55)
    ROOTS = mat("roots", (0.30, 0.20, 0.09), 0.7)
    TOP = mat("tank", (0.015, 0.015, 0.018), 0.7)
    PANTS = mat("trousers", (0.30, 0.025, 0.055), 0.85)
    EYEIRIS = mat("iris", (0.14, 0.065, 0.035), 0.2)
SHOE = mat("sneaker", (0.93, 0.91, 0.88), 0.6)
SOLE = mat("sole", (0.97, 0.96, 0.94), 0.5)
WHITE = mat("sclera", (0.97, 0.97, 0.96), 0.2)
BLACK = mat("pupil", (0.0, 0.0, 0.0), 0.1, spec=0.8)
LIP = mat("lip", (0.72, 0.10, 0.14) if not W else (0.62, 0.34, 0.30), 0.4)
BROW = mat("brow", (0.18, 0.10, 0.05) if W else (0.32, 0.22, 0.12), 0.8)
SILVER = mat("silver", (0.8, 0.8, 0.82), 0.25, metal=1.0)
GOLD = mat("gold", (0.95, 0.72, 0.33), 0.25, metal=1.0)

# ---------------------------------------------------------------- armature
bpy.ops.object.armature_add(location=(0, 0, 0))
arm = bpy.context.object; arm.name = f"{KIND.upper()}_rig"; arm.data.name = arm.name
col.objects.link(arm); bpy.context.scene.collection.objects.unlink(arm)
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
for b in list(eb): eb.remove(b)

def bone(name, head, tail, parent=None):
    b = eb.new(name); b.head = head; b.tail = tail
    if parent: b.parent = eb[parent]
    b.roll = 0
    return b

bone("root", (0, 0, 0), (0, 0, 0.12))
bone("hips", (0, 0, Z['hip']), (0, 0, Z['sp']), "root")
bone("spine", (0, 0, Z['sp']), (0, 0, Z['ch']), "hips")
bone("chest", (0, 0, Z['ch']), (0, 0, Z['neck']), "spine")
bone("neck", (0, 0, Z['neck']), (0, 0, Z['head']), "chest")
bone("head", (0, 0, Z['head']), (0, 0, Z['headtop']), "neck")
for side, sx in (("L", 1), ("R", -1)):
    bone(f"upper_arm.{side}", (sx * SH_X, 0, Z['sh']), (sx * SH_X, 0, Z['elb']), "chest")
    bone(f"forearm.{side}", (sx * SH_X, 0, Z['elb']), (sx * SH_X, 0, Z['wr']), f"upper_arm.{side}")
    bone(f"hand.{side}", (sx * SH_X, 0, Z['wr']), (sx * SH_X, 0, Z['wr'] - 0.09 * S), f"forearm.{side}")
    bone(f"thigh.{side}", (sx * hx, 0, Z['hip']), (sx * hx, 0, Z['knee']), "hips")
    bone(f"shin.{side}", (sx * hx, 0, Z['knee']), (sx * hx, 0, Z['ankle']), f"thigh.{side}")
    bone(f"foot.{side}", (sx * hx, 0, Z['ankle']), (sx * hx, 0, 0.02), f"shin.{side}")
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------------- body parts
def X(s): return s * 1.0

# ---- head dims
hr = Vector((0.098, 0.108, 0.118)) * (1.0 if W else 1.04)   # head ellipsoid radii
if not W: hr = Vector((0.104, 0.108, 0.116))
HC = Vector((0, 0.004, Z['head'] + 0.075 * S))              # head centre
def surf_y(x, z, rad=None):
    r = rad or hr
    t = 1 - (x / r.x) ** 2 - ((z - HC.z) / r.z) ** 2
    return HC.y - r.y * math.sqrt(max(t, 0.02))

ell("head", HC, hr, SKIN, "head", seg=40, rings=24)
# jaw / chin  (wider chin for William)
jaw_r = Vector((0.080, 0.088, 0.075)) if W else Vector((0.094, 0.090, 0.072))
ell("jaw", HC + Vector((0, -0.020, -0.062)), jaw_r, SKIN, "head", seg=32, rings=18)
# ears
for sx in (1, -1):
    ell(f"ear{sx}", HC + Vector((sx * (hr.x - 0.002), 0.012, -0.012)), (0.012, 0.016, 0.027), SKIN, "head", seg=14, rings=10)
# nose
nz = HC.z - 0.020
ell("nose", (0, surf_y(0, nz) - 0.006, nz), (0.013, 0.018, 0.020) if W else (0.012, 0.016, 0.017), SKIN, "head", seg=18, rings=12)
ell("nose_tip", (0, surf_y(0, nz) - 0.020, nz - 0.010), (0.009, 0.010, 0.009), SKIN, "head", seg=14, rings=10)
# eyes
EZ = HC.z + 0.012
EX = 0.040 if W else 0.043
ER = 0.0215 if W else 0.0235
for sx in (1, -1):
    y = surf_y(sx * EX, EZ, hr * 0.99)
    ell(f"eye{sx}", (sx * EX, y + 0.010, EZ), ER, WHITE, "head", seg=20, rings=14)
    ell(f"iris{sx}", (sx * EX, y - ER * 0.78 + 0.012, EZ), (ER * 0.72, ER * 0.30, ER * 0.70), EYEIRIS, "head", seg=20, rings=10)
    ell(f"pupil{sx}", (sx * EX, y - ER * 0.78 + 0.0052, EZ), (ER * 0.32, ER * 0.16, ER * 0.32), BLACK, "head", seg=14, rings=8)
    ell(f"glint{sx}", (sx * EX - 0.005, y - ER * 0.92 + 0.011, EZ + 0.007), 0.0035, WHITE, "head", seg=8, rings=6)
    # upper lid (skin) for a soft cartoon lid line
# eyebrows
for sx in (1, -1):
    pts = []
    for i in range(7):
        t = i / 6
        x = sx * (EX - 0.026 + t * 0.054); z = EZ + 0.046 + (0.008 * math.sin(t * math.pi) if W else 0.012 * math.sin(t * math.pi)) - (0.0 if W else 0.004 * t) * 0
        if W and sx == -1: z += 0.006 * t   # slightly quizzical brow
        pts.append((x, surf_y(x, z, hr * 0.99) - 0.001, z))
    tube(f"brow{sx}", pts, 0.0048 if W else 0.0038, BROW, "head")
# mouth - soft smile
mz = HC.z - 0.052
pts = []
mw = 0.036 if W else 0.040
for i in range(11):
    t = i / 10; x = -mw + 2 * mw * t
    z = mz + 0.012 * ((x / mw) ** 2) - (0.003 if W else 0.0) * x / mw * 0
    pts.append((x * (1 if not W else 1), surf_y(x, z, hr * 0.99) - (0.010 if W else 0.006), z))
if W:
    pts = [(x + 0.004, y, z + (0.004 if x > 0 else 0)) for x, y, z in pts]  # lopsided smirk
tube("mouth", pts, 0.0058 if W else 0.0075, LIP, "head")
if not W:   # lips: small fuller upper/lower pads
    ell("lip_low", (0, surf_y(0, mz - 0.012) - 0.004, mz - 0.012), (0.026, 0.009, 0.008), LIP, "head", seg=16, rings=8)

if W:
    # beard: lower face wrap + chin extension + moustache + sideburns
    ell("beard_jaw", HC + Vector((0, -0.020, -0.112)), (0.086, 0.082, 0.048), BEARD, "head", seg=32, rings=18)
    ell("beard_chin", HC + Vector((0, -0.058, -0.140)), (0.046, 0.042, 0.058), BEARD, "head", seg=24, rings=14)
    ell("beard_cheekL", HC + Vector((0.074, -0.020, -0.070)), (0.024, 0.050, 0.046), BEARD, "head", seg=16, rings=10)
    ell("beard_cheekR", HC + Vector((-0.074, -0.020, -0.070)), (0.024, 0.050, 0.046), BEARD, "head", seg=16, rings=10)
    ell("mustache", (0.0, surf_y(0, mz + 0.024) - 0.002, mz + 0.026), (0.030, 0.009, 0.007), BEARD, "head", seg=18, rings=10)
    # cap: crown + brim + logo
    hemi("cap_crown", HC + Vector((0, 0.002, 0.024)), (hr.x * 1.10, hr.y * 1.12, hr.z * 1.10), CAP, "head", keep_above=0.28, seg=36, rings=20)
    ell("cap_band", HC + Vector((0, 0.004, 0.058)), (hr.x * 1.08, hr.y * 1.09, 0.010), CAP, "head", seg=36, rings=6)
    ell("brim", HC + Vector((0, -0.125, 0.070)), (0.092, 0.075, 0.0065), CAP, "head", rot=(0.20, 0, 0), seg=36, rings=8)
    ring("cap_logo", (0.0, -0.126 + 0.010 - 0.0, HC.z + 0.106), 0.0125, 0.0022, WHITE, "head", rot=(math.pi / 2 - 0.26, 0, 0))
    ring("cap_logo2", (0.0, -0.126 + 0.010 - 0.0, HC.z + 0.106), 0.0065, 0.0020, WHITE, "head", rot=(math.pi / 2 - 0.26, 0, 0))
    # hair peeking at the sides/back
    ell("hair_back", HC + Vector((0, 0.045, -0.012)), (hr.x * 1.06, hr.y * 0.95, hr.z * 0.82), HAIR, "head", seg=28, rings=14)
    for sx in (1, -1):
        ell(f"sideburn{sx}", HC + Vector((sx * (hr.x - 0.010), -0.030, -0.010)), (0.014, 0.020, 0.040), HAIR, "head", seg=12, rings=8)
else:
    # hair: dark-root crown + blonde volume + bun + curls
    hemi("roots", HC + Vector((0, 0.010, 0.018)), (hr.x * 1.07, hr.y * 1.10, hr.z * 1.07), ROOTS, "head", keep_above=0.22, seg=36, rings=20)
    ell("hair_mass", HC + Vector((0, 0.050, -0.020)), (hr.x * 1.20, hr.y * 1.05, hr.z * 1.00), HAIR, "head", seg=32, rings=18)
    for sx in (1, -1):
        ell(f"hair_side{sx}", HC + Vector((sx * (hr.x * 0.96), -0.005, 0.015)), (0.020, 0.048, 0.072), HAIR, "head", seg=18, rings=12)
    # bun on top-back with curly texture (cluster of small spheres)
    import random; random.seed(7)
    bun_c = HC + Vector((0.0, 0.050, 0.130))
    ell("bun", bun_c, (0.062, 0.058, 0.055), HAIR, "head", seg=24, rings=14)
    for i in range(16):
        a = random.uniform(0, 2 * math.pi); e = random.uniform(-0.2, 1.2)
        d = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)))
        ell(f"bun_curl{i}", bun_c + d * 0.062, random.uniform(0.016, 0.026), HAIR, "head", seg=10, rings=8)
    # face-framing curls + loose wisps
    for sx in (1, -1):
        for i in range(7):
            y = -0.010 + i * 0.016; z = HC.z - 0.030 - i * 0.030 - (0.004 if i % 2 else 0)
            ell(f"curl{sx}_{i}", (sx * (hr.x * 0.97 + (0.006 if i % 2 else 0)), HC.y + 0.020 + 0.0 * y, z + 0.060), 0.017 - i * 0.0010, HAIR, "head", seg=10, rings=8)
        ell(f"wisp{sx}", (sx * 0.070, surf_y(sx * 0.07, HC.z + 0.075, hr) + 0.004, HC.z + 0.070), (0.018, 0.012, 0.028), HAIR, "head", seg=10, rings=8)
    for i in range(6):
        x = -0.045 + i * 0.018
        ell(f"fringe{i}", (x, surf_y(x, HC.z + 0.088, hr * 1.04) - 0.004, HC.z + 0.088 + 0.004 * (i % 2)), (0.016, 0.013, 0.014), HAIR, "head", seg=10, rings=8)
    # glasses - translucent rose frames
    GL = mat("glasses", (0.85, 0.52, 0.56), 0.15, alpha=0.78, spec=0.8)
    LENS = mat("lens", (0.95, 0.85, 0.88), 0.05, alpha=0.18, spec=0.9)
    gy = surf_y(0, EZ, hr) - 0.030
    for sx in (1, -1):
        ring(f"gl_rim{sx}", (sx * EX, gy, EZ + 0.002), 0.036, 0.0036, GL, "head", rot=(math.pi / 2, 0, 0), scale=(1.0, 1.0, 1.0))
        cyl = limb(f"gl_lens{sx}", (sx * EX, gy + 0.0005, EZ + 0.002), (sx * EX, gy - 0.0005, EZ + 0.002), 0.0355, 0.0355, LENS, "head", verts=28)
        tube(f"gl_temple{sx}", [(sx * (EX + 0.036), gy + 0.004, EZ + 0.004), (sx * (hr.x + 0.004), HC.y - 0.020, EZ + 0.004), (sx * (hr.x + 0.004), HC.y + 0.030, EZ - 0.006)], 0.0030, GL, "head")
    tube("gl_bridge", [(-EX + 0.034, gy, EZ + 0.010), (0, gy - 0.006, EZ + 0.016), (EX - 0.034, gy, EZ + 0.010)], 0.0032, GL, "head")

# ---- neck
limb("neck", (0, 0.004, Z['neck'] - 0.01), (0, 0.004, Z['head'] + 0.045), 0.050 * BW ** 0.5, 0.047, SKIN, "neck")
# ---- torso
if W:
    ell("chest", (0, 0.0, Z['ch'] + 0.045), (0.158, 0.100, 0.165), TOP, "chest", seg=32, rings=18)
    ell("abdomen", (0, 0.003, Z['sp'] + 0.025), (0.140, 0.095, 0.130), TOP, "spine", seg=32, rings=16)
    ell("vneck", (0, -0.060, Z['neck'] - 0.052), (0.050, 0.060, 0.062), SKIN, "chest", seg=20, rings=12, rot=(0.2, 0, 0))
    ell("collar", (0, -0.012, Z['neck'] - 0.010), (0.082, 0.070, 0.022), TOP, "chest", seg=24, rings=8)
    ell("pelvis", (0, 0.004, Z['hip'] + 0.045), (0.165, 0.108, 0.098), PANTS, "hips", seg=28, rings=14)
else:
    ell("chest", (0, 0.0, Z['ch'] + 0.040), (0.172 * BW ** 0.5, 0.120, 0.165), TOP, "chest", seg=32, rings=18)
    ell("bust", (0, -0.060, Z['ch'] + 0.020), (0.150, 0.075, 0.075), TOP, "chest", seg=28, rings=14)
    ell("abdomen", (0, 0.005, Z['sp'] + 0.020), (0.170, 0.118, 0.135), TOP, "spine", seg=32, rings=16)
    ell("decollete", (0, -0.062, Z['neck'] - 0.040), (0.082, 0.052, 0.055), SKIN, "chest", seg=24, rings=12, rot=(0.25, 0, 0))
    ell("shoulder_skinL", (0.125, 0.0, Z['sh'] - 0.005), (0.070, 0.070, 0.050), SKIN, "chest", seg=16, rings=10)
    ell("shoulder_skinR", (-0.125, 0.0, Z['sh'] - 0.005), (0.070, 0.070, 0.050), SKIN, "chest", seg=16, rings=10)
    ell("pelvis", (0, 0.008, Z['hip'] + 0.035), (0.200, 0.128, 0.105), PANTS, "hips", seg=28, rings=14)
    ell("waist_tie", (-0.060, -0.118, Z['hip'] + 0.075), (0.032, 0.020, 0.028), PANTS, "hips", seg=12, rings=8)
    ell("waist_tie2", (0.050, -0.118, Z['hip'] + 0.050), (0.022, 0.016, 0.034), PANTS, "hips", seg=12, rings=8)
    for sx in (1, -1):   # straps
        tube(f"strap{sx}", [(sx * 0.085, -0.040, Z['ch'] + 0.105), (sx * 0.095, -0.020, Z['neck'] + 0.012), (sx * 0.110, 0.030, Z['sh'] + 0.020), (sx * 0.095, 0.075, Z['ch'] + 0.105)], 0.011, TOP, "chest")

# ---- necklaces / sunglasses
if W:
    pts = []
    for i in range(25):
        a = math.pi * 0.08 + (math.pi * 0.84) * i / 24 + math.pi
        pts.append((math.cos(a) * 0.060, 0.010 + math.sin(a) * 0.062 * (1 if math.sin(a) < 0 else 1) - 0.0, Z['neck'] - 0.030 - 0.095 * (math.sin(math.pi * i / 24)) ** 2))
    pts = [(x, y, z) for (x, y, z) in pts]
    # simple drop: chain hanging in a V from the neck sides to the chest centre
    pts = [(0.055, 0.0, Z['neck'] + 0.005), (0.050, -0.045, Z['neck'] - 0.040), (0.025, -0.092, Z['neck'] - 0.100),
           (0.0, -0.104, Z['neck'] - 0.118), (-0.025, -0.092, Z['neck'] - 0.100), (-0.050, -0.045, Z['neck'] - 0.040), (-0.055, 0.0, Z['neck'] + 0.005)]
    tube("necklace", pts, 0.0020, SILVER, "chest")
    tube("necklace_back", [(0.055, 0.0, Z['neck'] + 0.005), (0.03, 0.058, Z['neck'] + 0.0), (-0.03, 0.058, Z['neck'] + 0.0), (-0.055, 0.0, Z['neck'] + 0.005)], 0.0020, SILVER, "chest")
    SG = mat("sunglasses", (0.015, 0.015, 0.02), 0.1, spec=0.9)
    for sx in (1, -1):
        ell(f"sungl{sx}", (sx * 0.019, -0.110, Z['neck'] - 0.150), (0.0155, 0.0075, 0.021), SG, "chest", seg=18, rings=10, rot=(0.15, 0, sx * 0.1))
    tube("sungl_bridge", [(-0.005, -0.112, Z['neck'] - 0.130), (0.005, -0.112, Z['neck'] - 0.130)], 0.0025, SG, "chest")
    tube("sungl_arm", [(0.034, -0.108, Z['neck'] - 0.138), (0.050, -0.090, Z['neck'] - 0.080)], 0.0025, SG, "chest")
else:
    for k, (dz, n) in enumerate(((0.050, 1), (0.085, 2))):
        pts = [(0.055, 0.0, Z['neck'] + 0.005), (0.045, -0.050, Z['neck'] - dz * 0.5), (0.0, -0.090 + 0.012 * k, Z['neck'] - dz - 0.045), (-0.045, -0.050, Z['neck'] - dz * 0.5), (-0.055, 0.0, Z['neck'] + 0.005)]
        tube(f"necklace{k}", pts, 0.0017, GOLD, "chest")
    ell("pendant", (0.0, -0.090 + 0.012, Z['neck'] - 0.150), (0.004, 0.0025, 0.016), GOLD, "chest", seg=8, rings=6)
    for sx in (1, -1):   # hoop earrings
        ring(f"hoop{sx}", (sx * (hr.x + 0.008), HC.y + 0.012, HC.z - 0.050), 0.017, 0.0020, GOLD, "head", rot=(0, math.pi / 2, 0))

# ---- arms
TATT = mat("tattoo", (0.10, 0.12, 0.13), 0.6)
for side, sx in (("L", 1), ("R", -1)):
    x = sx * SH_X
    ell(f"shoulder{side}", (x, 0.0, Z['sh'] - 0.012), (0.058 * (BW ** 0.5), 0.058, 0.058), TOP if W else SKIN, f"upper_arm.{side}", seg=20, rings=14)
    if W:
        limb(f"sleeve{side}", (x, 0, Z['sh'] - 0.010), (x, 0, Z['sh'] - 0.145), 0.068, 0.073, TOP, f"upper_arm.{side}")
        limb(f"uarm_skin{side}", (x, 0, Z['sh'] - 0.14), (x, 0, Z['elb']), 0.058, 0.050, SKIN, f"upper_arm.{side}")
    else:
        limb(f"uarm{side}", (x, 0, Z['sh'] - 0.010), (x, 0, Z['elb']), 0.062, 0.052, SKIN, f"upper_arm.{side}")
    ell(f"elbow{side}", (x, 0, Z['elb']), 0.050 if not W else 0.052, SKIN, f"forearm.{side}", seg=16, rings=10)
    limb(f"farm{side}", (x, 0, Z['elb']), (x, 0, Z['wr'] + 0.012), 0.050 if W else 0.047, 0.040 if W else 0.038, SKIN, f"forearm.{side}")
    ell(f"palm{side}", (x, 0.004, Z['wr'] - 0.040 * S), (0.034, 0.020, 0.052 * S), SKIN, f"hand.{side}", seg=16, rings=10)
    ell(f"thumb{side}", (x - sx * 0.030 * -1 * -1 + (-sx * 0.006), -0.022, Z['wr'] - 0.040 * S), (0.012, 0.014, 0.030 * S), SKIN, f"hand.{side}", seg=10, rings=8)
    for fi in range(3):
        ell(f"finger{side}{fi}", (x + (fi - 1) * 0.013, 0.004, Z['wr'] - 0.092 * S), (0.0085, 0.011, 0.022 * S), SKIN, f"hand.{side}", seg=10, rings=8)
if W:  # tattoo sleeves on the right arm (character's right = -X): dark flattened ink patches
    import random; random.seed(11)
    x = -SH_X
    for i in range(18):
        t = i / 17; z = Z['sh'] - 0.14 - t * (Z['sh'] - 0.14 - Z['wr'] - 0.03)
        for k in range(2):
            a = random.uniform(math.radians(200), math.radians(340))
            rr = 0.053 if z > Z['elb'] else 0.047
            rr = rr * (1 - 0.18 * (1 - t) * 0) - 0.003
            p = (x + math.cos(a) * rr * 0.98, math.sin(a) * rr * 0.98, z + random.uniform(-0.008, 0.008))
            ell(f"ink{i}_{k}", p, (random.uniform(0.007, 0.014), 0.004, random.uniform(0.008, 0.017)), TATT, "upper_arm.R" if z > Z['elb'] else "forearm.R", rot=(0, 0, a), seg=8, rings=6)

# ---- legs & shoes
LW = 1.0 if W else 1.0
for side, sx in (("L", 1), ("R", -1)):
    x = sx * hx
    if W:
        limb(f"thigh{side}", (x, 0, Z['hip'] + 0.01), (x, 0, Z['knee']), 0.088, 0.066, PANTS, f"thigh.{side}")
        ell(f"knee{side}", (x, 0, Z['knee']), 0.067, PANTS, f"shin.{side}", seg=16, rings=10)
        limb(f"shin{side}", (x, 0, Z['knee']), (x, 0, Z['ankle'] + 0.025), 0.064, 0.050, PANTS, f"shin.{side}")
    else:   # wide-leg trousers - flared
        limb(f"thigh{side}", (x, 0, Z['hip'] + 0.01), (x, 0, Z['knee']), 0.112, 0.100, PANTS, f"thigh.{side}")
        ell(f"knee{side}", (x, 0, Z['knee']), 0.100, PANTS, f"shin.{side}", seg=16, rings=10)
        limb(f"shin{side}", (x, 0, Z['knee']), (x, 0, Z['ankle'] + 0.012), 0.100, 0.112, PANTS, f"shin.{side}")
    # sneaker
    sy = -0.062
    ell(f"shoe{side}", (x, sy, 0.050 * S + 0.012), (0.056 * BW ** .5, 0.130, 0.052), SHOE, f"foot.{side}", seg=24, rings=12)
    ell(f"toe{side}", (x, sy - 0.062, 0.040 + 0.006), (0.052 * BW ** .5, 0.070, 0.040), SHOE, f"foot.{side}", seg=20, rings=10)
    ell(f"sole{side}", (x, sy - 0.015, 0.016), (0.058 * BW ** .5, 0.160, 0.016), SOLE, f"foot.{side}", seg=24, rings=8)
    ell(f"heel{side}", (x, sy + 0.070, 0.062), (0.050 * BW ** .5, 0.050, 0.050), SHOE, f"foot.{side}", seg=14, rings=8)

HS = 1.30 if W else 1.30
P = Vector((0, 0, Z['head']))
for o, bname in PARTS:
    if bname == "head":
        o.location = P + (o.location - P) * HS
        for v in o.data.vertices: v.co *= HS
# ---------------------------------------------------------------- parent parts to bones
bpy.context.view_layer.update()
for o, bname in PARTS:
    o.parent = arm
    o.matrix_parent_inverse = arm.matrix_world.inverted()
    if bname:
        vg = o.vertex_groups.new(name=bname)
        vg.add([v.index for v in o.data.vertices], 1.0, 'REPLACE')
        md = o.modifiers.new("Armature", 'ARMATURE'); md.object = arm

# ---------------------------------------------------------------- animation
arm.rotation_mode = 'XYZ'
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
PB = arm.pose.bones
for pb in PB: pb.rotation_mode = 'XYZ'
BONES = [b.name for b in PB]

def reset():
    for pb in PB:
        pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)

def pose(d, frame, root=None):
    """d: {bone: (rx, ry, rz)} in each bone's local axes (X == world X). root: world (x,y,z) offset."""
    reset()
    for k, v in d.items(): PB[k].rotation_euler = Euler(v)
    if root is not None:
        PB["root"].location = (root[0], root[2], -root[1])     # root local: Y=world Z, Z=-world Y
    for pb in PB:
        pb.keyframe_insert("rotation_euler", frame=frame)
        pb.keyframe_insert("location", frame=frame)

def new_action(name):
    reset()
    a = bpy.data.actions.new(f"{KIND.upper()}_{name}")
    if arm.animation_data is None: arm.animation_data_create()
    arm.animation_data.action = a
    return a

def finish_action(a):
    a.use_fake_user = True

def ease_breath(f, n, amp=1.0):
    return math.sin(2 * math.pi * f / n) * amp

ACTIONS = []

# ---- idle_stand : subtle breathing, tiny sway, relaxed arms
a = new_action("idle_stand")
N = 72
for f in (0, 18, 36, 54, 72):
    b = math.sin(2 * math.pi * f / N)
    pose({"chest": (-0.015 * b, 0, 0), "spine": (0.01 * b, 0, 0), "head": (0.02 * b, 0.0, 0.0),
          "upper_arm.L": (0, 0, -0.04), "upper_arm.R": (0, 0, 0.04),
          "forearm.L": (-0.06, 0, 0), "forearm.R": (-0.06, 0, 0),
          "hips": (0, 0, 0.012 * b)}, f + 1)
finish_action(a); ACTIONS.append(a)

# ---- walk : 24 frame loop (contact@1, passing@7, contact@13, passing@19)
a = new_action("walk")
def walk_pose(ph):
    s = math.sin(ph); c = math.cos(ph)
    # knee bends while that leg swings forward (thigh velocity forward = d/dph of -s_l ... leg L swings fwd when cos(ph) < 0)
    kl = 0.08 + 0.85 * max(0.0, -c) ** 1.2
    kr = 0.08 + 0.85 * max(0.0, c) ** 1.2
    return {
        "thigh.L": (-0.50 * s, 0, 0), "thigh.R": (0.50 * s, 0, 0),
        "shin.L": (kl, 0, 0), "shin.R": (kr, 0, 0),
        "foot.L": (-0.12 * s, 0, 0), "foot.R": (0.12 * s, 0, 0),
        "upper_arm.L": (0.38 * s, 0, -0.05), "upper_arm.R": (-0.38 * s, 0, 0.05),
        "forearm.L": (-0.22 - 0.15 * max(0, -s), 0, 0), "forearm.R": (-0.22 - 0.15 * max(0, s), 0, 0),
        "spine": (0.05, 0.0, 0.07 * s), "chest": (0.0, 0, -0.07 * s), "head": (-0.03, 0, 0.0),
    }
for i, f in enumerate(range(0, 25, 3)):
    ph = 2 * math.pi * f / 24
    d = walk_pose(ph)
    bob = -0.020 * abs(math.cos(ph)) * 1.0 + 0.012          # lowest at contact
    pose(d, f + 1, root=(0.0, 0.0, bob))
finish_action(a); ACTIONS.append(a)

# ---- sit : numerically solve so the soles stay on the ground and the pelvis lands on a seat
SIT_THIGH = -1.50           # thighs ~horizontal (neg = forward)
SIT_SHIN = 1.40 + 0.10      # shins back down
SIT_LEAN = 0.10
def sit_dict(lean=SIT_LEAN):
    return {"thigh.L": (SIT_THIGH, 0, -0.04), "thigh.R": (SIT_THIGH, 0, 0.04),
            "shin.L": (SIT_SHIN - 0.05, 0, 0), "shin.R": (SIT_SHIN - 0.05, 0, 0),
            "foot.L": (-0.10, 0, 0), "foot.R": (-0.10, 0, 0),
            "hips": (lean, 0, 0), "spine": (0.03, 0, 0), "chest": (0.0, 0, 0), "head": (-0.12, 0, 0),
            "upper_arm.L": (-0.45, 0, -0.08), "upper_arm.R": (-0.45, 0, 0.08),
            "forearm.L": (-1.05, 0, 0.35), "forearm.R": (-1.05, 0, -0.35)}

def eval_world(bn, tail=True):
    bpy.context.view_layer.update()
    ev = arm.evaluated_get(bpy.context.evaluated_depsgraph_get())
    pb = ev.pose.bones[bn]
    return ev.matrix_world @ (pb.tail if tail else pb.head)

arm.animation_data.action = None
reset()
for k, v in sit_dict().items(): PB[k].rotation_euler = Euler(v)
ank = eval_world("shin.L")
sole_z = 0.095 * S
# solve root offset so ankle is at its standing position (y=0, z=ankle height)
SIT_ROOT = (0.0, -ank.y + 0.0, Z['ankle'] - ank.z)
reset()
for k, v in sit_dict().items(): PB[k].rotation_euler = Euler(v)
PB["root"].location = (0, SIT_ROOT[2], -SIT_ROOT[1])
pelvis_head = eval_world("hips", tail=False)
print("SIT root offset", SIT_ROOT, "pelvis joint", pelvis_head, "=> seat top ~", pelvis_head.z - 0.10, "seat edge y ~", pelvis_head.y)
SEAT_Z = pelvis_head.z - 0.10

a = new_action("sit_down")
N = 40
for f in range(0, N + 1, 4):
    t = f / N
    te = t * t * (3 - 2 * t)                       # smoothstep
    # shape: lean forward first, then lower
    lean_f = math.sin(min(1, t * 1.6) * math.pi) * 0.35
    d = {k: tuple(v * te for v in vals) for k, vals in sit_dict().items()}
    d["spine"] = (0.03 * te + lean_f * 0.6, 0, 0); d["chest"] = (lean_f * 0.4, 0, 0)
    d["upper_arm.L"] = (-0.45 * te + 0.25 * lean_f, 0, -0.04 - 0.04 * te)
    d["upper_arm.R"] = (-0.45 * te + 0.25 * lean_f, 0, 0.04 + 0.04 * te)
    r = (SIT_ROOT[0] * te, SIT_ROOT[1] * te, SIT_ROOT[2] * te - 0.0)
    pose(d, f + 1, root=r)
finish_action(a); ACTIONS.append(a)

a = new_action("idle_seated")
N = 72
for f in (0, 18, 36, 54, 72):
    b = math.sin(2 * math.pi * f / N)
    d = sit_dict(); d["spine"] = (0.03 + 0.012 * b, 0, 0); d["chest"] = (-0.015 * b, 0, 0); d["head"] = (-0.12 + 0.02 * b, 0, 0.0)
    pose(d, f + 1, root=SIT_ROOT)
finish_action(a); ACTIONS.append(a)

a = new_action("turn_180")
for f, t in zip((0, 6, 12, 18, 24), (0, 0.25, 0.6, 0.9, 1.0)):
    te = t * t * (3 - 2 * t)
    d = {"hips": (0, 0, math.pi * te), "head": (0, 0, -0.5 * math.sin(te * math.pi)),
         "thigh.L": (-0.2 * math.sin(te * math.pi), 0, 0), "thigh.R": (0.2 * math.sin(te * math.pi), 0, 0),
         "shin.L": (0.15 * math.sin(te * math.pi), 0, 0), "shin.R": (0.0, 0, 0)}
    # root local Z-rotation spins the whole body; hips-bone rotation about local Z (== world -Y) is wrong, use root:
    d = {"head": (0, 0, 0.0), "thigh.L": d["thigh.L"], "thigh.R": d["thigh.R"], "shin.L": d["shin.L"]}
    pose(d, f + 1)
    PB["root"].rotation_euler = Euler((0, math.pi * te, 0))     # root local Y == world Z => turn
    PB["root"].keyframe_insert("rotation_euler", frame=f + 1)
finish_action(a); ACTIONS.append(a)

a = new_action("wave")
for f, t in zip((0, 8, 16, 24, 32, 40), (0, 1, -1, 1, -1, 0)):
    d = {"upper_arm.R": (0, 0, 2.55 * (1 if abs(t) > 0 or f in (8, 16, 24, 32) else 0) if False else 0)}
    up = 1.0 if f not in (0, 40) else 0.0
    d = {"upper_arm.R": (-0.2 * up, 0, 2.5 * up), "forearm.R": (0.0, 0, 0.5 * t * up + 0.0), "head": (0, 0, -0.15 * up)}
    pose(d, f + 1)
finish_action(a); ACTIONS.append(a)

# ---------------------------------------------------------------- NLA tracks so every action is exported
bpy.ops.object.mode_set(mode='OBJECT')
ad = arm.animation_data
ad.action = None
for act in ACTIONS:
    tr = ad.nla_tracks.new(); tr.name = act.name
    try:
        st = tr.strips.new(act.name, int(act.frame_range[0]), act)
    except Exception as e:
        print("nla strip err", e)
# static default pose = idle_stand first frame
scene.frame_start, scene.frame_end = 1, 72

# ---------------------------------------------------------------- lighting + renders
def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

def setup_stage():
    world = bpy.data.worlds.new("w"); scene.world = world; world.use_nodes = True
    bg = world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.06, 0.03, 0.05, 1); bg.inputs[1].default_value = 0.5
    scene.view_settings.view_transform = 'Standard'
    # floor
    bpy.ops.mesh.primitive_circle_add(vertices=64, radius=1.6, fill_type='NGON', location=(0, 0, 0))
    fl = bpy.context.object; fl.name = "floor"
    m = bpy.data.materials.new("floor"); m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.09, 0.05, 0.07, 1)
    m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.35
    fl.data.materials.append(m)
    for c in fl.users_collection: c.objects.unlink(fl)
    scene.collection.objects.link(fl)
    def L(name, kind, loc, energy, color, size=1.5):
        bpy.ops.object.light_add(type=kind, location=loc)
        l = bpy.context.object; l.name = name; l.data.energy = energy; l.data.color = color
        if kind == 'AREA': l.data.size = size
        look_at(l, (0, 0, 1.0))
        for c in l.users_collection: c.objects.unlink(l)
        scene.collection.objects.link(l)
    L("key", 'AREA', (-2.2, -2.8, 2.6), 330, (1.0, 0.78, 0.55), 2.2)
    L("fill", 'AREA', (2.8, -2.0, 1.4), 120, (0.85, 0.75, 1.0), 2.5)
    L("rim", 'AREA', (0.8, 3.0, 2.6), 300, (1.0, 0.55, 0.45), 1.6)
    L("rim2", 'AREA', (-2.6, 2.4, 2.0), 200, (0.6, 0.7, 1.0), 1.6)
    cam_d = bpy.data.cameras.new("cam"); cam_d.lens = 55
    cam = bpy.data.objects.new("cam", cam_d); scene.collection.objects.link(cam); scene.camera = cam
    return cam

FAST = '--fast' in sys.argv
def render(path, cam, loc, target, res=(900, 1200), samples=48):
    if FAST: res = (res[0] // 2, res[1] // 2); samples = 12
    cam.location = loc; look_at(cam, target)
    scene.render.engine = 'CYCLES'; scene.cycles.samples = samples; scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

def set_pose_for_render(act, frame):
    ad.action = act; ad.use_nla = False
    scene.frame_set(frame)

cam = setup_stage()
os.makedirs(f"{OUT}/renders/{KIND}", exist_ok=True)
by = {a.name.split("_", 1)[1]: a for a in ACTIONS}
H = Z['headtop']
if "--norender" not in sys.argv:
    set_pose_for_render(by["idle_stand"], 1)
    # camera orbits: front, 3/4, side, back (character at origin, faces -Y)
    for nm, ang in (("front", 0), ("three_quarter", 35), ("side", 90), ("back", 180)):
        r = 3.6; ra = math.radians(ang)
        render(f"{OUT}/renders/{KIND}/{nm}.png", cam, (math.sin(ra) * r, -math.cos(ra) * r, H * 0.55), (0, 0, H * 0.52))
    render(f"{OUT}/renders/{KIND}/face.png", cam, (0.5, -1.15, Z['head'] + 0.12), (0, 0, Z['head'] + 0.08), res=(900, 900), samples=64)
    set_pose_for_render(by["walk"], 4)
    render(f"{OUT}/renders/{KIND}/walk_pose.png", cam, (2.6, -2.9, H * 0.55), (0, 0, H * 0.5), res=(900, 900))
    set_pose_for_render(by["sit_down"], 41)
    render(f"{OUT}/renders/{KIND}/seated_pose.png", cam, (3.0, -2.2, H * 0.45), (0, 0.15, H * 0.4), res=(900, 900))

# ---------------------------------------------------------------- save + export
for nm in ("floor", "key", "fill", "rim", "rim2", "cam"):
    ob = bpy.data.objects.get(nm)
    if ob: bpy.data.objects.remove(ob, do_unlink=True)
ad.use_nla = True
os.makedirs(f"{OUT}/characters", exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=f"{OUT}/characters/{KIND}.blend")
bpy.ops.object.select_all(action='DESELECT')
for o in col.objects: o.select_set(True)
try:
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/characters/{KIND}.glb", export_format='GLB', use_selection=True,
                              export_animations=True, export_animation_mode='ACTIONS' if False else 'NLA_TRACKS',
                              export_apply=False, export_yup=True)
except TypeError:
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/characters/{KIND}.glb", export_format='GLB', use_selection=True, export_animations=True)
print("DONE", KIND, "seat_z", SEAT_Z, "sit_root", SIT_ROOT)
