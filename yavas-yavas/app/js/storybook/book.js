/* Yavaş Yavaş storybook film player. One canvas, the city as four sliding sheets, Nesrin's silhouette,
   and the bench clip as a real video. Same captions, ticks, tap zones and mode chip as before.
   Beats: the hill · the city paints itself in watercolor · four moments as she explores, while waves of
   royal light sweep across and repaint the city, first as an anime dusk, then as night · the arrival,
   where the clip's own first frame blooms in and a gold wave turns it real · the bench clip · the proverb. */
import * as Wc from "./wash.js";
import { buildLayers, painter, reflect, W, H } from "./scene.js";
import { buildAnime } from "./anime.js";
import { figure, STRIDE, CADENCE } from "./figure.js";
const { clamp, smooth, lerp, rng } = YY;
const reduce = () => !!(window.YY && YY.reduceMotion);
const easeFilm = (t) => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };
const PAR = { sky: .12, far: .3, mid: .58, near: 1 };
// The colours a wave of change is made of: amethyst, sapphire, rose, gold and pearl.
const ROYAL = ["#7b4dff", "#3d6bff", "#ff5fa8", "#ffd27a", "#fff6e8"];

export class Book {
  constructor() {
    this.el = document.createElement("section");
    this.el.className = "cine book"; this.el.hidden = true; this.el.setAttribute("aria-live", "polite");
    this.el.innerHTML = `
      <canvas class="cine-canvas" aria-hidden="true"></canvas>
      <video class="book-video" muted playsinline preload="auto" aria-hidden="true"></video>
      <div class="cine-scrim" aria-hidden="true"></div>
      <div class="cine-top">
        <button class="round cine-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <ol class="ticks cine-ticks" aria-hidden="true"></ol>
        <div class="cine-mode"><button class="chip" aria-haspopup="true"></button><ul class="cine-modes" hidden></ul></div>
      </div>
      <button class="tap tap-back cine-back" aria-label="Back"></button>
      <button class="tap tap-next cine-next" aria-label="Next"></button>
      <div class="cine-cap"><p class="kicker"></p><h2 class="cine-title"></h2><p class="cine-text"></p></div>
      <div class="cine-end"><p class="kicker"></p><p class="cine-proverb"></p><p class="cine-trans"></p><button class="cta"></button></div>`;
    document.body.appendChild(this.el);
    const q = (s) => this.el.querySelector(s);
    this.ui = { cap: q(".cine-cap"), kick: q(".cine-cap .kicker"), title: q(".cine-title"), text: q(".cine-text"), ticks: q(".cine-ticks"),
      end: q(".cine-end"), endKick: q(".cine-end .kicker"), prov: q(".cine-proverb"), trans: q(".cine-trans"), endBtn: q(".cine-end .cta"),
      chip: q(".cine-mode .chip"), modes: q(".cine-modes") };
    this.canvas = q(".cine-canvas"); this.c = this.canvas.getContext("2d");
    this.video = q(".book-video");
    q(".cine-close").addEventListener("click", () => this.finish("closed"));
    q(".cine-next").addEventListener("click", () => this.skip(1));
    q(".cine-back").addEventListener("click", () => this.skip(-1));
    this.ui.endBtn.addEventListener("click", () => this.finish("done"));
    this.ui.chip.addEventListener("click", () => { this.ui.modes.hidden = !this.ui.modes.hidden; });
    this.ui.modes.addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (!b) return; this.ui.modes.hidden = true; this.setMode(b.dataset.mode); });
    addEventListener("keydown", (e) => {
      if (this.el.hidden) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); this.skip(1); }
      if (e.key === "ArrowLeft") this.skip(-1);
      if (e.key === "Escape") this.finish("closed");
    }, true);
    addEventListener("resize", () => { if (!this.el.hidden) this.resize(true); });
    this.cache = {};
  }

  resize(rebuild) {
    const w = this.el.clientWidth || innerWidth, h = this.el.clientHeight || innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    // stage units -> device pixels: the frame is 1000 units tall, wide screens see more of the panorama
    this.S = Math.max(this.canvas.height / H, this.canvas.width / (W * .9));
    this.view = { w: this.canvas.width / this.S, h: this.canvas.height / this.S };
    this.size = { w, h, dpr };
    if (rebuild && this.city) this.paint();
  }

  // Paint the sheets for this screen. Watercolor is soft, so the sheets need not be full retina.
  paint() {
    const k = Math.min(this.S, (Math.min(devicePixelRatio || 1, 1.25)) * this.size.h / H * 1.05);
    const key = `${this.cityId}@${k.toFixed(2)}`;
    this.L = this.cache[key] ||= buildLayers(this.city, k);
    this.hill = this.cache[key + "hill"] ||= this.paintHill(k);
    this.sk = { key, k };
    // the anime dusk and night are needed from the second moment on: paint them while the hill plays
    clearTimeout(this.pre); this.pre = setTimeout(() => { this.A; this.pre = setTimeout(() => this.N, 300); }, 600);
  }
  get A() { const { key, k } = this.sk; return this.cache[key + "A"] ||= buildAnime(this.city, k, reflect); }
  get N() { const { key, k } = this.sk; return this.cache[key + "N"] ||= buildAnime(this.city, k, reflect, true); }
  // The hill she climbs before the city: one dark wash with a bright crest.
  paintHill(k) {
    const cv = Wc.canvas(W * k, H * k), c = cv.getContext("2d"); c.scale(k, k);
    const P = painter(c, this.city.pal, this.city.seed + 90), pts = [[-50, H + 40]];
    for (let i = 0; i <= 40; i++) { const v = i / 40; pts.push([lerp(-50, W + 50, v), 760 - Math.sin(v * Math.PI) * 150 + Math.sin(v * 17) * 8]); }
    pts.push([W + 50, H + 40]);
    Wc.body(c, pts, this.city.pal.ground[1], { seed: 3, pools: 4, litA: 0, edge: 0 });
    Wc.glowLine(c, pts.slice(1, -1), this.city.pal.gold, 1.4, 10, .55);
    for (let i = 0; i < 6; i++) { const x = 300 + i * 360, b = 760 - Math.sin(x / W * Math.PI) * 150; P.wash(P.K.cypress(x, b + 6, 120 + (i % 3) * 40), this.city.pal.tree, { layers: 8, alpha: .14, spread: .25, depth: 1 }); }
    return cv;
  }
  hillY(x) { const v = (x + 50) / (W + 100); return 760 - Math.sin(v * Math.PI) * 150; }

  async play(cityId, city, data, opts) {
    this.opts = opts; this.cityId = cityId; this.city = city; this.data = data;
    this.el.hidden = false; document.body.classList.add("in-cine"); this.el.classList.remove("is-in");
    this.c.fillStyle = "#000"; this.resize(); this.c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    this.paint();
    requestAnimationFrame(() => this.el.classList.add("is-in"));
    this.video.src = data.bench; this.video.load();
    const img = (src) => { if (!src) return null; const i = new Image(); i.decoding = "async"; i.src = src; return i; };
    this.still = { anime: img(data.benchAnime), real: img(data.benchPoster) };
    this.beats = this.makeBeats();
    let acc = 0; for (const b of this.beats) { b.start = acc; acc += b.dur; }
    this.total = acc;
    this.groups = [];
    for (const b of this.beats) { if (b.join && this.groups.length) this.groups.at(-1).e = b.start + b.dur; else this.groups.push({ s: b.start, e: b.start + b.dur }); }
    this.ui.ticks.innerHTML = this.beats.filter(b => !b.join).map(() => "<li><i></i></li>").join("");
    this.renderModes();
    this.motes = Array.from({ length: 46 }, (_, i) => { const R = rng(i + 7); return { x: R(), y: R(), z: lerp(.3, 1.2, R()), s: R(), feather: R() < .3 }; });
    this.t = 0; this.cur = -1; this.paused = !!opts.hold; this.last = performance.now();
    this.ui.end.classList.remove("is-on");
    if (reduce()) { this.t = this.stillOf(0); this.paused = true; }
    return new Promise((res) => { this.resolve = res; this.raf = requestAnimationFrame(this.loop); });
  }

  makeBeats() {
    const d = this.data, L = d.L, cx = W / 2;
    const clips = d.clips || [];
    const beats = [];
    // 1. The hill
    beats.push({ dur: 8, cap: { text: L(d.text.hill) }, draw: (lt, k) => this.drawHill(lt, k) });
    // 2. The rise: the city paints itself in
    beats.push({ dur: 8, fadeIn: 0, cap: { kicker: d.kicker, title: d.name, text: L(d.text.rise) }, draw: (lt, k) => this.drawRise(lt, k) });
    // 3. Exploring: four moments along the way
    const spots = [cx - 620, cx - 200, cx + 220, cx + 640];
    clips.forEach((cl, i) => beats.push({
      dur: 6.5, join: i > 0, fadeIn: i ? 0 : .7, fadeOut: i === clips.length - 1 ? .7 : 0,
      cap: { kicker: `${i + 1} / ${clips.length}`, title: L(cl.title), text: L(cl.text) }, hand: true,
      draw: (lt, k) => this.drawWalk(spots[i] - 260, spots[i] + 40, lt / 6.5, i, lt),
    }));
    // 4. Arrival: the clip's first frame blooms in, then a gold wave turns the painting into the clip
    const benchCap = { kicker: L(d.text.benchTitle), text: L(d.text.bench) };
    beats.push({ dur: 4.6, fadeIn: 0, fadeOut: 0, cap: benchCap, draw: (lt) => this.drawArrive(lt), clean: (lt) => smooth(3.4, 4.5, lt) });
    // 5. The bench clip
    beats.push({ dur: 10.1, join: true, keepCap: true, fadeIn: 0, video: true, cap: benchCap, draw: (lt) => this.drawBench(lt) });
    // 6. The proverb
    beats.push({ dur: 9, still: 8.9, end: { kicker: d.endKicker, proverb: d.proverb, trans: d.trans, cta: d.cta }, draw: (lt, k) => this.drawEnd(lt, k) });
    return beats;
  }

  /* ---------- drawing ---------- */
  // Draw one sheet with parallax around the camera centre `cam` (near-sheet units), zoom z.
  sheet(img, f, cam, z = 1, yOff = 0, alpha = 1) {
    if (!img || alpha <= 0) return;
    const k = img.width / W, vw = this.view.w / z, vh = this.view.h / z;
    const cxf = W / 2 + (cam - W / 2) * f;
    const sx = clamp(cxf - vw / 2, 0, W - vw), sy = (H - vh) * .5 + yOff;
    const g = this.g || this.c;
    g.globalAlpha = alpha;
    g.drawImage(img, sx * k, sy * k, vw * k, vh * k, 0, 0, this.canvas.width, this.canvas.height);
    g.globalAlpha = 1;
  }
  toScreen(x, y, cam, z = 1, f = 1) {
    const vw = this.view.w / z, vh = this.view.h / z, cxf = W / 2 + (cam - W / 2) * f;
    const sx = clamp(cxf - vw / 2, 0, W - vw), sy = (H - vh) * .5;
    return [(x - sx) * this.S * z, (y - sy) * this.S * z, this.S * z];
  }
  layers(cam, z, o = {}, L = this.L) {
    this.sheet(L.sky, PAR.sky, cam, z);
    this.rays(cam);
    this.sheet(L.far, PAR.far, cam, z, 0, o.far ?? 1);
    this.sheet(L.mid, PAR.mid, cam, z, o.midY || 0, o.mid ?? 1);
  }
  // The whole city in one style, or two styles split by a wave sweeping left to right (w: 0..1).
  // `mid` draws between the city and the near sheet (the memory glow); her figure goes on top after.
  world(cam, z, st, mid) {
    const draw = (S) => { this.layers(cam, z, {}, S); mid?.(); this.sheet(S.near, PAR.near, cam, z); };
    const w = st.b ? st.w : 0;
    if (w >= 1) return draw(st.b);
    draw(st.a);
    if (w <= 0) return;
    const cw = this.canvas.width, ch = this.canvas.height;
    this.off ||= Wc.canvas(cw, ch); if (this.off.width !== cw || this.off.height !== ch) { this.off.width = cw; this.off.height = ch; }
    const o = this.off.getContext("2d");
    o.globalCompositeOperation = "source-over"; o.clearRect(0, 0, cw, ch);
    this.g = o; draw(st.b); this.g = null;
    o.globalCompositeOperation = "destination-in"; o.fillStyle = "#000"; this.wavePath(o, w, st.seed || 1, true); o.fill();
    o.globalCompositeOperation = "source-over";
    this.c.drawImage(this.off, 0, 0);
    this.waveFront(w, st.seed || 1, st.cols || ROYAL);
  }
  // The leading edge of a wave: a tilted, breathing, paint-ragged line. closed=true closes it on the left.
  wavePath(c, w, seed, closed) {
    const cw = this.canvas.width, ch = this.canvas.height, t = reduce() ? 0 : this.clock, n = 28;
    const X = lerp(-.3, 1.3, w) * cw;
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const v = i / n, y = lerp(-.05, 1.05, v) * ch;
      const x = X + (v - .5) * cw * .1 + Math.sin(v * 5 + seed + t * 1.3) * cw * .04 + Math.sin(v * 13 + seed * 3 - t * 2.1) * cw * .014 + Math.sin(v * 37 + seed) * cw * .005;
      if (closed && !i) { c.moveTo(-10, -.05 * ch); c.lineTo(x, y); } else c[i ? "lineTo" : "moveTo"](x, y);
    }
    if (closed) { c.lineTo(-10, 1.05 * ch); c.closePath(); }
  }
  waveFront(w, seed, cols) {
    const c = this.c, s = this.S, t = reduce() ? 0 : this.clock, life = Math.sin(clamp(w) * Math.PI);
    c.save(); c.globalCompositeOperation = "lighter"; c.lineJoin = "round"; c.lineCap = "round";
    [[110, cols[0], .14], [50, cols[1], .22], [20, cols[2], .34], [7, cols[3], .55], [2, cols[4], .7]].forEach(([lw, col, a], j) => {
      c.save(); c.translate(-j * 4 * s, 0); c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = lw * s * .8; c.globalAlpha = a * (.4 + .6 * life);
      c.lineWidth = lw * s; this.wavePath(c, w, seed, false); c.stroke(); c.restore();
    });
    // sparks thrown off the crest
    const R = rng(seed * 7), cw = this.canvas.width, ch = this.canvas.height, X = lerp(-.3, 1.3, w) * cw;
    for (let i = 0; i < 70; i++) {
      const v = R(), y = v * ch, ph = (R() + t * lerp(.3, .9, R())) % 1;
      const x = X + (v - .5) * cw * .1 + Math.sin(v * 5 + seed + t * 1.3) * cw * .04 - ph * lerp(40, 160, R()) * s;
      c.globalAlpha = (1 - ph) * .9 * life; c.fillStyle = cols[i % cols.length];
      c.beginPath(); c.arc(x, y - ph * 30 * s, lerp(.8, 2.6, R()) * s, 0, 6.283); c.fill();
    }
    c.restore();
  }
  // Where the clip sits on screen (the video element's box), in canvas pixels.
  clipRect() { const h = this.canvas.height, w = h * 9 / 16; return [(this.canvas.width - w) / 2, 0, w, h]; }
  drawStill(img, mask) {
    if (!img?.complete || !img.naturalWidth) return false;
    const [x, y, w, h] = this.clipRect(), cw = this.canvas.width, ch = this.canvas.height;
    this.tmp2 ||= Wc.canvas(cw, ch); if (this.tmp2.width !== cw || this.tmp2.height !== ch) { this.tmp2.width = cw; this.tmp2.height = ch; }
    const t = this.tmp2.getContext("2d");
    t.globalCompositeOperation = "source-over"; t.clearRect(0, 0, cw, ch); t.drawImage(img, x, y, w, h);
    if (w < cw) { // wide screens: the same feathered sides as the video
      const g = t.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.12, "#000"); g.addColorStop(.88, "#000"); g.addColorStop(1, "rgba(0,0,0,0)");
      t.globalCompositeOperation = "destination-in"; t.fillStyle = g; t.fillRect(0, 0, cw, ch);
    }
    if (mask) { t.globalCompositeOperation = "destination-in"; mask(t); }
    this.c.drawImage(this.tmp2, 0, 0);
    return true;
  }
  rays(cam) {
    if (reduce()) return;
    const c = this.g || this.c, t = this.clock, w = this.canvas.width, h = this.canvas.height;
    c.save(); c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const x = w * (.5 + .45 * Math.sin(t * .05 + i * 1.7)) - cam * .02 * this.S, a = .035 + .02 * Math.sin(t * .4 + i);
      const g = c.createLinearGradient(x, 0, x + w * .1, h * .8); g.addColorStop(0, Wc.rgba(this.city.pal.gold, a)); g.addColorStop(1, Wc.rgba(this.city.pal.gold, 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(x - w * .03, 0); c.lineTo(x + w * .05, 0); c.lineTo(x + w * .22, h); c.lineTo(x + w * .02, h); c.fill();
    }
    c.restore();
  }
  // Gold motes and a few drifting feathers, in front of everything.
  drawMotes(cam) {
    const c = this.c, w = this.canvas.width, h = this.canvas.height, t = reduce() ? 0 : this.clock;
    c.save();
    for (const m of this.motes) {
      const x = ((m.x * w * 1.4 - cam * m.z * this.S * .25 + t * 12 * m.z * this.S) % (w * 1.4) + w * 1.4) % (w * 1.4) - w * .2;
      const y = ((m.y * h + Math.sin(t * .6 + m.s * 9) * 18 * this.S - t * 6 * m.z * this.S) % h + h) % h;
      if (m.feather) {
        c.save(); c.translate(x, y); c.rotate(Math.sin(t * .8 + m.s * 6) * .6 + .4); c.globalAlpha = .55 * m.z;
        const L = 12 * this.S * m.z; c.fillStyle = "#fff1dc";
        c.beginPath(); c.moveTo(0, -L); c.quadraticCurveTo(L * .5, -L * .2, 0, L); c.quadraticCurveTo(-L * .35, 0, 0, -L); c.fill();
        c.strokeStyle = "rgba(180,140,100,.6)"; c.lineWidth = .8 * this.S; c.beginPath(); c.moveTo(0, -L); c.lineTo(0, L * 1.2); c.stroke(); c.restore();
      } else {
        c.globalAlpha = (.25 + .5 * (.5 + .5 * Math.sin(t * 2 + m.s * 20))) * m.z;
        c.fillStyle = this.city.pal.gold; c.beginPath(); c.arc(x, y, 1.6 * this.S * m.z, 0, 6.283); c.fill();
      }
    }
    c.restore();
  }
  finish2D(fade, clean = 0) {
    const c = this.c, w = this.canvas.width, h = this.canvas.height;
    c.save();
    if (clean >= 1) { if (fade > 0) { c.fillStyle = `rgba(0,0,0,${fade})`; c.fillRect(0, 0, w, h); } c.restore(); return; }
    c.globalCompositeOperation = "overlay"; c.globalAlpha = .42 * (1 - clean); c.fillStyle = this.paperPat ||= c.createPattern(Wc.paper(), "repeat"); c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
    const g = c.createRadialGradient(w / 2, h * .45, Math.min(w, h) * .3, w / 2, h * .5, Math.hypot(w, h) * .62);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(4,1,4,${.72 * (1 - clean)})`); c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (fade > 0) { c.fillStyle = `rgba(0,0,0,${fade})`; c.fillRect(0, 0, w, h); }
    c.restore();
  }
  // Reveal a sheet through blooming splashes (the city painting itself).
  reveal(img, f, cam, z, k, seed, yOff = 0, tint = false) {
    if (k >= 1) return this.sheet(img, f, cam, z, yOff);
    if (k <= 0) return;
    const w = this.canvas.width, h = this.canvas.height;
    this.tmp ||= Wc.canvas(w, h); if (this.tmp.width !== w || this.tmp.height !== h) { this.tmp.width = w; this.tmp.height = h; }
    const t = this.tmp.getContext("2d"); t.globalCompositeOperation = "source-over"; t.clearRect(0, 0, w, h);
    const R = rng(seed);
    t.fillStyle = "#000";
    for (let i = 0; i < 26; i++) {
      const x = R() * w, y = lerp(.35, 1.1, R()) * h, d = R() * .55, r = Math.max(0, easeFilm((k - d) / .45)) * Math.max(w, h) * lerp(.25, .55, R());
      if (r <= 0) continue;
      t.beginPath(); const n = 14;
      for (let j = 0; j <= n; j++) { const a = j / n * 6.283, rr = r * (.8 + .25 * Math.sin(a * 3 + i) + .1 * Math.sin(a * 7 + i * 2)); t[j ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8); }
      t.fill();
    }
    t.globalCompositeOperation = "source-in";
    const kk = img.width / W, vw = this.view.w / z, vh = this.view.h / z, cxf = W / 2 + (cam - W / 2) * f;
    t.drawImage(img, clamp(cxf - vw / 2, 0, W - vw) * kk, ((H - vh) * .5 + yOff) * kk, vw * kk, vh * kk, 0, 0, w, h);
    this.c.drawImage(this.tmp, 0, 0);
    if (!tint || reduce()) return;
    // royal and heavenly colour blooms where the paint is still wet
    const R2 = rng(seed);
    for (let i = 0; i < 26; i++) {
      const x = R2() * w, y = lerp(.35, 1.1, R2()) * h, d = R2() * .55, p = (k - d) / .45, r = Math.max(0, easeFilm(p)) * Math.max(w, h) * lerp(.25, .55, R2());
      if (p <= 0 || p >= 1.4) continue;
      Wc.glow(this.c, x, y, r * 1.05, ROYAL[i % 4], .16 * Math.sin(clamp(p / 1.4) * Math.PI));
    }
  }

  her(x, y, cam, z, phase, alpha = 1) {
    const [sx, sy, s] = this.toScreen(x, y, cam, z);
    figure(this.c, this.mode, phase, sx, sy, s * 1.05, { alpha, rim: this.city.pal.gold });
  }

  drawHill(lt) {
    const cam = W / 2 - 300 + lt * 22, z = 1.04 + lt * .004, k = lt / 8;
    this.sheet(this.L.sky, PAR.sky, cam, z);
    this.rays(cam);
    this.reveal(this.L.far, PAR.far, cam, z, smooth(.1, .7, k), 31, 40);
    this.sheet(this.hill, .8, cam, z, 0);
    const m = this.mode, x = W / 2 - 330 + lt * STRIDE[m] * CADENCE[m] * .55, y = this.hillY(x) + 4;
    this.her(x, y, cam, z, lt * CADENCE[m]);
    this.drawMotes(cam);
  }
  drawRise(lt) {
    const k = lt / 8, cam = W / 2 - 180 + lt * 14, z = 1.06 - easeFilm(k) * .06;
    this.sheet(this.L.sky, PAR.sky, cam, z);
    this.rays(cam);
    this.reveal(this.L.far, PAR.far, cam, z, smooth(0, .4, k), 41, 0, true);
    this.reveal(this.L.mid, PAR.mid, cam, z, smooth(.1, .75, k), 43, (1 - easeFilm(smooth(.05, .8, k))) * 60, true);
    this.reveal(this.L.near, PAR.near, cam, z, smooth(.35, .95, k), 47, 0, true);
    // the hill sinks into the paint as the city rises
    this.sheet(this.hill, .8, cam, z, -easeFilm(smooth(0, .7, k)) * 300, 1 - smooth(.2, .7, k));
    const x = W / 2 - 60, m = this.mode;
    this.her(x, (this.city.ground ?? 812) + 50, cam, z, lt * CADENCE[m] * .15, smooth(.55, 1, k));
    this.drawMotes(cam);
  }
  drawWalk(x0, x1, k, i, lt) {
    const m = this.mode, span = Math.min(x1 - x0, STRIDE[m] * CADENCE[m] * 6.5 * .7);
    const x = x0 + (x1 - x0 - span) / 2 + span * k;
    const cam = x + this.view.w * .12, z = 1.02;
    // a memory blooms in the sky behind the caption
    const memory = () => {
      if (reduce()) return;
      const [sx, sy, s] = this.toScreen(x + 80, 330, cam, z, .58), b = easeFilm(clamp(lt / 2.5));
      const c = this.g || this.c; c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = .35 * b;
      Wc.glow(c, sx, sy, 160 * s * b, [this.city.pal.gold, this.city.pal.neon, this.city.pal.splash[1], this.city.pal.neon2][i % 4], .5); c.restore();
    };
    this.world(cam, z, this.styleAt(i, k), memory);
    this.her(x, (this.city.ground ?? 812) + 50, cam, z, (lt + i * 6.5) * CADENCE[m]);
    this.drawMotes(cam);
  }
  // Which style each moment is painted in. Moment 2 sweeps watercolor into anime dusk, moment 3 sweeps
  // dusk into night, so the city is already in the clip's world by the time she reaches the bench.
  styleAt(i, k) {
    const n = this.data.clips.length;
    if (n < 3) return i ? { a: this.N } : { a: this.L };
    if (i === 0) return { a: this.L };
    if (i === 1) return { a: this.L, b: this.A, w: smooth(.12, .78, k), seed: 3 };
    if (i === 2) return { a: this.A, b: this.N, w: smooth(.3, .92, k), seed: 5, cols: ["#3d6bff", "#7b4dff", "#56e1ff", "#ffd27a", "#fff6e8"] };
    return { a: this.N };
  }
  drawArrive(lt) {
    const m = this.mode, e = easeFilm(clamp(lt / 3.2));
    const cam = W / 2 + 640 + this.view.w * .12 - e * 420, z = 1.02 + e * .2;
    this.world(cam, z, { a: this.N });
    const x = W / 2 + 680 + lt * STRIDE[m] * CADENCE[m] * .3;
    this.her(x, (this.city.ground ?? 812) + 50, cam, z, (lt + 26) * CADENCE[m], 1 - smooth(.6, 1.6, lt));
    this.drawMotes(cam);
    // the clip's first frame, painted in anime, blooms open from the middle
    const [rx, , rw, rh] = this.clipRect(), bloom = easeFilm(clamp(lt / 1.9));
    const blooms = (t) => {
      const R = rng(19); t.fillStyle = "#000"; t.beginPath();
      for (let i = 0; i < 9; i++) {
        const bx = rx + rw * lerp(.2, .8, R()), by = rh * lerp(.25, .8, R()), d = R() * .35, r = Math.max(0, easeFilm((bloom - d) / .65)) * rh * lerp(.45, .75, R());
        if (r <= 0) continue;
        for (let j = 0; j <= 16; j++) { const a = j / 16 * 6.283, rr = r * (.85 + .2 * Math.sin(a * 3 + i) + .08 * Math.sin(a * 7 + i * 2)); t[j ? "lineTo" : "moveTo"](bx + Math.cos(a) * rr, by + Math.sin(a) * rr); }
        t.closePath();
      }
      t.fill();
    };
    if (!this.drawStill(this.still?.anime, bloom < 1 ? blooms : null)) return;
    if (bloom < 1 && !reduce()) { const R = rng(19); for (let i = 0; i < 4; i++) Wc.glow(this.c, rx + rw * lerp(.2, .8, R()), rh * lerp(.25, .8, R()), rh * .5 * bloom, ROYAL[i], .2 * (1 - bloom)); }
    // the gold wave: the painting becomes the clip
    const w = smooth(2, 3.6, lt);
    if (w > 0 && this.drawStill(this.still?.real, w < 1 ? (t) => { this.wavePath(t, w, 9, true); t.fill(); } : null) && w < 1) this.waveFront(w, 9, ["#ffb347", "#ffd27a", "#ff8ac0", "#fff1c8", "#ffffff"]);
  }
  drawBench(lt) {
    // The clip plays as a video element; behind it (seen on wide screens) the city at night, softly.
    const cam = W / 2 + 640 + this.view.w * .12 - 420, z = 1.22;
    this.world(cam, z, { a: this.N });
    this.c.fillStyle = "rgba(8,4,14,.35)"; this.c.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  drawEnd(lt) {
    const cam = W / 2 + 120 - lt * 10, z = 1.08 - lt * .004;
    this.world(cam, z, { a: this.N });
    this.drawMotes(cam);
  }

  /* ---------- timeline ---------- */
  stillOf(i) { const b = this.beats[i]; return b.start + (b.still ?? b.dur * .62); }
  loop = (now) => {
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
    if (this.paused && window.YY_SHOT) { this.raf = requestAnimationFrame(this.loop); return; }
    if (!this.paused) this.t += dt;
    if (this.t >= this.total) { this.t = this.total - .001; this.paused = true; }
    this.frame();
    this.raf = requestAnimationFrame(this.loop);
  };
  seek(t) { this.t = clamp(t, 0, this.total - .001); this.frame(); }
  frame() {
    this.clock = this.t;
    let i = this.beats.findIndex(b => this.t < b.start + b.dur); if (i < 0) i = this.beats.length - 1;
    const b = this.beats[i];
    if (i !== this.cur) { this.cur = i; this.showBeat(b); }
    const lt = this.t - b.start;
    this.c.globalCompositeOperation = "source-over"; this.c.globalAlpha = 1;
    b.draw(lt, lt / b.dur);
    const fi = b.fadeIn ?? .7, fo = b.fadeOut ?? .7;
    const fade = reduce() ? 0 : 1 - Math.min(fi ? smooth(0, fi, lt) : 1, fo ? smooth(0, fo, b.dur - lt) : 1);
    this.finish2D(fade, b.clean ? b.clean(lt) : 0);
    if (b.video) this.syncVideo(lt, fade);
    const lis = this.ui.ticks.children;
    this.groups.forEach((g, n) => { if (lis[n]) lis[n].firstChild.style.width = `${(clamp((this.t - g.s) / (g.e - g.s)) * 100).toFixed(1)}%`; });
  }
  syncVideo(lt, fade) {
    const v = this.video;
    v.style.opacity = String(1 - fade);
    if (this.paused || reduce()) { v.pause(); const want = reduce() ? 6.2 : lt; if (Math.abs(v.currentTime - want) > .05 && v.readyState >= 1) v.currentTime = want; return; }
    if (v.paused) { if (Math.abs(v.currentTime - lt) > .25 && v.readyState >= 1) v.currentTime = lt; v.play().catch(() => {}); }
    else if (Math.abs(v.currentTime - lt) > .4) v.currentTime = lt;
  }
  showBeat(b) {
    const u = this.ui; let c = b.cap;
    this.el.classList.toggle("is-video", !!b.video);
    if (!b.video) { this.video.pause(); }
    if (b.keepCap) c = null; else { u.cap.classList.remove("is-on"); void u.cap.offsetWidth; }
    if (c) { u.kick.textContent = c.kicker || ""; u.title.textContent = c.title || ""; u.text.textContent = c.text || ""; u.cap.classList.add("is-on"); u.cap.classList.toggle("is-hand", !!b.hand); }
    if (b.end) {
      u.endKick.textContent = b.end.kicker; u.prov.textContent = b.end.proverb; u.trans.textContent = b.end.trans || ""; u.endBtn.textContent = b.end.cta;
      setTimeout(() => u.end.classList.add("is-on"), reduce() ? 0 : 900);
    } else u.end.classList.remove("is-on");
  }
  skip(dir) {
    if (!this.beats) return;
    let i = this.cur;
    if (dir > 0) { do i++; while (this.beats[i]?.join); if (i >= this.beats.length) return; }
    else { while (this.beats[i]?.join) i--; if (this.t - this.beats[i].start < 1.2 || reduce()) { do i--; while (this.beats[i]?.join); } i = Math.max(0, i); }
    this.t = reduce() ? this.stillOf(i) : this.beats[i].start + .001;
    if (this.paused && !reduce()) this.frame();
  }
  get mode() { return this.opts.mode in STRIDE ? this.opts.mode : "walk"; }
  renderModes() {
    const m = this.opts.modes; if (!m) { this.ui.chip.parentNode.hidden = true; return; }
    this.ui.chip.parentNode.hidden = false;
    this.ui.chip.textContent = `${m.label} · ${m.names[this.opts.mode]}`;
    this.ui.modes.innerHTML = Object.entries(m.names).map(([k, v]) => `<li><button data-mode="${k}" class="${k === this.opts.mode ? "is-on" : ""}">${v}</button></li>`).join("");
  }
  setMode(mode) { this.opts.mode = mode; this.opts.onMode?.(mode); this.renderModes(); }
  finish(result) {
    cancelAnimationFrame(this.raf);
    this.video.pause();
    this.el.classList.remove("is-in");
    const res = this.resolve; this.resolve = null;
    setTimeout(() => {
      this.el.hidden = true; document.body.classList.remove("in-cine"); this.beats = null;
      this.video.removeAttribute("src"); this.video.load();
      res?.(result);
    }, 700);
  }
}
