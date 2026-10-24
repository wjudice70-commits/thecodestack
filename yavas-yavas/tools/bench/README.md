# Bench clips

Each city film ends on the bench clip (`app/films/bench-<city>.mp4`). İstanbul plays the original clip.
Every other city plays the same clip with the İstanbul skyline swapped for that city's own night skyline,
painted by the same watercolor code as the film (`buildBench` in `app/js/storybook/scene.js`).

`matte.mp4` is the keep-matte: white where the original clip stays (the two people, the lamp, the railing,
bench and ground), black where the new skyline shows through. It was made once from the clip with
`segment.py` (rembg) and `alpha.py`, so rebuilding needs no segmentation.

To rebuild one city after changing its skyline in `cities.js`:

1. From `yavas-yavas/`, run `python3 -m http.server 8765`.
2. Open `http://localhost:8765/tools/paint-test.html?city=<city>&mode=bench` and save the canvas as a 720×1280 PNG
   (or screenshot it with Playwright).
3. In this folder, with the original clip saved as `istanbul-bench.mp4`:
   `python3 blend.py backdrop.png ../../app/films/bench-<city>.mp4`

`paint-test.html` without `mode=bench` shows a city's whole watercolor panorama.
