// Unit tests for the 5RM Board logic (dist/5rm/board-core.js). Run with `npm test`.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const K = require('../dist/5rm/board-core.js');

const row = (name, sq, bp, dl, extra) => Object.assign(
  { name, club: 'mens', prog: 'g1', sq: { c: sq[0] ?? '', p: sq[1] ?? '' }, bp: { c: bp[0] ?? '', p: bp[1] ?? '' }, dl: { c: dl[0] ?? '', p: dl[1] ?? '' }, h: [] },
  extra || {}
);

describe('numbers and formatting', () => {
  test('num accepts positive numbers only', () => {
    assert.equal(K.num('125'), 125);
    assert.equal(K.num(' 62.5 '), 62.5);
    assert.equal(K.num(''), null);
    assert.equal(K.num('0'), null);
    assert.equal(K.num('abc'), null);
  });

  test('fmt strips trailing zeros and uses an em-dash for nothing', () => {
    assert.equal(K.fmt(125), '125');
    assert.equal(K.fmt(62.5), '62.5');
    assert.equal(K.fmt(118.75), '118.75');
    assert.equal(K.fmt(1 / 3), '0.33');
    assert.equal(K.fmt(null), '—');
  });

  test('todayIso uses the local calendar date', () => {
    assert.equal(K.todayIso(new Date(2026, 8, 9, 23, 30)), '2026-09-09');
  });

  test('daysTo counts whole days from local midnight', () => {
    const now = new Date(2026, 8, 9, 15, 0);
    assert.equal(K.daysTo('2026-09-18', now), 9);
    assert.equal(K.daysTo('2026-09-09', now), 0);
    assert.equal(K.daysTo('', now), null);
    assert.equal(K.daysTo('not a date', now), null);
  });

  test('agoLabel', () => {
    const now = 1_000_000_000;
    assert.equal(K.agoLabel(0, now), 'autosave on');
    assert.equal(K.agoLabel(now - 2000, now), 'Saved just now');
    assert.equal(K.agoLabel(now - 30_000, now), 'Saved 30 seconds ago');
    assert.equal(K.agoLabel(now - 60_000, now), 'Saved 1 minute ago');
    assert.equal(K.agoLabel(now - 5 * 60_000, now), 'Saved 5 minutes ago');
    assert.equal(K.agoLabel(now - 2 * 3_600_000, now), 'Saved 2 hours ago');
  });

  test('cycleLabel builds the header eyebrow', () => {
    const now = new Date(2026, 8, 9);
    assert.match(K.cycleLabel({ tested: '2026-09-07', next: '2026-09-18' }, now), /^Tested Monday,? 7 September  ·  Next test in 9 days$/);
    assert.equal(K.cycleLabel({ next: '2026-09-10' }, now), 'Next test in 1 day');
    assert.equal(K.cycleLabel({ next: '2026-09-09' }, now), 'Testing now');
    assert.match(K.cycleLabel({ next: '2026-12-01' }, now), /^Next test 1 Dec\.? ?2026$/, 'a far-off date drops the weekday so the TV header stays on one line');
    assert.equal(K.cycleLabel({}, now), '', 'no coach instruction on a members\u2019 screen');
    assert.equal(K.cycleLabel({}, now, 'Custom'), 'Custom');
  });

  test('initials', () => {
    assert.equal(K.initials('Keith Gray'), 'KG');
    assert.equal(K.initials('Hannah'), 'H');
    assert.equal(K.initials('Paul Den Ronden'), 'PD');
  });

  test('digitsOnly and clampRotate', () => {
    assert.equal(K.digitsOnly('19a84-'), '1984');
    assert.equal(K.digitsOnly('123456789'), '12345678');
    assert.equal(K.clampRotate('20'), 20);
    assert.equal(K.clampRotate('2'), 6);
    assert.equal(K.clampRotate('99'), 40);
    assert.equal(K.clampRotate('x'), 14);
  });

  test('unlockValid lasts 30 days', () => {
    const now = Date.now();
    assert.equal(K.unlockValid(String(now - 86400000), now), true);
    assert.equal(K.unlockValid(String(now - 31 * 86400000), now), false);
    assert.equal(K.unlockValid('', now), false);
  });
});

describe('seed data', () => {
  test('production seed has real current numbers and no invented history', () => {
    const d = K.seedData();
    assert.equal(d.length, 95);
    const keith = d.find(r => r.name === 'Keith Gray');
    assert.deepEqual(keith.sq, { c: '160', p: '' });
    assert.deepEqual(keith.bp, { c: '120', p: '' });
    assert.deepEqual(keith.dl, { c: '170', p: '' });
    assert.deepEqual(keith.h, []);
    assert.ok(d.every(r => r.club === 'mens' && r.prog === 'g1'));
    assert.ok(d.every(r => !r.sq.p && !r.bp.p && !r.dl.p));
    const hannah = d.find(r => r.name === 'Hannah');
    assert.deepEqual(hannah.sq, { c: '', p: '' });
    assert.equal(hannah.dl.c, '200');
  });

  test('placeholder seed is deterministic and produces previous values', () => {
    const a = K.seedData({ placeholder: true });
    const b = K.seedData({ placeholder: true });
    assert.deepEqual(a, b);
    assert.ok(a.some(r => r.sq.p), 'some previous squat values');
    assert.ok(a.some(r => r.prog !== 'g1'), 'crews spread across timeslots');
    assert.ok(a.filter(r => r.h.length).length > 0);
  });
});

describe('normalise', () => {
  test('normaliseData drops empty "New member" rows and back-fills history', () => {
    const out = K.normaliseData([
      row('Keith Gray', ['160', '150'], ['120', ''], ['170', '160']),
      row('New member', [], [], []),
      { name: 'Bare', sq: { c: '90', p: '' } }
    ]);
    assert.equal(out.length, 2);
    assert.deepEqual(out[0].h, [{ d: 'Last round', sq: '150', dl: '160' }]);
    assert.deepEqual(out[1].bp, { c: '', p: '' });
    assert.deepEqual(out[1].h, []);
    assert.equal(K.normaliseData([]), null);
    assert.equal(K.normaliseData('junk'), null);
  });

  test('normaliseSettings applies defaults', () => {
    assert.deepEqual(K.normaliseSettings(null), K.DEFAULT_SETTINGS);
    const s = K.normaliseSettings({ pin: '1984', norotate: 1, viewPin: '' });
    assert.equal(s.pin, '1984');
    assert.equal(s.norotate, true);
    assert.equal(s.viewPin, '');
    assert.equal(K.normaliseSettings({}).viewPin, '4500');
  });
});

describe('members', () => {
  const data = [
    row('Zed Last', ['100', '90'], ['60', '60'], ['120', ''], { prog: 'g2' }),
    row('Amy First', ['', ''], ['', ''], ['', '']),
    row('Bob Mid', ['150', '140'], ['', ''], ['200', '190'], { club: 'womens' })
  ];
  const members = K.buildMembers(data);

  test('sorted by name with gains, percentages and totals', () => {
    assert.deepEqual(members.map(m => m.name), ['Amy First', 'Bob Mid', 'Zed Last']);
    const zed = members[2];
    assert.equal(zed.idx, 0);
    assert.equal(zed.lifts.sq.gain, 10);
    assert.ok(Math.abs(zed.lifts.sq.pct - 11.11) < 0.01);
    assert.equal(zed.lifts.bp.gain, 0);
    assert.equal(zed.lifts.dl.prev, null);
    assert.equal(zed.lifts.dl.gain, null);
    assert.equal(zed.total, 280);
    assert.equal(members[1].total, null, 'bench missing → no total');
    assert.equal(members[0].lifts.sq, null);
  });

  test('scopeMembers filters by club, crew and having any number', () => {
    assert.deepEqual(K.scopeMembers(members, null, 'all').map(m => m.name), ['Bob Mid', 'Zed Last']);
    assert.deepEqual(K.scopeMembers(members, 'womens', 'all').map(m => m.name), ['Bob Mid']);
    assert.deepEqual(K.scopeMembers(members, null, 'g2').map(m => m.name), ['Zed Last']);
    assert.deepEqual(K.scopeMembers(members, 'mens', 'g1'), []);
  });

  test('clubsPresent and countIn', () => {
    assert.deepEqual(K.clubsPresent(data), ['mens', 'womens']);
    assert.deepEqual(K.clubsPresent([row('A', [], [], [])]), ['mens']);
    assert.equal(K.countIn(data, 'mens', 'all'), 2);
    assert.equal(K.countIn(data, 'mens', 'g2'), 1);
  });

  test('totalGain', () => {
    assert.deepEqual(K.totalGain(members[2]), { any: true, gain: 10 });
    assert.deepEqual(K.totalGain(members[0]), { any: false, gain: 0 });
  });
});

