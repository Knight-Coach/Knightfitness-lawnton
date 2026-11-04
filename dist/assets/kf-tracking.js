/*
 * Knight Fitness site tracking: GA4 + Meta Pixel, and one lead event per enquiry.
 *
 * Load in <head> with: <script src="/assets/kf-tracking.js"></script>
 * Call window.kfTrackLead({ site, source }) once an enquiry is confirmed sent.
 * GA4 gets `generate_lead`; Meta gets the standard `Lead` event.
 * Leave an ID empty ('') to switch that platform off.
 */
(function () {
  var GA4_ID = 'G-LPDJZ1128B';            // GA4 stream already on www.knightfitness.com.au
  var META_PIXEL_ID = '408666429737807';  // "Mark Knight's Pixel" (ad account 286353312016420), confirmed by the owner

  if (window.__kfTracking) return;
  window.__kfTracking = true;

  if (GA4_ID) {
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
  }

  if (META_PIXEL_ID) {
    /* Meta Pixel base code */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  window.kfTrackLead = function (meta) {
    meta = meta || {};
    var params = { site: meta.site || '', lead_source: meta.source || '', page_path: location.pathname };
    try { if (GA4_ID && window.gtag) window.gtag('event', 'generate_lead', params); } catch (e) {}
    try {
      if (META_PIXEL_ID && window.fbq) {
        var opts = meta.eventId ? { eventID: meta.eventId } : undefined;
        window.fbq('track', 'Lead', { content_name: params.lead_source || params.site }, opts);
      }
    } catch (e) {}
  };
})();
