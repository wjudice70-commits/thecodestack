/* Yavaş Yavaş film kit: the shared set pieces every city film is built from.
   Sky, hill, grass, pop-up city pieces, trees, lamps, bench, polaroids, the old aeroplane and its smoke.
   Everything is drawn in code. One palette: deep black, crimson, warm sodium light, and for the cities
   gold, copper and emerald. */
import * as THREE from "../vendor/three.module.min.js";

export { THREE };
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const V2 = (x, y) => new THREE.Vector2(x, y);
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
export const rng = (seed = 1) => { let s = (seed * 9301 + 49297) % 233280 || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; };

// The one timing curve, --ease-film: cubic-bezier(.22, .61, .21, 1).
export const easeFilm = (() => {
  const x1 = .22, y1 = .61, x2 = .21, y2 = 1;
  const bx = (t) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = (t) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  return (x) => {
    x = clamp(x); let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 18; i++) { t = (lo + hi) / 2; if (bx(t) < x) lo = t; else hi = t; }
    return by(t);
  };
})();
// A paper pop-up spring: rises, overshoots a touch, settles.
export const popEase = (x) => { x = clamp(x); return 1 - Math.cos(x * Math.PI * 1.5) * Math.exp(-x * 5.2) * (1 - x * .1); };

export const PAL = {
  gold: 0xd9a54a, paleGold: 0xf4d39a, copper: 0xb5683c, emerald: 0x0d6b47, deepEmerald: 0x063a28,
  crimson: 0x8f1d2e, sodium: 0xffb36b, black: 0x050405, cream: 0xf3ece4,
};

/* ---------------- Materials (shared, created once per film) ---------------- */
export function makeMaterials(env) {
  const std = (o) => new THREE.MeshStandardMaterial({ envMap: env, envMapIntensity: .9, ...o });
  const phys = (o) => new THREE.MeshPhysicalMaterial({ envMap: env, envMapIntensity: 1, ...o });
  return {
    gold: std({ color: PAL.gold, metalness: 1, roughness: .3 }),
    paleGold: std({ color: PAL.paleGold, metalness: 1, roughness: .22, emissive: 0x4a2a08, emissiveIntensity: .4 }),
    copper: std({ color: PAL.copper, metalness: .95, roughness: .38 }),
    patina: std({ color: 0x1f7a5a, metalness: .55, roughness: .42, emissive: 0x02160d, emissiveIntensity: 1 }),
    emerald: phys({ color: PAL.emerald, metalness: .2, roughness: .12, clearcoat: 1, clearcoatRoughness: .1, emissive: 0x05391f, emissiveIntensity: 1.4 }),
    emeraldGlow: std({ color: 0x0a2a1c, emissive: 0x29d08a, emissiveIntensity: 1.6, roughness: .4 }),
    stone: std({ color: 0x9a8a7c, roughness: .85 }),
    darkStone: std({ color: 0x3a3230, roughness: .9 }),
    paper: std({ color: 0x2a1c18, roughness: .95 }),
    ground: std({ color: 0x14100e, roughness: .95, envMapIntensity: .3 }),
    water: std({ color: 0x050a10, metalness: .9, roughness: .12, envMapIntensity: 1.4 }),
    iron: std({ color: 0x141214, metalness: .7, roughness: .45 }),
    wood: std({ color: 0x5a3b26, roughness: .7 }),
    lampGlass: std({ color: 0x2a1a0a, emissive: PAL.sodium, emissiveIntensity: 3.2 }),
    window: std({ color: 0x1a0f06, emissive: 0xffb36b, emissiveIntensity: 2.2 }),
    smokeCream: std({ color: 0xece2d2, roughness: .6 }),
    planeRed: std({ color: 0x9a1f2c, roughness: .45, metalness: .15 }),
    planeCream: std({ color: 0xe7dcc8, roughness: .5, metalness: .1 }),
  };
}

