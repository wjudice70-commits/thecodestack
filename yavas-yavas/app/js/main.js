/* Yavaş Yavaş: wiring. Home (the rose), Journey, Today, Our Story, and the film player. */
(() => {
  "use strict";
  const { $, $$, t, L, clamp, state, save } = YY;
  const P = YY.paint;
  let D, rose, film, map, cfg, atmos, sky;

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
    $("#track").innerHTML = stops.map((x, i) => `<li class="${i < reached ? "got" : i === reached ? "here" : i === reached + 1 ? "next" : ""}" style="--f:${i === reached ? frac.toFixed(2) : 0}"></li>`).join("");
    if (map) map.setProgress(reached, frac);
    renderJourney(); renderToday();
  }

  /* ---------------- Views ---------------- */
  let current = "home";
  function go(view, at) {
    if (view === "story") return playStory(0);
    if (view === current) return;
    YY.cut(() => show(view), at);
  }
  function show(view) {
    current = view;
    atmos.set(view);
    $("#tabs").style.setProperty("--i", ["home", "story", "journey", "today"].indexOf(view));
    $$(".view").forEach(v => v.classList.toggle("is-active", v.id === view));
    $$(".tabs button").forEach(b => b.dataset.go === view ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    if (view === "journey") { sel = null; renderJourney(); map.resize(); map.focus(progress().reached); map.start(); } else map.stop();
    if (view === "today") sky.start(); else sky.stop();
    if (view !== "home") $("#" + view).scrollTop = 0;
  }

  let sel = null;   // the stop picked on the map; null follows her
  function renderJourney() {
    const stops = D.stops.stops, { reached } = progress(), rec = D.stops.recovery;
    const i = sel == null ? reached : sel, s = stops[i], open = i <= reached || YY.preview;
    $("#j-kicker").textContent = t("stop", reached + 1, stops.length);
    const card = $("#stop-card");
    card.classList.toggle("has-still", !!s.still); card.style.setProperty("--still", s.still ? `url(${new URL(s.still, location.href)})` : "none");
    card.innerHTML = `<p class="kicker">${i === reached ? t("stage") : t("stop", i + 1, stops.length)}</p><h3>${s.name}</h3><p>${L(s.line)}</p>
      <span class="stage-chip">${L(rec[s.stage])}</span><br>${open ? `<button class="cta" data-film="${i}">${t("watch")}</button>` : `<span class="locked">${t("locked")}</span>`}`;
    $("#stop-list").innerHTML = stops.map((x, k) => {
      const ok = k <= reached || YY.preview;
      return `<li><button data-stop="${k}" class="${k === reached ? "is-here" : ""} ${k === i ? "is-sel" : ""} ${ok ? "" : "is-locked"}">
        <span class="num">${["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV"][k] || k + 1}</span><span class="nm">${x.name}</span><span class="st">${L(rec[x.stage])}</span></button></li>`;
    }).join("");
  }
  function pickStop(i) {
    sel = i; map.focus(i); renderJourney();
    const c = $("#stop-card"); c.classList.remove("is-new"); void c.offsetWidth; c.classList.add("is-new");
    
  }

  function renderToday() {
    const d = YY.today(), done = winsToday(), cap = cfg.winsPerDay;
    $("#t-kicker").textContent = new Date().toLocaleDateString(YY.lang() === "tr" ? "tr-TR" : "en-US", { weekday: "long", day: "numeric", month: "long" });
    const letters = D.letters.letters, idx = Math.max(0, (state.dayCount || 1) - 1) % letters.length, lt = letters[idx];
    $("#letter").innerHTML = `<div><p class="kicker">${t("letter")}</p><p class="letter-text">${esc(L(lt))}</p>
      ${lt.photo ? `<img src="${lt.photo}" alt="">` : ""}<p class="signature">${esc(lt.from)}</p></div>`;
    $("#wins-count").textContent = done.length >= cap ? t("winsFull") : t("stepsToday", Math.min(done.length, cap), cap);
    sky.set(Math.min(done.length, cap));
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
    if (counts) { state.steps = Math.min(maxSteps(), state.steps + 1); sky.launch(); }
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
    film.resize(); film.start(); atmos.stop();
    showShot();
  }

  /* ---------------- Storybook city films ---------------- */
  // Watercolor films with the bench clip, loaded only when needed. ?nocine plays the painted film instead.
  const hasCine = (id) => !!D.stops.stops.find(x => x.id === id)?.flow || !!D.films?.[id]?.text && !new URLSearchParams(location.search).has("nocine");
  const STAGE_MODE = { wheelchair: "wheelchair", walker: "walker", crutches: "crutches", free: "run" };
  function cineMode(i) {
    const stage = D.stops.stops[i].stage, m = state.mobility;
    return m && m.stage === stage ? m.mode : STAGE_MODE[stage] || "walk";
  }
  // Brother's own film for a city (made in Google Flow) plays as it is, framed by a blurred still from it.
  function playFlow(s) {
    return new Promise((done) => {
      const el = document.createElement("section"); el.className = "flow"; el.style.setProperty("--still", `url(${new URL(s.still, location.href)})`);   // absolute: a url() in a variable resolves against the stylesheet
      el.innerHTML = `<video playsinline preload="auto" poster="${s.still}" src="${s.flow}"></video>
        <div class="film-top"><button class="round" aria-label="${t("close")}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
        <button class="flow-play" hidden aria-label="${t("watch")}"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>`;
      $("#app").append(el); requestAnimationFrame(() => el.classList.add("is-in"));
      const v = el.querySelector("video"), play = el.querySelector(".flow-play");
      const tryPlay = () => v.play().then(() => { play.hidden = true; }).catch(() => { play.hidden = false; });
      const end = (r) => { v.pause(); el.classList.remove("is-in"); setTimeout(() => el.remove(), 900); done(r); };
      v.addEventListener("ended", () => end("ended"), { once: true });
      el.querySelector(".round").addEventListener("click", () => end("closed"));
      play.addEventListener("click", tryPlay); v.addEventListener("click", () => v.paused ? tryPlay() : v.pause());
      tryPlay();
    });
  }
  async function playCine(i, extra = {}) {
    const s = D.stops.stops[i], md = D.films.modes;
    if (s.flow) return playFlow(s);
    const mod = await import("./storybook/index.js");
    return mod.play(s.id, {
      lang: YY.lang(), mode: extra.mode || cineMode(i), name: s.name, stopNo: i + 1, stops: D.stops.stops.length, data: D.films[s.id], hold: extra.hold,
      modes: { label: L(md.label), names: Object.fromEntries(Object.entries(md.names).map(([k, v]) => [k, L(v)])) },
      onMode: (mode) => { state.mobility = { stage: s.stage, mode }; save(); },
    });
  }

  function showShot() {
    const s = reel[shot], f = $("#film");
    if (s.cine != null) {
      cancelAnimationFrame(tickRaf); film.stop(); f.classList.add("is-cine");
      playCine(s.cine).then((r) => { f.classList.remove("is-cine"); film.start(); r === "closed" ? endReel() : next(); })
        .catch((err) => { console.warn("Storybook film unavailable, playing the painted one", err); f.classList.remove("is-cine"); film.start(); reel[shot] = { ...s, cine: null }; showShot(); });
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
    cancelAnimationFrame(tickRaf);
    const f = $("#film"); f.classList.remove("is-in");
    const cb = onReelEnd; onReelEnd = null;
    setTimeout(() => {
      if (cb && cb() === "chain") return;   // the callback opened another reel
      f.hidden = true; film.stop(); atmos.start(); document.body.classList.remove("in-film");
      $("#tabs").classList.add("is-on"); $("#lang").classList.add("is-on");
    }, 900);
  }

  // Our Story is told by the black rose itself (js/story-rose.js).
  function playStory(start = 0) {
    const scenes = D.story.scenes, last = scenes.length - 1;
    const list = scenes.map((s, i) => ({
      scene: s.scene, kicker: `${t("story")} · ${i + 1} / ${scenes.length}`, title: L(s.title), text: L(s.text),
      cta: i === last ? (state.storySeen ? t("done") : t("startJourney")) : null,
    }));
    $("#tabs").classList.remove("is-on"); $("#lang").classList.remove("is-on"); document.body.classList.add("in-film"); atmos.stop();
    YY.RoseReel.play(list, start).then((r) => {
      document.body.classList.remove("in-film"); atmos.start();
      $("#tabs").classList.add("is-on"); $("#lang").classList.add("is-on");
      if (r !== "done") return;
      const first = !state.storySeen;
      state.storySeen = true; save(); setHomeCta();
      if (first) checkArrivals();
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
  function endIfOpen() { if (!$("#film").hidden) { $("#film").hidden = true; film.stop(); atmos.start(); document.body.classList.remove("in-film"); $("#tabs").classList.add("is-on"); $("#lang").classList.add("is-on"); } }

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
    atmos = new YY.Atmos($("#atmos")); atmos.start();
    D = await YY.load(); cfg = D.config;
    rose = YY.Rose.build($("#rose"));
    film = new P.Film($("#film-canvas"));
    map = new YY.JourneyMap($("#map")); map.setStops(D.stops.stops);
    sky = new YY.Sky($("#sky"), cfg.winsPerDay);
    map.onPick = (i) => pickStop(i);
    applyText();

    $("#tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) { const r = b.getBoundingClientRect(); go(b.dataset.go, [r.left + r.width / 2, r.top]); } });
    $("#lang").addEventListener("click", () => { state.lang = YY.lang() === "tr" ? "en" : "tr"; save(); applyText(); map.base = null; refresh(); setHomeCta(); });
    document.addEventListener("click", (e) => {
      const f = e.target.closest("[data-film]"); if (f && !f.disabled) return playReel(arrivalShots(+f.dataset.film, true));
      const st = e.target.closest("[data-stop]"); if (st) return pickStop(+st.dataset.stop);
      const w = e.target.closest("[data-win]"); if (w) return logWin(w.dataset.win, w);
      const n = e.target.closest("[data-note]"); if (n) return openNote(n.dataset.note);
    });
    $("#stop-prev").addEventListener("click", () => pickStop(Math.max(0, (sel ?? progress().reached) - 1)));
    $("#stop-next").addEventListener("click", () => pickStop(Math.min(D.stops.stops.length - 1, (sel ?? progress().reached) + 1)));
    $("#pager").addEventListener("scroll", (e) => { const k = Math.round(e.target.scrollLeft / e.target.clientWidth); $$("#dots i").forEach((d, i) => d.classList.toggle("on", i === k)); }, { passive: true });
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
      window.YYdebug = { playStory, playReel, arrivalShots, go, addSteps, progress, playCine };
      // ?preview&cine=istanbul&mode=run opens a city's storybook film straight away.
      const qs = new URLSearchParams(location.search), cid = qs.get("cine");
      if (cid) { const i = D.stops.stops.findIndex(x => x.id === cid); if (i >= 0) { state.storySeen = true; state.seenStop = Math.max(state.seenStop, D.stops.stops.length); playCine(i, { mode: qs.get("mode"), hold: qs.has("hold") }); } }
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