describe('views', () => {
  test('one club: every view in order, roster pages from the live count', () => {
    const data = [];
    for (let i = 0; i < 95; i++) data.push(row('M' + String(i).padStart(3, '0'), ['100'], [], []));
    const v = K.buildViews(data, 'all', 'all');
    assert.deepEqual(v.map(x => x.key), ['total', 'sq', 'bp', 'dl', 'movers', 'gains', 'pbs', 'miles', 'crews', 'roster', 'roster', 'roster']);
    assert.deepEqual(v.slice(0, 4).map(x => x.lift), ['total', 'sq', 'bp', 'dl']);
    assert.deepEqual(v.slice(9).map(x => x.page), [0, 1, 2]);
    assert.ok(v.slice(9).every(x => x.club === 'mens'));
  });

  test('two clubs double the boards and roster; a crew filter shrinks the roster', () => {
    const data = [row('A B', ['100'], [], []), row('C D', ['100'], [], [], { club: 'womens' })];
    const v = K.buildViews(data, 'all', 'all');
    assert.equal(v.filter(x => x.kind === 'board').length, 8);
    assert.equal(v.filter(x => x.kind === 'roster').length, 2);
    const one = K.buildViews(data, 'womens', 'all');
    assert.equal(one.filter(x => x.kind === 'board').length, 4);
    assert.equal(one[0].club, 'womens');
    assert.equal(K.buildViews(data, 'all', 'g7').filter(x => x.kind === 'roster').length, 2, 'at least one page per club');
  });

  test('navIndex finds the first matching view', () => {
    const v = K.buildViews([row('A B', ['100'], [], [])], 'all', 'all');
    assert.equal(K.navIndex(v, K.viewSpec('total')), 0);
    assert.equal(K.navIndex(v, K.viewSpec('dl')), 3);
    assert.equal(K.navIndex(v, K.viewSpec('roster')), 9);
    assert.equal(K.navIndex([], K.viewSpec('roster')), 0);
  });
});

describe('leaderboard, movers, PBs, milestones, roster', () => {
  const data = [
    row('Keith Gray', ['160', '150'], ['120', '120'], ['170', '160']),
    row('Steve Otto', ['160', '150'], ['115', '100'], ['210', '200']),
    row('Todd Comrie', ['45', ''], ['45', ''], ['75', '']),
    row('Ben Child', ['90', '80'], ['60', ''], ['95', '95']),
    row('Hannah', [], [], ['200', '190'])
  ];
  const members = K.buildMembers(data);
  const filtered = K.scopeMembers(members, null, 'all');

  test('total board ranks by big-three total, ties keep stable order, meta reflects gains', () => {
    const lb = K.leaderboard(filtered, 'total');
    assert.equal(lb.isTotal, true);
    assert.deepEqual(lb.rows.map(r => r.m.name), ['Steve Otto', 'Keith Gray', 'Ben Child', 'Todd Comrie']);
    assert.deepEqual(lb.rows.map(r => r.val), [485, 450, 245, 165]);
    assert.equal(lb.rows[0].meta, '▲ 35 kg on last test');
    assert.equal(lb.rows[0].improved, true);
    assert.equal(lb.rows[3].meta, 'First test');
    assert.equal(lb.rows[3].improved, false);
    assert.equal(lb.testedCount, 4);
  });

  test('single lift board', () => {
    const lb = K.leaderboard(filtered, 'dl');
    assert.deepEqual(lb.rows.map(r => r.m.name), ['Steve Otto', 'Hannah', 'Keith Gray', 'Ben Child', 'Todd Comrie']);
    assert.equal(lb.rows[3].meta, 'Held from last test');
    assert.equal(lb.testedCount, 5);
    assert.deepEqual(lb.rows.map(r => K.rankLabel(r.rank)), ['🥇', '🥈', '🥉', '4', '5']);
  });

  test('leaderboard caps at 16 rows', () => {
    const many = [];
    for (let i = 0; i < 30; i++) many.push(row('M' + i, [String(100 + i)], [], []));
    assert.equal(K.leaderboard(K.buildMembers(many), 'sq').rows.length, 16);
  });

  test('movers rank by percentage gain on a single lift', () => {
    const mv = K.movers(filtered);
    assert.equal(mv[0].m.name, 'Steve Otto');
    assert.equal(mv[0].lift.key, 'bp');
    assert.equal(mv[0].pctLabel, '+15.0%');
    assert.equal(mv[0].gainLabel, '+15 kg added');
    assert.equal(mv[0].barPct, 100);
    assert.equal(mv[1].m.name, 'Ben Child');
    assert.equal(mv[1].pctLabel, '+12.5%');
    assert.ok(mv[1].barPct < 100 && mv[1].barPct > 0);
    assert.ok(mv.every(x => x.pct > 0));
  });

  test('PBs list every lift that went up, biggest first', () => {
    const p = K.pbs(filtered);
    assert.equal(p.count, 7);
    assert.equal(p.sub, 'Every lift that went up');
    assert.equal(p.items[0].m.name, 'Steve Otto');
    assert.equal(p.items[0].gainLabel, '+15 kg');
  });

  test('PB subtitle when more than 48', () => {
    const many = [];
    for (let i = 0; i < 60; i++) many.push(row('M' + i, ['100', '90'], [], []));
    const p = K.pbs(K.buildMembers(many));
    assert.equal(p.count, 60);
    assert.equal(p.sub, 'Biggest 48 of 60 this round');
    assert.equal(p.items.length, 48);
  });

  test('milestone clubs with knocking-on-the-door', () => {
    const ms = K.milestones(filtered);
    assert.equal(ms.length, 6);
    const sq150 = ms[1];
    assert.equal(sq150.label, '150 kg Squat Club');
    assert.equal(sq150.countLabel, '2 members');
    assert.deepEqual(sq150.names.map(n => n.m.name), ['Keith Gray', 'Steve Otto']);
    assert.equal(sq150.near, 'Nobody within 10 kg yet');
    const bp100 = ms[2];
    assert.equal(bp100.countLabel, '2 members');
    const dl200 = ms[4];
    assert.deepEqual(dl200.names.map(n => n.m.name), ['Steve Otto', 'Hannah']);
    const big3 = ms[5];
    assert.equal(big3.color, K.COLORS.gold);
    assert.equal(big3.countLabel, '2 members');
    const sq100 = ms[0];
    assert.equal(sq100.near, 'Knocking on the door: Ben Child (10 kg away)');
  });

  test('roster pages and scroll mode', () => {
    const many = [];
    for (let i = 0; i < 95; i++) many.push(row('M' + String(i).padStart(3, '0'), ['100', i % 2 ? '90' : '100'], [], []));
    const f = K.scopeMembers(K.buildMembers(many), null, 'all');
    const p0 = K.roster(f, 0, false);
    assert.equal(p0.pages, 3);
    assert.equal(p0.rows.length, 45);
    assert.equal(p0.sub, 'Page 1 of 3 · 95 members · kilograms');
    const p2 = K.roster(f, 2, false);
    assert.equal(p2.rows.length, 5);
    const all = K.roster(f, 1, true);
    assert.equal(all.rows.length, 95);
    assert.equal(all.sub, 'All 95 members · scroll for more · kilograms');
    assert.equal(all.rows[0].cells.sq.state, 'flat');
    assert.equal(all.rows[1].cells.sq.state, 'up');
    assert.equal(all.rows[0].cells.bp.state, 'none');
    assert.equal(all.rows[0].cells.bp.text, '—');
    assert.equal(all.rows[0].total, '—');
  });
});