/* ---------------- Sky dome: crimson-black overhead, warm sodium at the horizon ---------------- */
export function makeSky(o = {}) {
  const u = {
    top: { value: new THREE.Color(o.top ?? 0x07050a) }, mid: { value: new THREE.Color(o.mid ?? 0x2a0c14) },
    hor: { value: new THREE.Color(o.hor ?? 0xc9733a) }, sunDir: { value: (o.sun ?? V3(0, .05, 1)).clone().normalize() },
    sunCol: { value: new THREE.Color(o.sunCol ?? 0xffc884) }, stars: { value: o.stars ?? .8 }, time: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 top, mid, hor, sunDir, sunCol; uniform float stars, time; varying vec3 vDir;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 c = mix(hor, mid, smoothstep(-.02, .22, y)); c = mix(c, top, smoothstep(.18, .75, y));
        c = mix(c, hor * .35, smoothstep(.0, -.2, y));
        float s = max(dot(d, sunDir), 0.); c += sunCol * (pow(s, 8.) * .28 + pow(s, 80.) * .9) * smoothstep(-.1, .05, y + .05);
        vec3 g = floor(d * 380.); float st = step(.9965, h(g)) * smoothstep(.15, .6, y) * stars;
        st *= .6 + .4 * sin(time * 1.3 + h(g + 1.) * 40.);
        c += vec3(1., .92, .85) * st * 1.4;
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  m.userData.u = u;
  return m;
}

// An environment map made from the sky, so the gold and copper reflect the dusk.
export function makeEnv(renderer, skyOpts) {
  const s = new THREE.Scene(); s.add(makeSky({ ...skyOpts, stars: 0 }));
  const glow = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 8), new THREE.MeshBasicMaterial({ color: 0xffb36b }));
  glow.position.copy((skyOpts.sun ?? V3(0, .05, 1)).clone().normalize().multiplyScalar(400)); s.add(glow);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, .04).texture; pm.dispose();
  return tex;
}

/* ---------------- Lathe helpers ---------------- */
export function lathe(prof, seg = 24) { return new THREE.LatheGeometry(prof.map(([r, y]) => V2(Math.max(1e-4, r), y)), seg); }

/* ---------------- The hill: path along +z rising to a crest at the origin, city in the valley beyond ---------------- */
export const CITY_Y = -30;
export function hillHeight(x, z) {
  const climb = z < 0 ? .2 * z * (1 - Math.exp(z / 6)) : 0;   // flat at the crest, steady slope below
  const drop = z > 0 ? CITY_Y * smooth(2, 44, z) : 0;
  const ridge = -x * x * .0045 * (1 - smooth(0, 20, z));
  const roll = Math.sin(x * .09 + z * .05) * .5 + Math.sin(x * .23 - z * .11) * .18;
  return climb + drop + ridge + roll * smooth(4, 30, Math.abs(x)) * (1 - smooth(10, 40, z));
}

export function makeHill() {
  const g = new THREE.PlaneGeometry(420, 360, 180, 160); g.rotateX(-Math.PI / 2); g.translate(0, 0, -40);
  const p = g.attributes.position, col = [];
  const grass = new THREE.Color(0x1b2412), dry = new THREE.Color(0x3a2e16), dirt = new THREE.Color(0x4a3524), dark = new THREE.Color(0x0b0a08), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = hillHeight(x, z); p.setY(i, y);
    const path = 1 - smooth(.6, 1.6, Math.abs(x - pathX(z)));
    c.copy(grass).lerp(dry, .35 + .3 * Math.sin(x * .3 + z * .2)).lerp(dirt, path * (z < 2 ? 1 : 0)).lerp(dark, smooth(20, 60, Math.abs(x)) * .6);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 }));
  m.receiveShadow = true;
  return m;
}
export const pathX = (z) => Math.sin(z * .045) * 1.6;

