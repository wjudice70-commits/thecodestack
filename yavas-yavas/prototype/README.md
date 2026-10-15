# Yavaş Yavaş: cinematic prototype

Home screen (black rose) and chapter one (Our Story) rebuilt to a film standard. This is a standalone prototype because the original app code is not in this repo yet; port these scenes into it once it is.

## Preview locally
From this folder run `python3 -m http.server 8000`, then open http://localhost:8000. Add `#step-1` to the URL to jump straight to chapter one. Do not deploy to Netlify until the look is approved.

## How it fixes the four complaints
- **Inconsistent animation:** one timing curve (`--ease-film`), one grade (black, crimson, warm sodium light), one grain and vignette layer shared by every scene, and one transition (the petal lifts off the rose toward the lens, the rose sinks into the dark, fade through black).
- **Avatars:** no faces at all. The story is told with the rose, the falling petal and the city, so nothing can look uncanny.
- **Childlike cities:** a night skyline seen through a long lens: out-of-focus bokeh lights behind, soft distant towers, sharp near towers with edge light, slow parallax dolly. No outlines, no flat colours, no pointy cartoon roofs.
- **Unreadable fonts:** Cormorant Garamond for display and Inter for reading, self-hosted in `fonts/`. Text always sits on a dark scrim, never on the busy image. Body text is 11:1 contrast, titles 18:1.

## Files
- `index.html`: both scenes.
- `style.css`: type, colour, timing, grain, scrim.
- `app.js`: procedural rose (SVG), dust, city (canvas), falling petal, scene changes. No libraries.
- `screenshots/`: phone (390×844) and desktop (1440×900) frames.

Respects "reduce motion" settings. Petal count (`STEPS` in `app.js`) is 7; change it to match the real number of journey steps.
