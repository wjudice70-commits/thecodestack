/* Yavaş Yavaş: İstanbul bench scene (trial), with the rigged 3D William and Nesrin.
   They walk in at dusk, turn, sit on the bench, and then she looks at him and he looks back.
   Everything is a pure function of the film clock (at(T)), so skipping, seeking and reduced-motion stills
   always land on the right frame.

   Word of warning kept in the open: the faces are placeholder-quality. Likeness is iterated in
   characters/build_char.py, then models/*.glb is replaced. Nothing in this file depends on the faces. */
import * as K from "../kit.js";
import { loadCharacter } from "../characters.js";
const { THREE, V3, clamp, lerp, smooth } = K;

const TEXT = {
  walk: { kicker: { tr: "İstanbul", en: "İstanbul" }, title: { tr: "Yan yana", en: "Side by side" }, text: { tr: "Önce birlikte yürüdük.", en: "First, we walked together." } },
  sit: { kicker: { tr: "Gülhane Parkı", en: "Gülhane Park" }, title: { tr: "Oturduk", en: "We sat" }, text: { tr: "Acele yok. Yavaş yavaş.", en: "No rush. Slowly, slowly." } },
  glance: { kicker: { tr: "", en: "" }, title: { tr: "Bir bakış", en: "One glance" }, text: { tr: "Söze gerek kalmadan.", en: "No words needed." } },
  end: { kicker: { tr: "İstanbul", en: "İstanbul" }, proverb: "Yavaş yavaş, biz olduk.", trans: "Slowly, slowly, it became us.", cta: { tr: "Devam", en: "Continue" } },
};

const SEAT_H = .45;                 // bench seat height in metres (the characters were built to this)
const BENCH_SEAT_Z = .06;           // seat centre in the bench's own frame
const SUN = V3(-.8, .07, -.6).normalize();   // the dusk and the city lie this way

// Loads both characters. Called before the film starts so the cinema never opens on a missing file.
export async function load() {
  const [william, nesrin] = await Promise.all([loadCharacter("william"), loadCharacter("nesrin")]);
  return { william, nesrin };
}

