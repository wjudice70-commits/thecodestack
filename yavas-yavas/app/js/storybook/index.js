/* Yavaş Yavaş: entry point for the storybook city films. Loaded only when a film plays. */
import { Book } from "./book.js";
import { CITIES } from "./cities.js";

let book = null;
export const has = (id) => id in CITIES;

// Play a city's film. opts: { lang, mode, name, stopNo, stops, data, modes, onMode, hold }
export async function play(id, opts) {
  await document.fonts?.load?.("italic 500 40px Cormorant").catch(() => {});
  const lang = opts.lang, L = (o) => o ? (typeof o === "string" ? o : o[lang] ?? o.en ?? o.tr) : "";
  const d = opts.data || {}, prov = d.proverb || { tr: ["Yavaş yavaş"], en: "Slowly, slowly." };
  const n = opts.stopNo ?? 1, of = opts.stops ?? 15;
  const data = {
    L, name: opts.name, text: d.text || {}, clips: d.text?.clips || [],
    kicker: `${L({ tr: "Vardın", en: "You arrived" })} · ${L({ tr: `Durak ${n} / ${of}`, en: `Stop ${n} of ${of}` })}`,
    endKicker: L({ tr: `${opts.name} atasözü`, en: `${opts.name} proverb` }),
    proverb: prov.tr.join(" "), trans: lang === "en" ? prov.en : "", cta: L({ tr: "Devam", en: "Continue" }),
    bench: `films/bench-${id}.mp4`,
  };
  book ||= new Book();
  window.YYcine = book;
  return book.play(id, CITIES[id], data, opts);
}