describe('member card', () => {
  test('sparkPoints spans the viewBox', () => {
    assert.equal(K.sparkPoints([]), '');
    assert.equal(K.sparkPoints([100]), '');
    assert.equal(K.sparkPoints([100, 110]), '0.0,30.0 100.0,4.0');
    assert.equal(K.sparkPoints([100, 100]), '0.0,30.0 100.0,30.0');
    assert.equal(K.sparkPoints([100, 105, 110]), '0.0,30.0 50.0,17.0 100.0,4.0');
  });

  test('workingWeights 95% → 50%', () => {
    const wp = K.workingWeights(100);
    assert.equal(wp.length, 10);
    assert.deepEqual(wp[0], { label: '95%', val: '95' });
    assert.deepEqual(wp[9], { label: '50%', val: '50' });
    assert.equal(K.workingWeights(62.5)[0].val, '59.38');
  });

  test('memberLifts covers PB, held, first test and untested', () => {
    const raw = row('Keith Gray', ['160', '150'], ['120', '120'], ['', ''], {
      h: [{ d: '2026-03-01', sq: '140', bp: '120' }, { d: '2026-06-01', sq: '150', bp: '120' }]
    });
    raw.sq.t = '2026-09-09';
    const m = K.buildMembers([raw])[0];
    const [sq, bp, dl] = K.memberLifts(m, raw, { tested: '2026-09-07' });
    assert.equal(sq.tested, true);
    assert.match(sq.note, /^New personal best · recorded 9 Sept? 2026$/);
    assert.equal(sq.delta, '+10 kg · +6.7%');
    assert.equal(sq.up, true);
    assert.equal(sq.prev, '150');
    assert.equal(sq.cur, '160');
    assert.equal(sq.spark, '0.0,30.0 50.0,17.0 100.0,4.0');
    assert.match(sq.journey, /^\+20 kg since 1 Mar 2026$/);
    assert.equal(sq.wp.length, 10);
    assert.match(bp.note, /^Held from last test · 7 Sept? 2026$/);
    assert.equal(bp.delta, 'No change');
    assert.equal(bp.up, false);
    assert.equal(bp.journey, '');
    assert.equal(dl.tested, false);
    assert.equal(dl.note, 'Not tested yet');
    assert.equal(dl.delta, 'Due this round');
    assert.deepEqual(dl.wp, []);
  });

  test('memberLifts baseline and "last round" wording', () => {
    const raw = row('Todd Comrie', ['45', ''], [], [], { h: [{ d: 'Last round', sq: '40' }] });
    const m = K.buildMembers([raw])[0];
    const sq = K.memberLifts(m, raw, {})[0];
    assert.equal(sq.note, 'First test');
    assert.equal(sq.delta, 'Baseline set');
    assert.equal(sq.prev, 'first test');
    assert.equal(sq.journey, '+5 kg since last round');
  });

  test('memberSummary', () => {
    const m = K.buildMembers([row('A B', ['100', '90'], ['50', '50'], ['120', '110'])])[0];
    assert.deepEqual(K.memberSummary(m), { total: '270 kg total', gain: '▲ 20 kg', sq: '100', bp: '50', dl: '120' });
    const n = K.buildMembers([row('C D', ['100', ''], [], [])])[0];
    assert.deepEqual(K.memberSummary(n), { total: 'Awaiting all 3 lifts', gain: '', sq: '100', bp: '—', dl: '—' });
  });
});

describe('duplicates and merging', () => {
  test('lev and looksSame', () => {
    assert.equal(K.lev('kitten', 'sitting'), 3);
    assert.equal(K.lev('', 'abc'), 3);
    assert.equal(K.looksSame('Keith Gray', 'keith  gray'), true);
    assert.equal(K.looksSame('Keith Gray', 'Keith Grey'), true);
    assert.equal(K.looksSame('Mick Whitney', 'Mickey Whitney'), true);
    assert.equal(K.looksSame('Mick Whitney', 'Michael Whitney'), false, 'too far apart for a fuzzy match');
    assert.equal(K.looksSame('Mark Anderson', 'Mark Altmann'), false);
    assert.equal(K.looksSame('Hannah', 'Hannah Smith'), false);
    assert.equal(K.looksSame('Mark Knight', 'Mark Morris'), false);
  });

  test('findDuplicates keeps the row with more lifts', () => {
    const data = [row('Keith Grey', ['160'], [], []), row('Other Guy', [], [], []), row('Keith Gray', ['160'], ['120'], ['170'])];
    const pairs = K.findDuplicates(data);
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].keep, 2);
    assert.equal(pairs[0].drop, 0);
    assert.equal(pairs[0].keepLifts, 3);
    assert.equal(pairs[0].dropLifts, 1);
  });

  test('mergeRows takes the higher number per lift and concatenates history', () => {
    const a = row('Keith Gray', ['150', '140'], ['', ''], ['170', ''], { h: [{ d: 'a' }] });
    const b = row('Keith Grey', ['160', ''], ['120', '110'], ['165', '160'], { h: [{ d: 'b' }] });
    const out = K.mergeRows([a, b], 0, 1);
    assert.equal(out.length, 1);
    assert.deepEqual(out[0].sq, { c: '160', p: '140' });
    assert.deepEqual(out[0].bp, { c: '120', p: '110' });
    assert.deepEqual(out[0].dl, { c: '170', p: '160' });
    assert.deepEqual(out[0].h, [{ d: 'a' }, { d: 'b' }]);
  });
});

