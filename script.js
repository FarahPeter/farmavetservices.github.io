/* Farmavet Services — scroll narrative
   Architecture: one reveal IO, one farm-beats IO, one rAF scroll loop. */
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 1024px)');
  var finePointer = window.matchMedia('(pointer: fine)');

  /* ---------- Navigation ---------- */
  var nav = d.querySelector('.nav');
  var burger = d.querySelector('.nav__burger');
  var menu = d.getElementById('menu');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('open'); });
      d.body.style.overflow = 'hidden';
      var first = menu.querySelector('a');
      if (first) first.focus();
    } else {
      menu.classList.remove('open');
      menu.hidden = true;
      d.body.style.overflow = '';
    }
  }
  if (burger && menu) {
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) { setMenu(false); burger.focus(); }
    });
    d.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { setMenu(false); burger.focus(); }
      if (e.key === 'Tab') {
        var links = menu.querySelectorAll('a');
        var firstEl = links[0], lastEl = links[links.length - 1];
        if (e.shiftKey && d.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && d.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    });
  }

  /* ---------- Reveal on scroll (one-shot) ---------- */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
  d.querySelectorAll('[data-reveal]').forEach(function (el) { revealIO.observe(el); });

  /* ---------- Hero load sequence ---------- */
  var hero = d.querySelector('.hero');
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { hero.classList.add('loaded'); });
  });

  /* ---------- Manifesto word scrub ---------- */
  var manifesto = d.getElementById('manifesto-copy');
  var words = manifesto ? Array.prototype.slice.call(manifesto.querySelectorAll('span')) : [];
  var inkCount = -1;
  function inkAll() {
    words.forEach(function (w) { w.classList.add('ink'); });
    inkCount = words.length;
  }

  /* ---------- Farm sticky beats ---------- */
  var farm = d.querySelector('.farm');
  var beats = Array.prototype.slice.call(d.querySelectorAll('.beat'));
  var stackImgs = Array.prototype.slice.call(d.querySelectorAll('[data-beat-img]'));
  var railDots = Array.prototype.slice.call(d.querySelectorAll('.farm__rail i'));
  var beatsIO = null;
  var stackLoaded = false;

  function loadStack() {
    if (stackLoaded) return;
    stackLoaded = true;
    stackImgs.forEach(function (img) { img.src = img.getAttribute('data-src'); });
  }

  function activateBeat(i) {
    stackImgs.forEach(function (img, k) { img.classList.toggle('active', k === i); });
    railDots.forEach(function (dot, k) { dot.classList.toggle('on', k === i); });
    beats.forEach(function (b, k) { b.classList.toggle('active', k === i); });
  }

  function enableBeats() {
    if (beatsIO || !farm) return;
    loadStack();
    farm.classList.add('farm--js');
    activateBeat(0);
    beatsIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          activateBeat(parseInt(entry.target.getAttribute('data-beat'), 10));
        }
      });
    }, { threshold: 0.5 });
    beats.forEach(function (b) { beatsIO.observe(b); });
  }

  function disableBeats() {
    if (!beatsIO) return;
    beatsIO.disconnect();
    beatsIO = null;
    farm.classList.remove('farm--js');
    beats.forEach(function (b) { b.classList.remove('active'); });
  }

  function syncBeats() {
    if (desktop.matches) enableBeats(); else disableBeats();
  }
  syncBeats();
  desktop.addEventListener('change', syncBeats);

  // Preload the stack one viewport ahead even before first activation
  if (farm) {
    var preloadIO = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && desktop.matches) {
        loadStack();
        preloadIO.disconnect();
      }
    }, { rootMargin: '100%' });
    preloadIO.observe(farm);
  }

  /* ---------- Surgery photo gate ---------- */
  var gate = d.querySelector('.gate');
  if (gate) {
    gate.addEventListener('click', function () {
      var revealed = gate.classList.toggle('revealed');
      gate.querySelector('.gate__label').textContent =
        revealed ? 'Field surgery — tap to hide' : 'Field surgery — tap to view';
      gate.setAttribute('aria-label',
        revealed ? 'Hide field surgery photo' : 'Show field surgery photo (graphic)');
    });
  }

  /* ---------- Mega card pulse (once per session) ---------- */
  var mega = d.querySelector('.mega');
  if (mega) {
    var megaIO = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      megaIO.disconnect();
      var seen = false;
      try { seen = sessionStorage.getItem('fv-pulse') === '1'; } catch (e) {}
      if (!seen && !reduce.matches) {
        mega.classList.add('pulse');
        try { sessionStorage.setItem('fv-pulse', '1'); } catch (e) {}
        setTimeout(function () { mega.classList.remove('pulse'); }, 3000);
      }
    }, { threshold: 0.4 });
    megaIO.observe(mega);
  }

  /* ---------- Scroll cue ---------- */
  var cue = d.querySelector('.hero__cue');

  /* ---------- rAF scroll loop ---------- */
  var parallaxEls = Array.prototype.slice.call(d.querySelectorAll('[data-parallax]'));
  var strip = d.querySelector('.strip');
  var stripTrack = d.querySelector('.strip__track');
  var ticking = false;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function update() {
    ticking = false;
    var y = window.pageYOffset;
    var vh = window.innerHeight;

    // Nav state + scroll progress bar
    nav.classList.toggle('scrolled', y > 24);
    var max = root.scrollHeight - vh;
    root.style.setProperty('--scroll-p', max > 0 ? (y / max).toFixed(4) : '0');

    if (cue && y > 40 && !cue.classList.contains('gone')) cue.classList.add('gone');

    if (reduce.matches) {
      if (inkCount !== words.length) inkAll();
      return;
    }

    // Manifesto word scrub
    if (words.length) {
      var mRect = manifesto.getBoundingClientRect();
      var p = clamp01((vh * 0.8 - mRect.top) / (mRect.height + vh * 0.35));
      var count = Math.round(p * words.length * 1.1);
      if (count !== inkCount) {
        inkCount = count;
        words.forEach(function (w, i) { w.classList.toggle('ink', i < count); });
      }
    }

    // Parallax (inside overflow-hidden frames only)
    parallaxEls.forEach(function (el) {
      var frame = el.parentElement.getBoundingClientRect
        ? el.closest('figure, .mega') : null;
      var rect = (frame || el).getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > vh + 80) return;
      var depth = parseFloat(el.getAttribute('data-parallax'));
      var prog = (rect.top + rect.height / 2 - vh / 2) / vh; // -0.5..0.5-ish
      var shift = Math.max(-1, Math.min(1, prog)) * depth * rect.height * 0.5;
      el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
    });

    // Pharmacy strip drift (desktop fine-pointer only)
    if (strip && stripTrack && desktop.matches && finePointer.matches) {
      var sRect = strip.getBoundingClientRect();
      if (sRect.bottom > 0 && sRect.top < vh) {
        var overflow = stripTrack.scrollWidth - strip.clientWidth;
        if (overflow > 0) {
          var sp = clamp01((vh - sRect.top) / (vh + sRect.height));
          stripTrack.style.transform = 'translate3d(' + (-sp * overflow).toFixed(1) + 'px,0,0)';
        }
      }
    } else if (stripTrack && stripTrack.style.transform) {
      stripTrack.style.transform = '';
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  reduce.addEventListener('change', function () {
    if (reduce.matches) {
      inkAll();
      parallaxEls.forEach(function (el) { el.style.transform = ''; });
      if (stripTrack) stripTrack.style.transform = '';
    }
    onScroll();
  });
  update();
})();