// Grass: thousands of blades that sway; root dark, tips catching the sunset behind the hill.
export function makeGrass(count, area, heightFn, sunDir) {
  const blade = new THREE.BufferGeometry();
  const pos = [], uv = [];
  const seg = 4;
  for (let i = 0; i <= seg; i++) { const v = i / seg, w = .035 * (1 - v * .9); pos.push(-w, v, 0, w, v, 0); uv.push(0, v, 1, v); }
  const idx = []; for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  blade.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); blade.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); blade.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, root: { value: new THREE.Color(0x0d120a) }, tip: { value: new THREE.Color(0x8a7a3a) }, rim: { value: new THREE.Color(0xffb36b) },
      sun: { value: sunDir.clone().normalize() }, fogCol: { value: new THREE.Color(0x2a0c14) }, fogD: { value: .012 } },
    vertexShader: `uniform float time; varying float vY; varying float vFog; varying float vR;
      void main(){ vec4 wp = modelMatrix * instanceMatrix * vec4(position,1.);
        float k = uv.y*uv.y; wp.x += sin(time*1.6 + wp.z*.35 + wp.x*.2)*.09*k; wp.z += cos(time*1.2 + wp.x*.3)*.05*k;
        vY = uv.y; vR = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9,78.2)))*437.5);
        vec4 mv = viewMatrix * wp; vFog = 1. - exp(-pow(.012 * -mv.z, 2.)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 root, tip, rim, fogCol; varying float vY; varying float vFog; varying float vR;
      void main(){ vec3 c = mix(root, tip * (.6 + .6 * vR), pow(vY, 1.6)); c += rim * pow(vY, 3.) * .55;
        gl_FragColor = vec4(mix(c, fogCol, vFog), 1.); }`,
  });
  const m = new THREE.InstancedMesh(blade, mat, count);
  const R = rng(7), d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const z = lerp(area[2], area[3], R()), x = pathX(z) + (R() < .5 ? -1 : 1) * lerp(.9, area[1], Math.pow(R(), 1.3));
    d.position.set(x, heightFn(x, z) - .02, z); d.rotation.set((R() - .5) * .35, R() * Math.PI, (R() - .5) * .35);
    const s = lerp(.5, 1.25, R()); d.scale.set(s, s * lerp(.6, 1.3, R()), s); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
  }
  m.frustumCulled = false;
  m.userData.u = mat.uniforms;
  return m;
}

/* ---------------- Canvas textures ---------------- */
export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.userData.canvas = c;
  return t;
}
// Lit windows: an emissive map of warm panes, some dark, so façades read as lived-in at dusk.
export function windowTex(seed, cols, rows, lit = .55) {
  return canvasTex(256, 256, (x, w, h) => {
    const R = rng(seed); x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
    const cw = w / cols, rh = h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if (R() > lit) continue;
      const a = .35 + R() * .65; x.fillStyle = `rgba(255,${170 + R() * 50 | 0},${90 + R() * 40 | 0},${a})`;
      x.fillRect(i * cw + cw * .28, j * rh + rh * .2, cw * .44, rh * .55);
    }
  });
}

/* ---------------- Pop-up pieces ---------------- */
// Every pop-up piece pivots at its base and rises from flat, like a page of a storybook opening.
export function popPiece(obj, at, delay, dur = 1.6) {
  const pivot = new THREE.Group(); pivot.position.copy(at); pivot.add(obj);
  pivot.userData.pop = { delay, dur }; pivot.rotation.x = Math.PI / 2; pivot.scale.setScalar(.001);
  return pivot;
}
export function updatePop(list, t) {
  for (const p of list) {
    const { delay, dur } = p.userData.pop, k = clamp((t - delay) / dur);
    const e = popEase(k);
    p.rotation.x = (1 - e) * Math.PI / 2;
    p.scale.setScalar(Math.max(.001, smooth(0, .15, k)));
    p.visible = k > 0;
  }
}