describe('editing', () => {
  test('setField stamps the date on current values only and does not mutate', () => {
    const data = [row('A B', ['100', '90'], [], [])];
    const out = K.setField(data, 0, 'sq', 'c', '105', '2026-09-09');
    assert.deepEqual(out[0].sq, { c: '105', p: '90', t: '2026-09-09' });
    assert.deepEqual(data[0].sq, { c: '100', p: '90' });
    const out2 = K.setField(out, 0, 'sq', 'p', '95');
    assert.deepEqual(out2[0].sq, { c: '105', p: '95', t: '2026-09-09' });
    const out3 = K.setField(data, 0, 'bp', 'c', '50', '2026-09-09');
    assert.equal(out3[0].bp.c, '50');
  });

  test('setMeta, addMember, removeMember', () => {
    const data = [row('A B', [], [], [])];
    assert.equal(K.setMeta(data, 0, 'prog', 'g3')[0].prog, 'g3');
    assert.equal(data[0].prog, 'g1');
    const added = K.addMember(data, '  Jane Smith ', 'womens');
    assert.equal(added.length, 2);
    assert.deepEqual(added[1], { name: 'Jane Smith', club: 'womens', prog: 'g1', sq: { c: '', p: '' }, bp: { c: '', p: '' }, dl: { c: '', p: '' }, h: [] });
    assert.equal(K.addMember(data, '   ').length, 1);
    assert.equal(K.removeMember(added, 0)[0].name, 'Jane Smith');
  });

  test('recordScore moves the old number into previous', () => {
    const data = [row('A B', ['120', '110'], [], [])];
    const out = K.recordScore(data, 0, 'sq', '125', '2026-09-09');
    assert.deepEqual(out[0].sq, { c: '125', p: '110', t: '2026-09-09' });
    const fresh = K.recordScore([row('C D', [], [], [])], 0, 'bp', '60', '2026-09-09');
    assert.deepEqual(fresh[0].bp, { c: '60', p: '', t: '2026-09-09' });
    const noPrev = K.recordScore([row('E F', ['100', ''], [], [])], 0, 'sq', '105', '2026-09-09');
    assert.deepEqual(noPrev[0].sq, { c: '105', p: '100', t: '2026-09-09' });
  });

  test('rollForward archives the round and copies current into previous', () => {
    const data = [row('A B', ['120', '110'], ['', ''], ['150', '140'], { h: [{ d: '2026-06-01', sq: '110' }] })];
    const out = K.rollForward(data, '2026-09-07');
    assert.deepEqual(out[0].sq, { c: '120', p: '120' });
    assert.deepEqual(out[0].bp, { c: '', p: '' });
    assert.deepEqual(out[0].h, [{ d: '2026-06-01', sq: '110' }, { d: '2026-09-07', sq: '120', dl: '150' }]);
    const again = K.rollForward(out, '2026-09-07');
    assert.equal(again[0].h.length, 2, 'same stamp replaces rather than duplicates');
    const empty = K.rollForward([row('C D', [], [], [])], '2026-09-07');
    assert.deepEqual(empty[0].h, []);
  });

  test('applyImport parses pasted lines, updates existing and adds new', () => {
    const data = [row('Aaron Zimpel', ['120', '110'], ['70', ''], ['120', ''])];
    const out = K.applyImport(data, 'Name, Squat, Bench, Deadlift\nAaron Zimpel, 125, , 125, 120\nJane Smith\t80\t40\t100\t75\t35\t95\n');
    assert.equal(out.length, 2);
    assert.deepEqual(out[0].sq, { c: '125', p: '120' });
    assert.deepEqual(out[0].bp, { c: '70', p: '' }, 'blank cells keep the old number');
    assert.deepEqual(out[1].sq, { c: '80', p: '75' });
    assert.deepEqual(out[1].dl, { c: '100', p: '95' });
    assert.equal(out[1].club, 'mens');
    assert.deepEqual(out[1].h, []);
    assert.equal(K.applyImport(data, '   '), null);
  });

  test('applyImport accepts a JSON backup', () => {
    const data = [row('Aaron Zimpel', ['120'], [], [])];
    const backup = JSON.stringify([{ name: 'Aaron Zimpel', prog: 'g4', sq: { c: '130', p: '120' } }, { name: 'New Person', sq: { c: '50', p: '' } }]);
    const out = K.applyImport(data, backup);
    assert.equal(out[0].prog, 'g4');
    assert.deepEqual(out[0].sq, { c: '130', p: '120' });
    assert.equal(out[1].name, 'New Person');
    assert.deepEqual(out[1].bp, { c: '', p: '' });
  });

  test('snapshotHistory keeps at most one snapshot per 10 minutes and 10 total', () => {
    const t = 10_000_000;
    let hist = [];
    let r = K.snapshotHistory(hist, ['a'], t);
    assert.equal(r.added, true);
    r = K.snapshotHistory(r.hist, ['b'], t + 60_000);
    assert.equal(r.added, false);
    assert.equal(r.hist.length, 1);
    for (let i = 1; i <= 12; i++) r = K.snapshotHistory(r.hist, ['x' + i], t + i * 700_000);
    assert.equal(r.hist.length, 10);
    assert.deepEqual(r.hist[0].data, ['x12']);
  });
});

describe('Google Sheet CSV', () => {
  test('parseCsv handles quotes, escaped quotes and CRLF', () => {
    assert.deepEqual(K.parseCsv('a,b\r\n"c, d","e ""f"""\n'), [['a', 'b'], ['c, d', 'e "f"'], ['']]);
  });

  test('parseSheet reads a multi-lift tab with title rows and previous columns', () => {
    const csv = [
      'Men\'s Club 5RM,,,,,,',
      ',,,,,,',
      'Name,Squat 5RM,Bench 5RM,Deadlift 5RM,Previous Squat,Previous Bench,Previous Deadlift,% improvement',
      'Keith Gray,160,120,170,150,,160,6%',
      ',,,,,,',
      'Hannah,,,200,,,190,',
      'Nobody,,,,,,,'
    ].join('\n');
    const out = K.parseSheet(csv);
    assert.deepEqual(out, [
      { name: 'Keith Gray', sq: { c: '160', p: '150' }, bp: { c: '120', p: '' }, dl: { c: '170', p: '160' } },
      { name: 'Hannah', dl: { c: '200', p: '190' } }
    ]);
  });

  test('parseSheet reads a single-lift tab using the title row or a link hint', () => {
    const csv = 'Squat 5RM,,\nName,5 RM,Previous 5RM\nKeith Gray,160,150\nBen Child,90,\n';
    assert.deepEqual(K.parseSheet(csv), [
      { name: 'Keith Gray', sq: { c: '160', p: '150' } },
      { name: 'Ben Child', sq: { c: '90', p: '' } }
    ]);
    const bare = 'Name,5RM,Previous 5RM\nKeith Gray,120,110\n';
    assert.equal(K.parseSheet(bare), null, 'no way to tell the lift');
    assert.deepEqual(K.parseSheet(bare, 'bp'), [{ name: 'Keith Gray', bp: { c: '120', p: '110' } }]);
    const noRm = 'Name,Number\nKeith Gray,170\n';
    assert.deepEqual(K.parseSheet(noRm, 'dl'), [{ name: 'Keith Gray', dl: { c: '170', p: '' } }], 'falls back to the column after Name');
  });

  test('parseSheet returns null without a Name header', () => {
    assert.equal(K.parseSheet('foo,bar\n1,2'), null);
  });

  test('parseSheetLinks accepts plain and prefixed links', () => {
    const links = K.parseSheetLinks('https://a.example/x?output=csv\nsquat=https://b.example/y, dl=https://c.example/z junk');
    assert.deepEqual(links, [
      { url: 'https://a.example/x?output=csv', lift: null },
      { url: 'https://b.example/y', lift: 'sq' },
      { url: 'https://c.example/z', lift: 'dl' }
    ]);
    assert.deepEqual(K.parseSheetLinks(''), []);
  });

  test('mergeSheetResults updates by name and appends unknown names', () => {
    const data = [row('Keith Gray', ['150', '140'], ['120', ''], ['', ''])];
    data[0].sq.t = '2026-09-01';
    const r = K.mergeSheetResults(data, [
      [{ name: 'keith gray', sq: { c: '160', p: '' }, dl: { c: '170', p: '160' } }, { name: 'Jane Smith', bp: { c: '40', p: '' } }],
      null
    ], 'mens');
    assert.equal(r.updated, 1);
    assert.equal(r.added, 1);
    assert.equal(r.failed, 1);
    assert.deepEqual(r.data[0].sq, { c: '160', p: '140', t: '2026-09-01' }, 'blank previous keeps the old one, date kept');
    assert.deepEqual(r.data[0].dl, { c: '170', p: '160' });
    assert.equal(r.data[1].name, 'Jane Smith');
    assert.deepEqual(r.data[1].bp, { c: '40', p: '' });
    assert.deepEqual(r.data[1].sq, { c: '', p: '' });
    assert.equal(data[0].sq.c, '150', 'input untouched');
  });

  test('syncMessage', () => {
    assert.equal(K.syncMessage({ updated: 0, added: 0, failed: 2 }, 2), 'Could not reach the sheet. Check the link is a published CSV.');
    assert.match(K.syncMessage({ updated: 90, added: 2, failed: 1 }, 3, new Date(2026, 8, 9, 6, 5)), /^Synced 90 members, added 2 · 1 link\(s\) failed · 6:05 am$/i);
  });
});

