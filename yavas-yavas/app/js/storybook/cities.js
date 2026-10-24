/* Yavaş Yavaş storybook: the cities of the journey as recipes for the painter.
   Each has its own dusk (pal), its own night for the bench (night), the hills behind it (far)
   and its skyline. One look across all of them: watercolor stone and sky, an angel's halo over
   the city's heart, old stone edged in gold and the newest edges traced in neon. */
const { rng, lerp, mix } = YY;

const BASE = {
  shadow: "#1b1020", stone: "#c4a184", gold: "#f3c66f", neon: "#ff4fa3", neon2: "#56e1ff", light: "#ffc56b",
  tree: "#130b12", path: "#b98d6c", ground: ["#2b1820", "#110a10"], haze: "#e9a3a0",
  cloud: ["#f1b39a", "#b25a78", "#6a3a7c"], splash: ["#c2304f", "#e38a3c", "#5a2a86"], far: ["#6e3a5e", "#3a2034"], water: false,
};
const NIGHT = {
  sky: ["#0b0a22", "#24123c", "#561c3a", "#b4503a"], cloud: ["#3a2052", "#5e2848"], haze: "#a24a58",
  sun: { x: .78, y: .25, col: "#ffdcae", disc: "#fff2da" }, stone: "#6a4a60", shadow: "#0d0917", far: ["#28183c", "#140c22"],
};
const city = (o) => ({ ...o, pal: { ...BASE, ...o.pal }, night: { ...NIGHT, ...(o.pal?.water ? { water: ["#1c1132", "#0a0614", "#ffb060"] } : {}), ...o.night } });

/* ---------- shared pieces ---------- */
// A row of houses with lit windows.
function houses(P, x0, x1, b, h, seed, t = .3) {
  const tw = P.K.town(x0, x1, b, h, seed);
  P.mass(tw.pts, t, { spread: .14 }).lights(tw.win, 3.2);
  return tw;
}
// A mountain with a snow cap (or not), as one watercolor ridge.
function peak(P, x, b, w, h, col, snow, seed = 1) {
  const R = rng(seed), pts = [[x - w / 2, b + 30]];
  for (let i = 0; i <= 30; i++) { const v = i / 30, e = 1 - Math.abs(v - .5) * 2; pts.push([x - w / 2 + w * v, b - h * Math.pow(e, 1.3) * (.9 + .2 * R())]); }
  pts.push([x + w / 2, b + 30]);
  P.wash(pts, col, { layers: 14, alpha: .08, spread: .06, depth: 1, edge: .1 });
  if (snow) {
    const cap = pts.filter(([, y]) => y < b - h * .62).map(([px, py]) => [px, py]);
    if (cap.length > 2) {
      // snow: a bright crest that thins into streaks down the gullies
      const back = cap.slice().reverse().map(([px, py], i) => [px, py + h * (.12 + .22 * Math.abs(Math.sin(i * 1.9 + seed)))]);
      P.wash([...cap, ...back], snow, { layers: 10, alpha: .07, spread: .45, soft: 6 });
      P.wash([...cap, ...back.map(([px, py]) => [px, lerp(py, b - h, .45)])], snow, { layers: 8, alpha: .09, spread: .3 });
    }
  }
}
// Hot air balloons drifting over Kapadokya.
function balloon(P, x, y, r, col) {
  const pts = []; for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI * 2; const k = Math.sin(a) > 0 ? .55 + .45 * (1 - Math.sin(a)) : 1; pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * (Math.sin(a) > 0 ? 1.15 : 1)]); }
  P.wash(pts, col, { layers: 12, alpha: .1, spread: .12, edge: .2, depth: 1 });
  P.c.save(); P.c.fillStyle = "#2a160e"; P.c.fillRect(x - r * .14, y + r * 1.32, r * .28, r * .22); P.c.strokeStyle = "rgba(40,20,12,.6)"; P.c.lineWidth = .8;
  P.c.beginPath(); P.c.moveTo(x - r * .4, y + r * .9); P.c.lineTo(x - r * .14, y + r * 1.32); P.c.moveTo(x + r * .4, y + r * .9); P.c.lineTo(x + r * .14, y + r * 1.32); P.c.stroke(); P.c.restore();
  P.glow(x, y + r * 1.3, r * .7, "#ffb35a", .35);
}
function palm(P, x, b, h) {
  const c = P.c; c.save(); c.strokeStyle = P.pal.tree; c.lineWidth = 5; c.lineCap = "round";
  c.beginPath(); c.moveTo(x, b); c.quadraticCurveTo(x + h * .12, b - h * .5, x + h * .05, b - h); c.stroke();
  c.lineWidth = 3; const tx = x + h * .05, ty = b - h;
  for (let i = 0; i < 7; i++) { const a = -Math.PI + i / 6 * Math.PI, l = h * .38; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * l * .6, ty - 14, tx + Math.cos(a) * l, ty + Math.abs(Math.sin(a)) * -l * .2 + l * .35); c.stroke(); }
  c.restore();
}
// A glass tower of the coming city: dark wash, neon spine, window grid.
function glassTower(P, x, b, w, h, seed) {
  const t = P.K.rect(x, b, w, h);
  P.mass(t, .12, { col: mix(P.pal.shadow, P.pal.neon2, .18) }).neon(t, b, P.pal.neon2, 1).lights(P.K.windowsIn(x, b, w * .8, h * .9, 4, Math.round(h / 16), seed, .45), 2.4, "#bfe9ff");
}

