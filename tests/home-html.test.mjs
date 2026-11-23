// The homepage is prerendered. These checks fail if someone edits
// AppContentV5.jsx and forgets `npm run build:home`, or if Babel sneaks back in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const jsx = readFileSync(new URL('../dist/components/AppContentV5.jsx', import.meta.url));
const hash = createHash('sha256').update(jsx).digest('hex').slice(0, 12);
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');

const pages = [
  'index.html',
  'about.html',
  'contact.html',
  'reviews.html',
  'programs/index.html',
  'programs/bootcamp.html',
  'programs/mens.html',
  'programs/womens.html',
  'womens-club.html',
  'redcarpetevent.html',
  '42-hard.html',
  'programs/youth.html',
  '404.html',
  'privacy.html',
  'thank-you.html',
];

test('every page except the 5RM board ships content without in-browser Babel', () => {
  for (const name of pages) {
    const page = readFileSync(new URL('../dist/' + name, import.meta.url), 'utf8');
    assert.equal(page.includes('unpkg.com'), false, name);
    assert.equal(page.includes('text/babel'), false, name);
    assert.equal(page.includes('babel.min.js'), false, name);
    assert.equal(page.includes('babel-standalone'), false, name);
    assert.match(page, /kf-tracking\.js/, name);
    if (name === 'programs/youth.html') assert.match(page, /<h2>/, name);
    else assert.match(page, /<h1[\s>]/, name + ' heading');
  }
  const youth = readFileSync(new URL('../dist/programs/youth.html', import.meta.url), 'utf8');
  assert.match(youth, /youngknights\.com\.au/);
  const club = readFileSync(new URL('../dist/womens-club.html', import.meta.url), 'utf8');
  // The static "Only 6 intro spots left this month" claim was removed (site review, Nov 2026).
  assert.equal(/spots left this month/i.test(club), false);
  assert.equal(club.includes('{{'), false);
  assert.equal(club.includes('fb1b0011'), false);
  assert.match(club, /womens-club-page\.js/);
  assert.match(club, /leadconnectorhq\.com\/widget\/booking/);
});

test('homepage ships real content and no in-browser Babel', () => {
  assert.match(html, new RegExp(`/assets/home-app\\.js\\?v=${hash}`));
  assert.match(html, /<h1 class="hero-headline">STRONGER<br\/>EVERY SESSION\.<br\/>TOGETHER\.<\/h1>/);
  assert.match(html, /WHAT LAWNTON LOCALS SAY/);
  assert.match(html, /Anna Wilson/);
  assert.match(html, /FIND YOUR PROGRAM/);
  assert.match(html, /8\.4kg/);
  assert.match(html, /"@type": "HealthClub"/);
  assert.match(html, /kf-tracking\.js\?v=2" async/);
  assert.match(html, /enquiry-form\.js\?v=4/);
  assert.match(html, /data-kf-form=""/);
  assert.match(html, /knight-agent\.vercel\.app\/form\/enquiry\?embed=1/);
  assert.equal(html.includes('unpkg.com'), false);
  assert.equal(html.includes('text/babel'), false);
  assert.equal(html.includes('babel.min.js'), false);
  assert.equal(html.includes('babel-standalone'), false);
  assert.equal((html.match(/<div id="root">/g) || []).length, 1);
});

test('homepage has a real #pricing section with no invented prices, and one enquiry form', () => {
  assert.match(html, /<section id="pricing"/);
  assert.match(html, /Ask about our current offers/);
  const pricing = html.slice(html.indexOf('<section id="pricing"'), html.indexOf('</section>', html.indexOf('<section id="pricing"')));
  assert.equal(/\$\s?\d/.test(pricing), false, 'no dollar amounts in #pricing');
  assert.equal((html.match(/data-kf-form=""/g) || []).length, 1);
  const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
  assert.equal((footer.match(/>Reviews<\/a>/g) || []).length, 1, 'footer lists Reviews once');
  assert.match(html, /href="\/privacy"/);
});

test('post-enquiry pages, privacy, favicon and sitemap', () => {
  const read = (n) => readFileSync(new URL('../dist/' + n, import.meta.url), 'utf8');
  const vercel = JSON.parse(read('vercel.json'));
  const r = vercel.redirects.find((x) => x.source === '/message-received');
  assert.equal(r && r.destination, '/thank-you');
  const ty = read('thank-you.html');
  assert.match(ty, /noindex/);
  assert.equal(/kfTrackLead\(/.test(ty), false, '/thank-you must not fire a lead itself');
  const privacy = read('privacy.html');
  assert.match(privacy, /Australian Privacy Principles/);
  assert.match(privacy, /TODO/);
  const sitemap = read('sitemap.xml');
  assert.match(sitemap, /\/privacy<\/loc>/);
  assert.equal(/<lastmod>(?!2026-11-23)/.test(sitemap), false);
  assert.ok(readFileSync(new URL('../dist/favicon.ico', import.meta.url)).length > 1000);
  for (const name of pages) {
    if (name === 'programs/youth.html') continue;
    assert.match(read(name), /href="\/privacy"/, name + ' links to /privacy');
  }
});

test('lead tracking fires once per enquiry id', () => {
  const src = readFileSync(new URL('../dist/assets/kf-tracking.js', import.meta.url), 'utf8');
  const events = [];
  const store = {};
  const win = { addEventListener() {}, requestIdleCallback() {} };
  const ctx = {
    window: win, location: { pathname: '/contact' },
    document: { readyState: 'loading', createElement: () => ({}), head: { appendChild() {} }, visibilityState: 'visible' },
    sessionStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = String(v); } },
  };
  new Function('window', 'location', 'document', 'sessionStorage', src)(ctx.window, ctx.location, ctx.document, ctx.sessionStorage);
  win.gtag = (...a) => events.push(['ga', ...a]);
  win.fbq = (...a) => events.push(['fb', ...a]);
  assert.equal(win.kfTrackLead({ site: 'lawnton', source: '/contact', eventId: 'kf-1' }), true);
  assert.equal(win.kfTrackLead({ site: 'lawnton', source: '/contact', eventId: 'kf-1' }), false);
  assert.equal(events.filter((e) => e[0] === 'ga' && e[2] === 'generate_lead').length, 1);
  assert.equal(events.filter((e) => e[0] === 'fb' && e[2] === 'Lead').length, 1);
});
