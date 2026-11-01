/* Inner Voyage · IVSave — local-first saves with optional cloud sync and login.
 *
 * Built to be pasted into inner-voyage-game.html as one <script> block (no build step,
 * no dependencies, no CDN). It also runs as a plain module in Node for the tests.
 *
 *  - Every save goes to the device first (localStorage), so offline play from a
 *    double-clicked file keeps working exactly as before.
 *  - If the game is served over https and a Supabase project is configured, a player
 *    can sign in (email magic link or Google) and the same save follows them to any
 *    device. Talks to Supabase's REST endpoints with fetch; no supabase-js needed.
 *  - Two copies of a save never fight: IVSave.merge() unions everything the player has
 *    learned (objectives, scans, Codex, stars, XP, flashcards) and takes "where am I"
 *    from whichever copy is newer. So there is never a "which save do you keep?" dialog.
 *
 *  Never saved or synced: the player's own Anki deck (IndexedDB 'iv.deck'), their AI key
 *  ('iv.aikey') and per-card SRS for deck cards. Those stay on the device by design.
 *
 *  Game side (see docs/journeys-and-saves.md §5):
 *    IVSave.init({ supabaseUrl, supabaseAnonKey, gameVersion, snapshot, restore, onChange })
 *    IVSave.load()            → merged save object (or a fresh one) — call before the title screen
 *    IVSave.touch(reason)     → something changed; saves locally (debounced) and to the cloud (throttled)
 *    IVSave.flush()           → save now (pagehide, world switch, objective complete)
 */
