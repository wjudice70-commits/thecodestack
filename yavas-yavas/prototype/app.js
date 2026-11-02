/* Yavaş Yavaş prototype.
   No libraries: SVG for the rose, canvas for dust/city/grain, CSS for the timing.
   Everything is procedural, so there are no avatar or city illustrations to go stale. */

(() => {
  "use strict";

  const STEPS = 7;                 // one outer petal per journey step
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const $ = (s, el = document) => el.querySelector(s);
  const SVGNS = "http://www.w3.org/2000/svg";
  const lerp = (a, b, t) => a + (b - a) * t;

  // Seeded random so the rose and skyline look identical on every visit.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const reseed = (s) => { seed = s; };

  /* ------------------------------------------------------------------ */
  /* Petal geometry, shared by the rose, the falling petal and the dots */

  function petalPath(r, w, point = 0) {
    const tip = 1.05 + .07 * point, sh = .2 - .08 * point;
    return [
      `M ${-w * .34} ${r * .04}`,
      `C ${-w * .64} ${-r * .26} ${-w * .62} ${-r * .84} ${-w * sh} ${-r * .98}`,
      `Q 0 ${-r * tip} ${w * sh} ${-r * .98}`,
      `C ${w * .62} ${-r * .84} ${w * .64} ${-r * .26} ${w * .34} ${r * .04}`,
      `Q 0 ${r * .2} ${-w * .34} ${r * .04} Z`,
    ].join(" ");
  }
  function el(name, attrs = {}, parent) {
    const n = document.createElementNS(SVGNS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ------------------------------------------------------------------ */
  /* The black rose                                                      */

  function buildRose(svg) {
    reseed(11);
    const defs = el("defs", {}, svg);
    const LIGHT = -2.3;            // key light from upper left (radians, 0 = up)
    const N = 38;
    const golden = 137.508 * Math.PI / 180;

    // Soft shadow each petal casts on the one beneath it.
    const sh = el("filter", { id: "petal-shadow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
    el("feGaussianBlur", { stdDeviation: "7" }, sh);

    // Halo behind the bloom so the black silhouette separates from the black ground.
    const halo = el("radialGradient", { id: "halo" }, defs);
    el("stop", { offset: "0", "stop-color": "#5b0d1b", "stop-opacity": ".55" }, halo);
    el("stop", { offset: ".55", "stop-color": "#2a0510", "stop-opacity": ".25" }, halo);
    el("stop", { offset: "1", "stop-color": "#000", "stop-opacity": "0" }, halo);
    el("circle", { r: 300, fill: "url(#halo)" }, svg);

    const petals = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);                       // 0 = outermost, 1 = heart of the bud
      const r = lerp(262, 26, Math.pow(t, .72)) * lerp(.94, 1.06, rand());
      const w = r * lerp(1.0, 1.75, t);
      const base = r * lerp(.2, .02, t);
      const angle = i * golden + (rand() - .5) * .2;
      petals.push({ i, t, r, w, base, angle });
    }

    // The seven outermost petals are the journey, numbered clockwise from 12 o'clock.
    const journey = petals.slice(0, STEPS)
      .map(p => ({ p, a: ((p.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) }))
      .sort((x, y) => x.a - y.a);
    journey.forEach((j, k) => { j.p.step = k + 1; });

    for (const p of petals) {
      // How squarely this petal faces the key light: 0..1
      const facing = Math.pow(.5 + .5 * Math.cos(p.angle - LIGHT), 1.4);
      const lit = facing * lerp(.7, 1, p.t);
      const gid = `pg${p.i}`, rid = `pr${p.i}`;
      // Body: black at the base, only the very edge turns to deep crimson.
      const g = el("radialGradient", { id: gid, cx: ".5", cy: "1", fx: ".5", fy: "1", r: "1.08" }, defs);
      el("stop", { offset: "0", "stop-color": "#010001" }, g);
      el("stop", { offset: ".5", "stop-color": "#060103" }, g);
      el("stop", { offset: ".8", "stop-color": mix("#0d0205", "#2a0510", lit) }, g);
      el("stop", { offset: "1", "stop-color": mix("#1c0309", "#6e1426", lit) }, g);
      // Rim: a thin line of light along the top edge only.
      const rg = el("linearGradient", { id: rid, x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
      el("stop", { offset: "0", "stop-color": mix("#4a0a16", "#f08a96", lit), "stop-opacity": (.35 + .65 * lit).toFixed(2) }, rg);
      el("stop", { offset: ".3", "stop-color": "#4a0a16", "stop-opacity": ".15" }, rg);
      el("stop", { offset: ".5", "stop-color": "#000", "stop-opacity": "0" }, rg);

      const deg = p.angle * 180 / Math.PI;
      const outer = el("g", { class: p.step ? `petal journey step-${p.step}` : "petal" }, svg);
      const inner = el("g", { transform: `rotate(${deg.toFixed(2)}) translate(0 ${(-p.base).toFixed(2)})` }, outer);
      const d = petalPath(p.r, p.w, 1 - p.t);
      el("path", { d, fill: "#000", opacity: ".9", filter: "url(#petal-shadow)", transform: "translate(0 7) scale(1.05)" }, inner);
      el("path", { d, fill: `url(#${gid})` }, inner);
      el("path", { d, fill: "none", stroke: `url(#${rid})`, "stroke-width": lerp(1.2, 1.8, lit).toFixed(2) }, inner);
      if (p.step === 1) {
        el("path", { d, class: "journey-glow", fill: "none", stroke: `url(#${rid}g)`, "stroke-width": "2",
          style: "filter: drop-shadow(0 0 5px #ff4d62)" }, inner);
        const eg = el("linearGradient", { id: `${rid}g`, x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
        el("stop", { offset: "0", "stop-color": "#ff9aa4" }, eg);
        el("stop", { offset: ".45", "stop-color": "#ff5a6b", "stop-opacity": "0" }, eg);
      }
      p.node = outer;
    }

    // Heart of the bud: a tight dark spiral.
    const heart = el("path", { fill: "none", stroke: "#4a0c17", "stroke-width": "2.2", "stroke-linecap": "round", opacity: ".9" }, svg);
    let hd = "";
    for (let a = 0; a < Math.PI * 5; a += .15) {
      const rr = 2 + a * 2.1;
      hd += `${a ? "L" : "M"} ${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)} `;
    }
    heart.setAttribute("d", hd);

    // Rim light pass from the upper left.
    const rim = el("radialGradient", { id: "rim", cx: "-.1", cy: "-.15", r: ".9" }, defs);
    el("stop", { offset: "0", "stop-color": "#ff7a84", "stop-opacity": ".14" }, rim);
    el("stop", { offset: ".5", "stop-color": "#7a1020", "stop-opacity": ".06" }, rim);
    el("stop", { offset: "1", "stop-color": "#000", "stop-opacity": "0" }, rim);
    el("circle", { r: 290, fill: "url(#rim)", style: "mix-blend-mode: screen; pointer-events: none" }, svg);

    return petals.find(p => p.step === 1);
  }

  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map(s => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, Math.max(0, Math.min(1, t)))));
    return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
  }

  /* ------------------------------------------------------------------ */
  /* Canvas helpers                                                      */

  function fitCanvas(c) {
    const r = c.getBoundingClientRect();
    c.width = Math.max(1, Math.round(r.width * DPR));
    c.height = Math.max(1, Math.round(r.height * DPR));
    return c.getContext("2d");
  }

  function bokehSprite(color, size = 128, hard = .55) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, color);
    g.addColorStop(hard, color);
    g.addColorStop(Math.min(1, hard + .12), withAlpha(color, .55));
    g.addColorStop(1, withAlpha(color, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    return c;
  }
  const withAlpha = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };

  /* ------------------------------------------------------------------ */
  /* Home: drifting dust in the light                                    */

  function dustScene(canvas) {
    let ctx, W, H, parts;
    const sprites = [bokehSprite("#ffb3a1", 64, .1), bokehSprite("#c23a4c", 64, .2), bokehSprite("#ffe6d0", 64, .05)];
    function reset() {
      ctx = fitCanvas(canvas); W = canvas.width; H = canvas.height;
      reseed(3);
      parts = Array.from({ length: 70 }, () => {
        const near = rand() < .12;
        return {
          x: rand() * W, y: rand() * H,
          s: (near ? lerp(18, 44, rand()) : lerp(1.5, 5, rand())) * DPR,
          vy: -(near ? lerp(4, 9, rand()) : lerp(2, 7, rand())) * DPR,
          vx: (rand() - .5) * 3 * DPR,
          a: near ? lerp(.04, .1, rand()) : lerp(.15, .55, rand()),
          ph: rand() * 6.28, sp: sprites[(rand() * 3) | 0],
        };
      });
    }
    function frame(dt, t) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * .3 + p.ph) * 2 * DPR) * dt;
        if (p.y < -60) { p.y = H + 40; p.x = rand() * W; }
        ctx.globalAlpha = p.a * (.6 + .4 * Math.sin(t * .8 + p.ph));
        ctx.drawImage(p.sp, p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    return { reset, frame };
  }

  /* ------------------------------------------------------------------ */
  /* Chapter one: a night city seen through a long lens                  */

  function cityScene(canvas) {
    let ctx, W, H, layers, live;
    const palette = ["#ffb35a", "#ffd9a8", "#ff7a4d", "#ff4a5a", "#ffe9cc", "#9fc4ff"];

    function tile(w, h, draw) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      draw(c.getContext("2d"), w, h);
      return c;
    }

    function skyline(x, w, h, horizon, opts) {
      // Buildings sharing one silhouette colour, with sparse warm windows.
      let cx = -40 * DPR;
      while (cx < w + 40 * DPR) {
        const bw = lerp(opts.minW, opts.maxW, rand()) * DPR;
        const bh = lerp(opts.minH, opts.maxH, Math.pow(rand(), 1.6)) * h;
        const top = horizon - bh;
        x.fillStyle = opts.color;
        x.fillRect(cx, top, bw, h - top);
        if (rand() < .25) x.fillRect(cx + bw * .45, top - bh * .12, 1.5 * DPR, bh * .12);   // mast
        if (rand() < .35) x.fillRect(cx + bw * .18, top - bh * .07, bw * .64, bh * .07);              // setback
        if (opts.rim) {
          // Faint edge light from the city glow, so towers read as glass and steel, not cut-outs.
          x.fillStyle = opts.rim;
          x.fillRect(cx, top, bw, 1 * DPR);
          x.fillRect(cx + bw - 1.2 * DPR, top, 1.2 * DPR, (h - top) * .5);
        }
        const cols = Math.max(2, Math.floor(bw / (opts.win * 3.2)));
        const rows = Math.floor(bh / (opts.win * 3.4));
        for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) {
          if (rand() > opts.lit) continue;
          x.fillStyle = withAlpha(rand() < .85 ? "#ffc27a" : "#ffe9cc", lerp(.35, .9, rand()));
          x.fillRect(cx + (c + .5) * (bw / cols) - opts.win / 2, top + r * opts.win * 3.4, opts.win, opts.win * 1.25);
        }
        cx += bw + lerp(0, 6, rand()) * DPR;
      }
    }

    function reset() {
      ctx = fitCanvas(canvas); W = canvas.width; H = canvas.height;
      const horizon = H * (W > H ? .7 : .58);
      const TW = Math.round(W * 1.5);
      reseed(21);

      const sky = tile(W, H, (x) => {
        const g = x.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#04040b");
        g.addColorStop(.45, "#110c1e");
        g.addColorStop(horizon / H, "#4a1a2c");
        g.addColorStop(Math.min(1, horizon / H + .08), "#120910");
        g.addColorStop(1, "#060406");
        x.fillStyle = g; x.fillRect(0, 0, W, H);
        // Sodium-light haze bleeding up from the streets
        const h = x.createRadialGradient(W * .6, horizon, 0, W * .6, horizon, W * .8);
        h.addColorStop(0, "rgba(255,130,80,.3)"); h.addColorStop(1, "rgba(255,120,70,0)");
        x.fillStyle = h; x.fillRect(0, 0, W, H);
      });

      // Far lights, fully out of focus.
      const sprites = palette.map(c => bokehSprite(c, 96, .6));
      const far = tile(TW, H, (x) => {
        x.globalCompositeOperation = "lighter";
        for (let i = 0; i < 320; i++) {
          const s = lerp(4, 22, Math.pow(rand(), 2)) * DPR;
          const px = rand() * TW, py = horizon - Math.pow(rand(), 1.4) * H * .38 + rand() * H * .06;
          x.globalAlpha = lerp(.22, .8, rand());
          const sp = sprites[(rand() * (rand() < .08 ? 6 : 5)) | 0];
          for (const off of [0, -TW, TW]) x.drawImage(sp, px - s + off, py - s, s * 2, s * 2);
        }
      });

      // Distant skyline, slightly soft.
      // Rendered at a third of the size and scaled up: a cheap, soft defocus
      // (canvas blur filters are very slow on low-end phones).
      const midSmall = tile(Math.ceil(TW / 3), Math.ceil(H / 3), (x) => {
        x.scale(1 / 3, 1 / 3);
        skyline(x, TW, H, horizon + 2, { color: "#0d0a16", minW: 24, maxW: 70, minH: .06, maxH: .22, win: 2.4 * DPR, lit: .2 });
      });
      const mid = tile(TW, H, (x) => {
        x.imageSmoothingQuality = "high";
        x.drawImage(midSmall, 0, 0, TW, H);
      });

      // Near skyline, in focus: this is the focal plane.
      const near = tile(TW, H, (x) => {
        skyline(x, TW, H, horizon + H * .06, { color: "#040307", rim: "rgba(255,140,120,.12)", minW: 40, maxW: 120, minH: .14, maxH: .42, win: 2.2 * DPR, lit: .13 });
        const g = x.createLinearGradient(0, horizon, 0, H);
        g.addColorStop(0, "rgba(4,3,7,0)"); g.addColorStop(.4, "#040307");
        x.fillStyle = g; x.fillRect(0, horizon, TW, H - horizon);
      });

      // Foreground: big soft discs drifting past the lens.
      const fgSprites = [bokehSprite("#7a1626", 128, .5), bokehSprite("#ff9a6a", 128, .55)];
      const fg = tile(TW, H, (x) => {
        x.globalCompositeOperation = "lighter";
        for (let i = 0; i < 14; i++) {
          const s = lerp(40, 110, rand()) * DPR;
          const px = rand() * TW, py = lerp(.05, .95, rand()) * H;
          x.globalAlpha = lerp(.05, .14, rand());
          for (const off of [0, -TW, TW]) x.drawImage(fgSprites[i % 2], px - s + off, py - s, s * 2, s * 2);
        }
      });

      layers = [
        { c: far, speed: 5 * DPR },
        { c: mid, speed: 9 * DPR },
        { c: near, speed: 15 * DPR },
        { c: fg, speed: 34 * DPR, alpha: 1 },
      ];
      // A handful of lights that breathe, so the frame never looks frozen.
      live = Array.from({ length: 26 }, () => ({
        x: rand() * TW, y: horizon - rand() * H * .3, s: lerp(5, 16, rand()) * DPR,
        sp: sprites[(rand() * 5) | 0], ph: rand() * 6.28, f: lerp(.3, 1.1, rand()),
      }));
      ctx._sky = sky; ctx._TW = TW;
    }

    function frame(dt, t) {
      const TW = ctx._TW;
      ctx.drawImage(ctx._sky, 0, 0);
      const bob = Math.sin(t * .18) * 3 * DPR;
      layers.forEach((L, k) => {
        const off = -((t * L.speed) % TW);
        const y = bob * (k + 1) * .4;
        ctx.globalAlpha = L.alpha ?? 1;
        ctx.drawImage(L.c, off, y);
        ctx.drawImage(L.c, off + TW, y);
        if (k === 0) {
          ctx.globalCompositeOperation = "lighter";
          for (const p of live) {
            ctx.globalAlpha = .4 + .35 * Math.sin(t * p.f + p.ph);
            const px = ((p.x - t * L.speed) % TW + TW) % TW;
            ctx.drawImage(p.sp, px - p.s, p.y + y - p.s, p.s * 2, p.s * 2);
          }
          ctx.globalCompositeOperation = "source-over";
        }
      });
      ctx.globalAlpha = 1;
    }
    return { reset, frame };
  }

  /* ------------------------------------------------------------------ */
  /* The petal that falls from the rose into chapter one                 */

  function fallingPetal(svg) {
    const defs = el("defs", {}, svg);
    const g = el("radialGradient", { id: "fp", cx: ".5", cy: "1", fx: ".5", fy: "1", r: "1.08" }, defs);
    el("stop", { offset: "0", "stop-color": "#030001" }, g);
    el("stop", { offset: ".55", "stop-color": "#12030a" }, g);
    el("stop", { offset: ".85", "stop-color": "#3a0814" }, g);
    el("stop", { offset: "1", "stop-color": "#8a2034" }, g);
    const rg = el("linearGradient", { id: "fpr", x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
    el("stop", { offset: "0", "stop-color": "#ff9aa4" }, rg);
    el("stop", { offset: ".4", "stop-color": "#ff9aa4", "stop-opacity": "0" }, rg);
    const d = petalPath(74, 54, .9);
    el("path", { d, fill: "url(#fp)", transform: "translate(0 22)" }, svg);
    el("path", { d, fill: "none", stroke: "url(#fpr)", "stroke-width": "1.6", transform: "translate(0 22)" }, svg);

    return function frame(t, W, H) {
      const cycle = 16, u = (t % cycle) / cycle;
      const x = lerp(W * .78, W * .42, u) + Math.sin(u * 9) * W * .05;
      const y = lerp(-H * .12, H * .62, u);
      const spin = u * 520, flip = Math.cos(u * 11);
      const a = Math.min(1, u * 6) * Math.min(1, (1 - u) * 4);
      svg.style.transform = `translate(${x}px, ${y}px) rotate(${spin}deg) scale(${flip.toFixed(3)}, 1)`;
      svg.style.opacity = (a * .95).toFixed(3);
    };
  }

  /* ------------------------------------------------------------------ */
  /* Film grain: one noise tile, jittered by CSS at 24 fps (see .grain) */

  function grain(node) {
    const c = document.createElement("canvas"), n = 256;
    c.width = c.height = n;
    const x = c.getContext("2d"), img = x.createImageData(n, n);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    node.style.backgroundImage = `url(${c.toDataURL()})`;
  }

  /* ------------------------------------------------------------------ */
  /* Wiring                                                              */

  const home = $("#home"), step1 = $("#step-1"), curtain = $(".curtain");
  const petal1 = buildRose($(".rose"));
  const dust = dustScene($(".dust"));
  const city = cityScene($(".city"));
  const fall = fallingPetal($(".falling-petal"));
  grain($(".grain"));

  // Progress petals in the chapter header.
  const dots = $(".petals");
  for (let k = 1; k <= STEPS; k++) {
    const li = document.createElement("li");
    li.setAttribute("aria-label", `Chapter ${k}${k === 1 ? ", current" : ""}`);
    const s = el("svg", { viewBox: "-40 -80 80 96" });
    el("path", { d: petalPath(70, 52, 1), fill: k === 1 ? "#c43a50" : "rgba(220,170,160,.22)", stroke: k === 1 ? "#f0a0a8" : "none", "stroke-width": "6" }, s);
    li.appendChild(s); dots.appendChild(li);
  }

  let current = null, sceneStart = 0;

  function show(id) {
    for (const s of [home, step1]) {
      const on = s.id === id;
      s.hidden = !on;
      s.classList.remove("is-in", "is-leaving");
    }
    current = id;
    sceneStart = performance.now() / 1000;
    if (id === "home") dust.reset(); else city.reset();
    leaveAnims.forEach(a => a.cancel()); leaveAnims = [];
    liftSvg.replaceChildren();
    if (petal1) petal1.node.style.opacity = "";
    void document.body.offsetWidth;                      // restart CSS timelines
    (id === "home" ? home : step1).classList.add("is-in");
  }

  const roseWrap = $(".rose-wrap"), roseSvg = $(".rose"), liftSvg = $(".lift");
  let leaveAnims = [];

  function go(id) {
    if (id === current) return;
    const leavingHome = current === "home";
    if (leavingHome && petal1 && !reduceMotion) {
      // The first journey petal lets go of the rose and drifts toward the lens,
      // while the rose sinks back into the dark behind it.
      const clone = petal1.node.cloneNode(true);
      liftSvg.style.transform = getComputedStyle(roseSvg).transform;
      liftSvg.appendChild(clone);
      petal1.node.style.opacity = "0";
      const a = petal1.angle, side = Math.sin(a) >= 0 ? 1 : -1;
      const dx = Math.sin(a) * 120 + side * 40, dy = -Math.cos(a) * 120 - 60;
      leaveAnims = [
        clone.animate([
          { transform: "translate(0px, 0px) rotate(0deg) scale(1)", opacity: 1 },
          { transform: `translate(${dx * .3}px, ${dy * .3}px) rotate(${side * 12}deg) scale(1.08)`, opacity: 1, offset: .35 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${side * 46}deg) scale(2.6)`, opacity: 1, offset: .8 },
          { transform: `translate(${dx * 1.3}px, ${dy * 1.3}px) rotate(${side * 60}deg) scale(3.6)`, opacity: 0 },
        ], { duration: 3000, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" }),
        roseWrap.animate([
          { transform: "scale(1)", filter: "brightness(1) blur(0px)" },
          { transform: "scale(1.18)", filter: "brightness(.22) blur(5px)" },
        ], { duration: 2800, delay: 300, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }),
      ];
      home.classList.add("is-leaving");
    }
    const hold = leavingHome && !reduceMotion ? 2300 : 0;
    setTimeout(() => {
      curtain.classList.remove("is-open");
      setTimeout(() => {
        history.replaceState(null, "", "#" + id);
        show(id);
        requestAnimationFrame(() => curtain.classList.add("is-open"));
      }, reduceMotion ? 0 : 1100);
    }, hold);
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (b) go(b.dataset.go);
  });

  let resizeT;
  addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => (current === "home" ? dust : city).reset(), 150);
  });

  let prev = performance.now() / 1000;
  function loop(nowMs) {
    const now = nowMs / 1000, dt = Math.min(.05, now - prev); prev = now;
    const t = reduceMotion ? 0 : now - sceneStart;
    if (current === "home") dust.frame(reduceMotion ? 0 : dt, t);
    else {
      city.frame(dt, t + 40);   // start mid-dolly so the first frame is already composed
      fall(t, innerWidth, innerHeight);
    }
    requestAnimationFrame(loop);
  }

  // Wait for the type so nothing reflows mid-shot, but never hold the intro hostage to a slow network.
  Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]).then(() => {
    show(location.hash === "#step-1" ? "step-1" : "home");
    requestAnimationFrame(() => curtain.classList.add("is-open"));
    requestAnimationFrame(loop);
  });
})();
