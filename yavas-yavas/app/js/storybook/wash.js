/* Yavaş Yavaş storybook: watercolor on paper, drawn in code.
   A wash is a shape whose edge is broken up again and again, then laid down as many thin glazes,
   so the colour pools and bleeds the way paint does. Splashes, granulation, wet edges, gold leaf
   and the thin neon lines all live here. Everything is seeded: a city always paints the same way. */
const { rng, clamp, lerp } = YY;

export const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
export const mixHex = (a, b, t) => YY.mix(a, b, t);
export const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

// Gaussian-ish random from a seeded source.
const gauss = (R) => (R() + R() + R() - 1.5) / 1.5;

// Break every edge at its midpoint and push the midpoint out sideways. Each point carries its own
// "wetness" so some stretches of edge stay calm while others run.
export function deform(pts, depth, amt, R) {
  let p = pts.map(q => q.length > 2 ? q : [q[0], q[1], .4 + R() * 1.2]);
  for (let d = 0; d < depth; d++) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const w = (a[2] + b[2]) / 2 * lerp(.8, 1.2, R());
      const s = gauss(R) * amt * w * len * .5, t = gauss(R) * amt * w * len * .18;
      out.push(a, [a[0] + dx * .5 - dy / len * s + dx / len * t, a[1] + dy * .5 + dx / len * s + dy / len * t, w]);
    }
    p = out;
  }
  return p;
}

const trace = (c, p) => { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); };

// An irregular round blob: the seed shape for splashes and clouds.
export function blob(x, y, rx, ry = rx, n = 9, R = Math.random, jag = .28) {
  const pts = [], a0 = R() * 6.283;
  for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283, r = 1 - jag / 2 + R() * jag; pts.push([x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]); }
  return pts;
}

// Lay down a wash. o: { seed, layers, alpha, spread, depth, edge, bloom }
//  spread: how far the paint wanders past the drawn shape (0 is crisp, 1 is very wet).
//  edge: strength of the darker rim where pigment dries at the edge of a puddle.
export function wash(c, pts, col, o = {}) {
  const R = rng(o.seed ?? 7), spread = o.spread ?? .55, layers = o.layers ?? 22, a = o.alpha ?? .055;
  const base = deform(pts, o.depth ?? 2, spread * .9, R);
  c.save();
  c.fillStyle = Array.isArray(col) ? col[0] : col;
  // Wet in wet: draw the glaze as a blurred shadow cast from far off-canvas (works everywhere, unlike ctx.filter).
  const soft = o.soft || 0, OFF = 20000;
  if (soft) { const m = c.getTransform(); c.shadowBlur = soft * Math.hypot(m.a, m.b); c.shadowOffsetX = OFF * m.a; c.shadowOffsetY = OFF * m.b; c.translate(-OFF, 0); }
  for (let i = 0; i < layers; i++) {
    if (Array.isArray(col)) c.fillStyle = col[i % col.length];
    if (soft) c.shadowColor = c.fillStyle;
    c.globalAlpha = a * lerp(.6, 1.3, R());
    trace(c, deform(base, 3, spread * .55, R)); c.fill();
  }
  if (soft) { c.translate(OFF, 0); c.shadowColor = "transparent"; }
  if (o.edge) {
    c.globalAlpha = o.edge; c.strokeStyle = o.edgeCol || (Array.isArray(col) ? col[0] : col); c.lineWidth = o.edgeW || 1.4;
    for (let i = 0; i < 2; i++) { trace(c, deform(base, 2, spread * .25, R)); c.stroke(); }
  }
  c.restore();
}

