# Yavas Yavas

TODO: one sentence on what it is and who it is for.
Concept (from owner): a black rose home screen; the journey is one petal per step; a welcome "Our Story" love story opens it. Our Story is the best part so far and is the quality reference for everything else.

## Goal
Bring every other scene/video up to the quality of Our Story: cinematic, movie-grade, readable. Keep token and credit use low.

## Facts to fill in (nothing below is confirmed yet)
- Audience / purpose: TODO
- Stack and where the code lives: TODO (code was not in this repo when this file was written)
- Fonts, colors, style: TODO (direction so far: matte black, black rose, minimal)
- Scenes/steps (one petal each): TODO
- Output format: TODO (website video, social, or both)

## Known problems (owner feedback)
- Animation quality is uneven; only Our Story is good.
- Avatars are not working. Avoid fake faces: use silhouettes, hands, over-the-shoulder, rose close-ups.
- Cities look childlike. Prefer night, shallow depth of field, slow camera, matte-black grade.
- Text is unreadable over clouds. Never put type directly on busy sky; use a dark scrim or darker grade.

## Approach
- Split the work: cinematic footage (external generative video or stock) for people/cities/sky; motion graphics and type built separately (HyperFrames: `npx skills add heygen-com/hyperframes`, untested here); composite with one consistent grade and film grain.
- Prove it on one scene first (black rose + petals + legible type), then redo the rest.

## Constraints
- Preview locally; do not deploy to Netlify until a change is approved. Minimize deploys.
- Deploy: Netlify (upload the folder with `index.html` at its top level, or the build output folder). Never the zip, never notes.

## Status
- Done: Our Story intro (good), black rose home screen concept
- To do: locate/commit the code, fill in the TODOs above, rebuild weakest scene as a test, then the rest. Write HANDOFF.md once code is here.

## Working rules
- Keep this file short and current. Update Status at the end of each session.
- One task per session; point at specific files; use a smaller model for copy and routine edits.
- Prefer small targeted edits over regenerating whole scenes.
- Ask before adding new dependencies or build tooling.
