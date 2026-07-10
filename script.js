/* Farmavet Services — scroll narrative
   Architecture: one reveal IO, one farm-beats IO, one rAF scroll loop
   (reads batched before writes). Pointer effects cache their rect on
   entry and write only rAF-throttled transforms / custom properties. */
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 1024px)');
  var finePointer = window.matchMedia('(pointer: fine)');
  var hoverable = window.matchMedia('(hover: hover)');
  var wideNav = window.matchMedia('(min-width: 900px)');

  // Safari <=13 has no MediaQueryList.addEventListener
  function onMQ(mql, fn) {
    if (mql.addEventListener) mql.addEventListener('change', fn);
    else if (mql.addListener) mql.addListener(fn);
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  // pointer-driven extras need a hovering fine pointer and motion allowed
  function pointerFine() { return finePointer.matches && hoverable.matches && !reduce.matches; }

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

  /* ---------- Desktop nav: morphing hover pill ---------- */
  var navLinksWrap = d.querySelector('.nav__links');
  var glide = null;
  var glideShown = false;

  function placeGlide(a) {
    if (!glide) return;
    if (!glideShown) glide.classList.add('snap');
    glide.style.width = a.offsetWidth + 'px';
    glide.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    glide.style.opacity = '1';
    if (!glideShown) {
      glideShown = true;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { if (glide) glide.classList.remove('snap'); });
      });
    }
  }
  function hideGlide() {
    glideShown = false;
    if (glide) glide.style.opacity = '0';
  }
  function syncGlide() {
    if (!navLinksWrap) return;
    if (wideNav.matches && finePointer.matches && hoverable.matches) {
      if (!glide) {
        glide = d.createElement('span');
        glide.className = 'nav__glide';
        glide.setAttribute('aria-hidden', 'true');
        navLinksWrap.insertBefore(glide, navLinksWrap.firstChild);
      }
      nav.classList.add('nav--glide');
    } else {
      nav.classList.remove('nav--glide');
      hideGlide();
    }
  }
  if (navLinksWrap) {
    navLinksWrap.addEventListener('pointerover', function (e) {
      if (!nav.classList.contains('nav--glide')) return;
      var a = e.target.closest('a');
      if (a) placeGlide(a);
    });
    navLinksWrap.addEventListener('pointerleave', hideGlide);
    navLinksWrap.addEventListener('focusin', function (e) {
      if (!nav.classList.contains('nav--glide')) return;
      var a = e.target.closest('a');
      if (a) placeGlide(a);
    });
    navLinksWrap.addEventListener('focusout', function (e) {
      if (!navLinksWrap.contains(e.relatedTarget)) hideGlide();
    });
    syncGlide();
    onMQ(wideNav, syncGlide);
    onMQ(finePointer, syncGlide);
    onMQ(hoverable, syncGlide);
  }

  /* ---------- Kicker print-wipe wrapper ----------
     the wipe clips an inner span: clipping the observed [data-reveal]
     element itself would zero its intersection area and the reveal IO
     (threshold .15) would never fire */
  d.querySelectorAll('.kicker[data-reveal]').forEach(function (k) {
    var inner = d.createElement('span');
    inner.className = 'kicker__in';
    while (k.firstChild) inner.appendChild(k.firstChild);
    k.appendChild(inner);
  });

  /* ---------- Heading word cascade (split once, before the reveal IO) ----------
     The real text stays in the a11y tree as an sr-only TEXT NODE (an
     aria-label would be skipped by page-translation tools); the animated
     copy is one aria-hidden container. */
  if (!reduce.matches) {
    d.querySelectorAll('.section-head h2[data-reveal], .doctor__text h2[data-reveal]').forEach(function (h) {
      var text = h.textContent;
      var sr = d.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      var vis = d.createElement('span');
      vis.setAttribute('aria-hidden', 'true');
      // split on plain spaces only — the &nbsp; in "Abou Nasser" stays one token
      text.split(' ').forEach(function (word, i) {
        if (i) vis.appendChild(d.createTextNode(' '));
        var outer = d.createElement('span');
        outer.className = 'w';
        outer.style.setProperty('--w', i);
        var inner = d.createElement('span');
        inner.className = 'w__in';
        inner.textContent = word;
        outer.appendChild(inner);
        vis.appendChild(outer);
      });
      h.textContent = '';
      h.appendChild(sr);
      h.appendChild(vis);
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

  /* ---------- Hero load sequence + exit dolly setup ---------- */
  var hero = d.querySelector('.hero');
  var heroCopy = d.querySelector('.hero__copy');
  var heroMedia = d.querySelector('.hero__media');
  var heroBottom = 0;
  var heroSettled = false;

  function measureHero() {
    if (heroMedia) heroBottom = heroMedia.getBoundingClientRect().bottom + window.pageYOffset;
  }
  measureHero();

  // the dolly scrub may only write transforms once the load unveil has
  // finished, otherwise its transition would ease every scroll frame
  var settleHero = function () {
    if (heroSettled) return;
    heroSettled = true;
    if (heroMedia) heroMedia.classList.add('settled');
  };
  if (heroMedia) {
    heroMedia.addEventListener('transitionend', function (e) {
      if (e.target === heroMedia) settleHero();
    });
  }
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      hero.classList.add('loaded');
      // armed here, not at parse time: rAF pauses in background tabs and
      // the fallback must never win the race against the unveil itself
      setTimeout(settleHero, 1600);
    });
  });

  function clearHeroScrub() {
    if (heroCopy) { heroCopy.style.transform = ''; heroCopy.style.opacity = ''; }
    if (heroMedia) heroMedia.style.transform = '';
  }
  onMQ(desktop, function () { if (!desktop.matches) clearHeroScrub(); });

  /* ---------- Manifesto word scrub + print trail ---------- */
  var manifesto = d.getElementById('manifesto-copy');
  var words = manifesto ? Array.prototype.slice.call(manifesto.querySelectorAll('span')) : [];
  var prints = Array.prototype.slice.call(d.querySelectorAll('.manifesto .print'));
  var inkCount = -1;
  var printCount = -1;
  function inkAll() {
    words.forEach(function (w) { w.classList.add('ink'); });
    prints.forEach(function (g) { g.classList.add('on'); });
    inkCount = words.length;
    printCount = prints.length;
  }

  /* ---------- Farm sticky beats + scrubbed shutter-wipe ---------- */
  var farm = d.querySelector('.farm');
  var beats = Array.prototype.slice.call(d.querySelectorAll('.beat'));
  var stackImgs = Array.prototype.slice.call(d.querySelectorAll('[data-beat-img]'));
  var wipes = Array.prototype.slice.call(d.querySelectorAll('.farm__wipe'));
  var railDots = Array.prototype.slice.call(d.querySelectorAll('.farm__rail i'));
  var beatsIO = null;
  var stackLoaded = false;
  var scrubOn = false;

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

  function disableScrub() {
    if (!scrubOn) return;
    scrubOn = false;
    if (farm) farm.classList.remove('farm--scrub');
    stackImgs.forEach(function (img) { img.style.transform = ''; });
    wipes.forEach(function (w) { w.style.transform = ''; });
    railDots.forEach(function (dot) { dot.style.removeProperty('--beatp'); });
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
    disableScrub();
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

  /* ---------- Magnetic CTAs ---------- */
  var magnets = Array.prototype.slice.call(d.querySelectorAll('.hero__ctas .pill, .nav__shop, .mega .pill--xl'));
  function clearMagnet(el) {
    el.classList.remove('magnet-live');
    el.style.setProperty('--mx', '0px');
    el.style.setProperty('--my', '0px');
  }
  magnets.forEach(function (el) {
    var rect = null;
    var mTick = false;
    var mx = 0, my = 0;
    el.addEventListener('pointerenter', function (e) {
      if (!pointerFine() || e.pointerType === 'touch') return;
      rect = el.getBoundingClientRect();
      el.classList.add('magnet-live');
    });
    el.addEventListener('pointermove', function (e) {
      if (!rect || !pointerFine()) return;
      mx = Math.max(-6, Math.min(6, (e.clientX - rect.left - rect.width / 2) * 0.18));
      my = Math.max(-6, Math.min(6, (e.clientY - rect.top - rect.height / 2) * 0.18));
      if (!mTick) {
        mTick = true;
        requestAnimationFrame(function () {
          mTick = false;
          if (!rect) return;
          el.style.setProperty('--mx', mx.toFixed(1) + 'px');
          el.style.setProperty('--my', my.toFixed(1) + 'px');
        });
      }
    });
    el.addEventListener('pointerleave', function () {
      rect = null;
      clearMagnet(el);
    });
  });

  /* ---------- Surgery photo gate ---------- */
  var gate = d.querySelector('.gate');
  if (gate) {
    gate.addEventListener('click', function () {
      var revealed = gate.classList.toggle('revealed');
      gate.querySelector('.gate__label').textContent =
        revealed ? 'Field surgery — tap to hide' : 'Field surgery — tap to view';
    });
  }

  /* ---------- Mega card: pulse + torchlight + watermark drift ---------- */
  var mega = d.querySelector('.mega');
  var megaTorch = mega ? mega.querySelector('.mega__torch') : null;
  var megaRect = null;
  var megaScrollY = 0;          // rects are viewport-relative: wheel-scrolling
                                // mid-hover must not leave the torch offset
  var megaTX = 0, megaTY = 0;   // cursor target, normalized ±1
  var megaPX = 0, megaPY = 0;   // lerped position consumed by the rAF loop
  var torchX = 0, torchY = 0;
  var torchTick = false;

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

  function moveTorch(x, y) {
    torchX = x; torchY = y;
    if (!torchTick) {
      torchTick = true;
      requestAnimationFrame(function () {
        torchTick = false;
        if (megaRect && megaTorch) {
          megaTorch.style.transform = 'translate3d(' + (torchX - 350).toFixed(0) + 'px,' + (torchY - 350).toFixed(0) + 'px,0)';
        }
      });
    }
  }
  if (mega && megaTorch) {
    mega.addEventListener('pointerenter', function (e) {
      if (!pointerFine() || e.pointerType === 'touch') return;
      megaRect = mega.getBoundingClientRect();
      megaScrollY = window.pageYOffset;
      megaTorch.classList.add('lit');
      moveTorch(e.clientX - megaRect.left, e.clientY - megaRect.top);
    });
    mega.addEventListener('pointermove', function (e) {
      if (!megaRect || !pointerFine()) return;
      var top = megaRect.top - (window.pageYOffset - megaScrollY);
      var x = e.clientX - megaRect.left;
      var y = e.clientY - top;
      megaTX = Math.max(-1, Math.min(1, (x / megaRect.width) * 2 - 1));
      megaTY = Math.max(-1, Math.min(1, (y / megaRect.height) * 2 - 1));
      moveTorch(x, y);
      onScroll(); // keep the shared loop ticking while the watermark lerps
    });
    mega.addEventListener('pointerleave', function () {
      megaRect = null;
      megaTX = 0; megaTY = 0;
      megaTorch.classList.remove('lit');
      onScroll();
    });
  }

  /* ---------- Contact tiles: cursor-tracking border glow ---------- */
  d.querySelectorAll('.contact__grid .tile').forEach(function (tile) {
    var rect = null;
    var sy = 0;
    var tick = false;
    var gx = 50, gy = 50;
    tile.addEventListener('pointerenter', function (e) {
      if (!pointerFine() || e.pointerType === 'touch') return;
      rect = tile.getBoundingClientRect();
      sy = window.pageYOffset;
    });
    tile.addEventListener('pointermove', function (e) {
      if (!rect || !pointerFine()) return;
      var top = rect.top - (window.pageYOffset - sy);
      gx = clamp01((e.clientX - rect.left) / rect.width) * 100;
      gy = clamp01((e.clientY - top) / rect.height) * 100;
      if (!tick) {
        tick = true;
        requestAnimationFrame(function () {
          tick = false;
          if (!rect) return;
          tile.style.setProperty('--gx', gx.toFixed(1) + '%');
          tile.style.setProperty('--gy', gy.toFixed(1) + '%');
        });
      }
    });
    tile.addEventListener('pointerleave', function () { rect = null; });
  });

  /* ---------- Footer curtain ---------- */
  var footerEl = d.querySelector('.footer');
  var footerGrid = d.querySelector('.footer__grid');
  var footerH = 0;
  var footerRO = null;
  var curtain = false;
  var lastCurtainP = -1;

  function measureFooter() {
    if (!footerEl) return;
    footerH = footerEl.offsetHeight;
    root.style.setProperty('--footer-h', footerH + 'px');
  }
  function syncCurtain() {
    var on = desktop.matches && !reduce.matches &&
      footerEl && footerGrid && 'ResizeObserver' in window;
    if (on === curtain) return;
    curtain = on;
    if (on) {
      measureFooter();
      d.body.classList.add('curtain');
      footerRO = new ResizeObserver(measureFooter);
      footerRO.observe(footerEl);
    } else {
      d.body.classList.remove('curtain');
      if (footerRO) { footerRO.disconnect(); footerRO = null; }
      footerGrid.style.transform = '';
      footerGrid.style.opacity = '';
      lastCurtainP = -1;
    }
    onScroll();
  }
  syncCurtain();
  onMQ(desktop, syncCurtain);
  // keyboard escape hatch: in curtain mode the footer sits behind main, so
  // focus landing on its links must bring the page to the bottom where the
  // footer is fully revealed (fixed elements never scroll into view)
  if (footerEl) {
    footerEl.addEventListener('focusin', function () {
      if (curtain) window.scrollTo(0, root.scrollHeight);
    });
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
      return {
        el: el,
        depth: parseFloat(el.getAttribute('data-parallax')),
        frame: el.closest('figure, .mega') || el,
        mark: el.classList.contains('mega__mark')
      };
    });
  var ticking = false;

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
    var beatRects = null;
    var farmAway = false;
    if (motion && beatsIO && stackLoaded && farm) {
      var fRect = farm.getBoundingClientRect();
      if (fRect.bottom > -40 && fRect.top < vh + 40) {
        beatRects = beats.map(function (b) { return b.getBoundingClientRect(); });
      } else {
        farmAway = true;
      }
    }

    /* -- writes -- */
    nav.classList.toggle('scrolled', y > 24);
    root.style.setProperty('--scroll-p', max > 0 ? (y / max).toFixed(4) : '0');
    if (cue && y > 40 && !cue.classList.contains('gone')) cue.classList.add('gone');

    if (!motion) {
      if (inkCount !== words.length) inkAll();
      return;
    }

    // mega watermark lerp step (consumed by the parallax writes below)
    var megaConverging = Math.abs(megaTX - megaPX) > 0.002 || Math.abs(megaTY - megaPY) > 0.002;
    if (megaConverging) {
      megaPX += (megaTX - megaPX) * 0.12;
      megaPY += (megaTY - megaPY) * 0.12;
    } else {
      megaPX = megaTX;
      megaPY = megaTY;
    }

    // hero exit dolly (desktop, once the load unveil has settled)
    if (heroSettled && desktop.matches && heroCopy && heroMedia && y < heroBottom) {
      var hp = clamp01(y / Math.max(1, heroBottom - vh * 0.2));
      heroCopy.style.transform = 'translate3d(0,' + (-hp * 40).toFixed(1) + 'px,0)';
      // dead zone: the CTAs never dim while the hero is still mostly on screen
      heroCopy.style.opacity = clamp01(1 - Math.max(0, hp - 0.25) * 1.5).toFixed(3);
      heroMedia.style.transform = 'scale(' + (1 - hp * 0.04).toFixed(4) + ')';
    }

    if (mRect) {
      var p = clamp01((vh * 0.8 - mRect.top) / (mRect.height + vh * 0.35));
      var count = Math.round(p * words.length * 1.1);
      if (count !== inkCount) {
        inkCount = count;
        words.forEach(function (w, i) { w.classList.toggle('ink', i < count); });
      }
      var pc = Math.round(p * prints.length * 1.15);
      if (pc !== printCount) {
        printCount = pc;
        prints.forEach(function (g, i) { g.classList.toggle('on', i < pc); });
      }
    }

    parallaxEls.forEach(function (p, i) {
      var rect = pRects[i];
      if (rect.bottom < -80 || rect.top > vh + 80) return;
      var prog = (rect.top + rect.height / 2 - vh / 2) / vh;
      var shift = Math.max(-1, Math.min(1, prog)) * p.depth * rect.height * 0.5;
      var dx = p.mark ? megaPX * 12 : 0;
      var dy = shift + (p.mark ? megaPY * 12 : 0);
      p.el.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
    });

    // farm shutter-wipe scrub: each wipe wrapper slides up while its image
    // counter-slides, revealing over the settled shot (transform-only)
    if (beatRects) {
      if (!scrubOn) {
        scrubOn = true;
        farm.classList.add('farm--scrub');
      }
      var t = beatRects.map(function (r) {
        return easeInOut(clamp01((vh * 0.75 - r.top) / (vh * 0.55)));
      });
      var w1 = ((1 - t[1]) * 100).toFixed(2);
      var w2 = ((1 - t[2]) * 100).toFixed(2);
      if (wipes[0] && stackImgs[1]) {
        wipes[0].style.transform = 'translate3d(0,' + w1 + '%,0)';
        stackImgs[1].style.transform = 'translate3d(0,-' + w1 + '%,0) scale(' + (1 + t[2] * 0.06).toFixed(4) + ')';
      }
      if (wipes[1] && stackImgs[2]) {
        wipes[1].style.transform = 'translate3d(0,' + w2 + '%,0)';
        stackImgs[2].style.transform = 'translate3d(0,-' + w2 + '%,0)';
      }
      if (stackImgs[0]) {
        stackImgs[0].style.transform = 'scale(' + (1 + t[1] * 0.06).toFixed(4) + ') translate3d(0,' + (-t[1] * 2).toFixed(2) + '%,0)';
      }
      railDots.forEach(function (dot, k) {
        dot.style.setProperty('--beatp', t[k].toFixed(3));
      });
    } else if (farmAway && scrubOn) {
      // section fully offscreen: release the promoted layers; the class
      // swap happens out of sight and re-engages on re-entry
      disableScrub();
    }

    if (sRect && sRect.bottom > 0 && sRect.top < vh && sOverflow > 0) {
      var sp = clamp01((vh - sRect.top) / (vh + sRect.height));
      stripTrack.style.transform = 'translate3d(' + (-sp * sOverflow).toFixed(1) + 'px,0,0)';
    }

    // footer curtain: the end card settles into place as the page runs out
    if (curtain && footerGrid) {
      var rp = clamp01((y + vh - (max + vh - footerH)) / Math.max(1, footerH));
      if (rp !== lastCurtainP) {
        lastCurtainP = rp;
        footerGrid.style.transform = 'translate3d(0,' + ((1 - rp) * -28).toFixed(1) + 'px,0)';
        footerGrid.style.opacity = (0.4 + rp * 0.6).toFixed(3);
      }
    }

    if (megaConverging) onScroll();
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measureHero(); onScroll(); });
  window.addEventListener('load', function () { measureHero(); onScroll(); });
  onMQ(reduce, function () {
    if (reduce.matches) {
      inkAll();
      parallaxEls.forEach(function (p) { p.el.style.transform = ''; });
      clearHeroScrub();
      disableScrub();
      magnets.forEach(clearMagnet);
      megaTX = megaTY = megaPX = megaPY = 0;
      if (megaTorch) { megaTorch.classList.remove('lit'); megaRect = null; }
    }
    syncDrift();
    syncCurtain();
    onScroll();
  });
  update();
})();
