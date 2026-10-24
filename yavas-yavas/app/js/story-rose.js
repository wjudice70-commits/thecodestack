/* Our Story, told by the black rose. The same SVG rose as the opening screen is the only actor: it moves
   through 24 small still lifes drawn in its own material (velvet crimson, light from the upper left,
   sodium warmth, dust). It opens when they are happy, closes in the hospital, loses petals in the rain,
   and blooms fully at dawn. Between scenes a petal lifts toward the lens and the stage fades through black. */
(() => {
  "use strict";
  const { lerp, clamp, ease, rng } = YY;
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- Still-life pieces, all on a 600 × 1000 stage centred on (0, 0) ---------- */
  const f = (n) => (+n).toFixed(1);
  const halo = (x, y, r, c = "warm", o = 1) => `<circle class="rr-breathe" cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#rr-${c})" opacity="${o}"/>`;
  const flame = (x, y, s = 1) => `<g transform="translate(${f(x)} ${f(y)}) scale(${s})">${halo(0, -8, 60, "warm", .9)}
    <path class="rr-flicker" d="M0 -26C7 -16 9 -8 6 -2 4 2 -4 2 -6 -2 -9 -8 -7 -16 0 -26Z" fill="url(#rr-flame)"/>
    <ellipse cx="0" cy="-5" rx="2.6" ry="5" fill="#fff6d8"/></g>`;
  const candle = (x, y, h = 70, s = 1) => `<g transform="translate(${f(x)} ${f(y)}) scale(${s})">
    <rect x="-9" y="${-h}" width="18" height="${h}" rx="3" fill="url(#rr-wax)"/><path d="M0 ${-h}V${-h - 6}" stroke="#2a1a10" stroke-width="1.5"/>${flame(0, -h - 4)}</g>`;
  const windowLit = (x, y, w, h, o = 1) => `<g opacity="${o}">${halo(x, y, Math.max(w, h) * 1.4, "warm", .8)}
    <rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" fill="url(#rr-pane)"/>
    <path d="M${f(x)} ${f(y - h / 2)}V${f(y + h / 2)}M${f(x - w / 2)} ${f(y - h * .1)}H${f(x + w / 2)}" stroke="#1a0c08" stroke-width="4"/>
    <rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="#120806" stroke-width="7"/></g>`;
  const water = (y) => `<rect x="-3000" y="${y}" width="6000" height="3000" fill="url(#rr-water)"/>
    ${Array.from({ length: 14 }, (_, i) => `<path class="rr-shimmer" style="--d:${(i * .37) % 3}s" d="M${-260 + (i * 97) % 480} ${y + 14 + i * 16}h${40 + (i * 23) % 70}" stroke="rgba(255,200,150,${.25 - i * .012})" stroke-width="1.4"/>`).join("")}`;
  const moon = (x, y, r = 26) => `${halo(x, y, r * 5, "cool", .7)}<circle cx="${x}" cy="${y}" r="${r}" fill="url(#rr-moon)"/>`;
  const steam = (x, y, n = 3) => Array.from({ length: n }, (_, i) => `<path class="rr-steam" style="--d:${i * 1.1}s" d="M${x - 12 + i * 12} ${y}c-10 -20 12 -34 0 -56s10 -36 0 -60" fill="none" stroke="rgba(255,236,220,.35)" stroke-width="3" stroke-linecap="round"/>`).join("");
  const lantern = (x, y, s, d) => `<g class="rr-rise" style="--d:${d}s;--x:${x}px"><g transform="translate(0 ${y}) scale(${s})">${halo(0, 0, 70, "warm", .9)}
    <path d="M-14 -20Q0 -26 14 -20L11 18Q0 22 -11 18Z" fill="url(#rr-lantern)"/><ellipse cx="0" cy="14" rx="6" ry="4" fill="#fff1c0" opacity=".9"/></g></g>`;
  const bulbs = (x1, y1, x2, y2, sag, n) => {
    let s = `<path d="M${x1} ${y1}Q${(x1 + x2) / 2} ${y1 + sag * 2} ${x2} ${y2}" fill="none" stroke="#1a0e0a" stroke-width="1.5"/>`;
    for (let i = 1; i < n; i++) { const t = i / n, x = lerp(x1, x2, t), y = lerp(y1, y2, t) + sag * 4 * t * (1 - t); s += `${halo(x, y + 6, 22, "warm", .8)}<circle class="rr-twinkle" style="--d:${(i * .7) % 3}s" cx="${f(x)}" cy="${f(y + 6)}" r="3.4" fill="#ffe2a8"/>`; }
    return s;
  };
  const rain = (n = 60) => { const R = rng(3); return `<g class="rr-rain">${Array.from({ length: n }, () => `<path style="--d:${(R() * 1.2).toFixed(2)}s;--x:${(R() * 640 - 320).toFixed(0)}px" d="M0 -560l-6 48" stroke="rgba(190,210,240,.35)" stroke-width="1.2"/>`).join("")}</g>`; };
  const snow = (n = 50) => { const R = rng(9); return `<g class="rr-snow">${Array.from({ length: n }, () => `<circle style="--d:${(R() * 8).toFixed(2)}s;--x:${(R() * 640 - 320).toFixed(0)}px;--s:${(4 + R() * 6).toFixed(1)}s" r="${(1 + R() * 2.4).toFixed(1)}" cx="0" cy="-540" fill="rgba(235,242,255,.8)"/>`).join("")}</g>`; };
  const floorPetals = (y, n, seed = 2) => { const R = rng(seed); return Array.from({ length: n }, () => `<path d="${YY.Rose.petalPath(16, 20, .5)}" fill="url(#rr-velvet)" transform="translate(${(R() * 520 - 260).toFixed(0)} ${(y + R() * 60).toFixed(0)}) rotate(${(R() * 360).toFixed(0)}) scale(1 .55)"/>`).join(""); };
  const shafts = (x, y, a = .14) => `<path class="rr-breathe" d="M${x} ${y}L${x - 80} ${y}L120 260L380 260Z" fill="url(#rr-shaft)" opacity="${a * 6}"/>`;
  const glass = (x, y, tea) => `<g transform="translate(${x} ${y})">${halo(0, -40, 110, tea ? "warm" : "cool", .6)}
    <path d="M-22 -86C-30 -60 -14 -40 -18 -20 -20 -8 -16 0 0 0 16 0 20 -8 18 -20 14 -40 30 -60 22 -86Z" fill="${tea ? "url(#rr-tea)" : "rgba(170,200,240,.16)"}" stroke="rgba(255,235,210,.55)" stroke-width="1.6"/>
    <path d="M-12 -78C-16 -60 -8 -44 -10 -26" stroke="rgba(255,255,255,.5)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="0" cy="4" rx="34" ry="6" fill="none" stroke="rgba(244,211,154,.5)" stroke-width="1.5"/>${steam(0, -96, 2)}</g>`;
  const ground = (y, c = "#0a0607") => `<rect x="-3000" y="${y}" width="6000" height="3000" fill="${c}"/><path d="M-3000 ${y}H3000" stroke="rgba(244,211,154,.18)" stroke-width="1.2"/>`;
  const script = (x, y, text) => `<text class="rr-write" x="${x}" y="${y}" text-anchor="middle" font-family="Cormorant, Georgia, serif" font-style="italic" font-size="64" fill="none" stroke="#f4d39a" stroke-width="1.4">${text}</text>`;

  /* ---------- The 24 scenes. rose: [x, y, size, open 0..1]; bg: two colours of the light; fall: petals that drop. ---------- */
  const SCENES = {
    lake: { bg: ["#0b1124", "#020308"], rose: [-60, 40, 230, .6], art: () => `${moon(-170, -400)}
      <path d="M90 -560H330V160H90Z" fill="#07060a"/>${windowLit(150, -250, 80, 96)}${windowLit(150, -420, 80, 96, .25)}${windowLit(150, -80, 80, 96, .2)}
      <path d="M-3000 110Q-120 90 90 110" stroke="#0c0d16" stroke-width="30"/>${water(120)}
      <g transform="translate(0 240) scale(1 -.6)" opacity=".35">${windowLit(150, 130, 80, 96)}</g>` },
    candles: { bg: ["#3a1020", "#07040a"], rose: [0, -170, 300, .85], sky: true, art: () => `${ground(150)}${candle(-200, 150, 90)}${candle(-120, 150, 60)}${candle(130, 150, 110)}${candle(210, 150, 70)}` },
    lanterns: { bg: ["#2a1410", "#05040a"], rose: [0, -60, 220, .9], art: () => `${bulbs(-330, -430, 330, -400, 50, 12)}${[[-180, .9, 0], [-60, .7, 2.2], [90, 1.1, 1], [200, .8, 3.4], [-240, .6, 4.6], [20, .9, 5.5], [150, .6, 6.3]].map(([x, s, d]) => lantern(x, 80, s, d)).join("")}` },
    kitchen: { bg: ["#3a1a0c", "#060403"], rose: [-150, -60, 150, .9], art: () => `${ground(120, "#120a07")}${halo(80, 40, 200, "warm", .7)}
      <path d="M-10 60Q80 150 170 60Z" fill="#2a1408" stroke="rgba(244,211,154,.6)" stroke-width="2"/><ellipse cx="80" cy="60" rx="90" ry="14" fill="#5a2a10" stroke="rgba(255,210,150,.6)" stroke-width="1.5"/>${steam(80, 40, 3)}
      <path d="M190 118Q240 70 300 116Z" fill="#6a3a18" opacity=".8"/>` },
    smoke: { bg: ["#1c1614", "#050404"], rose: [-150, -90, 190, .7], fall: 1, art: () => `${ground(120, "#0c0a09")}
      <ellipse cx="90" cy="80" rx="110" ry="18" fill="#1a1412" stroke="rgba(244,211,154,.3)"/><path d="M200 80H300" stroke="#1a1412" stroke-width="10" stroke-linecap="round"/>
      ${Array.from({ length: 5 }, (_, i) => `<circle class="rr-smoke" style="--d:${i * 1.3}s" cx="${60 + i * 16}" cy="40" r="40" fill="rgba(120,110,105,.22)" filter="url(#rr-soft)"/>`).join("")}` },
    balcony: { bg: ["#1a1020", "#05040a"], rose: [-120, -100, 170, .9], art: () => `${Array.from({ length: 26 }, (_, i) => halo(-300 + (i * 151) % 620, -300 + (i * 89) % 260, 14 + (i % 4) * 8, i % 3 ? "warm" : "cool", .5)).join("")}
      <path d="M-3000 110H3000" stroke="rgba(244,211,154,.35)" stroke-width="3"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${-300 + i * 46} 110V200" stroke="rgba(244,211,154,.18)" stroke-width="2"/>`).join("")}${glass(130, 104, true)}` },
    door: { bg: ["#140a08", "#030202"], rose: [0, 40, 110, .6], art: () => `${ground(130)}${halo(0, -150, 300, "warm", .7)}
      <path d="M-90 130V-340H90V130Z" fill="url(#rr-pane)"/><path d="M90 130V-340L160 -310V150Z" fill="#160b07"/>
      <path d="M-90 130L-260 420H260L90 130Z" fill="url(#rr-floorlight)"/>` },
    water: { bg: ["#0c1628", "#020308"], rose: [-120, -80, 220, .45], fall: 1, art: () => `${ground(110, "#06070c")}${glass(130, 108, false)}` },
    shop: { bg: ["#24140a", "#050303"], rose: [0, 40, 120, .8], art: () => `${[-260, -110, 40].map(y => `<path d="M-300 ${y}H300" stroke="#2a1a10" stroke-width="10"/>${[-230, -140, -50, 50, 140, 230].map((x, i) => `<rect x="${x - 24}" y="${y - 70}" width="48" height="66" rx="8" fill="rgba(255,190,140,.08)" stroke="rgba(244,211,154,.3)"/>${(i + y) % 2 ? flame(x, y - 20, .7) : `<rect x="${x - 18}" y="${y - 40}" width="36" height="34" rx="6" fill="${["#7a3a5a", "#3a6a5a", "#8a6a3a"][i % 3]}" opacity=".6"/>`}`).join("")}`).join("")}${ground(130)}` },
    tea: { bg: ["#3a1a08", "#060302"], rose: [-130, -70, 160, .85], art: () => `${ground(110, "#100906")}${glass(110, 104, true)}${halo(-130, -70, 260, "warm", .4)}` },
    rain: { bg: ["#0c1220", "#020306"], rose: [0, -150, 300, .35], fall: 4, art: () => `${windowLit(0, -150, 420, 560, .18)}${rain(80)}${ground(200, "#04050a")}` },
    cinema: { bg: ["#0a0a14", "#020203"], rose: [0, 30, 200, .7], art: () => `<path class="rr-beam" d="M-20 -520L20 -520L300 180L-300 180Z" fill="url(#rr-beam)"/>${halo(0, -520, 60, "cool", 1)}${ground(180, "#050407")}` },
    candleroom: { bg: ["#3a0e18", "#060204"], rose: [0, -150, 260, 1], art: () => `${bulbs(-330, -470, 330, -450, 40, 14)}${ground(140, "#e9dccb")}<rect x="-3000" y="140" width="6000" height="3000" fill="url(#rr-carpet)"/>
      ${floorPetals(170, 22)}${[-250, -190, -110, 120, 190, 250].map((x, i) => candle(x, 160 + (i % 2) * 30, 40 + (i * 13) % 50, .8)).join("")}` },
    icestorm: { bg: ["#101a2a", "#020306"], rose: [0, -110, 220, .8], art: () => `${snow(70)}${ground(140, "#080b12")}${candle(-150, 150, 70)}${candle(-90, 150, 40)}${candle(110, 150, 90)}${candle(170, 150, 50)}${halo(0, 60, 300, "warm", .5)}` },
    fort: { bg: ["#24120c", "#050303"], rose: [0, 40, 140, .9], art: () => `${ground(150)}<path d="M-280 150L0 -260L280 150Z" fill="rgba(240,225,205,.12)" stroke="rgba(244,211,154,.5)" stroke-width="2"/>
      ${halo(0, 20, 260, "warm", .9)}${bulbs(-200, 20, 200, 20, -60, 9)}<path d="M-280 150L0 -260M280 150L0 -260" stroke="rgba(255,236,210,.35)" stroke-width="1"/>` },
    jacket: { bg: ["#2a1a10", "#050302"], rose: [70, -150, 80, .9], art: () => `${halo(0, -100, 320, "warm", .5)}<circle cx="0" cy="-400" r="8" fill="#3a2a1a" stroke="rgba(244,211,154,.6)"/>
      <path d="M0 -392C-30 -380 -60 -370 -110 -340L-170 -200 -150 120H150L170 -200 110 -340C60 -370 30 -380 0 -392Z" fill="#3a2214" stroke="rgba(255,200,140,.5)" stroke-width="2"/>
      <path d="M-60 -360L0 -250 60 -360M0 -250V120" stroke="rgba(0,0,0,.5)" stroke-width="3" fill="none"/><path d="M-110 -340L-170 -200 -150 120" stroke="rgba(255,210,160,.4)" stroke-width="2" fill="none"/>` },
    cake: { bg: ["#341420", "#060304"], rose: [0, -260, 140, .95], art: () => `${ground(160)}<ellipse cx="0" cy="40" rx="190" ry="34" fill="#4a1e28"/><rect x="-190" y="-60" width="380" height="100" fill="#3a141e"/><ellipse cx="0" cy="-60" rx="190" ry="34" fill="#f0d8c8" opacity=".85"/>
      ${[-120, -60, 0, 60, 120].map((x, i) => candle(x, -58 - (i % 2) * 6, 46, .8)).join("")}` },
    bakery: { bg: ["#3a2a18", "#080604"], rose: [-120, -40, 150, 1], art: () => `${windowLit(140, -330, 200, 260, .6)}${shafts(200, -420)}${ground(120, "#140e08")}
      <path d="M40 112Q110 40 190 112Q110 126 40 112Z" fill="#c08a40" stroke="rgba(255,230,180,.6)"/><path d="M70 100Q110 70 150 100M90 90V110M110 84V110M130 90V110" stroke="rgba(90,50,20,.7)" stroke-width="2" fill="none"/>` },
    emptybed: { bg: ["#0a1426", "#020306"], rose: [-150, -20, 240, .3], fall: 2, art: () => `${windowLit(150, -360, 160, 200, .12)}<path d="M150 -280L-200 160H320Z" fill="rgba(140,170,230,.06)"/>
      <rect x="-60" y="40" width="380" height="90" rx="10" fill="#101626"/><rect x="200" y="10" width="110" height="42" rx="18" fill="#1a2238"/><rect x="60" y="20" width="110" height="42" rx="18" fill="#1a2238" opacity=".6"/>
      ${ground(160, "#03040a")}<rect class="rr-phone" x="-260" y="148" width="40" height="14" rx="3" fill="#cfe0ff"/>` },
    hospital: { bg: ["#0a1418", "#010203"], rose: [0, -40, 380, .06], art: () => `<rect x="-200" y="-420" width="400" height="200" rx="14" fill="#04080a" stroke="rgba(150,220,210,.3)" stroke-width="2"/>
      <path class="rr-pulse" d="M-180 -320H-80L-60 -360-40 -260-20 -340 0 -320H180" fill="none" stroke="#ff4d62" stroke-width="3" stroke-linejoin="round"/>${halo(0, -320, 220, "rose", .5)}${ground(180, "#030506")}` },
    palm: { bg: ["#1a0c10", "#030203"], rose: [0, -300, 300, .2], art: () => `${halo(0, 0, 260, "warm", .5)}${script(0, 10, YY.lang() === "tr" ? "seni seviyorum" : "I love you")}` },
    nightshift: { bg: ["#0c1222", "#020306"], rose: [-130, -20, 280, .4], art: () => `${moon(160, -400, 20)}${windowLit(160, -330, 220, 260, .1)}${ground(140, "#04050a")}
      <path d="M90 136H290L270 116H110Z" fill="#1a2030"/><path d="M110 116L120 20H280L270 116" fill="url(#rr-screen)"/>${halo(195, 70, 160, "cool", .5)}` },
    stairs: { bg: ["#24140c", "#050303"], rose: [-190, 190, 90, .7], climb: [190, -330], art: () => `${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<path d="M${-260 + i * 56} ${240 - i * 64}h56v-64" fill="none" stroke="rgba(244,211,154,${.25 + i * .06})" stroke-width="2.4"/>`).join("")}${halo(240, -380, 160, "warm", .8)}${windowLit(240, -400, 70, 90, .8)}` },
    dawn: { bg: ["#5a2a24", "#0a0508"], rose: [0, -160, 360, 1], rise: 6, art: () => `<rect x="-3000" y="-80" width="6000" height="3000" fill="url(#rr-dawn)"/>${halo(0, 60, 420, "sun", 1)}<path d="M-3000 90H3000" stroke="rgba(255,220,180,.5)" stroke-width="1.5"/>${water(90)}` },
  };

  const DEFS = `<defs>
    <radialGradient id="rr-warm"><stop offset="0" stop-color="#ffb36a" stop-opacity=".55"/><stop offset=".4" stop-color="#ff7a3a" stop-opacity=".16"/><stop offset="1" stop-color="#ff7a3a" stop-opacity="0"/></radialGradient>
    <radialGradient id="rr-cool"><stop offset="0" stop-color="#bcd0ff" stop-opacity=".45"/><stop offset=".4" stop-color="#7090d0" stop-opacity=".12"/><stop offset="1" stop-color="#7090d0" stop-opacity="0"/></radialGradient>
    <radialGradient id="rr-rose"><stop offset="0" stop-color="#ff4d62" stop-opacity=".5"/><stop offset="1" stop-color="#ff4d62" stop-opacity="0"/></radialGradient>
    <radialGradient id="rr-sun"><stop offset="0" stop-color="#fff1d0" stop-opacity=".9"/><stop offset=".25" stop-color="#ffb36a" stop-opacity=".45"/><stop offset="1" stop-color="#c43a50" stop-opacity="0"/></radialGradient>
    <radialGradient id="rr-moon" cx=".35" cy=".35"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#b8c4dc"/></radialGradient>
    <radialGradient id="rr-flame" cx=".5" cy=".8" r=".8"><stop offset="0" stop-color="#fff6d8"/><stop offset=".5" stop-color="#ffb35a"/><stop offset="1" stop-color="#c4401e" stop-opacity=".4"/></radialGradient>
    <linearGradient id="rr-wax" x1="0" x2="1"><stop offset="0" stop-color="#5a4030"/><stop offset=".4" stop-color="#efe1c8"/><stop offset="1" stop-color="#3a2a1a"/></linearGradient>
    <linearGradient id="rr-pane" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#ffe2a8"/><stop offset="1" stop-color="#e07a2a"/></linearGradient>
    <linearGradient id="rr-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0d1a"/><stop offset=".25" stop-color="#05060c"/><stop offset="1" stop-color="#010103"/></linearGradient>
    <linearGradient id="rr-lantern" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd08a"/><stop offset=".6" stop-color="#ff8a3a"/><stop offset="1" stop-color="#b8401e"/></linearGradient>
    <linearGradient id="rr-tea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a3a" stop-opacity=".35"/><stop offset=".3" stop-color="#c4401e" stop-opacity=".85"/><stop offset="1" stop-color="#6a1408"/></linearGradient>
    <linearGradient id="rr-shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2b0" stop-opacity=".1"/><stop offset="1" stop-color="#ffe2b0" stop-opacity="0"/></linearGradient>
    <linearGradient id="rr-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe8ff" stop-opacity=".4"/><stop offset="1" stop-color="#dfe8ff" stop-opacity=".02"/></linearGradient>
    <linearGradient id="rr-floorlight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb36a" stop-opacity=".35"/><stop offset="1" stop-color="#ffb36a" stop-opacity="0"/></linearGradient>
    <linearGradient id="rr-carpet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".92"/></linearGradient>
    <linearGradient id="rr-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd0ff" stop-opacity=".7"/><stop offset="1" stop-color="#5070b0" stop-opacity=".4"/></linearGradient>
    <linearGradient id="rr-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a5a" stop-opacity=".0"/><stop offset=".12" stop-color="#ff9a5a" stop-opacity=".35"/><stop offset=".2" stop-color="#000" stop-opacity="0"/></linearGradient>
    <radialGradient id="rr-velvet" cx=".4" cy=".2"><stop offset="0" stop-color="#e04a62"/><stop offset=".6" stop-color="#7a1222"/><stop offset="1" stop-color="#2a0510"/></radialGradient>
    <filter id="rr-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>`;

  /* ---------- The player ---------- */
  let ui, rose, drift, stage, art, roseG, roseSvg, bg, dust, open = 1, openT = 1, raf, timer, idx = 0, scenes, done, t0;

  function build() {
    ui = document.createElement("section");
    ui.className = "film reel"; ui.hidden = true;
    ui.innerHTML = `<div class="reel-bg"></div>
      <svg class="reel-stage" viewBox="-300 -560 600 1000" preserveAspectRatio="xMidYMin meet">${DEFS}
        <rect class="reel-sky" x="-3000" y="-3000" width="6000" height="6000" fill="#000" opacity="0"/>
        <g class="reel-art"></g><g class="reel-rose"><g class="reel-drift"><svg class="reel-rose-svg" x="-300" y="-300" width="600" height="600" overflow="visible"></svg></g></g><g class="reel-petals"></g></svg>
      <canvas class="reel-dust"></canvas><div class="scrim"></div>
      <div class="film-top"><button class="round reel-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button><ol class="ticks"></ol></div>
      <button class="tap tap-back reel-back"></button><button class="tap tap-next reel-next"></button>
      <div class="film-copy"><p class="kicker"></p><h2 class="film-title"></h2><p class="film-text"></p><button class="cta" hidden></button><p class="tap-hint"></p></div>`;
    (document.getElementById("app") || document.body).appendChild(ui);
    stage = ui.querySelector(".reel-stage"); art = ui.querySelector(".reel-art"); roseG = ui.querySelector(".reel-rose");
    roseSvg = ui.querySelector(".reel-rose-svg"); drift = ui.querySelector(".reel-drift"); bg = ui.querySelector(".reel-bg"); dust = ui.querySelector(".reel-dust");
    rose = YY.Rose.build(roseSvg); roseSvg.setAttribute("viewBox", "-320 -320 640 640");
    ui.querySelector(".reel-next").onclick = () => { if (!scenes[idx].cta) next(); };
    ui.querySelector(".reel-back").onclick = () => show(Math.max(0, idx - 1));
    ui.querySelector(".reel-close").onclick = () => close();
    ui.querySelector(".cta").onclick = () => next();
    addEventListener("keydown", (e) => {
      if (ui.hidden) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") show(Math.max(0, idx - 1));
      if (e.key === "Escape") close();
    });
    // Swipe like an app: left for the next scene, right to go back, down to close.
    let sx = 0, sy = 0;
    ui.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    ui.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
      else if (Math.abs(dx) > 60) dx < 0 ? next() : show(Math.max(0, idx - 1));
    });
  }

  function fall(n, up = false) {
    const g = ui.querySelector(".reel-petals"), R = rng(idx + 3);
    g.innerHTML = Array.from({ length: n }, (_, i) => `<g class="${up ? "rr-up" : "rr-fall"}" style="--d:${(1.2 + i * 1.6 + R()).toFixed(2)}s;--x:${(R() * 300 - 150).toFixed(0)}px;--r:${(R() * 540 - 270).toFixed(0)}deg">
      <path d="${YY.Rose.petalPath(30, 40, .3)}" fill="url(#rr-velvet)" stroke="rgba(255,150,160,.35)"/></g>`).join("");
    g.style.transform = roseG.style.transform;
  }

  function show(i) {
    idx = i; const s = scenes[i], sc = SCENES[s.scene] || SCENES.lake;
    const first = !art.firstChild;
    const paint = () => {
      art.innerHTML = sc.art();
      bg.style.background = `radial-gradient(120% 80% at 50% 20%, ${sc.bg[0]}, ${sc.bg[1]} 70%)`;
      const [x, y, size, o] = sc.rose, k = Math.min(400, size * 1.4) / 600;
      roseG.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
      openT = o;
      if (sc.climb) setTimeout(() => { if (idx === i) roseG.style.transform = `translate(${sc.climb[0]}px, ${sc.climb[1]}px) scale(${k * .8})`; }, 1600);
      fall(sc.fall || sc.rise || 0, !!sc.rise);
      ui.classList.toggle("is-sky", !!sc.sky);
      const copy = ui.querySelector(".film-copy");
      copy.querySelector(".kicker").textContent = s.kicker; copy.querySelector(".film-title").textContent = s.title; copy.querySelector(".film-text").textContent = s.text;
      const cta = copy.querySelector(".cta"); cta.hidden = !s.cta; if (s.cta) cta.textContent = s.cta;
      copy.querySelector(".tap-hint").textContent = s.cta ? "" : YY.t("tapNext");
      ui.classList.remove("is-playing"); void ui.offsetWidth; ui.classList.add("is-playing");
      [...ui.querySelectorAll(".ticks li")].forEach((li, k2) => { li.classList.toggle("done", k2 < i); li.querySelector("i").style.width = k2 < i ? "100%" : "0"; });
      t0 = performance.now();
    };
    clearTimeout(timer);
    if (first || YY.reduceMotion) paint();
    else { ui.classList.add("is-cutting"); setTimeout(() => { paint(); ui.classList.remove("is-cutting"); }, 700); }
  }

  function next() { if (idx < scenes.length - 1) show(idx + 1); else close(true); }
  function close(finished = false) {
    cancelAnimationFrame(raf); ui.classList.remove("is-in");
    setTimeout(() => { ui.hidden = true; art.innerHTML = ""; const d = done; done = null; d && d(finished ? "done" : "closed"); }, 900);
  }

  // Each frame: the rose eases toward how open this scene wants it, drifts, breathes; dust drifts in the key light.
  function loop(now) {
    const s = scenes[idx];
    open = lerp(open, openT, YY.reduceMotion ? 1 : .018);
    YY.Rose.pose(rose, open);
    drift.style.transform = `rotate(${(Math.sin(now / 5200) * 2.4).toFixed(2)}deg) scale(${(1 + Math.sin(now / 3100) * .012).toFixed(4)})`;
    const dur = clamp(6 + (s.text || "").length * .055, 7, 16) * 1000, k = clamp((now - t0) / dur);
    const li = ui.querySelectorAll(".ticks li")[idx]; if (li) li.querySelector("i").style.width = `${(k * 100).toFixed(1)}%`;
    if (k >= 1 && !s.cta && !YY.reduceMotion && !ui.classList.contains("is-cutting")) next();
    drawDust(now / 1000);
    raf = requestAnimationFrame(loop);
  }
  let motes;
  function drawDust(t) {
    const c = dust.getContext("2d"), W = dust.width = dust.clientWidth, H = dust.height = dust.clientHeight;
    if (!motes) { const R = rng(17); motes = Array.from({ length: 60 }, () => ({ x: R(), y: R(), s: lerp(.5, 2.2, R() * R()), sp: lerp(.004, .016, R()), ph: R() * 6 })); }
    c.clearRect(0, 0, W, H); c.globalCompositeOperation = "lighter";
    for (const d of motes) {
      const x = ((d.x + Math.sin(t * .1 + d.ph) * .03) % 1) * W, y = (((d.y - t * d.sp) % 1) + 1) % 1 * H;
      c.fillStyle = `rgba(255,226,190,${(.22 * (.5 + .5 * Math.sin(t * .7 + d.ph)) * clamp(1.4 - x / W)).toFixed(3)})`;
      c.beginPath(); c.arc(x, y, d.s, 0, 7); c.fill();
    }
  }

  // scenes: [{ scene, kicker, title, text, cta }]. Resolves "done" or "closed".
  YY.RoseReel = {
    play(list, start = 0) {
      if (!ui) build();
      scenes = list; open = 0; art.innerHTML = "";
      ui.querySelector(".ticks").innerHTML = list.map(() => "<li><i></i></li>").join("");
      ui.hidden = false; requestAnimationFrame(() => ui.classList.add("is-in"));
      show(start);
      cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
      return new Promise((res) => { done = res; });
    },
    scenes: SCENES,
  };
})();