describe('testing session', () => {
  test('buildQueue sorts by name and filters by club', () => {
    const data = [row('Zed', [], [], []), row('Amy', [], [], [], { club: 'womens' }), row('Bob', [], [], [])];
    assert.deepEqual(K.buildQueue(data, 'all').map(x => x.name), ['Amy', 'Bob', 'Zed']);
    assert.deepEqual(K.buildQueue(data, 'mens').map(x => x.i), [2, 0]);
  });

  test('padKey', () => {
    assert.equal(K.padKey('', '1'), '1');
    assert.equal(K.padKey('12', '.'), '12.');
    assert.equal(K.padKey('12.', '.'), '12.');
    assert.equal(K.padKey('', '.'), '', 'no leading dot');
    assert.equal(K.padKey('12.5', 'del'), '12.');
    assert.equal(K.padKey('123456', '7'), '123456', 'max 6 characters');
  });

  test('padAdd builds on the draft, then the current number', () => {
    assert.equal(K.padAdd('', '120', 2.5), '122.5');
    assert.equal(K.padAdd('100', '120', 5), '105');
    assert.equal(K.padAdd('', '', 10), '10');
  });

  test('queueMatches and canAddName', () => {
    const q = K.buildQueue([row('Keith Gray', [], [], []), row('Keith Grey', [], [], []), row('Hannah', [], [], [])], 'all');
    assert.deepEqual(K.queueMatches(q, 'kei').map(x => x.name), ['Keith Gray', 'Keith Grey']);
    assert.equal(K.queueMatches(q, '').length, 3);
    assert.equal(K.canAddName(q, 'Ke'), false, 'too short');
    assert.equal(K.canAddName(q, 'Keith'), false, 'matches existing');
    assert.equal(K.canAddName(q, 'Keith Grai'), false, 'looks like an existing member');
    assert.equal(K.canAddName(q, 'Jane Smith'), true);
  });

  test('sessionContext and sessionProgress', () => {
    assert.equal(K.sessionContext({ c: '125', p: '120' }), 'Current on the board: 125 kg');
    assert.equal(K.sessionContext({ c: '', p: '120' }), 'Last test: 120 kg');
    assert.equal(K.sessionContext({ c: '', p: '' }), 'No previous number');
    assert.equal(K.sessionContext(undefined), 'No previous number');
    assert.deepEqual(K.sessionProgress(11, 95, 8), { label: '12 of 95 · 8 entered', pct: 8 / 95 * 100 });
    assert.equal(K.sessionProgress(0, 0, 0).pct, 0);
  });
});