export function build(ctx, data, assets) {
  const { renderer, lang, phone, post } = ctx;
  const Lx = (o) => o ? (o[lang] ?? o.en ?? o.tr) : "";
  const reduce = !!(window.YY && YY.reduceMotion);
  const savedPost = { ...post };
  const skyOpts = { sun: SUN, hor: 0x6a2612, mid: 0x1c0710, top: 0x050206, sunCol: 0xffa860 };
  const env = K.makeEnv(renderer, skyOpts);
  const M = K.makeMaterials(env);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x2a0c14, .006);
  scene.environment = env; scene.environmentIntensity = .75;
  const sky = K.makeSky(skyOpts); scene.add(sky);
  const camera = new THREE.PerspectiveCamera(28, 1, .05, 1400);

  /* ---------- light: the sunset behind the city is the key, so both of them are edge-lit; a warm lamp fills the faces ---------- */
  scene.add(new THREE.HemisphereLight(0x7a3040, 0x0a0706, .6));
  const sun = new THREE.DirectionalLight(0xffb06a, 3.4); sun.castShadow = true;
  const sm = phone ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 120 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0x9fb0d8, .4); fill.position.set(30, 25, 40); scene.add(fill);
  const lampKey = new THREE.PointLight(0xffa65a, 9, 14, 1.6); lampKey.position.set(2.2, 2.4, 2.4); scene.add(lampKey);

  /* ---------- set: gravel round the bench, a path in, plane trees, lamps, the strait and the old city far away ---------- */
  const park = new THREE.Group(); scene.add(park);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(34, 64), M.ground); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; park.add(ground);
  const gravel = new THREE.Mesh(new THREE.CircleGeometry(5.5, 48), new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 1 })); gravel.rotation.x = -Math.PI / 2; gravel.position.y = .01; gravel.receiveShadow = true; park.add(gravel);
  const cobble = K.canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = "#1a1512"; x.fillRect(0, 0, w, h); const r = K.rng(4);
    for (let j = 0; j < 22; j++) for (let i = 0; i < 16; i++) { const ox = (j % 2) * 16; x.fillStyle = `hsl(25,${12 + r() * 10}%,${16 + r() * 12}%)`; x.beginPath(); x.ellipse(i * 32 + ox + 16, j * 24 + 12, 14, 10, 0, 0, 7); x.fill(); }
  });
  cobble.wrapS = cobble.wrapT = THREE.RepeatWrapping; cobble.repeat.set(2, 6);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 16), new THREE.MeshStandardMaterial({ map: cobble, roughness: .6, envMap: env, envMapIntensity: .3 }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, .02, 9); path.receiveShadow = true; park.add(path);
  const bench = K.bench(M); park.add(bench);
  for (const [x, z, s] of [[-3.4, -2.8, 1], [4.4, -4.2, 2], [-7.5, 3.5, 3], [8, 5, 4]]) { const t = K.planeTree(s * 11, 9 + s, M); t.position.set(x, 0, z); park.add(t); }
  const lampBack = K.lamp(M); lampBack.position.set(-1.4, 0, -.7); lampBack.userData.light.intensity = 10; park.add(lampBack);
  const lampFar = K.lamp(M); lampFar.position.set(5.6, 0, 7.5); lampFar.userData.light.intensity = 6; park.add(lampFar);
  const lampPath = K.lamp(M, false); lampPath.position.set(-2.2, 0, 11); park.add(lampPath);
  const dust = K.dust(phone ? 60 : 110, [-3, 3, .3, 4, -2, 6], 9); park.add(dust);
  // The strait below the park and the old city across it: three domes, minarets, a string of lights.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), M.water); water.rotation.x = -Math.PI / 2; water.position.y = -3.2; scene.add(water);
  const far = new THREE.Group(); scene.add(far);
  far.rotation.y = Math.atan2(SUN.x, SUN.z);   // local +z points towards the sun and the city
  const spots = [[-26, 155, 9, 4], [10, 168, 12, 4], [48, 150, 10, 6]];
  for (const [x, z, r, mn] of spots) { const m = K.mosque(M, { r, minarets: mn, minH: r * 4.4 }); m.position.set(x, -3.2, z); far.add(m); }
  const R = K.rng(23);
  for (let i = 0; i < (phone ? 40 : 70); i++) {
    const x = lerp(-120, 120, R()), z = lerp(140, 190, R());
    const b = K.block(lerp(8, 16, R()), lerp(5, 16, R()), lerp(7, 12, R()), M, i, [M.copper, M.gold, M.darkStone][i % 3]); b.position.set(x, -3.2, z); far.add(b);
  }
  const glints = K.bokehField(phone ? 140 : 260, [-140, 140, -3.1, -3, 100, 160], 12, [0xffb36b, 0xffd9a0]);
  glints.userData.u.scale.value = 260; far.add(glints);
  const bokeh = K.bokehField(phone ? 120 : 220, [-30, 30, 1, 14, -34, -10], 5); scene.add(bokeh);

  /* ---------- the two of them ---------- */
  const W = assets.william, N = assets.nesrin;
  scene.add(W.root, N.root);
  for (const c of [W, N]) c.root.traverse((o) => { if (o.isSkinnedMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // Measure the sit pose once, so the bench lands under them whatever the characters' proportions turn into.
  const sitEnd = (c) => c.measure({ sit_down: [c.clips.sit_down, 1] });
  const sw = sitEnd(W), sn = sitEnd(N);
  const seatTop = (m) => m.hips.y - .10;        // thigh underside; see build_char.py (SEAT_Z)
  const back = (m) => -m.hips.z;                // how far behind the ankles the pelvis ends up
  // Walking speed that stops the feet sliding: the planted foot sweeps back by its stride in half a cycle.
  const stride = (c) => {
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i < 24; i++) { const f = c.measure({ walk: [i / 24 * c.clips.walk, 1] }).footL; lo = Math.min(lo, f.z); hi = Math.max(hi, f.z); }
    return (hi - lo) / (c.clips.walk / 2);
  };
  const v = clamp((stride(W) + stride(N)) / 2, .5, 2);   // ground speed at which the clip's feet don't slide
  const speed = v * .8;                                   // a stroll: the clip plays a little slower, same stride

  const sitDur = Math.max(W.clips.sit_down, N.clips.sit_down), turnDur = Math.max(W.clips.turn_180, N.clips.turn_180);
  const Z0 = 6.4, XF = .3, HALT = .6;
  const cast = [
    { c: W, x: -.34, delay: 0, phase: 0, yawLook: 1 },        // he sits on the left as we face the bench
    { c: N, x: .34, delay: .35, phase: .45, yawLook: -1 },
  ];
  for (const p of cast) {
    p.stand = back(p.c === W ? sw : sn) + BENCH_SEAT_Z - .02;          // where to stand so the pelvis lands on the seat
    p.dy = SEAT_H - seatTop(p.c === W ? sw : sn);                        // tiny lift so thighs rest on the boards
    p.tw = (Z0 - p.stand) / speed + HALT / 2;                            // seconds to walk in
    p.tTurn = p.tw; p.tSit = p.tw + turnDur; p.tSeated = p.tSit + sitDur;
  }
  const tSeatedAll = Math.max(...cast.map((p) => p.delay + p.tSeated));

  // Glance schedule, measured from when both are seated.
  const G = { n1: tSeatedAll + 1.8, w1: tSeatedAll + 2.8, n2: tSeatedAll + 6.2, w2: tSeatedAll + 7.2, ramp: 1.1 };
  const glance = (T) => {      // 0..1 how far each head is turned to the other
    const ph = (a, b) => smooth(a, a + G.ramp, T) * (1 - smooth(b, b + G.ramp, T));
    return { n: ph(G.n1, G.n2), w: ph(G.w1, G.w2) };
  };

  function drive(p, T) {
    const c = p.c, s = T - p.delay, spec = {};
    let z, yaw, lift = 0;
    const L = Z0 - p.stand, tw = p.tw, h = HALT;
    if (s < p.tTurn) {
      // Walking in, easing to a halt over the last HALT seconds.
      const sc = Math.max(s, 0);
      const d = sc <= tw - h ? speed * sc : speed * (tw - h) + speed * ((sc - (tw - h)) - (sc - (tw - h)) ** 2 / (2 * h));
      z = Z0 - Math.min(d, L); yaw = Math.PI;
      const x = clamp((s - (tw - XF)) / XF), cw = 1 - smooth(0, 1, x);
      spec.walk = [d / v + p.phase, s < 0 ? 0 : cw];
      spec.turn_180 = [0, s < 0 ? 1 : 1 - cw];
    } else if (s < p.tSit) {
      z = p.stand; yaw = Math.PI; spec.turn_180 = [s - p.tTurn, 1];
    } else {
      // The turn ends facing the bench's front with the same pose as standing, so flip the body round and sit.
      z = p.stand; yaw = 0;
      const t = s - p.tSit;
      if (t < c.clips.sit_down) { spec.sit_down = [t, 1]; lift = p.dy * smooth(.35, 1, t / c.clips.sit_down); }
      else { spec.idle_seated = [t - c.clips.sit_down + p.phase, 1]; lift = p.dy; }
    }
    c.root.position.set(p.x, lift, z); c.root.rotation.y = yaw;
    return spec;
  }

  function stage(T) {
    const g = glance(T);
    for (const p of cast) {
      const spec = drive(p, T);
      const gz = p.c === N ? g.n : g.w;
      const seated = T - p.delay >= p.tSit;
      p.c.look = seated ? p.yawLook * gz * .78 : 0;
      p.c.lookPitch = seated ? gz * .05 : 0;
      p.c.pose(spec);
    }
  }

  /* ---------- camera ---------- */
  const _a = V3(0, 0, 0), _b = V3(0, 0, 0), _t = V3(0, 0, 0);
  let aspect = ctx.size.w / ctx.size.h, clock = 0;
  const vfov = () => aspect < .75 ? 38 : aspect < 1.1 ? 32 : 26;
  const hfov = () => 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(vfov()) / 2) * aspect);
  const distFor = (width) => (width / 2) / Math.tan(hfov() / 2);
  // Camera on a circle round `at`: az 0 = in front of the bench, 90° = on the +x side.
  const orbit = (at, az, width, height, out = V3(0, 0, 0)) => {
    const d = distFor(width), a = THREE.MathUtils.degToRad(az);
    return out.set(at.x + Math.sin(a) * d, height, at.z + Math.cos(a) * d);
  };
  const walkMid = (T) => {   // z of the pair half way between them
    const zs = cast.map((p) => drive(p, T) && p.c.root.position.z);
    return (zs[0] + zs[1]) / 2;
  };

  const tWalkEnd = Math.max(...cast.map((p) => p.delay + p.tTurn));
  const tSitStart = Math.min(...cast.map((p) => p.delay + p.tSit));
  const BEATS = {
    walk: [0, tWalkEnd + .6],
    sit: [tWalkEnd + .6, tSeatedAll + .9],
    glance: [tSeatedAll + .9, G.w2 + G.ramp + 1.8],
  };
  BEATS.end = [BEATS.glance[1], BEATS.glance[1] + 6.5];
  const dur = (k) => BEATS[k][1] - BEATS[k][0];

  function shot(T) {
    const bench0 = V3(0, 0, BENCH_SEAT_Z + .05);
    let look, pos, ap = 6, focusAt = null;
    if (T < BEATS.sit[0]) {
      // Walking in: a side-on dolly beside them, long lens, the city and the sun beyond.
      const k = T / dur("walk");
      const zc = walkMid(T);
      look = _a.set(0, 1.0, zc - .1);
      pos = orbit(look, lerp(68, 58, smooth(0, 1, k)), lerp(2.7, 2.2, k) * (aspect < .75 ? 1.15 : 1), lerp(1.05, 1.2, k), _b);
      pos.z += lerp(.2, 1.4, k);
      ap = 7;
    } else if (T < BEATS.glance[0]) {
      // Turn and sit: swing round to the front of the bench.
      const k = smooth(0, 1, (T - BEATS.sit[0]) / dur("sit"));
      look = _a.set(0, lerp(1.0, .95, k), lerp(cast[0].stand, bench0.z, k * .6));
      pos = orbit(look, lerp(58, 30, k), lerp(2.2, 2.0, k), lerp(1.2, 1.15, k), _b);
      ap = lerp(7, 4.2, k);
    } else {
      // The glance: close and slow, focus on the two faces.
      const k = clamp((T - BEATS.glance[0]) / (BEATS.end[1] - BEATS.glance[0]));
      look = _a.set(0, 1.05, bench0.z - .05);
      const wide = k > ((BEATS.end[0] - BEATS.glance[0]) / (BEATS.end[1] - BEATS.glance[0]));
      const kk = smooth(0, 1, (T - BEATS.glance[0]) / (dur("glance")));
      pos = orbit(look, lerp(30, 24, kk), lerp(1.95, 1.5, kk), lerp(1.15, 1.2, kk), _b);
      if (wide) {   // pull back for the end card
        const e = smooth(0, 1, (T - BEATS.end[0]) / 4.5);
        orbit(look, lerp(24, 22, e), lerp(1.5, 3.4, e), lerp(1.2, 1.25, e), pos);
      }
      ap = lerp(3.4, 2.6, kk);
    }
    camera.position.copy(pos); camera.lookAt(look);
    if (!reduce) { camera.rotateX(Math.sin(clock * .7) * .0016 + Math.sin(clock * 1.9) * .0006); camera.rotateY(Math.sin(clock * .5 + 1) * .0014); }
    if (camera.fov !== vfov()) { camera.fov = vfov(); camera.updateProjectionMatrix(); }
    post.focus = (focusAt ? _t.copy(focusAt) : _t.copy(look)).distanceTo(pos);
    post.aperture = ap; post.exposure = .95; post.bloomGain = .55;
  }

  function at(T, dt) {
    clock += dt;
    stage(T);
    const mid = walkMid(T);
    // The sun's shadows follow the pair.
    _t.set(0, 0, T < tWalkEnd ? mid : 0);
    sun.target.position.copy(_t); sun.position.copy(_t).addScaledVector(SUN, 60).add(V3(0, 18, 0));
    sky.userData.u.time.value = performance.now() / 1000;
    bokeh.userData.u.time.value = glints.userData.u.time.value = dust.userData.u.time.value = performance.now() / 1000;
    shot(T);
  }

  const mk = (key, extra) => {
    const [s, e] = BEATS[key], b = { dur: e - s, cap: { kicker: Lx(TEXT[key]?.kicker), title: Lx(TEXT[key]?.title), text: Lx(TEXT[key]?.text) }, fadeIn: 0, fadeOut: 0, ...extra };
    b.update = (lt, dt) => at(s + lt, dt);
    return b;
  };
  const beats = [
    mk("walk", { fadeIn: 1, still: dur("walk") * .55 }),
    mk("sit", { still: dur("sit") * .9 }),
    mk("glance", { still: dur("glance") * .72 }),
    mk("end", { cap: null, end: { kicker: Lx(TEXT.end.kicker), proverb: TEXT.end.proverb, trans: lang === "en" ? TEXT.end.trans : "", cta: Lx(TEXT.end.cta) }, fadeOut: .7, still: 3 }),
  ];

  function resize(w, h) { aspect = w / h; }
  function dispose() {
    Object.assign(post, savedPost);
    W.dispose(); N.dispose();
    scene.traverse((o) => { if (o.isSkinnedMesh) return; o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose(); x.dispose(); }); });
    env.dispose();
  }
  const film = { scene, camera, beats, resize, dispose, debug: { cast, speed, sw, sn, G, BEATS, stage, at } };
  return film;
}

export default { load, build };
