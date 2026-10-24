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

  // A soft pillow centred at (x, y): pinched corners, a piped seam, light from the upper left;
  // `dent` presses a hollow where a head has been.
  function pillow(c, x, y, w, h, rot, dent, seed, tint = "#dfe5f0") {
    c.save(); c.translate(x, y); c.rotate(rot);
    const hw = w / 2, hh = h / 2;
    const shape = () => {
      c.beginPath(); c.moveTo(-hw, -hh);
      c.bezierCurveTo(-hw * .4, -hh * .72, hw * .4, -hh * .72, hw, -hh);
      c.bezierCurveTo(hw * .86, -hh * .3, hw * .86, hh * .3, hw, hh);
      c.bezierCurveTo(hw * .4, hh * .78, -hw * .4, hh * .78, -hw, hh);
      c.bezierCurveTo(-hw * .86, hh * .3, -hw * .86, -hh * .3, -hw, -hh); c.closePath();
    };
    P.shadow(c, 10, hh * .7, hw * 1.05, hh * .5, .55);
    const g = c.createRadialGradient(-hw * .3, -hh * .4, 4, 0, 0, hw * 1.1);
    g.addColorStop(0, mix(tint, "#ffffff", .5)); g.addColorStop(.5, tint); g.addColorStop(1, mix(tint, "#1a2030", .6));
    c.fillStyle = g; shape(); c.fill();
    c.save(); shape(); c.clip();
    // under-curve shade and a few soft creases
    c.fillStyle = P.vgrad(c, 0, hh * .2, 0, hh, [[0, "rgba(10,16,30,0)"], [1, "rgba(10,16,30,.45)"]]); c.fillRect(-hw, 0, w, hh);
    const R = rng(seed);
    c.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const cx = lerp(-hw * .8, hw * .8, R()), cy = lerp(-hh * .5, hh * .5, R()), l = lerp(20, 50, R()), a = R() * 3;
      c.strokeStyle = "rgba(20,28,50,.18)"; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(cx + Math.cos(a) * l * .5, cy + 8, cx + Math.cos(a) * l, cy + Math.sin(a) * l * .3); c.stroke();
    }
    if (dent > 0) {
      const dg = c.createRadialGradient(hw * .1, -hh * .05, 2, hw * .1, 0, hw * .5);
      dg.addColorStop(0, `rgba(20,28,50,${.45 * dent})`); dg.addColorStop(1, "rgba(20,28,50,0)");
      c.fillStyle = dg; c.fillRect(-hw, -hh, w, h);
      c.strokeStyle = `rgba(255,255,255,${.25 * dent})`; c.lineWidth = 2; c.beginPath(); c.ellipse(hw * .1, 0, hw * .42, hh * .4, 0, 3.4, 5.6); c.stroke();
    }
    c.restore();
    // the piped seam
    c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = 2; shape(); c.stroke();
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
    const BT = (c) => { if (x.portrait) { c.translate(-30, 430); c.scale(1.4, 1.4); c.translate(-100, -430); } };
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
      if (x.portrait && p.x > -40) continue;   // hidden behind the nearer building
        c.save(); c.translate(p.x, HZ + 34); c.scale(.06, 1);
        const rg = c.createRadialGradient(0, 0, 0, 0, 0, 60);
        rg.addColorStop(0, rgba(p.c, .22 * p.a)); rg.addColorStop(1, rgba(p.c, 0));
        c.fillStyle = rg; c.fillRect(-60, -34, 120, 94); c.restore();
      }
      c.restore();
      // ripples: faint long lines across the water
      c.strokeStyle = "rgba(150,165,220,.05)"; c.lineWidth = 1.5;
      for (let i = 0; i < 40; i++) { const y = HZ + 8 + Math.pow(i / 40, 1.8) * 1300, w = 200 + i * 40, x0 = lerp(-1300, 300, R()); c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + w, y); c.stroke(); }

      // ---- the building (larger on a phone, where it is the subject) ----
      c.save(); BT(c);
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
      c.restore();
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
      if (x.portrait && p.x > -40) continue;   // hidden behind the nearer building
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
    c.save(); BT(c);
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
    c.restore();
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
    if (!m.i) { m.i = 1; m.bk = P.bokehSet(31, 46, [-1100, -350, 900, 260], [6, 26], ["#ffb35a", "#ff5a6b", "#ffd59a", "#7ad1ff", "#ff7a3a"]); }
    P.layer(x, "bg", (L) => {
      const { c } = L;
      L.full();
      P.fillAll(c, W, H, [[0, "#04030a"], [.45, "#120a1e"], [.62, "#2a1424"], [1, "#040306"]]);
      P.stars(c, P.starSet(8, 120, .35), W, H, 2, .45);
      L.stage();
      // the far side of the park: a glow of a thousand lanterns behind a line of trees
      for (let i = 0; i < 14; i++) { const gx = -1300 + i * 190; P.glow(c, gx, 120, 260, ["#ff7a3a", "#ffb35a", "#ff4a6a"][i % 3], .14); }
      const R = rng(12);
      c.fillStyle = "#07040a";
      for (let i = 0; i < 160; i++) { const tx = lerp(-1400, 1400, R()), ty = lerp(40, 200, Math.pow(R(), .6)); c.beginPath(); c.ellipse(tx, ty, 26 + R() * 40, 30 + R() * 50, 0, 0, 7); c.fill(); }
      c.fillRect(-1400, 180, 2800, 200);
      // small lantern figures among the trees, far away
      for (let i = 0; i < 26; i++) { const lx = lerp(-1300, 1300, R()), ly = lerp(130, 220, R()), col = ["#ffb35a", "#ff5a6b", "#7ad1ff", "#ffd59a"][(R() * 4) | 0]; P.glow(c, lx, ly, 40, col, .3); c.fillStyle = rgba(col, .8); c.beginPath(); c.ellipse(lx, ly, 6 + R() * 8, 8 + R() * 10, 0, 0, 7); c.fill(); }
      // the pond
      L.full();
      const py = L.sy(340);
      c.fillStyle = P.vgrad(c, 0, py, 0, H, [[0, "#140a14"], [.3, "#07060c"], [1, "#020204"]]); c.fillRect(0, py, W, H - py);
    });
    x.stage();
    P.bokeh(c, m.bk, t, 10);
    // overhead string of round red silk lanterns, ribbed, with tassels
    c.strokeStyle = "rgba(20,8,6,.9)"; c.lineWidth = 2; c.beginPath(); c.moveTo(-900, -460); c.quadraticCurveTo(0, -380, 900, -460); c.stroke();
    for (let i = 0; i < 13; i++) {
      const lx = -780 + i * 130, base = -460 + 80 * (1 - Math.pow((lx / 900), 2)), ly = base + 40 + Math.sin(t * .8 + i) * 3;
      P.glow(c, lx, ly, 100, "#ff4a3a", .35);
      const g = c.createRadialGradient(lx - 8, ly - 8, 2, lx, ly, 36);
      g.addColorStop(0, "#ffe2b0"); g.addColorStop(.45, "#ff5a3a"); g.addColorStop(1, "#7a1008");
      c.fillStyle = g; c.beginPath(); c.ellipse(lx, ly, 32, 34, 0, 0, 7); c.fill();
      c.strokeStyle = "rgba(120,20,10,.5)"; c.lineWidth = 1.5; c.beginPath();
      for (const k of [-.6, -.25, .25, .6]) { c.moveTo(lx + k * 32, ly - 30); c.quadraticCurveTo(lx + k * 46, ly, lx + k * 32, ly + 30); }
      c.stroke();
      c.fillStyle = "#2a1006"; c.fillRect(lx - 13, ly - 38, 26, 7); c.fillRect(lx - 13, ly + 31, 26, 7);
      c.strokeStyle = "#d8a040"; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, ly + 38); c.lineTo(lx + Math.sin(t + i) * 2, ly + 66); c.stroke();
    }
    // a second string, farther off, sweeping down across the field behind the lotus:
    // smaller lanterns in amber and gold, softened by the distance
    c.strokeStyle = "rgba(20,8,6,.6)"; c.lineWidth = 1.2; c.beginPath();
    for (let k = 0; k <= 30; k++) { const v = k / 30, sx = lerp(-1050, 1000, v), sy = lerp(-330, -290, v) + Math.sin(v * Math.PI) * 150; k ? c.lineTo(sx, sy) : c.moveTo(sx, sy); }
    c.stroke();
    for (let i = 0; i < 17; i++) {
      const v = (i + .5) / 17, lx = lerp(-1050, 1000, v), ly = lerp(-330, -290, v) + Math.sin(v * Math.PI) * 150 + 26 + Math.sin(t * .9 + i * 1.7) * 2;
      const col = ["#ffb35a", "#ffd08a", "#ff8a3a", "#ffc86a"][i % 4], fl = .85 + .15 * noise(t * 1.5 + i * 4), r = 17;
      P.glow(c, lx, ly, 70, col, .22 * fl);
      const g = c.createRadialGradient(lx - 4, ly - 5, 1, lx, ly, r);
      g.addColorStop(0, "#fff2d0"); g.addColorStop(.5, rgba(col, fl)); g.addColorStop(1, mix(col, "#4a1206", .65));
      c.fillStyle = g; c.beginPath(); c.ellipse(lx, ly, r * .82, r, 0, 0, 7); c.fill();
      c.fillStyle = "#2a1006"; c.fillRect(lx - 7, ly - r - 3, 14, 4); c.fillRect(lx - 7, ly + r - 1, 14, 4);
    }
    // a great lotus lantern, glowing through silk
    const pb = Math.sin(t * .8) * 4;
    P.glow(c, 0, 140 + pb, 460, "#ffb8c8", .26);
    const lotus = (n, len, wid, tilt, col, edge) => {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i - (n - 1) / 2) * tilt;
        c.save(); c.translate(0, 230 + pb); c.rotate(a + Math.PI / 2);
        const g = c.createLinearGradient(0, 0, 0, -len);
        g.addColorStop(0, col); g.addColorStop(.75, mix(col, "#ffffff", .5)); g.addColorStop(1, edge);
        c.fillStyle = g;
        c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-wid, -len * .35, -wid * .6, -len * .85, 0, -len); c.bezierCurveTo(wid * .6, -len * .85, wid, -len * .35, 0, 0); c.fill();
        c.strokeStyle = "rgba(255,240,245,.3)"; c.lineWidth = 1.5; c.beginPath();
        for (const k of [-.35, 0, .35]) { c.moveTo(0, -10); c.quadraticCurveTo(wid * k, -len * .5, wid * k * .4, -len * .9); }
        c.stroke();
        c.restore();
      }
    };
    lotus(9, 300, 90, .34, "#b8385e", "#ffe0ea");
    lotus(7, 250, 80, .3, "#e2708e", "#fff2f6");
    lotus(5, 190, 66, .28, "#f4a2b6", "#ffffff");
    P.glow(c, 0, 100 + pb, 140, "#fff4d8", .5);
    // lily pads on the water line
    c.fillStyle = "#0a2416"; c.beginPath(); c.ellipse(0, 252 + pb, 330, 40, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(120,220,150,.22)"; c.beginPath(); c.ellipse(0, 242 + pb, 300, 18, 0, 3.3, 6.1); c.fill();
    // bamboo lanterns: glowing green tubes, nodes, a few leaves
    for (let i = 0; i < 6; i++) {
      const bx = (i < 3 ? -460 : 300) + (i % 3) * 64, h = 300 + (i % 3) * 60, fl = .85 + .15 * noise(t * 1.3 + i);
      P.glow(c, bx, 300 - h / 2, 140, "#7affa0", .1 * fl);
      c.fillStyle = P.vgrad(c, bx - 13, 0, bx + 13, 0, [[0, "#1a5a2a"], [.45, rgba("#c8ffd4", fl)], [.6, rgba("#8affa8", fl)], [1, "#1a4a22"]]);
      c.beginPath(); c.roundRect(bx - 13, 330 - h, 26, h, 6); c.fill();
      c.fillStyle = "rgba(10,40,20,.85)"; for (let k = 1; k < 5; k++) c.fillRect(bx - 14, 330 - h + k * h / 5, 28, 5);
      c.fillStyle = "#0a2a14"; c.save(); c.translate(bx + 12, 330 - h + 40); c.rotate(.6 + Math.sin(t + i) * .05); c.beginPath(); c.ellipse(26, 0, 30, 7, 0, 0, 7); c.fill(); c.restore();
    }
    // the pond's broken reflections
    x.full();
    const py = x.sy(340);
    P.reflections(c, [{ x: x.sx(0), c: "#ffd8e0", a: .45, w: x.S * .18 }, { x: x.sx(-400), c: "#7affa0", a: .25, w: 18 * DPR }, { x: x.sx(360), c: "#7affa0", a: .25, w: 18 * DPR }], py, H, t, W);
  };

  /* 4. Her kitchen */
  S.kitchen = (x) => {
    const { c, t } = x;
    const mx = -140, my = 250, nx = 200, ny = 170;            // mantı plate, menemen pan
    room(x, "#1e120b", "#120a06", -20, 0, -380, .3, (L) => {
      const { c } = L;
      // tiled backsplash, glazed, catching the lamp
      c.fillStyle = "rgba(255,230,200,.04)"; c.fillRect(-1400, -330, 2800, 310);
      c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 3;
      for (let r = 0; r < 6; r++) { const y = -330 + r * 52; c.beginPath(); c.moveTo(-1400, y); c.lineTo(1400, y); c.stroke(); for (let i = 0; i < 40; i++) { const xx = -1400 + i * 70 + (r % 2) * 35; c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, y + 52); c.stroke(); } }
      c.save(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 18; i++) { const xx = -560 + i * 70; c.fillStyle = `rgba(255,210,160,${(.08 * Math.max(0, 1 - Math.abs(xx) / 500)).toFixed(3)})`; c.fillRect(xx + 8, -320, 20, 4); }
      c.restore();
      // a shelf of jars and spices on the wall
      c.fillStyle = "#1a0e08"; c.fillRect(-620, -420, 420, 14);
      const J = rng(14);
      for (let i = 0; i < 6; i++) { const jx = -600 + i * 66, h = 40 + J() * 40; c.fillStyle = ["#7a2a10", "#c8902a", "#5a6a2a", "#9a3a1a", "#e8c070", "#4a2a14"][i]; c.globalAlpha = .75; c.fillRect(jx, -420 - h, 44, h); c.globalAlpha = 1; c.fillStyle = "#2a1a10"; c.fillRect(jx - 2, -424 - h, 48, 8); P.spec(c, jx + 8, -414 - h + 8, jx + 8, -426, 2, .3); }
      tableTop(c, -20, "#3a2214", "#140a05", 9);
      // oven-bag chicken with rice, back left
      const bx = -230, by = 60;
      P.shadow(c, bx, by + 44, 170, 30, .6);
      c.fillStyle = P.vgrad(c, bx - 170, 0, bx + 170, 0, [[0, "#6a625a"], [.4, "#e8e2d8"], [1, "#7a7268"]]); c.beginPath(); c.ellipse(bx, by + 24, 165, 40, 0, 0, 7); c.fill();
      const g = c.createRadialGradient(bx - 30, by - 30, 5, bx, by, 150);
      g.addColorStop(0, "#ffe8b0"); g.addColorStop(.35, "#d89040"); g.addColorStop(1, "#6a3410");
      c.fillStyle = g; c.beginPath(); c.ellipse(bx, by, 130, 60, 0, 0, 7); c.fill();
      // the bag: a crinkled, glossy skin
      c.fillStyle = "rgba(255,250,240,.12)"; c.beginPath(); c.ellipse(bx, by - 6, 140, 70, 0, 0, 7); c.fill();
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 2;
      for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(bx - 110 + k * 50, by - 50 + (k % 2) * 8); c.quadraticCurveTo(bx - 90 + k * 50, by - 20, bx - 100 + k * 50, by + 30); c.stroke(); }
      P.spec(c, bx - 80, by - 50, bx + 20, by - 62, 4, .5);
      c.fillStyle = "#c98a3a"; c.beginPath(); c.moveTo(bx + 130, by - 8); c.lineTo(bx + 170, by - 22); c.lineTo(bx + 172, by + 6); c.lineTo(bx + 130, by + 6); c.fill();
      // mantı plate, front
      P.shadow(c, mx, my + 26, 220, 60, .65);
      c.fillStyle = P.vgrad(c, 0, my - 70, 0, my + 70, [[0, "#fbf6ee"], [1, "#b8ac9c"]]); c.beginPath(); c.ellipse(mx, my, 195, 78, 0, 0, 7); c.fill();
      c.strokeStyle = "rgba(60,90,160,.5)"; c.lineWidth = 3; c.beginPath(); c.ellipse(mx, my, 182, 70, 0, 0, 7); c.stroke();
      c.fillStyle = P.vgrad(c, 0, my - 56, 0, my + 56, [[0, "#fbf3e2"], [1, "#d8ccb4"]]); c.beginPath(); c.ellipse(mx, my, 150, 56, 0, 0, 7); c.fill();
      const R = rng(5);
      for (let i = 0; i < 70; i++) {
        const a = R() * 6.28, rr = Math.sqrt(R()), dx = mx + Math.cos(a) * rr * 125, dy = my + Math.sin(a) * rr * 44;
        c.fillStyle = mix("#f0d8a0", "#b8823a", R() * .7);
        c.beginPath(); c.moveTo(dx, dy - 7); c.quadraticCurveTo(dx + 9, dy - 3, dx + 8, dy); c.quadraticCurveTo(dx, dy + 7, dx - 8, dy); c.quadraticCurveTo(dx - 9, dy - 3, dx, dy - 7); c.fill();
      }
      for (let i = 0; i < 26; i++) { const a = R() * 6.28, rr = Math.sqrt(R()); c.fillStyle = rgba("#d8401a", .5 + R() * .3); c.beginPath(); c.ellipse(mx + Math.cos(a) * rr * 115, my + Math.sin(a) * rr * 40, 8 + R() * 10, 4 + R() * 4, 0, 0, 7); c.fill(); }
      for (let i = 0; i < 20; i++) { const a = R() * 6.28, rr = Math.sqrt(R()); c.fillStyle = "#3a6a2a"; c.fillRect(mx + Math.cos(a) * rr * 120, my + Math.sin(a) * rr * 42, 3, 3); }
      P.spec(c, mx - 150, my - 50, mx - 60, my - 74, 3, .4);
      // menemen in its pan, right
      c.fillStyle = "#0a0808"; c.save(); c.translate(nx + 170, ny - 20); c.rotate(-.25); c.fillRect(0, -11, 190, 22); c.fillStyle = "rgba(255,220,180,.15)"; c.fillRect(0, -11, 190, 3); c.restore();
      P.shadow(c, nx, ny + 30, 200, 50, .65);
      c.fillStyle = P.vgrad(c, 0, ny - 74, 0, ny + 74, [[0, "#2a2624"], [1, "#0a0909"]]); c.beginPath(); c.ellipse(nx, ny, 175, 74, 0, 0, 7); c.fill();
      c.fillStyle = P.vgrad(c, 0, ny - 60, 0, ny + 60, [[0, "#e4542a"], [1, "#9a2a10"]]); c.beginPath(); c.ellipse(nx, ny + 4, 155, 62, 0, 0, 7); c.fill();
      for (let i = 0; i < 22; i++) { const a = R() * 6.28, rr = Math.sqrt(R()); c.fillStyle = rgba(R() > .5 ? "#ffd64a" : "#ffe890", .9); c.beginPath(); c.ellipse(nx + Math.cos(a) * rr * 120, ny + Math.sin(a) * rr * 45, 14 + R() * 12, 6 + R() * 5, R() * 3, 0, 7); c.fill(); }
      for (let i = 0; i < 14; i++) { const a = R() * 6.28, rr = Math.sqrt(R()); c.fillStyle = "#2f7a2a"; c.beginPath(); c.ellipse(nx + Math.cos(a) * rr * 120, ny + Math.sin(a) * rr * 45, 7, 3, R() * 3, 0, 7); c.fill(); }
      c.strokeStyle = "rgba(255,220,180,.3)"; c.lineWidth = 2; c.beginPath(); c.ellipse(nx, ny, 175, 74, 0, 3.4, 5.4); c.stroke();
      // warm bread, torn
      P.shadow(c, 260, 368, 140, 22, .6);
      c.fillStyle = P.vgrad(c, 0, 300, 0, 384, [[0, "#f4c87a"], [.6, "#b8701e"], [1, "#6a3a0e"]]);
      c.beginPath(); c.ellipse(260, 340, 120, 44, -.1, 0, 7); c.fill();
      c.strokeStyle = "rgba(255,230,180,.55)"; c.lineWidth = 6; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(180 + i * 45, 322); c.lineTo(205 + i * 45, 350); c.stroke(); }
      c.strokeStyle = "rgba(110,50,10,.6)"; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(184 + i * 45, 326); c.lineTo(209 + i * 45, 354); c.stroke(); }
      teaGlass(c, 40, 80, .75, 1);
    });
    x.stage();
    // pendant lamp, its cone of light
    const fl = .93 + .07 * noise(t * .8);
    P.shaft(c, 0, -430, 140, 0, 300, 900, "#ffc890", .14 * fl);
    c.fillStyle = "#0c0705"; c.beginPath(); c.moveTo(-70, -430); c.lineTo(70, -430); c.lineTo(40, -470); c.lineTo(-40, -470); c.fill();
    c.fillRect(-3, -900, 6, 432);
    c.fillStyle = "#ffe8c0"; c.beginPath(); c.ellipse(0, -430, 66, 8, 0, 0, 7); c.fill();
    P.glow(c, 0, -420, 520, "#ffb35a", .26 * fl);
    P.glow(c, 0, -426, 90, "#fff2d8", .5);
    P.steam(c, mx, my - 50, t, 1.4, 1); P.steam(c, nx, ny - 50, t, 1.3, 2); P.steam(c, -230, 0, t, 1.1, 3); P.steam(c, 40, -60, t, .7, 4);
  };

  /* 5. The et sote */
  S.smoke = (x) => {
    const { c, t, m } = x;
    if (!m.i) { const R = rng(12); m.i = 1; m.puffs = Array.from({ length: 16 }, (_, i) => ({ o: i / 16, sx: (R() - .5) * 120, ph: R() * 6, r: lerp(.8, 1.3, R()) })); }
    room(x, "#16120f", "#0a0808", 120, 0, -260, .08, (L) => {
      const { c } = L;
      // the range hood overhead, its lamp on
      c.fillStyle = P.vgrad(c, -240, 0, 240, 0, [[0, "#1a1a1c"], [.5, "#4a4a4e"], [1, "#141416"]]);
      c.beginPath(); c.moveTo(-90, -900); c.lineTo(90, -900); c.lineTo(90, -420); c.lineTo(260, -330); c.lineTo(-260, -330); c.lineTo(-90, -420); c.fill();
      c.fillStyle = "#0a0a0c"; c.fillRect(-264, -334, 528, 18);
      P.spec(c, 40, -880, 40, -440, 3, .25, "#dfe6ff");
      // backsplash tiles
      c.strokeStyle = "rgba(0,0,0,.4)"; c.lineWidth = 2;
      for (let r = 0; r < 8; r++) { const y = -310 + r * 54; c.beginPath(); c.moveTo(-1400, y); c.lineTo(1400, y); c.stroke(); for (let i = 0; i < 26; i++) { const xx = -1400 + i * 108 + (r % 2) * 54; c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, y + 54); c.stroke(); } }
      // the stove top and its knobs
      c.fillStyle = P.vgrad(c, 0, 120, 0, 600, [[0, "#1a1a1c"], [1, "#050506"]]); c.fillRect(-560, 120, 1120, 600);
      c.fillStyle = "rgba(220,230,255,.12)"; c.fillRect(-560, 120, 1120, 2);
      for (let i = 0; i < 4; i++) { const kx = -360 + i * 240; c.fillStyle = "#0a0a0a"; c.beginPath(); c.arc(kx, 330, 24, 0, 7); c.fill(); c.fillStyle = "rgba(220,230,255,.2)"; c.fillRect(kx - 2, 308, 4, 14); }
      // a wooden spoon left on the counter, a jar of salt
      c.save(); c.translate(-400, 170); c.rotate(-.2); c.fillStyle = "#8a5a2a"; c.fillRect(0, -6, 200, 12); c.beginPath(); c.ellipse(-20, 0, 34, 20, 0, 0, 7); c.fill(); c.restore();
      // the pan, and what used to be meat
      c.fillStyle = "#0a0808"; c.save(); c.translate(160, 120); c.rotate(-.12); c.fillRect(0, -12, 260, 24); c.restore();
      P.shadow(c, 0, 160, 210, 50, .7);
      c.fillStyle = P.vgrad(c, 0, 74, 0, 186, [[0, "#3a3634"], [1, "#0e0c0c"]]); c.beginPath(); c.ellipse(0, 130, 175, 56, 0, 0, 7); c.fill();
      c.fillStyle = "#1e0e06"; c.beginPath(); c.ellipse(0, 126, 152, 44, 0, 0, 7); c.fill();
      const R = rng(12);
      for (let i = 0; i < 30; i++) { c.fillStyle = mix("#4a2410", "#060201", R()); c.beginPath(); c.ellipse((R() - .5) * 240, 126 + (R() - .5) * 60, 16 + R() * 10, 9 + R() * 6, R() * 3, 0, 7); c.fill(); }
      c.strokeStyle = "rgba(255,220,180,.25)"; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 130, 175, 56, 0, 3.4, 5.4); c.stroke();
      // the smoke alarm on the ceiling
      c.fillStyle = P.vgrad(c, 0, -460, 0, -424, [[0, "#f0ece4"], [1, "#9a968e"]]); c.beginPath(); c.ellipse(380, -440, 74, 18, 0, 0, 7); c.fill();
      c.fillStyle = "#c8c4bc"; c.fillRect(306, -480, 148, 40);
    });
    x.stage();
    // the burner glowing under the pan
    const hb = .8 + .2 * noise(t * 3);
    P.glow(c, 0, 176, 300, "#ff4a10", .28 * hb);
    c.strokeStyle = rgba("#ff6a2a", .5 * hb); c.lineWidth = 5; c.beginPath(); c.ellipse(0, 176, 150, 38, 0, .2, 2.94); c.stroke();
    // the hood lamp's cone, made visible by the smoke
    P.shaft(c, 0, -330, 480, 0, 200, 700, "#ffe0b8", .12);
    // the smoke: soft billows rising, lit warm from the hood and from below
    for (const p of m.puffs) {
      const ph = (t * .1 + p.o) % 1, sx = p.sx * (.3 + ph) + Math.sin(ph * 6 + p.ph + t * .3) * 60 * ph, sy = 100 - ph * 700;
      const r = (50 + ph * 200) * p.r, a = .3 * Math.sin(ph * Math.PI);
      const g = c.createRadialGradient(sx - r * .2, sy - r * .25, 0, sx, sy, r);
      g.addColorStop(0, `rgba(190,180,168,${a.toFixed(3)})`); g.addColorStop(.6, `rgba(120,112,106,${(a * .6).toFixed(3)})`); g.addColorStop(1, "rgba(100,96,92,0)");
      c.fillStyle = g; c.beginPath(); c.arc(sx, sy, r, 0, 7); c.fill();
    }
    // the alarm blinks, and the smoke blushes red each time
    const blink = (t % 1.2) < .25;
    c.fillStyle = blink ? "#ff4a4a" : "#5a1010"; c.beginPath(); c.arc(380, -424, 7, 0, 7); c.fill();
    if (blink) { P.glow(c, 380, -424, 140, "#ff2a2a", .8); P.glow(c, 300, -300, 420, "#ff2a2a", .12); }
  };

  /* 6. Coffee on the balcony, Eda and Mehmet's house glowing across */
  S.balcony = (x) => {
    const { c, W, H, t, m } = x;
    const WINS = [[-390, -10, 70, 66], [-270, -10, 70, 66], [-90, -10, 70, 66], [-390, 76, 70, 66], [-200, 66, 60, 110], [-90, 76, 70, 66]];
    if (!m.i) { m.i = 1; m.bk = P.bokehSet(41, 30, [-1100, -260, 900, 80], [4, 16], ["#ffcf8a", "#ffb35a", "#ffe6c0"]); }
    P.layer(x, "bg", (L) => {
      const { c } = L;
      L.full();
      P.fillAll(c, W, H, [[0, "#04050c"], [.5, "#14112a"], [.62, "#2a1a2a"], [1, "#050406"]]);
      P.stars(c, P.starSet(2, 160, .45), W, H, 2, .7);
      L.stage();
      // distant hills and town
      L.full(); P.ridge(c, W, L.sy(10), L.S * .08, 4.4, "#0d0b18", 2); L.stage();
      // trees around their house
      const R = rng(17);
      c.fillStyle = "#06060c";
      for (const [tx, ty, s] of [[-560, 40, 1.2], [140, 20, 1], [260, 60, .8]]) for (let i = 0; i < 30; i++) { const a = R() * 6.28, r = Math.sqrt(R()) * 120 * s; c.beginPath(); c.ellipse(tx + Math.cos(a) * r, ty - 100 * s + Math.sin(a) * r * 1.2, 30 * s, 24 * s, R() * 3, 0, 7); c.fill(); }
      // the house: two storeys, a gable, a chimney, eaves
      c.fillStyle = P.vgrad(c, -430, 0, 70, 0, [[0, "#15121c"], [1, "#0c0a10"]]);
      c.beginPath(); c.moveTo(-450, -40); c.lineTo(-180, -230); c.lineTo(90, -40); c.lineTo(70, -40); c.lineTo(70, 190); c.lineTo(-430, 190); c.lineTo(-430, -40); c.fill();
      c.fillStyle = "#08070c"; c.beginPath(); c.moveTo(-470, -30); c.lineTo(-180, -240); c.lineTo(110, -30); c.lineTo(96, -24); c.lineTo(-180, -222); c.lineTo(-456, -24); c.fill();
      c.fillRect(-60, -200, 40, 90);
      c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 2; for (let i = 0; i < 20; i++) { c.beginPath(); c.moveTo(-430, -30 + i * 11); c.lineTo(70, -30 + i * 11); c.stroke(); }
      // their windows: warm, with mullions, curtains, life inside
      for (const [wx, wy, w, h] of WINS) {
        const g = c.createLinearGradient(0, wy, 0, wy + h); g.addColorStop(0, "#ffd9a0"); g.addColorStop(1, "#ff9a4a");
        c.fillStyle = g; c.fillRect(wx, wy, w, h);
        c.fillStyle = "rgba(120,50,20,.5)"; c.fillRect(wx, wy, 12, h); c.fillRect(wx + w - 12, wy, 12, h);
        c.fillStyle = "#0c0a10"; c.fillRect(wx + w / 2 - 2, wy, 4, h); c.fillRect(wx, wy + h * .45, w, 4);
        c.strokeStyle = "#08070c"; c.lineWidth = 5; c.strokeRect(wx, wy, w, h);
        c.fillStyle = "#08070c"; c.fillRect(wx - 6, wy + h, w + 12, 6);
        P.glow(c, wx + w / 2, wy + h / 2, 150, "#ffb35a", .2);
      }
      // a lamp-post at their gate
      c.fillStyle = "#06060c"; c.fillRect(126, 40, 6, 160); P.glow(c, 129, 36, 80, "#ffd59a", .4); c.fillStyle = "#fff0d0"; c.beginPath(); c.arc(129, 36, 5, 0, 7); c.fill();
      // our balcony: a wrought-iron rail
      c.fillStyle = "#050304"; c.fillRect(-1400, 206, 2800, 14);
      c.fillStyle = "rgba(255,190,130,.18)"; c.fillRect(-1400, 206, 2800, 2);
      c.strokeStyle = "#050304"; c.lineWidth = 5;
      for (let i = 0; i < 70; i++) { const bx = -1400 + i * 42; c.beginPath(); c.moveTo(bx, 220); c.lineTo(bx, 560); c.stroke(); if (i % 3 === 0) { c.beginPath(); c.arc(bx + 21, 260, 14, 0, 7); c.stroke(); } }
      // a pot of geraniums on the rail
      c.fillStyle = P.vgrad(c, 330, 0, 430, 0, [[0, "#6a2a14"], [.5, "#b8582a"], [1, "#4a1a0a"]]); c.beginPath(); c.moveTo(330, 140); c.lineTo(430, 140); c.lineTo(416, 206); c.lineTo(344, 206); c.fill();
      for (let i = 0; i < 16; i++) { c.fillStyle = "#14240e"; c.beginPath(); c.ellipse(340 + R() * 80, 110 + R() * 40, 20, 12, R() * 3, 0, 7); c.fill(); }
      for (let i = 0; i < 9; i++) { c.fillStyle = mix("#c8182a", "#ff5a6a", R()); c.beginPath(); c.arc(346 + R() * 70, 80 + R() * 40, 8 + R() * 5, 0, 7); c.fill(); }
      // the little table, covered with a lace cloth
      tableTop(c, 300, "#24150e", "#0c0604", 13);
      c.fillStyle = "rgba(220,200,180,.5)"; c.beginPath(); c.moveTo(-420, 304); c.lineTo(420, 304); c.lineTo(520, 600); c.lineTo(-520, 600); c.fill();
      c.strokeStyle = "rgba(160,140,120,.35)"; c.lineWidth = 1.5; for (let i = 0; i < 40; i++) { c.beginPath(); c.arc(-400 + i * 21, 306, 9, 0, Math.PI); c.stroke(); }
      c.fillStyle = P.vgrad(c, 0, 300, 0, 600, [[0, "rgba(40,20,10,0)"], [1, "rgba(10,5,2,.75)"]]); c.fillRect(-520, 300, 1040, 300);
      // four Turkish coffee cups on saucers, and the copper cezve
      const cup = (cx, cy, s) => {
        P.shadow(c, cx, cy + 22 * s, 56 * s, 12 * s, .5);
        c.fillStyle = P.vgrad(c, cx - 46 * s, 0, cx + 46 * s, 0, [[0, "#9a9080"], [.45, "#fbf8f0"], [1, "#8a8070"]]); c.beginPath(); c.ellipse(cx, cy + 18 * s, 46 * s, 11 * s, 0, 0, 7); c.fill();
        c.strokeStyle = "#c9a24a"; c.lineWidth = 2 * s; c.beginPath(); c.ellipse(cx, cy + 18 * s, 40 * s, 9 * s, 0, 0, 7); c.stroke();
        c.fillStyle = P.vgrad(c, cx - 24 * s, 0, cx + 24 * s, 0, [[0, "#a89880"], [.45, "#fffaf2"], [1, "#988870"]]);
        c.beginPath(); c.moveTo(cx - 22 * s, cy - 26 * s); c.bezierCurveTo(cx - 24 * s, cy + 4 * s, cx - 16 * s, cy + 16 * s, cx, cy + 16 * s); c.bezierCurveTo(cx + 16 * s, cy + 16 * s, cx + 24 * s, cy + 4 * s, cx + 22 * s, cy - 26 * s); c.fill();
        c.strokeStyle = "#c9a24a"; c.lineWidth = 2.5 * s; c.beginPath(); c.moveTo(cx - 22 * s, cy - 18 * s); c.lineTo(cx + 22 * s, cy - 18 * s); c.stroke();
        c.strokeStyle = "#e8e0d0"; c.lineWidth = 3 * s; c.beginPath(); c.arc(cx + 24 * s, cy - 8 * s, 8 * s, -1.4, 1.4); c.stroke();
        c.fillStyle = "#2a1408"; c.beginPath(); c.ellipse(cx, cy - 26 * s, 22 * s, 5 * s, 0, 0, 7); c.fill();
        c.fillStyle = "rgba(200,150,90,.45)"; c.beginPath(); c.ellipse(cx - 2 * s, cy - 26 * s, 14 * s, 3 * s, 0, 0, 7); c.fill();
        P.spec(c, cx - 14 * s, cy - 18 * s, cx - 14 * s, cy + 6 * s, 2 * s, .4);
      };
      cup(-260, 360, 1); cup(-110, 384, 1.1); cup(100, 366, 1); cup(250, 390, 1.1);
      // cezve
      c.save(); c.translate(-10, 350);
      P.shadow(c, 0, 26, 50, 10, .5);
      c.fillStyle = P.vgrad(c, -34, 0, 34, 0, [[0, "#5a2a10"], [.4, "#e8904a"], [.55, "#ffd0a0"], [1, "#4a200a"]]);
      c.beginPath(); c.moveTo(-26, -40); c.lineTo(26, -40); c.bezierCurveTo(22, -20, 40, 0, 32, 24); c.lineTo(-32, 24); c.bezierCurveTo(-40, 0, -22, -20, -26, -40); c.fill();
      c.fillStyle = "#2a1408"; c.save(); c.translate(26, -30); c.rotate(-.35); c.fillRect(0, -5, 140, 10); c.restore();
      c.restore();
      // lokum
      c.fillStyle = "#f2efe8"; c.beginPath(); c.ellipse(-10, 452, 80, 22, 0, 0, 7); c.fill();
      for (let i = 0; i < 7; i++) { c.fillStyle = ["#e8708a", "#f4d6a0", "#ffffff"][i % 3]; c.fillRect(-50 + (i % 4) * 22 + R() * 4, 434 + Math.floor(i / 4) * 16, 18, 14); }
    });
    x.stage();
    P.bokeh(c, m.bk, t, 6);
    // their windows breathe: life moving inside
    WINS.forEach(([wx, wy, w, h], i) => { const a = .1 + .08 * noise(t * .6 + i * 2); P.glow(c, wx + w / 2, wy + h / 2, 110, "#ffb35a", a); });
    // string lights across our balcony
    P.stringLights(c, -760, -460, 660, -420, 70, 18, t);
    P.glow(c, 0, 300, 520, "#ffb35a", .1);
    for (const [cx, cy, s] of [[-260, 360, 1], [-110, 384, 1.1], [100, 366, 1], [250, 390, 1.1]]) P.steam(c, cx, cy - 36 * s, t, .5 * s, cx, .18);
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
      for (let i = 0; i < 70; i++) { const tx = DX + R() * DW, ty = DY + DH * .6 - Math.pow(R(), 2) * 160; c.beginPath(); c.ellipse(tx, ty, 8 + R() * 18, 6 + R() * 14, R() * 3, 0, 7); c.fill(); }
      c.fillRect(DX, DY + DH * .6, DW, DH * .2);
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
      for (const [ox, len, sh] of [[-6, 300, 0], [14, 250, 1]]) {
        const g = c.createLinearGradient(-30 + ox, 0, 6 + ox, 0);
        g.addColorStop(0, sh ? "#6a4a32" : "#d8b08a"); g.addColorStop(.5, sh ? "#8a6444" : "#c49a74"); g.addColorStop(1, "#4a3020");
        c.fillStyle = g; c.beginPath(); c.moveTo(-36 + ox, -384); c.bezierCurveTo(-30 + ox, -260, -44 + ox, -200, -34 + ox, -384 + len); c.lineTo(-4 + ox, -384 + len + 6); c.bezierCurveTo(-12 + ox, -200, 2 + ox, -260, -4 + ox, -384); c.fill();
        c.strokeStyle = "rgba(60,36,20,.35)"; c.lineWidth = 1; for (let k = 0; k < 12; k++) { const y = -370 + k * len / 12; c.beginPath(); c.moveTo(-34 + ox, y); c.lineTo(-6 + ox, y + 2); c.stroke(); }
        c.strokeStyle = sh ? "#5a3e28" : "#b8906a"; c.lineWidth = 2; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(-32 + ox + k * 5, -384 + len + 2); c.lineTo(-33 + ox + k * 5.4, -384 + len + 26); c.stroke(); }
      }
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
    const { c, t, m } = x;
    const GX = 80, GY = 160;                                 // the glass
    const WB = [-560, -480, -100, 40];                       // the window box
    if (!m.i) {
      m.i = 1; m.rain = P.rainSet(14, 80, WB);
      const R = rng(15); m.drops = Array.from({ length: 50 }, () => ({ x: lerp(WB[0], WB[2], R()), y: lerp(WB[1], WB[3], R()), r: lerp(1.5, 4, R()) }));
    }
    // the night beyond the window, live
    x.stage();
    c.fillStyle = P.vgrad(c, 0, WB[1], 0, WB[3], [[0, "#070b18"], [1, "#141a2c"]]); c.fillRect(WB[0], WB[1], WB[2] - WB[0], WB[3] - WB[1]);
    P.glow(c, -330, -100, 200, "#ffb070", .1);
    P.glow(c, -200, -260, 120, "#9ab4ff", .08);
    P.rain(c, m.rain, WB, t);
    room(x, "#120e14", "#07060a", 160, 260, -40, .2, (L) => {
      const { c } = L;
      c.clearRect(WB[0], WB[1], WB[2] - WB[0], WB[3] - WB[1]);
      // droplets clinging to the glass
      for (const d of m.drops) { c.fillStyle = "rgba(200,215,240,.25)"; c.beginPath(); c.arc(d.x, d.y, d.r, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(d.x - d.r * .4, d.y - d.r * .5, 1.2, 1.2); }
      windowFrame(c, WB[0], WB[1], WB[2] - WB[0], WB[3] - WB[1], "#0a0810", 1, "rgba(255,190,140,.10)");
      // nightstand: wood, a drawer with a brass pull
      c.fillStyle = P.vgrad(c, 0, 160, 0, 700, [[0, "#3a2416"], [1, "#120a06"]]); c.fillRect(-60, 160, 560, 600);
      P.woodGrain(c, -60, 160, 560, 600, 4, 30, "#000000", .3);
      c.fillStyle = P.vgrad(c, 0, 150, 0, 172, [[0, "#5a3a24"], [1, "#2a180e"]]); c.fillRect(-80, 150, 600, 22);
      c.fillStyle = "rgba(255,210,160,.25)"; c.fillRect(-80, 150, 600, 2);
      c.strokeStyle = "rgba(0,0,0,.45)"; c.lineWidth = 3; c.strokeRect(-30, 210, 500, 130);
      c.fillStyle = "#c9a24a"; c.fillRect(190, 268, 60, 8);
      // a book under the lamp
      c.fillStyle = "#4a1a1a"; c.fillRect(150, 126, 230, 26); c.fillStyle = "#e8dcc8"; c.fillRect(156, 130, 220, 18); c.fillStyle = "#3a1212"; c.fillRect(150, 144, 230, 8);
      // the lamp: brass stem, a pleated linen shade
      P.shadow(c, 262, 128, 80, 10, .6);
      c.fillStyle = P.vgrad(c, 222, 0, 302, 0, [[0, "#3a2408"], [.5, "#e8c070"], [1, "#2a1806"]]); c.beginPath(); c.ellipse(262, 124, 44, 9, 0, 0, 7); c.fill();
      c.fillStyle = P.vgrad(c, 254, 0, 270, 0, [[0, "#5a3a10"], [.5, "#ffe2a0"], [1, "#4a2a08"]]); c.fillRect(255, 0, 14, 122);
      // a cloth folded beside the glass
      c.fillStyle = P.vgrad(c, 0, 128, 0, 160, [[0, "#e8e4ec"], [1, "#9a96a8"]]); c.beginPath(); c.moveTo(-40, 160); c.lineTo(-30, 132); c.lineTo(20, 128); c.lineTo(26, 160); c.fill();
      c.strokeStyle = "rgba(60,50,80,.35)"; c.lineWidth = 2; c.beginPath(); c.moveTo(-34, 146); c.lineTo(22, 142); c.stroke();
      // the glass of water: refraction, meniscus, highlights
      P.shadow(c, GX + 6, GY + 2, 60, 10, .55);
      c.save(); c.beginPath(); c.moveTo(GX - 40, GY - 170); c.lineTo(GX - 33, GY); c.lineTo(GX + 33, GY); c.lineTo(GX + 40, GY - 170); c.closePath(); c.clip();
      c.fillStyle = "rgba(220,230,255,.06)"; c.fillRect(GX - 50, GY - 180, 100, 190);
      c.fillStyle = P.vgrad(c, GX - 40, 0, GX + 40, 0, [[0, "rgba(140,170,220,.18)"], [.5, "rgba(255,210,160,.22)"], [1, "rgba(140,170,220,.3)"]]); c.fillRect(GX - 50, GY - 110, 100, 120);
      // the far wall seen bent through the water
      c.fillStyle = "rgba(60,40,30,.3)"; c.fillRect(GX - 50, GY - 60, 100, 40);
      c.restore();
      c.strokeStyle = "rgba(255,240,220,.45)"; c.lineWidth = 2; c.beginPath(); c.moveTo(GX - 40, GY - 170); c.lineTo(GX - 33, GY); c.lineTo(GX + 33, GY); c.lineTo(GX + 40, GY - 170); c.stroke();
      c.strokeStyle = "rgba(255,245,235,.6)"; c.beginPath(); c.ellipse(GX, GY - 170, 40, 6, 0, 0, 7); c.stroke();
      c.strokeStyle = "rgba(255,230,200,.6)"; c.lineWidth = 1.5; c.beginPath(); c.ellipse(GX, GY - 110, 37, 5.5, 0, 0, 7); c.stroke();
      c.fillStyle = "rgba(200,180,140,.18)"; c.beginPath(); c.ellipse(GX, GY - 2, 33, 5, 0, 0, 7); c.fill();
      P.spec(c, GX + 26, GY - 160, GX + 22, GY - 16, 3, .7);
      P.spec(c, GX - 30, GY - 150, GX - 26, GY - 100, 1.5, .3);
      // the caustic the glass throws on the wood, towards us
      c.save(); c.globalCompositeOperation = "lighter"; c.translate(GX - 20, GY + 18); c.scale(1, .25);
      const cg = c.createRadialGradient(0, 0, 0, 0, 0, 50); cg.addColorStop(0, "rgba(255,220,170,.6)"); cg.addColorStop(1, "rgba(255,200,150,0)");
      c.fillStyle = cg; c.beginPath(); c.arc(0, 0, 50, 0, 7); c.fill(); c.restore();
    });
    x.stage();
    // the shade, lit from inside, and its pool of light
    const fl = .94 + .06 * noise(t * .9);
    const sg = c.createLinearGradient(190, 0, 334, 0);
    sg.addColorStop(0, rgba("#e88a3a", fl)); sg.addColorStop(.45, rgba("#ffe0a8", fl)); sg.addColorStop(1, rgba("#d8782a", fl));
    c.fillStyle = sg; c.beginPath(); c.moveTo(186, 10); c.lineTo(338, 10); c.lineTo(302, -120); c.lineTo(222, -120); c.fill();
    c.strokeStyle = "rgba(160,80,30,.25)"; c.lineWidth = 2; for (let i = 1; i < 9; i++) { const u = i / 9; c.beginPath(); c.moveTo(lerp(186, 338, u), 10); c.lineTo(lerp(222, 302, u), -120); c.stroke(); }
    c.fillStyle = rgba("#fff4dc", .9 * fl); c.beginPath(); c.ellipse(262, 10, 76, 7, 0, 0, 7); c.fill();
    P.glow(c, 262, -40, 560, "#ffb35a", .32 * fl);
    P.shaft(c, 262, 10, 150, 262, 400, 600, "#ffc890", .14 * fl);
    P.shaft(c, 262, -120, 80, 262, -560, 400, "#ffc890", .08 * fl);
    // lamplight through the water
    P.glow(c, GX + 20, GY - 60, 70, "#ffd59a", .22 + .05 * Math.sin(t * 1.4));
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

  /* 10. Gurban: tea, soup, a home remedy, and the word she says a hundred times a day */
  S.tea = (x) => {
    const { c, t } = x;
    room(x, "#1a0f0b", "#0e0806", 80, -100, -200, .24, (L) => {
      const { c } = L;
      tableTop(c, 80, "#2c1810", "#0e0704", 21);
      // an embroidered runner across the table
      c.fillStyle = "rgba(200,170,140,.35)"; c.beginPath(); c.moveTo(-1400, 140); c.lineTo(1400, 120); c.lineTo(1400, 200); c.lineTo(-1400, 230); c.fill();
      c.strokeStyle = "rgba(160,40,40,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-1400, 150); c.lineTo(1400, 130); c.moveTo(-1400, 220); c.lineTo(1400, 190); c.stroke();
      // lentil soup in a deep bowl
      P.shadow(c, -150, 270, 240, 60, .65);
      c.fillStyle = P.vgrad(c, -360, 0, 40, 0, [[0, "#8a8278"], [.35, "#f8f2e8"], [1, "#9a9288"]]);
      c.beginPath(); c.ellipse(-160, 222, 200, 62, 0, 0, Math.PI); c.lineTo(-360, 222); c.fill();
      c.beginPath(); c.moveTo(-360, 222); c.bezierCurveTo(-350, 330, 30, 330, 40, 222); c.fill();
      c.fillStyle = "#f4efe6"; c.beginPath(); c.ellipse(-160, 222, 200, 62, 0, 0, 7); c.fill();
      c.fillStyle = P.vgrad(c, 0, 180, 0, 260, [[0, "#f4a83e"], [1, "#c46418"]]); c.beginPath(); c.ellipse(-160, 226, 172, 50, 0, 0, 7); c.fill();
      // a swirl of red pepper butter, a few mint flakes
      c.strokeStyle = "rgba(200,40,10,.65)"; c.lineWidth = 6; c.beginPath(); c.ellipse(-150, 222, 60, 16, .1, .4, 5.4); c.stroke();
      c.lineWidth = 3; c.beginPath(); c.ellipse(-150, 222, 30, 8, .1, 1, 6); c.stroke();
      const R = rng(29); for (let i = 0; i < 24; i++) { c.fillStyle = "#3a5a1a"; c.fillRect(-300 + R() * 280, 200 + R() * 46, 3, 2); }
      c.fillStyle = "rgba(255,240,200,.35)"; c.beginPath(); c.ellipse(-230, 206, 50, 8, -.1, 0, 7); c.fill();
      P.spec(c, -330, 200, -250, 178, 3, .5);
      // lemon wedge on the rim
      c.fillStyle = "#f8e070"; c.beginPath(); c.moveTo(-20, 200); c.quadraticCurveTo(10, 180, 40, 214); c.closePath(); c.fill();
      c.fillStyle = "#fff8d0"; c.beginPath(); c.moveTo(-14, 202); c.quadraticCurveTo(10, 188, 32, 212); c.closePath(); c.fill();
      // a spoon resting on the runner
      c.save(); c.translate(-420, 300); c.rotate(.12); c.fillStyle = P.vgrad(c, 0, -8, 0, 8, [[0, "#f0f0f4"], [1, "#6a6a72"]]); c.fillRect(0, -5, 150, 10); c.beginPath(); c.ellipse(-24, 0, 30, 16, 0, 0, 7); c.fill(); c.restore();
      // the home remedy: a little jar of honey, a slice of ginger, a lemon half
      P.shadow(c, 390, 230, 60, 12, .55);
      c.fillStyle = "rgba(220,140,30,.85)"; c.beginPath(); c.roundRect(350, 140, 80, 90, 14); c.fill();
      c.fillStyle = "rgba(255,240,220,.15)"; c.beginPath(); c.roundRect(346, 126, 88, 104, 16); c.fill();
      c.fillStyle = "#e8dcc8"; c.fillRect(352, 112, 76, 20); c.strokeStyle = "#a83a2a"; c.lineWidth = 3; c.beginPath(); c.moveTo(352, 122); c.lineTo(428, 122); c.stroke();
      P.spec(c, 362, 150, 362, 214, 3, .5);
      P.glow(c, 390, 190, 70, "#ffb030", .2);
      c.fillStyle = "#f4e070"; c.beginPath(); c.arc(470, 250, 30, Math.PI, 0); c.fill(); c.fillStyle = "#fff4c0"; c.beginPath(); c.arc(470, 250, 24, Math.PI, 0); c.fill();
      c.strokeStyle = "rgba(220,190,80,.6)"; c.lineWidth = 1.5; for (let k = 0; k < 6; k++) { const a = Math.PI + k / 5 * Math.PI; c.beginPath(); c.moveTo(470, 250); c.lineTo(470 + Math.cos(a) * 22, 250 + Math.sin(a) * 22); c.stroke(); }
      // sugar cubes by the tea
      for (const [sx, sy] of [[110, 250], [134, 246], [122, 232]]) { c.fillStyle = "#fbf8f2"; c.fillRect(sx, sy, 18, 16); c.fillStyle = "rgba(0,0,0,.15)"; c.fillRect(sx, sy + 12, 18, 4); }
      teaGlass(c, 220, 220, 1, -1);
    });
    x.stage();
    // the tea glowing where the lamp comes through it
    P.glow(c, 220, 140, 120, "#ff7a3a", .26 + .04 * noise(t));
    P.steam(c, -160, 160, t, 1.3, 9); P.steam(c, 220, 60, t, .9, 3);
    // "Gurban", written in the air in gold, again and again
    const words = [[-230, -330, 70, 0], [150, -400, 44, 1.2], [-20, -200, 96, 2.4], [260, -260, 36, 3.6], [-330, -170, 40, 4.8]];
    for (const [wx, wy, sz, d] of words) {
      const a = smooth(d, d + 1.5, t) * (sz > 60 ? 1 : .55);
      if (a <= 0) continue;
      P.script(c, "Gurban", wx, wy + Math.sin(t * .5 + d) * 6, sz, rgba("#f4d39a", a), 1);
    }
  };

  /* 11. You stayed: a long night of rain, one lamp still on, her chair and its blanket */
  S.rain = (x) => {
    const { c, W, H, t, m } = x;
    const WB = [-560, -560, 520, 120];
    if (!m.i) {
      m.i = 1; m.rain = P.rainSet(77, 180, WB); m.bk = P.bokehSet(5, 26, [WB[0], -300, WB[2], 100], [10, 40], ["#ff9a5a", "#9ab4ff", "#ffcf8a"]);
      const R = rng(6); m.drops = Array.from({ length: 90 }, () => ({ x: lerp(WB[0], WB[2], R()), y: lerp(WB[1], WB[3], R()), r: lerp(1.5, 5, R()) }));
    }
    // outside: the wet city at night
    x.stage();
    c.fillStyle = P.vgrad(c, 0, WB[1], 0, WB[3], [[0, "#060a14"], [1, "#121a28"]]); c.fillRect(WB[0], WB[1], WB[2] - WB[0], WB[3] - WB[1]);
    P.bokeh(c, m.bk, t, 4);
    P.rain(c, m.rain, WB, t * .8);
    // the lamp mirrored faintly in the dark glass
    P.glow(c, 330, -40, 160, "#ffb35a", .12);
    room(x, "#120e10", "#08060a", 120, 300, 0, .22, (L) => {
      const { c } = L;
      c.clearRect(WB[0], WB[1], WB[2] - WB[0], WB[3] - WB[1]);
      // condensation and droplets on the inside of the glass
      c.fillStyle = "rgba(160,180,210,.06)"; c.fillRect(WB[0], WB[1], WB[2] - WB[0], WB[3] - WB[1]);
      for (const d of m.drops) { c.fillStyle = "rgba(190,210,240,.22)"; c.beginPath(); c.arc(d.x, d.y, d.r, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.45)"; c.fillRect(d.x - d.r * .4, d.y - d.r * .5, 1.3, 1.3); }
      windowFrame(c, WB[0], WB[1], WB[2] - WB[0], WB[3] - WB[1], "#070608", 1, "rgba(255,190,140,.10)");
      // her armchair by the window, a blanket thrown over its arm
      c.fillStyle = P.vgrad(c, -480, 0, -80, 0, [[0, "#140c0c"], [1, "#2a1a16"]]);
      c.beginPath(); c.roundRect(-470, -60, 360, 320, [60, 60, 10, 10]); c.fill();
      c.beginPath(); c.roundRect(-520, 60, 110, 260, 40); c.fill(); c.beginPath(); c.roundRect(-170, 60, 110, 260, 40); c.fill();
      c.fillStyle = "#1e1210"; c.beginPath(); c.roundRect(-420, 150, 260, 90, 20); c.fill();
      c.fillStyle = "rgba(255,190,140,.14)"; c.fillRect(-170, 60, 3, 250);
      // the knit blanket
      c.fillStyle = P.vgrad(c, -200, 0, -40, 0, [[0, "#2a1410"], [.55, "#5a2e22"], [1, "#1e0e0a"]]);
      c.beginPath(); c.moveTo(-200, 40); c.bezierCurveTo(-120, 20, -70, 50, -60, 100); c.bezierCurveTo(-40, 180, -60, 260, -30, 340); c.bezierCurveTo(-90, 350, -130, 330, -170, 348); c.bezierCurveTo(-190, 260, -170, 160, -200, 40); c.fill();
      for (let i = 0; i < 4; i++) { const fx = -170 + i * 34, g = c.createLinearGradient(fx - 14, 0, fx + 14, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.5, "rgba(0,0,0,.35)"); g.addColorStop(1, "rgba(255,170,120,.06)"); c.fillStyle = g; c.fillRect(fx - 14, 90, 28, 250); }
      c.strokeStyle = "rgba(255,180,130,.2)"; c.lineWidth = 2; c.beginPath(); c.moveTo(-60, 100); c.bezierCurveTo(-40, 180, -60, 260, -30, 340); c.stroke();
      // a little side table, the lamp's base, a mug and a book face down
      c.fillStyle = P.vgrad(c, 0, 80, 0, 100, [[0, "#4a2c1a"], [1, "#1a0e08"]]); c.fillRect(160, 80, 320, 20);
      c.fillStyle = "#120a06"; c.fillRect(180, 100, 14, 300); c.fillRect(446, 100, 14, 300);
      c.fillStyle = "rgba(255,200,150,.25)"; c.fillRect(160, 80, 320, 2);
      P.shadow(c, 330, 82, 60, 8, .6);
      c.fillStyle = P.vgrad(c, 300, 0, 360, 0, [[0, "#3a2408"], [.5, "#e8c070"], [1, "#2a1806"]]); c.beginPath(); c.ellipse(330, 78, 34, 8, 0, 0, 7); c.fill(); c.fillRect(324, -20, 12, 96);
      c.fillStyle = P.vgrad(c, 190, 0, 250, 0, [[0, "#5a4a40"], [.5, "#e8dcd0"], [1, "#4a3a30"]]); c.fillRect(196, 36, 46, 44);
      c.strokeStyle = "#a89888"; c.lineWidth = 6; c.beginPath(); c.arc(246, 58, 12, -1.3, 1.3); c.stroke();
      c.fillStyle = "#3a1a1a"; c.beginPath(); c.moveTo(380, 80); c.lineTo(400, 60); c.lineTo(470, 64); c.lineTo(460, 80); c.fill();
    });
    x.stage();
    // the lamp: still on, after all these nights
    const fl = .92 + .08 * noise(t * .7);
    const sg = c.createLinearGradient(270, 0, 390, 0); sg.addColorStop(0, rgba("#e08a3a", fl)); sg.addColorStop(.45, rgba("#ffe0a8", fl)); sg.addColorStop(1, rgba("#c8702a", fl));
    c.fillStyle = sg; c.beginPath(); c.moveTo(266, -20); c.lineTo(394, -20); c.lineTo(366, -130); c.lineTo(294, -130); c.fill();
    c.fillStyle = rgba("#fff4dc", .9 * fl); c.beginPath(); c.ellipse(330, -20, 64, 6, 0, 0, 7); c.fill();
    P.glow(c, 330, -60, 600, "#ffb35a", .3 * fl);
    P.shaft(c, 330, -20, 130, 330, 400, 520, "#ffc890", .13 * fl);
    // a streak of a raindrop running down the inside of our sight
    P.glow(c, -300, 160, 300, "#ffb35a", .06 * fl);
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
      c.fillStyle = "rgba(4,2,4,.55)"; c.fillRect(-200, 120, 460, 220);
      for (let i = 0; i < 34; i++) {
        const kx = px - 56 + R() * 112, ky = py - 146 - R() * 40 * (1 - Math.abs(kx - px) / 70), kr = 9 + R() * 6;
        const g = c.createRadialGradient(kx - kr * .3, ky - kr * .4, 1, kx, ky, kr);
        g.addColorStop(0, "#fffbea"); g.addColorStop(.7, mix("#f8e8b8", "#e8b860", R())); g.addColorStop(1, "#a87a3a");
        c.fillStyle = g; c.beginPath(); c.arc(kx, ky, kr, 0, 7); c.fill();
      }
      c.fillStyle = P.vgrad(c, 0, py - 200, 0, py, [[0, "rgba(6,3,5,.15)"], [1, "rgba(6,3,5,.6)"]]); c.fillRect(px - 70, py - 200, 140, 200);
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
      m.candles = Array.from({ length: 24 }, () => ({ x: lerp(-520, 520, R()), y: lerp(200, 470, R()), w: lerp(16, 26, R()), h: lerp(30, 110, R()) })).sort((a, b) => a.y - b.y);
      m.petals = Array.from({ length: 80 }, () => ({ x: lerp(-620, 620, R()), y: lerp(170, 560, R()), r: R() * 6.28, s: lerp(.9, 1.6, R()) }));
    }
    room(x, "#170c0c", "#e9e0d2", 160, 0, 300, .1, (L) => {
      const { c } = L;
      // the white carpet, deep pile, catching the candlelight
      L.full(); const fy = L.sy(160);
      c.fillStyle = P.vgrad(c, 0, fy, 0, H, [[0, "#3a2c26"], [.4, "#6a5446"], [1, "#2a1e18"]]); c.fillRect(0, fy, W, H - fy);
      P.mottle(c, 0, fy, W, H - fy, 51, 60, ["#f4e6d6", "#1a100c"], .12, L.S * .01, L.S * .05);
      L.stage();
      // the balcony door: night, string lights, the railing
      c.fillStyle = P.vgrad(c, 0, -460, 0, 160, [[0, "#05050d"], [1, "#1a1222"]]); c.fillRect(-380, -460, 420, 620);
      const R = rng(4);
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(230,236,255,${.2 + R() * .5})`; c.fillRect(-380 + R() * 420, -460 + R() * 300, 1.6, 1.6); }
      c.fillStyle = "#050304"; c.fillRect(-380, 40, 420, 10); for (let i = 0; i < 12; i++) c.fillRect(-372 + i * 36, 50, 5, 110);
      windowFrame(c, -380, -460, 420, 620, "#0a0606", 0);
      c.fillStyle = "#0a0606"; c.fillRect(-176, -460, 10, 620);
      // sheer curtain beside it
      for (let k = 0; k < 6; k++) { const fx = 48 + k * 18, g = c.createLinearGradient(fx, 0, fx + 18, 0); g.addColorStop(0, "rgba(255,220,190,.03)"); g.addColorStop(.5, "rgba(255,220,190,.12)"); g.addColorStop(1, "rgba(255,220,190,.03)"); c.fillStyle = g; c.fillRect(fx, -480, 18, 640); }
      // the table: flowers, dinner
      c.fillStyle = "#1a100c"; c.fillRect(150, 8, 14, 160); c.fillRect(456, 8, 14, 160);
      c.fillStyle = P.vgrad(c, 0, -14, 0, 10, [[0, "#f2ebe0"], [1, "#b8ac9c"]]); c.fillRect(124, -14, 372, 26);
      c.fillStyle = "rgba(240,232,220,.85)"; c.beginPath(); c.moveTo(124, 12); c.lineTo(496, 12); c.lineTo(500, 80); c.quadraticCurveTo(310, 96, 120, 80); c.fill();
      // vase of roses
      c.fillStyle = "rgba(220,230,240,.22)"; c.beginPath(); c.moveTo(252, -14); c.bezierCurveTo(236, -60, 236, -120, 248, -150); c.lineTo(282, -150); c.bezierCurveTo(294, -120, 294, -60, 278, -14); c.fill();
      P.spec(c, 274, -140, 280, -30, 2.5, .5);
      for (let i = 0; i < 11; i++) {
        const fx = 265 + (R() - .5) * 150, fyy = -180 - R() * 120;
        c.strokeStyle = "#1e3a16"; c.lineWidth = 3; c.beginPath(); c.moveTo(265, -140); c.quadraticCurveTo((265 + fx) / 2 + 10, (fyy - 140) / 2, fx, fyy); c.stroke();
        c.fillStyle = "#1a3012"; c.beginPath(); c.ellipse((265 + fx) / 2, (fyy - 140) / 2 + 10, 12, 5, R() * 3, 0, 7); c.fill();
      }
      const R2 = rng(8);
      for (let i = 0; i < 11; i++) {
        const fx = 265 + (R2() - .5) * 150, fyy = -180 - R2() * 120, white = i % 4 === 0;
        const g = c.createRadialGradient(fx - 4, fyy - 5, 1, fx, fyy, 18);
        g.addColorStop(0, white ? "#fff8ee" : "#d83a4a"); g.addColorStop(.7, white ? "#e8dccb" : "#8a1424"); g.addColorStop(1, white ? "#a89880" : "#3a0610");
        c.fillStyle = g; c.beginPath(); c.arc(fx, fyy, 17, 0, 7); c.fill();
        c.strokeStyle = white ? "rgba(120,100,80,.5)" : "rgba(40,0,6,.6)"; c.lineWidth = 1.5;
        c.beginPath(); c.arc(fx, fyy, 10, .5, 4.8); c.stroke(); c.beginPath(); c.arc(fx + 1, fyy - 1, 5, 2, 6.5); c.stroke();
      }
      // dinner: pasta, a little basil, two wine glasses
      P.shadow(c, 400, -16, 80, 12, .5);
      c.fillStyle = "#f4ede2"; c.beginPath(); c.ellipse(400, -22, 66, 16, 0, 0, 7); c.fill();
      c.fillStyle = "#e8b850"; c.beginPath(); c.ellipse(400, -28, 46, 11, 0, 0, 7); c.fill();
      c.strokeStyle = "#c8902a"; c.lineWidth = 2; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(384 + i * 5, -30, 10, 0, 3); c.stroke(); }
      c.fillStyle = "#b0281a"; c.beginPath(); c.arc(410, -32, 7, 0, 7); c.fill(); c.fillStyle = "#2a6a1a"; c.beginPath(); c.ellipse(394, -36, 6, 3, .4, 0, 7); c.fill();
      for (const gx of [170, 470]) {
        c.strokeStyle = "rgba(255,240,220,.5)"; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(gx - 16, -120); c.quadraticCurveTo(gx - 18, -80, gx, -72); c.quadraticCurveTo(gx + 18, -80, gx + 16, -120); c.stroke();
        c.fillStyle = "rgba(120,10,24,.85)"; c.beginPath(); c.moveTo(gx - 15, -100); c.quadraticCurveTo(gx - 16, -80, gx, -75); c.quadraticCurveTo(gx + 16, -80, gx + 15, -100); c.fill();
        c.beginPath(); c.moveTo(gx, -72); c.lineTo(gx, -14); c.stroke(); c.beginPath(); c.ellipse(gx, -14, 12, 3, 0, 0, 7); c.stroke();
        P.spec(c, gx + 9, -116, gx + 10, -96, 1.5, .6);
      }
      // petals scattered on the carpet
      for (const p of m.petals) { P.shadow(c, p.x + 2, p.y + 4, 12 * p.s, 4 * p.s, .35); P.petal(c, p.x, p.y, p.r, p.s, "#9a1a2c"); }
    });
    x.stage();
    // string lights outside on the balcony
    c.save(); c.beginPath(); c.rect(-380, -460, 420, 620); c.clip();
    P.stringLights(c, -400, -330, 60, -300, 50, 11, t);
    P.stringLights(c, -400, -180, 60, -200, 40, 10, t + 3);
    c.restore();
    // candles everywhere on the carpet, each with its pool of light
    for (const k of m.candles) { sheen(c, k.x, k.y + 4, k.w * 2.4, k.w * .9, "#ffb35a", .25); P.candle(c, k.x, k.y, k.w, k.h, t, k.x, { glow: .7 }); }
    P.glow(c, 0, 320, 700, "#ffb35a", .08 + .03 * noise(t));
  };

  /* 14. The ice storm */
  S.icestorm = (x) => {
    const { c, W, H, t, m } = x;
    const WX = -380, WY = -460, WW = 760, WH = 580;
    if (!m.i) { m.i = 1; m.snow = P.snowSet(3, 220); }
    // outside: a frozen night, branches cased in ice
    P.layer(x, "out", (L) => {
      const { c } = L;
      L.stage();
      c.fillStyle = P.vgrad(c, 0, WY, 0, WY + WH, [[0, "#14223a"], [.7, "#3a5272"], [1, "#5a7290"]]); c.fillRect(WX, WY, WW, WH);
      // a street lamp glowing through the storm
      P.glow(c, 230, -180, 260, "#ffcf9a", .35);
      c.fillStyle = "#0e1420"; c.fillRect(226, -180, 8, 320);
      // rooftops across the street under snow
      c.fillStyle = "#1a2232"; c.beginPath(); c.moveTo(WX, 60); c.lineTo(-200, -10); c.lineTo(-40, 60); c.lineTo(80, 20); c.lineTo(WX + WW, 50); c.lineTo(WX + WW, WY + WH); c.lineTo(WX, WY + WH); c.fill();
      c.strokeStyle = "rgba(230,240,255,.28)"; c.lineWidth = 5; c.beginPath(); c.moveTo(WX, 58); c.lineTo(-200, -12); c.lineTo(-40, 58); c.lineTo(80, 18); c.lineTo(WX + WW, 48); c.stroke();
      c.fillStyle = "rgba(255,200,130,.5)"; c.fillRect(-160, 40, 16, 20); c.fillRect(260, 70, 16, 20);
      // branches, each wrapped in glittering ice
      const R = rng(9);
      const branch = (x0, y0, ang, len, w, d) => {
        const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
        c.strokeStyle = "#0a0e18"; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        c.strokeStyle = "rgba(220,235,255,.55)"; c.lineWidth = Math.max(1, w * .3); c.beginPath(); c.moveTo(x0, y0 - w * .4); c.lineTo(x1, y1 - w * .4); c.stroke();
        if (d > 0) for (let k = 0; k < 2; k++) branch(x1, y1, ang + (R() - .5) * 1.4, len * lerp(.55, .75, R()), w * .65, d - 1);
        else { c.fillStyle = "rgba(230,240,255,.8)"; c.beginPath(); c.arc(x1, y1 + 3, 2, 0, 7); c.fill(); }
      };
      branch(WX + WW + 40, WY + 60, Math.PI + .25, 220, 18, 4);
      branch(WX - 30, WY + 30, -.15, 200, 14, 4);
      // frost creeping in from the corners of the glass: a soft bloom, then fine feathers
      for (const [fx, fy] of [[WX, WY], [WX + WW, WY], [WX, WY + WH], [WX + WW, WY + WH]]) {
        const g = c.createRadialGradient(fx, fy, 0, fx, fy, 200); g.addColorStop(0, "rgba(225,235,250,.45)"); g.addColorStop(1, "rgba(225,235,250,0)");
        c.fillStyle = g; c.fillRect(fx - 200, fy - 200, 400, 400);
      }
      c.strokeStyle = "rgba(235,242,255,.22)"; c.lineWidth = 1;
      const fern = (x0, y0, a, l, d) => { const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); if (d > 0) { fern(x0 + (x1 - x0) * .5, y0 + (y1 - y0) * .5, a + .7, l * .45, d - 1); fern(x0 + (x1 - x0) * .5, y0 + (y1 - y0) * .5, a - .7, l * .45, d - 1); fern(x1, y1, a + (R() - .5) * .5, l * .7, d - 1); } };
      for (let i = 0; i < 6; i++) { fern(WX, WY + R() * 120, R() * .9, 70, 3); fern(WX + WW, WY + WH - R() * 120, Math.PI + R() * .9, 70, 3); }
    });
    // the storm, live
    x.stage();
    c.save(); c.beginPath(); c.rect(WX, WY, WW, WH); c.clip();
    x.full(); c.translate(W * .1, 0); c.rotate(-.25); P.snow(c, m.snow, W * 1.2, H, t * 1.4, .85); c.setTransform(1, 0, 0, 1, 0, 0);
    c.restore();
    room(x, "#0e1018", "#08080c", 170, 0, 140, .22, (L) => {
      const { c } = L;
      c.clearRect(WX, WY, WW, WH);
      windowFrame(c, WX, WY, WW, WH, "#06070a", 1, "rgba(255,190,140,.12)");
      c.fillStyle = P.vgrad(c, 0, 120, 0, 160, [[0, "#3a2a22"], [1, "#14100e"]]); c.fillRect(-460, 120, 920, 40);
      c.fillStyle = "rgba(255,210,160,.3)"; c.fillRect(-460, 120, 920, 2);
      // the blanket we hid under, heavy wool with a fringe
      c.fillStyle = P.vgrad(c, 0, 260, 0, 620, [[0, "#7a3a3a"], [.5, "#4a2022"], [1, "#1a0c0e"]]);
      c.beginPath(); c.moveTo(-1400, 330); c.bezierCurveTo(-300, 250, -100, 370, 100, 300); c.bezierCurveTo(300, 240, 450, 330, 1400, 300); c.lineTo(1400, 1600); c.lineTo(-1400, 1600); c.fill();
      const R = rng(33);
      for (let i = 0; i < 10; i++) { const fx = lerp(-700, 700, R()), g = c.createLinearGradient(fx - 50, 0, fx + 50, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.5, "rgba(10,2,4,.3)"); g.addColorStop(.7, "rgba(255,180,150,.07)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(fx - 10, 300); c.lineTo(fx + 10, 300); c.lineTo(fx + 60 + R() * 60, 900); c.lineTo(fx - 60, 900); c.fill(); }
      c.strokeStyle = "rgba(0,0,0,.08)"; c.lineWidth = 2; for (let i = 0; i < 18; i++) { c.beginPath(); c.moveTo(-1400, 340 + i * 26); c.bezierCurveTo(-300, 270 + i * 26, -100, 390 + i * 26, 100, 320 + i * 26); c.bezierCurveTo(300, 260 + i * 26, 450, 350 + i * 26, 1400, 320 + i * 26); c.stroke(); }
      c.strokeStyle = "rgba(255,190,140,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-1400, 330); c.bezierCurveTo(-300, 250, -100, 370, 100, 300); c.bezierCurveTo(300, 240, 450, 330, 1400, 300); c.stroke();
      // two mugs in the folds
      for (const [mx, my] of [[-200, 330], [-120, 346]]) { P.shadow(c, mx, my + 4, 32, 7, .6); c.fillStyle = P.vgrad(c, mx - 20, 0, mx + 20, 0, [[0, "#5a5a6a"], [.4, "#e8e8f0"], [1, "#4a4a5a"]]); c.fillRect(mx - 20, my - 44, 40, 44); c.fillStyle = "#2a1408"; c.beginPath(); c.ellipse(mx, my - 44, 20, 4, 0, 0, 7); c.fill(); }
    });
    x.stage();
    // every candle we had, lined along the sill, and their reflections in the cold glass
    for (let i = 0; i < 7; i++) {
      const cx = -240 + i * 80, h = 60 + ((i * 37) % 70), w = 26 + (i % 2) * 6;
      sheen(c, cx, 104 - h - 30, w * .6, w * 1.6, "#ffb35a", .12);
      P.candle(c, cx, 122, w, h, t, i, { glow: 1.2 });
    }
    sheen(c, 0, 128, 360, 10, "#ffb35a", .3);
    for (const [mx, my] of [[-200, 330], [-120, 346]]) P.steam(c, mx, my - 54, t, .45, mx, .2);
  };

  /* 15. Our fort in the living room: sheets over two chairs, glowing from inside */
  S.fort = (x) => {
    const { c, W, H, t, m } = x;
    const FL = 300;                                            // floor line
    const CL = -380, CR = 380, CT = -170;                      // chair backs: x and top
    room(x, "#0e0b10", "#0a0709", FL, 0, 100, .06, (L) => {
      const { c } = L;
      // the dark living room around it: a window with the night, a sofa's arm, a lamp switched off
      c.fillStyle = P.vgrad(c, 0, -620, 0, -200, [[0, "#060814"], [1, "#121a30"]]); c.fillRect(-760, -620, 300, 400);
      const R = rng(7); for (let i = 0; i < 24; i++) { c.fillStyle = `rgba(230,236,255,${.2 + R() * .5})`; c.fillRect(-760 + R() * 300, -620 + R() * 300, 1.6, 1.6); }
      windowFrame(c, -760, -620, 300, 400, "#07060a", 1, "rgba(150,170,230,.08)");
      c.fillStyle = "#08060a"; c.beginPath(); c.roundRect(560, 20, 400, 300, 40); c.fill();
      c.fillStyle = "rgba(255,180,120,.06)"; c.fillRect(570, 22, 380, 3);
      c.fillStyle = "#07060a"; c.fillRect(-640, -60, 8, 360); c.beginPath(); c.moveTo(-690, -60); c.lineTo(-582, -60); c.lineTo(-600, -150); c.lineTo(-672, -150); c.fill();
      // a rug under the fort
      c.fillStyle = P.vgrad(c, 0, FL, 0, FL + 300, [[0, "#3a1e18"], [1, "#140a08"]]);
      c.beginPath(); c.moveTo(-700, FL + 10); c.lineTo(700, FL + 10); c.lineTo(900, FL + 400); c.lineTo(-900, FL + 400); c.fill();
      c.strokeStyle = "rgba(255,190,140,.08)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-660, FL + 30); c.lineTo(660, FL + 30); c.stroke();
      // the chairs: real dining chairs, backs to the fort
      const chair = (cx, sd) => {
        c.fillStyle = "#0a0607"; c.strokeStyle = "#0a0607"; c.lineCap = "round";
        c.lineWidth = 16; c.beginPath(); c.moveTo(cx - 70, CT); c.lineTo(cx - 64, FL); c.moveTo(cx + 70, CT); c.lineTo(cx + 64, FL); c.stroke();
        c.beginPath(); c.roundRect(cx - 80, CT - 14, 160, 30, 12); c.fill();
        c.lineWidth = 7; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(cx + k * 34, CT + 10); c.lineTo(cx + k * 30, 60); c.stroke(); }
        c.fillRect(cx - 74, 56, 148, 22);
        c.lineWidth = 12; c.beginPath(); c.moveTo(cx + sd * 66, 70); c.lineTo(cx + sd * 120, FL + 10); c.stroke();
        c.fillStyle = "rgba(255,180,120,.12)"; c.fillRect(cx - 78, CT - 14, 156, 3);
      };
      chair(CL, -1); chair(CR, 1);
    });
    x.stage();
    const glowA = .86 + .14 * noise(t * 1.1);
    // the sheet: draped over both chair backs, sagging between, falling in folds to the floor
    const sheetPath = () => {
      c.beginPath(); c.moveTo(CL - 110, FL + 20);
      c.bezierCurveTo(CL - 120, 100, CL - 96, CT - 10, CL - 60, CT - 26);
      c.bezierCurveTo(CL + 80, CT + 150, CR - 80, CT + 150, CR + 60, CT - 26);
      c.bezierCurveTo(CR + 96, CT - 10, CR + 120, 100, CR + 110, FL + 20);
      c.bezierCurveTo(CR, FL + 40, CL, FL + 40, CL - 110, FL + 20); c.closePath();
    };
    const g = c.createRadialGradient(0, 160, 30, 0, 100, 560);
    g.addColorStop(0, rgba("#ffe6b8", glowA)); g.addColorStop(.45, rgba("#e8a868", .95 * glowA)); g.addColorStop(1, "#4a2a18");
    c.fillStyle = g; sheetPath(); c.fill();
    c.save(); sheetPath(); c.clip();
    // the chair backs showing through the sheet as soft shadows
    c.fillStyle = "rgba(60,30,14,.25)"; for (const cx of [CL, CR]) { c.fillRect(cx - 74, CT, 12, 400); c.fillRect(cx + 62, CT, 12, 400); }
    // folds: catenary creases across the top, long falls down the sides
    for (let i = 0; i < 6; i++) {
      const sag = 40 + i * 30;
      c.strokeStyle = `rgba(120,60,28,${(.2 - i * .02).toFixed(3)})`; c.lineWidth = 8 - i;
      c.beginPath(); c.moveTo(CL - 40, CT - 10 + i * 16); c.bezierCurveTo(CL + 80, CT + 110 + sag, CR - 80, CT + 110 + sag, CR + 40, CT - 10 + i * 16); c.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const side = i < 7 ? -1 : 1, k = i % 7, fx = side * (300 + k * 26) + side * 20, w = 22;
      const fg = c.createLinearGradient(fx - w, 0, fx + w, 0);
      fg.addColorStop(0, "rgba(90,45,20,0)"); fg.addColorStop(.45, "rgba(90,45,20,.35)"); fg.addColorStop(.6, "rgba(255,230,190,.18)"); fg.addColorStop(1, "rgba(90,45,20,0)");
      c.fillStyle = fg; c.beginPath(); c.moveTo(fx - side * 30 - 4, CT); c.lineTo(fx - side * 30 + 4, CT); c.lineTo(fx + w, FL + 40); c.lineTo(fx - w, FL + 40); c.fill();
    }
    // a soft hem shadow at the bottom
    c.fillStyle = P.vgrad(c, 0, FL - 60, 0, FL + 40, [[0, "rgba(40,20,10,0)"], [1, "rgba(40,20,10,.55)"]]); c.fillRect(-700, FL - 60, 1400, 100);
    c.restore();
    // the chair tops poking up through the sheet, the cloth pulled tight over them
    for (const cx of [CL, CR]) {
      c.fillStyle = "#0a0607"; c.beginPath(); c.roundRect(cx - 80, CT - 64, 160, 26, 10); c.fill();
      c.fillRect(cx - 78, CT - 40, 14, 30); c.fillRect(cx + 64, CT - 40, 14, 30);
      c.fillStyle = "rgba(255,190,130,.25)"; c.fillRect(cx - 76, CT - 64, 152, 3);
    }
    // the opening: two flaps pulled back, the warm inside
    const op = () => { c.beginPath(); c.moveTo(-170, FL + 26); c.bezierCurveTo(-150, 120, -60, 10, 0, 0); c.bezierCurveTo(60, 10, 150, 120, 170, FL + 26); c.closePath(); };
    c.fillStyle = P.vgrad(c, 0, 0, 0, FL, [[0, "#5a2e14"], [1, "#2a1408"]]); op(); c.fill();
    c.save(); op(); c.clip();
    // inside: the mattress, pillows, a blanket, the lights strung along the ceiling
    c.fillStyle = P.vgrad(c, 0, 200, 0, FL + 30, [[0, "#f4e2c4"], [1, "#b89870"]]); c.beginPath(); c.moveTo(-170, FL + 30); c.lineTo(-120, 190); c.lineTo(120, 190); c.lineTo(170, FL + 30); c.fill();
    pillow(c, -54, 200, 100, 46, -.08, .3, 3, "#ffe2b8"); pillow(c, 56, 202, 100, 46, .06, .3, 4, "#ffd8a8");
    c.fillStyle = P.vgrad(c, 0, 230, 0, FL + 30, [[0, "#b8483a"], [1, "#5a1a14"]]); c.beginPath(); c.moveTo(-170, FL + 30); c.bezierCurveTo(-100, 240, 60, 270, 170, 250); c.lineTo(170, FL + 30); c.fill();
    c.strokeStyle = "rgba(255,200,160,.25)"; c.lineWidth = 2; c.beginPath(); c.moveTo(-170, FL + 30); c.bezierCurveTo(-100, 240, 60, 270, 170, 250); c.stroke();
    c.restore();
    P.stringLights(c, -150, 70, 150, 70, 26, 9, t, "#ffe0a0", 3);
    // flaps tied back, catching the light on their inner edges
    for (const sd of [-1, 1]) {
      c.fillStyle = rgba("#f0c088", .9 * glowA);
      c.beginPath(); c.moveTo(sd * 10, 0); c.bezierCurveTo(sd * 70, 20, sd * 170, 100, sd * 200, FL + 26); c.lineTo(sd * 172, FL + 26); c.bezierCurveTo(sd * 150, 120, sd * 60, 10, sd * 10, 0); c.fill();
      c.strokeStyle = "rgba(120,60,28,.5)"; c.lineWidth = 3; c.beginPath(); c.moveTo(sd * 186, 160); c.lineTo(sd * 140, 176); c.stroke();
    }
    // the fort's glow on the room and the rug, and out of the opening
    P.glow(c, 0, 160, 700, "#ffb35a", .26 * glowA);
    P.glow(c, 0, FL + 60, 360, "#ffb35a", .2 * glowA);
    P.shaft(c, 0, FL - 40, 300, 0, 900, 900, "#ffc890", .1 * glowA);
    // two mugs by the entrance, steaming
    for (const [mx, my] of [[-230, FL + 70], [-160, FL + 90]]) {
      P.shadow(c, mx, my + 4, 30, 6, .6);
      c.fillStyle = P.vgrad(c, mx - 18, 0, mx + 18, 0, [[0, "#6a3a2a"], [.4, "#e8c8a8"], [1, "#5a2a1a"]]); c.fillRect(mx - 18, my - 40, 36, 40);
      c.strokeStyle = "#a87a5a"; c.lineWidth = 5; c.beginPath(); c.arc(mx + 20, my - 22, 10, -1.3, 1.3); c.stroke();
      c.fillStyle = "#2a1408"; c.beginPath(); c.ellipse(mx, my - 40, 18, 4, 0, 0, 7); c.fill();
      P.steam(c, mx, my - 50, t, .45, mx, .18);
    }
  };

  /* 16. The jacket: brown leather, hanging open as if someone is holding it out */
  S.jacket = (x) => {
    const { c, t } = x;
    const HY = -470;                                           // the hook
    room(x, "#1a110c", "#0c0806", 470, -500, -380, .1, (L) => {
      const { c } = L;
      // the window's light laid on the wall, from the left
      c.save(); c.globalCompositeOperation = "lighter";
      for (const [x0, w] of [[-700, 150], [-520, 150]]) { c.fillStyle = "rgba(255,190,130,.05)"; c.beginPath(); c.moveTo(x0, -700); c.lineTo(x0 + w, -700); c.lineTo(x0 + w + 420, 470); c.lineTo(x0 + 420, 470); c.fill(); }
      c.restore();
      // the hook on the wall
      c.fillStyle = "#2a1a10"; c.beginPath(); c.roundRect(-30, HY - 40, 60, 36, 6); c.fill();
    });
    x.stage();
    const sway = 0;
    c.save(); c.translate(0, HY); c.rotate(sway);
    // shadow of the jacket on the wall
    P.shadow(c, 60, 420, 330, 380, .45);
    // wooden hanger
    c.strokeStyle = "#c9a24a"; c.lineWidth = 5; c.beginPath(); c.arc(0, 18, 16, 3.5, 6.5); c.stroke(); c.beginPath(); c.moveTo(0, 6); c.lineTo(0, 34); c.stroke();
    c.fillStyle = P.vgrad(c, 0, 30, 0, 60, [[0, "#c88a50"], [1, "#6a3a18"]]);
    c.beginPath(); c.moveTo(-210, 128); c.quadraticCurveTo(0, 6, 210, 128); c.lineTo(200, 142); c.quadraticCurveTo(0, 30, -200, 142); c.fill();
    c.restore();
    // the leather is painted once and blitted (it is heavy with texture)
    P.layer(x, "jacket", (L) => {
      const { c } = L;
      L.stage(); c.translate(0, HY);
      const leather = (x0, x1) => P.vgrad(c, x0, 0, x1, 0, [[0, "#170a05"], [.25, "#3a1c0c"], [.5, "#55301a"], [.75, "#3a1c0c"], [1, "#120804"]]);
      const sheenStroke = (pts, w, a) => {   // a soft highlight lying along a fold of leather
        c.save(); c.globalCompositeOperation = "lighter"; c.lineCap = "round";
        for (const [k, al] of [[4, .18], [2, .35], [.7, .55]]) {
          c.strokeStyle = `rgba(255,190,130,${(a * al).toFixed(3)})`; c.lineWidth = w * k;
          c.beginPath(); c.moveTo(pts[0], pts[1]); c.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); c.stroke();
        }
        c.restore();
      };
      const crease = (x0, y0, x1, y1, bend) => {
        c.strokeStyle = "rgba(10,4,2,.55)"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + bend, x1, y1); c.stroke();
        c.strokeStyle = "rgba(255,180,120,.16)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, y0 + 3); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + bend + 3, x1, y1 + 3); c.stroke();
      };
      const stitch = (x0, y0, x1, y1, cx, cy) => { c.save(); c.setLineDash([5, 5]); c.strokeStyle = "rgba(220,170,110,.45)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke(); c.restore(); };
      // sleeves, hanging behind the body, a little forward of it
      for (const sd of [-1, 1]) {
        c.fillStyle = leather(sd * 330, sd * 150);
        c.beginPath(); c.moveTo(sd * 196, 132); c.bezierCurveTo(sd * 290, 170, sd * 318, 420, sd * 304, 700); c.lineTo(sd * 214, 712);
        c.bezierCurveTo(sd * 210, 500, sd * 196, 300, sd * 168, 220); c.closePath(); c.fill();
        // cuff band and stitching
        c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.moveTo(sd * 306, 664); c.lineTo(sd * 214, 676); c.lineTo(sd * 214, 712); c.lineTo(sd * 304, 700); c.fill();
        stitch(sd * 304, 660, sd * 214, 672, sd * 260, 668);
        // elbow creases
        for (let k = 0; k < 4; k++) crease(sd * (230 + k * 8), 420 + k * 22, sd * (296 - k * 2), 410 + k * 24, 10);
        sheenStroke([sd * 262, 180, sd * 290, 300, sd * 282, 500, sd * 266, 680], 6, sd < 0 ? .3 : .14);
      }
      // the lining, seen because the fronts hang open: dark satin with a quilted diamond
      c.fillStyle = P.vgrad(c, -120, 0, 120, 0, [[0, "#1a0a0a"], [.5, "#3a1a18"], [1, "#120606"]]);
      c.beginPath(); c.moveTo(-70, 60); c.lineTo(0, 140); c.lineTo(70, 60); c.lineTo(150, 700); c.lineTo(-150, 700); c.fill();
      c.strokeStyle = "rgba(200,120,100,.12)"; c.lineWidth = 1.5;
      for (let k = -8; k < 10; k++) { c.beginPath(); c.moveTo(-150 + k * 34, 150); c.lineTo(-150 + k * 34 + 300, 700); c.moveTo(150 - k * 34, 150); c.lineTo(150 - k * 34 - 300, 700); c.stroke(); }
      P.glow(c, 0, 360, 220, "#ff9a6a", .06);
      // the two front panels, swung open
      for (const sd of [-1, 1]) {
        c.fillStyle = leather(sd * 220, sd * 30);
        c.beginPath(); c.moveTo(sd * 60, 40); c.lineTo(sd * 200, 92); c.bezierCurveTo(sd * 214, 300, sd * 214, 500, sd * 206, 690);
        c.bezierCurveTo(sd * 170, 704, sd * 120, 708, sd * 82, 700); c.bezierCurveTo(sd * 96, 520, sd * 90, 320, sd * 30, 210); c.lineTo(sd * 20, 140); c.closePath(); c.fill();
        // the leather's grain: tiny speckles and a waxy mottle
        c.save(); c.clip();
        const R = rng(sd > 0 ? 3 : 4);
        for (let i = 0; i < 260; i++) { c.fillStyle = R() > .5 ? "rgba(0,0,0,.18)" : "rgba(255,190,140,.05)"; c.fillRect(sd * lerp(20, 214, R()), lerp(40, 708, R()), 2, 2); }
        P.mottle(c, sd > 0 ? 20 : -214, 40, 194, 670, sd > 0 ? 7 : 8, 16, ["#000000", "#8a5030"], .25, 20, 70);
        // the hem band
        c.fillStyle = "rgba(0,0,0,.32)"; c.fillRect(sd > 0 ? 70 : -220, 640, 150, 70);
        c.restore();
        // seams, stitching, a welt pocket and its flap
        stitch(sd * 206, 640, sd * 86, 646, sd * 146, 648);
        stitch(sd * 198, 250, sd * 56, 260, sd * 130, 250);
        c.fillStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.moveTo(sd * 110, 430); c.lineTo(sd * 190, 420); c.lineTo(sd * 192, 438); c.lineTo(sd * 112, 448); c.fill();
        c.fillStyle = leather(sd * 200, sd * 100); c.beginPath(); c.moveTo(sd * 104, 400); c.lineTo(sd * 196, 392); c.lineTo(sd * 196, 424); c.lineTo(sd * 104, 432); c.fill();
        stitch(sd * 106, 426, sd * 194, 418, sd * 150, 424);
        // a snap on the flap, polished brass
        const sx0 = sd * 150, sy0 = 412;
        c.fillStyle = P.vgrad(c, sx0 - 7, sy0 - 7, sx0 + 7, sy0 + 7, [[0, "#fff0c0"], [.5, "#b8904a"], [1, "#4a3010"]]); c.beginPath(); c.arc(sx0, sy0, 7, 0, 7); c.fill();
        // the long highlights the light lays along the curve of each panel
        sheenStroke([sd * 180, 110, sd * 196, 300, sd * 192, 480, sd * 180, 680], 7, sd < 0 ? .34 : .12);
        sheenStroke([sd * 110, 260, sd * 128, 380, sd * 130, 520, sd * 120, 690], 4, sd < 0 ? .16 : .06);
        // creases where it hangs from the shoulder
        crease(sd * 70, 120, sd * 170, 140, -10); crease(sd * 90, 160, sd * 190, 190, -8);
        // the zip along the open edge: teeth catching the light
        const zx = (y) => sd * (lerp(36, 86, (y - 220) / 480));
        for (let y = 230; y < 690; y += 7) { c.fillStyle = (y / 7) % 2 < 1 ? "#d8b878" : "#5a4020"; c.fillRect(zx(y) - 2, y, 4, 4); }
      }
      // the big collar, folded over
      for (const sd of [-1, 1]) {
        c.fillStyle = leather(sd * 140, sd * 10);
        c.beginPath(); c.moveTo(sd * 8, 20); c.bezierCurveTo(sd * 60, 0, sd * 120, 20, sd * 150, 64); c.lineTo(sd * 120, 120); c.lineTo(sd * 30, 200); c.lineTo(sd * 20, 120); c.closePath(); c.fill();
        c.strokeStyle = "rgba(255,190,130,.3)"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(sd * 150, 64); c.lineTo(sd * 120, 120); c.lineTo(sd * 30, 200); c.stroke();
        stitch(sd * 136, 70, sd * 34, 182, sd * 100, 120);
      }
      // the zip pull hanging, a little bright
      c.fillStyle = P.vgrad(c, -46, 0, -34, 0, [[0, "#fff0c0"], [1, "#6a4a20"]]); c.beginPath(); c.roundRect(-46, 690, 12, 26, 3); c.fill();
      // a small leather patch at the back of the waistband
      c.fillStyle = "#8a5a30"; c.fillRect(-150, 668, 40, 22); c.strokeStyle = "rgba(0,0,0,.3)"; c.lineWidth = 1; c.strokeRect(-148, 670, 36, 18);
    });
    // a slow sheen sliding across the leather, and the window light breathing
    x.stage();
    const sh = ((t * .07) % 1.6) - .3;
    c.save(); c.globalCompositeOperation = "lighter";
    const s = c.createLinearGradient(-320 + sh * 640, 0, -200 + sh * 640, 0);
    s.addColorStop(0, "rgba(255,200,150,0)"); s.addColorStop(.5, "rgba(255,200,150,.07)"); s.addColorStop(1, "rgba(255,200,150,0)");
    c.fillStyle = s; c.fillRect(-340, HY + 20, 680, 720);
    c.restore();
    P.glow(c, -420, -200, 600, "#ffb070", .1 + .03 * noise(t * .4));
  };

  /* 17. Birthdays */
  S.cake = (x) => {
    const { c, t, m } = x;
    if (!m.i) { m.i = 1; m.bk = P.bokehSet(17, 36, [-1100, -560, 800, -60], [8, 30], ["#ffcf8a", "#ff8a6a", "#ffe6c0"]); }
    room(x, "#170d0c", "#0c0707", 60, 0, -60, .16, (L) => {
      const { c } = L;
      tableTop(c, 60, "#2a1410", "#0c0504", 31);
      // white tablecloth
      c.fillStyle = P.vgrad(c, 0, 70, 0, 600, [[0, "#e8dcd0"], [.4, "#a8988a"], [1, "#2a201a"]]); c.beginPath(); c.moveTo(-1400, 80); c.lineTo(1400, 80); c.lineTo(1400, 1600); c.lineTo(-1400, 1600); c.fill();
      c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(-1400, 80, 2800, 3);
      // two plates, forks
      for (const px of [-420, 420]) { P.shadow(c, px, 300, 140, 26, .5); c.fillStyle = P.vgrad(c, px - 130, 0, px + 130, 0, [[0, "#9a9088"], [.4, "#fbf8f2"], [1, "#9a9088"]]); c.beginPath(); c.ellipse(px, 290, 130, 34, 0, 0, 7); c.fill(); c.strokeStyle = "#c9a24a"; c.lineWidth = 2; c.beginPath(); c.ellipse(px, 290, 112, 28, 0, 0, 7); c.stroke(); }
      // the cake: chocolate, cream frosting dripping
      P.shadow(c, 0, 290, 280, 60, .6);
      c.fillStyle = P.vgrad(c, -240, 0, 240, 0, [[0, "#8a8278"], [.4, "#f4efe6"], [1, "#8a8278"]]); c.beginPath(); c.ellipse(0, 272, 240, 46, 0, 0, 7); c.fill();
      c.fillStyle = P.vgrad(c, -180, 0, 180, 0, [[0, "#3a1a0a"], [.4, "#7a3e1c"], [.6, "#8a4a24"], [1, "#2a1206"]]); c.fillRect(-180, 100, 360, 160);
      c.beginPath(); c.ellipse(0, 260, 180, 34, 0, 0, 7); c.fill();
      c.fillStyle = "rgba(255,220,180,.12)"; c.fillRect(-180, 176, 360, 6);
      c.fillStyle = P.vgrad(c, -180, 0, 180, 0, [[0, "#c8baa8"], [.4, "#fbf6ee"], [1, "#b8aa98"]]); c.beginPath(); c.ellipse(0, 100, 180, 34, 0, 0, 7); c.fill();
      for (let i = 0; i < 13; i++) { const dx = -168 + i * 28, h = 18 + ((i * 7) % 5) * 9; c.beginPath(); c.moveTo(dx - 12, 110); c.lineTo(dx - 12, 110 + h); c.arc(dx, 110 + h, 12, Math.PI, 0, true); c.lineTo(dx + 12, 110); c.fill(); }
      P.spec(c, -120, 90, -40, 76, 4, .4);
      // berries on top
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + .3; const bx = Math.cos(a) * 140, by = 100 + Math.sin(a) * 22; c.fillStyle = "#8a0a1a"; c.beginPath(); c.arc(bx, by - 4, 8, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(bx - 3, by - 9, 2, 2); }
      // two glasses of wine raised to each other
      for (const [gx, gy, tilt] of [[-300, 170, .08], [300, 176, -.08]]) {
        c.save(); c.translate(gx, gy); c.rotate(tilt);
        P.shadow(c, 0, 4, 40, 8, .5);
        c.fillStyle = "rgba(255,240,230,.08)"; c.beginPath(); c.moveTo(-38, -200); c.quadraticCurveTo(-44, -110, 0, -92); c.quadraticCurveTo(44, -110, 38, -200); c.fill();
        c.fillStyle = P.vgrad(c, -36, 0, 36, 0, [[0, "rgba(60,4,10,.95)"], [.6, "rgba(150,20,34,.9)"], [1, "rgba(50,4,8,.95)"]]); c.beginPath(); c.moveTo(-36, -152); c.quadraticCurveTo(-38, -110, 0, -96); c.quadraticCurveTo(38, -110, 36, -152); c.fill();
        c.strokeStyle = "rgba(255,240,220,.5)"; c.lineWidth = 2; c.beginPath(); c.moveTo(-38, -200); c.quadraticCurveTo(-44, -110, 0, -92); c.quadraticCurveTo(44, -110, 38, -200); c.stroke();
        c.beginPath(); c.ellipse(0, -200, 38, 6, 0, 0, 7); c.stroke();
        c.beginPath(); c.moveTo(0, -92); c.lineTo(0, 0); c.stroke(); c.beginPath(); c.ellipse(0, 0, 30, 6, 0, 0, 7); c.stroke();
        P.spec(c, 22, -190, 26, -140, 2.5, .7); P.spec(c, -26, -150, -22, -120, 1.5, .3);
        c.restore();
      }
    });
    x.stage();
    P.bokeh(c, m.bk, t, 8);
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; P.candle(c, Math.cos(a) * 110, 100 + Math.sin(a) * 18, 12, 70, t, i, { glow: .8, wax: ["#f4b6c8", "#b8e0d2", "#f8e3a0"][i % 3] }); }
    const f = .85 + .15 * noise(t * 2);
    sheen(c, 0, 100, 160, 26, "#ffcf8a", .2 * f);
    P.glow(c, -300, 40, 80, "#ff6a5a", .15 * f); P.glow(c, 300, 46, 80, "#ff6a5a", .15 * f);
  };

  /* 18. Paris Baguette: croissants in morning light */
  S.bakery = (x) => {
    const { c, W, H, t } = x;
    P.layer(x, "bg", (L) => {
      const { c } = L;
      L.full(); P.fillAll(c, W, H, [[0, "#2a1c12"], [.5, "#5a3e26"], [1, "#1c120a"]]);
      P.mottle(c, 0, 0, W, H, 61, 30, ["#8a6a4a", "#1a100a"], .2, L.S * .05, L.S * .2);
      L.stage();
      // the big window and the street beyond: pale sky, facades, an awning across the road
      c.fillStyle = P.vgrad(c, 0, -620, 0, 0, [[0, "#fbefd8"], [1, "#f0c890"]]); c.fillRect(-640, -620, 1280, 620);
      const R = rng(19);
      for (let i = 0; i < 9; i++) {
        const bx = -640 + i * 150, h = lerp(320, 520, R()), col = mix("#c8a080", "#a88468", R());
        c.fillStyle = rgba(col, .55); c.fillRect(bx, -h, 136, h);
        for (let r = 0; r < 6; r++) for (let k = 0; k < 3; k++) { c.fillStyle = "rgba(120,90,70,.35)"; c.fillRect(bx + 14 + k * 42, -h + 30 + r * 70, 22, 34); }
      }
      c.fillStyle = "rgba(60,90,70,.5)"; c.beginPath(); c.moveTo(-200, -150); c.lineTo(160, -150); c.lineTo(190, -110); c.lineTo(-230, -110); c.fill();
      // window frame and lettering in reverse on the glass
      windowFrame(c, -640, -620, 1280, 620, "#2a1a10", 0, "rgba(255,230,190,.2)");
      c.fillStyle = "#2a1a10"; c.fillRect(-220, -620, 14, 620); c.fillRect(210, -620, 14, 620);
      c.save(); c.translate(0, -470); c.scale(-1, 1); c.font = "italic 600 54px Cormorant, Georgia, serif"; c.textAlign = "center"; c.fillStyle = "rgba(200,150,60,.35)"; c.fillText("Boulangerie", 0, 0); c.restore();
      // marble table: veins and a soft reflection
      c.fillStyle = P.vgrad(c, 0, 20, 0, 620, [[0, "#f4efe8"], [.5, "#d8d0c6"], [1, "#8a8278"]]); c.fillRect(-1400, 20, 2800, 1600);
      c.strokeStyle = "rgba(120,110,100,.22)"; c.lineCap = "round";
      for (let i = 0; i < 9; i++) { c.lineWidth = lerp(1, 3, R()); const y0 = lerp(40, 500, R()); c.beginPath(); c.moveTo(-900, y0); c.bezierCurveTo(-300, y0 + lerp(-80, 80, R()), 0, y0 + lerp(-60, 60, R()), 900, y0 + lerp(-120, 120, R())); c.stroke(); }
      c.fillStyle = "rgba(255,255,255,.4)"; c.fillRect(-1400, 20, 2800, 3);
      // croissants: laminated crescents with ridges
      const croissant = (cx, cy, s, rot) => {
        c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(s, s);
        P.shadow(c, 0, 26, 140, 24, .45, "#3a2410");
        const RR = 110, CY = 110, th = (u) => 26 + 74 * Math.pow(Math.sin(Math.PI * u), .8);   // thickness along the crescent
        const pt = (u, k) => { const a = lerp(-1.15, 1.15, u), r = RR + k * th(u) / 2; return [Math.sin(a) * r, CY - Math.cos(a) * r]; };
        c.beginPath(); for (let i = 0; i <= 24; i++) c.lineTo(...pt(i / 24, 1)); for (let i = 24; i >= 0; i--) c.lineTo(...pt(i / 24, -1)); c.closePath();
        const g = c.createLinearGradient(0, -40, 0, 40); g.addColorStop(0, "#f8c870"); g.addColorStop(.5, "#c87a24"); g.addColorStop(1, "#6a3008");
        c.fillStyle = g; c.fill();
        // the rolled layers: dark seams and a glossy lip on each
        for (let k = 1; k < 7; k++) {
          const u = k / 7, [x0, y0] = pt(u - .03, -1), [x1, y1] = pt(u + .03, 1), [mx2, my2] = pt(u + .05, 0);
          c.strokeStyle = "rgba(90,36,6,.65)"; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx2, my2, x1, y1); c.stroke();
          c.strokeStyle = "rgba(255,236,190,.5)"; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 - 6, y0); c.quadraticCurveTo(mx2 - 7, my2, x1 - 6, y1); c.stroke();
        }
        P.spec(c, -60, -14, 40, -16, 4, .35, "#fff0c8");
        c.restore();
      };
      croissant(-160, 250, .9, -.08); croissant(170, 340, .8, .12);
      // flaky crumbs
      for (let i = 0; i < 50; i++) { c.fillStyle = mix("#e8b060", "#8a4a14", R()); c.fillRect(-320 + R() * 600, 290 + R() * 180, 3 + R() * 3, 2 + R() * 2); }
      // baguettes standing in a paper bag
      for (let i = 0; i < 3; i++) { c.save(); c.translate(330 + i * 44, 80); c.rotate(-.15 + i * .12); c.fillStyle = P.vgrad(c, -20, 0, 20, 0, [[0, "#7a3a10"], [.5, "#f0b060"], [1, "#6a2a08"]]); c.beginPath(); c.roundRect(-20, -230, 40, 270, 20); c.fill(); c.strokeStyle = "rgba(255,230,180,.6)"; c.lineWidth = 3; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-10, -200 + k * 40); c.lineTo(10, -186 + k * 40); c.stroke(); } c.restore(); }
      P.shadow(c, 370, 266, 150, 22, .45, "#3a2410");
      c.fillStyle = P.vgrad(c, 250, 0, 480, 0, [[0, "#b89a70"], [.4, "#e8d4b0"], [1, "#9a7c56"]]); c.beginPath(); c.moveTo(260, 40); c.lineTo(470, 40); c.lineTo(490, 262); c.lineTo(240, 262); c.fill();
      c.strokeStyle = "rgba(120,90,60,.4)"; c.lineWidth = 2; c.beginPath(); c.moveTo(262, 60); c.lineTo(468, 60); c.stroke();
      // café crème with a leaf in the foam
      P.shadow(c, -20, 168, 90, 18, .45, "#3a2410");
      c.fillStyle = P.vgrad(c, -90, 0, 50, 0, [[0, "#b8b0a8"], [.4, "#fffdf8"], [1, "#b0a8a0"]]); c.beginPath(); c.ellipse(-20, 160, 74, 18, 0, 0, 7); c.fill();
      c.fillStyle = P.vgrad(c, -68, 0, 28, 0, [[0, "#c8c0b8"], [.4, "#ffffff"], [1, "#b8b0a8"]]); c.beginPath(); c.moveTo(-68, 100); c.lineTo(-62, 148); c.quadraticCurveTo(-20, 160, 22, 148); c.lineTo(28, 100); c.fill();
      c.strokeStyle = "#e8e2da"; c.lineWidth = 6; c.beginPath(); c.arc(34, 122, 14, -1.3, 1.3); c.stroke();
      c.fillStyle = "#b07a4a"; c.beginPath(); c.ellipse(-20, 100, 48, 12, 0, 0, 7); c.fill();
      c.strokeStyle = "#f4e6d0"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-40, 100); c.quadraticCurveTo(-20, 90, 0, 100); c.quadraticCurveTo(-20, 110, -40, 100); c.moveTo(-40, 100); c.lineTo(4, 100); c.stroke();
      P.spec(c, -58, 108, -54, 140, 2.5, .6);
    });
    x.stage();
    // sunbeams through the window, slowly breathing, dust turning in them
    for (let i = 0; i < 4; i++) {
      const bx = -500 + i * 300 + Math.sin(t * .2 + i) * 10, a = .1 + .03 * Math.sin(t * .3 + i * 2);
      P.shaft(c, bx, -620, 110, bx + 330, 520, 300, "#fff0c8", a);
    }
    P.glow(c, 0, -300, 800, "#fff0c8", .1);
    P.steam(c, -20, 86, t, .8, 5, .3);
  };

  /* 19. That morning: her side of the bed, the phone */
  S.emptybed = (x) => {
    const { c, W, H, t } = x;
    const NS = 300;                                        // nightstand left edge
    P.layer(x, "bg", (L) => {
      const { c } = L;
      L.full();
      P.fillAll(c, W, H, [[0, "#070b16"], [.5, "#0d1424"], [1, "#04060c"]]);
      P.mottle(c, 0, 0, W, H, 8, 40, ["#2a3450", "#000000"], .25, L.S * .04, L.S * .2);
      L.stage(); c.translate(-130, 0);
      // the window with its blinds, a pale dawn behind
      const BX = -560, BY = -560, BW = 420, BH = 420;
      c.fillStyle = P.vgrad(c, 0, BY, 0, BY + BH, [[0, "#3a4a70"], [1, "#8a98b8"]]); c.fillRect(BX, BY, BW, BH);
      for (let i = 0; i < 22; i++) {
        const y = BY + i * (BH / 22);
        c.fillStyle = P.vgrad(c, 0, y, 0, y + 14, [[0, "#c8d2e8"], [1, "#6a7898"]]); c.fillRect(BX, y, BW, 13);
        c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(BX, y + 13, BW, 2);
      }
      c.fillStyle = "rgba(20,26,40,.6)"; c.fillRect(BX + BW * .3, BY, 2, BH); c.fillRect(BX + BW * .7, BY, 2, BH);
      windowFrame(c, BX, BY, BW, BH, "#0a0e18", 0, "rgba(160,190,240,.12)");
      // headboard, upholstered
      c.fillStyle = P.vgrad(c, 0, -170, 0, 60, [[0, "#1e2638"], [1, "#0c1018"]]);
      c.beginPath(); c.roundRect(-640, -170, 900, 260, [30, 30, 0, 0]); c.fill();
      for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) { const bx = -600 + i * 100 + (r % 2) * 50, by = -120 + r * 70; P.shadow(c, bx, by, 16, 10, .5); c.fillStyle = "rgba(160,180,220,.14)"; c.beginPath(); c.arc(bx - 2, by - 2, 3, 0, 7); c.fill(); }
      c.fillStyle = "rgba(160,190,240,.12)"; c.fillRect(-630, -168, 880, 3);
      // the mattress body and the duvet hanging over its side
      c.fillStyle = "#0a0d16"; c.fillRect(-680, 60, 960, 700);
      // pillows: mine slept on, hers untouched
      pillow(c, -400, 34, 300, 120, -.04, .55, 1);
      pillow(c, -60, 22, 310, 128, .03, 0, 2);
      // the duvet: rumpled and thrown back on my side, smooth and flat on hers
      const dg = c.createLinearGradient(-640, 0, 280, 0);
      dg.addColorStop(0, "#8a96b0"); dg.addColorStop(.5, "#b4bed4"); dg.addColorStop(1, "#7a86a0");
      c.fillStyle = dg;
      c.beginPath(); c.moveTo(-660, 160); c.bezierCurveTo(-560, 120, -420, 180, -300, 140); c.bezierCurveTo(-220, 112, -160, 110, -90, 116);
      c.lineTo(250, 112); c.quadraticCurveTo(286, 116, 290, 160); c.lineTo(300, 760); c.lineTo(-680, 760); c.closePath(); c.fill();
      // turned-back edge on my side
      c.fillStyle = "#dfe4ee"; c.beginPath(); c.moveTo(-660, 160); c.bezierCurveTo(-560, 120, -420, 180, -300, 140); c.bezierCurveTo(-330, 176, -480, 190, -660, 200); c.fill();
      c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.moveTo(-660, 200); c.bezierCurveTo(-480, 190, -330, 176, -300, 140); c.bezierCurveTo(-320, 200, -480, 220, -660, 230); c.fill();
      // soft folds
      const R = rng(19);
      for (let i = 0; i < 9; i++) {
        const fx = lerp(-640, -160, R()), fy = lerp(220, 460, R()), len = lerp(260, 460, R()), ang = lerp(-.12, .25, R());
        c.save(); c.translate(fx, fy); c.rotate(ang);
        const g = c.createLinearGradient(0, -16, 0, 16);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.45, "rgba(10,14,30,.2)"); g.addColorStop(.62, "rgba(230,236,255,.1)"); g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, len / 2, 26, 0, 0, 7); c.fill(); c.restore();
      }
      // her side: one long gentle fold, nothing more
      c.save(); c.translate(80, 300); c.rotate(.04);
      const g2 = c.createLinearGradient(0, -20, 0, 20); g2.addColorStop(0, "rgba(0,0,0,0)"); g2.addColorStop(.5, "rgba(10,14,30,.18)"); g2.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g2; c.beginPath(); c.ellipse(0, 0, 220, 20, 0, 0, 7); c.fill(); c.restore();
      // the bed falls into shadow towards us
      c.fillStyle = P.vgrad(c, 0, 200, 0, 700, [[0, "rgba(4,6,14,0)"], [1, "rgba(4,6,14,.8)"]]); c.fillRect(-700, 200, 1000, 560);
      // the rounded edge where the duvet falls over the side of the bed
      c.fillStyle = P.vgrad(c, 240, 0, 300, 0, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,10,.55)"]]); c.fillRect(240, 120, 60, 640);
      // dawn through the blinds: pale stripes across the bed
      c.save(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 9; i++) {
        const y0 = 140 + i * 46;
        c.fillStyle = "rgba(150,175,230,.07)";
        c.beginPath(); c.moveTo(-680, y0); c.lineTo(100, y0 - 160); c.lineTo(100, y0 - 140); c.lineTo(-680, y0 + 22); c.fill();
      }
      c.restore();
      // the nightstand, the clock, a glass of water
      c.fillStyle = P.vgrad(c, NS, 0, NS + 300, 0, [[0, "#151a26"], [1, "#0a0d14"]]); c.fillRect(NS, 60, 300, 700);
      c.fillStyle = "rgba(160,190,240,.16)"; c.fillRect(NS, 60, 300, 3);
      c.fillStyle = "rgba(0,0,0,.4)"; c.fillRect(NS + 20, 150, 260, 4);
      c.fillStyle = "#c9a24a"; c.fillRect(NS + 130, 110, 40, 6);
      P.shadow(c, NS + 210, 62, 70, 10, .6);
      c.fillStyle = "#06080c"; c.beginPath(); c.roundRect(NS + 150, -10, 124, 70, 10); c.fill();
      c.fillStyle = "rgba(255,255,255,.06)"; c.fillRect(NS + 158, -4, 108, 3);
    });
    x.stage(); c.translate(-130, 0);
    // the clock, still counting
    c.font = "600 46px Inter, system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#ff4a3a"; c.fillText("6:47", NS + 212, 26);
    P.glow(c, NS + 212, 26, 90, "#ff3a2a", .3);
    // the phone on the nightstand, lighting up
    const ring = Math.max(0, Math.sin(t * 3)) * smooth(2, 3, t);
    const jx = ring > .2 ? (noise(t * 40) - .5) * 5 : 0;
    P.shadow(c, NS + 80 + jx, 64, 60, 8, .6);
    c.fillStyle = "#05070a"; c.beginPath(); c.roundRect(NS + 34 + jx, 44, 92, 18, 5); c.fill();
    if (t > 2) {
      const on = smooth(2, 2.4, t);
      c.fillStyle = rgba("#d8e6ff", .9 * on); c.beginPath(); c.roundRect(NS + 38 + jx, 46, 84, 6, 3); c.fill();
      P.glow(c, NS + 80, 40, 260, "#9ac0ff", (.25 + .25 * ring) * on);
      P.shaft(c, NS + 80, 44, 80, NS + 80, -420, 520, "#b8d0ff", .08 * on);
      c.strokeStyle = `rgba(170,205,255,${(.45 * ring).toFixed(3)})`; c.lineWidth = 3;
      for (let k = 1; k < 4; k++) { c.beginPath(); c.arc(NS + 80, 50, 40 + k * 26 + (t * 40) % 26, -2.5, -.65); c.stroke(); }
    }
    // the dawn light breathing on the blinds
    P.glow(c, -350, -350, 520, "#8aa8e8", .12 + .03 * Math.sin(t * .4));
  };

  /* 20. The hospital: the monitor keeps time, prayer beads on the rail */
  S.hospital = (x) => {
    const { c, W, H, t, m } = x;
    const MX = 200, MY = -430;                              // monitor
    if (!m.i) { m.i = 1; m.city = P.bokehSet(13, 40, [-600, -470, -40, -120], [3, 9], ["#ffcf8a", "#bcd2ff", "#ff9a6a"]); }
    P.layer(x, "bg", (L) => {
      const { c } = L;
      L.full();
      P.fillAll(c, W, H, [[0, "#060a10"], [.55, "#0b121a"], [1, "#030507"]]);
      P.mottle(c, 0, 0, W, H, 21, 36, ["#1a2a34", "#000000"], .3, L.S * .05, L.S * .2);
      L.stage();
      // window: the city asleep, half-closed blinds
      const WX = -620, WY = -500, WW = 600, WH = 400;
      c.fillStyle = P.vgrad(c, 0, WY, 0, WY + WH, [[0, "#060a18"], [1, "#1a1c30"]]); c.fillRect(WX, WY, WW, WH);
      c.fillStyle = "#04060c"; let bx = WX; const R = rng(4);
      c.beginPath(); c.moveTo(WX, WY + WH); while (bx < WX + WW) { const h = lerp(40, 180, R()), w = lerp(40, 100, R()); c.lineTo(bx, WY + WH - h); c.lineTo(bx + w, WY + WH - h); bx += w; } c.lineTo(WX + WW, WY + WH); c.fill();
      for (let i = 0; i < 9; i++) { const y = WY + i * 20; c.fillStyle = P.vgrad(c, 0, y, 0, y + 16, [[0, "#3a4658"], [1, "#1a222e"]]); c.fillRect(WX, y, WW, 15); }
      windowFrame(c, WX, WY, WW, WH, "#0a0e14", 0, "rgba(160,190,240,.10)");
      // monitor on its arm
      c.strokeStyle = "#1a2028"; c.lineWidth = 12; c.beginPath(); c.moveTo(MX + 300, MY + 120); c.lineTo(MX + 380, MY + 120); c.stroke();
      c.fillStyle = P.vgrad(c, 0, MY, 0, MY + 220, [[0, "#1a2028"], [1, "#0a0e12"]]); c.beginPath(); c.roundRect(MX, MY, 310, 220, 16); c.fill();
      c.fillStyle = "rgba(160,190,220,.15)"; c.fillRect(MX + 10, MY + 2, 290, 2);
      c.fillStyle = "#020806"; c.beginPath(); c.roundRect(MX + 16, MY + 16, 278, 170, 6); c.fill();
      for (let i = 0; i < 5; i++) { c.fillStyle = i === 2 ? "#3a6a5a" : "#1a2420"; c.beginPath(); c.arc(MX + 40 + i * 24, MY + 202, 5, 0, 7); c.fill(); }
      // IV stand and bag
      c.strokeStyle = "#3a4450"; c.lineWidth = 6; c.beginPath(); c.moveTo(120, -260); c.lineTo(120, 640); c.moveTo(70, -260); c.lineTo(170, -260); c.stroke();
      c.strokeStyle = "rgba(200,220,240,.25)"; c.lineWidth = 2; c.beginPath(); c.moveTo(118, -260); c.lineTo(118, 640); c.stroke();
      c.fillStyle = "rgba(200,225,245,.22)"; c.beginPath(); c.roundRect(86, -250, 68, 112, 18); c.fill();
      c.fillStyle = "rgba(200,225,245,.16)"; c.beginPath(); c.roundRect(90, -200, 60, 58, 14); c.fill();
      c.strokeStyle = "rgba(220,235,250,.4)"; c.lineWidth = 1.5; c.beginPath(); c.roundRect(86, -250, 68, 112, 18); c.stroke();
      P.spec(c, 96, -238, 96, -160, 3, .45);
      c.strokeStyle = "rgba(200,220,240,.3)"; c.lineWidth = 2; c.beginPath(); c.moveTo(120, -138); c.bezierCurveTo(120, -40, 60, 40, 20, 140); c.stroke();
      // the bed: frame, mattress with rounded edges, blanket in soft folds
      c.fillStyle = "#0c1218"; c.fillRect(-680, 140, 820, 30);
      c.fillStyle = P.vgrad(c, 0, -60, 0, 140, [[0, "#2a3440"], [1, "#141a22"]]);
      c.beginPath(); c.roundRect(-700, -60, 40, 230, 12); c.fill();                 // headboard edge
      // blanket over the mattress
      c.fillStyle = P.vgrad(c, 0, 20, 0, 420, [[0, "#a8b6c8"], [.35, "#7a889c"], [1, "#2a3340"]]);
      c.beginPath(); c.moveTo(-680, 40); c.bezierCurveTo(-520, 0, -340, 30, -220, 20); c.bezierCurveTo(-100, 10, 20, 40, 90, 70);
      c.quadraticCurveTo(140, 90, 140, 150); c.lineTo(150, 280);
      c.bezierCurveTo(60, 300, -40, 270, -160, 292); c.bezierCurveTo(-300, 310, -460, 280, -680, 300); c.closePath(); c.fill();
      // the bed frame and its wheels under the blanket's hem
      c.fillStyle = "#0a0f15"; c.fillRect(-660, 300, 780, 40);
      c.fillStyle = "rgba(160,190,220,.12)"; c.fillRect(-660, 300, 780, 2);
      c.strokeStyle = "#0e141c"; c.lineWidth = 14; for (const lx of [-620, 80]) { c.beginPath(); c.moveTo(lx, 340); c.lineTo(lx, 560); c.stroke(); }
      for (const lx of [-620, 80]) { c.fillStyle = "#06080c"; c.beginPath(); c.arc(lx, 580, 22, 0, 7); c.fill(); c.fillStyle = "rgba(160,190,220,.15)"; c.beginPath(); c.arc(lx - 6, 574, 6, 0, 7); c.fill(); }
      // its folds hang down the side of the bed
      for (let i = 0; i < 5; i++) {
        const fx = -600 + i * 150 + R() * 60, g = c.createLinearGradient(fx - 40, 0, fx + 40, 0);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.45, "rgba(10,16,28,.22)"); g.addColorStop(.62, "rgba(220,235,255,.07)"); g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g; c.beginPath(); c.moveTo(fx - 10, 140); c.quadraticCurveTo(fx + 10, 220, fx + 40, 290); c.lineTo(fx - 40, 290); c.quadraticCurveTo(fx - 20, 220, fx - 10, 140); c.fill();
      }
      c.fillStyle = P.vgrad(c, 0, 150, 0, 300, [[0, "rgba(4,6,12,0)"], [1, "rgba(4,6,12,.6)"]]); c.fillRect(-700, 150, 860, 150);
      c.fillStyle = "rgba(220,235,255,.25)"; c.beginPath(); c.moveTo(-680, 40); c.bezierCurveTo(-520, 0, -340, 30, -220, 20); c.bezierCurveTo(-100, 10, 20, 40, 90, 70); c.lineTo(90, 76); c.bezierCurveTo(20, 46, -100, 18, -220, 28); c.bezierCurveTo(-340, 38, -520, 8, -680, 48); c.fill();
      
      // the side rail, brushed metal
      c.fillStyle = P.vgrad(c, 0, 92, 0, 108, [[0, "#c8d4e0"], [.5, "#6a7684"], [1, "#2a323c"]]); c.beginPath(); c.roundRect(-560, 90, 520, 16, 8); c.fill();
      c.fillStyle = P.vgrad(c, 0, 172, 0, 184, [[0, "#9aa8b6"], [1, "#2a323c"]]); c.beginPath(); c.roundRect(-560, 170, 520, 12, 6); c.fill();
      for (const px of [-540, -300, -60]) { c.fillStyle = "#4a5664"; c.fillRect(px, 104, 8, 68); }
      P.spec(c, -540, 94, -100, 94, 2, .5, "#e8f2ff");
      // the night through the blinds, laid across the blanket
      c.save(); c.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i++) { const y0 = 200 + i * 50; c.fillStyle = "rgba(140,170,230,.06)"; c.beginPath(); c.moveTo(-680, y0); c.lineTo(140, y0 - 120); c.lineTo(140, y0 - 98); c.lineTo(-680, y0 + 22); c.fill(); }
      c.restore();
    });
    x.stage();
    P.bokeh(c, m.city, t);
    // prayer beads hanging from the rail, swaying a little
    const sw = Math.sin(t * .8) * .06;
    c.save(); c.translate(-250, 100); c.rotate(sw);
    for (let i = 0; i < 25; i++) {
      const a = i / 24 * Math.PI, bx = Math.cos(a) * 34, by = Math.sin(a) * 110;
      const g = c.createRadialGradient(bx - 2, by - 2, 0, bx, by, 7);
      g.addColorStop(0, "#e8b878"); g.addColorStop(.6, "#8a4a1a"); g.addColorStop(1, "#2a1206");
      c.fillStyle = g; c.beginPath(); c.arc(bx, by, 6.5, 0, 7); c.fill();
    }
    c.fillStyle = "#6a3a12"; c.fillRect(-3, 118, 6, 30); c.strokeStyle = "#8a4a1a"; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 148); c.lineTo(-6, 176); c.moveTo(0, 148); c.lineTo(6, 176); c.stroke();
    c.restore();
    // the heartbeat
    const sx0 = MX + 16, sy0 = MY + 100, sw2 = 278;
    c.strokeStyle = "#5affb0"; c.lineWidth = 3; c.lineJoin = "round"; c.beginPath();
    for (let i = 0; i <= sw2; i += 3) {
      const ph = ((i / sw2) * 2.5 - t * .41) % 1, v = ph < 0 ? ph + 1 : ph;
      const beat = v > .45 && v < .5 ? -54 * Math.sin((v - .45) / .05 * Math.PI) : v > .5 && v < .53 ? 20 * Math.sin((v - .5) / .03 * Math.PI) : Math.sin(v * 20) * 2;
      i ? c.lineTo(sx0 + i, sy0 + beat) : c.moveTo(sx0 + i, sy0 + beat);
    }
    c.stroke();
    c.font = "500 26px Inter, system-ui, sans-serif"; c.fillStyle = "#5affb0"; c.textAlign = "right"; c.textBaseline = "alphabetic";
    c.fillText(String(72 + Math.round(Math.sin(t * .3) * 3)), MX + 284, MY + 46);
    P.glow(c, MX + 155, MY + 100, 300, "#5affb0", .1 + .03 * Math.sin(t * 2.6));
    // the monitor's green on the rail and the blanket
    P.glow(c, -100, 90, 380, "#4affa0", .05);
  };

  /* 21. "I love you", traced in light on his palm */
  S.palm = (x) => {
    const { c, W, H, t, m } = x;
    const tr = YY.lang() === "tr", words = tr ? "seni seviyorum" : "I love you";
    const TX = 120, TY = -70, SIZE = tr ? 118 : 140, ROT = -.07;     // where the words lie, in stage units
    const fontOK = !document.fonts || document.fonts.check(`italic 500 ${SIZE}px Cormorant`);
    // the words, written once into their own canvas; plus, for every column, where the ink sits,
    // so the fingertip can ride the strokes as it writes
    if (!m.w || m.w.words !== words || (fontOK && !m.w.fontOK)) {
      const PX = 2, oc = document.createElement("canvas"), o = oc.getContext("2d");
      o.font = `italic 500 ${SIZE}px Cormorant, "Cormorant Garamond", Georgia, serif`;
      const tw = Math.ceil(o.measureText(words).width) + SIZE, th = Math.ceil(SIZE * 1.8);
      oc.width = tw * PX; oc.height = th * PX;
      o.scale(PX, PX);
      P.script(o, words, tw / 2, th / 2, SIZE, "#ffe8c8", 1);
      o.font = `italic 500 ${SIZE}px Cormorant, "Cormorant Garamond", Georgia, serif`;
      const inkW = o.measureText(words).width;
      // per-column centre of the ink (sampled every 4 stage units)
      const data = o.getImageData(0, 0, oc.width, oc.height).data, cols = [];
      for (let sx = 0; sx < tw; sx += 4) {
        let sum = 0, n = 0; const px = Math.min(oc.width - 1, sx * PX);
        for (let py = 0; py < oc.height; py += 2) if (data[(py * oc.width + px) * 4 + 3] > 150) { sum += py / PX; n++; }
        cols.push(n ? sum / n : null);
      }
      m.w = { oc, tw, th, inkW, cols, words, fontOK, x0: tw / 2 - inkW / 2 };
    }
    const Wd = m.w;
    // ---- deep warm darkness: a soft surface far out of focus, warmed by a candle we cannot see ----
    P.layer(x, "bg", (L) => {
      const { c } = L;
      L.full(); P.fillAll(c, W, H, [[0, "#050202"], [.5, "#0a0504"], [1, "#030101"]]);
      L.stage();
      // the surface: skin-toned warmth, rising and falling in long soft forms
      const R = rng(66);
      for (let i = 0; i < 9; i++) {
        const fx = lerp(-500, 700, R()), fy = lerp(-420, 260, R()), rx = lerp(260, 620, R()), ry = rx * lerp(.35, .6, R());
        c.save(); c.translate(fx, fy); c.rotate(lerp(-.6, .2, R())); c.scale(1, ry / rx);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, `rgba(170,94,60,${(.12 + R() * .1).toFixed(3)})`); g.addColorStop(.6, "rgba(110,54,32,.06)"); g.addColorStop(1, "rgba(60,26,14,0)");
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill(); c.restore();
      }
      // a long soft fold of shadow running through it, and a soft lit lip beside it
      c.save(); c.translate(80, -40); c.rotate(-.42);
      for (const [oy, col, a, h] of [[0, "0,0,0", .35, 70], [-60, "200,120,80", .06, 50], [150, "0,0,0", .22, 110]]) {
        const g = c.createLinearGradient(0, oy - h, 0, oy + h);
        g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(.5, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g; c.fillRect(-1100, oy - h, 2200, h * 2);
      }
      c.restore();
      // the candle itself, far off and blurred into a few discs of light
      for (const [bx, by, r, a] of [[460, -430, 120, .12], [520, -380, 60, .1], [380, -470, 40, .08], [-420, 300, 160, .05]]) {
        const g = c.createRadialGradient(bx, by, 0, bx, by, r);
        g.addColorStop(0, `rgba(255,170,90,${a})`); g.addColorStop(.75, `rgba(255,150,80,${a * .8})`); g.addColorStop(1, "rgba(255,150,80,0)");
        c.fillStyle = g; c.beginPath(); c.arc(bx, by, r, 0, 7); c.fill();
      }
      // falloff to black at the edges
      L.full();
      const v = c.createRadialGradient(L.sx(TX), L.sy(TY), L.S * .1, L.sx(TX), L.sy(TY), Math.max(W, H) * .8);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.75)");
      c.fillStyle = v; c.fillRect(0, 0, W, H);
    });
    x.stage();
    // the candle breathes
    const br = .85 + .15 * noise(t * .7);
    P.glow(c, 470, -420, 340, "#ff9a4a", .07 * br);
    P.glow(c, TX, TY + 10, 620, "#c86a3a", .16 * br);
    P.glow(c, TX - 40, TY + 60, 300, "#e08a5a", .08 * br);
    // ---- the words, traced slowly by a fingertip of light ----
    const rev = smooth(.8, 6.3, t);                      // how much has been written
    const ink = Wd.x0 + Wd.inkW * rev;                   // the pen, in text-canvas units
    c.save(); c.translate(TX, TY); c.rotate(ROT); c.translate(-Wd.tw / 2, -Wd.th / 2);
    const blit = (x0, x1, a) => {
      if (x1 <= x0 || a <= 0) return;
      c.save(); c.beginPath(); c.rect(x0, 0, x1 - x0, Wd.th); c.clip();
      c.globalAlpha = a; c.drawImage(Wd.oc, 0, 0, Wd.tw, Wd.th); c.restore();
    };
    // what has been written settles into a warm, breathing glow
    blit(0, ink, .8 + .2 * br);
    // the trail: brightest just behind the fingertip, fading back into the settled glow
    c.save(); c.globalCompositeOperation = "lighter";
    for (let k = 0; k < 6; k++) blit(ink - (k + 1) * 12, ink - k * 12, .55 * (1 - k / 6));
    c.restore();
    if (rev > 0 && rev < 1) {
      // the fingertip: a small bright point at the end of the stroke, riding the ink
      const ci = Math.max(0, Math.min(Wd.cols.length - 1, Math.round(ink / 4)));
      let cy = null; for (let d = 0; d < 6 && cy === null; d++) cy = Wd.cols[ci - d] ?? Wd.cols[ci + d] ?? null;
      const py = (cy === null ? Wd.th / 2 : cy) + Math.sin(t * 7) * 2;
      c.save(); c.globalCompositeOperation = "lighter";
      P.glow(c, ink, py, 120, "#ff9a5a", .22);
      P.glow(c, ink, py, 36, "#ffe0b0", .7);
      P.glow(c, ink, py, 10, "#ffffff", .95);
      // a few warm sparks lifting off where it has just been
      for (let k = 0; k < 5; k++) {
        const ph = (t * .9 + k * .2) % 1, sx2 = ink - ph * 50 - k * 6, sy2 = py - ph * 40 + Math.sin(k * 3 + t) * 8;
        c.fillStyle = `rgba(255,214,160,${(.5 * (1 - ph)).toFixed(3)})`; c.fillRect(sx2, sy2, 2.5, 2.5);
      }
      c.restore();
    }
    c.restore();
    // once it is all written, the words keep a faint halo of warmth
    if (rev >= 1) P.glow(c, TX, TY, 420, "#ffb070", .08 * br);
  };

  /* 22. Night shift in the corner of her room */
  S.nightshift = (x) => {
    const { c, W, H, t, m } = x;
    const LX = -330, LY = 40;                                // the laptop on the tray table
    if (!m.i) { m.i = 1; m.st = P.starSet(21, 70, .4); }
    P.layer(x, "bg", (L) => {
      const { c } = L;
      L.full();
      P.fillAll(c, W, H, [[0, "#05070d"], [.5, "#0a0e18"], [1, "#030406"]]);
      P.mottle(c, 0, 0, W, H, 31, 36, ["#1a2234", "#000000"], .3, L.S * .05, L.S * .2);
      L.stage(); c.translate(110, 0);
      // tall window, the moon
      const WX = -90, WY = -480, WW = 330, WH = 380;
      c.fillStyle = P.vgrad(c, 0, WY, 0, WY + WH, [[0, "#070c20"], [1, "#1c2644"]]); c.fillRect(WX, WY, WW, WH);
      c.save(); c.beginPath(); c.rect(WX, WY, WW, WH); c.clip();
      const R = rng(9);
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(230,236,255,${.2 + R() * .6})`; c.fillRect(WX + R() * WW, WY + R() * WH * .7, 1.6, 1.6); }
      P.glow(c, 170, -400, 160, "#c9d6ff", .25);
      c.fillStyle = "#eef0f8"; c.beginPath(); c.arc(170, -400, 24, 0, 7); c.fill();
      c.restore();
      // sheer curtains
      for (const sd of [0, 1]) {
        const cx0 = sd ? WX + WW - 70 : WX - 40;
        for (let k = 0; k < 5; k++) { const fx = cx0 + k * 22; const g = c.createLinearGradient(fx, 0, fx + 22, 0); g.addColorStop(0, "rgba(150,170,220,.04)"); g.addColorStop(.5, "rgba(170,190,240,.16)"); g.addColorStop(1, "rgba(150,170,220,.04)"); c.fillStyle = g; c.fillRect(fx, WY - 20, 22, WH + 60); }
      }
      windowFrame(c, WX, WY, WW, WH, "#0a0e14", 1, "rgba(160,190,240,.12)");
      // her bed on the right, in moonlight
      c.fillStyle = "#0c1018"; c.fillRect(40, 110, 900, 700);
      c.fillStyle = P.vgrad(c, 0, -80, 0, 110, [[0, "#1e2636"], [1, "#0e121a"]]); c.beginPath(); c.roundRect(560, -80, 360, 220, 20); c.fill();
      pillow(c, 470, 70, 280, 110, .06, .2, 6, "#b8c2d6");
      c.fillStyle = P.vgrad(c, 0, 100, 0, 520, [[0, "#9aa6bc"], [.4, "#5a667c"], [1, "#1a2030"]]);
      c.beginPath(); c.moveTo(40, 180); c.bezierCurveTo(150, 120, 300, 150, 400, 130); c.bezierCurveTo(500, 112, 600, 140, 900, 120); c.lineTo(900, 800); c.lineTo(40, 800); c.fill();
      for (let i = 0; i < 5; i++) {
        c.save(); c.translate(lerp(150, 760, R()), lerp(230, 420, R())); c.rotate(lerp(-.3, .3, R()));
        const g = c.createLinearGradient(0, -30, 0, 30);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.45, "rgba(10,16,28,.22)"); g.addColorStop(.62, "rgba(220,235,255,.08)"); g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, lerp(160, 280, R()), 30, 0, 0, 7); c.fill(); c.restore();
      }
      c.fillStyle = P.vgrad(c, 0, 250, 0, 700, [[0, "rgba(4,6,14,0)"], [1, "rgba(4,6,14,.85)"]]); c.fillRect(40, 250, 900, 560);
      c.fillStyle = "rgba(210,225,255,.3)"; c.beginPath(); c.moveTo(40, 180); c.bezierCurveTo(150, 120, 300, 150, 400, 130); c.bezierCurveTo(500, 112, 600, 140, 900, 120); c.lineTo(900, 128); c.bezierCurveTo(600, 148, 500, 120, 400, 138); c.bezierCurveTo(300, 158, 150, 128, 40, 188); c.fill();
      // my corner: a chair, a tray table, the laptop
      // the chair: a tall back, its far edge caught by the screen's cold light
      c.fillStyle = P.vgrad(c, -640, 0, -450, 0, [[0, "#05060a"], [.8, "#0c0f18"], [1, "#141a28"]]);
      c.beginPath(); c.roundRect(-640, -200, 190, 360, 18); c.fill();
      c.fillRect(-660, 140, 260, 40); c.fillRect(-650, 180, 16, 400); c.fillRect(-420, 180, 16, 400);
      c.strokeStyle = "rgba(122,168,255,.45)"; c.lineWidth = 3; c.lineCap = "round";
      c.beginPath(); c.moveTo(-600, -199); c.lineTo(-470, -199); c.quadraticCurveTo(-451, -199, -451, -180); c.lineTo(-451, 140); c.stroke();
      c.strokeStyle = "rgba(122,168,255,.3)"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-660, 141); c.lineTo(-400, 141); c.moveTo(-405, 180); c.lineTo(-405, 580); c.stroke();
      // my jacket hung over its back, lower and to the left, a dark gap between the two
      c.fillStyle = "rgba(0,0,0,.6)"; c.beginPath(); c.moveTo(-652, -150); c.quadraticCurveTo(-560, -172, -488, -146); c.lineTo(-476, 96); c.quadraticCurveTo(-560, 112, -664, 86); c.fill();
      c.fillStyle = P.vgrad(c, -660, 0, -490, 0, [[0, "#0e0908"], [.65, "#1e140f"], [1, "#2c1e16"]]);
      c.beginPath(); c.moveTo(-660, -156); c.quadraticCurveTo(-570, -180, -496, -152); c.quadraticCurveTo(-488, -40, -486, 84); c.quadraticCurveTo(-570, 102, -672, 76); c.quadraticCurveTo(-664, -40, -660, -156); c.fill();
      // its folds and the collar turned over the top
      c.strokeStyle = "rgba(0,0,0,.22)"; c.lineWidth = 7;
      for (const fx of [-615, -548]) { c.beginPath(); c.moveTo(fx, -140); c.quadraticCurveTo(fx + 8, -30, fx - 4, 88); c.stroke(); }
      c.fillStyle = "#0e0907"; c.beginPath(); c.moveTo(-660, -156); c.quadraticCurveTo(-570, -180, -496, -152); c.lineTo(-500, -118); c.quadraticCurveTo(-575, -138, -658, -120); c.fill();
      // the screen's light along the jacket's own edge: warm brown lit cold
      c.strokeStyle = "rgba(150,180,240,.35)"; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-498, -150); c.quadraticCurveTo(-490, -40, -488, 82); c.stroke();
      c.strokeStyle = "rgba(200,170,140,.18)"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-656, -158); c.quadraticCurveTo(-570, -182, -498, -154); c.stroke();
      // tray table
      c.fillStyle = P.vgrad(c, 0, LY + 60, 0, LY + 80, [[0, "#2a3040"], [1, "#12161e"]]); c.fillRect(-500, LY + 60, 380, 18);
      c.fillStyle = "#0e1118"; c.fillRect(-320, LY + 78, 16, 520); c.fillRect(-420, LY + 580, 220, 14);
      // laptop base
      c.fillStyle = P.vgrad(c, 0, LY + 44, 0, LY + 62, [[0, "#3a4252"], [1, "#1a1e28"]]);
      c.beginPath(); c.moveTo(LX - 110, LY + 62); c.lineTo(LX + 110, LY + 62); c.lineTo(LX + 92, LY + 44); c.lineTo(LX - 92, LY + 44); c.fill();
      // laptop lid
      c.fillStyle = "#0c0f16"; c.beginPath(); c.moveTo(LX - 96, LY + 44); c.lineTo(LX - 84, LY - 104); c.lineTo(LX + 84, LY - 104); c.lineTo(LX + 96, LY + 44); c.fill();
      // a mug of coffee gone cold, a notebook
      P.shadow(c, -170, LY + 62, 40, 6, .6);
      c.fillStyle = P.vgrad(c, -196, 0, -144, 0, [[0, "#6a7080"], [.4, "#e8eaf0"], [1, "#5a6070"]]); c.fillRect(-196, LY + 4, 52, 58);
      c.strokeStyle = "#a8aeba"; c.lineWidth = 7; c.beginPath(); c.arc(-140, LY + 32, 16, -1.3, 1.3); c.stroke();
      c.fillStyle = "#1a0e08"; c.beginPath(); c.ellipse(-170, LY + 6, 25, 5, 0, 0, 7); c.fill();
      c.fillStyle = "#d8d0c0"; c.save(); c.translate(-470, LY + 52); c.rotate(-.06); c.fillRect(0, 0, 90, 10); c.restore();
    });
    x.stage(); c.translate(110, 0);
    // the moon's light laid across the room and onto her bed
    P.shaft(c, 75, -140, 330, 420, 600, 900, "#a8bce8", .09 + .015 * Math.sin(t * .3));
    // her blanket rising and falling, slowly
    const br = Math.sin(t * 1.1) * 4;
    sheen(c, 440, 220 - br, 300, 80 + br, "#b8c8f0", .07);
    // the laptop screen and its cold light on the corner
    const fl = .92 + .08 * noise(t * .8);
    c.fillStyle = P.vgrad(c, 0, LY - 96, 0, LY + 36, [[0, rgba("#bcd4ff", fl)], [1, rgba("#5a7ac0", fl)]]);
    c.beginPath(); c.moveTo(LX - 86, LY + 36); c.lineTo(LX - 76, LY - 96); c.lineTo(LX + 76, LY - 96); c.lineTo(LX + 86, LY + 36); c.fill();
    c.fillStyle = "rgba(20,30,60,.55)"; for (let i = 0; i < 7; i++) c.fillRect(LX - 60, LY - 76 + i * 15, 30 + ((i * 53) % 80), 4);
    const cur = (t % 1.1) < .55; if (cur) { c.fillStyle = "rgba(20,30,60,.8)"; c.fillRect(LX - 60 + 30 + ((6 * 53) % 80) + 4, LY + 14, 3, 8); }
    P.glow(c, LX, LY - 30, 420, "#7aa8ff", .2 * fl);
    P.glow(c, LX, LY + 50, 160, "#9ac0ff", .14 * fl);
    // the monitor's small green pulse by her bed, far right
    const beat = Math.pow(Math.max(0, Math.sin(t * 2.4)), 12);
    P.glow(c, 640, -150, 60, "#5affb0", .2 + .4 * beat);
    c.fillStyle = rgba("#5affb0", .6 + .4 * beat); c.beginPath(); c.arc(640, -150, 4, 0, 7); c.fill();
  };

  /* 23. Three flights home: the last flight, our door open at the top, her wheelchair waiting in its light */
  S.stairs = (x) => {
    const { c, W, H, t, m } = x;
    // a small camera: eye 2m up, looking along the stairs
    const F = 900, Z0 = 1.6, EYE = 2.0, VX = 40, VY = -105, N = 10, RUN = .3, RISE = .18, HW = .62;
    const px = (xw, z) => VX + xw * F / z, py = (h, z) => VY + (EYE - h) * F / z;
    const ZL = Z0 + N * RUN, ZD = ZL + .8, HL = N * RISE;   // landing depth, door wall depth, landing height
    const D0 = px(-.25, ZD), D1 = px(.65, ZD), DT = py(HL + 2.05, ZD), DB = py(HL, ZD);
    if (!m.i) { m.i = 1; m.mote = P.starSet(23, 50, 1); }
    P.layer(x, "bg", (L) => {
      const { c } = L;
      L.full(); P.fillAll(c, W, H, [[0, "#0c0807"], [1, "#050303"]]);
      L.stage();
      // left wall: plaster, warmer towards the door
      c.fillStyle = P.vgrad(c, -900, 0, px(-HW - .05, ZD), 0, [[0, "#140c09"], [1, "#3a2416"]]);
      c.beginPath(); c.moveTo(-1400, -1000); c.lineTo(px(-HW - .05, ZD), -1000); c.lineTo(px(-HW - .05, ZD), py(HL, ZD)); c.lineTo(-1400, 1600); c.fill();
      P.mottle(c, -1400, -1000, 1400 + px(-HW, ZD), 2600, 41, 30, ["#5a3a26", "#000000"], .2, 40, 160);
      // a wall lamp on the half landing, off; its brass catching the door
      c.fillStyle = "#2a1a10"; c.fillRect(px(-HW - .05, 3.0) - 6, py(2.9, 3.0), 12, 30);
      // back wall around the door
      c.fillStyle = "#4a2e1c"; c.fillRect(px(-HW - .05, ZD), -1000, px(HW + .6, ZD) - px(-HW - .05, ZD), py(HL, ZD) + 1000);
      // the stairwell void and rail on the right
      c.fillStyle = "#060403"; c.beginPath(); c.moveTo(px(HW, Z0 - .4), 1600); c.lineTo(px(HW, ZL), py(HL, ZL)); c.lineTo(px(HW + .6, ZD), py(HL, ZD)); c.lineTo(px(HW + .6, ZD), -1000); c.lineTo(1400, -1000); c.lineTo(1400, 1600); c.fill();
      // the landing floor
      c.fillStyle = P.vgrad(c, 0, py(HL, ZD), 0, py(HL, ZL), [[0, "#6a4026"], [1, "#4a2c1a"]]);
      c.beginPath(); c.moveTo(px(-HW - .05, ZD), py(HL, ZD)); c.lineTo(px(HW + .6, ZD), py(HL, ZD)); c.lineTo(px(HW + .6, ZL), py(HL, ZL)); c.lineTo(px(-HW - .05, ZL), py(HL, ZL)); c.fill();
      // the steps, far to near: warm light on every tread, risers in shadow, a lit nosing
      for (let i = N - 1; i >= 0; i--) {
        const z = Z0 + i * RUN, h = (i + 1) * RISE, warm = .35 + .65 * (i / N);
        // tread
        c.fillStyle = P.vgrad(c, 0, py(h, z + RUN), 0, py(h, z), [[0, mix("#3a2214", "#c07a44", warm)], [1, mix("#2a180e", "#8a5430", warm)]]);
        c.beginPath(); c.moveTo(px(-HW, z), py(h, z)); c.lineTo(px(HW, z), py(h, z)); c.lineTo(px(HW, z + RUN), py(h, z + RUN)); c.lineTo(px(-HW, z + RUN), py(h, z + RUN)); c.fill();
        // a worn path up the middle of the treads
        c.fillStyle = rgba("#ffcf9a", .06 * warm); c.beginPath(); c.moveTo(px(-.25, z), py(h, z)); c.lineTo(px(.25, z), py(h, z)); c.lineTo(px(.25, z + RUN), py(h, z + RUN)); c.lineTo(px(-.25, z + RUN), py(h, z + RUN)); c.fill();
        // riser
        c.fillStyle = mix("#100906", "#3a2214", warm * .6);
        c.beginPath(); c.moveTo(px(-HW, z), py(h - RISE, z)); c.lineTo(px(HW, z), py(h - RISE, z)); c.lineTo(px(HW, z), py(h, z)); c.lineTo(px(-HW, z), py(h, z)); c.fill();
        // nosing highlight
        c.fillStyle = rgba("#ffc890", .35 * warm); c.fillRect(px(-HW, z), py(h, z) - 1, px(HW, z) - px(-HW, z), Math.max(2, 6 / z));
        // the stringer against the wall
        c.fillStyle = "#1a0f09"; c.beginPath(); c.moveTo(px(-HW - .06, z), py(h + .12, z)); c.lineTo(px(-HW, z), py(h + .12, z)); c.lineTo(px(-HW, z), py(h - RISE - .1, z)); c.lineTo(px(-HW - .06, z), py(h - RISE - .1, z)); c.fill();
      }
      // the floor at the bottom, where we stand
      c.fillStyle = P.vgrad(c, 0, py(0, Z0), 0, 1600, [[0, "#1a0f09"], [1, "#050302"]]); c.fillRect(-1400, py(0, Z0), 2800, 1600);
      // banister: balusters, rail, newel post
      for (let i = 0; i < N; i++) {
        const z = Z0 + i * RUN + RUN / 2, h = (i + 1) * RISE, warm = .3 + .7 * (i / N);
        c.strokeStyle = mix("#0e0806", "#4a2c18", warm * .6); c.lineWidth = Math.max(2, 22 / z);
        c.beginPath(); c.moveTo(px(HW, z), py(h, z)); c.lineTo(px(HW, z), py(h + .9, z)); c.stroke();
      }
      c.strokeStyle = "#2a1810"; c.lineCap = "round";
      c.lineWidth = 34 / Z0; c.beginPath(); c.moveTo(px(HW, Z0 - .2), py(1.05, Z0 - .2)); c.lineTo(px(HW, ZL), py(HL + .9, ZL)); c.lineTo(px(HW + .6, ZD - .05), py(HL + .9, ZD - .05)); c.stroke();
      c.strokeStyle = "rgba(255,200,140,.45)"; c.lineWidth = 3; c.beginPath(); c.moveTo(px(HW, Z0 - .2), py(1.05, Z0 - .2) - 8); c.lineTo(px(HW, ZL), py(HL + .9, ZL) - 2); c.stroke();
      const nx = px(HW, Z0 - .2), nw = 70 / Z0;
      c.fillStyle = P.vgrad(c, nx - nw / 2, 0, nx + nw / 2, 0, [[0, "#3a2214"], [.4, "#6a4026"], [1, "#140a06"]]); c.fillRect(nx - nw / 2, py(1.15, Z0 - .2), nw, 1600);
      c.fillStyle = "#4a2c18"; c.beginPath(); c.ellipse(nx, py(1.15, Z0 - .2), nw * .7, nw * .25, 0, 0, 7); c.fill();
      // the door frame and the open door leaf
      c.fillStyle = "#1a0f09"; c.fillRect(D0 - 12, DT - 12, D1 - D0 + 24, 12); c.fillRect(D0 - 12, DT, 12, DB - DT); c.fillRect(D1, DT, 12, DB - DT);
      // a mat and a pot plant by the door: someone lives here
      c.fillStyle = "#3a1a14"; c.beginPath(); c.moveTo(D0 + 6, DB + 4); c.lineTo(D1 - 6, DB + 4); c.lineTo(D1 + 6, DB + 18); c.lineTo(D0 - 6, DB + 18); c.fill();
      const pp = px(-.5, ZD - .2);
      c.fillStyle = "#2a160c"; c.beginPath(); c.moveTo(pp - 14, py(HL + .35, ZD - .2)); c.lineTo(pp + 14, py(HL + .35, ZD - .2)); c.lineTo(pp + 10, py(HL, ZD - .2)); c.lineTo(pp - 10, py(HL, ZD - .2)); c.fill();
      c.fillStyle = "#14200e"; for (let k = 0; k < 7; k++) { c.beginPath(); c.ellipse(pp + Math.cos(k) * 12, py(HL + .45, ZD - .2) - k * 4, 6, 16, Math.cos(k * 1.7) * .8, 0, 7); c.fill(); }
    });
    x.stage();
    const br = .9 + .1 * noise(t * .6);
    // home: the room beyond the open door, warm and bright
    c.fillStyle = P.vgrad(c, 0, DT, 0, DB, [[0, rgba("#ffd8a0", br)], [1, rgba("#ff9a4a", br)]]); c.fillRect(D0, DT, D1 - D0, DB - DT);
    // inside: a lamp and the edge of a sofa
    c.fillStyle = "rgba(140,70,30,.55)"; c.fillRect(D0, DB - (DB - DT) * .28, (D1 - D0) * .7, (DB - DT) * .28);
    P.glow(c, D1 - 30, DT + 80, 70, "#fff4dc", .7 * br);
    // the door leaf swung inward, edge-on
    c.fillStyle = "#1a0f09"; c.beginPath(); c.moveTo(D1 - 4, DT); c.lineTo(D1 - 24, DT + 14); c.lineTo(D1 - 24, DB - 6); c.lineTo(D1 - 4, DB); c.fill();
    // the light pouring out and down the stairs
    P.glow(c, (D0 + D1) / 2, (DT + DB) / 2, 620, "#ffb35a", .3 * br);
    P.shaft(c, (D0 + D1) / 2, DB, D1 - D0, (D0 + D1) / 2 - 40, 700, 900, "#ffc88a", .22 * br);
    // motes in the light
    c.save(); c.globalCompositeOperation = "lighter";
    for (const d of m.mote) { const v = (d.y + t * .01) % 1, y = lerp(DB, 600, v), sp = lerp(80, 420, v); c.fillStyle = `rgba(255,225,180,${(.35 * d.s / 1.5 * Math.sin(v * Math.PI)).toFixed(3)})`; c.fillRect((D0 + D1) / 2 + (d.x - .5) * 2 * sp, y + Math.sin(t * .3 + d.ph) * 10, 2.5, 2.5); }
    c.restore();
    // her wheelchair on the landing, waiting in the doorway light
    const z = ZD - .45, gx = px(.12, z), gy = py(HL, z), s = F / z / 10;   // s: pixels per 10cm
    P.shadow(c, gx + 1 * s, gy, 5 * s, .8 * s, .7);
    c.save(); c.translate(gx, gy);
    c.strokeStyle = "#0a0605"; c.fillStyle = "#0a0605"; c.lineCap = "round"; c.lineJoin = "round";
    const R = 3.0 * s;                                          // big wheel radius
    c.lineWidth = .35 * s; c.beginPath(); c.arc(-.4 * s, -R, R, 0, 7); c.stroke();
    c.lineWidth = .12 * s; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI; c.beginPath(); c.moveTo(-.4 * s + Math.cos(a) * R, -R + Math.sin(a) * R); c.lineTo(-.4 * s - Math.cos(a) * R, -R - Math.sin(a) * R); c.stroke(); }
    c.lineWidth = .3 * s;
    c.beginPath(); c.moveTo(-1.6 * s, -9.5 * s); c.lineTo(-1.4 * s, -4.2 * s); c.lineTo(3.0 * s, -4.4 * s); c.lineTo(3.8 * s, -1.2 * s); c.stroke();        // back post, seat, front frame
    c.beginPath(); c.moveTo(-1.6 * s, -9.5 * s); c.lineTo(-2.6 * s, -9.7 * s); c.stroke();                                                          // push handle
    c.beginPath(); c.moveTo(3.8 * s, -1.2 * s); c.lineTo(4.8 * s, -1.0 * s); c.stroke();                                                            // footrest
    c.fillRect(-1.5 * s, -9 * s, .4 * s, 4.6 * s);
    c.beginPath(); c.roundRect(-1.5 * s, -9 * s, .9 * s, 4.8 * s, .3 * s); c.fill();                                                            // backrest
    c.beginPath(); c.roundRect(-1.4 * s, -4.9 * s, 4.4 * s, .7 * s, .3 * s); c.fill();                                                           // seat
    c.beginPath(); c.arc(3.6 * s, -.6 * s, .6 * s, 0, 7); c.stroke();                                                                           // caster
    // warm rim from the doorway behind it
    c.strokeStyle = rgba("#ffcf8a", .7 * br); c.lineWidth = .1 * s;
    c.beginPath(); c.arc(-.4 * s, -R, R + .2 * s, -1.9, -.2); c.stroke();
    c.beginPath(); c.moveTo(-1.35 * s, -9.4 * s); c.lineTo(-1.2 * s, -4.4 * s); c.lineTo(2.9 * s, -4.6 * s); c.stroke();
    c.restore();
  };

  /* 24. Now: dawn over the lake, a single dark rose in a slim glass vase on the sill */
  S.dawn = (x) => {
    const { c, W, H, t, u, m } = x;
    const HZ = 60, SUNX = 90, SILL = 250, VX = -90;          // horizon, sun, sill top, vase
    const rise = smooth(0, 1, u), sunY = lerp(HZ + 30, HZ - 120, rise);
    if (!m.i) {
      m.i = 1; const R = rng(88);
      m.glit = Array.from({ length: 80 }, () => ({ v: Math.pow(R(), 1.4), o: R() - .5, ph: R() * 6, sp: lerp(1, 2.6, R()) }));
      m.birds = [[-420, -300, 1], [-380, -330, .8], [-340, -290, .7]];
    }
    // ---- the sky and the lake: live, because the sun is rising ----
    x.full();
    const hz = x.sy(HZ);
    P.fillAll(c, W, H, [[0, mix("#10142e", "#3a4a7a", rise)], [Math.max(.01, hz / H * .55), mix("#3a2a4e", "#d88a8a", rise)], [hz / H * .93, mix("#7a4a5a", "#ffc49a", rise)], [hz / H, mix("#a86a62", "#ffe2b8", rise)], [Math.min(1, hz / H + .001), "#2a1a28"], [1, "#0a0710"]]);
    const sx = x.sx(SUNX), sy = x.sy(sunY);
    P.glow(c, sx, sy, x.S * 1.3, "#ff9a6a", .28 + .3 * rise);
    P.glow(c, sx, sy, x.S * .35, "#ffd8a8", .4 + .3 * rise);
    x.stage();
    P.layer(x, "far", (L) => {
      const { c } = L;
      // long clouds, lit from beneath
      const R = rng(5);
      c.save(); c.globalCompositeOperation = "lighter"; L.stage();
      for (let i = 0; i < 12; i++) {
        const cx = lerp(-1300, 800, R()), cy = lerp(-760, -60, R()), w = lerp(200, 600, R()), h = lerp(10, 26, R());
        c.save(); c.translate(cx, cy); c.scale(w / h, 1);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, h); g.addColorStop(0, `rgba(255,170,150,${.12 + R() * .12})`); g.addColorStop(1, "rgba(255,170,150,0)");
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, h, 0, 7); c.fill(); c.restore();
      }
      c.restore();
      L.full();
      P.ridge(c, W, L.sy(HZ) - L.S * .004, L.S * .07, 3.1, "rgba(70,40,70,.85)", 2);
      P.ridge(c, W, L.sy(HZ) + 1, L.S * .035, 7.7, "#24162a", 3);
    });
    // the sun itself, then the water
    c.fillStyle = mix("#ff8a5a", "#fff2d8", rise); c.beginPath(); c.arc(SUNX, sunY, 46, 0, 7); c.fill();
    x.full();
    c.fillStyle = P.vgrad(c, 0, hz, 0, H, [[0, mix("#5a3a4a", "#c88a7a", rise)], [.15, mix("#2a1a2a", "#6a4a5a", rise)], [1, "#08060c"]]); c.fillRect(0, hz + 1, W, H - hz);
    x.stage();
    // the sun's path on the water, glittering
    c.save(); c.globalCompositeOperation = "lighter";
    c.translate(SUNX, HZ); c.scale(.16, 1);
    const sp = c.createRadialGradient(0, 0, 0, 0, 0, 800); sp.addColorStop(0, rgba("#ffd0a0", .5 * (.4 + rise))); sp.addColorStop(1, "rgba(255,200,150,0)");
    c.fillStyle = sp; c.fillRect(-800, 0, 1600, 800);
    c.setTransform(1, 0, 0, 1, 0, 0); x.stage();
    for (const g of m.glit) {
      const y = HZ + 4 + g.v * 520, spr = 8 + g.v * 120, gx = SUNX + g.o * spr * 2;
      const a = Math.pow(Math.max(0, Math.sin(t * g.sp + g.ph)), 2) * (1 - g.v * .7) * .8 * (.4 + rise);
      if (a < .04) continue;
      const w = 6 + g.v * 30;
      c.fillStyle = `rgba(255,226,190,${a.toFixed(3)})`; c.fillRect(gx - w / 2, y, w, 1 + g.v * 1.5);
    }
    c.restore();
    // morning mist on the lake
    const dr = Math.sin(t * .12) * 50;
    P.haze(c, -1400 + dr, 1400, HZ + 14, 26, "#ffd0c0", .14 + .08 * rise);
    P.haze(c, -1400 - dr, 1400, HZ - 6, 18, "#ffc0b0", .1);
    // three birds crossing, far off
    c.strokeStyle = "rgba(40,20,30,.7)"; c.lineWidth = 2.5; c.lineCap = "round";
    for (const [bx, by, s] of m.birds) {
      const fx = bx + t * 14 * s, fy = by + Math.sin(t * .6 + bx) * 6, fl = Math.sin(t * 5 * s + bx) * 5 * s;
      c.beginPath(); c.moveTo(fx - 10 * s, fy - fl); c.quadraticCurveTo(fx - 4 * s, fy - 4 * s, fx, fy); c.quadraticCurveTo(fx + 4 * s, fy - 4 * s, fx + 10 * s, fy - fl); c.stroke();
    }
    // the sun behind the bloom: a breathing warm halo the rose stands against
    const br = .85 + .15 * Math.sin(t * .7);
    P.glow(c, VX + 40, -190, 260, "#ff7a6a", (.14 + .18 * rise) * br);
    // the rose, built once from YY.Rose.petalPath like js/rose.js: golden-angle petals, dark hearts, lit lips
    const roseCanvas = () => {
      if (m.rose) return m.rose;
      const PX = 3, oc = document.createElement("canvas"); oc.width = oc.height = 200 * PX;
      const o = oc.getContext("2d"); o.setTransform(PX, 0, 0, PX, 100 * PX, 100 * PX);
      const R = rng(11), N = 30, GOLDEN = 137.508 * Math.PI / 180, LIGHT = -2.3;
      // a dim crimson halo the bloom sits in
      const hg = o.createRadialGradient(0, 0, 0, 0, 0, 96); hg.addColorStop(0, "rgba(91,13,27,.5)"); hg.addColorStop(.6, "rgba(42,5,16,.2)"); hg.addColorStop(1, "rgba(0,0,0,0)");
      o.fillStyle = hg; o.fillRect(-100, -100, 200, 200);
      for (let i = 0; i < N; i++) {
        const tt = i / (N - 1), r = lerp(60, 6, Math.pow(tt, .7)) * lerp(.94, 1.06, R()), w = r * lerp(1, 1.75, tt);
        const base = r * lerp(.2, .02, tt), ang = i * GOLDEN + (R() - .5) * .2;
        const facing = Math.pow(.5 + .5 * Math.cos(ang - LIGHT), 1.4), lit = facing * lerp(.7, 1, tt);
        const path = new Path2D(YY.Rose.petalPath(r, w, 1 - tt));
        o.save(); o.rotate(ang); o.translate(0, -base);
        // soft shadow cast on the petals beneath
        o.save(); o.translate(0, 3); o.scale(1.05, 1.05); o.fillStyle = "rgba(0,0,0,.55)"; o.fill(path); o.restore();
        const g = o.createRadialGradient(0, r * .1, 0, 0, r * .1, r * 1.12);
        g.addColorStop(0, "#010001"); g.addColorStop(.5, "#060103"); g.addColorStop(.8, mix("#0d0205", "#2a0510", lit)); g.addColorStop(1, mix("#1c0309", "#6e1426", lit));
        o.fillStyle = g; o.fill(path);
        const rg = o.createLinearGradient(0, -r * 1.05, 0, r * .1);
        rg.addColorStop(0, rgba(mix("#4a0a16", "#f08a96", lit), .35 + .65 * lit)); rg.addColorStop(.3, "rgba(74,10,22,.15)"); rg.addColorStop(.5, "rgba(0,0,0,0)");
        o.strokeStyle = rg; o.lineWidth = lerp(.7, 1.1, lit); o.stroke(path);
        o.restore();
      }
      // the heart: a tight spiral
      o.strokeStyle = "rgba(74,12,23,.9)"; o.lineWidth = 1.2; o.lineCap = "round"; o.beginPath();
      for (let a = 0; a < Math.PI * 5; a += .15) { const rr = (2 + a * 2.1) * .3; o.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      o.stroke();
      // a faint rim of light from the upper left over the whole bloom
      o.globalCompositeOperation = "lighter";
      const rim = o.createRadialGradient(-10, -14, 0, -10, -14, 90); rim.addColorStop(0, "rgba(255,122,132,.12)"); rim.addColorStop(.5, "rgba(122,16,32,.05)"); rim.addColorStop(1, "rgba(0,0,0,0)");
      o.fillStyle = rim; o.beginPath(); o.arc(0, 0, 70, 0, 7); o.fill();
      return (m.rose = oc);
    };
    // ---- the window, the sill, the vase and the rose: painted once ----
    P.layer(x, "near", (L) => {
      const { c } = L;
      L.stage();
      // the window frame we look through, in silhouette
      c.fillStyle = "#0a0608";
      c.fillRect(-1400, -1000, 820, 2600); c.fillRect(560, -1000, 900, 2600); c.fillRect(-1400, -1000, 2800, 330);
      c.fillStyle = "rgba(255,190,150,.16)"; c.fillRect(-580, -670, 3, SILL + 670); c.fillRect(557, -670, 3, SILL + 670);
      c.fillStyle = "#0a0608"; c.fillRect(-14, -670, 28, SILL + 670);
      c.fillStyle = "rgba(255,200,160,.22)"; c.fillRect(11, -670, 3, SILL + 670);
      // the sill: painted wood, raking light across it
      c.fillStyle = P.vgrad(c, 0, SILL, 0, SILL + 80, [[0, "#6a4a40"], [.2, "#3a2622"], [1, "#160c0c"]]); c.fillRect(-1400, SILL, 2800, 80);
      c.fillStyle = "rgba(255,210,170,.5)"; c.fillRect(-1400, SILL, 2800, 2);
      c.fillStyle = "#0a0608"; c.fillRect(-1400, SILL + 80, 2800, 1600);
      c.fillStyle = P.vgrad(c, 0, SILL + 80, 0, SILL + 130, [[0, "rgba(0,0,0,.6)"], [1, "rgba(0,0,0,0)"]]); c.fillRect(-1400, SILL + 80, 2800, 50);
      // the vase's shadow and the caustic it throws, falling towards us
      P.shadow(c, VX - 20, SILL + 30, 70, 14, .6);
      c.save(); c.globalCompositeOperation = "lighter"; c.translate(VX - 14, SILL + 34); c.scale(1, .22);
      const cg = c.createRadialGradient(0, 0, 0, 0, 0, 40); cg.addColorStop(0, "rgba(255,200,150,.55)"); cg.addColorStop(1, "rgba(255,160,120,0)");
      c.fillStyle = cg; c.beginPath(); c.arc(0, 0, 40, 0, 7); c.fill(); c.restore();
      // ---- the slim glass vase ----
      const vase = () => {
        c.beginPath(); c.moveTo(VX - 14, SILL - 230); c.bezierCurveTo(VX - 12, SILL - 140, VX - 14, SILL - 120, VX - 34, SILL - 70);
        c.bezierCurveTo(VX - 48, SILL - 34, VX - 40, SILL - 2, VX - 30, SILL); c.lineTo(VX + 30, SILL);
        c.bezierCurveTo(VX + 40, SILL - 2, VX + 48, SILL - 34, VX + 34, SILL - 70); c.bezierCurveTo(VX + 14, SILL - 120, VX + 12, SILL - 140, VX + 14, SILL - 230); c.closePath();
      };
      c.save(); vase(); c.clip();
      c.fillStyle = "rgba(255,210,180,.07)"; c.fillRect(VX - 60, SILL - 240, 120, 240);
      // water, glowing where the sun comes through it
      c.fillStyle = P.vgrad(c, VX - 50, 0, VX + 50, 0, [[0, "rgba(255,160,120,.10)"], [.6, "rgba(255,200,160,.32)"], [1, "rgba(255,170,130,.12)"]]);
      c.fillRect(VX - 60, SILL - 130, 120, 130);
      c.fillStyle = "rgba(255,230,200,.55)"; c.fillRect(VX - 20, SILL - 131, 40, 2);
      // the stem, bent by the water
      c.strokeStyle = "rgba(40,60,30,.85)"; c.lineWidth = 6;
      c.beginPath(); c.moveTo(VX + 4, SILL - 6); c.lineTo(VX + 7, SILL - 129); c.stroke();
      c.beginPath(); c.moveTo(VX + 2, SILL - 131); c.lineTo(VX, SILL - 240); c.stroke();
      c.restore();
      // glass edges and highlights
      c.strokeStyle = "rgba(255,225,200,.4)"; c.lineWidth = 2; vase(); c.stroke();
      c.strokeStyle = "rgba(255,240,225,.55)"; c.lineWidth = 2; c.beginPath(); c.ellipse(VX, SILL - 230, 14, 3.5, 0, 0, 7); c.stroke();
      P.spec(c, VX + 9, SILL - 220, VX + 8, SILL - 140, 2.5, .6, "#fff0e0");
      P.spec(c, VX + 30, SILL - 64, VX + 26, SILL - 16, 3, .55, "#ffe8d0");
      P.spec(c, VX - 34, SILL - 50, VX - 30, SILL - 18, 1.5, .25, "#ffe8d0");
      // ---- the rose: stem, two leaves, and a dark bloom backlit by the sun ----
      const RX = VX + 6, RY = -150;
      c.strokeStyle = "#1a2410"; c.lineWidth = 6; c.lineCap = "round";
      c.beginPath(); c.moveTo(VX, SILL - 232); c.bezierCurveTo(VX - 2, SILL - 320, RX + 6, RY + 160, RX, RY + 40); c.stroke();
      c.strokeStyle = "rgba(255,150,110,.35)"; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(VX + 3, SILL - 232); c.bezierCurveTo(VX + 1, SILL - 320, RX + 9, RY + 160, RX + 3, RY + 40); c.stroke();
      // a thorn or two
      c.fillStyle = "#1a2410"; c.beginPath(); c.moveTo(VX - 2, 40); c.lineTo(VX - 12, 34); c.lineTo(VX - 2, 30); c.fill();
      c.beginPath(); c.moveTo(RX + 4, -20); c.lineTo(RX + 14, -26); c.lineTo(RX + 4, -30); c.fill();
      const leaf = (lx, ly, ang, s) => {
        c.save(); c.translate(lx, ly); c.rotate(ang); c.scale(s, s);
        c.fillStyle = P.vgrad(c, 0, -20, 0, 20, [[0, "#22301a"], [1, "#0c140a"]]);
        c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(20, -24, 60, -22, 84, 0); c.bezierCurveTo(60, 20, 20, 20, 0, 0); c.fill();
        c.strokeStyle = "rgba(255,170,120,.45)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(20, -24, 60, -22, 84, 0); c.stroke();
        c.strokeStyle = "rgba(0,0,0,.4)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(4, 0); c.lineTo(78, -1); c.stroke();
        c.restore();
      };
      leaf(VX + 2, 20, -.5, 1); leaf(RX - 2, -40, Math.PI + .45, .85);
      // sepals, curling down from under the bloom
      c.fillStyle = "#1a2410";
      for (const a of [-1.1, -.4, .35, 1.05]) { c.save(); c.translate(RX, RY + 22); c.rotate(a); c.beginPath(); c.moveTo(-5, 0); c.quadraticCurveTo(0, 30, 4, 46); c.quadraticCurveTo(6, 20, 5, 0); c.fill(); c.restore(); }
      // the bloom: the app's own black rose, seen at three-quarter view on its stem
      const RC = roseCanvas();
      c.save(); c.translate(RX, RY - 30); c.rotate(-.14); c.scale(1.3, 1.3 * .8);
      c.drawImage(RC, -100, -100, 200, 200);
      c.restore();
      // the sun coming through the thin outer petals on the far side
      c.save(); c.globalCompositeOperation = "lighter";
      const bg = c.createRadialGradient(RX + 50, RY - 80, 0, RX + 30, RY - 50, 110);
      bg.addColorStop(0, "rgba(255,90,70,.22)"); bg.addColorStop(1, "rgba(255,60,50,0)");
      c.fillStyle = bg; c.fillRect(RX - 120, RY - 170, 260, 240); c.restore();
    });
    x.stage();
    // light raking along the sill, and through the glass
    P.glow(c, VX + 10, SILL - 70, 90, "#ffc8a0", .14 + .14 * rise);
    sheen(c, 80, SILL + 6, 420, 14, "#ffb88a", .25 + .25 * rise);
  };

})();
