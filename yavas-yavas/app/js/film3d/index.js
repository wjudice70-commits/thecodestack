/* Yavaş Yavaş: entry point for the 3D city films. Loaded only when a film plays. */
import { Cine } from "./engine.js";
import { buildFilm } from "./film.js";

const cities = { istanbul: () => import("./cities/istanbul.js") };
// Scenes with the rigged 3D William and Nesrin. A scene module exports load() (fetches the models) and build().
const scenes = { "istanbul-bench": () => import("./scenes/istanbul-bench.js") };
let cine = null;

export const has = (id) => id in cities;
export const hasScene = (id) => id in scenes;

// Play a city's film. opts: { lang, mode, name, stopNo, stops, data, modes, onMode, hold }
export async function play(id, opts) {
  const city = (await cities[id]()).default;
  await document.fonts?.load?.("italic 500 40px Cormorant").catch(() => {});
  cine ||= new Cine();
  const data = { ...opts.data, name: opts.name, stopNo: opts.stopNo, stops: opts.stops };
  const p = cine.play((ctx) => buildFilm(ctx, city, data), opts);
  window.YYcine = cine;
  return p;
}

// Play a character scene. Models load first (rejects if a file is missing), so the cinema only opens when it can play.
export async function playScene(id, opts) {
  const mod = (await scenes[id]()).default;
  const assets = await Promise.race([mod.load(), new Promise((_, rej) => setTimeout(() => rej(new Error("models took too long")), 20000))]);
  await document.fonts?.load?.("italic 500 40px Cormorant").catch(() => {});
  cine ||= new Cine();
  const p = cine.play((ctx) => mod.build(ctx, opts.data || {}, assets), opts);
  window.YYcine = cine;
  return p;
}
