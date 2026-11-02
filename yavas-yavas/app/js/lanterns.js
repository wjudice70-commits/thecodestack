/* Small wins as a game: every win she logs lets a paper lantern go over the water. Today's lanterns stay in
   the sky, drifting; when all of them are up, a petal falls from the top of the frame. */
(() => {
  "use strict";
  const { lerp, clamp, rng, noise, DPR } = YY;
  const P = YY.paint;

  class Sky {
    constructor(cv, cap) {
      this.cv = cv; this.c = cv.getContext("2d"); this.cap = cap; this.list = []; this.running = false; this.petal = null;
      this.resize = this.resize.bind(this); addEventListener("resize", this.resize);
      const R = rng(5); this.stars = P.starSet(5, 70, .7); this.slots = Array.from({ length: 12 }, (_, i) => ({ x: .14 + ((i * .618 + .3) % 1) * .72, y: lerp(.14, .5, R()) }));
    }
    resize() { const r = this.cv.getBoundingClientRect(); this.cv.width = Math.round(r.width * DPR); this.cv.height = Math.round(r.height * DPR); this.city = null; }
    // n lanterns already up (set on render); launch() sends a new one up from the water.
    set(n) { while (this.list.length < n) this.list.push(this.lantern(this.list.length, 1)); this.list.length = Math.min(this.list.length, n); }
    launch() {
      const l = this.lantern(this.list.length, 0); this.list.push(l);
      if (this.list.length >= this.cap) this.petal = { t0: performance.now() / 1000 };
    }
    lantern(i, up) { const s = this.slots[i % this.slots.length]; return { i, s, t0: performance.now() / 1000 - (up ? 99 : 0), ph: i * 1.7 }; }
    paintCity(W, H) {
      // İstanbul across the water: domes and minarets as one dark silhouette, warm windows
      const b = document.createElement("canvas"); b.width = W; b.height = H; const c = b.getContext("2d"), R = rng(8);
      const hy = H * .8;
      c.fillStyle = "#07060a"; c.beginPath(); c.moveTo(0, hy);
      let x = 0;
      while (x < W) {
        const w = lerp(.04, .1, R()) * W, h = lerp(.04, .14, R()) * H, kind = R();
        if (kind < .25) { c.lineTo(x, hy - h); c.quadraticCurveTo(x + w / 2, hy - h - w * .7, x + w, hy - h); }
        else if (kind < .4) { c.lineTo(x, hy - h); c.lineTo(x + w * .45, hy - h); c.lineTo(x + w * .47, hy - h - H * .3); c.lineTo(x + w * .5, hy - h - H * .36); c.lineTo(x + w * .53, hy - h - H * .3); c.lineTo(x + w * .55, hy - h); c.lineTo(x + w, hy - h); }
        else c.lineTo(x, hy - h), c.lineTo(x + w, hy - h);
        x += w;
      }
      c.lineTo(W, hy); c.lineTo(W, H); c.lineTo(0, H); c.fill();
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,${180 + R() * 40 | 0},110,${lerp(.3, .8, R())})`; c.fillRect(R() * W, hy - R() * H * .06, DPR * 1.4, DPR * 1.4); }
      this.city = b; this.hy = hy;
    }
    draw(t) {
      const c = this.c, W = this.cv.width, H = this.cv.height;
      if (!W || !H) return;
      if (!this.city) this.paintCity(W, H);
      P.fillAll(c, W, H, [[0, "#05050d"], [.45, "#140c1e"], [.68, "#3a1626"], [.8, "#7a3020"], [.801, "#0a0710"], [1, "#050407"]]);
      P.stars(c, this.stars, W, H, t, .7);
      c.drawImage(this.city, 0, 0);
      const hy = this.hy;
      for (const l of this.list) {
        const age = t - l.t0, k = YY.reduceMotion ? 1 : clamp(age / 5), e = 1 - Math.pow(1 - k, 3);
        const x = (l.s.x + Math.sin(t * .3 + l.ph) * .012) * W, y = lerp(H * .98, l.s.y * H, e) + Math.sin(t * .8 + l.ph) * 2 * DPR;
        const s = H * lerp(.07, .05, e), fl = .85 + .15 * noise(t * 3 + l.ph);
        P.glow(c, x, y, s * 5, "#ff9a4a", .35 * fl);
        // Reflection in the water
        P.glow(c, x, hy + (hy - y) * .25 + H * .06, s * 2.2, "#ff9a4a", .12 * fl * (1 - e * .5));
        const g = c.createLinearGradient(x, y - s, x, y + s);
        g.addColorStop(0, "#ffcf8a"); g.addColorStop(.6, "#ff8a3a"); g.addColorStop(1, "#b8401e");
        c.fillStyle = g; c.beginPath();
        c.moveTo(x - s * .55, y - s * .8); c.quadraticCurveTo(x, y - s * 1.05, x + s * .55, y - s * .8);
        c.lineTo(x + s * .42, y + s * .75); c.quadraticCurveTo(x, y + s * .85, x - s * .42, y + s * .75); c.closePath(); c.fill();
        P.glow(c, x, y + s * .5, s * .8, "#fff1c0", .7 * fl);
      }
      // All lanterns up: one petal falls through the sky
      if (this.petal) {
        const a = t - this.petal.t0, y = lerp(-.05, 1.05, clamp(a / 9)) * H;
        if (a > 9) this.petal = null;
        else P.petal(c, W * (.5 + Math.sin(a * .9) * .18), y, Math.sin(a * 1.3) * 1.2, H * .0035, "#c43a50");
      }
      const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.hypot(W, H) * .6);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.6)"); c.fillStyle = v; c.fillRect(0, 0, W, H);
    }
    start() { if (this.running) return; this.running = true; this.resize(); const loop = () => { if (!this.running) return; this.draw(performance.now() / 1000); this.raf = requestAnimationFrame(loop); }; loop(); }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
  }
  YY.Sky = Sky;
})();
