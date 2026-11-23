/*
 * Knight Fitness site tracking: GA4 + Meta Pixel, and one lead event per enquiry.
 *
 * Load in <head> with: <script src="/assets/kf-tracking.js?v=2" async></script>
 * Call window.kfTrackLead({ site, source, eventId }) once an enquiry is confirmed sent.
 * GA4 gets `generate_lead`; Meta gets the standard `Lead` event.
 * Leave an ID empty ('') to switch that platform off.
 *
 * Speed: gtag() and fbq() are queued straight away (page_view / PageView are
 * recorded in the queue immediately), but the two vendor libraries (~280KB of
 * JS) are only fetched once the page has finished loading and the browser is
 * idle. The queued calls replay when they arrive, so nothing is lost; the page
 * just paints and becomes interactive first.
 *
 * One lead per enquiry: pass an eventId and kfTrackLead() ignores any repeat
 * with the same id for the rest of the browser session (sessionStorage), so a
 * resent postMessage or a reload can't fire GA4/Meta twice. The same id goes
 * to Meta as eventID for deduplication. /thank-you never fires a lead itself.
 */
(function () {
  var GA4_ID = 'G-LPDJZ1128B';            // GA4 stream already on www.knightfitness.com.au
  var META_PIXEL_ID = '408666429737807';  // "Mark Knight's Pixel" (ad account 286353312016420), confirmed by the owner

  if (window.__kfTracking) return;
  window.__kfTracking = true;

  var libs = [];

  if (GA4_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
    libs.push('https://www.googletagmanager.com/gtag/js?id=' + GA4_ID);
  }

  if (META_PIXEL_ID && !window.fbq) {
    // Meta Pixel base code, minus the script tag (added below, after load).
    var n = window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
    libs.push('https://connect.facebook.net/en_US/fbevents.js');
  }

  var injected = false;
  function inject() {
    if (injected) return;
    injected = true;
    libs.forEach(function (src) {
      var s = document.createElement('script');
      s.async = true;
      s.src = src;
      (document.head || document.documentElement).appendChild(s);
    });
  }
  function whenIdle() {
    if (window.requestIdleCallback) window.requestIdleCallback(inject, { timeout: 2500 });
    else setTimeout(inject, 1200);
  }
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
  // Leaving early (or a lead firing before load) still gets the libraries in.
  ['pagehide', 'visibilitychange'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (ev !== 'visibilitychange' || document.visibilityState === 'hidden') inject(); });
  });

  // Lead IDs already reported this browser session (survives moving to /thank-you).
  function seen(id) {
    try { return (sessionStorage.getItem('kf_leads') || '').split(',').indexOf(id) >= 0; } catch (e) { return !!seen[id]; }
  }
  function remember(id) {
    seen[id] = true;
    try { sessionStorage.setItem('kf_leads', ((sessionStorage.getItem('kf_leads') || '') + ',' + id).slice(-2000)); } catch (e) {}
  }

  window.kfTrackLead = function (meta) {
    meta = meta || {};
    if (meta.eventId) {
      if (seen(meta.eventId)) return false;
      remember(meta.eventId);
    }
    var params = { site: meta.site || '', lead_source: meta.source || '', page_path: location.pathname };
    try { if (GA4_ID && window.gtag) window.gtag('event', 'generate_lead', params); } catch (e) {}
    try {
      if (META_PIXEL_ID && window.fbq) {
        var opts = meta.eventId ? { eventID: meta.eventId } : undefined;
        window.fbq('track', 'Lead', { content_name: params.lead_source || params.site }, opts);
      }
    } catch (e) {}
    inject();
    return true;
  };
})();
