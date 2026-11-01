# Inner Voyage · Journeys and saved progress

*Design and integration spec · 1 November 2026 · for Jon and the "Build Inner Voyage MVP" thread*

Jon asked for two things:

1. **Continuity.** Log in and carry on exactly where you left off, as in RuneScape: same world, same place, same scale, everything you have learned still learned.
2. **A story.** A main journey to follow, plus other storylines that teach the body in different ways.

This document says what we chose, what the player sees, how the save works, what the storylines are, and exactly how to wire it into `inner-voyage-game.html`. The standalone pieces are already built and tested in [`journeys/`](../journeys/).

---

## 1. Decisions (made without asking, per Jon's standing preference)

| Question | Choice | Why |
|---|---|---|
| Rewrite the game, or layer story on top? | **Layer on top.** The worlds, missions and objectives stay; a story engine reads the progress they already record and tells the player where to go next. | The 1.7 MB of worlds is the valuable part. Every storyline beat waits on an objective or mission the game already tracks, so the story works on today's build and grows as worlds land. |
| Where do saves live? | **On the device first, always.** The cloud is a copy that follows a signed-in player. | Double-click-to-play and offline play must keep working. A flaky network must never lose progress. |
| Login provider | **Supabase** (Postgres + Auth), free tier, called with plain `fetch`. | Works from a static site with no build step and no server code, so Vercel needs no changes. Row-level security means the public key in the page can only ever touch the signed-in player's own row. No SDK or CDN, so the single file stays self-contained. |
| Sign-in methods | **Email magic link** (works the moment the project exists) and **Google** (optional, needs a Google OAuth client). | No passwords to store or reset. |
| Do players have to log in? | **No. Guest by default.** Signing in is offered as "Save to your account so it follows you". Signing in later uploads the guest progress. | Nobody hits a wall before seeing the game. |
| Two devices with different progress | **Merge, never choose.** Everything learned is unioned (objectives, scans, Codex, best stars, XP, flashcards). Position comes from whichever device moved most recently. | No "which save do you want to keep?" dialog, and nothing learned is ever lost. |
| Playing on two devices at once | **RuneScape rule: the newest session wins.** The older tab shows "Your voyage moved on another device · Jump there / Stay here" and stops saving its position until the player picks. | Stops two tabs from dragging the player back and forth. |
| What never leaves the device | The player's own Anki deck, their AI key, and SRS state for deck cards. | Same rule as the bring-your-own-deck feature (AnkiHub terms, privacy). |
| Progression | **Skills with levels 1–30**, RuneScape-style: Cardiovascular, Respiratory, Renal, Gastrointestinal, Neuroscience, Immunity, Endocrine, Anatomy, Clinical reasoning. | Gives a returning player a visible sense of growth per system. Levels never lock content: depth levels L1–L4 stay free. |

---

## 2. What the player sees

**Title screen.** If there is a save: a big **Continue** button labelled with where they were ("Continue · Lungs · generation 16 · 2 h ago"), then **Journeys**, then **New voyage**. A small account chip: "Guest · save to account" or "jon@… · synced".

**Welcome back card** (on Continue, 4 seconds, dismissable). Where you are, the storyline you are following and its next goal, flashcards due today, and any skill levels gained last time.

**Journeys board** (a second tab in the existing Tab system switcher). One card per storyline: title, length, progress bar, next chapter, and "coming soon" where a chapter needs a world that is not built yet. Pick one to follow; the others still advance quietly in the background whenever you do something they need.

**Quest line in the HUD.** One line under the objectives: the active storyline's current goal, with a "Go" button that warps to the right system (or opens the right atlas mission).

**Story moments.** Short dialogue cards (speaker name + role + one or two lines) at the start and end of beats. Recaps are compressed to one line when the player had already done the thing elsewhere.

**Choices.** A few beats ask the player to decide (which valve, the first step in a code stroke, what kind of kidney injury). Wrong answers lower the patient-course meter, using the same meter the game already has, and the main journey's ending depends on it.

**Skills panel** (inside the Codex). Nine skills with level and XP bar; "+40 Respiratory XP" toasts; a level-up chime.

**Account panel.** Sign in by email or Google, sign out, export save to a file, import a file, "Delete my cloud progress".

---

