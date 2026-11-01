// node journeys/test.mjs — checks save merging, XP, the story engine and that the
// storylines only reference objectives and missions that exist in the game file.
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import assert from 'assert/strict';
const require = createRequire(import.meta.url);
const IVSave = require('./iv-save.js');
const IVStory = require('./iv-story.js');
const { STORYLINES, QUIZ_REYES_FINAL } = require('./iv-storylines.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', name); };

t('fresh + migrate fill every field', () => {
  const m = IVSave.migrate({ learned: { done: ['exam'] }, junk: 1 });
  assert.deepEqual(m.learned.done, ['exam']); assert.deepEqual(m.learned.scanned, []); assert.equal(m.schema, 1);
  assert.ok(IVSave.migrate(null).where);
});

t('merge: learned unions, best stars, newest position', () => {
  const a = IVSave.fresh(), b = IVSave.fresh();
  a.learned.done = ['exam', 'ra']; b.learned.done = ['ra', 'carina'];
  a.learned.stars = { 'neuro:L1': 2 }; b.learned.stars = { 'neuro:L1': 1, 'chest:T1': 3 };
  a.where = { t: 100, world: 'blood', idx: 40 }; b.where = { t: 200, world: 'lung', idx: 7 };
  a.srs.cards = { ivc: { last: 5, iv: 1 } }; b.srs.cards = { ivc: { last: 9, iv: 4 }, ra: { last: 1 } };
  a.story.beats = { m1_meet: 50 }; b.story.beats = { m1_meet: 40, o1_in: 60 };
  const m = IVSave.merge(a, b);
  assert.deepEqual(m.learned.done.sort(), ['carina', 'exam', 'ra']);
  assert.deepEqual(m.learned.stars, { 'neuro:L1': 2, 'chest:T1': 3 });
  assert.equal(m.where.world, 'lung');
  assert.equal(m.srs.cards.ivc.iv, 4); assert.ok(m.srs.cards.ra);
  assert.deepEqual(m.story.beats, { m1_meet: 40, o1_in: 60 });
  assert.deepEqual(IVSave.merge(b, a).learned.stars, m.learned.stars, 'merge is symmetric');
});

t('merge: XP from two offline devices adds up, re-merging does not double it', () => {
  const a = IVSave.fresh(), b = IVSave.fresh();
  a.xp = { cardio: { phone: 100 } }; b.xp = { cardio: { laptop: 250, phone: 80 } };
  const m = IVSave.merge(a, b);
  const total = Object.values(m.xp.cardio).reduce((x, y) => x + y, 0);
  assert.equal(total, 350);
  const again = IVSave.merge(m, b);
  assert.equal(Object.values(again.xp.cardio).reduce((x, y) => x + y, 0), 350);
});

t('merge: "New voyage" discards copies saved before the reset', () => {
  const old = IVSave.fresh(); old.updated = 1000; old.learned.done = ['exam'];
  const reset = IVSave.fresh(); reset.updated = 2000; reset.resetAt = 2000;
  assert.deepEqual(IVSave.merge(reset, old).learned.done, []);
  assert.deepEqual(IVSave.merge(old, reset).learned.done, []);
});

t('levels: curve is monotonic and capped', () => {
  assert.equal(IVSave.levelOf(0), 1); assert.equal(IVSave.levelOf(60), 2); assert.equal(IVSave.levelOf(59), 1);
  assert.equal(IVSave.levelOf(1e9), IVSave.MAX_LEVEL);
  for (let L = 2; L <= IVSave.MAX_LEVEL; L++) assert.ok(IVSave.xpForLevel(L) > IVSave.xpForLevel(L - 1));
});

// --- story engine against the real content ---
function harness(features = []) {
  const state = IVSave.fresh();
  const save = { state, addXp: (sk, x) => IVSave._addXpTo(state, sk, x), touch() {} };
  const events = [];
  let world = null;
  IVStory.init({ lines: STORYLINES, save, features, facts: () => ({ world, health: { reyes: 100 } }), on: e => events.push(e) });
  return { state, events, setWorld: w => (world = w), done: (...ids) => { state.learned.done.push(...ids); return IVStory.tick(); } };
}