// A paper-cut layer: a long ridge silhouette cut from metal-leafed card, layered like a pop-up book.
export function cardLayer(width, height, seed, mat, opts = {}) {
  const R = rng(seed), s = new THREE.Shape(), n = 60;
  s.moveTo(-width / 2, 0);
  for (let i = 0; i <= n; i++) {
    const v = i / n, x = -width / 2 + v * width;
    const y = height * (.45 + .3 * Math.sin(v * 7 + seed) + .18 * Math.sin(v * 19 + seed * 2) + .08 * R());
    s.lineTo(x, Math.max(height * .15, y));
  }
  s.lineTo(width / 2, 0); s.lineTo(-width / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: opts.depth ?? .6, bevelEnabled: true, bevelThickness: .15, bevelSize: .15, bevelSegments: 1, curveSegments: 4 });
  return new THREE.Mesh(g, mat);
}

// A dome on a drum, with a gold finial and crescent.
export function dome(r, M, o = {}) {
  const g = new THREE.Group();
  const drumH = r * (o.drum ?? .35);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.06, drumH, 32), o.drumMat ?? M.stone); drum.position.y = drumH / 2; g.add(drum);
  const win = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.035, r * 1.035, drumH * .45, 32, 1, true), M.window); win.position.y = drumH * .5; win.scale.set(1, 1, 1); g.add(win);
  const d = new THREE.Mesh(new THREE.SphereGeometry(r, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), o.mat ?? M.patina); d.position.y = drumH; d.scale.y = o.squash ?? .82; g.add(d);
  const fin = finial(r * .14, M); fin.position.y = drumH + r * (o.squash ?? .82); g.add(fin);
  return g;
}
export function finial(s, M) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(s * .08, s * .12, s * 1.6, 8), M.paleGold); stem.position.y = s * .8; g.add(stem);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(s * (.28 - i * .05), 12, 8), M.paleGold); b.position.y = s * (.4 + i * .45); g.add(b); }
  const cr = new THREE.Mesh(new THREE.TorusGeometry(s * .35, s * .07, 6, 20, Math.PI * 1.4), M.paleGold); cr.position.y = s * 2; cr.rotation.z = Math.PI * .8; g.add(cr);
  return g;
}
// A slender minaret: shaft, balconies, lead cone, gold tip.
export function minaret(h, r, M, balconies = 2) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * .82, r, h, 16), M.stone); shaft.position.y = h / 2; g.add(shaft);
  for (let i = 0; i < balconies; i++) {
    const y = h * (.62 + i * .16);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.5, r * 1.1, r * .6, 16), M.gold); b.position.y = y; g.add(b);
    const l = new THREE.Mesh(new THREE.TorusGeometry(r * 1.45, r * .08, 6, 24), M.window); l.rotation.x = Math.PI / 2; l.position.y = y + r * .45; g.add(l);
  }
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r * .95, h * .2, 16), M.patina); cone.position.y = h + h * .1; g.add(cone);
  const f = finial(r * 1.1, M); f.position.y = h * 1.2; g.add(f);
  return g;
}
// A building block with lit windows and a cornice in gold or copper. Façade materials are shared.
const facades = new Map();
function facade(M, i) {
  const k = M.stone.uuid + i;
  if (!facades.has(k)) {
    const wt = windowTex(i * 13 + 5, 6, 8, .5); wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
    const tones = [0x2b211c, 0x33241f, 0x261e1c, 0x3a2a22, 0x2a2420, 0x1f2a24];
    facades.set(k, new THREE.MeshStandardMaterial({ color: tones[i % tones.length], roughness: .85, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: 1.5, envMap: M.stone.envMap, envMapIntensity: .4 }));
  }
  return facades.get(k);
}
export function block(w, h, d, M, seed, trim, tone) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv;
  // Repeat windows by size so panes stay the same scale on every block.
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, w / 14), uv.getY(i) * Math.max(1, h / 18));
  const mat = tone ? tone : facade(M, seed % 6);
  const b = new THREE.Mesh(geo, mat); b.position.y = h / 2; g.add(b);
  const c = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, .35, d * 1.04), trim ?? M.copper); c.position.y = h; g.add(c);
  return g;
}
// An Ottoman mosque: square hall, great dome on a drum, half-domes, corner domes, minarets with gold tips.
export function mosque(M, o = {}) {
  const r = o.r ?? 10, g = new THREE.Group(), base = r * 1.15;
  const hall = new THREE.Mesh(new THREE.BoxGeometry(r * 3.1, base, r * 3.1), M.stone); hall.position.y = base / 2; g.add(hall);
  const band = new THREE.Mesh(new THREE.BoxGeometry(r * 3.14, base * .14, r * 3.14), M.window); band.position.y = base * .62; g.add(band);
  const dm = dome(r, M, { drum: .3 }); dm.position.y = base; g.add(dm);
  for (const s of [-1, 1]) {
    const hd = new THREE.Mesh(new THREE.SphereGeometry(r * .78, 28, 12, 0, Math.PI, 0, Math.PI / 2), M.patina);
    hd.rotation.y = s > 0 ? 0 : Math.PI; hd.position.set(0, base + r * .05, s * r * .95); hd.scale.y = .8; g.add(hd);
  }
  for (const x of [-1, 1]) for (const z of [-1, 1]) { const d = dome(r * .32, M, { drum: .5 }); d.position.set(x * r * 1.2, base, z * r * 1.2); g.add(d); }
  const n = o.minarets ?? 4, mh = o.minH ?? r * 4.6;
  const spots = [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9], [-3.1, 0], [3.1, 0]].slice(0, n);
  for (const [x, z] of spots) { const m = minaret(mh * (Math.abs(x) > 3 ? .9 : 1), r * .13, M, n > 4 ? 3 : 2); m.position.set(x * r, 0, z * r); g.add(m); }
  return g;
}
// An Emerald-City spire: a tapering faceted tower of green glass ribbed in gold.
export function spire(h, r, M) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r * .35, r, h, 6), M.emerald); body.position.y = h / 2; g.add(body);
  const ribs = new THREE.Mesh(new THREE.CylinderGeometry(r * .36, r * 1.01, h, 6, 8, true), new THREE.MeshStandardMaterial({ color: PAL.gold, metalness: 1, roughness: .3, wireframe: true, envMap: M.gold.envMap }));
  ribs.position.y = h / 2; g.add(ribs);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r * .36, h * .22, 6), M.emeraldGlow); tip.position.y = h + h * .11; g.add(tip);
  const f = finial(r * .5, M); f.position.y = h * 1.22; g.add(f);
  return g;
}