// Today's city: a row of apartment blocks, flat roofs and rooftop tanks, as one stepped outline with lit windows.
function blocks(P, x0, x1, b, h, seed, t = .26) {
  const R = rng(seed), pts = [[x0, b + 30]], win = [];
  let x = x0;
  while (x < x1) {
    const w = lerp(26, 58, R()), hh = h * lerp(.45, 1, R());
    pts.push([x, b - hh]);
    if (R() < .3) pts.push([x + w * .3, b - hh], [x + w * .3, b - hh - 7], [x + w * .45, b - hh - 7], [x + w * .45, b - hh]);
    pts.push([x + w, b - hh]);
    const cols = Math.max(2, Math.round(w / 9)), rows = Math.max(2, Math.round(hh / 11));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (R() < .42) win.push([x + w * (i + .5) / cols, b - hh * (j + .5) / rows]);
    x += w * lerp(.92, 1.04, R());
  }
  pts.push([x1, b + 30]);
  P.mass(pts, t, { spread: .1, flat: 1 }).lights(win, 2.6);
}
// A suspension bridge strung across the strait, its cables lit like a necklace.
function bridge(P, x0, x1, b, h, col) {
  const c = P.c, K = P.K, d = b - h * .3, t0 = lerp(x0, x1, .2), t1 = lerp(x0, x1, .8), top = b - h;
  P.mass(K.rect(lerp(x0, x1, .5), d + 3, x1 - x0, 6), .08, { flat: 1, rim: 0 });
  for (const t of [t0, t1]) P.mass([[t - 7, b], [t - 5, top], [t + 5, top], [t + 7, b]], .12, { flat: 1 });
  const cable = [[x0, d]];
  for (let i = 0; i <= 8; i++) cable.push([lerp(x0, t0, i / 8), lerp(d, top, Math.pow(i / 8, 1.6))]);
  for (let i = 1; i <= 24; i++) { const v = i / 24; cable.push([lerp(t0, t1, v), top + (d - 8 - top) * (1 - Math.pow(2 * v - 1, 2))]); }
  for (let i = 1; i <= 8; i++) cable.push([lerp(t1, x1, i / 8), lerp(top, d, 1 - Math.pow(1 - i / 8, 1.6))]);
  c.save(); c.strokeStyle = P.Wc.rgba(col, .3); c.lineWidth = .7;
  for (const [x, y] of cable) { if (x <= x0 || x >= x1) continue; c.beginPath(); c.moveTo(x, y); c.lineTo(x, d); c.stroke(); }
  c.restore();
  P.Wc.glowLine(c, cable, col, 1.6, 10, .95);
  const deck = []; for (let x = x0; x <= x1; x += 9) deck.push([x, d + 1]);
  P.lights(deck, 1.8);
}
// A Bosphorus ferry: white hull, glowing cabin windows, a soft wake.
function ferry(P, x, y, s, dir = 1) {
  const c = P.c, hull = [[x - 46 * s, y], [x - 52 * s * dir, y - 9 * s], [x + 52 * s * dir, y - 9 * s], [x + 42 * s, y]];
  P.mass(hull, .95, { col: "#ece4dc", flat: 1, rim: 0 });
  P.mass(P.K.rect(x, y - 9 * s, 70 * s, 11 * s), .9, { col: "#f4ece2", flat: 1, rim: 0 });
  P.mass(P.K.rect(x + 8 * s * dir, y - 20 * s, 9 * s, 10 * s), .5, { col: "#3a2a3a", flat: 1, rim: 0 });
  const win = []; for (let i = 0; i < 9; i++) win.push([x - 30 * s + i * 7.5 * s, y - 13 * s]);
  P.lights(win, 2.2);
  c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = "rgba(255,236,210,.18)";
  for (let i = 0; i < 5; i++) c.fillRect(x - (60 + i * 26) * s * dir - (dir < 0 ? 0 : 22 * s), y + 2 + i * 2.2, 22 * s, 1.2);
  c.restore();
}
// The coast road: street lamps and the red and white streaks of evening traffic.
function coastRoad(P, x0, x1, y, seed) {
  const R = rng(seed), c = P.c, lamps = [];
  for (let x = x0; x < x1; x += 34) lamps.push([x + R() * 6, y - 6]);
  P.lights(lamps, 2.4);
  c.save(); c.globalCompositeOperation = "lighter";
  for (let i = 0; i < (x1 - x0) / 18; i++) { const x = lerp(x0, x1, R()), l = lerp(10, 40, R()), red = R() < .5; c.fillStyle = red ? "rgba(255,70,60,.55)" : "rgba(255,244,220,.6)"; c.fillRect(x, y + (red ? 1.5 : -.5), l, 1.1); }
  c.restore();
}

