# My Body — Inner Voyage

A browser prototype of a medical-education game set inside the human body. You pilot a micro-sub through one full loop of the circulation (vena cava, right heart, lungs, left heart, a stenotic aortic valve, aorta, capillaries and back), with heart sounds, an ECG, a Stethoscope Mode and Case 01: a 74-year-old patient with severe calcific aortic stenosis.

## Systems you can fly

Circulation (Case 01, aortic stenosis), lymphatics and immunity, the nervous system (brain capillary → cortex → corticospinal axon → neuromuscular junction) and, since 31 Oct 2026, the gastrointestinal tract: the living ~5 m gut as one tube, swallow waves and three sphincters that open on their real triggers, the antral grinder at 3 waves a minute, a villus forest with two exits (portal blood or lacteal lymph), bacteria at the real density gradient, and Case 03 (coeliac disease, with the Marsh stages on the villi). Also since 31 Oct 2026, the lungs from the air side: nose → larynx → trachea → carina (stop thrusting and the airflow takes you into the right main bronchus, as it takes aspirated food) → bronchi → bronchioles, with the mucociliary escalator climbing past you at its real relative speed, → generation 17, where total cross-section has grown ~70-fold, bulk flow dies and you drift by diffusion → an alveolar sac whose every wall is a capillary sheet. Breathing is the clock (12/min, I:E 1:2, coupled to the heart rate), exhalation pushes you back, Z coughs (effective only to generation 7–8), E on a septum shows the blood–gas barrier in section with a red cell loading in 0.25 s, and the exit is through the wall into the alveolar capillary of the blood loop. Case 04 (lobar pneumonia, right lower lobe): a bedside with synthesised vesicular and bronchial breath sounds and crackles, V floods the acinus through red and grey hepatisation to resolution, O runs an oxygen trial through a true shunt calculation (air 54 mmHg → 100% O₂ only ~105 mmHg), U changes posture and the West zones with it. Press Tab in the game to switch systems.

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
| `docs/screenshots/` | Preview images of the atlas, valves, vessel walls, lymph node, gut and lungs |

## Sources, provenance and the AnKing deck

Every Codex entry and flashcard carries a **Sources** record (`PROV` in the game file): a fact id, the First Aid organ system and topic, the reference the text was written against, whether it has been verified in a primary source yet, and a status. All records (144 at the time of writing) are currently *unverified · pending clinical review*; Jon (medical accuracy lead) ticks them off as he checks them.

The AnKing Step Deck is used **only as a coverage index**: its tag paths (for example `#AK_Step1_v12::#FirstAid::07_Cardiovascular`) tell us which topics a system should cover and which resource, chapter or question to verify a fact in. No card text, cloze sentences, images, `.apkg`, CSV, JSON or SQLite exports from the deck are in this repository, its docs or its prompts, and none will be: the deck's expression is copyrighted and AnkiHub's terms forbid redistribution and derived exports. Facts enter the game only after independent verification in a primary source and written in our own words. Where a tag path is not confirmed verbatim, the record says so.

### Bring your own deck

Study (T) ▸ **Load your Anki deck** reads a player's own `.apkg` (legacy export: tick "Support older Anki versions") or a "Notes in Plain Text" `.txt` export directly in the browser: a small zip reader and a read-only SQLite reader in the game file parse it, and the notes, images and matching results are kept in the browser's IndexedDB on that device only. Nothing is uploaded, nothing is sent to this repository or to any server of ours, and the imported deck stays under its own licence. Cards are placed at the structure they belong to, first by their AnKing / First Aid tag path and keywords, and optionally by an AI pass that the player runs from their browser with their own Anthropic API key (card text goes to that API for matching and nowhere else; the key is stored locally). Matched cards appear on the Codex card of that structure and, if the player wants, join the game's own spaced-repetition study with a separate schedule. The game's own cards (written in our own words, with provenance) remain the default deck.

The medical content is a draft still under review for accuracy.
