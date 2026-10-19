/* Yavaş Yavaş storybook: paints a city as four sheets of watercolor that slide past each other.
   sky (washes, splashes, falling light) · far (hills, haze) · mid (the city itself, water) · near
   (the ruined colonnade she walks through). The same city recipe also paints the night backdrop
   behind the bench clip, so the two always belong together. */
import * as Wc from "./wash.js";
import * as K from "./kit.js";
const { rng, lerp, mix } = YY;

export const W = 2400, H = 1000;

// The painter a city recipe draws with. Everything is in stage units on the canvas `c`.
export function painter(c, pal, seed = 1, night = false) {
  let n = seed * 101;
  const s = () => ++n;
  // At night every surface sinks into the grade; lamps, neon and gold keep their light.
  const nite = (col) => night && typeof col === "string" && col[0] === "#" ? mix(col, pal.grade || "#2a1e44", .5) : col;
  const tone = (t) => mix(pal.shadow, pal.stone, t);
  const P = {
    c, pal, K, Wc, tone,
    // A built mass: a wash in stone-to-shadow, a cooler glaze on its shadow side and a dark dried edge.
    mass(pts, t = .35, o = {}) {
      const col = nite(o.col || tone(t));
      Wc.body(c, pts, col, { seed: s(), lit: pal.gold, cool: pal.shadow, edgeCol: mix(col, "#05020a", .6), ...o, litA: night ? .06 : o.litA });
      if (o.rim !== 0) { const e = K.topEdge(pts, Math.max(...pts.map(p => p[1]))); if (e.length > 1) Wc.glowLine(c, e, pal.gold, .7, 5, night ? .12 : .28); }
      return P;
    },
    many(list, t, o) { for (const p of list) P.mass(p, t, o); return P; },
    // Neon on the skyline (the city that's coming) and gold on the old stone (the city that was).
    neon(pts, b, col = pal.neon, w = 1.3) { const e = K.topEdge(pts, b); if (e.length > 1) Wc.glowLine(c, e, col, w, 12, .85); return P; },
    gold(pts, b, w = 1) { const e = K.topEdge(pts, b); if (e.length > 1) Wc.glowLine(c, e, pal.gold, w, 8, .6); return P; },
    lights(list, size = 4, col = pal.light) { Wc.lights(c, list, col, size, s()); return P; },
    // An angel's halo hung over the city's heart: a tilted ring of light and a few rays beneath it.
    halo(x, y, r) {
      Wc.glow(c, x, y, r * 2.4, pal.gold, .28);
      c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = pal.gold; c.shadowColor = pal.gold;
      for (const [lw, bl, a] of [[r * .16, r * .6, .18], [r * .06, r * .25, .55], [r * .025, 4, .9]]) {
        c.lineWidth = lw; c.shadowBlur = bl; c.globalAlpha = a; c.beginPath(); c.ellipse(x, y, r, r * .26, -.08, 0, 6.283); c.stroke();
      }
      c.restore();
      Wc.rays(c, x, y + r * .2, r * 6, .9, pal.gold, 6, s(), .07);
      return P;
    },
    wash(pts, col, o = {}) { Wc.wash(c, pts, nite(col), { seed: s(), ...o }); return P; },
    splash(x, y, r, col, o = {}) { Wc.splash(c, x, y, r, col, { seed: s(), ...o }); return P; },
    band(x0, x1, y, h, col, o = {}) { Wc.band(c, x0, x1, y, h, col, { seed: s(), ...o }); return P; },
    glow(x, y, r, col, a) { Wc.glow(c, x, y, r, col, a); return P; },
    ridge(x0, x1, b, h, col, o = {}) { Wc.wash(c, K.ridge(x0, x1, b, h, s(), o.shape, 60, o.rough ?? .22), col, { seed: s(), layers: o.layers ?? 14, alpha: o.alpha ?? .07, spread: .08, depth: 1, edge: o.edge ?? .1 }); return P; },
  };
  return P;
}

const make = (k, w = W, h = H) => { const cv = Wc.canvas(w * k, h * k), c = cv.getContext("2d"); c.scale(k, k); return { cv, c }; };