(function (root) {
  'use strict';

  const SCHEMA = 1;
  const LS_KEY = 'iv.save.v1';
  const LS_BAK = 'iv.save.v1.bak';
  const LS_AUTH = 'iv.auth.v1';
  const LS_DEVICE = 'iv.device';
  const LOCAL_DEBOUNCE_MS = 1500;
  const CLOUD_THROTTLE_MS = 20000;

  /* ---------------- tiny helpers ---------------- */
  const now = () => Date.now();
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const uniq = a => Array.from(new Set(a));
  const store = (() => {
    try { if (root.localStorage) { root.localStorage.setItem('iv.t', '1'); root.localStorage.removeItem('iv.t'); return root.localStorage; } } catch (e) {}
    const m = new Map(); // private window / Node: memory only
    return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
  })();
  const readJSON = (k, d) => { try { const v = store.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const writeJSON = (k, v) => { try { store.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  function deviceId() {
    let id = store.getItem(LS_DEVICE);
    if (!id) { id = 'd' + Math.random().toString(36).slice(2, 10) + now().toString(36).slice(-4); store.setItem(LS_DEVICE, id); }
    return id;
  }

  /* ---------------- the save object ---------------- */
  // Everything the game needs to put a returning player back where they were.
  function fresh() {
    const t = now();
    return {
      schema: SCHEMA,
      created: t,
      updated: t,
      resetAt: 0,                 // "New voyage" time: copies older than this are discarded on merge
      playMs: {},                 // G-counter per device: total time played
      // where: last place the player was. Newest copy wins as a whole.
      where: {
        t: 0,
        world: null,              // 'blood' | 'lymph' | 'nerve' | 'gut' | 'lung' | 'renal' | later 'liver' | 'pancreas' | 'pituitary'
        idx: 0,                   // node index along the world's tube (S.idx)
        pos: null, quat: null,    // exact ship pose [x,y,z], [x,y,z,w]
        scale: 'tube',            // 'tube' | 'study' | 'truescale' | 'brainAtlas' | 'chestAtlas' | 'cell'
        atlas: null,              // atlas-specific view state (camera, flight key, layer toggles)
        label: ''                 // human text for the Continue button: "Lungs · generation 16"
      },
      // learned: grows only. Merged by union / max.
      learned: {
        done: [],                 // objective ids (OBJ)
        scanned: [],              // scanned structure keys
        unlocked: [],             // Codex keys
        stars: {},                // 'neuro:L1', 'chest:T1' … → best stars (boards reuse ids, so always namespaced)
        rounds: {},               // case id → best Rounds score (0–1)
        seen: []                  // one-time intros and hints already shown
      },
      xp: {},                     // skill → { deviceId: xp }  (G-counter; total = sum)
      srs: { cards: {} },         // Codex flashcards only: id → { iv, ef, due, lapses, last }
      cases: {},                  // case id → { t, health, toggles:{...}, stage } — per-run patient state, newest wins
      story: {
        t: 0,
        active: 'main',           // storyline the HUD follows
        beats: {},                // beat id → time it completed (union)
        choices: {},              // beat id → { t, pick } — newest wins per beat
        flags: []                 // story flags (union)
      },
      settings: { t: 0 }          // depth level, audio, mobile prefs… newest wins
    };
  }

  // Bring any older or partial object up to the current shape.
  function migrate(s) {
    const f = fresh();
    if (!isObj(s)) return f;
    const out = Object.assign({}, f, s);
    out.where = Object.assign({}, f.where, s.where);
    out.learned = Object.assign({}, f.learned, s.learned);
    out.story = Object.assign({}, f.story, s.story);
    out.settings = Object.assign({}, f.settings, s.settings);
    out.srs = Object.assign({ cards: {} }, s.srs);
    for (const k of ['playMs', 'xp', 'cases']) if (!isObj(out[k])) out[k] = {};
    for (const k of ['done', 'scanned', 'unlocked', 'seen']) if (!Array.isArray(out.learned[k])) out.learned[k] = [];
    for (const k of ['stars', 'rounds']) if (!isObj(out.learned[k])) out.learned[k] = {};
    if (!Array.isArray(out.story.flags)) out.story.flags = [];
    if (!isObj(out.story.beats)) out.story.beats = {};
    if (!isObj(out.story.choices)) out.story.choices = {};
    out.schema = SCHEMA;
    return out;
  }

  /* ---------------- merge: two copies → one, nothing learned is lost ---------------- */
  const newer = (a, b) => ((b && b.t) || 0) > ((a && a.t) || 0) ? b : a;
  const maxMap = (a, b) => { const o = Object.assign({}, a); for (const k in b) o[k] = Math.max(o[k] || 0, b[k] || 0); return o; };
  const gcount = (a, b) => maxMap(a || {}, b || {});
  function merge(A, B) {
    if (!B) return migrate(A);
    if (!A) return migrate(B);
    const a = migrate(A), b = migrate(B);
    // a deliberate "New voyage" beats anything saved before it
    if (b.updated < a.resetAt) return a;
    if (a.updated < b.resetAt) return b;
    const o = fresh();
    o.resetAt = Math.max(a.resetAt, b.resetAt);
    o.created = Math.min(a.created, b.created);
    o.updated = Math.max(a.updated, b.updated);
    o.playMs = gcount(a.playMs, b.playMs);
    o.where = newer(a.where, b.where);
    o.learned = {
      done: uniq(a.learned.done.concat(b.learned.done)),
      scanned: uniq(a.learned.scanned.concat(b.learned.scanned)),
      unlocked: uniq(a.learned.unlocked.concat(b.learned.unlocked)),
      seen: uniq(a.learned.seen.concat(b.learned.seen)),
      stars: maxMap(a.learned.stars, b.learned.stars),
      rounds: maxMap(a.learned.rounds, b.learned.rounds)
    };
    o.xp = {};
    for (const sk of uniq(Object.keys(a.xp).concat(Object.keys(b.xp)))) o.xp[sk] = gcount(a.xp[sk], b.xp[sk]);
    o.srs = { cards: Object.assign({}, a.srs.cards) };
    for (const id in b.srs.cards) { const x = o.srs.cards[id], y = b.srs.cards[id]; if (!x || (y.last || 0) > (x.last || 0)) o.srs.cards[id] = y; }
    o.cases = Object.assign({}, a.cases);
    for (const id in b.cases) o.cases[id] = newer(o.cases[id], b.cases[id]);
    o.story = {
      t: Math.max(a.story.t, b.story.t),
      active: (b.story.t > a.story.t ? b : a).story.active,
      beats: Object.assign({}, a.story.beats),
      choices: Object.assign({}, a.story.choices),
      flags: uniq(a.story.flags.concat(b.story.flags))
    };
    for (const id in b.story.beats) o.story.beats[id] = Math.min(o.story.beats[id] || Infinity, b.story.beats[id]);
    for (const id in b.story.choices) o.story.choices[id] = newer(o.story.choices[id], b.story.choices[id]);
    o.settings = newer(a.settings, b.settings);
    return o;
  }

  /* ---------------- XP and skill levels (RuneScape-style) ---------------- */
  const SKILLS = {
    cardio: 'Cardiovascular', resp: 'Respiratory', renal: 'Renal', gi: 'Gastrointestinal',
    neuro: 'Neuroscience', immune: 'Immunity', endo: 'Endocrine', anatomy: 'Anatomy', clinical: 'Clinical reasoning'
  };
  const MAX_LEVEL = 30;
  const xpForLevel = L => Math.round(60 * Math.pow(L - 1, 2.1)); // L2 = 60, L10 ≈ 6.9k, L30 ≈ 70k
  const xpTotal = (s, skill) => Object.values((s.xp || {})[skill] || {}).reduce((x, y) => x + y, 0);
  function level(xp) { let L = 1; while (L < MAX_LEVEL && xp >= xpForLevel(L + 1)) L++; return L; }
  function addXp(s, skill, n) {
    if (!SKILLS[skill] || !(n > 0)) return 0;
    const before = level(xpTotal(s, skill));
    const d = deviceId();
    s.xp[skill] = s.xp[skill] || {};
    s.xp[skill][d] = (s.xp[skill][d] || 0) + Math.round(n);
    const after = level(xpTotal(s, skill));
    return after > before ? after : 0; // returns the new level when a level-up happens
  }

  /* ---------------- Supabase auth (implicit flow, plain fetch) ---------------- */
  const cfg = { url: '', key: '', gameVersion: '', slot: 'main' };
  let auth = readJSON(LS_AUTH, null); // { access_token, refresh_token, expires_at, user:{id,email} }
  const cloudReady = () => !!(cfg.url && cfg.key && root.fetch && root.location && /^https?:/.test(root.location.protocol));
  const hdr = tok => Object.assign({ apikey: cfg.key, 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {});
  const redirectTo = () => root.location.origin + root.location.pathname;

  async function signInEmail(email) {
    if (!cloudReady()) throw new Error('Cloud saves are only available on the hosted game.');
    const r = await fetch(`${cfg.url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo())}`, {
      method: 'POST', headers: hdr(), body: JSON.stringify({ email: String(email).trim(), create_user: true })
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).msg || 'Could not send the sign-in link.');
    return true; // tell the player to check their inbox
  }
  function signInGoogle() {
    if (!cloudReady()) throw new Error('Cloud saves are only available on the hosted game.');
    flushLocal(); // the page is about to navigate away
    root.location.assign(`${cfg.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo())}`);
  }
  async function fetchUser(tok) {
    const r = await fetch(`${cfg.url}/auth/v1/user`, { headers: hdr(tok) });
    if (!r.ok) throw new Error('user');
    const u = await r.json();
    return { id: u.id, email: u.email };
  }
  // After a magic link or Google sign-in, Supabase sends the player back with tokens in the URL hash.
  async function captureRedirect() {
    if (!root.location || !root.location.hash || root.location.hash.indexOf('access_token=') < 0) return false;
    const p = new URLSearchParams(root.location.hash.slice(1));
    const access = p.get('access_token'), refresh = p.get('refresh_token'), exp = +p.get('expires_in') || 3600;
    try { root.history.replaceState(null, '', root.location.pathname + root.location.search); } catch (e) {}
    if (!access) return false;
    auth = { access_token: access, refresh_token: refresh, expires_at: now() + exp * 1000 };
    try { auth.user = await fetchUser(access); } catch (e) { auth = null; writeJSON(LS_AUTH, null); return false; }
    writeJSON(LS_AUTH, auth);
    return true;
  }
  async function token() {
    if (!auth) return null;
    if (auth.expires_at - now() > 60000) return auth.access_token;
    const r = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers: hdr(), body: JSON.stringify({ refresh_token: auth.refresh_token })
    }).catch(() => null);
    if (!r) return null; // offline: keep the session, try later
    if (!r.ok) { auth = null; store.removeItem(LS_AUTH); emit('auth'); return null; }
    const j = await r.json();
    auth = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: now() + (j.expires_in || 3600) * 1000, user: j.user ? { id: j.user.id, email: j.user.email } : auth.user };
    writeJSON(LS_AUTH, auth);
    return auth.access_token;
  }
  async function signOut() {
    const tok = auth && auth.access_token;
    auth = null; store.removeItem(LS_AUTH); cloudRev = 0; store.removeItem(LS_KEY + '.rev');
    if (tok && cloudReady()) fetch(`${cfg.url}/auth/v1/logout`, { method: 'POST', headers: hdr(tok) }).catch(() => {});
    emit('auth');
  }

  /* ---------------- cloud read / write ---------------- */
  let cloudRev = +(store.getItem(LS_KEY + '.rev') || 0);
  const setRev = r => { cloudRev = r; store.setItem(LS_KEY + '.rev', String(r)); };
  async function cloudGet() {
    const tok = await token(); if (!tok) return null;
    const r = await fetch(`${cfg.url}/rest/v1/saves?slot=eq.${cfg.slot}&select=data,rev,updated_at`, { headers: hdr(tok) });
    if (!r.ok) throw new Error('load ' + r.status);
    const rows = await r.json();
    return rows[0] || null;
  }
  async function cloudPut(data, tries) {
    const tok = await token(); if (!tok) return false;
    const r = await fetch(`${cfg.url}/rest/v1/rpc/save_game`, {
      method: 'POST', headers: hdr(tok), keepalive: true,
      body: JSON.stringify({ p_slot: cfg.slot, p_data: data, p_base_rev: cloudRev, p_version: cfg.gameVersion || null })
    });
    if (!r.ok) throw new Error('save ' + r.status);
    const row = (await r.json())[0];
    if (row.ok) { setRev(row.server_rev); return true; }
    // Another device saved first: merge its copy into ours and retry.
    setRev(row.server_rev);
    const mine = state.where;
    state = merge(state, row.server_data);
    if (state.where !== mine && state.where.t > (mine.t || 0)) {
      // The player moved on another device more recently (RuneScape logs the old session out).
      // Stop saving this tab's position until the game either jumps there (restore) or the
      // player chooses to stay here (takeOver).
      superseded = true; emit('superseded');
    }
    writeLocal();
    if ((tries || 0) >= 2) return false;
    return cloudPut(state, (tries || 0) + 1);
  }

  /* ---------------- runtime ---------------- */
  let superseded = false, state = null, hooks = {}, localTimer = 0, lastCloud = 0, cloudTimer = 0, sessionStart = now(), status = 'local';
  const listeners = [];
  function emit(what) { for (const f of listeners) { try { f(what, api); } catch (e) {} } if (hooks.onChange) { try { hooks.onChange(what, api); } catch (e) {} } }

  function pull() { // ask the game for its current state and fold it into ours
    if (!hooks.snapshot || !state) return;
    let snap; try { snap = hooks.snapshot(); } catch (e) { return; }
    if (!snap) return;
    const t = now();
    const d = deviceId();
    state.playMs[d] = (state.playMs[d] || 0) + (t - sessionStart); sessionStart = t;
    // learned parts grow by merge; where/cases/settings/story are stamped "now" so they win
    const f0 = fresh();
    const inc = migrate(Object.assign({}, snap, { xp: state.xp, playMs: state.playMs }));
    // "where" only counts as new when the player actually moved, so an idle tab saving later
    // does not drag a player back to where they were on that device
    const norm = w => { const o = Object.assign({}, f0.where, w, { t: 0 }); return JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]])); };
    if (snap.where && superseded) inc.where = state.where;
    else if (snap.where) inc.where = norm(snap.where) === norm(state.where) ? state.where : Object.assign({}, f0.where, snap.where, { t });
    if (snap.settings) inc.settings = Object.assign({}, snap.settings, { t });
    if (snap.story) inc.story = Object.assign({}, state.story, snap.story, { t });
    for (const id in (snap.cases || {})) inc.cases[id] = Object.assign({}, snap.cases[id], { t });
    // The game's done/scanned sets can shrink only through a deliberate reset, which goes through IVSave.reset()
    state = merge(state, inc);
    state.where = inc.where.t ? inc.where : state.where;
    state.updated = t;
  }
  function writeLocal() {
    const prev = store.getItem(LS_KEY);
    if (prev) { try { store.setItem(LS_BAK, prev); } catch (e) {} }
    writeJSON(LS_KEY, state);
  }
  function flushLocal() { clearTimeout(localTimer); localTimer = 0; pull(); writeLocal(); }
  async function flushCloud() {
    clearTimeout(cloudTimer); cloudTimer = 0;
    if (!auth || !cloudReady()) return;
    lastCloud = now();
    status = 'syncing'; emit('status');
    try { await cloudPut(state); status = 'synced'; }
    catch (e) { status = 'offline'; }
    emit('status');
  }
  function touch(reason) {
    if (!state) return;
    if (!localTimer) localTimer = setTimeout(flushLocal, LOCAL_DEBOUNCE_MS);
    if (auth && cloudReady() && !cloudTimer) {
      const wait = Math.max(0, CLOUD_THROTTLE_MS - (now() - lastCloud));
      cloudTimer = setTimeout(() => { flushLocal(); flushCloud(); }, wait);
    }
  }
  async function flush() { flushLocal(); await flushCloud(); }

  // One-time import of the game's older separate keys so nobody loses progress on upgrade.
  function importLegacy(s) {
    const rounds = readJSON('ivRounds', null), chest = readJSON('ivChest', null), srs = readJSON('iv.srs', null);
    // mission ids repeat across boards (Neuro 'P1' ≠ Chest 'P1'), so stars are namespaced 'neuro:' / 'chest:'
    const ns = (m, p) => { const o = {}; for (const k in m) o[p + k] = m[k]; return o; };
    if (rounds) s.learned.stars = maxMap(s.learned.stars, ns(rounds, 'neuro:'));
    if (chest) s.learned.stars = maxMap(s.learned.stars, ns(chest, 'chest:'));
    if (srs && isObj(srs.cards)) for (const id in srs.cards) if (!/^deck:/.test(id)) s.srs.cards[id] = s.srs.cards[id] || srs.cards[id];
    return s;
  }

  async function init(opts) {
    opts = opts || {};
    hooks = { snapshot: opts.snapshot, restore: opts.restore, onChange: opts.onChange };
    cfg.url = (opts.supabaseUrl || '').replace(/\/$/, '');
    cfg.key = opts.supabaseAnonKey || '';
    cfg.gameVersion = opts.gameVersion || '';
    cfg.slot = opts.slot || 'main';
    if (root.addEventListener) {
      root.addEventListener('pagehide', () => { flushLocal(); flushCloud(); });
      if (root.document) root.document.addEventListener('visibilitychange', () => { if (root.document.visibilityState === 'hidden') { flushLocal(); flushCloud(); } });
      root.addEventListener('online', () => { if (auth) flushCloud(); });
    }
    if (cloudReady()) { try { if (await captureRedirect()) emit('auth'); } catch (e) {} }
    return load();
  }

  async function load() {
    const local = readJSON(LS_KEY, null);
    state = local ? migrate(local) : importLegacy(fresh());
    if (auth && cloudReady()) {
      try {
        status = 'syncing'; emit('status');
        const row = await cloudGet();
        if (row) { state = merge(state, row.data); setRev(row.rev); }
        else setRev(0);
        writeLocal();
        await cloudPut(state);
        status = 'synced';
      } catch (e) { status = 'offline'; }
      emit('status');
    }
    return state;
  }

  function restore() { superseded = false; if (state && hooks.restore) hooks.restore(state); }
  function takeOver() { superseded = false; touch('takeover'); }

  function reset() { // "New voyage": wipe progress on this device and, if signed in, in the cloud
    state = fresh(); state.resetAt = now(); writeLocal(); touch('reset');
    return state;
  }

  function exportFile() { return new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' }); }
  function importObject(obj) { state = merge(state, obj); writeLocal(); touch('import'); return state; }

  // "Last played 2 h ago · Lungs · generation 16" for the Continue button
  function continueLabel(s) {
    s = s || state;
    if (!s || !s.where || !s.where.world) return null;
    const ago = now() - (s.where.t || s.updated);
    const m = Math.round(ago / 60000);
    const when = m < 2 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago';
    return (s.where.label || s.where.world) + ' · ' + when;
  }

  const api = {
    SCHEMA, SKILLS, MAX_LEVEL,
    init, load, restore, takeOver, touch, flush, reset, merge, migrate, fresh,
    addXp: (skill, n) => (state ? addXp(state, skill, n) : 0),
    xp: skill => (state ? xpTotal(state, skill) : 0),
    level: skill => level(state ? xpTotal(state, skill) : 0),
    xpForLevel, levelOf: level,
    signInEmail, signInGoogle, signOut,
    get user() { return auth && auth.user ? auth.user : null; },
    get state() { return state; },
    get status() { return auth ? status : 'local'; },
    get superseded() { return superseded; },
    get cloudAvailable() { return cloudReady(); },
    on: f => listeners.push(f),
    exportFile, importObject, continueLabel,
    async deleteCloud() { const tok = await token(); if (!tok) return 0; const r = await fetch(`${cfg.url}/rest/v1/rpc/delete_my_saves`, { method: 'POST', headers: hdr(tok), body: '{}' }); setRev(0); return r.ok ? r.json() : 0; },
    _addXpTo: addXp, _deviceId: deviceId
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IVSave = api;
})(typeof window !== 'undefined' ? window : globalThis);
