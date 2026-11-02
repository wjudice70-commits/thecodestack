/* Yavaş Yavaş storybook: the shapes a city is built from. Every function returns outlines in
   stage units (y grows downward, `b` is the ground line the piece stands on). The city files
   arrange them; scene.js paints them as watercolor and traces their tops in neon or gold. */
const { rng, noise, lerp } = YY;

export const rect = (x, b, w, h) => [[x - w / 2, b], [x - w / 2, b - h], [x + w / 2, b - h], [x + w / 2, b]];

// A dome on a drum, with a crescent finial.
export function dome(x, b, r, o = {}) {
  const drum = o.drum ?? r * .35, rise = o.rise ?? 1, pts = [[x - r * 1.04, b], [x - r * 1.04, b - drum]];
  for (let i = 0; i <= 16; i++) { const a = Math.PI - i / 16 * Math.PI; pts.push([x + Math.cos(a) * r, b - drum - Math.sin(a) * r * rise]); }
  pts.push([x + r * 1.04, b - drum], [x + r * 1.04, b]);
  const top = b - drum - r * rise, f = o.finial ?? r * .35;
  if (f) { const i = 9; pts.splice(i, 0, [x - r * .05, top + 1], [x - 1.2, top - f * .6], [x, top - f], [x + 1.2, top - f * .6], [x + r * .05, top + 1]); }
  return pts;
}
// An onion or pointed dome (the eastern and Seljuk roofs).
export function cone(x, b, w, h, o = {}) {
  const drum = o.drum ?? 0, pts = [[x - w / 2, b], [x - w / 2, b - drum]];
  pts.push([x - w * .18, b - drum - h * .72], [x, b - drum - h], [x + w * .18, b - drum - h * .72], [x + w / 2, b - drum], [x + w / 2, b]);
  return pts;
}
// A pencil minaret: shaft, a balcony or two, a sharp lead cap.
export function minaret(x, b, h, w = h * .045, balconies = 2) {
  const L = [[x - w / 2, b]], Rr = [[x + w / 2, b]];
  for (let k = 0; k < balconies; k++) {
    const y = b - h * (.62 + k * .14);
    L.push([x - w / 2, y + 4], [x - w * .95, y], [x - w * .95, y - 3], [x - w / 2 * .9, y - 5]);
    Rr.push([x + w / 2, y + 4], [x + w * .95, y], [x + w * .95, y - 3], [x + w / 2 * .9, y - 5]);
  }
  const capB = b - h * .86;
  L.push([x - w * .45, capB]); Rr.push([x + w * .45, capB]);
  return [...L, [x, b - h], ...Rr.reverse()];
}
// A stepped imperial mosque: a great dome, half domes, little domes, and minarets.
export function mosque(x, b, s, o = {}) {
  const parts = [rect(x, b, 320 * s, 70 * s)];
  parts.push(dome(x - 115 * s, b - 70 * s, 26 * s, { drum: 10 * s }), dome(x + 115 * s, b - 70 * s, 26 * s, { drum: 10 * s }));
  parts.push(dome(x - 70 * s, b - 70 * s, 50 * s, { drum: 14 * s, rise: .7, finial: 0 }), dome(x + 70 * s, b - 70 * s, 50 * s, { drum: 14 * s, rise: .7, finial: 0 }));
  parts.push(dome(x, b - 70 * s, 82 * s, { drum: 34 * s, rise: .92, finial: 22 * s }));
  const m = o.minarets ?? 4, mh = (o.mh ?? 290) * s, span = (o.span ?? 190) * s;
  const xs = m === 6 ? [-1.25, -1, 1, 1.25, -.82, .82] : m === 2 ? [-1, 1] : [-1.12, -.9, .9, 1.12];
  for (const k of xs) parts.push(minaret(x + k * span, b, mh * (Math.abs(k) > 1 ? .86 : 1), 12 * s, Math.abs(k) > 1 ? 2 : 3));
  return parts;
}
// A tower: square or round, with a flat, crenellated, conical or clock top.
export function tower(x, b, w, h, top = "flat") {
  const pts = [[x - w / 2, b], [x - w / 2, b - h]];
  if (top === "cone") pts.push([x - w * .62, b - h], [x, b - h - w * 1.1], [x + w * .62, b - h]);
  else if (top === "crenel") { const n = 5; for (let i = 0; i < n; i++) { const x0 = x - w / 2 + w * i / n; pts.push([x0, b - h - w * .14], [x0 + w / n * .55, b - h - w * .14], [x0 + w / n * .55, b - h]); } pts.push([x + w / 2, b - h - w * .14]); }
  else if (top === "clock") pts.push([x - w * .62, b - h], [x - w * .62, b - h - w * .25], [x - w * .3, b - h - w * .25], [x - w * .3, b - h - w * .8], [x, b - h - w * 1.25], [x + w * .3, b - h - w * .8], [x + w * .3, b - h - w * .25], [x + w * .62, b - h - w * .25], [x + w * .62, b - h]);
  else if (top === "galata") pts.push([x - w * .58, b - h], [x - w * .58, b - h - w * .2], [x - w * .5, b - h - w * .2], [x, b - h - w * 1.05], [x + w * .5, b - h - w * .2], [x + w * .58, b - h - w * .2], [x + w * .58, b - h]);
  pts.push([x + w / 2, b - h], [x + w / 2, b]);
  return pts;
}
// A Roman arch as one outline: piers and a round opening.
export function arch(x, b, w, h, t = w * .18) {
  const r = w / 2 - t, spring = b - h + w / 2, pts = [[x - w / 2, b], [x - w / 2, b - h], [x + w / 2, b - h], [x + w / 2, b], [x + r, b], [x + r, spring]];
  for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; pts.push([x + Math.cos(a) * r, spring - Math.sin(a) * r]); }
  pts.push([x - r, b]);
  return pts;
}
// A column with base and capital. `broken` snaps the top off at an angle.
export function column(x, b, h, w, broken = 0) {
  const cap = w * .5;
  if (broken) {
    const k = h * (1 - broken);
    return [[x - w * .7, b], [x - w * .7, b - w * .3], [x - w / 2, b - w * .4], [x - w / 2, b - k], [x - w * .1, b - k - w * .5], [x + w * .2, b - k + w * .2], [x + w / 2, b - k - w * .3], [x + w / 2, b - w * .4], [x + w * .7, b - w * .3], [x + w * .7, b]];
  }
  return [[x - w * .7, b], [x - w * .7, b - w * .3], [x - w / 2, b - w * .4], [x - w * .44, b - h + cap], [x - w * .8, b - h + cap * .3], [x - w * .8, b - h], [x + w * .8, b - h], [x + w * .8, b - h + cap * .3], [x + w * .44, b - h + cap], [x + w / 2, b - w * .4], [x + w * .7, b - w * .3], [x + w * .7, b]];
}
// A temple front: steps, columns, entablature, pediment.
export function temple(x, b, w, h, n = 6, pediment = true) {
  const parts = [rect(x, b, w * 1.08, h * .06)];
  const cb = b - h * .06, ch = h * .7, cw = w / n * .34;
  for (let i = 0; i < n; i++) parts.push(column(x - w / 2 + w / n * (i + .5), cb, ch, cw));
  parts.push(rect(x, cb - ch, w * 1.04, h * .12));
  if (pediment) parts.push([[x - w * .54, cb - ch - h * .12], [x, cb - ch - h * .12 - h * .2], [x + w * .54, cb - ch - h * .12]]);
  return parts;
}
// A cypress: the dark flame of every Mediterranean hill.
export function cypress(x, b, h, w = h * .16) {
  const L = [], Rr = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, y = b - h * t, env = t < .25 ? .55 + t * 1.8 : Math.pow((1 - t) / .75, .75), r = w / 2 * env;
    L.push([x - r * (1 + .08 * Math.sin(i * 2.3)), y]); Rr.push([x + r * (1 + .08 * Math.cos(i * 1.7)), y]);
  }
  return [[x - w * .06, b + 4], ...L, ...Rr.reverse(), [x + w * .06, b + 4]];
}
// A round-headed tree (plane, olive, poplar crowns).
export function tree(x, b, h, w, seed = 1) {
  const R = rng(seed), pts = [[x - w * .05, b], [x - w * .05, b - h * .4]];
  for (let i = 0; i <= 14; i++) { const a = Math.PI * .95 - i / 14 * Math.PI * .9; const r = .85 + R() * .3; pts.push([x + Math.cos(a) * w / 2 * r, b - h * .55 - Math.sin(a) * h * .45 * r]); }
  pts.push([x + w * .05, b - h * .4], [x + w * .05, b]);
  return pts;
}
// Hills and mountains: a noisy ridge from x0 to x1. shape(v) is the height envelope 0..1.
export function ridge(x0, x1, b, h, seed = 1, shape = (v) => Math.sin(Math.PI * v), n = 60, rough = .22) {
  const pts = [[x0, b + 40]];
  for (let i = 0; i <= n; i++) { const v = i / n, r = noise(v * 9 + seed) * .7 + noise(v * 31 + seed * 2) * .3; pts.push([lerp(x0, x1, v), b - h * shape(v) * (1 - rough + rough * 2 * r)]); }
  pts.push([x1, b + 40]);
  return pts;
}
// A town of small houses climbing a slope, as one jagged outline (and their window positions).
export function town(x0, x1, b, h, seed = 3, slope = 0) {
  const R = rng(seed), pts = [[x0, b + 30]], win = [];
  let x = x0;
  while (x < x1) {
    const w = lerp(14, 34, R()), hh = h * lerp(.35, 1, R()) + slope * (x - x0), roof = R() < .55;
    pts.push([x, b - hh]); if (roof) pts.push([x + w / 2, b - hh - w * .35]); pts.push([x + w, b - hh]);
    for (let k = 0; k < 3; k++) if (R() < .5) win.push([x + w * lerp(.2, .8, R()), b - hh * lerp(.2, .8, R())]);
    x += w * lerp(.8, 1.05, R());
  }
  pts.push([x1, b + 30]);
  return { pts, win };
}
// A castle on its hill: a curtain wall with towers and crenellations.
export function castle(x0, x1, b, h, seed = 4) {
  const R = rng(seed), pts = [[x0, b + 20]]; let x = x0;
  while (x < x1) {
    const isT = R() < .3, w = isT ? lerp(30, 46, R()) : lerp(40, 80, R()), hh = isT ? h * lerp(1.1, 1.4, R()) : h * lerp(.8, 1, R());
    pts.push([x, b - hh]);
    const n = Math.max(2, Math.round(w / 12));
    for (let i = 0; i < n; i++) { const xa = x + w * i / n; pts.push([xa, b - hh - 7], [xa + w / n * .55, b - hh - 7], [xa + w / n * .55, b - hh]); }
    pts.push([x + w, b - hh]); x += w;
  }
  pts.push([x1, b + 20]);
  return pts;
}
// A fairy chimney: a soft rock cone with a darker cap stone.
export function chimney(x, b, w, h, seed = 1) {
  const R = rng(seed), pts = [[x - w / 2, b]];
  for (let i = 1; i <= 8; i++) { const t = i / 8, r = w / 2 * (1 - Math.pow(t, 1.6) * .82) * (.92 + R() * .16); pts.push([x - r, b - h * t]); }
  pts.push([x - w * .2, b - h - w * .08], [x - w * .05, b - h - w * .22], [x + w * .14, b - h - w * .18], [x + w * .22, b - h - w * .04]);
  for (let i = 8; i >= 1; i--) { const t = i / 8, r = w / 2 * (1 - Math.pow(t, 1.6) * .82) * (.92 + R() * .16); pts.push([x + r, b - h * t]); }
  pts.push([x + w / 2, b]);
  return pts;
}
// Pamukkale's travertine shelves: stacked scalloped white basins.
export function terraces(x0, x1, b, h, rows = 6, seed = 6) {
  const R = rng(seed), out = [];
  for (let r = 0; r < rows; r++) {
    const y = b - h * (r / rows), inset = (x1 - x0) * .06 * r, pts = [[x0 + inset, y + 6]];
    let x = x0 + inset;
    while (x < x1 - inset) { const w = lerp(26, 60, R()); pts.push([x, y - h / rows * .9], [x + w * .5, y - h / rows * 1.05], [x + w, y - h / rows * .9], [x + w * .96, y - h / rows * .2]); x += w; }
    pts.push([x1 - inset, y + 6]);
    out.push(pts);
  }
  return out;
}
// The wooden horse of Troy.
export function horse(x, b, s) {
  const p = [[-60, 0], [-60, -18], [-50, -18], [-50, -60], [-70, -70], [-72, -100], [-60, -98], [-48, -80], [40, -80], [52, -96], [56, -150], [74, -168], [104, -160], [110, -146], [92, -140], [84, -120], [76, -80], [60, -60], [60, -18], [70, -18], [70, 0]];
  const legs = [rect(-40, -18, 10, 44), rect(-20, -18, 10, 44), rect(30, -18, 10, 44), rect(50, -18, 10, 44)];
  const plat = rect(0, 0, 160, 18);
  const tr = (pts) => pts.map(([px, py]) => [x + px * s, b + py * s - 18 * s]);
  return [tr(p), ...legs.map(tr), plat.map(([px, py]) => [x + px * s, b + py * s])];
}
// A monastery tucked into a cliff face (Sumela).
export function cliffMonastery(x, b, s) {
  const cliff = [[x - 220 * s, b], [x - 200 * s, b - 300 * s], [x - 150 * s, b - 360 * s], [x - 60 * s, b - 380 * s], [x + 40 * s, b - 430 * s], [x + 140 * s, b - 400 * s], [x + 200 * s, b - 320 * s], [x + 230 * s, b]];
  const bld = [rect(x - 30 * s, b - 170 * s, 140 * s, 70 * s), rect(x + 40 * s, b - 190 * s, 60 * s, 40 * s), rect(x - 90 * s, b - 160 * s, 50 * s, 46 * s)];
  return { cliff, bld, win: [[x - 70 * s, b - 195 * s], [x - 40 * s, b - 200 * s], [x - 10 * s, b - 200 * s], [x + 20 * s, b - 205 * s], [x + 50 * s, b - 215 * s]] };
}
// Windows on a block: a grid of lit dabs.
export function windowsIn(x, b, w, h, cols, rows, seed = 1, p = .6) {
  const R = rng(seed), out = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (R() < p) out.push([x - w / 2 + w * (i + .5) / cols, b - h * (j + .5) / rows]);
  return out;
}
// The top edge of an outline (the part neon or gold should trace), dropping the ground corners.
export function topEdge(pts, b) { return pts.filter(([, y]) => y < b - 2); }
