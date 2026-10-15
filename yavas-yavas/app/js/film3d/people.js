/* Yavaş Yavaş film people: Nesrin, William (Brother) and Nine, sculpted in code.
   Smooth sculpted forms lit by the scene, never cartoon features: faces are soft relief that only the
   light picks out. Each figure has a simple skeleton of groups so the film can pose and animate it. */
import { THREE, lathe, clamp, lerp } from "./kit.js";

const TAU = Math.PI * 2;

// A tapering limb hanging down from its joint (0,0,0) to (0,-len,0), with rounded ends and a muscle swell.
function limb(len, r0, r1, swell = .08, at = .6, seg = 16) {
  const pts = [];
  for (let i = 0; i <= 4; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / 4; pts.push([r1 * Math.cos(a), -len + r1 * Math.sin(a) * .7]); }
  const N = 12;
  for (let i = 1; i < N; i++) { const v = i / N, r = lerp(r1, r0, v) * (1 + swell * Math.exp(-((v - at) ** 2) / .06)); pts.push([r, -len + len * v]); }
  for (let i = 0; i <= 4; i++) { const a = Math.PI / 2 * i / 4; pts.push([r0 * Math.cos(a), r0 * Math.sin(a) * .7]); }
  return lathe(pts, seg);
}
const mesh = (g, m, shadow = true) => { const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o; };
const grp = (x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };

const BODY = {
  nesrin: { thigh: .44, shin: .42, foot: .075, hipW: .1, chestH: .42, shW: .175, ua: .29, fa: .25, neck: .085, headR: .106,
    thighR: [.092, .056], shinR: [.058, .034], uaR: [.046, .036], faR: [.037, .027],
    pelvis: [[.02, -.13], [.13, -.115], [.185, -.07], [.198, -.01], [.178, .06], [.142, .13]], pelvisS: [1, .78],
    chest: [[.142, 0], [.138, .08], [.155, .17], [.168, .25], [.165, .32], [.135, .38], [.07, .42], [.045, .44]], chestS: [1.06, .7] },
  michael: { thigh: .48, shin: .47, foot: .08, hipW: .1, chestH: .5, shW: .215, ua: .32, fa: .28, neck: .1, headR: .112,
    thighR: [.09, .055], shinR: [.058, .036], uaR: [.056, .042], faR: [.046, .032],
    pelvis: [[.02, -.12], [.13, -.11], [.165, -.06], [.17, .0], [.16, .07], [.15, .13]], pelvisS: [1, .75],
    chest: [[.152, 0], [.16, .1], [.18, .22], [.195, .34], [.19, .42], [.15, .47], [.07, .5], [.05, .52]], chestS: [1.12, .66] },
  nine: { thigh: .38, shin: .38, foot: .07, hipW: .095, chestH: .38, shW: .16, ua: .26, fa: .23, neck: .07, headR: .1,
    thighR: [.08, .05], shinR: [.05, .033], uaR: [.045, .035], faR: [.036, .026],
    pelvis: [[.02, -.12], [.13, -.1], [.18, -.06], [.19, .0], [.17, .07], [.15, .13]], pelvisS: [1, .82],
    chest: [[.15, 0], [.152, .1], [.16, .2], [.158, .28], [.13, .34], [.065, .38], [.04, .4]], chestS: [1.04, .78] },
};

