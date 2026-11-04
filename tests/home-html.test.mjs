// The homepage is prerendered. These checks fail if someone edits
// AppContentV5.jsx and forgets `npm run build:home`, or if Babel sneaks back in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const jsx = readFileSync(new URL('../dist/components/AppContentV5.jsx', import.meta.url));
const hash = createHash('sha256').update(jsx).digest('hex').slice(0, 12);
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');

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
