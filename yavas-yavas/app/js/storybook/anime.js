/* Yavaş Yavaş storybook: the same city drawn the way an anime film paints its backgrounds.
   Crisp shapes, haze graded into the light, rims of sun on every edge, towering lit clouds, sparkling
   water, windows that glow. The city recipes draw with the same painter calls as the watercolor,
   so a wave can sweep across the frame and turn one into the other. */
import * as Wc from "./wash.js";
import * as K from "./kit.js";
import { W, H } from "./scene.js";
const { rng, lerp, mix } = YY;

const pathOf = (c, pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const bbox = (pts) => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x0, x1, y0, y1 }; };

// A painter with the watercolor painter's calls, drawing clean cel-style shapes instead.
export function animePainter(c, pal, sunX, night = false) {
  const tone = (t) => mix(pal.shadow, pal.stone, t);
  const nite = (col) => night ? mix(col, pal.grade || "#22183e", .55) : col;
  const haze = night ? mix(pal.sky[pal.sky.length - 1], "#1a1030", .4) : pal.sky[pal.sky.length - 1];
  const fillShape = (pts, col, o = {}) => {
    const b = bbox(pts), h = Math.max(1, b.y1 - b.y0);
    pathOf(c, pts);
    const g = c.createLinearGradient(0, b.y0, 0, b.y1);
    g.addColorStop(0, mix(col, "#05020c", .22)); g.addColorStop(.7, col); g.addColorStop(1, mix(col, haze, o.haze ?? .42));
    c.fillStyle = g; c.fill();
    c.save(); pathOf(c, pts); c.clip();
    // the side turned to the sun catches warm light; the far side falls into cool shadow
    const lx = sunX < (b.x0 + b.x1) / 2 ? b.x0 : b.x1, sx = lx === b.x0 ? 1 : -1;
    const lg = c.createLinearGradient(lx, 0, lx + sx * (b.x1 - b.x0) * .55, 0);
    lg.addColorStop(0, Wc.rgba(pal.gold, night ? .08 : .3)); lg.addColorStop(1, Wc.rgba(pal.gold, 0));
    c.fillStyle = lg; c.fillRect(b.x0, b.y0, b.x1 - b.x0, h);
    // contact shadow where it meets the ground
    const ag = c.createLinearGradient(0, b.y1 - Math.min(18, h * .2), 0, b.y1);
    ag.addColorStop(0, "rgba(0,0,0,0)"); ag.addColorStop(1, "rgba(6,2,12,.35)"); c.fillStyle = ag; c.fillRect(b.x0, b.y1 - 18, b.x1 - b.x0, 18);
    c.restore();
    return b;
  };
  const rim = (pts, col = pal.gold, a = .8, w = 1.1) => {
    const e = K.topEdge(pts, Math.max(...pts.map(p => p[1])));
    if (e.length > 1) Wc.glowLine(c, e, col, w, 6, night ? a * .35 : a);
  };
  const P = {
    c, pal, K, Wc, tone,
    mass(pts, t = .35, o = {}) {
      const col = nite(o.col || tone(t));
      const b = fillShape(pts, col);
      if (o.rim !== 0) rim(pts);
      // round tops (domes) get a specular sheen
      if (b.x1 - b.x0 > 30 && b.x1 - b.x0 < 260 && !o.flat) {
        c.save(); pathOf(c, pts); c.clip(); c.globalCompositeOperation = "lighter";
        const cx = lerp(b.x0, b.x1, sunX < (b.x0 + b.x1) / 2 ? .3 : .7), cy = b.y0 + (b.y1 - b.y0) * .2;
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, (b.x1 - b.x0) * .5);
        g.addColorStop(0, Wc.rgba(pal.gold, night ? .06 : .22)); g.addColorStop(1, Wc.rgba(pal.gold, 0)); c.fillStyle = g; c.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
        c.restore();
      }
      return P;
    },
    many(list, t, o) { for (const p of list) P.mass(p, t, o); return P; },
    neon(pts, b, col = pal.neon, w = 1.3) { const e = K.topEdge(pts, b); if (e.length > 1) Wc.glowLine(c, e, col, w * .9, 9, .9); return P; },
    gold(pts, b, w = 1) { const e = K.topEdge(pts, b); if (e.length > 1) Wc.glowLine(c, e, pal.gold, w, 6, .7); return P; },
    lights(list, size = 4, col = pal.light) {
      const R = rng(list.length + 3);
      c.save(); c.globalCompositeOperation = "lighter";
      for (const [x, y] of list) {
        const s = size * lerp(.6, 1.1, R());
        c.fillStyle = Wc.rgba(col, lerp(.55, 1, R())); c.fillRect(x - s / 2, y - s * .6, s, s * 1.2);
        if (R() < .35) Wc.glow(c, x, y, s * 5, col, .3);
      }
      c.restore(); return P;
    },
    halo(x, y, r) {
      Wc.glow(c, x, y, r * 2.2, pal.gold, .3);
      c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = "#fff4d6"; c.shadowColor = pal.gold;
      for (const [lw, bl, a] of [[r * .12, r * .5, .25], [r * .04, r * .2, .7], [r * .018, 3, 1]]) { c.lineWidth = lw; c.shadowBlur = bl; c.globalAlpha = a; c.beginPath(); c.ellipse(x, y, r, r * .24, -.08, 0, 6.283); c.stroke(); }
      c.restore(); return P;
    },
    wash(pts, col) { fillShape(pts, nite(col), { haze: .55 }); return P; },
    splash() { return P; },
    band(x0, x1, y, h, col) { const g = c.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, Wc.rgba(col, 0)); g.addColorStop(.5, Wc.rgba(col, .16)); g.addColorStop(1, Wc.rgba(col, 0)); c.fillStyle = g; c.fillRect(x0, y - h / 2, x1 - x0, h); return P; },
    glow(x, y, r, col, a) { Wc.glow(c, x, y, r, col, a); return P; },
    ridge(x0, x1, b, h, col, o = {}) { fillShape(K.ridge(x0, x1, b, h, 5, o.shape, 60, o.rough ?? .22), nite(col), { haze: .6 }); return P; },
  };
  return P;
}

