/*
 * Accessible review carousels for the static pages.
 *
 * 1) Swipe carousels: <div data-kf-carousel="Google reviews"> holding cards.
 *    Adds Previous/Next buttons (44px targets) and a "2 / 6" counter, makes the
 *    track focusable with Left/Right/Home/End keys, labels each card
 *    "Review N of M", and announces changes in a polite live region.
 *    Controls hide themselves when every card already fits (desktop grid).
 *
 * 2) Auto-scrolling marquees: <div data-kf-marquee="Member reviews"> wrapping a
 *    track (the element with the CSS animation) whose children are listed
 *    twice for the seamless loop. Adds a Pause/Play button (WCAG 2.2.2),
 *    pauses while anything inside has keyboard focus or the pointer is over
 *    it, and hides the duplicate half from screen readers and the Tab order.
 *    Paused (or with reduced motion) the track becomes a normal horizontal
 *    scroller you can move with the arrow keys.
 *
 *   <script src="/assets/kf-carousel.js?v=1" defer></script>
 */
(function () {
  'use strict';

  var CSS = '' +
    '.kf-car-controls{display:flex;align-items:center;justify-content:center;gap:.75rem;margin:.75rem auto 0}' +
    '.kf-car-count{min-width:4.5em;text-align:center;font:700 .9rem/1 Lato,Inter,system-ui,sans-serif;color:#333;font-variant-numeric:tabular-nums}' +
    '.kf-car-controls[hidden]{display:none}' +
    '.kf-car-btn{min-width:44px;min-height:44px;padding:0 .85rem;border-radius:999px;border:1px solid #c9c9c9;background:#fff;color:#1A1A1A;font:700 .85rem/1 Lato,Inter,system-ui,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:.35rem;cursor:pointer}' +
    '.kf-car-btn:hover{border-color:#1A1A1A}' +
    '.kf-car-btn:focus-visible,[data-kf-carousel]:focus-visible,[data-kf-marquee] [data-kf-track]:focus-visible{outline:3px solid #E31E24;outline-offset:2px}' +
    '.kf-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
    '[data-kf-marquee].kf-paused [data-kf-track],[data-kf-marquee]:focus-within [data-kf-track],[data-kf-marquee]:hover [data-kf-track]{animation-play-state:paused!important}' +
    '[data-kf-marquee].kf-manual{overflow-x:auto!important;scroll-snap-type:x proximity}' +
    '[data-kf-marquee].kf-manual [data-kf-track]{animation:none!important;transform:none!important}' +
    '[data-kf-marquee].kf-manual [data-kf-dup]{display:none!important}' +
    '.kf-marquee-bar{display:flex;justify-content:flex-end;max-width:1200px;margin:0 auto .5rem;padding:0 1rem}';

  function css() {
    if (document.getElementById('kf-carousel-css')) return;
    var s = document.createElement('style');
    s.id = 'kf-carousel-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function btn(label, html) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'kf-car-btn';
    b.setAttribute('aria-label', label);
    b.innerHTML = html;
    return b;
  }
  var ARROW_L = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  var ARROW_R = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';

  // ---------------------------------------------------------------- swipe carousels
  function setupCarousel(track) {
    var label = track.getAttribute('data-kf-carousel') || 'Reviews';
    var cards = Array.prototype.slice.call(track.children);
    if (!cards.length) return;
    var n = cards.length, index = 0;

    var region = document.createElement('div');
    region.setAttribute('role', 'region');
    region.setAttribute('aria-roledescription', 'carousel');
    region.setAttribute('aria-label', label);
    track.parentNode.insertBefore(region, track);
    region.appendChild(track);

    track.setAttribute('tabindex', '0');
    track.setAttribute('aria-label', label + ' (use the arrow keys to move between reviews)');
    cards.forEach(function (c, i) {
      if (!/^(ARTICLE|SECTION|LI)$/.test(c.tagName)) c.setAttribute('role', 'group');
      c.setAttribute('aria-roledescription', 'slide');
      c.setAttribute('aria-label', 'Review ' + (i + 1) + ' of ' + n);
    });

    var live = document.createElement('p');
    live.className = 'kf-sr';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');

    var controls = document.createElement('div');
    controls.className = 'kf-car-controls';
    var prev = btn('Previous review', ARROW_L), next = btn('Next review', ARROW_R);
    // A visible "2 / 6" counter (dots don't fit at 44px each on a phone); the live region speaks it.
    var counter = document.createElement('span');
    counter.className = 'kf-car-count';
    counter.setAttribute('aria-hidden', 'true');
    controls.appendChild(prev); controls.appendChild(counter); controls.appendChild(next);
    region.appendChild(controls);
    region.appendChild(live);

    // An old, decorative dots container from the previous markup is no longer needed.
    var oldDots = region.parentNode.querySelector('.gr-dots');
    if (oldDots) oldDots.parentNode.removeChild(oldDots);

    function mark(i) {
      index = i;
      counter.textContent = (i + 1) + ' / ' + n;
    }
    function go(i, announce) {
      i = (i + n) % n;
      var card = cards[i];
      track.scrollTo({ left: card.offsetLeft - track.offsetLeft - (track.clientWidth - card.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
      mark(i);
      if (announce) {
        var name = card.querySelector('.gr-card-name');
        live.textContent = 'Review ' + (i + 1) + ' of ' + n + (name ? ', from ' + name.textContent.trim() : '');
      }
    }
    prev.addEventListener('click', function () { go(index - 1, true); });
    next.addEventListener('click', function () { go(index + 1, true); });
    track.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowRight') { e.preventDefault(); go(index + 1, true); }
      else if (k === 'ArrowLeft') { e.preventDefault(); go(index - 1, true); }
      else if (k === 'Home') { e.preventDefault(); go(0, true); }
      else if (k === 'End') { e.preventDefault(); go(n - 1, true); }
    });
    var t;
    track.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var center = track.scrollLeft + track.clientWidth / 2, best = 0, min = Infinity;
        cards.forEach(function (c, i) {
          var d = Math.abs(c.offsetLeft - track.offsetLeft + c.offsetWidth / 2 - center);
          if (d < min) { min = d; best = i; }
        });
        mark(best);
      }, 60);
    }, { passive: true });

    function fit() {
      var scrollable = track.scrollWidth > track.clientWidth + 4;
      controls.hidden = !scrollable;
      if (scrollable) track.setAttribute('tabindex', '0'); else track.removeAttribute('tabindex');
    }
    window.addEventListener('resize', fit);
    fit();
    mark(0);
  }

  // ---------------------------------------------------------------- marquees
  function setupMarquee(box) {
    var label = box.getAttribute('data-kf-marquee') || 'Reviews';
    var track = box.querySelector('[data-kf-track]') || box.firstElementChild;
    if (!track) return;
    track.setAttribute('data-kf-track', '');
    var items = Array.prototype.slice.call(track.children);
    var half = Math.floor(items.length / 2);
    // Second half repeats the first for the loop: hide it from AT and the Tab order.
    if (half && items.length % 2 === 0) {
      items.slice(half).forEach(function (el) {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('data-kf-dup', '');
        Array.prototype.forEach.call(el.querySelectorAll('a,button,[tabindex],iframe,video'), function (f) { f.setAttribute('tabindex', '-1'); });
        if (el.matches('[tabindex]')) el.setAttribute('tabindex', '-1');
      });
    }
    box.setAttribute('role', 'region');
    box.setAttribute('aria-roledescription', 'carousel');
    box.setAttribute('aria-label', label);

    var bar = document.createElement('div');
    bar.className = 'kf-marquee-bar';
    var toggle = btn('', '');
    toggle.removeAttribute('aria-label');
    bar.appendChild(toggle);
    box.parentNode.insertBefore(bar, box);

    function set(paused) {
      box.classList.toggle('kf-paused', paused);
      box.classList.toggle('kf-manual', paused);
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      toggle.innerHTML = (paused ? 'Play' : 'Pause') + '<span class="kf-sr"> ' + label.toLowerCase() + ' scrolling</span>';
      if (paused) { track.setAttribute('tabindex', '0'); track.setAttribute('aria-label', label + ' (use the arrow keys to scroll)'); }
      else { track.removeAttribute('tabindex'); track.removeAttribute('aria-label'); }
    }
    toggle.addEventListener('click', function () { set(!box.classList.contains('kf-paused')); });
    track.addEventListener('keydown', function (e) {
      if (!box.classList.contains('kf-manual')) return;
      var step = Math.max(240, box.clientWidth * 0.8);
      if (e.key === 'ArrowRight') { e.preventDefault(); box.scrollBy({ left: step, behavior: reduce ? 'auto' : 'smooth' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); box.scrollBy({ left: -step, behavior: reduce ? 'auto' : 'smooth' }); }
    });
    set(!!reduce);
  }

  function start() {
    var cars = document.querySelectorAll('[data-kf-carousel]');
    var mars = document.querySelectorAll('[data-kf-marquee]');
    if (!cars.length && !mars.length) return;
    css();
    Array.prototype.forEach.call(cars, setupCarousel);
    Array.prototype.forEach.call(mars, setupMarquee);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
