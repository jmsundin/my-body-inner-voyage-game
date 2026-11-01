/* Inner Voyage · IVStory — the journey engine.
 *
 * A storyline is a list of chapters; a chapter is a list of beats. Each beat waits for a
 * condition on things the game already tracks (objectives done, world you are in, mission
 * stars, Codex cards, scans, story flags, choices). The engine never moves the ship or
 * changes the world itself: it tells the game what just happened (a beat finished, a line of
 * dialogue to show, XP to award) and what the player should do next (goal text + where to go).
 *
 * Because conditions read shared progress, knowledge carries across storylines: if you
 * already passed the mitral valve in "Follow the oxygen", that beat in the main journey
 * completes the moment you reach it, with its dialogue shown as a short recap.
 *
 * Pure and dependency-free; pasted into the game as one <script> block, tested in Node.
 *
 *   IVStory.init({ lines, save, facts, features, on })
 *     lines    – IV_STORYLINES (journeys/iv-storylines.js)
 *     save     – IVSave (or any object with .state shaped like IVSave.fresh())
 *     facts()  – live game facts: { world, scale, health:{caseId:0–100} }
 *     features – Set of content ids the current build supports ('renal.atn', 'liver', …)
 *     on(ev)   – called for { type:'beat'|'chapter'|'line'|'say'|'xp'|'level'|'unlock', … }
 *   IVStory.tick()            → run after any game event (objective, world switch, mission end)
 *   IVStory.current(lineId?)  → { line, chapter, beat, done, total } for the HUD
 *   IVStory.list()            → every storyline with its state, for the Journeys board
 *   IVStory.setActive(lineId) · IVStory.choose(beatId, optionId)
 */