function materials(env) {
  const m = (o) => new THREE.MeshStandardMaterial({ envMap: env, envMapIntensity: .5, ...o });
  const p = (o) => new THREE.MeshPhysicalMaterial({ envMap: env, envMapIntensity: .6, ...o });
  return {
    skinN: p({ color: 0xe6c6b4, roughness: .6, sheen: .2, sheenColor: 0xffd8c8 }),
    skinM: p({ color: 0xcfa894, roughness: .48, sheen: .3, sheenColor: 0xffc0a0, clearcoat: .15, clearcoatRoughness: .5 }),
    skinG: p({ color: 0xcf9e82, roughness: .6, sheen: .3, sheenColor: 0xffc0a0 }),
    hair: p({ color: 0xd9b26a, roughness: .38, sheen: 1, sheenColor: 0xfff0c8, sheenRoughness: .3, envMapIntensity: .9 }),
    sweater: p({ color: 0xe9dfcf, roughness: .95, sheen: .7, sheenColor: 0xffffff }),
    denim: m({ color: 0x1d2433, roughness: .85 }),
    sneaker: m({ color: 0xf2eee6, roughness: .6 }),
    pack: m({ color: 0x7a4a2a, roughness: .6 }),
    leather: p({ color: 0x5a3018, roughness: .42, clearcoat: .35, clearcoatRoughness: .45, envMapIntensity: .9 }),
    black: m({ color: 0x121214, roughness: .8 }),
    tee: m({ color: 0x1a1a1c, roughness: .9 }),
    eye: m({ color: 0x0a0605, roughness: .15, envMapIntensity: 1.6 }),
    lip: m({ color: 0xb8605a, roughness: .45 }),
    lipM: m({ color: 0x9c5a4a, roughness: .5 }),
    scarf: p({ color: 0x3a2a4a, roughness: .9, sheen: .5, sheenColor: 0xd9b0c0 }),
    coat: m({ color: 0x2a1c22, roughness: .92 }),
    skirt: m({ color: 0x161214, roughness: .9 }),
    umbrella: p({ color: 0xb3121f, roughness: .6, sheen: .6, sheenColor: 0xff6a6a, side: THREE.DoubleSide }),
    chrome: m({ color: 0x9a9a9e, metalness: 1, roughness: .28, envMapIntensity: 1.2 }),
    rubber: m({ color: 0x0e0e10, roughness: .9 }),
    seat: m({ color: 0x1a1416, roughness: .7 }),
  };
}

