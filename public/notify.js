/*
 * "Notify me" for the Windows app, which isn't out yet. Loaded with defer on the home page.
 *
 * Every [data-notify="where"] button opens the #notify dialog. Two things get recorded, so a
 * visitor who is interested but doesn't leave an email still counts:
 *
 *   1. the press itself  -> POST /api/interest {kind: "click", source}  (once per button per visit)
 *   2. a submitted email -> POST /api/interest {kind: "email", source, email}
 *
 * Both land in the D1 database (see src/worker.js). Analytics only ever gets the event names and
 * the source, never the email address.
 */
(function () {
  'use strict';

  var dialog = document.getElementById('notify');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-notify]'));
  if (!dialog || !buttons.length || typeof dialog.showModal !== 'function') return;

  var form = dialog.querySelector('form');
  var ask = dialog.querySelector('.notify-ask');
  var done = dialog.querySelector('.notify-done');
  var input = form.elements.email;
  var trap = form.elements.website;
  var submit = form.querySelector('[type="submit"]');
  var error = dialog.querySelector('.notify-error');

  var KEY = 'dc-notify';
  var source = 'unknown';
  var counted = {};
  var joined = false;

  function track(name, params) {
    if (window.dcTrack) window.dcTrack(name, params);
  }

  function post(payload) {
    return fetch('/api/interest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    });
  }

  function remembered() {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }

  function remember() {
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* private mode: the buttons just won't remember */ }
  }

  // The buttons turn green once this device has left an email.
  function markDone() {
    joined = true;
    buttons.forEach(function (btn) {
      var icon = btn.querySelector('svg');
      var label = btn.querySelector('.btn-label');
      btn.classList.add('is-done');
      if (icon) icon.innerHTML = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';
      if (label) label.textContent = "You're on the list";
    });
  }

  function show(state) {
    ask.hidden = state === 'done';
    done.hidden = state !== 'done';
  }

  function fail(message) {
    error.textContent = message;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }

  function open(where) {
    source = where;
    error.hidden = true;
    input.removeAttribute('aria-invalid');

    if (joined) {
      show('done');
    } else {
      show('ask');
      if (!counted[where]) {
        counted[where] = true;
        post({ kind: 'click', source: where }).catch(function () {});
        track('notify_click', { source: where });
      }
    }

    dialog.showModal();
    if (!joined) input.focus();
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () { open(btn.getAttribute('data-notify')); });
  });

  dialog.querySelectorAll('[data-notify-close]').forEach(function (btn) {
    btn.addEventListener('click', function () { dialog.close(); });
  });

  // A click on the dimmed area behind the box lands on the dialog element itself.
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  // Closed without leaving an email. The click was already counted; this says they backed out.
  dialog.addEventListener('close', function () {
    if (!joined) track('notify_dismiss', { source: source });
  });

  input.addEventListener('input', function () {
    error.hidden = true;
    input.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = input.value.trim();
    if (!email || !input.checkValidity()) {
      fail("That email doesn't look right. Check it and try again.");
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending…';

    post({ kind: 'email', source: source, email: email, website: trap.value })
      .then(function (res) {
        if (res.ok) return true;
        return res.json().then(function (d) {
          fail(d && d.error === 'email'
            ? "That email doesn't look right. Check it and try again."
            : 'Something went wrong on our end. Try again in a moment.');
          return false;
        }, function () {
          fail('Something went wrong on our end. Try again in a moment.');
          return false;
        });
      }, function () {
        fail("Couldn't reach the server. Check your connection and try again.");
        return false;
      })
      .then(function (ok) {
        submit.disabled = false;
        submit.textContent = 'Notify me';
        if (!ok) return;
        remember();
        markDone();
        show('done');
        track('generate_lead', { method: 'windows_waitlist', source: source });
      });
  });

  if (remembered()) markDone();
})();