## 3. The storylines

All content lives in [`journeys/iv-storylines.js`](../journeys/iv-storylines.js): 8 storylines, 103 beats. Every condition references objective ids and mission ids that exist in today's game file. A test checks this against `inner-voyage-game.html`.

### Main journey · *One body: the admission of Daniel Reyes* (4–6 h)

The open world is literally one man's body. Mr Reyes (Case 01) is the through-line: each real complication of his admission opens another system.

| Chapter | What happens | Systems and existing content it uses | New content it asks for |
|---|---|---|---|
| 1 · The stairs | Exertional syncope. Find the murmur, fly the loop, present him. | Circulation: `exam` → `rounds` | none |
| 2 · The heart team | Learn his great vessels, recommend TAVI or surgery (shared decision), trace the catheter route femoral → iliac → aorta → arch → valve. | Chest Tag test T2, a choice, Chest route R2 as a stand-in | **Chest mission R4 "TAVI route"** (`chest.tavi`); optional **post-TAVI valve** in the blood world (`blood.tavi`) |
| 3 · The words won't come | Day-3 embolic stroke after TAVI (a known 2–3% risk). Choose the first step (CT + CTA), localise it, ride the carotid, cross the BBB, follow the corticospinal tract across the decussation. | Neuro rounds L1 and P2, nerve world `carotid` `bbb` `ap` `decuss` | optional **Neuro rounds L9**, a Reyes-specific version of L1 |
| 4 · The cough after breakfast | Post-stroke dysphagia, then aspiration pneumonia. A normal swallow, the right main bronchus, the dependent segment, shunt, the lost defences. | GI `swallow`, lung `carina` `cons` `o2trial` `escalator` `cough`, Chest A1 | optional **bedside swallow screen** (`gi.swallowscreen`, objective `swscreen`) |
| 5 · The creatinine is rising | AKI stage 2 after contrast, hypotension and sepsis. Call the mechanism (ATN), then see why the proximal tubule and thick limb die first, and why furosemide does not fix it. | Kidney `glom` `filter` `pct` `tal` `lasix` | optional **ATN toggle** in the kidney world (`renal.atn`, objective `atn`) |
| 6 · Going home | Final rounds over the whole admission, then discharge. The ending depends on the patient-course meter. | | optional **final rounds quiz** (`rounds.reyesFinal`; 8 questions already written as `QUIZ_REYES_FINAL`) |

Three endings: ≥70 "He walks up the stairs", ≥40 "Home, with help", otherwise "A long road" with a prompt to replay chapters.

### Alternative storylines

| Storyline | Kind | Length | Path |
|---|---|---|---|
| **Follow the oxygen** | Physiology | 45 min | Nose → carina → generation 16 (diffusion takes over) → alveolar sac → pulmonary vein → left heart → working muscle → West zones → shunt |
| **Follow a meal** | Physiology | 1–1.5 h | Swallow → pylorus → duodenum → villus fork (portal and lacteal) → Peyer's patch → colon → Ms Nair's coeliac disease → *liver sinusoid and islet (coming soon)* |
| **The signal** | Neuroscience, med-school depth | 2–3 h | Carotid → BBB → glia → action potential → decussation → synapse → NMJ → all Neuro rounds cases in sets → three-star mastery → *multiple sclerosis case (coming soon)* |
| **Case files** | Short stories | 20–40 min each | Case 01 Reyes, 03 Nair, 04 Herrera, 05 Okafor: bedside, inside, rounds, any order |
| **The defenders** | Immunity | 1 h | Leak into the lymph → node → thoracic duct → Peyer's patch → mucus escalator → consolidation |
| **Anatomy practical** | Exam prep | open-ended | Chest tag tests T1–T4, coronary territories, airway, routes, bedside landmarks, CT, daily flashcards |
| **Keeping the balance** | Endocrine | grows | ADH in the collecting duct → DKA → *islet, hypophyseal portal system (coming soon, as the pancreas and pituitary worlds land)* |

Knowledge carries across storylines. If you passed the mitral valve in *Follow the oxygen*, that beat in the main journey completes as a one-line recap when you get there.

### Medical review

All story text is a draft in our own words. Each chapter lists the sources to check (`src`). Points Jon should confirm before it ships:

- The TAVI age threshold. The text says current European guidance favours transfemoral TAVI at his age when the femoral route suits; the 2025 ESC/EACTS guideline moved that threshold to 70, while the 2020 ACC/AHA guideline leaves 65–80 to shared decision.
- Stroke after TAVI at about 2–3% at 30 days.
- Thrombolysis caution after a fresh large-bore femoral puncture.
- KDIGO staging: 88 → 196 µmol/L is 2.2× baseline, which is stage 2.

No AnKing text is used anywhere.

---

## 4. The save

### Shape (schema 1)

```js
{
  schema: 1, created, updated, resetAt,
  playMs:  { deviceId: ms },                 // time played, a counter per device
  where:   { t, world, idx, pos, quat, scale, atlas, label },
  learned: { done:[], scanned:[], unlocked:[], seen:[], stars:{'neuro:L1':3,'chest:T2':2}, rounds:{caseId:0.8} },
  xp:      { cardio: { deviceId: 340 }, … }, // a counter per device, so offline XP on two devices adds up correctly
  srs:     { cards: { codexCardId: { iv, ef, due, lapses, last } } },   // Codex cards only, never deck cards
  cases:   { reyes: { t, health, toggles, stage }, nair: {…}, … },
  story:   { t, active, beats:{id:time}, choices:{id:{t,pick}}, flags:[] },
  settings:{ t, depth, audio, … }
}
```

`where.scale` is one of `tube`, `study`, `truescale`, `brainAtlas`, `chestAtlas`, `cell`. `where.atlas` holds that view's own state (camera, flight key, layer toggles) so reopening an atlas puts the player back in the same spot.

### Merge rules (`IVSave.merge`, symmetric, tested)

- Learned sets: union. Stars and rounds: best. XP: max per device, then sum. Flashcards: the most recently reviewed copy per card.
- `where`, `settings` and each `cases[id]`: the newer copy wins as a whole.
- Story: beats unioned, each choice newest-wins, the active storyline from the newer copy.
- "New voyage" stamps `resetAt`, and any copy saved before it is discarded, so a reset does not come back from the cloud.

### When it saves

The game calls `IVSave.touch()` whenever something changes. Local writes are debounced to 1.5 s; cloud writes are throttled to one every 20 s. It flushes immediately on world switch, objective complete, mission end, `pagehide` and tab hide. Local keeps the previous copy as `iv.save.v1.bak`.

### Cloud write

`save_game(slot, data, base_rev)` is a compare-and-swap. If another device wrote first, the call returns the server copy; the client merges and retries. This is tested against Postgres 16 (RLS: a second user sees 0 rows; anon cannot call it) and end to end in a browser with two simulated devices.

### Upgrade path

On first run, `IVSave.load()` imports the game's existing `ivRounds` (as `neuro:`), `ivChest` (as `chest:`) and the Codex part of `iv.srs`, so nobody loses stars or flashcards.

---

## 5. Integration spec for the MVP thread

Paste three files into `inner-voyage-game.html` as `<script>` blocks before the game script: `journeys/iv-save.js`, `journeys/iv-story.js`, `journeys/iv-storylines.js` (about 70 KB together). The game keeps working with no Supabase config: it saves locally and the sign-in buttons say "available on the hosted game".

### 5.1 Boot

```js
const IV_CLOUD = { url: '', anonKey: '' };   // Jon pastes his Supabase values here (public by design)
await IVSave.init({
  supabaseUrl: IV_CLOUD.url, supabaseAnonKey: IV_CLOUD.anonKey, gameVersion: 'e34cba4',
  snapshot: ivSnapshot, restore: ivRestore,
  onChange: (what) => { if (what === 'superseded') showMovedBanner(); renderAccountChip(); }
});
IVStory.init({ lines: IV_STORYLINES, save: IVSave, features: IV_FEATURES, facts: ivFacts, on: ivStoryEvent });
// title screen: Continue (IVSave.continueLabel()) → start(), then IVSave.restore(); IVStory.tick()
```

### 5.2 `ivSnapshot()`: game → save