/* ---------------- Figure ---------------- */
export function makeFigure(kind, env) {
  const B = BODY[kind], M = materials(env), F = { kind, B, M, j: {}, extra: {} };
  const skin = kind === "nesrin" ? M.skinN : kind === "michael" ? M.skinM : M.skinG;
  const top = kind === "nesrin" ? M.sweater : kind === "michael" ? M.leather : M.coat;
  const legs = kind === "nesrin" ? M.denim : kind === "michael" ? M.black : M.skirt;
  const shoe = kind === "nine" ? M.black : M.sneaker;

  const root = grp(), hips = grp(0, B.thigh + B.shin + B.foot, 0); root.add(hips);
  const pel = mesh(lathe(B.pelvis, 22), legs); pel.scale.set(B.pelvisS[0], 1, B.pelvisS[1]); hips.add(pel);
  const spine = grp(0, .12, 0); hips.add(spine);
  const chest = grp(); spine.add(chest);
  const ch = mesh(lathe(B.chest, 24), top); ch.scale.set(B.chestS[0], 1, B.chestS[1]); chest.add(ch);
  if (kind === "nesrin") for (const s of [-1, 1]) { const b = mesh(new THREE.SphereGeometry(.068, 16, 12), top); b.position.set(s * .062, .25, .075); b.scale.set(1, .9, .75); chest.add(b); }
  if (kind === "michael") {
    const tee = mesh(new THREE.CylinderGeometry(.06, .08, .14, 16), M.tee); tee.position.set(0, .4, .055); tee.scale.z = .5; chest.add(tee);
    for (const s of [-1, 1]) { const lap = mesh(new THREE.BoxGeometry(.07, .3, .02), M.leather); lap.position.set(s * .07, .34, .115); lap.rotation.set(-.15, 0, s * .28); chest.add(lap); }
    const col = mesh(new THREE.TorusGeometry(.085, .025, 8, 20, Math.PI * 1.3), M.leather); col.position.set(0, .49, -.01); col.rotation.set(Math.PI / 2 + .3, 0, Math.PI * .85 + Math.PI); chest.add(col);
  }
  const neck = grp(0, B.chestH, 0); chest.add(neck);
  neck.add(mesh(limb(B.neck + .03, .05, .055, 0), skin).translateY(B.neck + .02));
  const head = grp(0, B.neck + .02, .01); neck.add(head);
  const skull = mesh(new THREE.SphereGeometry(B.headR, 32, 24), skin); skull.position.y = B.headR * 1.02; skull.scale.set(.86, 1.06, .98); head.add(skull);
  const jaw = mesh(new THREE.SphereGeometry(B.headR * .72, 24, 16), skin); jaw.position.set(0, B.headR * .5, B.headR * .22); jaw.scale.set(kind === "michael" ? .98 : .9, .78, .85); head.add(jaw);
  for (const s of [-1, 1]) { const ear = mesh(new THREE.SphereGeometry(B.headR * .22, 10, 8), skin); ear.position.set(s * B.headR * .84, B.headR * .98, -B.headR * .05); ear.scale.set(.35, 1, .7); head.add(ear); }
  // The face: soft relief, picked out only by the light.
  const face = grp(0, B.headR, B.headR * .86); head.add(face);
  const nose = mesh(new THREE.SphereGeometry(B.headR * .16, 12, 10), skin); nose.position.set(0, -.002, .04); nose.scale.set(.75, 1.25, 1); face.add(nose);
  const brow = mesh(new THREE.SphereGeometry(B.headR * .6, 20, 10), skin); brow.position.set(0, B.headR * .3, -.02); brow.scale.set(1.0, .22, .4); face.add(brow);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = grp(s * B.headR * .36, B.headR * .17, -.005); face.add(e);
    const ball = mesh(new THREE.SphereGeometry(B.headR * .085, 12, 10), M.eye, false); ball.visible = false; ball.scale.set(1.25, .7, .5); e.add(ball);
    eyes.push(e);
  }
  for (const s of [-1, 1]) { const ck = mesh(new THREE.SphereGeometry(B.headR * .26, 12, 10), skin); ck.position.set(s * B.headR * .42, -B.headR * .12, -.025); ck.scale.set(1, .8, .6); face.add(ck); F.extra[s < 0 ? "cheekL" : "cheekR"] = ck; }
  const mouth = mesh(new THREE.TorusGeometry(B.headR * .2, B.headR * (kind === "nesrin" ? .045 : .03), 8, 20, Math.PI * .7), kind === "nesrin" ? M.lip : M.lipM, false);
  mouth.position.set(0, -B.headR * .38, .012); mouth.visible = false; mouth.rotation.z = Math.PI + Math.PI * .15; face.add(mouth);
  F.extra.eyes = eyes; F.extra.mouth = mouth;

  // Arms
  const arm = (s) => {
    const sh = grp(s * B.shW, B.chestH - .07, 0); chest.add(sh);
    sh.add(mesh(new THREE.SphereGeometry(B.uaR[0] * 1.15, 14, 10), top));
    sh.add(mesh(limb(B.ua, B.uaR[0], B.uaR[1], .1, .7), top));
    const el = grp(0, -B.ua, 0); sh.add(el);
    el.add(mesh(limb(B.fa, B.faR[0], B.faR[1], .12, .75), top));
    const cuffSkin = mesh(limb(.03, B.faR[1] * .9, B.faR[1] * .85, 0), skin); cuffSkin.position.y = -B.fa + .01; el.add(cuffSkin);
    const wr = grp(0, -B.fa - .01, 0); el.add(wr);
    const palm = mesh(limb(.085, .024, .026, .1, .6), skin); palm.scale.set(1.25, 1, .42); wr.add(palm);
    for (let f = 0; f < 4; f++) { const fg = mesh(limb(.07 - Math.abs(f - 1.5) * .008, .0085, .0062, 0), skin); fg.position.set((f - 1.5) * .0165, -.08, 0); fg.rotation.x = -.25; wr.add(fg); }
    const thumb = mesh(limb(.05, .0095, .0075, 0), skin); thumb.position.set(-s * .025, -.025, .012); thumb.rotation.set(-.5, 0, s * .55); wr.add(thumb);
    return { sh, el, wr };
  };
  const L = arm(-1), R = arm(1);
  // Legs
  const leg = (s) => {
    const th = grp(s * B.hipW, -.03, 0); hips.add(th);
    th.add(mesh(limb(B.thigh, B.thighR[0], B.thighR[1], .06, .7), legs));
    const kn = grp(0, -B.thigh, 0); th.add(kn);
    kn.add(mesh(limb(B.shin, B.shinR[0], B.shinR[1], .14, .72), legs));
    const an = grp(0, -B.shin, 0); kn.add(an);
    const f = mesh(new THREE.CapsuleGeometry(.045, .15, 6, 12), shoe); f.rotation.x = Math.PI / 2; f.position.set(0, -B.foot * .55, .055); f.scale.set(kind === "michael" ? 1.1 : 1, 1, .85); an.add(f);
    return { th, kn, an };
  };
  const LL = leg(-1), RL = leg(1);
  Object.assign(F.j, { root, hips, spine, chest, neck, head, face, sL: L.sh, eL: L.el, wL: L.wr, sR: R.sh, eR: R.el, wR: R.wr, tL: LL.th, kL: LL.kn, aL: LL.an, tR: RL.th, kR: RL.kn, aR: RL.an });

  if (kind === "nesrin") addHair(F, B, M);
  if (kind === "nesrin") { const pk = mesh(new THREE.BoxGeometry(.26, .32, .13, 2, 2, 2), M.pack); roundBox(pk.geometry, .04); pk.position.set(0, .22, -.17); chest.add(pk); F.extra.pack = pk; for (const s of [-1, 1]) { const st = mesh(new THREE.TorusGeometry(.12, .012, 6, 16, Math.PI), M.pack); st.position.set(s * .095, .3, -.03); st.rotation.set(0, Math.PI / 2, -.3); chest.add(st); } }
  if (kind === "nine") addScarf(F, B, M);
  if (kind === "nine") { const sk = mesh(lathe([[.2, -.62], [.23, -.4], [.21, -.1], [.17, .05], [.15, .13]], 24), M.skirt); sk.scale.z = .85; hips.add(sk); }
  F.root = root;
  F.root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  return F;
}

