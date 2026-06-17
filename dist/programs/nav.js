// Mobile nav drawer toggle for the program pages.
// The desktop Programs dropdown is CSS-only (:hover / :focus-within);
// this only drives the hamburger drawer on small screens.
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var drawer = document.getElementById('mobile-nav');
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

  // Close when tapping the backdrop or following a link.
  drawer.addEventListener('click', function (e) {
    if (e.target === drawer || (e.target.closest && e.target.closest('.mobile-nav-panel a'))) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();