/* ---------------- Bokeh: out-of-focus city lights far behind ---------------- */
export function bokehField(n, box, seed, colors = [0xffb36b, 0xffd9a0, 0xff7a5a, 0x5fe0a8]) {
  const R = rng(seed), pos = [], col = [], size = [], c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    pos.push(lerp(box[0], box[1], R()), lerp(box[2], box[3], R()), lerp(box[4], box[5], R()));
    c.set(colors[(R() * colors.length) | 0]); col.push(c.r, c.g, c.b); size.push(lerp(.6, 1.6, R()));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("size", new THREE.Float32BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { scale: { value: 900 }, time: { value: 0 }, gain: { value: 1 } },
    vertexShader: `attribute float size; attribute vec3 color; uniform float scale, time; varying vec3 vC; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = size * scale / -mv.z; vC = color; vA = .55 + .45 * sin(time * .8 + position.x * 3.1); }`,
    fragmentShader: `uniform float gain; varying vec3 vC; varying float vA; void main(){ vec2 p = gl_PointCoord - .5; float d = length(p);
      float a = smoothstep(.5, .42, d) * (.55 + .45 * smoothstep(.2, .48, d)); gl_FragColor = vec4(vC * a * vA * gain, 1.); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.userData.u = mat.uniforms;
  return pts;
}

// Floating dust in the light, as in the rose scene.
export function dust(n, box, seed) {
  const p = bokehField(n, box, seed, [0xffd9a0, 0xffc884]);
  p.userData.u.scale.value = 26; p.userData.u.gain.value = .5;
  return p;
}

/* ---------------- Trees, lamps, bench ---------------- */
export function planeTree(seed, h, M, leafColors = [0xb5683c, 0xd9a54a, 0x7a3a1c, 0x5a6a2a]) {
  const R = rng(seed), g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x6e6252, roughness: .9 });
  const trunk = new THREE.Mesh(lathe([[.45, 0], [.38, h * .3], [.3, h * .55], [.22, h * .7]], 12), bark); g.add(trunk);
  const leafGeo = new THREE.PlaneGeometry(.32, .32);
  const n = 900, leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .8 }), n);
  const d = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const cl = (R() * 4) | 0, cx = [-1.6, 1.4, 0, .3][cl], cy = h * [.72, .78, .92, .62][cl], cz = [.4, -.3, .2, 1.4][cl];
    const th = R() * Math.PI * 2, ph = Math.acos(2 * R() - 1), rr = 2.4 * Math.cbrt(R());
    d.position.set(cx + rr * Math.sin(ph) * Math.cos(th) * 1.2, cy + rr * Math.cos(ph) * .75, cz + rr * Math.sin(ph) * Math.sin(th));
    d.rotation.set(R() * 6, R() * 6, R() * 6); d.scale.setScalar(lerp(.7, 1.3, R())); d.updateMatrix(); leaves.setMatrixAt(i, d.matrix);
    c.set(leafColors[(R() * leafColors.length) | 0]).multiplyScalar(lerp(.6, 1.1, R())); leaves.setColorAt(i, c);
  }
  leaves.castShadow = true; g.add(leaves);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(lathe([[.16, 0], [.05, 2.4]], 6), bark); b.position.y = h * .55; b.rotation.set((R() - .5) * 1.4, R() * 6, (R() - .5) * 1.8); g.add(b);
  }
  return g;
}
export function lamp(M, withLight = true) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(lathe([[.12, 0], [.08, .3], [.05, .4], [.045, 3.4], [.07, 3.5]], 12), M.iron); g.add(post);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(.16, .11, .42, 6), M.lampGlass); glass.position.y = 3.75; g.add(glass);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.24, .2, 6), M.iron); cap.position.y = 4.06; g.add(cap);
  if (withLight) { const l = new THREE.PointLight(0xffa65a, 14, 18, 1.6); l.position.y = 3.7; g.add(l); g.userData.light = l; }
  return g;
}
export function bench(M) {
  const g = new THREE.Group(), L = 1.8;
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(L, .035, .09), M.wood); s.position.set(0, .45, -.06 + i * .12); g.add(s); }
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(L, .08, .03), M.wood); s.position.set(0, .62 + i * .12, -.2 - i * .025); s.rotation.x = -.18; g.add(s); }
  for (const x of [-L / 2 + .12, L / 2 - .12]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.05, .45, .5), M.iron); leg.position.set(x, .225, 0); g.add(leg);
    const back = new THREE.Mesh(new THREE.BoxGeometry(.05, .5, .05), M.iron); back.position.set(x, .7, -.22); back.rotation.x = -.18; g.add(back);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.05, .04, .5), M.iron); arm.position.set(x, .66, 0); g.add(arm);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/* ---------------- Polaroid ---------------- */
// A polaroid with one of William's real photos (photos/<city>-N.jpg). If the photo is missing, a quiet
// placeholder: the black rose on warm film stock, so there's never an empty frame.
export function polaroid(src, seed = 1) {
  const W = 440, H = 530, pad = 26, ph = W - pad * 2;
  const tex = canvasTex(W, H, (x) => drawPolaroid(x, W, H, pad, ph, null, seed));
  if (src) {
    const img = new Image();
    img.onload = () => { drawPolaroid(tex.userData.canvas.getContext("2d"), W, H, pad, ph, img, seed); tex.needsUpdate = true; };
    img.src = src;
  }
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: .55 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(.088, .107, .0012), [mat, mat, mat, mat, mat, new THREE.MeshStandardMaterial({ color: 0x1a1614 })]);
  m.userData.tex = tex; m.userData.photoBox = { x: pad, y: pad, w: ph, h: ph, W, H };
  return m;
}
function drawPolaroid(x, W, H, pad, ph, img, seed) {
  x.fillStyle = "#efe7da"; x.fillRect(0, 0, W, H);
  const R = rng(seed);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(120,100,80,${R() * .05})`; x.fillRect(R() * W, R() * H, 2, 2); }
  if (img) {
    const s = Math.max(ph / img.width, ph / img.height), w = img.width * s, h = img.height * s;
    x.save(); x.beginPath(); x.rect(pad, pad, ph, ph); x.clip(); x.drawImage(img, pad + (ph - w) / 2, pad + (ph - h) / 2, w, h);
    x.fillStyle = "rgba(255,170,90,.08)"; x.fillRect(pad, pad, ph, ph); x.restore();
  } else {
    const g = x.createRadialGradient(pad + ph * .5, pad + ph * .45, 10, pad + ph * .5, pad + ph * .5, ph * .75);
    g.addColorStop(0, "#6a3326"); g.addColorStop(.6, "#2a1414"); g.addColorStop(1, "#120a0a");
    x.fillStyle = g; x.fillRect(pad, pad, ph, ph);
    x.save(); x.translate(pad + ph / 2, pad + ph * .46);
    for (let i = 0; i < 26; i++) {
      const a = i * 2.39996, r = 8 + Math.sqrt(i) * 17;
      x.fillStyle = `rgba(${40 + i * 3},${8 + i},${14 + i},.9)`; x.beginPath();
      x.ellipse(Math.cos(a) * r * .5, Math.sin(a) * r * .5, 26 - i * .4, 14, a, 0, Math.PI * 2); x.fill();
      x.strokeStyle = "rgba(255,150,120,.18)"; x.stroke();
    }
    x.restore();
    x.strokeStyle = "rgba(60,30,20,.5)"; x.lineWidth = 3; x.beginPath(); x.moveTo(pad + ph * .5, pad + ph * .62); x.quadraticCurveTo(pad + ph * .46, pad + ph * .8, pad + ph * .52, pad + ph); x.stroke();
  }
}
// The tear leaves a soft wet bloom on the photo.
export function wetSpot(poly, u, v) {
  const t = poly.userData.tex, b = poly.userData.photoBox, x = t.userData.canvas.getContext("2d");
  const cx = b.x + u * b.w, cy = b.y + v * b.h;
  const g = x.createRadialGradient(cx, cy, 2, cx, cy, 30);
  g.addColorStop(0, "rgba(255,240,220,.18)"); g.addColorStop(.6, "rgba(40,20,10,.12)"); g.addColorStop(.85, "rgba(80,50,30,.22)"); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 30, 0, Math.PI * 2); x.fill(); t.needsUpdate = true;
}

