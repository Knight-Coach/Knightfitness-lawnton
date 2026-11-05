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
  assert.match(club, /Only 6 intro spots left this month/);
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
  assert.match(html, /kf-tracking\.js\?v=1/);
  assert.match(html, /enquiry-form\.js\?v=3/);
  assert.match(html, /data-kf-form=""/);
  assert.match(html, /knight-agent\.vercel\.app\/form\/enquiry\?embed=1/);
  assert.equal(html.includes('unpkg.com'), false);
  assert.equal(html.includes('text/babel'), false);
  assert.equal(html.includes('babel.min.js'), false);
  assert.equal(html.includes('babel-standalone'), false);
  assert.equal((html.match(/<div id="root">/g) || []).length, 1);
});