// Sky: the graded wash, the clouds, the big flung splashes of colour, the falling light.
function paintSky(c, pal, w, h, hz, seed, night = false) {
  const R = rng(seed);
  const g = c.createLinearGradient(0, 0, 0, hz + 30);
  pal.sky.forEach((col, i) => g.addColorStop(i / (pal.sky.length - 1), col));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const P = painter(c, pal, seed);
  // wet-in-wet: big soft blooms of the sky's own colours, so the gradient breathes like paint
  for (let i = 0; i < Math.round(w / 200); i++) {
    const x = R() * w, y = R() * hz * 1.05, r = lerp(120, 320, R());
    P.wash(Wc.blob(x, y, r, r * lerp(.5, .9, R()), 9, R, .6), pal.sky[Math.floor(R() * pal.sky.length)], { layers: 10, alpha: .06, spread: 1, soft: r * .35 });
  }
  // a few spots of bare paper caught in the light
  for (let i = 0; i < 3; i++) { const x = R() * w, y = lerp(.2, .7, R()) * hz, r = lerp(40, 90, R()); P.wash(Wc.blob(x, y, r, r * .5, 8, R, .6), "#fff3e0", { layers: 8, alpha: .05, spread: 1, soft: r * .4 }); }
  if (!night) Wc.rays(c, w * (pal.sun?.x ?? .5), -h * .1, h * 1.2, 1.1, pal.gold, 7, seed, .028);
  // sun or moon behind haze
  if (pal.sun) { const sx = w * pal.sun.x, sy = hz * pal.sun.y; Wc.glow(c, sx, sy, h * (night ? .35 : .55), pal.sun.col, night ? .22 : .5); if (pal.sun.disc) { c.save(); c.globalAlpha = .9; c.fillStyle = pal.sun.disc; c.beginPath(); c.arc(sx, sy, h * .045, 0, 6.283); c.fill(); c.restore(); } }
  // long cloud washes
  for (let i = 0; i < Math.round(w / 320); i++) {
    const x = R() * w, y = lerp(.12, .78, R()) * hz, rx = lerp(160, 420, R()), ry = rx * lerp(.12, .22, R());
    P.wash(Wc.blob(x, y, rx, ry, 9, R, .4), pal.cloud[i % pal.cloud.length], { layers: 10, alpha: .07, spread: .9, soft: ry * .8 }); P.wash(Wc.blob(x - rx * .1, y - ry * .2, rx * .6, ry * .6, 8, R, .5), pal.cloud[(i + 1) % pal.cloud.length], { layers: 6, alpha: .06, spread: .8, edge: .05 });
  }
  // the flung splashes that make it a storybook page
  if (!night) for (let i = 0; i < 4; i++) {
    const x = (i % 2 ? w * lerp(.8, 1, R()) : w * lerp(0, .2, R())) + (i > 1 ? (R() - .5) * w * .5 : 0), y = hz * lerp(.05, .4, R());
    P.splash(x, y, lerp(60, 120, R()), pal.splash[i % pal.splash.length], { alpha: .05, layers: 10, drops: 26, fling: .5, spread: .9, edge: .06, soft: 18 });
  }
  // stars in the upper sky
  c.save(); c.fillStyle = "#fff4e0";
  const ns = night ? 160 : 60;
  for (let i = 0; i < ns; i++) { c.globalAlpha = R() * R() * (night ? .8 : .5); c.fillRect(R() * w, Math.pow(R(), 1.6) * hz * .6, 1.3, 1.3); }
  c.restore();
}

// Water below the horizon: a dark glaze, light laid in horizontal strokes, and long reflections.
function paintWater(c, pal, x0, x1, y0, y1, seed) {
  const R = rng(seed), P = painter(c, pal, seed + 3);
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, pal.water[0]); g.addColorStop(1, pal.water[1]);
  c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let i = 0; i < 5; i++) P.band(x0, x1, lerp(y0, y1, R()), lerp(10, 30, R()), pal.water[2] || pal.gold, { alpha: .02, layers: 10, spread: .8 });
  c.save(); c.globalCompositeOperation = "lighter";
  for (let i = 0; i < (x1 - x0) / 14; i++) {
    const x = lerp(x0, x1, R()), y = lerp(y0, y1, Math.pow(R(), 1.4)), l = lerp(6, 40, R());
    c.fillStyle = Wc.rgba(R() < .7 ? pal.light : pal.neon, lerp(.08, .45, R()) * (1 - (y - y0) / (y1 - y0) * .6));
    c.fillRect(x - l / 2, y, l, lerp(1, 2.4, R()));
  }
  c.restore();
}

