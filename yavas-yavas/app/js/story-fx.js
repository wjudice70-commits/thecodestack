/* Our Story: each scene can show its own image (data/story.json "image") with code-drawn effects laid
   over it ("fx"). Until an image exists the painted scene in story-rose.js plays and the effects run over that.
   No libraries. Effect positions are 0..1 of the 9:16 picture, so they sit on the same spot at any size.
   Effects: petals, wisps, steam, smoke, heat, rain, snow, dust, bokeh, embers, flicker, mist, glitter. */
(() => {
  "use strict";
  const { lerp, clamp, rng } = YY;
  const TAU = Math.PI * 2;
  const COL = { warm: "255,186,116", gold: "255,226,170", cool: "190,210,255", white: "255,244,232", smoke: "150,140,135", rose: "255,90,110", ember: "255,140,60" };
  const rgb = (n) => COL[n] || n || COL.warm;
  const sprites = {};
  function sprite(n) {   // a soft round light, made once per colour
    if (sprites[n]) return sprites[n];
    const s = document.createElement("canvas"); s.width = s.height = 64;
    const c = s.getContext("2d"), g = c.createRadialGradient(32, 32, 0, 32, 32, 32), k = rgb(n);
    g.addColorStop(0, `rgba(${k},1)`); g.addColorStop(.35, `rgba(${k},.42)`); g.addColorStop(1, `rgba(${k},0)`);
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    return (sprites[n] = s);
  }
  const blob = (c, n, x, y, r, a) => { if (a > .002) { c.globalAlpha = a; c.drawImage(sprite(n), x - r, y - r, r * 2, r * 2); } };
  const wave = (t, ph) => .5 + .22 * Math.sin(t * 7.3 + ph) + .16 * Math.sin(t * 13.1 + ph * 2) + .12 * Math.sin(t * 3.1 + ph * 3);
  let petal;

  // F = the picture's box on screen: { x, y, w, h }. Every effect is stateless: a function of time only.
  const FX = {
    petals(c, F, t, o, R) {
      petal = petal || new Path2D(YY.Rose.petalPath(30, 40, .3));
      const n = o.n || 14, up = o.dir === "rise", [rx, , rw] = o.region || [0, 0, 1];
      for (let i = 0; i < n; i++) {
        const ph = R(), sp = lerp(.035, .07, R()) * (o.speed || 1), life = (t * sp + ph) % 1, near = R();
        const y = up ? lerp(1.05, -.08, life) : lerp(-.08, 1.05, life);
        const x = rx + R() * rw + Math.sin(t * .55 + ph * 9) * .05 + (o.wind || .06) * life;
        const s = F.w * lerp(.0011, .0026, near) * (o.size || 1);
        c.save(); c.translate(F.x + x * F.w, F.y + y * F.h); c.rotate(t * lerp(-.6, .6, R()) + ph * 9);
        c.scale(s * Math.cos(t * lerp(.8, 1.8, R()) + ph * 5), s * .6);
        c.globalAlpha = lerp(.55, .95, near) * clamp(Math.sin(life * Math.PI) * 4);
        const g = c.createRadialGradient(-6, -26, 2, 0, -18, 44);
        g.addColorStop(0, "#ff6a7e"); g.addColorStop(.55, "#8a1426"); g.addColorStop(1, "#2a0510");
        c.fillStyle = g; c.fill(petal); c.restore();
      }
    },
    wisps(c, F, t, o, R) {   // candle smoke: thin threads curling up from each flame
      const h = (o.h || .14) * F.h, k = rgb(o.color || "white");
      c.lineCap = "round";
      for (const [px, py] of o.at || [[.5, .5]]) for (let s = 0; s < 2; s++) {
        const ph = R() * 9, x0 = F.x + px * F.w, y0 = F.y + py * F.h;
        let lx = x0, ly = y0;
        for (let j = 1; j <= 24; j++) {
          const q = j / 24, x = x0 + Math.sin(q * 5 - t * 1.6 + ph) * q * q * F.w * .03 + Math.sin(t * .4 + ph) * q * F.w * .012, y = y0 - q * h;
          c.strokeStyle = `rgba(${k},${(.32 * (1 - q) * Math.min(1, q * 6)).toFixed(3)})`; c.lineWidth = 1 + q * F.w * .004;
          c.beginPath(); c.moveTo(lx, ly); c.lineTo(x, y); c.stroke(); lx = x; ly = y;
        }
      }
    },
    steam(c, F, t, o, R) {   // soft puffs rising and spreading (steam from tea, bread, a pan)
      const n = o.n || 9, h = (o.h || .18) * F.h, col = o.color || "white";
      for (const [px, py] of o.at || [[.5, .5]]) for (let i = 0; i < n; i++) {
        const ph = R(), life = (t * (o.speed || .16) + ph) % 1;
        const x = F.x + px * F.w + Math.sin(life * 5 + ph * 9) * F.w * .03 * life, y = F.y + py * F.h - life * h;
        blob(c, col, x, y, F.w * lerp(.02, .09, life) * (o.size || 1), (o.a || .16) * Math.sin(life * Math.PI));
      }
    },
    smoke(c, F, t, o, R) { FX.steam(c, F, t, { color: "smoke", speed: .08, size: 1.8, a: .2, h: .3, ...o }, R); },
    rain(c, F, t, o, R) {
      const n = o.n || 140, k = rgb(o.color || "cool"), len = F.h * .045, sl = o.slant ?? .18;
      c.lineWidth = Math.max(1, F.w * .0012); c.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const near = R(), y = ((R() + t * lerp(.9, 1.6, near)) % 1.1) - .05, x = ((R() + y * sl * .3) % 1);
        c.strokeStyle = `rgba(${k},${lerp(.12, .4, near).toFixed(2)})`;
        const X = F.x + x * F.w, Y = F.y + y * F.h, L = len * lerp(.6, 1.3, near);
        c.beginPath(); c.moveTo(X, Y); c.lineTo(X - L * sl, Y + L); c.stroke();
      }
    },
    snow(c, F, t, o, R) {
      for (let i = 0; i < (o.n || 90); i++) {
        const near = R(), y = (R() + t * lerp(.02, .06, near)) % 1, x = (R() + Math.sin(t * .5 + i) * .02 + y * .05) % 1;
        blob(c, "white", F.x + x * F.w, F.y + y * F.h, F.w * lerp(.003, .009, near), lerp(.35, .9, near));
      }
    },
    dust(c, F, t, o, R) {   // motes drifting in a beam of light
      const [rx, ry, rw, rh] = o.region || [0, 0, 1, 1];
      for (let i = 0; i < (o.n || 50); i++) {
        const ph = R() * 9, x = rx + ((R() + Math.sin(t * .1 + ph) * .04) % 1) * rw, y = ry + (((R() - t * lerp(.004, .016, R())) % 1) + 1) % 1 * rh;
        blob(c, o.color || "gold", F.x + x * F.w, F.y + y * F.h, F.w * lerp(.002, .006, R()), .5 * (.5 + .5 * Math.sin(t * .7 + ph)));
      }
    },
    bokeh(c, F, t, o, R) {   // big out-of-focus lights twinkling slowly
      const [rx, ry, rw, rh] = o.region || [0, 0, 1, .5];
      for (let i = 0; i < (o.n || 16); i++) {
        const ph = R() * 9, x = rx + R() * rw + Math.sin(t * .07 + ph) * .01, y = ry + R() * rh;
        blob(c, o.color || (R() < .7 ? "warm" : "cool"), F.x + x * F.w, F.y + y * F.h, F.w * lerp(.02, .06, R()), .35 * (.55 + .45 * Math.sin(t * lerp(.3, .9, R()) + ph)));
      }
    },
    embers(c, F, t, o, R) {   // sparks rising from a point or a band
      const [rx, ry, rw] = o.region || [.3, .7, .4];
      for (let i = 0; i < (o.n || 26); i++) {
        const ph = R(), life = (t * lerp(.08, .2, R()) + ph) % 1, x = rx + R() * rw + Math.sin(life * 9 + ph * 9) * .02, y = ry - life * (o.h || .5);
        blob(c, "ember", F.x + x * F.w, F.y + y * F.h, F.w * lerp(.003, .008, R()), .9 * Math.sin(life * Math.PI) * wave(t, ph * 9));
      }
    },
    flicker(c, F, t, o, R) {   // the warm light of a flame or a lamp, breathing on the walls
      for (const [px, py] of o.at || [[.5, .5]]) {
        const ph = R() * 9;
        blob(c, o.color || "warm", F.x + px * F.w, F.y + py * F.h, F.w * (o.r || .35), (o.a || .35) * wave(t, ph));
      }
    },
    mist(c, F, t, o, R) {   // low fog drifting across water or a street
      const y0 = o.y ?? .62, h = o.h || .16;
      for (let i = 0; i < (o.n || 7); i++) {
        const x = ((R() + t * lerp(.004, .012, R())) % 1.4) - .2, y = y0 + R() * h, r = F.w * lerp(.25, .45, R());
        c.save(); c.translate(F.x + x * F.w, F.y + y * F.h); c.scale(1, .28);
        c.globalAlpha = (o.a || .1) * (.6 + .4 * Math.sin(t * .2 + i));
        c.drawImage(sprite(o.color || "smoke"), -r, -r, r * 2, r * 2); c.restore();
      }
    },
    glitter(c, F, t, o, R) {   // light dancing on water
      const [rx, ry, rw, rh] = o.region || [.2, .6, .6, .15];
      for (let i = 0; i < (o.n || 60); i++) {
        const ph = R() * 9, s = Math.max(0, Math.sin(t * lerp(1.5, 4, R()) + ph)) ** 6;
        blob(c, o.color || "gold", F.x + (rx + R() * rw) * F.w, F.y + (ry + R() * rh) * F.h, F.w * lerp(.003, .008, R()), s);
      }
    },
  };
  const ADD = new Set(["dust", "bokeh", "embers", "flicker", "glitter"]);   // light adds to light

  // The picture's box on screen: cover on a phone; on a wide screen the portrait sits in the middle
  // over a dark, blurred copy of itself (like the Flow films).
  function frame(W, H, aspect, zoom = 1, pan = 0) {
    let w, h;
    if (W / H > .8) { h = H; w = H * aspect; } else { const s = Math.max(W / aspect, H); w = s * aspect; h = s; }
    w *= zoom; h *= zoom;
    return { x: (W - w) / 2 + pan * W * .015, y: (H - h) / 2, w, h };
  }

  function drawFx(c, F, t, list) {
    (list || []).forEach((o, k) => {
      const f = FX[o.type]; if (!f) return;
      c.save(); c.globalCompositeOperation = ADD.has(o.type) ? "lighter" : "source-over";
      f(c, F, t, o, rng(31 + k * 7)); c.restore();
    });
  }

  // Heat haze: the image redrawn in thin rows, each nudged sideways, inside a region.
  function heat(c, img, F, t, o) {
    const [rx, ry, rw, rh] = o.region || [.2, .3, .6, .3], sx = img.naturalWidth / F.w, sy = img.naturalHeight / F.h, row = 3;
    const x0 = F.x + rx * F.w, w = rw * F.w, y0 = F.y + ry * F.h, h = rh * F.h, amp = (o.amp || 3);
    for (let y = 0; y < h; y += row) {
      const fade = Math.sin((y / h) * Math.PI), dx = Math.sin(y * .09 - t * 3.2) * amp * fade + Math.sin(y * .23 + t * 1.7) * amp * .4 * fade;
      c.drawImage(img, (x0 - F.x) * sx, (y0 + y - F.y) * sy, w * sx, row * sy, x0 + dx, y0 + y, w, row);
    }
  }

  const backs = new WeakMap();
  function backdrop(img) {   // a small, dark, blurred copy for the sides on a wide screen
    if (backs.has(img)) return backs.get(img);
    const b = document.createElement("canvas"); b.width = 160; b.height = 90;
    const c = b.getContext("2d"); c.filter = "blur(8px) brightness(.35) saturate(1.2)";
    c.drawImage(img, 0, img.naturalHeight * .3, img.naturalWidth, img.naturalWidth * 9 / 16, -10, -10, 180, 110);
    backs.set(img, b); return b;
  }

  YY.StoryFx = {
    FX, frame, drawFx,
    // photo canvas: the image with a slow push-in (and heat haze); fx canvas: everything else.
    drawPhoto(cv, img, k, t, list) {
      const D = Math.min(devicePixelRatio || 1, 1.5), W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== Math.round(W * D)) { cv.width = Math.round(W * D); cv.height = Math.round(H * D); }
      const c = cv.getContext("2d"); c.setTransform(D, 0, 0, D, 0, 0); c.clearRect(0, 0, W, H);
      if (!img) return null;
      const F = frame(W, H, img.naturalWidth / img.naturalHeight, YY.reduceMotion ? 1.02 : lerp(1.02, 1.1, k), YY.reduceMotion ? 0 : lerp(-1, 1, k));
      if (W / H > .8) c.drawImage(backdrop(img), 0, 0, W, H);
      c.drawImage(img, F.x, F.y, F.w, F.h);
      if (W / H > .8) {   // feather the picture's edges into the backdrop
        for (const [a, b] of [[F.x, F.x + F.w * .12], [F.x + F.w, F.x + F.w * .88]]) {
          const g = c.createLinearGradient(a, 0, b, 0); g.addColorStop(0, "rgba(0,0,0,.85)"); g.addColorStop(1, "rgba(0,0,0,0)");
          c.fillStyle = g; c.fillRect(Math.min(a, b), 0, Math.abs(b - a), H);
        }
      }
      for (const o of list || []) if (o.type === "heat") heat(c, img, F, t, o);
      return F;
    },
  };
})();
