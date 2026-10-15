/* Yavaş Yavaş 3D film engine: one renderer, one grade, one grain, one timing curve for every city film.
   A film is a list of beats. The engine plays them with dips through black, runs the long-lens depth of
   field, the glow and the grade, and draws the captions on a dark scrim. */
import { THREE, clamp, smooth } from "./kit.js";

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const BRIGHT = `uniform sampler2D src; uniform float thr; varying vec2 vUv;
  void main(){ vec3 c = texture2D(src, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(thr, thr + 1.2, l), 1.); }`;
const BLUR = `uniform sampler2D src; uniform vec2 dir; varying vec2 vUv;
  void main(){ vec3 c = texture2D(src, vUv).rgb * .227;
    c += (texture2D(src, vUv + dir * 1.385).rgb + texture2D(src, vUv - dir * 1.385).rgb) * .316;
    c += (texture2D(src, vUv + dir * 3.231).rgb + texture2D(src, vUv - dir * 3.231).rgb) * .07;
    gl_FragColor = vec4(c, 1.); }`;
const FINAL = (taps) => `#include <packing>
  uniform sampler2D tCol, tDepth, tBloom; uniform vec2 res; uniform float near, far, focus, aperture, maxCoc, time, fade, exposure, bloomGain, grain, vig, warm;
  varying vec2 vUv;
  float dist(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, near, far); }
  float coc(float z){ return clamp(abs(z - focus) / max(z, .01) * aperture, 0., maxCoc); }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
  void main(){
    float c0 = coc(dist(vUv));
    vec3 col = texture2D(tCol, vUv).rgb; float w = 1.;
    if (c0 > .6) {
      for (int i = 1; i < ${taps}; i++) {
        float fi = float(i), r = sqrt(fi / float(${taps})) * c0, a = fi * 2.39996;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * r / res;
        float cs = coc(dist(uv)); float k = smoothstep(r - 1.5, r, cs + .5);
        col += texture2D(tCol, uv).rgb * k; w += k;
      }
      col /= w;
    }
    col = col * exposure + texture2D(tBloom, vUv).rgb * bloomGain;
    col = aces(col);
    float l = dot(col, vec3(.2126, .7152, .0722));
    col = mix(col, col * vec3(1.07, .97, .86), smoothstep(.35, 1., l) * .55 * warm);   // warm sodium highlights
    col += vec3(.016, .003, .007) * (1. - smoothstep(0., .22, l));                      // crimson-black shadows
    col = mix(vec3(l), col, 1.06);
    vec2 q = (vUv - .5) * vec2(res.x / res.y, 1.); col *= mix(1., smoothstep(1.15, .25, length(q)), vig);
    col += (hash(vUv * res + fract(time) * 91.7) - .5) * grain;
    col *= 1. - fade;
    gl_FragColor = vec4(pow(max(col, 0.), vec3(1. / 2.2)), 1.);
  }`;