const make = (k, w = W, h = H) => { const cv = Wc.canvas(w * k, h * k), c = cv.getContext("2d"); c.scale(k, k); return { cv, c }; };

// Towering cumulus the way anime paints it: a cauliflower heap of many small puffs, flat underneath,
// every puff lit on the side facing the sun and falling into violet shadow away from it.
function cumulus(c, x, y, w, pal, R, night, sunX) {
  const hh = w * lerp(.18, .3, R()), puffs = [], dir = sunX < x ? -1 : 1;
  for (let i = 0; i < 240; i++) {
    const t = R(), e = Math.pow(Math.sin(Math.PI * t), .8) * (.75 + .25 * Math.sin(t * 9 + x)), px = x + (t - .5) * w;
    const py = lerp(y, y - hh * e, Math.pow(R(), .5)), r = w * lerp(.012, .04, R()) * (.6 + e * .9);
    puffs.push([px, py, r]);
  }
  puffs.sort((p, q) => q[1] - p[1]);
  const lit = night ? "#5e4e86" : mix(pal.cloud[0], "#fff4e6", .35), mid = night ? "#2a1e4a" : mix(pal.cloud[1], pal.cloud[0], .35), dark = night ? "#140c28" : mix(pal.cloud[2] || "#5a2a6a", pal.sky[0], .25);
  const path = (dx = 0, dy = 0, k = 1) => { c.beginPath(); for (const [px, py, r] of puffs) { c.moveTo(px + dx * r + r * k, py + dy * r); c.arc(px + dx * r, py + dy * r, r * k, 0, 6.283); } };
  c.save();
  c.beginPath(); c.rect(x - w, y - hh * 1.6, w * 2, hh * 1.6 + w * .02); c.clip();
  const g = c.createLinearGradient(0, y - hh, 0, y); g.addColorStop(0, lit); g.addColorStop(.55, mid); g.addColorStop(1, dark);
  c.fillStyle = g; path(); c.fill();
  c.globalCompositeOperation = "source-atop";
  // shadow side of each puff, then a thin hot rim where the sun grazes the edges
  c.fillStyle = Wc.rgba(dark, .4); path(-dir * .25, .22, .95); c.fill();
  c.fillStyle = Wc.rgba(night ? "#c8b8ff" : pal.gold, night ? .18 : .4); path(dir * .5, -.4, .55); c.fill();
  c.restore();
}