/* ---------------- The old aeroplane ---------------- */
export function biplane(M) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const fus = new THREE.Mesh(lathe([[.0, -3.2], [.18, -3.0], [.42, -1.6], [.55, -.2], [.58, .6], [.5, 1.3], [.0, 1.45]], 16), M.planeCream);
  fus.rotation.x = Math.PI / 2; body.add(fus);
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(.56, .58, .5, 16), M.planeRed); cowl.rotation.x = Math.PI / 2; cowl.position.z = 1.2; body.add(cowl);
  for (const y of [-.35, .95]) { const w = new THREE.Mesh(new THREE.BoxGeometry(7.6, .07, 1.25), M.planeRed); w.position.set(0, y, .55); body.add(w); }
  for (const x of [-2.6, 2.6]) for (const z of [.15, .95]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.3, 6), M.iron); s.position.set(x, .3, z); body.add(s); }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(2.4, .05, .7), M.planeRed); tail.position.set(0, .1, -2.8); body.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(.05, .9, .7), M.planeRed); fin.position.set(0, .5, -2.85); body.add(fin);
  const prop = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ color: 0x3a2a20, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false }));
  prop.position.z = 1.5; body.add(prop);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(2.1, .12, .04), M.wood); blade.position.z = 1.52; body.add(blade); g.userData.blade = blade;
  for (const x of [-.6, .6]) { const wh = new THREE.Mesh(new THREE.TorusGeometry(.22, .08, 8, 16), M.iron); wh.rotation.y = Math.PI / 2; wh.position.set(x, -.95, .7); body.add(wh); }
  body.scale.setScalar(1);
  return g;
}