export class Cine {
  constructor() {
    this.el = document.createElement("section");
    this.el.className = "cine"; this.el.hidden = true; this.el.setAttribute("aria-live", "polite");
    this.el.innerHTML = `
      <canvas class="cine-canvas" aria-hidden="true"></canvas>
      <div class="cine-scrap" aria-hidden="true"><i class="tape t1"></i><i class="tape t2"></i><i class="tape t3"></i></div>
      <div class="cine-scrim" aria-hidden="true"></div>
      <div class="cine-top">
        <button class="round cine-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <ol class="ticks cine-ticks" aria-hidden="true"></ol>
        <div class="cine-mode"><button class="chip" aria-haspopup="true"></button><ul class="cine-modes" hidden></ul></div>
      </div>
      <button class="tap tap-back cine-back" aria-label="Back"></button>
      <button class="tap tap-next cine-next" aria-label="Next"></button>
      <div class="cine-cap"><p class="kicker"></p><h2 class="cine-title"></h2><p class="cine-text"></p></div>
      <div class="cine-end"><p class="kicker"></p><p class="cine-proverb"></p><p class="cine-trans"></p><button class="cta"></button></div>`;
    document.body.appendChild(this.el);
    const q = (s) => this.el.querySelector(s);
    this.ui = { cap: q(".cine-cap"), kick: q(".cine-cap .kicker"), title: q(".cine-title"), text: q(".cine-text"), ticks: q(".cine-ticks"),
      end: q(".cine-end"), endKick: q(".cine-end .kicker"), prov: q(".cine-proverb"), trans: q(".cine-trans"), endBtn: q(".cine-end .cta"),
      chip: q(".cine-mode .chip"), modes: q(".cine-modes") };
    this.canvas = q(".cine-canvas");
    const phone = Math.min(innerWidth, innerHeight) < 600;
    this.phone = phone;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: !!window.YY_SHOT });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.5 : 1.75));
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.post = { focus: 10, aperture: 8, maxCoc: phone ? 9 : 14, exposure: .92, bloomGain: .5, thr: 1.1, grain: .045, vig: .85, warm: 1 };
    this.makePost(phone ? 14 : 22);
    q(".cine-close").addEventListener("click", () => this.finish("closed"));
    q(".cine-next").addEventListener("click", () => this.skip(1));
    q(".cine-back").addEventListener("click", () => this.skip(-1));
    this.ui.endBtn.addEventListener("click", () => this.finish("done"));
    this.ui.chip.addEventListener("click", () => { this.ui.modes.hidden = !this.ui.modes.hidden; });
    this.ui.modes.addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (!b) return; this.ui.modes.hidden = true; this.setMode(b.dataset.mode); });
    this.onKey = (e) => {
      if (this.el.hidden) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); this.skip(1); }
      if (e.key === "ArrowLeft") this.skip(-1);
      if (e.key === "Escape") this.finish("closed");
    };
    addEventListener("keydown", this.onKey, true);
    this.onResize = () => this.resize();
    addEventListener("resize", this.onResize);
  }

  makePost(taps) {
    const tri = new THREE.BufferGeometry();
    tri.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    tri.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(tri); this.quad.frustumCulled = false;
    this.qScene = new THREE.Scene(); this.qScene.add(this.quad); this.qCam = new THREE.Camera();
    const sm = (frag, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: frag, uniforms: u, depthTest: false, depthWrite: false });
    this.mBright = sm(BRIGHT, { src: { value: null }, thr: { value: 1 } });
    this.mBlur = sm(BLUR, { src: { value: null }, dir: { value: new THREE.Vector2() } });
    this.mFinal = sm(FINAL(taps), {
      tCol: { value: null }, tDepth: { value: null }, tBloom: { value: null }, res: { value: new THREE.Vector2() },
      near: { value: .1 }, far: { value: 1000 }, focus: { value: 10 }, aperture: { value: 8 }, maxCoc: { value: 12 }, time: { value: 0 },
      fade: { value: 1 }, exposure: { value: 1 }, bloomGain: { value: .5 }, grain: { value: .04 }, vig: { value: .8 }, warm: { value: 1 },
    });
  }

  resize() {
    const w = this.el.clientWidth || innerWidth, h = this.el.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    const s = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const W = s.x, H = s.y;
    this.rt?.dispose(); this.rtA?.dispose(); this.rtB?.dispose();
    this.rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: this.phone ? 2 : 4 });
    this.rt.depthTexture = new THREE.DepthTexture(W, H); this.rt.depthTexture.type = THREE.UnsignedIntType;
    const bw = Math.max(1, W >> 2), bh = Math.max(1, H >> 2);
    this.rtA = new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType });
    this.rtB = new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType });
    this.mFinal.uniforms.res.value.set(W, H);
    if (this.film) { this.film.camera.aspect = w / h; this.film.camera.updateProjectionMatrix(); this.film.resize?.(w, h); }
    this.size = { w, h, W, H };
  }

  // Play a film built by a city module. Resolves "done" or "closed".
  play(build, opts) {
    this.opts = opts;
    this.el.hidden = false; document.body.classList.add("in-cine"); this.el.classList.remove("is-in"); requestAnimationFrame(() => this.el.classList.add("is-in"));
    this.resize();
    this.film = build({ THREE, renderer: this.renderer, mode: opts.mode, lang: opts.lang, text: opts.text, phone: this.phone, post: this.post, size: this.size });
    this.film.camera.aspect = this.size.w / this.size.h; this.film.camera.updateProjectionMatrix();
    this.beats = this.film.beats; let acc = 0;
    for (const b of this.beats) { b.start = acc; acc += b.dur; }
    this.total = acc;
    this.groups = [];
    for (const b of this.beats) { if (b.join && this.groups.length) this.groups.at(-1).e = b.start + b.dur; else this.groups.push({ s: b.start, e: b.start + b.dur }); }
    this.ui.ticks.innerHTML = this.beats.filter(b => !b.join).map(() => "<li><i></i></li>").join("");
    this.renderModes();
    this.t = 0; this.cur = -1; this.paused = !!opts.hold; this.last = performance.now();
    this.ui.end.classList.remove("is-on");
    if (YYreduce()) { this.t = this.stillOf(0); this.paused = true; }
    return new Promise((res) => { this.resolve = res; this.raf = requestAnimationFrame(this.loop); });
  }
  stillOf(i) { const b = this.beats[i]; return b.start + (b.still ?? b.dur * .62); }

  loop = (now) => {
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
    if (this.paused && window.YY_SHOT) { this.raf = requestAnimationFrame(this.loop); return; }  // screenshots render on seek only
    if (!this.paused) this.t += dt;
    if (this.t >= this.total) { this.t = this.total - .001; this.paused = true; }
    this.frame(this.paused ? 0 : dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  seek(t) { this.t = clamp(t, 0, this.total - .001); this.frame(0); }

  frame(dt) {
    let i = this.beats.findIndex(b => this.t < b.start + b.dur); if (i < 0) i = this.beats.length - 1;
    const b = this.beats[i];
    if (i !== this.cur) {
      // Enter every beat in order so the set is in the right state, even when skipping.
      for (let k = this.cur < 0 || i < this.cur ? 0 : this.cur + 1; k <= i; k++) this.beats[k].enter?.();
      this.cur = i; this.showBeat(b);
    }
    const lt = this.t - b.start;
    b.update(lt, dt, lt / b.dur);
    const P = this.post, U = this.mFinal.uniforms;
    const fi = b.fadeIn ?? .7, fo = b.fadeOut ?? .7;
    U.fade.value = 1 - Math.min(fi ? smooth(0, fi, lt) : 1, fo ? smooth(0, fo, b.dur - lt) : 1) * (YYreduce() ? 1 : 1);
    if (YYreduce()) U.fade.value = 0;
    this.render(P);
    const lis = this.ui.ticks.children;
    this.groups.forEach((g, n) => { if (lis[n]) lis[n].firstChild.style.width = `${(clamp((this.t - g.s) / (g.e - g.s)) * 100).toFixed(1)}%`; });
  }

  render(P) {
    const r = this.renderer, f = this.film, U = this.mFinal.uniforms, cam = f.camera;
    r.setRenderTarget(this.rt); r.clear(); r.render(f.scene, cam);
    this.mBright.uniforms.src.value = this.rt.texture; this.mBright.uniforms.thr.value = P.thr;
    this.quad.material = this.mBright; r.setRenderTarget(this.rtA); r.render(this.qScene, this.qCam);
    const bw = this.rtA.width, bh = this.rtA.height;
    for (let n = 0; n < 2; n++) {
      this.mBlur.uniforms.src.value = this.rtA.texture; this.mBlur.uniforms.dir.value.set((1 + n) / bw, 0);
      this.quad.material = this.mBlur; r.setRenderTarget(this.rtB); r.render(this.qScene, this.qCam);
      this.mBlur.uniforms.src.value = this.rtB.texture; this.mBlur.uniforms.dir.value.set(0, (1 + n) / bh);
      r.setRenderTarget(this.rtA); r.render(this.qScene, this.qCam);
    }
    U.tCol.value = this.rt.texture; U.tDepth.value = this.rt.depthTexture; U.tBloom.value = this.rtA.texture;
    U.near.value = cam.near; U.far.value = cam.far; U.focus.value = P.focus;
    // Aperture is given for a 1000px-tall frame; scale to this screen.
    U.aperture.value = P.aperture * (this.size.H / 1000); U.maxCoc.value = P.maxCoc * (this.size.H / 1000) * 1.2;
    U.time.value = performance.now() / 1000; U.exposure.value = P.exposure; U.bloomGain.value = P.bloomGain;
    U.grain.value = P.grain; U.vig.value = P.vig; U.warm.value = P.warm;
    this.quad.material = this.mFinal; r.setRenderTarget(null); r.render(this.qScene, this.qCam);
  }

  showBeat(b) {
    const u = this.ui, c = b.cap;
    this.el.classList.toggle("is-scrap", !!b.scrap);
    u.cap.classList.remove("is-on"); void u.cap.offsetWidth;
    if (c) { u.kick.textContent = c.kicker || ""; u.title.textContent = c.title || ""; u.text.textContent = c.text || ""; u.cap.classList.add("is-on"); u.cap.classList.toggle("is-hand", !!b.scrap); }
    if (b.end) {
      u.endKick.textContent = b.end.kicker; u.prov.textContent = b.end.proverb; u.trans.textContent = b.end.trans || ""; u.endBtn.textContent = b.end.cta;
      setTimeout(() => u.end.classList.add("is-on"), YYreduce() ? 0 : 900);
    } else u.end.classList.remove("is-on");
  }

  skip(dir) {
    if (!this.beats) return;
    // Beats joined to the previous one are part of the same shot for tapping.
    let i = this.cur;
    if (dir > 0) { do i++; while (this.beats[i]?.join); if (i >= this.beats.length) return; }
    else { while (this.beats[i]?.join) i--; if (this.t - this.beats[i].start < 1.2 || YYreduce()) { do i--; while (this.beats[i]?.join); } i = Math.max(0, i); }
    this.t = YYreduce() ? this.stillOf(i) : this.beats[i].start + .001;
  }

  renderModes() {
    const m = this.opts.modes; if (!m) { this.ui.chip.parentNode.hidden = true; return; }
    this.ui.chip.parentNode.hidden = false;
    this.ui.chip.textContent = `${m.label} · ${m.names[this.opts.mode]}`;
    this.ui.modes.innerHTML = Object.entries(m.names).map(([k, v]) => `<li><button data-mode="${k}" class="${k === this.opts.mode ? "is-on" : ""}">${v}</button></li>`).join("");
  }
  setMode(mode) {
    this.opts.mode = mode; this.film.setMode?.(mode); this.opts.onMode?.(mode); this.renderModes();
  }

  finish(result) {
    cancelAnimationFrame(this.raf);
    this.el.classList.remove("is-in");
    const res = this.resolve; this.resolve = null;
    setTimeout(() => {
      this.el.hidden = true; document.body.classList.remove("in-cine"); this.film?.dispose?.(); this.film = null; this.beats = null;
      this.renderer.renderLists.dispose();
      res?.(result);
    }, 700);
  }
}
const YYreduce = () => !!(window.YY && YY.reduceMotion);
