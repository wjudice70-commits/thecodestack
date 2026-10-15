/* Our Story: one painter per scene. Props live on the 1000×1000 stage (x, y in -500..500).
   No faces anywhere: the story is told with light, objects and places. */
(() => {
  "use strict";
  const { lerp, clamp, rng, noise, rgba, mix, smooth, DPR } = YY;
  const P = YY.paint;
  const S = (YY.storyScenes = {});

  // Shared: a dark plastered interior wall with a floor, lit from a point. Painted once into a cached
  // layer; `extra(L)` adds the scene's own static set dressing into the same layer.
  function room(x, wall = "#120b0a", floor = "#0a0606", floorY = 140, lx = 0, ly = -200, warmth = .18, extra = null, key = "room") {
    P.layer(x, key, (L) => {
      const { c, W, H } = L;
      L.full();
      P.fillAll(c, W, H, [[0, mix(wall, "#000000", .6)], [.45, wall], [1, mix(wall, "#000000", .75)]]);
      // plaster: soft mottling and a few long vertical drips of shadow
      P.mottle(c, 0, 0, W, H, 3, 46, [mix(wall, "#ffffff", .12), mix(wall, "#000000", .5)], .22, L.S * .04, L.S * .22);
      const fy = L.sy(floorY);
      P.glow(c, L.sx(lx), L.sy(ly), L.S * 1.05, "#ff9a4a", warmth);
      P.glow(c, L.sx(lx), L.sy(ly), L.S * .4, "#ffc890", warmth * .6);
      // skirting board
      c.fillStyle = mix(wall, "#000000", .65); c.fillRect(0, fy - L.S * .03, W, L.S * .03);
      c.fillStyle = rgba("#ffd2a0", .06); c.fillRect(0, fy - L.S * .03, W, Math.max(1, L.S * .002));
      // floor: boards running away, the lamp pooled on them
      c.fillStyle = P.vgrad(c, 0, fy, 0, H, [[0, floor], [1, mix(floor, "#000000", .8)]]);
      c.fillRect(0, fy, W, H - fy);
      c.save(); c.globalAlpha = .5;
      P.woodGrain(c, 0, fy, W, H - fy, 11, 40, "#000000", .35);
      c.restore();
      P.glow(c, L.sx(lx), fy + L.S * .08, L.S * .7, "#ff9a4a", warmth * .5);
      // corner shadow where wall meets floor
      c.fillStyle = P.vgrad(c, 0, fy, 0, fy + L.S * .06, [[0, "rgba(0,0,0,.45)"], [1, "rgba(0,0,0,0)"]]); c.fillRect(0, fy, W, L.S * .06);
      if (extra) { L.stage(); extra(L); }
    });
  }

  // A window frame with depth: outer casing, mullions, a lit inner edge and a sill.
  function windowFrame(c, x0, y0, w, h, frame = "#070505", bars = 1, rim = "rgba(255,200,150,.10)") {
    c.fillStyle = frame;
    c.fillRect(x0 - 18, y0 - 18, w + 36, 18); c.fillRect(x0 - 18, y0 + h, w + 36, 18);
    c.fillRect(x0 - 18, y0, 18, h); c.fillRect(x0 + w, y0, 18, h);
    c.fillStyle = rim; c.fillRect(x0, y0, w, 3); c.fillRect(x0 + w - 3, y0, 3, h);
    if (bars) {
      c.fillStyle = frame; c.fillRect(x0 + w / 2 - 5, y0, 10, h); c.fillRect(x0, y0 + h * .45 - 5, w, 10);
      c.fillStyle = rim; c.fillRect(x0 + w / 2 + 3, y0, 2, h); c.fillRect(x0, y0 + h * .45 + 3, w, 2);
    }
    // sill
    c.fillStyle = mix(frame.length === 7 ? frame : "#070505", "#3a2a20", .35); c.fillRect(x0 - 40, y0 + h + 14, w + 80, 16);
    c.fillStyle = rim; c.fillRect(x0 - 40, y0 + h + 14, w + 80, 2);
  }

  // A polished wooden tabletop running off-frame, with grain and a lit front edge. Use inside a cached layer.
  function tableTop(c, y, color = "#2a1810", edge = "#120a06", seed = 5) {
    c.fillStyle = P.vgrad(c, 0, y, 0, y + 520, [[0, mix(color, "#ffcf9a", .1)], [.2, color], [1, edge]]);
    c.fillRect(-1400, y, 2800, 1200);
    P.woodGrain(c, -1400, y + 4, 2800, 420, seed, 36, "#000000", .3);
    P.woodGrain(c, -1400, y + 4, 2800, 420, seed + 1, 14, mix(color, "#ffd2a0", .5), .12);
    c.fillStyle = "rgba(255,210,160,.14)"; c.fillRect(-1400, y, 2800, 2);
    c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(-1400, y + 2, 2800, 3);
  }

  // A simple warm-lit reflection of a flame/glow on a polished surface (live).
  function sheen(c, x, y, w, h, color, a) {
    c.save(); c.globalCompositeOperation = "lighter"; c.translate(x, y); c.scale(w / h, 1);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, h);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(-h, -h, h * 2, h * 2); c.restore();
  }

  // A Turkish tulip tea glass on its saucer, base at (x, y), scale s. Static: use in cached layers.
  function teaGlass(c, x, y, s = 1, light = -1) {
    c.save(); c.translate(x, y); c.scale(s, s);
    P.shadow(c, 0, 4, 100, 22, .55);
    // saucer
    c.fillStyle = P.vgrad(c, -90, 0, 90, 0, [[0, "#8a8278"], [.4, "#f4efe6"], [1, "#9a9288"]]);
    c.beginPath(); c.ellipse(0, 0, 88, 20, 0, 0, 7); c.fill();
    c.strokeStyle = "#c9a24a"; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, -1, 78, 16, 0, 0, 7); c.stroke();
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(0, -2, 34, 8, 0, 0, 7); c.fill();
    const prof = (k) => { // the tulip profile, inset by k
      c.beginPath(); c.moveTo(-40 + k, -150); c.bezierCurveTo(-50 + k, -86, -14 + k, -66, -27 + k, -4); c.quadraticCurveTo(0, 2, 27 - k, -4);
      c.bezierCurveTo(14 - k, -66, 50 - k, -86, 40 - k, -150); c.closePath();
    };
    // the tea: deep amber, glowing where the light comes through
    c.save(); prof(3); c.clip();
    c.fillStyle = P.vgrad(c, -40, 0, 40, 0, [[0, "#3a0a02"], [.5 + light * .25, "#c8441a"], [1, "#4a1004"]]);
    c.fillRect(-60, -124, 120, 130);
    c.fillStyle = "rgba(255,190,120,.35)"; c.beginPath(); c.ellipse(0, -124, 36, 5, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(255,220,180,.10)"; c.fillRect(-60, -150, 120, 26);
    c.restore();
    // glass edges and highlights
    c.strokeStyle = "rgba(255,240,225,.35)"; c.lineWidth = 1.6; prof(0); c.stroke();
    c.strokeStyle = "rgba(255,245,235,.55)"; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, -150, 40, 6, 0, 0, 7); c.stroke();
    P.spec(c, light * 30, -140, light * 22, -100, 3, .55);
    P.spec(c, light * 18, -60, light * 20, -20, 2, .35);
    c.restore();
  }

  // A wool coat hanging from a hook at (hx, hy): drape, folds, lapels, sleeves, warm key and cool rim.
  function coat(c, hx, hy, s, col, dark, seed) {
    c.save(); c.translate(hx, hy); c.scale(s, s);
    const body = () => {
      c.beginPath(); c.moveTo(-6, 14); c.bezierCurveTo(-30, 24, -58, 52, -70, 84);
      c.bezierCurveTo(-82, 180, -88, 300, -100, 430); c.bezierCurveTo(-40, 444, 30, 438, 100, 428);
      c.bezierCurveTo(88, 300, 82, 180, 70, 84); c.bezierCurveTo(58, 52, 30, 24, 6, 14); c.closePath();
    };
    P.shadow(c, 20, 200, 150, 260, .35);
    c.fillStyle = P.vgrad(c, -100, 0, 100, 0, [[0, mix(col, "#ffd0a0", .08)], [.35, col], [.75, dark], [1, mix(dark, "#000000", .4)]]);
    body(); c.fill();
    c.save(); body(); c.clip();
    // folds falling from the shoulders
    const R = rng(seed);
    for (let i = 0; i < 7; i++) {
      const fx = lerp(-80, 80, (i + R() * .6) / 7), w = lerp(14, 28, R());
      const g = c.createLinearGradient(fx - w, 0, fx + w, 0);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.35, "rgba(0,0,0,.35)"); g.addColorStop(.6, rgba("#ffe0c0", .08)); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(fx * .4 - 4, 60); c.lineTo(fx * .4 + 4, 60); c.lineTo(fx * 1.1 + w, 440); c.lineTo(fx * 1.1 - w, 440); c.fill();
    }
    // weave texture
    c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 1;
    for (let i = 0; i < 30; i++) { const y = 60 + i * 13 + R() * 4; c.beginPath(); c.moveTo(-100, y); c.lineTo(100, y + 3); c.stroke(); }
    // shade under the lapels, light along the warm side
    c.fillStyle = P.vgrad(c, 0, 400, 0, 440, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.45)"]]); c.fillRect(-110, 400, 220, 50);
    c.restore();
    // lapels
    c.fillStyle = mix(col, "#000000", .3);
    c.beginPath(); c.moveTo(-6, 16); c.lineTo(-44, 60); c.lineTo(-26, 120); c.lineTo(-4, 200); c.closePath(); c.fill();
    c.fillStyle = mix(dark, "#000000", .3);
    c.beginPath(); c.moveTo(6, 16); c.lineTo(44, 60); c.lineTo(26, 120); c.lineTo(4, 200); c.closePath(); c.fill();
    c.strokeStyle = rgba("#ffd8b0", .14); c.lineWidth = 2; c.beginPath(); c.moveTo(-44, 60); c.lineTo(-26, 120); c.lineTo(-4, 200); c.stroke();
    // sleeves hanging slightly forward
    for (const sd of [-1, 1]) {
      const sg = c.createLinearGradient(sd * 80, 0, sd * 40, 0);
      sg.addColorStop(0, sd < 0 ? mix(col, "#ffd0a0", .06) : mix(dark, "#000000", .3)); sg.addColorStop(1, mix(sd < 0 ? col : dark, "#000000", .45));
      c.fillStyle = sg;
      c.beginPath(); c.moveTo(sd * 62, 80); c.bezierCurveTo(sd * 84, 160, sd * 84, 260, sd * 78, 350); c.lineTo(sd * 46, 356);
      c.bezierCurveTo(sd * 52, 260, sd * 50, 170, sd * 40, 110); c.closePath(); c.fill();
      c.fillStyle = "rgba(0,0,0,.3)"; c.fillRect(Math.min(sd * 78, sd * 46), 330, 32, 5);
    }
    // buttons
    for (let i = 0; i < 3; i++) { c.fillStyle = "#0a0606"; c.beginPath(); c.arc(8, 220 + i * 60, 6, 0, 7); c.fill(); c.fillStyle = "rgba(255,220,180,.25)"; c.beginPath(); c.arc(6, 218 + i * 60, 2, 0, 7); c.fill(); }
    // warm key light on the left edge, cool rim from the door on the right
    c.lineWidth = 3;
    c.strokeStyle = rgba("#ffb37a", .3); c.beginPath(); c.moveTo(-70, 84); c.bezierCurveTo(-82, 180, -88, 300, -100, 430); c.stroke();
    c.strokeStyle = rgba("#9ab4ff", .3); c.beginPath(); c.moveTo(70, 84); c.bezierCurveTo(82, 180, 88, 300, 100, 428); c.stroke();
    // the hook and the coat's hanging loop
    c.fillStyle = "#c9a24a"; c.fillRect(-4, -18, 8, 20); c.beginPath(); c.arc(0, 4, 7, 0, Math.PI); c.fill();
    c.restore();
  }

  // A brass candle dish.
  function brassDish(c, x, y, r = 46) {
    P.shadow(c, x, y + 4, r * 1.6, r * .4, .6);
    c.fillStyle = P.vgrad(c, x - r, 0, x + r, 0, [[0, "#3a2408"], [.35, "#c9963a"], [.5, "#ffe2a0"], [.7, "#a8762a"], [1, "#2a1806"]]);
    c.beginPath(); c.ellipse(x, y, r, r * .26, 0, 0, 7); c.fill();
    c.fillStyle = P.vgrad(c, x - r * .6, 0, x + r * .6, 0, [[0, "#5a3a10"], [.5, "#e8b860"], [1, "#4a2c0a"]]);
    c.beginPath(); c.ellipse(x, y - r * .1, r * .62, r * .14, 0, 0, 7); c.fill();
  }

  /* 1. The lake, the third floor */
  S.lake = (x) => {
    const { c, W, H, t, m } = x;
    const HZ = 60, MX = -300, MY = -400;           // horizon and moon, in stage units
    const FL = (i) => 430 - (i - 1) * 200;            // base of floor i (1 = ground)
    const COLS = [200, 345, 490];
    if (!m.i) {
      m.i = 1;
      const R = rng(44);
      m.tw = Array.from({ length: 24 }, () => ({ x: R(), y: R() * .3, ph: R() * 6 }));
      m.town = Array.from({ length: 46 }, () => ({ x: lerp(-1300, 160, R()), y: HZ - 4 - R() * 10, c: ["#ffcf8a", "#ffe6c0", "#ff9a6a", "#cfe0ff"][(R() * 4) | 0], a: lerp(.4, 1, R()), ph: R() * 6 }));
      m.glit = Array.from({ length: 130 }, () => ({ v: Math.pow(R(), 1.3), o: R() - .5, ph: R() * 6, sp: lerp(1, 3, R()), l: lerp(.5, 1.5, R()) }));
    }
    // ---- sky, far shore, water and the building: painted once ----
    P.layer(x, "bg", (L) => {
      const { c } = L;
      L.full();
      const hz = L.sy(HZ);
      P.fillAll(c, W, H, [[0, "#02030b"], [Math.max(.01, hz / H * .55), "#0a1230"], [hz / H * .92, "#2a2140"], [hz / H, "#46304a"], [Math.min(1, hz / H + .001), "#0b0f1e"], [1, "#020309"]]);
      P.stars(c, P.starSet(4, 260, .5), W, hz * 1.6, 2, .85);
      L.stage();
      // moon halo and long moonlit clouds
      P.glow(c, MX, MY, 700, "#7d8fc8", .22);
      P.glow(c, MX, MY, 180, "#dfe6ff", .35);
      c.save(); c.globalCompositeOperation = "lighter";
      const R = rng(12);
      for (let i = 0; i < 9; i++) {
        const cx = lerp(-1200, 700, R()), cy = lerp(-700, -120, R()), w = lerp(260, 640, R()), h = lerp(14, 34, R());
        c.save(); c.translate(cx, cy); c.scale(w / h, 1);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, h);
        const near = Math.max(0, 1 - Math.hypot(cx - MX, cy - MY) / 900);
        g.addColorStop(0, `rgba(150,160,210,${.05 + .14 * near})`); g.addColorStop(1, "rgba(150,160,210,0)");
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, h, 0, 7); c.fill(); c.restore();
      }
      c.restore();
      // the moon itself, with soft maria
      const mg = c.createRadialGradient(MX - 8, MY - 8, 2, MX, MY, 36);
      mg.addColorStop(0, "#fbfcff"); mg.addColorStop(.8, "#dfe4f2"); mg.addColorStop(1, "#b9c2dc");
      c.fillStyle = mg; c.beginPath(); c.arc(MX, MY, 34, 0, 7); c.fill();
      c.fillStyle = "rgba(120,130,160,.18)"; c.beginPath(); c.arc(MX + 9, MY - 6, 11, 0, 7); c.arc(MX - 10, MY + 9, 8, 0, 7); c.fill();
      // far hills in two veils of haze
      L.full();
      P.ridge(c, W, hz - L.S * .005, L.S * .09, 3.1, "#1a1730", 2);
      P.haze(c, 0, W, hz - L.S * .03, L.S * .03, "#5a4a6a", .35);
      P.ridge(c, W, hz + 1, L.S * .045, 7.7, "#0b0a16", 3);
      // water: the sky mirrored and darkened
      c.fillStyle = P.vgrad(c, 0, hz, 0, H, [[0, "#2a2442"], [.08, "#141831"], [.4, "#070a18"], [1, "#020308"]]);
      c.fillRect(0, hz + 2, W, H - hz);
      L.stage();
      // the broad soft moon path under the glitter
      c.save(); c.globalCompositeOperation = "lighter"; c.translate(MX, HZ); c.scale(.14, 1);
      const mp = c.createRadialGradient(0, 0, 0, 0, 0, 900);
      mp.addColorStop(0, "rgba(170,185,235,.42)"); mp.addColorStop(.4, "rgba(150,165,225,.14)"); mp.addColorStop(1, "rgba(170,185,235,0)");
      c.fillStyle = mp; c.fillRect(-900, 0, 1800, 900); c.restore();
      c.save(); c.globalCompositeOperation = "lighter";
      for (const p of m.town) {
        c.save(); c.translate(p.x, HZ + 34); c.scale(.06, 1);
        const rg = c.createRadialGradient(0, 0, 0, 0, 0, 60);
        rg.addColorStop(0, rgba(p.c, .22 * p.a)); rg.addColorStop(1, rgba(p.c, 0));
        c.fillStyle = rg; c.fillRect(-60, -34, 120, 94); c.restore();
      }
      c.restore();
      // ripples: faint long lines across the water
      c.strokeStyle = "rgba(150,165,220,.05)"; c.lineWidth = 1.5;
      for (let i = 0; i < 40; i++) { const y = HZ + 8 + Math.pow(i / 40, 1.8) * 1300, w = 200 + i * 40, x0 = lerp(-1300, 300, R()); c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke(); }

      // ---- the building ----
      const top = FL(7), bot = 1500;
      // side face with the stairwell: we climbed those stairs
      c.fillStyle = P.vgrad(c, 100, 0, 170, 0, [[0, "#0b0c16"], [1, "#07070d"]]);
      c.beginPath(); c.moveTo(108, top + 30); c.lineTo(170, top); c.lineTo(170, bot); c.lineTo(108, bot); c.fill();
      for (let i = 1; i <= 6; i++) {
        const y = FL(i) - 150;
        c.fillStyle = i <= 3 ? "rgba(255,190,120,.22)" : "rgba(255,190,120,.08)";
        c.fillRect(126, y, 22, 110);
        P.glow(c, 137, y + 55, 70, "#ffb35a", i <= 3 ? .12 : .05);
      }
      // front face
      c.fillStyle = P.vgrad(c, 170, 0, 900, 0, [[0, "#14141f"], [.4, "#0d0d15"], [1, "#07070b"]]);
      c.fillRect(170, top, 900, bot - top);
      P.mottle(c, 170, top, 700, bot - top, 9, 30, ["#20202e", "#030306"], .35, 30, 140);
      // moonlight rim on the corner and the parapet
      c.fillStyle = "rgba(170,185,235,.22)"; c.fillRect(170, top, 3, bot - top);
      c.fillStyle = "#05050a"; c.fillRect(160, top - 26, 900, 26);
      c.fillStyle = "rgba(170,185,235,.25)"; c.fillRect(160, top - 26, 900, 2);
      for (let f = 1; f <= 6; f++) {
        const yb = FL(f);
        COLS.forEach((wx, ci) => {
          if (f === 3 && ci < 2) return;   // the lit room is painted live
          const wy = yb - 160, ww = 100, wh = 140;
          const g = c.createLinearGradient(0, wy, 0, wy + wh);
          const dim = (f === 5 && ci === 2) || (f === 1 && ci === 0);
          g.addColorStop(0, dim ? "#3a2c26" : "#1a2036"); g.addColorStop(1, dim ? "#20160f" : "#0a0c16");
          c.fillStyle = g; c.fillRect(wx, wy, ww, wh);
          if (dim) P.glow(c, wx + 50, wy + 70, 90, "#ff9a5a", .06);
          // moon reflected in the glass of the upper windows
          c.fillStyle = "rgba(170,190,240,.09)"; c.beginPath(); c.moveTo(wx, wy + 40); c.lineTo(wx + 40, wy); c.lineTo(wx + 70, wy); c.lineTo(wx, wy + 70); c.fill();
          c.fillStyle = "#06060b"; c.fillRect(wx + ww / 2 - 3, wy, 6, wh); c.fillRect(wx, wy + 44, ww, 5);
          c.strokeStyle = "#05050a"; c.lineWidth = 7; c.strokeRect(wx, wy, ww, wh);
        });
        // balcony slab and rail
        c.fillStyle = "#06060b"; c.fillRect(176, yb - 6, 700, 20);
        c.fillStyle = "rgba(170,185,235,.14)"; c.fillRect(176, yb - 6, 700, 2);
        c.fillStyle = "rgba(0,0,0,.4)"; c.fillRect(176, yb + 14, 700, 12);
        if (f > 1) {
          c.fillStyle = "rgba(5,5,10,.85)"; c.fillRect(182, yb - 62, 690, 5);
          for (let b = 0; b < 44; b++) c.fillRect(186 + b * 16, yb - 60, 3, 54);
        }
      }
      // branches of a willow overhanging from the near shore, top left
      c.fillStyle = "#020205"; c.strokeStyle = "#020205"; c.lineCap = "round";
      const T = rng(31);
      c.lineWidth = 26; c.beginPath(); c.moveTo(-1300, -760); c.quadraticCurveTo(-700, -720, -420, -560); c.stroke();
      c.lineWidth = 12; c.beginPath(); c.moveTo(-760, -700); c.quadraticCurveTo(-560, -760, -300, -720); c.stroke();
      for (let i = 0; i < 46; i++) {
        const u = T(), bx = lerp(-1100, -460, u), by = lerp(-740, -580, u) + (T() - .5) * 80, len = lerp(80, 360, T()) * (1 - u * .4);
        c.lineWidth = lerp(1.5, 4, T());
        c.beginPath(); c.moveTo(bx, by); c.bezierCurveTo(bx + 10, by + len * .4, bx - 6, by + len * .8, bx + (T() - .5) * 20, by + len); c.stroke();
      }
      for (let i = 0; i < 40; i++) { const bx = lerp(-1150, -330, T()), by = lerp(-800, -600, T()); c.beginPath(); c.ellipse(bx, by, 30 + T() * 40, 14 + T() * 16, T() * 3, 0, 7); c.fill(); }
      c.strokeStyle = "rgba(150,170,230,.12)"; c.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) { const bx = lerp(-700, -470, T()), by = lerp(-700, -600, T()), len = lerp(80, 260, T()); c.beginPath(); c.moveTo(bx + 2, by); c.bezierCurveTo(bx + 12, by + len * .4, bx - 4, by + len * .8, bx + 2, by + len); c.stroke(); }
      const T2 = T;
      // reeds along the near water
      c.strokeStyle = "#020205"; c.lineCap = "round";
      for (let i = 0; i < 60; i++) {
        const rx = lerp(-760, 120, T2()), ry = lerp(380, 520, T2()), h = lerp(60, 200, T2()), lean = (T2() - .5) * 40;
        c.lineWidth = lerp(2, 5, T2()); c.beginPath(); c.moveTo(rx, ry + 200); c.quadraticCurveTo(rx, ry, rx + lean, ry - h); c.stroke();
      }
      c.fillStyle = "#020205"; c.fillRect(-1400, 520, 2800, 1100);
      c.fillStyle = P.vgrad(c, 0, 380, 0, 560, [[0, "rgba(2,2,5,0)"], [1, "#020205"]]); c.fillRect(-1400, 380, 2800, 180);
    });

    // ---- live: stars twinkle, lights shimmer on the water, mist drifts, the room glows ----
    x.full();
    for (const s of m.tw) { const a = .3 + .7 * Math.max(0, Math.sin(t * 1.7 + s.ph)); c.fillStyle = `rgba(255,248,235,${a.toFixed(2)})`; c.fillRect(s.x * W, s.y * H, 1.6 * DPR, 1.6 * DPR); }
    x.stage();
    c.save(); c.globalCompositeOperation = "lighter";
    // the shore lights and their long trembling reflections
    for (const p of m.town) {
      const a = p.a * (.75 + .25 * Math.sin(t * 2 + p.ph));
      c.fillStyle = rgba(p.c, a); c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      const k = (t * .8 + p.ph) % 1, yy = HZ + 8 + k * 50;
      c.fillStyle = rgba(p.c, a * .3 * Math.sin(k * Math.PI)); c.fillRect(p.x - 3 + Math.sin(t * 2 + p.ph) * 2, yy, 6, 1.5);
    }
    // the glitter path under the moon
    for (const g of m.glit) {
      const y = HZ + 5 + g.v * 700, spread = 10 + g.v * 120, gx = MX + g.o * spread * 2 * Math.abs(g.o * 2) + Math.sin(t * .7 + g.ph) * 4;
      const a = Math.pow(Math.max(0, Math.sin(t * g.sp + g.ph)), 2) * (1 - g.v * .8) * .7;
      if (a < .04) continue;
      const w = (6 + g.v * 26) * g.l;
      c.fillStyle = `rgba(225,232,255,${a.toFixed(3)})`;
      c.fillRect(gx - w / 2, y, w, 1 + g.v * 1.2);
    }
    c.restore();
    // mist drifting low over the water
    const drift = Math.sin(t * .15) * 60;
    c.save(); c.globalAlpha = .7;
    P.haze(c, -1400 + drift, 1400, HZ + 18, 28, "#6a6a8a", .18);
    P.haze(c, -1400 - drift, 1400, HZ + 120, 50, "#4a4a6a", .08);
    c.restore();
    // the third floor, lit: our window
    const yb = FL(3), wy = yb - 160;
    for (let ci = 0; ci < 2; ci++) {
      const wx = COLS[ci], fl = .88 + .12 * noise(t * .8 + ci * 3);
      const g = c.createLinearGradient(0, wy, 0, wy + 140);
      g.addColorStop(0, rgba("#ffd9a0", .95 * fl)); g.addColorStop(.6, rgba("#ffae5a", .92 * fl)); g.addColorStop(1, rgba("#c8642a", .9 * fl));
      c.fillStyle = g; c.fillRect(wx, wy, 100, 140);
      // a lamp inside and the line of a bookshelf
      P.glow(c, wx + (ci ? 70 : 30), wy + 70, 60, "#fff0d0", .5 * fl);
      c.fillStyle = "rgba(90,40,15,.45)"; c.fillRect(wx, wy + 100, 100, 40);
      // curtains with folds
      for (const side of [0, 1]) {
        const cx0 = side ? wx + 100 - 24 : wx;
        const cg = c.createLinearGradient(cx0, 0, cx0 + 24, 0);
        cg.addColorStop(0, "rgba(120,40,20,.85)"); cg.addColorStop(.5, "rgba(200,90,40,.6)"); cg.addColorStop(1, "rgba(100,30,15,.85)");
        c.fillStyle = cg; c.beginPath(); c.moveTo(cx0, wy); c.lineTo(cx0 + 24, wy); c.quadraticCurveTo(cx0 + (side ? 6 : 18), wy + 80, cx0 + (side ? 2 : 22), wy + 140); c.lineTo(cx0 + (side ? 24 : 0), wy + 140); c.fill();
      }
      c.fillStyle = "#06060b"; c.fillRect(wx + 47, wy, 6, 140); c.fillRect(wx, wy + 44, 100, 5);
      c.strokeStyle = "#05050a"; c.lineWidth = 7; c.strokeRect(wx, wy, 100, 140);
      P.glow(c, wx + 50, wy + 70, 260, "#ffb35a", .26 * fl);
    }
    // light spilling onto the balcony slab and rail
    const fl = .9 + .1 * noise(t * .8);
    c.fillStyle = rgba("#ffb36a", .55 * fl); c.fillRect(186, yb - 6, 330, 3);
    c.fillStyle = rgba("#ffb36a", .35 * fl); c.fillRect(182, yb - 62, 340, 3);
    c.fillStyle = rgba("#ffb36a", .22 * fl); for (let b = 0; b < 21; b++) c.fillRect(186 + b * 16, yb - 60, 3, 54);
    P.glow(c, 330, yb + 20, 220, "#ff9a4a", .14 * fl);
  };

  /* 2. Two candles leaning together while the night turns to morning */
  S.candles = (x) => {
    const { c, W, H, t, u, m } = x;
    const WX = -330, WY = -470, WW = 660, WH = 450;      // the window
    if (!m.i) { m.i = 1; m.st = P.starSet(15, 90, .5); }
    const day = smooth(.15, 1, u);
    // live sky behind the window
    x.stage();
    c.fillStyle = P.vgrad(c, 0, WY, 0, WY + WH, [[0, mix("#04050e", "#2c3c6a", day)], [.55, mix("#0a0c1c", "#c9809a", day)], [.85, mix("#141022", "#ffb48a", day)], [1, mix("#1a1020", "#ffd8a8", day)]]);
    c.fillRect(WX, WY, WW, WH);
    c.save(); c.beginPath(); c.rect(WX, WY, WW, WH); c.clip();
    x.full(); P.stars(c, m.st, W, x.sy(WY + WH * .7), t, 1 - day); x.stage();
    P.glow(c, 140, WY + WH, 520, "#ffb07a", .55 * day);
    c.restore();
    // the room, the skyline, the table: painted once, with a hole for the sky
    room(x, "#170e0c", "#0a0606", 170, 0, 60, .12, (L) => {
      const { c } = L;
      c.clearRect(WX, WY, WW, WH);
      // distant rooftops and a minaret against the sky
      c.fillStyle = "#07060c";
      const R = rng(21); let bx = WX;
      c.beginPath(); c.moveTo(WX, WY + WH);
      while (bx < WX + WW) { const h = lerp(30, 120, R()), w = lerp(40, 110, R()); c.lineTo(bx, WY + WH - h); c.lineTo(bx + w, WY + WH - h); bx += w; }
      c.lineTo(WX + WW, WY + WH); c.fill();
      c.fillRect(-200, WY + WH - 230, 12, 230); c.beginPath(); c.moveTo(-206, WY + WH - 228); c.lineTo(-194, WY + WH - 290); c.lineTo(-182, WY + WH - 228); c.fill();
      c.fillRect(-210, WY + WH - 180, 32, 8);
      c.beginPath(); c.arc(-30, WY + WH - 100, 60, Math.PI, 0); c.fill();
      // a few windows still awake across the city
      for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(255,190,120,${.25 + R() * .4})`; c.fillRect(lerp(WX + 20, WX + WW - 20, R()), WY + WH - lerp(14, 70, R()), 4, 5); }
      windowFrame(c, WX, WY, WW, WH, "#0a0606", 1, "rgba(255,190,140,.12)");
      // the sill catches the candle from below
      tableTop(c, 170, "#2a1610", "#0e0704", 7);
      brassDish(c, -52, 172, 54); brassDish(c, 58, 172, 50);
      teaGlass(c, -300, 250, .9, 1); teaGlass(c, 300, 262, .95, -1);
      // crumbs of a long night: a little plate of lokum, sugar cubes
      P.shadow(c, 0, 330, 120, 22, .5);
      c.fillStyle = P.vgrad(c, -110, 0, 110, 0, [[0, "#9a9088"], [.4, "#f4ede4"], [1, "#9a9088"]]); c.beginPath(); c.ellipse(0, 326, 108, 24, 0, 0, 7); c.fill();
      for (let i = 0; i < 4; i++) { c.fillStyle = ["#e47a90", "#f2d8a8", "#e47a90", "#fbf6ea"][i]; c.fillRect(-56 + i * 30, 306 - (i % 2) * 6, 24, 18); c.fillStyle = "rgba(255,255,255,.4)"; c.fillRect(-56 + i * 30, 306 - (i % 2) * 6, 24, 3); }
    });
    x.stage();
    // dawn: a cool-rose shaft falls across the table as the night runs out
    P.shaft(c, 100, WY + WH * .2, 300, 260, 520, 700, "#ffc8a8", .16 * day);
    // two candles leaning together
    const lean = .05 + .01 * Math.sin(t * .4);
    for (const [cx, h, s, dir] of [[-52, 240, 1, 1], [58, 206, 2, -1]]) {
      c.save(); c.translate(cx, 162); c.rotate(lean * dir);
      P.candle(c, 0, 0, 34, h, t, s, { glow: 1.1 * (1 - day * .35) });
      // wax drips down the side
      c.fillStyle = "#f4e6cc";
      c.beginPath(); c.ellipse(-12, -h + 22, 4, 16, 0, 0, 7); c.ellipse(9, -h + 34, 3.5, 24, 0, 0, 7); c.fill();
      c.restore();
    }
    const f1 = .8 + .2 * noise(t * 2.3 + 7.1);
    // their light on the polished table and the glasses
    sheen(c, -40, 200, 90, 30, "#ffb35a", .35 * f1);
    sheen(c, 50, 205, 80, 26, "#ffb35a", .3 * f1);
    P.glow(c, 0, -60, 300, "#ffcf8a", .14 + .04 * f1);
    P.glow(c, -300, 170, 90, "#ff8a3a", .2 * f1); P.glow(c, 300, 180, 90, "#ff8a3a", .2 * f1);
  };

  /* 3. Panda Fest: a field of giant lanterns at night */
  S.lanterns = (x) => {
    const { c, W, H, t, m } = x;
    if (!m.i) { m.i = 1; m.bk = P.bokehSet(31, 60, [-900, -350, 900, 260], [6, 26], ["#ffb35a", "#ff5a6b", "#ffd59a", "#7ad1ff", "#ff7a3a"]); m.st = P.starSet(8, 90, .35); }
    x.full();
    P.fillAll(c, W, H, [[0, "#04030a"], [.6, "#120a18"], [1, "#040306"]]);
    P.stars(c, m.st, W, H, t, .5);
    x.stage();
    P.bokeh(c, m.bk, t, 10);
    // overhead string of round red lanterns
    for (let i = 0; i < 9; i++) {
      const lx = -520 + i * 130, ly = -400 + Math.sin(i * .9) * 18 + Math.sin(t + i) * 3;
      P.glow(c, lx, ly, 90, "#ff4a3a", .4);
      const g = c.createRadialGradient(lx - 8, ly - 8, 2, lx, ly, 34);
      g.addColorStop(0, "#ffd7a0"); g.addColorStop(.5, "#ff5a3a"); g.addColorStop(1, "#8a1410");
      c.fillStyle = g; c.beginPath(); c.ellipse(lx, ly, 30, 34, 0, 0, 7); c.fill();
      c.fillStyle = "#2a1006"; c.fillRect(lx - 12, ly - 38, 24, 6); c.fillRect(lx - 12, ly + 32, 24, 6);
    }
    // a glowing dragon arcing over the field
    for (let i = 0; i < 26; i++) {
      const v = i / 25, dx = lerp(-560, 560, v), dy = -230 - Math.sin(v * Math.PI) * 120 + Math.sin(v * 9 + t * 1.2) * 18;
      const r = 26 * (1 - v * .5);
      P.glow(c, dx, dy, r * 3, "#ff9a3a", .25);
      c.fillStyle = mix("#ffd08a", "#ff5a2a", v); c.beginPath(); c.arc(dx, dy, r, 0, 7); c.fill();
    }
    // a great lotus lantern, glowing through silk
    const pb = Math.sin(t * .8) * 4;
    P.glow(c, 0, 140 + pb, 460, "#ffb8c8", .28);
    const lotus = (ring, n, len, wid, tilt, col, edge) => {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i - (n - 1) / 2) * tilt;
        c.save(); c.translate(0, 230 + pb); c.rotate(a + Math.PI / 2);
        const g = c.createLinearGradient(0, 0, 0, -len);
        g.addColorStop(0, col); g.addColorStop(.75, mix(col, "#ffffff", .5)); g.addColorStop(1, edge);
        c.fillStyle = g;
        c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-wid, -len * .35, -wid * .6, -len * .85, 0, -len); c.bezierCurveTo(wid * .6, -len * .85, wid, -len * .35, 0, 0); c.fill();
        c.strokeStyle = "rgba(255,240,245,.35)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, -len * .9); c.stroke();
        c.restore();
      }
      void ring;
    };
    lotus(0, 9, 300, 90, .34, "#c2456a", "#ffe0ea");
    lotus(1, 7, 250, 80, .3, "#e2708e", "#fff2f6");
    lotus(2, 5, 190, 66, .28, "#f4a2b6", "#ffffff");
    P.glow(c, 0, 100 + pb, 140, "#fff4d8", .5);
    // its reflection of leaves on the water line
    c.fillStyle = "#0e2a1a"; c.beginPath(); c.ellipse(0, 250 + pb, 330, 40, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(120,220,150,.25)"; c.beginPath(); c.ellipse(0, 240 + pb, 300, 18, 0, 3.3, 6.1); c.fill();
    // bamboo lanterns
    for (let i = 0; i < 6; i++) {
      const bx = (i < 3 ? -440 : 300) + (i % 3) * 60, h = 300 + (i % 3) * 60;
      P.glow(c, bx, 300 - h / 2, 120, "#7affa0", .12);
      c.fillStyle = P.vgrad(c, bx - 12, 0, bx + 12, 0, [[0, "#3a8a4a"], [.5, "#b8ffc8"], [1, "#2a6a3a"]]);
      c.fillRect(bx - 12, 330 - h, 24, h);
      c.fillStyle = "rgba(20,60,30,.8)"; for (let k = 1; k < 5; k++) c.fillRect(bx - 13, 330 - h + k * h / 5, 26, 4);
    }
    // the pond
    x.full();
    const py = x.sy(340);
    c.fillStyle = P.vgrad(c, 0, py, 0, H, [[0, "#07060c"], [1, "#020204"]]); c.fillRect(0, py, W, H - py);
    P.reflections(c, [{ x: x.sx(0), c: "#fff1d8", a: .5, w: x.S * .2 }, { x: x.sx(-400), c: "#7affa0", a: .3, w: 20 * DPR }, { x: x.sx(360), c: "#7affa0", a: .3, w: 20 * DPR }], py, H, t, W);
  };

  /* 4. Her kitchen */
  S.kitchen = (x) => {
    const { c, t } = x;
    room(x, "#1a0f0a", "#120a06", -20, 0, -380, .3);
    x.stage();
    // pendant lamp
    P.glow(c, 0, -420, 520, "#ffb35a", .3);
    c.fillStyle = "#0c0705"; c.beginPath(); c.moveTo(-70, -430); c.lineTo(70, -430); c.lineTo(40, -470); c.lineTo(-40, -470); c.fill();
    c.fillStyle = "#ffe2b0"; c.beginPath(); c.ellipse(0, -430, 70, 8, 0, 0, 7); c.fill();
    tableTop(c, -20, "#3a2214", "#140a05");
    // oven bag chicken, back left
    const bag = (bx, by) => {
      c.fillStyle = "rgba(0,0,0,.4)"; c.beginPath(); c.ellipse(bx, by + 40, 140, 26, 0, 0, 7); c.fill();
      const g = c.createRadialGradient(bx - 30, by - 20, 5, bx, by, 150);
      g.addColorStop(0, "#fff0c8"); g.addColorStop(.35, "#e3a24a"); g.addColorStop(1, "#7a3e12");
      c.fillStyle = g; c.beginPath(); c.ellipse(bx, by, 130, 62, 0, 0, 7); c.fill();
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 2; c.beginPath(); c.ellipse(bx - 10, by - 18, 90, 30, 0, 3.6, 5.9); c.stroke();
      c.fillStyle = "#c98a3a"; c.fillRect(bx + 120, by - 8, 30, 10);
    };
    bag(-230, 60);
    // mantı plate, front
    const mx = -140, my = 250;
    c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.ellipse(mx, my + 22, 200, 70, 0, 0, 7); c.fill();
    c.fillStyle = P.vgrad(c, 0, my - 70, 0, my + 70, [[0, "#fbf6ee"], [1, "#cfc4b6"]]); c.beginPath(); c.ellipse(mx, my, 195, 78, 0, 0, 7); c.fill();
    c.fillStyle = "#f3ead8"; c.beginPath(); c.ellipse(mx, my, 150, 56, 0, 0, 7); c.fill();       // yogurt
    const R = rng(5);
    for (let i = 0; i < 70; i++) {                                                                // the little dumplings
      const a = R() * 6.28, rr = Math.sqrt(R()), dx = mx + Math.cos(a) * rr * 125, dy = my + Math.sin(a) * rr * 44;
      c.fillStyle = mix("#e8c890", "#b8823a", R() * .7);
      c.beginPath(); c.moveTo(dx, dy - 7); c.lineTo(dx + 8, dy); c.lineTo(dx, dy + 5); c.lineTo(dx - 8, dy); c.closePath(); c.fill();
    }
    for (let i = 0; i < 26; i++) { const a = R() * 6.28, rr = Math.sqrt(R()); c.fillStyle = rgba("#d8401a", .55 + R() * .3); c.beginPath(); c.ellipse(mx + Math.cos(a) * rr * 115, my + Math.sin(a) * rr * 40, 8 + R() * 10, 4 + R() * 4, 0, 0, 7); c.fill(); }
    for (let i = 0; i < 20; i++) { const a = R() * 6.28, rr = Math.sqrt(R()); c.fillStyle = "#3a6a2a"; c.fillRect(mx + Math.cos(a) * rr * 120, my + Math.sin(a) * rr * 42, 3, 3); }
    // menemen pan, right
    const nx = 200, ny = 170;
    c.fillStyle = "#0a0808"; c.save(); c.translate(nx + 190, ny - 20); c.rotate(-.25); c.fillRect(0, -10, 170, 20); c.restore();
    c.fillStyle = "#151313"; c.beginPath(); c.ellipse(nx, ny, 175, 74, 0, 0, 7); c.fill();
    c.fillStyle = P.vgrad(c, 0, ny - 60, 0, ny + 60, [[0, "#e4542a"], [1, "#a32a10"]]); c.beginPath(); c.ellipse(nx, ny, 155, 62, 0, 0, 7); c.fill();
    for (let i = 0; i < 22; i++) { const a = R() * 6.28, rr = Math.sqrt(R()); c.fillStyle = rgba("#ffd64a", .9); c.beginPath(); c.ellipse(nx + Math.cos(a) * rr * 120, ny + Math.sin(a) * rr * 45, 14 + R() * 12, 6 + R() * 5, R() * 3, 0, 7); c.fill(); }
    for (let i = 0; i < 14; i++) { const a = R() * 6.28, rr = Math.sqrt(R()); c.fillStyle = "#2f7a2a"; c.beginPath(); c.ellipse(nx + Math.cos(a) * rr * 120, ny + Math.sin(a) * rr * 45, 7, 3, R() * 3, 0, 7); c.fill(); }
    // bread
    c.fillStyle = P.vgrad(c, 0, 300, 0, 380, [[0, "#f0c070"], [1, "#9a5a1a"]]);
    c.beginPath(); c.ellipse(260, 340, 120, 44, -.1, 0, 7); c.fill();
    c.strokeStyle = "rgba(120,60,10,.6)"; c.lineWidth = 4; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(180 + i * 45, 320); c.lineTo(205 + i * 45, 355); c.stroke(); }
    // a glass of tea
    const tx = 40, ty = 70;
    c.fillStyle = "rgba(255,255,255,.12)"; c.beginPath(); c.moveTo(tx - 24, ty - 80); c.bezierCurveTo(tx - 30, ty - 40, tx - 10, ty - 30, tx - 18, ty); c.lineTo(tx + 18, ty); c.bezierCurveTo(tx + 10, ty - 30, tx + 30, ty - 40, tx + 24, ty - 80); c.fill();
    c.fillStyle = "rgba(170,40,10,.9)"; c.beginPath(); c.moveTo(tx - 22, ty - 64); c.bezierCurveTo(tx - 26, ty - 40, tx - 10, ty - 30, tx - 16, ty - 2); c.lineTo(tx + 16, ty - 2); c.bezierCurveTo(tx + 10, ty - 30, tx + 26, ty - 40, tx + 22, ty - 64); c.fill();
    c.fillStyle = "#c9a24a"; c.beginPath(); c.ellipse(tx, ty + 4, 44, 10, 0, 0, 7); c.fill();
    P.steam(c, mx, my - 50, t, 1.4, 1); P.steam(c, nx, ny - 50, t, 1.3, 2); P.steam(c, -230, 0, t, 1.1, 3); P.steam(c, tx, ty - 90, t, .8, 4);
  };

  /* 5. The et sote */
  S.smoke = (x) => {
    const { c, t } = x;
    room(x, "#121010", "#0a0808", 120, 0, -100, .12);
    x.stage();
    // smoke alarm blinking
    const blink = (t % 1.2) < .25;
    c.fillStyle = "#d8d4cc"; c.beginPath(); c.ellipse(200, -440, 70, 16, 0, 0, 7); c.fill();
    if (blink) P.glow(c, 200, -432, 120, "#ff2a2a", .8);
    c.fillStyle = blink ? "#ff4a4a" : "#5a1010"; c.beginPath(); c.arc(200, -432, 7, 0, 7); c.fill();
    // stove
    c.fillStyle = "#0b0b0c"; c.fillRect(-500, 120, 1000, 400);
    c.strokeStyle = "rgba(255,90,30,.5)"; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 175, 150, 40, 0, 0, 7); c.stroke();
    P.glow(c, 0, 180, 260, "#ff5a1a", .25);
    // pan
    c.fillStyle = "#0a0808"; c.save(); c.translate(160, 120); c.rotate(-.12); c.fillRect(0, -12, 260, 24); c.restore();
    c.fillStyle = "#1a1716"; c.beginPath(); c.ellipse(0, 130, 175, 56, 0, 0, 7); c.fill();
    c.fillStyle = "#2a160c"; c.beginPath(); c.ellipse(0, 126, 152, 44, 0, 0, 7); c.fill();
    const R = rng(12);
    for (let i = 0; i < 26; i++) { c.fillStyle = mix("#3a1a08", "#0a0402", R()); c.beginPath(); c.ellipse((R() - .5) * 240, 126 + (R() - .5) * 60, 16 + R() * 10, 9 + R() * 6, R() * 3, 0, 7); c.fill(); }
    // the smoke: big soft billows
    for (let i = 0; i < 18; i++) {
      const ph = (t * .12 + i / 18) % 1, sx = Math.sin(i * 2.1 + t * .3) * 80 * ph + (i % 3 - 1) * 40, sy = 100 - ph * 620;
      const r = 50 + ph * 190;
      const g = c.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, `rgba(150,145,140,${.32 * Math.sin(ph * Math.PI)})`); g.addColorStop(1, "rgba(150,145,140,0)");
      c.fillStyle = g; c.beginPath(); c.arc(sx, sy, r, 0, 7); c.fill();
    }
  };

  /* 6. Coffee on the balcony, Eda and Mehmet's house glowing across */
  S.balcony = (x) => {
    const { c, W, H, t, m } = x;
    if (!m.i) { m.i = 1; m.bk = P.bokehSet(41, 40, [-900, -300, 900, 100], [4, 18], ["#ffcf8a", "#ffb35a", "#ffe6c0"]); m.st = P.starSet(2, 120, .4); }
    x.full();
    P.fillAll(c, W, H, [[0, "#05050d"], [.55, "#141020"], [1, "#050406"]]);
    P.stars(c, m.st, W, H, t, .6);
    x.stage();
    P.bokeh(c, m.bk, t, 6);
    // the two-story house across
    c.fillStyle = "#0c0a0e"; c.beginPath(); c.moveTo(-430, -40); c.lineTo(-180, -220); c.lineTo(70, -40); c.lineTo(70, 160); c.lineTo(-430, 160); c.fill();
    const win = (wx, wy, w, h, a) => { c.fillStyle = rgba("#ffc27a", a); c.fillRect(wx, wy, w, h); P.glow(c, wx + w / 2, wy + h / 2, 120, "#ffb35a", a * .3); };
    win(-390, -20, 70, 60, .9); win(-270, -20, 70, 60, .7); win(-90, -20, 70, 60, .85);
    win(-390, 70, 70, 60, .6); win(-200, 60, 60, 100, .95); win(-90, 70, 70, 60, .5);
    // string lights across the top
    P.stringLights(c, -560, -430, 560, -400, 70, 16, t);
    // railing
    c.fillStyle = "#050304";
    c.fillRect(-600, 210, 1200, 14);
    for (let i = 0; i < 30; i++) c.fillRect(-590 + i * 42, 220, 7, 300);
    // little table with coffee
    tableTop(c, 300, "#24150e");
    const cup = (cx, cy, s) => {
      c.fillStyle = "#e8dccb"; c.beginPath(); c.ellipse(cx, cy + 20 * s, 46 * s, 12 * s, 0, 0, 7); c.fill();
      c.fillStyle = P.vgrad(c, cx - 24 * s, 0, cx + 24 * s, 0, [[0, "#b6a690"], [.5, "#fffaf2"], [1, "#a0907a"]]);
      c.beginPath(); c.moveTo(cx - 24 * s, cy - 30 * s); c.lineTo(cx - 20 * s, cy + 16 * s); c.quadraticCurveTo(cx, cy + 24 * s, cx + 20 * s, cy + 16 * s); c.lineTo(cx + 24 * s, cy - 30 * s); c.fill();
      c.strokeStyle = "#c9a24a"; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(cx - 24 * s, cy - 22 * s); c.lineTo(cx + 24 * s, cy - 22 * s); c.stroke();
      c.fillStyle = "#2a1408"; c.beginPath(); c.ellipse(cx, cy - 30 * s, 24 * s, 6 * s, 0, 0, 7); c.fill();
      P.steam(c, cx, cy - 40 * s, t, .6 * s, cx);
    };
    cup(-260, 360, 1); cup(-110, 380, 1.1); cup(70, 360, 1); cup(220, 385, 1.1);
    // lokum
    c.fillStyle = "#f2efe8"; c.beginPath(); c.ellipse(-10, 440, 80, 22, 0, 0, 7); c.fill();
    const R = rng(3); for (let i = 0; i < 7; i++) { c.fillStyle = ["#e8708a", "#f4d6a0", "#ffffff"][i % 3]; c.fillRect(-50 + (i % 4) * 22 + R() * 4, 422 + Math.floor(i / 4) * 16, 18, 14); }
  };

  /* 7. "I'm the tired one": the hall of a party, two coats, the door open to the night */
  S.door = (x) => {
    const { c, t, m } = x;
    const DX = 130, DY = -470, DW = 270, DH = 730, FLOOR = 260;
    if (!m.i) { m.i = 1; m.bk = P.bokehSet(71, 16, [-1100, -420, -420, 120], [14, 44], ["#ffb35a", "#ffd59a", "#ff8a5a"]); }
    room(x, "#1c120e", "#0e0806", FLOOR, -700, -200, .3, (L) => {
      const { c } = L;
      // wainscot panels along the hall
      c.fillStyle = "rgba(0,0,0,.22)"; c.fillRect(-1400, 20, 2800, FLOOR - 20);
      c.fillStyle = "rgba(255,200,150,.07)"; c.fillRect(-1400, 18, 2800, 3);
      for (let i = 0; i < 14; i++) { const px = -1400 + i * 200; c.strokeStyle = "rgba(0,0,0,.3)"; c.lineWidth = 3; c.strokeRect(px + 20, 50, 160, FLOOR - 80); c.strokeStyle = "rgba(255,200,150,.05)"; c.lineWidth = 1.5; c.strokeRect(px + 22, 52, 160, FLOOR - 80); }
      // the night outside the door
      c.fillStyle = P.vgrad(c, 0, DY, 0, DY + DH, [[0, "#050a1c"], [.6, "#14264a"], [.78, "#24345a"], [.8, "#0a0e18"], [1, "#05070c"]]);
      c.fillRect(DX, DY, DW, DH);
      c.save(); c.beginPath(); c.rect(DX, DY, DW, DH); c.clip();
      const R = rng(5);
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(230,236,255,${.3 + R() * .6})`; c.fillRect(DX + R() * DW, DY + R() * DH * .5, 1.6, 1.6); }
      // trees and a neighbour's house across the street
      c.fillStyle = "#03050b";
      for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(DX + R() * DW, DY + DH * .62 - R() * 60, 40 + R() * 40, 60 + R() * 50, 0, 0, 7); c.fill(); }
      c.fillRect(DX + 140, DY + DH * .58, 120, 80); c.beginPath(); c.moveTo(DX + 130, DY + DH * .58); c.lineTo(DX + 200, DY + DH * .5); c.lineTo(DX + 270, DY + DH * .58); c.fill();
      c.fillStyle = "rgba(255,190,120,.6)"; c.fillRect(DX + 170, DY + DH * .6, 16, 18);
      // a streetlamp far down the road
      c.fillStyle = "#03050b"; c.fillRect(DX + 60, DY + DH * .45, 4, DH * .3);
      P.glow(c, DX + 62, DY + DH * .45, 120, "#ffd59a", .5);
      c.fillStyle = "#fff2d0"; c.beginPath(); c.arc(DX + 62, DY + DH * .45, 4, 0, 7); c.fill();
      // porch boards and steps
      c.fillStyle = P.vgrad(c, 0, DY + DH * .8, 0, DY + DH, [[0, "#1a2236"], [1, "#0a0e18"]]); c.fillRect(DX, DY + DH * .8, DW, DH * .2);
      c.restore();
      // door casing
      c.fillStyle = "#0e0806"; c.fillRect(DX - 26, DY - 26, 26, DH + 26); c.fillRect(DX - 26, DY - 26, DW + 52, 26);
      c.fillStyle = "rgba(255,200,150,.12)"; c.fillRect(DX - 26, DY - 26, 3, DH + 26);
      // the door leaf, swung in towards us
      c.fillStyle = P.vgrad(c, DX + DW, 0, DX + DW + 150, 0, [[0, "#2a1a12"], [1, "#120a06"]]);
      c.beginPath(); c.moveTo(DX + DW, DY); c.lineTo(DX + DW + 150, DY - 50); c.lineTo(DX + DW + 150, DY + DH + 60); c.lineTo(DX + DW, DY + DH); c.fill();
      c.strokeStyle = "rgba(0,0,0,.45)"; c.lineWidth = 4;
      for (const [a, b] of [[.06, .44], [.52, .92]]) { c.beginPath(); c.moveTo(DX + DW + 22, DY + DH * a - 4); c.lineTo(DX + DW + 128, DY + DH * a - 30); c.lineTo(DX + DW + 128, DY + DH * b + 20); c.lineTo(DX + DW + 22, DY + DH * b + 4); c.closePath(); c.stroke(); }
      c.fillStyle = "rgba(120,150,220,.18)"; c.fillRect(DX + DW, DY, 4, DH);
      // a brass knob
      c.fillStyle = P.vgrad(c, 0, -110, 0, -90, [[0, "#ffe2a0"], [1, "#6a4410"]]); c.beginPath(); c.ellipse(DX + DW + 128, -100, 9, 12, 0, 0, 7); c.fill();
      // moonlight spilling in across the floorboards
      c.save(); c.globalCompositeOperation = "lighter";
      const sp = c.createLinearGradient(0, FLOOR, 0, 560); sp.addColorStop(0, "rgba(120,150,220,.22)"); sp.addColorStop(1, "rgba(120,150,220,0)");
      c.fillStyle = sp; c.beginPath(); c.moveTo(DX, FLOOR); c.lineTo(DX + DW, FLOOR); c.lineTo(DX + DW + 260, 620); c.lineTo(DX - 160, 620); c.fill();
      c.restore();
      // a doormat
      c.fillStyle = P.vgrad(c, 0, FLOOR + 20, 0, FLOOR + 80, [[0, "#2a1c14"], [1, "#160e0a"]]);
      c.beginPath(); c.moveTo(DX + 10, FLOOR + 22); c.lineTo(DX + DW - 10, FLOOR + 22); c.lineTo(DX + DW + 30, FLOOR + 80); c.lineTo(DX - 30, FLOOR + 80); c.fill();
      // the coat rail and two coats: hers and mine, waiting
      c.fillStyle = "#0e0806"; c.fillRect(-420, -404, 440, 22);
      c.fillStyle = "rgba(255,200,150,.12)"; c.fillRect(-420, -404, 440, 2);
      coat(c, -300, -386, 1, "#5a2430", "#2a0e14", 4);   // hers: wine wool
      coat(c, -110, -386, 1.06, "#3a3a40", "#141418", 9); // mine: charcoal
      // her scarf slung over the end hook
      c.strokeStyle = "#c9a07a"; c.lineWidth = 22; c.lineCap = "round";
      c.beginPath(); c.moveTo(-30, -380); c.bezierCurveTo(-10, -250, -40, -150, -22, -40); c.stroke();
      c.strokeStyle = "rgba(255,230,190,.25)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-38, -370); c.bezierCurveTo(-18, -250, -48, -150, -30, -46); c.stroke();
      for (let i = 0; i < 6; i++) { c.strokeStyle = "#a8805a"; c.lineWidth = 2; c.beginPath(); c.moveTo(-30 + i * 3 - 8, -36); c.lineTo(-32 + i * 4 - 8, -10); c.stroke(); }
      // a narrow console under them: a bowl, our keys
      P.shadow(c, -200, 170, 240, 20, .5);
      c.fillStyle = P.vgrad(c, 0, 120, 0, 150, [[0, "#3a2416"], [1, "#1a0e08"]]); c.fillRect(-400, 120, 400, 26);
      c.fillStyle = "rgba(255,200,150,.18)"; c.fillRect(-400, 120, 400, 2);
      c.fillStyle = "#120a06"; c.fillRect(-388, 146, 14, 114); c.fillRect(-26, 146, 14, 114);
      c.fillStyle = P.vgrad(c, -310, 0, -190, 0, [[0, "#2a2a30"], [.5, "#8a8a90"], [1, "#1a1a1e"]]);
      c.beginPath(); c.ellipse(-250, 104, 60, 16, 0, 0, Math.PI); c.lineTo(-310, 104); c.fill();
      c.fillStyle = "#0a0a0c"; c.beginPath(); c.ellipse(-250, 104, 60, 10, 0, 0, 7); c.fill();
      // two pairs of shoes by the door
      for (const [sx, col] of [[-60, "#2a1418"], [10, "#141010"]]) {
        P.shadow(c, sx + 30, FLOOR + 40, 60, 10, .6);
        c.fillStyle = col; c.beginPath(); c.ellipse(sx, FLOOR + 30, 34, 14, -.1, 0, 7); c.ellipse(sx + 50, FLOOR + 36, 34, 14, .1, 0, 7); c.fill();
        c.fillStyle = "rgba(140,170,230,.25)"; c.fillRect(sx - 20, FLOOR + 18, 40, 2);
      }
    });
    x.stage();
    // the party behind us, warm and out of focus
    P.bokeh(c, m.bk, t, 6);
    P.glow(c, -700, -200, 700, "#ffb35a", .1 + .03 * noise(t * .7));
    // the night breathes in through the door
    P.shaft(c, DX + DW / 2, DY + 100, DW * .8, DX + DW / 2 - 40, 560, DW * 1.9, "#8fa8e8", .1 + .02 * Math.sin(t * .5));
    // our keys on the console, catching the hall light
    const kg = .55 + .25 * Math.sin(t * 1.3);
    c.strokeStyle = "#e8d09a"; c.lineWidth = 3; c.beginPath(); c.arc(-140, 112, 11, 0, 7); c.stroke();
    c.fillStyle = "#e8d09a"; c.fillRect(-130, 108, 36, 6); c.fillRect(-104, 114, 4, 6); c.fillRect(-114, 114, 4, 5);
    P.glow(c, -120, 110, 50, "#ffe0a0", .3 * kg);
    // the streetlamp outside, breathing
    P.glow(c, DX + 62, DY + DH * .45, 60, "#ffd59a", .25 + .1 * noise(t * 2));
  };

  /* 8. A glass of water by the lamp, rain on the window */
  S.water = (x) => {
    const { c, W, H, t, m } = x;
    if (!m.i) { m.i = 1; m.rain = P.rainSet(14, 90, [-480, -440, -60, 60]); }
    room(x, "#0b0a10", "#060508", 160, 200, -60, .14);
    x.stage();
    c.fillStyle = P.vgrad(c, 0, -440, 0, 60, [[0, "#0a0e1c"], [1, "#141a2a"]]); c.fillRect(-480, -440, 420, 500);
    P.rain(c, m.rain, [-480, -440, -60, 60], t);
    windowFrame(c, -480, -440, 420, 500);
    // nightstand
    c.fillStyle = "#1a110c"; c.fillRect(-40, 160, 520, 360);
    c.fillStyle = "rgba(255,190,120,.12)"; c.fillRect(-40, 160, 520, 4);
    // lamp
    c.fillStyle = "#0c0806"; c.fillRect(255, 40, 14, 120); c.beginPath(); c.ellipse(262, 160, 60, 10, 0, 0, 7); c.fill();
    c.fillStyle = P.vgrad(c, 0, -110, 0, 40, [[0, "#ffd9a0"], [1, "#e88a3a"]]);
    c.beginPath(); c.moveTo(190, 40); c.lineTo(334, 40); c.lineTo(300, -110); c.lineTo(224, -110); c.fill();
    P.glow(c, 262, -20, 520, "#ffb35a", .35);
    // the glass
    const gx = 80, gy = 160;
    c.fillStyle = "rgba(200,220,255,.08)"; c.beginPath(); c.moveTo(gx - 40, gy - 170); c.lineTo(gx - 34, gy); c.lineTo(gx + 34, gy); c.lineTo(gx + 40, gy - 170); c.fill();
    c.fillStyle = "rgba(160,190,230,.18)"; c.fillRect(gx - 37, gy - 110, 74, 108);
    c.strokeStyle = "rgba(255,240,220,.55)"; c.lineWidth = 2; c.beginPath(); c.moveTo(gx - 40, gy - 170); c.lineTo(gx - 34, gy); c.lineTo(gx + 34, gy); c.lineTo(gx + 40, gy - 170); c.stroke();
    c.strokeStyle = "rgba(255,220,180,.8)"; c.lineWidth = 3; c.beginPath(); c.moveTo(gx + 26, gy - 150); c.lineTo(gx + 22, gy - 20); c.stroke();
    c.beginPath(); c.ellipse(gx, gy - 110, 37, 6, 0, 0, 7); c.strokeStyle = "rgba(255,230,200,.5)"; c.stroke();
    P.glow(c, gx + 20, gy - 60, 60, "#ffd59a", .25 + .05 * Math.sin(t * 1.4));
  };

  /* 9. Splash: the one lit shop in a closing mall */
  S.shop = (x) => {
    const { c, W, H, t, m } = x;
    const SX = -360, SY = -330, SW = 720, FL = 250;       // shopfront, floor line
    const JARS = [[-262, -96, "#f4b6c8"], [-120, -96, "#f8e3a0"], [150, -96, "#cdb8f0"], [276, -96, "#b8e0d2"], [-210, 52, "#ffd0b0"], [210, 52, "#f4b6c8"], [-40, 160, "#fff3e8"], [60, 160, "#f8e3a0"]];
    P.layer(x, "bg", (L, o) => {
      const { c } = L;
      L.full();
      P.fillAll(c, W, H, [[0, "#040407"], [.5, "#0b0a10"], [1, "#030304"]]);
      L.stage();
      // the mall ceiling: a row of dead lights going back, one still on
      c.fillStyle = "#08080c"; c.fillRect(-1400, -900, 2800, 420);
      for (let i = 0; i < 9; i++) { const lx = -1300 + i * 330; c.fillStyle = i === 4 ? "rgba(255,230,200,.5)" : "rgba(80,80,100,.25)"; c.fillRect(lx, -520, 160, 8); }
      // neighbouring stores, shutters down
      for (const sx of [-1300, -820, 440, 920]) {
        c.fillStyle = "#0b0b10"; c.fillRect(sx, -420, 440, 680);
        c.fillStyle = P.vgrad(c, 0, -330, 0, FL, [[0, "#15151c"], [1, "#0a0a0e"]]); c.fillRect(sx + 30, -330, 380, FL + 330);
        for (let k = 0; k < 40; k++) { c.fillStyle = k % 2 ? "rgba(255,255,255,.03)" : "rgba(0,0,0,.25)"; c.fillRect(sx + 30, -330 + k * 14.5, 380, 6); }
        c.fillStyle = "rgba(255,200,170,.05)"; c.fillRect(sx + 30, -330, 380, 3);
      }
      // ---- the shop: warm back wall, shelves with depth ----
      c.fillStyle = P.vgrad(c, 0, SY, 0, FL, [[0, "#6a4a48"], [.5, "#8a6258"], [1, "#4a302c"]]); c.fillRect(SX, SY, SW, FL - SY);
      P.mottle(c, SX, SY, SW, FL - SY, 17, 20, ["#ffd8c0", "#2a1410"], .14, 30, 120);
      P.glow(c, 0, -200, 520, "#ffc8a0", .3);
      // three shelves
      const R = rng(7);
      const pastel = ["#f4b6c8", "#b8e0d2", "#f8e3a0", "#cdb8f0", "#ffd0b0", "#a8d0f0", "#fff3e8"];
      const shelf = (y) => {
        c.fillStyle = "#e8d4c0"; c.beginPath(); c.moveTo(SX + 16, y); c.lineTo(SX + SW - 16, y); c.lineTo(SX + SW - 30, y - 22); c.lineTo(SX + 30, y - 22); c.fill();
        c.fillStyle = "#7a5a48"; c.fillRect(SX + 16, y, SW - 32, 10);
        c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(SX + 16, y + 10, SW - 32, 22);
      };
      const soapStack = (bx, by, col, n) => {
        for (let k = 0; k < n; k++) {
          const w = 54 - k * 6, h = 20, xx = bx - w / 2 + (k % 2) * 3, yy = by - (k + 1) * (h + 1);
          c.fillStyle = P.vgrad(c, 0, yy, 0, yy + h, [[0, mix(col, "#ffffff", .35)], [1, mix(col, "#000000", .15)]]);
          c.beginPath(); c.roundRect(xx, yy, w, h, 6); c.fill();
          c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(xx + 6, yy + 3, w - 12, 2);
        }
      };
      const wrapped = (bx, by, col) => {   // kraft-paper soap with a twine band
        c.fillStyle = P.vgrad(c, 0, by - 40, 0, by, [[0, "#d8b888"], [1, "#9a7a50"]]); c.beginPath(); c.roundRect(bx - 34, by - 40, 68, 40, 4); c.fill();
        c.fillStyle = col; c.fillRect(bx - 34, by - 26, 68, 12);
        c.strokeStyle = "#5a3a20"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx, by - 40); c.lineTo(bx, by); c.stroke();
      };
      const bomb = (bx, by, r, col) => {    // bath bombs
        const g = c.createRadialGradient(bx - r * .35, by - r * .4, 1, bx, by, r);
        g.addColorStop(0, mix(col, "#ffffff", .6)); g.addColorStop(.6, col); g.addColorStop(1, mix(col, "#000000", .35));
        c.fillStyle = g; c.beginPath(); c.arc(bx, by, r, 0, 7); c.fill();
        c.fillStyle = "rgba(255,255,255,.35)"; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(bx + (R() - .5) * r, by + (R() - .5) * r, 1.5, 0, 7); c.fill(); }
      };
      const bottle = (bx, by, col) => {
        c.fillStyle = rgba(col, .75); c.beginPath(); c.roundRect(bx - 14, by - 70, 28, 70, 6); c.fill();
        c.fillStyle = "#2a1a14"; c.fillRect(bx - 6, by - 88, 12, 18);
        c.fillStyle = "rgba(255,250,240,.75)"; c.fillRect(bx - 10, by - 44, 20, 22);
        P.spec(c, bx - 8, by - 62, bx - 8, by - 10, 2, .5);
      };
      // top shelf: candle jars and stacks
      shelf(-96);
      soapStack(-330, -96, pastel[1], 3); soapStack(-190, -96, pastel[3], 4);
      bottle(-60, -96, "#d88aa0"); bottle(-24, -96, "#a8c8e0"); bottle(12, -96, "#e8d080");
      soapStack(80, -96, pastel[0], 3); soapStack(220, -96, pastel[4], 2); wrapped(330, -96, "#b8e0d2");
      // middle shelf: a basket of bath bombs, wrapped bars
      shelf(52);
      c.fillStyle = "#6a4a2a"; c.beginPath(); c.moveTo(-120, 52); c.lineTo(-20, 52); c.lineTo(-10, 6); c.lineTo(-130, 6); c.fill();
      for (let k = 0; k < 5; k++) bomb(-112 + k * 22, 0 - (k % 2) * 8, 16, pastel[(k + 2) % 7]);
      c.strokeStyle = "rgba(0,0,0,.3)"; c.lineWidth = 2; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(-126, 14 + k * 8); c.lineTo(-14, 14 + k * 8); c.stroke(); }
      wrapped(-320, 52, "#f4b6c8"); wrapped(-310, 12, "#cdb8f0");
      soapStack(80, 52, pastel[2], 3); wrapped(300, 52, "#f8e3a0"); wrapped(318, 12, "#a8d0f0");
      for (let k = 0; k < 3; k++) bomb(110 + k * 34, 30, 14, pastel[k * 2]);
      // display table in front
      c.fillStyle = P.vgrad(c, 0, 160, 0, 250, [[0, "#3a2418"], [1, "#140a06"]]); c.fillRect(-260, 168, 520, 82);
      c.fillStyle = "#f0e2d0"; c.beginPath(); c.moveTo(-270, 168); c.lineTo(270, 168); c.lineTo(250, 150); c.lineTo(-250, 150); c.fill();
      soapStack(-180, 160, pastel[0], 4); soapStack(-110, 160, pastel[5], 3); soapStack(150, 160, pastel[3], 4);
      for (let k = 0; k < 4; k++) bomb(200 + (k % 2) * 30, 140 - (k > 1) * 24, 15, pastel[(k + 4) % 7]);
      // glass candle jars (flames are live)
      for (const [jx, jy, col] of JARS) {
        c.fillStyle = rgba(col, .9); c.beginPath(); c.roundRect(jx - 22, jy - 44, 44, 44, 6); c.fill();
        c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.roundRect(jx - 24, jy - 58, 48, 58, 8); c.fill();
        c.fillStyle = "#2a1a14"; c.fillRect(jx - 1, jy - 52, 2, 8);
        P.spec(c, jx - 16, jy - 52, jx - 16, jy - 8, 2, .45);
      }
      // the shopfront: pillars, the glass, the sign band
      c.fillStyle = "#0c0a0e"; c.fillRect(SX - 40, SY - 90, 40, FL - SY + 90); c.fillRect(SX + SW, SY - 90, 40, FL - SY + 90);
      c.fillStyle = "#08070a"; c.fillRect(SX - 40, SY - 100, SW + 80, 100);
      c.fillStyle = "rgba(255,160,200,.12)"; c.fillRect(SX - 40, SY - 2, SW + 80, 2);
      c.save(); c.globalCompositeOperation = "lighter";
      for (const [gx, w] of [[-300, 60], [-220, 20], [120, 80], [230, 26]]) {
        const g = c.createLinearGradient(gx, SY, gx + w + 120, FL); g.addColorStop(0, "rgba(255,255,255,.08)"); g.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = g; c.beginPath(); c.moveTo(gx, SY); c.lineTo(gx + w, SY); c.lineTo(gx + w + 120, FL); c.lineTo(gx + 120, FL); c.fill();
      }
      c.restore();
      c.fillStyle = "#0c0a0e"; c.fillRect(-6, SY, 12, FL - SY);
      // the polished mall floor, reflecting the shop
      L.full();
      const fy = L.sy(FL);
      c.fillStyle = P.vgrad(c, 0, fy, 0, H, [[0, "#1a161c"], [1, "#050406"]]); c.fillRect(0, fy, W, H - fy);
      c.save(); c.globalAlpha = .28; c.translate(0, fy * 2); c.scale(1, -1);
      c.drawImage(o.canvas, 0, 0, W, fy, 0, 0, W, fy);
      c.restore();
      c.fillStyle = P.vgrad(c, 0, fy, 0, H, [[0, "rgba(10,8,12,.2)"], [.5, "rgba(10,8,12,.85)"], [1, "#050406"]]); c.fillRect(0, fy, W, H - fy);
      // floor tiles
      L.stage(); c.strokeStyle = "rgba(255,220,200,.04)"; c.lineWidth = 2;
      for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(i * 60, FL); c.lineTo(i * 220, 1500); c.stroke(); }
      for (let i = 0; i < 10; i++) { const y = FL + Math.pow(i / 10, 1.6) * 1200; c.beginPath(); c.moveTo(-1400, y); c.lineTo(1400, y); c.stroke(); }
    });
    x.stage();
    // the shop's light spilling out onto the mall floor
    P.shaft(c, 0, FL, SW, 0, 900, SW * 2.2, "#ffc8a8", .14);
    // candle flames in their jars
    JARS.forEach(([jx, jy], i) => {
      const fl = noise(t * 2.4 + i * 3.1), fh = 14 + fl * 6, sw = (noise(t * 5 + i) - .5) * 3;
      const g = c.createRadialGradient(jx, jy - 54, 0, jx, jy - 54, fh);
      g.addColorStop(0, "rgba(255,250,230,1)"); g.addColorStop(.5, "rgba(255,190,100,.8)"); g.addColorStop(1, "rgba(255,120,40,0)");
      c.fillStyle = g; c.beginPath(); c.ellipse(jx + sw, jy - 56, 4.5, fh * .7, 0, 0, 7); c.fill();
      P.glow(c, jx, jy - 40, 70 + fl * 20, "#ffb35a", .3);
    });
    // the sign: neon script, breathing
    const nb = .85 + .15 * Math.sin(t * 2.2) - (noise(t * 9) > .93 ? .4 : 0);
    P.glow(c, 0, SY - 52, 300, "#ff5a9a", .22 * nb);
    P.script(c, "Splash", 0, SY - 50, 84, rgba("#ffb0d0", nb), 1);
    // one last ceiling light in the mall, humming
    P.glow(c, -1300 + 4 * 330 + 80, -500, 260, "#ffe6c8", .12 + .03 * noise(t * 6));
  };

  /* 10. Gurban: tea, soup, and the word she says a hundred times a day */
  S.tea = (x) => {
    const { c, t } = x;
    room(x, "#160d0a", "#0e0806", 80, -100, -200, .22);
    x.stage();
    tableTop(c, 80, "#2c1810");
    // lentil soup
    c.fillStyle = "rgba(0,0,0,.4)"; c.beginPath(); c.ellipse(-150, 260, 210, 60, 0, 0, 7); c.fill();
    c.fillStyle = P.vgrad(c, 0, 160, 0, 300, [[0, "#f6efe4"], [1, "#b8ac9c"]]); c.beginPath(); c.ellipse(-160, 230, 200, 70, 0, 0, 7); c.fill();
    c.fillStyle = P.vgrad(c, 0, 190, 0, 260, [[0, "#f0a03a"], [1, "#c86418"]]); c.beginPath(); c.ellipse(-160, 222, 160, 52, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(200,40,10,.6)"; c.beginPath(); c.ellipse(-140, 214, 40, 10, .2, 0, 7); c.fill();
    c.fillStyle = "#f4f0e0"; c.beginPath(); c.ellipse(-60, 236, 34, 16, .4, 0, 7); c.fill();   // lemon wedge
    P.steam(c, -160, 160, t, 1.3, 9);
    // tea glass on its saucer
    const tx = 200, ty = 210;
    c.fillStyle = "#e8e2d8"; c.beginPath(); c.ellipse(tx, ty + 6, 90, 22, 0, 0, 7); c.fill();
    c.strokeStyle = "#c9a24a"; c.lineWidth = 3; c.beginPath(); c.ellipse(tx, ty + 6, 80, 18, 0, 0, 7); c.stroke();
    c.fillStyle = "rgba(255,255,255,.14)";
    c.beginPath(); c.moveTo(tx - 40, ty - 150); c.bezierCurveTo(tx - 50, ty - 80, tx - 16, ty - 60, tx - 28, ty); c.lineTo(tx + 28, ty); c.bezierCurveTo(tx + 16, ty - 60, tx + 50, ty - 80, tx + 40, ty - 150); c.fill();
    c.fillStyle = "rgba(180,40,10,.92)";
    c.beginPath(); c.moveTo(tx - 37, ty - 124); c.bezierCurveTo(tx - 46, ty - 80, tx - 14, ty - 60, tx - 26, ty - 4); c.lineTo(tx + 26, ty - 4); c.bezierCurveTo(tx + 14, ty - 60, tx + 46, ty - 80, tx + 37, ty - 124); c.fill();
    P.glow(c, tx, ty - 70, 120, "#ff7a3a", .3);
    c.strokeStyle = "rgba(255,240,220,.6)"; c.lineWidth = 2; c.beginPath(); c.moveTo(tx + 30, ty - 140); c.bezierCurveTo(tx + 40, ty - 90, tx + 14, ty - 60, tx + 20, ty - 10); c.stroke();
    P.steam(c, tx, ty - 160, t, .9, 3);
    // "Gurban", written in the air in gold, again and again
    const words = [[-230, -330, 70, 0], [150, -400, 44, 1.2], [-20, -200, 96, 2.4], [260, -260, 36, 3.6], [-330, -170, 40, 4.8]];
    for (const [wx, wy, sz, d] of words) {
      const a = smooth(d, d + 1.5, t) * (sz > 60 ? 1 : .55);
      P.script(c, "Gurban", wx, wy + Math.sin(t * .5 + d) * 6, sz, rgba("#f4d39a", a), 1);
    }
  };

  /* 11. You stayed: rain on the glass, one lamp still on */
  S.rain = (x) => {
    const { c, W, H, t, m } = x;
    if (!m.i) { m.i = 1; m.rain = P.rainSet(77, 260, [-600, -520, 600, 520]); m.bk = P.bokehSet(5, 26, [-600, -200, 600, 300], [10, 40], ["#ff9a5a", "#9ab4ff", "#ffcf8a"]); }
    x.full(); P.fillAll(c, W, H, [[0, "#070a12"], [1, "#0d121c"]]);
    x.stage();
    P.bokeh(c, m.bk, t, 4);
    // the warm lamp, seen through wet glass
    P.glow(c, 220, 80, 380, "#ffb35a", .38 + .04 * noise(t));
    c.fillStyle = "rgba(255,200,130,.9)"; c.beginPath(); c.moveTo(170, 60); c.lineTo(270, 60); c.lineTo(250, -10); c.lineTo(190, -10); c.fill();
    P.rain(c, m.rain, [-600, -520, 600, 520], t * .8);
    c.fillStyle = "rgba(10,14,22,.35)"; c.fillRect(-600, -520, 1200, 1040);
    windowFrame(c, -560, -500, 1120, 980, "#030406");
  };

  /* 12. Slowly I began: Wednesday nights at the movies */
  S.cinema = (x) => {
    const { c, W, H, t, m } = x;
    const SX = -440, SY = -470, SW = 880, SH = 370;    // the screen
    if (!m.i) {
      m.i = 1;
      m.dust = P.starSet(19, 90, 1);
      // the film on screen: a sun going down into a calm sea, painted once (wider than the screen, to pan)
      const fc = document.createElement("canvas"); fc.width = 1100; fc.height = 370; const f = fc.getContext("2d");
      const hz = 210;
      f.fillStyle = P.vgrad(f, 0, 0, 0, hz, [[0, "#2a3a6a"], [.45, "#b0607a"], [.8, "#ff9a5a"], [1, "#ffd090"]]); f.fillRect(0, 0, 1100, hz);
      P.glow(f, 560, hz - 30, 420, "#ffb070", .7);
      f.fillStyle = "#fff4d8"; f.beginPath(); f.arc(560, hz - 26, 34, 0, 7); f.fill();
      P.glow(f, 560, hz - 26, 120, "#fff0c0", .8);
      const R = rng(61);
      for (let i = 0; i < 9; i++) {
        const cx = R() * 1100, cy = lerp(30, hz - 60, R()), w = lerp(80, 260, R()), h = lerp(6, 16, R());
        f.fillStyle = `rgba(${R() > .5 ? "120,60,90" : "255,170,140"},${.35 + R() * .3})`;
        f.beginPath(); f.ellipse(cx, cy, w, h, 0, 0, 7); f.fill();
      }
      f.fillStyle = "#2a2a4a"; f.beginPath(); f.moveTo(0, hz); for (let i = 0; i <= 20; i++) f.lineTo(i * 18, hz - 18 - Math.sin(i * .7) * 10); f.lineTo(380, hz); f.fill();
      f.fillStyle = P.vgrad(f, 0, hz, 0, 370, [[0, "#c86a5a"], [.3, "#5a3a5a"], [1, "#141a34"]]); f.fillRect(0, hz, 1100, 160);
      for (let i = 0; i < 70; i++) { const y = hz + 3 + Math.pow(R(), 1.5) * 150, w = 6 + (y - hz) * .5; f.fillStyle = `rgba(255,220,160,${.6 * (1 - (y - hz) / 160)})`; f.fillRect(560 + (R() - .5) * (40 + (y - hz) * 1.4) - w / 2, y, w, 2); }
      // a small sailboat far out
      f.fillStyle = "#1a1428"; f.beginPath(); f.moveTo(820, hz - 2); f.lineTo(850, hz - 2); f.lineTo(846, hz + 4); f.lineTo(824, hz + 4); f.fill();
      f.beginPath(); f.moveTo(834, hz - 4); f.lineTo(834, hz - 46); f.lineTo(852, hz - 6); f.fill();
      m.film = fc;
    }
    P.layer(x, "bg", (L) => {
      const { c } = L;
      L.full(); P.fillAll(c, W, H, [[0, "#060407"], [1, "#020203"]]);
      L.stage();
      // the hall: walls with acoustic panels, red velvet curtains either side of the screen
      for (let i = 0; i < 12; i++) { const px = -1400 + i * 240; c.fillStyle = "rgba(60,30,36,.25)"; c.fillRect(px + 10, -900, 220, 1100); }
      for (const sd of [-1, 1]) {
        const x0 = sd < 0 ? -760 : SX + SW, w = 320;
        c.fillStyle = "#3a0a12"; c.fillRect(x0, -900, w, 1200);
        for (let k = 0; k < 9; k++) {
          const fx = x0 + k * w / 9, g = c.createLinearGradient(fx, 0, fx + w / 9, 0);
          g.addColorStop(0, "rgba(0,0,0,.5)"); g.addColorStop(.5, "rgba(255,90,90,.16)"); g.addColorStop(1, "rgba(0,0,0,.5)");
          c.fillStyle = g; c.fillRect(fx, -900, w / 9, 1200);
        }
      }
      c.fillStyle = "#020102"; c.fillRect(SX - 24, SY - 24, SW + 48, SH + 48);
      // the rows of seats, from the screen back to us
      for (let r = 0; r < 6; r++) {
        const v = r / 5, ry = lerp(-40, 330, Math.pow(v, 1.2)), sc = lerp(.45, 1.25, v), w = 118 * sc, h = 120 * sc;
        const n = Math.ceil(2800 / w);
        for (let i = 0; i < n; i++) {
          const sx = -1400 + i * w + (r % 2) * w / 2;
          c.fillStyle = mix("#2a0c14", "#0a0306", .3 + v * .6);
          c.beginPath(); c.roundRect(sx + 5 * sc, ry, w - 10 * sc, h, [22 * sc, 22 * sc, 4, 4]); c.fill();
          c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(sx + w / 2 - 3 * sc, ry + 10, 6 * sc, h);
        }
      }
      // two drinks in the armrest holders beside the popcorn
      for (const dx of [-150, 220]) {
        c.fillStyle = P.vgrad(c, dx - 26, 0, dx + 26, 0, [[0, "#6a0e14"], [.4, "#d83a3a"], [1, "#5a0a10"]]);
        c.beginPath(); c.moveTo(dx - 28, 160); c.lineTo(dx - 22, 270); c.lineTo(dx + 22, 270); c.lineTo(dx + 28, 160); c.fill();
        c.fillStyle = "#f4ece4"; c.beginPath(); c.ellipse(dx, 160, 29, 7, 0, 0, 7); c.fill();
        c.strokeStyle = "#f4ece4"; c.lineWidth = 5; c.beginPath(); c.moveTo(dx + 6, 160); c.lineTo(dx + 16, 100); c.stroke();
      }
      // popcorn between our two seats
      const px = 40, py = 300;
      P.shadow(c, px, py + 6, 80, 14, .6);
      c.save(); c.beginPath(); c.moveTo(px - 62, py - 140); c.lineTo(px - 46, py); c.lineTo(px + 46, py); c.lineTo(px + 62, py - 140); c.closePath(); c.clip();
      c.fillStyle = "#f4efe6"; c.fillRect(px - 70, py - 150, 140, 160);
      c.fillStyle = "#b8222a"; for (let i = 0; i < 5; i++) c.fillRect(px - 62 + i * 28, py - 150, 14, 160);
      c.fillStyle = P.vgrad(c, px - 62, 0, px + 62, 0, [[0, "rgba(0,0,0,.45)"], [.4, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.55)"]]); c.fillRect(px - 70, py - 150, 140, 160);
      c.restore();
      const R = rng(4);
      for (let i = 0; i < 34; i++) {
        const kx = px - 56 + R() * 112, ky = py - 146 - R() * 40 * (1 - Math.abs(kx - px) / 70), kr = 9 + R() * 6;
        const g = c.createRadialGradient(kx - kr * .3, ky - kr * .4, 1, kx, ky, kr);
        g.addColorStop(0, "#fffbea"); g.addColorStop(.7, mix("#f8e8b8", "#e8b860", R())); g.addColorStop(1, "#a87a3a");
        c.fillStyle = g; c.beginPath(); c.arc(kx, ky, kr, 0, 7); c.fill();
      }
    });
    x.stage();
    // the film: panning slowly, flickering a little
    const flick = .86 + .1 * noise(t * 7) + .04 * Math.sin(t * 23);
    const pan = 110 + Math.sin(t * .05) * 100;
    c.save(); c.globalAlpha = flick;
    c.drawImage(m.film, pan, 0, 880, 370, SX, SY, SW, SH);
    // the sea glitters a little on screen
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 12; i++) { const ph = (t * .6 + i * .37) % 1, gx = SX + (560 - pan) + Math.sin(i * 7.1) * 60, gy = SY + 220 + i * 11; c.fillStyle = `rgba(255,230,180,${(.35 * Math.sin(ph * Math.PI)).toFixed(3)})`; c.fillRect(gx - 10 - i * 2, gy, 20 + i * 4, 2); }
    c.restore();
    // the screen's light washing the hall
    P.glow(c, 0, SY + SH * .6, 1100, "#ff9a6a", .16 * flick);
    // the projector beam from the booth behind us, motes drifting in it
    P.shaft(c, 0, 900, 140, 0, SY + SH / 2, SW * .9, "#fff0dc", .07 * flick);
    c.save(); c.globalCompositeOperation = "lighter";
    for (const d of m.dust) {
      const v = (d.y + t * .015) % 1, y = lerp(700, SY + SH / 2, v), spread = lerp(70, SW * .45, v);
      c.fillStyle = `rgba(255,240,220,${(.45 * d.s / 1.5 * Math.sin(v * Math.PI)).toFixed(3)})`;
      c.fillRect((d.x - .5) * 2 * spread, y, 2.5, 2.5);
    }
    c.restore();
    // screen light catching the tops of the seats
    for (let r = 0; r < 6; r++) {
      const v = r / 5, ry = lerp(-40, 330, Math.pow(v, 1.2)), sc = lerp(.45, 1.25, v), w = 118 * sc;
      c.strokeStyle = `rgba(255,190,150,${(.32 * flick * (1 - v * .5)).toFixed(3)})`; c.lineWidth = 2.5 * sc;
      c.beginPath();
      for (let i = 0; i < Math.ceil(2800 / w); i++) { const sx = -1400 + i * w + (r % 2) * w / 2; if (sx < -1100 || sx > 700) continue; c.moveTo(sx + 14 * sc, ry + 3); c.lineTo(sx + w - 14 * sc, ry + 3); }
      c.stroke();
    }
    // the popcorn and drinks lit by the screen
    P.glow(c, 40, 160, 120, "#ffd8a8", .12 * flick);
  };

  /* 13. The night of candles */
  S.candleroom = (x) => {
    const { c, W, H, t, m } = x;
    if (!m.i) {
      m.i = 1; const R = rng(23);
      m.candles = Array.from({ length: 26 }, (_, i) => ({ x: lerp(-480, 480, R()), y: lerp(200, 470, R()), w: lerp(16, 26, R()), h: lerp(30, 110, R()) })).sort((a, b) => a.y - b.y);
      m.petals = Array.from({ length: 70 }, () => ({ x: lerp(-520, 520, R()), y: lerp(170, 500, R()), r: R() * 6.28, s: lerp(.9, 1.6, R()) }));
      m.st = P.starSet(6, 60, .3);
    }
    room(x, "#140a0a", "#e9e0d2", 160, 0, 300, .1);
    x.full();
    // the white carpet catches the candlelight
    const fy = x.sy(160);
    c.fillStyle = P.vgrad(c, 0, fy, 0, x.H, [[0, "#3a2c26"], [.4, "#6a5446"], [1, "#2a1e18"]]); c.fillRect(0, fy, x.W, x.H - fy);
    x.stage();
    // balcony door with string lights outside
    c.fillStyle = P.vgrad(c, 0, -460, 0, 160, [[0, "#05050d"], [1, "#16101e"]]); c.fillRect(-380, -460, 420, 620);
    c.save(); c.beginPath(); c.rect(-380, -460, 420, 620); c.clip();
    c.setTransform(1, 0, 0, 1, 0, 0); P.stars(c, m.st, W, H * .5, t, .5); x.stage();
    P.stringLights(c, -400, -330, 60, -300, 50, 11, t);
    P.stringLights(c, -400, -180, 60, -200, 40, 10, t + 3);
    c.fillStyle = "#050304"; c.fillRect(-380, 40, 420, 10); for (let i = 0; i < 12; i++) c.fillRect(-372 + i * 36, 50, 5, 110);
    c.restore();
    windowFrame(c, -380, -460, 420, 620, "#0a0606", 0);
    c.fillStyle = "#0a0606"; c.fillRect(-176, -460, 10, 620);
    // table with flowers and Italian takeout
    c.fillStyle = "#1a100c"; c.fillRect(130, -10, 360, 18); c.fillRect(150, 8, 14, 160); c.fillRect(456, 8, 14, 160);
    c.fillStyle = "rgba(220,230,240,.25)"; c.beginPath(); c.moveTo(250, -10); c.lineTo(240, -150); c.lineTo(290, -150); c.lineTo(280, -10); c.fill();
    const R = rng(8);
    for (let i = 0; i < 9; i++) { const fx = 265 + (R() - .5) * 120, fyy = -170 - R() * 110; c.strokeStyle = "#2a4a20"; c.lineWidth = 3; c.beginPath(); c.moveTo(265, -140); c.lineTo(fx, fyy); c.stroke(); c.fillStyle = i % 3 ? "#9a1a2c" : "#f4ece0"; c.beginPath(); c.arc(fx, fyy, 16, 0, 7); c.fill(); c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.arc(fx + 3, fyy + 3, 8, 0, 7); c.fill(); }
    c.fillStyle = "#f0ebe2"; c.beginPath(); c.ellipse(400, -26, 64, 18, 0, 0, 7); c.fill();
    c.fillStyle = "#e8b850"; c.beginPath(); c.ellipse(400, -32, 48, 12, 0, 0, 7); c.fill();
    c.strokeStyle = "#c8902a"; c.lineWidth = 2; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(386 + i * 6, -34, 10, 0, 3); c.stroke(); }
    c.fillStyle = "#b0281a"; c.beginPath(); c.arc(410, -36, 8, 0, 7); c.fill();
    // petals and candles on the carpet
    for (const p of m.petals) P.petal(c, p.x, p.y, p.r, p.s, "#9a1a2c");
    for (const k of m.candles) P.candle(c, k.x, k.y, k.w, k.h, t, k.x, { glow: .7 });
  };

  /* 14. The ice storm */
  S.icestorm = (x) => {
    const { c, W, H, t, m } = x;
    if (!m.i) { m.i = 1; m.snow = P.snowSet(3, 260); m.frost = rng(55); m.fr = Array.from({ length: 140 }, () => ({ a: m.frost() * 6.28, d: m.frost(), l: lerp(10, 60, m.frost()) })); }
    room(x, "#0c0e14", "#08080c", 170, 0, 120, .2);
    x.stage();
    c.fillStyle = P.vgrad(c, 0, -440, 0, 120, [[0, "#1a2a44"], [1, "#4a6a8a"]]); c.fillRect(-380, -440, 760, 560);
    c.save(); c.beginPath(); c.rect(-380, -440, 760, 560); c.clip();
    c.setTransform(1, 0, 0, 1, 0, 0); c.save(); c.translate(W * .1, 0); c.rotate(-.25); P.snow(c, m.snow, W * 1.2, H, t * 1.4, .9); c.restore();
    x.stage();
    // frost creeping in from the corners
    c.strokeStyle = "rgba(230,240,255,.4)"; c.lineWidth = 1.4;
    for (const f of m.fr) {
      const corner = f.a < 3.14 ? [-380, -440] : [380, 120];
      const ang = f.a, rr = f.d * 200;
      const sx = corner[0] + Math.cos(ang) * rr * (corner[0] < 0 ? 1 : -1), sy = corner[1] + Math.sin(ang) * rr * (corner[1] < 0 ? 1 : -1);
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(ang * 3) * f.l, sy + Math.sin(ang * 3) * f.l); c.stroke();
    }
    c.restore();
    windowFrame(c, -380, -440, 760, 560, "#06070a");
    c.fillStyle = "#14100e"; c.fillRect(-440, 120, 880, 40);   // sill
    for (let i = 0; i < 6; i++) P.candle(c, -200 + i * 80, 122, 26 + (i % 2) * 6, 60 + ((i * 37) % 70), t, i, { glow: 1.2 });
    // the blanket we hid under
    c.fillStyle = P.vgrad(c, 0, 280, 0, 520, [[0, "#6a3a3a"], [1, "#2a1416"]]);
    c.beginPath(); c.moveTo(-600, 330); c.bezierCurveTo(-300, 260, -100, 360, 100, 300); c.bezierCurveTo(300, 250, 450, 330, 600, 300); c.lineTo(600, 600); c.lineTo(-600, 600); c.fill();
    c.strokeStyle = "rgba(255,190,140,.2)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-600, 330); c.bezierCurveTo(-300, 260, -100, 360, 100, 300); c.bezierCurveTo(300, 250, 450, 330, 600, 300); c.stroke();
  };

  /* 15. Our fort in the living room */
  S.fort = (x) => {
    const { c, t } = x;
    room(x, "#0c0a0e", "#080609", 120, 0, 120, .08);
    x.stage();
    const glowA = .85 + .15 * noise(t * 1.2);
    // chairs left and right
    const chair = (cx, flip) => { c.fillStyle = "#0a0607"; c.fillRect(cx - 50, -150, 100, 18); c.fillRect(cx - 50, -150, 14, 380); c.fillRect(cx + 36, -150, 14, 380); c.fillRect(cx - 60, 60, 120, 18); };
    chair(-380, 1); chair(380, -1);
    // the sheet draped between them, lit from inside
    const g = c.createRadialGradient(0, 120, 20, 0, 80, 520);
    g.addColorStop(0, rgba("#ffe6b8", glowA)); g.addColorStop(.5, rgba("#e8a860", .9 * glowA)); g.addColorStop(1, "#5a3420");
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-460, 300);
    c.bezierCurveTo(-470, 60, -420, -150, -380, -160);
    c.bezierCurveTo(-200, -60, 200, -60, 380, -160);
    c.bezierCurveTo(420, -150, 470, 60, 460, 300);
    c.closePath(); c.fill();
    // folds in the fabric
    c.strokeStyle = "rgba(90,50,30,.35)"; c.lineWidth = 6;
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 100, -95 + Math.abs(i) * 8); c.quadraticCurveTo(i * 120, 100, i * 140, 300); c.stroke(); }
    // the opening, with the mattress inside
    c.fillStyle = "rgba(40,20,10,.55)"; c.beginPath(); c.moveTo(-160, 300); c.quadraticCurveTo(0, 20, 160, 300); c.fill();
    c.fillStyle = "#f4e6d0"; c.beginPath(); c.moveTo(-140, 300); c.lineTo(-100, 220); c.lineTo(100, 220); c.lineTo(140, 300); c.fill();
    c.fillStyle = "#ffd8a8"; c.beginPath(); c.ellipse(-50, 228, 40, 14, 0, 0, 7); c.ellipse(50, 228, 40, 14, 0, 0, 7); c.fill();
    P.stringLights(c, -130, 120, 130, 120, 30, 8, t, "#ffe0a0", 3);
    P.glow(c, 0, 160, 600, "#ffb35a", .3 * glowA);
    // the mattress edge spilling out
    c.fillStyle = "#e8dccb"; c.fillRect(-560, 300, 1120, 40); c.fillStyle = "#cfc0aa"; c.fillRect(-560, 340, 1120, 70);
  };

  /* 16. The jacket */
  S.jacket = (x) => {
    const { c, t } = x;
    room(x, "#0e0a08", "#080605", 400, 0, -100, .05);
    x.stage();
    P.glow(c, 0, -60, 560, "#ffc890", .32);
    const sway = Math.sin(t * .6) * .015;
    c.save(); c.translate(0, -400); c.rotate(sway);
    // hanger
    c.strokeStyle = "#8a6a4a"; c.lineWidth = 6; c.beginPath(); c.arc(0, -10, 18, 3.4, 6.6); c.stroke();
    c.beginPath(); c.moveTo(0, 8); c.lineTo(-210, 90); c.moveTo(0, 8); c.lineTo(210, 90); c.stroke();
    const leather = (x0, x1) => P.vgrad(c, x0, 0, x1, 0, [[0, "#2a1408"], [.3, "#7a4220"], [.55, "#a8622e"], [.8, "#6a3818"], [1, "#24100a"]]);
    // sleeves
    c.fillStyle = leather(-330, -150);
    c.beginPath(); c.moveTo(-200, 90); c.bezierCurveTo(-280, 140, -310, 400, -300, 640); c.lineTo(-220, 650); c.bezierCurveTo(-220, 450, -200, 260, -170, 200); c.fill();
    c.fillStyle = leather(150, 330);
    c.beginPath(); c.moveTo(200, 90); c.bezierCurveTo(280, 140, 310, 400, 300, 640); c.lineTo(220, 650); c.bezierCurveTo(220, 450, 200, 260, 170, 200); c.fill();
    // body
    c.fillStyle = leather(-200, 200);
    c.beginPath(); c.moveTo(-200, 90); c.lineTo(-60, 40); c.lineTo(0, 120); c.lineTo(60, 40); c.lineTo(200, 90); c.lineTo(190, 620); c.lineTo(-190, 620); c.closePath(); c.fill();
    // collar
    c.fillStyle = "#4a2410";
    c.beginPath(); c.moveTo(-60, 40); c.lineTo(-120, 70); c.lineTo(-20, 230); c.lineTo(0, 120); c.fill();
    c.beginPath(); c.moveTo(60, 40); c.lineTo(120, 70); c.lineTo(20, 230); c.lineTo(0, 120); c.fill();
    // zipper and seams
    c.strokeStyle = "rgba(230,200,150,.75)"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 230); c.lineTo(0, 620); c.stroke();
    c.strokeStyle = "rgba(20,8,2,.6)"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-180, 250); c.lineTo(-30, 250); c.moveTo(180, 250); c.lineTo(30, 250); c.moveTo(-170, 560); c.lineTo(170, 560); c.stroke();
    c.fillStyle = "#3a1c0c"; c.fillRect(-150, 330, 90, 22); c.fillRect(60, 330, 90, 22);   // pocket flaps
    c.fillStyle = "#d8b880"; c.beginPath(); c.arc(-105, 341, 5, 0, 7); c.arc(105, 341, 5, 0, 7); c.fill();
    // a soft sheen moving across the leather
    const sh = ((t * .12) % 1.4) - .2;
    const s = c.createLinearGradient(-260 + sh * 520, 0, -160 + sh * 520, 0);
    s.addColorStop(0, "rgba(255,220,180,0)"); s.addColorStop(.5, "rgba(255,220,180,.16)"); s.addColorStop(1, "rgba(255,220,180,0)");
    c.globalCompositeOperation = "lighter"; c.fillStyle = s; c.fillRect(-320, 40, 640, 620); c.globalCompositeOperation = "source-over";
    c.restore();
  };

  /* 17. Birthdays */
  S.cake = (x) => {
    const { c, t, m } = x;
    if (!m.i) { m.i = 1; m.bk = P.bokehSet(17, 40, [-800, -480, 800, -60], [8, 30], ["#ffcf8a", "#ff8a6a", "#ffe6c0"]); }
    room(x, "#140c0c", "#0c0707", 60, 0, -60, .16);
    x.stage();
    P.bokeh(c, m.bk, t, 8);
    tableTop(c, 60, "#2a1410");
    // glasses
    const glass = (gx, gy) => {
      c.strokeStyle = "rgba(255,240,220,.6)"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(gx - 36, gy - 190); c.quadraticCurveTo(gx - 40, gy - 110, gx, gy - 90); c.quadraticCurveTo(gx + 40, gy - 110, gx + 36, gy - 190); c.stroke();
      c.fillStyle = "rgba(140,20,30,.85)"; c.beginPath(); c.moveTo(gx - 34, gy - 150); c.quadraticCurveTo(gx - 36, gy - 110, gx, gy - 94); c.quadraticCurveTo(gx + 36, gy - 110, gx + 34, gy - 150); c.fill();
      c.beginPath(); c.moveTo(gx, gy - 90); c.lineTo(gx, gy); c.stroke(); c.beginPath(); c.ellipse(gx, gy, 30, 7, 0, 0, 7); c.stroke();
      P.glow(c, gx + 18, gy - 160, 30, "#ffffff", .4);
    };
    glass(-330, 160); glass(330, 170);
    // the cake
    c.fillStyle = "rgba(0,0,0,.4)"; c.beginPath(); c.ellipse(0, 290, 250, 50, 0, 0, 7); c.fill();
    c.fillStyle = "#e8e2d8"; c.beginPath(); c.ellipse(0, 270, 240, 46, 0, 0, 7); c.fill();
    c.fillStyle = P.vgrad(c, -200, 0, 200, 0, [[0, "#5a2a14"], [.5, "#8a4a24"], [1, "#4a200e"]]); c.fillRect(-180, 100, 360, 160);
    c.beginPath(); c.ellipse(0, 260, 180, 34, 0, 0, 7); c.fill();
    c.fillStyle = "#f4ece0"; c.beginPath(); c.ellipse(0, 100, 180, 34, 0, 0, 7); c.fill();
    for (let i = 0; i < 12; i++) { const dx = -170 + i * 31; c.beginPath(); c.ellipse(dx, 118 + (i % 3) * 8, 12, 22 + (i % 3) * 10, 0, 0, 7); c.fill(); }
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; P.candle(c, Math.cos(a) * 110, 100 + Math.sin(a) * 18, 12, 70, t, i, { glow: .8, wax: ["#f4b6c8", "#b8e0d2", "#f8e3a0"][i % 3] }); }
  };

  /* 18. Paris Baguette: croissants in morning light */
  S.bakery = (x) => {
    const { c, W, H, t } = x;
    x.full(); P.fillAll(c, W, H, [[0, "#3a2a1c"], [.5, "#6a4a2c"], [1, "#24180e"]]);
    x.stage();
    // the big window and the city beyond
    c.fillStyle = P.vgrad(c, 0, -480, 0, 0, [[0, "#f8e6c8"], [1, "#e8c090"]]); c.fillRect(-500, -480, 1000, 480);
    c.fillStyle = "rgba(160,120,90,.35)"; for (let i = 0; i < 7; i++) c.fillRect(-480 + i * 150, -300 + (i % 3) * 40, 110, 300);
    windowFrame(c, -500, -480, 1000, 480, "#2a1a10", 0); c.fillStyle = "#2a1a10"; c.fillRect(-170, -480, 12, 480); c.fillRect(160, -480, 12, 480);
    // sunbeams
    c.save(); c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) { const bx = -400 + i * 260 + Math.sin(t * .2 + i) * 10; const g = c.createLinearGradient(bx, -480, bx + 300, 400); g.addColorStop(0, "rgba(255,230,180,.22)"); g.addColorStop(1, "rgba(255,230,180,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(bx, -480); c.lineTo(bx + 90, -480); c.lineTo(bx + 420, 520); c.lineTo(bx + 260, 520); c.fill(); }
    c.restore();
    // marble table
    c.fillStyle = P.vgrad(c, 0, 20, 0, 520, [[0, "#f0ebe4"], [1, "#a8a098"]]); c.fillRect(-700, 20, 1400, 600);
    c.strokeStyle = "rgba(120,110,100,.25)"; c.lineWidth = 2; c.beginPath(); c.moveTo(-500, 80); c.bezierCurveTo(-200, 160, 0, 60, 400, 220); c.stroke();
    // croissants
    const croissant = (cx, cy, s, rot) => {
      c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(s, s);
      c.fillStyle = "rgba(60,40,20,.3)"; c.beginPath(); c.ellipse(0, 26, 120, 22, 0, 0, 7); c.fill();
      const segs = [[-95, 10, 28], [-58, -6, 38], [-18, -14, 46], [24, -14, 46], [62, -6, 38], [98, 10, 28]];
      for (const [sx, sy, r] of segs) {
        const g = c.createRadialGradient(sx - r * .3, sy - r * .5, 2, sx, sy, r * 1.1);
        g.addColorStop(0, "#ffe2a0"); g.addColorStop(.5, "#d8902e"); g.addColorStop(1, "#7a3e10");
        c.fillStyle = g; c.beginPath(); c.ellipse(sx, sy, r * .7, r, sx * .01, 0, 7); c.fill();
      }
      c.restore();
    };
    croissant(-180, 260, 1.1, -.08); croissant(150, 330, .95, .12);
    // baguettes in paper
    c.fillStyle = "#d8c8a8"; c.beginPath(); c.moveTo(250, 40); c.lineTo(440, 40); c.lineTo(470, 260); c.lineTo(230, 260); c.fill();
    for (let i = 0; i < 3; i++) { c.save(); c.translate(300 + i * 50, 80); c.rotate(-.15 + i * .1); c.fillStyle = P.vgrad(c, -20, 0, 20, 0, [[0, "#8a4a14"], [.5, "#e8a850"], [1, "#7a3a10"]]); c.beginPath(); c.roundRect(-20, -200, 40, 240, 20); c.fill(); c.restore(); }
    // coffee
    c.fillStyle = "#fbf8f2"; c.beginPath(); c.ellipse(-20, 160, 70, 18, 0, 0, 7); c.fill();
    c.fillStyle = "#ffffff"; c.beginPath(); c.ellipse(-20, 130, 48, 14, 0, 0, 7); c.fill(); c.fillRect(-68, 100, 96, 30);
    c.fillStyle = "#b07a4a"; c.beginPath(); c.ellipse(-20, 100, 44, 11, 0, 0, 7); c.fill();
    c.strokeStyle = "#f4e6d0"; c.lineWidth = 3; c.beginPath(); c.moveTo(-34, 100); c.quadraticCurveTo(-20, 92, -6, 100); c.quadraticCurveTo(-20, 108, -34, 100); c.stroke();
    P.steam(c, -20, 86, t, .8, 5, .3);
    const R = rng(9); for (let i = 0; i < 40; i++) { c.fillStyle = mix("#e8b060", "#8a4a14", R()); c.fillRect(-300 + R() * 520, 300 + R() * 160, 4, 3); }
  };

  /* 19. That morning: her side of the bed, the phone */
  S.emptybed = (x) => {
    const { c, W, H, t } = x;
    x.full(); P.fillAll(c, W, H, [[0, "#0a1020"], [1, "#04060c"]]);
    x.stage();
    // blinds letting in blue dawn
    for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(140,170,220,${.08 + .04 * (i % 2)})`; c.fillRect(-460, -460 + i * 34, 520, 16); }
    // bed
    c.fillStyle = "#1a2030"; c.fillRect(-560, 40, 900, 480);
    c.fillStyle = P.vgrad(c, 0, 40, 0, 300, [[0, "#c8d0e0"], [1, "#6a7488"]]);
    c.beginPath(); c.moveTo(-560, 120); c.bezierCurveTo(-400, 80, -260, 160, -120, 110); c.bezierCurveTo(40, 60, 200, 150, 340, 100); c.lineTo(340, 520); c.lineTo(-560, 520); c.fill();
    c.fillStyle = "#dfe4ee"; c.beginPath(); c.ellipse(-370, 50, 150, 54, -.05, 0, 7); c.fill();       // my pillow, slept on
    c.fillStyle = "#eef1f6"; c.beginPath(); c.ellipse(-30, 30, 160, 58, .03, 0, 7); c.fill();         // hers, untouched
    c.strokeStyle = "rgba(60,70,90,.35)"; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-500 + i * 140, 200 + (i % 2) * 40); c.quadraticCurveTo(-420 + i * 140, 260, -380 + i * 140, 380); c.stroke(); }
    // nightstand, clock, phone
    c.fillStyle = "#10141e"; c.fillRect(360, 60, 200, 460);
    c.font = "600 54px Inter, system-ui, sans-serif"; c.fillStyle = "#ff4a3a"; c.textAlign = "center"; c.shadowColor = "#ff2a1a"; c.shadowBlur = 18;
    c.fillText("6:47", 460, 30); c.shadowBlur = 0;
    const ring = Math.max(0, Math.sin(t * 3)) * smooth(2, 3, t);
    const jx = ring > .2 ? (Math.random() - .5) * 4 : 0;
    c.fillStyle = "#05070a"; c.beginPath(); c.roundRect(410 + jx, 34 + 60, 100, 46, 8); c.fill();
    if (t > 2) {
      c.fillStyle = "#cfe0ff"; c.beginPath(); c.roundRect(416 + jx, 40 + 60, 88, 34, 6); c.fill();
      P.glow(c, 460, 117, 160, "#9ac0ff", .4 + .3 * ring);
      c.strokeStyle = `rgba(160,200,255,${.5 * ring})`; c.lineWidth = 3;
      for (let k = 1; k < 4; k++) { c.beginPath(); c.arc(460, 117, 60 + k * 26 + (t * 40) % 26, -2.4, -.7); c.stroke(); }
    }
  };

  /* 20. The hospital: the monitor keeps time */
  S.hospital = (x) => {
    const { c, W, H, t, m } = x;
    if (!m.i) { m.i = 1; m.city = P.bokehSet(13, 60, [-460, -380, 120, -40], [3, 10], ["#ffcf8a", "#bcd2ff", "#ff9a6a"]); }
    x.full(); P.fillAll(c, W, H, [[0, "#06090e"], [1, "#030507"]]);
    x.stage();
    // window with the city asleep
    c.fillStyle = P.vgrad(c, 0, -440, 0, -20, [[0, "#070b18"], [1, "#1a1a2e"]]); c.fillRect(-460, -440, 580, 420);
    P.bokeh(c, m.city, t);
    windowFrame(c, -460, -440, 580, 420, "#0a0e14");
    // monitor
    c.fillStyle = "#0b1014"; c.beginPath(); c.roundRect(200, -420, 300, 210, 12); c.fill();
    c.fillStyle = "#020806"; c.fillRect(216, -404, 268, 178);
    c.strokeStyle = "#5affb0"; c.lineWidth = 3; c.shadowColor = "#5affb0"; c.shadowBlur = 10; c.beginPath();
    const head = (t * 110) % 268;
    for (let i = 0; i <= 268; i += 2) {
      const ph = ((i / 268) * 2.5 - t * .41) % 1, v = ph < 0 ? ph + 1 : ph;
      const beat = v > .45 && v < .5 ? -60 * Math.sin((v - .45) / .05 * Math.PI) : v > .5 && v < .53 ? 22 * Math.sin((v - .5) / .03 * Math.PI) : Math.sin(v * 20) * 2;
      const yy = -300 + beat; i ? c.lineTo(216 + i, yy) : c.moveTo(216 + i, yy);
    }
    c.stroke(); c.shadowBlur = 0;
    c.font = "500 26px Inter, system-ui, sans-serif"; c.fillStyle = "#5affb0"; c.textAlign = "right"; c.fillText(String(72 + Math.round(Math.sin(t * .3) * 3)), 474, -380);
    P.glow(c, 350, -310, 260, "#5affb0", .1);
    // IV stand
    c.strokeStyle = "#2a323c"; c.lineWidth = 6; c.beginPath(); c.moveTo(150, -200); c.lineTo(150, 500); c.moveTo(110, -200); c.lineTo(190, -200); c.stroke();
    c.fillStyle = "rgba(200,220,240,.35)"; c.beginPath(); c.roundRect(120, -190, 60, 90, 14); c.fill();
    c.strokeStyle = "rgba(200,220,240,.3)"; c.lineWidth = 2; c.beginPath(); c.moveTo(150, -100); c.bezierCurveTo(150, 60, 40, 80, 0, 200); c.stroke();
    // bed, blanket in moonlight
    c.fillStyle = "#1a2230"; c.fillRect(-560, 160, 760, 360);
    c.fillStyle = P.vgrad(c, 0, 140, 0, 400, [[0, "#9aa8bc"], [1, "#3a4456"]]);
    c.beginPath(); c.moveTo(-560, 220); c.bezierCurveTo(-300, 150, -100, 230, 120, 180); c.lineTo(200, 520); c.lineTo(-560, 520); c.fill();
    c.strokeStyle = "#5a6474"; c.lineWidth = 8; c.beginPath(); c.moveTo(-560, 130); c.lineTo(200, 130); c.stroke();
  };

  /* 21. "I love you", written on his palm */
  S.palm = (x) => {
    const { c, t } = x;
    x.full(); P.fillAll(c, x.W, x.H, [[0, "#0a0605"], [1, "#050303"]]);
    x.stage();
    P.glow(c, 0, 60, 640, "#ff9a5a", .24);
    // an open palm, seen from above
    const skin = c.createRadialGradient(10, 190, 20, 0, 120, 520);
    skin.addColorStop(0, "#b8805e"); skin.addColorStop(.35, "#6a3e28"); skin.addColorStop(.7, "#2a160c"); skin.addColorStop(1, "#0c0604");
    c.fillStyle = skin;
    // tapered fingers, softly bent, with a warm rim where the candle catches them
    const finger = (bx, by, len, w, ang) => {
      c.save(); c.translate(bx, by); c.rotate(ang);
      c.beginPath(); c.moveTo(-w / 2, 40); c.bezierCurveTo(-w * .55, -len * .4, -w * .42, -len * .85, 0, -len); c.bezierCurveTo(w * .42, -len * .85, w * .55, -len * .4, w / 2, 40); c.closePath(); c.fill();
      c.strokeStyle = "rgba(255,170,110,.35)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-w * .5, -len * .2); c.bezierCurveTo(-w * .5, -len * .6, -w * .4, -len * .9, 0, -len); c.stroke();
      c.strokeStyle = "rgba(20,8,4,.4)"; c.lineWidth = 2; for (const k of [.35, .62]) { c.beginPath(); c.moveTo(-w * .3, -len * k); c.quadraticCurveTo(0, -len * k + 6, w * .3, -len * k); c.stroke(); }
      c.restore();
    };
    finger(-150, -40, 260, 80, -.16); finger(-50, -80, 310, 86, -.04); finger(55, -76, 300, 84, .06); finger(150, -30, 240, 76, .18);
    finger(-230, 170, 230, 92, -1.0);   // thumb
    c.beginPath(); c.moveTo(-200, -40); c.bezierCurveTo(-230, 120, -220, 300, -120, 460); c.lineTo(200, 460); c.bezierCurveTo(250, 300, 240, 100, 200, -20); c.closePath(); c.fill();
    // palm lines
    c.strokeStyle = "rgba(90,40,20,.4)"; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-190, 60); c.bezierCurveTo(-60, 40, 80, 50, 200, 10); c.stroke();
    c.beginPath(); c.moveTo(-180, 140); c.bezierCurveTo(-60, 120, 60, 150, 170, 200); c.stroke();
    c.beginPath(); c.moveTo(-120, 70); c.bezierCurveTo(-170, 200, -110, 340, -60, 440); c.stroke();
    // her words, traced with one finger
    const words = YY.lang() === "tr" ? "seni seviyorum" : "I love you";
    const rev = smooth(1, 5, t);
    P.script(c, words, 10, 200, YY.lang() === "tr" ? 62 : 78, "rgba(255,236,210,.95)", rev);
    P.glow(c, 10, 200, 260 * rev, "#ffd9a0", .2 * rev);
  };

  /* 22. Night shift in the corner of her room */
  S.nightshift = (x) => {
    const { c, W, H, t, m } = x;
    if (!m.i) { m.i = 1; m.st = P.starSet(21, 90, .4); }
    x.full(); P.fillAll(c, W, H, [[0, "#060810"], [1, "#030406"]]);
    x.stage();
    // moonlit window
    c.fillStyle = P.vgrad(c, 0, -460, 0, -100, [[0, "#0a1024"], [1, "#1a2440"]]); c.fillRect(-150, -460, 360, 360);
    c.save(); c.beginPath(); c.rect(-150, -460, 360, 360); c.clip(); c.setTransform(1, 0, 0, 1, 0, 0); P.stars(c, m.st, W, H, t, .7); x.stage(); c.restore();
    c.fillStyle = "#e9ecf5"; c.beginPath(); c.arc(120, -380, 22, 0, 7); c.fill(); P.glow(c, 120, -380, 120, "#c9d6ff", .2);
    windowFrame(c, -150, -460, 360, 360, "#0a0e14");
    // moonlight across her bed (right)
    c.fillStyle = "#141a26"; c.fillRect(60, 80, 520, 440);
    c.fillStyle = P.vgrad(c, 0, 60, 0, 360, [[0, "#8a96ac"], [1, "#2a3240"]]);
    c.beginPath(); c.moveTo(60, 140); c.bezierCurveTo(200, 80, 380, 150, 580, 110); c.lineTo(580, 520); c.lineTo(60, 520); c.fill();
    c.fillStyle = "#c8d0de"; c.beginPath(); c.ellipse(420, 80, 140, 46, .05, 0, 7); c.fill();
    c.fillStyle = "rgba(160,180,220,.12)"; c.beginPath(); c.moveTo(-150, -100); c.lineTo(210, -100); c.lineTo(580, 400); c.lineTo(60, 400); c.fill();
    // my corner: a chair, a laptop's glow
    c.fillStyle = "#07090c"; c.fillRect(-520, 120, 300, 26); c.fillRect(-510, 146, 18, 380); c.fillRect(-250, 146, 18, 380);
    c.fillStyle = "#0c0f14"; c.beginPath(); c.moveTo(-460, 120); c.lineTo(-440, -20); c.lineTo(-300, -20); c.lineTo(-290, 120); c.fill();
    c.fillStyle = P.vgrad(c, 0, -14, 0, 110, [[0, "#9ac0ff"], [1, "#4a6aa8"]]);
    c.beginPath(); c.moveTo(-452, 112); c.lineTo(-436, -12); c.lineTo(-304, -12); c.lineTo(-298, 112); c.fill();
    c.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 6; i++) c.fillRect(-420, 10 + i * 14, 40 + ((i * 53) % 70), 4);
    P.glow(c, -370, 50, 340, "#7aa8ff", .24 + .03 * Math.sin(t));
    // a cup of coffee gone cold beside it
    c.fillStyle = "#e8e4dc"; c.fillRect(-250, 92, 34, 30);
  };

  /* 23. Three flights home */
  S.stairs = (x) => {
    const { c, W, H, t } = x;
    x.full(); P.fillAll(c, W, H, [[0, "#140e0c"], [1, "#060404"]]);
    x.stage();
    // light from our door at the top
    P.glow(c, 260, -440, 640, "#ffc27a", .4);
    c.fillStyle = "#ffd59a"; c.fillRect(200, -480, 120, 120);
    // three flights, switching back
    const flight = (x0, y0, dir, n) => {
      for (let i = 0; i < n; i++) {
        const sx = x0 + dir * i * 34, sy = y0 - i * 26;
        c.fillStyle = mix("#3a2a22", "#140c0a", i / n); c.fillRect(Math.min(sx, sx + dir * 34), sy - 26, 34, 26);
        c.fillStyle = "rgba(255,200,140,.18)"; c.fillRect(Math.min(sx, sx + dir * 34), sy - 26, 34, 3);
      }
      c.strokeStyle = "rgba(255,210,160,.16)"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x0, y0 - 90); c.lineTo(x0 + dir * n * 34, y0 - n * 26 - 90); c.stroke();
    };
    flight(-420, 470, 1, 10); flight(-80, 210, -1, 10); flight(-420, -50, 1, 10); flight(-80, -310, 1, 0);
    c.fillStyle = "#1a120e"; c.fillRect(-90, 200, 180, 14); c.fillRect(-440, -60, 180, 14); c.fillRect(-90, -320, 420, 14);
    // her wheelchair waiting on the first landing, ready to go up
    const wx = 130, wy = 470, s = 1;
    c.strokeStyle = "rgba(220,200,180,.8)"; c.lineWidth = 5;
    c.beginPath(); c.arc(wx, wy - 60, 60, 0, 7); c.stroke();
    c.beginPath(); c.arc(wx, wy - 60, 50, 0, 7); c.strokeStyle = "rgba(220,200,180,.35)"; c.stroke();
    c.strokeStyle = "rgba(220,200,180,.8)";
    c.beginPath(); c.moveTo(wx - 30, wy - 120); c.lineTo(wx + 60, wy - 120); c.lineTo(wx + 70, wy - 60); c.moveTo(wx - 30, wy - 120); c.lineTo(wx - 40, wy - 230); c.lineTo(wx - 70, wy - 240); c.stroke();
    c.beginPath(); c.arc(wx + 80, wy - 14, 14, 0, 7); c.stroke();
    P.glow(c, wx, wy - 80, 200, "#ffb35a", .15);
  };

  /* 24. Now: dawn over the lake, the rose on the sill */
  S.dawn = (x) => {
    const { c, W, H, t, u } = x;
    x.full();
    const hz = x.sy(120);
    const rise = smooth(0, 1, u);
    P.fillAll(c, W, H, [[0, mix("#141a36", "#3a4a7a", rise)], [hz / H * .6, mix("#3a2a4a", "#e88a7a", rise)], [hz / H, mix("#6a3a4a", "#ffd0a0", rise)], [Math.min(1, hz / H + .001), "#140c14"], [1, "#05040a"]]);
    const sunY = lerp(hz + x.S * .05, hz - x.S * .12, rise), sx = x.sx(80);
    P.glow(c, sx, sunY, x.S * .9, "#ffb37a", .4 * rise + .1);
    c.fillStyle = mix("#ff9a6a", "#fff0d0", rise); c.beginPath(); c.arc(sx, sunY, x.S * .05, 0, 7); c.fill();
    c.fillStyle = "#140c14"; c.fillRect(0, hz - 3, W, H - hz + 3);
    P.reflections(c, [{ x: sx, c: "#ffd0a0", a: .8, w: x.S * .08 }], hz, H, t, W);
    x.stage();
    // the window frame we look through
    c.fillStyle = "#07050a";
    c.fillRect(-620, -620, 120, 1240); c.fillRect(500, -620, 120, 1240); c.fillRect(-620, -620, 1240, 90);
    c.fillRect(-620, 300, 1240, 320);
    c.fillStyle = "rgba(255,190,140,.12)"; c.fillRect(-500, 300, 1000, 4);
    // the black rose in a slim vase on the sill
    c.fillStyle = "rgba(220,230,240,.18)"; c.beginPath(); c.moveTo(-250, 300); c.lineTo(-262, 160); c.lineTo(-238, 160); c.lineTo(-226, 300); c.fill();
    c.strokeStyle = "#1a2a12"; c.lineWidth = 6; c.beginPath(); c.moveTo(-244, 220); c.bezierCurveTo(-246, 80, -236, 0, -240, -60); c.stroke();
    c.fillStyle = "#14200e"; c.beginPath(); c.ellipse(-218, 60, 30, 12, -.6, 0, 7); c.fill();
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, r = 36 - i * 2.6;
      c.save(); c.translate(-240, -90); c.rotate(a);
      c.fillStyle = mix("#0a0204", "#3a0810", i / 9); c.beginPath(); c.ellipse(0, -r * .4, r * .7, r, 0, 0, 7); c.fill();
      c.strokeStyle = rgba("#ff8a96", .3 + .4 * rise); c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, -r * .4, r * .7, r, 0, 3.6, 5.8); c.stroke();
      c.restore();
    }
    P.glow(c, -240, -90, 120, "#ff5a6b", .2 * rise);
  };
})();