| Save field | From the game |
|---|---|
| `where.world` | `W.name` (`blood`, `lymph`, `nerve`, `gut`, `lung`, `renal`, later `liver`, `pancreas`, `pituitary`) |
| `where.idx`, `pos`, `quat` | `S.idx`, `S.pos.toArray()`, `S.q.toArray()` |
| `where.scale`, `atlas` | `BRAIN.open` → `brainAtlas` with `bView` state; `THX.open` → `chestAtlas` with camera, layers, CT slider; `AF` flight → the atlas plus `AF.w` and the ship pose; study mode → `study`; the true-scale capillary view → `truescale`; the cell lens → `cell` |
| `where.label` | A human place name: `SYSTEMS` name + current region (e.g. `Lungs · generation 16`) |
| `learned.done`, `scanned`, `unlocked` | `[...done]`, `[...scanned]`, `[...unlocked]` |
| `learned.stars` | `BG.stars` prefixed `neuro:`, `TXST` prefixed `chest:` |
| `learned.rounds` | best score per case from `openQuiz` (`reyes`, `nair`, `herrera`, `okafor`) as a fraction |
| `srs.cards` | `SRS.cards` **without deck cards** |
| `cases.reyes.health` | `ptHealth` (do the same for the other cases if they get their own meters) |
| `cases.*.toggles` | `C.stenosis`, Marsh grade, `LU.stage`, `RN.stage`, hydration, posture, FiO₂ |
| `settings` | `depth`, audio on/off, bell/diaphragm, mobile prefs |

### 5.3 `ivRestore(save)`: save → game

1. Refill `done`, `scanned`, `unlocked`, `BG.stars`, `TXST` and `SRS.cards` from the save. `renderObj()`.
2. `switchWorld(world, clamp(idx, 0, W.N - 1))`, building the world first if it is lazy (`enterGut`, `enterLung`, `enterRenal` paths without their side effects). Then set `S.pos` and `S.q` if present and inside the tube; otherwise stay on the node.
3. Reapply case toggles and `ptHealth`.
4. If `scale` is an atlas, reopen it (`openBrain` / `openThx` / `afStart(…, w)`) and apply `atlas`.
5. Unknown world (renamed or removed): fall back to the Circulation system's start.

### 5.4 Calls to add

- `complete(id)`: `IVSave.addXp(skillOf(id), 25); IVSave.flush(); IVStory.tick()`.
- Scan and Codex unlock: `IVSave.addXp(skillOf(key), 10); IVSave.touch()`.
- Mission stars improved (`txStars`, BG stars): `+30 XP` per new star to `anatomy` (Chest) or `neuro` (Neuro); then `flush` and `tick`.
- Rounds answer correct: `+15 clinical`; at the end of rounds, record `learned.rounds[case]`.
- Flashcard graded Good or Easy: `+3` to the card's system skill.
- `switchWorld`: `IVSave.flush(); IVStory.tick()`.
- Every 5 s while flying: `IVSave.touch()`. It is cheap: the work is debounced.
- `skillOf`: map an objective's group (`ly` → immune, `ns` → neuro, `gi` → gi, `lu` → resp, `rn` → renal, none → cardio) or a Codex card's system tag.

### 5.5 `ivFacts()` and story events

```js
const ivFacts = () => ({ world: W.name, scale: currentScale(), health: { reyes: ptHealth } });
function ivStoryEvent(e) {
  switch (e.type) {
    case 'goal':    setQuestLine(e.goal, e.go); if (e.lines) showDialogue(e.lines); if (e.choice) showChoice(e.beat, e.choice); break;
    case 'say':     showDialogue(e.lines, { compact: e.recap }); break;
    case 'harm':    harm(e.n, e.why); break;          // the existing patient-course meter
    case 'xp':      toast(`+${e.n} ${IVSave.SKILLS[e.skill]} XP`); break;
    case 'level':   toast(`${IVSave.SKILLS[e.skill]} level ${e.level}`, 'good'); sfx('chime'); break;
    case 'unlock':  e.codex.forEach(addCodex); break;
    case 'chapter': toast('Chapter complete · ' + e.title, 'good'); break;
    case 'line':    showEnding(e.title, e.ending); break;
  }
}
```

`showChoice` calls `IVStory.choose(beatId, optionId)`. Speakers' names and roles are in `IV_CAST`. A "Go" button on the quest line uses `e.go.system` (call that `SYSTEMS` entry's `go()`) or `e.go.atlas` + `e.go.mission` (open the atlas and start that mission).

