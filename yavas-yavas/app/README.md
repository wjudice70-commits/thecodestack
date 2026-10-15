# Yavaş Yavaş

A gift for Nesrin: an offline web app (plain HTML, CSS and JS, no build step) that walks her from İstanbul to Savaştepe one small step at a time while she recovers.

## What's in it
- **Gül (home):** the black rose opens from darkness every time the app starts. Its 15 outer petals are the 15 stops; reached stops glow, the next one breathes.
- **Hikâyemiz (Our Story):** 24 painted chapters of our story, tap to go forward or back. Plays automatically the first time.
- **Yolculuk (Journey):** a night map of Turkey with the gold road, her position, and every reached city's film to rewatch.
- **Bugün (Today):** the day's letter, one-tap small wins, and "open when" notes.
- **Arrivals:** reaching a stop plays that city's film; a new recovery stage (wheelchair, walker, crutches, running free) plays its milestone film first.

## Pace
1 step for opening the app each day, plus 1 per small win, up to 5 wins a day. 24 steps per stop, 14 legs. The fastest possible pace is about 4 days per city, so she can't race through it in a weekend. Nothing ever goes backwards. Change it in `data/config.json`.

## Testing
- Run `python3 -m http.server` in this folder and open `http://localhost:8000/?preview`.
- `?preview` unlocks every city and shows a bar with +1 / +24 steps and a reset button.
- Language: the button at the top right switches Türkçe / English. Turkish is the default.

## Files
- `data/*.json`: every word in the app (story, stops, letters, notes, wins). See HOW-TO-UPDATE.md.
- `js/rose.js` the rose, `js/story.js` story paintings, `js/cities.js` city and milestone films, `js/map.js` the map, `js/paint.js` the painting kit and film player, `js/main.js` wiring.
- `sw.js` caches every file for offline use. **Bump `VERSION` in sw.js whenever you change any file**, or her phone keeps the old copy.

## Deploying
It's a static folder: drag `app/` onto Netlify (or point a Netlify site at `yavas-yavas/app`). Not deployed yet.
