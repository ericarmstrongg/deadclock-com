/*
 * Deadclock landing page behavior. Loaded with defer. Everything here is progressive
 * enhancement: with JS off the page still reads top to bottom. (The Windows "Notify me"
 * buttons need JS: they are handled by notify.js.)
 *
 *  - header gets a background once you scroll
 *  - sections fade in as they scroll into view
 *  - [data-overlay] cards are live demos of the in-game overlay: timers count down,
 *    warn at 15s, flash at zero, and a caption stands in for the spoken callout
 *  - the hero tilts toward the pointer
 *  - [data-tabs] is the Windows app tour, [data-phones] is the iPhone coverflow
 *  - .card gets a cursor spotlight
 */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // Calls fn(true) when el is on screen and fn(false) when it leaves.
  function watch(el, fn, threshold) {
    if (!hasIO) { fn(true); return; }
    new IntersectionObserver(function (entries) {
      fn(entries[entries.length - 1].isIntersecting);
    }, { threshold: threshold || 0.2 }).observe(el);
  }

  // Reports to analytics.js, which may not be there (or may not be allowed to measure).
  function track(name, params) {
    if (window.dcTrack) window.dcTrack(name, params);
  }

  function retrigger(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  /* ---------- header ---------- */

  var header = $('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- reveal on scroll ---------- */

  var reveals = $$('.reveal');
  if (hasIO) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { revealer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- live overlay demos ---------- */

  function clock(t) {
    var s = t % 60;
    return Math.floor(t / 60) + ':' + (s < 10 ? '0' : '') + s;
  }

  function list(names) {
    if (names.length < 2) return names[0];
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  $$('[data-overlay]').forEach(function (card) {
    var host = card.closest('.hero-demo');
    var say = host && $('[data-say]', host);
    var sayText = say && $('span', say);
    var flashTarget = card.dataset.flash && $(card.dataset.flash);
    var sayTimer;
    var tickTimer;

    var rows = $$('.ov-row', card).map(function (el) {
      return {
        el: el,
        time: $('.ov-time', el),
        name: el.dataset.name,
        period: +el.dataset.p,
        t: +el.dataset.t,
        phase: el.dataset.phase || 'count',
        since: +el.dataset.since || 0,
        warned: false,
        shown: ''
      };
    });

    function render(r) {
      var state = r.phase === 'count' ? (r.t <= 15 ? 'near' : 'idle') : r.phase === 'now' ? 'now' : 'ago';
      if (state !== r.shown) {
        r.el.classList.toggle('is-near', state === 'near');
        r.el.classList.toggle('is-now', state === 'now');
        r.el.classList.toggle('is-ago', state === 'ago');
        r.shown = state;
      }
      if (r.phase === 'count') {
        r.time.textContent = clock(r.t);
        r.el.style.setProperty('--p', Math.max(0, 1 - r.t / r.period).toFixed(3));
      } else if (r.phase === 'now') {
        r.time.textContent = 'NOW';
      } else {
        r.time.textContent = r.since + 's ago';
      }
    }

    function speak(text) {
      if (!say) return;
      sayText.textContent = text;
      say.classList.add('show');
      clearTimeout(sayTimer);
      sayTimer = setTimeout(function () { say.classList.remove('show'); }, 3200);
    }

    function tick() {
      var warn = [];
      var fired = [];

      rows.forEach(function (r) {
        if (r.phase === 'count') {
          r.t -= 1;
          if (!r.warned && r.t <= 15 && r.t > 0) { r.warned = true; warn.push(r.name); }
          if (r.t <= 0) { r.phase = 'now'; r.since = 0; fired.push(r.name); }
        } else if (r.phase === 'now') {
          r.since += 1;
          if (r.since >= 3) r.phase = 'ago';
        } else {
          r.since += 1;
          if (r.since >= 9) { r.phase = 'count'; r.t = r.period; r.warned = false; }
        }
        render(r);
      });

      if (fired.length) {
        retrigger(card, 'flash');
        if (flashTarget && !reduce) retrigger(flashTarget, 'flash');
        speak(list(fired) + ' now');
      } else if (warn.length) {
        speak(list(warn) + ' in 15 seconds');
      }
    }

    rows.forEach(render);

    watch(card, function (on) {
      clearInterval(tickTimer);
      if (on) tickTimer = setInterval(tick, 1000);
    }, 0.25);
  });

  /* ---------- hero tilt ---------- */

  var hero = $('.hero');
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hero && finePointer && !reduce) {
    var heroBg = $('.hero-bg', hero);
    var heroCard = $('.hero-card', hero);

    hero.addEventListener('pointermove', function (e) {
      var box = hero.getBoundingClientRect();
      var x = (e.clientX - box.left) / box.width - 0.5;
      var y = (e.clientY - box.top) / box.height - 0.5;
      heroBg.style.setProperty('--px', (-x * 24).toFixed(1) + 'px');
      heroBg.style.setProperty('--py', (-y * 16).toFixed(1) + 'px');
      heroCard.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
      heroCard.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
    });

    hero.addEventListener('pointerleave', function () {
      ['--px', '--py'].forEach(function (v) { heroBg.style.removeProperty(v); });
      ['--rx', '--ry'].forEach(function (v) { heroCard.style.removeProperty(v); });
    });
  }

  /* ---------- windows app tour ---------- */

  var tour = $('[data-tabs]');
  if (tour) {
    var tabs = $$('.tab', tour);
    var panels = tabs.map(function (tab) { return $('#' + tab.getAttribute('aria-controls')); });
    var TOUR_MS = 7500;
    var current = 0;
    var picked = false;
    var tourOn = false;
    var tourTimer;

    tour.style.setProperty('--tab-ms', TOUR_MS + 'ms');

    var advance = function () {
      clearTimeout(tourTimer);
      if (picked || !tourOn || reduce) return;
      tourTimer = setTimeout(function () { select((current + 1) % tabs.length); }, TOUR_MS);
    };

    var select = function (i) {
      current = i;
      tabs.forEach(function (tab, k) {
        var on = k === i;
        tab.classList.remove('is-timing');
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
        panels[k].classList.toggle('is-active', on);
      });
      if (!picked && tourOn && !reduce) {
        void tabs[i].offsetWidth;
        tabs[i].classList.add('is-timing');
      }
      advance();
    };

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        picked = true;
        select(i);
        track('tour_tab', { tab: tab.dataset.tab });
      });
      tab.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        picked = true;
        var next = (i + step + tabs.length) % tabs.length;
        select(next);
        tabs[next].focus();
        track('tour_tab', { tab: tabs[next].dataset.tab });
      });
    });

    watch(tour, function (on) {
      tourOn = on;
      if (on) select(current);
      else { clearTimeout(tourTimer); tabs.forEach(function (tab) { tab.classList.remove('is-timing'); }); }
    }, 0.35);
  }

  /* ---------- iphone coverflow ---------- */

  var strip = $('[data-phones]');
  if (strip) {
    var phones = $$('.phone', strip);
    var count = phones.length;
    var half = Math.floor(count / 2);
    var caption = $('[data-cap]');
    var chips = $('[data-chips]');
    var active = 0;
    var phonesOn = false;
    var autoTimer;
    var swapTimer;

    var go = function (i) {
      active = (i + count) % count;

      phones.forEach(function (phone, k) {
        // Shortest signed distance around the loop, so the last screen sits next to the first.
        var d = ((k - active + count + half) % count) - half;
        phone.dataset.d = d;
        phone.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
      });

      $$('.chip', chips).forEach(function (chip, k) {
        chip.classList.toggle('is-active', k === active);
        chip.setAttribute('aria-pressed', k === active ? 'true' : 'false');
      });

      var phone = phones[active];
      caption.classList.add('swap');
      clearTimeout(swapTimer);
      swapTimer = setTimeout(function () {
        $('h3', caption).textContent = phone.dataset.title;
        $('p', caption).textContent = phone.dataset.sub;
        caption.classList.remove('swap');
      }, 180);

      if (phone.hasAttribute('data-buzz') && !reduce) {
        setTimeout(function () { retrigger(phone, 'buzz'); }, 450);
      }
    };

    var queue = function (delay) {
      clearTimeout(autoTimer);
      if (!phonesOn || reduce) return;
      autoTimer = setTimeout(function () { go(active + 1); queue(4800); }, delay);
    };

    // Only the visitor's own choices are reported, not the autoplay.
    var chose = function (k) {
      go(k);
      queue(10000);
      track('phone_screen', { screen: phones[active].dataset.tag });
    };

    phones.forEach(function (phone, k) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = phone.dataset.tag;
      chip.addEventListener('click', function () { chose(k); });
      chips.appendChild(chip);
    });

    var startX = null;
    var swiped = false;

    strip.addEventListener('pointerdown', function (e) { startX = e.clientX; swiped = false; });
    strip.addEventListener('pointercancel', function () { startX = null; });
    strip.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) < 40) return;
      swiped = true;
      chose((active + (dx < 0 ? 1 : -1) + count) % count);
    });
    strip.addEventListener('click', function (e) {
      if (swiped) { swiped = false; return; }
      var phone = e.target.closest('.phone');
      var k = phones.indexOf(phone);
      if (k > -1 && k !== active) chose(k);
    });
    strip.addEventListener('pointerenter', function () { clearTimeout(autoTimer); });
    strip.addEventListener('pointerleave', function () { queue(2500); });

    go(0);
    watch(strip, function (on) { phonesOn = on; if (on) queue(3500); else clearTimeout(autoTimer); }, 0.35);
  }

  /* ---------- card spotlight ---------- */

  if (finePointer) {
    $$('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var box = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - box.left) + 'px');
        card.style.setProperty('--my', (e.clientY - box.top) + 'px');
      });
    });
  }
})();