// Round a box's corners by pushing its vertices toward a rounded shape.
function roundBox(g, r) {
  const p = g.attributes.position; g.computeBoundingBox(); const b = g.boundingBox, hs = new THREE.Vector3(); b.getSize(hs).multiplyScalar(.5);
  const v = new THREE.Vector3(), inner = hs.clone().subScalar(r);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const c = v.clone().clamp(inner.clone().negate(), inner); const d = v.clone().sub(c);
    if (d.lengthSq() > 0) { d.setLength(r); v.copy(c).add(d); } p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
}

// Long blonde hair: a cap and a curtain of tapered locks that swing with her step.
function addHair(F, B, M) {
  const h = F.j.head, r = B.headR;
  const cap = mesh(new THREE.SphereGeometry(r * 1.09, 32, 20, 0, TAU, 0, Math.PI * .6), M.hair); cap.position.set(0, r * 1.06, -.008); cap.rotation.x = -.38; cap.scale.set(.93, 1.06, 1.04); h.add(cap);
  const back = mesh(new THREE.SphereGeometry(r * 1.06, 24, 16), M.hair); back.position.set(0, r * .95, -r * .2); back.scale.set(.95, 1.05, .9); h.add(back);
  const locks = [], n = 15;
  for (let i = 0; i < n; i++) {
    const a = lerp(-1.95, 1.95, i / (n - 1)), side = Math.abs(a) > 1.45;
    const pv = grp(Math.sin(a) * r * .9, r * (side ? 1.2 : 1.3), -Math.cos(a) * r * .85 + (side ? r * .25 : 0)); h.add(pv);
    const len = (side ? .34 : .42) + Math.sin(i * 2.1) * .03;
    const lk = mesh(limb(len, r * .3, r * .06, .25, .7, 10), M.hair); lk.scale.set(1.45, 1, .55); lk.rotation.y = -a; pv.add(lk);
    pv.userData.base = { x: .1 + (side ? .05 : 0), z: Math.sin(a) * .18, a };
    locks.push(pv);
  }
  F.extra.locks = locks;
}
// Nine's headscarf (yazma): soft cap over the hair, knotted under the chin, falling over the shoulders.
function addScarf(F, B, M) {
  const h = F.j.head, r = B.headR;
  const cap = mesh(new THREE.SphereGeometry(r * 1.16, 28, 20, 0, TAU, 0, Math.PI * .72), M.scarf); cap.position.set(0, r * 1.0, -.015); cap.rotation.x = -.45; h.add(cap);
  const drape = mesh(lathe([[.0, -.2], [.16, -.18], [.15, -.05], [.11, .05], [.02, .1]], 20), M.scarf); drape.position.set(0, r * .8, -.03); drape.scale.set(1.1, 1, .8); h.add(drape);
  const fr = mesh(new THREE.TorusGeometry(r * .92, r * .1, 8, 28, Math.PI * 1.15), M.scarf); fr.position.set(0, r * .95, .02); fr.rotation.set(-.2, 0, Math.PI * -.075); h.add(fr);
}

