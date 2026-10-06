/*
 * The enquiry form (Knight Admin's /form/enquiry) on the site.
 *
 * - Sizes each <iframe data-kf-form> to its content: the form posts
 *   {type: 'kf-form', height} to this page. Only messages from that iframe, and
 *   from the iframe's own origin, are believed.
 * - When it's sent ({submitted: true}) the frame shrinks to the thank-you
 *   message, so it's scrolled back into view.
 * - A page opened with ?program=… (e.g. /contact?program=bootcamp) passes that
 *   on to a form that doesn't name one itself, so the right coach is tagged.
 * - Any link or button with data-kf-open opens the form in a sheet over the
 *   page, so nobody has to scroll to the bottom or leave the page to send a
 *   message. data-kf-open="mens-club" names the program; empty uses the
 *   script's data-program. The link's own href is the fallback without script.
 * - The script tag's data-launcher adds a "Message us" button pinned to the
 *   bottom of the screen (hidden while the page's own form is in view).
 *
 *   <script src="/components/enquiry-form.js?v=2" data-program="bootcamp" data-launcher defer></script>
 *
 * Works for frames added later too (the homepage's React form): the message
 * handler finds the frame by the window that sent it, and the sheet listens
 * for clicks on the whole document.
 */
(function () {
  'use strict';

  var FORM_URL = 'https://knight-agent.vercel.app/form/enquiry?embed=1&site=lawnton';
  var script = document.currentScript;
  var pageProgram = (script && script.getAttribute('data-program')) || urlProgram() || '';
  var wantLauncher = !!(script && script.hasAttribute('data-launcher'));

  function urlProgram() {
    try { var p = new URLSearchParams(window.location.search).get('program'); return p && /^[\w' -]{2,40}$/.test(p) ? p : null; } catch (e) { return null; }
  }

  function frames() {
    return Array.prototype.slice.call(document.querySelectorAll('iframe[data-kf-form]'));
  }

  function originOf(src) {
    try { return new URL(src, window.location.href).origin; } catch (e) { return null; }
  }

  function formUrl(program) {
    var url = new URL(FORM_URL);
    if (program) url.searchParams.set('program', program);
    return url.toString();
  }

  // ?program=… on the page → the inline form's program, unless the frame already says.
  function passProgram() {
    var program = urlProgram();
    if (!program) return;
    frames().forEach(function (f) {
      if (f.hasAttribute('data-kf-sheet')) return;
      var url;
      try { url = new URL(f.getAttribute('src'), window.location.href); } catch (e) { return; }
      if (url.searchParams.get('program')) return;
      url.searchParams.set('program', program);
      f.setAttribute('src', url.toString());
    });
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || typeof d !== 'object' || d.type !== 'kf-form') return;
    var frame = null;
    frames().forEach(function (f) { if (f.contentWindow === e.source) frame = f; });
    if (!frame || originOf(frame.getAttribute('src')) !== e.origin) return;
    var h = Number(d.height);
    if (h > 200 && h < 4000) {
      frame.style.minHeight = '0'; // the page's CSS holds space until the form says how tall it is
      frame.style.height = Math.ceil(h) + 'px';
    }
    if (d.submitted) {
      if (frame.hasAttribute('data-kf-sheet')) { sheetBody.scrollTop = 0; return; }
      // To the frame's top, clear of the sticky nav. Not scrollIntoView: the frame is still animating
      // its height down (CSS transition), so centring it would aim at the old, taller frame.
      var top = frame.getBoundingClientRect().top;
      if (top < 80 || top > window.innerHeight - 120) window.scrollTo({ top: Math.max(0, window.scrollY + top - 96), behavior: 'smooth' });
    }
  });

  // Fade a frame in once it has loaded ('load' doesn't bubble, so listen while capturing).
  document.addEventListener('load', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IFRAME' && t.hasAttribute('data-kf-form')) t.classList.add('loaded');
  }, true);

  // ---------------------------------------------------------------------------
  // The sheet: the form over the page, from any [data-kf-open]
  // ---------------------------------------------------------------------------

  var CSS = '' +
    '.kf-sheet{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end;justify-content:center;background:rgba(10,10,10,.55);opacity:0;transition:opacity .2s ease}' +
    '.kf-sheet[hidden]{display:none}' +
    '.kf-sheet.open{opacity:1}' +
    '.kf-sheet-panel{position:relative;width:100%;max-width:560px;max-height:92vh;max-height:92dvh;display:flex;flex-direction:column;background:#F4F4F2;border-radius:20px 20px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.25);transform:translateY(24px);transition:transform .25s ease}' +
    '.kf-sheet.open .kf-sheet-panel{transform:none}' +
    '@media (min-width:700px){.kf-sheet{align-items:center}.kf-sheet-panel{border-radius:20px;max-height:88vh}}' +
    '.kf-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px 10px}' +
    '.kf-sheet-title{margin:0;font-family:"Bebas Neue",system-ui,sans-serif;font-weight:400;font-size:1.7rem;letter-spacing:.03em;color:#1A1A1A;line-height:1}' +
    '.kf-sheet-sub{margin:4px 0 0;font:400 .9rem/1.4 Lato,system-ui,sans-serif;color:#666}' +
    '.kf-sheet-close{flex:none;width:44px;height:44px;border:0;border-radius:50%;background:#fff;color:#1A1A1A;font-size:22px;line-height:1;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.12)}' +
    '.kf-sheet-close:focus-visible{outline:3px solid #E31E24;outline-offset:2px}' +
    '.kf-sheet-body{overflow:auto;-webkit-overflow-scrolling:touch;padding:0 12px calc(16px + env(safe-area-inset-bottom));flex:1 1 auto}' +
    '.kf-sheet-body iframe{display:block;width:100%;height:640px;border:0;opacity:0;transition:opacity .25s ease}' +
    '.kf-sheet-body iframe.loaded{opacity:1}' +
    'html.kf-sheet-lock,html.kf-sheet-lock body{overflow:hidden}' +
    '.kf-launcher{position:fixed;right:1.25rem;bottom:calc(1.25rem + env(safe-area-inset-bottom));z-index:900;display:inline-flex;align-items:center;justify-content:center;gap:.55rem;border:0;cursor:pointer;background:var(--kf-launcher-bg,#E31E24);color:#fff;font-family:"Bebas Neue",system-ui,sans-serif;font-size:1.25rem;letter-spacing:.05em;padding:.9rem 1.5rem;border-radius:999px;box-shadow:0 12px 32px rgba(0,0,0,.28);opacity:0;visibility:hidden;transform:translateY(18px);transition:opacity .3s ease,transform .3s ease,visibility .3s}' +
    '.kf-launcher.show{opacity:1;visibility:visible;transform:none}' +
    '.kf-launcher:focus-visible{outline:3px solid #1A1A1A;outline-offset:3px}' +
    '@media (max-width:600px){.kf-launcher{left:1rem;right:1rem;bottom:calc(1rem + env(safe-area-inset-bottom))}}' +
    '@media (prefers-reduced-motion:reduce){.kf-sheet,.kf-sheet-panel,.kf-launcher{transition:none}}';

  var sheet, sheetBody, sheetFrame, sheetProgram = null, lastFocus = null, launcher = null;

  function injectCss() {
    if (document.getElementById('kf-enquiry-css')) return;
    var s = document.createElement('style');
    s.id = 'kf-enquiry-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buildSheet() {
    if (sheet) return;
    sheet = document.createElement('div');
    sheet.className = 'kf-sheet';
    sheet.hidden = true;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'kf-sheet-title');
    sheet.innerHTML =
      '<div class="kf-sheet-panel">' +
        '<div class="kf-sheet-head"><div><h2 class="kf-sheet-title" id="kf-sheet-title">Send us a message</h2>' +
        '<p class="kf-sheet-sub">A coach will be in touch, usually the same day.</p></div>' +
        '<button type="button" class="kf-sheet-close" aria-label="Close">&times;</button></div>' +
        '<div class="kf-sheet-body"></div>' +
      '</div>';
    sheetBody = sheet.querySelector('.kf-sheet-body');
    sheet.querySelector('.kf-sheet-close').addEventListener('click', closeSheet);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
    document.body.appendChild(sheet);
  }

  function openSheet(program) {
    injectCss();
    buildSheet();
    // One frame, reloaded only when the program changes (a half-filled form survives closing and reopening).
    if (!sheetFrame || sheetProgram !== program) {
      if (sheetFrame) sheetFrame.remove();
      sheetFrame = document.createElement('iframe');
      sheetFrame.setAttribute('data-kf-form', '');
      sheetFrame.setAttribute('data-kf-sheet', '');
      sheetFrame.title = 'Send us a message';
      sheetFrame.src = formUrl(program);
      sheetBody.appendChild(sheetFrame);
      sheetProgram = program;
    }
    lastFocus = document.activeElement;
    sheet.hidden = false;
    document.documentElement.classList.add('kf-sheet-lock');
    requestAnimationFrame(function () { sheet.classList.add('open'); });
    sheet.querySelector('.kf-sheet-close').focus();
    if (launcher) launcher.classList.remove('show');
  }

  function closeSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove('open');
    document.documentElement.classList.remove('kf-sheet-lock');
    setTimeout(function () { sheet.hidden = true; updateLauncher(); }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSheet();
  });

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-kf-open]') : null;
    if (!el) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // a new tab gets the link
    e.preventDefault();
    openSheet(el.getAttribute('data-kf-open') || pageProgram);
  });

  // ---------------------------------------------------------------------------
  // The launcher: "Message us", pinned, on pages that ask for it
  // ---------------------------------------------------------------------------

  var inlineVisible = false;

  function updateLauncher() {
    if (!launcher) return;
    var past = window.scrollY > Math.min(400, window.innerHeight * 0.5);
    var open = sheet && !sheet.hidden;
    launcher.classList.toggle('show', past && !inlineVisible && !open);
  }

  function buildLauncher() {
    injectCss();
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'kf-launcher';
    launcher.setAttribute('data-kf-open', pageProgram);
    launcher.innerHTML = 'Message us <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
    document.body.appendChild(launcher);
    var inline = frames().filter(function (f) { return !f.hasAttribute('data-kf-sheet'); });
    if (inline.length && window.IntersectionObserver) {
      var seen = new Set();
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); });
        inlineVisible = seen.size > 0;
        updateLauncher();
      });
      inline.forEach(function (f) { io.observe(f); });
    }
    window.addEventListener('scroll', updateLauncher, { passive: true });
    updateLauncher();
  }

  function start() {
    passProgram();
    if (wantLauncher) buildLauncher();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
