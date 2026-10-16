# Our Story: Kling prompts for the 24 chapters

For making one 5-second vertical clip per chapter. Not deployed (it sits outside `app/`).

## Set up once
- **Reference images:** use your three bench stills for every chapter, as the character reference or the first frame. Keep Michael and Nesrin looking the same by giving Kling the same references each time and never describing their faces differently.
- **Style line (paste at the start of every prompt):** `Pixar-style 3D animated film look, warm cinematic lighting, shallow depth of field, soft film grain, vertical 9:16, gentle camera movement, no text, no logos.`
- **Michael:** navy baseball cap with a white spiral logo, short brown beard, tattoo sleeve on his right arm, cream V-neck t-shirt, sunglasses hanging from the collar, thin silver chain, black jeans, white sneakers.
- **Nesrin:** curly blonde messy bun with dark roots, rose-tinted glasses, black tank top, burgundy wide-leg trousers, white sneakers, gold necklace and small hoop earrings.
- **Framing key:** FACE = faces are fine. BACK = shot from behind. SIL = silhouette against light. HANDS = hands and objects only.
- Chapters 19 to 23 are the hospital and recovery. Do them as BACK, SIL or HANDS only. Faces drift, and a wrong face there would hurt.
- Ask Kling for no audio, or ignore it. The app already plays silent clips automatically.

## After you make a clip
1. Name it `ch01.mp4` ... `ch24.mp4`. Crop the bottom 6% if there's a watermark.
2. Send them to me and I'll encode them (about 0.5 MB each), add `"video": "videos/chNN.mp4"` to each chapter in `data/story.json`, add the files to `sw.js`, and bump `VERSION`. A chapter without a clip keeps its painted scene.

## The chapters (framing, then the motion prompt)

| # | Title | Frame | Motion prompt (add the style line first) |
|---|---|---|---|
| 1 | The third floor | BACK | Michael seen from behind at a third-floor window, looking over a lake at dusk, curtains stirring, slow push-in. |
| 2 | Until the sky changed | FACE | Michael and Nesrin on a candlelit balcony talking and laughing close together, the sky slowly changing from night blue to the first light. |
| 3 | Panda Fest | BACK | Two silhouettes from behind walking slowly under a thousand glowing paper lanterns, holding hands, two other couples in soft focus ahead. |
| 4 | Your kitchen | FACE | Nesrin in a warm kitchen folding small dumplings by hand, Michael watching, steam rising, flour in the air. |
| 5 | My et sote | FACE | Comedy: Michael in the kitchen proudly stirring a pan, a puff of smoke rises, he waves it away; Nesrin laughs in the doorway. |
| 6 | Your world | SIL | Silhouettes on a balcony at night passing small cups of coffee, a family's laughter in the background, string lights swaying. |
| 7 | "I'm the tired one" | BACK | From behind at a front door, Nesrin gently takes Michael's hand and they step out into the night, her other hand waving goodbye to unseen friends. |
| 8 | You held me | HANDS | Nesrin's hands holding Michael's hand, then passing a glass of water to him, a lamp glowing in the background. No faces. |
| 9 | Twelve-hour days | BACK | Nesrin from behind in a soap-and-candle shop, arranging candles on a shelf late in the day, the light turning gold. |
| 10 | Gurban | HANDS | A steaming plate set down, a hand resting on Michael's head, a warm lamp, a tea glass on a tray. |
| 11 | You stayed | SIL | Rain on a window, Nesrin's silhouette sitting beside Michael on a couch in the dark, her head tilting onto his shoulder. |
| 12 | Slowly, I began | FACE | Michael arriving home with flowers; later the two of them sit in cinema seats sharing popcorn in the glow of the screen. |
| 13 | The night of candles | BACK | Nesrin from behind stepping into a room of candles and rose petals on a white carpet, lights strung on the balcony beyond. |
| 14 | The ice storm | SIL | Two silhouettes wrapped in one blanket among a hundred candles, ice-covered trees glittering outside the window. |
| 15 | Our fort | FACE | Michael and Nesrin laughing inside a blanket fort made of sheets draped over chairs, fairy lights, a mattress on the living-room floor. |
| 16 | The jacket | BACK | A brown leather jacket held open from behind; Michael slips his arms into it, Nesrin's hands settling the collar. |
| 17 | Birthdays | FACE | Candlelit birthday dinner, the two of them raising glasses and smiling at each other across the table. |
| 18 | Paris Baguette | HANDS | Croissants and baguettes on a bakery table, flaky crumbs, morning sun through the window, two coffee cups sliding together. |
| 19 | That morning | HANDS | An empty side of an unmade bed in grey early light, a phone buzzing on the night table, the screen lighting a hand reaching for it. |
| 20 | I became someone else | SIL | A silhouette sitting upright by a hospital window at dawn, hands clasped, light slowly rising behind. |
| 21 | On my palm | HANDS | A single finger slowly tracing letters on an open palm, soft focus, warm light. |
| 22 | My sleeping beauty | BACK | A person working at a laptop in the corner of a dim hospital room, a bed with a sleeping figure in soft focus, the person glancing back now and then. |
| 23 | Three flights home | BACK | From behind: Michael pushing Nesrin in her wheelchair into a home with the furniture rearranged, a warm hallway light, a flight of stairs behind them. |
| 24 | I've got this now | BACK | Michael and Nesrin from behind on the balcony at dawn, her head on his shoulder, the city lightening, a slow pull-back. |

## Tips
- If a face drifts, regenerate with the same reference and add "face turned away" or move the framing to BACK.
- Longer reading chapters (2, 7, 11, 19, 24) can use two clips. Send both and I'll join them, as with the İstanbul bench clip.
- Chapters 8, 11 and 14 mention the hard nights. HANDS and SIL keep them gentle.