describe('keypad codes and outbox', () => {
  test('codeStep unlocks on the exact code and errors once long enough', () => {
    let r = K.codeStep('', '4', '4500', 'Not quite — try again');
    assert.deepEqual(r, { draft: '4', ok: false, err: '' });
    r = K.codeStep('450', '1', '4500', 'Not quite — try again');
    assert.deepEqual(r, { draft: '4501', ok: false, err: 'Not quite — try again' });
    r = K.codeStep('4501', 'del', '4500', 'x');
    assert.deepEqual(r, { draft: '450', ok: false, err: '' });
    r = K.codeStep('450', '0', '4500', 'x');
    assert.deepEqual(r, { draft: '', ok: true, err: '' });
    assert.equal(K.codeStep('12345678', '9', '4500', 'x').draft, '12345678', 'max 8 digits');
  });

  test('keypad layouts', () => {
    assert.deepEqual(K.KEYPAD, ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0']);
    assert.deepEqual(K.NUMPAD, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del']);
    assert.equal(K.keyLabel('del'), '⌫');
    assert.equal(K.keyLabel('7'), '7');
  });

  test('outbox keeps one pending write per member', () => {
    let list = K.outboxAdd([], { name: 'Keith Gray', sq: { c: '160' } });
    list = K.outboxAdd(list, { name: 'Hannah', dl: { c: '200' } });
    list = K.outboxAdd(list, { name: 'keith gray', sq: { c: '165' } });
    assert.equal(list.length, 2);
    assert.equal(list[1].name, 'keith gray');
    assert.equal(list[1].sq.c, '165');
    assert.deepEqual(K.outboxRemove(list, 'KEITH GRAY').map(x => x.name), ['Hannah']);
  });
});

describe('testing dates', () => {
  test('addWeeks shifts whole weeks and rolls over months and years', () => {
    assert.equal(K.addWeeks('2026-09-07', 12), '2026-11-30');
    assert.equal(K.addWeeks('2026-12-28', 1), '2027-01-04');
    assert.equal(K.addWeeks('2026-09-07', 0), '2026-09-07');
    assert.equal(K.addWeeks('', 1, new Date(2026, 8, 9)), '2026-09-16', 'falls back to today');
  });

  test('suggestNext offers a round gap after the round just tested', () => {
    assert.equal(K.NEXT_WEEKS, 12);
    assert.equal(K.suggestNext('2026-09-07'), '2026-11-30');
    assert.equal(K.suggestNext('2026-09-07', 8), '2026-11-02');
    assert.equal(K.suggestNext('', 12, new Date(2026, 8, 9)), '2026-12-02');
  });

  test('nextNeedsUpdate spots a missing or stale next-test date', () => {
    const now = new Date(2026, 8, 9);
    assert.equal(K.nextNeedsUpdate({}, now), true);
    assert.equal(K.nextNeedsUpdate({ next: '2026-09-01' }, now), true, 'already past');
    assert.equal(K.nextNeedsUpdate({ next: '2026-09-09' }, now), false, 'today still counts');
    assert.equal(K.nextNeedsUpdate({ next: '2026-09-18' }, now), false);
  });
});

describe('crew labels', () => {
  test('parseCrew accepts the ways a coach would write a timeslot', () => {
    assert.equal(K.parseCrew('5:40 AM'), 'g2');
    assert.equal(K.parseCrew('540am'), 'g2');
    assert.equal(K.parseCrew('5.40 am'), 'g2');
    assert.equal(K.parseCrew('6:30 PM crew'), 'g7');
    assert.equal(K.parseCrew('g3'), 'g3');
    assert.equal(K.parseCrew('4:00 PM'), 'g4');
  });

  test('parseCrew rejects anything ambiguous', () => {
    assert.equal(K.parseCrew('125'), null, 'a weight is not a crew');
    assert.equal(K.parseCrew('540'), null, 'no am/pm is ambiguous');
    assert.equal(K.parseCrew(''), null);
    assert.equal(K.parseCrew('Keith Gray'), null);
    assert.equal(K.crewKey('4:50 AM'), '450am');
  });
});

describe('import with crews', () => {
  test('a name and a crew alone assigns the crew and leaves numbers alone', () => {
    const data = [row('Keith Gray', ['160', '150'], ['120', ''], ['170', ''])];
    const out = K.applyImport(data, 'Keith Gray, 5:40 AM\nKeith Grey Unknown, 6:30 PM\n');
    assert.equal(out[0].prog, 'g2');
    assert.deepEqual(out[0].sq, { c: '160', p: '150' }, 'numbers untouched');
    assert.equal(out[1].name, 'Keith Grey Unknown');
    assert.equal(out[1].prog, 'g7', 'a new name still lands in its crew');
  });

  test('a crew is picked up from any column, before or after the lifts', () => {
    const data = [];
    const out = K.applyImport(data, 'Ann Ant, 6:30 PM, 100, 60, 120\nBob Bee, 100, 60, 120, 4:00 PM\n');
    assert.equal(out[0].prog, 'g7');
    assert.deepEqual(out[0].sq, { c: '100', p: '' });
    assert.deepEqual(out[0].dl, { c: '120', p: '' });
    assert.equal(out[1].prog, 'g4');
    assert.deepEqual(out[1].bp, { c: '60', p: '' });
  });

  test('rows without a crew keep the default, and new rows take the given club', () => {
    const out = K.applyImport([], 'Jane Doe, 50, 40, 60', 'womens');
    assert.equal(out[0].prog, 'g1');
    assert.equal(out[0].club, 'womens');
    assert.equal(K.applyImport([], 'John Doe, 50')[0].club, 'mens');
  });
});

describe('session queue', () => {
  const sdata = [
    row('Zed', ['100'], [], [], { prog: 'g2' }),
    row('Amy', ['100'], [], [], { prog: 'g1' }),
    row('Bob', ['100'], [], [], { prog: 'g2' })
  ];

  test('buildQueue filters by crew as well as club', () => {
    assert.deepEqual(K.buildQueue(sdata, 'all', 'all').map(x => x.name), ['Amy', 'Bob', 'Zed']);
    assert.deepEqual(K.buildQueue(sdata, 'all', 'g2').map(x => x.name), ['Bob', 'Zed']);
    assert.deepEqual(K.buildQueue(sdata, 'all', 'g5'), []);
    assert.deepEqual(K.buildQueue(sdata, 'all').map(x => x.name), ['Amy', 'Bob', 'Zed'], 'crew is optional');
    assert.equal(K.buildQueue(sdata, 'all', 'g2')[0].prog, 'g2');
  });

  test('isHandled counts entered and skipped, not untouched', () => {
    assert.equal(K.isHandled({ 2: 'done' }, 2), true);
    assert.equal(K.isHandled({ 2: 'skip' }, 2), true);
    assert.equal(K.isHandled({ 2: 'done' }, 0), false);
    assert.equal(K.isHandled(undefined, 0), false);
  });

  test('remaining-only drops everyone already handled', () => {
    const q = K.buildQueue(sdata, 'all', 'all');
    assert.deepEqual(K.sessionRemaining(q, { 1: 'done', 2: 'skip' }).map(x => x.name), ['Zed']);
    assert.deepEqual(K.sessionRemaining(q, {}).map(x => x.name), ['Amy', 'Bob', 'Zed']);
    assert.deepEqual(K.sessionQueue(sdata, 'all', 'g2', { 2: 'done' }, true).map(x => x.name), ['Zed']);
    assert.deepEqual(K.sessionQueue(sdata, 'all', 'g2', { 2: 'done' }, false).map(x => x.name), ['Bob', 'Zed']);
    assert.deepEqual(K.sessionQueue(sdata, 'all', 'all', { 0: 'done', 1: 'done', 2: 'done' }, true), []);
  });

  test('sessionProgress reads differently when showing only what is left', () => {
    assert.deepEqual(K.sessionProgress(11, 95, 8), { label: '12 of 95 · 8 entered', pct: 8 / 95 * 100 });
    assert.deepEqual(K.sessionProgress(0, 7, 8, 95, true), { label: '7 still to do · 8 entered', pct: 8 / 95 * 100 });
    assert.equal(K.sessionProgress(0, 1, 9, 95, true).label, '1 still to do · 9 entered');
    assert.equal(K.sessionProgress(0, 12, 0, 12, false).label, '1 of 12 · 0 entered');
  });

  test('sessionProgress counts skipped members separately from entered ones', () => {
    const p = K.sessionProgress(0, 12, { done: 2, skip: 10 }, 12, false);
    assert.equal(p.label, '1 of 12 · 2 entered · 10 not testing');
    assert.equal(p.pct, 100, 'the bar is full once everyone is handled');
    assert.equal(K.sessionProgress(0, 12, { done: 2, skip: 0 }, 12, false).label, '1 of 12 · 2 entered');
    assert.equal(K.sessionProgress(0, 0, { done: 2, skip: 10 }, 12, true).label, '0 still to do · 2 entered · 10 not testing');
    assert.equal(K.sessionProgress(0, 12, {}, 12, false).label, '1 of 12 · 0 entered');
  });
});

describe('entry plausibility', () => {
  test('a mistyped decimal is caught and the likely number offered', () => {
    const r = K.checkEntry('1275', { c: '127.5' }, 'sq');
    assert.equal(r.kind, 'high');
    assert.equal(r.suggestion, '127.5');
    assert.match(r.message, /heavier than any squat 5RM/);
    assert.equal(K.checkEntry('400', {}, 'dl').suggestion, '40');
    assert.equal(K.checkEntry('500', {}, 'bp').kind, 'high', 'bench has a lower ceiling');
    assert.equal(K.checkEntry('300', {}, 'sq'), null, 'the ceiling itself is allowed');
  });

  test('big jumps and drops against their last number', () => {
    assert.equal(K.checkEntry('160', { c: '80' }, 'sq').kind, 'jump');
    assert.equal(K.checkEntry('40', { c: '120' }, 'sq').kind, 'drop');
    assert.equal(K.checkEntry('120', { c: '80' }, 'sq'), null, 'exactly half again is fine');
    assert.equal(K.checkEntry('130', { c: '125' }, 'sq'), null);
    assert.equal(K.checkEntry('130', { c: '', p: '125' }, 'sq'), null, 'falls back to the previous round');
    assert.equal(K.checkEntry('200', {}, 'sq'), null, 'no history means nothing to compare');
  });

  test('empty and tiny entries', () => {
    assert.equal(K.checkEntry('', {}, 'sq').kind, 'invalid');
    assert.equal(K.checkEntry('.', {}, 'sq').kind, 'invalid');
    assert.equal(K.checkEntry('0', {}, 'sq').kind, 'invalid');
    assert.equal(K.checkEntry('5', {}, 'sq').kind, 'low');
    assert.equal(K.checkEntry('10', {}, 'sq'), null);
  });

  test('draftsFilled and checkEntries cover a whole member', () => {
    assert.deepEqual(K.draftsFilled({ sq: '100', bp: '  ', dl: '' }), ['sq']);
    assert.deepEqual(K.draftsFilled({}), []);
    const warnings = K.checkEntries({ sq: '1275', bp: '80', dl: '170' }, row('X', ['127.5'], ['78'], ['165']));
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].lift, 'sq');
    assert.equal(warnings[0].kind, 'high');
    assert.deepEqual(K.checkEntries({ sq: '130' }, row('X', ['125'], [], [])), []);
  });
});

describe('save-back plumbing', () => {
  test('bodies carry the PIN', () => {
    assert.deepEqual(JSON.parse(K.pingBody('1984')), { ping: true, pin: '1984' });
    assert.deepEqual(JSON.parse(K.pingBody()), { ping: true, pin: '' });
    const body = JSON.parse(K.saveBody('1984', { name: 'Keith Gray' }));
    assert.equal(body.pin, '1984');
    assert.equal(body.member.name, 'Keith Gray');
  });

  test('parseApiReply treats an unreadable reply as accepted', () => {
    assert.deepEqual(K.parseApiReply('{"ok":true}'), { ok: true, error: '' });
    assert.deepEqual(K.parseApiReply('{"ok":false,"error":"bad pin"}'), { ok: false, error: 'bad pin' });
    assert.deepEqual(K.parseApiReply('{"ok":false}'), { ok: false, error: 'error' });
    assert.deepEqual(K.parseApiReply('<html>redirect</html>'), { ok: true, error: '' });
    assert.deepEqual(K.parseApiReply(''), { ok: true, error: '' });
  });

  test('saveDestination says where scores are going', () => {
    assert.equal(K.saveDestination({ api: 'https://script.google.com/x/exec' }).kind, 'sheet');
    assert.match(K.saveDestination({ api: 'https://x' }).label, /gym sheet/);
    const linkedOnly = K.saveDestination({ sheets: 'https://docs.google.com/x' });
    assert.equal(linkedOnly.kind, 'device');
    assert.match(linkedOnly.label, /save-back link/);
    const bare = K.saveDestination({});
    assert.equal(bare.kind, 'device');
    assert.match(bare.label, /Link the gym sheet/);
  });
});

