/*
 * Knight Fitness 5RM Board — React app (mounted by /5rm.html).
 *
 * Screens: passcode gate → TV board (rotating leaderboards, movers, PBs,
 * milestone clubs, everyone's numbers) with member card and name picker;
 * phone layout under 760px; coach testing session; coach mode data admin.
 *
 * All calculations live in /5rm/board-core.js (global `KF5RM`) so they can be
 * unit-tested; this file only holds state, effects and markup.
 */

const { useEffect, useMemo, useReducer, useRef, useCallback } = React;
const K = window.KF5RM;

const LOGO = '/assets/5rm/knight-fitness-logo.png';
const KEYS = K.STORAGE_KEYS;
const L = K.LIMITS;

/* ---------- Page options (query string) ---------- */
// /5rm?rotate=20   seconds per view (6–40)
// /5rm?demo=1      preview with the prototype's placeholder history; nothing is saved
// /5rm?coach=1     open straight into score entry, for a coach's phone or iPad
const PAGE = (() => {
  const q = new URLSearchParams(window.location.search);
  return {
    rotateParam: q.has('rotate') ? K.clampRotate(q.get('rotate')) : null,
    demo: q.get('demo') === '1',
    coach: q.get('coach') === '1'
  };
})();

const coachLink = () => window.location.origin + window.location.pathname + '?coach=1';

/* ---------- Storage (guarded: private browsing can throw) ---------- */
const store = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  json(k) { try { return JSON.parse(store.get(k)); } catch (e) { return null; } },
  healthy() {
    try {
      const probe = 'kf5rm.probe';
      window.localStorage.setItem(probe, '1');
      const ok = window.localStorage.getItem(probe) === '1';
      window.localStorage.removeItem(probe);
      return ok;
    } catch (e) { return false; }
  }
};

function loadData() {
  if (PAGE.demo) return K.seedData({ placeholder: true });
  return K.normaliseData(store.json(KEYS.members)) || K.seedData();
}

function initState() {
  return {
    view: 0, rotating: true, elapsed: 0,
    prog: 'all', club: 'all',
    sel: null, picker: false, me: null, meAt: 0, mq: '',
    edit: false, imp: false, q: '', impText: '', histOpen: false, rosterSort: 'name',
    bulk: false, bulkText: '', bulkProg: 'g1', bulkSimilar: false, bulkMsg: '', copied: 0,
    data: loadData(),
    settings: K.normaliseSettings(store.json(KEYS.settings)),
    hist: Array.isArray(store.json(KEYS.history)) ? store.json(KEYS.history) : [],
    outbox: Array.isArray(store.json(KEYS.outbox)) ? store.json(KEYS.outbox) : [],
    saved: 0, persist: '', storeOk: true,
    syncMsg: '', lastSync: 0,
    mobile: false,
    sess: null, undoLabel: '', apiMsg: '', apiState: '', apiTest: null,
    unlocked: false, pinOpen: false, pinDraft: '', pinAfter: '', pinErr: '',
    vDraft: '', vErr: '', viewOk: K.unlockValid(store.get(KEYS.unlock))
  };
}

const merge = (st, p) => Object.assign({}, st, typeof p === 'function' ? p(st) : p);
const cx = (...a) => a.filter(Boolean).join(' ');

/* ================================================================== */
/* Root                                                                */
/* ================================================================== */

