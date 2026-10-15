/* The journey map: Turkey painted as a dark relief at night, a gold road through the 15 stops.
   The land is painted once to an offscreen canvas; only the road's glow and her marker animate. */
(() => {
  "use strict";
  const { lerp, clamp, rng, noise, rgba, DPR } = YY;
  const P = YY.paint;

  // Simplified coastline and borders (lon, lat). Close enough to read as Turkey at this size.
  const ANATOLIA = [[29.1,41.2],[30,41.15],[31.2,41.1],[32.3,41.7],[33.3,42],[34.2,41.95],[35.1,42.05],[35.5,41.65],[36.1,41.65],[36.7,41.3],[37.5,41.05],[38.3,40.95],[39.4,41.05],[40.2,40.95],[41,41.2],[41.55,41.5],[42.5,41.5],[43.4,41.15],[43.7,40.7],[43.6,40.3],[44.6,39.8],[44.8,39.65],[44.4,39.4],[44.2,38.9],[44.3,38.4],[44.5,37.8],[44.8,37.2],[44.2,37.1],[43,37.35],[42.4,37.2],[41.2,37.1],[40.2,37.1],[39.2,36.7],[38.2,36.85],[37,36.65],[36.7,36.8],[36.6,36.2],[36,35.85],[35.8,36.3],[36.2,36.6],[35.6,36.6],[34.6,36.8],[34,36.3],[33,36.1],[32.5,36.1],[31.8,36.5],[30.6,36.85],[30.4,36.25],[29.6,36.15],[29,36.6],[28.2,36.7],[27.6,36.7],[27.4,37],[27.2,37.4],[27,37.7],[26.4,38.2],[26.8,38.4],[26.7,38.7],[27,38.9],[26.8,39.3],[26.1,39.5],[26.2,40],[26.6,40.4],[27.3,40.4],[28,40.45],[29,40.4],[29.9,40.75],[29.1,40.95]];
  const THRACE = [[26,40.6],[26.35,41],[26.3,41.7],[26.6,41.95],[27.5,42],[28,41.95],[28.6,41.5],[29.1,41.25],[29,41],[28.6,41],[28,40.95],[27.5,40.95],[27.2,40.65],[26.7,40.45],[26.2,40.05]];
  const LAKES = [[[42.3,38.9],[42.9,38.95],[43.4,38.75],[43.6,38.45],[43.2,38.3],[42.8,38.45],[42.4,38.55]],   // Van
                 [[33.2,39],[33.55,38.95],[33.6,38.6],[33.35,38.55],[33.15,38.75]]];                          // Tuz

  const LON0 = 35.4, LAT0 = 39, KX = Math.cos(39 * Math.PI / 180);
  const proj = (lon, lat) => [(lon - LON0) * KX, -(lat - LAT0)];

  class JourneyMap {
    constructor(canvas) {
      this.cv = canvas; this.c = canvas.getContext("2d"); this.base = null;
      this.reached = 0; this.frac = 0; this.running = false; this.onPick = null;
      this.resize = this.resize.bind(this); addEventListener("resize", this.resize);
      canvas.addEventListener("click", (e) => this.click(e));
    }
    setStops(stops) { this.stops = stops; this.base = null; }
    setProgress(reached, frac) { this.reached = reached; this.frac = frac; }
    resize() {
      const r = this.cv.getBoundingClientRect();
      this.cv.width = Math.max(1, Math.round(r.width * DPR)); this.cv.height = Math.max(1, Math.round(r.height * DPR));
      this.base = null;
    }
    // Map units → pixels: Turkey spans about 14.6 × 6.3 units.
    layout() {
      const W = this.cv.width, H = this.cv.height;
      const s = Math.min(W / 15.8, H / 7.4);
      this.L = { s, ox: W / 2, oy: H / 2 + .15 * s };
    }
    px(lon, lat) { const [x, y] = proj(lon, lat); return [this.L.ox + x * this.L.s, this.L.oy + y * this.L.s]; }

    paintBase() {
      const W = this.cv.width, H = this.cv.height;
      this.layout();
      const b = document.createElement("canvas"); b.width = W; b.height = H;
      const c = b.getContext("2d");
      // Night sea
      P.fillAll(c, W, H, [[0, "#070a14"], [.5, "#0a0f1c"], [1, "#05070d"]]);
      const R = rng(4);
      c.strokeStyle = "rgba(120,150,200,.06)"; c.lineWidth = DPR;
      for (let i = 0; i < 160; i++) { const x = R() * W, y = R() * H, l = lerp(10, 40, R()) * DPR; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + l / 2, y - 2 * DPR, x + l, y); c.stroke(); }
      const shape = (pts) => { c.beginPath(); pts.forEach(([lo, la], i) => { const [x, y] = this.px(lo, la); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); };
      // Coast glow
      c.save(); c.shadowColor = "rgba(160,190,255,.35)"; c.shadowBlur = 18 * DPR;
      c.fillStyle = "#17110f"; shape(ANATOLIA); c.fill(); shape(THRACE); c.fill(); c.restore();
      // Land: warm earth with relief, darker and higher to the east
      c.save(); shape(ANATOLIA); shape(THRACE); c.clip();
      const g = c.createLinearGradient(this.px(26, 39)[0], 0, this.px(45, 39)[0], 0);
      g.addColorStop(0, "#2a1f17"); g.addColorStop(.5, "#241913"); g.addColorStop(1, "#1a1210"); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const s = this.L.s;
      for (let i = 0; i < 1400; i++) {
        const lon = lerp(26, 45, R()), lat = lerp(35.8, 42.1, R());
        const h = noise(lon * 1.3) * noise(lat * 1.7 + 9) + (lon - 26) / 40;
        const [x, y] = this.px(lon, lat);
        c.fillStyle = h > .45 ? `rgba(255,220,180,${.05 + .05 * h})` : `rgba(0,0,0,${.12})`;
        c.beginPath(); c.ellipse(x, y, s * lerp(.05, .2, R()), s * lerp(.02, .06, R()), -.3, 0, 7); c.fill();
      }
      // Ridges: the Pontic and Taurus mountains, painted as soft strokes
      const ridge = (pts, a) => { c.strokeStyle = `rgba(255,225,190,${a})`; c.lineWidth = s * .05; c.lineCap = "round"; c.beginPath(); pts.forEach(([lo, la], i) => { const [x, y] = this.px(lo, la); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); };
      ridge([[31.5, 40.9], [34, 41.2], [37, 40.7], [40, 40.6], [42.5, 40.9]], .08);
      ridge([[29.5, 37.2], [31.5, 37], [33, 36.8], [35, 37.3], [37, 37.9], [39.5, 38.3], [42, 38.2]], .08);
      ridge([[41, 39.6], [43, 39.8]], .07);
      c.restore();
      c.strokeStyle = "rgba(220,190,160,.35)"; c.lineWidth = 1.2 * DPR; shape(ANATOLIA); c.stroke(); shape(THRACE); c.stroke();
      c.fillStyle = "#0b1222"; for (const l of LAKES) { shape(l); c.fill(); c.stroke(); }
      // Sea names
      c.fillStyle = "rgba(170,190,230,.28)"; c.textAlign = "center";
      c.font = `italic 500 ${Math.round(s * .26)}px Cormorant, Georgia, serif`;
      const tr = YY.lang() === "tr";
      [[35, 42.6, tr ? "Karadeniz" : "Black Sea"], [32, 35.5, tr ? "Akdeniz" : "Mediterranean"], [25.6, 38.6, tr ? "Ege" : "Aegean"]].forEach(([lo, la, n]) => { const [x, y] = this.px(lo, la); c.fillText(n, x, y); });
      this.base = b;
      // Road through the stops, smoothed
      this.road = this.makeRoad();
    }

    makeRoad() {
      const pts = this.stops.map(s => this.px(s.lon, s.lat));
      const legs = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const seg = [];
        for (let k = 0; k <= 24; k++) {
          const t = k / 24, t2 = t * t, t3 = t2 * t;
          seg.push([0, 1].map(j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
        }
        legs.push(seg);
      }
      return { pts, legs };
    }

    draw(t) {
      if (!this.stops) return;
      if (!this.base) this.paintBase();
      const c = this.c, s = this.L.s, { pts, legs } = this.road;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(this.base, 0, 0);
      const path = (seg, upto = 1) => { const n = Math.max(1, Math.round((seg.length - 1) * upto)); c.moveTo(...seg[0]); for (let k = 1; k <= n; k++) c.lineTo(...seg[k]); };
      // The whole road, faint and dashed
      c.setLineDash([s * .06, s * .08]); c.strokeStyle = "rgba(220,190,150,.35)"; c.lineWidth = s * .025;
      c.beginPath(); legs.forEach(seg => path(seg)); c.stroke(); c.setLineDash([]);
      // The road travelled, in warm gold
      c.lineCap = "round"; c.lineJoin = "round";
      for (const [w, col] of [[s * .14, "rgba(255,170,90,.12)"], [s * .07, "rgba(255,190,110,.35)"], [s * .03, "#ffd59a"]]) {
        c.strokeStyle = col; c.lineWidth = w; c.beginPath();
        legs.forEach((seg, i) => { if (i < this.reached) path(seg); else if (i === this.reached) path(seg, this.frac); });
        c.stroke();
      }
      // Stops
      c.textAlign = "center"; c.textBaseline = "alphabetic";
      const fs = Math.max(12 * DPR, Math.round(s * .26));
      c.font = `500 ${fs}px Cormorant, Georgia, serif`;
      this.hits = [];
      pts.forEach(([x, y], i) => {
        const got = i <= this.reached, next = i === this.reached + 1;
        if (got) P.glow(c, x, y, s * .45, "#ff7a4a", .35 + .1 * Math.sin(t * 1.5 + i));
        c.fillStyle = got ? "#ffe2b0" : next ? "rgba(255,210,170,.6)" : "rgba(200,180,160,.35)";
        c.beginPath(); c.arc(x, y, s * (got ? .07 : .05), 0, 7); c.fill();
        if (got) { c.strokeStyle = "rgba(255,226,176,.6)"; c.lineWidth = DPR; c.beginPath(); c.arc(x, y, s * .12, 0, 7); c.stroke(); }
        const above = [1, 3, 5, 8, 10, 13].includes(i);
        c.lineWidth = 4 * DPR; c.strokeStyle = "rgba(5,4,8,.85)";
        const ly = above ? y - s * .2 : y + s * .3;
        c.strokeText(this.stops[i].name, x, ly);
        c.fillStyle = got ? "#f3ece4" : "rgba(205,195,186,.6)"; c.fillText(this.stops[i].name, x, ly);
        this.hits.push({ x, y, i });
      });
      // Her marker: a petal moving along the road
      const leg = legs[Math.min(this.reached, legs.length - 1)];
      const f = this.reached >= legs.length ? 1 : this.frac;
      const k = Math.min(leg.length - 1, Math.round((leg.length - 1) * f));
      const [mx, my] = this.reached >= legs.length ? pts[pts.length - 1] : leg[k];
      P.glow(c, mx, my, s * .6, "#ff4d62", .45 + .15 * Math.sin(t * 2));
      P.petal(c, mx, my - s * .02, Math.sin(t) * .2, s * .014, "#c43a50");
    }

    click(e) {
      if (!this.hits || !this.onPick) return;
      const r = this.cv.getBoundingClientRect(), x = (e.clientX - r.left) * DPR, y = (e.clientY - r.top) * DPR;
      let best = null, bd = (this.L.s * .45) ** 2;
      for (const h of this.hits) { const d = (h.x - x) ** 2 + (h.y - y) ** 2; if (d < bd) { bd = d; best = h; } }
      if (best) this.onPick(best.i);
    }
    start() { if (this.running) return; this.running = true; const loop = () => { if (!this.running) return; this.draw(performance.now() / 1000); this.raf = requestAnimationFrame(loop); }; loop(); }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
  }
  YY.JourneyMap = JourneyMap;
})();
