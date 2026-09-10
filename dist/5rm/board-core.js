/*
 * Knight Fitness 5RM Board — core logic.
 *
 * Framework-free and side-effect-free: every function here takes plain data
 * and returns plain data, so the same file runs in the browser (as the global
 * `KF5RM`, used by components/FiveRMBoard.jsx) and under Node for the unit
 * tests in /tests. Anything that touches the DOM, localStorage, fetch or
 * timers lives in the React component, not here.
 *
 * Data model (one row per member):
 *   { name, club: 'mens' | 'womens', prog: 'g1'..'g7',
 *     sq | bp | dl: { c: '125', p: '120', t: '2026-09-09' },   // current, previous, date recorded
 *     h: [{ d: '2026-06-01', sq: '120', bp: '75', dl: '120' }] } // archived rounds
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KF5RM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Constants                                                           */
  /* ------------------------------------------------------------------ */

  var LIFT_KEYS = ['sq', 'bp', 'dl'];

  var LIFTS = [
    { key: 'sq', label: 'Squat', color: 'hsl(357 76% 51%)' },
    { key: 'bp', label: 'Bench', color: 'hsl(199 89% 48%)' },
    { key: 'dl', label: 'Deadlift', color: 'hsl(262 83% 58%)' }
  ];

  var PROGRAMS = [
    { id: 'g1', label: '4:50 AM', color: 'hsl(262 83% 58%)' },
    { id: 'g2', label: '5:40 AM', color: 'hsl(217 91% 60%)' },
    { id: 'g3', label: '6:30 AM', color: 'hsl(188 86% 43%)' },
    { id: 'g4', label: '4:00 PM', color: 'hsl(142 71% 45%)' },
    { id: 'g5', label: '4:50 PM', color: 'hsl(45 93% 47%)' },
    { id: 'g6', label: '5:40 PM', color: 'hsl(25 95% 53%)' },
    { id: 'g7', label: '6:30 PM', color: 'hsl(330 81% 60%)' }
  ];

  var CLUBS = [
    { id: 'mens', label: "Men's Club" },
    { id: 'womens', label: "Women's Club" }
  ];

  var MILESTONES = [
    { lift: 'sq', kg: 100, label: '100 kg Squat Club' },
    { lift: 'sq', kg: 150, label: '150 kg Squat Club' },
    { lift: 'bp', kg: 100, label: '100 kg Bench Club' },
    { lift: 'dl', kg: 150, label: '150 kg Deadlift Club' },
    { lift: 'dl', kg: 200, label: '200 kg Deadlift Club' },
    { lift: 'total', kg: 400, label: '400 kg Big Three Club' }
  ];

  var COLORS = {
    red: 'hsl(357 76% 51%)',
    ink: 'hsl(222 47% 11%)',
    gold: 'hsl(45 93% 47%)',
    success: 'hsl(142 71% 45%)',
    untested: 'hsl(220 13% 85%)',
    neutralDot: 'hsl(215 16% 60%)'
  };

  var STORAGE_KEYS = {
    members: 'kf5rm.members.v1',
    settings: 'kf5rm.settings.v1',
    history: 'kf5rm.history.v1',
    unlock: 'kf5rm.unlock.v1',
    outbox: 'kf5rm.outbox.v1'
  };

  var DEFAULT_SETTINGS = { tested: '', next: '', sheets: '', api: '', pin: '', norotate: false, lock: false, viewPin: '4500', views: [], rotate: 0 };

  // Seconds per view a coach can pick from in Coach mode.
  var ROTATE_CHOICES = [8, 10, 14, 20, 30, 40];

  var LIMITS = {
    perPage: 45,          // roster rows per TV page (3 columns x 15 rows)
    leaderboard: 16,      // 2 columns x 8 rows
    movers: 12,
    pbs: 48,
    milestoneNames: 14,
    near: 3,
    nearKg: 10,
    findList: 40,
    dupes: 12,
    histMax: 10,
    histGapMs: 600000,    // at most one snapshot per 10 minutes
    meTtlMs: 600000,      // "that's you" marker lasts 10 minutes
    idleResumeMs: 45000,  // rotation resumes after 45s without a tap
    unlockMs: 30 * 86400000, // gym passcode valid 30 days per device
    rotateDefault: 14, rotateMin: 6, rotateMax: 40,
    syncMs: 600000,       // re-fetch the published sheet every 10 minutes
    countdownDays: 21,    // "Next test in N days" once within three weeks
    historyRounds: 20,
    touchBreak: 1100,   // phones and tablets get the touch layout; only a real
    mobileBreak: 760    // big screen gets the scaled 1920x1080 TV stage
  };

  var WORKING_PCTS = [95, 90, 85, 80, 75, 70, 65, 60, 55, 50];

  // Above these a 5RM is almost certainly a mistyped number (127.5 entered as 1275).
  var PLAUSIBLE_MAX = { sq: 300, bp: 220, dl: 350 };
  var PLAUSIBLE_MIN = 10;

  // Weeks between testing rounds, offered as a one-tap suggestion.
  var NEXT_WEEKS = 12;

  // Current numbers from the gym's spreadsheet at hand-over (kg). Previous-round
  // values are NOT seeded — those come from the sheet or from testing on the board.
  var ROSTER_RAW = [
    'Aaron Zimpel|125|75|125', 'Adam Black|90||100', 'Adrien Mamet|120|110|', 'Al Yin Foo|75|62.5|90',
    'Andrew Price|110||120', 'Andrew Southcombe|105||', 'Antony Foster|65||80', 'Ben Child|90|60|95',
    'Ben Smith|90|70|', 'Bob Spokes|140|80|170', 'Brent Connors|190||160', 'Bruno Gentile|95|65|110',
    'Caleb Hannila|70|52.5|', 'Calum Anderson|115||110', 'Chris George|80|80|120', 'Clinton Hannila|90|62.5|125',
    'Col Gilliland|120||140', 'Craig Thurman|85||100', 'Dale Parry||75|120', 'Damian Dyer|110|80|',
    'Dave Johansen|130|75|125', 'David Kelly|||110', 'David Thompson|55||', 'Ehsan Javanmardi|79.5|55|85',
    'Frank Bassi|75|62.5|', 'Frank Faller|135|77.5|160', 'Geoff Hawkes|80|70|', 'Glen Reid|90||120',
    'Greg Lloyd|||45', 'Hannah|||200', 'Haydn Clark|85|50|105', 'Hyrendo Anderson|140|60|110',
    'Ian Griffin|127|90|120', 'Jae Schofield|135||', 'James Young|85||', 'Jason Acres|95|77.5|140',
    'Jay Roberts|||100', 'Jim Lavery|70|40|', 'John Kidd|120|70|150', 'John McCall|150|65|150',
    'John Schloss|105|80|130', 'John Whitehead||85|125', 'Jules Tabone|105|60|', 'Julian Harrison|90||',
    'Keith Gray|160|120|170', 'Kent Teakle||110|', 'Keradyn Turley|115||125', 'Lance Courtenay|70|65|',
    'Luke Cook||72.5|137.5', 'Mark Altmann|125|62.5|137.5', 'Mark Anderson|100|60|', 'Mark Enever|120|75|120',
    'Mark Hornby|110||', 'Mark Knight|100|100|100', 'Mark Lampre||85|130', 'Mark Morris|80|52.5|110',
    'Martin Foronda|100|65|110', 'Mathew Abboud||80|', 'Matt Lavery|110|65|120', 'Mel Kodjamanis|105|65|',
    'Michael Douglas|||135', 'Michael Jealous|127.5||', 'Michael Lewis||38|', 'Michael Newton|150|125|170',
    'Michael Schwarz|||110', 'Mick Whitney|112.5||145', 'Neil Brown|110|65|130', 'Nolan Lancaster|135|92.5|180',
    'Paul Barrie|150|92.5|', 'Paul Dean|90||', 'Paul Den Ronden|90|55|130', 'Paul Ebert|100|55|130',
    'Paul Gallagher|60||', 'Paul Outen|110|80|150', 'Pete Goodman|75||', 'Pete Ranger|110|80|',
    'Peter Gilmore|85|60|130', 'Peter Hockey|75|55|110', 'Rob Price|135|75|150', 'Robert Lowe|110|95|150',
    'Ron Morrison|130|90|140', 'Rowan Brindley|115|62.5|', 'Russ Apanui|||90', 'Sam Bowden|90|75|170',
    'Shayne Trusz|150||', 'Shreyas Megatavally|110|62.5|135', 'Simon Fry|55|50|120', 'Simon House|140||',
    'Steve Otto|160|115|210', 'Steven Nash|85||', 'Tim Fulcher|120||', 'Tim Higgs|130|90|140',
    'Tim Phillips|170|105|185', 'Todd Comrie|45|45|75', 'Wayne Panton|130|70|150'
  ].join('\n');

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                       */
  /* ------------------------------------------------------------------ */

  function hash(s) {
    var x = 2166136261;
    for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return (x >>> 0) / 4294967296;
  }

  // Positive finite number or null. Strings like '125', '62.5' and ' 90 ' all parse.
  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) && n > 0 ? n : null;
  }

  // Kilograms, at most two decimals, trailing zeros stripped; em-dash for nothing.
  function fmt(n) {
    if (n === null || n === undefined) return '—';
    return (Math.round(n * 100) / 100).toString();
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // Local calendar date as YYYY-MM-DD (not UTC — an evening session in Brisbane is still today).
  function todayIso(now) {
    var d = now ? new Date(now) : new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseIso(iso) {
    if (!iso) return null;
    var d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? null : d;
  }

  function dateLong(iso) {
    var d = parseIso(iso);
    return d ? d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  }

  function dateShort(iso) {
    var d = parseIso(iso);
    return d ? d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  }

  function timeShort(t) {
    return new Date(t).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  }

  function daysTo(iso, now) {
    var d = parseIso(iso);
    if (!d) return null;
    var t = now ? new Date(now) : new Date();
    return Math.ceil((d - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 86400000);
  }

  // The same calendar date shifted by whole weeks, as YYYY-MM-DD.
  function addWeeks(iso, weeks, now) {
    var d = parseIso(iso) || (now ? new Date(now) : new Date());
    d.setDate(d.getDate() + (weeks || 0) * 7);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // The next test date to offer: a round number of weeks after the round just tested.
  function suggestNext(testedIso, weeks, now) {
    return addWeeks(testedIso || todayIso(now), weeks || NEXT_WEEKS, now);
  }

  // True when the stored next-test date is missing or already behind us.
  function nextNeedsUpdate(settings, now) {
    var st = settings || {};
    if (!st.next) return true;
    var dn = daysTo(st.next, now);
    return dn === null || dn < 0;
  }

  function agoLabel(t, now) {
    if (!t) return 'autosave on';
    var s = Math.round(((now || Date.now()) - t) / 1000);
    if (s < 5) return 'Saved just now';
    if (s < 60) return 'Saved ' + s + ' seconds ago';
    var m = Math.round(s / 60);
    if (m < 60) return 'Saved ' + m + (m === 1 ? ' minute ago' : ' minutes ago');
    var h = Math.round(m / 60);
    return 'Saved ' + h + (h === 1 ? ' hour ago' : ' hours ago');
  }

  // Header eyebrow: "Tested Monday, 7 September  ·  Next test in 9 days".
  function cycleLabel(settings, now, fallback) {
    var st = settings || {};
    var parts = [];
    if (st.tested) parts.push('Tested ' + dateLong(st.tested));
    var dn = daysTo(st.next, now);
    if (dn !== null) {
      // A weekday is useful for a date that is nearly here and noise for one months
      // away, and the long form wraps the TV header.
      parts.push(dn > 0
        ? (dn <= LIMITS.countdownDays ? 'Next test in ' + dn + (dn === 1 ? ' day' : ' days') : 'Next test ' + dateShort(st.next))
        : 'Testing now');
    }
    return parts.length ? parts.join('  ·  ') : (fallback || '');
  }

  function initials(name) {
    return String(name || '').trim().split(/\s+/).map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase();
  }

  function clubLabel(id) {
    for (var i = 0; i < CLUBS.length; i++) if (CLUBS[i].id === id) return CLUBS[i].label;
    return CLUBS[0].label;
  }

  function progColor(id) {
    for (var i = 0; i < PROGRAMS.length; i++) if (PROGRAMS[i].id === id) return PROGRAMS[i].color;
    return PROGRAMS[0].color;
  }

  function program(id) {
    for (var i = 0; i < PROGRAMS.length; i++) if (PROGRAMS[i].id === id) return PROGRAMS[i];
    return null;
  }

  function crewKey(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Recognises a crew written any reasonable way: "5:40 AM", "540am", "5.40 am crew", "g2".
  function parseCrew(text) {
    var t = crewKey(text);
    if (!t) return null;
    for (var i = 0; i < PROGRAMS.length; i++) {
      var k = crewKey(PROGRAMS[i].label);
      if (t === PROGRAMS[i].id || t === k || t === k + 'crew') return PROGRAMS[i].id;
    }
    return null;
  }

  function lift(key) {
    for (var i = 0; i < LIFTS.length; i++) if (LIFTS[i].key === key) return LIFTS[i];
    return null;
  }

  function liftColorFor(key) {
    var l = lift(key);
    return l ? l.color : COLORS.gold; // 'total' uses gold
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function emptyCell() { return { c: '', p: '' }; }

  function newRow(name, club, prog) {
    return { name: name, club: club || 'mens', prog: prog || 'g1', sq: emptyCell(), bp: emptyCell(), dl: emptyCell(), h: [] };
  }

  function sameName(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  function findByName(data, name) {
    for (var i = 0; i < data.length; i++) if (sameName(data[i].name, name)) return i;
    return -1;
  }

  /* ------------------------------------------------------------------ */
  /* Seed, load, normalise                                               */
  /* ------------------------------------------------------------------ */

  // The roster as shipped. `placeholder: true` reproduces the prototype's demo
  // data (invented previous values and crews) for previewing every view; it is
  // never the production seed.
  function seedData(opts) {
    var placeholder = !!(opts && opts.placeholder);
    var steps = [0, 0, 2.5, 5, 5, 5, 7.5, 10, 12.5, 15];
    return ROSTER_RAW.trim().split('\n').map(function (line) {
      var p = line.split('|');
      var name = p[0].trim();
      var r = hash(name);
      var row = newRow(name, 'mens', placeholder ? 'g' + (1 + Math.floor(r * 7)) : 'g1');
      LIFT_KEYS.forEach(function (k, j) {
        var v = parseFloat(p[j + 1]);
        if (!isFinite(v) || v <= 0) { row[k] = emptyCell(); return; }
        var prev = '';
        if (placeholder && hash(name + k) >= 0.12) {
          var st = steps[Math.floor(hash(k + name + 'x') * steps.length)];
          prev = String(Math.max(20, v - st));
        }
        row[k] = { c: String(v), p: prev };
      });
      var first = {};
      LIFT_KEYS.forEach(function (k) { if (row[k].p) first[k] = row[k].p; });
      row.h = Object.keys(first).length ? [Object.assign({ d: 'Last round' }, first)] : [];
      return row;
    });
  }

  function filled(row) {
    return LIFT_KEYS.filter(function (k) { return !!((row[k] || {}).c || ''); }).length;
  }

  // Cleans a stored roster: drops junk rows and back-fills the history array from
  // the previous-round values so the member card can draw a trend line.
  function normaliseData(rows) {
    if (!Array.isArray(rows) || !rows.length) return null;
    var out = rows
      .filter(function (row) { return row && row.name && !(/^new member$/i.test(String(row.name).trim()) && !filled(row)); })
      .map(function (row) {
        var r = Object.assign({}, row);
        LIFT_KEYS.forEach(function (k) { if (!r[k]) r[k] = emptyCell(); });
        if (!r.h || !r.h.length) {
          var first = {};
          LIFT_KEYS.forEach(function (k) { var v = (r[k] || {}).p; if (v) first[k] = v; });
          r.h = Object.keys(first).length ? [Object.assign({ d: 'Last round' }, first)] : [];
        }
        return r;
      });
    return out.length ? out : null;
  }

  function normaliseSettings(p) {
    if (!p || typeof p !== 'object') return Object.assign({}, DEFAULT_SETTINGS);
    return {
      tested: p.tested || '', next: p.next || '', sheets: p.sheets || '', api: p.api || '', pin: p.pin || '',
      norotate: !!p.norotate, lock: !!p.lock, viewPin: p.viewPin === undefined ? DEFAULT_SETTINGS.viewPin : p.viewPin,
      views: Array.isArray(p.views) ? p.views.filter(function (k) { return ALL_VIEW_KEYS.indexOf(k) >= 0; }) : [],
      rotate: parseInt(p.rotate, 10) > 0 ? parseInt(p.rotate, 10) : 0
    };
  }

  function unlockValid(stamp, now) {
    var t = parseInt(stamp || '0', 10);
    return !!t && (now || Date.now()) - t < LIMITS.unlockMs;
  }

  function digitsOnly(v) { return String(v || '').replace(/\D/g, '').slice(0, 8); }

  function clampRotate(v) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) return LIMITS.rotateDefault;
    return Math.min(LIMITS.rotateMax, Math.max(LIMITS.rotateMin, n));
  }

  /* ------------------------------------------------------------------ */
  /* Members (derived view of the raw rows)                               */
  /* ------------------------------------------------------------------ */

  function buildMembers(data) {
    return data.map(function (row, i) {
      var m = { name: row.name, prog: row.prog || 'g1', club: row.club || 'mens', lifts: {}, idx: i };
      LIFT_KEYS.forEach(function (k) {
        var d = row[k] || {};
        var cur = num(d.c);
        if (cur === null) { m.lifts[k] = null; return; }
        var prev = num(d.p);
        m.lifts[k] = { cur: cur, prev: prev, gain: prev === null ? null : cur - prev, pct: prev ? ((cur - prev) / prev) * 100 : null };
      });
      var all = LIFT_KEYS.map(function (k) { return m.lifts[k]; });
      m.total = all.every(function (x) { return x; }) ? all.reduce(function (a, x) { return a + x.cur; }, 0) : null;
      return m;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function hasNumbers(m) { return !!(m.lifts.sq || m.lifts.bp || m.lifts.dl); }

  function liftValue(m, key) {
    if (key === 'total') return m.total;
    return m.lifts[key] ? m.lifts[key].cur : null;
  }

  // Sum of gains across tested lifts; `any` is false when nothing has a previous value.
  function totalGain(m) {
    var ls = LIFT_KEYS.map(function (k) { return m.lifts[k]; }).filter(function (x) { return x && x.gain !== null; });
    return { any: ls.length > 0, gain: ls.reduce(function (a, x) { return a + x.gain; }, 0) };
  }

  function clubsPresent(data) {
    var present = {};
    data.forEach(function (r) { present[r.club || 'mens'] = 1; });
    var list = CLUBS.filter(function (c) { return present[c.id]; }).map(function (c) { return c.id; });
    return list.length ? list : ['mens'];
  }

  function countIn(data, club, prog) {
    return data.filter(function (m) { return (m.club || 'mens') === club && (prog === 'all' || (m.prog || 'g1') === prog); }).length;
  }

  function scopeMembers(members, clubScope, prog) {
    return members.filter(function (m) {
      return (!clubScope || m.club === clubScope) && (prog === 'all' || m.prog === prog) && hasNumbers(m);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Rotation views                                                      */
  /* ------------------------------------------------------------------ */

  function buildViews(data, club, prog, settings) {
    var on = enabledViews(settings);
    var has = function (k) { return on.indexOf(k) >= 0; };
    var v = [];
    var clubs = club === 'all' ? clubsPresent(data) : [club];
    clubs.forEach(function (c) {
      VIEW_SPECS.forEach(function (sp) {
        if (sp.kind === 'board' && has(sp.key)) v.push({ key: sp.key, kind: 'board', lift: sp.lift, club: c, label: sp.label });
      });
    });
    ['movers', 'gains', 'pbs', 'miles', 'crews'].forEach(function (k) {
      if (has(k)) v.push({ key: k, kind: k, label: viewSpec(k).label });
    });
    if (has('roster')) {
      clubs.forEach(function (c) {
        var n = Math.max(1, Math.ceil(countIn(data, c, prog) / LIMITS.perPage));
        for (var i = 0; i < n; i++) v.push({ key: 'roster', kind: 'roster', page: i, club: c, label: 'Everyone' });
      });
    }
    return v.length ? v : [{ key: 'total', kind: 'board', lift: 'total', club: clubs[0], label: 'Total' }];
  }

  // Every view the board can show, in rotation order. A coach switches any of
  // them off in Coach mode and both the chips and the rotation follow.
  var VIEW_SPECS = [
    { key: 'total', kind: 'board', lift: 'total', label: 'Total' },
    { key: 'sq', kind: 'board', lift: 'sq', label: 'Squat' },
    { key: 'bp', kind: 'board', lift: 'bp', label: 'Bench' },
    { key: 'dl', kind: 'board', lift: 'dl', label: 'Deadlift' },
    { key: 'movers', kind: 'movers', label: 'Movers' },
    { key: 'gains', kind: 'gains', label: 'Gains' },
    { key: 'pbs', kind: 'pbs', label: 'New PBs' },
    { key: 'miles', kind: 'miles', label: 'Milestones' },
    { key: 'crews', kind: 'crews', label: 'Crews' },
    { key: 'roster', kind: 'roster', label: 'Everyone' }
  ];

  var ALL_VIEW_KEYS = VIEW_SPECS.map(function (sp) { return sp.key; });

  function viewSpec(key) {
    for (var i = 0; i < VIEW_SPECS.length; i++) if (VIEW_SPECS[i].key === key) return VIEW_SPECS[i];
    return null;
  }

  // No stored choice means every view. A choice that turns everything off falls
  // back to the total board, so a screen is never left blank.
  function enabledViews(settings) {
    var want = (settings || {}).views;
    if (!Array.isArray(want) || !want.length) return ALL_VIEW_KEYS.slice();
    var on = ALL_VIEW_KEYS.filter(function (k) { return want.indexOf(k) >= 0; });
    return on.length ? on : ['total'];
  }

  function viewEnabled(settings, key) {
    return enabledViews(settings).indexOf(key) >= 0;
  }

  // Returns the new list, in canonical order. The last view on cannot be turned off.
  function toggleView(settings, key) {
    var on = enabledViews(settings);
    var has = on.indexOf(key) >= 0;
    if (has && on.length === 1) return on;
    var next = has ? on.filter(function (k) { return k !== key; }) : on.concat([key]);
    return ALL_VIEW_KEYS.filter(function (k) { return next.indexOf(k) >= 0; });
  }

  // Seconds per view: a URL override wins, then the coach's setting, then the default.
  function effectiveRotate(settings, override) {
    if (override) return clampRotate(override);
    var st = (settings || {}).rotate;
    return st ? clampRotate(st) : LIMITS.rotateDefault;
  }

  function viewMatches(v, spec) {
    if (spec && spec.key) return v.key === spec.key;
    return v.kind === spec.kind && (spec.kind !== 'board' || v.lift === spec.lift);
  }

  function navIndex(views, spec) {
    for (var i = 0; i < views.length; i++) if (viewMatches(views[i], spec)) return i;
    return 0;
  }

  /* ------------------------------------------------------------------ */
  /* View data                                                           */
  /* ------------------------------------------------------------------ */

  function leaderboard(filtered, liftKey) {
    var isTotal = liftKey === 'total';
    var rows = filtered
      .map(function (m) { return { m: m, val: isTotal ? m.total : (m.lifts[liftKey] ? m.lifts[liftKey].cur : null) }; })
      .filter(function (r) { return r.val !== null; })
      .sort(function (a, b) { return b.val - a.val; })
      .slice(0, LIMITS.leaderboard)
      .map(function (r, i) {
        var g, any;
        if (isTotal) { var tg = totalGain(r.m); any = tg.any; g = tg.gain; }
        else { var d = r.m.lifts[liftKey]; any = d.gain !== null; g = d.gain || 0; }
        return {
          rank: i + 1, m: r.m, val: r.val, any: any, gain: g,
          meta: !any ? 'First test' : g > 0 ? '▲ ' + fmt(g) + ' kg on last test' : 'Held from last test',
          improved: any && g > 0
        };
      });
    return {
      isTotal: isTotal,
      rows: rows,
      testedCount: isTotal ? rows.length : filtered.filter(function (m) { return m.lifts[liftKey]; }).length
    };
  }

  function rankLabel(rank) {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
  }

  function movers(filtered) {
    var all = [];
    filtered.forEach(function (m) {
      LIFTS.forEach(function (l) {
        var d = m.lifts[l.key];
        if (d && d.pct > 0) all.push({ m: m, lift: l, d: d });
      });
    });
    all.sort(function (a, b) { return b.d.pct - a.d.pct; });
    var top = all.slice(0, LIMITS.movers);
    var max = top.length ? top[0].d.pct : 1;
    return top.map(function (x) {
      return {
        m: x.m, lift: x.lift, prev: x.d.prev, cur: x.d.cur, pct: x.d.pct, gain: x.d.gain,
        pctLabel: '+' + x.d.pct.toFixed(1) + '%',
        gainLabel: '+' + fmt(x.d.gain) + ' kg added',
        barPct: (x.d.pct / max) * 100
      };
    });
  }

  function pbs(filtered) {
    var all = [];
    filtered.forEach(function (m) {
      LIFTS.forEach(function (l) {
        var d = m.lifts[l.key];
        if (d && d.gain > 0) all.push({ m: m, lift: l, gain: d.gain, gainLabel: '+' + fmt(d.gain) + ' kg' });
      });
    });
    all.sort(function (a, b) { return b.gain - a.gain; });
    return {
      count: all.length,
      sub: all.length > LIMITS.pbs ? 'Biggest ' + LIMITS.pbs + ' of ' + all.length + ' this round' : 'Every lift that went up',
      items: all.slice(0, LIMITS.pbs)
    };
  }

  function milestones(filtered) {
    return MILESTONES.map(function (ms) {
      var inClub = filtered
        .filter(function (m) { var v = liftValue(m, ms.lift); return v !== null && v >= ms.kg; })
        .sort(function (a, b) { return liftValue(b, ms.lift) - liftValue(a, ms.lift); });
      var near = filtered
        .map(function (m) { return { m: m, val: liftValue(m, ms.lift) }; })
        .filter(function (x) { return x.val !== null && x.val < ms.kg && ms.kg - x.val <= LIMITS.nearKg; })
        .sort(function (a, b) { return b.val - a.val; });
      return {
        label: ms.label, lift: ms.lift, kg: ms.kg, color: liftColorFor(ms.lift),
        count: inClub.length,
        countLabel: inClub.length === 1 ? '1 member' : inClub.length + ' members',
        names: inClub.slice(0, LIMITS.milestoneNames).map(function (m) { return { m: m, val: fmt(liftValue(m, ms.lift)) }; }),
        more: inClub.length > LIMITS.milestoneNames ? '+' + (inClub.length - LIMITS.milestoneNames) + ' more' : '',
        near: near.length
          ? 'Knocking on the door: ' + near.slice(0, LIMITS.near).map(function (x) { return x.m.name + ' (' + fmt(ms.kg - x.val) + ' kg away)'; }).join(', ')
          : 'Nobody within ' + LIMITS.nearKg + ' kg yet'
      };
    });
  }

  // Crew against crew. Takes the whole club rather than the current crew filter,
  // since comparing crews is the point of the view.
  function crewStandings(members) {
    var rows = PROGRAMS.map(function (p) {
      var inCrew = members.filter(function (m) { return m.prog === p.id && hasNumbers(m); });
      var gained = 0, pbs = 0, sum = 0, withTotal = 0;
      inCrew.forEach(function (m) {
        LIFT_KEYS.forEach(function (k) {
          var d = m.lifts[k];
          if (d && d.gain > 0) { gained += d.gain; pbs++; }
        });
        if (m.total) { sum += m.total; withTotal++; }
      });
      return {
        id: p.id, label: p.label, color: p.color,
        tested: inCrew.length, gained: gained, pbs: pbs,
        avgTotal: withTotal ? sum / withTotal : null
      };
    }).filter(function (c) { return c.tested > 0; });

    var anyGain = rows.some(function (c) { return c.gained > 0; });
    rows.sort(function (a, b) {
      if (anyGain && b.gained !== a.gained) return b.gained - a.gained;
      return (b.avgTotal || 0) - (a.avgTotal || 0);
    });
    return {
      rows: rows.map(function (r, i) { return Object.assign({ rank: i + 1 }, r); }),
      by: anyGain ? 'gains' : 'average'
    };
  }

  // Most kilos added across the big three. Movers ranks a single lift by
  // percentage, which favours light starting numbers; this ranks total work.
  function topGainers(filtered) {
    return filtered
      .map(function (m) { var tg = totalGain(m); return { m: m, gain: tg.gain, any: tg.any }; })
      .filter(function (x) { return x.any && x.gain > 0; })
      .sort(function (a, b) { return b.gain - a.gain || a.m.name.localeCompare(b.m.name); })
      .slice(0, LIMITS.leaderboard)
      .map(function (x, i) {
        var parts = LIFT_KEYS
          .filter(function (k) { return x.m.lifts[k] && x.m.lifts[k].gain > 0; })
          .map(function (k) { return lift(k).label + ' +' + fmt(x.m.lifts[k].gain); });
        return { rank: i + 1, m: x.m, gain: x.gain, label: '+' + fmt(x.gain) + ' kg', detail: parts.join(' · ') };
      });
  }

  var ROSTER_SORTS = [
    { id: 'name', label: 'Name' },
    { id: 'total', label: 'Total' },
    { id: 'gain', label: 'Gain' }
  ];

  function sortMembers(list, sort) {
    var out = list.slice();
    if (sort === 'total') out.sort(function (a, b) { return (b.total || 0) - (a.total || 0) || a.name.localeCompare(b.name); });
    else if (sort === 'gain') out.sort(function (a, b) { return totalGain(b).gain - totalGain(a).gain || a.name.localeCompare(b.name); });
    return out;
  }

  function roster(filtered, page, scrollMode) {
    var per = LIMITS.perPage;
    var pages = Math.max(1, Math.ceil(filtered.length / per));
    var p = Math.min(page || 0, pages - 1);
    var slice = scrollMode ? filtered : filtered.slice(p * per, p * per + per);
    return {
      pages: pages, page: p, scroll: !!scrollMode,
      sub: scrollMode
        ? 'All ' + filtered.length + ' members · scroll for more · kilograms'
        : 'Page ' + (p + 1) + ' of ' + pages + ' · ' + filtered.length + ' members · kilograms',
      rows: slice.map(function (m) {
        var cells = {};
        LIFT_KEYS.forEach(function (k) {
          var d = m.lifts[k];
          cells[k] = { text: d ? fmt(d.cur) : '—', state: !d ? 'none' : d.gain > 0 ? 'up' : 'flat' };
        });
        return { m: m, cells: cells, total: m.total ? fmt(m.total) : '—' };
      })
    };
  }

  /* ------------------------------------------------------------------ */
  /* Member card                                                         */
  /* ------------------------------------------------------------------ */

  // Polyline points for a 100x32 viewBox; empty string when fewer than two points.
  function sparkPoints(series) {
    if (!series || series.length < 2) return '';
    var lo = Math.min.apply(null, series), hi = Math.max.apply(null, series);
    var span = hi - lo || 1;
    return series.map(function (v, i) {
      return ((i / (series.length - 1)) * 100).toFixed(1) + ',' + (30 - ((v - lo) / span) * 26).toFixed(1);
    }).join(' ');
  }

  function workingWeights(cur) {
    return WORKING_PCTS.map(function (p) { return { label: p + '%', val: fmt(cur * p / 100) }; });
  }

  function memberLifts(m, rawRow, settings) {
    var row = rawRow || {};
    var hist = row.h || [];
    var st = settings || {};
    return LIFTS.map(function (l) {
      var d = m.lifts[l.key];
      var series = hist.map(function (x) { return parseFloat(x[l.key]); }).filter(function (v) { return isFinite(v); });
      if (d) series.push(d.cur);
      var spark = sparkPoints(series);
      var journey = series.length > 1 ? series[series.length - 1] - series[0] : 0;
      if (!d) {
        return { key: l.key, name: l.label, color: COLORS.untested, tested: false, note: 'Not tested yet', spark: '', journey: '', prev: '', cur: '', delta: 'Due this round', up: false, wp: [] };
      }
      var up = d.gain > 0;
      var cell = row[l.key] || {};
      var since = hist.length ? (hist[0].d === 'Last round' ? 'last round' : dateShort(hist[0].d)) : 'first test';
      return {
        key: l.key, name: l.label, color: l.color, tested: true,
        spark: spark,
        journey: journey > 0 ? '+' + fmt(journey) + ' kg since ' + since : '',
        note: (d.prev === null ? 'First test' : up ? 'New personal best' : 'Held from last test')
          + (cell.t ? ' · recorded ' + dateShort(cell.t) : (st.tested ? ' · ' + dateShort(st.tested) : '')),
        prev: d.prev === null ? 'first test' : fmt(d.prev),
        cur: fmt(d.cur),
        delta: d.prev === null ? 'Baseline set' : up ? '+' + fmt(d.gain) + ' kg · +' + d.pct.toFixed(1) + '%' : 'No change',
        up: up,
        wp: workingWeights(d.cur)
      };
    });
  }

  function memberSummary(m) {
    var tg = totalGain(m);
    return {
      total: m.total ? fmt(m.total) + ' kg total' : 'Awaiting all 3 lifts',
      gain: tg.gain > 0 ? '▲ ' + fmt(tg.gain) + ' kg' : '',
      sq: m.lifts.sq ? fmt(m.lifts.sq.cur) : '—',
      bp: m.lifts.bp ? fmt(m.lifts.bp.cur) : '—',
      dl: m.lifts.dl ? fmt(m.lifts.dl.cur) : '—'
    };
  }

  /* ------------------------------------------------------------------ */
  /* Duplicates                                                          */
  /* ------------------------------------------------------------------ */

  function lev(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    var m = [];
    for (var i = 0; i <= b.length; i++) m[i] = [i];
    for (var j = 0; j <= a.length; j++) m[0][j] = j;
    for (i = 1; i <= b.length; i++) {
      for (j = 1; j <= a.length; j++) {
        m[i][j] = b[i - 1] === a[j - 1] ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
      }
    }
    return m[b.length][a.length];
  }

  function looksSame(n1, n2) {
    var a = String(n1).trim().toLowerCase().replace(/\s+/g, ' ');
    var b = String(n2).trim().toLowerCase().replace(/\s+/g, ' ');
    if (a === b) return true;
    var at = a.split(' '), bt = b.split(' ');
    var af = at[0], bf = bt[0], al = at[at.length - 1], bl = bt[bt.length - 1];
    if (at.length < 2 || bt.length < 2) return false;
    if (af === bf && lev(al, bl) <= 1) return true;
    if (al === bl && (af.indexOf(bf) === 0 || bf.indexOf(af) === 0 || lev(af, bf) <= 2)) return true;
    return false;
  }

  function findDuplicates(data) {
    var pairs = [];
    for (var i = 0; i < data.length; i++) {
      for (var j = i + 1; j < data.length; j++) {
        if (!data[i].name || !data[j].name) continue;
        if (!looksSame(data[i].name, data[j].name)) continue;
        var keep = filled(data[i]) >= filled(data[j]) ? i : j;
        var drop = keep === i ? j : i;
        pairs.push({ keep: keep, drop: drop, keepName: data[keep].name, dropName: data[drop].name, keepLifts: filled(data[keep]), dropLifts: filled(data[drop]) });
      }
    }
    return pairs;
  }

  function mergeRows(data, keepIdx, dropIdx) {
    var d = data.slice();
    var keep = Object.assign({}, d[keepIdx]), drop = d[dropIdx];
    LIFT_KEYS.forEach(function (k) {
      var a = keep[k] || emptyCell(), b = drop[k] || emptyCell();
      var ac = parseFloat(a.c), bc = parseFloat(b.c);
      var takeB = isFinite(bc) && (!isFinite(ac) || bc > ac);
      keep[k] = Object.assign({}, takeB ? b : a, { c: takeB ? b.c : a.c, p: a.p || b.p || '' });
    });
    keep.h = (keep.h || []).concat(drop.h || []);
    d[keepIdx] = keep;
    d.splice(dropIdx, 1);
    return d;
  }

  /* ------------------------------------------------------------------ */
  /* Editing                                                             */
  /* ------------------------------------------------------------------ */

  function setField(data, i, liftKey, which, value, today) {
    var d = data.slice();
    var row = Object.assign({}, d[i]);
    row[liftKey] = Object.assign({}, row[liftKey] || emptyCell());
    row[liftKey][which] = value;
    if (which === 'c') row[liftKey].t = today || todayIso();
    d[i] = row;
    return d;
  }

  function setMeta(data, i, key, value) {
    var d = data.slice();
    d[i] = Object.assign({}, d[i]);
    d[i][key] = value;
    return d;
  }

  // A pasted list of members: "Jane Smith" or "Jane Smith, 5:40 AM" per line.
  // Blank lines and a leading "Name" header are ignored.
  function parseBulkNames(text, defaultProg) {
    var out = [];
    String(text || '').split('\n').forEach(function (line) {
      var cells = line.split(/[\t,;]/).map(function (x) { return x.trim(); });
      var name = cells[0];
      if (!name || /^name$/i.test(name)) return;
      var prog = null;
      cells.slice(1).forEach(function (c) { if (!prog) prog = parseCrew(c); });
      out.push({ name: name, prog: prog || defaultProg || 'g1' });
    });
    return out;
  }

  // What a bulk add would do: who is new, who is already on the roster, and who
  // looks like an existing member spelled differently. Nothing is written here,
  // so the coach sees the outcome before committing to it.
  function planBulkAdd(data, entries) {
    var add = [], exact = [], similar = [], seen = {};
    (entries || []).forEach(function (e) {
      var name = String(e.name || '').trim();
      if (!name) return;
      var key = name.toLowerCase();
      if (seen[key]) { exact.push({ name: name, match: name }); return; }
      seen[key] = 1;
      var i = findByName(data, name);
      if (i >= 0) { exact.push({ name: name, match: data[i].name }); return; }
      var near = '';
      for (var j = 0; j < data.length && !near; j++) {
        if (data[j].name && looksSame(data[j].name, name)) near = data[j].name;
      }
      if (near) similar.push({ name: name, prog: e.prog, match: near });
      else add.push({ name: name, prog: e.prog });
    });
    return { add: add, exact: exact, similar: similar };
  }

  function bulkSummary(plan) {
    var parts = [plan.add.length === 1 ? '1 new member' : plan.add.length + ' new members'];
    if (plan.exact.length) parts.push(plan.exact.length === 1 ? '1 already on the roster' : plan.exact.length + ' already on the roster');
    if (plan.similar.length) parts.push(plan.similar.length === 1 ? '1 looks like an existing member' : plan.similar.length + ' look like existing members');
    return parts.join(' · ');
  }

  function addMembers(data, entries, club) {
    var d = data.slice();
    (entries || []).forEach(function (e) {
      var name = String(e.name || '').trim();
      if (name) d.push(newRow(name, club || 'mens', e.prog || 'g1'));
    });
    return d;
  }

  function addMember(data, name, club) {
    var n = String(name || '').trim();
    if (!n) return data;
    return data.concat([newRow(n, club || 'mens', 'g1')]);
  }

  function removeMember(data, i) {
    var d = data.slice();
    d.splice(i, 1);
    return d;
  }

  // Coach enters a score in a testing session: the old number becomes "previous"
  // and the entry is stamped with today's date.
  function recordScore(data, i, liftKey, value, today) {
    var d = data.slice();
    var row = Object.assign({}, d[i]);
    var old = row[liftKey] || emptyCell();
    row[liftKey] = { c: String(value), p: old.p || old.c || '', t: today || todayIso() };
    d[i] = row;
    return d;
  }

  // Start a new testing round: every current number is archived and copied into "previous".
  function rollForward(data, stamp) {
    return data.map(function (row) {
      var r = Object.assign({}, row);
      var snap = { d: stamp };
      LIFT_KEYS.forEach(function (k) {
        var v = (r[k] || {}).c || '';
        if (v) snap[k] = v;
        r[k] = { c: v, p: v };
      });
      var h = (r.h || []).filter(function (x) { return x.d !== stamp; });
      if (Object.keys(snap).length > 1) h.push(snap);
      r.h = h.slice(-LIMITS.historyRounds);
      return r;
    });
  }

  // "Paste from sheet": a JSON backup, or lines of
  // Name, Squat, Bench, Deadlift[, prevSq, prevBp, prevDl] with an optional crew
  // in any column after the name ("Keith Gray, 5:40 AM" assigns a crew on its own).
  function applyImport(data, text, club) {
    var txt = String(text || '').trim();
    if (!txt) return null;
    var rows = null;
    try { var j = JSON.parse(txt); if (Array.isArray(j)) rows = j; } catch (e) { /* not JSON */ }
    var d = data.slice();
    if (rows) {
      rows.forEach(function (r) {
        if (!r || !r.name) return;
        var i = findByName(d, r.name);
        if (i >= 0) d[i] = Object.assign({}, d[i], r); else d.push(Object.assign(newRow(r.name), r));
      });
      return d;
    }
    txt.split('\n').forEach(function (line) {
      var cells = line.split(/[\t,;]/).map(function (x) { return x.trim(); });
      var name = cells[0];
      if (!name || /^name$/i.test(name)) return;
      var prog = null, vals = [];
      cells.slice(1).forEach(function (cell) {
        if (prog === null && parseCrew(cell)) { prog = parseCrew(cell); return; }
        vals.push(cell);
      });
      var base = { name: name, sq: { c: vals[0] || '', p: vals[3] || '' }, bp: { c: vals[1] || '', p: vals[4] || '' }, dl: { c: vals[2] || '', p: vals[5] || '' } };
      var i = findByName(d, name);
      if (i >= 0) {
        var row = Object.assign({}, d[i]);
        if (prog) row.prog = prog;
        LIFT_KEYS.forEach(function (k) {
          var nv = base[k];
          row[k] = Object.assign({}, row[k] || {}, { c: nv.c || (row[k] || {}).c || '', p: nv.p || (row[k] || {}).p || '' });
        });
        d[i] = row;
      } else d.push(Object.assign(newRow(name, club || 'mens', prog || 'g1'), base));
    });
    return d;
  }

  function snapshotHistory(hist, data, now) {
    var h = hist || [];
    if (h.length && now - h[0].t <= LIMITS.histGapMs) return { hist: h, added: false };
    return { hist: [{ t: now, data: data }].concat(h).slice(0, LIMITS.histMax), added: true };
  }

  /* ------------------------------------------------------------------ */
  /* Google Sheet CSV                                                    */
  /* ------------------------------------------------------------------ */

  function parseCsv(text) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch !== '\r') cell += ch;
    }
    row.push(cell); rows.push(row);
    return rows;
  }

  function liftFromText(t) {
    t = String(t || '').toLowerCase();
    if (/squat/.test(t)) return 'sq';
    if (/bench/.test(t)) return 'bp';
    if (/dead/.test(t)) return 'dl';
    return null;
  }

  // Published-CSV links, one per lift tab. A link may be prefixed to name its lift
  // ("squat=https://…") for tabs whose header only says "5RM".
  function parseSheetLinks(text) {
    return String(text || '').split(/[\s,]+/).map(function (tok) {
      var m = /^(?:(sq|bp|dl|squat|bench|deadlift)\s*=\s*)?(https?:\/\/\S+)$/i.exec(tok.trim());
      if (!m) return null;
      var hint = m[1] ? m[1].toLowerCase() : '';
      var key = hint === 'squat' ? 'sq' : hint === 'bench' ? 'bp' : hint === 'deadlift' ? 'dl' : hint;
      return { url: m[2], lift: key || null };
    }).filter(Boolean);
  }

  // Finds the header row containing "Name", then the lift columns (or the "5RM"
  // column of a single-lift tab) and their "Previous" columns. Returns
  // [{ name, sq?: {c,p}, ... }] or null when the sheet can't be read.
  function parseSheet(text, liftHint) {
    var rows = parseCsv(text);
    var hi = -1, nameCol = -1;
    for (var i = 0; i < rows.length && hi < 0; i++) {
      for (var j = 0; j < rows[i].length; j++) {
        if (/^\s*name\s*$/i.test(rows[i][j] || '')) { hi = i; nameCol = j; break; }
      }
    }
    if (hi < 0) return null;
    var head = rows[hi];
    var cols = {}, prevCols = [], rmCol = -1;
    head.forEach(function (c, j) {
      var t = (c || '').toLowerCase();
      if (!t || j === nameCol) return;
      if (/previous/.test(t)) { prevCols.push(j); return; }
      if (/%|improve/.test(t)) return;
      var k = liftFromText(t);
      if (k && cols[k] === undefined) cols[k] = j;
      else if (!k && rmCol < 0 && /5\s*rm/.test(t)) rmCol = j;
    });
    var keys = Object.keys(cols);
    if (!keys.length) {
      // Single-lift tab: the lift name is in the link prefix or a title row above the header.
      var k2 = liftHint || null;
      for (i = 0; i < hi && !k2; i++) for (j = 0; j < rows[i].length && !k2; j++) k2 = liftFromText(rows[i][j]);
      if (!k2) return null;
      cols[k2] = rmCol >= 0 ? rmCol : nameCol + 1;
      keys = [k2];
    }
    var out = [];
    for (i = hi + 1; i < rows.length; i++) {
      var name = (rows[i][nameCol] || '').trim();
      if (!name) continue;
      var rec = { name: name };
      keys.forEach(function (k, n) {
        var cur = (rows[i][cols[k]] || '').trim();
        var pj = keys.length === 1 ? prevCols[0] : prevCols[n];
        var prev = pj !== undefined ? (rows[i][pj] || '').trim() : '';
        if (cur || prev) rec[k] = { c: cur, p: prev };
      });
      if (Object.keys(rec).length > 1) out.push(rec);
    }
    return out;
  }

  // Merges parsed sheet records into the roster by name; unknown names are appended.
  function mergeSheetResults(data, results, club) {
    var d = data.slice();
    var added = 0, updated = 0, failed = 0;
    results.forEach(function (rs) {
      if (!rs) { failed++; return; }
      rs.forEach(function (rec) {
        var i = findByName(d, rec.name);
        if (i >= 0) {
          var row = Object.assign({}, d[i]);
          LIFT_KEYS.forEach(function (k) {
            if (!rec[k]) return;
            var old = row[k] || emptyCell();
            row[k] = Object.assign({}, old, { c: rec[k].c || old.c, p: rec[k].p || old.p });
          });
          d[i] = row; updated++;
        } else {
          var fresh = newRow(rec.name, club || 'mens', 'g1');
          LIFT_KEYS.forEach(function (k) { if (rec[k]) fresh[k] = { c: rec[k].c || '', p: rec[k].p || '' }; });
          d.push(fresh); added++;
        }
      });
    });
    return { data: d, added: added, updated: updated, failed: failed };
  }

  function syncMessage(r, urlCount, now) {
    if (r.failed === urlCount) return 'Could not reach the sheet. Check the link is a published CSV.';
    return 'Synced ' + r.updated + ' members' + (r.added ? ', added ' + r.added : '') + (r.failed ? ' · ' + r.failed + ' link(s) failed' : '') + ' · ' + timeShort(now || Date.now());
  }

  /* ------------------------------------------------------------------ */
  /* Testing session                                                     */
  /* ------------------------------------------------------------------ */

  function buildQueue(data, club, prog) {
    var p = prog || 'all';
    return data
      .map(function (row, i) { return { name: row.name, i: i, club: row.club || 'mens', prog: row.prog || 'g1' }; })
      .filter(function (x) { return (club === 'all' || x.club === club) && (p === 'all' || x.prog === p); })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  // A member is handled once they have a score in or are marked "not today".
  function isHandled(done, i) {
    var st = (done || {})[i];
    return st === 'done' || st === 'skip';
  }

  function sessionRemaining(queue, done) {
    return queue.filter(function (x) { return !isHandled(done, x.i); });
  }

  // Marks everyone still outstanding as not testing, for the end of a session when
  // the stragglers simply are not in today. Touches session state only: no score
  // is changed, so nothing anyone lifted is lost.
  function skipRemaining(queue, done) {
    var out = Object.assign({}, done || {});
    (queue || []).forEach(function (x) { if (!isHandled(out, x.i)) out[x.i] = 'skip'; });
    return out;
  }

  function outstandingCount(queue, done) {
    return (queue || []).filter(function (x) { return !isHandled(done, x.i); }).length;
  }

  // The list a coach walks: everyone in scope, or only those still to do.
  function sessionQueue(data, club, prog, done, remainingOnly) {
    var q = buildQueue(data, club, prog);
    return remainingOnly ? sessionRemaining(q, done) : q;
  }

  function padKey(draft, k) {
    var d = draft || '';
    if (k === 'del') return d.slice(0, -1);
    if (k === '.') return d.indexOf('.') < 0 && d ? d + '.' : d;
    return d.length < 6 ? d + k : d;
  }

  // +2.5 / +5 / +10 pills add to the draft, or to the member's current number when the draft is empty.
  function padAdd(draft, currentText, n) {
    var base = parseFloat(draft) || parseFloat(currentText) || 0;
    return String(Math.round((base + n) * 100) / 100);
  }

  function queueMatches(queue, q) {
    var low = String(q || '').trim().toLowerCase();
    return (low ? queue.filter(function (x) { return x.name.toLowerCase().indexOf(low) >= 0; }) : queue).slice(0, LIMITS.findList);
  }

  function canAddName(queue, q) {
    var qq = String(q || '').trim();
    if (qq.length < 3) return false;
    var low = qq.toLowerCase();
    return !queue.some(function (x) { return x.name.toLowerCase().indexOf(low) >= 0 || looksSame(x.name, qq); });
  }

  function sessionContext(cell) {
    var c = cell || emptyCell();
    return c.c ? 'Current on the board: ' + c.c + ' kg' : (c.p ? 'Last test: ' + c.p + ' kg' : 'No previous number');
  }

  // `counts` is { done, skip }; a bare number is read as entered-only. Skips are
  // reported separately, so clearing the stragglers never reads as scores entered.
  function sessionProgress(idx, queueLen, counts, scopeTotal, remainingOnly) {
    var c = typeof counts === 'number' ? { done: counts, skip: 0 } : (counts || {});
    var entered = c.done || 0, skipped = c.skip || 0;
    var total = scopeTotal === undefined || scopeTotal === null ? queueLen : scopeTotal;
    var head = remainingOnly
      ? (queueLen === 1 ? '1 still to do' : queueLen + ' still to do')
      : (idx + 1) + ' of ' + total;
    var parts = [head, entered + ' entered'];
    if (skipped) parts.push(skipped + ' not testing');
    return { label: parts.join(' · '), pct: ((entered + skipped) / Math.max(1, total)) * 100 };
  }

  function draftsFilled(drafts) {
    return LIFT_KEYS.filter(function (k) { return String((drafts || {})[k] || '').trim() !== ''; });
  }

  // A reason to double-check an entry, or null when it looks fine. Never blocks a
  // save: the coach confirms and carries on, so an unusual but real lift still goes in.
  function checkEntry(value, cell, liftKey) {
    var v = parseFloat(value);
    var name = ((lift(liftKey) || {}).label || 'lift').toLowerCase();
    if (!isFinite(v) || v <= 0) return { kind: 'invalid', message: 'Enter a weight before saving.', suggestion: '' };
    var max = PLAUSIBLE_MAX[liftKey] || 350;
    if (v > max) {
      var shifted = Math.round(v * 10) / 100;
      return {
        kind: 'high',
        message: fmt(v) + ' kg is heavier than any ' + name + ' 5RM we would expect.',
        suggestion: shifted >= PLAUSIBLE_MIN && shifted <= max ? String(shifted) : ''
      };
    }
    if (v < PLAUSIBLE_MIN) return { kind: 'low', message: fmt(v) + ' kg looks light for a ' + name + ' 5RM.', suggestion: '' };
    var base = num((cell || {}).c) || num((cell || {}).p);
    if (base) {
      if (v > base * 1.5) return { kind: 'jump', message: fmt(v) + ' kg is a big jump from ' + fmt(base) + ' kg.', suggestion: '' };
      if (v < base * 0.5) return { kind: 'drop', message: fmt(v) + ' kg is well below their last number of ' + fmt(base) + ' kg.', suggestion: '' };
    }
    return null;
  }

  // The same check across a whole member, for a session entering all three lifts.
  function checkEntries(drafts, row) {
    var out = [];
    draftsFilled(drafts).forEach(function (k) {
      var r = checkEntry(drafts[k], (row || {})[k], k);
      if (r) out.push(Object.assign({ lift: k }, r));
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Keypad code entry (gym passcode and coach PIN)                      */
  /* ------------------------------------------------------------------ */

  function codeStep(draft, key, want, wrongMsg) {
    var d = draft || '';
    if (key === 'del') d = d.slice(0, -1);
    else if (d.length < 8) d += key;
    if (d === want) return { draft: '', ok: true, err: '' };
    return { draft: d, ok: false, err: d.length >= want.length ? wrongMsg : '' };
  }

  var KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0'];
  var NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

  function keyLabel(k) { return k === 'del' ? '⌫' : k; }

  /* ------------------------------------------------------------------ */
  /* Save-back outbox (scores waiting to be written to the sheet)        */
  /* ------------------------------------------------------------------ */

  function pingBody(pin) {
    return JSON.stringify({ ping: true, pin: pin || '' });
  }

  function saveBody(pin, member) {
    return JSON.stringify({ pin: pin || '', member: member });
  }

  // The Apps Script replies with JSON. Anything unparseable counts as accepted,
  // since older deployments answered with a bare redirect body.
  function parseApiReply(text) {
    var res = null;
    try { res = JSON.parse(text); } catch (e) { return { ok: true, error: '' }; }
    if (res && res.ok === false) return { ok: false, error: String(res.error || 'error') };
    return { ok: true, error: '' };
  }

  // Where a coach's entries are going, in words they can act on.
  function saveDestination(settings) {
    var st = settings || {};
    if ((st.api || '').trim()) return { kind: 'sheet', label: 'Saving into the gym sheet' };
    if ((st.sheets || '').trim()) return { kind: 'device', label: 'Saved on this device only. Add a save-back link in Coach mode to write scores into the sheet.' };
    return { kind: 'device', label: 'Saved on this device only. Link the gym sheet in Coach mode so every screen sees these numbers.' };
  }

  function outboxAdd(list, row) {
    var out = (list || []).filter(function (x) { return !sameName(x.name, row.name); });
    out.push(clone(row));
    return out;
  }

  function outboxRemove(list, name) {
    return (list || []).filter(function (x) { return !sameName(x.name, name); });
  }

  /* ------------------------------------------------------------------ */

  return {
    LIFT_KEYS: LIFT_KEYS, LIFTS: LIFTS, PROGRAMS: PROGRAMS, CLUBS: CLUBS, MILESTONES: MILESTONES,
    COLORS: COLORS, STORAGE_KEYS: STORAGE_KEYS, DEFAULT_SETTINGS: DEFAULT_SETTINGS, LIMITS: LIMITS,
    PLAUSIBLE_MAX: PLAUSIBLE_MAX, PLAUSIBLE_MIN: PLAUSIBLE_MIN, NEXT_WEEKS: NEXT_WEEKS,
    VIEW_SPECS: VIEW_SPECS, ALL_VIEW_KEYS: ALL_VIEW_KEYS, ROTATE_CHOICES: ROTATE_CHOICES, ROSTER_SORTS: ROSTER_SORTS,
    KEYPAD: KEYPAD, NUMPAD: NUMPAD, WORKING_PCTS: WORKING_PCTS, ROSTER_RAW: ROSTER_RAW,

    hash: hash, num: num, fmt: fmt, todayIso: todayIso, dateLong: dateLong, dateShort: dateShort, timeShort: timeShort,
    daysTo: daysTo, agoLabel: agoLabel, cycleLabel: cycleLabel, initials: initials, clubLabel: clubLabel,
    addWeeks: addWeeks, suggestNext: suggestNext, nextNeedsUpdate: nextNeedsUpdate, crewKey: crewKey, parseCrew: parseCrew,
    progColor: progColor, program: program, lift: lift, liftColorFor: liftColorFor, clone: clone, newRow: newRow,
    sameName: sameName, findByName: findByName, digitsOnly: digitsOnly, clampRotate: clampRotate, unlockValid: unlockValid,

    seedData: seedData, filled: filled, normaliseData: normaliseData, normaliseSettings: normaliseSettings,
    buildMembers: buildMembers, hasNumbers: hasNumbers, liftValue: liftValue, totalGain: totalGain,
    clubsPresent: clubsPresent, countIn: countIn, scopeMembers: scopeMembers,
    buildViews: buildViews, viewMatches: viewMatches, navIndex: navIndex,
    viewSpec: viewSpec, enabledViews: enabledViews, viewEnabled: viewEnabled, toggleView: toggleView, effectiveRotate: effectiveRotate,

    leaderboard: leaderboard, rankLabel: rankLabel, movers: movers, pbs: pbs, milestones: milestones, roster: roster,
    crewStandings: crewStandings, topGainers: topGainers, sortMembers: sortMembers,
    sparkPoints: sparkPoints, workingWeights: workingWeights, memberLifts: memberLifts, memberSummary: memberSummary,

    lev: lev, looksSame: looksSame, findDuplicates: findDuplicates, mergeRows: mergeRows,
    setField: setField, setMeta: setMeta, addMember: addMember, removeMember: removeMember, recordScore: recordScore,
    parseBulkNames: parseBulkNames, planBulkAdd: planBulkAdd, bulkSummary: bulkSummary, addMembers: addMembers,
    rollForward: rollForward, applyImport: applyImport, snapshotHistory: snapshotHistory,

    parseCsv: parseCsv, parseSheet: parseSheet, parseSheetLinks: parseSheetLinks, mergeSheetResults: mergeSheetResults, syncMessage: syncMessage,

    buildQueue: buildQueue, isHandled: isHandled, sessionRemaining: sessionRemaining, sessionQueue: sessionQueue,
    skipRemaining: skipRemaining, outstandingCount: outstandingCount,
    padKey: padKey, padAdd: padAdd, queueMatches: queueMatches, canAddName: canAddName,
    sessionContext: sessionContext, sessionProgress: sessionProgress,
    draftsFilled: draftsFilled, checkEntry: checkEntry, checkEntries: checkEntries,
    pingBody: pingBody, saveBody: saveBody, parseApiReply: parseApiReply, saveDestination: saveDestination,
    codeStep: codeStep, keyLabel: keyLabel, outboxAdd: outboxAdd, outboxRemove: outboxRemove
  };
});