/* ---------- the cities ---------- */
export const CITIES = {
  istanbul: city({
    seed: 11, pal: { sky: ["#2a1446", "#7a2a52", "#d2604a", "#f6b56a"], sun: { x: .62, y: .78, col: "#ffbe6a", disc: "#fff0c8" }, water: ["#3a1a3a", "#120814", "#f2a35c"] },
    // the Asian shore across the water: low hills, Çamlıca's tower, the towers of the new city and the bridge
    far(P, x, b) {
      const K = P.K;
      P.ridge(x - 1250, x + 1250, b, 70, P.pal.far[0], { shape: (v) => .5 + .5 * Math.sin(v * 5 + 1.2) });
      const cam = [[x - 905, b], [x - 902, b - 210], [x - 912, b - 222], [x - 900, b - 250], [x - 898, b - 330], [x - 896, b - 250], [x - 884, b - 222], [x - 894, b - 210], [x - 891, b]];
      P.mass(cam, .3, { flat: 1 }).neon(cam, b, P.pal.neon2, .8);
      [[640, 38, 150], [690, 46, 230], [740, 34, 180], [785, 50, 270], [835, 40, 200], [880, 30, 160], [930, 44, 210], [985, 36, 140]].forEach(([dx, w, h], i) => glassTower(P, x + dx, b, w, h, i + 4));
      bridge(P, x - 300, x + 600, b, 190, P.pal.neon2);
      blocks(P, x - 1250, x + 1250, b, 26, 5, .3);
    },
    // the historic peninsula: the old landmarks in warm stone and gold, today's city all around them
    skyline(P, x, b) {
      const K = P.K;
      blocks(P, x - 1180, x - 640, b, 70, 4, .24);
      const blue = K.mosque(x - 420, b, 1.15, { minarets: 6 }); P.many(blue, .5).gold(blue[5], b, 1.2); blue.slice(6).forEach(m => P.gold(m, b, 1));
      blocks(P, x - 180, x + 60, b, 48, 6, .22);
      const aya = K.mosque(x + 260, b, .9, { minarets: 4, mh: 250 }); P.many(aya, .55, { col: "#c98a6e" }); aya.slice(6).forEach(m => P.gold(m, b, .9));
      blocks(P, x + 470, x + 1180, b, 82, 8, .24);
      const gal = K.tower(x + 820, b, 54, 190, "galata"); P.mass(gal, .5).gold(gal, b, 1.2).lights(K.windowsIn(x + 820, b - 40, 36, 140, 2, 5, 9, .7), 3);
      coastRoad(P, x - 1200, x + 1200, b + 4, 12);
      ferry(P, x - 760, b + 46, 1, 1); ferry(P, x + 520, b + 78, 1.3, -1);
      P.halo(x - 420, b - 300, 70);
    },
  }),
  bursa: city({
    seed: 23, pal: { sky: ["#13253a", "#2c5560", "#a07a5a", "#f0c088"], sun: { x: .3, y: .7, col: "#ffd08a" }, far: ["#3f5a62", "#22343a"], haze: "#a8c8b8", cloud: ["#cfe0d0", "#7aa0a0", "#c08a70"], splash: ["#2f8a6a", "#e0a050", "#24506a"], tree: "#0c1612", neon: "#5affb0" },
    far(P, x, b) { peak(P, x + 300, b, 1900, 360, "#4a6a74", "#eef4f2", 3); P.ridge(x - 1250, x + 1250, b, 80, "#2c4448"); },
    skyline(P, x, b) {
      const K = P.K;
      houses(P, x - 1150, x + 1150, b, 55, 6, .25);
      const ulu = [K.rect(x - 250, b, 360, 60)]; for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) ulu.push(K.dome(x - 250 - 140 + i * 70, b - 60 - j * 6, 28 - j * 4, { drum: 8, finial: 8 }));
      P.many(ulu, .5); ulu.forEach(d => P.gold(d, b - 60, .7));
      [K.minaret(x - 460, b, 230, 13), K.minaret(x - 40, b, 230, 13)].forEach(m => P.mass(m, .55).neon(m, b, P.pal.neon, 1));
      const yesil = [K.rect(x + 420, b, 90, 90), K.dome(x + 420, b - 90, 50, { drum: 16, rise: 1.05 })]; P.many(yesil, .1, { col: "#2e7a62" }).neon(yesil[1], b - 90, P.pal.neon, 1.4);
      for (let i = 0; i < 9; i++) P.wash(K.tree(x + 600 + i * 60, b, 70 + (i % 3) * 20, 56, i), "#123026", { layers: 10, alpha: .1, spread: .25, depth: 1 });
      P.halo(x + 420, b - 210, 50);
    },
  }),
  canakkale: city({
    seed: 37, pal: { sky: ["#0f1c3c", "#2a4a78", "#c07a5a", "#f6c98a"], sun: { x: .25, y: .8, col: "#ffc070", disc: "#fff2d2" }, water: ["#1c2e52", "#080e1c", "#f0b060"], cloud: ["#e8b896", "#7a8ab0", "#4a5a8a"], splash: ["#2a5aa0", "#d88a40", "#8a2a40"], neon: "#4fd8ff" },
    far(P, x, b) { P.ridge(x - 1250, x + 1250, b, 110, "#4a4a6a", { shape: (v) => .4 + .6 * Math.sin(v * 3 + .5) ** 2 }); const m = P.K.tower(x + 900, b - 70, 46, 120); P.mass(m, .55).gold(m, b - 70); },
    skyline(P, x, b) {
      const K = P.K;
      houses(P, x - 1150, x - 450, b, 50, 5, .25);
      const h = K.horse(x - 120, b, 1.5); P.many(h, .52, { col: "#9a6a44" }).gold(h[0], b, 1.3);
      const cas = K.castle(x + 300, x + 720, b, 70, 3); P.mass(cas, .45).gold(cas, b);
      const sm = K.tower(x + 510, b - 70, 70, 50, "crenel"); P.mass(sm, .5);
      houses(P, x + 760, x + 1150, b, 60, 9, .3);
      P.halo(x - 120, b - 300, 56);
    },
  }),
  izmir: city({
    seed: 41, pal: { sky: ["#1a1440", "#5a2a6a", "#e0704a", "#ffc070"], sun: { x: .7, y: .84, col: "#ff9a50", disc: "#ffe8c0" }, water: ["#2c1a4a", "#0a0818", "#ff9a5a"], neon: "#ff5ac8" },
    far(P, x, b) { P.ridge(x - 1250, x + 1250, b, 150, "#5a3a6a"); P.mass(P.K.ridge(x - 980, x - 560, b, 125, 8, (v) => Math.sin(Math.PI * v) ** .5), 0, { col: "#4e3460", rim: 0 }); const k = P.K.castle(x - 900, x - 640, b - 120, 30, 7); P.mass(k, .4); },
    skyline(P, x, b) {
      const K = P.K;
      houses(P, x - 1150, x + 1150, b, 70, 12, .25);
      for (const [dx, w, h] of [[-700, 60, 300], [-620, 46, 380], [-540, 54, 260], [520, 50, 340], [600, 66, 420], [690, 44, 300]]) glassTower(P, x + dx, b, w, h, dx);
      const sk = K.tower(x, b, 50, 150, "clock"); P.mass(sk, .7, { col: "#d8c0a0" }).gold(sk, b, 1.2);
      P.c.save(); P.c.fillStyle = "#f6ead0"; P.c.beginPath(); P.c.arc(x, b - 128, 10, 0, 6.283); P.c.fill(); P.c.restore();
      for (const dx of [-160, -110, 120, 175]) palm(P, x + dx, b, 110);
      P.halo(x, b - 250, 50);
    },
  }),
  pamukkale: city({
    seed: 53, pal: { sky: ["#2a2050", "#8a5a8a", "#f0a0a0", "#ffe0c0"], sun: { x: .5, y: .7, col: "#ffd8c0" }, far: ["#9a7a9a", "#5a4a6a"], haze: "#ffd0d0", cloud: ["#ffe0e0", "#c08ab0", "#8a6aa0"], splash: ["#40c8d0", "#f08aa0", "#8a5ab0"], neon: "#5ae8ff", stone: "#e8dcd0" },
    skyline(P, x, b) {
      const K = P.K;
      const tr = K.terraces(x - 900, x + 300, b, 220, 6, 4);
      tr.forEach((t, i) => { P.mass(t, .95, { col: mix("#f6f0ea", "#c8b8c8", i / 8) }); });
      P.lights(Array.from({ length: 60 }, (_, i) => [x - 860 + (i * 37) % 1100, b - (i % 6) * 36 - 10]), 3, "#7af0ff");
      const th = []; for (let i = 0; i < 7; i++) th.push(K.arch(x + 480 + i * 56, b, 52, 90 - Math.abs(i - 3) * 8, 8));
      P.many(th, .7).gold(th[3], b);
      [[x + 420, 150], [x + 470, 120, .3], [x + 930, 160], [x + 980, 110, .45], [x + 1040, 140]].forEach(([cx, h, br]) => { const cl = K.column(cx, b, h, 18, br || 0); P.mass(cl, .7).gold(cl, b, .8); });
      P.halo(x - 300, b - 330, 56);
    },
  }),
  antalya: city({
    seed: 67, pal: { sky: ["#10203a", "#1f5a6a", "#e08050", "#ffcc80"], sun: { x: .82, y: .82, col: "#ff9a50", disc: "#ffe6c0" }, water: ["#124a5a", "#06141c", "#ffa860"], cloud: ["#ffd0a0", "#4a8a9a", "#a05a6a"], splash: ["#1aa0a8", "#ff8a40", "#c0305a"], neon: "#48f0e0" },
    far(P, x, b) { peak(P, x - 400, b, 1400, 300, "#3a4a64", "#e8eef4", 5); peak(P, x + 700, b, 1100, 240, "#34405a", "#e0e8f0", 6); },
    skyline(P, x, b) {
      const K = P.K;
      const cliff = [[x - 1200, b + 20], [x - 1200, b - 90], [x - 500, b - 110], [x - 300, b - 80], [x + 1200, b - 60], [x + 1200, b + 20]];
      P.mass(cliff, 0, { col: "#7a4a3a", rim: 0 });
      houses(P, x - 1100, x + 1100, b - 70, 60, 14, .32);
      const yiv = [K.rect(x - 250, b - 70, 46, 230), K.cone(x - 250, b - 300, 40, 50, { drum: 10 })]; P.many(yiv, .4, { col: "#a05a40" }).neon(yiv[0], b - 70, P.pal.neon, 1);
      P.c.save(); P.c.strokeStyle = "rgba(255,220,180,.25)"; P.c.lineWidth = 1.5; for (let i = 0; i < 6; i++) { P.c.beginPath(); P.c.moveTo(x - 270 + i * 8, b - 70); P.c.lineTo(x - 270 + i * 8, b - 296); P.c.stroke(); } P.c.restore();
      const gate = [K.arch(x + 200, b - 70, 70, 120), K.arch(x + 270, b - 70, 70, 120), K.arch(x + 340, b - 70, 70, 120), K.rect(x + 270, b - 190, 230, 22)];
      P.many(gate, .75, { col: "#e0c8a8" }).gold(gate[3], b - 190);
      for (const dx of [-600, -520, 520, 620, 700]) palm(P, x + dx, b - 70, 100);
      P.halo(x - 250, b - 420, 50);
    },
  }),
  konya: city({
    seed: 71, pal: { sky: ["#1a1a40", "#3a5a7a", "#d0a070", "#f8dca0"], sun: { x: .4, y: .78, col: "#ffd890" }, far: ["#8a7a7a", "#5a4a50"], haze: "#e8d0b0", cloud: ["#f0d8b0", "#7a9ab0", "#a07a8a"], splash: ["#20a890", "#e0a040", "#5a3a8a"], neon: "#40ffd0" },
    far(P, x, b) { P.ridge(x - 1250, x + 1250, b, 90, "#6a5a6a", { shape: (v) => .3 + .7 * Math.sin(v * 2.4) ** 2 }); },
    skyline(P, x, b) {
      const K = P.K;
      houses(P, x - 1150, x + 1150, b, 50, 15, .35);
      const mev = [K.rect(x - 120, b, 360, 80), K.dome(x - 230, b - 80, 40, { drum: 10 }), K.dome(x - 140, b - 80, 34, { drum: 8 }), K.dome(x + 60, b - 80, 30, { drum: 8 })];
      P.many(mev, .7, { col: "#d8c8b0" });
      const drum = K.rect(x - 20, b - 80, 56, 120), top = K.cone(x - 20, b - 200, 60, 110);
      P.mass(drum, .2, { col: "#1f9a88" }).mass(top, .2, { col: "#28b8a0" }).neon(top, b - 200, P.pal.neon, 1.5);
      P.c.save(); P.c.strokeStyle = "rgba(10,40,36,.6)"; P.c.lineWidth = 2; for (let i = 0; i < 7; i++) { P.c.beginPath(); P.c.moveTo(x - 46 + i * 9, b - 80); P.c.lineTo(x - 46 + i * 9, b - 200); P.c.stroke(); } P.c.restore();
      [K.minaret(x + 220, b, 210, 12), K.minaret(x - 360, b, 190, 12)].forEach(m => P.mass(m, .6).gold(m, b));
      P.halo(x - 20, b - 380, 46);
    },
  }),
  kapadokya: city({
    seed: 83, pal: { sky: ["#3a2a5a", "#c07a9a", "#ffb08a", "#ffe2b0"], sun: { x: .2, y: .8, col: "#ffd0a0", disc: "#fff2dc" }, far: ["#b08080", "#7a5060"], haze: "#ffd0c0", cloud: ["#ffe0d0", "#e0a0b0", "#a07ab0"], splash: ["#ff7a5a", "#ffc060", "#8a4aa0"], stone: "#e0b090", neon: "#ff6ab0" },
    far(P, x, b) { P.ridge(x - 1250, x + 1250, b, 140, "#a07070", { shape: (v) => .5 + .5 * Math.sin(v * 5) }); },
    skyline(P, x, b) {
      const K = P.K, R = rng(5);
      for (let i = 0; i < 26; i++) { const cx = x - 1150 + i * 90 + R() * 30, h = lerp(90, 230, R()), w = h * lerp(.32, .45, R()); const ch = K.chimney(cx, b, w, h, i); P.mass(ch, lerp(.6, .9, R()), { col: mix("#d8a684", "#f0d0b0", R()) }); if (R() < .45) P.lights([[cx + lerp(-.1, .1, R()) * w, b - h * lerp(.25, .6, R())]], 4); }
      const cols = ["#e84a5a", "#f0a030", "#4a8ad0", "#e070c0", "#50c090", "#f06a3a"];
      for (let i = 0; i < 11; i++) balloon(P, x - 1100 + i * 210 + R() * 60, b - lerp(260, 520, R()), lerp(16, 34, R()), cols[i % cols.length]);
      P.halo(x, b - 300, 54);
    },
  }),
  ankara: city({
    seed: 97, pal: { sky: ["#0c1430", "#24407a", "#a87a8a", "#f0c8a0"], sun: { x: .7, y: .8, col: "#ffcf9a" }, cloud: ["#d8c0c8", "#6a7ab0", "#3a4a8a"], splash: ["#c02a3a", "#e8b050", "#2a4aa0"], neon: "#ff3a5a", stone: "#e4d8c8" },
    far(P, x, b) { P.ridge(x - 1250, x + 1250, b, 120, "#4a4a6a"); P.mass(P.K.ridge(x + 520, x + 1080, b, 110, 7, (v) => Math.sin(Math.PI * v) ** .5), 0, { col: "#3e3c5c", rim: 0 }); const k = P.K.castle(x + 600, x + 1000, b - 100, 40, 5); P.mass(k, .4).gold(k, b - 100); },
    skyline(P, x, b) {
      const K = P.K;
      houses(P, x - 1150, x + 1150, b, 60, 16, .25);
      const anit = [K.rect(x - 200, b, 560, 50), ...K.temple(x - 200, b - 50, 380, 160, 10, false)]; P.many(anit, .85).gold(anit[anit.length - 1], b - 160);
      [K.tower(x - 520, b - 50, 60, 70, "flat"), K.tower(x + 120, b - 50, 60, 70, "flat")].forEach(t => P.mass(t, .8));
      const at = [K.rect(x + 560, b, 20, 260), K.dome(x + 560, b - 260, 30, { drum: 18, rise: .8, finial: 30 })]; P.many(at, .2).neon(at[1], b - 260, P.pal.neon, 1.3).neon(at[0], b, P.pal.neon, .9);
      P.halo(x - 200, b - 300, 60);
    },
  }),
  trabzon: city({
    seed: 101, pal: { sky: ["#0e1e24", "#2a5048", "#8aa08a", "#e0d8b0"], sun: { x: .55, y: .6, col: "#fff0c0" }, far: ["#2a4a40", "#16302a"], haze: "#d0e0d0", cloud: ["#e0ece0", "#8ab0a0", "#4a6a6a"], splash: ["#1a8a5a", "#d0b060", "#2a5a7a"], tree: "#08140f", neon: "#60ffa0" },
    far(P, x, b) { P.ridge(x - 1250, x + 1250, b, 320, "#2c4c44", { shape: (v) => .5 + .5 * Math.sin(v * 4 + 1) }); P.band(x - 1250, x + 1250, b - 160, 90, "#e0ece4", { alpha: .06 }); },
    skyline(P, x, b) {
      const K = P.K, R = rng(9);
      const sm = K.cliffMonastery(x - 100, b, 1.1);
      P.mass(sm.cliff, 0, { col: "#4a4a48", rim: 0, pools: 7 });
      P.many(sm.bld, .85, { col: "#e8dcc4" }).lights(sm.win, 4); sm.bld.forEach(bb => P.gold(bb, b));
      for (let i = 0; i < 40; i++) { const tx = x - 1200 + i * 62 + R() * 20; if (Math.abs(tx - x + 100) < 260) continue; P.wash(K.cypress(tx, b, lerp(80, 170, R()), 30), "#10281e", { layers: 8, alpha: .12, spread: .2, depth: 1 }); }
      P.band(x - 1200, x + 1200, b - 40, 70, "#dfeee6", { alpha: .07 });
      P.halo(x - 60, b - 520, 50);
    },
  }),
  erzurum: city({
    seed: 113, pal: { sky: ["#0a1430", "#2a4a7a", "#8aa0c8", "#e0e8f0"], sun: { x: .3, y: .6, col: "#e8f0ff" }, far: ["#5a6a8a", "#2a3450"], haze: "#d8e4f4", cloud: ["#e8f0ff", "#8aa0c8", "#4a5a8a"], splash: ["#3a6ad0", "#b0d0f0", "#8a3a6a"], neon: "#7ac8ff", path: "#d8dce8", ground: ["#3a4058", "#141826"] },
    far(P, x, b) { peak(P, x - 500, b, 1300, 380, "#4a5a7a", "#f4f8ff", 8); peak(P, x + 500, b, 1500, 320, "#44546e", "#eef4ff", 9); },
    skyline(P, x, b) {
      const K = P.K;
      houses(P, x - 1150, x + 1150, b, 50, 18, .5);
      const por = [K.rect(x, b, 220, 150), K.arch(x, b - 30, 90, 110, 14)]; P.mass(por[0], .55, { col: "#a07a60" }).mass(por[1], .3).gold(por[0], b);
      for (const dx of [-90, 90]) { const m = [K.rect(x + dx, b - 150, 28, 160), K.cone(x + dx, b - 310, 30, 34)]; P.many(m, .35, { col: "#8a5a4a" }).neon(m[0], b - 150, P.pal.neon, 1); }
      for (const dx of [-460, 380]) { const k = [K.rect(x + dx, b, 70, 60), K.cone(x + dx, b - 60, 76, 60)]; P.many(k, .6); }
      P.halo(x, b - 400, 50);
    },
  }),
  kars: city({
    seed: 127, pal: { sky: ["#1a1030", "#4a3a6a", "#b090b0", "#f0e0e8"], sun: { x: .7, y: .7, col: "#ffe8f0" }, far: ["#7a6a8a", "#3a3050"], haze: "#e8d8e8", cloud: ["#f0e0f0", "#a090c0", "#5a4a7a"], splash: ["#8a4ab0", "#e0c0e0", "#3a5aa0"], neon: "#c07aff", path: "#e0dce8", ground: ["#3a3048", "#141020"] },
    far(P, x, b) { P.ridge(x - 1250, x + 1250, b, 100, "#5a4a6a"); },
    skyline(P, x, b) {
      const K = P.K;
      const hill = K.ridge(x + 100, x + 900, b, 160, 3, (v) => Math.sin(Math.PI * v) ** .6); P.mass(hill, 0, { col: "#4a3a50", rim: 0 });
      const cas = K.castle(x + 300, x + 720, b - 150, 50, 9); P.mass(cas, .45).gold(cas, b - 150);
      houses(P, x - 1150, x + 1150, b, 45, 19, .55);
      const ani = [K.rect(x - 500, b, 150, 110), K.rect(x - 500, b - 110, 60, 50), K.cone(x - 500, b - 160, 80, 60)]; P.many(ani, .55, { col: "#9a6a5a" }).gold(ani[2], b - 160);
      const br = [K.arch(x - 120, b + 10, 70, 50, 10), K.arch(x - 50, b + 10, 70, 50, 10), K.arch(x + 20, b + 10, 70, 50, 10)]; P.many(br, .5);
      P.halo(x - 500, b - 300, 44);
    },
  }),
  van: city({
    seed: 131, pal: { sky: ["#0a1a3a", "#1a5a8a", "#80b0c0", "#f0e0c0"], sun: { x: .25, y: .7, col: "#fff0d0" }, water: ["#1a6a8a", "#082030", "#a0f0ff"], far: ["#5a6a8a", "#2a3a5a"], cloud: ["#e0f0ff", "#70a0c0", "#3a5a8a"], splash: ["#10a0c0", "#f0d080", "#3a3aa0"], neon: "#40e8ff" },
    far(P, x, b) { peak(P, x + 600, b, 900, 380, "#4a5a7a", "#f4f8ff", 12); P.ridge(x - 1250, x + 1250, b, 90, "#3a4a6a"); },
    skyline(P, x, b) {
      const K = P.K;
      const rock = [[x - 1150, b + 10], [x - 1100, b - 80], [x - 900, b - 110], [x - 700, b - 96], [x - 600, b - 40], [x - 560, b + 10]];
      P.mass(rock, 0, { col: "#6a5a5a", rim: 0 }); const fw = K.castle(x - 1080, x - 640, b - 96, 26, 11); P.mass(fw, .5).gold(fw, b - 96);
      const isl = K.ridge(x - 80, x + 320, b, 40, 4); P.wash(isl, "#3a3a3a", { layers: 10, alpha: .12, spread: .08, depth: 1 });
      const ak = [K.rect(x + 120, b - 26, 90, 60), K.rect(x + 120, b - 86, 46, 40), K.cone(x + 120, b - 126, 60, 50)]; P.many(ak, .7, { col: "#c8a080" }).gold(ak[2], b - 126);
      P.lights([[x + 100, b - 50], [x + 140, b - 50]], 4);
      P.halo(x + 120, b - 260, 48);
    },
  }),
  gaziantep: city({
    seed: 149, pal: { sky: ["#2a1020", "#7a3a2a", "#e0904a", "#ffd890"], sun: { x: .6, y: .8, col: "#ffb860", disc: "#fff0c8" }, far: ["#8a5a4a", "#4a2a26"], haze: "#ffc890", cloud: ["#ffd0a0", "#c07050", "#7a3a3a"], splash: ["#c0402a", "#ffb040", "#6a8a2a"], stone: "#d8a878", neon: "#ffb040" },
    far(P, x, b) { P.ridge(x - 1250, x + 1250, b, 80, "#7a4a3a"); },
    skyline(P, x, b) {
      const K = P.K;
      houses(P, x - 1150, x + 1150, b, 55, 21, .4);
      const mound = [[x - 340, b + 10], [x - 240, b - 120], [x + 240, b - 130], [x + 340, b + 10]]; P.mass(mound, 0, { col: "#7a5040", rim: 0 });
      const cas = K.castle(x - 230, x + 230, b - 125, 60, 13); P.mass(cas, .55).gold(cas, b - 125);
      for (const dx of [-700, -560, 520, 680]) { const d = K.dome(x + dx, b - 40, 40, { drum: 10 }); P.mass(K.rect(x + dx, b, 90, 40), .5).mass(d, .6).neon(d, b - 40, P.pal.neon, 1); }
      [K.minaret(x - 620, b, 200, 12), K.minaret(x + 600, b, 210, 12)].forEach(m => P.mass(m, .55).gold(m, b));
      P.halo(x, b - 330, 54);
    },
  }),
  balikesir: city({
    seed: 131, pal: { sky: ["#1a1438", "#5a3460", "#d0805a", "#f6c890"], sun: { x: .35, y: .78, col: "#ffc880", disc: "#fff0d0" }, far: ["#5a4a5e", "#2e2436"], haze: "#e0c8b8", cloud: ["#f0c0a0", "#a0708a", "#5a3a6a"], splash: ["#c0503a", "#e0b050", "#4a5a8a"], neon: "#ffb05a" },
    far(P, x, b) { P.ridge(x - 1250, x + 1250, b, 90, "#4a3a50", { shape: (v) => .4 + .6 * Math.sin(v * 2.4 + .3) ** 2 }); },
    skyline(P, x, b) {
      const K = P.K;
      houses(P, x - 1150, x + 1150, b, 50, 13, .4);
      // the Clock Tower (Saat Kulesi), the heart of the city
      const st = K.tower(x - 60, b, 58, 250, "clock"); P.mass(st, .55, { col: "#c8a888" }).gold(st, b, 1.2).lights(K.windowsIn(x - 60, b - 60, 30, 150, 1, 4, 3, .8), 3);
      // Zağanos Paşa Mosque: one dome, two minarets
      const zm = [K.rect(x + 420, b, 240, 70), K.dome(x + 420, b - 70, 74, { drum: 14, finial: 12 })]; P.many(zm, .5).gold(zm[1], b - 70, .9);
      [K.minaret(x + 270, b, 250, 12), K.minaret(x + 570, b, 250, 12)].forEach(m => P.mass(m, .55).neon(m, b, P.pal.neon, 1));
      for (let i = 0; i < 8; i++) P.wash(K.tree(x - 900 + i * 70, b, 60 + (i % 3) * 18, 50, i), "#1e2a1c", { layers: 9, alpha: .1, spread: .25, depth: 1 });
      P.halo(x - 60, b - 420, 46);
    },
  }),
  giresun: city({
    seed: 137, pal: { sky: ["#0e1c2c", "#28485a", "#9a8a7a", "#ecd0a0"], sun: { x: .7, y: .74, col: "#ffe0a8", disc: "#fff4d8" }, water: ["#16304a", "#06101c", "#f0c080"], far: ["#2a4a44", "#142a26"], haze: "#c8dcd0", cloud: ["#e0e8e0", "#8aa8a8", "#4a6a7a"], splash: ["#1a7a5a", "#d0a060", "#2a4a8a"], tree: "#08140f", neon: "#70ffb8" },
    far(P, x, b) {
      P.ridge(x - 1250, x + 1250, b, 300, "#2a4a40", { shape: (v) => .5 + .5 * Math.sin(v * 3.6 + .8) });
      // Giresun Island, out in the sea: a low green mound
      const isl = P.K.ridge(x + 560, x + 860, b + 30, 60, 5, (v) => Math.sin(Math.PI * v) ** .7); P.mass(isl, 0, { col: "#1e3a30", rim: 0 });
    },
    skyline(P, x, b) {
      const K = P.K, R = rng(13);
      // the castle hill over the town
      const hill = K.ridge(x - 700, x + 100, b, 220, 7, (v) => Math.sin(Math.PI * v) ** .6); P.mass(hill, 0, { col: "#24402e", rim: 0 });
      const cas = K.castle(x - 480, x - 140, b - 210, 60, 11); P.mass(cas, .45, { col: "#8a7a68" }).gold(cas, b - 210);
      houses(P, x - 1150, x + 400, b, 45, 17, .45);
      // hazelnut groves on the slopes
      for (let i = 0; i < 26; i++) { const tx = x - 1200 + i * 90 + R() * 30; if (tx > x - 760 && tx < x + 120) continue; P.wash(K.tree(tx, b, lerp(50, 90, R()), 60, i), "#10281e", { layers: 8, alpha: .12, spread: .25, depth: 1 }); }
      P.halo(x - 310, b - 420, 46);
    },
  }),
  savastepe: city({
    seed: 163, pal: { sky: ["#3a2050", "#b06a7a", "#ffb07a", "#fff0c0"], sun: { x: .5, y: .82, col: "#ffd890", disc: "#fff6dc" }, far: ["#7a7a5a", "#4a4a34"], haze: "#ffe0b0", cloud: ["#ffe8c8", "#e0a0a0", "#a07aa0"], splash: ["#e05a5a", "#ffc860", "#6a8a4a"], tree: "#14160c", neon: "#ffd070" },
    far(P, x, b) { P.ridge(x - 1250, x + 1250, b, 130, "#6a6a4a", { shape: (v) => .5 + .5 * Math.sin(v * 6) }); },
    skyline(P, x, b) {
      const K = P.K, R = rng(3);
      for (let i = 0; i < 30; i++) { const tx = x - 1200 + i * 82 + R() * 30; if (Math.abs(tx - x) < 260) continue; P.wash(K.tree(tx, b, lerp(40, 70, R()), lerp(44, 70, R()), i), "#3a4a2a", { layers: 8, alpha: .12, spread: .3, depth: 1 }); }
      houses(P, x - 240, x + 240, b, 50, 25, .55);
      const cami = [K.rect(x - 60, b, 90, 50), K.dome(x - 60, b - 50, 36, { drum: 8 })]; P.many(cami, .8).gold(cami[1], b - 50);
      const m = K.minaret(x + 10, b, 160, 11); P.mass(m, .8).gold(m, b);
      const home = [K.rect(x + 170, b, 80, 50), [[x + 125, b - 50], [x + 170, b - 80], [x + 215, b - 50]]]; P.many(home, .7, { col: "#e0c0a0" }).lights([[x + 170, b - 24]], 9, "#ffd890");
      P.glow(x + 170, b - 24, 60, "#ffcf80", .5);
      P.halo(x + 170, b - 160, 44);
    },
  }),
};
