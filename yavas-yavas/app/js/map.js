/* The journey map: Turkey engraved in gold leaf on black velvet, like an old cartographer's plate seen through
   a long lens. Contour lines ripple off the coast, the mountains are hand-cut peaks, every stop has its own
   gold landmark, and her road is a filament of light that draws itself when the map opens.
   The plate is painted once to an offscreen canvas; the camera glides over it and only the light animates. */
(() => {
  "use strict";
  const { lerp, clamp, rng, noise, rgba, DPR, ease } = YY;
  const P = YY.paint;

  // Simplified coastline and borders (lon, lat).
  const ANATOLIA = [[29.1,41.2],[30,41.15],[31.2,41.1],[32.3,41.7],[33.3,42],[34.2,41.95],[35.1,42.05],[35.5,41.65],[36.1,41.65],[36.7,41.3],[37.5,41.05],[38.3,40.95],[39.4,41.05],[40.2,40.95],[41,41.2],[41.55,41.5],[42.5,41.5],[43.4,41.15],[43.7,40.7],[43.6,40.3],[44.6,39.8],[44.8,39.65],[44.4,39.4],[44.2,38.9],[44.3,38.4],[44.5,37.8],[44.8,37.2],[44.2,37.1],[43,37.35],[42.4,37.2],[41.2,37.1],[40.2,37.1],[39.2,36.7],[38.2,36.85],[37,36.65],[36.7,36.8],[36.6,36.2],[36,35.85],[35.8,36.3],[36.2,36.6],[35.6,36.6],[34.6,36.8],[34,36.3],[33,36.1],[32.5,36.1],[31.8,36.5],[30.6,36.85],[30.4,36.25],[29.6,36.15],[29,36.6],[28.2,36.7],[27.6,36.7],[27.4,37],[27.2,37.4],[27,37.7],[26.4,38.2],[26.8,38.4],[26.7,38.7],[27,38.9],[26.8,39.3],[26.1,39.5],[26.2,40],[26.6,40.4],[27.3,40.4],[28,40.45],[29,40.4],[29.9,40.75],[29.1,40.95]];
  const THRACE = [[26,40.6],[26.35,41],[26.3,41.7],[26.6,41.95],[27.5,42],[28,41.95],[28.6,41.5],[29.1,41.25],[29,41],[28.6,41],[28,40.95],[27.5,40.95],[27.2,40.65],[26.7,40.45],[26.2,40.05]];
  const LAKES = [[[42.3,38.9],[42.9,38.95],[43.4,38.75],[43.6,38.45],[43.2,38.3],[42.8,38.45],[42.4,38.55]],
                 [[33.2,39],[33.55,38.95],[33.6,38.6],[33.35,38.55],[33.15,38.75]]];
  const RIDGES = [[[31.5,40.75],[34,41.05],[37,40.55],[40,40.45],[42.5,40.75]], [[29.5,37.25],[31.5,37.05],[33,36.85],[35,37.35],[37,37.95],[39.5,38.35],[42,38.25]], [[41,39.55],[43,39.75]]];

  // Gold landmarks, drawn on a 20×20 plate standing on y = 20.
  const GLYPH = {
    istanbul: "M5 20V13H15V20M5 13Q10 5 15 13M10 7.6V5M2.5 20V7M2 7L2.5 3.5L3 7M17.5 20V7M17 7L17.5 3.5L18 7M8.5 20V17Q10 15.5 11.5 17V20",
    bursa: "M4 20V12H16V20M4 12Q10 4 16 12M10 6V3.5M8 20V16Q10 14 12 16V20",
    canakkale: "M3.5 20L5 9M16.5 20L15 9M8 20L8.5 9M12 20L11.5 9M2 9H18V6H2Z",
    izmir: "M8 20V9H12V20M7 20H13M8 9L7.5 7H12.5L12 9M8.5 7V5.5Q10 2.5 11.5 5.5V7M11.2 13.5A1.2 1.2 0 1 1 8.8 13.5A1.2 1.2 0 1 1 11.2 13.5",
    pamukkale: "M1 20H19M2 20Q4 17.5 6 20Q8 17.5 10 20Q12 17.5 14 20Q16 17.5 18 20M4 16H16M4 16Q6 13.5 8 16Q10 13.5 12 16Q14 13.5 16 16M6 12H14M6 12Q8 9.5 10 12Q12 9.5 14 12",
    antalya: "M8 20V8H12V20M8 8L10 1.5L12 8M9 20V8M10 20V8M11 20V8M6 20H14M7.5 11H12.5",
    konya: "M7 20V10H13V20M7 10L10 2L13 10M8.5 10L10 2L11.5 10M4 20V15H16V20",
    kapadokya: "M9 6.5A4 4.5 0 1 1 17 6.5Q17 9 14.2 11.2H11.8Q9 9 9 6.5ZM12 11.2V13H14V11.2M13 2V11M2 20Q3 12 4 11Q5 12 6 20M3 11.4Q4 8.6 5 11.4M6 20Q7 15.5 8 14.5Q9 15.5 9.6 20",
    ankara: "M1 20H19M2 18H18M3 18V11M5.5 18V11M8 18V11M10.5 18V11M13 18V11M15.5 18V11M17 18V11M2 11H18M3 11V9H17V11",
    trabzon: "M1 20L3 4L8 2L12 5L19 3V20M7 12H14V16H7ZM8.5 14V16M10.5 14V16M12.5 14V16M7 12L10.5 10L14 12",
    erzurum: "M4 20V7H6V20M4 7L5 3L6 7M14 20V7H16V20M14 7L15 3L16 7M6 20V13H14V20M8 20V16Q10 13 12 16V20",
    kars: "M1 20Q6 14 10 14T19 20M5 15V10H15V15M5 10V8H7V10M9 10V8H11V10M13 10V8H15V10M9 15V12.5Q10 11 11 12.5V15",
    van: "M1 19H19M3 19Q10 16.5 17 19M7 16.6V11H13V16.6M7 11L10 9.2L13 11M8.6 9.9L10 4.5L11.4 9.9",
    gaziantep: "M3 20V9H17V20M3 9V7H5V9M7 9V7H9V9M11 9V7H13V9M15 9V7H17V9M8 20V15Q10 12 12 15V20M2 20H18",
    balikesir: "M7.5 20V7H12.5V20M6.5 20H13.5M7 7L10 2.5L13 7M11.4 11A1.4 1.4 0 1 1 8.6 11A1.4 1.4 0 1 1 11.4 11M10 11V10M10 11H10.8M8.8 20V16.5Q10 15 11.2 16.5V20",
    giresun: "M1 20H19M1 20Q3 12 7 10.5Q11 10 12.5 14M3 12.5V9.5H8V11M3 9.5V8.5H4V9.5M5 9.5V8.5H6V9.5M7 9.5V8.5H8V9.5M12 18.5Q15 14.5 18 18.5M11 18.5H19",
    savastepe: "M4 20V13L10 8L16 13V20M8 20V16H12V20M10 5.2A.9.9 0 1 1 10.9 4.6A2 2 0 1 1 8.4 3.6A3.2 3.2 0 1 1 13 5.6",
  };
  const PATHS = Object.fromEntries(Object.entries(GLYPH).map(([k, d]) => [k, new Path2D(d)]));

  const LON0 = 35.4, LAT0 = 39, KX = Math.cos(39 * Math.PI / 180);
  const proj = (lon, lat) => [(lon - LON0) * KX, -(lat - LAT0)];
  const WORLD = [16.6, 8.4];   // map units the plate spans

  class JourneyMap {
    constructor(canvas) {
      this.cv = canvas; this.c = canvas.getContext("2d"); this.base = null;
      this.reached = 0; this.frac = 0; this.sel = 0; this.running = false; this.onPick = null;
      this.cam = null; this.camT = 0; this.drag = null; this.intro = 0;
      this.resize = this.resize.bind(this); addEventListener("resize", this.resize);
      canvas.addEventListener("pointerdown", (e) => { this.drag = { x: e.clientX, cam: this.camT, moved: false }; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener("pointermove", (e) => {
        if (!this.drag) return;
        const dx = e.clientX - this.drag.x;
        if (Math.abs(dx) > 6) this.drag.moved = true;
        if (this.drag.moved) this.camT = this.clampCam(this.drag.cam - dx * DPR);
      });
      canvas.addEventListener("pointerup", (e) => { const d = this.drag; this.drag = null; if (d && !d.moved) this.click(e); });
      canvas.addEventListener("pointercancel", () => { this.drag = null; });
    }
    setStops(stops) { this.stops = stops; this.base = null; }
    setProgress(reached, frac) { if (reached !== this.reached) this.base = null; this.reached = reached; this.frac = frac; }
    resize() {
      const r = this.cv.getBoundingClientRect();
      this.cv.width = Math.max(1, Math.round(r.width * DPR)); this.cv.height = Math.max(1, Math.round(r.height * DPR));
      this.base = null;
    }
    // The plate is as tall as the window; on a phone it is wider than the screen and the camera pans along it.
    layout() {
      const W = this.cv.width, H = this.cv.height;
      const s = H / WORLD[1];
      const BW = Math.max(W, Math.round(WORLD[0] * s));
      this.L = { s, BW, ox: BW / 2, oy: H / 2 + .1 * s };
    }
    px(lon, lat) { const [x, y] = proj(lon, lat); return [this.L.ox + x * this.L.s, this.L.oy + y * this.L.s]; }
    clampCam(x) { const W = this.cv.width, BW = this.L ? this.L.BW : W; return BW <= W ? BW / 2 : clamp(x, W / 2, BW - W / 2); }

    paintBase() {
      this.layout();
      const H = this.cv.height, { s, BW } = this.L;
      const b = document.createElement("canvas"); b.width = BW; b.height = H;
      const c = b.getContext("2d");
      const R = rng(4);
      const trace = (ctx, pts) => { pts.forEach(([lo, la], i) => { const [x, y] = this.px(lo, la); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); };
      const land = (ctx) => { ctx.beginPath(); trace(ctx, ANATOLIA); trace(ctx, THRACE); };

      // Night sea, deep ink
      const sea = c.createRadialGradient(BW * .5, H * .45, 0, BW * .5, H * .45, Math.hypot(BW, H) * .6);
      sea.addColorStop(0, "#0b1226"); sea.addColorStop(.6, "#070b18"); sea.addColorStop(1, "#030409");
      c.fillStyle = sea; c.fillRect(0, 0, BW, H);
      // Engraved swell lines across the open water
      c.strokeStyle = "rgba(150,175,230,.07)"; c.lineWidth = DPR * .8;
      for (let y = 0; y < H; y += 6 * DPR) {
        c.beginPath();
        for (let x = 0; x <= BW; x += 12 * DPR) { const yy = y + Math.sin(x * .012 / DPR + y * .05) * 1.6 * DPR; x ? c.lineTo(x, yy) : c.moveTo(x, yy); }
        c.stroke();
      }
      // Contour lines rippling off the coast, fading out to sea: each ring is a wide gold stroke with a slightly narrower one cut from it.
      const ring = document.createElement("canvas"); ring.width = BW; ring.height = H;
      const rc = ring.getContext("2d"); rc.lineJoin = "round";
      for (let i = 12; i >= 1; i--) {
        const w = i * s * .11;
        rc.globalCompositeOperation = "source-over"; rc.strokeStyle = `rgba(244,211,154,${(.42 * Math.pow(1 - i / 13, 1.3)).toFixed(3)})`; rc.lineWidth = w; land(rc); rc.stroke();
        rc.globalCompositeOperation = "destination-out"; rc.strokeStyle = "#000"; rc.lineWidth = w - 1.1 * DPR; land(rc); rc.stroke();
      }
      c.drawImage(ring, 0, 0);

      // Land: dark velvet, warmer in the west, a gold halo where it meets the sea
      c.save(); c.shadowColor = "rgba(255,190,120,.35)"; c.shadowBlur = 12 * DPR; c.fillStyle = "#1c130f"; land(c); c.fill(); c.restore();
      c.save(); land(c); c.clip();
      const g = c.createLinearGradient(this.px(26, 39)[0], 0, this.px(45, 39)[0], 0);
      g.addColorStop(0, "#2c1d15"); g.addColorStop(.55, "#21160f"); g.addColorStop(1, "#150e0b"); c.fillStyle = g; c.fillRect(0, 0, BW, H);
      // Burin hatching, denser where the land rises to the east
      for (let i = 0; i < 2600; i++) {
        const lon = lerp(26, 45, R()), lat = lerp(35.8, 42.1, R());
        const h = noise(lon * 1.3) * noise(lat * 1.7 + 9) + (lon - 26) / 30;
        if (R() > h) continue;
        const [x, y] = this.px(lon, lat), l = s * lerp(.06, .16, R());
        c.strokeStyle = `rgba(0,0,0,${(.25 + .2 * h).toFixed(2)})`; c.lineWidth = DPR * .9;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y - l * .45); c.stroke();
      }
      // Soft light from the upper left, the same key light as the rose
      const kl = c.createLinearGradient(0, 0, BW * .7, H);
      kl.addColorStop(0, "rgba(255,200,140,.12)"); kl.addColorStop(1, "rgba(0,0,0,.25)");
      c.fillStyle = kl; c.fillRect(0, 0, BW, H);
      // Hand-cut peaks along the Pontic and Taurus ranges
      for (const r of RIDGES) for (let k = 0; k < r.length - 1; k++) {
        const [a, bb] = [r[k], r[k + 1]], n = Math.ceil(Math.hypot(bb[0] - a[0], bb[1] - a[1]) / .32);
        for (let j = 0; j < n; j++) {
          const u = (j + R() * .5) / n, [x, y] = this.px(lerp(a[0], bb[0], u), lerp(a[1], bb[1], u) + (R() - .5) * .3), h = s * lerp(.1, .2, R());
          c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + h * .8, y); c.lineTo(x, y); c.fill();
          c.strokeStyle = "rgba(244,211,154,.3)"; c.lineWidth = DPR; c.beginPath(); c.moveTo(x - h * .8, y); c.lineTo(x, y - h); c.lineTo(x + h * .8, y); c.stroke();
          c.strokeStyle = "rgba(244,211,154,.12)"; for (let q = 1; q < 3; q++) { c.beginPath(); c.moveTo(x + h * .2 * q, y - h + h * .25 * q); c.lineTo(x + h * .2 * q, y); c.stroke(); }
        }
      }
      c.restore();
      // Gold-leaf coast
      c.save(); c.strokeStyle = "rgba(244,211,154,.75)"; c.lineWidth = 1.3 * DPR; c.shadowColor = "rgba(255,200,130,.8)"; c.shadowBlur = 6 * DPR; land(c); c.stroke(); c.restore();
      c.fillStyle = "#0a1226"; c.strokeStyle = "rgba(244,211,154,.55)"; c.lineWidth = DPR;
      LAKES.forEach((l, i) => { c.fillStyle = i ? "rgba(225,220,205,.22)" : "#0a1226"; c.beginPath(); trace(c, l); c.fill(); c.stroke(); });

      // Sea names, engraved italics
      const tr = YY.lang() === "tr";
      c.textAlign = "center"; c.fillStyle = "rgba(190,205,240,.34)";
      c.font = `italic 400 ${Math.round(s * .3)}px Cormorant, Georgia, serif`;
      if (c.letterSpacing !== undefined) c.letterSpacing = `${Math.round(s * .08)}px`;
      [[33.5, 42.5, tr ? "Karadeniz" : "Black Sea"], [32.5, 35.4, tr ? "Akdeniz" : "Mediterranean"], [25.7, 38.4, tr ? "Ege" : "Aegean"]].forEach(([lo, la, n]) => { const [x, y] = this.px(lo, la); c.fillText(n, x, y); });
      if (c.letterSpacing !== undefined) c.letterSpacing = "0px";
      this.compass(c, ...this.px(41.6, 42.6), s * .55);

      // Landmarks and names
      const fs = Math.max(12 * DPR, Math.round(s * .21));
      this.stops.forEach((st, i) => {
        const [x, y] = this.px(st.lon, st.lat), got = i <= this.reached, home = i === this.stops.length - 1;
        const gs = s * (home ? .46 : .36), p = PATHS[st.id];
        if (p) {
          c.save(); c.translate(x - gs / 2, y - gs * 1.18); c.scale(gs / 20, gs / 20);
          c.lineWidth = (got ? 1.25 : 1) * DPR * 20 / gs; c.lineCap = "round"; c.lineJoin = "round";
          if (got) { c.shadowColor = home ? "rgba(255,90,110,.9)" : "rgba(255,190,110,.8)"; c.shadowBlur = 8 * DPR; }
          c.strokeStyle = got ? (home ? "#ffb0a0" : "#f4d39a") : home ? "rgba(255,150,150,.45)" : "rgba(220,195,160,.34)";
          c.stroke(p); c.restore();
        }
        c.textAlign = "center"; c.textBaseline = "top";
        c.font = `${got ? 600 : 500} ${fs}px Cormorant, Georgia, serif`;
        c.lineWidth = 4 * DPR; c.strokeStyle = "rgba(5,4,8,.9)"; c.strokeText(st.name, x, y + s * .1);
        c.fillStyle = got ? "#f8eee2" : "rgba(215,200,185,.55)"; c.fillText(st.name, x, y + s * .1);
      });
      this.base = b;
      this.road = this.makeRoad();
      if (this.cam == null) { this.cam = this.camT = this.clampCam(this.road.pts[0][0]); }
    }

    // A compass rose cut like the black rose: sixteen points, a spiral at the heart.
    compass(c, x, y, r) {
      c.save(); c.translate(x, y); c.strokeStyle = "rgba(244,211,154,.4)"; c.lineWidth = DPR;
      c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, r * .86, 0, 7); c.stroke();
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8, l = i % 4 === 0 ? r * 1.25 : i % 2 === 0 ? r * .8 : r * .55, w = r * (i % 4 === 0 ? .14 : .09);
        c.beginPath(); c.moveTo(Math.cos(a) * l, Math.sin(a) * l); c.lineTo(Math.cos(a + 1.57) * w, Math.sin(a + 1.57) * w); c.lineTo(0, 0); c.closePath();
        c.fillStyle = i % 4 === 0 ? "rgba(244,211,154,.35)" : "rgba(244,211,154,.14)"; c.fill(); c.stroke();
      }
      c.beginPath(); for (let a = 0; a < 14; a += .2) { const rr = r * .02 * a; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.strokeStyle = "rgba(255,150,150,.7)"; c.stroke();
      c.fillStyle = "rgba(244,211,154,.6)"; c.textAlign = "center"; c.textBaseline = "bottom"; c.font = `600 ${Math.round(r * .4)}px Cormorant, Georgia, serif`; c.fillText("N", 0, -r * 1.3);
      c.restore();
    }

    makeRoad() {
      const pts = this.stops.map(s => this.px(s.lon, s.lat));
      const legs = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const seg = [];
        for (let k = 0; k <= 32; k++) {
          const t = k / 32, t2 = t * t, t3 = t2 * t;
          const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2, kt = .22;
          seg.push([0, 1].map(j => h00 * p1[j] + h10 * (p2[j] - p0[j]) * kt + h01 * p2[j] + h11 * (p3[j] - p1[j]) * kt));
        }
        legs.push(seg);
      }
      return { pts, legs };
    }

    // Where she is on the road: leg + fraction, as one number (2.4 = 40% of the way from stop 3 to stop 4).
    at(pos) {
      const { legs, pts } = this.road;
      if (pos >= legs.length) return pts[pts.length - 1];
      const leg = legs[Math.floor(pos)], k = (pos % 1) * (leg.length - 1), k0 = Math.floor(k), u = k - k0;
      const a = leg[k0], b = leg[Math.min(leg.length - 1, k0 + 1)];
      return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
    }
    trail(c, from, to) {
      const steps = Math.max(2, Math.ceil((to - from) * 32));
      c.beginPath();
      for (let i = 0; i <= steps; i++) { const [x, y] = this.at(lerp(from, to, i / steps)); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    }

    draw(t) {
      if (!this.stops) return;
      if (!this.base) this.paintBase();
      const c = this.c, W = this.cv.width, H = this.cv.height, s = this.L.s, { pts, legs } = this.road;
      // Camera: glide toward the target, a breath of drift on top
      this.cam = lerp(this.cam, this.camT, this.drag ? .35 : .05);
      const camX = Math.round(this.cam - W / 2 + Math.sin(t * .15) * 6 * DPR * (YY.reduceMotion ? 0 : 1));
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = "#030409"; c.fillRect(0, 0, W, H);
      c.drawImage(this.base, -camX, 0);
      c.translate(-camX, 0);

      const pos = Math.min(legs.length, this.reached + this.frac);
      const reveal = YY.reduceMotion ? 1 : ease(clamp((t - this.intro) / 3.2));
      const shown = pos * reveal;
      c.lineCap = "round"; c.lineJoin = "round";
      // The road ahead: a fine engraved dotted line
      c.setLineDash([s * .02, s * .07]); c.strokeStyle = "rgba(244,211,154,.4)"; c.lineWidth = s * .022;
      c.beginPath(); legs.forEach(seg => { c.moveTo(...seg[0]); seg.forEach(p => c.lineTo(...p)); }); c.stroke(); c.setLineDash([]);
      // The road travelled: a filament of light
      if (shown > 0) {
        for (const [w, col] of [[s * .16, "rgba(255,120,80,.10)"], [s * .07, "rgba(255,180,110,.32)"], [s * .025, "#ffe2b0"]]) {
          c.strokeStyle = col; c.lineWidth = w; this.trail(c, 0, shown); c.stroke();
        }
        // A pulse of light runs along it, again and again
        const pu = ((t * .35) % 1.4) / 1.2;
        if (pu < 1 && !YY.reduceMotion) for (let k = 0; k < 10; k++) {
          const [x, y] = this.at(clamp(pu * shown - k * .04, 0, shown));
          P.glow(c, x, y, s * (.22 - k * .016), "#ffd59a", .5 * (1 - k / 10));
        }
      }
      // Stops: small stars; the ones she has reached burn warm
      pts.forEach(([x, y], i) => {
        const got = i <= this.reached && i <= Math.ceil(shown);
        if (got) P.glow(c, x, y, s * .5, i === pts.length - 1 ? "#ff4d62" : "#ff9a5a", .28 + .08 * Math.sin(t * 1.5 + i));
        c.fillStyle = got ? "#fff1d6" : "rgba(220,200,170,.45)";
        c.beginPath(); c.arc(x, y, s * (got ? .045 : .03), 0, 7); c.fill();
        if (i === this.sel) {
          const r = s * (.2 + .02 * Math.sin(t * 2));
          c.strokeStyle = "rgba(244,211,154,.85)"; c.lineWidth = 1.2 * DPR;
          for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + t * .3; c.beginPath(); c.arc(x, y, r, a + .25, a + 1.3); c.stroke(); }
        }
      });
      // Her: a petal of light moving along the road
      const [mx, my] = this.at(shown);
      P.glow(c, mx, my, s * .7, "#ff4d62", .4 + .15 * Math.sin(t * 2));
      P.petal(c, mx, my - s * .02, Math.sin(t) * .25, s * .016, "#e04a62");

      c.setTransform(1, 0, 0, 1, 0, 0);
      // Mist drifting in front of the lens, moving faster than the plate
      if (!this.fog) { const R = rng(12); this.fog = Array.from({ length: 6 }, () => ({ x: R(), y: R(), r: lerp(.25, .5, R()), sp: lerp(.004, .012, R()) })); }
      for (const f of this.fog) {
        const fx = (((f.x + t * f.sp) % 1.4) - .2) * W - (this.cam - this.L.BW / 2) * .25, fy = f.y * H, r = f.r * Math.max(W, H);
        const gr = c.createRadialGradient(fx, fy, 0, fx, fy, r);
        gr.addColorStop(0, "rgba(190,200,230,.05)"); gr.addColorStop(1, "rgba(190,200,230,0)");
        c.fillStyle = gr; c.fillRect(fx - r, fy - r, r * 2, r * 2);
      }
      this.hits = pts.map(([x, y], i) => ({ x: x - camX, y, i }));
    }

    focus(i) { this.sel = i; if (this.road) this.camT = this.clampCam(this.road.pts[i][0]); }
    click(e) {
      if (!this.hits) return;
      const r = this.cv.getBoundingClientRect(), x = (e.clientX - r.left) * DPR, y = (e.clientY - r.top) * DPR;
      let best = null, bd = (this.L.s * .5) ** 2;
      for (const h of this.hits) { const d = (h.x - x) ** 2 + (h.y - y) ** 2; if (d < bd) { bd = d; best = h; } }
      if (best) { this.focus(best.i); if (this.onPick) this.onPick(best.i); }
    }
    start() {
      if (this.running) return; this.running = true;
      if (!this.base && this.stops) this.paintBase();
      // Each time the map opens: start over İstanbul, the road draws itself, the camera follows it to her.
      this.intro = performance.now() / 1000;
      if (this.road) { this.cam = this.clampCam(this.road.pts[0][0]); this.focus(this.sel); }
      const loop = () => { if (!this.running) return; this.draw(performance.now() / 1000); this.raf = requestAnimationFrame(loop); };
      loop();
    }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
  }
  YY.JourneyMap = JourneyMap;
})();