/* ---------------- Props: walking aids, wheelchair, umbrella ---------------- */
export function makeWheelchair(F) {
  const M = F.M, g = grp();
  const wl = grp(-.31, .3, -.08), wr = grp(.31, .3, -.08);
  for (const [w, x] of [[wl, -1], [wr, 1]]) {
    const tire = mesh(new THREE.TorusGeometry(.3, .016, 10, 44), M.rubber); tire.rotation.y = Math.PI / 2; w.add(tire);
    const rim = mesh(new THREE.TorusGeometry(.27, .006, 6, 44), M.chrome); rim.rotation.y = Math.PI / 2; rim.position.x = x * .025; w.add(rim);
    for (let i = 0; i < 12; i++) { const s = mesh(new THREE.CylinderGeometry(.0025, .0025, .52, 4), M.chrome); s.rotation.x = i / 12 * Math.PI; w.add(s); }
    g.add(w);
  }
  for (const x of [-.22, .22]) {
    const cw = mesh(new THREE.TorusGeometry(.055, .015, 6, 16), M.rubber); cw.rotation.y = Math.PI / 2; cw.position.set(x, .055, .32); g.add(cw);
    const fr = mesh(new THREE.CylinderGeometry(.012, .012, .5, 6), M.chrome); fr.position.set(x * 1.2, .35, .1); fr.rotation.x = .35; g.add(fr);
    const bk = mesh(new THREE.CylinderGeometry(.012, .012, .55, 6), M.chrome); bk.position.set(x * 1.25, .72, -.22); bk.rotation.x = -.12; g.add(bk);
  }
  const seat = mesh(new THREE.BoxGeometry(.46, .04, .44), M.seat); seat.position.set(0, .48, .02); g.add(seat);
  const back = mesh(new THREE.BoxGeometry(.46, .38, .03), M.seat); back.position.set(0, .7, -.21); back.rotation.x = -.1; g.add(back);
  const foot = mesh(new THREE.BoxGeometry(.36, .02, .14), M.chrome); foot.position.set(0, .1, .36); g.add(foot);
  g.userData.wheels = [wl, wr];
  return g;
}
export function makeWalker(F) {
  const M = F.M, g = grp();
  for (const x of [-.27, .27]) {
    for (const z of [-.18, .18]) { const l = mesh(new THREE.CylinderGeometry(.012, .012, .82, 8), M.chrome); l.position.set(x, .41, z); g.add(l); const t = mesh(new THREE.SphereGeometry(.022, 8, 6), M.rubber); t.position.set(x, .01, z); g.add(t); }
    const top = mesh(new THREE.CylinderGeometry(.013, .013, .4, 8), M.chrome); top.rotation.x = Math.PI / 2; top.position.set(x, .82, 0); g.add(top);
    const grip = mesh(new THREE.CylinderGeometry(.018, .018, .12, 8), M.rubber); grip.rotation.x = Math.PI / 2; grip.position.set(x, .835, -.1); g.add(grip);
  }
  const bar = mesh(new THREE.CylinderGeometry(.012, .012, .54, 8), M.chrome); bar.rotation.z = Math.PI / 2; bar.position.set(0, .78, .18); g.add(bar);
  return g;
}
export function makeCrutch(F) {
  const M = F.M, g = grp();
  const shaft = mesh(new THREE.CylinderGeometry(.011, .011, 1.0, 8), M.chrome); shaft.position.y = .5; g.add(shaft);
  const cuff = mesh(new THREE.TorusGeometry(.045, .01, 6, 16, Math.PI * 1.3), M.rubber); cuff.position.y = 1.14; cuff.rotation.set(0, 0, -Math.PI * .15); g.add(cuff);
  const upper = mesh(new THREE.CylinderGeometry(.01, .01, .25, 8), M.chrome); upper.position.y = 1.03; upper.rotation.x = .25; g.add(upper);
  const grip = mesh(new THREE.CylinderGeometry(.016, .016, .11, 8), M.rubber); grip.rotation.x = Math.PI / 2; grip.position.set(0, .82, .05); g.add(grip);
  const tip = mesh(new THREE.CylinderGeometry(.02, .016, .04, 8), M.rubber); tip.position.y = .02; g.add(tip);
  return g;
}
export function makeUmbrella(F) {
  const M = F.M, g = grp();
  const shaft = mesh(new THREE.CylinderGeometry(.007, .007, .85, 6), M.black); shaft.position.y = .42; g.add(shaft);
  const hook = mesh(new THREE.TorusGeometry(.04, .01, 6, 12, Math.PI), M.wood ?? M.black); hook.position.set(.04, 0, 0); hook.rotation.z = Math.PI; g.add(hook);
  const can = mesh(new THREE.ConeGeometry(.55, .24, 8, 2, true), M.umbrella); can.position.y = .78; g.add(can);
  const geo = can.geometry, p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), r = Math.hypot(x, z); const sc = 1 - .06 * Math.abs(Math.sin(a * 4)) * (r / .55); p.setXYZ(i, x * sc, y - .02 * Math.abs(Math.sin(a * 4)) * (r / .55), z * sc); }
  geo.computeVertexNormals();
  const tip = mesh(new THREE.CylinderGeometry(.006, .004, .07, 6), M.black); tip.position.y = .93; g.add(tip);
  return g;
}

