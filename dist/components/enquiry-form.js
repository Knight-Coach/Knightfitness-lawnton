/*
 * The enquiry form (Knight Admin's /form/enquiry) shown in an iframe on the site.
 *
 * - Sizes each <iframe data-kf-form> to its content: the form posts
 *   {type: 'kf-form', height} to this page. Only messages from that iframe, and
 *   from the iframe's own origin, are believed.
 * - When it's sent ({submitted: true}) the frame shrinks to the thank-you
 *   message, so it's scrolled back into view.
 * - A page opened with ?program=… (e.g. contact.html?program=bootcamp from the
 *   Bootcamp page) passes that on to a form that doesn't name one itself, so the
 *   right coach is tagged.
 *
 * Works for frames added later too (the homepage's React form): the message
 * handler finds the frame by the window that sent it.
 */
(function () {
  'use strict';

  function frames() {
    return Array.prototype.slice.call(document.querySelectorAll('iframe[data-kf-form]'));
  }

  function originOf(src) {
    try { return new URL(src, window.location.href).origin; } catch (e) { return null; }
  }

  // ?program=… on the page → the form's program, unless the frame already says.
  function passProgram() {
    var program;
    try { program = new URLSearchParams(window.location.search).get('program'); } catch (e) { program = null; }
    if (!program || !/^[\w' -]{2,40}$/.test(program)) return;
    frames().forEach(function (f) {
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', passProgram);
  else passProgram();
})();