describe('bulk add', () => {
  const roster = [row('Keith Gray', [], [], []), row('Steve Otto', [], [], [])];

  test('parseBulkNames reads a pasted list, with or without a crew per line', () => {
    const e = K.parseBulkNames('Name\nJane Smith\nBob Bee, 5:40 AM\n\n  \nAnn Ant;6:30 PM\n', 'g3');
    assert.deepEqual(e, [
      { name: 'Jane Smith', prog: 'g3' },
      { name: 'Bob Bee', prog: 'g2' },
      { name: 'Ann Ant', prog: 'g7' }
    ]);
    assert.deepEqual(K.parseBulkNames('Solo Person'), [{ name: 'Solo Person', prog: 'g1' }]);
    assert.deepEqual(K.parseBulkNames(''), []);
    assert.deepEqual(K.parseBulkNames('   \n\n'), []);
  });

  test('planBulkAdd separates new names, exact repeats and likely misspellings', () => {
    const plan = K.planBulkAdd(roster, K.parseBulkNames('Jane Smith\nKeith Gray\nKeith Grey\nJane Smith\nBob Bee', 'g1'));
    assert.deepEqual(plan.add.map(x => x.name), ['Jane Smith', 'Bob Bee']);
    assert.deepEqual(plan.exact.map(x => x.name), ['Keith Gray', 'Jane Smith'], 'existing names and repeats within the paste');
    assert.deepEqual(plan.similar, [{ name: 'Keith Grey', prog: 'g1', match: 'Keith Gray' }]);
  });

  test('planBulkAdd keeps the crew from each line', () => {
    const plan = K.planBulkAdd(roster, K.parseBulkNames('Jane Smith, 4:00 PM\nBob Bee', 'g6'));
    assert.deepEqual(plan.add, [{ name: 'Jane Smith', prog: 'g4' }, { name: 'Bob Bee', prog: 'g6' }]);
  });

  test('bulkSummary reads correctly in the singular', () => {
    assert.equal(K.bulkSummary({ add: [1], exact: [], similar: [] }), '1 new member');
    assert.equal(K.bulkSummary({ add: [], exact: [], similar: [] }), '0 new members');
    assert.equal(
      K.bulkSummary({ add: [1, 2], exact: [1], similar: [1] }),
      '2 new members · 1 already on the roster · 1 looks like an existing member'
    );
    assert.match(K.bulkSummary({ add: [1], exact: [1, 2], similar: [1, 2] }), /2 already on the roster · 2 look like existing members$/);
  });

  test('addMembers appends with the given club and crew, and does not mutate', () => {
    const out = K.addMembers(roster, [{ name: ' Jane Smith ', prog: 'g4' }, { name: 'Bob Bee' }, { name: '  ' }], 'womens');
    assert.equal(out.length, 4, 'blank names are dropped');
    assert.deepEqual(out[2], { name: 'Jane Smith', club: 'womens', prog: 'g4', sq: { c: '', p: '' }, bp: { c: '', p: '' }, dl: { c: '', p: '' }, h: [] });
    assert.equal(out[3].prog, 'g1', 'no crew falls back to the first');
    assert.equal(out[3].club, 'womens');
    assert.equal(roster.length, 2);
    assert.equal(K.addMembers(roster, [], 'mens').length, 2);
  });

  test('a paste of only new names adds them all', () => {
    const entries = K.parseBulkNames('Ann Ant\nBob Bee\nCal Cat', 'g5');
    const plan = K.planBulkAdd([], entries);
    assert.equal(plan.add.length, 3);
    assert.equal(plan.exact.length + plan.similar.length, 0);
    const out = K.addMembers([], plan.add, 'mens');
    assert.deepEqual(out.map(r => r.name), ['Ann Ant', 'Bob Bee', 'Cal Cat']);
    assert.ok(out.every(r => r.prog === 'g5'));
  });
});

describe('layout breakpoints', () => {
  test('tablets get the touch layout, only a big screen gets the TV stage', () => {
    assert.equal(K.LIMITS.touchBreak, 1100);
    const touch = w => w < K.LIMITS.touchBreak;
    assert.equal(touch(390), true, 'phone');
    assert.equal(touch(768), true, 'iPad portrait');
    assert.equal(touch(1024), true, 'iPad landscape');
    assert.equal(touch(1366), false, 'laptop');
    assert.equal(touch(1920), false, 'gym TV');
  });
});

describe('choosing which views run', () => {
  const data = [row('A B', ['100'], [], [])];

  test('the catalogue is ten views in rotation order', () => {
    assert.deepEqual(K.ALL_VIEW_KEYS, ['total', 'sq', 'bp', 'dl', 'movers', 'gains', 'pbs', 'miles', 'crews', 'roster']);
    assert.equal(K.viewSpec('crews').label, 'Crews');
    assert.equal(K.viewSpec('gains').kind, 'gains');
    assert.equal(K.viewSpec('sq').lift, 'sq');
    assert.equal(K.viewSpec('nope'), null);
  });

  test('no stored choice means every view', () => {
    assert.deepEqual(K.enabledViews({}), K.ALL_VIEW_KEYS);
    assert.deepEqual(K.enabledViews({ views: [] }), K.ALL_VIEW_KEYS);
    assert.deepEqual(K.enabledViews(null), K.ALL_VIEW_KEYS);
    assert.equal(K.viewEnabled({}, 'miles'), true);
  });

  test('a stored choice narrows the rotation and keeps canonical order', () => {
    const st = { views: ['crews', 'total'] };
    assert.deepEqual(K.enabledViews(st), ['total', 'crews']);
    assert.deepEqual(K.buildViews(data, 'all', 'all', st).map(x => x.key), ['total', 'crews']);
    assert.equal(K.viewEnabled(st, 'movers'), false);
  });

  test('a board is never left blank', () => {
    assert.deepEqual(K.enabledViews({ views: ['not-a-view'] }), ['total']);
    assert.deepEqual(K.buildViews(data, 'all', 'all', { views: ['nope'] }).map(x => x.key), ['total']);
    assert.deepEqual(K.toggleView({ views: ['total'] }, 'total'), ['total'], 'the last view cannot be turned off');
  });

  test('toggleView adds and removes, always in catalogue order', () => {
    assert.deepEqual(K.toggleView({ views: ['total', 'crews'] }, 'crews'), ['total']);
    assert.deepEqual(K.toggleView({ views: ['crews', 'total'] }, 'sq'), ['total', 'sq', 'crews']);
    assert.equal(K.toggleView({}, 'miles').indexOf('miles'), -1, 'from all-on, toggling removes one');
    assert.equal(K.toggleView({}, 'miles').length, K.ALL_VIEW_KEYS.length - 1);
  });

  test('rotation speed: URL override, then the coach setting, then the default', () => {
    assert.equal(K.effectiveRotate({}, null), 14);
    assert.equal(K.effectiveRotate({ rotate: 0 }, null), 14);
    assert.equal(K.effectiveRotate({ rotate: 20 }, null), 20);
    assert.equal(K.effectiveRotate({ rotate: 20 }, 30), 30);
    assert.equal(K.effectiveRotate({ rotate: 999 }, null), 40, 'clamped');
    assert.ok(K.ROTATE_CHOICES.indexOf(14) >= 0);
  });

  test('the choice survives a round trip through settings', () => {
    const st = K.normaliseSettings({ views: ['total', 'roster', 'bogus'], rotate: '20' });
    assert.deepEqual(st.views, ['total', 'roster'], 'unknown keys dropped');
    assert.equal(st.rotate, 20);
    assert.deepEqual(K.normaliseSettings({}).views, []);
    assert.equal(K.normaliseSettings({ rotate: 'x' }).rotate, 0);
    assert.equal(K.normaliseSettings({ rotate: -5 }).rotate, 0);
  });
});