// The city upside down in the water: a squashed, broken, darkened copy below the horizon.
function reflect(c, cv, k, hz, depth, pal) {
  const src = Wc.canvas(cv.width, hz * k), sx = src.getContext("2d");
  sx.drawImage(cv, 0, 0);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const R = rng(9), y0 = hz * k, rows = Math.ceil(depth * k / 3);
  for (let i = 0; i < rows; i++) {
    const t = i / rows, sy = y0 - (t * depth * k * 1.6) - 1, dx = Math.sin(i * .9) * 3 * k + (R() - .5) * 4 * k;
    c.globalAlpha = .32 * (1 - t) * (i % 3 ? 1 : .55);
    c.drawImage(src, 0, Math.max(0, sy - 2), src.width, 2, dx, y0 + i * 3, src.width, 3);
  }
  c.globalAlpha = .4; c.fillStyle = pal.water[1]; c.globalCompositeOperation = "multiply"; c.fillRect(0, y0, cv.width, depth * k);
  c.restore();
}

// The near sheet: dark ground, the path she walks, Roman ruins and cypresses, angel-gold and neon.
function paintNear(c, pal, city, seed) {
  const R = rng(seed), P = painter(c, pal, seed), G = city.ground ?? 812;
  const top = []; for (let i = 0; i <= 40; i++) top.push([i / 40 * (W + 200) - 100, G - 20 + Math.sin(i * .7 + seed) * 10 + (R() - .5) * 10]);
  const ground = [[-100, H + 50], ...top, [W + 100, H + 50]];
  Wc.body(c, ground, pal.ground[0], { seed: seed + 1, pools: 0, litA: 0, cool: pal.ground[1], edge: .5 });
  for (let i = 0; i < 10; i++) { const x = R() * W, y = lerp(G, H, R()), r = lerp(80, 220, R()); P.wash(Wc.blob(x, y, r, r * .35, 8, R, .5), pal.ground[1], { layers: 6, alpha: .07, spread: .8, soft: 30 }); }
  // the path: light caught on worn stone, laid in as a soft glaze
  P.band(-100, W + 100, G + 46, 22, pal.path, { alpha: .02, layers: 10, spread: .9 });
  c.save(); c.fillStyle = Wc.rgba(pal.path, .12);
  for (let i = 0; i < 160; i++) { const x = R() * W, y = G + 34 + R() * 28; c.beginPath(); c.ellipse(x, y, lerp(3, 8, R()), lerp(1.2, 2.4, R()), 0, 0, 6.283); c.fill(); }
  c.restore();
  // ruins along the way
  const ruins = city.ruins || [
    { k: "arch", x: 70, h: 470, w: 230 }, { k: "col", x: 520, h: 360 }, { k: "cyp", x: 640, h: 330 }, { k: "col", x: 1010, h: 260, broken: .4 },
    { k: "cyp", x: 1340, h: 290 }, { k: "col", x: 1430, h: 380 }, { k: "col", x: 1880, h: 300, broken: .3 }, { k: "cyp", x: 2010, h: 350 }, { k: "arch", x: 2330, h: 500, w: 240 },
  ];
  for (const r of ruins) {
    const b = G + 8;
    if (r.k === "arch") { const a = K.arch(r.x, b, r.w, r.h); P.mass(a, .1, { pools: 6 }).gold(a, b, 1.1); }
    else if (r.k === "col") { const col = K.column(r.x, b, r.h, 34, r.broken || 0); P.mass(col, .14, { pools: 3 }).gold(col, b, .9); }
    else if (r.k === "cyp") Wc.body(c, K.cypress(r.x, b, r.h), pal.tree, { seed: r.x, spread: .3, pools: 2, litA: .1 });
  }
  // a fallen capital and some grass tufts
  c.save(); c.strokeStyle = Wc.rgba(pal.tree, .6); c.lineWidth = 1.2;
  for (let i = 0; i < 180; i++) { const x = R() * W, y = G + lerp(-14, 6, R()), h = lerp(6, 18, R()); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2, y - h * .6, x + lerp(-5, 5, R()), y - h); c.stroke(); }
  c.restore();
  city.near?.(P, G);
  Wc.granulate(c, .4, seed + 8);
}

