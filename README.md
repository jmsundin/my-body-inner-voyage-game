# My Body — Inner Voyage

A browser prototype of a medical-education game set inside the human body. You pilot a micro-sub through one full loop of the circulation (vena cava, right heart, lungs, left heart, a stenotic aortic valve, aorta, capillaries and back), with heart sounds, an ECG, a Stethoscope Mode and Case 01: a 74-year-old patient with severe calcific aortic stenosis.

## How to play

Open `inner-voyage-game.html` in Chrome, Safari or Firefox (double-click it). It is one self-contained file and runs offline; no install or server is needed.

## Deploy on Vercel

The game is a static site with no build step, so Vercel can serve the repo as is.

1. Go to [vercel.com/new](https://vercel.com/new) and import `jmsundin/my-body-inner-voyage-game`.
2. Leave **Framework Preset** as *Other*, and leave the build command, output directory and install command empty.
3. Click **Deploy**.

`vercel.json` rewrites the root URL to `inner-voyage-game.html`, so the site's home page is the game. Every push to `main` redeploys automatically. From a terminal, `npx vercel` (preview) or `npx vercel --prod` in the repo folder does the same.

## What's in this repo

| File | What it is |
| --- | --- |
| `inner-voyage-game.html` | The playable game (three.js inlined) |
| `vercel.json` | Serves the game at the site root on Vercel |
| `docs/INNER-VOYAGE-BRIEF.md` | Research brief: vision, current build, architecture, and prompts for adding new body systems |
| `docs/design-bible.html` | The original interactive design plan (v0.3) |
| `docs/screenshots/` | Preview images of the atlas, valves, vessel walls and lymph node |

The medical content is a draft still under review for accuracy.