describe('crew standings', () => {
  const data = [
    row('Early One', ['100', '90'], ['60', '50'], ['120', '110'], { prog: 'g1' }),
    row('Early Two', ['80'], ['50'], ['100'], { prog: 'g1' }),
    row('Mid One', ['150', '150'], ['100', '90'], ['200', '200'], { prog: 'g2' }),
    row('No Numbers', [], [], [], { prog: 'g3' })
  ];
  const all = K.scopeMembers(K.buildMembers(data), null, 'all');

  test('one row per crew that has tested members, ranked by kilos added', () => {
    const cs = K.crewStandings(all);
    assert.equal(cs.by, 'gains');
    assert.deepEqual(cs.rows.map(r => r.label), ['4:50 AM', '5:40 AM'], 'empty crews are left out');
    assert.deepEqual(cs.rows.map(r => r.rank), [1, 2]);
    const early = cs.rows[0];
    assert.equal(early.tested, 2);
    assert.equal(early.gained, 30, '10 on each lift');
    assert.equal(early.pbs, 3);
    assert.equal(early.avgTotal, 255, '(280 + 230) / 2');
    assert.equal(cs.rows[1].gained, 10);
    assert.equal(cs.rows[1].avgTotal, 450);
    assert.equal(early.color, K.progColor('g1'));
  });

  test('before any round has gains it ranks by average big three instead', () => {
    const fresh = [
      row('A One', ['100'], ['60'], ['120'], { prog: 'g1' }),
      row('B One', ['150'], ['100'], ['200'], { prog: 'g2' })
    ];
    const cs = K.crewStandings(K.scopeMembers(K.buildMembers(fresh), null, 'all'));
    assert.equal(cs.by, 'average');
    assert.deepEqual(cs.rows.map(r => r.label), ['5:40 AM', '4:50 AM']);
    assert.ok(cs.rows.every(r => r.gained === 0 && r.pbs === 0));
  });

  test('a crew with numbers but no complete big three still counts', () => {
    const partial = [row('Half Done', ['100'], [], [], { prog: 'g4' })];
    const cs = K.crewStandings(K.scopeMembers(K.buildMembers(partial), null, 'all'));
    assert.equal(cs.rows.length, 1);
    assert.equal(cs.rows[0].tested, 1);
    assert.equal(cs.rows[0].avgTotal, null);
  });

  test('no tested members at all gives no rows', () => {
    assert.deepEqual(K.crewStandings([]).rows, []);
  });
});

describe('most kilos added', () => {
  const data = [
    row('Big Mover', ['110', '100'], ['70', '60'], ['130', '120'], {}),
    row('One Lift', ['150', '140'], ['100', '100'], ['200', '200'], {}),
    row('Held Flat', ['100', '100'], ['60', '60'], ['120', '120'], {}),
    row('First Timer', ['100'], ['60'], ['120'], {})
  ];
  const all = K.scopeMembers(K.buildMembers(data), null, 'all');

  test('ranks by total kilos added, and says which lifts moved', () => {
    const g = K.topGainers(all);
    assert.deepEqual(g.map(x => x.m.name), ['Big Mover', 'One Lift']);
    assert.deepEqual(g.map(x => x.rank), [1, 2]);
    assert.equal(g[0].label, '+30 kg');
    assert.equal(g[0].detail, 'Squat +10 · Bench +10 · Deadlift +10');
    assert.equal(g[1].label, '+10 kg');
    assert.equal(g[1].detail, 'Squat +10');
  });

  test('nobody who held or is untested appears', () => {
    const names = K.topGainers(all).map(x => x.m.name);
    assert.equal(names.indexOf('Held Flat'), -1);
    assert.equal(names.indexOf('First Timer'), -1);
    assert.deepEqual(K.topGainers([]), []);
  });

  test('caps at the leaderboard size', () => {
    const many = [];
    for (let i = 0; i < 30; i++) many.push(row('M' + String(i).padStart(2, '0'), [String(100 + i), '90'], [], []));
    assert.equal(K.topGainers(K.scopeMembers(K.buildMembers(many), null, 'all')).length, K.LIMITS.leaderboard);
  });
});

describe('roster sorting', () => {
  const data = [
    row('Charlie', ['80', '80'], ['50', '50'], ['100', '100'], {}),
    row('Alice', ['100', '90'], ['60', '50'], ['120', '110'], {}),
    row('Bravo', ['150'], ['100'], ['200'], {}),
    row('Dana', ['90'], [], [], {})
  ];
  const all = K.scopeMembers(K.buildMembers(data), null, 'all');

  test('the three sorts', () => {
    assert.deepEqual(K.ROSTER_SORTS.map(s => s.id), ['name', 'total', 'gain']);
    assert.deepEqual(K.sortMembers(all, 'name').map(m => m.name), ['Alice', 'Bravo', 'Charlie', 'Dana']);
    assert.deepEqual(K.sortMembers(all, 'total').map(m => m.name), ['Bravo', 'Alice', 'Charlie', 'Dana'], 'no total sorts last');
    assert.deepEqual(K.sortMembers(all, 'gain').map(m => m.name), ['Alice', 'Bravo', 'Charlie', 'Dana'], 'ties fall back to name');
  });

  test('sorting does not mutate and an unknown sort leaves the order alone', () => {
    const before = all.map(m => m.name);
    K.sortMembers(all, 'total');
    assert.deepEqual(all.map(m => m.name), before);
    assert.deepEqual(K.sortMembers(all, 'whatever').map(m => m.name), before);
  });
});

describe('nobody else testing', () => {
  const data = [
    row('Ann', ['100'], [], [], { prog: 'g1' }),
    row('Bob', ['100'], [], [], { prog: 'g1' }),
    row('Cal', ['100'], [], [], { prog: 'g1' }),
    row('Dee', ['100'], [], [], { prog: 'g2' })
  ];
  const crew = K.buildQueue(data, 'all', 'g1');

  test('outstandingCount ignores anyone entered or already skipped', () => {
    assert.equal(K.outstandingCount(crew, {}), 3);
    assert.equal(K.outstandingCount(crew, { 0: 'done' }), 2);
    assert.equal(K.outstandingCount(crew, { 0: 'done', 1: 'skip' }), 1);
    assert.equal(K.outstandingCount(crew, { 0: 'done', 1: 'skip', 2: 'skip' }), 0);
    assert.equal(K.outstandingCount([], {}), 0);
  });

  test('skipRemaining clears the outstanding list without touching what was entered', () => {
    const done = K.skipRemaining(crew, { 0: 'done' });
    assert.deepEqual(done, { 0: 'done', 1: 'skip', 2: 'skip' });
    assert.equal(K.outstandingCount(crew, done), 0);
    assert.deepEqual(K.sessionRemaining(crew, done), []);
  });

  test('it only reaches the crew it was given', () => {
    const done = K.skipRemaining(crew, {});
    assert.equal(done[3], undefined, 'the 5:40 AM member is untouched');
    assert.equal(K.outstandingCount(K.buildQueue(data, 'all', 'g2'), done), 1);
  });

  test('it does not mutate, and is safe to repeat', () => {
    const before = { 0: 'done' };
    const first = K.skipRemaining(crew, before);
    assert.deepEqual(before, { 0: 'done' });
    assert.deepEqual(K.skipRemaining(crew, first), first);
    assert.deepEqual(K.skipRemaining(crew, undefined), { 0: 'skip', 1: 'skip', 2: 'skip' });
  });
});
