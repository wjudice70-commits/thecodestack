/* City films: one painter per stop of the journey, and four milestone films for the recovery stages.
   Places, light and objects only, never people. Same stage and light language as story.js:
   full-frame backgrounds first (they must cover any aspect ratio), props on the 1000×1000 stage. */
(() => {
  "use strict";
  const { lerp, clamp, rng, noise, rgba, mix, smooth, DPR } = YY;
  const P = YY.paint;
  const C = (YY.cityScenes = {});
  const G = (YY.stageScenes = {});
  const PI = Math.PI;

  /* ---------------- shared kit ---------------- */

  // The part of the stage that is on screen, in stage units, so wide props can reach the frame edges.
  const view = (x) => ({ l: -x.cx / x.k - 10, r: (x.W - x.cx) / x.k + 10, t: -x.cy / x.k - 10, b: (x.H - x.cy) / x.k + 10 });

  // Full-frame sky down to a horizon given in stage y. Returns the horizon in screen pixels.
  function sky(x, hz, stops) {
    const { c, W } = x; x.full();
    const y = Math.max(2, x.sy(hz));
    c.fillStyle = P.vgrad(c, 0, 0, 0, y, stops); c.fillRect(0, 0, W, y + 2);
    return y;
  }
  // Full-frame fill from a stage y to the bottom of the screen (water, fields, floors).
  function below(x, y0, stops) {
    const { c, W, H } = x; x.full();
    const y = Math.max(0, x.sy(y0)); if (y >= H) return;
    c.fillStyle = P.vgrad(c, 0, y, 0, H, stops); c.fillRect(0, y, W, H - y);
  }
  // A soft horizontal band of haze or mist across the whole frame.
  function haze(x, y, h, col, a) {
    const { c, W } = x; x.full();
    const y0 = x.sy(y - h), y1 = x.sy(y + h);
    c.fillStyle = P.vgrad(c, 0, y0, 0, y1, [[0, rgba(col, 0)], [.5, rgba(col, a)], [1, rgba(col, 0)]]);
    c.fillRect(0, y0, W, y1 - y0);
  }
  const ridge = (x, y, amp, seed, col, freq = 3) => { x.full(); P.ridge(x.c, x.W, x.sy(y), amp * x.k, seed, col, freq); };

  // Hill and mountain profiles in stage units: [[x, y], ...]. shape(v, X) gives the height envelope 0..1.
  function profile(seed, x0, x1, base, h, shape, n = 56, rough = .15) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const v = i / n, X = lerp(x0, x1, v);
      const r = noise(v * 7 + seed) * .7 + noise(v * 23 + seed * 3) * .3;
      pts.push([X, base - h * shape(v, X) * (1 - rough + rough * 2 * r)]);
    }
    return pts;
  }
  // The same, with a serrated top of spruce tips (Black Sea forests).
  function forest(seed, x0, x1, base, h, shape, step = 9, tip = 16) {
    const pts = [], R = rng(seed);
    for (let X = x0; X <= x1 + step; X += step * lerp(.7, 1.5, R())) {
      const v = (X - x0) / (x1 - x0), y = base - h * shape(v, X) * (.85 + .3 * noise(v * 8 + seed)), th = tip * (.3 + 1.1 * R() * R() + .3 * noise(v * 30));
      pts.push([X, y + 3]); pts.push([X + step * .25, y - th * .5]); pts.push([X + step * .5, y - th]); pts.push([X + step * .75, y - th * .5]);
    }
    return pts;
  }
  function fillProfile(c, pts, base, style) {
    c.fillStyle = style; c.beginPath(); c.moveTo(pts[0][0], base);
    for (const p of pts) c.lineTo(p[0], p[1]);
    c.lineTo(pts[pts.length - 1][0], base); c.closePath(); c.fill();
  }
  function rimProfile(c, pts, col, w) {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath();
    pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
  }
  const yAt = (pts, X) => {
    for (let i = 1; i < pts.length; i++) if (pts[i][0] >= X) { const a = pts[i - 1], b = pts[i]; return lerp(a[1], b[1], (X - a[0]) / (b[0] - a[0] || 1)); }
    return pts[pts.length - 1][1];
  };
  // A snow-capped massif: body, then a snowfield with a ragged lower edge.
  function mountain(c, pts, base, body, snow, snowY, seed, jag = 70) {
    fillProfile(c, pts, base, body);
    c.fillStyle = snow; c.beginPath();
    pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i], j = (noise(i * .38 + seed) - .5) * jag * 1.4 + (noise(i * 1.3 + seed * 2) - .5) * jag * .5;
      c.lineTo(p[0], Math.max(p[1], snowY + j));
    }
    c.closePath(); c.fill();
  }

  // Shadowed ridges running down and outward from the crest, so a massif reads as rock and not a cut-out.
  function facets(c, pts, base, peakX, col, step = 5, len = 260, seed = 1) {
    c.save(); c.beginPath(); c.moveTo(pts[0][0], base); for (const p of pts) c.lineTo(p[0], p[1]); c.lineTo(pts[pts.length - 1][0], base); c.closePath(); c.clip();
    c.fillStyle = col; c.beginPath();
    for (let i = 2; i < pts.length - 2; i += step) {
      const p = pts[i], d = Math.sign(p[0] - peakX) || 1, L = len * (.6 + .8 * noise(i * .7 + seed)), sk = .35 + .4 * noise(i * 1.3 + seed);
      c.moveTo(p[0], p[1] - 2); c.quadraticCurveTo(p[0] + d * L * sk * .4, p[1] + L * .5, p[0] + d * L * sk, p[1] + L);
      c.lineTo(p[0] + d * L * sk + d * 26, p[1] + L); c.quadraticCurveTo(p[0] + d * L * sk * .5 + d * 18, p[1] + L * .4, p[0] + d * 14, p[1] - 2);
    }
    c.fill(); c.restore();
  }

  // Lit windows scattered over a hillside; `frac` switches them on one by one.
  function windowSet(seed, n, pts, base, sz = [3, 6]) {
    const R = rng(seed), x0 = pts[0][0], x1 = pts[pts.length - 1][0];
    return Array.from({ length: n }, () => {
      const X = lerp(x0, x1, R()), top = yAt(pts, X);
      return { x: X, y: lerp(top + 8, base - 4, Math.pow(R(), .8)), w: lerp(sz[0], sz[1], R()), on: R() };
    });
  }
  function windows(c, set, col, a, frac = 1) {
    c.fillStyle = rgba(col, a); c.beginPath();
    for (const w of set) if (w.on < frac) c.rect(w.x, w.y, w.w, w.w * 1.3);
    c.fill();
  }

  // Glints on water, batched into one path.
  function shimmerSet(seed, n, box) {
    const R = rng(seed);
    return Array.from({ length: n }, () => { const d = Math.pow(R(), 1.7); return { x: lerp(box[0], box[2], R()), y: lerp(box[1], box[3], d), d, w: lerp(8, 50, R()), ph: R() * 6.28, sp: lerp(.6, 1.7, R()) }; });
  }
  function shimmer(c, set, t, col, a) {
    c.fillStyle = rgba(col, a); c.beginPath();
    for (const s of set) {
      const v = Math.sin(t * s.sp + s.ph); if (v < .15) continue;
      c.rect(s.x + Math.sin(t * .35 + s.ph) * 10, s.y, s.w * v * (.4 + s.d * 1.4), 1 + s.d * 3);
    }
    c.fill();
  }
  // Sun-glitter: tiny bright crosses that blink.
  function sparkle(c, set, t, col, a) {
    c.fillStyle = rgba(col, a); c.beginPath();
    for (const s of set) {
      const v = Math.sin(t * s.sp * 3 + s.ph); if (v < .7) continue;
      const r = (1 + s.d * 4) * (v - .6) * 2.5;
      c.rect(s.x - r * 2, s.y - .6, r * 4, 1.2); c.rect(s.x - .6, s.y - r, 1.2, r * 2);
    }
    c.fill();
  }

  // A gull, two flexing curves. Caller sets stroke.
  function gull(c, X, Y, s, t, ph) {
    const f = Math.sin(t * 3.4 + ph);
    c.beginPath();
    c.moveTo(X - 17 * s, Y - 2 * s + f * 6 * s); c.quadraticCurveTo(X - 7 * s, Y - 10 * s - f * 3 * s, X, Y);
    c.quadraticCurveTo(X + 7 * s, Y - 10 * s - f * 3 * s, X + 17 * s, Y - 2 * s + f * 6 * s);
    c.stroke();
  }
  function gullsSet(seed, n, y0, y1) { const R = rng(seed); return Array.from({ length: n }, () => ({ x: R(), y: lerp(y0, y1, R()), s: lerp(.6, 1.4, R()), sp: lerp(8, 20, R()), ph: R() * 6 })); }
  function gulls(c, set, V, t, col) {
    c.strokeStyle = col; c.lineCap = "round";
    for (const g of set) {
      const span = V.r - V.l + 200, X = V.l - 100 + ((g.x * span + t * g.sp) % span);
      c.lineWidth = 2.6 * g.s; gull(c, X, g.y + Math.sin(t * .5 + g.ph) * 10, g.s, t, g.ph);
    }
  }

  // Soft shafts of light, additive.
  function rays(c, X, Y, n, len, spread, ang, col, a, t, seed = 1) {
    const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const v = n === 1 ? .5 : i / (n - 1), aa = ang + (v - .5) * spread + Math.sin(t * .13 + i * 1.7 + seed) * .025;
      const w = .018 + .03 * noise(i * 3.1 + seed), al = a * (.45 + .55 * noise(t * .25 + i * 2.3 + seed));
      const g = c.createLinearGradient(X, Y, X + Math.cos(aa) * len, Y + Math.sin(aa) * len);
      g.addColorStop(0, rgba(col, al)); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(X, Y);
      c.lineTo(X + Math.cos(aa - w) * len, Y + Math.sin(aa - w) * len); c.lineTo(X + Math.cos(aa + w) * len, Y + Math.sin(aa + w) * len);
      c.closePath(); c.fill();
    }
    c.globalCompositeOperation = op;
  }
  // Dust in a light beam, batched.
  function motesSet(seed, n, box) { const R = rng(seed); return Array.from({ length: n }, () => ({ x: lerp(box[0], box[2], R()), y: lerp(box[1], box[3], R()), r: lerp(.8, 2.6, R()), ph: R() * 6.28, sp: lerp(.2, .6, R()) })); }
  function motes(c, set, t, col, a, box) {
    const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
    c.fillStyle = rgba(col, a); c.beginPath();
    for (const d of set) {
      if (Math.sin(t * d.sp * 2 + d.ph) < -.3) continue;
      const X = d.x + Math.sin(t * d.sp + d.ph) * 18, Y = box ? box[1] + ((d.y - box[1] - t * 6 * d.sp) % (box[3] - box[1]) + (box[3] - box[1])) % (box[3] - box[1]) : d.y;
      c.moveTo(X + d.r, Y); c.arc(X, Y, d.r, 0, 7);
    }
    c.fill(); c.globalCompositeOperation = op;
  }

  /* ---------- architecture ---------- */

  // A pointed arch, added to the current path (x = centre, y = sill).
  function archPath(c, X, Y, w, h) {
    const r = w / 2;
    c.moveTo(X - r, Y); c.lineTo(X - r, Y - h + r);
    c.quadraticCurveTo(X - r, Y - h + r * .1, X, Y - h); c.quadraticCurveTo(X + r, Y - h + r * .1, X + r, Y - h + r);
    c.lineTo(X + r, Y); c.closePath();
  }
  // A dome on its drum with its alem; optional rim light on one shoulder.
  function dome(c, X, Y, r, col, drum = .25, rim, side = -1) {
    const top = Y - r * drum;
    c.fillStyle = col; c.beginPath();
    c.rect(X - r * 1.04, top, r * 2.08, r * drum + .5);
    c.moveTo(X + r, top); c.arc(X, top, r, 0, PI, true); c.fill();
    c.fillRect(X - Math.max(.7, r * .025), top - r * 1.3, Math.max(1.4, r * .05), r * .32);
    c.beginPath(); c.arc(X, top - r * 1.32, Math.max(1.2, r * .05), 0, 7); c.fill();
    if (rim) {
      c.strokeStyle = rim; c.lineWidth = Math.max(1.2, r * .045); c.beginPath();
      side < 0 ? c.arc(X, top, r * .98, -PI * .97, -PI * .5) : c.arc(X, top, r * .98, -PI * .5, -PI * .03); c.stroke();
    }
  }
  // An Ottoman minaret: pedestal, tapering shaft, şerefe balconies on corbels, lead cone and alem.
  function minaret(c, X, base, h, w, col, n = 2, rim, lights = 0) {
    const top = base - h;
    c.fillStyle = col; c.beginPath();
    c.rect(X - w * .8, base - h * .14, w * 1.6, h * .14);
    c.moveTo(X - w * .52, base - h * .14); c.lineTo(X - w * .42, top); c.lineTo(X + w * .42, top); c.lineTo(X + w * .52, base - h * .14); c.closePath();
    c.moveTo(X - w * .5, top + 1); c.lineTo(X, top - w * 3.9); c.lineTo(X + w * .5, top + 1); c.closePath();
    const by = [];
    for (let i = 0; i < n; i++) {
      const y = base - h * (n === 1 ? .8 : lerp(.56, .86, i / (n - 1))); by.push(y);
      c.rect(X - w * .95, y - w * .26, w * 1.9, w * .26);
      c.moveTo(X - w * .95, y); c.lineTo(X + w * .95, y); c.lineTo(X + w * .46, y + w * .6); c.lineTo(X - w * .46, y + w * .6); c.closePath();
    }
    c.fill();
    c.fillRect(X - Math.max(.6, w * .05), top - w * 4.9, Math.max(1.2, w * .1), w * 1.05);
    if (rim) { c.fillStyle = rim; c.fillRect(X - w * .44, top + 2, Math.max(1, w * .12), h * .84); }
    if (lights > 0) {   // the balcony lamps lit at dusk
      c.fillStyle = rgba("#ffd59a", lights); c.beginPath();
      for (const y of by) c.rect(X - w * .9, y - w * .34, w * 1.8, Math.max(1.2, w * .1));
      c.fill();
      for (const y of by) P.glow(c, X, y - w * .3, w * 3.2, "#ffb35a", .22 * lights);
    }
  }
  // An imperial mosque: cascading half domes to a great dome, corner turrets, minarets.
  function mosque(c, X, base, s, col, o = {}) {
    const lit = o.lit || 0;
    c.fillStyle = col; c.beginPath();
    c.rect(X - 245 * s, base - 70 * s, 490 * s, 70 * s);
    c.rect(X - 175 * s, base - 122 * s, 350 * s, 54 * s);
    c.rect(X - 100 * s, base - 152 * s, 200 * s, 32 * s);
    c.fill();
    for (const dx of [-212, -160, 160, 212]) dome(c, X + dx * s, base - 70 * s, 22 * s, col, .15);
    for (const dx of [-112, 112]) {
      c.beginPath(); c.moveTo(X + dx * s + 64 * s, base - 122 * s); c.arc(X + dx * s, base - 122 * s, 64 * s, 0, PI, true); c.fill();
      dome(c, X + dx * s * 1.52, base - 122 * s, 18 * s, col, .1);
    }
    for (const dx of [-96, 96]) {
      c.fillRect(X + dx * s - 8 * s, base - 192 * s, 16 * s, 70 * s);
      c.beginPath(); c.moveTo(X + dx * s - 10 * s, base - 192 * s); c.lineTo(X + dx * s, base - 214 * s); c.lineTo(X + dx * s + 10 * s, base - 192 * s); c.fill();
    }
    dome(c, X, base - 150 * s, 96 * s, col, .28, o.rim, o.side || -1);
    if (lit > 0) {
      c.fillStyle = rgba("#ffcf8a", lit); c.beginPath();
      for (let i = -4; i <= 4; i++) archPath(c, X + i * 19 * s, base - 153 * s, 7 * s, 17 * s);
      for (let i = -9; i <= 9; i++) archPath(c, X + i * 24 * s, base - 14 * s, 8 * s, 26 * s);
      c.fill();
      P.glow(c, X, base - 160 * s, 160 * s, "#ffb35a", .18 * lit);
    }
    for (const [dx, h, n] of o.minarets || [[-260, 300, 3], [260, 300, 3]]) minaret(c, X + dx * s, base, h * s, 14 * s, col, n, null, o.lights || 0);
  }
  function cypress(c, X, base, h, w, col) {
    c.fillStyle = col; c.beginPath(); c.moveTo(X, base - h);
    c.bezierCurveTo(X + w * .55, base - h * .75, X + w * .62, base - h * .25, X + w * .2, base);
    c.lineTo(X - w * .2, base);
    c.bezierCurveTo(X - w * .62, base - h * .25, X - w * .55, base - h * .75, X, base - h); c.fill();
  }
  // A fan palm silhouette with drooping fronds and leaflets, swaying.
  function palm(c, X, base, h, s, t, ph, col) {
    const sway = Math.sin(t * .55 + ph) * 7 * s + Math.sin(t * 1.6 + ph) * 2 * s;
    const tx = X + h * .1 + sway, ty = base - h;
    c.fillStyle = col; c.beginPath();
    c.moveTo(X - 10 * s, base); c.quadraticCurveTo(X + h * .0, base - h * .5, tx - 4 * s, ty);
    c.lineTo(tx + 4 * s, ty); c.quadraticCurveTo(X + h * .05 + 9 * s, base - h * .5, X + 10 * s, base); c.fill();
    const fr = [];
    c.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = -PI / 2 + (i / 11 - .5) * PI * 1.75 + Math.sin(t * .9 + ph + i) * .05, L = (78 + 26 * ((i * 7) % 3) / 2) * s;
      const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * .5 + L * .5 * Math.cos(a) * Math.cos(a);
      const mx = tx + Math.cos(a) * L * .55, my = ty + Math.sin(a) * L * .5 - 16 * s;
      c.moveTo(tx, ty); c.quadraticCurveTo(mx, my - 5 * s, ex, ey); c.quadraticCurveTo(mx, my + 5 * s, tx, ty);
      fr.push([tx, ty, mx, my, ex, ey, a]);
    }
    c.fill();
    c.strokeStyle = col; c.lineWidth = 1.6 * s; c.beginPath();
    for (const [x0, y0, mx, my, ex, ey, a] of fr) for (let j = 3; j <= 9; j++) {
      const v = j / 10, px = (1 - v) * (1 - v) * x0 + 2 * (1 - v) * v * mx + v * v * ex, py = (1 - v) * (1 - v) * y0 + 2 * (1 - v) * v * my + v * v * ey;
      c.moveTo(px, py); c.lineTo(px + Math.cos(a) * 8 * s, py + 12 * s * (1 - v * .4));
    }
    c.stroke();
  }
  // An old olive tree: twisted trunk, clumped silver-green canopy.
  function oliveSet(seed, n = 14) { const R = rng(seed); return Array.from({ length: Math.round(n * 1.7) }, () => { const a = R() * 6.28, r = Math.sqrt(R()); return { x: Math.cos(a) * r * 100, y: Math.sin(a) * r * 50 - (1 - r) * 12, rx: lerp(16, 34, R()), ry: lerp(10, 20, R()), ph: R() * 6 }; }).sort((a, b) => a.y - b.y); }
  function olive(c, X, base, s, set, t, cols, sun = 1) {
    c.fillStyle = cols[0]; c.beginPath();
    c.moveTo(X - 22 * s, base);
    c.bezierCurveTo(X - 6 * s, base - 30 * s, X - 30 * s, base - 64 * s, X - 40 * s, base - 104 * s);
    c.lineTo(X - 28 * s, base - 108 * s);
    c.bezierCurveTo(X - 16 * s, base - 76 * s, X - 4 * s, base - 70 * s, X, base - 76 * s);
    c.bezierCurveTo(X + 8 * s, base - 84 * s, X + 16 * s, base - 100 * s, X + 22 * s, base - 116 * s);
    c.lineTo(X + 34 * s, base - 110 * s);
    c.bezierCurveTo(X + 20 * s, base - 74 * s, X + 8 * s, base - 40 * s, X + 24 * s, base);
    c.closePath(); c.fill();
    const cy = base - 140 * s, sw = Math.sin(t * .7 + X * .01) * 2 * s;
    c.fillStyle = cols[1]; c.beginPath();
    for (const k of set) { const ex = X + k.x * s + sw, ey = cy + k.y * s; c.moveTo(ex + k.rx * s, ey); c.ellipse(ex, ey, k.rx * s, k.ry * s, 0, 0, 7); }
    c.fill();
    c.fillStyle = cols[2]; c.beginPath();
    for (const k of set) { const ex = X + k.x * s + sw * 1.4 + sun * k.rx * .25 * s, ey = cy + k.y * s - k.ry * .35 * s; c.moveTo(ex + k.rx * .62 * s, ey); c.ellipse(ex, ey, k.rx * .62 * s, k.ry * .5 * s, 0, 0, 7); }
    c.fill();
    if (cols[4]) {   // backlit rims along the tops of the clumps
      c.strokeStyle = cols[4]; c.lineWidth = 1.4 * s; c.beginPath();
      for (const k of set) if (k.y < 8) { const ex = X + k.x * s + sw, ey = cy + k.y * s; c.moveTo(ex - k.rx * .8 * s, ey - k.ry * .55 * s); c.ellipse(ex, ey, k.rx * s, k.ry * s, 0, PI * 1.2, PI * 1.65); }
      c.stroke();
    }
    if (cols[3]) {   // silver undersides of leaves flashing in the breeze
      c.fillStyle = cols[3]; c.beginPath();
      for (const k of set) if (Math.sin(t * 1.3 + k.ph) > .4) { const ex = X + k.x * s + sw * 1.6 + sun * k.rx * .4 * s, ey = cy + k.y * s - k.ry * .5 * s; c.rect(ex, ey, 3 * s, 1.6 * s); c.rect(ex - 9 * s, ey + 5 * s, 2.5 * s, 1.4 * s); }
      c.fill();
    }
  }
  // A passenger ferry (vapur): dark hull, white decks, rows of lit windows, funnel.
  function ferry(c, X, Y, s, lit, hull, deck) {
    c.fillStyle = hull; c.beginPath();
    c.moveTo(X - 125 * s, Y - 24 * s); c.lineTo(X + 130 * s, Y - 24 * s); c.lineTo(X + 108 * s, Y); c.lineTo(X - 112 * s, Y); c.closePath(); c.fill();
    c.fillStyle = deck; c.fillRect(X - 98 * s, Y - 50 * s, 186 * s, 26 * s); c.fillRect(X - 70 * s, Y - 69 * s, 124 * s, 19 * s);
    c.fillStyle = rgba("#ffd08a", .92 * lit); c.beginPath();
    for (let i = 0; i < 14; i++) c.rect(X - 92 * s + i * 12.6 * s, Y - 45 * s, 7 * s, 10 * s);
    for (let i = 0; i < 9; i++) c.rect(X - 64 * s + i * 12.6 * s, Y - 65 * s, 7 * s, 9 * s);
    c.fill();
    c.fillStyle = hull; c.fillRect(X + 2 * s, Y - 96 * s, 18 * s, 27 * s); c.fillRect(X - 50 * s, Y - 104 * s, 2 * s, 36 * s);
    c.fillStyle = deck; c.fillRect(X + 2 * s, Y - 88 * s, 18 * s, 5 * s);
    c.fillStyle = rgba("#fff1d0", lit); c.fillRect(X - 51 * s, Y - 106 * s, 4 * s, 4 * s);
    P.glow(c, X - 49 * s, Y - 104 * s, 30 * s, "#ffe2b0", .5 * lit);
    P.glow(c, X, Y - 50 * s, 150 * s, "#ffb35a", .2 * lit);
  }
  // A suspension bridge far away: towers, a sagging cable strung with lights.
  function bridge(c, x0, x1, deck, th, col, lc, a) {
    c.fillStyle = col; c.fillRect(x0 - 700, deck, x1 - x0 + 1400, 4);
    for (const X of [x0, x1]) { c.fillRect(X - 3.5, deck - th, 2.4, th + 4); c.fillRect(X + 1.1, deck - th, 2.4, th + 4); c.fillRect(X - 3.5, deck - th * .55, 7, 1.6); c.fillRect(X - 3.5, deck - th, 7, 1.6); }
    c.strokeStyle = col; c.lineWidth = 1.1; c.beginPath();
    c.moveTo(x0 - 240, deck); c.quadraticCurveTo(x0 - 70, deck - th * .4, x0, deck - th);
    c.quadraticCurveTo((x0 + x1) / 2, deck + th * .9, x1, deck - th);
    c.quadraticCurveTo(x1 + 70, deck - th * .4, x1 + 240, deck); c.stroke();
    c.fillStyle = rgba(lc, a); c.beginPath();
    for (let i = 0; i <= 44; i++) {
      const v = i / 44, mx = (x0 + x1) / 2, my = deck + th * .9;
      c.rect((1 - v) * (1 - v) * x0 + 2 * (1 - v) * v * mx + v * v * x1 - 1, (1 - v) * (1 - v) * (deck - th) + 2 * (1 - v) * v * my + v * v * (deck - th) - 1, 2.2, 2.2);
    }
    for (let i = 0; i <= 60; i++) c.rect(lerp(x0 - 260, x1 + 260, i / 60) - 1, deck - 1.5, 2, 2);
    c.fill();
    P.glow(c, (x0 + x1) / 2, deck - th * .2, (x1 - x0) * .6, lc, .12 * a);
  }
  function star5(c, X, Y, r, rot) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot + i * PI / 5, rr = i % 2 ? r * .4 : r; c.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  // A waving Turkish flag hanging from (X, Y).
  function flag(c, X, Y, w, h, t, lit = 1) {
    const wave = (v) => Math.sin(v * 5.5 - t * 3) * h * .09 * v;
    const red = mix("#4a0a12", "#d81e32", lit);
    c.fillStyle = red; c.beginPath();
    for (let i = 0; i <= 16; i++) { const v = i / 16; c.lineTo(X + v * w, Y + wave(v)); }
    for (let i = 16; i >= 0; i--) { const v = i / 16; c.lineTo(X + v * w, Y + h + wave(v)); }
    c.closePath(); c.fill();
    const v = .36, fx = X + w * v, fy = Y + h / 2 + wave(v);
    c.fillStyle = mix("#3a3030", "#fff6ee", lit); c.beginPath(); c.arc(fx, fy, h * .25, 0, 7); c.fill();
    c.fillStyle = red; c.beginPath(); c.arc(fx + h * .0625, fy, h * .2, 0, 7); c.fill();
    c.fillStyle = mix("#3a3030", "#fff6ee", lit); star5(c, fx + h * .3, fy, h * .125, PI);
    // folds catching the light
    c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath();
    for (let i = 0; i < 16; i++) { const v = i / 16; if (Math.sin(v * 5.5 - t * 3) < .3) continue; c.rect(X + v * w, Y + wave(v), w / 16 + .5, h); }
    c.fill();
  }
  // A hot-air balloon: striped gores, sunlit roundness, basket, flickering burner.
  function balloon(c, X, Y, s, b, t, hazeCol, hazeA) {
    const R = 60 * s;
    c.save();
    c.beginPath();
    c.moveTo(X, Y - R); c.bezierCurveTo(X + R * 1.32, Y - R, X + R * 1.12, Y + R * .62, X + R * .3, Y + R * 1.12);
    c.lineTo(X - R * .3, Y + R * 1.12); c.bezierCurveTo(X - R * 1.12, Y + R * .62, X - R * 1.32, Y - R, X, Y - R);
    c.fillStyle = b.c1; c.fill(); c.clip();
    c.fillStyle = b.c2; c.beginPath();
    for (let k = -3; k <= 3; k += 2) {
      const o = k * R * .26;
      c.moveTo(X + o * .15, Y - R); c.quadraticCurveTo(X + o * 1.3, Y - R * .05, X + o * .35, Y + R * 1.15);
      c.lineTo(X + o * .35 + R * .1, Y + R * 1.15); c.quadraticCurveTo(X + o * 1.3 + R * .24, Y - R * .05, X + o * .15 + R * .04, Y - R);
    }
    c.fill();
    if (b.c3) { c.fillStyle = b.c3; c.fillRect(X - R * 1.4, Y + R * .1, R * 2.8, R * .16); }
    const g = c.createRadialGradient(X + R * .5, Y - R * .3, R * .05, X, Y, R * 1.45);
    g.addColorStop(0, "rgba(255,240,215,.5)"); g.addColorStop(.42, "rgba(255,220,180,0)"); g.addColorStop(1, "rgba(40,16,40,.6)");
    c.fillStyle = g; c.fillRect(X - R * 1.4, Y - R * 1.1, R * 2.8, R * 2.4);
    if (hazeA) { c.fillStyle = rgba(hazeCol, hazeA); c.fillRect(X - R * 1.4, Y - R * 1.1, R * 2.8, R * 2.4); }
    c.restore();
    const burn = clamp(Math.pow(noise(t * 1.1 + b.ph * 5), 3) * 2.2);
    P.glow(c, X, Y + R * 1.15, R * (.6 + .5 * burn), "#ffb04a", (.2 + .6 * burn) * (1 - (hazeA || 0)));
    c.strokeStyle = rgba("#2a1a18", .8 * (1 - (hazeA || 0) * .7)); c.lineWidth = Math.max(.7, R * .018); c.beginPath();
    c.moveTo(X - R * .28, Y + R * 1.12); c.lineTo(X - R * .14, Y + R * 1.42); c.moveTo(X + R * .28, Y + R * 1.12); c.lineTo(X + R * .14, Y + R * 1.42); c.stroke();
    c.fillStyle = mix("#3a2416", hazeCol, hazeA || 0); c.fillRect(X - R * .15, Y + R * 1.42, R * .3, R * .19);
  }
  // A fairy chimney: an eroded tuff cone with a ragged, rain-worn edge, a neck, and a tilted dark basalt cap.
  // o: { sd: seed, tl: cap tilt, win: carved openings, rim: warm rim light strength }
  function chimney(c, X, base, h, w, lit, shade, cap, o = {}) {
    const sd = o.sd || X * .013, nk = cap ? .22 : .08, N = 14;
    const hw = (v) => w * (1 - (1 - nk) * Math.pow(v, .8)) * (1 + .1 * Math.sin(v * 5 + sd));
    const ed = (v, s) => (noise(v * 9 + sd + s * 5) - .5) * w * .16 + (noise(v * 31 + sd * 2 + s) - .5) * w * .06;
    const L = [], Rr = [];
    for (let j = 0; j <= N; j++) { const v = j / N, y = base - h * v; L.push([X - hw(v) + ed(v, 0), y]); Rr.push([X + hw(v) + ed(v, 1), y]); }
    const g = c.createLinearGradient(X - w, 0, X + w, 0);
    g.addColorStop(0, shade); g.addColorStop(.45, mix(shade, lit, .5)); g.addColorStop(.8, lit); g.addColorStop(1, mix(lit, shade, .3));
    c.fillStyle = g; c.beginPath(); c.moveTo(L[0][0] - w * .1, base + 2);
    for (const p of L) c.lineTo(p[0], p[1]);
    if (!cap) c.quadraticCurveTo(X, base - h - w * .14, Rr[N][0], Rr[N][1]);
    for (let j = N; j >= 0; j--) c.lineTo(Rr[j][0], Rr[j][1]);
    c.lineTo(Rr[0][0] + w * .1, base + 2); c.closePath(); c.fill();
    // rain-cut runnels and soft horizontal tuff bands
    c.strokeStyle = rgba(mix(shade, "#000000", .3), .15); c.lineWidth = Math.max(.8, w * .03); c.beginPath();
    for (let k = 0; k < 5; k++) { const f = -.75 + k * .36; for (let j = 0; j <= 5; j++) { const v = .05 + j * .16, xx = X + f * hw(v) + Math.sin(j * 2 + k + sd) * w * .04, yy = base - h * v; j ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } }
    c.stroke();
    c.strokeStyle = rgba(lit, .3); c.lineWidth = Math.max(1, w * .04); c.beginPath();
    for (const v of [.22, .48]) { c.moveTo(X - hw(v) * .9, base - h * v); c.quadraticCurveTo(X, base - h * v + w * .07, X + hw(v) * .95, base - h * v); }
    c.stroke();
    // carved doors and windows, dark, with a lit sill
    if (o.win) {
      const R = rng((sd * 1000) | 0); c.fillStyle = rgba("#1a0c14", .85); c.beginPath(); const sills = [];
      for (let i = 0; i < o.win; i++) { const v = lerp(.12, .62, R()), ww = hw(v) * lerp(.12, .2, R()), wx = X + hw(v) * lerp(-.5, .45, R()), wy = base - h * v; archPath(c, wx, wy, ww, ww * 1.6); sills.push([wx - ww / 2, wy, ww]); }
      c.fill(); c.fillStyle = rgba(lit, .5); c.beginPath(); for (const [a, b, ww] of sills) c.rect(a, b, ww, Math.max(.8, ww * .12)); c.fill();
    }
    // the sunward edge catching dawn: an additive rim light
    const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
    c.strokeStyle = rgba("#ffb07a", .45 * (o.rim == null ? 1 : o.rim)); c.lineWidth = Math.max(1, w * .07); c.beginPath();
    for (let j = 1; j <= N; j++) j === 1 ? c.moveTo(Rr[j][0] - w * .03, Rr[j][1]) : c.lineTo(Rr[j][0] - w * .03, Rr[j][1]);
    c.stroke(); c.globalCompositeOperation = op;
    if (cap) {
      const tl = o.tl || 0, cy = base - h, cx = (L[N][0] + Rr[N][0]) / 2;
      c.save(); c.translate(cx, cy); c.rotate(tl);
      c.fillStyle = cap; c.beginPath();
      c.moveTo(-w * .5, w * .04); c.lineTo(-w * .44, -w * .1); c.quadraticCurveTo(-w * .2, -w * .36, w * .06, -w * .34); c.quadraticCurveTo(w * .4, -w * .26, w * .5, -w * .04); c.lineTo(w * .46, w * .06); c.closePath(); c.fill();
      c.globalCompositeOperation = "lighter"; c.strokeStyle = rgba("#ffc890", .55 * (o.rim == null ? 1 : o.rim)); c.lineWidth = Math.max(1, w * .045); c.beginPath();
      c.moveTo(-w * .05, -w * .35); c.quadraticCurveTo(w * .4, -w * .26, w * .5, -w * .04); c.stroke();
      c.globalCompositeOperation = op; c.restore();
    }
  }
  // A light shaft across the floor of a room, as a parallelogram.
  function beam(c, pts, col, a) {
    const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
    const g = c.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, a * .25));
    c.fillStyle = g; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill();
    c.globalCompositeOperation = op;
  }
  // Grass blades: one stroked path, swaying with the wind.
  function grassSet(seed, n, box) { const R = rng(seed); return Array.from({ length: n }, () => { const d = R(); return { x: lerp(box[0], box[2], R()), y: lerp(box[1], box[3], d), h: lerp(18, 70, d) * lerp(.6, 1.3, R()), b: (R() - .5) * .6, ph: R() * 6 }; }); }
  function grass(c, set, t, col, w, wind = 1) {
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = "round"; c.beginPath();
    for (const g of set) {
      const sw = (Math.sin(t * 1.2 + g.x * .01 + g.ph * .3) * .5 + .5) * g.h * .35 * wind + g.b * g.h;
      c.moveTo(g.x, g.y); c.quadraticCurveTo(g.x + sw * .3, g.y - g.h * .6, g.x + sw, g.y - g.h);
    }
    c.stroke();
  }
  function fliesSet(seed, n, box) { const R = rng(seed); return Array.from({ length: n }, () => ({ x: lerp(box[0], box[2], R()), y: lerp(box[1], box[3], R()), ph: R() * 6.28, sp: lerp(.3, .9, R()), on: R() })); }
  function flies(c, set, t, a, col = "#ffe08a") {
    for (const f of set) {
      const p = Math.pow(.5 + .5 * Math.sin(t * f.sp * 2.2 + f.ph), 3) * a;
      if (p < .02 || f.on > a * 1.4) continue;
      const X = f.x + Math.sin(t * f.sp * .7 + f.ph) * 40, Y = f.y + Math.cos(t * f.sp * .5 + f.ph * 2) * 24 - t * 2;
      P.glow(c, X, Y, 26, col, .55 * p);
      c.fillStyle = rgba("#fff6c8", p); c.fillRect(X - 1.6, Y - 1.6, 3.2, 3.2);
    }
  }

  /* ================= THE CITIES ================= */

  /* 1. İstanbul: the Bosphorus at dusk, domes and minarets against the last light */
  C.istanbul = (x) => {
    const { c, W, H, t, u, m } = x, hz = 60, V = view(x);
    if (!m.i) {
      m.i = 1;
      m.st = P.starSet(11, 120, .4);
      m.pen = profile(3, V.l - 40, 90, hz, 165, (v) => (1 - smooth(.62, 1, v)) * (.74 + .26 * Math.sin(v * 4 + 1)), 60, .06);
      m.gal = profile(8, 175, V.r + 40, hz, 135, (v) => smooth(0, .3, v) * (.86 + .14 * Math.sin(v * 5)), 40, .08);
      m.wp = windowSet(5, 170, m.pen, hz); m.wg = windowSet(6, 110, m.gal, hz);
      m.sh = shimmerSet(9, 130, [V.l, hz + 4, V.r, V.b]);
      const R = rng(4); m.far = Array.from({ length: 70 }, () => [lerp(V.l, V.r, R()), hz - 3 - R() * 16, R()]);
      m.gl = gullsSet(12, 6, -430, -140);
    }
    const dusk = smooth(0, 1, u), lights = .3 + .7 * smooth(.02, .65, u);
    const hy = sky(x, hz, [[0, mix("#1d2150", "#0a0c26", dusk)], [.42, mix("#503472", "#2c2252", dusk)], [.78, mix("#d2607a", "#9a4468", dusk)], [1, mix("#ffbc7a", "#f08a62", dusk)]]);
    P.stars(c, m.st, W, hy * 1.3, t, dusk * .9);
    const sunX = x.sx(132);
    P.glow(c, sunX, hy, x.S * 1.2, "#ff9a5a", .4 - dusk * .16);
    P.glow(c, sunX, hy, x.S * .28, "#ffe0b0", .4 - dusk * .2);
    // far Asian shore, softened by distance, its lights coming on
    ridge(x, hz, 42, 2.3, mix("#7a5078", "#3e2e56", dusk), 1.6);
    x.stage();
    c.fillStyle = rgba("#ffdcae", .85 * lights); c.beginPath(); for (const f of m.far) if (f[2] < lights) c.rect(f[0], f[1], 2.2, 2.2); c.fill();
    bridge(c, -150, 330, hz - 22, 74, mix("#4a3058", "#251c3a", dusk), mix("#8ab8ff", "#e89aff", .5 + .5 * Math.sin(t * .35)), lights);
    haze(x, hz - 6, 30, "#ff9a7a", .24 * (1 - dusk * .5));
    // the old city on its hill and Galata across the water
    x.stage();
    const ink = "#150e20", rim = rgba("#ffae86", .3 * (1 - dusk * .5));
    fillProfile(c, m.pen, hz + 2, ink); fillProfile(c, m.gal, hz + 2, ink);
    rimProfile(c, m.pen, rim, 2); rimProfile(c, m.gal, rim, 2);
    mosque(c, -720, yAt(m.pen, -720) + 10, .5, ink, { lit: .7 * lights, lights, minarets: [[-260, 300, 3], [260, 300, 3], [-222, 250, 2], [222, 250, 2], [-185, 205, 1], [185, 205, 1]] });
    mosque(c, -280, yAt(m.pen, -280) + 10, .62, ink, { lit: .8 * lights, rim, side: 1, lights, minarets: [[-262, 310, 3], [262, 310, 3], [-205, 235, 2], [205, 235, 2]] });
    mosque(c, -10, yAt(m.pen, -10) + 8, .26, ink, { lit: .9 * lights, minarets: [[-240, 270, 1], [240, 270, 1]] });
    windows(c, m.wp, "#ffc27a", .85, lights); windows(c, m.wg, "#ffd59a", .85, lights);
    galata(c, 370, yAt(m.gal, 370) + 8, .78, ink, lights);
    // the Bosphorus
    below(x, hz, [[0, mix("#e08a74", "#8a4a62", dusk)], [.04, mix("#5e3c62", "#3a2a4c", dusk)], [.35, "#120e22"], [1, "#04030a"]]);
    x.stage(); c.save(); c.translate(0, 2 * hz); c.scale(1, -1);
    fillProfile(c, m.pen, hz, "rgba(10,6,16,.55)"); fillProfile(c, m.gal, hz, "rgba(10,6,16,.55)"); c.restore();
    const fx = lerp(-560, 330, u), fy = hz + 190 + Math.sin(t * 1.1) * 1.5;
    x.full();
    const refl = [{ x: sunX, c: "#ffc890", a: .75 - dusk * .3, w: x.S * .07 }, { x: x.sx(370), c: "#ffb35a", a: .5 * lights, w: 10 * DPR }, { x: x.sx(fx), c: "#ffd08a", a: .5, w: 90 * x.k }];
    for (let i = 0; i < 9; i++) { const w = m.wp[i * 7]; if (w.on < lights) refl.push({ x: x.sx(w.x), c: "#ffc27a", a: .35, w: 5 * DPR }); }
    P.reflections(c, refl, x.sy(hz) + 2, H, t, W);
    x.stage();
    shimmer(c, m.sh, t, "#ffb89a", .22 * (1 - dusk * .6));
    // a ferry crossing, a wake behind her
    c.strokeStyle = "rgba(255,220,200,.18)"; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i < 4; i++) { c.moveTo(fx - 110 - i * 60, fy - 2 + i * 4); c.lineTo(fx - 160 - i * 60, fy + 2 + i * 6); } c.stroke();
    ferry(c, fx, fy, 1, lights, "#0c0a14", mix("#e6d6cc", "#7a6878", dusk));
    gulls(c, m.gl, V, t, rgba("#1a1222", .85));
  };

  // The Galata tower: stone cylinder, corbelled gallery, conical cap.
  function galata(c, X, base, s, col, lit) {
    c.fillStyle = col; c.beginPath();
    c.rect(X - 28 * s, base - 212 * s, 56 * s, 212 * s);
    c.rect(X - 35 * s, base - 248 * s, 70 * s, 36 * s);
    c.moveTo(X - 35 * s, base - 212 * s); c.lineTo(X - 28 * s, base - 200 * s); c.lineTo(X + 28 * s, base - 200 * s); c.lineTo(X + 35 * s, base - 212 * s);
    c.moveTo(X - 32 * s, base - 247 * s); c.lineTo(X, base - 336 * s); c.lineTo(X + 32 * s, base - 247 * s);
    c.fill();
    c.fillRect(X - 1, base - 356 * s, 2, 22 * s);
    c.fillStyle = rgba("#ffd08a", .92 * lit); c.beginPath();
    for (let i = -2; i <= 2; i++) archPath(c, X + i * 12.5 * s, base - 218 * s, 7 * s, 22 * s);
    for (let k = 0; k < 4; k++) archPath(c, X + (k % 2 ? 9 : -9) * s, base - (44 + k * 40) * s, 5 * s, 12 * s);
    c.fill();
    P.glow(c, X, base - 230 * s, 130 * s, "#ffb35a", .32 * lit);
  }

  /* 2. Bursa: green-tiled domes and cypresses under snowy Uludağ, evening */
  C.bursa = (x) => {
    const { c, W, H, t, u, m } = x, hz = 150, V = view(x);
    if (!m.i) {
      m.i = 1;
      m.st = P.starSet(21, 90, .35);
      m.mt = profile(14, V.l - 60, V.r + 60, hz, 470, (v, X) => .28 + .62 * Math.exp(-Math.pow((X + 70) / 420, 2)) + .16 * Math.exp(-Math.pow((X - 380) / 160, 2)) + .06 * Math.sin(X * .03), 110, .14);
      m.city = profile(5, V.l - 40, V.r + 40, hz + 70, 110, (v) => .55 + .45 * Math.sin(v * 6 + 2), 50, .2);
      m.cw = windowSet(31, 150, m.city, hz + 80, [3, 5]);
      m.ulu = rng(7);
    }
    const eve = smooth(0, 1, u);
    sky(x, hz, [[0, mix("#1a2a52", "#0e1634", eve)], [.5, mix("#5a5a8a", "#2e3462", eve)], [.85, mix("#e8a49a", "#9a6a80", eve)], [1, mix("#ffd2a8", "#c08a88", eve)]]);
    P.stars(c, m.st, W, x.sy(-100), t, eve * .8);
    // Uludağ: alpenglow on the snow, fading to blue as evening falls
    x.stage();
    const body = P.vgrad(c, 0, -360, 0, hz, [[0, mix("#5a5a7e", "#3a3e60", eve)], [1, "#2a3048"]]);
    const snow = P.vgrad(c, -520, 0, 360, 0, [[0, mix("#ffd8c8", "#a8b4d8", eve)], [.5, mix("#f2b8b8", "#8e9ac4", eve)], [1, mix("#8a8ab8", "#5a6694", eve)]]);
    mountain(c, m.mt, hz + 40, body, snow, hz - 300, 3, 80);
    facets(c, m.mt, hz + 40, -70, "rgba(30,34,70,.22)", 3, 300, 2);
    facets(c, m.mt, hz + 40, -70, "rgba(255,220,210,.08)", 7, 200, 9);
    haze(x, hz - 30, 90, mix("#e8b0a8", "#6a6a90", eve), .35);
    // the city climbing the foothills, its lights coming on
    x.stage();
    fillProfile(c, m.city, 2000, P.vgrad(c, 0, hz - 30, 0, 420, [[0, "#1e2a34"], [1, "#0c1216"]]));
    windows(c, m.cw, "#ffcf8a", .9, .3 + .7 * eve);
    // Ulu Cami: twenty small domes, two minarets
    const ux = 300, ub = hz + 70, us = .42, uc = "#1a2228";
    c.fillStyle = uc; c.fillRect(ux - 230 * us, ub - 70 * us, 460 * us, 70 * us);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) dome(c, ux + (i - 2) * 88 * us + r * 20 * us, ub - 70 * us - r * 16 * us, 38 * us * (1 - r * .1), r ? "#202a30" : uc, .2);
    minaret(c, ux - 255 * us, ub, 330 * us, 15 * us, uc, 1, null, .6 * eve); minaret(c, ux + 255 * us, ub, 330 * us, 15 * us, uc, 1, null, .6 * eve);
    haze(x, hz + 90, 50, "#7a7a9a", .25);
    // the garden: Yeşil Türbe, its green dome, cypresses
    below(x, 350, [[0, "#0e1414"], [1, "#050807"]]);
    x.stage();
    cypress(c, -420, 360, 330, 64, "#0a1210"); cypress(c, 420, 370, 360, 70, "#0a1210"); cypress(c, 470, 380, 260, 56, "#0c1412");
    const tx = -150, tb = 360;
    // octagonal walls of turquoise tile: one face toward us, two turning away
    const tile = (x0, x1, a, b) => { c.fillStyle = P.vgrad(c, x0, 0, x1, 0, [[0, a], [1, b]]); };
    tile(-260, -205, "#0a3a3a", "#127068"); c.beginPath(); c.moveTo(tx - 125, tb); c.lineTo(tx - 125, tb - 180); c.lineTo(tx - 72, tb - 192); c.lineTo(tx - 72, tb); c.fill();
    tile(tx - 72, tx + 72, "#1a8a7e", "#14706a"); c.fillRect(tx - 72, tb - 192, 144, 192);
    tile(tx + 72, tx + 125, "#0f5a54", "#06302e"); c.beginPath(); c.moveTo(tx + 72, tb); c.lineTo(tx + 72, tb - 192); c.lineTo(tx + 125, tb - 180); c.lineTo(tx + 125, tb); c.fill();
    c.strokeStyle = "rgba(160,255,230,.12)"; c.lineWidth = 1; c.beginPath();
    for (let i = 1; i < 12; i++) { c.moveTo(tx - 72, tb - i * 16); c.lineTo(tx + 72, tb - i * 16); }
    for (let i = 1; i < 9; i++) { c.moveTo(tx - 72 + i * 16, tb - 192); c.lineTo(tx - 72 + i * 16, tb); }
    c.stroke();
    c.fillStyle = "#e8d6a8"; c.fillRect(tx - 80, tb - 200, 160, 10); c.fillRect(tx - 126, tb - 186, 46, 7); c.fillRect(tx + 80, tb - 186, 46, 7);
    c.fillStyle = "#0a1a1a"; c.beginPath(); archPath(c, tx, tb, 64, 128); c.fill();
    c.fillStyle = rgba("#ffcf8a", .55 + .2 * noise(t * .8)); c.beginPath(); archPath(c, tx, tb - 30, 26, 60); c.fill();
    P.glow(c, tx, tb - 60, 120, "#ffb35a", .25);
    // the green dome
    const dy = tb - 200, dr = 112;
    c.fillStyle = "#0e3e3a"; c.fillRect(tx - dr * .9, dy - 26, dr * 1.8, 26);
    const dg = c.createRadialGradient(tx - 40, dy - 110, 8, tx, dy - 40, dr * 1.2);
    dg.addColorStop(0, mix("#9af0d4", "#5ab8b0", eve)); dg.addColorStop(.35, "#1f9a84"); dg.addColorStop(.8, "#0d5a52"); dg.addColorStop(1, "#06302c");
    c.fillStyle = dg; c.beginPath(); c.moveTo(tx + dr * .88, dy - 24); c.arc(tx, dy - 24, dr * .88, 0, PI, true); c.fill();
    c.strokeStyle = "rgba(0,40,36,.35)"; c.lineWidth = 2; c.beginPath();
    for (let i = 1; i < 8; i++) { const a = PI + i * PI / 8; c.moveTo(tx + Math.cos(a) * dr * .88, dy - 24); c.quadraticCurveTo(tx + Math.cos(a) * dr * .5, dy - 24 - dr * .7, tx, dy - 24 - dr * .88); } c.stroke();
    c.strokeStyle = rgba("#ffd2c0", .45 * (1 - eve * .6)); c.lineWidth = 3; c.beginPath(); c.arc(tx, dy - 24, dr * .87, -PI * .96, -PI * .6); c.stroke();
    c.fillStyle = "#d8b060"; c.fillRect(tx - 2, dy - 24 - dr * .88 - 34, 4, 34); c.beginPath(); c.arc(tx, dy - 24 - dr * .88 - 36, 5, 0, 7); c.fill();
    // Yeşil Cami's dome and its short green-capped minaret, to the right
    const yx = 170, yb = 380;
    c.fillStyle = P.vgrad(c, 0, yb - 140, 0, yb, [[0, "#3a3a3e"], [1, "#16181a"]]); c.fillRect(yx - 10, yb - 140, 230, 140);
    dome(c, yx + 60, yb - 140, 58, "#22282c", .18); dome(c, yx + 168, yb - 140, 48, "#22282c", .18);
    c.fillStyle = rgba("#ffcf8a", .7); c.beginPath(); for (let i = 0; i < 4; i++) archPath(c, yx + 18 + i * 52, yb - 30, 18, 46); c.fill();
    minaret(c, yx + 250, yb, 230, 18, "#1e2426", 1);
    c.fillStyle = "#1f8a7a"; c.beginPath(); c.moveTo(yx + 241, yb - 229); c.lineTo(yx + 250, yb - 298); c.lineTo(yx + 259, yb - 229); c.fill();
    cypress(c, -330, 380, 250, 52, "#081010"); cypress(c, 30, 380, 300, 56, "#081010");
    // garden lamps
    for (const lx of [-300, 60]) {
      c.fillStyle = "#060908"; c.fillRect(lx - 2, 300, 4, 90);
      P.glow(c, lx, 296, 70, "#ffc27a", .45 + .05 * Math.sin(t * 3 + lx)); c.fillStyle = "#fff0c8"; c.beginPath(); c.arc(lx, 296, 5, 0, 7); c.fill();
    }
  };

  /* 3. Çanakkale: the strait at blue hour, two shores, a ferry, a lighthouse */
  C.canakkale = (x) => {
    const { c, W, H, t, u, m } = x, hz = 40, V = view(x);
    if (!m.i) {
      m.i = 1;
      m.st = P.starSet(33, 140, .45);
      m.far = profile(6, V.l - 40, V.r + 40, hz, 95, (v, X) => .4 + .6 * Math.pow(Math.sin((X + 900) * .0021), 2), 70, .2);
      m.fw = windowSet(8, 80, m.far, hz, [2, 3]);
      m.sh = shimmerSet(14, 120, [V.l, hz + 4, V.r, V.b]);
    }
    const blue = smooth(0, 1, u), lights = .5 + .5 * smooth(0, .5, u);
    const hy = sky(x, hz, [[0, mix("#0d1838", "#070d24", blue)], [.5, mix("#2a4078", "#1a2a5a", blue)], [.86, mix("#7a7aa8", "#4a5288", blue)], [1, mix("#f0a888", "#a8788a", blue)]]);
    P.stars(c, m.st, W, hy * 1.25, t, .4 + .5 * blue);
    // a thin moon
    x.stage();
    P.glow(c, -330, -400, 160, "#c8d8ff", .2);
    c.fillStyle = "#eef0f8"; c.beginPath(); c.arc(-330, -400, 20, 0, 7); c.fill();
    c.fillStyle = mix("#1a2a5a", "#0d1838", .4); c.beginPath(); c.arc(-322, -406, 18, 0, 7); c.fill();
    // the far shore, Gallipoli: the memorial on the hill, the long bridge to the north
    bridge(c, 140, 470, hz - 40, 120, "#1e2848", "#ffcf9a", lights);
    fillProfile(c, m.far, hz + 2, P.vgrad(c, 0, hz - 90, 0, hz, [[0, "#2a3458"], [1, "#161c34"]]));
    rimProfile(c, m.far, "rgba(255,190,160,.18)", 1.5);
    const mx = -240, my = yAt(m.far, mx) + 4;
    c.fillStyle = "#121830"; c.fillRect(mx - 15, my - 62, 7, 62); c.fillRect(mx + 8, my - 62, 7, 62); c.fillRect(mx - 3, my - 60, 4, 60); c.fillRect(mx - 20, my - 74, 40, 14);
    c.fillStyle = "rgba(255,200,170,.25)"; c.fillRect(mx - 20, my - 74, 3, 14);
    windows(c, m.fw, "#ffd59a", .9, lights);
    haze(x, hz - 4, 22, "#d8a0a0", .2 * (1 - blue * .6));
    // the strait
    below(x, hz, [[0, mix("#a88aa8", "#5a5888", blue)], [.04, "#26345e"], [.4, "#0e1630"], [1, "#03060f"]]);
    x.stage(); c.save(); c.translate(0, 2 * hz); c.scale(1, -1); fillProfile(c, m.far, hz, "rgba(8,12,26,.5)"); c.restore();
    // the lighthouse on its rocks, beam turning
    const lx = 330, lb = 300, ang = t * .8;
    const fx = lerp(470, -380, u), fy = 150 + Math.sin(t * 1.2) * 1.2;
    x.full();
    const refl = [{ x: x.sx(lx), c: "#fff0c8", a: .55, w: 10 * DPR }, { x: x.sx(fx), c: "#ffd08a", a: .55, w: 70 * x.k }];
    for (let i = 0; i < 8; i++) { const w = m.fw[i * 9]; refl.push({ x: x.sx(w.x), c: "#ffd59a", a: .3, w: 4 * DPR }); }
    P.reflections(c, refl, x.sy(hz) + 2, H, t, W);
    x.stage();
    shimmer(c, m.sh, t, "#9ab0e8", .22);
    c.strokeStyle = "rgba(220,230,255,.16)"; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i < 4; i++) { c.moveTo(fx + 85 + i * 50, fy - 1 + i * 3); c.lineTo(fx + 120 + i * 50, fy + 2 + i * 5); } c.stroke();
    ferry(c, fx, fy, .72, lights, "#0a0e1a", "#a8b0c8");
    // the near shore: rocks, the breakwater, the tower
    c.fillStyle = "#070a14"; c.beginPath(); c.moveTo(150, lb + 10);
    for (let i = 0; i <= 12; i++) c.lineTo(160 + i * 40, lb - 6 - 14 * noise(i * 1.7));
    c.lineTo(V.r + 20, lb - 6); c.lineTo(V.r + 20, V.b); c.lineTo(80, V.b); c.closePath(); c.fill();
    c.fillStyle = P.vgrad(c, lx - 30, 0, lx + 30, 0, [[0, "#c8ccd8"], [.6, "#8a90a8"], [1, "#3a4058"]]);
    c.beginPath(); c.moveTo(lx - 30, lb); c.lineTo(lx - 20, lb - 190); c.lineTo(lx + 20, lb - 190); c.lineTo(lx + 30, lb); c.fill();
    c.fillStyle = "#a02a2a"; c.beginPath(); c.moveTo(lx - 24, lb - 110); c.lineTo(lx - 22, lb - 140); c.lineTo(lx + 22, lb - 140); c.lineTo(lx + 24, lb - 110); c.fill();
    c.fillStyle = "#14182a"; c.fillRect(lx - 28, lb - 198, 56, 8); c.fillRect(lx - 14, lb - 242, 28, 6);
    c.beginPath(); c.moveTo(lx - 16, lb - 242); c.lineTo(lx, lb - 262); c.lineTo(lx + 16, lb - 242); c.fill();
    c.fillStyle = "#fff4d0"; c.fillRect(lx - 12, lb - 236, 24, 38);
    const toward = Math.sin(ang), dx = Math.cos(ang);
    const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
    const len = 1100 * Math.abs(dx), dir = Math.sign(dx) || 1, by = lb - 217;
    const bg = c.createLinearGradient(lx, by, lx + dir * len, by);
    bg.addColorStop(0, "rgba(255,244,210,.35)"); bg.addColorStop(1, "rgba(255,244,210,0)");
    c.fillStyle = bg; c.beginPath(); c.moveTo(lx, by - 6); c.lineTo(lx + dir * len, by - 70 - 40 * (1 - Math.abs(dx))); c.lineTo(lx + dir * len, by + 50); c.lineTo(lx, by + 6); c.fill();
    c.globalCompositeOperation = op;
    P.glow(c, lx, by, 60 + 200 * Math.max(0, toward) ** 4, "#fff4d0", .5 + .4 * Math.max(0, toward) ** 4);
  };

  /* 4. İzmir: sunset on the Kordon, the clock tower, palms */
  C.izmir = (x) => {
    const { c, W, H, t, u, m } = x, hz = 30, V = view(x), qy = 300;
    if (!m.i) {
      m.i = 1;
      m.hills = profile(9, V.l - 40, V.r + 40, hz, 80, (v, X) => .3 + .7 * Math.exp(-Math.pow((X - 260) / 420, 2)), 60, .25);
      m.hw = windowSet(18, 70, m.hills, hz, [2, 3]);
      m.sh = shimmerSet(41, 140, [V.l, hz + 4, V.r, qy]);
      m.gl = gullsSet(5, 5, -380, -150);
    }
    const set = smooth(0, 1, u), sunY = lerp(hz - 150, hz - 10, set), sx = -170;
    const hy = sky(x, hz, [[0, mix("#2a2456", "#1e1a46", set)], [.4, mix("#8a4a7a", "#7a3a6a", set)], [.75, mix("#f08a6a", "#e86a5a", set)], [1, mix("#ffd890", "#ffaa6a", set)]]);
    x.full();
    P.glow(c, x.sx(sx), x.sy(sunY), x.S * 1.3, "#ff9a5a", .35);
    P.glow(c, x.sx(sx), x.sy(sunY), x.S * .35, "#ffe0a0", .45);
    x.stage();
    c.fillStyle = P.vgrad(c, 0, sunY - 46, 0, sunY + 46, [[0, "#fff6d8"], [1, "#ffc070"]]); c.beginPath(); c.arc(sx, sunY, 46, 0, 7); c.fill();
    // thin clouds crossing the sun
    c.fillStyle = rgba("#a04a6a", .55); c.beginPath();
    for (let i = 0; i < 4; i++) { const cx0 = -520 + i * 260 + Math.sin(t * .05 + i) * 20, cy0 = -150 - i * 34; c.moveTo(cx0 - 200, cy0); c.ellipse(cx0, cy0, 220, 7 + i * 2, 0, 0, 7); }
    c.fill();
    // Karşıyaka across the bay
    fillProfile(c, m.hills, hz + 2, P.vgrad(c, 0, hz - 80, 0, hz, [[0, "#8a5a8a"], [1, "#6a4a78"]]));
    windows(c, m.hw, "#ffe0b0", .8, set);
    haze(x, hz - 6, 30, "#ffb08a", .35);
    // the bay
    below(x, hz, [[0, "#ffb88a"], [.05, "#c8708a"], [.35, "#4a3060"], [1, "#120c20"]]);
    x.full();
    P.reflections(c, [{ x: x.sx(sx), c: "#ffd890", a: .95, w: x.S * .11 }, { x: x.sx(sx), c: "#ffe8c0", a: .6, w: x.S * .04 }], x.sy(hz) + 2, x.sy(qy), t, W);
    x.stage();
    shimmer(c, m.sh, t, "#ffd0a0", .32);
    // the Kordon: the stone edge, the promenade
    c.fillStyle = "#2a1820"; c.fillRect(V.l, qy, V.r - V.l, 12);
    c.fillStyle = "rgba(255,190,130,.4)"; c.fillRect(V.l, qy, V.r - V.l, 2);
    c.fillStyle = P.vgrad(c, 0, qy + 12, 0, V.b, [[0, "#1c1018"], [1, "#07040a"]]); c.fillRect(V.l, qy + 12, V.r - V.l, V.b - qy);
    // promenade lamps
    for (const lx of [-420, -40, 470]) {
      c.fillStyle = "#0c060a"; c.fillRect(lx - 2.5, qy - 150, 5, 160); c.fillRect(lx - 8, qy - 4, 16, 10);
      P.glow(c, lx, qy - 156, 90, "#ffd08a", .5); c.fillStyle = "#fff2cc"; c.beginPath(); c.arc(lx, qy - 156, 9, 0, 7); c.fill();
    }
    palm(c, -330, qy + 30, 470, 1.15, t, 1, "#12080e");
    palm(c, -500, qy + 40, 380, 1, t, 2.5, "#12080e");
    palm(c, 470, qy + 40, 520, 1.15, t, 4, "#12080e");
    clockTower(c, 200, qy + 60, 1, t, u);
    gulls(c, m.gl, V, t, "rgba(40,16,30,.85)");
  };

  // İzmir's Saat Kulesi: fountain base, four octagonal tiers, glowing clock, little dome.
  function clockTower(c, X, B, s, t, u) {
    const stone = (y0, y1, hw) => { c.fillStyle = P.vgrad(c, X - hw, 0, X + hw, 0, [[0, "#e8a06a"], [.3, "#b0705a"], [.7, "#5a3040"], [1, "#2a1626"]]); c.fillRect(X - hw, y0, hw * 2, y1 - y0); };
    const ledge = (y, hw) => { c.fillStyle = "#2a1424"; c.fillRect(X - hw, y - 9 * s, hw * 2, 9 * s); c.fillStyle = "rgba(255,190,130,.55)"; c.fillRect(X - hw, y - 9 * s, hw * .9, 2); };
    stone(B - 40 * s, B, 125 * s); ledge(B - 40 * s, 132 * s);
    stone(B - 100 * s, B - 40 * s, 104 * s);
    c.fillStyle = "#1a0c16"; c.beginPath(); for (const dx of [-60, 0, 60]) archPath(c, X + dx * s, B - 44 * s, 30 * s, 48 * s); c.fill();
    ledge(B - 100 * s, 112 * s);
    stone(B - 270 * s, B - 100 * s, 62 * s);
    c.fillStyle = "#1a0c16"; c.beginPath(); for (const dx of [-30, 0, 30]) archPath(c, X + dx * s, B - 112 * s, 15 * s, 120 * s); c.fill();
    c.fillStyle = "rgba(255,200,140,.25)"; for (const dx of [-60, 60]) c.fillRect(X + dx * s - 3, B - 268 * s, 6, 168 * s);
    ledge(B - 270 * s, 72 * s);
    stone(B - 385 * s, B - 270 * s, 50 * s);
    c.fillStyle = "#1a0c16"; c.beginPath(); for (const dx of [-20, 20]) archPath(c, X + dx * s, B - 282 * s, 14 * s, 80 * s); c.fill();
    ledge(B - 385 * s, 60 * s);
    stone(B - 480 * s, B - 385 * s, 42 * s);
    // the clock face, lit from within
    const cy = B - 432 * s;
    P.glow(c, X, cy, 80 * s, "#ffd59a", .5);
    c.fillStyle = "#fff0c8"; c.beginPath(); c.arc(X, cy, 27 * s, 0, 7); c.fill();
    c.strokeStyle = "#3a2010"; c.lineWidth = 2.5 * s; c.beginPath(); c.arc(X, cy, 27 * s, 0, 7); c.stroke();
    c.lineWidth = 1.5 * s; c.beginPath(); for (let i = 0; i < 12; i++) { const a = i * PI / 6; c.moveTo(X + Math.cos(a) * 22 * s, cy + Math.sin(a) * 22 * s); c.lineTo(X + Math.cos(a) * 25 * s, cy + Math.sin(a) * 25 * s); } c.stroke();
    const hm = -PI / 2 + (t * .05 + 1.8), mm = -PI / 2 + t * .6;
    c.lineWidth = 3 * s; c.beginPath(); c.moveTo(X, cy); c.lineTo(X + Math.cos(hm) * 13 * s, cy + Math.sin(hm) * 13 * s); c.stroke();
    c.lineWidth = 2 * s; c.beginPath(); c.moveTo(X, cy); c.lineTo(X + Math.cos(mm) * 20 * s, cy + Math.sin(mm) * 20 * s); c.stroke();
    ledge(B - 480 * s, 52 * s);
    stone(B - 540 * s, B - 480 * s, 28 * s);
    c.fillStyle = "#1a0c16"; c.beginPath(); archPath(c, X, B - 488 * s, 14 * s, 44 * s); c.fill();
    c.fillStyle = "#2a1424"; c.beginPath(); c.moveTo(X + 30 * s, B - 540 * s); c.arc(X, B - 540 * s, 30 * s, 0, PI, true); c.fill();
    c.fillStyle = "rgba(255,190,130,.6)"; c.beginPath(); c.arc(X, B - 540 * s, 29 * s, -PI * .95, -PI * .62); c.lineTo(X, B - 540 * s); c.fill();
    c.fillStyle = "#2a1424"; c.fillRect(X - 1.5 * s, B - 610 * s, 3 * s, 42 * s);
    c.beginPath(); c.arc(X, B - 612 * s, 4 * s, 0, 7); c.fill();
  }

  /* 5. Pamukkale: white travertine terraces stepping down toward us; calm turquoise pools mirror the sunset */
  C.pamukkale = (x) => {
    const { c, W, H, t, u, m } = x, hz = -210, V = view(x), edge = -80;
    if (!m.i) {
      m.i = 1;
      m.pl = profile(4, V.l - 40, V.r + 40, edge, 26, (v) => .5 + .5 * Math.sin(v * 9), 50, .4);
      m.tw = windowSet(6, 50, m.pl, edge - 4, [1.5, 2.5]);
      const R = rng(78); m.rows = [];
      let Y = edge + 26, g = 34;
      for (let r = 0; Y < V.b + 200; r++) {
        const pools = []; let X = V.l - R() * 200;
        const wBase = 220 * Math.pow(1.5, r);
        while (X < V.r + 40) { const w = wBase * lerp(.7, 1.3, R()); pools.push({ x0: X, x1: X + w }); X += w; }
        m.rows.push({ y: Y, g, b: g * .32, ch: g * .42, r, pools, ph: R() * 6, sf: lerp(.05, .09, R()) / (1 + r * .4) });
        Y += g; g *= 1.72;
      }
      m.mo = motesSet(12, 30, [V.l, edge, V.r, 400]);
    }
    const set = smooth(0, 1, u), sunY = lerp(hz - 150, hz - 20, set), sx = -250;
    const skyTop = mix("#3a3c78", "#2a2a62", set), skyMid = mix("#a07090", "#9a5a80", set), skyLow = mix("#f0a890", "#f08a70", set), skyHz = mix("#ffe0b0", "#ffc080", set);
    sky(x, hz, [[0, skyTop], [.5, skyMid], [.85, skyLow], [1, skyHz]]);
    x.full(); P.glow(c, x.sx(sx), x.sy(sunY), x.S * 1.1, "#ffaa70", .42);
    x.stage();
    c.fillStyle = "#fff0c8"; c.beginPath(); c.arc(sx, sunY, 30, 0, 7); c.fill();
    P.glow(c, sx, sunY, 130, "#ffe0a0", .5);
    ridge(x, hz, 80, 6.2, "#7a5a86", 2);
    haze(x, hz, 40, "#ffb898", .45);
    // the plain far below, fields and poplars, Denizli's lights waking
    x.stage();
    c.fillStyle = P.vgrad(c, 0, hz, 0, edge, [[0, "#b08a90"], [1, "#8a8070"]]); c.fillRect(V.l, hz - 2, V.r - V.l, edge - hz + 4);
    c.fillStyle = "rgba(90,80,60,.22)"; c.beginPath();
    for (let i = 0; i < 9; i++) { const y = lerp(hz + 20, edge - 10, i / 9), sh = (i * 97) % 300; for (let X = V.l - sh; X < V.r; X += 300) c.rect(X, y, 140 + (i * 31) % 90, 2 + i * .6); }
    c.fill();
    windows(c, m.tw, "#ffd8a0", .9, set);
    haze(x, edge - 30, 50, "#ffc8a8", .5);
    below(x, edge, [[0, "#fff4ea"], [1, "#d8c4cc"]]);
    x.stage();
    const rows = m.rows;
    // a terrace's rim: big lobes bulging toward us, and small scallops along the edge of each lobe
    const lip = (row, X) => {
      let p = row.pools[0]; for (const q of row.pools) if (X >= q.x0) p = q; else break;
      const v = (X - p.x0) / (p.x1 - p.x0) * 2 - 1;
      return row.y + Math.sin(X * .003 + row.ph) * row.g * .1 + row.b * (1 - v * v) + Math.abs(Math.sin(X * 3.4 / row.g + row.ph)) * row.g * .06;
    };
    const drip = (row, X) => row.ch * (1 + .3 * Math.pow(Math.abs(Math.sin(X * 2.4 / row.g + row.ph)), 5) + .1 * Math.pow(Math.abs(Math.sin(X * 6.1 / row.g + row.r)), 3));
    const cb = (row, X) => lip(row, X) + drip(row, X);
    const op = c.globalCompositeOperation, st = (row) => Math.max(3, row.g * .045);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i], prev = rows[i - 1], top = (X) => prev ? cb(prev, X) : row.y - row.g * .4;
      const y0 = prev ? prev.y + prev.ch : row.y - row.g * .4, y1 = row.y + row.b * 1.2;
      // the water: the curtain above mirrored pale at the back, then the sunset sky, turquoise over the white floor, bright where shallow
      c.fillStyle = P.vgrad(c, 0, y0, 0, y1, [[0, "#eadadc"], [.18, mix(skyLow, "#86ccd6", .55)], [.45, "#66c2d0"], [.85, "#36aec4"], [1, "#a4e6e8"]]);
      c.beginPath(); c.moveTo(V.l, top(V.l));
      for (let X = V.l; X <= V.r; X += st(row)) c.lineTo(X, top(X));
      for (let X = V.r; X >= V.l; X -= st(row)) c.lineTo(X, lip(row, X));
      c.closePath(); c.fill();
      // the sun's long reflection, and a few slow ripples
      c.globalCompositeOperation = "lighter";
      const ry0 = (y0 + y1) / 2;
      c.save(); c.translate(sx, ry0); c.scale(1, .16);
      const sg = c.createRadialGradient(0, 0, 0, 0, 0, row.g * 1.6); sg.addColorStop(0, "rgba(255,236,190,.55)"); sg.addColorStop(1, "rgba(255,236,190,0)");
      c.fillStyle = sg; c.fillRect(-row.g * 1.6, -row.g * 1.6, row.g * 3.2, row.g * 3.2); c.restore();
      c.fillStyle = "rgba(255,240,220,.25)"; c.beginPath();
      for (let k = 0; k < 5; k++) { const X = V.l + ((k * 271 + row.r * 113 + t * 6) % (V.r - V.l)), Y = lerp(y0, y1, .45 + .1 * k % .4); c.rect(X, Y, row.g * .9, Math.max(.8, row.g * .012)); }
      c.fill(); c.globalCompositeOperation = op;
      // the curtain of the row above dripping into this pool
      if (prev) {
        c.fillStyle = "rgba(255,250,244,.22)"; c.beginPath();
        for (let X = V.l; X <= V.r; X += st(prev)) c.lineTo(X, cb(prev, X) + 1);
        for (let X = V.r; X >= V.l; X -= st(prev)) c.lineTo(X, cb(prev, X) + drip(prev, X) * .1 + prev.g * .02);
        c.fill();
      }
      // this row's curtain: white stone hanging from the rim in soft fringes
      c.fillStyle = P.vgrad(c, 0, row.y, 0, row.y + row.b + row.ch * 1.3, [[0, "#fffcf6"], [.4, mix("#fbe8e0", "#ffe0cc", set)], [1, "#b8a2b6"]]);
      c.beginPath(); c.moveTo(V.l, lip(row, V.l));
      for (let X = V.l; X <= V.r; X += st(row)) c.lineTo(X, lip(row, X));
      for (let X = V.r; X >= V.l; X -= st(row) * .5) c.lineTo(X, cb(row, X));
      c.closePath(); c.fill();
      c.strokeStyle = "rgba(150,120,150,.09)"; c.lineWidth = Math.max(.8, row.g * .025); c.beginPath();
      for (let X = V.l + (row.r * 37 % 23), k = 0; X < V.r; X += row.g * (.18 + .2 * ((k * 7) % 5) / 5), k++) { const y = lip(row, X); c.moveTo(X, y + row.ch * .15); c.lineTo(X + 1, y + drip(row, X) * (.5 + .45 * ((k * 3) % 4) / 4)); }
      c.stroke();
      // the rim catching the low sun
      c.strokeStyle = "rgba(255,255,255,.95)"; c.lineWidth = Math.max(1.2, row.g * .05); c.beginPath();
      for (let X = V.l; X <= V.r; X += st(row)) X === V.l ? c.moveTo(X, lip(row, X)) : c.lineTo(X, lip(row, X));
      c.stroke();
      c.strokeStyle = rgba("#ffd0a8", .5); c.lineWidth = Math.max(.8, row.g * .02); c.stroke();
    }
    motes(c, m.mo, t, "#fff0d8", .35);
  };

  /* 6. Antalya: turquoise sea, warm cliffs, the old harbour */
  C.antalya = (x) => {
    const { c, W, H, t, u, m } = x, hz = -60, V = view(x);
    if (!m.i) {
      m.i = 1;
      m.mt = profile(12, V.l - 60, V.r + 60, hz, 210, (v, X) => .35 + .65 * Math.pow(Math.abs(Math.sin((X + 300) * .0032)), 1.5), 90, .25);
      m.sp = shimmerSet(52, 150, [V.l, hz + 6, V.r, V.b]);
      m.gl = gullsSet(19, 5, -420, -200);
      const R = rng(61); m.houses = Array.from({ length: 22 }, (_, i) => ({ x: 90 + i * 22 + R() * 16, w: 34 + R() * 28, h: 40 + R() * 40, y: 300 - Math.pow(i / 22, 1.2) * 130 - R() * 30, c: ["#f2e2c8", "#e8c8a0", "#f4ead8", "#d8b088"][(R() * 4) | 0] }));
      m.houses.sort((a, b) => a.y - b.y);
    }
    const warm = smooth(0, 1, u);
    sky(x, hz, [[0, mix("#2a78c8", "#3a70b8", warm)], [.55, mix("#8cc8ec", "#a8c4e0", warm)], [.88, mix("#ffe8c8", "#ffd8b0", warm)], [1, mix("#fff2dc", "#ffe0b8", warm)]]);
    x.full(); const sunX = x.sx(320), sunY = x.sy(lerp(-420, -330, warm));
    P.glow(c, sunX, sunY, x.S * .9, "#fff0c8", .45); P.glow(c, sunX, sunY, x.S * .12, "#ffffff", .7);
    // Beydağları across the bay, blue with distance, snow on the crests
    x.stage();
    mountain(c, m.mt, hz + 2, P.vgrad(c, 0, hz - 210, 0, hz, [[0, "#7a90c0"], [1, "#9ab0d0"]]), "rgba(240,244,255,.85)", hz - 170, 7, 40);
    facets(c, m.mt, hz + 2, 0, "rgba(60,70,120,.16)", 4, 180, 3);
    haze(x, hz - 20, 50, "#e8e0e0", .45);
    // the sea: deep blue far, turquoise near
    below(x, hz, [[0, "#3a7ab8"], [.25, "#2a8ab8"], [.6, "#14a8b4"], [1, "#0a8a98"]]);
    x.full(); P.reflections(c, [{ x: sunX, c: "#fff4d8", a: .6, w: x.S * .06 }], x.sy(hz) + 2, H, t, W);
    x.stage();
    shimmer(c, m.sp, t, "#c8fff4", .25); sparkle(c, m.sp, t, "#ffffff", .9);
    // the falez: layered cliffs of warm stone dropping into the water, the town along their top
    const cl = [[V.l, -46], [-470, -40], [-380, -30], [-300, -14], [-232, 2], [-196, 30], [-178, 90], [-190, 150], [-168, 220], [-182, 300], [-150, 380], [-160, V.b + 20], [V.l, V.b + 20]];
    const cliff = () => { c.beginPath(); cl.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
    c.save(); cliff(); c.clip();
    c.fillStyle = P.vgrad(c, -600, 0, -150, 0, [[0, "#7a4a30"], [.55, "#c8844e"], [.85, "#f0b070"], [1, "#b06a3c"]]); c.fillRect(V.l, -60, -140 - V.l, V.b + 80);
    for (let i = 0; i < 16; i++) { const y = -30 + i * 28 + (i % 3) * 5; c.fillStyle = i % 2 ? "rgba(255,210,150,.12)" : "rgba(90,40,20,.16)"; c.beginPath(); c.moveTo(V.l, y + 14); c.quadraticCurveTo(-380, y - 4, -150, y + 6); c.lineTo(-150, y + 20); c.quadraticCurveTo(-380, y + 10, V.l, y + 28); c.fill(); }
    c.strokeStyle = "rgba(70,30,15,.35)"; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i < 26; i++) { const X = -560 + i * 16 + (i * 37 % 11), y0 = -20 + (i * 53 % 90); c.moveTo(X, y0); c.lineTo(X + (i % 3 - 1) * 6, y0 + 40 + (i * 29 % 80)); } c.stroke();
    c.fillStyle = "rgba(50,20,10,.4)"; c.fillRect(-215, -20, 70, V.b + 40);
    c.restore();
    c.fillStyle = "rgba(255,230,180,.6)"; c.beginPath(); for (let i = 5; i < 11; i++) { c.moveTo(cl[i][0], cl[i][1]); c.lineTo(cl[i][0] - 4, cl[i][1] + 2); c.lineTo(cl[i + 1][0] - 4, cl[i + 1][1]); c.lineTo(cl[i + 1][0], cl[i + 1][1]); } c.fill();
    // hotels and gardens on the cliff top
    for (let i = 0; i < 6; i++) { const hx = -560 + i * 58, hy = -44 + i * 6, hh = 30 + (i * 17 % 26); c.fillStyle = P.vgrad(c, hx, 0, hx + 46, 0, [[0, "#c8b8a8"], [.5, "#fff4e4"], [1, "#e0d0c0"]]); c.fillRect(hx, hy - hh, 46, hh + 4); c.fillStyle = "rgba(60,90,120,.5)"; for (let k = 0; k < 3; k++) c.fillRect(hx + 4, hy - hh + 6 + k * 9, 38, 3); }
    c.fillStyle = "#3a5a2a"; c.beginPath();
    for (let i = 0; i < 18; i++) { const X = -560 + i * 22, Y = -36 + i * 2.6 + Math.sin(i * 2.1) * 4; c.moveTo(X + 14, Y); c.ellipse(X, Y, 14, 8, 0, 0, 7); } c.fill();
    palm(c, -250, -2, 120, .45, t, 1, "#2a3a1e"); palm(c, -330, -20, 100, .4, t, 3, "#2a3a1e");
    c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath();
    for (let i = 0; i < 6; i++) { const y = 360 + i * 40, w = 40 + Math.sin(t * 1.4 + i) * 16; c.moveTo(-150 + w, y + 6); c.ellipse(-150, y + 6, w, 3, 0, 0, 7); } c.fill();
    // Kaleiçi: the harbour wall, stone houses climbing, the fluted minaret
    c.fillStyle = P.vgrad(c, 0, 220, 0, 330, [[0, "#c89a6a"], [1, "#7a5a3a"]]);
    c.beginPath(); c.moveTo(60, 330); c.lineTo(70, 200); c.lineTo(V.r + 20, 150); c.lineTo(V.r + 20, 330); c.fill();
    for (const hs of m.houses) {
      c.fillStyle = P.vgrad(c, hs.x, 0, hs.x + hs.w, 0, [[0, hs.c], [1, mix(hs.c, "#8a6040", .45)]]); c.fillRect(hs.x, hs.y - hs.h, hs.w, hs.h + 40);
      c.fillStyle = "#b8502a"; c.beginPath(); c.moveTo(hs.x - 5, hs.y - hs.h); c.lineTo(hs.x + hs.w * .5, hs.y - hs.h - 16); c.lineTo(hs.x + hs.w + 5, hs.y - hs.h); c.fill();
      c.fillStyle = "#5a3a2a"; c.fillRect(hs.x + hs.w * .2, hs.y - hs.h * .6, hs.w * .22, hs.h * .3); c.fillRect(hs.x + hs.w * .6, hs.y - hs.h * .6, hs.w * .22, hs.h * .3);
    }
    const yx = 330, yb = 160;
    c.fillStyle = P.vgrad(c, yx - 20, 0, yx + 20, 0, [[0, "#e0906a"], [.6, "#a04a32"], [1, "#6a2a1e"]]);
    c.fillRect(yx - 26, yb - 50, 52, 50); c.fillRect(yx - 18, yb - 330, 36, 290);
    c.strokeStyle = "rgba(60,20,10,.45)"; c.lineWidth = 2.5; c.beginPath(); for (let i = -2; i <= 2; i++) { c.moveTo(yx + i * 7, yb - 50); c.lineTo(yx + i * 6, yb - 330); } c.stroke();
    c.fillStyle = "#4a2418"; c.fillRect(yx - 28, yb - 290, 56, 8); c.beginPath(); c.moveTo(yx - 13, yb - 330); c.lineTo(yx, yb - 380); c.lineTo(yx + 13, yb - 330); c.fill();
    c.fillStyle = "#1e8a8a"; c.fillRect(yx - 18, yb - 240, 36, 6);
    c.fillStyle = P.vgrad(c, 0, 330, 0, 352, [[0, "#d8b080"], [1, "#6a4a30"]]); c.fillRect(40, 330, V.r - 30, 22);
    // gulets bobbing in the harbour
    for (const [bx, s, ph] of [[150, .9, 0], [360, 1, 2]]) {
      const by = 410 + Math.sin(t * 1.2 + ph) * 3, rk = Math.sin(t * .9 + ph) * .02;
      c.save(); c.translate(bx, by); c.rotate(rk); c.scale(s, s);
      c.fillStyle = P.vgrad(c, 0, -20, 0, 6, [[0, "#f4ead8"], [.4, "#8a4a26"], [1, "#4a2412"]]);
      c.beginPath(); c.moveTo(-110, -22); c.lineTo(120, -26); c.quadraticCurveTo(110, 4, 80, 6); c.lineTo(-90, 6); c.quadraticCurveTo(-110, -6, -110, -22); c.fill();
      c.fillStyle = "#f4ead8"; c.fillRect(-60, -44, 90, 20); c.fillStyle = "#2a5a7a"; c.fillRect(-52, -40, 74, 6);
      c.fillStyle = "#3a2010"; c.fillRect(-30, -170, 3, 146); c.fillRect(50, -140, 3, 116);
      c.strokeStyle = "rgba(60,40,30,.6)"; c.lineWidth = 1; c.beginPath(); c.moveTo(-29, -170); c.lineTo(118, -26); c.moveTo(-29, -170); c.lineTo(-108, -22); c.stroke();
      c.restore();
      c.fillStyle = "rgba(40,30,30,.25)"; c.beginPath(); c.ellipse(bx, by + 14 * s, 100 * s, 7, 0, 0, 7); c.fill();
    }
    gulls(c, m.gl, V, t, "rgba(250,250,255,.9)");
  };

  /* 7. Konya: Mevlana's green fluted tower at twilight; a spinning bell of white light */
  C.konya = (x) => {
    const { c, W, H, t, u, m } = x, hz = 250, V = view(x);
    if (!m.i) { m.i = 1; m.st = P.starSet(71, 140, .5); m.mo = motesSet(3, 60, [-420, -100, 0, 380]); }
    const dusk = smooth(0, 1, u);
    sky(x, hz, [[0, mix("#1a1e44", "#0c0e28", dusk)], [.5, mix("#3e3a70", "#262650", dusk)], [.85, mix("#b07a8a", "#7a5a7a", dusk)], [1, mix("#f0b88a", "#c08a7a", dusk)]]);
    P.stars(c, m.st, W, x.sy(hz) * 1.1, t, .3 + .6 * dusk);
    x.stage();
    P.glow(c, 360, -420, 140, "#e8e0ff", .2); c.fillStyle = "#f2f0f8"; c.beginPath(); c.arc(360, -420, 16, 0, 7); c.fill();
    c.fillStyle = mix("#1a1e44", "#0c0e28", dusk); c.beginPath(); c.arc(367, -424, 14, 0, 7); c.fill();
    // the courtyard ground
    below(x, hz, [[0, "#2a2238"], [.15, "#1a1524"], [1, "#07060c"]]);
    x.stage();
    // side buildings: lead domes over arcades
    const ink = "#1a1828";
    c.fillStyle = ink; c.fillRect(-560, hz - 120, 420, 120); c.fillRect(170, hz - 110, 440, 110);
    for (let i = 0; i < 5; i++) dome(c, -500 + i * 80, hz - 120, 32, "#2a2a3e", .2);
    for (let i = 0; i < 5; i++) dome(c, 220 + i * 84, hz - 110, 34, "#2a2a3e", .2);
    c.fillStyle = rgba("#ffcf8a", .7); c.beginPath();
    for (let i = 0; i < 6; i++) archPath(c, -530 + i * 70, hz - 10, 28, 70);
    for (let i = 0; i < 6; i++) archPath(c, 200 + i * 70, hz - 10, 28, 64);
    c.fill();
    minaret(c, -430, hz - 110, 420, 22, "#24223a", 2, null, .8);
    // the Green Dome: square base, fluted drum, fluted cone, all in turquoise tile
    const X = 30, B = hz - 60;
    c.fillStyle = P.vgrad(c, X - 120, 0, X + 120, 0, [[0, "#a89480"], [.5, "#6a5a5a"], [1, "#2e2838"]]); c.fillRect(X - 120, B - 140, 240, 200);
    c.fillStyle = P.vgrad(c, 0, B - 140, 0, B + 60, [[0, "rgba(20,16,30,.5)"], [1, "rgba(255,200,140,.25)"]]); c.fillRect(X - 120, B - 140, 240, 200);
    c.fillStyle = "#1a1626"; c.beginPath(); for (let i = -2; i <= 2; i++) archPath(c, X + i * 44, B + 40, 22, 64); c.fill();
    c.fillStyle = rgba("#ffcf8a", .55); c.beginPath(); for (const i of [-1, 1]) archPath(c, X + i * 44, B + 40, 14, 44); c.fill();
    c.fillStyle = "#2a2438"; c.fillRect(X - 128, B - 150, 256, 12); c.fillStyle = "rgba(255,210,160,.3)"; c.fillRect(X - 128, B - 150, 256, 2);
    dome(c, X - 175, B - 60, 46, "#2a2a3e", .2, rgba("#c8c0e0", .25)); dome(c, X + 170, B - 50, 40, "#2a2a3e", .2, rgba("#c8c0e0", .25));
    const drumTop = B - 420, R = 58, ribs = 16;
    for (let i = 0; i < ribs; i++) {
      const a0 = PI + i * PI / ribs, a1 = a0 + PI / ribs, x0 = X + Math.cos(a0) * R, x1 = X + Math.cos(a1) * R;
      const lit = .5 + .5 * Math.cos((a0 + a1) / 2 + PI * .65);
      c.fillStyle = mix("#0a4a44", "#3ad8b8", lit * (.75 + .25 * dusk));
      c.fillRect(Math.min(x0, x1), drumTop, Math.abs(x1 - x0) + .6, B - 150 - drumTop);
      c.beginPath(); c.moveTo(x0, drumTop); c.lineTo(X, drumTop - 200); c.lineTo(x1, drumTop); c.fill();
    }
    c.strokeStyle = "rgba(0,30,26,.5)"; c.lineWidth = 1.5; c.beginPath();
    for (let i = 1; i < ribs; i++) { const x0 = X + Math.cos(PI + i * PI / ribs) * R; c.moveTo(x0, B - 150); c.lineTo(x0, drumTop); c.lineTo(X, drumTop - 200); } c.stroke();
    c.fillStyle = "#0a3a36"; c.fillRect(X - R - 4, drumTop - 6, R * 2 + 8, 10); c.fillRect(X - R - 4, B - 260, R * 2 + 8, 8);
    c.fillStyle = "#e8c070"; c.fillRect(X - 2, drumTop - 250, 4, 52); c.beginPath(); c.arc(X, drumTop - 252, 6, 0, 7); c.fill();
    P.glow(c, X, B - 300, 360, "#3ad8b8", .14);
    // floodlight from below
    P.glow(c, X, B - 60, 280, "#ffcf8a", .2);
    // light falling from above, into the wound
    rays(c, -170, -700, 7, 1150, .4, PI / 2 + .06, "#fff2d8", .1, t, 2);
    // the whirl: a spinning bell of white light, no one inside it, only light
    const wx = -210, wy = 40, sp = smooth(0, .2, u) * .8 + .2;
    whirl(c, wx, wy, 150, 300, t * sp + t * .4, .9);
    motes(c, m.mo, t, "#fff0d8", .55);
    // the courtyard paving catches it all
    c.fillStyle = "rgba(255,240,215,.08)"; c.beginPath(); c.ellipse(wx, hz + 100, 220, 24, 0, 0, 7); c.fill();
    x.full(); P.glow(c, x.sx(wx), x.sy(hz + 110), 260 * x.k, "#fff2d8", .14); P.glow(c, x.sx(X), x.sy(hz + 60), 300 * x.k, "#3ad8b8", .08);
  };

  // A whirling skirt of light: layered translucent panels of glow turning around a single point,
  // added light only, no outlines. Nobody inside it.
  function whirl(c, X, Y, R, Hh, rot, a) {
    const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
    P.glow(c, X, Y + Hh * .75, R * 2.4, "#ffe8c8", .16 * a); P.glow(c, X, Y + Hh * .6, R * 1.1, "#fff2dc", .22 * a);
    const hemY = Y + Hh;
    const panel = (th0, dth, rr, hy, alpha, col, lag) => {
      const th1 = th0 + dth, mid = th0 + dth / 2, front = .35 + .65 * Math.max(0, Math.sin(mid));
      const g = c.createLinearGradient(0, Y, 0, hy + rr * .22);
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(.55, rgba(col, alpha * .35 * front)); g.addColorStop(1, rgba(col, alpha * front));
      c.fillStyle = g; c.beginPath(); c.moveTo(X, Y);
      c.bezierCurveTo(X + Math.cos(th0 - lag) * rr * .2, Y + Hh * .35, X + Math.cos(th0 - lag) * rr * .7, hy - Hh * .2, X + Math.cos(th0) * rr, hy + Math.sin(th0) * rr * .22);
      for (let k = 1; k <= 6; k++) { const th = th0 + dth * k / 6, w = 1 + .07 * Math.sin(th * 6 - rot * 5); c.lineTo(X + Math.cos(th) * rr * w, hy + Math.sin(th) * rr * .22 + Math.sin(th * 4 + rot * 3) * 6); }
      c.bezierCurveTo(X + Math.cos(th1 - lag) * rr * .7, hy - Hh * .2, X + Math.cos(th1 - lag) * rr * .2, Y + Hh * .35, X, Y);
      c.fill();
    };
    // an under-layer turning slowly the other way, then the bright outer skirt
    for (let i = 0; i < 7; i++) panel(i / 7 * PI * 2 - rot * .9, PI * 2 / 7 * .8, R * .78, hemY - 18, .3 * a, "#ffd6a8", -.5);
    for (let i = 0; i < 9; i++) panel(i / 9 * PI * 2 + rot * 1.7, PI * 2 / 9 * .75, R, hemY, (.4 + .12 * Math.sin(rot * 2 + i)) * a, "#fff4e4", .8);
    // the hem breathing light
    c.save(); c.translate(X, hemY); c.scale(1, .22);
    const hg = c.createRadialGradient(0, 0, R * .7, 0, 0, R * 1.15);
    hg.addColorStop(0, rgba("#fff6e8", 0)); hg.addColorStop(.6, rgba("#fff6e8", .4 * a * (.8 + .2 * Math.sin(rot * 3)))); hg.addColorStop(1, rgba("#fff6e8", 0));
    c.fillStyle = hg; c.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4); c.restore();
    // glints shimmering on the turning cloth
    c.fillStyle = rgba("#ffffff", .7 * a); c.beginPath();
    for (let i = 0; i < 18; i++) { const th = i * 2.4 + rot * 1.7, v = .35 + .6 * ((i * .37) % 1); if (Math.sin(th) < .2 || Math.sin(rot * 4 + i * 1.3) < .3) continue; const gx = X + Math.cos(th) * R * v, gy = Y + Hh * v + Math.sin(th) * R * .22 * v; c.moveTo(gx + 1.6, gy); c.arc(gx, gy, 1.6, 0, 7); }
    c.fill();
    P.glow(c, X, Y, R * .9, "#fff0d0", .55 * a);
    P.glow(c, X, Y, R * .25, "#ffffff", .6 * a);
    c.globalCompositeOperation = op;
  }

  /* 8. Kapadokya: fairy chimneys at dawn, balloons rising */
  C.kapadokya = (x) => {
    const { c, W, H, t, u, m } = x, hz = 120, V = view(x);
    if (!m.i) {
      m.i = 1;
      const R = rng(42);
      const pal = [["#d8402a", "#f2c040", "#2a3a8a"], ["#2a5ab0", "#f0e2c0"], ["#e07a2a", "#7a2a6a"], ["#3a9a6a", "#f0d070"], ["#c03a5a", "#f4b0a0"], ["#f0c040", "#d8402a"], ["#6a3aa0", "#f0d8f0", "#e8a030"], ["#e8e0d0", "#c0302a"]];
      m.b = Array.from({ length: 22 }, (_, i) => {
        const d = Math.pow(R(), 1.3), p = pal[(R() * pal.length) | 0];
        return { x: lerp(V.l + 60, V.r - 40, R()), y: lerp(hz - 40, -420, R()) - d * 60, s: lerp(.16, .62, d) * (i < 3 ? 2 : 1), d: i < 3 ? 1 : d, c1: p[0], c2: p[1], c3: p[2], ph: R() * 10, vs: lerp(8, 20, R()) };
      });
      m.b.sort((a, b) => a.s - b.s);
      m.ch = [];
      for (let g = 0; g < 13; g++) { const d = R(), cx = lerp(V.l, V.r, R()), n = 1 + (R() * 3 | 0), w = lerp(22, 58, d); for (let k = 0; k < n; k++) m.ch.push({ x: cx + (k - (n - 1) / 2) * w * lerp(.8, 1.3, R()), d: d + k * .001, h: lerp(70, 210, d) * lerp(.55, 1.25, R()), w: w * lerp(.7, 1.15, R()), cap: R() < .55, g, m: k === 0 ? n : 0, mw: n * w }); }
      m.ch.sort((a, b) => a.d - b.d);
      m.v1 = profile(5, V.l - 40, V.r + 40, hz + 70, 70, (v) => .5 + .5 * Math.sin(v * 8 + 1), 60, .3);
      m.mesa = profile(3, V.l - 40, V.r + 40, hz, 70, (v) => smooth(.1, .2, v) * (1 - smooth(.45, .55, v)) + .6 * smooth(.6, .7, v), 60, .05);
    }
    const day = smooth(0, 1, u);
    sky(x, hz, [[0, mix("#3a4a80", "#5a7ab8", day)], [.45, mix("#a088a8", "#d0a8b0", day)], [.82, mix("#f0a890", "#ffc8a0", day)], [1, mix("#ffd8a0", "#fff0c8", day)]]);
    const sunY = lerp(hz + 10, hz - 90, day), sunX = 300;
    x.full(); P.glow(c, x.sx(sunX), x.sy(sunY), x.S * 1.2, "#ffb070", .45);
    x.stage(); c.fillStyle = "#fff4d8"; c.beginPath(); c.arc(sunX, sunY, 26, 0, 7); c.fill();
    // far table mountains
    fillProfile(c, m.mesa, hz + 140, "#b090a8");
    haze(x, hz, 60, "#ffd0b0", .4);
    x.stage();
    const hzc = "#f4c8b0", far = (b) => b.d < .45;
    const pos = (b) => [b.x + Math.sin(t * .2 + b.ph) * 14, b.y - 260 * (1 - Math.exp(-t * b.vs / 260)) * (b.d < .3 ? .6 : 1)];
    for (const b of m.b) if (far(b)) { const [bx, by] = pos(b); balloon(c, bx, by, b.s, b, t, hzc, .55 - b.d * .8); }
    // the valley: rows of tuff chimneys, lit pink on the sunward side
    x.stage();
    fillProfile(c, m.v1, V.b + 50, P.vgrad(c, 0, hz, 0, hz + 220, [[0, mix("#d8aca4", "#f0c4b0", day)], [1, "#8a6478"]]));
    for (let k = 1; k < 5; k++) { c.save(); c.translate(0, k * 16); rimProfile(c, m.v1, rgba(k % 2 ? "#fff0e8" : "#a07088", .22), 5); c.restore(); }
    haze(x, hz + 40, 40, "#ffd8c0", .3);
    x.stage();
    let hb = 0;
    for (const k of m.ch) {
      // dusty haze drifts between the rows of chimneys
      if (hb < 2 && k.d > (hb ? .7 : .38)) { haze(x, hz + 70 + (hb ? .7 : .38) * 160 - 20, 50, "#ffd8c0", .3); x.stage(); hb++; }
      if (k.m) { const base = hz + 70 + k.d * 160, cx = k.x + (k.m - 1) / 2 * k.w; c.fillStyle = P.vgrad(c, cx - k.mw, 0, cx + k.mw, 0, [[0, mix("#8a6a88", "#6a4a68", k.d)], [1, mix("#e8b8a0", "#ffd8b8", day * k.d)]]); c.beginPath(); c.ellipse(cx, base + 2, k.mw * .9 + k.w * .4, k.h * .22, 0, PI, 0); c.fill(); }
      const base = hz + 70 + k.d * 160, lit = mix("#e8b8a0", "#ffd8b8", day * k.d), sh = mix("#8a6a88", "#6a4a68", k.d);
      chimney(c, k.x, base, k.h, k.w, lit, sh, k.cap ? mix("#6a5060", "#3a2a3a", k.d) : null, { sd: k.x * .01 + k.g, tl: (k.g % 3 - 1) * .12, win: k.d > .55 && k.g % 2 ? 2 + k.g % 3 : 0, rim: .4 + .6 * k.d });
    }
    for (const b of m.b) if (!far(b) && b.d < 1) { const [bx, by] = pos(b); balloon(c, bx, by, b.s, b, t, hzc, .1); }
    // the near rim where we stand, in shadow, two great chimneys
    below(x, 330, [[0, "#4a3048"], [1, "#160c16"]]);
    x.stage();
    c.fillStyle = "#3a2438"; c.beginPath(); c.moveTo(V.l, 340);
    for (let i = 0; i <= 24; i++) c.lineTo(lerp(V.l, V.r, i / 24), 330 - 22 * noise(i * .8 + 4)); c.lineTo(V.r, V.b); c.lineTo(V.l, V.b); c.fill();
    // eroded tuff folds on the near slope, warm where they face the dawn
    c.strokeStyle = rgba("#ffc0a0", .12); c.lineWidth = 3; c.beginPath();
    for (let i = 0; i < 9; i++) { const y = 380 + i * i * 9; if (y > V.b) break; c.moveTo(V.l, y + 10 * Math.sin(i)); for (let X = V.l; X <= V.r; X += 60) c.lineTo(X, y + 14 * noise(X * .006 + i * 3)); }
    c.stroke();
    if (V.b > 620) {
      // in tall frames, a near shoulder of rock with its own chimneys rises from below
      c.fillStyle = P.vgrad(c, 0, 660, 0, V.b, [[0, mix("#8a5a68", "#b07870", day)], [.35, "#4a2e44"], [1, "#1e121c"]]); c.beginPath(); c.moveTo(V.l, V.b);
      for (let i = 0; i <= 20; i++) { const X = lerp(V.l, V.r, i / 20); c.lineTo(X, 760 + 50 * noise(i * .5 + 9) - 90 * Math.exp(-Math.pow((X + 230) / 220, 2))); }
      c.lineTo(V.r, V.b); c.fill();
      chimney(c, -250, 700, 440, 120, mix("#b88080", "#e8a890", day), "#3a2238", "#22141e", { sd: 5.3, tl: -.08, win: 3, rim: .8 });
      chimney(c, -80, 740, 260, 80, mix("#a87478", "#d89a88", day), "#3a2238", null, { sd: 9.1, win: 1, rim: .7 });
      haze(x, 700, 120, "#ffc8b0", .18);
    }
    haze(x, 300, 60, "#ffd0b8", .22); x.stage();
    chimney(c, 420, 360, 420, 110, mix("#d8a090", "#ffc8a8", day), "#4a2e48", "#2a1a2a", { sd: 3.1, tl: .14, win: 4 });
    chimney(c, 330, 360, 250, 80, mix("#c89088", "#f0b898", day), "#4a2e48", "#2a1a2a", { sd: 7.7, tl: -.1, win: 2 });
    for (const b of m.b) if (b.d === 1) { const [bx, by] = pos(b); balloon(c, bx, by, b.s, b, t, hzc, 0); }
  };

  /* 9. Ankara: the capital at night, Anıtkabir's colonnade lit gold */
  C.ankara = (x) => {
    const { c, W, H, t, u, m } = x, hz = 160, V = view(x);
    if (!m.i) {
      m.i = 1;
      m.st = P.starSet(91, 150, .55);
      m.h1 = profile(13, V.l - 40, V.r + 40, hz, 70, (v) => .5 + .5 * Math.sin(v * 7), 60, .3);
      m.h2 = profile(17, V.l - 40, V.r + 40, hz + 120, 90, (v) => .5 + .5 * Math.sin(v * 5 + 2), 60, .3);
      m.l1 = windowSet(4, 260, m.h1, hz + 130, [1.6, 2.6]); m.l2 = windowSet(5, 200, m.h2, hz + 260, [2.2, 3.6]);
      m.ani = profile(23, -520, 260, hz + 50, 170, (v) => Math.sin(v * PI) ** .7, 40, .05);
    }
    const night = smooth(0, 1, u);
    sky(x, hz, [[0, "#050a1c"], [.55, "#12193a"], [.9, "#2a2848"], [1, mix("#5a3a48", "#4a3040", night)]]);
    P.stars(c, m.st, W, x.sy(hz) * 1.15, t, .8);
    x.stage();
    P.glow(c, -360, -400, 180, "#dfe6ff", .18); c.fillStyle = "#f2f2f8"; c.beginPath(); c.arc(-360, -400, 22, 0, 7); c.fill();
    // Atakule on its far hill
    fillProfile(c, m.h1, hz + 140, "#0e1226");
    const ax = 380, ab = yAt(m.h1, ax) + 6;
    c.fillStyle = "#1a1e34"; c.fillRect(ax - 5, ab - 170, 10, 170);
    c.beginPath(); c.ellipse(ax, ab - 178, 28, 12, 0, 0, 7); c.fill();
    c.fillStyle = rgba("#bcd8ff", .9); c.fillRect(ax - 26, ab - 180, 52, 3);
    P.glow(c, ax, ab - 180, 70, "#9ac0ff", .35);
    c.fillStyle = "#ff4a4a"; c.fillRect(ax - 1.5, ab - 210, 3, 3); if (Math.sin(t * 2.5) > 0) P.glow(c, ax, ab - 210, 14, "#ff4a4a", .7);
    c.fillStyle = rgba("#ffd59a", .85); c.beginPath(); for (const l of m.l1) c.rect(l.x, l.y, l.w, l.w); c.fill();
    c.fillStyle = rgba("#dce8ff", .6); c.beginPath(); for (let i = 0; i < m.l1.length; i += 5) { const l = m.l1[i]; c.rect(l.x + 3, l.y + 2, l.w, l.w); } c.fill();
    haze(x, hz + 40, 70, "#ffb070", .12);
    // the Rasattepe hill, Anıtkabir on top
    x.stage();
    fillProfile(c, m.ani, 2000, "#0a0c18");
    const X = -150, B = hz - 70;
    P.glow(c, X, B - 90, 520, "#ffb35a", .22);
    c.fillStyle = "#2a2018"; c.fillRect(X - 250, B - 8, 500, 30);
    c.fillStyle = "rgba(255,210,150,.5)"; for (let i = 0; i < 4; i++) c.fillRect(X - 250 + i * 6, B - 8 + i * 7, 500 - i * 12, 1.5);
    c.fillStyle = P.vgrad(c, 0, B - 160, 0, B - 8, [[0, "#3a2a1a"], [1, "#6a4a2a"]]); c.fillRect(X - 200, B - 160, 400, 152);
    for (let i = 0; i < 12; i++) {
      const cx = X - 196 + i * 35.6;
      c.fillStyle = P.vgrad(c, cx - 7, 0, cx + 7, 0, [[0, "#ffe8c0"], [.5, "#f0c890"], [1, "#a07a50"]]);
      c.fillRect(cx - 7, B - 160, 14, 152);
    }
    c.fillStyle = P.vgrad(c, 0, B - 200, 0, B - 160, [[0, "#c8a070"], [1, "#ffe0b0"]]); c.fillRect(X - 216, B - 196, 432, 36);
    c.fillStyle = "#4a3420"; c.fillRect(X - 216, B - 172, 432, 3);
    c.fillStyle = "#8a6a48"; c.fillRect(X - 200, B - 206, 400, 10);
    // the long arcaded walls that frame the square
    c.fillStyle = "#3a2c1e"; c.fillRect(X + 260, B - 50, 240, 50); c.fillRect(X - 500, B - 50, 240, 50);
    c.fillStyle = rgba("#ffcf8a", .55); c.beginPath(); for (let i = 0; i < 7; i++) { c.rect(X + 270 + i * 33, B - 42, 18, 34); c.rect(X - 490 + i * 33, B - 42, 18, 34); } c.fill();
    // flagpole and flag
    c.fillStyle = "#c8c0b0"; c.fillRect(X + 252, B - 330, 4, 330);
    flag(c, X + 256, B - 326, 110, 72, t, .9);
    P.glow(c, X + 300, B - 290, 120, "#ff8a6a", .12);
    // the city at our feet
    fillProfile(c, m.h2, 2000, "#06070f");
    c.fillStyle = rgba("#ffc27a", .9); c.beginPath(); for (const l of m.l2) if (l.on < .5 + .5 * night) c.rect(l.x, l.y, l.w, l.w); c.fill();
    c.fillStyle = rgba("#ffffff", .7); c.beginPath(); for (let i = 0; i < m.l2.length; i += 4) { const l = m.l2[i]; if (Math.sin(t * 2 + i) > .2) c.rect(l.x + 4, l.y, l.w * .8, l.w * .8); } c.fill();
  };

  /* 10. Trabzon: misty green mountains, Sümela on its cliff, tea terraces, a glass of tea */
  C.trabzon = (x) => {
    const { c, W, H, t, u, m } = x, hz = -120, V = view(x);
    if (!m.i) {
      m.i = 1;
      const sh = (k) => (v, X) => .45 + .55 * Math.abs(Math.sin(X * .0024 + k));
      m.r = [0, 1, 2, 3].map(i => forest(10 + i, V.l - 40, V.r + 40, hz + 40 + i * 120, 220 - i * 30, sh(i * 1.7), 12 + i * 5, 16 + i * 9));
      m.mist = Array.from({ length: 7 }, (_, i) => ({ y: -80 + i * 90, x: i * 337 % 900, w: 500 + (i % 3) * 200, sp: 6 + i * 2 }));
      m.tea = Array.from({ length: 8 }, (_, i) => i);
    }
    const am = smooth(0, 1, u);
    sky(x, hz, [[0, "#a8bcc0"], [.7, "#d8dcd0"], [1, mix("#f0e8d0", "#fff4dc", am)]]);
    x.full(); P.glow(c, x.sx(-260), x.sy(-420), x.S * .9, "#fff4d8", .35 + .2 * am);
    const cols = ["#9ab0a8", "#6a8a74", "#3e6a4a", "#24482e"];
    const mist = (i) => { for (const s of m.mist) if (s.y > hz + i * 120 - 40 && s.y < hz + i * 120 + 120) {
      const X = ((s.x + t * s.sp) % (V.r - V.l + 1200)) + V.l - 600, Y = s.y;
      const g = c.createRadialGradient(X, Y, 0, X, Y, s.w); g.addColorStop(0, "rgba(240,244,240,.55)"); g.addColorStop(1, "rgba(240,244,240,0)");
      c.save(); c.translate(X, Y); c.scale(1, .18); c.translate(-X, -Y); c.fillStyle = g; c.fillRect(X - s.w, Y - s.w, s.w * 2, s.w * 2); c.restore(); } };
    for (let i = 0; i < 4; i++) {
      x.stage();
      fillProfile(c, m.r[i], 2000, P.vgrad(c, 0, hz - 200 + i * 120, 0, hz + 200 + i * 120, [[0, cols[i]], [1, mix(cols[i], "#c8d4c8", .5 - i * .1)]]));
      if (i === 0) { haze(x, -150, 160, "#dfe4dc", .35); x.stage(); sumela(c, 250, -440, 40, m, t); }
      haze(x, hz + 60 + i * 120, 70, "#e8ece4", .55 - i * .08);
      x.stage(); mist(i);
    }
    // tea terraces on the near slope: rows of rounded bushes following the contour
    x.stage();
    const ty = 250;
    c.fillStyle = P.vgrad(c, 0, ty - 60, 0, V.b, [[0, "#3a6a2a"], [1, "#12240e"]]);
    c.beginPath(); c.moveTo(V.l, ty); c.quadraticCurveTo(0, ty - 90, V.r, ty - 20); c.lineTo(V.r, V.b); c.lineTo(V.l, V.b); c.fill();
    for (let r = 0; r < 9; r++) {
      const yb = ty - 30 + r * 34 + r * r * 3, br = 12 + r * 2.4;
      c.fillStyle = mix("#2a5a1a", "#1a3a12", r / 9); c.beginPath();
      for (let X = V.l; X < V.r; X += br * 1.5) { const Y = yb - 60 * (1 - Math.pow((X - 0) / 800, 2)) * (1 - r * .06); c.moveTo(X + br, Y); c.arc(X, Y, br, PI, 0); c.lineTo(X + br, Y + br * .3); }
      c.fill();
      c.fillStyle = mix("#8acb4a", "#5a9a2a", r / 9); c.beginPath();
      for (let X = V.l; X < V.r; X += br * 1.5) { const Y = yb - 60 * (1 - Math.pow(X / 800, 2)) * (1 - r * .06) - br * .55; c.moveTo(X - br * .3 + br * .4, Y); c.ellipse(X - br * .3, Y, br * .4, br * .22, 0, 0, 7); }
      c.fill();
    }
    // a tulip glass of tea on the rail, steaming
    const gx = 330, gy = 450;
    c.fillStyle = "#3a2414"; c.fillRect(V.l, gy + 6, V.r - V.l, 18); c.fillStyle = "rgba(255,230,190,.2)"; c.fillRect(V.l, gy + 6, V.r - V.l, 2);
    c.fillStyle = "#e8e4dc"; c.beginPath(); c.ellipse(gx, gy + 4, 52, 10, 0, 0, 7); c.fill();
    c.fillStyle = "#c8302a"; c.beginPath(); c.ellipse(gx, gy + 4, 42, 7, 0, 0, 7); c.fill(); c.fillStyle = "#e8e4dc"; c.beginPath(); c.ellipse(gx, gy + 3, 30, 5, 0, 0, 7); c.fill();
    const tulip = () => { c.beginPath(); c.moveTo(gx - 26, gy - 110); c.bezierCurveTo(gx - 24, gy - 70, gx - 10, gy - 66, gx - 13, gy - 50); c.bezierCurveTo(gx - 16, gy - 30, gx - 24, gy - 10, gx - 18, gy); c.lineTo(gx + 18, gy); c.bezierCurveTo(gx + 24, gy - 10, gx + 16, gy - 30, gx + 13, gy - 50); c.bezierCurveTo(gx + 10, gy - 66, gx + 24, gy - 70, gx + 26, gy - 110); c.closePath(); };
    c.save(); tulip(); c.clip();
    c.fillStyle = P.vgrad(c, 0, gy - 100, 0, gy, [[0, "#d86a1a"], [.5, "#a8320a"], [1, "#5a1404"]]); c.fillRect(gx - 30, gy - 98, 60, 100);
    c.fillStyle = "rgba(255,200,120,.5)"; c.fillRect(gx - 22, gy - 98, 6, 90);
    c.restore();
    c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 2; tulip(); c.stroke();
    P.glow(c, gx, gy - 60, 80, "#ff9a3a", .25);
    P.steam(c, gx, gy - 120, t, .9, 3, .3);
  };

  // Sümela: a sheer, vertical rock wall rising out of dark forest; high on it, in a shadowed recess,
  // a small many-storeyed monastery facade of pale stone and wooden balconies.
  function sumela(c, X, top, bot, m, t) {
    if (!m.sum) {
      const R = rng(404), L = [], Rt = [], tp = [];
      for (let i = 0; i <= 14; i++) { const v = i / 14; L.push([X - 250 - 30 * noise(i * .9) + v * 40, lerp(bot, top + 40, v)]); Rt.push([X + 250 + 26 * noise(i * .8 + 4) - v * 40, lerp(bot, top + 70, v)]); }
      for (let i = 0; i <= 18; i++) tp.push([lerp(X - 210, X + 210, i / 18), top + 20 * noise(i * .7 + 2) + (i % 3 ? 0 : 10)]);
      const cracks = Array.from({ length: 22 }, () => { const x0 = lerp(X - 220, X + 220, R()); return [x0, lerp(top + 20, bot - 120, R()), lerp(60, 260, R()), (R() - .5) * 14]; });
      const strata = Array.from({ length: 12 }, () => [lerp(X - 220, X + 220, R()), lerp(top + 30, bot - 60, R()), lerp(20, 60, R())]);
      const trees = Array.from({ length: 40 }, (_, i) => [lerp(X - 210, X + 210, i / 39) + (R() - .5) * 10, R()]);
      m.sum = { L, Rt, tp, cracks, strata, trees };
    }
    const S = m.sum;
    // the wall, lit flat from the misty sky, darker toward its right edge
    c.fillStyle = P.vgrad(c, X - 180, 0, X + 200, 0, [[0, "#7a7c74"], [.25, "#8a8a80"], [.6, "#5e6058"], [1, "#3a3c36"]]);
    c.beginPath(); S.L.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); S.tp.forEach(p => c.lineTo(p[0], p[1])); for (let i = S.Rt.length - 1; i >= 0; i--) c.lineTo(S.Rt[i][0], S.Rt[i][1]); c.closePath(); c.fill();
    // vertical sheets and cracks of the rock face
    c.fillStyle = "rgba(255,255,245,.07)"; c.beginPath(); for (const [sx, sy, w] of S.strata) c.rect(sx, sy, w * .4, bot - sy); c.fill();
    c.strokeStyle = "rgba(24,26,22,.45)"; c.lineWidth = 1.6; c.beginPath();
    for (const [cx0, cy0, l, d] of S.cracks) { c.moveTo(cx0, cy0); c.quadraticCurveTo(cx0 + d, cy0 + l * .5, cx0 + d * .4, cy0 + l); } c.stroke();
    c.fillStyle = "rgba(20,22,18,.3)"; c.fillRect(X + 150, top + 70, 90, bot - top);
    // forest clinging to the top edge
    c.fillStyle = "#1e3a26"; c.beginPath();
    for (const [tx, r] of S.trees) { const ty = yAt(S.tp, Math.min(X + 210, Math.max(X - 210, tx))) + 6, h = 22 + r * 30; c.moveTo(tx - 8 - r * 4, ty + 4); c.lineTo(tx, ty - h); c.lineTo(tx + 8 + r * 4, ty + 4); }
    c.fill();
    // the recess: an overhang casting deep shadow
    const mx = X - 10, my = top + 200, q = .62;
    c.fillStyle = "#24241d"; c.beginPath(); c.moveTo(mx - 95, my + 34); c.bezierCurveTo(mx - 104, my - 56, mx - 48, my - 96, mx + 8, my - 94); c.bezierCurveTo(mx + 72, my - 94, mx + 112, my - 48, mx + 100, my + 34); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,250,235,.12)"; c.fillRect(mx - 110, my + 34, 220, 4);
    // the monastery: storeys of pale walls, rows of small windows, wooden balconies, red-brown roofs
    const walls = [[-95, 30, 70, 120], [-30, 0, 120, 150], [85, 20, 40, 100]].map(w => w.map(v => v * q));
    for (const [dx, dy, w, h] of walls) {
      const x0 = mx + dx, y1 = my + 40 - dy;
      c.fillStyle = P.vgrad(c, x0, 0, x0 + w, 0, [[0, "#f4ecda"], [1, "#c8bca2"]]); c.fillRect(x0, y1 - h, w, h);
      c.fillStyle = "#8a4a32"; c.beginPath(); c.moveTo(x0 - 4, y1 - h); c.lineTo(x0 + w * .5, y1 - h - 12); c.lineTo(x0 + w + 4, y1 - h); c.fill();
      c.fillStyle = "#2a1e16"; c.beginPath();
      for (let r = 0; r < Math.floor(h / 19); r++) for (let k = 0; k < Math.floor(w / 9); k++) archPath(c, x0 + 5 + k * 9, y1 - 6 - r * 19, 3.4, 8);
      c.fill();
      c.fillStyle = "#5a3820"; for (let r = 1; r < Math.floor(h / 19); r++) c.fillRect(x0 - 2, y1 - r * 19 + 2, w + 4, 2);
    }
    c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(mx - 70, my - 70, 150, 26);
    P.glow(c, mx, my - 40, 120, "#fff4dc", .1);
    // forested shoulders of the mountain pressing in on both sides
    c.fillStyle = "#1c3424"; c.beginPath();
    for (const d of [-1, 1]) {
      const x0 = X + d * 200, y0 = top + 170; c.moveTo(x0, y0);
      for (let i = 1; i <= 22; i++) { const xx = x0 + d * i * 20, yy = y0 + i * 13 + 10 * noise(i + d * 3); c.lineTo(xx - d * 10, yy - 26 - (i * 17 % 22)); c.lineTo(xx, yy); }
      c.lineTo(x0 + d * 440, bot + 600); c.lineTo(x0, bot + 600); c.closePath();
    }
    c.fill();
    // dark conifers crowding the foot of the wall
    c.fillStyle = "#16301e"; c.beginPath();
    for (let i = 0; i < 20; i++) { const tx = X - 280 + i * 28 + (i * 37 % 13), ty = bot - 10 - (i * 53 % 40), h = 90 + (i * 29 % 70); c.moveTo(tx - 16, ty + 40); c.lineTo(tx - 9, ty - h * .4); c.lineTo(tx - 13, ty - h * .4); c.lineTo(tx, ty - h); c.lineTo(tx + 13, ty - h * .4); c.lineTo(tx + 9, ty - h * .4); c.lineTo(tx + 16, ty + 40); }
    c.fill();
  }

  /* 11. Erzurum: snow falling at night, the twin minarets, warm windows */
  C.erzurum = (x) => {
    const { c, W, H, t, u, m } = x, hz = 280, V = view(x);
    if (!m.i) {
      m.i = 1; m.sf = P.snowSet(5, 80); m.sn = P.snowSet(9, 50).map(f => ({ ...f, s: f.s * 1.8, sp: f.sp * 1.3 }));
      m.mt = profile(29, V.l - 40, V.r + 40, 40, 160, (v) => .5 + .5 * Math.sin(v * 4 + 1), 50, .2);
      const R = rng(37); m.hs = [];
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) m.hs.push({ x: side * (330 + i * 120) + (side < 0 ? -110 : 0), w: 110, h: 120 + R() * 70, lit: [R() < .7, R() < .6, R() < .5, R() < .7] });
    }
    sky(x, hz, [[0, "#0a1024"], [.6, "#1c2644"], [1, "#3a4462"]]);
    x.stage();
    mountain(c, m.mt, hz, "#2a3452", "rgba(200,212,236,.55)", -20, 4, 60);
    haze(x, 80, 90, "#8a96b8", .3);
    x.full(); P.snow(c, m.sf, W, H, t, .45);
    // houses with warm windows either side
    x.stage();
    for (const hs of m.hs) {
      const b = hz + 40;
      c.fillStyle = "#141a2a"; c.fillRect(hs.x, b - hs.h, hs.w, hs.h + 300);
      c.fillStyle = "#e8eef8"; c.beginPath(); c.moveTo(hs.x - 8, b - hs.h); c.lineTo(hs.x + hs.w / 2, b - hs.h - 40); c.lineTo(hs.x + hs.w + 8, b - hs.h); c.lineTo(hs.x + hs.w + 8, b - hs.h + 8); c.lineTo(hs.x - 8, b - hs.h + 8); c.fill();
      hs.lit.forEach((on, j) => {
        const wx = hs.x + 16 + (j % 2) * 50, wy = b - hs.h + 30 + ((j / 2) | 0) * 56;
        if (on) { c.fillStyle = P.vgrad(c, 0, wy, 0, wy + 34, [[0, "#ffd59a"], [1, "#ff9a4a"]]); c.fillRect(wx, wy, 30, 34); P.glow(c, wx + 15, wy + 17, 70, "#ffa04a", .3 + .05 * noise(t + j)); }
        else { c.fillStyle = "#0a0e18"; c.fillRect(wx, wy, 30, 34); }
        c.fillStyle = "#e8eef8"; c.fillRect(wx - 3, wy + 34, 36, 5);
      });
    }
    // Çifte Minareli Medrese: the great portal, its twin fluted brick minarets
    const X = 0, B = hz + 40;
    P.glow(c, X, B - 120, 520, "#ffb35a", .26);
    c.fillStyle = P.vgrad(c, 0, B - 230, 0, B, [[0, "#4a3a3a"], [1, "#a07a5a"]]); c.fillRect(X - 280, B - 200, 560, 200);
    c.fillStyle = P.vgrad(c, 0, B - 330, 0, B, [[0, "#5a4440"], [1, "#d0a070"]]); c.fillRect(X - 110, B - 330, 220, 330);
    c.fillStyle = "#1a1212"; c.beginPath(); archPath(c, X, B, 120, 260); c.fill();
    c.strokeStyle = "rgba(255,210,150,.35)"; c.lineWidth = 2; c.beginPath();
    for (let r = 0; r < 4; r++) for (let i = -2; i <= 2; i++) archPath(c, X + i * 22, B - 190 + r * 14, 18, 14);
    c.stroke();
    c.strokeStyle = "rgba(60,30,20,.6)"; c.lineWidth = 3; c.beginPath(); c.rect(X - 96, B - 316, 192, 316); c.rect(X - 82, B - 300, 164, 300); c.stroke();
    for (const mx of [-82, 82]) {
      const top = B - 640, w = 50;
      c.fillStyle = P.vgrad(c, X + mx - w / 2, 0, X + mx + w / 2, 0, [[0, "#7a4a32"], [.5, "#c87a4a"], [1, "#5a3020"]]);
      c.fillRect(X + mx - w / 2, top, w, B - 330 - top);
      c.strokeStyle = "rgba(40,20,14,.5)"; c.lineWidth = 2; c.beginPath(); for (let i = -2; i <= 2; i++) { c.moveTo(X + mx + i * 9, top); c.lineTo(X + mx + i * 9, B - 330); } c.stroke();
      c.fillStyle = "#2a8a8a"; c.fillRect(X + mx - w / 2, top + 120, w, 10); c.fillRect(X + mx - w / 2, top + 200, w, 6);
      c.fillStyle = "#3a2a28"; c.fillRect(X + mx - w * .6, B - 342, w * 1.2, 14);
      c.fillStyle = "#eef2fa"; c.beginPath(); c.ellipse(X + mx, top, w * .55, 8, 0, PI, 0); c.fill(); c.fillRect(X + mx - w * .6, B - 346, w * 1.2, 5);
    }
    c.fillStyle = "#eef2fa"; c.fillRect(X - 284, B - 206, 568, 7); c.fillRect(X - 114, B - 336, 228, 7);
    // the street: fresh snow, pools of lamplight
    below(x, hz + 40, [[0, "#c8d0e0"], [.4, "#8a94b0"], [1, "#2a3048"]]);
    x.stage();
    for (const lx of [-230, 230]) {
      c.fillStyle = "#0e121c"; c.fillRect(lx - 3, B - 170, 6, 200);
      P.glow(c, lx, B - 176, 150, "#ffc27a", .45); c.fillStyle = "#fff0c8"; c.beginPath(); c.arc(lx, B - 176, 7, 0, 7); c.fill();
      c.fillStyle = "rgba(255,200,130,.25)"; c.beginPath(); c.ellipse(lx, B + 50, 140, 24, 0, 0, 7); c.fill();
    }
    c.fillStyle = "rgba(255,190,120,.18)"; c.beginPath(); c.ellipse(X, B + 70, 260, 36, 0, 0, 7); c.fill();
    x.full(); P.snow(c, m.sn, W, H, t, .85);
  };

  /* 12. Kars: the castle above a white, silent town; the stone bridge */
  C.kars = (x) => {
    const { c, W, H, t, u, m } = x, hz = 80, V = view(x);
    if (!m.i) {
      m.i = 1; m.sf = P.snowSet(15, 70);
      m.hill = profile(41, -560, 320, 120, 380, (v) => Math.pow(Math.sin(v * PI), .9) * (v < .5 ? 1 : .9), 40, .08);
      const R = rng(55); m.town = Array.from({ length: 30 }, (_, i) => ({ x: lerp(V.l, V.r, i / 30) + R() * 20, y: 150 + R() * 90, w: 50 + R() * 40, h: 34 + R() * 34, lit: R() }));
      m.town.sort((a, b) => a.y - b.y);
    }
    const dim = smooth(0, 1, u);
    sky(x, hz, [[0, mix("#2a2a4e", "#181a36", dim)], [.6, mix("#7a6a90", "#4a4a70", dim)], [1, mix("#e8c0c0", "#a08aa8", dim)]]);
    ridge(x, hz, 60, 2.2, "#8a86a8", 1.8);
    ridge(x, hz + 30, 40, 5.1, "#c8c8dc", 2.2);
    haze(x, hz + 20, 60, "#e8d8e0", .35);
    // the castle hill: dark rock, snow in its folds, walls and towers along the crest
    x.stage();
    fillProfile(c, m.hill, 400, P.vgrad(c, -560, 0, 320, 0, [[0, "#f2eef6"], [.45, "#c8c4dc"], [1, "#7a7898"]]));
    // dark basalt breaking through the snow: crags under the walls, ribs down the slope
    c.fillStyle = P.vgrad(c, -560, 0, 320, 0, [[0, "#4a4258"], [1, "#1e1a28"]]); c.beginPath();
    for (let i = 0; i < 16; i++) {
      const X = -470 + i * 50 + (i * 23 % 17), top = yAt(m.hill, X) + 4, L = 40 + (i * 37 % 70), w = 14 + (i * 13 % 18);
      c.moveTo(X - w, top + 2); c.lineTo(X + w * .6, top); c.lineTo(X + w * .9 + (X < -120 ? -8 : 8), top + L * .6); c.lineTo(X + (X < -120 ? -14 : 14), top + L); c.lineTo(X - w * .5, top + L * .5); c.closePath();
    }
    c.fill();
    const wall = "#2a2432";
    c.fillStyle = wall; c.beginPath();
    for (let i = 0; i <= 26; i++) { const X = -400 + i * 18, Y = yAt(m.hill, X) - 30; c.rect(X, Y, 18, 36); if (i % 2) c.rect(X + 4, Y - 8, 10, 8); }
    for (const tx of [-380, -240, -110, 20]) { const Y = yAt(m.hill, tx) - 70; c.rect(tx - 22, Y, 44, 80); for (let k = 0; k < 3; k++) c.rect(tx - 22 + k * 17, Y - 10, 10, 10); }
    c.fill();
    c.fillStyle = "#eceef8"; c.beginPath();
    for (const tx of [-380, -240, -110, 20]) { const Y = yAt(m.hill, tx) - 70; c.rect(tx - 22, Y, 44, 4); }
    for (let i = 0; i <= 26; i++) { const X = -400 + i * 18; c.rect(X, yAt(m.hill, X) - 30, 18, 3); }
    c.fill();
    c.fillStyle = "#d0c8c0"; const fpx = -110, fpy = yAt(m.hill, -110) - 70; c.fillRect(fpx - 1, fpy - 70, 2.5, 70);
    flag(c, fpx + 1.5, fpy - 68, 46, 30, t, .8);
    // the Kümbet church-mosque with its conical roof, and the town below in the snow
    for (const hs of m.town) {
      c.fillStyle = P.vgrad(c, hs.x, 0, hs.x + hs.w, 0, [[0, "#6a6070"], [1, "#3a3444"]]); c.fillRect(hs.x, hs.y - hs.h, hs.w, hs.h + 40);
      c.fillStyle = "#f0f2fa"; c.beginPath(); c.moveTo(hs.x - 5, hs.y - hs.h + 4); c.lineTo(hs.x + hs.w * .5, hs.y - hs.h - 18); c.lineTo(hs.x + hs.w + 5, hs.y - hs.h + 4); c.fill();
      if (hs.lit < .3 + .4 * dim) { c.fillStyle = "#ffcf8a"; c.fillRect(hs.x + hs.w * .3, hs.y - hs.h * .55, 9, 12); P.glow(c, hs.x + hs.w * .3 + 4, hs.y - hs.h * .5, 34, "#ffa04a", .3); }
    }
    const kx = 330, kb = 170;
    c.fillStyle = P.vgrad(c, kx - 50, 0, kx + 50, 0, [[0, "#8a7a80"], [1, "#3a3040"]]); c.fillRect(kx - 70, kb - 70, 140, 70); c.fillRect(kx - 34, kb - 140, 68, 70);
    c.fillStyle = "#eef0f8"; c.beginPath(); c.moveTo(kx - 40, kb - 140); c.lineTo(kx, kb - 210); c.lineTo(kx + 40, kb - 140); c.fill();
    c.fillStyle = "#e8eaf4"; c.fillRect(kx - 74, kb - 74, 148, 6);
    c.fillStyle = "#1a1620"; c.beginPath(); for (let i = -1; i <= 1; i++) archPath(c, kx + i * 18, kb - 92, 8, 30); c.fill();
    // the snowy bank and the river
    below(x, 236, [[0, "#e4e6f0"], [1, "#b0b4c8"]]);
    x.stage();
    const wy = 380;
    c.fillStyle = P.vgrad(c, 0, 262, 0, V.b, [[0, "#6a6c88"], [.2, "#3a3e58"], [1, "#0e1020"]]); c.fillRect(V.l, 262, V.r - V.l, V.b - 262);
    c.fillStyle = "#eef0f8"; c.beginPath(); c.moveTo(V.l, 262); for (let i = 0; i <= 16; i++) c.lineTo(lerp(V.l, V.r, i / 16), 258 + 6 * noise(i * 1.3)); c.lineTo(V.r, 268); c.lineTo(V.l, 268); c.fill();
    // the stone bridge and its reflection, three arches making three rings
    const br = (alpha, flip) => {
      c.save(); if (flip) { c.translate(0, wy * 2); c.scale(1, -1); }
      c.fillStyle = flip ? rgba("#2a2638", alpha) : P.vgrad(c, 0, 280, 0, wy, [[0, "#8a7a78"], [1, "#4a4048"]]);
      c.beginPath(); c.rect(-330, 286, 660, wy - 286);
      for (const ax of [-190, 0, 190]) { c.moveTo(ax + 72, wy); c.arc(ax, wy, 72, 0, PI, true); c.closePath(); }
      c.fill("evenodd"); c.restore();
    };
    br(.55, true); br(1, false);
    c.fillStyle = "#f2f4fa"; c.fillRect(-338, 278, 676, 10);
    c.strokeStyle = "rgba(30,24,30,.35)"; c.lineWidth = 2; c.beginPath(); for (const ax of [-190, 0, 190]) c.arc(ax, wy, 80, PI, 0); c.stroke();
    c.fillStyle = "rgba(220,230,255,.25)"; c.beginPath(); for (let i = 0; i < 8; i++) { const Y = wy + 30 + i * 22, w2 = 60 + Math.sin(t + i) * 30; c.rect(-300 + (i * 97) % 520, Y, w2, 1.5); } c.fill();
    x.full(); P.snow(c, m.sf, W, H, t * .7, .8);
  };

  /* 13. Van: the endless blue lake, Akdamar on its island, Süphan beyond */
  C.van = (x) => {
    const { c, W, H, t, u, m } = x, hz = 40, V = view(x);
    if (!m.i) {
      m.i = 1;
      m.mt = profile(61, V.l - 60, V.r + 60, hz, 340, (v, X) => .14 + .86 * Math.exp(-Math.pow((X - 260) / 260, 2)) * (1 - .08 * Math.abs(Math.sin(X * .02))), 80, .06);
      m.lo = profile(62, V.l - 60, V.r + 60, hz, 90, (v) => .4 + .6 * Math.abs(Math.sin(v * 6)), 60, .2);
      m.sp = shimmerSet(73, 150, [V.l, hz + 4, V.r, V.b]);
      m.gl = gullsSet(24, 6, -400, -60);
      m.isl = profile(63, -380, 60, 210, 120, (v) => Math.pow(Math.sin(v * PI), .8), 30, .25);
    }
    const morn = smooth(0, 1, u);
    sky(x, hz, [[0, mix("#4a88c8", "#3a80d0", morn)], [.6, mix("#a0c4e8", "#90c0ec", morn)], [1, mix("#f4e4d0", "#e8f0f4", morn)]]);
    x.full(); P.glow(c, x.sx(-380), x.sy(-430), x.S * .8, "#fff6e0", .4);
    // Süphan, the great snow volcano, and the lower ranges
    x.stage();
    mountain(c, m.mt, hz + 2, P.vgrad(c, 0, hz - 340, 0, hz, [[0, "#8a9ac0"], [1, "#a8b8d4"]]), P.vgrad(c, 100, 0, 420, 0, [[0, "#ffffff"], [1, "#c8d4ec"]]), hz - 200, 2, 60);
    facets(c, m.mt, hz + 2, 260, "rgba(80,100,150,.18)", 3, 200, 4);
    mountain(c, m.lo, hz + 2, "#8a9ab8", "#e8eef8", hz - 70, 5, 40);
    haze(x, hz - 10, 40, "#e8eef4", .55);
    // the lake: every blue there is
    below(x, hz, [[0, "#8ab8e0"], [.04, "#2a78c8"], [.4, "#1460b0"], [1, "#0a3a80"]]);
    x.full(); P.reflections(c, [{ x: x.sx(-380), c: "#fff8e8", a: .45, w: x.S * .05 }], x.sy(hz) + 2, H, t, W);
    x.stage();
    shimmer(c, m.sp, t, "#c8e8ff", .3); sparkle(c, m.sp, t, "#ffffff", .9);
    // the island and the church of the Holy Cross, sandstone warm in the morning
    c.save(); c.translate(0, 420); c.scale(1, -1); fillProfile(c, m.isl, 210, "rgba(10,40,90,.4)"); c.restore();
    fillProfile(c, m.isl, 212, P.vgrad(c, -380, 0, 60, 0, [[0, "#c8a07a"], [.6, "#8a7058"], [1, "#4a3a34"]]));
    c.fillStyle = "#5a7a3a"; c.beginPath();
    for (let i = 0; i < 12; i++) { const X = -340 + i * 34, Y = yAt(m.isl, X) + 10; c.moveTo(X + 16, Y); c.ellipse(X, Y, 16, 10, 0, 0, 7); } c.fill();
    c.fillStyle = "#f4c8d8"; c.beginPath();
    for (let i = 0; i < 26; i++) { const X = -350 + i * 15, Y = yAt(m.isl, X) + 4 + (i % 3) * 5; c.rect(X, Y, 3, 3); } c.fill();
    const X = -150, B = yAt(m.isl, -150) + 22;
    c.fillStyle = P.vgrad(c, X - 70, 0, X + 70, 0, [[0, "#f0b88a"], [.55, "#c08060"], [1, "#6a4038"]]);
    c.fillRect(X - 70, B - 70, 140, 70); c.fillRect(X - 40, B - 100, 80, 30);
    c.beginPath(); c.moveTo(X - 76, B - 70); c.lineTo(X - 40, B - 96); c.lineTo(X + 40, B - 96); c.lineTo(X + 76, B - 70); c.fill();
    c.fillRect(X - 24, B - 150, 48, 54);
    c.fillStyle = "#7a4a3a"; c.beginPath(); c.moveTo(X - 28, B - 150); c.lineTo(X, B - 196); c.lineTo(X + 28, B - 150); c.fill();
    c.strokeStyle = "rgba(90,50,40,.45)"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(X - 70, B - 40); c.lineTo(X + 70, B - 40); c.moveTo(X - 24, B - 126); c.lineTo(X + 24, B - 126); c.stroke();
    c.fillStyle = "#3a2420"; c.beginPath(); archPath(c, X - 8, B - 104, 6, 16); archPath(c, X + 8, B - 104, 6, 16); archPath(c, X - 40, B - 10, 8, 22); archPath(c, X + 40, B - 10, 8, 22); c.fill();
    c.strokeStyle = "rgba(255,240,220,.6)"; c.lineWidth = 2; c.beginPath(); c.moveTo(X - 28, B - 150); c.lineTo(X, B - 196); c.stroke();
    // a little white boat
    const bx = lerp(200, 40, u), by = 300 + Math.sin(t * 1.3) * 2;
    c.fillStyle = "#f4f4f8"; c.beginPath(); c.moveTo(bx - 40, by - 8); c.lineTo(bx + 44, by - 10); c.lineTo(bx + 30, by); c.lineTo(bx - 34, by); c.fill();
    c.fillStyle = "#c83a2a"; c.fillRect(bx - 34, by - 3, 64, 3); c.fillStyle = "#e8e8f0"; c.fillRect(bx - 10, by - 22, 24, 12);
    c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx + 46, by - 2); c.lineTo(bx + 110, by + 4); c.moveTo(bx + 44, by + 1); c.lineTo(bx + 100, by + 12); c.stroke();
    // the near shore
    const sy0 = Math.max(470, V.b - 110);
    c.fillStyle = P.vgrad(c, 0, sy0 - 60, 0, V.b, [[0, "#4a4440"], [1, "#16141a"]]); c.beginPath(); c.moveTo(V.l, sy0 + 10);
    for (let i = 0; i <= 20; i++) c.lineTo(lerp(V.l, V.r, i / 20), sy0 - 30 * noise(i * 1.1 + 2) - (i < 6 ? 40 : 0)); c.lineTo(V.r, V.b); c.lineTo(V.l, V.b); c.fill();
    c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); for (let i = 0; i < 8; i++) { const X2 = V.l + i * 140 + Math.sin(t + i) * 10; c.moveTo(X2 + 40, sy0 - 8); c.ellipse(X2, sy0 - 8 + (i % 2) * 6, 40, 2.5, 0, 0, 7); } c.fill();
    gulls(c, m.gl, V, t, "rgba(40,50,70,.8)");
  };

  /* 14. Gaziantep: the copper bazaar at night, lanterns, a tray of baklava */
  C.gaziantep = (x) => {
    const { c, W, H, t, u, m } = x, V = view(x), vy = -60;
    if (!m.i) { m.i = 1; m.bk = P.bokehSet(17, 26, [-160, -200, 160, 40], [4, 16], ["#ffb35a", "#ffd59a", "#ff7a3a"]); }
    x.full(); P.fillAll(c, W, H, [[0, "#1a0e08"], [.5, "#2e1a0c"], [1, "#140a06"]]);
    x.stage();
    P.glow(c, 0, vy, 520, "#ffa04a", .4);
    P.bokeh(c, m.bk, t, 4);
    const lantColors = ["#d83a3a", "#3a8ad8", "#f0b030", "#2aa878", "#a83ad8"];
    for (let z = 7; z >= 1; z--) {
      const s = 1 / z, s2 = 1 / (z + 1), hw = 520 * s, fl = vy + 600 * s, sp = vy - 120 * s, ap = vy - 560 * s;
      const hw2 = 520 * s2, fl2 = vy + 600 * s2, sp2 = vy - 120 * s2;
      const shade = mix("#b07a4a", "#2a1a10", 1 - Math.pow(1 - s, 2) * .2 - s * .8 + .2);
      // side walls between this arch and the next one back, each with a lit shop front
      for (const d of [-1, 1]) {
        c.fillStyle = mix("#3a2414", "#140a06", s); c.beginPath(); c.moveTo(d * hw, fl); c.lineTo(d * hw, sp); c.lineTo(d * hw2, sp2); c.lineTo(d * hw2, fl2); c.fill();
        // the shop front: a warm interior, shelves, copper stacked and hanging
        const L = (v, yy) => [d * lerp(hw, hw2, v), lerp(yy[0], yy[1], v)], f0 = [fl - 6 * s, fl2 - 6 * s2], c0 = [sp + 70 * s, sp2 + 70 * s2];
        const q = [L(.1, f0), L(.1, c0), L(.92, c0), L(.92, f0)];
        c.fillStyle = P.vgrad(c, 0, c0[0], 0, f0[0], [[0, mix("#c8783a", "#6a3010", s * .6)], [1, mix("#ffb466", "#a85a20", s * .6)]]);
        c.beginPath(); q.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.fill();
        c.strokeStyle = "rgba(40,16,6,.6)"; c.lineWidth = Math.max(1, 4 * s); c.beginPath();
        for (const h of [.3, .55, .78]) { const a1 = L(.1, [lerp(c0[0], f0[0], h), lerp(c0[1], f0[1], h)]), a2 = L(.92, [lerp(c0[0], f0[0], h), lerp(c0[1], f0[1], h)]); c.moveTo(a1[0], a1[1]); c.lineTo(a2[0], a2[1]); }
        c.stroke();
        const cu = [], hi = [];
        for (const h of [.3, .55, .78]) for (let k = 0; k < 5; k++) {
          const v = .16 + k * .17, ss = lerp(s, s2, v), pp = L(v, [lerp(c0[0], f0[0], h), lerp(c0[1], f0[1], h)]), r = (16 + (k * 7 + z) % 3 * 5) * ss;
          cu.push([pp[0], pp[1] - r * 1.05, r * .78, r]); hi.push([pp[0] - d * r * .18, pp[1] - r * 1.25, r * .42, r * .55]);
        }
        for (let k = 0; k < 4; k++) { const v = .2 + k * .2, ss = lerp(s, s2, v), pp = L(v, c0), r = 20 * ss; cu.push([pp[0], pp[1] + 40 * ss + (k % 2) * 30 * ss, r * .8, r * .7]); hi.push([pp[0] - d * r * .2, pp[1] + 34 * ss + (k % 2) * 30 * ss, r * .3, r * .2]); }
        c.fillStyle = "#6a2a0e"; c.beginPath(); for (const [ex, ey, rx, rr] of cu) { c.moveTo(ex + rx, ey); c.ellipse(ex, ey, rx, rr, 0, 0, 7); } c.fill();
        c.fillStyle = "#c8682c"; c.beginPath(); for (const [ex, ey, rx, rr] of hi) { c.moveTo(ex + rx * 1.5, ey + rr * .3); c.ellipse(ex, ey + rr * .3, rx * 1.5, rr * 1.4, 0, 0, 7); } c.fill();
        c.fillStyle = "rgba(255,222,160,.9)"; c.beginPath(); for (const [ex, ey, rx, rr] of hi) { c.moveTo(ex - rx * .5, ey - rr * .2); c.ellipse(ex, ey, rx * .6, rr * .8, 0, PI * 1.1, PI * 1.6); c.lineTo(ex - rx * .2, ey); } c.fill();
      }
      // floor and vault of this bay
      c.fillStyle = mix("#3a2214", "#120a06", s * .6); c.beginPath(); c.moveTo(-hw, fl); c.lineTo(hw, fl); c.lineTo(hw2, fl2); c.lineTo(-hw2, fl2); c.fill();
      c.fillStyle = mix("#2a180e", "#0e0805", s * .6); c.beginPath(); c.moveTo(-hw, sp); c.quadraticCurveTo(-hw, ap, 0, ap); c.quadraticCurveTo(hw, ap, hw, sp); c.lineTo(hw2, sp2); c.quadraticCurveTo(hw2, vy - 560 * s2, 0, vy - 560 * s2); c.quadraticCurveTo(-hw2, vy - 560 * s2, -hw2, sp2); c.fill();
      // the stone arch ring
      c.fillStyle = mix("#c08a5a", "#2a1a10", s * .9); c.beginPath();
      c.moveTo(-hw - 40 * s, fl); c.lineTo(-hw - 40 * s, sp); c.quadraticCurveTo(-hw - 40 * s, ap - 50 * s, 0, ap - 50 * s); c.quadraticCurveTo(hw + 40 * s, ap - 50 * s, hw + 40 * s, sp); c.lineTo(hw + 40 * s, fl);
      c.lineTo(hw, fl); c.lineTo(hw, sp); c.quadraticCurveTo(hw, ap, 0, ap); c.quadraticCurveTo(-hw, ap, -hw, sp); c.lineTo(-hw, fl); c.closePath(); c.fill();
      c.fillStyle = rgba("#ffcf8a", .2 * (1 - s * .7)); c.fillRect(-hw - 40 * s, sp, 3, fl - sp);
      // a hanging lantern of coloured glass in each bay, swinging a little
      const lz = (s + s2) / 2, lx = Math.sin(t * .8 + z) * 6 * lz, ly = vy - 300 * lz, lr = 34 * lz;
      c.strokeStyle = "#1a0e08"; c.lineWidth = Math.max(1, 2 * lz); c.beginPath(); c.moveTo(0, vy - 540 * lz); c.lineTo(lx, ly - lr); c.stroke();
      P.glow(c, lx, ly, lr * 5, "#ffb35a", .35);
      for (let k = 0; k < 6; k++) {
        c.fillStyle = lantColors[(k + z) % 5]; c.beginPath(); c.moveTo(lx, ly);
        c.ellipse(lx, ly, lr * .8, lr, 0, k * PI / 3 - PI / 2 + t * .2, (k + 1) * PI / 3 - PI / 2 + t * .2); c.fill();
      }
      c.fillStyle = "rgba(255,240,200,.75)"; c.beginPath(); c.ellipse(lx - lr * .2, ly - lr * .2, lr * .3, lr * .45, 0, 0, 7); c.fill();
      c.fillStyle = "#2a1408"; c.fillRect(lx - lr * .5, ly - lr * 1.1, lr, lr * .2); c.fillRect(lx - lr * .4, ly + lr * .9, lr * .8, lr * .2);
    }
    // the near walls beyond the first arch, dark, framing the alley on wide screens
    // the near walls beyond the first arch: warm stone catching the lantern light, framing the alley on wide screens
    for (const d of [-1, 1]) {
      const x0 = d < 0 ? V.l : 560, x1 = d < 0 ? -560 : V.r; if (x1 - x0 < 4) continue;
      c.fillStyle = P.vgrad(c, d * 560, 0, d * Math.max(600, Math.abs(d < 0 ? V.l : V.r)), 0, [[0, "#6a4228"], [.5, "#3e2616"], [1, "#22140a"]]);
      c.fillRect(x0, V.t, x1 - x0, V.b - V.t);
      c.strokeStyle = "rgba(20,10,4,.45)"; c.lineWidth = 2; c.beginPath();
      for (let y = Math.floor(V.t / 46) * 46, r = 0; y < V.b; y += 46, r++) { c.moveTo(x0, y); c.lineTo(x1, y); for (let X = (d < 0 ? -560 : 560) + d * (r % 2 ? 40 : 90); d < 0 ? X > x0 : X < x1; X += d * 130) { c.moveTo(X, y); c.lineTo(X, y + 46); } }
      c.stroke();
      c.strokeStyle = "rgba(255,190,120,.12)"; c.lineWidth = 2; c.beginPath();
      for (let y = Math.floor(V.t / 46) * 46 + 2; y < V.b; y += 46) { c.moveTo(x0, y); c.lineTo(x1, y); }
      c.stroke();
      // lantern bounce on the copper-warm stone
      P.glow(c, d * 600, -200, 320, "#ffa050", .35); P.glow(c, d * 620, 200, 260, "#ff8a3a", .22);
    }
    // copper pots hanging on chains near the camera, swinging gently and catching the lanterns
    const pots = [[-470, -520, -250, 46], [-400, -520, -120, 30], [470, -520, -230, 42], [410, -520, -90, 30]];
    if (V.r > 640) pots.push([680, -560, -180, 56], [780, -560, -40, 38], [-690, -560, -160, 52], [-800, -560, -10, 40]);
    c.strokeStyle = "#2a1408"; c.lineWidth = 2.5; c.beginPath();
    const pp = pots.map(([px, top, py, r], i) => { const sw = Math.sin(t * .7 + i * 1.7) * .04, bx = px + (py - top) * sw; c.moveTo(px, top); c.lineTo(bx, py - r); return [bx, py, r, sw]; });
    c.stroke();
    for (const [bx, py, r, sw] of pp) {
      c.save(); c.translate(bx, py); c.rotate(-sw);
      c.fillStyle = P.vgrad(c, -r, 0, r, 0, [[0, "#4a1a06"], [.35, "#b85a24"], [.55, "#f0a060"], [.75, "#a84a1a"], [1, "#3a1404"]]);
      c.beginPath(); c.moveTo(-r * .5, -r); c.lineTo(r * .5, -r); c.quadraticCurveTo(r * .55, -r * .7, r * .95, -r * .2); c.quadraticCurveTo(r * 1.1, r * .6, 0, r * .8); c.quadraticCurveTo(-r * 1.1, r * .6, -r * .95, -r * .2); c.quadraticCurveTo(-r * .55, -r * .7, -r * .5, -r); c.fill();
      c.fillStyle = "#3a1406"; c.fillRect(-r * .6, -r * 1.08, r * 1.2, r * .14);
      c.restore();
    }
    const opz = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
    c.fillStyle = "rgba(255,226,170,.75)"; c.beginPath();
    for (const [bx, py, r] of pp) { c.moveTo(bx - r * .1, py - r * .5); c.ellipse(bx - r * .18, py - r * .1, r * .12, r * .42, -.15, 0, 7); }
    c.fill(); c.globalCompositeOperation = opz;
    for (const [bx, py, r] of pp) P.glow(c, bx - r * .2, py - r * .1, r * 1.6, "#ffb060", .16);
    // the near floor: polished flagstones holding the lantern glow (seen in tall frames)
    if (V.b > 560) {
      c.fillStyle = P.vgrad(c, 0, 520, 0, V.b, [[0, "#4a2c18"], [.4, "#3a2214"], [1, "#1e1008"]]); c.fillRect(V.l, 535, V.r - V.l, V.b - 535);
      c.strokeStyle = "rgba(15,6,2,.5)"; c.lineWidth = 2.5; c.beginPath();
      for (let y = 560, r = 0; y < V.b; y += 40 + r * 14, r++) { c.moveTo(V.l, y); c.lineTo(V.r, y); for (let i = -6; i <= 6; i++) { const X = i * 900 / (r + 4) + (r % 2) * 450 / (r + 4); c.moveTo(X * (1 + r * .25), y); c.lineTo(X * (1 + (r + 1) * .25), y + 40 + r * 14); } }
      c.stroke();
      P.glow(c, 0, 640, 420, "#ff9a4a", .22); P.glow(c, -330, 560, 200, "#ff7a3a", .18);
    }
    // floor reflections of the lanterns
    x.full(); P.reflections(c, [{ x: x.sx(0), c: "#ffb35a", a: .4, w: 60 * x.k }, { x: x.sx(-30), c: "#d83a3a", a: .25, w: 20 * x.k }, { x: x.sx(30), c: "#3a8ad8", a: .25, w: 20 * x.k }], x.sy(140), x.sy(560), t, W);
    // the tray of baklava on a low table, and a glass of tea
    x.stage();
    c.fillStyle = "#1a0e08"; c.beginPath(); c.ellipse(80, 470, 330, 90, 0, 0, 7); c.fill();
    const tx = 80, ty = 430;
    c.fillStyle = P.vgrad(c, tx - 300, 0, tx + 300, 0, [[0, "#6a2a10"], [.4, "#e8904a"], [.6, "#ffd090"], [1, "#7a3414"]]);
    c.beginPath(); c.ellipse(tx, ty, 300, 82, 0, 0, 7); c.fill();
    c.fillStyle = "#5a2410"; c.beginPath(); c.ellipse(tx, ty - 2, 270, 70, 0, 0, 7); c.fill();
    c.save(); c.beginPath(); c.ellipse(tx, ty - 4, 262, 66, 0, 0, 7); c.clip();
    c.fillStyle = P.vgrad(c, 0, ty - 70, 0, ty + 70, [[0, "#f0b050"], [1, "#a8601a"]]); c.fillRect(tx - 270, ty - 70, 540, 140);
    c.strokeStyle = "rgba(90,40,10,.75)"; c.lineWidth = 2.5; c.beginPath();
    for (let i = -10; i <= 10; i++) { c.moveTo(tx + i * 52 - 140, ty - 80); c.lineTo(tx + i * 52 + 140, ty + 80); c.moveTo(tx + i * 52 + 140, ty - 80); c.lineTo(tx + i * 52 - 140, ty + 80); }
    c.stroke();
    c.fillStyle = "#5a9a2a"; c.beginPath();
    for (let i = -6; i <= 6; i++) for (let j = -2; j <= 2; j++) { const px = tx + i * 52 + (j % 2 ? 26 : 0), py = ty + j * 30; c.moveTo(px + 9, py); c.ellipse(px, py, 9, 4.5, 0, 0, 7); }
    c.fill();
    c.fillStyle = "rgba(255,240,200,.6)"; c.beginPath();
    for (let i = -6; i <= 6; i++) for (let j = -2; j <= 2; j++) if (Math.sin(t * 1.5 + i * 1.3 + j * 2.1) > .5) { const px = tx + i * 52 + (j % 2 ? 26 : 0) - 14, py = ty + j * 30 - 8; c.rect(px, py, 8, 1.6); }
    c.fill();
    c.restore();
    c.strokeStyle = "rgba(255,230,180,.7)"; c.lineWidth = 2; c.beginPath(); c.ellipse(tx, ty, 299, 81, 0, PI * 1.05, PI * 1.6); c.stroke();
    const gx = -330, gy = 470;
    c.fillStyle = "#e8e4dc"; c.beginPath(); c.ellipse(gx, gy, 46, 10, 0, 0, 7); c.fill();
    c.save(); c.beginPath(); c.moveTo(gx - 22, gy - 96); c.bezierCurveTo(gx - 20, gy - 60, gx - 9, gy - 56, gx - 11, gy - 42); c.bezierCurveTo(gx - 14, gy - 24, gx - 20, gy - 8, gx - 15, gy); c.lineTo(gx + 15, gy); c.bezierCurveTo(gx + 20, gy - 8, gx + 14, gy - 24, gx + 11, gy - 42); c.bezierCurveTo(gx + 9, gy - 56, gx + 20, gy - 60, gx + 22, gy - 96); c.closePath();
    c.fillStyle = P.vgrad(c, 0, gy - 84, 0, gy, [[0, "#e07a2a"], [1, "#6a1a06"]]); c.fill(); c.restore();
    P.glow(c, gx, gy - 50, 90, "#ff8a3a", .3);
    P.steam(c, gx, gy - 105, t, .8, 2, .28);
  };

  /* 15. Savaştepe: home. Olive groves in golden light, rolling hills, a bench waiting, fireflies */
  C.savastepe = (x) => {
    const { c, W, H, t, u, m } = x, hz = 40, V = view(x);
    if (!m.i) {
      m.i = 1;
      m.h1 = profile(81, V.l - 40, V.r + 40, hz, 70, (v) => .5 + .5 * Math.sin(v * 4 + .5), 60, .25);
      m.h2 = profile(82, V.l - 40, V.r + 40, hz + 70, 110, (v) => .5 + .5 * Math.sin(v * 3.2 + 2.2), 60, .2);
      m.h3 = profile(83, V.l - 40, V.r + 40, hz + 170, 120, (v) => .5 + .5 * Math.sin(v * 2.6 + 4), 60, .15);
      const R = rng(84), rows = (pts, base, n, sz) => { const out = []; for (let r = 0; r < n; r++) for (let X = V.l; X < V.r; X += sz * lerp(2.4, 4.6, R())) { if (R() < .12) continue; const top = yAt(pts, X); const Y = top + 10 + r * sz * 2.3 + (R() - .5) * sz; if (Y < base) out.push([X + (r % 2) * sz * 1.5, Y, sz * lerp(.6, 1.3, R())]); } return out; };
      m.o2 = rows(m.h2, hz + 150, 5, 5); m.o3 = rows(m.h3, hz + 300, 6, 9);
      m.tree = oliveSet(85, 18); m.tree2 = oliveSet(86, 14); m.tree3 = oliveSet(87, 12);
      m.gr = grassSet(88, 560, [V.l, 320, V.r, V.b]);
      m.ff = fliesSet(89, 26, [V.l + 40, -60, V.r - 40, 420]);
      m.mo = motesSet(90, 40, [-300, -300, 300, 300]);
      m.fl = Array.from({ length: 60 }, () => [lerp(V.l, V.r, R()), lerp(360, V.b, Math.pow(R(), .7)), R()]);
      m.vil = Array.from({ length: 12 }, () => [lerp(120, 320, R()), lerp(0, 22, R()), 10 + R() * 8]);
    }
    const set = smooth(0, 1, u), sx = -60, sunY = lerp(hz - 110, hz - 30, set);
    const hy = sky(x, hz, [[0, mix("#4a6aa0", "#3a4a88", set)], [.35, mix("#c8a8a8", "#c88a90", set)], [.72, mix("#ffc890", "#ffa870", set)], [1, mix("#fff0c0", "#ffd890", set)]]);
    x.full();
    P.glow(c, x.sx(sx), x.sy(sunY), x.S * 1.6, "#ffb060", .38);
    P.glow(c, x.sx(sx), x.sy(sunY), x.S * .4, "#fff0c0", .55);
    x.stage();
    c.fillStyle = "#fffbe8"; c.beginPath(); c.arc(sx, sunY, 34, 0, 7); c.fill();
    // a few long clouds lit from beneath
    c.fillStyle = rgba(mix("#ffd0a0", "#ff9a7a", set), .55); c.beginPath();
    for (let i = 0; i < 4; i++) { const cx0 = -400 + i * 300 + Math.sin(t * .04 + i) * 20, cy0 = -250 - i * 40 - (i % 2) * 60; c.moveTo(cx0 + 180, cy0); c.ellipse(cx0, cy0, 180 + i * 20, 8, 0, 0, 7); }
    c.fill();
    // the far hills, then the groves stepping toward us
    fillProfile(c, m.h1, hz + 200, P.vgrad(c, 0, hz - 70, 0, hz, [[0, "#b098a8"], [1, "#d8b0a0"]]));
    haze(x, hz, 40, "#ffe0b0", .55);
    x.stage();
    fillProfile(c, m.h2, hz + 400, P.vgrad(c, 0, hz - 30, 0, hz + 150, [[0, "#c8a870"], [1, "#9a8a58"]]));
    c.fillStyle = "#8e8a5a"; c.beginPath(); for (const [X, Y, r] of m.o2) { c.moveTo(X + r, Y); c.ellipse(X, Y, r, r * .7, 0, 0, 7); } c.fill();
    c.fillStyle = "rgba(255,230,170,.3)"; c.beginPath(); for (const [X, Y, r] of m.o2) { c.moveTo(X + r * .5, Y - r * .3); c.ellipse(X + r * .25, Y - r * .3, r * .5, r * .3, 0, 0, 7); } c.fill();
    // the village in the valley: white houses, red roofs, a little minaret
    for (const [X, dy, w] of m.vil) { const Y = yAt(m.h2, X) + 30 + dy; c.fillStyle = "#f4e4cc"; c.fillRect(X, Y - w * .7, w, w * .7); c.fillStyle = "#c06040"; c.beginPath(); c.moveTo(X - 2, Y - w * .7); c.lineTo(X + w / 2, Y - w * 1.05); c.lineTo(X + w + 2, Y - w * .7); c.fill(); }
    minaret(c, 230, yAt(m.h2, 230) + 50, 90, 6, "#f0e0c8", 1);
    haze(x, hz + 120, 50, "#ffd8a0", .4);
    x.stage();
    fillProfile(c, m.h3, hz + 600, P.vgrad(c, 0, hz + 50, 0, hz + 300, [[0, "#b8a058"], [1, "#6a6a30"]]));
    c.fillStyle = "#4a5228"; c.beginPath(); for (const [X, Y, r] of m.o3) { c.moveTo(X + r, Y); c.ellipse(X, Y, r, r * .72, 0, 0, 7); } c.fill();
    c.fillStyle = "rgba(255,220,150,.55)"; c.beginPath(); for (const [X, Y, r] of m.o3) { c.moveTo(X + r * .1, Y - r * .35); c.ellipse(X - r * .2, Y - r * .35, r * .55, r * .3, 0, 0, 7); } c.fill();
    c.fillStyle = "rgba(60,50,20,.3)"; c.beginPath(); for (const [X, Y, r] of m.o3) { c.moveTo(X + r * 1.4, Y + r * .7); c.ellipse(X + r * .4, Y + r * .7, r, r * .2, 0, 0, 7); } c.fill();
    // sunbeams
    rays(c, sx, sunY, 11, 1500, 2.4, PI / 2, "#ffe0a0", .07, t, 5);
    // the meadow
    below(x, 300, [[0, "#8a8a3a"], [.25, "#5a5a24"], [1, "#1e1c0c"]]);
    x.stage();
    c.fillStyle = mix("#9a9440", "#8a7a38", set); c.beginPath(); c.moveTo(V.l, 300);
    for (let i = 0; i <= 20; i++) c.lineTo(lerp(V.l, V.r, i / 20), 300 - 26 * Math.sin(i / 20 * PI * 1.3 + .4)); c.lineTo(V.r, 340); c.lineTo(V.l, 340); c.fill();
    // two olives on the near slope, and the great old one over the bench
    olive(c, -380, 300, .9, m.tree2, t, ["#2a2414", "#2e3a1c", "#5e6e3c", "rgba(230,240,210,.6)", "rgba(255,214,140,.45)"], -1);
    olive(c, -520, 320, .7, m.tree3, t, ["#2a2414", "#2e3a1c", "#5e6e3c", "rgba(230,240,210,.6)", "rgba(255,214,140,.45)"], -1);
    olive(c, 360, 380, 1.9, m.tree, t, ["#1e1a10", "#26301a", "#56663a", "rgba(230,240,210,.7)", "rgba(255,210,130,.5)"], -1);
    // the bench, seen from behind, looking at the view; light through its slats
    const bx = 90, bb = 400;
    c.fillStyle = "rgba(20,14,6,.45)"; c.beginPath(); c.ellipse(bx + 20, bb + 12, 190, 22, 0, 0, 7); c.fill();
    c.fillStyle = "#1a120a";
    for (const lx of [-120, 120]) { c.fillRect(bx + lx - 7, bb - 170, 14, 170); c.fillRect(bx + lx - 4 + 12, bb - 80, 10, 80); }
    c.fillStyle = P.vgrad(c, 0, bb - 98, 0, bb - 78, [[0, "#c88a4a"], [1, "#6a3a1a"]]); c.fillRect(bx - 140, bb - 98, 280, 16);
    const slat = (y, h) => { c.fillStyle = P.vgrad(c, 0, y, 0, y + h, [[0, "#d89a58"], [.25, "#8a5428"], [1, "#4a2a12"]]); c.fillRect(bx - 150, y, 300, h); c.fillStyle = "rgba(255,230,170,.7)"; c.fillRect(bx - 150, y, 300, 2); };
    slat(bb - 176, 24); slat(bb - 142, 22); slat(bb - 110, 20);
    c.globalCompositeOperation = "lighter"; c.fillStyle = "rgba(255,210,140,.25)"; c.fillRect(bx - 150, bb - 152, 300, 10); c.fillRect(bx - 150, bb - 120, 300, 10); c.globalCompositeOperation = "source-over";
    // a single rose left on the top rail
    c.strokeStyle = "#2a3a14"; c.lineWidth = 3; c.beginPath(); c.moveTo(bx - 30, bb - 178); c.quadraticCurveTo(bx + 10, bb - 186, bx + 60, bb - 180); c.stroke();
    c.fillStyle = "#3a4a1a"; c.beginPath(); c.ellipse(bx + 20, bb - 188, 10, 5, -.4, 0, 7); c.fill();
    for (let i = 0; i < 7; i++) { const a = i * 2.4, r = 16 - i * 1.6; c.save(); c.translate(bx - 40, bb - 186); c.rotate(a); c.fillStyle = mix("#7a1020", "#d0303a", i / 7); c.beginPath(); c.ellipse(0, -r * .3, r * .75, r, 0, 0, 7); c.fill(); c.restore(); }
    P.glow(c, bx - 40, bb - 186, 50, "#ff8a6a", .2);
    // grass and wildflowers, backlit
    grass(c, m.gr, t, "#3a3a14", 2.4);
    c.fillStyle = "#c8302a"; c.beginPath(); for (const [X, Y, k] of m.fl) if (k < .45) { c.moveTo(X + 5, Y); c.ellipse(X, Y, 5, 3.5, 0, 0, 7); } c.fill();
    c.fillStyle = "#f8f0e0"; c.beginPath(); for (const [X, Y, k] of m.fl) if (k >= .45 && k < .75) { c.moveTo(X + 3.5, Y); c.arc(X, Y, 3.5, 0, 7); } c.fill();
    grass(c, m.gr.slice(0, 120), t + .5, "rgba(255,214,140,.45)", 1.2);
    motes(c, m.mo, t, "#fff0c0", .5);
    flies(c, m.ff, t, .25 + .75 * smooth(.2, .9, u));
  };

  /* ================= THE STAGES OF RECOVERY ================= */

  /* Wheelchair: dawn through a window, the light crossing the floor until it reaches the chair */
  G.wheelchair = (x) => {
    const { c, W, H, t, u, m } = x, V = view(x);
    if (!m.i) { m.i = 1; m.mo = motesSet(2, 50, [-400, -300, 300, 300]); }
    const rise = smooth(0, 1, u), reach = smooth(.2, .9, u);
    x.full(); P.fillAll(c, W, H, [[0, mix("#141018", "#2a1e1e", rise)], [1, "#08060a"]]);
    x.stage();
    c.fillStyle = mix("#1e1820", "#3a2a26", rise); c.fillRect(V.l, V.t, V.r - V.l, 250 - V.t);
    c.fillStyle = P.vgrad(c, 0, 250, 0, V.b, [[0, mix("#1a1214", "#3a2418", rise)], [1, "#0a0606"]]); c.fillRect(V.l, 250, V.r - V.l, V.b - 250);
    // the window: dawn coming up over rooftops
    const wx0 = -440, wx1 = -100, wy0 = -420, wy1 = 40;
    c.fillStyle = P.vgrad(c, 0, wy0, 0, wy1, [[0, mix("#1a2448", "#5a7ab8", rise)], [.6, mix("#5a4060", "#ffb890", rise)], [1, mix("#8a5a5a", "#ffe0b0", rise)]]);
    c.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
    const sY = lerp(wy1 + 20, -120, rise);
    P.glow(c, -230, sY, 260, "#ffd8a0", .6 * rise);
    c.fillStyle = "#140e14"; c.beginPath();
    for (let i = 0; i < 7; i++) { const rx = wx0 + i * 50, rh = 30 + ((i * 37) % 5) * 12; c.rect(rx, wy1 - rh, 46, rh); c.moveTo(rx - 4, wy1 - rh); c.lineTo(rx + 23, wy1 - rh - 16); c.lineTo(rx + 50, wy1 - rh); }
    c.rect(-190, wy1 - 70, 6, 70);
    c.fill();
    dome(c, -300, wy1 - 50, 30, "#140e14", .2); minaret(c, -250, wy1, 150, 7, "#140e14", 1);
    c.fillStyle = rgba("#ffcf8a", .7 * (1 - rise * .6)); c.beginPath(); for (let i = 0; i < 5; i++) c.rect(wx0 + 12 + i * 63, wy1 - 22 - (i % 2) * 14, 6, 8); c.fill();
    c.strokeStyle = "#0c080a"; c.lineWidth = 14; c.strokeRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
    c.lineWidth = 7; c.beginPath(); c.moveTo((wx0 + wx1) / 2, wy0); c.lineTo((wx0 + wx1) / 2, wy1); c.moveTo(wx0, -200); c.lineTo(wx1, -200); c.stroke();
    // a sheer curtain breathing, its folds catching the light
    for (let f = 0; f < 6; f++) {
      const fx = wx1 - 60 + f * 16;
      c.fillStyle = rgba("#f4e8e0", (.08 + .08 * rise) * (f % 2 ? .6 : 1.2)); c.beginPath(); c.moveTo(fx, wy0 - 20); c.lineTo(fx + 16, wy0 - 20);
      for (let i = 0; i <= 10; i++) c.lineTo(fx + 16 + Math.sin(t * .7 + i * .8 + f * .4) * 9 * (i / 10), lerp(wy0 - 20, 250, i / 10));
      for (let i = 10; i >= 0; i--) c.lineTo(fx + Math.sin(t * .7 + i * .8 + f * .4 - .3) * 9 * (i / 10), lerp(wy0 - 20, 250, i / 10));
      c.fill();
    }
    c.fillStyle = "#1a1210"; c.fillRect(wx0 - 40, wy0 - 30, wx1 - wx0 + 160, 8);
    // a plant on the sill
    c.fillStyle = "#3a2018"; c.fillRect(-380, 34, 50, 44);
    c.fillStyle = mix("#1a2a14", "#4a7a3a", rise); c.beginPath(); for (let i = 0; i < 7; i++) { const a = -PI / 2 + (i - 3) * .35 + Math.sin(t * .6 + i) * .04; c.moveTo(-355, 36); c.quadraticCurveTo(-355 + Math.cos(a) * 30, 36 + Math.sin(a) * 60, -355 + Math.cos(a) * 50, 36 + Math.sin(a) * 70); c.quadraticCurveTo(-355 + Math.cos(a) * 20, 36 + Math.sin(a) * 30, -355, 36); } c.fill();
    // the light on the floor, growing toward the chair
    const lx = lerp(-80, 260, reach);
    beam(c, [[wx0 + 40, wy1], [wx1, wy1], [lx + 160, 470], [lx - 220, 470]], "#ffc890", .28 * rise);
    beam(c, [[wx0, wy0], [wx1, wy0], [lx + 160, 470], [lx - 220, 470]], "#ffd8a8", .05 * rise);
    motes(c, m.mo, t, "#fff0d0", .45 * rise);
    wheelchair(c, 210, 430, 1.2, t, reach * rise);
  };

  // A wheelchair in profile: big wheel with spokes, caster, seat, back, push handle.
  function wheelchair(c, X, B, s, t, lit) {
    const metal = mix("#3a3640", "#e8dccc", lit), soft = mix("#14121a", "#5a4a5a", lit);
    c.save(); c.translate(X, B); c.scale(s, s);
    c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(10, 2, 150, 12, 0, 0, 7); c.fill();
    c.fillStyle = soft; c.beginPath(); c.roundRect(-70, -128, 140, 22, 6); c.fill();
    c.save(); c.translate(-62, -128); c.rotate(-.12); c.beginPath(); c.roundRect(-10, -120, 20, 120, 6); c.fill(); c.restore();
    c.strokeStyle = metal; c.lineCap = "round"; c.lineWidth = 6; c.beginPath();
    c.moveTo(-62, -106); c.lineTo(-74, -250); c.lineTo(-104, -256);
    c.moveTo(-60, -106); c.lineTo(70, -106); c.lineTo(84, -40); c.lineTo(110, -26);
    c.moveTo(-58, -170); c.lineTo(46, -170); c.lineTo(52, -106);
    c.moveTo(70, -106); c.lineTo(88, -26); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(96, -26); c.lineTo(130, -26); c.stroke();
    // the big wheel
    const wy = -84, R = 84, rot = 0;
    c.lineWidth = 9; c.strokeStyle = mix("#0c0a10", "#2a2428", lit); c.beginPath(); c.arc(-30, wy, R, 0, 7); c.stroke();
    c.lineWidth = 2.5; c.strokeStyle = metal; c.beginPath(); c.arc(-30, wy, R - 9, 0, 7); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.arc(-30, wy, R - 18, 0, 7); c.stroke();
    c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * PI * 2 + rot; c.moveTo(-30 + Math.cos(a) * 8, wy + Math.sin(a) * 8); c.lineTo(-30 + Math.cos(a + .3) * (R - 9), wy + Math.sin(a + .3) * (R - 9)); } c.stroke();
    c.fillStyle = metal; c.beginPath(); c.arc(-30, wy, 9, 0, 7); c.fill();
    c.lineWidth = 6; c.strokeStyle = mix("#0c0a10", "#2a2428", lit); c.beginPath(); c.arc(90, -16, 16, 0, 7); c.stroke();
    c.lineWidth = 3; c.strokeStyle = metal; c.beginPath(); c.moveTo(90, -16); c.lineTo(80, -50); c.stroke();
    // light catching the rims
    if (lit > .05) { c.strokeStyle = rgba("#fff0d0", .7 * lit); c.lineWidth = 2.5; c.beginPath(); c.arc(-30, wy, R - 9, -PI * .9, -PI * .45); c.stroke(); c.beginPath(); c.moveTo(-74, -250); c.lineTo(-62, -106); c.stroke(); }
    c.restore();
    P.glow(c, X - 30 * s, B - 100 * s, 260 * s, "#ffcf8a", .18 * lit);
  }

  /* Walker: a sunlit garden path, blossom falling, the walker going forward */
  G.walker = (x) => {
    const { c, W, H, t, u, m } = x, hz = -40, V = view(x);
    if (!m.i) {
      m.i = 1;
      const R = rng(7); m.pt = Array.from({ length: 34 }, () => ({ x: lerp(V.l, V.r, R()), y: R(), r: R() * 6, s: lerp(.5, 1.3, R()), sp: lerp(.04, .09, R()), ph: R() * 6 }));
      m.tr = [oliveSet(11, 16), oliveSet(12, 16), oliveSet(13, 14), oliveSet(14, 14)];
      m.gr = grassSet(15, 200, [V.l, 80, V.r, V.b]);
    }
    const morn = smooth(0, 1, u);
    sky(x, hz, [[0, "#7aa8d8"], [.7, "#d8e0e0"], [1, mix("#fff0d0", "#fff8e8", morn)]]);
    x.full(); P.glow(c, x.sx(40), x.sy(hz - 40), x.S * 1.1, "#fff0c8", .5);
    ridge(x, hz, 50, 3.3, "#a8b8a0", 2);
    below(x, hz, [[0, "#a8b860"], [.4, "#6a8a3a"], [1, "#2a3a18"]]);
    x.stage();
    // the path, narrowing to the light
    c.fillStyle = P.vgrad(c, 0, hz, 0, V.b, [[0, "#fff0d0"], [.3, "#e8c8a0"], [1, "#9a7a5a"]]);
    c.beginPath(); c.moveTo(20, hz + 2); c.lineTo(60, hz + 2); c.lineTo(420, V.b); c.lineTo(-300, V.b); c.fill();
    // blossom trees along it
    const blossom = ["#2a1a14", "#d48aa0", "#fbd0dc", null, "rgba(255,246,236,.75)"];
    olive(c, -260, 120, 1.1, m.tr[0], t, blossom, 1); olive(c, 330, 140, 1.2, m.tr[1], t, blossom, -1);
    olive(c, -120, 20, .55, m.tr[2], t, blossom, 1); olive(c, 180, 30, .6, m.tr[3], t, blossom, -1);
    // leaf shadows dappling the path
    c.fillStyle = "rgba(60,40,30,.08)"; c.beginPath(); for (let i = 0; i < 10; i++) { const X = -120 + i * 40 + Math.sin(t * .5 + i) * 8, Y = 260 + (i % 3) * 50; c.moveTo(X + 60, Y); c.ellipse(X, Y, 60, 7, 0, 0, 7); } c.fill();
    grass(c, m.gr.filter(g => g.x < -200 || g.x > 330), t, "#3a5a1e", 2.2);
    rays(c, 40, hz - 40, 9, 1300, 1.6, PI / 2, "#fff2d0", .06, t, 3);
    walker(c, 60, 400, 1.15, morn);
    // petals drifting down and forward
    for (const p of m.pt) {
      const Y = V.t + ((p.y + t * p.sp) % 1) * (V.b - V.t), X = p.x + Math.sin(t * .8 + p.ph) * 40 + t * 6;
      P.petal(c, ((X - V.l) % (V.r - V.l)) + V.l, Y, p.r + t * .6, p.s, "#f2a8b8", .9);
    }
  };

  // A walking frame seen three-quarters from behind: two side frames, a cross bar, front wheels.
  function walker(c, X, B, s, lit) {
    c.save(); c.translate(X, B); c.scale(s, s);
    c.fillStyle = "rgba(60,40,30,.3)"; c.beginPath(); c.ellipse(0, 6, 170, 18, 0, 0, 7); c.fill();
    const metal = (w, a) => { c.lineWidth = w; c.strokeStyle = a; };
    c.lineCap = "round";
    const frame = (fx, bx, ft, bt) => {
      metal(9, "#7a8088"); c.beginPath(); c.moveTo(fx, -10); c.lineTo(fx, ft); c.lineTo(bx, bt); c.lineTo(bx, 0); c.moveTo(fx, -90); c.lineTo(bx, -96); c.stroke();
      metal(3, rgba("#ffffff", .7 * lit + .2)); c.beginPath(); c.moveTo(fx - 2, -10); c.lineTo(fx - 2, ft); c.lineTo(bx - 2, bt); c.stroke();
    };
    frame(-110, -150, -220, -250); frame(110, 150, -220, -250);
    metal(9, "#6a7078"); c.beginPath(); c.moveTo(-110, -170); c.lineTo(110, -170); c.stroke();
    metal(3, rgba("#ffffff", .5 * lit + .2)); c.beginPath(); c.moveTo(-110, -173); c.lineTo(110, -173); c.stroke();
    c.fillStyle = "#2a2a30"; c.beginPath(); c.roundRect(-160, -262, 22, 50, 8); c.roundRect(138, -262, 22, 50, 8); c.fill();
    c.fillStyle = "#18181c"; for (const wx of [-110, 110]) { c.beginPath(); c.ellipse(wx, -4, 8, 18, 0, 0, 7); c.fill(); }
    c.fillStyle = "#5a5a60"; for (const wx of [-150, 150]) { c.beginPath(); c.ellipse(wx, 2, 9, 6, 0, 0, 7); c.fill(); }
    c.restore();
  }

  /* Crutches: leaning on a warm wall beside an open door full of light */
  G.crutches = (x) => {
    const { c, W, H, t, u, m } = x, V = view(x), fy = 360;
    if (!m.i) { m.i = 1; m.mo = motesSet(4, 50, [0, -400, 500, 360]); }
    const open = smooth(0, .7, u);
    x.full(); P.fillAll(c, W, H, [[0, "#2a1a12"], [1, "#0e0806"]]);
    x.stage();
    c.fillStyle = P.vgrad(c, V.l, 0, V.r, 0, [[0, "#2a1a10"], [.6, "#7a4e2a"], [1, "#a8703a"]]); c.fillRect(V.l, V.t, V.r - V.l, fy - V.t);
    c.fillStyle = P.vgrad(c, 0, fy, 0, V.b, [[0, "#5a3418"], [1, "#1a0e06"]]); c.fillRect(V.l, fy, V.r - V.l, V.b - fy);
    c.fillStyle = "#3a2210"; c.fillRect(V.l, fy - 26, V.r - V.l, 26);
    // the doorway: garden and sky beyond, and the door swung open
    const d0 = 120, d1 = 400, dt = -380;
    c.fillStyle = P.vgrad(c, 0, dt, 0, fy, [[0, "#bcd8f0"], [.55, "#fff4d8"], [.6, "#a8c070"], [1, "#6a8a3a"]]); c.fillRect(d0, dt, d1 - d0, fy - dt);
    c.fillStyle = "#4a6a2a"; c.beginPath(); c.moveTo(d0, dt + 230); for (let i = 0; i <= 10; i++) c.lineTo(d0 + i * 28, dt + 220 - 40 * noise(i * .7 + 2)); c.lineTo(d1, fy); c.lineTo(d0, fy); c.fill();
    P.glow(c, (d0 + d1) / 2, -40, 520, "#fff0c8", .45 + .2 * open);
    const sw = lerp(.15, .9, open);
    c.fillStyle = "#5a3418"; c.beginPath(); c.moveTo(d1, dt); c.lineTo(d1 + 190 * sw, dt - 30 * sw); c.lineTo(d1 + 190 * sw, fy + 40 * sw); c.lineTo(d1, fy); c.fill();
    c.strokeStyle = "#2a1a0c"; c.lineWidth = 18; c.strokeRect(d0, dt, d1 - d0, fy - dt);
    // the light pouring across the floor
    beam(c, [[d0, fy], [d1, fy], [d1 - 120, V.b], [d0 - 520, V.b]], "#ffd8a0", .35);
    beam(c, [[d0, dt], [d0 + 6, fy], [d0 - 520, fy + 60], [d0 - 520, dt + 200]], "#ffcf90", .05 + .05 * open);
    motes(c, m.mo, t, "#fff4d8", .5);
    // the crutches leaning together on the wall, their shadows thrown long
    const pair = (sh) => { crutch(c, -190 + (sh ? -70 : 0), fy + 10, -.12, sh); crutch(c, -110 + (sh ? -70 : 0), fy + 10, -.2, sh); };
    c.save(); c.transform(1, 0, -.25, 1, 0, 0); c.globalAlpha = .35; pair(true); c.restore(); c.globalAlpha = 1;
    pair(false);
  };
  // An underarm crutch: padded top, two rails, hand grip, single shaft and rubber tip.
  function crutch(c, X, B, lean, shadow) {
    c.save(); c.translate(X, B); c.rotate(lean);
    const metal = shadow ? "#1a0e06" : "#c8c8c8", hi = shadow ? "#1a0e06" : "#fff4e0";
    c.lineCap = "round"; c.strokeStyle = metal; c.lineWidth = 9;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -230); c.stroke();
    c.lineWidth = 7; c.beginPath(); c.moveTo(0, -226); c.quadraticCurveTo(-26, -360, -22, -560); c.moveTo(0, -226); c.quadraticCurveTo(26, -360, 22, -560); c.stroke();
    if (!shadow) { c.strokeStyle = hi; c.lineWidth = 2.5; c.beginPath(); c.moveTo(3, -10); c.lineTo(3, -226); c.quadraticCurveTo(28, -360, 24, -556); c.stroke(); }
    c.fillStyle = shadow ? "#1a0e06" : "#2a2a2e";
    c.beginPath(); c.roundRect(-36, -580, 72, 26, 12); c.fill();
    c.beginPath(); c.roundRect(-26, -400, 52, 14, 6); c.fill();
    c.beginPath(); c.roundRect(-8, -6, 16, 18, 4); c.fill();
    c.restore();
  }

  /* Free: an open road through golden fields, petals blowing ahead, the crutches left in the grass */
  G.free = (x) => {
    const { c, W, H, t, u, m } = x, hz = 20, V = view(x);
    if (!m.i) {
      m.i = 1;
      const R = rng(21); m.pt = Array.from({ length: 40 }, () => ({ x: lerp(V.l, V.r, R()), y: lerp(100, V.b, R()), r: R() * 6, s: lerp(.6, 1.4, R()), ph: R(), sp: lerp(.08, .16, R()), col: ["#f2a8b8", "#e86a7a", "#ffd0d8", "#c43a50"][(R() * 4) | 0] }));
      m.gr = grassSet(22, 560, [V.l, hz + 40, V.r, V.b]);
      m.fl = Array.from({ length: 80 }, () => [lerp(V.l, V.r, R()), lerp(hz + 30, V.b, Math.pow(R(), .8)), R()]);
      m.gl = gullsSet(23, 4, -360, -160);
    }
    const day = smooth(0, 1, u);
    sky(x, hz, [[0, mix("#5a86c0", "#4a90d8", day)], [.5, mix("#c8b8c0", "#b8d0e8", day)], [.85, mix("#ffd0a0", "#ffe8c0", day)], [1, mix("#fff0c8", "#fffaf0", day)]]);
    x.full(); P.glow(c, x.sx(0), x.sy(hz - 30), x.S * 1.4, "#ffe0a0", .5); P.glow(c, x.sx(0), x.sy(hz - 30), x.S * .3, "#ffffff", .6);
    ridge(x, hz, 40, 7.7, "#c0b0a8", 1.7);
    haze(x, hz, 30, "#fff0d0", .6);
    below(x, hz, [[0, "#f0d080"], [.3, "#c8a040"], [1, "#5a4a18"]]);
    x.stage();
    rays(c, 0, hz - 30, 13, 1500, 2.8, PI / 2, "#fff2d0", .06, t, 9);
    // the road running straight to the light
    c.fillStyle = P.vgrad(c, 0, hz, 0, V.b, [[0, "#fff4e0"], [.25, "#d8c0a0"], [1, "#6a5a4a"]]);
    c.beginPath(); c.moveTo(-6, hz + 1); c.lineTo(6, hz + 1); c.lineTo(340, V.b); c.lineTo(-340, V.b); c.fill();
    c.fillStyle = "rgba(255,250,235,.7)"; c.beginPath();
    for (let i = 0; i < 12; i++) { const v0 = Math.pow((i + ((t * .4) % 1)) / 12, 2), v1 = v0 + .02 + v0 * .03, y0 = lerp(hz, V.b, v0), y1 = lerp(hz, V.b, Math.min(1, v1)); c.moveTo(-1 - v0 * 6, y0); c.lineTo(1 + v0 * 6, y0); c.lineTo(1 + v1 * 6, y1); c.lineTo(-1 - v1 * 6, y1); }
    c.fill();
    // poppies and daisies
    c.fillStyle = "#d8302a"; c.beginPath(); for (const [X, Y, k] of m.fl) if (k < .4 && Math.abs(X) > (Y - hz) * .45) { const r = 2 + (Y - hz) * .012; c.moveTo(X + r, Y); c.ellipse(X, Y, r, r * .7, 0, 0, 7); } c.fill();
    c.fillStyle = "#fff8ec"; c.beginPath(); for (const [X, Y, k] of m.fl) if (k > .7 && Math.abs(X) > (Y - hz) * .45) { const r = 1.5 + (Y - hz) * .009; c.moveTo(X + r, Y); c.arc(X, Y, r, 0, 7); } c.fill();
    // the crutches, left behind in the grass
    c.save(); c.translate(-330, 430); c.rotate(-1.42); crutch(c, 0, 0, 0, false); c.restore();
    c.save(); c.translate(-280, 470); c.rotate(-1.55); crutch(c, 0, 0, 0, false); c.restore();
    grass(c, m.gr.filter(g => Math.abs(g.x) > (g.y - hz) * .4 + 10), t, "#6a5a1e", 2.2, 1.6);
    grass(c, m.gr.filter((g, i) => i % 2 && Math.abs(g.x) > (g.y - hz) * .4 + 10), t + .4, "rgba(255,230,160,.55)", 1.2, 1.6);
    gulls(c, m.gl, V, t, "rgba(60,50,60,.6)");
    // petals racing ahead toward the horizon
    for (const p of m.pt) {
      const v = (p.ph + t * p.sp) % 1, k = 1 - v;
      const X = lerp(p.x, p.x * .1, v) + Math.sin(t * 1.4 + p.r) * 30 * k, Y = lerp(p.y, hz - 60, v) - Math.sin(v * PI) * 80;
      P.petal(c, X, Y, p.r + t * 1.5, p.s * (.3 + k), p.col, Math.min(1, k * 2.5) * .95);
    }
  };

  // A painterly finish for every city: a few soft, slowly drifting blotches of warm light and cool shade,
  // like uneven layers of glaze. Cached per film, about 7 gradient fills a frame.
  Object.keys(C).forEach((name, n) => {
    const f = C[name];
    C[name] = (x) => {
      f(x);
      const { c, W, H, S, t, m } = x;
      if (!m.glz) { const R = rng(500 + n * 17); m.glz = Array.from({ length: 7 }, (_, i) => ({ x: R(), y: R(), r: lerp(.25, .55, R()), dark: i % 2, ph: R() * 6 })); }
      x.full();
      for (const b of m.glz) {
        const X = (b.x + .03 * Math.sin(t * .05 + b.ph)) * W, Y = (b.y + .02 * Math.cos(t * .04 + b.ph)) * H, r = b.r * S;
        const g = c.createRadialGradient(X, Y, 0, X, Y, r), col = b.dark ? "#2a1830" : "#fff0d8", a = b.dark ? .07 : .05;
        g.addColorStop(0, rgba(col, a)); g.addColorStop(.6, rgba(col, a * .5)); g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g; c.fillRect(X - r, Y - r, r * 2, r * 2);
      }
    };
  });
})();