function sky(c, pal, w, h, hz, seed, night) {
  const R = rng(seed + 400);
  const g = c.createLinearGradient(0, 0, 0, hz + 20);
  pal.sky.forEach((col, i) => g.addColorStop(i / (pal.sky.length - 1), col));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const sx = w * (pal.sun?.x ?? .5), sy = hz * (pal.sun?.y ?? .8);
  c.save(); c.fillStyle = "#fff6e6";
  for (let i = 0; i < (night ? 260 : 40); i++) { c.globalAlpha = R() * R() * (night ? .9 : .35); const s = R() < .05 ? 2.2 : 1.3; c.fillRect(R() * w, Math.pow(R(), 1.5) * hz * .7, s, s); }
  c.restore();
  if (pal.sun) Wc.glow(c, sx, sy, h * (night ? .3 : .75), pal.sun.col, night ? .22 : .6);
  // thin high streaks, then the big clouds stacked low over the horizon
  c.save(); c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 22; i++) { const y = lerp(.08, .5, R()) * hz, x = R() * w, l = lerp(160, 520, R()); const lg = c.createLinearGradient(x, 0, x + l, 0); lg.addColorStop(0, Wc.rgba(pal.cloud[0], 0)); lg.addColorStop(.5, Wc.rgba(pal.cloud[0], night ? .06 : .2)); lg.addColorStop(1, Wc.rgba(pal.cloud[0], 0)); c.fillStyle = lg; c.fillRect(x, y, l, lerp(2, 7, R())); }
  c.restore();
  const n = Math.max(2, Math.round(w / (night ? 800 : 520)));
  for (let i = 0; i < n; i++) cumulus(c, (i + .2 + R() * .6) * w / n, lerp(.42, .7, R()) * hz, lerp(380, 760, R()), pal, R, night, sx);
  if (pal.sun) {
    c.save(); c.fillStyle = night ? "#fff2da" : "#fff8ea"; c.shadowColor = pal.sun.col; c.shadowBlur = 30;
    c.beginPath(); c.arc(sx, sy, h * (night ? .032 : .03), 0, 6.283); c.fill(); c.restore();
    if (!night) {
      // the glare a camera would catch: a horizontal streak and a few ghosts along the line through the centre
      c.save(); c.globalCompositeOperation = "lighter";
      const sg = c.createLinearGradient(sx - w * .4, 0, sx + w * .4, 0); sg.addColorStop(0, "rgba(255,220,180,0)"); sg.addColorStop(.5, "rgba(255,236,210,.35)"); sg.addColorStop(1, "rgba(255,220,180,0)");
      c.fillStyle = sg; c.fillRect(sx - w * .4, sy - 1.5, w * .8, 3);
      for (const [t, r, col, a] of [[.35, 26, "#ffb4d8", .1], [.6, 12, "#a8c8ff", .14], [.85, 44, "#c8a0ff", .07], [1.2, 18, "#ffd8a0", .12]]) {
        const fx = lerp(sx, w / 2, t * 2), fy = lerp(sy, h * .45, t * 2);
        Wc.glow(c, fx, fy, r * 2, col, a * 2);
      }
      c.restore();
    }
  }
}

function water(c, pal, x0, x1, y0, y1, seed) {
  const R = rng(seed + 500);
  const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, mix(pal.water[0], pal.sky[pal.sky.length - 1], .35)); g.addColorStop(1, pal.water[1]);
  c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.save(); c.globalCompositeOperation = "lighter";
  for (let i = 0; i < (x1 - x0) / 6; i++) { const x = lerp(x0, x1, R()), y = lerp(y0, y1, Math.pow(R(), 1.6)), l = lerp(4, 30, R()); c.fillStyle = Wc.rgba(R() < .75 ? pal.light : "#ffffff", lerp(.15, .7, R()) * (1 - (y - y0) / (y1 - y0) * .5)); c.fillRect(x - l / 2, y, l, lerp(.8, 1.8, R())); }
  c.restore();
}