// A flung splash: one wet puddle, a crown of droplets, a few streaks thrown outward.
export function splash(c, x, y, r, col, o = {}) {
  const R = rng(o.seed ?? 11), dir = o.dir ?? R() * 6.283, fling = o.fling ?? .7;
  wash(c, blob(x, y, r, r * (o.squash ?? .8), 10, R, .5), col, { seed: o.seed, layers: o.layers ?? 18, alpha: o.alpha ?? .07, spread: o.spread ?? .8, edge: o.edge ?? .12, soft: o.soft });
  c.save(); c.fillStyle = col;
  const n = o.drops ?? 46;
  for (let i = 0; i < n; i++) {
    const a = dir + gauss(R) * lerp(3.1, .9, fling), d = r * (1 + Math.pow(R(), 1.8) * 2.6), s = r * .11 * Math.pow(R(), 2.2) + .6;
    c.globalAlpha = lerp(.25, .75, R());
    c.beginPath(); c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * .85, s, s * lerp(.7, 1, R()), a, 0, 6.283); c.fill();
  }
  const ns = o.streaks ?? 2;
  for (let i = 0; i < ns; i++) {
    const a = dir + gauss(R) * 1.3, d0 = r * .7, d1 = r * lerp(1.4, 2.4, R()), w = r * lerp(.03, .07, R());
    const x0 = x + Math.cos(a) * d0, y0 = y + Math.sin(a) * d0, x1 = x + Math.cos(a) * d1, y1 = y + Math.sin(a) * d1;
    c.globalAlpha = .5;
    c.beginPath(); c.moveTo(x0 - Math.sin(a) * w, y0 + Math.cos(a) * w); c.quadraticCurveTo(lerp(x0, x1, .6), lerp(y0, y1, .6), x1, y1);
    c.quadraticCurveTo(lerp(x0, x1, .6), lerp(y0, y1, .6), x0 + Math.sin(a) * w, y0 - Math.cos(a) * w); c.fill();
    c.beginPath(); c.arc(x1 + Math.cos(a) * w * 3, y1 + Math.sin(a) * w * 3, w * 1.3, 0, 6.283); c.fill();
  }
  c.restore();
}

// A soft horizontal band of colour across a span (sky glazes, mist, light on water).
export function band(c, x0, x1, y, h, col, o = {}) {
  const R = rng(o.seed ?? 3), pts = [];
  const n = 14;
  for (let i = 0; i <= n; i++) pts.push([lerp(x0, x1, i / n), y - h / 2 + gauss(R) * h * .12]);
  for (let i = n; i >= 0; i--) pts.push([lerp(x0, x1, i / n), y + h / 2 + gauss(R) * h * .12]);
  wash(c, pts, col, { seed: o.seed, layers: o.layers ?? 16, alpha: o.alpha ?? .05, spread: o.spread ?? .35, depth: 2, soft: o.soft ?? h * .5 });
}

// Paper: a tile of fibres and tooth. Multiplied over a frame it reads as cold-press paper.
let paperTile = null;
export function paper() {
  if (paperTile) return paperTile;
  const S = 384, c = canvas(S, S), x = c.getContext("2d"), R = rng(4242);
  x.fillStyle = "#808080"; x.fillRect(0, 0, S, S);
  const img = x.getImageData(0, 0, S, S), d = img.data;
  // tooth: value noise at two scales
  const g = (n) => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = R(); return a; };
  const g1 = g(48), g2 = g(12);
  const sample = (a, n, u, v) => {
    const X = u * n, Y = v * n, i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j, m = (k) => ((k % n) + n) % n;
    const q = (ii, jj) => a[m(jj) * n + m(ii)];
    return lerp(lerp(q(i, j), q(i + 1, j), fx), lerp(q(i, j + 1), q(i + 1, j + 1), fx), fy);
  };
  for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
    const u = xx / S, v = y / S, n = sample(g1, 48, u, v) * .55 + sample(g2, 12, u, v) * .3 + R() * .15;
    const k = (y * S + xx) * 4, val = 128 + (n - .5) * 46;
    d[k] = d[k + 1] = d[k + 2] = val;
  }
  x.putImageData(img, 0, 0);
  // fibres
  x.lineCap = "round";
  for (let i = 0; i < 260; i++) {
    const px = R() * S, py = R() * S, a = R() * 6.283, l = 4 + R() * 16;
    x.strokeStyle = R() < .5 ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.12)"; x.lineWidth = .6 + R() * .6;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + .5) * l * .5, py + Math.sin(a + .5) * l * .5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  return (paperTile = c);
}

// Granulation: pigment settling in the paper's tooth. Darkens only where paint already is.
export function granulate(c, amount = .35, seed = 5) {
  const R = rng(seed), W = c.canvas.width, H = c.canvas.height;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-atop";
  const p = c.createPattern(paper(), "repeat");
  c.globalAlpha = amount * .5; c.fillStyle = p;
  c.translate(-R() * 384, -R() * 384); c.fillRect(0, 0, W + 768, H + 768);
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = "rgba(10,4,8,.35)";
  // a scatter of pigment flecks
  const n = W * H / 1800 * amount;
  for (let i = 0; i < n; i++) { c.globalAlpha = R() * .5; c.fillRect(R() * W, R() * H, 1 + R(), 1 + R()); }
  c.restore();
}

