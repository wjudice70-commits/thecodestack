# How to update Yavaş Yavaş

All words live in `data/`. Edit the JSON, keep the commas and quotes, then bump `VERSION` in `sw.js`.

## Add a family letter
In `data/letters.json`, add an entry to `letters`. Letters show one per day, in order.
```json
{ "from": "Annen", "tr": "Mektup burada...", "en": "Letter here...", "photo": "photos/annem.jpg" }
```
Put photos in a `photos/` folder next to `index.html` and add each photo path to the `FILES` list in `sw.js` so it works offline.

## Change a story chapter
`data/story.json`: change `title` and `text` in both languages. Keep `id` and `scene`.

## Change the pace
`data/config.json`: `stepsPerStop` (steps between cities) and `winsPerDay` (how many wins a day count as steps).

## Turkish check
All Turkish was written by me (Claude) and should be read once by a native speaker before she sees it.