function near(c, pal, city, sunX, night) {
  const P = animePainter(c, pal, sunX, night), G = city.ground ?? 812, R = rng(city.seed + 600);
  const g = c.createLinearGradient(0, G - 20, 0, H); g.addColorStop(0, mix(pal.ground[0], pal.gold, .12)); g.addColorStop(.15, pal.ground[0]); g.addColorStop(1, pal.ground[1]);
  c.fillStyle = g; c.beginPath(); c.moveTo(-100, H + 50);
  for (let i = 0; i <= 40; i++) c.lineTo(i / 40 * (W + 200) - 100, G - 20 + Math.sin(i * .7 + city.seed + 30) * 8);
  c.lineTo(W + 100, H + 50); c.fill();
  // the lit path
  const pg = c.createLinearGradient(0, G + 30, 0, G + 66); pg.addColorStop(0, Wc.rgba(pal.path, 0)); pg.addColorStop(.5, Wc.rgba(pal.path, .22)); pg.addColorStop(1, Wc.rgba(pal.path, 0)); c.fillStyle = pg; c.fillRect(-100, G + 30, W + 200, 36);
  const ruins = city.ruins || [
    { k: "arch", x: 70, h: 470, w: 230 }, { k: "col", x: 520, h: 360 }, { k: "cyp", x: 640, h: 330 }, { k: "col", x: 1010, h: 260, broken: .4 },
    { k: "cyp", x: 1340, h: 290 }, { k: "col", x: 1430, h: 380 }, { k: "col", x: 1880, h: 300, broken: .3 }, { k: "cyp", x: 2010, h: 350 }, { k: "arch", x: 2330, h: 500, w: 240 },
  ];
  for (const r of ruins) {
    const b = G + 8;
    if (r.k === "arch") P.mass(K.arch(r.x, b, r.w, r.h), .1, { flat: 1 });
    else if (r.k === "col") P.mass(K.column(r.x, b, r.h, 34, r.broken || 0), .14, { flat: 1 });
    else P.mass(K.cypress(r.x, b, r.h), 0, { col: pal.tree, flat: 1 });
  }
  c.save(); c.strokeStyle = Wc.rgba(pal.tree, .8); c.lineWidth = 1.2;
  for (let i = 0; i < 200; i++) { const x = R() * W, y = G + lerp(-14, 6, R()), h = lerp(6, 18, R()); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2, y - h * .6, x + lerp(-5, 5, R()), y - h); c.stroke(); }
  c.restore();
}

// The four sheets in anime style, matching buildLayers sheet for sheet.
// night: the same city after dark, in its bench-clip night palette.
export function buildAnime(city, k, reflect, night = false) {
  const pal = night ? { ...city.pal, ...city.night } : city.pal, hz = city.horizon ?? 690, sunX = W * (pal.sun?.x ?? .5);
  const s = make(k), f = make(k), m = make(k), n = make(k);
  sky(s.c, pal, W, H, hz, city.seed, night);
  const Pf = animePainter(f.c, pal, sunX, night);
  if (city.far) city.far(Pf, W / 2, hz, 1); else { Pf.ridge(-50, W + 50, hz, 120, pal.far[0], { shape: (v) => .5 + .5 * Math.sin(v * 7 + 1) }); Pf.ridge(-50, W + 50, hz + 6, 70, pal.far[1]); }
  Pf.band(-50, W + 50, hz - 10, 70, pal.haze);
  if (pal.water) water(m.c, pal, -50, W + 50, hz, (city.ground ?? 812) + 20, city.seed);
  else { m.c.fillStyle = pal.far[1]; m.c.fillRect(-50, hz - 4, W + 100, 124); }
  city.skyline(animePainter(m.c, pal, sunX, night), W / 2, hz, 1);
  if (pal.water && reflect) reflect(m.c, m.cv, k, hz, (city.ground ?? 812) - hz, pal);
  near(n.c, pal, city, sunX, night);
  return { sky: s.cv, far: f.cv, mid: m.cv, near: n.cv, k, hz };
}