// Build the four sheets for the storybook film. k is pixels per stage unit.
export function buildLayers(city, k) {
  const pal = city.pal, hz = city.horizon ?? 690;
  const sky = make(k), far = make(k), mid = make(k), near = make(k);
  paintSky(sky.c, pal, W, H, hz, city.seed);
  Wc.granulate(sky.c, .25, city.seed + 1);
  const Pf = painter(far.c, pal, city.seed + 10);
  if (city.far) city.far(Pf, W / 2, hz, 1);
  else { Pf.ridge(-50, W + 50, hz, 120, pal.far[0], { shape: (v) => .5 + .5 * Math.sin(v * 7 + 1) }); Pf.ridge(-50, W + 50, hz + 6, 70, pal.far[1]); }
  Pf.band(-50, W + 50, hz - 10, 60, pal.haze, { alpha: .05 });
  Wc.granulate(far.c, .3, city.seed + 2);
  const Pm = painter(mid.c, pal, city.seed + 20);
  if (pal.water) paintWater(mid.c, pal, -50, W + 50, hz, (city.ground ?? 812) + 20, city.seed + 4);
  else Pm.wash([[-50, hz + 120], [-50, hz - 4], [W + 50, hz - 4], [W + 50, hz + 120]], pal.far[1], { layers: 12, alpha: .1, spread: .05, depth: 1 });
  city.skyline(Pm, W / 2, hz, 1);
  if (pal.water) reflect(mid.c, mid.cv, k, hz, (city.ground ?? 812) - hz, pal);
  Wc.granulate(mid.c, .3, city.seed + 3);
  paintNear(near.c, pal, city, city.seed + 30);
  return { sky: sky.cv, far: far.cv, mid: mid.cv, near: near.cv, k, hz };
}

// The night backdrop for the bench clip (w×h pixels, portrait). Horizon and scale are fitted to
// where the original skyline sat in the clip, so the people and the lamp sit in front of it naturally.
export function buildBench(city, w, h) {
  const pal = { ...city.pal, ...city.night };
  const { cv, c } = make(1, w, h);
  const hz = h * .344;
  paintSky(c, pal, w, h, hz, city.seed + 50, true);
  const s = w / 1000, P = painter(c, pal, city.seed + 60, true);
  c.save(); c.translate(w / 2, hz); c.scale(s, s); c.translate(-W / 2, -hz / s);
  const b = hz / s;
  if (city.far) city.far(P, W / 2, b, 1);
  else { P.ridge(0, W, b, 110, pal.far[0], { shape: (v) => .5 + .5 * Math.sin(v * 7 + 1) }); }
  P.band(0, W, b - 8, 50, pal.haze, { alpha: .05 });
  c.restore();
  // The skyline on its own sheet, graded to night: stone falls into blue shadow, lamps and neon stay lit.
  const sk = make(1, w, h);
  sk.c.translate(w / 2, hz); sk.c.scale(s, s); sk.c.translate(-W / 2, -b);
  city.skyline(painter(sk.c, pal, city.seed + 61, true), W / 2, b, 1);
  // warm haze where the city's light hits the sky
  const hg = c.createLinearGradient(0, hz - h * .12, 0, hz); hg.addColorStop(0, Wc.rgba(pal.light, 0)); hg.addColorStop(1, Wc.rgba(pal.light, .22));
  c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = hg; c.fillRect(0, hz - h * .12, w, h * .12); c.restore();
  c.save(); c.filter = "blur(1.1px)"; c.drawImage(sk.cv, 0, 0); c.restore();
  // the lit streets along the foot of the skyline
  { const R = rng(city.seed + 73), pts = []; for (let i = 0; i < 140; i++) pts.push([R() * w, hz - Math.pow(R(), 2) * h * .05]); Wc.lights(c, pts, pal.light, 2.4, city.seed + 74); }
  if (pal.water) paintWater(c, pal, 0, w, hz, h * .55, city.seed + 70);
  else {
    // a valley of lights below the city instead of water
    const g = c.createLinearGradient(0, hz, 0, h * .55); g.addColorStop(0, mix(pal.far[1], pal.light, .18)); g.addColorStop(.3, pal.far[1]); g.addColorStop(1, "#0a0610");
    c.fillStyle = g; c.fillRect(0, hz - 2, w, h * .55 - hz);
    const R = rng(city.seed + 71), pts = [];
    for (let i = 0; i < 520; i++) { const t = Math.pow(R(), 1.6); pts.push([R() * w, hz + 2 + t * (h * .55 - hz)]); }
    Wc.lights(c, pts, pal.light, 2.2, city.seed + 75);
  }
  Wc.granulate(c, .25, city.seed + 72);
  return cv;
}
