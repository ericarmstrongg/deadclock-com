/*
 * Analytics for deadclock.gg: Google Analytics 4, in a property of its own so website visits never
 * mix with the iPhone app's numbers. Loaded with defer on every page.
 *
 * It does nothing until MEASUREMENT_ID is filled in: no requests, no cookies, no banner.
 *
 * Privacy:
 *  - Visitors who send Global Privacy Control or Do Not Track are not measured.
 *  - Visitors in the EEA, UK and Switzerland (found by /api/geo) are asked first. Nothing from
 *    Google loads until they accept. Their choice is kept in localStorage, and a footer link
 *    reopens it.
 *  - Everywhere else analytics starts straight away.
 *  - Ad features are off, and no email address or other personal data is ever sent.
 *
 * Other scripts report through window.dcTrack(name, params). Calls made before the visitor's
 * choice is known are held back, then sent or dropped.
 */
(function () {
  'use strict';

  // The Measurement ID of the website's GA4 data stream, like "G-ABC123XYZ9".
  var MEASUREMENT_ID = '';

  var CHOICE = 'dc-analytics'; // localStorage: "yes" or "no"
  var pending = [];
  var live = false;
  var closed = !MEASUREMENT_ID;

  if (MEASUREMENT_ID && !/^G-[A-Z0-9]+$/.test(MEASUREMENT_ID)) {
    console.warn('analytics.js: MEASUREMENT_ID should look like G-ABC123XYZ9');
    closed = true;
  }

  window.dcTrack = function (name, params) {
    if (closed) return;
    if (live) window.gtag('event', name, params || {});
    else pending.push([name, params]);
  };

  if (closed) return;
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1') {
    closed = true;
    return;
  }

  function saved() {
    try { return localStorage.getItem(CHOICE); } catch (e) { return null; }
  }

  function save(value) {
    try { localStorage.setItem(CHOICE, value); } catch (e) { /* private mode: ask again next visit */ }
  }

  function start() {
    closed = false;
    if (live) return;
    window['ga-disable-' + MEASUREMENT_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(s);

    live = true;
    pending.splice(0).forEach(function (e) { window.gtag('event', e[0], e[1] || {}); });
  }

  function stop() {
    closed = true;
    live = false;
    pending.length = 0;
    window['ga-disable-' + MEASUREMENT_ID] = true;
    // Remove the _ga cookies Google may already have set, on this host and on the parent domain.
    var domains = ['', '; domain=' + location.hostname, '; domain=.' + location.hostname.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0) return;
      domains.forEach(function (d) { document.cookie = name + '=; Max-Age=0; path=/' + d; });
    });
  }

  function choose(yes) {
    save(yes ? 'yes' : 'no');
    if (yes) start(); else stop();
  }

  /* ---------- the ask, for visitors who need to be asked ---------- */

  var bar;

  function ask() {
    if (bar) return;
    bar = document.createElement('div');
    bar.className = 'consent';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Analytics');
    bar.innerHTML =
      '<p>We use Google Analytics cookies to count visits and see which parts of the site get used. ' +
      'No ads, and nothing is sold. <a href="/privacy#website">Details</a></p>' +
      '<div class="consent-actions">' +
      '<button class="btn" type="button" data-choice="no">No thanks</button>' +
      '<button class="btn btn-primary" type="button" data-choice="yes">Accept</button>' +
      '</div>';
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-choice]');
      if (!b) return;
      choose(b.getAttribute('data-choice') === 'yes');
      bar.remove();
      bar = null;
    });
    document.body.appendChild(bar);
  }

  function settingsLink() {
    var links = document.querySelector('.footer-links');
    if (!links) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'linkbtn';
    b.textContent = 'Analytics settings';
    b.addEventListener('click', ask);
    links.appendChild(b);
  }

  // Asks the edge where the visitor is. If it can't answer in time, ask rather than assume.
  function needsAsking() {
    var late = new Promise(function (resolve) { setTimeout(function () { resolve(true); }, 3000); });
    var geo = fetch('/api/geo', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { return !!d.consent; }, function () { return true; });
    return Promise.race([geo, late]);
  }

  var choice = saved();
  if (choice === 'yes') { start(); settingsLink(); }
  else if (choice === 'no') { stop(); settingsLink(); }
  else {
    needsAsking().then(function (asked) {
      if (!asked) { start(); return; }
      ask();
      settingsLink();
    });
  }

  /* ---------- what to measure ---------- */

  function place(el) {
    var s = el.closest('main section[id], .site-header, .site-footer');
    if (!s) return 'page';
    return s.id || (s.classList.contains('site-header') ? 'header' : 'footer');
  }

  // Link clicks: App Store, email, and which nav or footer links get used.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.hostname === 'apps.apple.com') window.dcTrack('app_store_click', { location: place(a) });
    else if (a.protocol === 'mailto:') window.dcTrack('email_click', { location: place(a) });
    else if (a.closest('.site-header')) window.dcTrack('nav_click', { target: a.getAttribute('href') });
    else if (a.closest('.site-footer')) window.dcTrack('footer_click', { target: a.getAttribute('href') });
  });

  // Which sections people scroll to. A section counts once it crosses the middle of the screen,
  // so tall sections on a phone still count.
  if ('IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        seen.unobserve(entry.target);
        window.dcTrack('section_view', { section: entry.target.id });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('main section[id]'), function (s) { seen.observe(s); });
  }
})();
