// Program page nav: scroll-state (transparent → white, logo swap) + mobile drawer.
(function () {
  var nav    = document.getElementById('main-nav');
  var logo   = document.getElementById('nav-logo-img');
  var toggle = document.querySelector('.nav-toggle');
  var drawer = document.getElementById('mobile-nav');

  // Scroll state: transparent over hero → solid white
  if (nav) {
    function onScroll() {
      var scrolled = window.scrollY > 60;
      nav.classList.toggle('scrolled', scrolled);
      if (logo) {
        logo.src = scrolled
          ? '/assets/lov/logo-dark.webp'
          : '/assets/lov/logo-light.webp';
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile drawer toggle
  if (!toggle || !drawer) return;

  function setOpen(open) {
    drawer.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  drawer.addEventListener('click', function (e) {
    if (e.target === drawer || (e.target.closest && e.target.closest('.mobile-nav-panel a'))) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();
