/* The room every screen lives in: one painted atmosphere behind all views (bokeh, a shaft of sodium light,
   dust drifting in it), and the one signature cut between scenes: the petal lifts toward the lens,
   the screen sinks into black, the next scene rises. */
(() => {
  "use strict";
  const { lerp, rng, rgba, DPR, clamp } = YY;
  const P = YY.paint;

  // Each view has a mood: where the light falls and what colour it is.
  const MOODS = {
    // sky: the low dusk band each view borrows from Brother's films (violet hill dusk, clay Bosphorus blue, bazaar lanterns).
    // swirl: the painted spiral dusk from the İzmir harbor stills; sea: harbor water + sun glitter; petals: bougainvillea drift.
    home:    { glow: [.5, .38, "#5a0e1a", .4], shaft: "#ffb36a", bokeh: ["#ff7a4a", "#c43a50", "#ffd59a"], sky: ["#2a1846", "#6a3a6e", "#c9785a"],
               swirl: ["#2a1260", "#7a2a9a", "#d8407e", "#ff9a48"], sw: 1.15, sea: "#2a1840", sun: "#ffb35a", sa: .9, pa: 1 },
    journey: { glow: [.5, .15, "#16224a", .45], shaft: "#ffc98a", bokeh: ["#7fa0ff", "#ffb36a", "#c43a50"], sky: ["#0e1a40", "#24408a", "#7a6aa8"],
               swirl: ["#0e1a50", "#3a3a9a", "#8a4aa8", "#ffb36a"], sw: .6, sea: "#0e1a3a", sun: "#ffc98a", sa: .6, pa: .45 },
    today:   { glow: [.5, .05, "#4a1a0c", .4], shaft: "#ffcf8a", bokeh: ["#ffb35a", "#ff7a4a", "#f4d39a"], sky: ["#2a140a", "#6a3414", "#c87a2a"],
               swirl: ["#3a140e", "#8a2a3a", "#d85a3a", "#ffc05a"], sw: .85, sea: "#2a120a", sun: "#ffcf8a", sa: .75, pa: .8 },
  };

  class Atmos {
    constructor(cv) {
      this.cv = cv; this.c = cv.getContext("2d"); this.mood = MOODS.home; this.from = null; this.k = 1; this.running = false;
      const R = rng(31);
      this.dust = Array.from({ length: 70 }, () => ({ x: R(), y: R(), s: lerp(.5, 2.4, R() * R()), sp: lerp(.004, .018, R()), ph: R() * 6 }));
      // Bougainvillea bracts: papery magenta, drifting down from the upper left and turning over in the air.
      this.petals = Array.from({ length: 26 }, () => ({ x: R(), y: R(), s: lerp(.6, 1.6, R()), far: R() < .3, sp: lerp(.012, .03, R()),
        dr: lerp(.006, .02, R()), sw: R() * 6, spin: lerp(.6, 1.6, R()), c: ["#f0389a", "#d8248a", "#ff6ab4", "#c01a80"][(R() * 4) | 0] }));
      this.glit = Array.from({ length: 70 }, () => { const d = R(); return { u: (R() - .5) * (.15 + d * .9), d, ph: R() * 6, f: lerp(1.5, 4, R()), l: lerp(.4, 1, R()) }; });
      this.resize = this.resize.bind(this); addEventListener("resize", this.resize); this.resize();
    }
    resize() {
      this.W = this.cv.width = Math.round(this.cv.clientWidth * DPR); this.H = this.cv.height = Math.round(this.cv.clientHeight * DPR);
      const s = Math.max(this.W, this.H);
      this.bk = P.bokehSet(9, 12, [0, 0, this.W, this.H], [s * .02, s * .07], ["#ffffff"]);
      this.swirls = new Map(); this.shore = this.skyline();
      if (!this.running) this.frame(3);
    }
    set(view) { const m = MOODS[view] || MOODS.home; if (m === this.mood) return; this.from = this.mood; this.mood = m; this.k = 0; }
    paintMood(c, m, t, a) {
      const { W, H } = this, [gx, gy, gc, ga] = m.glow;
      const sk = c.createLinearGradient(0, H * .3, 0, H);
      sk.addColorStop(0, rgba(m.sky[0], 0)); sk.addColorStop(.55, rgba(m.sky[0], .55 * a)); sk.addColorStop(.85, rgba(m.sky[1], .45 * a)); sk.addColorStop(1, rgba(m.sky[2], .35 * a));
      c.fillStyle = sk; c.fillRect(0, 0, W, H);
      const g = c.createRadialGradient(W * gx, H * gy, 0, W * gx, H * gy, Math.hypot(W, H) * .7);
      g.addColorStop(0, rgba(gc, ga * a)); g.addColorStop(.5, rgba(gc, ga * .3 * a)); g.addColorStop(1, rgba(gc, 0));
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // Bokeh, out of focus far behind everything
      c.save(); c.globalAlpha = a * .22;
      this.bk.forEach((b, i) => { b.c = m.bokeh[i % m.bokeh.length]; });
      P.bokeh(c, this.bk, t, this.W * .02);
      c.restore();
      this.paintSwirl(c, m, t, a);
      this.paintHarbor(c, m, t, a);
      // A shaft of light from the upper left, the same key light as the rose
      P.shaft(c, W * .05, -H * .05, W * .18, W * .55, H * 1.05, W * .7, m.shaft, .06 * a);
    }
    // The swirling dusk: spiral arms painted once at quarter size (the upscale is the blur), then slowly turned.
    swirlTex(m) {
      if (this.swirls.has(m)) return this.swirls.get(m);
      const S = Math.round(Math.max(this.W, this.H) * 1.1 / 4), cv = document.createElement("canvas"); cv.width = cv.height = S;
      const c = cv.getContext("2d"), R = rng(77), h = S / 2; c.lineCap = "round";
      for (let arm = 0; arm < 7; arm++) {
        const off = arm / 7 * Math.PI * 2 + R() * .4, col = m.swirl[arm % 4], w = S * lerp(.02, .05, R());
        for (let k = 0; k < 3; k++) {
          c.strokeStyle = rgba(k ? m.swirl[(arm + k) % 4] : col, k ? .18 : .5); c.lineWidth = w * (1 + k * 1.4);
          c.beginPath();
          for (let th = 0; th < 9; th += .08) {
            const r = h * .04 + th * h * .1 + k * S * .012, x = h + Math.cos(th + off) * r, y = h + Math.sin(th + off) * r * .7;
            th ? c.lineTo(x, y) : c.moveTo(x, y);
          }
          c.stroke();
        }
      }
      // Fade toward the rim so the spiral melts into the dark.
      c.globalCompositeOperation = "destination-in";
      const g = c.createRadialGradient(h, h, 0, h, h, h); g.addColorStop(0, "rgba(0,0,0,.9)"); g.addColorStop(.55, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(0, 0, S, S);
      this.swirls.set(m, cv); return cv;
    }
    paintSwirl(c, m, t, a) {
      const { W, H } = this, tex = this.swirlTex(m), S = Math.max(W, H) * 1.1;
      c.save(); c.globalCompositeOperation = "screen"; c.imageSmoothingQuality = "high";
      [[.62, .06, 1, .018, .55], [.3, .14, .7, -.026, .4]].forEach(([fx, fy, sc, sp, al]) => {
        c.globalAlpha = m.sw * al * a; c.setTransform(1, 0, 0, 1, W * fx, H * fy); c.rotate(t * sp); c.scale(sc, sc * (.85 + .05 * Math.sin(t * .2)));
        c.drawImage(tex, -S / 2, -S / 2, S, S);
      });
      c.restore();
      // Keep the middle and lower sky dark under the reading text.
      const d = c.createLinearGradient(0, H * .18, 0, H * .62); d.addColorStop(0, "rgba(5,4,5,0)"); d.addColorStop(1, rgba("#050405", .45 * a));
      c.fillStyle = d; c.fillRect(0, H * .18, W, H * .44);
    }
    // Long-lens harbor at the foot of the screen: dark water, a sun path that glitters, a far shore of tower, palms and masts.
    skyline() {
      const { W, H } = this, R = rng(19), y0 = H * .84, pts = [];
      for (let x = 0; x <= W; x += W / 60) pts.push([x, y0 - H * .006 * (1 + Math.sin(x / W * 9) + R())]);
      return { y0, pts, tower: W * .74, palms: [W * .12, W * .2, W * .86, W * .93].map(x => [x, lerp(.03, .05, R()) * H]), masts: Array.from({ length: 7 }, () => [W * lerp(.3, .62, R()), H * lerp(.015, .035, R())]) };
    }
    paintHarbor(c, m, t, a) {
      const { W, H } = this, sh = this.shore, y0 = sh.y0, A = m.sa * a, dx = Math.sin(t * .05) * W * .01;
      const sea = c.createLinearGradient(0, y0, 0, H); sea.addColorStop(0, rgba(m.sea, .7 * A)); sea.addColorStop(1, rgba("#050405", .9 * A));
      c.fillStyle = sea; c.fillRect(0, y0, W, H - y0);
      const sun = c.createRadialGradient(W * .5, y0, 0, W * .5, y0, W * .5); sun.addColorStop(0, rgba(m.sun, .35 * A)); sun.addColorStop(1, rgba(m.sun, 0));
      c.fillStyle = sun; c.fillRect(0, y0 - W * .5, W, W);
      // Far shore silhouette with a thin sodium rim on its top edge
      c.save(); c.translate(dx, 0); c.fillStyle = rgba("#0a0608", .85 * A); c.strokeStyle = rgba(m.sun, .35 * A); c.lineWidth = DPR;
      c.beginPath(); c.moveTo(-W * .05, y0); sh.pts.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(W * 1.05, y0); c.closePath(); c.fill();
      const tx = sh.tower, tw = W * .016, th = H * .07;
      c.fillRect(tx - tw / 2, y0 - th, tw, th); c.beginPath(); c.moveTo(tx - tw * .7, y0 - th); c.lineTo(tx, y0 - th - tw * 1.6); c.lineTo(tx + tw * .7, y0 - th); c.fill();
      c.fillStyle = rgba(m.sun, .5 * A); c.beginPath(); c.arc(tx, y0 - th * .78, tw * .3, 0, 7); c.fill();
      c.strokeStyle = rgba("#0a0608", .85 * A); c.lineWidth = DPR * 1.2;
      sh.masts.forEach(([x, h]) => { c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y0 - h); c.stroke(); });
      sh.palms.forEach(([x, h], i) => {
        const sway = Math.sin(t * .6 + i) * h * .04, top = [x + sway, y0 - h];
        c.lineWidth = DPR * 2; c.beginPath(); c.moveTo(x, y0); c.quadraticCurveTo(x + h * .1, y0 - h * .5, top[0], top[1]); c.stroke();
        c.lineWidth = DPR * 1.6;
        for (let f = 0; f < 7; f++) { const an = -Math.PI + f / 6 * Math.PI, r = h * .45; c.beginPath(); c.moveTo(...top);
          c.quadraticCurveTo(top[0] + Math.cos(an) * r * .6, top[1] - r * .25, top[0] + Math.cos(an) * r, top[1] + Math.abs(Math.sin(an)) * r * .1 + r * .25 + sway); c.stroke(); }
      });
      c.restore();
      // Sun path: short horizontal glints, wider and longer the nearer they are
      c.save(); c.globalCompositeOperation = "lighter";
      for (const g of this.glit) {
        const y = y0 + (H - y0) * g.d * g.d, f = Math.pow(.5 + .5 * Math.sin(t * g.f + g.ph), 4), len = W * (.006 + g.d * .03) * g.l;
        c.fillStyle = rgba(m.sun, .5 * f * A * (1 - g.d * .5)); c.fillRect(W * (.5 + g.u) - len / 2 + Math.sin(t * .4 + g.ph) * W * .004, y, len, DPR * (1 + g.d));
      }
      c.restore();
    }
    paintPetals(c, t, amt) {
      if (amt <= 0) return;
      const { W, H } = this, u = Math.min(W, H) * .016;
      for (const p of this.petals) {
        const y = (((p.y + t * p.sp) % 1.1) + 1.1) % 1.1 - .05, x = (((p.x + t * p.dr + Math.sin(t * .5 + p.sw) * .02) % 1) + 1) % 1;
        const r = u * p.s * (p.far ? 2.2 : 1), flip = Math.cos(t * p.spin + p.sw);
        c.save(); c.translate(x * W, y * H); c.rotate(t * p.spin * .4 + p.sw); c.scale(Math.max(.15, Math.abs(flip)), 1);
        c.globalAlpha = amt * (p.far ? .2 : .7) * (flip > 0 ? 1 : .7);
        c.fillStyle = p.c; c.beginPath(); c.moveTo(0, r); c.bezierCurveTo(-r * 1.1, r * .2, -r * .7, -r, 0, -r * .55); c.bezierCurveTo(r * .7, -r, r * 1.1, r * .2, 0, r); c.fill();
        c.globalAlpha *= .6; c.strokeStyle = "#ffb0d0"; c.lineWidth = DPR * .6; c.beginPath(); c.moveTo(0, r * .8); c.lineTo(0, -r * .4); c.stroke();
        c.restore();
      }
    }
    frame(t) {
      const c = this.c, { W, H } = this;
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over";
      c.fillStyle = "#050405"; c.fillRect(0, 0, W, H);
      this.k = Math.min(1, this.k + 1 / 90);
      if (this.from && this.k < 1) this.paintMood(c, this.from, t, 1 - this.k);
      this.paintMood(c, this.mood, t, this.k);
      this.paintPetals(c, t, this.from && this.k < 1 ? lerp(this.from.pa, this.mood.pa, this.k) : this.mood.pa);
      c.globalCompositeOperation = "lighter";
      for (const d of this.dust) {
        const x = ((d.x + Math.sin(t * .1 + d.ph) * .03) % 1) * W, y = (((d.y - t * d.sp) % 1) + 1) % 1 * H;
        const a = .22 * (.5 + .5 * Math.sin(t * .7 + d.ph)) * clamp(1.3 - x / W);
        c.fillStyle = `rgba(255,226,190,${a.toFixed(3)})`; c.beginPath(); c.arc(x, y, d.s * DPR, 0, 7); c.fill();
      }
      c.globalCompositeOperation = "source-over";
    }
    start() {
      if (this.running || YY.reduceMotion) return; this.running = true;
      const loop = () => { if (!this.running) return; this.frame(performance.now() / 1000); this.raf = requestAnimationFrame(loop); };
      loop();
    }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
  }
  YY.Atmos = Atmos;

  /* The cut. swap() runs at the darkest moment. The petal starts at (x, y), or the middle of the screen. */
  const PETAL = `<svg viewBox="-50 -60 100 120"><defs><radialGradient id="cut-p" cx=".35" cy=".3" r=".9">
    <stop offset="0" stop-color="#d14a5e"/><stop offset=".45" stop-color="#7a1222"/><stop offset="1" stop-color="#1a0207"/></radialGradient></defs>
    <path d="M0 56C-30 40-46 8-40-22-34-48-12-58 0-44 12-58 34-48 40-22 46 8 30 40 0 56Z" fill="url(#cut-p)"/>
    <path d="M0 50C-4 20-3-10 0-40" stroke="rgba(255,190,170,.25)" stroke-width="1.2" fill="none"/></svg>`;
  let busy = false;
  YY.cut = (swap, at) => {
    const veil = YY.$("#cut");
    if (YY.reduceMotion || busy) { swap(); return; }
    busy = true;
    const x = at ? at[0] : innerWidth / 2, y = at ? at[1] : innerHeight / 2;
    veil.style.setProperty("--x", `${x}px`); veil.style.setProperty("--y", `${y}px`);
    if (!veil.firstChild) veil.innerHTML = `<i class="cut-petal">${PETAL}</i>`;
    veil.classList.remove("is-on"); void veil.offsetWidth; veil.classList.add("is-on");
    setTimeout(swap, 620);
    setTimeout(() => { veil.classList.remove("is-on"); busy = false; }, 1500);
  };
})();