t('main journey: narrative beat auto-completes, then waits on the bedside exam', () => {
  const h = harness();
  const ev = IVStory.tick();
  assert.ok(h.state.story.beats.m1_meet);
  const cur = IVStory.current();
  assert.equal(cur.beat.id, 'm1_exam');
  assert.ok(ev.some(e => e.type === 'goal' && e.beat === 'm1_exam'));
  const ev2 = h.done('exam');
  assert.ok(ev2.some(e => e.type === 'beat' && e.beat === 'm1_exam' && !e.recap));
  assert.ok(ev2.some(e => e.type === 'xp' && e.skill === 'cardio'));
  assert.equal(IVStory.current().beat.id, 'm1_right');
});

t('knowledge carries over: objectives done elsewhere complete as recaps', () => {
  const h = harness();
  h.state.learned.done.push('exam', 'ra', 'tricuspid', 'pulmonic', 'lungcap');
  const ev = IVStory.tick();
  const recaps = ev.filter(e => e.type === 'beat' && e.line === 'main').map(e => [e.beat, e.recap]);
  assert.deepEqual(recaps.map(r => r[0]), ['m1_meet', 'm1_exam', 'm1_right', 'm1_lungs']);
  assert.ok(recaps.slice(1).every(r => r[1]));
  assert.equal(IVStory.current().beat.id, 'm1_left');
  // background storyline "Follow the oxygen" did not announce anything
  assert.ok(!ev.some(e => e.type === 'goal' && e.line !== 'main'));
});

t('choices wait for the player, then apply harm and continue', () => {
  const h = harness();
  h.state.learned.done.push('exam', 'ra', 'tricuspid', 'pulmonic', 'lungcap', 'mitral', 'steth', 'aortic', 'study', 'rounds');
  h.state.learned.stars['chest:T2'] = 1;
  IVStory.tick();
  assert.equal(IVStory.current().beat.id, 'm2_decide');
  IVStory.tick();
  assert.equal(IVStory.current().beat.id, 'm2_decide', 'still waiting on the choice');
  const ev = IVStory.choose('m2_decide', 'meds');
  assert.ok(ev.some(e => e.type === 'harm' && e.case === 'reyes' && e.n === 15));
  assert.equal(IVStory.current().beat.id, 'm2_route');
  const ev2 = IVStory.choose('m2_decide', 'meds');
  assert.ok(!ev2.some(e => e.type === 'harm'), 'harm only on the first answer');
});

t('route beat: falls back to R2 until the TAVI mission exists, and needs R4 once it does', () => {
  const pre = s => { s.learned.done.push('exam', 'ra', 'tricuspid', 'pulmonic', 'lungcap', 'mitral', 'steth', 'aortic', 'study', 'rounds'); s.learned.stars['chest:T2'] = 1; s.story.choices.m2_decide = { t: 1, pick: 'tavi' }; s.learned.stars['chest:R2'] = 1; };
  let h = harness(); pre(h.state); IVStory.tick();
  assert.ok(h.state.story.beats.m2_route, 'R2 counts today');
  assert.ok(h.state.story.beats.m2_newvalve, 'optional beat skipped without blood.tavi');
  h = harness(['chest.tavi']); pre(h.state); IVStory.tick();
  assert.equal(IVStory.current().beat.id, 'm2_route', 'R2 no longer enough once the TAVI mission ships');
});

t('required beats needing unbuilt worlds pause their storyline as coming soon', () => {
  const h = harness();
  h.state.learned.done.push('gut', 'swallow', 'grind', 'ampulla', 'villus', 'portal', 'lacteal', 'peyer', 'colon', 'gexam', 'marsh', 'grounds');
  IVStory.setActive('meal');
  const st = IVStory.list().find(l => l.id === 'meal');
  assert.equal(st.beat.id, 'f4_liver'); assert.ok(st.comingSoon);
});

