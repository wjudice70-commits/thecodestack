/* The room every screen lives in: one painted atmosphere behind all views (bokeh, a shaft of sodium light,
   dust drifting in it), and the one signature cut between scenes: the petal lifts toward the lens,
   the screen sinks into black, the next scene rises. */
(() => {
  "use strict";
  const { lerp, rng, rgba, DPR, clamp } = YY;
  const P = YY.paint;

  // Each view has a mood: where the light falls and what colour it is.
  const MOODS = {
    home:    { glow: [.5, .38, "#5a0e1a", .4], shaft: "#ffb36a", bokeh: ["#ff7a4a", "#c43a50", "#ffd59a"] },
    journey: { glow: [.5, .15, "#16224a", .45], shaft: "#ffc98a", bokeh: ["#7fa0ff", "#ffb36a", "#c43a50"] },
    today:   { glow: [.5, .05, "#4a1a0c", .4], shaft: "#ffcf8a", bokeh: ["#ffb35a", "#ff7a4a", "#f4d39a"] },
  };

  class Atmos {
    constructor(cv) {
      this.cv = cv; this.c = cv.getContext("2d"); this.mood = MOODS.home; this.from = null; this.k = 1; this.running = false;
      const R = rng(31);
      this.dust = Array.from({ length: 70 }, () => ({ x: R(), y: R(), s: lerp(.5, 2.4, R() * R()), sp: lerp(.004, .018, R()), ph: R() * 6 }));
      this.resize = this.resize.bind(this); addEventListener("resize", this.resize); this.resize();
    }
    resize() {
      this.W = this.cv.width = Math.round(this.cv.clientWidth * DPR); this.H = this.cv.height = Math.round(this.cv.clientHeight * DPR);
      const s = Math.max(this.W, this.H);
      this.bk = P.bokehSet(9, 12, [0, 0, this.W, this.H], [s * .02, s * .07], ["#ffffff"]);
      if (!this.running) this.frame(3);
    }
    set(view) { const m = MOODS[view] || MOODS.home; if (m === this.mood) return; this.from = this.mood; this.mood = m; this.k = 0; }
    paintMood(c, m, t, a) {
      const { W, H } = this, [gx, gy, gc, ga] = m.glow;
      const g = c.createRadialGradient(W * gx, H * gy, 0, W * gx, H * gy, Math.hypot(W, H) * .7);
      g.addColorStop(0, rgba(gc, ga * a)); g.addColorStop(.5, rgba(gc, ga * .3 * a)); g.addColorStop(1, rgba(gc, 0));
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // Bokeh, out of focus far behind everything
      c.save(); c.globalAlpha = a * .22;
      this.bk.forEach((b, i) => { b.c = m.bokeh[i % m.bokeh.length]; });
      P.bokeh(c, this.bk, t, this.W * .02);
      c.restore();
      // A shaft of light from the upper left, the same key light as the rose
      P.shaft(c, W * .05, -H * .05, W * .18, W * .55, H * 1.05, W * .7, m.shaft, .06 * a);
    }
    frame(t) {
      const c = this.c, { W, H } = this;
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over";
      c.fillStyle = "#050405"; c.fillRect(0, 0, W, H);
      this.k = Math.min(1, this.k + 1 / 90);
      if (this.from && this.k < 1) this.paintMood(c, this.from, t, 1 - this.k);
      this.paintMood(c, this.mood, t, this.k);
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
