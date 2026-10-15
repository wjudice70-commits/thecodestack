/* The black rose. Built once in SVG; the 15 outermost petals are the journey, numbered clockwise.
   bloom(): darkness, then a closed bud, then the petals unfurl from the heart outward into the full rose. */
(() => {
  "use strict";
  const { lerp, clamp, mix, smooth, ease, rng } = YY;
  const NS = "http://www.w3.org/2000/svg";
  const N = 44, STOPS = 15, GOLDEN = 137.508 * Math.PI / 180, LIGHT = -2.3;

  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

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

  const Rose = (YY.Rose = {});

  Rose.build = (svg) => {
    svg.innerHTML = "";
    svg.setAttribute("viewBox", "-320 -320 640 640");
    const R = rng(11);
    const defs = el("defs", {}, svg);
    const sh = el("filter", { id: "petal-shadow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
    el("feGaussianBlur", { stdDeviation: "7" }, sh);
    const glowF = el("filter", { id: "ember", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
    el("feGaussianBlur", { stdDeviation: "4" }, glowF);

    const halo = el("radialGradient", { id: "halo" }, defs);
    el("stop", { offset: "0", "stop-color": "#5b0d1b", "stop-opacity": ".55" }, halo);
    el("stop", { offset: ".55", "stop-color": "#2a0510", "stop-opacity": ".25" }, halo);
    el("stop", { offset: "1", "stop-color": "#000", "stop-opacity": "0" }, halo);
    const haloC = el("circle", { r: 310, fill: "url(#halo)", class: "halo" }, svg);

    const petals = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const r = lerp(268, 24, Math.pow(t, .7)) * lerp(.94, 1.06, R());
      petals.push({ i, t, r, w: r * lerp(1.0, 1.75, t), base: r * lerp(.2, .02, t), angle: i * GOLDEN + (R() - .5) * .2 });
    }
    petals.slice(0, STOPS)
      .map(p => ({ p, a: ((p.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) }))
      .sort((x, y) => x.a - y.a)
      .forEach((j, k) => { j.p.stop = k; });

    // Paint from the outside in so inner petals overlap outer ones.
    for (const p of petals) {
      const facing = Math.pow(.5 + .5 * Math.cos(p.angle - LIGHT), 1.4);
      const lit = facing * lerp(.7, 1, p.t);
      const g = el("radialGradient", { id: `pg${p.i}`, cx: ".5", cy: "1", fx: ".5", fy: "1", r: "1.08" }, defs);
      el("stop", { offset: "0", "stop-color": "#010001" }, g);
      el("stop", { offset: ".5", "stop-color": "#060103" }, g);
      el("stop", { offset: ".8", "stop-color": mix("#0d0205", "#2a0510", lit) }, g);
      el("stop", { offset: "1", "stop-color": mix("#1c0309", "#6e1426", lit) }, g);
      const rg = el("linearGradient", { id: `pr${p.i}`, x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
      el("stop", { offset: "0", "stop-color": mix("#4a0a16", "#f08a96", lit), "stop-opacity": (.35 + .65 * lit).toFixed(2) }, rg);
      el("stop", { offset: ".3", "stop-color": "#4a0a16", "stop-opacity": ".15" }, rg);
      el("stop", { offset: ".5", "stop-color": "#000", "stop-opacity": "0" }, rg);

      const outer = el("g", { class: p.stop !== undefined ? "petal journey" : "petal" }, svg);
      const inner = el("g", {}, outer);
      const d = petalPath(p.r, p.w, 1 - p.t);
      el("path", { d, fill: "#000", opacity: ".9", filter: "url(#petal-shadow)", transform: "translate(0 7) scale(1.05)" }, inner);
      el("path", { d, fill: `url(#pg${p.i})` }, inner);
      el("path", { d, fill: "none", stroke: `url(#pr${p.i})`, "stroke-width": lerp(1.2, 1.8, lit).toFixed(2) }, inner);
      if (p.stop !== undefined) {
        const eg = el("linearGradient", { id: `pe${p.i}`, x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
        el("stop", { offset: "0", "stop-color": "#ff9aa4" }, eg);
        el("stop", { offset: ".5", "stop-color": "#ff5a6b", "stop-opacity": "0" }, eg);
        p.glow = el("path", { d, class: "journey-glow", fill: "none", stroke: `url(#pe${p.i})`, "stroke-width": "2.4", opacity: "0" }, inner);
        p.glowBlur = el("path", { d, fill: "none", stroke: "#ff4d62", "stroke-width": "5", filter: "url(#ember)", opacity: "0" }, inner);
        inner.insertBefore(p.glowBlur, p.glow);
      }
      p.node = outer; p.inner = inner;
    }

    // Heart of the bud.
    let hd = "";
    for (let a = 0; a < Math.PI * 5; a += .15) { const rr = 2 + a * 2.1; hd += `${a ? "L" : "M"} ${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)} `; }
    const heart = el("path", { d: hd, fill: "none", stroke: "#4a0c17", "stroke-width": "2.2", "stroke-linecap": "round", opacity: ".9" }, svg);

    const rim = el("radialGradient", { id: "rim", cx: "-.1", cy: "-.15", r: ".9" }, defs);
    el("stop", { offset: "0", "stop-color": "#ff7a84", "stop-opacity": ".14" }, rim);
    el("stop", { offset: ".5", "stop-color": "#7a1020", "stop-opacity": ".06" }, rim);
    el("stop", { offset: "1", "stop-color": "#000", "stop-opacity": "0" }, rim);
    const rimC = el("circle", { r: 300, fill: "url(#rim)", style: "mix-blend-mode: screen; pointer-events: none" }, svg);

    const rose = { svg, petals, heart, halo: haloC, rim: rimC, journey: petals.filter(p => p.stop !== undefined).sort((a, b) => a.stop - b.stop) };
    Rose.pose(rose, 1);
    return rose;
  };

  /* One frame of the bloom. T: 0 = closed bud, 1 = full rose.
     Each petal opens on its own schedule, heart first, outer petals last, and turns as it unfurls. */
  Rose.pose = (rose, T) => {
    for (const p of rose.petals) {
      const start = lerp(.3, 0, p.t), o = ease(clamp((T - start) / .7));
      // In the bud every petal is wrapped tight around the heart: small, narrow, twisted.
      const s = lerp(Math.min(1, 78 / p.r), 1, o);
      const sx = lerp(.55, 1, o);
      const twist = (1 - o) * lerp(.9, .2, p.t);
      const base = p.base * o;
      const deg = (p.angle + twist) * 180 / Math.PI;
      p.inner.setAttribute("transform", `rotate(${deg.toFixed(2)}) translate(0 ${(-base).toFixed(2)}) scale(${(s * sx).toFixed(3)} ${s.toFixed(3)})`);
      // Outer petals are hidden inside the bud until they begin to open.
      p.node.style.opacity = p.t > .55 ? 1 : clamp(o * 2.5 + (T > 0 ? p.t * .6 : 0)).toFixed(3);
    }
    rose.halo.style.opacity = smooth(.05, .9, T).toFixed(3);
    rose.rim.style.opacity = smooth(.3, 1, T).toFixed(3);
  };

  // Light the petals for stops already reached; the next one breathes faintly.
  Rose.setReached = (rose, reached, fraction = 0) => {
    rose.journey.forEach((p, k) => {
      const on = k < reached ? 1 : k === reached ? .18 + .4 * fraction : 0;
      p.glow.setAttribute("opacity", on.toFixed(2));
      p.glowBlur.setAttribute("opacity", (on * .55).toFixed(2));
      p.node.classList.toggle("reached", k < reached);
      p.node.classList.toggle("next", k === reached);
    });
  };

  /* Play the bloom: ~1.4s of black, the bud fades in, then ~7s to full bloom. */
  Rose.bloom = (rose, { onDone, fast = false } = {}) => {
    const svg = rose.svg, t0 = performance.now();
    const dark = fast ? .2 : 1.4, bud = fast ? .6 : 2.4, open = fast ? 2.2 : 8;
    if (YY.reduceMotion) { Rose.pose(rose, 1); svg.style.opacity = 1; onDone && onDone(); return () => {}; }
    Rose.pose(rose, 0);
    svg.style.opacity = 0;
    let raf, stopped = false;
    const step = (now) => {
      if (stopped) return;
      const s = (now - t0) / 1000;
      svg.style.opacity = smooth(dark, dark + bud, s).toFixed(3);
      const T = clamp((s - dark - bud * .8) / open); const Te = T * T * (3 - 2 * T) * .5 + T * .5;
      Rose.pose(rose, Te);
      svg.style.transform = `scale(${lerp(.8, 1, ease(clamp((s - dark) / (bud + open)))).toFixed(4)})`;
      if (T < 1) raf = requestAnimationFrame(step);
      else { svg.style.transform = ""; onDone && onDone(); }
    };
    raf = requestAnimationFrame(step);
    return () => { stopped = true; cancelAnimationFrame(raf); Rose.pose(rose, 1); svg.style.opacity = 1; svg.style.transform = ""; };
  };

  Rose.petalPath = petalPath;
})();
