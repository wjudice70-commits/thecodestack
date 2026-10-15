/* Yavaş Yavaş: entry point for the 3D city films. Loaded only when a film plays. */
import { Cine } from "./engine.js";
import { buildFilm } from "./film.js";

const cities = { istanbul: () => import("./cities/istanbul.js") };
let cine = null;

export const has = (id) => id in cities;

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