t('main journey ending depends on patient health', () => {
  const ids = []; for (const ch of STORYLINES[0].chapters) for (const b of ch.beats) ids.push(b);
  const endingFor = hp => {
    const state = IVSave.fresh(); const save = { state, addXp: () => 0, touch() {} }; const ev = [];
    IVStory.init({ lines: STORYLINES, save, features: [], facts: () => ({ health: { reyes: hp } }), on: e => ev.push(e) });
    for (const b of ids) if (b.id !== 'm6_bye') state.story.beats[b.id] = 1;
    IVStory.tick();
    return ev.find(e => e.type === 'line' && e.line === 'main').ending.id;
  };
  assert.equal(endingFor(90), 'good'); assert.equal(endingFor(55), 'mixed'); assert.equal(endingFor(10), 'hard');
});

t('content references only objectives and missions the game has (or flags them as needs)', () => {
  const game = readFileSync(new URL('../inner-voyage-game.html', import.meta.url), 'utf8');
  const objBlock = game.slice(game.indexOf('const OBJ=['), game.indexOf('];', game.indexOf('const OBJ=[')));
  const OBJ = new Set([...objBlock.matchAll(/\{id:'(\w+)'/g)].map(m => m[1]));
  const block = (k) => { const i = game.indexOf(k); return game.slice(i, game.indexOf('\n];', i)); };
  const NEURO = new Set([...block('const BGMIS=[').matchAll(/\{id:'(\w+)',type:/g)].map(m => m[1]));
  const CHEST = new Set([...block('const TXMIS=[').matchAll(/\{id:'(\w+)',type:/g)].map(m => m[1]));
  const SKILLS = new Set(Object.keys(IVSave.SKILLS));
  const SYSTEMS = new Set([...game.slice(game.indexOf('const SYSTEMS=['), game.indexOf('const SYSTEMS=[') + 6000).matchAll(/\{id:'(\w+)',name:/g)].map(m => m[1]));
  const missing = [];
  const walk = (c, b, futureOk) => {
    if (!c) return;
    for (const k of ['all', 'any']) if (c[k]) c[k].forEach(x => walk(x, b, futureOk));
    if (c.not) walk(c.not, b, futureOk);
    for (const id of [].concat(c.obj || [], c.anyObj || [])) if (!OBJ.has(id) && !futureOk) missing.push(`${b.id}: objective ${id}`);
    for (const id of Object.keys({ ...(c.stars || {}), ...(c.starsAny || {}) })) {
      const [ns, m] = id.split(':');
      const ok = ns === 'neuro' ? NEURO.has(m) : ns === 'chest' ? CHEST.has(m) : false;
      if (!ok && !futureOk && !c.starsAny) missing.push(`${b.id}: mission ${id}`);
    }
  };
  const ids = new Set();
  for (const line of STORYLINES) for (const ch of line.chapters) for (const b of ch.beats) {
    ids.add(b.id);
    walk(b.when, b, !!b.needs || /R4/.test(JSON.stringify(b.when)));
    for (const sk in b.xp || {}) if (!SKILLS.has(sk)) missing.push(`${b.id}: skill ${sk}`);
    if (b.go && b.go.system && !SYSTEMS.has(b.go.system)) missing.push(`${b.id}: system ${b.go.system}`);
    if (b.choice) assert.ok(b.choice.options.some(o => o.best), b.id + ' has a best option');
  }
  // the starsAny with L9 is a planned Reyes-specific variant; L1 must exist
  assert.ok(NEURO.has('L1'));
  assert.deepEqual(missing, []);
  assert.ok(QUIZ_REYES_FINAL.every(q => q.a.length === 4 && q.e));
  console.log(`   ${STORYLINES.length} storylines, ${ids.size} beats; game has ${OBJ.size} objectives, ${NEURO.size} neuro + ${CHEST.size} chest missions`);
});

console.log(`\n${n} tests passed`);
