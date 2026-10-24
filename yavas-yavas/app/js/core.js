/* Yavaş Yavaş: shared helpers, storage, language, data loading. No libraries, no build step. */
(() => {
  "use strict";
  const YY = (window.YY = window.YY || {});

  YY.reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  YY.DPR = Math.min(window.devicePixelRatio || 1, 2);
  YY.$ = (s, el = document) => el.querySelector(s);
  YY.$$ = (s, el = document) => [...el.querySelectorAll(s)];
  YY.lerp = (a, b, t) => a + (b - a) * t;
  YY.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  YY.ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  YY.smooth = (a, b, t) => { t = YY.clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

  // Seeded random: the same scene always paints the same way.
  YY.rng = (seed = 1) => {
    let s = (seed * 9301 + 49297) % 233280 || 1;
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  };

  // Smooth 1D noise for flicker and sway.
  YY.noise = (x) => {
    const i = Math.floor(x), f = x - i;
    const h = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
    const u = f * f * (3 - 2 * f);
    return h(i) * (1 - u) + h(i + 1) * u;
  };

  YY.mix = (a, b, t) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map(s => Math.round(YY.lerp((pa >> s) & 255, (pb >> s) & 255, YY.clamp(t))));
    return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
  };
  YY.rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };

  /* ---------------- Storage ---------------- */
  const KEY = "yavas-yavas.v1";
  const blank = () => ({ steps: 0, lastOpen: null, wins: {}, seenStop: -1, storySeen: false, lang: null, lettersRead: 0, notesOpened: [] });
  YY.state = (() => {
    try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch { return blank(); }
  })();
  YY.save = () => { try { localStorage.setItem(KEY, JSON.stringify(YY.state)); } catch { /* private mode: progress lives for this visit only */ } };

  YY.today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  YY.preview = new URLSearchParams(location.search).has("preview") || !!window.YY_PREVIEW;

  /* ---------------- Language ---------------- */
  YY.ui = {
    tr: {
      tagline: "yavaş yavaş, biz olduk",
      begin: "Hikâyemizi başlat", story: "Hikâyemiz", journey: "Yolculuk", today: "Bugün", rose: "Gül",
      tapNext: "Devam etmek için dokun", skip: "Atla", startJourney: "Yolculuğa başla", replay: "Yeniden izle",
      stepsTo: (n, city) => `${city} için ${n} adım`, arrived: "Vardın", home: "Eve vardın",
      openedToday: "Bugün geldin. Bir adım daha.", winLogged: "Bir adım daha.",
      winsFull: "Bugünün adımları doldu. Gerisi de birer zafer, ama artık dinlen.",
      smallWins: "Küçük zaferler", smallWinsHint: "Her biri bir adım. Dinlenmek de sayılır.",
      letter: "Bugünün mektubu", from: "Gönderen", openWhen: "Şu durumda aç", close: "Kapat",
      stop: (i, n) => `Durak ${i} / ${n}`, stage: "Bu durakta", watch: "Filmi izle", locked: "Henüz değil",
      steps: "adım", lang: "English", progress: (s, n) => `${s} / ${n} adım`, next: "Sonraki", back: "Geri",
      done: "Bitti", journeyDone: "Savaştepe'ye vardın. Eve hoş geldin.", previewOn: "Önizleme modu: her şey açık",
      addStep: "+1 adım", stepsToday: (n, m) => `Bugün ${n}/${m}`, from_michael: "Michael"
    },
    en: {
      tagline: "slowly, slowly, it became us",
      begin: "Begin our story", story: "Our Story", journey: "Journey", today: "Today", rose: "Rose",
      tapNext: "Tap to continue", skip: "Skip", startJourney: "Begin the journey", replay: "Watch again",
      stepsTo: (n, city) => `${n} steps to ${city}`, arrived: "You arrived", home: "You're home",
      openedToday: "You came today. One more step.", winLogged: "One more step.",
      winsFull: "Today's steps are full. Every win still counts, but now rest.",
      smallWins: "Small wins", smallWinsHint: "Each one is a step. Resting counts too.",
      letter: "Today's letter", from: "From", openWhen: "Open when", close: "Close",
      stop: (i, n) => `Stop ${i} of ${n}`, stage: "At this stop", watch: "Watch the film", locked: "Not yet",
      steps: "steps", lang: "Türkçe", progress: (s, n) => `${s} of ${n} steps`, next: "Next", back: "Back",
      done: "Done", journeyDone: "You reached Savaştepe. Welcome home.", previewOn: "Preview mode: everything unlocked",
      addStep: "+1 step", stepsToday: (n, m) => `Today ${n}/${m}`, from_michael: "Michael"
    }
  };
  YY.lang = () => YY.state.lang || (YY.data && YY.data.config.defaultLang) || "tr";
  YY.t = (k, ...a) => { const v = YY.ui[YY.lang()][k]; return typeof v === "function" ? v(...a) : v; };
  YY.L = (obj) => obj ? (obj[YY.lang()] ?? obj.en ?? obj.tr) : "";

  /* ---------------- Data ---------------- */
  YY.load = async () => {
    const names = ["config", "stops", "story", "wins", "letters", "notes", "films"];
    const all = await Promise.all(names.map(n => fetch(`data/${n}.json`).then(r => r.json())));
    YY.data = Object.fromEntries(names.map((n, i) => [n, all[i]]));
    return YY.data;
  };

  /* ---------------- Film grain (one tile, jittered by CSS) ---------------- */
  YY.grain = (node) => {
    const c = document.createElement("canvas"), n = 256;
    c.width = c.height = n;
    const x = c.getContext("2d"), img = x.createImageData(n, n);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    node.style.backgroundImage = `url(${c.toDataURL()})`;
  };
})();