(function (root) {
  'use strict';

  let L = [], save = null, factsFn = () => ({}), features = new Set(), on = () => {};
  const byId = {};

  const S = () => save.state;
  const asArr = v => (Array.isArray(v) ? v : [v]);

  /* ---------- conditions ---------- */
  function facts() {
    const s = S(), live = factsFn() || {};
    return {
      done: new Set(s.learned.done), scanned: new Set(s.learned.scanned), unlocked: new Set(s.learned.unlocked),
      stars: s.learned.stars, rounds: s.learned.rounds, flags: new Set(s.story.flags), beats: s.story.beats,
      choices: s.story.choices, world: live.world || (s.where && s.where.world), scale: live.scale || (s.where && s.where.scale),
      health: live.health || {}, features
    };
  }
  function test(c, F) {
    if (!c) return true;
    if (c.all) return c.all.every(x => test(x, F));
    if (c.any) return c.any.some(x => test(x, F));
    if (c.not) return !test(c.not, F);
    const ok = [];
    if (c.obj) ok.push(asArr(c.obj).every(id => F.done.has(id)));
    if (c.anyObj) ok.push(asArr(c.anyObj).some(id => F.done.has(id)));
    if (c.world) ok.push(asArr(c.world).includes(F.world));
    if (c.scale) ok.push(asArr(c.scale).includes(F.scale));
    if (c.codex) ok.push(asArr(c.codex).every(id => F.unlocked.has(id)));
    if (c.scans) ok.push(F.scanned.size >= c.scans);
    if (c.stars) ok.push(Object.keys(c.stars).every(id => (F.stars[id] || 0) >= c.stars[id]));
    if (c.starsAny) ok.push(Object.keys(c.starsAny).some(id => (F.stars[id] || 0) >= c.starsAny[id]));
    if (c.rounds) ok.push(Object.keys(c.rounds).every(id => (F.rounds[id] || 0) >= c.rounds[id]));
    if (c.flag) ok.push(asArr(c.flag).every(f => F.flags.has(f)));
    if (c.beat) ok.push(asArr(c.beat).every(b => !!F.beats[b]));
    if (c.choice) ok.push(!!F.choices[c.choice.beat] && F.choices[c.choice.beat].pick === c.choice.pick);
    if (c.feature) ok.push(asArr(c.feature).every(f => F.features.has(f)));
    if (c.health) ok.push(Object.keys(c.health).every(id => (F.health[id] != null ? F.health[id] : 100) >= c.health[id]));
    return ok.length ? ok.every(Boolean) : true;
  }

  /* ---------- structure helpers ---------- */
  const beatsOf = line => line.chapters.reduce((a, ch) => a.concat(ch.beats.map(b => ({ b, ch }))), []);
  const isDone = b => !!S().story.beats[b.id];
  const blocked = b => (b.needs ? !asArr(b.needs).every(f => features.has(f)) : false);
  const waitingChoice = b => b.choice && !S().story.choices[b.id];

  function lineState(line, F) {
    const all = beatsOf(line), total = all.length, nDone = all.filter(x => isDone(x.b)).length;
    const unlocked = test(line.requires, F) && (!line.needs || asArr(line.needs).every(f => features.has(f)));
    const next = all.find(x => !isDone(x.b));
    return {
      id: line.id, title: line.title, kind: line.kind, blurb: line.blurb, hours: line.hours,
      unlocked, lockedReason: unlocked ? null : line.lockedText || 'Finish earlier chapters to unlock.',
      done: nDone, total, complete: nDone === total,
      chapter: next ? next.ch : null, beat: next ? next.b : null,
      comingSoon: next ? blocked(next.b) : false
    };
  }

  /* ---------- the tick ---------- */
  function emit(ev) { try { on(ev); } catch (e) {} }
  function finishBeat(line, ch, b, F, recap) {
    const s = S();
    s.story.beats[b.id] = Date.now();
    s.story.t = Date.now();
    if (b.flag) for (const f of asArr(b.flag)) if (!s.story.flags.includes(f)) s.story.flags.push(f);
    if (b.outro && s.story.active === line.id) emit({ type: 'say', line: line.id, beat: b.id, lines: b.outro, recap });
    if (b.xp) for (const sk in b.xp) {
      emit({ type: 'xp', skill: sk, n: b.xp[sk] });
      const lv = save.addXp ? save.addXp(sk, b.xp[sk]) : 0;
      if (lv) emit({ type: 'level', skill: sk, level: lv });
    }
    if (b.unlock) emit({ type: 'unlock', codex: asArr(b.unlock) });
    emit({ type: 'beat', line: line.id, chapter: ch.id, beat: b.id, title: b.title, recap });
    const chDone = ch.beats.every(isDone);
    if (chDone) emit({ type: 'chapter', line: line.id, chapter: ch.id, title: ch.title });
    if (beatsOf(line).every(x => isDone(x.b))) {
      const end = (line.endings || []).find(e => test(e.when, F)) || null;
      emit({ type: 'line', line: line.id, title: line.title, ending: end });
    }
  }

  // Advance every unlocked storyline as far as the player's progress allows.
  // The active storyline also announces its next beat (intro dialogue + goal) once.
  function tick() {
    if (!save || !S()) return [];
    const out = [];
    const prevOn = on; on = ev => { out.push(ev); prevOn(ev); };
    try {
      let F = facts();
      for (const line of L) {
        if (!lineState(line, F).unlocked) continue;
        const active = S().story.active === line.id;
        for (let guard = 0; guard < 200; guard++) {
          const st = lineState(line, F);
          if (!st.beat) break;
          const b = st.beat;
          if (st.comingSoon) {
            // optional beats that need content this build lacks are skipped; required ones pause the storyline
            if (!b.optional) break;
            S().story.beats[b.id] = Date.now(); S().story.t = Date.now();
            emit({ type: 'skip', line: line.id, beat: b.id, needs: b.needs });
            continue;
          }
          let justAnnounced = false;
          if (active && !S().story.flags.includes('intro:' + b.id)) {
            justAnnounced = true;
            S().story.flags.push('intro:' + b.id);
            emit({ type: 'goal', line: line.id, chapter: st.chapter.id, beat: b.id, goal: b.goal, go: b.go || null, hint: b.hint || null, lines: b.intro || null, choice: b.choice || null });
          }
          if (waitingChoice(b)) break;
          if (!test(b.when, F)) break;
          // a beat the player had already satisfied elsewhere completes as a short recap, not news;
          // background storylines advance as recaps too
          const recap = !active || (justAnnounced && !!b.when);
          finishBeat(line, st.chapter, b, F, recap);
          F = facts();
        }
      }
    } finally { on = prevOn; }
    if (out.length && save.touch) save.touch('story');
    return out;
  }

  function findBeat(id) { for (const line of L) for (const ch of line.chapters) for (const b of ch.beats) if (b.id === id) return { line, ch, b }; return null; }
  // The player answered a story question. Each option can carry dialogue, a patient-course
  // penalty (harm: the game lowers that case's health) and a "best" marker for the debrief.
  function choose(beatId, pick) {
    const s = S(), f = findBeat(beatId);
    if (!f || !f.b.choice) return [];
    const opt = f.b.choice.options.find(o => o.id === pick);
    if (!opt) return [];
    const first = !s.story.choices[beatId];
    s.story.choices[beatId] = { t: Date.now(), pick };
    s.story.t = Date.now();
    const pre = [];
    const push = ev => { pre.push(ev); emit(ev); };
    if (opt.lines) push({ type: 'say', line: f.line.id, beat: beatId, lines: opt.lines });
    if (first && opt.harm) push({ type: 'harm', case: f.b.choice.case || f.line.caseId, n: opt.harm, why: opt.why || opt.label });
    if (first && opt.best && f.b.choice.xp) for (const sk in f.b.choice.xp) {
      push({ type: 'xp', skill: sk, n: f.b.choice.xp[sk] });
      const lv = save.addXp ? save.addXp(sk, f.b.choice.xp[sk]) : 0;
      if (lv) push({ type: 'level', skill: sk, level: lv });
    }
    return pre.concat(tick());
  }

  function setActive(id) { if (!byId[id]) return; S().story.active = id; S().story.t = Date.now(); if (save.touch) save.touch('story'); return tick(); }

  function current(id) {
    const line = byId[id || S().story.active] || L[0];
    if (!line) return null;
    const st = lineState(line, facts());
    return Object.assign(st, { line });
  }

  function list() { const F = facts(); return L.map(line => lineState(line, F)); }

  function init(o) {
    L = o.lines || []; save = o.save; factsFn = o.facts || factsFn; on = o.on || on;
    features = o.features instanceof Set ? o.features : new Set(o.features || []);
    for (const k in byId) delete byId[k];
    const seen = new Set();
    for (const line of L) {
      byId[line.id] = line;
      for (const ch of line.chapters) for (const b of ch.beats) {
        if (seen.has(b.id)) throw new Error('duplicate beat id ' + b.id);
        seen.add(b.id);
      }
    }
    if (S() && !byId[S().story.active] && L[0]) S().story.active = L[0].id;
    return api;
  }

  const api = { init, tick, choose, setActive, current, list, test, findBeat, get lines() { return L; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IVStory = api;
})(typeof window !== 'undefined' ? window : globalThis);