### 5.6 Features the build declares

`IV_FEATURES` is a `Set` of the content that exists. Today it is empty. Add an id when the matching piece ships, and its beats switch on:

| Feature id | What to build | Objective or mission id |
|---|---|---|
| `chest.tavi` | Chest route mission R4: common femoral → external iliac → common iliac → aorta → arch → ascending aorta → aortic valve | `chest:R4` |
| `blood.tavi` | Case toggle: a TAVI frame in the aortic root, the old cusps pinned to the wall, the jet gone | objective `tavi` |
| `neuro.reyes` | Neuro rounds L9: a Reyes version of L1 (day-3 post-TAVI, left MCA superior division) | `neuro:L9` |
| `gi.swallowscreen` | Bedside water swallow screen | objective `swscreen` |
| `renal.atn` | ATN toggle: PCT and thick-limb cells slough, granular casts, FENa >2% | objective `atn` |
| `rounds.reyesFinal` | Final rounds using `QUIZ_REYES_FINAL` | `learned.rounds.reyesFinal` |
| `liver`, `pancreas`, `pituitary` | The queued worlds | objectives `sinusoid`, `islet`, `hypoportal` |
| `nerve.ms` | Multiple sclerosis case (per the nervous system research doc) | objective `msplaque` |

### 5.7 UI pieces to build

Title screen buttons, the Welcome back card, the Journeys tab in the Tab switcher (every key from A to Z is taken, so no new hotkey), the quest line, dialogue and choice cards, the skills panel in the Codex, the account panel and chip, and the "moved on another device" banner. Match the existing HUD style. [`journeys/save-demo.html`](../journeys/save-demo.html) shows the account flow working.

---

## 6. What Jon needs to do (about 10 minutes)

Until this is done, everything still works with local saves only.

1. Go to [supabase.com](https://supabase.com) → **New project**. Name it `inner-voyage`, choose a region near you, set a database password (keep it, though the game never uses it), and pick the Free plan.
2. Open **SQL Editor** → **New query**, paste all of [`journeys/supabase-schema.sql`](../journeys/supabase-schema.sql), and click **Run**.
3. Go to **Authentication → URL Configuration**. Set **Site URL** to your Vercel URL (e.g. `https://my-body-inner-voyage-game.vercel.app`). Under **Redirect URLs**, add the same URL, plus `https://*-jmsundin.vercel.app/**` for preview deploys.
4. **Authentication → Providers → Email** is on by default. Leave it on.
5. Optional, for Google: in Google Cloud Console → APIs & Services → Credentials, create an **OAuth client ID** (type "Web application") with the authorised redirect URI `https://<your-project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret into **Supabase → Authentication → Providers → Google** and enable it.
6. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key. Send them in the thread (both are public by design) or paste them into `IV_CLOUD` yourself.
7. To check it works before the game is wired: open `https://<your-vercel-url>/journeys/save-demo.html`, paste the two values, and sign in with your email. Then open the same page on your phone, sign in, and the fake progress should appear there.

Vercel needs no environment variables and no changes.

Note: the built-in Supabase email sender is rate-limited to a few emails an hour. That is fine for testing. Before inviting a class, set up custom SMTP (e.g. Resend) under Authentication → Emails.

---

## 7. Files

| File | What it is |
|---|---|
| `journeys/iv-save.js` | Save, merge, XP and levels, Supabase auth and sync. No dependencies. |
| `journeys/iv-story.js` | The journey engine: conditions, beats, choices, endings. |
| `journeys/iv-storylines.js` | All storyline content, the cast, and the final rounds quiz. |
| `journeys/supabase-schema.sql` | The table, RLS policies, `save_game()` and `delete_my_saves()`. |
| `journeys/save-demo.html` | A standalone page to test login and sync. |
| `journeys/test.mjs` | `node journeys/test.mjs`: merge rules, XP, the story engine, and a check of content against the game file. |

## 8. Later

- Leaderboards per skill, and class cohorts for teachers (a `cohorts` table and an invite code).
- Anonymous analytics on which beats people stall at, to find confusing teaching moments.
- An L5 Clinician mode in which the main journey's patient deteriorates in real time between sessions. This is optional and off by default.
