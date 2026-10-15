/* Yavaş Yavaş: the shape every city film shares.
   1. The hill: Nesrin moves away from us up a hill at dusk, edge-lit by the sunset beyond the crest.
   2. The rise: at the top the city unfolds from the ground like a pop-up storybook, in gold, copper and emerald.
   3. The scrapbook: four clips of her backpacking through the city (a landmark, someone she knows, local food, a festival).
   4. The bench: the city's most loved bench. Polaroids, a tear, a hand on her knee. He was there all along.
   5. The sky: he points up; an old aeroplane writes the city's proverb in smoke.
   A city module supplies the set and the four clips; this file supplies everything else. */
import * as K from "./kit.js";
import * as P from "./people.js";
const { THREE, V3, clamp, lerp, smooth, easeFilm } = K;
const CY = K.CITY_Y;

export function buildFilm(ctx, city, data) {
  const { renderer, lang, phone, post } = ctx;
  const Lx = (o) => o ? (o[lang] ?? o.en ?? o.tr) : "";
  const reduce = !!(window.YY && YY.reduceMotion);
  const skyOpts = { sun: V3(0, .06, 1), ...city.sky };
  const env = K.makeEnv(renderer, skyOpts);
  const M = K.makeMaterials(env);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(city.fog ?? 0x2a0c14, .0028);
  const sky = K.makeSky(skyOpts); scene.add(sky);
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 1400);

  /* Light: the sunset behind the crest is the key (so figures are edge-lit), a dim upper-left fill, crimson sky bounce. */
  const hemi = new THREE.HemisphereLight(0x6a2a3a, 0x0a0706, .55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb06a, 3.2); sun.castShadow = true;
  sun.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 160 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0x9fb0d8, .35); fill.position.set(-40, 50, -30); scene.add(fill);
  const sunDir = skyOpts.sun.clone().normalize();
  const shadowAt = (p, span = 6) => {
    sun.target.position.copy(p); sun.position.copy(p).addScaledVector(sunDir, 80); sun.position.y = p.y + 13;
    const c = sun.shadow.camera; c.left = c.bottom = -span; c.right = c.top = span; c.updateProjectionMatrix();
  };

  /* The hill and the grass */
  const hill = K.makeHill(); scene.add(hill);
  const grass = K.makeGrass(phone ? 12000 : 26000, [0, 14, -70, 4], K.hillHeight, sunDir); scene.add(grass);
  const dustA = K.dust(phone ? 90 : 160, [-8, 8, -2, 6, -40, 4], 3); scene.add(dustA);

  /* The city: a ground for it to rise from, then whatever the city module builds. */
  const cityGrp = new THREE.Group(); scene.add(cityGrp);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 420), M.ground); ground.rotation.x = -Math.PI / 2; ground.position.set(0, CY - .02, 200); ground.receiveShadow = true; cityGrp.add(ground);
  const pops = [];
  const pop = (obj, x, z, delay, yaw = 0, y = CY) => {
    const d = delay ?? 1 + clamp((330 - z) / 290) * 5.5 + Math.abs(x) * .002;
    obj.rotation.y = yaw; const p = K.popPiece(obj, V3(x, y, z), d); cityGrp.add(p); pops.push(p); return p;
  };
  let popT = 0;

  /* People */
  const nes = P.makeFigure("nesrin", env), mic = P.makeFigure("michael", env), nine = P.makeFigure("nine", env);
  scene.add(nes.root, mic.root, nine.root); mic.root.visible = false;
  const umbrella = P.makeUmbrella(nine); nine.j.wR.add(umbrella); umbrella.position.set(0, -.08, 0); umbrella.rotation.set(Math.PI, 0, 0);
  let mode = ctx.mode || "walk", aid = null;
  function setMode(m) {
    mode = m;
    if (aid) nes.root.remove(aid.obj);
    aid = P.aidFor(nes, m); if (aid) { nes.root.add(aid.obj); if (m === "walker") aid.obj.position.z = .45; }
  }
  setMode(mode);
  // Gait for a moment of the film: on the hill her chosen way of moving; in the clips running becomes walking.
  const clipMode = () => mode === "run" ? "walk" : mode;
  function placeN(pos, yaw, m, t, dist = 0) {
    nes.root.position.copy(pos); nes.root.rotation.y = yaw;
    if (m === "stand") { const base = mode === "wheelchair" ? "wheelchair" : mode === "walker" ? "walker" : mode === "crutches" ? "crutches" : "walk"; P.gait(nes, base, 0, { time: t }); if (mode === "wheelchair") P.seated(nes, .5); }
    else P.gait(nes, m, t, { time: t });
    if (aid) {
      aid.update(dist);
      if (mode === "crutches") { const k = m === "stand" ? 0 : .5 - .5 * Math.cos(t * .62 * Math.PI * 2); aid.obj.children.forEach(c => { c.rotation.x = lerp(-.25, .12, k); c.position.z = .12; }); }
    }
  }

  /* Camera: long lens, slow dolly, a breath of handheld */
  const _t = new THREE.Vector3();
  let clock = 0;
  function cam(pos, look, fov, focusOn) {
    camera.position.copy(pos); camera.lookAt(look);
    if (!reduce) { camera.rotateX(Math.sin(clock * .7) * .0016 + Math.sin(clock * 1.9) * .0006); camera.rotateY(Math.sin(clock * .5 + 1) * .0014); }
    if (fov && camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    post.focus = (focusOn ? _t.copy(focusOn) : _t.copy(look)).distanceTo(pos);
  }
  const head = (F, out = new THREE.Vector3()) => { F.root.updateMatrixWorld(true); return F.j.head.localToWorld(out.set(0, F.B.headR, 0)); };

  /* The city module builds the set and its clips */
  const api = { THREE, K, P, M, scene, cityGrp, pop, nes, nine, mic, placeN, cam, post, shadowAt, clipMode: () => clipMode(), mode: () => mode, head, env, phone, CY, lang };
  city.build(api);
  const clips = city.clips(api);
  const benchAt = city.bench.pos.clone(), benchYaw = city.bench.yaw ?? 0;
  const benchFwd = V3(Math.sin(benchYaw), 0, Math.cos(benchYaw)), benchRight = V3(-Math.cos(benchYaw), 0, Math.sin(benchYaw));

  /* Bench set: trees, lamps, gravel, polaroids */
  const park = new THREE.Group(); park.position.copy(benchAt); park.rotation.y = benchYaw; scene.add(park);
  const b = K.bench(M); park.add(b);
  const gravel = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 1 })); gravel.rotation.x = -Math.PI / 2; gravel.position.y = .01; gravel.receiveShadow = true; park.add(gravel);
  for (const [x, z, s] of [[-3.2, -2.6, 1], [3.8, -3.4, 2], [-6, 3, 3], [7, 4, 4]]) { const t = K.planeTree(s * 11, 9 + s, M); t.position.set(x, 0, z); park.add(t); }
  const lampL = K.lamp(M); lampL.position.set(-1.35, 0, -.35); park.add(lampL);
  const lampR = K.lamp(M); lampR.position.set(5.5, 0, 2.5); lampR.userData.light.intensity = 6; park.add(lampR);
  const photos = (data.photos || []).slice(0, 3);
  const pols = [0, 1, 2].map(i => K.polaroid(photos[i], i + 3));
  pols.forEach(p => { p.castShadow = true; scene.add(p); });
  const parkDust = K.dust(phone ? 60 : 110, [-3, 3, .3, 4, -2, 2], 9); park.add(parkDust);
  const tear = new THREE.Mesh(new THREE.SphereGeometry(.0035, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0, metalness: .1, envMap: env, envMapIntensity: 3, emissive: 0x332a22 }));
  tear.scale.y = 1.3; scene.add(tear);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.004, .006, 24), new THREE.MeshBasicMaterial({ color: 0xffe8d0, transparent: true, opacity: 0, depthWrite: false })); scene.add(ring);
  let wet = false;
  const toBench = (x, y, z) => benchAt.clone().addScaledVector(benchRight, x).addScaledVector(benchFwd, z).setY(benchAt.y + y);

  /* The bench scene staging, shared by its beats. */
  function benchPose(t, o = {}) {
    clock = t;
    const nPos = mode === "wheelchair" ? toBench(-1.25, 0, .05) : toBench(-.38, 0, .02);
    placeN(nPos, benchYaw, mode === "wheelchair" ? "stand" : "sit", t);
    if (mode !== "wheelchair") P.seated(nes, .45);
    if (aid && mode !== "wheelchair") { aid.obj.visible = false; } else if (aid) aid.obj.visible = true;
    // Looking down at the photo in her hands.
    const j = nes.j; j.spine.rotation.x = .12; j.neck.rotation.x = .38 - (o.lookUp ?? 0) * .9; j.head.rotation.x = .12 - (o.lookUp ?? 0) * .3;
    j.head.rotation.y = (o.turn ?? 0) * -.35;
    nes.root.updateMatrixWorld(true);
    const lap = nPos.clone().addScaledVector(benchFwd, .33).setY(benchAt.y + .7);
    P.reach(nes, "L", lap.clone().addScaledVector(benchRight, -.05)); P.reach(nes, "R", lap.clone().addScaledVector(benchRight, .06));
    // The polaroid she holds, and two more beside her on the bench.
    pols[0].position.copy(lap).add(V3(0, .025, 0)); pols[0].lookAt(head(nes)); pols[0].rotateZ(.05);
    pols[1].position.copy(toBench(.12, .47, .06)); pols[1].rotation.set(-Math.PI / 2, 0, benchYaw + .4);
    pols[2].position.copy(toBench(.2, .4725, -.02)); pols[2].rotation.set(-Math.PI / 2, 0, benchYaw - .3);
    // William, there all along.
    mic.root.visible = o.him !== false;
    const mPos = toBench(.42, 0, 0); mic.root.position.copy(mPos); mic.root.rotation.y = benchYaw - .12;
    P.rest(mic); P.seated(mic, .45); mic.j.spine.rotation.x = -.06; mic.j.head.rotation.y = (o.himLook ?? .35);
    mic.j.neck.rotation.x = o.himDown ?? .1;
    if (o.handOnKnee) { nes.root.updateMatrixWorld(true); const kn = nes.j.kL.getWorldPosition(new THREE.Vector3()).add(V3(0, .06, 0)).addScaledVector(benchFwd, .02); P.reach(mic, "R", kn); }
    else { P.reach(mic, "R", toBench(.25, .62, .25)); }
    if (o.armAround) { const k = o.armAround; const sh = nes.j.sR.getWorldPosition(new THREE.Vector3()).add(V3(0, .05, -.06)); const rest = toBench(.25, .62, .25); P.reach(mic, "R", rest.lerp(sh, k)); }
    if (o.point) { const k = o.point; const hd = head(mic); const up = hd.clone().add(V3(0, .7, 0)).addScaledVector(benchFwd, .5).addScaledVector(benchRight, .1); P.reach(mic, "L", toBench(.62, .62, .3).lerp(up, k)); }
    else P.reach(mic, "L", toBench(.6, .6, .3));
    P.face(mic, { smile: o.smile ?? .3, winkR: o.wink ?? 0, blink: 0 });
    P.face(nes, { smile: o.nSmile ?? .5 });
    shadowAt(benchAt, 3);
  }

  /* The sky: the aeroplane and its smoke */
  const plane = K.biplane(M); plane.scale.setScalar(1); scene.add(plane); plane.visible = false;
  const smoke = K.smokeSystem(phone ? 5200 : 9000); scene.add(smoke);
  const prov = data.proverb || { tr: ["Yavaş yavaş"], en: "Slowly, slowly." };
  let skyBuilt = false, skyBox = null;
  const SK = { loop0: 1.6, loop1: 5.4, write0: 6.0, write1: 13.0 };
  const camBack = () => toBench(.05, 1.15, -2.3);
  function buildSky() {
    // Size the writing to fit this screen, a long way off over the city.
    const D = 300, cp = camBack(), dir = benchFwd.clone().multiplyScalar(.87).add(V3(0, .5, 0)).normalize();
    const center = cp.clone().addScaledVector(dir, D);
    const vf = 46 * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const visW = 2 * D * Math.tan(hf / 2), visH = 2 * D * Math.tan(vf / 2);
    const lines = prov.tr;
    const tp = K.textPoints(lines, phone ? 4 : 3);
    let W = visW * .88, H = W / tp.aspect; if (H > visH * .42) { H = visH * .42; W = H * tp.aspect; }
    const right = benchRight.clone(), up = V3(0, 1, 0).sub(dir.clone().multiplyScalar(dir.y)).normalize();
    const at = (u, v) => center.clone().addScaledVector(right, (u - .5) * W).addScaledVector(up, (.5 - v) * H);
    skyBox = { center, right, up, W, H, at, lines: lines.length, D };
    smoke.userData.reset();
    // The loop's trail.
    for (let t = SK.loop0; t < SK.loop1; t += 1 / 50) { const p = planeAt(t); for (let k = 0; k < 2; k++) { const s = Math.random(); smoke.userData.emit(p, p.clone().add(V3((s - .5) * 2, (Math.random() - .5) * 2, (Math.random() - .5) * 2)), t, s); } }
    // The letters, written line by line, the plane flying back and forth.
    const n = lines.length, seg = (SK.write1 - SK.write0) / n;
    const max = (phone ? 5200 : 9000) - smoke.userData.count; const stride = Math.max(1, Math.ceil(tp.pts.length / max));
    tp.pts.forEach((q, i) => {
      if (i % stride) return;
      const lr = q.line % 2 === 0, u = lr ? q.u : 1 - q.u;
      const bt = SK.write0 + q.line * seg + clamp((u - .04) / .92) * seg * .86;
      const target = at(q.u, q.v), from = planeAt(bt);
      smoke.userData.emit(from, target, bt, Math.random());
    });
    smoke.userData.commit();
    skyBuilt = true;
  }
  // Where the aeroplane is at sky-time t.
  function planeAt(t) {
    if (!skyBox) return V3(0, 0, 0);
    const { center, right, up, W, H, at, lines } = skyBox;
    if (t < SK.loop1) {
      // Enters high from the right and turns one slow loop.
      const k = clamp((t - .2) / (SK.loop1 - .2));
      const a = k * Math.PI * 2.0, R = H * .55;
      const c0 = center.clone().addScaledVector(right, W * .18).addScaledVector(up, H * .55);
      const enter = clamp(1 - (t - .2) / 1.4);
      return c0.addScaledVector(right, Math.sin(a) * R + enter * W * .6).addScaledVector(up, -Math.cos(a) * R + R * .2);
    }
    const n = lines, seg = (SK.write1 - SK.write0) / n;
    if (t < SK.write0) { const k = (t - SK.loop1) / (SK.write0 - SK.loop1); return at(lerp(.7, -.02, easeFilm(k)), .1 + .1 * k); }
    const li = Math.min(n - 1, Math.floor((t - SK.write0) / seg)), k = clamp((t - SK.write0 - li * seg) / (seg * .86));
    const lr = li % 2 === 0, u = lerp(-.02, 1.02, k), v = (li + .5) / n;
    const turn = clamp(((t - SK.write0 - li * seg) - seg * .86) / (seg * .14));
    const p = at(lr ? u : 1 - u, v + Math.sin(k * 30) * .006);
    if (turn > 0) p.addScaledVector(right, (lr ? 1 : -1) * Math.sin(turn * Math.PI) * W * .05).addScaledVector(up, -turn * H / n);
    return p;
  }
  function skyUpdate(t) {
    if (!skyBuilt) buildSky();
    smoke.userData.u.time.value = t;
    smoke.userData.u.scale.value = ctx.size.H * 1.1;
    const p = planeAt(t), q = planeAt(t + .05);
    plane.visible = t > .2 && t < SK.write1 + 1.6;
    plane.position.copy(p); plane.lookAt(t < SK.write1 ? q : p.clone().add(skyBox.right)); plane.rotateZ(t < SK.loop1 ? 0 : .08 * Math.sin(t * 2));
    plane.userData.blade.rotation.z = t * 40;
    plane.scale.setScalar(skyBox.W / 120);
    if (t > SK.write1) { const k = t - SK.write1; plane.position.addScaledVector(skyBox.right, k * k * 18).addScaledVector(skyBox.up, k * 9); }
  }

  /* ---------------- Beats ---------------- */
  const stopNo = data.stopNo ?? 1, stops = data.stops ?? 15;
  const t = data.text || {};
  const hillDur = 11, crest = V3(0, 0, 0);
  const beats = [];
  beats.push({
    id: "hill", dur: hillDur, fadeOut: 0, still: 7,
    cap: { kicker: `${Lx({ tr: "Vardın", en: "You arrived" })} · ${Lx({ tr: `Durak ${stopNo} / ${stops}`, en: `Stop ${stopNo} of ${stops}` })}`, title: data.name, text: Lx(t.hill) },
    enter() { popT = 0; K.updatePop(pops, 0); mic.root.visible = false; nine.root.visible = false; nes.root.visible = true; post.aperture = 9; post.exposure = .92; },
    update(lt) {
      clock = lt;
      const v = P.SPEED[mode], T = hillDur - .6, s = lt < T ? -v * (T - lt) : 0;
      const z = s, x = K.pathX(z), y = K.hillHeight(x, z);
      const moving = lt < T;
      placeN(V3(x, y, z), Math.atan2(K.pathX(z + .5) - x, .5), moving ? mode : "stand", lt, v * lt);
      const d = lerp(4.2, 13, easeFilm(lt / hillDur)) + (mode === "run" ? 0 : -1.5);
      const cz = z - d, cx = K.pathX(cz) + .9;
      const cp = V3(cx, K.hillHeight(cx, cz) + 1.05 + d * .08, cz);
      cam(cp, V3(x * .5, y + 1.25 + d * .06, z + 3), 24, V3(x, y + 1.1, z));
      shadowAt(V3(x, y, z), 5);
      grass.userData.u.time.value = lt; dustA.userData.u.time.value = lt;
    },
  });
  beats.push({
    id: "rise", dur: 13, join: true, fadeIn: 0, still: 10.5,
    cap: { title: "", text: Lx(t.rise) },
    enter() { nes.root.visible = true; post.aperture = 7; },
    update(lt) {
      clock = hillDur + lt;
      popT = lt - .6; K.updatePop(pops, popT);
      placeN(crest, 0, "stand", hillDur + lt);
      nes.j.neck.rotation.x = -.12 * smooth(1, 5, lt);    // she lifts her head as the city rises
      const k = easeFilm(clamp(lt / 11.5));
      const cp = V3(lerp(.9, 1.7, k), lerp(1.75, 2.5, k), lerp(-6.5, -5.2, k));
      const look = V3(lerp(0, 9, k), lerp(1.5, CY + 26, k), lerp(4, 160, k));
      cam(cp, look, lerp(24, 30, k), V3(0, lerp(1.4, CY + 14, smooth(.15, .7, k)), lerp(0, 140, smooth(.15, .7, k))));
      post.aperture = lerp(7, 4, k);
      shadowAt(crest, 5);
      grass.userData.u.time.value = hillDur + lt;
    },
  });
  clips.forEach((c, i) => {
    const ct = (t.clips || [])[i] || {};
    beats.push({
      id: "clip" + i, dur: c.dur ?? 7, scrap: true, fadeIn: .45, fadeOut: .45, still: c.still,
      cap: { kicker: Lx(ct.kicker) || `${i + 1} / ${clips.length}`, title: Lx(ct.title), text: Lx(ct.text) },
      enter() { K.updatePop(pops, 99); nes.root.visible = true; mic.root.visible = false; nine.root.visible = false; if (aid) aid.obj.visible = true; c.enter?.(); },
      update(lt, dt, k) { clock = 30 + i * 9 + lt; c.update(lt, k); },
    });
  });
  beats.push({
    id: "bench", dur: 6.5, fadeIn: .9, fadeOut: .3, still: 4,
    cap: { title: Lx(t.benchTitle), text: Lx(t.bench) },
    enter() { K.updatePop(pops, 99); nine.root.visible = false; post.aperture = 6; wet = false; tear.visible = false; ring.material.opacity = 0; pols.forEach(p => p.visible = true); },
    update(lt) {
      benchPose(lt, { him: false });
      const k = easeFilm(lt / 6.5);
      const cp = toBench(lerp(-3.4, -2.6, k), 1.35, lerp(-3.8, -3.1, k)), look = toBench(-.2, .75, .2);
      cam(cp, look, 26, toBench(-.38, .9, .1));
      parkDust.userData.u.time.value = lt;
    },
  });
  beats.push({
    id: "photo", dur: 6, fadeIn: .25, fadeOut: .25, still: 4.6,
    cap: null,
    enter() { wet = false; tear.visible = false; post.aperture = 3.2; },
    update(lt) {
      benchPose(6.5 + lt, { him: false });
      const pc = pols[0].position.clone(), hd = head(nes);
      const eye = hd.clone().lerp(pc, .38).add(V3(0, .05, 0)).addScaledVector(benchRight, .1);
      cam(eye.lerp(pc, easeFilm(lt / 6) * .12), pc, 34, pc);
      // A tear falls on the photo.
      const t0 = 2.3, fall = .55, from = hd.clone().addScaledVector(benchFwd, .08).add(V3(0, -.03, 0));
      if (lt > t0) {
        const k = clamp((lt - t0) / fall);
        tear.visible = k < 1; tear.position.copy(from.lerp(pc.clone().add(V3(.012, .002, -.006)), k * k));
        if (k >= 1 && !wet) { wet = true; K.wetSpot(pols[0], .58, .44); }
        const r = clamp((lt - t0 - fall) / 1.2); ring.position.copy(pc).add(V3(.012, .004, -.006)); ring.quaternion.copy(pols[0].quaternion);
        ring.scale.setScalar(1 + r * 3); ring.material.opacity = r > 0 ? (1 - r) * .55 : 0;
      } else tear.visible = false;
    },
  });
  beats.push({
    id: "hand", dur: 4.5, fadeIn: .25, fadeOut: .25, still: 3,
    cap: null,
    enter() { tear.visible = false; ring.material.opacity = 0; post.aperture = 3.5; },
    update(lt) {
      benchPose(12.5 + lt, { handOnKnee: true, himLook: .55, himDown: .35 });
      const kn = nes.j.kL.getWorldPosition(new THREE.Vector3());
      const cp = kn.clone().addScaledVector(benchFwd, .95).addScaledVector(benchRight, .35).add(V3(0, .25 - easeFilm(lt / 4.5) * .05, 0));
      cam(cp, kn.clone().add(V3(.02, .02, 0)), 26, kn);
    },
  });
  beats.push({
    id: "wink", dur: 5, fadeIn: .25, fadeOut: .25, still: 3.1,
    cap: null,
    enter() { post.aperture = 3.6; },
    update(lt) {
      const wink = smooth(2.6, 2.85, lt) * (1 - smooth(3.15, 3.45, lt));
      benchPose(17 + lt, { handOnKnee: true, himLook: lerp(.8, .42, smooth(1, 2.4, lt)), himDown: -.02, smile: smooth(.8, 2.2, lt) * .9 + .1, wink });
      const hd = head(mic);
      const cp = hd.clone().addScaledVector(benchFwd, .55).addScaledVector(benchRight, .9).add(V3(0, .02, 0));
      cam(cp.lerp(hd, easeFilm(lt / 5) * .08), hd.clone().add(V3(0, -.02, 0)), 22, hd);
    },
  });
  beats.push({
    id: "point", dur: 5.5, fadeIn: .25, fadeOut: 0, still: 4.5,
    cap: null,
    enter() { post.aperture = 5; plane.visible = false; },
    update(lt) {
      const arm = smooth(.3, 2, lt), pt = smooth(2.4, 4.2, lt);
      benchPose(22 + lt, { handOnKnee: false, armAround: arm, point: pt, himLook: lerp(.4, 0, pt), himDown: lerp(.1, -.5, pt), lookUp: smooth(3.2, 5, lt), turn: arm * .4, smile: .7 });
      const cp = camBack(), look = toBench(0, 1.0, 1).lerp(toBench(0, 2.4, 6), smooth(3.4, 5.5, lt));
      cam(cp, look, 34, toBench(0, 1, 0));
      skyUpdate(-1);
      parkDust.userData.u.time.value = 22 + lt;
    },
  });
  const skyDur = 15;
  const skyCam = (lt) => {
    const k = easeFilm(clamp(lt / 3.2));
    const look = toBench(0, 2.4, 6).lerp(skyBox.center.clone().addScaledVector(skyBox.up, -skyBox.H * .15), k);
    cam(camBack(), look, lerp(34, 46, k), skyBox.center);
    post.aperture = lerp(5, 1.2, k);
  };
  beats.push({
    id: "sky", dur: skyDur, join: true, fadeIn: 0, fadeOut: 0, still: 13.5,
    cap: null,
    enter() { if (!skyBuilt) buildSky(); },
    update(lt) {
      benchPose(27.5 + lt, { armAround: 1, point: 1 - smooth(9, 12, lt) * .0, himLook: 0, himDown: -.5, lookUp: 1, turn: .4, smile: .7 });
      skyUpdate(lt); skyCam(lt);
    },
  });
  beats.push({
    id: "end", dur: 8, join: true, fadeIn: 0, fadeOut: 1.2, still: 5,
    cap: null,
    end: { kicker: Lx({ tr: `${data.name} atasözü`, en: `${data.name} proverb` }), proverb: prov.tr.join(" "), trans: lang === "en" ? prov.en : "", cta: Lx({ tr: "Devam", en: "Continue" }) },
    update(lt) {
      benchPose(42.5 + lt, { armAround: 1, point: 1 - smooth(0, 2.5, lt), himLook: 0, himDown: -.4, lookUp: 1, turn: .4, smile: .7 });
      skyUpdate(skyDur + lt); skyCam(skyDur + lt);
      post.exposure = lerp(1, .8, smooth(2, 8, lt));
    },
  });

  function resize() { if (skyBuilt) { skyBuilt = false; } }
  function dispose() {
    scene.traverse(o => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { x.map?.dispose(); x.emissiveMap?.dispose(); x.dispose(); }); });
    env.dispose();
  }
  return { scene, camera, beats, setMode, resize, dispose };
}