/* ---------------- Poses and gaits ---------------- */
// Angles: "swing" is forward (+) / back (−) about the hip or shoulder. Figures face +z.
const sw = (j, a) => { j.rotation.x = -a; };
export function rest(F) {
  const j = F.j;
  for (const k of ["hips", "spine", "chest", "neck", "head", "sL", "sR", "eL", "eR", "wL", "wR", "tL", "tR", "kL", "kR", "aL", "aR"]) j[k].rotation.set(0, 0, 0);
  j.hips.position.y = F.B.thigh + F.B.shin + F.B.foot; j.hips.position.x = 0; j.hips.position.z = 0;
  j.sL.rotation.z = -.08; j.sR.rotation.z = .08; j.eL.rotation.x = -.15; j.eR.rotation.x = -.15;
}

// Mobility modes: wheelchair, walker, crutches, walk, run.
export const MODES = ["wheelchair", "walker", "crutches", "walk", "run"];
export const SPEED = { wheelchair: 1.0, walker: .45, crutches: .8, walk: 1.25, run: 3.4, sit: 0, stand: 0 };
const CADENCE = { wheelchair: .55, walker: .5, crutches: .62, walk: .95, run: 1.45 };

export function gait(F, mode, t, opts = {}) {
  rest(F);
  const j = F.j, B = F.B, ph = t * (CADENCE[mode] ?? 1), s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
  const legLen = B.thigh + B.shin + B.foot;
  if (mode === "run") {
    sw(j.tL, .25 + .75 * s); sw(j.tR, .25 - .75 * s);
    j.kL.rotation.x = .35 + 1.15 * Math.max(0, Math.sin(ph * TAU - 1.9)) ** .8; j.kR.rotation.x = .35 + 1.15 * Math.max(0, Math.sin(ph * TAU - 1.9 + Math.PI)) ** .8;
    j.aL.rotation.x = -.2 + .35 * s; j.aR.rotation.x = -.2 - .35 * s;
    sw(j.sL, -.7 * s); sw(j.sR, .7 * s); j.eL.rotation.x = -1.45; j.eR.rotation.x = -1.45;
    j.sL.rotation.z = -.12; j.sR.rotation.z = .12;
    j.hips.position.y = legLen * .96 + .055 * Math.abs(c); j.hips.rotation.y = .12 * s; j.chest.rotation.y = -.22 * s;
    j.spine.rotation.x = .2; j.neck.rotation.x = -.12;
  } else if (mode === "walk") {
    sw(j.tL, .38 * s); sw(j.tR, -.38 * s);
    j.kL.rotation.x = .08 + .55 * Math.max(0, Math.sin(ph * TAU - 1.6)); j.kR.rotation.x = .08 + .55 * Math.max(0, Math.sin(ph * TAU - 1.6 + Math.PI));
    sw(j.sL, -.32 * s); sw(j.sR, .32 * s); j.eL.rotation.x = -.25; j.eR.rotation.x = -.25;
    j.hips.position.y = legLen * .995 + .02 * Math.abs(c); j.hips.rotation.y = .08 * s; j.chest.rotation.y = -.1 * s; j.hips.rotation.z = .04 * s;
  } else if (mode === "walker") {
    const k = .5 - .5 * Math.cos(ph * TAU * 2);
    sw(j.tL, .25 * s + .1); sw(j.tR, -.25 * s + .1);
    j.kL.rotation.x = .2 + .35 * Math.max(0, Math.sin(ph * TAU - 1.4)); j.kR.rotation.x = .2 + .35 * Math.max(0, Math.sin(ph * TAU - 1.4 + Math.PI));
    j.spine.rotation.x = .28; j.neck.rotation.x = -.2;
    sw(j.sL, .62 - .08 * k); sw(j.sR, .62 - .08 * k); j.eL.rotation.x = -.42; j.eR.rotation.x = -.42; j.wL.rotation.x = .5; j.wR.rotation.x = .5;
    j.hips.position.y = legLen * .97 + .012 * Math.abs(c);
  } else if (mode === "crutches") {
    const k = .5 - .5 * Math.cos(ph * TAU);
    sw(j.tL, lerp(-.15, .35, k)); sw(j.tR, lerp(-.1, .3, k)); j.kL.rotation.x = .15 + .3 * Math.sin(ph * TAU) ** 2; j.kR.rotation.x = .25 + .25 * Math.sin(ph * TAU) ** 2;
    sw(j.sL, lerp(.35, -.05, k)); sw(j.sR, lerp(.35, -.05, k)); j.sL.rotation.z = -.22; j.sR.rotation.z = .22; j.eL.rotation.x = -.35; j.eR.rotation.x = -.35;
    j.spine.rotation.x = .12; j.hips.position.y = legLen * .98 + .03 * Math.sin(ph * TAU);
  } else if (mode === "wheelchair" || mode === "sit") {
    seated(F, opts.seatH ?? .5);
    if (mode === "wheelchair") { const k = .5 - .5 * Math.cos(ph * TAU); sw(j.sL, lerp(-.35, .45, k)); sw(j.sR, lerp(-.35, .45, k)); j.sL.rotation.z = -.28; j.sR.rotation.z = .28; j.eL.rotation.x = -lerp(.9, .3, k); j.eR.rotation.x = -lerp(.9, .3, k); j.spine.rotation.x = .1 + .12 * k; }
  }
  hairSway(F, mode, ph, opts);
}
export function seated(F, seatH = .47) {
  const j = F.j, B = F.B;
  j.hips.position.y = seatH + .08; j.hips.position.z = -.02;
  sw(j.tL, 1.5); sw(j.tR, 1.5); j.tL.rotation.z = .06; j.tR.rotation.z = -.06;
  j.kL.rotation.x = 1.45; j.kR.rotation.x = 1.45; j.aL.rotation.x = -.1; j.aR.rotation.x = -.1;
  void B;
}
function hairSway(F, mode, ph, o = {}) {
  if (!F.extra.locks) return;
  const run = mode === "run" ? 1 : mode === "walk" ? .4 : .15;
  const t = o.time ?? ph;
  F.extra.locks.forEach((l, i) => {
    const b = l.userData.base;
    l.rotation.x = b.x + run * (.35 + .12 * Math.sin(ph * TAU * 2 + i * .7)) + .03 * Math.sin(t * 1.3 + i);
    l.rotation.z = b.z * (1 - run * .3) + run * .08 * Math.sin(ph * TAU + i * .5);
  });
}