// Paint inside a shape only (pigment pooling, light falling across a wall).
export function within(c, pts, fn) { c.save(); trace(c, pts); c.clip(); fn(c); c.restore(); }

// A solid body of paint: an opaque core, a soft bleed past its edge, pooled pigment inside, a dried rim.
export function body(c, pts, col, o = {}) {
  const R = rng(o.seed ?? 3), core = deform(pts, 1, .06, R);
  c.save(); c.globalAlpha = o.opacity ?? .92; c.fillStyle = col; trace(c, core); c.fill(); c.restore();
  wash(c, pts, col, { seed: o.seed, layers: o.layers ?? 8, alpha: .045, spread: o.spread ?? .22, depth: 1 });
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = x1 - x0, h = y1 - y0;
  within(c, core, (c) => {
    // light from the upper left, cool shadow to the lower right
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, rgba(o.lit || "#ffd9a0", o.litA ?? .22)); g.addColorStop(.55, "rgba(0,0,0,0)"); g.addColorStop(1, rgba(o.cool || "#1a0a30", .3));
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    // pooled pigment: a few darker and lighter blooms
    for (let i = 0; i < (o.pools ?? 4); i++) {
      const bx = x0 + R() * w, by = y0 + R() * h, r = Math.max(w, h) * (.15 + R() * .3);
      wash(c, blob(bx, by, r, r * .7, 8, R, .5), R() < .7 ? mixHex(col, "#0a0410", .45) : mixHex(col, "#fff4e4", .3), { seed: o.seed + i, layers: 6, alpha: .045, spread: .9 });
    }
  });
  if (o.edge !== 0) { c.save(); c.globalAlpha = o.edge ?? .35; c.strokeStyle = o.edgeCol || "#0a0410"; c.lineWidth = o.edgeW ?? 1.2; trace(c, deform(core, 1, .03, R)); c.stroke(); c.restore(); }
}

// A thin line of light: neon on stone (the city of the future) or gold leaf (the old city).
export function glowLine(c, path, col, w = 1.6, glow = 14, a = .9) {
  c.save(); c.globalCompositeOperation = "lighter"; c.lineJoin = "round"; c.lineCap = "round";
  c.strokeStyle = col; c.shadowColor = col;
  for (const [lw, gb, al] of [[w * 4, glow * 1.6, a * .12], [w * 1.8, glow, a * .35], [w, glow * .3, a]]) {
    c.lineWidth = lw; c.shadowBlur = gb; c.globalAlpha = al;
    c.beginPath(); c.moveTo(path[0][0], path[0][1]); for (let i = 1; i < path.length; i++) c.lineTo(path[i][0], path[i][1]); c.stroke();
  }
  c.restore();
}

// Light falling from above: soft wedges, added.
export function rays(c, x, y, len, spread, col, n = 7, seed = 9, a = .1) {
  const R = rng(seed);
  c.save(); c.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const ang = Math.PI / 2 + (i / (n - 1) - .5) * spread + gauss(R) * .05, w = lerp(.02, .07, R());
    const g = c.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.addColorStop(0, rgba(col, a * lerp(.6, 1.2, R()))); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang - w) * len, y + Math.sin(ang - w) * len); c.lineTo(x + Math.cos(ang + w) * len, y + Math.sin(ang + w) * len); c.closePath(); c.fill();
  }
  c.restore();
}

// A radial pool of light (a lamp, a halo, the sun behind haze).
export function glow(c, x, y, r, col, a = .5, op = "lighter") {
  c.save(); c.globalCompositeOperation = op;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(.35, rgba(col, a * .35)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
}

// Windows and lamps: small warm dabs, a few brighter.
export function lights(c, pts, col, size, seed = 2) {
  const R = rng(seed);
  c.save(); c.globalCompositeOperation = "lighter";
  for (const [x, y] of pts) {
    const s = size * lerp(.6, 1.3, R());
    c.fillStyle = rgba(col, lerp(.35, .9, R())); c.fillRect(x - s / 2, y - s * .7, s, s * 1.4);
    if (R() < .25) { c.globalAlpha = .6; glow(c, x, y, s * 6, col, .35); c.globalAlpha = 1; }
  }
  c.restore();
}

export { trace, gauss, clamp };
