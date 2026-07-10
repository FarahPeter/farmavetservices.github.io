/* Farmavet Services — scroll narrative
   Architecture: one reveal IO, one farm-beats IO, one rAF scroll loop
   (reads batched before writes). */
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 1024px)');
  var finePointer = window.matchMedia('(pointer: fine)');
  var wideNav = window.matchMedia('(min-width: 900px)');

  // Safari <=13 has no MediaQueryList.addEventListener
  function onMQ(mql, fn) {
    if (mql.addEventListener) mql.addEventListener('change', fn);
    else if (mql.addListener) mql.addListener(fn);
  }

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
        // trap cycles through the burger (close control) plus the menu links
        var items = [burger].concat(Array.prototype.slice.call(menu.querySelectorAll('a')));
        var idx = items.indexOf(d.activeElement);
        if (idx === -1) { e.preventDefault(); items[0].focus(); return; }
        if (e.shiftKey && idx === 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    // leaving the mobile breakpoint with the sheet open would strand the scroll lock
    onMQ(wideNav, function () {
      if (wideNav.matches && !menu.hidden) setMenu(false);
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

  // keyboard users can Tab into content before it scrolls into view
  d.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest('[data-reveal]:not(.in)');
    if (el) { el.classList.add('in'); revealIO.unobserve(el); }
  });

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
    farm.classList.add('farm--js');
    activateBeat(0);
    // if the farm section is already near (e.g. resized up mid-page), load now;
    // otherwise the preload observer below fetches one viewport ahead
    if (farm.getBoundingClientRect().top < window.innerHeight * 2) loadStack();
    beatsIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          loadStack();
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
  onMQ(desktop, syncBeats);

  // fetch the stack one viewport ahead so the first crossfade never pops blank
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

  /* ---------- Pharmacy strip drift mode ---------- */
  var strip = d.querySelector('.strip');
  var stripTrack = d.querySelector('.strip__track');
  function syncDrift() {
    if (!strip || !stripTrack) return;
    var on = desktop.matches && finePointer.matches && !reduce.matches;
    strip.classList.toggle('drift', on);
    if (!on) stripTrack.style.transform = '';
  }
  syncDrift();
  onMQ(desktop, syncDrift);
  onMQ(finePointer, syncDrift);

  /* ---------- rAF scroll loop (batch reads, then writes) ---------- */
  var parallaxEls = Array.prototype.slice.call(d.querySelectorAll('[data-parallax]'))
    .map(function (el) {
      return { el: el, depth: parseFloat(el.getAttribute('data-parallax')), frame: el.closest('figure, .mega') || el };
    });
  var ticking = false;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function update() {
    ticking = false;
    var motion = !reduce.matches;

    /* -- reads -- */
    var y = window.pageYOffset;
    var vh = window.innerHeight;
    var max = root.scrollHeight - vh;
    var mRect = motion && words.length ? manifesto.getBoundingClientRect() : null;
    var pRects = motion ? parallaxEls.map(function (p) { return p.frame.getBoundingClientRect(); }) : null;
    var sRect = motion && strip && strip.classList.contains('drift') ? strip.getBoundingClientRect() : null;
    var sOverflow = sRect ? stripTrack.scrollWidth - strip.clientWidth : 0;

    /* -- writes -- */
    nav.classList.toggle('scrolled', y > 24);
    root.style.setProperty('--scroll-p', max > 0 ? (y / max).toFixed(4) : '0');
    if (cue && y > 40 && !cue.classList.contains('gone')) cue.classList.add('gone');

    if (!motion) {
      if (inkCount !== words.length) inkAll();
      return;
    }

    if (mRect) {
      var p = clamp01((vh * 0.8 - mRect.top) / (mRect.height + vh * 0.35));
      var count = Math.round(p * words.length * 1.1);
      if (count !== inkCount) {
        inkCount = count;
        words.forEach(function (w, i) { w.classList.toggle('ink', i < count); });
      }
    }

    parallaxEls.forEach(function (p, i) {
      var rect = pRects[i];
      if (rect.bottom < -80 || rect.top > vh + 80) return;
      var prog = (rect.top + rect.height / 2 - vh / 2) / vh;
      var shift = Math.max(-1, Math.min(1, prog)) * p.depth * rect.height * 0.5;
      p.el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
    });

    if (sRect && sRect.bottom > 0 && sRect.top < vh && sOverflow > 0) {
      var sp = clamp01((vh - sRect.top) / (vh + sRect.height));
      stripTrack.style.transform = 'translate3d(' + (-sp * sOverflow).toFixed(1) + 'px,0,0)';
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onMQ(reduce, function () {
    if (reduce.matches) {
      inkAll();
      parallaxEls.forEach(function (p) { p.el.style.transform = ''; });
    }
    syncDrift();
    onScroll();
  });
  update();
})();