/* ---------------- Smoke ---------------- */
// Smoke particles. Each has a birth time, a start point (where the plane was) and a rest point.
export function smokeSystem(max) {
  const g = new THREE.BufferGeometry();
  const a = (n) => new THREE.Float32BufferAttribute(new Float32Array(max * n), n);
  g.setAttribute("position", a(3)); g.setAttribute("target", a(3)); g.setAttribute("birth", a(1)); g.setAttribute("seed", a(1));
  g.setDrawRange(0, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, scale: { value: 900 }, wind: { value: V3(1.2, .25, 0) }, light: { value: new THREE.Color(0xffd6b0) }, shade: { value: new THREE.Color(0x6a4a52) } },
    vertexShader: `attribute vec3 target; attribute float birth, seed; uniform float time, scale; uniform vec3 wind; varying float vA, vS, vSeed;
      void main(){ float age = time - birth; float k = clamp(age / .35, 0., 1.); k = 1. - pow(1. - k, 3.);
        vec3 p = mix(position, target, k) + wind * age * (.4 + seed) + vec3(sin(seed*40.+age*.6), cos(seed*31.+age*.5), 0.) * age * .12;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        float sz = mix(1.4, 4.2, 1. - exp(-age * .35)) * (.7 + seed * .6);
        gl_PointSize = age < 0. ? 0. : sz * scale / -mv.z;
        vA = age < 0. ? 0. : smoothstep(0., .25, age) * (1. - smoothstep(14., 26., age)) * .5; vS = seed; vSeed = seed; }`,
    fragmentShader: `uniform vec3 light, shade; varying float vA, vS, vSeed; void main(){ vec2 p = gl_PointCoord - .5; float d = length(p);
        float a = smoothstep(.5, .0, d); a *= a; vec3 c = mix(shade, light, clamp(.6 - p.y * 1.3 + vS * .2, 0., 1.)); gl_FragColor = vec4(c, a * vA); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  let n = 0;
  pts.userData = {
    u: mat.uniforms,
    emit(from, to, birth, seed) {
      if (n >= max) return;
      g.attributes.position.setXYZ(n, from.x, from.y, from.z); g.attributes.target.setXYZ(n, to.x, to.y, to.z);
      g.attributes.birth.setX(n, birth); g.attributes.seed.setX(n, seed); n++;
    },
    commit() { for (const k of ["position", "target", "birth", "seed"]) g.attributes[k].needsUpdate = true; g.setDrawRange(0, n); },
    reset() { n = 0; g.setDrawRange(0, 0); },
    get count() { return n; },
  };
  return pts;
}

// Sample a proverb into points: lines of text set in Cormorant italic, returned in the 0..1 box, written left to right.
export function textPoints(lines, step = 3) {
  const W = 1400, lh = 180, H = lh * lines.length + 40;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  let size = 150; x.font = `italic 500 ${size}px Cormorant, Georgia, serif`;
  const widest = Math.max(...lines.map(l => x.measureText(l).width)); if (widest > W * .94) { size *= W * .94 / widest; x.font = `italic 500 ${size}px Cormorant, Georgia, serif`; }
  lines.forEach((l, i) => x.fillText(l, W / 2, 20 + lh * (i + .5)));
  const d = x.getImageData(0, 0, W, H).data, pts = [];
  for (let j = 0; j < H; j += step) for (let i = 0; i < W; i += step) if (d[(j * W + i) * 4 + 3] > 128) pts.push({ u: i / W, v: j / H, line: Math.min(lines.length - 1, Math.floor((j - 20) / lh)) });
  return { pts, aspect: W / H };
}
