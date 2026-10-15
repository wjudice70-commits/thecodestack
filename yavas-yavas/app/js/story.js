/* Our Story: one painter per scene. Props live on the 1000×1000 stage (x, y in -500..500).
   No faces anywhere: the story is told with light, objects and places. */
(() => {
  "use strict";
  const { lerp, clamp, rng, noise, rgba, mix, smooth, DPR } = YY;
  const P = YY.paint;
  const S = (YY.storyScenes = {});

  // Shared: a dark interior wall with a floor line, lit from a point.
  function room(x, wall = "#120b0a", floor = "#0a0606", floorY = 140, lx = 0, ly = -200, warmth = .18) {
    const { c, W, H } = x;
    x.full();
    P.fillAll(c, W, H, [[0, mix(wall, "#000000", .55)], [.5, wall], [1, mix(wall, "#000000", .7)]]);
    const fy = x.sy(floorY);
    c.fillStyle = P.vgrad(c, 0, fy, 0, H, [[0, floor], [1, "#020101"]]);
    c.fillRect(0, fy, W, H - fy);
    P.glow(c, x.sx(lx), x.sy(ly), x.S * .9, "#ff9a4a", warmth);
  }

  function windowFrame(c, x0, y0, w, h, frame = "#070505", bars = 1) {
    c.strokeStyle = frame; c.lineWidth = 16; c.strokeRect(x0, y0, w, h);
    c.lineWidth = 8;
    if (bars) { c.beginPath(); c.moveTo(x0 + w / 2, y0); c.lineTo(x0 + w / 2, y0 + h); c.moveTo(x0, y0 + h * .45); c.lineTo(x0 + w, y0 + h * .45); c.stroke(); }
  }

  function tableTop(c, y, color = "#2a1810", edge = "#120a06") {
    c.fillStyle = P.vgrad(c, 0, y, 0, 520, [[0, mix(color, "#ffcf9a", .12)], [.25, color], [1, edge]]);
    c.fillRect(-900, y, 1800, 600);
    c.fillStyle = "rgba(255,200,140,.08)"; c.fillRect(-900, y, 1800, 3);
  }

  /* 1. The lake, the third floor */
  S.lake = (x) => {
    const { c, W, H, t, m } = x;
    if (!m.i) { m.i = 1; m.stars = P.starSet(4, 160, .5); m.shore = P.bokehSet(9, 70, [-1400, 0, 1400, 0], [2, 7], ["#ffcf8a", "#ffe6c0", "#ff9a6a", "#bcd2ff"]); }
    x.full();
    const hz = x.sy(60);
    P.fillAll(c, W, H, [[0, "#02030a"], [hz / H * .7, "#0a1024"], [hz / H, "#231a33"], [Math.min(1, hz / H + .001), "#03050c"], [1, "#010207"]]);
    P.stars(c, m.stars, W, H * (hz / H) * 1.6, t, .9);
    const mx = x.sx(-330), my = x.sy(-360);
    P.glow(c, mx, my, x.S * .35, "#c9d6ff", .18);
    c.fillStyle = "#e9ecf5"; c.beginPath(); c.arc(mx, my, x.S * .035, 0, 7); c.fill();
    // far shore: a low dark band with lights
    c.fillStyle = "#05060b"; c.fillRect(0, hz - x.S * .02, W, x.S * .02 + 2);
    x.stage();
    for (const b of m.shore) { b.y = 58; }
    P.bokeh(c, m.shore.map(b => ({ ...b, r: b.r, y: 54 })), t);
    x.full();
    P.reflections(c, [{ x: mx, c: "#dfe6ff", a: .7, w: x.S * .05 }, ...m.shore.slice(0, 26).map(b => ({ x: x.sx(b.x), c: b.c, a: .35, w: 6 * DPR }))], hz + 2, H, t, W);
    // the building, third floor lit
    x.stage();
    c.fillStyle = P.vgrad(c, 120, 0, 560, 0, [[0, "#0e0c12"], [1, "#050407"]]);
    c.fillRect(150, -560, 700, 1100);
    c.fillStyle = "rgba(150,170,220,.12)"; c.fillRect(150, -560, 3, 1100);   // moon on the corner
    const floors = [400, 250, 100, -50, -200, -350];
    floors.forEach((fy, fi) => {
      for (let col = 0; col < 3; col++) {
        const wx = 190 + col * 120, lit = fi === 2 && col < 2;
        if (lit) {
          const fl = .85 + .15 * noise(t * .7 + col);
          const g = c.createLinearGradient(0, fy - 90, 0, fy);
          g.addColorStop(0, rgba("#ffcf8a", .95 * fl)); g.addColorStop(1, rgba("#ff8a3a", .85 * fl));
          c.fillStyle = g; c.fillRect(wx, fy - 90, 80, 90);
          c.fillStyle = "rgba(60,20,10,.55)"; c.fillRect(wx, fy - 90, 14, 90); c.fillRect(wx + 66, fy - 90, 14, 90);   // curtains
          P.glow(c, wx + 40, fy - 45, 220, "#ffb35a", .35);
        } else {
          c.fillStyle = (col + fi) % 4 === 1 ? "rgba(90,110,160,.18)" : "rgba(20,22,30,.9)";
          c.fillRect(wx, fy - 90, 80, 90);
        }
      }
      c.fillStyle = "#08070b"; c.fillRect(170, fy + 4, 360, 10);   // balcony ledges
    });
    // a little railing on the lit balcony
    c.strokeStyle = "rgba(255,190,120,.35)"; c.lineWidth = 2;
    for (let i = 0; i < 16; i++) { c.beginPath(); c.moveTo(178 + i * 16, 104); c.lineTo(178 + i * 16, 140); c.stroke(); }
    c.beginPath(); c.moveTo(172, 104); c.lineTo(440, 104); c.stroke();
  };

  /* 2. Two candles leaning together while the night turns to morning */
  S.candles = (x) => {
    const { c, t, u } = x;
    room(x, "#120c0d", "#0a0607", 170, 0, 80, .12);
    x.stage();
    const day = smooth(.2, 1, u);
    const sky = P.vgrad(c, 0, -440, 0, 40, [[0, mix("#05060f", "#3a4d7a", day)], [.7, mix("#0b0d1c", "#e8a07a", day)], [1, mix("#120d18", "#ffd2a0", day)]]);
    c.fillStyle = sky; c.fillRect(-300, -440, 600, 470);
    P.glow(c, 0, 40, 380 * day + 1, "#ffb37a", .35 * day);
    windowFrame(c, -300, -440, 600, 470);
    tableTop(c, 170, "#1c100c");
    const lean = .5 + .5 * Math.sin(t * .4);
    P.candle(c, -48, 170, 34, 230, t, 1, { lean: 1 });
    P.candle(c, 52, 170, 34, 196, t, 2, { lean: -1 });
    // the two flames bend toward each other
    P.glow(c, 2, -60, 160, "#ffcf8a", .18 + .06 * lean);
    // reflections on the table
    c.globalAlpha = .25; c.fillStyle = "rgba(255,190,120,.6)"; c.fillRect(-60, 176, 26, 70); c.fillRect(40, 176, 26, 60); c.globalAlpha = 1;
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

  /* 7. "I'm the tired one": a door, two coats, the night outside */
  S.door = (x) => {
    const { c, W, H, t } = x;
    room(x, "#0d0a0c", "#080607", 260, 160, 0, .05);
    x.stage();
    // the open door with warm light spilling in
    c.fillStyle = P.vgrad(c, 0, -420, 0, 260, [[0, "#ffcf8a"], [1, "#ff9a4a"]]);
    c.fillRect(40, -420, 260, 680);
    P.glow(c, 170, -100, 600, "#ffb35a", .25);
    c.fillStyle = "rgba(255,180,100,.25)"; c.beginPath(); c.moveTo(40, 260); c.lineTo(300, 260); c.lineTo(520, 520); c.lineTo(-120, 520); c.fill();
    c.fillStyle = "#080506"; c.beginPath(); c.moveTo(300, -420); c.lineTo(420, -460); c.lineTo(420, 320); c.lineTo(300, 260); c.fill();   // the door leaf
    c.fillStyle = "#c9a24a"; c.beginPath(); c.arc(395, -60, 6, 0, 7); c.fill();
    // two coats on hooks
    const coat = (cx, col) => {
      c.fillStyle = "#2a2018"; c.fillRect(cx - 4, -360, 8, 16);
      c.fillStyle = col; c.beginPath(); c.moveTo(cx - 20, -346); c.lineTo(cx - 80, -260); c.lineTo(cx - 90, 60); c.lineTo(cx + 90, 60); c.lineTo(cx + 80, -260); c.lineTo(cx + 20, -346); c.fill();
      c.fillStyle = "rgba(255,180,100,.1)"; c.fillRect(cx + 50, -260, 30, 300);
    };
    coat(-330, "#1a1214"); coat(-170, "#2a1620");
    // keys on the hall table
    tableTop(c, 190, "#1a100c");
    c.strokeStyle = "#d8c08a"; c.lineWidth = 3; c.beginPath(); c.arc(-250, 215, 12, 0, 7); c.stroke();
    c.fillStyle = "#d8c08a"; c.fillRect(-240, 210, 34, 6);
    P.glow(c, -240, 214, 40, "#ffe0a0", .3 + .2 * Math.sin(t * 2));
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
    const { c, W, H, t } = x;
    x.full(); P.fillAll(c, W, H, [[0, "#06060a"], [.6, "#0c0a10"], [1, "#030304"]]);
    x.stage();
    // storefront
    P.glow(c, 0, -60, 700, "#ffc9a8", .22);
    c.fillStyle = P.vgrad(c, 0, -330, 0, 260, [[0, "#3a2a2e"], [1, "#1a1216"]]); c.fillRect(-380, -330, 760, 590);
    c.fillStyle = "#08070a"; c.fillRect(-420, -420, 840, 90);
    P.script(c, "Splash", 0, -375, 78, "#ff8ab0", 1);
    P.glow(c, 0, -375, 220, "#ff6aa0", .3 + .05 * Math.sin(t * 3));
    // shelves of soap and candles
    const R = rng(7), pastel = ["#f4b6c8", "#b8e0d2", "#f8e3a0", "#cdb8f0", "#ffd0b0", "#a8d0f0", "#fff3e8"];
    for (let s = 0; s < 4; s++) {
      const sy = -240 + s * 130;
      c.fillStyle = "#c9b8a8"; c.fillRect(-360, sy + 70, 720, 8);
      for (let i = 0; i < 14; i++) {
        const bx = -350 + i * 50 + R() * 6;
        if ((i + s) % 4 === 0) {
          c.fillStyle = "rgba(255,240,220,.25)"; c.fillRect(bx, sy + 18, 34, 52);
          P.candle(c, bx + 17, sy + 66, 22, 30, t, i + s * 9, { glow: .5, wax: pastel[(i + s) % 7] });
        } else {
          for (let k = 0; k < 3; k++) { c.fillStyle = mix(pastel[(i * 3 + k + s) % 7], "#000000", .1 * k); c.fillRect(bx, sy + 70 - (k + 1) * 18, 40, 16); }
        }
      }
    }
    // mall floor reflection
    x.full();
    const fy = x.sy(260);
    c.fillStyle = P.vgrad(c, 0, fy, 0, H, [[0, "#141016"], [1, "#040305"]]); c.fillRect(0, fy, W, H - fy);
    P.reflections(c, [{ x: x.sx(0), c: "#ffc9a8", a: .4, w: x.S * .55 }], fy, H, t * .3, W);
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
    if (!m.i) { m.i = 1; m.dust = P.starSet(19, 120, 1); }
    x.full(); P.fillAll(c, W, H, [[0, "#040306"], [1, "#020203"]]);
    x.stage();
    const flick = .8 + .2 * noise(t * 3);
    const scr = P.vgrad(c, -420, -460, 420, -120, [[0, mix("#3a6aa8", "#e8b070", .5 + .5 * Math.sin(t * .3))], [1, mix("#a83a4a", "#7ab0e0", .5 + .5 * Math.sin(t * .23))]]);
    c.globalAlpha = flick; c.fillStyle = scr; c.fillRect(-420, -460, 840, 340); c.globalAlpha = 1;
    P.glow(c, 0, -290, 800, "#9ab4ff", .18 * flick);
    // projector beam from behind
    c.save(); c.globalCompositeOperation = "lighter";
    const beam = c.createLinearGradient(0, 520, 0, -300); beam.addColorStop(0, "rgba(255,240,210,.18)"); beam.addColorStop(1, "rgba(255,240,210,0)");
    c.fillStyle = beam; c.beginPath(); c.moveTo(-20, 560); c.lineTo(-420, -460); c.lineTo(420, -460); c.lineTo(20, 560); c.fill();
    for (const d of m.dust) { const dy = 520 - ((d.y + t * .02) % 1) * 980, spread = (520 - dy) / 980 * 400; c.fillStyle = `rgba(255,240,220,${.5 * d.s / 1.5})`; c.fillRect((d.x - .5) * 2 * spread, dy, 2, 2); }
    c.restore();
    // seat rows
    for (let r = 0; r < 4; r++) {
      const ry = 40 + r * 120, n = 8 + r * 2, w = 1100 / n;
      for (let i = 0; i < n; i++) {
        const sx = -560 + i * w + (r % 2) * w / 2;
        c.fillStyle = mix("#140c10", "#050304", r / 4);
        c.beginPath(); c.roundRect(sx + 4, ry, w - 8, 140, [26, 26, 4, 4]); c.fill();
        c.fillStyle = `rgba(150,170,220,${.08 * flick})`; c.fillRect(sx + 10, ry + 2, w - 20, 3);
      }
    }
    // popcorn between our two seats
    const px = 40, py = 230;
    c.fillStyle = "#f4efe6"; c.beginPath(); c.moveTo(px - 50, py - 60); c.lineTo(px - 38, py + 60); c.lineTo(px + 38, py + 60); c.lineTo(px + 50, py - 60); c.fill();
    c.fillStyle = "#c42a2a"; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(px - 48 + i * 26, py - 60); c.lineTo(px - 37 + i * 20, py + 60); c.lineTo(px - 27 + i * 20, py + 60); c.lineTo(px - 35 + i * 26, py - 60); c.fill(); }
    const R = rng(4); for (let i = 0; i < 22; i++) { c.fillStyle = mix("#fff6d8", "#f0c870", R()); c.beginPath(); c.arc(px - 46 + R() * 92, py - 64 - R() * 30, 9 + R() * 5, 0, 7); c.fill(); }
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
