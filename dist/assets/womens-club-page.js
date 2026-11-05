/*
 * Behaviour for the Women's Club page. The markup is already in the HTML.
 * This replaces the old in-browser React/Babel runtime: sticky call bar,
 * quiz, videos, count-up numbers, scroll reveal, and hover styles.
 */
(function () {
  var hovers = document.querySelectorAll('[style-hover]');
  if (hovers.length) {
    var css = '';
    for (var i = 0; i < hovers.length; i++) {
      hovers[i].classList.add('kf-h' + i);
      css += '.kf-h' + i + ':hover{' + hovers[i].getAttribute('style-hover') + '}';
    }
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  var bar = document.getElementById('kfStickyCta');
  var booking = document.getElementById('booking');
  var update = function () {
    if (!bar) return;
    var past = window.scrollY > 480;
    var bookingVisible = false;
    if (booking) {
      var r = booking.getBoundingClientRect();
      bookingVisible = r.top < window.innerHeight * 0.9 && r.bottom > 80;
    }
    var nearBottom = (window.innerHeight + window.scrollY) > (document.body.scrollHeight - 150);
    bar.style.transform = (past && !bookingVisible && !nearBottom) ? 'translateY(0)' : 'translateY(140%)';
  };
  if (bar) {
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  document.querySelectorAll('[data-yt]').forEach(function (el) {
    var play = function () {
      var id = el.getAttribute('data-yt');
      if (el.dataset.loaded) return;
      el.dataset.loaded = '1';
      var src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1&origin=' + encodeURIComponent(location.origin);
      el.innerHTML = '<div style="position:relative;width:100%;aspect-ratio:16/9;"><iframe src="' + src + '" title="Women\'s Club testimonial" style="position:absolute;inset:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>';
    };
    el.addEventListener('click', play);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
    });
  });

  var quiz = document.getElementById('kfQuiz');
  if (quiz) {
    var steps = Array.prototype.slice.call(quiz.querySelectorAll('[data-quiz-step]'));
    var result = quiz.querySelector('[data-quiz-result]');
    var dots = Array.prototype.slice.call(quiz.querySelectorAll('[data-quiz-dot]'));
    var cur = 0;
    var paint = function (i) {
      dots.forEach(function (d, idx) { d.style.background = idx <= i ? 'hsl(330 81% 60%)' : 'hsl(330 40% 85%)'; });
    };
    quiz.querySelectorAll('[data-quiz-advance]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        steps[cur].style.display = 'none';
        cur++;
        if (cur < steps.length) {
          steps[cur].style.display = 'block';
          paint(cur);
        } else {
          if (result) result.style.display = 'block';
          paint(steps.length - 1);
        }
      });
    });
  }

  var hv = document.getElementById('kfHannahVideo');
  var hp = document.getElementById('kfHannahPlay');
  if (hv && hp) {
    hp.addEventListener('click', function () {
      if (hv.dataset.lazysrc && !hv.src) hv.src = hv.dataset.lazysrc;
      hv.play();
    });
    hv.addEventListener('play', function () { hp.style.display = 'none'; });
    hv.addEventListener('pause', function () { hp.style.display = 'flex'; });
    hv.addEventListener('ended', function () { hp.style.display = 'flex'; });
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n, comma) { return comma ? Math.round(n).toLocaleString('en-US') : String(Math.round(n)); };
  var runCount = function (el) {
    var target = parseFloat(el.getAttribute('data-kf-count'));
    var suffix = el.getAttribute('data-kf-suffix') || '';
    var comma = el.getAttribute('data-kf-comma') === '1';
    if (reduce) { el.textContent = fmt(target, comma) + suffix; return; }
    var dur = 1400, t0 = performance.now();
    var tick = function (now) {
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased, comma) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-kf-count]'));
  if ('IntersectionObserver' in window && counters.length) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  }

  var sections = Array.prototype.slice.call(document.querySelectorAll('section'));
  var revealTargets = sections.slice(1);
  if (!reduce && 'IntersectionObserver' in window) {
    revealTargets.forEach(function (el) {
      el.setAttribute('data-kf-reveal', '');
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      el.style.transition = 'opacity .6s ease-out, transform .6s ease-out';
    });
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'none';
          ro.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function (el) { ro.observe(el); });
    setTimeout(function () {
      revealTargets.forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
    }, 2500);
  }

  var vids = Array.prototype.slice.call(document.querySelectorAll('video[autoplay]'));
  if ('IntersectionObserver' in window && vids.length) {
    var vo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { var p = e.target.play(); if (p && p.catch) p.catch(function () {}); }
        else e.target.pause();
      });
    }, { threshold: 0.25 });
    vids.forEach(function (v) { vo.observe(v); });
  }
})();
