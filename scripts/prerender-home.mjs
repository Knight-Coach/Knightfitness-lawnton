/*
 * Precompile the homepage and write its first render into dist/index.html.
 *
 * AppContentV5.jsx stays the editable source. This script turns it into plain
 * JS (no in-browser Babel) and stamps the same render into #root so the HTML
 * already contains the headings, offer and reviews. Vercel keeps serving dist/
 * as static files; run `npm run build:home` after editing the JSX.
 */
process.env.NODE_ENV = 'production';

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jsxPath = join(root, 'dist/components/AppContentV5.jsx');
const htmlPath = join(root, 'dist/index.html');
const outJs = join(root, 'dist/assets/home-app.js');

const esbuild = (await import('esbuild')).default;
const React = (await import('react')).default;
const { renderToString } = await import('react-dom/server');

const jsx = readFileSync(jsxPath, 'utf8');
const hash = createHash('sha256').update(jsx).digest('hex').slice(0, 12);

const transform = (source) => esbuild.transform(source, {
  loader: 'jsx',
  jsx: 'transform',
  target: 'es2018',
  minify: true,
  legalComments: 'none',
});

const component = await transform(jsx);
const browser = await transform(
  jsx + '\nReactDOM.hydrateRoot(document.getElementById("root"), React.createElement(AppContent));\n'
);

const context = vm.createContext({ React, window: {}, console });
vm.runInContext(component.code, context);
if (typeof context.window.AppContent !== 'function') {
  throw new Error('AppContent was not assigned to window. The JSX export changed.');
}
const rendered = renderToString(React.createElement(context.window.AppContent));
if (!rendered.includes('STRONGER') || !rendered.includes('Anna Wilson') || !rendered.includes('data-kf-form')) {
  throw new Error('Prerender is missing the headline, a review, or the enquiry form.');
}

writeFileSync(outJs, browser.code);

let html = readFileSync(htmlPath, 'utf8');
html = replaceMarked(html, 'kf-home-root', `<div id="root">${rendered}</div>`);
html = replaceMarked(
  html,
  'kf-home-boot',
  [
    '<script defer src="/assets/vendor/react-18.3.1.production.min.js"></script>',
    '<script defer src="/assets/vendor/react-dom-18.3.1.production.min.js"></script>',
    `<script defer src="/assets/home-app.js?v=${hash}"></script>`,
  ].join('\n  ')
);
if (/unpkg\.com|text\/babel|babel\.min\.js|babel-standalone/.test(html)) {
  throw new Error('Homepage HTML still references in-browser Babel.');
}
writeFileSync(htmlPath, html);

const jsBytes = Buffer.byteLength(browser.code);
const htmlBytes = Buffer.byteLength(html);
console.log(`home-app.js ${jsBytes} bytes (${gzipSync(browser.code).length} gzip), source ${hash}`);
console.log(`index.html ${htmlBytes} bytes (${gzipSync(html).length} gzip)`);

function replaceMarked(html, name, inner) {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const i = html.indexOf(start);
  const j = html.indexOf(end);
  if (i < 0 || j < 0 || j < i) throw new Error(`Missing ${start} / ${end} in dist/index.html`);
  return html.slice(0, i + start.length) + '\n  ' + inner + '\n  ' + html.slice(j);
}