function FiveRMBoard() {
  const [s, patch] = useReducer(merge, null, initState);
  const stateRef = useRef(s);
  stateRef.current = s;
  const idleRef = useRef(0);
  const undoRef = useRef(null);
  const apiRef = useRef({});
  const roRef = useRef(null);

  /* ---------- Derived data ---------- */
  const members = useMemo(() => K.buildMembers(s.data), [s.data]);
  const views = useMemo(() => K.buildViews(s.data, s.club, s.prog, s.settings), [s.data, s.club, s.prog, s.settings]);
  const clubs = useMemo(() => K.clubsPresent(s.data), [s.data]);
  const v = views[Math.min(s.view, views.length - 1)] || views[0];
  const st = s.settings;
  const rotateSeconds = K.effectiveRotate(s.settings, PAGE.rotateParam);
  const dur = rotateSeconds * 1000;
  const twoClubs = clubs.length > 1;
  const clubScope = v.club || (s.club === 'all' ? null : s.club);
  const filtered = useMemo(() => K.scopeMembers(members, clubScope, s.prog), [members, clubScope, s.prog]);
  const publicMembers = useMemo(() => members.filter(K.hasNumbers), [members]);
  // The crews view compares crews, so it ignores the crew filter but keeps the club one.
  const clubScoped = useMemo(() => K.scopeMembers(members, clubScope, 'all'), [members, clubScope]);
  const setRosterSort = id => { markIdle(); patch({ rosterSort: id, rotating: false }); };
  const locked = !!st.lock;
  const linked = !!(st.sheets || '').trim();
  const sheetLocked = linked && !(st.api || '').trim();
  const activeCrew = K.program(s.prog);
  const isMe = name => !!s.me && s.me === name && Date.now() - (s.meAt || 0) < L.meTtlMs;
  const crewColor = m => K.progColor(m.prog);

  /* ---------- Persistence ---------- */
  const persistOutbox = list => { if (!PAGE.demo) store.set(KEYS.outbox, JSON.stringify(list)); };

  const save = useCallback(data => {
    const now = Date.now();
    patch(prev => {
      const snap = K.snapshotHistory(prev.hist, prev.data, now);
      if (snap.added && !PAGE.demo) store.set(KEYS.history, JSON.stringify(snap.hist));
      return { data, saved: now, hist: snap.hist };
    });
    if (!PAGE.demo) store.set(KEYS.members, JSON.stringify(data));
  }, []);

  const setSetting = useCallback((key, value) => {
    patch(prev => {
      const next = Object.assign({}, prev.settings, { [key]: value });
      if (!PAGE.demo) store.set(KEYS.settings, JSON.stringify(next));
      return { settings: next };
    });
  }, []);

  /* ---------- Interaction helpers ---------- */
  const markIdle = () => { idleRef.current = Date.now(); };

  const touch = () => {
    if (stateRef.current.settings.lock) return;
    markIdle();
    if (stateRef.current.rotating) patch({ rotating: false });
  };

  const go = i => {
    if (locked) return;
    markIdle();
    patch({ view: i, rotating: false, elapsed: 0, sel: null, picker: false });
  };

  const open = m => e => {
    if (e) e.stopPropagation();
    if (locked) return;
    markIdle();
    patch({ sel: m.name, rotating: false, picker: false, me: m.name, meAt: Date.now() });
  };

  const openQuiet = m => e => {
    if (e) e.stopPropagation();
    if (locked) return;
    markIdle();
    patch({ sel: m.name, rotating: false });
  };

  /* ---------- Coach gate ---------- */
  const gate = target => {
    const pin = stateRef.current.settings.pin || '';
    if (pin && !stateRef.current.unlocked) { patch({ pinOpen: true, pinDraft: '', pinAfter: target, pinErr: '' }); return false; }
    return true;
  };

  const freshSession = prog => ({
    mode: '', lift: '', active: 'sq', drafts: {}, cur: null, done: {}, q: '',
    prog: prog || 'all', remainingOnly: false, confirm: null, dateAsked: false, dateStrip: false
  });

  const openSession = () => {
    markIdle();
    if (!gate('sess')) return;
    patch(prev => ({ sess: freshSession(prev.prog), edit: false, rotating: false, sel: null, picker: false }));
  };

  const openCoach = () => {
    markIdle();
    if (!gate('coach')) return;
    patch({ edit: true, rotating: false, sel: null, picker: false });
  };

  // /5rm?coach=1 skips the board: a coach opening the link is here to enter scores.
  const coachOpened = useRef(false);
  useEffect(() => {
    if (!PAGE.coach || coachOpened.current) return;
    if (!s.viewOk && (s.settings.viewPin || '').trim()) return;
    coachOpened.current = true;
    openSession();
  });

  const pinKey = k => {
    const cur = stateRef.current;
    const r = K.codeStep(cur.pinDraft, k, cur.settings.pin || '', 'Wrong PIN');
    if (r.ok) {
      patch({ unlocked: true, pinOpen: false, pinDraft: '', pinErr: '' });
      if (cur.pinAfter === 'sess') patch({ sess: freshSession(cur.prog), edit: false, rotating: false, sel: null, picker: false });
      else patch({ edit: true, rotating: false, sel: null, picker: false });
      return;
    }
    patch({ pinDraft: r.draft, pinErr: r.err });
  };

  const viewKey = k => {
    const cur = stateRef.current;
    const r = K.codeStep(cur.vDraft, k, cur.settings.viewPin || '', 'Not quite — try again');
    if (r.ok) {
      if (!PAGE.demo) store.set(KEYS.unlock, String(Date.now()));
      patch({ viewOk: true, vDraft: '', vErr: '' });
      return;
    }
    patch({ vDraft: r.draft, vErr: r.err });
  };

  /* ---------- Sheet sync + save-back ---------- */
  const syncNow = useCallback(silent => {
    const cur = stateRef.current;
    const links = K.parseSheetLinks(cur.settings.sheets);
    if (!links.length) { if (!silent) patch({ syncMsg: 'Add at least one published sheet link first.' }); return; }
    patch({ syncMsg: 'Syncing…' });
    Promise.all(links.map(l => fetch(l.url, { cache: 'no-store' })
      .then(r => (r.ok ? r.text() : Promise.reject(r.status)))
      .then(t => K.parseSheet(t, l.lift))
      .catch(() => null)))
      .then(results => {
        const latest = stateRef.current;
        const club = latest.club === 'all' ? K.clubsPresent(latest.data)[0] : latest.club;
        const r = K.mergeSheetResults(latest.data, results, club);
        if (r.failed < links.length) save(r.data);
        patch({ syncMsg: K.syncMessage(r, links.length, Date.now()), lastSync: Date.now() });
      });
  }, [save]);

  const pushRemote = useCallback(row => {
    const cur = stateRef.current;
    const api = (cur.settings.api || '').trim();
    if (!api) return;
    fetch(api, { method: 'POST', body: K.saveBody(cur.settings.pin, row) })
      .then(r => r.text())
      .then(text => {
        const res = K.parseApiReply(text);
        patch(prev => {
          const outbox = K.outboxRemove(prev.outbox, row.name);
          persistOutbox(outbox);
          if (!res.ok) {
            return { apiState: 'error', apiMsg: 'The sheet refused that score: ' + res.error + '. Check the coach PIN matches the script.', outbox };
          }
          return { apiState: outbox.length ? 'queued' : 'ok', apiMsg: 'Saved into the sheet · ' + K.timeShort(Date.now()), outbox };
        });
      })
      .catch(() => {
        patch(prev => {
          const outbox = K.outboxAdd(prev.outbox, row);
          persistOutbox(outbox);
          return { apiState: 'queued', apiMsg: 'Could not reach the sheet. Saved on this device and queued to retry.', outbox };
        });
      });
  }, []);

  // Verifies the save-back link and the coach PIN without writing a score.
  const testConnection = useCallback(() => {
    const cur = stateRef.current;
    const api = (cur.settings.api || '').trim();
    if (!api) { patch({ apiTest: { state: 'error', msg: 'Paste the save-back link first.' } }); return; }
    patch({ apiTest: { state: 'checking', msg: 'Checking…' } });
    fetch(api, { method: 'POST', body: K.pingBody(cur.settings.pin) })
      .then(r => r.text())
      .then(text => {
        const res = K.parseApiReply(text);
        patch({ apiTest: res.ok
          ? { state: 'ok', msg: 'Connected. Scores entered on this board will write into the sheet.' }
          : { state: 'error', msg: 'The script answered but refused: ' + res.error + '. Set COACH_PIN in the script to match the coach PIN here.' } });
      })
      .catch(() => patch({ apiTest: { state: 'error', msg: 'Could not reach that link. Check it ends in /exec and is deployed so anyone can run it.' } }));
  }, []);

  const flushOutbox = useCallback(exceptName => {
    const cur = stateRef.current;
    if (!(cur.settings.api || '').trim()) return;
    cur.outbox.filter(x => !exceptName || !K.sameName(x.name, exceptName)).forEach(pushRemote);
  }, [pushRemote]);

  /* ---------- Testing session ---------- */
  // The list a coach walks. Filtered to one crew, and optionally to whoever is
  // still outstanding, so a 5:40 AM session is a dozen people and not the whole gym.
  const sessScope = s.sess ? K.buildQueue(s.data, s.club, s.sess.prog) : [];
  const sessList = s.sess ? K.sessionQueue(s.data, s.club, s.sess.prog, s.sess.done, s.sess.remainingOnly) : [];
  const sessRow = s.sess && s.sess.cur !== null && s.sess.cur !== undefined ? s.data[s.sess.cur] : null;

  const sessSet = p => patch(prev => ({ sess: Object.assign({}, prev.sess, typeof p === 'function' ? p(prev.sess) : p) }));

  // Who to land on after handling `from`: the next in line, or whoever moved into
  // their slot once they dropped out of a "still to do" list.
  const nextCur = (before, after, from) => {
    if (!after.length) return null;
    const still = after.findIndex(x => x.i === from);
    if (still >= 0) return after[Math.min(still + 1, after.length - 1)].i;
    const was = before.findIndex(x => x.i === from);
    return after[Math.min(Math.max(was, 0), after.length - 1)].i;
  };

  const startSession = (mode, liftKey) => {
    const cur = stateRef.current;
    const q = K.sessionQueue(cur.data, cur.club, cur.sess.prog, {}, false);
    sessSet({ mode, lift: liftKey || '', active: liftKey || 'sq', drafts: {}, confirm: null, cur: q.length ? q[0].i : null });
  };

  const setSessCrew = prog => {
    const cur = stateRef.current;
    const q = K.sessionQueue(cur.data, cur.club, prog, cur.sess.done, cur.sess.remainingOnly);
    sessSet({ prog, drafts: {}, confirm: null, q: '', cur: q.length ? q[0].i : null });
  };

  const toggleRemaining = () => {
    const cur = stateRef.current;
    const on = !cur.sess.remainingOnly;
    const q = K.sessionQueue(cur.data, cur.club, cur.sess.prog, cur.sess.done, on);
    const keep = q.some(x => x.i === cur.sess.cur);
    sessSet({ remainingOnly: on, drafts: keep ? cur.sess.drafts : {}, confirm: null, cur: keep ? cur.sess.cur : (q.length ? q[0].i : null) });
  };

  const commitSave = () => {
    const cur = stateRef.current;
    const ss = cur.sess;
    if (!ss || ss.cur === null || ss.cur === undefined) return;
    const filled = K.draftsFilled(ss.drafts);
    if (!filled.length) return;
    const before = K.sessionQueue(cur.data, cur.club, ss.prog, ss.done, ss.remainingOnly);
    undoRef.current = { data: K.clone(cur.data), cur: ss.cur, drafts: ss.drafts };
    let data = cur.data;
    filled.forEach(k => { data = K.recordScore(data, ss.cur, k, ss.drafts[k], K.todayIso()); });
    save(data);
    const name = (cur.data[ss.cur] || {}).name || '';
    patch({ undoLabel: 'Undo ' + name + ' · ' + filled.map(k => K.lift(k).label + ' ' + ss.drafts[k] + ' kg').join(' · ') });
    pushRemote(data[ss.cur]);
    flushOutbox(name);
    const done = Object.assign({}, ss.done, { [ss.cur]: 'done' });
    const after = K.sessionQueue(data, cur.club, ss.prog, done, ss.remainingOnly);
    const askDate = cur.settings.tested !== K.todayIso();
    sessSet(prev => ({
      done, drafts: {}, confirm: null,
      cur: nextCur(before, after, ss.cur),
      active: prev.mode === 'member' ? 'sq' : prev.active,
      dateAsked: prev.dateAsked || askDate,
      dateStrip: prev.dateAsked ? prev.dateStrip : askDate
    }));
  };

  // First press checks the numbers; an unusual entry asks once before it goes in.
  const sessSave = () => {
    const cur = stateRef.current;
    const ss = cur.sess;
    if (!ss || ss.cur === null || ss.cur === undefined) return;
    if (!K.draftsFilled(ss.drafts).length) return;
    if (!ss.confirm) {
      const warnings = K.checkEntries(ss.drafts, cur.data[ss.cur]);
      if (warnings.length) { sessSet({ confirm: warnings }); return; }
    }
    commitSave();
  };

  const useSuggestion = w => sessSet(prev => {
    const drafts = Object.assign({}, prev.drafts);
    drafts[w.lift] = w.suggestion;
    return { drafts, confirm: null, active: w.lift };
  });

  const sessSkip = () => {
    const cur = stateRef.current;
    const ss = cur.sess;
    if (!ss || ss.cur === null || ss.cur === undefined) return;
    const before = K.sessionQueue(cur.data, cur.club, ss.prog, ss.done, ss.remainingOnly);
    const done = Object.assign({}, ss.done, { [ss.cur]: 'skip' });
    const after = K.sessionQueue(cur.data, cur.club, ss.prog, done, ss.remainingOnly);
    sessSet({ done, drafts: {}, confirm: null, cur: nextCur(before, after, ss.cur) });
  };

  const sessBack = () => {
    const cur = stateRef.current;
    const ss = cur.sess;
    if (!ss) return;
    const q = K.sessionQueue(cur.data, cur.club, ss.prog, ss.done, ss.remainingOnly);
    const pos = q.findIndex(x => x.i === ss.cur);
    if (pos > 0) sessSet({ cur: q[pos - 1].i, drafts: {}, confirm: null });
  };

  // Undo puts the numbers back and returns to that member with what was typed,
  // so a wrong entry can be corrected rather than retyped from scratch.
  const sessUndo = () => {
    const u = undoRef.current;
    if (!u) return;
    undoRef.current = null;
    patch({ data: u.data, undoLabel: '' });
    if (!PAGE.demo) store.set(KEYS.members, JSON.stringify(u.data));
    sessSet(prev => {
      const done = Object.assign({}, prev.done);
      delete done[u.cur];
      return { done, cur: u.cur, drafts: u.drafts || {}, confirm: null };
    });
  };

  const sessClose = () => patch({ sess: null, rotating: true, elapsed: 0 });

  const padKey = k => sessSet(prev => {
    const drafts = Object.assign({}, prev.drafts);
    drafts[prev.active] = K.padKey(drafts[prev.active], k);
    return { drafts, confirm: null };
  });

  const padAdd = n => {
    const cur = stateRef.current;
    const ss = cur.sess;
    const current = ((cur.data[ss.cur] || {})[ss.active] || {}).c || '';
    sessSet(prev => {
      const drafts = Object.assign({}, prev.drafts);
      drafts[prev.active] = K.padAdd(drafts[prev.active], current, n);
      return { drafts, confirm: null };
    });
  };

  const setActive = k => sessSet({ active: k, confirm: null });

  const cycleActive = dir => sessSet(prev => {
    if (prev.mode !== 'member') return {};
    const i = K.LIFT_KEYS.indexOf(prev.active);
    return { active: K.LIFT_KEYS[(i + dir + K.LIFT_KEYS.length) % K.LIFT_KEYS.length], confirm: null };
  });

  // Offered after the first score of a session, where the coach already is.
  const useTodayAsTested = () => {
    const today = K.todayIso();
    setSetting('tested', today);
    if (K.nextNeedsUpdate(stateRef.current.settings)) setSetting('next', K.suggestNext(today));
    sessSet({ dateStrip: false });
  };

  const addNamed = name => {
    const cur = stateRef.current;
    const n = String(name || '').trim();
    if (!n) return;
    const club = cur.club === 'all' ? K.clubsPresent(cur.data)[0] : cur.club;
    const prog = cur.sess && cur.sess.prog !== 'all' ? cur.sess.prog : 'g1';
    const data = K.setMeta(K.addMember(cur.data, n, club), cur.data.length, 'prog', prog);
    save(data);
    if (cur.sess) {
      const i = K.findByName(data, n);
      sessSet({ q: '', drafts: {}, confirm: null, cur: i < 0 ? null : i });
    }
  };

  /* ---------- Coach mode data actions ---------- */
  const field = (i, lift, which, value) => save(K.setField(stateRef.current.data, i, lift, which, value, K.todayIso()));
  const meta = (i, key, value) => save(K.setMeta(stateRef.current.data, i, key, value));
  const openBulk = () => patch(prev => ({
    bulk: true, bulkText: '', bulkSimilar: false, bulkMsg: '',
    bulkProg: prev.prog !== 'all' ? prev.prog : 'g1'
  }));

  const applyBulk = () => {
    const cur = stateRef.current;
    const club = cur.club === 'all' ? K.clubsPresent(cur.data)[0] : cur.club;
    const plan = K.planBulkAdd(cur.data, K.parseBulkNames(cur.bulkText, cur.bulkProg));
    const entries = plan.add.concat(cur.bulkSimilar ? plan.similar : []);
    if (!entries.length) { patch({ bulkMsg: 'Nothing new to add.' }); return; }
    save(K.addMembers(cur.data, entries, club));
    patch({ bulk: false, bulkText: '', bulkMsg: 'Added ' + (entries.length === 1 ? '1 member' : entries.length + ' members') + '.' });
  };

  const copyCoachLink = () => {
    const url = coachLink();
    const done = () => { patch({ copied: Date.now() }); setTimeout(() => patch({ copied: 0 }), 3000); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => done());
      return;
    }
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    try { document.execCommand('copy'); } catch (e) { /* the field is selectable either way */ }
    document.body.removeChild(el);
    done();
  };
  const removeMember = (i, name) => { if (window.confirm('Remove ' + name + ' from the board?')) save(K.removeMember(stateRef.current.data, i)); };
  const mergeRows = (keep, drop) => save(K.mergeRows(stateRef.current.data, keep, drop));
  const applyImport = () => {
    const cur = stateRef.current;
    const club = cur.club === 'all' ? K.clubsPresent(cur.data)[0] : cur.club;
    const out = K.applyImport(cur.data, cur.impText, club);
    if (!out) return;
    save(out);
    patch({ imp: false, impText: '' });
  };
  const rollForward = () => {
    if (!window.confirm('Copy every current 5RM into the "previous" column, ready for this round of testing?')) return;
    const stamp = stateRef.current.settings.tested || K.todayIso();
    save(K.rollForward(stateRef.current.data, stamp));
  };
  const resetSeed = () => { if (window.confirm('Discard all edits on this screen and reload the original spreadsheet numbers?')) save(K.seedData()); };
  const restore = i => {
    const h = stateRef.current.hist[i];
    if (!h) return;
    if (!window.confirm('Restore the version saved ' + new Date(h.t).toLocaleString('en-AU') + '? Current numbers will be replaced.')) return;
    patch({ data: h.data, saved: Date.now() });
    if (!PAGE.demo) store.set(KEYS.members, JSON.stringify(h.data));
  };
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(stateRef.current.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'knight-5rm-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  /* ---------- Layout: fit the 1920x1080 stage, detect phones ---------- */
  const resize = useCallback(() => {
    const de = document.documentElement;
    const w = de.clientWidth || window.innerWidth;
    const h = de.clientHeight || window.innerHeight;
    if (!w || !h) return;
    const mob = w < L.touchBreak;
    if (stateRef.current.mobile !== mob) patch({ mobile: mob });
    de.style.setProperty('--tv-scale', String(Math.min(w / 1920, h / 1080)));
  }, []);

  const stageRef = useCallback(node => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    if (!node) return;
    resize();
    if (window.ResizeObserver && node.parentElement) {
      roRef.current = new ResizeObserver(() => resize());
      roRef.current.observe(node.parentElement);
    }
  }, [resize]);

  useEffect(() => { resize(); });

  // Latest handlers for the window-level keyboard listener.
  apiRef.current = { padKey, sessSave, sessSkip, sessBack, sessClose, cycleActive };

  /* ---------- Mount: timers and listeners ---------- */
  useEffect(() => {
    if (!store.healthy()) patch({ storeOk: false });

    const flush = () => {
      if (PAGE.demo) return;
      store.set(KEYS.members, JSON.stringify(stateRef.current.data));
      store.set(KEYS.settings, JSON.stringify(stateRef.current.settings));
    };
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);

    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted()
        .then(p => (p ? patch({ persist: 'on' }) : navigator.storage.persist().then(ok => patch({ persist: ok ? 'on' : 'off' }))))
        .catch(() => {});
    }

    let syncTimer = null;
    if ((stateRef.current.settings.sheets || '').trim()) {
      syncNow(true);
      syncTimer = setInterval(() => syncNow(true), L.syncMs);
    }

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', resize);
    const fitTimer = setInterval(resize, 2000);

    const onKey = e => {
      const cur = stateRef.current;
      if (!cur.sess || !cur.sess.mode) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Enter' && e.target.blur) e.target.blur();
        return;
      }
      const a = apiRef.current;
      if (/^[0-9]$/.test(e.key)) { a.padKey(e.key); e.preventDefault(); }
      else if (e.key === '.') { a.padKey('.'); e.preventDefault(); }
      else if (e.key === 'Backspace') { a.padKey('del'); e.preventDefault(); }
      else if (e.key === 'Enter') { a.sessSave(); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'Tab') { a.sessSkip(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { a.sessBack(); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { a.cycleActive(1); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { a.cycleActive(-1); e.preventDefault(); }
      else if (e.key === 'Escape') { a.sessClose(); }
    };
    window.addEventListener('keydown', onKey);

    const tick = setInterval(() => {
      const cur = stateRef.current;
      const d = K.effectiveRotate(cur.settings, PAGE.rotateParam) * 1000;
      if (cur.settings.norotate) { if (cur.rotating) patch({ rotating: false }); return; }
      if (!cur.rotating) {
        if (!cur.edit && !cur.imp && !cur.sess && Date.now() - idleRef.current > L.idleResumeMs) {
          patch({ rotating: true, elapsed: 0, sel: null, picker: false });
        }
        return;
      }
      const e = cur.elapsed + 200;
      if (e >= d) {
        const n = K.buildViews(cur.data, cur.club, cur.prog, cur.settings).length;
        patch({ view: (cur.view + 1) % n, elapsed: 0 });
      } else patch({ elapsed: e });
    }, 200);

    const outboxTimer = setInterval(() => { if (stateRef.current.outbox.length) flushOutbox(); }, 60000);

    return () => {
      clearInterval(tick); clearInterval(fitTimer); clearInterval(outboxTimer);
      if (syncTimer) clearInterval(syncTimer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', resize);
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
      if (roRef.current) roRef.current.disconnect();
    };
  }, [resize, syncNow, flushOutbox]);

  // (Re)start the periodic sheet sync when links are added in Coach mode.
  const sheetsKey = (st.sheets || '').trim();
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (!sheetsKey) return;
    const t = setInterval(() => syncNow(true), L.syncMs);
    return () => clearInterval(t);
  }, [sheetsKey, syncNow]);

  /* ---------- Header content ---------- */
  const cycle = K.cycleLabel(st);
  const testedShort = st.tested ? 'Tested ' + K.dateShort(st.tested) : 'Testing dates not set';
  const clubTitle = clubScope ? K.clubLabel(clubScope) : (twoClubs ? 'Whole gym' : K.clubLabel(clubs[0]));
  const statusLabel = st.norotate
    ? 'Rotation off · ' + v.label
    : linked
      ? 'Live from the gym sheet' + (s.lastSync ? ' · synced ' + K.timeShort(s.lastSync) : '')
      : (s.rotating ? 'Board rotating' : 'Exploring — resumes shortly');
  const selMember = s.sel ? members.find(x => x.name === s.sel) : null;
  const boardAlert = !s.storeOk
    ? 'This screen cannot save scores — tell a coach'
    : s.outbox.length
      ? (s.outbox.length === 1 ? '1 score still to reach the sheet' : s.outbox.length + ' scores still to reach the sheet')
      : '';

  const setCrew = e => {
    if (locked) return;
    markIdle();
    patch({ prog: e.target.value, view: 0, rotating: false, elapsed: 0 });
  };
  const setClub = id => {
    if (locked) return;
    markIdle();
    patch({ club: id, view: 0, rotating: false, elapsed: 0 });
  };
  const openPicker = () => { markIdle(); patch({ picker: true, rotating: false }); };
  const closeSel = () => patch({ sel: null });

  const shared = { s, st, members, filtered, publicMembers, open, openQuiet, crewColor, isMe, selMember, testedShort, cycle };

  return (
    <React.Fragment>
      {!s.mobile ? (
        <div className="wrap wrap--tv">
          <div className="stage" ref={stageRef} onClick={touch}>
            <div className="progress"><div className="progress__fill" style={{ width: (s.rotating ? (s.elapsed / dur) * 100 : 0) + '%' }} /></div>

            <header className="tv-head">
              <div className="tv-head__brand">
                <img className="tv-head__logo" src={LOGO} alt="Knight Fitness" />
                <div className="tv-head__divider" />
                <div className="tv-head__titles">
                  <div className="tv-head__titleRow">
                    <div className="tv-head__club">{clubTitle}</div>
                    <div className="tv-head__board">5RM Board</div>
                  </div>
                  <div className="eyebrow">{cycle}</div>
                </div>
              </div>
              <div className="tv-head__controls">
                <div className="chip-row">
                  {K.enabledViews(st).map(key => K.viewSpec(key)).map(spec => (
                    <div key={spec.label} className={cx('chip', K.viewMatches(v, spec) && 'chip--on')} onClick={() => go(K.navIndex(views, spec))}>{spec.label}</div>
                  ))}
                </div>
                <div className="chip-row">
                  {twoClubs && [{ id: 'all', label: 'Whole gym' }].concat(K.CLUBS.filter(c => clubs.indexOf(c.id) >= 0)).map(c => (
                    <div key={c.id} className={cx('chip chip--club', s.club === c.id && 'chip--on')} onClick={() => setClub(c.id)}>{c.label}</div>
                  ))}
                  <div className="crew-pill">
                    <div className="crew-pill__dot" style={{ background: activeCrew ? activeCrew.color : K.COLORS.neutralDot }} />
                    <select className="crew-pill__select" value={s.prog} onChange={setCrew} aria-label="Crew">
                      <option value="all">All crews</option>
                      {K.PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.label} crew</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </header>

            <main className="tv-content">
              {v.kind === 'board' && <LeaderboardView {...shared} lift={v.lift} activeCrew={activeCrew} />}
              {v.kind === 'movers' && <MoversView {...shared} />}
              {v.kind === 'gains' && <GainsView {...shared} />}
              {v.kind === 'crews' && <CrewsView {...shared} clubScoped={clubScoped} />}
              {v.kind === 'pbs' && <PbsView {...shared} />}
              {v.kind === 'miles' && <MilestonesView {...shared} />}
              {v.kind === 'roster' && <RosterView {...shared} page={v.page} onSort={setRosterSort} />}
            </main>

            <footer className="tv-foot">
              <div className="tv-foot__status">
                <div className="tv-foot__dot" style={{ background: boardAlert ? K.COLORS.red : s.rotating ? K.COLORS.success : K.COLORS.gold }} />
                <div className="tv-foot__text">{boardAlert || statusLabel}</div>
              </div>
              <div className="tv-foot__right">
                <div className="tv-foot__text">{s.rotating ? 'Tap the screen to explore →' : 'Tap a name for the full card →'}</div>
                <div className="tv-foot__actions">
                  {!locked && <div className="chip chip--action chip--dark" onClick={openPicker}>Find my numbers</div>}
                  <div className="chip chip--action chip--red" onClick={openSession}>Enter scores</div>
                  <div className="chip chip--action" onClick={openCoach}>Coach mode</div>
                </div>
              </div>
            </footer>

            {selMember && <MemberCard m={selMember} raw={s.data[selMember.idx]} st={st} testedShort={testedShort} onClose={closeSel} />}
            {s.picker && (
              <div className="scrim scrim--picker" onClick={() => patch({ picker: false })}>
                <div className="picker">
                  <div className="picker__title">Find your numbers</div>
                  <div className="picker__grid">
                    {publicMembers.map(m => <div key={m.name} className="picker__tile" onClick={open(m)}>{m.name}</div>)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <PhoneLayout {...shared} onEnterScores={openSession} onCloseSel={closeSel} setMq={mq => patch({ mq })} />
      )}

      {s.sess && (
        <SessionScreen
          s={s} list={sessList} scope={sessScope} row={sessRow} dest={K.saveDestination(st)}
          onClose={sessClose}
          onStart={startSession}
          onSwitch={() => sessSet({ mode: '', lift: '', drafts: {}, confirm: null, q: '', done: {}, remainingOnly: false })}
          onCrew={setSessCrew}
          onRemaining={toggleRemaining}
          onQuery={q => sessSet({ q })}
          onJump={i => sessSet({ cur: i, drafts: {}, confirm: null, q: '' })}
          onAdd={() => addNamed(s.sess.q)}
          onActive={setActive} onPad={padKey} onQuick={padAdd}
          onBack={sessBack} onSkip={sessSkip} onSave={sessSave} onUndo={sessUndo}
          onFix={() => sessSet({ confirm: null })} onSuggestion={useSuggestion}
          onUseToday={useTodayAsTested} onDismissDate={() => sessSet({ dateStrip: false })}
        />
      )}

      {!s.viewOk && !!(st.viewPin || '').trim() && (
        <div className="gate">
          <div className="gate__col">
            <img className="gate__logo" src={LOGO} alt="Knight Fitness" />
            <div className="gate__title">5RM Board</div>
            <div className="gate__dots">{'•'.repeat(s.vDraft.length) || 'Enter the gym passcode'}</div>
            <div className="gate__err">{s.vErr}</div>
            <div className="gate__pad">
              {K.KEYPAD.map(k => <div key={k} className="gate__key" onClick={() => viewKey(k)}>{K.keyLabel(k)}</div>)}
            </div>
            <div className="gate__note">Ask a coach for the passcode. This screen only asks once a month.</div>
          </div>
        </div>
      )}

      {s.pinOpen && (
        <div className="pin">
          <div className="pin__card">
            <div className="pin__title">Coaches only</div>
            <div className="pin__dots">{'•'.repeat(s.pinDraft.length) || 'Enter coach PIN'}</div>
            <div className="pin__err">{s.pinErr}</div>
            <div className="pin__pad">
              {K.KEYPAD.map(k => <div key={k} className="pin__key" onClick={() => pinKey(k)}>{K.keyLabel(k)}</div>)}
            </div>
            <div className="pin__cancel" onClick={() => patch({ pinOpen: false, pinDraft: '', pinErr: '' })}>Cancel</div>
          </div>
        </div>
      )}

      {s.edit && (
        <CoachMode
          s={s} st={st} linked={linked} sheetLocked={sheetLocked}
          patch={patch} setSetting={setSetting}
          onClose={() => { markIdle(); patch({ edit: false, imp: false, q: '' }); }}
          onSync={() => syncNow(false)}
          onField={field} onMeta={meta} onBulk={openBulk} onApplyBulk={applyBulk} onCopyLink={copyCoachLink} onRemove={removeMember} onMerge={mergeRows}
          onApplyImport={applyImport} onRollForward={rollForward} onReset={resetSeed} onRestore={restore} onExport={exportBackup}
          onTestConnection={testConnection}
          rotateSeconds={rotateSeconds}
        />
      )}
    </React.Fragment>
  );
}

/* ================================================================== */
/* TV views                                                            */
/* ================================================================== */

function ViewHead({ emoji, title, sub, right, wide }) {
  return (
    <div className={cx('view__head', right && 'view__head--between')}>
      <div className={cx('view__titles', wide && 'view__titles--wide')}>
        {emoji !== undefined && <div className="view__emoji">{emoji}</div>}
        <div className="view__title">{title}</div>
        <div className="view__sub">{sub}</div>
      </div>
      {right}
    </div>
  );
}

function LeaderboardView({ filtered, lift, activeCrew, open, crewColor, isMe }) {
  const lb = K.leaderboard(filtered, lift);
  const liftDef = K.lift(lift);
  const empty = lb.rows.length ? '' : (activeCrew ? 'The ' + activeCrew.label + ' crew has no numbers for this lift yet.' : 'No numbers recorded for this lift yet.');
  return (
    <div className="view">
      <ViewHead
        emoji={lb.isTotal ? '🏋️' : ''}
        title={lb.isTotal ? 'Big Three total' : liftDef.label + ' 5RM'}
        sub={lb.isTotal ? 'Squat + bench + deadlift · all three lifts tested' : lb.testedCount + ' members tested'}
      />
      {empty && <div className="empty-card">{empty}</div>}
      <div className="lb-grid">
        {lb.rows.map((r, i) => {
          const you = isMe(r.m.name);
          return (
            <div key={r.m.name} className={cx('lb-row', you && 'lb-row--you')} style={{ borderLeftColor: crewColor(r.m), animationDelay: (i * 0.015) + 's' }} onClick={open(r.m)}>
              <div className={cx('lb-row__rank', i === 0 ? 'lb-row__rank--gold' : i < 3 ? 'lb-row__rank--red' : 'lb-row__rank--grey')}>{K.rankLabel(r.rank)}</div>
              <div className="lb-row__body">
                <div className="lb-row__nameRow">
                  <div className="lb-row__name truncate">{r.m.name}</div>
                  {you && <div className="lb-row__you">that's you</div>}
                </div>
                <div className={cx('lb-row__meta', r.improved && 'lb-row__meta--up')}>{r.meta}</div>
              </div>
              <div className="lb-row__value">
                <div className="lb-row__num">{K.fmt(r.val)}</div>
                <div className="unit">kg</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MoversView({ filtered, open }) {
  const list = K.movers(filtered);
  return (
    <div className="view">
      <ViewHead title="📈 Biggest movers since last test" sub="Percentage gain on a single lift" wide />
      <div className="mv-grid">
        {list.map((x, i) => (
          <div key={x.m.name + x.lift.key} className="mv-card" style={{ animationDelay: (i * 0.05) + 's' }} onClick={open(x.m)}>
            <div className="mv-card__top">
              <div className="mv-card__lift">{x.lift.label}</div>
              <div className="mv-card__pct">{x.pctLabel}</div>
            </div>
            <div className="mv-card__name">{x.m.name}</div>
            <div className="mv-card__nums">
              <div className="mv-card__prev">{K.fmt(x.prev)}</div>
              <div className="mv-card__arrow">→</div>
              <div className="mv-card__cur">{K.fmt(x.cur)}</div>
              <div className="mv-card__unit">kg</div>
            </div>
            <div className="mv-card__bar"><div className="mv-card__fill" style={{ width: x.barPct + '%' }} /></div>
            <div className="mv-card__foot">{x.gainLabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Movers ranks one lift by percentage, which favours light starting numbers.
// This ranks the work: kilos added across all three.
function GainsView({ filtered, open, crewColor, isMe }) {
  const rows = K.topGainers(filtered);
  return (
    <div className="view">
      <ViewHead title="💪 Most kilos added" sub="Squat, bench and deadlift added up" wide />
      {!rows.length && <div className="empty-card">No gains yet — these appear once a round has been tested against the last one.</div>}
      <div className="lb-grid">
        {rows.map((r, i) => {
          const you = isMe(r.m.name);
          return (
            <div key={r.m.name} className={cx('lb-row', you && 'lb-row--you')} style={{ borderLeftColor: crewColor(r.m), animationDelay: (i * 0.015) + 's' }} onClick={open(r.m)}>
              <div className={cx('lb-row__rank', i === 0 ? 'lb-row__rank--gold' : i < 3 ? 'lb-row__rank--red' : 'lb-row__rank--grey')}>{K.rankLabel(r.rank)}</div>
              <div className="lb-row__body">
                <div className="lb-row__nameRow">
                  <div className="lb-row__name truncate">{r.m.name}</div>
                  {you && <div className="lb-row__you">that's you</div>}
                </div>
                <div className="lb-row__meta">{r.detail}</div>
              </div>
              <div className="lb-row__value">
                <div className="lb-row__num lb-row__num--up">{r.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CrewsView({ clubScoped }) {
  const cs = K.crewStandings(clubScoped);
  return (
    <div className="view">
      <ViewHead
        title="🏆 Crew standings"
        sub={cs.by === 'gains' ? 'Ranked by kilos added this round' : 'Ranked by average big three · gains show after the next test'}
        wide
      />
      {!cs.rows.length && <div className="empty-card">No crew has numbers yet. Set each member's class in Coach mode.</div>}
      <div className="cr-grid">
        {cs.rows.map((c, i) => (
          <div key={c.id} className="cr-card" style={{ borderTopColor: c.color, animationDelay: (i * 0.04) + 's' }}>
            <div className="cr-card__head">
              <div className="cr-card__rank">{K.rankLabel(c.rank)}</div>
              <div className="cr-card__name">{c.label}</div>
            </div>
            <div className="cr-card__stats">
              <div className="cr-stat">
                <div className="cr-stat__num cr-stat__num--up">{c.gained > 0 ? '+' + K.fmt(c.gained) : '—'}</div>
                <div className="cr-stat__label">kg added</div>
              </div>
              <div className="cr-stat">
                <div className="cr-stat__num">{c.pbs || '—'}</div>
                <div className="cr-stat__label">new PBs</div>
              </div>
              <div className="cr-stat">
                <div className="cr-stat__num">{c.avgTotal ? K.fmt(Math.round(c.avgTotal)) : '—'}</div>
                <div className="cr-stat__label">average total</div>
              </div>
            </div>
            <div className="cr-card__foot">{c.tested === 1 ? '1 member tested' : c.tested + ' members tested'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PbsView({ filtered, open, crewColor }) {
  const p = K.pbs(filtered);
  return (
    <div className="view">
      <ViewHead
        title="🏆 New PBs this round" sub={p.sub} wide
        right={(
          <div className="pb-stat">
            <div className="pb-stat__num">{p.count}</div>
            <div className="pb-stat__label">personal bests<br />across the gym</div>
          </div>
        )}
      />
      <div className="pb-grid">
        {p.items.map(x => (
          <div key={x.m.name + x.lift.key} className="pb-card" style={{ borderLeftColor: crewColor(x.m) }} onClick={open(x.m)}>
            <div className="pb-card__name truncate">{x.m.name}</div>
            <div className="pb-card__row">
              <div className="pb-card__lift">{x.lift.label}</div>
              <div className="pb-card__gain">{x.gainLabel}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MilestonesView({ filtered, openQuiet }) {
  const list = K.milestones(filtered);
  return (
    <div className="view">
      <ViewHead title="🏅 Milestone clubs" sub="Once you're in, you're in for good" wide />
      <div className="ms-grid">
        {list.map(ms => (
          <div key={ms.label} className="ms-card" style={{ borderTopColor: ms.color }}>
            <div className="ms-card__head">
              <div className="ms-card__title">{ms.label}</div>
              <div className="ms-card__count" style={{ color: ms.color }}>{ms.countLabel}</div>
            </div>
            <div className="ms-card__names">
              {ms.names.map(n => (
                <div key={n.m.name} className="ms-chip" onClick={openQuiet(n.m)}>
                  <div className="ms-chip__name">{n.m.name}</div>
                  <div className="ms-chip__val">{n.val}</div>
                </div>
              ))}
              <div className="ms-card__more">{ms.more}</div>
            </div>
            <div className="ms-card__near">{ms.near}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RosterView({ s, filtered, page, open, crewColor, onSort }) {
  const r = K.roster(K.sortMembers(filtered, s.rosterSort), page, !s.rotating);
  return (
    <div className="view view--roster">
      <ViewHead
        title="Everyone's numbers" sub={r.sub} wide
        right={s.rotating ? null : (
          <div className="sort-row">
            <div className="sort-row__label">Sort by</div>
            {K.ROSTER_SORTS.map(so => (
              <div
                key={so.id}
                className={cx('chip chip--sort', s.rosterSort === so.id && 'chip--on')}
                onClick={e => { e.stopPropagation(); onSort(so.id); }}
              >{so.label}</div>
            ))}
          </div>
        )}
      />
      <div className="ro-heads">
        {[1, 2, 3].map(i => (
          <div key={i} className="ro-head"><div>Name</div><div className="r">SQ</div><div className="r">BP</div><div className="r">DL</div><div className="r">Total</div></div>
        ))}
      </div>
      <div className={cx('ro-grid', r.scroll ? 'ro-grid--scroll' : 'ro-grid--pages')}>
        {r.rows.map(row => (
          <div key={row.m.name} className="ro-row" style={{ borderLeftColor: crewColor(row.m) }} onClick={open(row.m)}>
            <div className="ro-row__name truncate">{row.m.name}</div>
            {K.LIFT_KEYS.map(k => (
              <div key={k} className={cx('ro-row__val', row.cells[k].state === 'up' && 'ro-row__val--up', row.cells[k].state === 'none' && 'ro-row__val--none')}>{row.cells[k].text}</div>
            ))}
            <div className="ro-row__total">{row.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Member card (TV overlay)                                            */
/* ================================================================== */

function MemberCard({ m, raw, st, testedShort, onClose }) {
  const lifts = K.memberLifts(m, raw, st);
  const pr = K.program(m.prog) || K.PROGRAMS[0];
  return (
    <div className="scrim" onClick={onClose}>
      <div className="mc">
        <div className="mc__head">
          <div className="mc__who">
            <div className="mc__avatar">{K.initials(m.name)}</div>
            <div className="mc__names">
              <div className="mc__name">{m.name}</div>
              <div className="mc__meta">
                <div className="mc__dot" style={{ background: pr.color }} />{pr.label} crew
                <div className="mc__sep">·</div>
                <div>{testedShort}</div>
              </div>
            </div>
          </div>
          <div className="mc__right">
            <div className="mc__totalBlock">
              <div className="mc__totalNote">{m.total ? 'Big three total' : 'Awaiting all 3 lifts'}</div>
              <div className="mc__total">{m.total ? K.fmt(m.total) + ' kg' : '—'}</div>
            </div>
            <div className="mc__close" onClick={onClose}>✕</div>
          </div>
        </div>
        <div className="mc__lifts">
          {lifts.map(l => (
            <div key={l.key} className="mc-lift" style={{ borderLeftColor: l.color }}>
              <div className="mc-lift__label">
                <div className="mc-lift__name">{l.name}</div>
                <div className="mc-lift__note">{l.note}</div>
              </div>
              {l.tested && (
                <div className="mc-lift__nums">
                  <div className="mc-lift__prev">{l.prev}</div>
                  <div className="mc-lift__arrow">→</div>
                  <div className="mc-lift__cur">{l.cur}</div>
                  <div className="mc-lift__unit">kg</div>
                </div>
              )}
              <div className={cx('delta', l.up && 'delta--up')}>{l.delta}</div>
              {l.spark && (
                <div className="mc-lift__trend">
                  <svg className="mc-lift__spark" viewBox="0 0 100 32" preserveAspectRatio="none">
                    <polyline points={l.spark} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <div className="mc-lift__journey">{l.journey}</div>
                </div>
              )}
              {l.tested && (
                <div className="mc-lift__work">
                  <div className="mc-lift__workLabel">Working weights</div>
                  <div className="mc-lift__chips">
                    {l.wp.map(w => (
                      <div key={w.label} className="wchip"><div className="wchip__label">{w.label}</div><div className="wchip__val">{w.val}</div></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mc__foot">Tap anywhere to close · the board keeps rotating on its own</div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Phone layout                                                        */
/* ================================================================== */

function PhoneLayout({ s, st, publicMembers, crewColor, open, selMember, testedShort, cycle, onEnterScores, onCloseSel, setMq }) {
  const list = s.mq ? publicMembers.filter(m => m.name.toLowerCase().indexOf(s.mq.toLowerCase()) >= 0) : publicMembers;
  return (
    <div className="wrap wrap--phone">
      <div className="ph">
        <div className="ph__head">
          <div className="ph__brand">
            <img className="ph__logo" src={LOGO} alt="Knight Fitness" />
            <div className="ph__eyebrow">{cycle}</div>
          </div>
          <div className="pill pill--dark" onClick={onEnterScores}>Enter scores</div>
        </div>

        {!selMember ? (
          <div className="ph__list">
            <input className="field" value={s.mq} onChange={e => setMq(e.target.value)} placeholder="Search your name" />
            <div className="ph__count">{publicMembers.length} members · tap a name for the full card</div>
            <div className="ph__cards">
              {list.map(m => {
                const sum = K.memberSummary(m);
                return (
                  <div key={m.name} className="ph-card" style={{ borderLeftColor: crewColor(m) }} onClick={open(m)}>
                    <div className="ph-card__top">
                      <div className="ph-card__name">{m.name}</div>
                      <div className="ph-card__gain">{sum.gain}</div>
                    </div>
                    <div className="ph-card__lifts">
                      <div>SQ <strong>{sum.sq}</strong></div>
                      <div>BP <strong>{sum.bp}</strong></div>
                      <div>DL <strong>{sum.dl}</strong></div>
                    </div>
                    <div className="ph-card__total">{sum.total}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <PhoneDetail m={selMember} raw={s.data[selMember.idx]} st={st} testedShort={testedShort} onBack={onCloseSel} />
        )}
      </div>
    </div>
  );
}

function PhoneDetail({ m, raw, st, testedShort, onBack }) {
  const lifts = K.memberLifts(m, raw, st);
  const pr = K.program(m.prog) || K.PROGRAMS[0];
  return (
    <div className="ph__detail">
      <div className="pill pill--white pill--back" onClick={onBack}>← All members</div>
      <div className="ph-id">
        <div className="ph-id__name">{m.name}</div>
        <div className="ph-id__crew"><div className="ph-id__dot" style={{ background: pr.color }} />{pr.label} crew</div>
        <div className="ph-id__tested">{testedShort}</div>
        <div className="ph-id__totalNote">{m.total ? 'Big three total' : 'Awaiting all 3 lifts'}</div>
        <div className="ph-id__total">{m.total ? K.fmt(m.total) + ' kg' : '—'}</div>
      </div>
      {lifts.map(l => (
        <div key={l.key} className="ph-lift" style={{ borderLeftColor: l.color }}>
          <div className="ph-lift__head">
            <div className="ph-lift__name">{l.name}</div>
            <div className="ph-lift__note">{l.note}</div>
          </div>
          {l.tested && (
            <div className="ph-lift__nums">
              <div className="ph-lift__prev">{l.prev}</div>
              <div className="ph-lift__arrow">→</div>
              <div className="ph-lift__cur">{l.cur}</div>
              <div className="ph-lift__unit">kg</div>
            </div>
          )}
          <div className={cx('delta delta--phone', l.up && 'delta--up')}>{l.delta}</div>
          {l.tested && (
            <div className="ph-lift__work">
              <div className="ph-lift__workLabel">Working weights</div>
              <div className="ph-lift__chips">
                {l.wp.map(w => (
                  <div key={w.label} className="wchip wchip--phone"><div className="wchip__label">{w.label}</div><div className="wchip__val">{w.val}</div></div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/* Testing session (coach score entry)                                 */
/* ================================================================== */

function SessionScreen({ s, list, scope, row, dest, onClose, onStart, onSwitch, onCrew, onRemaining, onQuery, onJump, onAdd, onActive, onPad, onQuick, onBack, onSkip, onSave, onUndo, onFix, onSuggestion, onUseToday, onDismissDate }) {
  const ss = s.sess;
  const setup = !ss.mode;
  const memberMode = ss.mode === 'member';
  const q = (ss.q || '').trim();
  const doneN = Object.keys(ss.done || {}).length;
  const pos = list.findIndex(x => x.i === ss.cur);
  const prog = K.sessionProgress(Math.max(0, pos), list.length, doneN, scope.length, ss.remainingOnly);
  const activeLift = K.lift(ss.active) || K.LIFTS[0];
  const liftDef = K.lift(ss.lift) || K.LIFTS[0];
  const crewDot = ss.prog === 'all' ? K.COLORS.neutralDot : K.progColor(ss.prog);
  const suggestion = (ss.confirm || []).filter(w => w.suggestion)[0];
  const filled = K.draftsFilled(ss.drafts).length;

  const crewPill = (
    <div className="crew-pill">
      <div className="crew-pill__dot" style={{ background: crewDot }} />
      <select className="crew-pill__select" value={ss.prog} onChange={e => onCrew(e.target.value)} aria-label="Crew">
        <option value="all">All crews</option>
        {K.PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.label} crew</option>)}
      </select>
    </div>
  );

  return (
    <div className="sess">
      <div className="sess__col">
        <div className="sess__head">
          <img className="sess__logo" src={LOGO} alt="Knight Fitness" />
          <div className="pill pill--white pill--finish" onClick={onClose}>Finish</div>
        </div>

        {setup ? (
          <div className="sess__pick">
            <div className="sess__title">Who are you testing?</div>
            <div className="sess__help">Pick the crew in front of you and the list stays short.</div>
            {crewPill}
            <div className="sess__count">{scope.length === 1 ? '1 member' : scope.length + ' members'} in this list</div>

            <div className="sess__title sess__title--sub">And which lift?</div>
            {K.LIFTS.map(l => (
              <div key={l.key} className="lift-card" style={{ borderLeftColor: l.color }} onClick={() => onStart('lift', l.key)}>
                <div className="lift-card__name">{l.label}</div>
                <div className="lift-card__sub">{scope.filter(x => ((s.data[x.i] || {})[l.key] || {}).c).length} of {scope.length} have a number</div>
              </div>
            ))}
            <div className="lift-card lift-card--all" onClick={() => onStart('member', '')}>
              <div className="lift-card__name">All three lifts</div>
              <div className="lift-card__sub">Enter squat, bench and deadlift while each member is in front of you</div>
            </div>
          </div>
        ) : (
          <div className="sess__run">
            <div className="sess__topRow">
              <div className="sess__switch" style={{ color: memberMode ? K.COLORS.ink : liftDef.color }} onClick={onSwitch}>
                {memberMode ? 'All three lifts' : liftDef.label + ' 5RM'} ▾
              </div>
              {crewPill}
            </div>

            <input className="field" value={ss.q || ''} onChange={e => onQuery(e.target.value)} placeholder="Find a member, or type a new name" />

            {!!q && (
              <div className="sess__results">
                <div className="sess__resultList">
                  {K.queueMatches(scope, q).map(x => (
                    <div key={x.i} className="sess__result" onClick={() => onJump(x.i)}>
                      <div className="sess__resultName">{x.name}</div>
                      <div className="sess__resultState">{ss.done[x.i] === 'done' ? 'entered' : ss.done[x.i] === 'skip' ? 'skipped' : ''}</div>
                    </div>
                  ))}
                </div>
                {K.canAddName(scope, q) && (
                  <div className="sess__add">
                    <div className="sess__addNote">Nobody on the roster matches that.</div>
                    <div className="btn-outline-red" onClick={onAdd}>Add "{q}" to the roster</div>
                  </div>
                )}
              </div>
            )}

            <div className="sess__bar"><div className="sess__fill" style={{ width: prog.pct + '%' }} /></div>
            <div className="sess__progressRow">
              <div className="sess__progress">{prog.label}</div>
              <div className={cx('sess__toggle', ss.remainingOnly && 'sess__toggle--on')} onClick={onRemaining}>
                {ss.remainingOnly ? 'Showing what is left' : 'Show what is left'}
              </div>
            </div>

            {ss.dateStrip && (
              <div className="sess__strip">
                <div className="sess__stripText">
                  Mark today as this round's test date?
                  <span className="sess__stripSub">{s.settings.tested ? 'Currently ' + K.dateShort(s.settings.tested) + '.' : 'Not set yet.'} The next round is set twelve weeks out.</span>
                </div>
                <div className="sess__stripActions">
                  <div className="btn btn--skip" onClick={onDismissDate}>Not now</div>
                  <div className="btn btn--dark" onClick={onUseToday}>Use today</div>
                </div>
              </div>
            )}

            <div className={cx('sess__dest', s.apiState === 'error' && 'sess__dest--error', s.apiState === 'queued' && 'sess__dest--warn')}>
              {s.apiState === 'error' || s.apiState === 'queued' ? s.apiMsg : dest.label}
            </div>

            {row ? (
              <React.Fragment>
                <div className="sess-member">
                  <div className="sess-member__name">{row.name}</div>
                  {memberMode ? (
                    <div className="sess-lifts">
                      {K.LIFTS.map(l => {
                        const v = ss.drafts[l.key] || '';
                        return (
                          <div key={l.key} className={cx('sess-lift', ss.active === l.key && 'sess-lift--on')} style={{ borderLeftColor: l.color }} onClick={() => onActive(l.key)}>
                            <div className="sess-lift__label">
                              <div className="sess-lift__name">{l.label}</div>
                              <div className="sess-lift__ctx">{K.sessionContext(row[l.key])}</div>
                            </div>
                            <div className={cx('sess-lift__val', !v && 'sess-lift__val--empty')}>{v || '—'}<span className="sess-lift__unit">kg</span></div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <React.Fragment>
                      <div className="sess-member__ctx">{K.sessionContext(row[ss.lift])}</div>
                      <div className="sess-member__draftRow">
                        <div className={cx('sess-member__draft', !ss.drafts[ss.active] && 'sess-member__draft--empty')}>{ss.drafts[ss.active] || '—'}</div>
                        <div className="sess-member__unit">kg</div>
                      </div>
                    </React.Fragment>
                  )}
                  <div className="sess-member__quick">
                    {memberMode && <div className="sess-member__quickLabel">{activeLift.label}</div>}
                    {[2.5, 5, 10].map(n => <div key={n} className="quick" onClick={() => onQuick(n)}>+{n}</div>)}
                  </div>
                </div>

                {!!ss.confirm && (
                  <div className="sess__check">
                    <div className="sess__checkText">
                      {ss.confirm.map(w => <div key={w.lift}>{w.message}</div>)}
                    </div>
                    <div className="sess__checkActions">
                      <div className="btn btn--skip" onClick={onFix}>Fix it</div>
                      {suggestion && <div className="btn btn--dark" onClick={() => onSuggestion(suggestion)}>Use {suggestion.suggestion} kg</div>}
                      <div className="btn btn--save" onClick={onSave}>Save anyway</div>
                    </div>
                  </div>
                )}

                <div className="numpad">
                  {K.NUMPAD.map(k => <div key={k} className="numpad__key" onClick={() => onPad(k)}>{K.keyLabel(k)}</div>)}
                </div>

                {!ss.confirm && (
                  <div className="sess__actions">
                    <div className="btn btn--back" onClick={onBack}>Back</div>
                    <div className="btn btn--skip" onClick={onSkip}>Not today</div>
                    <div className={cx('btn btn--save', !filled && 'btn--off')} onClick={onSave}>Save · next</div>
                  </div>
                )}
              </React.Fragment>
            ) : (
              <div className="sess-member sess-member--empty">
                <div className="sess-member__name">{scope.length ? 'All done' : 'Nobody in this crew'}</div>
                <div className="sess-member__ctx">
                  {scope.length
                    ? 'Everyone on this list has a number in or is marked not today.'
                    : 'Assign members to this crew in Coach mode, or pick another crew above.'}
                </div>
                <div className="sess__doneActions">
                  {ss.remainingOnly && <div className="btn btn--skip" onClick={onRemaining}>Show everyone again</div>}
                  <div className="btn btn--save" onClick={onClose}>Finish</div>
                </div>
              </div>
            )}

            {!!s.undoLabel && <div className="undo" onClick={onUndo}>↩ {s.undoLabel}</div>}
            <div className="sess__hint">
              On a laptop: type the number, Enter saves, → skips, ← goes back{memberMode ? ', ↑ ↓ picks the lift' : ''}.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Coach mode (data admin)                                             */
/* ================================================================== */

function CoachMode({ s, st, linked, sheetLocked, patch, setSetting, onClose, onSync, onField, onMeta, onBulk, onApplyBulk, onCopyLink, onRemove, onMerge, onApplyImport, onRollForward, onReset, onRestore, onExport, onTestConnection, rotateSeconds }) {
  const bulkPlan = s.bulk
    ? K.planBulkAdd(s.data, K.parseBulkNames(s.bulkText, s.bulkProg))
    : { add: [], exact: [], similar: [] };
  const dupes = K.findDuplicates(s.data).slice(0, L.dupes);
  const dupeCount = K.findDuplicates(s.data).length;
  const rows = s.data
    .map((row, i) => ({ row, i }))
    .filter(x => !s.q || x.row.name.toLowerCase().indexOf(s.q.toLowerCase()) >= 0)
    .sort((a, b) => a.row.name.localeCompare(b.row.name));
  const syncMsg = s.syncMsg || (linked ? 'Auto-syncs every 10 minutes while the board is on.' : 'Not linked — the board uses the numbers stored on this screen.');
  const persistLabel = s.persist === 'on' ? 'Protected storage on — the browser will not clear these numbers' : 'Saved in this browser on this screen. Export a backup before changing devices.';
  const histLabel = s.hist.length ? (s.hist.length === 1 ? '1 earlier version kept' : s.hist.length + ' earlier versions kept') : 'No earlier versions yet';

  const lockToggle = () => {
    const on = !st.lock;
    setSetting('lock', on);
    if (on) patch({ rotating: !st.norotate, sel: null, picker: false, elapsed: 0 });
  };
  const rotateToggle = () => {
    const off = !st.norotate;
    setSetting('norotate', off);
    patch({ rotating: !off, elapsed: 0 });
  };

  const Pair = ({ i, k }) => {
    const cell = s.data[i][k] || { c: '', p: '' };
    return (
      <div className="erow__pair">
        <input className={cx('erow__prev', sheetLocked && 'erow__prev--locked')} value={cell.p || ''} onChange={e => onField(i, k, 'p', e.target.value)} readOnly={sheetLocked} inputMode="decimal" aria-label={k + ' previous'} />
        <div className="erow__arrow">→</div>
        <input className={cx('erow__cur', sheetLocked && 'erow__cur--locked')} value={cell.c || ''} onChange={e => onField(i, k, 'c', e.target.value)} readOnly={sheetLocked} inputMode="decimal" aria-label={k + ' current'} />
      </div>
    );
  };

  return (
    <div className="coach">
      <div className="coach__card">
        <div className="coach__head">
          <div className="coach__titles">
            <div className="coach__title">Coach mode · 5RM data</div>
            <div className="coach__count">{s.data.length} members · {K.agoLabel(s.saved)}{PAGE.demo ? ' · demo mode, nothing is saved' : ''}{s.bulkMsg ? ' · ' + s.bulkMsg : ''}</div>
          </div>
          <div className="coach__actions">
            <div className="cbtn cbtn--red" onClick={onBulk}>Add members</div>
            <div className="cbtn" onClick={() => patch({ imp: true })}>Paste from sheet</div>
            <div className="cbtn" onClick={onRollForward}>Start new test round</div>
            <div className="cbtn" onClick={onExport}>Export backup</div>
            <div className="cbtn cbtn--dark" onClick={onClose}>Done</div>
          </div>
        </div>

        {s.bulk && (
          <div className="coach__section coach__import">
            <div className="coach__importText">
              One name per line. Put a crew after a comma to set their class, for example <strong>Jane Smith, 5:40 AM</strong>. Anyone already on the roster is skipped.
            </div>
            <textarea className="coach__textarea coach__textarea--names" value={s.bulkText} onChange={e => patch({ bulkText: e.target.value })} placeholder={'Jane Smith\nBob Bee, 5:40 AM\nAnn Ant'} />
            <div className="coach__bulkRow">
              <div className="coach__field">
                <div className="coach__label">Put everyone else in</div>
                <select className="erow__select" value={s.bulkProg} onChange={e => patch({ bulkProg: e.target.value })} aria-label="Default crew">
                  {K.PROGRAMS.map(pr => <option key={pr.id} value={pr.id}>{pr.label}</option>)}
                </select>
              </div>
              <div className="coach__bulkSummary">{s.bulkText.trim() ? K.bulkSummary(bulkPlan) : 'Paste or type the names above.'}</div>
            </div>
            {bulkPlan.exact.length > 0 && (
              <div className="coach__bulkNote">Already on the roster, skipping: {bulkPlan.exact.map(x => x.match).join(', ')}</div>
            )}
            {bulkPlan.similar.length > 0 && (
              <div className={cx('coach__bulkPick', s.bulkSimilar && 'coach__bulkPick--on')} onClick={() => patch({ bulkSimilar: !s.bulkSimilar })}>
                <span className="coach__box">{s.bulkSimilar ? '☑' : '☐'}</span>
                Add these anyway: {bulkPlan.similar.map(x => x.name + ' (like ' + x.match + ')').join(', ')}
              </div>
            )}
            <div className="coach__btnRow">
              <div className="cbtn cbtn--red" onClick={onApplyBulk}>Add {bulkPlan.add.length + (s.bulkSimilar ? bulkPlan.similar.length : 0)} to the roster</div>
              <div className="cbtn" onClick={() => patch({ bulk: false })}>Cancel</div>
            </div>
          </div>
        )}

        {s.imp && (
          <div className="coach__section coach__import">
            <div className="coach__importText">Copy the rows straight out of the spreadsheet and paste them here — one member per line, in the order <strong>Name, Squat, Bench, Deadlift</strong> (optionally followed by their three previous 5RMs). A crew in any column sets their class, so <strong>Keith Gray, 5:40 AM</strong> on its own assigns a crew without touching their numbers. Existing names are updated, new names are added. A previously exported backup file can be pasted here too.</div>
            <textarea className="coach__textarea" value={s.impText} onChange={e => patch({ impText: e.target.value })} placeholder={'Aaron Zimpel, 125, 75, 125\nKeith Gray, 5:40 AM'} />
            <div className="coach__btnRow">
              <div className="cbtn cbtn--red" onClick={onApplyImport}>Apply</div>
              <div className="cbtn" onClick={() => patch({ imp: false })}>Cancel</div>
            </div>
          </div>
        )}

        <div className="coach__section coach__settings">
          <div className="coach__field">
            <div className="coach__label">This round tested</div>
            <input className="coach__date" type="date" value={st.tested} onChange={e => setSetting('tested', e.target.value)} />
            <div className="coach__quickRow">
              <div className="coach__quick" onClick={() => setSetting('tested', K.todayIso())}>Today</div>
            </div>
          </div>
          <div className="coach__field">
            <div className="coach__label">Next testing date</div>
            <input className="coach__date" type="date" value={st.next} onChange={e => setSetting('next', e.target.value)} />
            <div className="coach__quickRow">
              {[8, 12].map(w => (
                <div key={w} className="coach__quick" onClick={() => setSetting('next', K.suggestNext(st.tested, w))}>+{w} weeks</div>
              ))}
            </div>
          </div>
          <div className="coach__note">
            {!st.tested && !st.next
              ? 'Set these and the board tells members when they were tested and when the next round is. Until then its header stays blank.'
              : 'Both dates show in the board header. The next date counts down once it is within three weeks.'}
          </div>
          <div className="coach__field">
            <div className="coach__label">Member interaction</div>
            <div className="cbtn cbtn--toggle" onClick={lockToggle}>{st.lock ? 'Allow members to explore' : 'Lock to display only'}</div>
            <div className="coach__small">{st.lock ? 'Locked — taps are ignored, so the board just plays. Coaches can still get in below.' : 'Members can tap to stop the rotation, scroll the roster and open their own card.'}</div>
          </div>
          <div className="coach__field">
            <div className="coach__label">Rotating board</div>
            <div className="coach__rotRow">
              <div className="cbtn cbtn--toggle" onClick={rotateToggle}>{st.norotate ? 'Turn rotation on' : 'Turn rotation off'}</div>
              <select
                className="erow__select coach__speed" value={String(st.rotate || K.LIMITS.rotateDefault)}
                onChange={e => setSetting('rotate', parseInt(e.target.value, 10))}
                disabled={!!st.norotate} aria-label="Seconds per view"
              >
                {K.ROTATE_CHOICES.map(n => <option key={n} value={n}>{n} seconds each</option>)}
              </select>
            </div>
            <div className="coach__small">
              {st.norotate
                ? 'Auto-rotate is off — the board stays on the view you pick.'
                : 'Views change every ' + rotateSeconds + ' seconds.'}
              {PAGE.rotateParam ? ' This screen is set to ' + PAGE.rotateParam + 's by its own link.' : ''}
            </div>
          </div>
        </div>

        <div className="coach__section">
          <div className="coach__rowBetween">
            <div className="coach__label">Views on the board</div>
            <div className="coach__msg">{K.enabledViews(st).length} of {K.ALL_VIEW_KEYS.length} showing</div>
          </div>
          <div className="coach__views">
            {K.VIEW_SPECS.map(sp => {
              const on = K.viewEnabled(st, sp.key);
              return (
                <div key={sp.key} className={cx('chip chip--view', on && 'chip--on')} onClick={() => setSetting('views', K.toggleView(st, sp.key))}>
                  <span className="coach__box">{on ? '☑' : '☐'}</span>{sp.label}
                </div>
              );
            })}
          </div>
          <div className="coach__msg">Switch off anything you do not want in the rotation. The chips along the top of the board follow this too, and the last one on cannot be switched off.</div>
        </div>

        <div className="coach__section">
          <div className="coach__label">Coach score-entry link</div>
          <div className="coach__linkBox">
            <input className="coach__input coach__input--link" readOnly value={coachLink()} onFocus={e => e.target.select()} aria-label="Coach score-entry link" />
            <div className="cbtn cbtn--outline" onClick={onCopyLink}>{s.copied ? 'Copied' : 'Copy'}</div>
          </div>
          <div className="coach__msg">Open this on a phone or iPad and it goes straight to score entry, skipping the board. Add it to the home screen for one tap.</div>
        </div>

        <div className="coach__section">
          <div className="coach__rowBetween">
            <div className="coach__label">Live link to your Google Sheet</div>
            <div className="cbtn cbtn--outline" onClick={onSync}>Sync now</div>
          </div>
          <textarea className="coach__textarea coach__textarea--sheets" value={st.sheets} onChange={e => setSetting('sheets', e.target.value)} placeholder="Paste one published CSV link per lift tab — File → Share → Publish to web → Comma-separated values" />
          <div className="coach__msg">{syncMsg}</div>
          <div className="coach__links">
            <div className="coach__link">
              <div className="coach__label">Save-back link (Apps Script)</div>
              <input className="coach__input coach__input--mono" value={st.api} onChange={e => setSetting('api', e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
            </div>
            <div className="coach__pinField">
              <div className="coach__label">Coach PIN</div>
              <input className="coach__input coach__input--code" value={st.pin} onChange={e => setSetting('pin', K.digitsOnly(e.target.value))} placeholder="e.g. 1984" inputMode="numeric" />
            </div>
            <div className="coach__pinField">
              <div className="coach__label">Gym passcode (to view)</div>
              <input className="coach__input coach__input--code" value={st.viewPin} onChange={e => setSetting('viewPin', K.digitsOnly(e.target.value))} placeholder="4500" inputMode="numeric" />
            </div>
          </div>
          <div className="coach__btnRow coach__btnRow--test">
            <div className="cbtn cbtn--outline" onClick={onTestConnection}>Test connection</div>
            {s.apiTest && (
              <div className={cx('coach__msg', s.apiTest.state === 'error' && 'coach__warn', s.apiTest.state === 'ok' && 'coach__ok')}>{s.apiTest.msg}</div>
            )}
          </div>
          {!s.storeOk && <div className="coach__warn">This browser is blocking saved data (private browsing?) — scores will not persist here.</div>}
          {!!s.outbox.length && <div className="coach__warn">{s.outbox.length === 1 ? '1 score is' : s.outbox.length + ' scores are'} waiting to be written to the sheet — they retry automatically.</div>}
          <div className="coach__msg">With a save-back link set, scores entered on the board write straight into the sheet. A PIN keeps "Enter scores" and Coach mode to staff only.</div>
          {linked && <div className="coach__locked">The sheet is the source of truth — enter scores in Google Sheets and every screen updates. Weights below are locked here so a change on one TV can't be lost at the next sync. Names, classes and dates are still yours to set per board.</div>}
        </div>

        {dupes.length > 0 && (
          <div className="coach__section coach__dupes">
            <div className="coach__label coach__label--gold">{dupeCount === 1 ? '1 possible duplicate' : dupeCount + ' possible duplicates'} — same person entered twice?</div>
            {dupes.map(dp => (
              <div key={dp.keep + '-' + dp.drop} className="dupe">
                <div className="dupe__a">{dp.keepName} ({dp.keepLifts} lifts)</div>
                <div className="dupe__arrow">←</div>
                <div className="dupe__b">{dp.dropName} ({dp.dropLifts} lifts)</div>
                <div className="cbtn cbtn--small" onClick={() => { if (window.confirm('Merge "' + dp.dropName + '" into "' + dp.keepName + '"? The higher number wins for each lift.')) onMerge(dp.keep, dp.drop); }}>Merge</div>
              </div>
            ))}
          </div>
        )}

        <div className="coach__section coach__search">
          <input className="coach__searchInput" value={s.q} onChange={e => patch({ q: e.target.value })} placeholder="Search members" />
          <div className="coach__searchLabel">Previous → Current (kg)</div>
        </div>

        <div className="coach__cols"><div>Name</div><div>Class</div><div>Squat</div><div>Bench</div><div>Deadlift</div><div /></div>

        <div className="coach__table">
          {rows.map(({ row, i }) => (
            <div key={i} className="erow">
              <input className="erow__name" value={row.name} onChange={e => onMeta(i, 'name', e.target.value)} aria-label="Name" />
              <select className="erow__select" value={row.prog || 'g1'} onChange={e => onMeta(i, 'prog', e.target.value)} aria-label="Class">
                {K.PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <Pair i={i} k="sq" /><Pair i={i} k="bp" /><Pair i={i} k="dl" />
              <div className="erow__remove" onClick={() => onRemove(i, row.name)}>✕</div>
            </div>
          ))}
        </div>

        {s.histOpen && (
          <div className="coach__history">
            {s.hist.map((h, i) => (
              <div key={h.t} className="hrow">
                <div className="hrow__when">{new Date(h.t).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>
                <div className="hrow__count">{(h.data || []).length} members</div>
                <div className="cbtn cbtn--small" onClick={() => onRestore(i)}>Restore</div>
              </div>
            ))}
          </div>
        )}

        <div className="coach__foot">
          <div>{persistLabel}</div>
          <div className="coach__footLinks">
            <div className="coach__footLink" onClick={() => patch({ histOpen: !s.histOpen })}>{histLabel}</div>
            <div className="coach__footLink coach__footLink--danger" onClick={onReset}>Reload original spreadsheet numbers</div>
          </div>
        </div>
      </div>
    </div>
  );
}