// Put an aid with the figure for a mode: returns the prop and an updater.
export function aidFor(F, mode) {
  if (mode === "wheelchair") { const w = makeWheelchair(F); return { obj: w, update: (dist) => { for (const wh of w.userData.wheels) wh.rotation.x = dist / .3; } }; }
  if (mode === "walker") { const w = makeWalker(F); return { obj: w, update: () => {} }; }
  if (mode === "crutches") {
    const g = new THREE.Group(), a = makeCrutch(F), b = makeCrutch(F); a.position.x = -.3; b.position.x = .3; g.add(a, b);
    return { obj: g, update: () => {} };
  }
  return null;
}

// Pose a blink or wink (0 open .. 1 closed) and a smile (0..1).
export function face(F, { winkR = 0, blink = 0, smile = 0 } = {}) {
  const [eL, eR] = F.extra.eyes;
  eL.scale.y = 1 - .88 * blink; eR.scale.y = 1 - .88 * Math.max(blink, winkR);
  F.extra.cheekR.position.y = -F.B.headR * .12 + winkR * .006 + smile * .003; F.extra.cheekL.position.y = -F.B.headR * .12 + smile * .003;
  const m = F.extra.mouth; m.scale.set(1 + smile * .25, 1 + smile * .5, 1); m.rotation.z = Math.PI + Math.PI * .15 - smile * .08;
}

export { clamp };

// Reach a hand to a world point: a few passes of cyclic coordinate descent on shoulder and elbow.
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _pi = new THREE.Quaternion();
export function reach(F, side, target, iters = 10) {
  const sh = F.j["s" + side], el = F.j["e" + side], wr = F.j["w" + side];
  for (let it = 0; it < iters; it++) {
    for (const jt of [el, sh]) {
      F.root.updateMatrixWorld(true);
      jt.getWorldPosition(_a); wr.getWorldPosition(_b);
      _b.sub(_a).normalize(); _c.copy(target).sub(_a).normalize();
      _q.setFromUnitVectors(_b, _c);
      jt.parent.getWorldQuaternion(_pq); _pi.copy(_pq).invert();
      jt.quaternion.premultiply(_pi.multiply(_q).multiply(_pq));
      if (jt === el) { el.rotation.setFromQuaternion(el.quaternion); el.rotation.set(clamp(el.rotation.x, -2.6, 0), 0, 0); }
    }
  }
  F.root.updateMatrixWorld(true);
}
