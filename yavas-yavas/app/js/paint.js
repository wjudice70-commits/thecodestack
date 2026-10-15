/* The painting kit and the film player.
   Every scene is painted in code each frame. Scenes draw their props inside a 1000×1000 "stage"
   (x and y from -500 to 500) that the player fits to the screen, leaving room for the words.
   Backgrounds are painted full-frame first. One grade, one light language, so every film feels like the same film. */
(() => {
  "use strict";
  const { lerp, clamp, rng, noise, rgba, mix, DPR } = YY;
  const P = (YY.paint = {});

  P.WARM = "#ffb35a"; P.FLAME = "#ffd59a"; P.CRIMSON = "#a3263a"; P.ROSE = "#c43a50";

  /* ---------- primitives ---------- */

  P.vgrad = (c, x0, y0, x1, y1, stops) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  };
  P.fillAll = (c, W, H, stops) => { c.fillStyle = P.vgrad(c, 0, 0, 0, H, stops); c.fillRect(0, 0, W, H); };

  // Soft additive light.
  P.glow = (c, x, y, r, color, a = 1) => {
    if (r <= 0 || a <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(.35, rgba(color, a * .35)); g.addColorStop(1, rgba(color, 0));
    const op = c.globalCompositeOperation;
    c.globalCompositeOperation = "lighter";
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    c.globalCompositeOperation = op;
  };

  // Out-of-focus lights, set up once per scene with P.bokehSet.
  P.bokehSet = (seed, n, box, sizes, colors) => {
    const R = rng(seed);
    return Array.from({ length: n }, () => ({
      x: lerp(box[0], box[2], R()), y: lerp(box[1], box[3], R()), r: lerp(sizes[0], sizes[1], Math.pow(R(), 2)),
      c: colors[(R() * colors.length) | 0], a: lerp(.15, .6, R()), ph: R() * 6.28, sp: lerp(.3, 1.2, R()),
    }));
  };
  P.bokeh = (c, set, t, drift = 0) => {
    const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
    for (const b of set) {
      const a = b.a * (.75 + .25 * Math.sin(t * b.sp + b.ph));
      const x = b.x + Math.sin(t * .1 + b.ph) * drift;
      const g = c.createRadialGradient(x, b.y, 0, x, b.y, b.r);
      g.addColorStop(0, rgba(b.c, a)); g.addColorStop(.62, rgba(b.c, a * .9)); g.addColorStop(.78, rgba(b.c, a * .35)); g.addColorStop(1, rgba(b.c, 0));
      c.fillStyle = g; c.beginPath(); c.arc(x, b.y, b.r, 0, 7); c.fill();
    }
    c.globalCompositeOperation = op;
  };

  // A real candle: wax body, wick, a flame that breathes, warm halo.
  P.candle = (c, x, y, w, h, t, seed = 1, o = {}) => {
    const fl = noise(t * 2.3 + seed * 7.1), fl2 = noise(t * 5.1 + seed * 3.3);
    const glowR = (o.glow ?? 1) * w * 9 * (.85 + .25 * fl);
    P.glow(c, x, y - h - w * .6, glowR, P.WARM, .32);
    // body
    const body = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    const wax = o.wax || "#efe1c8";
    body.addColorStop(0, mix(wax, "#3a2a1a", .55)); body.addColorStop(.35, wax); body.addColorStop(.7, mix(wax, "#ffffff", .2)); body.addColorStop(1, mix(wax, "#2a1a10", .6));
    c.fillStyle = body;
    c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h); c.quadraticCurveTo(x, y - h - w * .16, x + w / 2, y - h); c.lineTo(x + w / 2, y); c.closePath(); c.fill();
    // inner glow at the top of the wax
    const tg = c.createRadialGradient(x, y - h, 0, x, y - h, w * .9);
    tg.addColorStop(0, "rgba(255,190,110,.75)"); tg.addColorStop(1, "rgba(255,190,110,0)");
    c.fillStyle = tg; c.fillRect(x - w, y - h - w, w * 2, w * 1.6);
    // wick
    c.strokeStyle = "#1a0f08"; c.lineWidth = Math.max(1, w * .06);
    c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + w * .03, y - h - w * .22); c.stroke();
    // flame
    const fh = w * (1.15 + .35 * fl), fw = w * (.32 + .06 * fl2), sway = (fl2 - .5) * w * .18;
    const fx = x, fy = y - h - w * .12;
    const g = c.createRadialGradient(fx, fy - fh * .35, 0, fx, fy - fh * .35, fh * .8);
    g.addColorStop(0, "rgba(255,250,235,1)"); g.addColorStop(.3, "rgba(255,214,140,.95)"); g.addColorStop(.7, "rgba(255,140,50,.55)"); g.addColorStop(1, "rgba(255,90,30,0)");
    c.fillStyle = g;
    c.beginPath(); c.moveTo(fx, fy);
    c.bezierCurveTo(fx - fw, fy - fh * .25, fx - fw * .55 + sway * .5, fy - fh * .75, fx + sway, fy - fh);
    c.bezierCurveTo(fx + fw * .55 + sway * .5, fy - fh * .75, fx + fw, fy - fh * .25, fx, fy);
    c.fill();
    P.glow(c, fx, fy - fh * .4, w * 1.6, "#ffcf8a", .5);
  };

  // Wisps rising from a cup or a plate.
  P.steam = (c, x, y, t, s = 1, seed = 1, a = .22) => {
    c.save(); c.lineCap = "round";
    for (let k = 0; k < 3; k++) {
      const ph = ((t * .35 + k / 3 + seed * .17) % 1);
      const yy = y - ph * 120 * s, alpha = a * Math.sin(ph * Math.PI);
      c.strokeStyle = `rgba(255,240,225,${alpha})`; c.lineWidth = (6 - ph * 3) * s;
      c.beginPath();
      for (let i = 0; i <= 12; i++) {
        const v = i / 12, px = x + (k - 1) * 10 * s + Math.sin(v * 5 + t * 1.3 + k * 2 + seed) * 9 * s * v;
        const py = yy + 30 * s - v * 60 * s;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();
    }
    c.restore();
  };

  // A sagging line of warm bulbs.
  P.stringLights = (c, x1, y1, x2, y2, sag, n, t, color = "#ffd08a", size = 4) => {
    c.save();
    c.strokeStyle = "rgba(20,14,10,.9)"; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + sag * 2, x2, y2); c.stroke();
    for (let i = 1; i < n; i++) {
      const u = i / n, ix = lerp(lerp(x1, (x1 + x2) / 2, u), lerp((x1 + x2) / 2, x2, u), u);
      const iy = lerp(lerp(y1, (y1 + y2) / 2 + sag * 2, u), lerp((y1 + y2) / 2 + sag * 2, y2, u), u) + size * 1.3;
      const tw = .75 + .25 * noise(t * 1.5 + i * 3.7);
      P.glow(c, ix, iy, size * 7 * tw, color, .45);
      c.fillStyle = rgba("#fff3d8", .95 * tw); c.beginPath(); c.arc(ix, iy, size * .7, 0, 7); c.fill();
    }
    c.restore();
  };

  // A red rose petal for floors and tables.
  P.petal = (c, x, y, rot, s, col = "#8f1d2e", a = 1) => {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s * .62);
    const g = c.createRadialGradient(0, 4, 0, 0, 0, 12);
    g.addColorStop(0, rgba(mix(col, "#000000", .35), a)); g.addColorStop(.75, rgba(col, a)); g.addColorStop(1, rgba(mix(col, "#ff8a96", .4), a));
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, 10); c.bezierCurveTo(-13, 4, -11, -10, 0, -11); c.bezierCurveTo(11, -10, 13, 4, 0, 10); c.fill();
    c.restore();
  };

  // Rain running down glass.
  P.rainSet = (seed, n, box) => {
    const R = rng(seed);
    return Array.from({ length: n }, () => ({ x: lerp(box[0], box[2], R()), y0: R(), sp: lerp(.05, .22, R()), len: lerp(14, 60, R()), w: lerp(.6, 2, R()) }));
  };
  P.rain = (c, set, box, t, color = "rgba(190,210,235,") => {
    const h = box[3] - box[1];
    for (const d of set) {
      const y = box[1] + ((d.y0 + t * d.sp) % 1) * h;
      const g = c.createLinearGradient(0, y - d.len, 0, y);
      g.addColorStop(0, color + "0)"); g.addColorStop(1, color + ".55)");
      c.strokeStyle = g; c.lineWidth = d.w;
      c.beginPath(); c.moveTo(d.x, y - d.len); c.lineTo(d.x + Math.sin(y * .02) * 1.5, y); c.stroke();
      c.fillStyle = color + ".7)"; c.beginPath(); c.arc(d.x, y, d.w * 1.3, 0, 7); c.fill();
    }
  };

  // Falling snow or ice.
  P.snowSet = (seed, n) => { const R = rng(seed); return Array.from({ length: n }, () => ({ x: R(), y: R(), s: lerp(.5, 2.6, Math.pow(R(), 2)), sp: lerp(.02, .07, R()), ph: R() * 6 })); };
  P.snow = (c, set, W, H, t, a = .8) => {
    for (const f of set) {
      const y = ((f.y + t * f.sp * (1 + f.s * .4)) % 1.05) * H - 10;
      const x = (f.x * W + Math.sin(t * .6 + f.ph) * 14 * f.s) % W;
      c.fillStyle = `rgba(235,242,255,${a * (.35 + f.s / 4)})`;
      c.beginPath(); c.arc(x, y, f.s * DPR, 0, 7); c.fill();
    }
  };

  // Stars, softly twinkling.
  P.starSet = (seed, n, hFrac = .55) => { const R = rng(seed); return Array.from({ length: n }, () => ({ x: R(), y: Math.pow(R(), 1.4) * hFrac, s: lerp(.4, 1.5, Math.pow(R(), 3)), ph: R() * 6 })); };
  P.stars = (c, set, W, H, t, a = 1) => {
    for (const s of set) {
      c.fillStyle = `rgba(255,245,230,${a * (.4 + .6 * (.5 + .5 * Math.sin(t * 1.3 + s.ph))) * s.s / 1.5})`;
      c.fillRect(s.x * W, s.y * H, s.s * DPR, s.s * DPR);
    }
  };

  // Water with broken reflections of lights.
  P.reflections = (c, lights, waterY, H, t, W) => {
    const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter";
    for (const L of lights) {
      const depth = H - waterY;
      for (let k = 0; k < 14; k++) {
        const v = k / 14, y = waterY + v * depth * .9;
        const wob = Math.sin(t * 1.6 + k * 1.7 + L.x * .01) * (3 + v * 10) * DPR;
        const w = (L.w || 8 * DPR) * (1 + v * 2.5) * (.6 + .4 * noise(t * 2 + k + L.x));
        c.fillStyle = rgba(L.c, (L.a ?? .5) * (1 - v) * .55);
        c.fillRect(L.x - w / 2 + wob, y, w, Math.max(1, 2.2 * DPR));
      }
    }
    c.globalCompositeOperation = op;
  };

  // A mountain ridge.
  P.ridge = (c, W, baseY, amp, seed, color, freq = 3) => {
    c.fillStyle = color; c.beginPath(); c.moveTo(0, c.canvas.height);
    for (let i = 0; i <= 80; i++) {
      const x = i / 80 * W, n = noise(i / 80 * freq * 4 + seed) * .7 + noise(i / 80 * freq * 11 + seed * 2) * .3;
      c.lineTo(x, baseY - n * amp);
    }
    c.lineTo(W, c.canvas.height); c.closePath(); c.fill();
  };

  // Text drawn into a scene in her handwriting style (Cormorant italic).
  P.script = (c, text, x, y, size, color, reveal = 1, align = "center") => {
    c.save();
    c.font = `italic 500 ${size}px Cormorant, "Cormorant Garamond", Georgia, serif`;
    c.textAlign = align; c.textBaseline = "middle";
    const n = Math.floor(text.length * clamp(reveal));
    c.fillStyle = color;
    c.shadowColor = color; c.shadowBlur = size * .4;
    c.fillText(text.slice(0, n), x, y);
    c.restore();
  };

  /* ---------- the film player ---------- */

  // fit(): where the 1000×1000 stage sits. Portrait leaves the lower part for words; landscape leaves the left.
  P.fit = (W, H) => {
    const portrait = H > W * 1.05;
    const S = portrait ? Math.min(W * .94, H * .56) : Math.min(H * .98, W * .6);
    return { S, cx: portrait ? W / 2 : W * .63, cy: portrait ? H * .36 : H * .5, portrait };
  };

  P.Film = class {
    constructor(canvas) {
      this.cv = canvas; this.c = canvas.getContext("2d"); this.scene = null; this.mem = {};
      this.t0 = performance.now() / 1000; this.dur = 12; this.running = false; this.zoom = .05;
      this.resize = this.resize.bind(this); addEventListener("resize", this.resize); this.resize();
    }
    resize() {
      const r = this.cv.getBoundingClientRect();
      this.cv.width = Math.max(1, Math.round(r.width * DPR)); this.cv.height = Math.max(1, Math.round(r.height * DPR));
      this.mem = {};
    }
    show(painter, dur = 12) { this.scene = painter; this.mem = {}; this.t0 = performance.now() / 1000; this.dur = dur; }
    start() { if (this.running) return; this.running = true; const loop = () => { if (!this.running) return; this.frame(); this.raf = requestAnimationFrame(loop); }; loop(); }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
    // The same lens on every film: drifting dust in the light, a gentle grade, a deep vignette.
    finish(c, W, H, t) {
      const m = this.mem;
      if (!m.__fin || m.__fin.W !== W || m.__fin.H !== H) {
        const v = c.createRadialGradient(W / 2, H * .42, Math.min(W, H) * .25, W / 2, H * .45, Math.hypot(W, H) * .62);
        v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(.7, "rgba(0,0,0,.28)"); v.addColorStop(1, "rgba(0,0,0,.78)");
        const R = YY.rng(77);
        m.__fin = { W, H, v, dust: Array.from({ length: 46 }, () => ({ x: R(), y: R(), s: lerp(.6, 2.2, R() * R()), sp: lerp(.004, .02, R()), ph: R() * 6 })) };
      }
      const f = m.__fin;
      c.globalCompositeOperation = "lighter";
      for (const d of f.dust) {
        const x = ((d.x + Math.sin(t * .1 + d.ph) * .03) % 1) * W, y = (((d.y - t * d.sp) % 1) + 1) % 1 * H;
        const a = .18 * (.5 + .5 * Math.sin(t * .7 + d.ph));
        c.fillStyle = `rgba(255,226,190,${a.toFixed(3)})`; c.beginPath(); c.arc(x, y, d.s * DPR, 0, 7); c.fill();
      }
      c.globalCompositeOperation = "soft-light";
      c.fillStyle = "rgba(255,150,90,.16)"; c.fillRect(0, 0, W, H * .5);
      c.fillStyle = "rgba(40,60,120,.18)"; c.fillRect(0, H * .5, W, H * .5);
      c.globalCompositeOperation = "source-over";
      c.fillStyle = f.v; c.fillRect(0, 0, W, H);
    }
    frame() {
      const c = this.c, W = this.cv.width, H = this.cv.height;
      if (!this.scene) return;
      const t = YY.reduceMotion ? 3 : performance.now() / 1000 - this.t0;
      const u = clamp(t / this.dur);
      const f = P.fit(W, H);
      const m = this.mem;
      const k = f.S / 1000 * (1 + this.zoom * YY.ease(u));
      const ctx = {
        c, W, H, t, u, m, S: f.S, portrait: f.portrait, cx: f.cx, cy: f.cy, k,
        stage() { c.setTransform(k, 0, 0, k, f.cx, f.cy); },
        full() { c.setTransform(1, 0, 0, 1, 0, 0); },
        // stage → screen, for full-frame effects that follow a prop
        sx: (x) => f.cx + x * k, sy: (y) => f.cy + y * k,
      };
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
      this.scene(ctx);
      c.setTransform(1, 0, 0, 1, 0, 0);
      this.finish(c, W, H, t);
    }
  };
})();
