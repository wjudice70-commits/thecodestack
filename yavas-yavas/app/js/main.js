/* Yavaş Yavaş: wiring. Home (the rose), Journey, Today, Our Story, and the film player. */
(() => {
  "use strict";
  const { $, $$, t, L, clamp, state, save } = YY;
  const P = YY.paint;
  let D, rose, film, map, cfg;

  /* ---------------- Progress ---------------- */
  const maxSteps = () => (D.stops.stops.length - 1) * cfg.stepsPerStop;
  const progress = () => {
    const s = Math.min(state.steps, maxSteps());
    const reached = Math.min(D.stops.stops.length - 1, Math.floor(s / cfg.stepsPerStop));
    return { reached, frac: reached >= D.stops.stops.length - 1 ? 1 : (s % cfg.stepsPerStop) / cfg.stepsPerStop, left: cfg.stepsPerStop - (s % cfg.stepsPerStop) };
  };
  const winsToday = () => (state.wins[YY.today()] || []);

  // Nothing ever goes backwards: steps only grow.
  function addSteps(n) {
    state.steps = Math.min(maxSteps(), state.steps + n);
    save(); refresh();
  }

  // One step for coming today.
  function dailyVisit() {
    const d = YY.today();
    if (state.lastOpen === d) return false;
    state.lastOpen = d;
    state.dayCount = (state.dayCount || 0) + 1;
    state.steps = Math.min(maxSteps(), state.steps + 1);
    save();
    return true;
  }

  /* ---------------- Text ---------------- */
  function applyText() {
    document.documentElement.lang = YY.lang();
    $$("[data-t]").forEach(n => { n.textContent = t(n.dataset.t); });
    $$("[data-t-label]").forEach(n => n.setAttribute("aria-label", t(n.dataset.tLabel)));
    $("#lang").textContent = t("lang");
    $("#tabs").setAttribute("aria-label", t("journey"));
  }

  function refresh() {
    const { reached, frac, left } = progress();
    const stops = D.stops.stops, n = stops.length;
    YY.Rose.setReached(rose, reached + 1, frac);
    const done = reached >= n - 1;
    $("#where").innerHTML = done ? `<b>${t("journeyDone")}</b>`
      : `<b>${stops[reached].name}</b> · ${t("stepsTo", left, stops[reached + 1].name)}`;
    $("#meter").style.width = `${((reached + frac) / (n - 1) * 100).toFixed(1)}%`;
    if (map) map.setProgress(reached, frac);
    renderJourney(); renderToday();
  }

  /* ---------------- Views ---------------- */
  let current = "home";
  function go(view) {
    if (view === "story") return playStory(0);
    current = view;
    $$(".view").forEach(v => v.classList.toggle("is-active", v.id === view));
    $$(".tabs button").forEach(b => b.dataset.go === view ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    if (view === "journey") { map.resize(); map.start(); } else map.stop();
    if (view !== "home") $("#" + view).scrollTop = 0;
  }

  function renderJourney() {
    const stops = D.stops.stops, { reached } = progress(), rec = D.stops.recovery;
    $("#j-kicker").textContent = t("stop", reached + 1, stops.length);
    const s = stops[reached];
    $("#stop-card").innerHTML = `<p class="kicker">${t("stage")}</p><h3>${s.name}</h3><p>${L(s.line)}</p>
      <span class="stage-chip">${L(rec[s.stage])}</span><br><button class="cta" data-film="${reached}">${t("watch")}</button>`;
    $("#stop-list").innerHTML = stops.map((x, i) => {
      const open = i <= reached || YY.preview;
      return `<li><button data-film="${i}" ${open ? "" : "disabled"} class="${i === reached ? "is-here" : ""}">
        <span class="num">${i + 1}</span><span><span class="nm">${x.name}</span><br><span class="st">${L(rec[x.stage])}</span></span>
        <span class="st">${open ? "" : t("locked")}</span></button></li>`;
    }).join("");
  }

  function renderToday() {
    const d = YY.today(), done = winsToday(), cap = cfg.winsPerDay;
    $("#t-kicker").textContent = new Date().toLocaleDateString(YY.lang() === "tr" ? "tr-TR" : "en-US", { weekday: "long", day: "numeric", month: "long" });
    const letters = D.letters.letters, idx = Math.max(0, (state.dayCount || 1) - 1) % letters.length, lt = letters[idx];
    $("#letter").innerHTML = `<div><p class="kicker">${t("letter")}</p><p class="letter-text">${esc(L(lt))}</p>
      ${lt.photo ? `<img src="${lt.photo}" alt="">` : ""}<p class="signature">${esc(lt.from)}</p></div>`;
    $("#wins-count").textContent = done.length >= cap ? t("winsFull") : t("stepsToday", Math.min(done.length, cap), cap);
    $("#win-grid").innerHTML = D.wins.wins.map(w => `<button class="win ${done.includes(w.id) ? "is-done" : ""}" data-win="${w.id}" aria-pressed="${done.includes(w.id)}">${esc(L(w))}</button>`).join("");
    $("#note-list").innerHTML = D.notes.notes.map(n => `<button class="note ${state.notesOpened.includes(n.id) ? "is-open" : ""}" data-note="${n.id}">${esc(L(n.when))}</button>`).join("");
    void d;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function logWin(id, btn) {
    const d = YY.today(), list = state.wins[d] || (state.wins[d] = []);
    if (list.includes(id)) return;
    list.push(id);
    const counts = list.length <= cfg.winsPerDay;
    if (counts) state.steps = Math.min(maxSteps(), state.steps + 1);
    save();
    toast(counts ? t("winLogged") : t("winsFull"));
    const before = state.seenStop;
    refresh();
    const b = $(`[data-win="${id}"]`); if (b) b.classList.add("pop");
    if (progress().reached > before) setTimeout(checkArrivals, 900);
    void btn;
  }

  function openNote(id) {
    const n = D.notes.notes.find(x => x.id === id);
    if (!state.notesOpened.includes(id)) { state.notesOpened.push(id); save(); }
    $("#m-kicker").textContent = t("openWhen");
    $("#m-title").textContent = L(n.when);
    $("#m-text").textContent = L(n);
    $("#m-sign").textContent = cfg.from;
    $("#modal").hidden = false; $("#m-close").focus();
    renderToday();
  }

  let toastTimer;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("is-on"), 2800);
  }

  /* ---------------- Film player ---------------- */
  // A reel is a list of shots: { painter, kicker, title, text, dur, cta }.
  let reel = [], shot = 0, shotTimer = 0, onReelEnd = null, tickRaf;
  const readTime = (s) => clamp(6 + (s.text || "").length * .055, 7, 16);

  function playReel(shots, start = 0, onEnd = null) {
    reel = shots; shot = start; onReelEnd = onEnd;
    const f = $("#film");
    f.hidden = false; requestAnimationFrame(() => f.classList.add("is-in"));
    $("#tabs").classList.remove("is-on"); $("#lang").classList.remove("is-on"); document.body.classList.add("in-film");
    $("#ticks").innerHTML = shots.length > 1 ? shots.map(() => "<li><i></i></li>").join("") : "";
    film.resize(); film.start();
    showShot();
  }

  /* ---------------- 3D city films ---------------- */
  // Loaded only when needed. Without WebGL 2 the painted film plays instead.
  const webgl = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } })();
  const hasCine = (id) => webgl && !!D.films?.[id]?.text && !new URLSearchParams(location.search).has("nocine");
  const STAGE_MODE = { wheelchair: "wheelchair", walker: "walker", crutches: "crutches", free: "run" };
  function cineMode(i) {
    const stage = D.stops.stops[i].stage, m = state.mobility;
    return m && m.stage === stage ? m.mode : STAGE_MODE[stage] || "walk";
  }
  async function playCine(i, extra = {}) {
    const s = D.stops.stops[i], md = D.films.modes;
    const mod = await import("./film3d/index.js");
    return mod.play(s.id, {
      lang: YY.lang(), mode: extra.mode || cineMode(i), name: s.name, stopNo: i + 1, stops: D.stops.stops.length, data: D.films[s.id], hold: extra.hold,
      modes: { label: L(md.label), names: Object.fromEntries(Object.entries(md.names).map(([k, v]) => [k, L(v)])) },
      onMode: (mode) => { state.mobility = { stage: s.stage, mode }; save(); },
    });
  }

  // Character scenes (rigged William and Nesrin). Same rules as the city films: only with WebGL 2, and any
  // failure (no WebGL, missing model, render error) plays the poster shot instead. Unlocking never waits on this.
  const hasScene = webgl && !new URLSearchParams(location.search).has("nocine");
  async function playScene(id, extra = {}) {
    const mod = await import("./film3d/index.js");
    return mod.playScene(id, { lang: YY.lang(), mode: "walk", hold: extra.hold });
  }
  // A still for the painted player: cover-fit image, slow push-in.
  function posterPainter(src) {
    const img = new Image(); img.src = src;
    return (x) => {
      const { c, W, H, u } = x; x.full(); c.fillStyle = "#050405"; c.fillRect(0, 0, W, H);
      if (!img.complete || !img.naturalWidth) return;
      const k = Math.max(W / img.naturalWidth, H / img.naturalHeight) * (1 + .05 * u), w = img.naturalWidth * k, h = img.naturalHeight * k;
      c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    };
  }

  /* ---------------- Video shots ---------------- */
  // A video clip fills the film player. Silent clips autoplay anywhere; if a clip ever has sound and the
  // browser blocks it, it plays muted instead of stalling. Any failure plays the poster shot instead.
  function leaveVideo() {
    const v = $("#film-video"), f = $("#film");
    clearTimeout(vidTimer); v.onended = v.onerror = v.onplaying = null;
    v.pause(); v.hidden = true; v.removeAttribute("src"); v.load();
    f.classList.remove("is-video", "vid-ended");
  }
  let vidTimer = 0;
  function playVideoShot(s) {
    const v = $("#film-video"), f = $("#film");
    cancelAnimationFrame(tickRaf); film.stop();
    f.classList.add("is-video"); f.classList.remove("vid-ended");
    $("#f-kicker").textContent = s.kicker || ""; $("#f-title").textContent = s.title || ""; $("#f-text").textContent = s.text || "";
    const cta = $("#f-cta"); cta.hidden = !s.cta; if (s.cta) cta.textContent = s.cta;
    $("#f-hint").textContent = "";
    $$("#ticks li").forEach((li, i) => { li.classList.toggle("done", i < shot); li.querySelector("i").style.width = i < shot ? "100%" : "0"; });
    f.classList.remove("is-playing"); void f.offsetWidth; f.classList.add("is-playing");
    const fail = (why) => { console.warn("video shot unavailable, showing the poster", why); leaveVideo(); reel[shot] = { ...s, video: null }; showShot(); };
    v.hidden = false; v.muted = false; v.src = s.video;
    v.onerror = () => fail(v.error);
    v.onended = () => f.classList.add("vid-ended");
    v.onplaying = () => clearTimeout(vidTimer);
    vidTimer = setTimeout(() => fail("no playback after 10s"), 10000);
    v.play().catch(() => { v.muted = true; return v.play(); }).catch(fail);
  }

  function showShot() {
    const s = reel[shot], f = $("#film");
    leaveVideo();
    if (s.video) return playVideoShot(s);
    if (s.cine != null || s.scene) {
      cancelAnimationFrame(tickRaf); film.stop(); f.classList.add("is-cine");
      (s.scene ? playScene(s.scene) : playCine(s.cine)).then((r) => { f.classList.remove("is-cine"); film.start(); r === "closed" ? endReel() : next(); })
        .catch((err) => { console.warn("3D film unavailable, playing the painted one", err); f.classList.remove("is-cine"); film.start(); reel[shot] = { ...s, cine: null, scene: null }; showShot(); });
      return;
    }
    film.show(s.painter, s.dur || readTime(s));
    f.classList.remove("is-playing"); void f.offsetWidth; f.classList.add("is-playing");
    $("#f-kicker").textContent = s.kicker || "";
    $("#f-title").textContent = s.title || "";
    $("#f-text").textContent = s.text || "";
    const cta = $("#f-cta");
    cta.hidden = !s.cta; if (s.cta) cta.textContent = s.cta;
    $("#f-hint").textContent = s.cta ? "" : t("tapNext");
    $$("#ticks li").forEach((li, i) => { li.classList.toggle("done", i < shot); li.querySelector("i").style.width = i < shot ? "100%" : "0"; });
    shotTimer = performance.now();
    cancelAnimationFrame(tickRaf);
    const dur = (s.dur || readTime(s)) * 1000;
    const tick = (now) => {
      const li = $$("#ticks li")[shot];
      const k = clamp((now - shotTimer) / dur);
      if (li) li.querySelector("i").style.width = `${(k * 100).toFixed(1)}%`;
      if (k >= 1 && !s.cta && !YY.reduceMotion) return next();
      tickRaf = requestAnimationFrame(tick);
    };
    tickRaf = requestAnimationFrame(tick);
  }

  function next() { if (shot < reel.length - 1) { shot++; showShot(); } else endReel(); }
  function back() { if (shot > 0) { shot--; showShot(); } else showShot(); }
  function endReel() {
    cancelAnimationFrame(tickRaf); leaveVideo();
    const f = $("#film"); f.classList.remove("is-in");
    const cb = onReelEnd; onReelEnd = null;
    setTimeout(() => {
      if (cb && cb() === "chain") return;   // the callback opened another reel
      f.hidden = true; film.stop(); document.body.classList.remove("in-film");
      $("#tabs").classList.add("is-on"); $("#lang").classList.add("is-on");
    }, 900);
  }

  function playStory(start = 0) {
    const scenes = D.story.scenes, last = scenes.length - 1;
    const shots = scenes.map((s, i) => ({
      painter: YY.storyScenes[s.scene] || YY.storyScenes.lake,
      kicker: `${t("story")} · ${i + 1} / ${scenes.length}`, title: L(s.title), text: L(s.text),
      cta: i === last ? (state.storySeen ? t("done") : t("startJourney")) : null,
    }));
    playReel(shots, start, () => {
      const first = !state.storySeen;
      state.storySeen = true; save(); setHomeCta();
      if (first) { checkArrivals(); return "chain"; }
    });
  }

  // Shots for arriving at stop i: a milestone film first if her recovery stage changed.
  function arrivalShots(i, replay = false) {
    const stops = D.stops.stops, s = stops[i], rec = D.stops.recovery, shots = [];
    const prev = stops[i - 1];
    if (!replay && (i === 0 || prev.stage !== s.stage) && YY.stageScenes && YY.stageScenes[s.stage]) {
      shots.push({ painter: YY.stageScenes[s.stage], kicker: t("stage"), title: L(rec[s.stage]), text: L(D.stops.stageLines?.[s.stage]) || "", dur: 8 });
    }
    shots.push({
      cine: hasCine(s.id) ? i : null,
      painter: (YY.cityScenes && YY.cityScenes[s.id]) || YY.storyScenes.dawn,
      kicker: `${i === stops.length - 1 ? t("home") : t("arrived")} · ${t("stop", i + 1, stops.length)}`,
      title: s.name, text: L(s.line), cta: t("close"),
    });
    // İstanbul ends with the bench clip (Michael sits, Nesrin rests her head on his shoulder), after the whole film.
    if (s.id === "istanbul") shots.push({
      video: "videos/istanbul-bench.mp4",
      painter: posterPainter("videos/istanbul-bench-poster.jpg"),
      kicker: "İstanbul", title: L({ tr: "Yan yana", en: "Side by side" }), text: L({ tr: "Yavaş yavaş, biz olduk.", en: "Slowly, slowly, it became us." }), cta: t("close"),
    });
    return shots;
  }

  // Play any arrivals she hasn't seen yet, in order.
  function checkArrivals() {
    const { reached } = progress();
    if (state.seenStop >= reached) { endIfOpen(); return; }
    const shots = [];
    for (let i = state.seenStop + 1; i <= reached; i++) shots.push(...arrivalShots(i));
    state.seenStop = reached; save();
    if (!$("#film").hidden) { reel = shots; shot = 0; onReelEnd = null; $("#ticks").innerHTML = shots.length > 1 ? shots.map(() => "<li><i></i></li>").join("") : ""; $("#film").classList.add("is-in"); showShot(); }
    else playReel(shots);
  }
  function endIfOpen() { if (!$("#film").hidden) { leaveVideo(); $("#film").hidden = true; film.stop(); document.body.classList.remove("in-film"); $("#tabs").classList.add("is-on"); $("#lang").classList.add("is-on"); } }

  /* ---------------- Home ---------------- */
  function setHomeCta() {
    const b = $("#begin");
    b.hidden = false;
    b.textContent = state.storySeen ? t("today") : t("begin");
    b.onclick = () => state.storySeen ? go("today") : playStory(0);
  }

  function openingSequence() {
    const home = $("#home");
    const firstVisitToday = dailyVisit();
    refresh();
    YY.Rose.bloom(rose, {
      onDone: () => {
        home.classList.add("is-bloomed");
        setTimeout(() => {
          $("#tabs").classList.toggle("is-on", state.storySeen || YY.preview); $("#lang").classList.add("is-on");
          if (firstVisitToday && state.storySeen) toast(t("openedToday"));
          if (state.storySeen && state.seenStop < progress().reached) setTimeout(checkArrivals, 1600);
        }, 1400);
      },
    });
    // The title rises as the last petals open.
    setTimeout(() => home.classList.add("is-titled"), YY.reduceMotion ? 0 : 9200);
    setHomeCta();
  }

  /* ---------------- Boot ---------------- */
  async function boot() {
    YY.grain($(".grain"));
    D = await YY.load(); cfg = D.config;
    rose = YY.Rose.build($("#rose"));
    film = new P.Film($("#film-canvas"));
    map = new YY.JourneyMap($("#map")); map.setStops(D.stops.stops);
    map.onPick = (i) => { if (i <= progress().reached || YY.preview) playReel(arrivalShots(i, true)); };
    applyText();

    $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) go(b.dataset.go); });
    $("#lang").addEventListener("click", () => { state.lang = YY.lang() === "tr" ? "en" : "tr"; save(); applyText(); map.base = null; refresh(); setHomeCta(); });
    document.addEventListener("click", (e) => {
      const f = e.target.closest("[data-film]"); if (f && !f.disabled) return playReel(arrivalShots(+f.dataset.film, true));
      const w = e.target.closest("[data-win]"); if (w) return logWin(w.dataset.win, w);
      const n = e.target.closest("[data-note]"); if (n) return openNote(n.dataset.note);
    });
    $("#tap-next").addEventListener("click", () => { if (!reel[shot].cta) next(); });
    $("#tap-back").addEventListener("click", back);
    $("#f-cta").addEventListener("click", next);
    $("#film-close").addEventListener("click", endReel);
    $("#m-close").addEventListener("click", () => { $("#modal").hidden = true; });
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("#modal").hidden = true; });
    addEventListener("keydown", (e) => {
      if (!$("#modal").hidden && e.key === "Escape") { $("#modal").hidden = true; return; }
      if ($("#film").hidden) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") back();
      if (e.key === "Escape") endReel();
    });

    if (YY.preview) {
      window.YYdebug = { playStory, playReel, arrivalShots, go, addSteps, progress, playCine, playScene };
      // ?preview&cine=istanbul&mode=run opens a city's 3D film straight away.
      const qs = new URLSearchParams(location.search), cid = qs.get("cine");
      // ?preview&cine=istanbul-bench opens the bench scene straight away (add &hold to pause on the first frame).
      if (cid === "istanbul-bench") { state.storySeen = true; state.seenStop = Math.max(state.seenStop, D.stops.stops.length); playScene(cid, { hold: qs.has("hold") }).catch((e) => console.warn("bench scene failed", e)); }
      else if (cid) { const i = D.stops.stops.findIndex(x => x.id === cid); if (i >= 0) { state.storySeen = true; state.seenStop = Math.max(state.seenStop, D.stops.stops.length); playCine(i, { mode: qs.get("mode"), hold: qs.has("hold") }); } }
      const bar = $("#preview-bar"); bar.hidden = false;
      bar.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.reset !== undefined) { localStorage.removeItem("yavas-yavas.v1"); location.reload(); return; }
        addSteps(+b.dataset.add); if (state.storySeen) checkArrivals();
      });
    }

    openingSequence();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  boot().catch(err => { console.error(err); document.body.insertAdjacentHTML("beforeend", `<p style="position:fixed;bottom:20px;left:20px;color:#dcaaa0">${err}</p>`); });
})();
