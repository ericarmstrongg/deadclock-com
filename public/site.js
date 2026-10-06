/*
 * Loaded in <head>, no defer, so data-platform is set before first paint.
 *
 * 1. Detects the visitor's platform and sets <html data-platform>. The CSS uses it
 *    to pick the main download button.
 * 2. On platforms that can't run the Windows app, "Download for Windows" opens a
 *    dialog instead of navigating. With JS off, or on an unknown platform, it is a
 *    plain link.
 * 3. Hides an image placeholder once its file exists, and an <img> whose file doesn't.
 *
 * Preview any state with ?platform=windows|ios|android|mac|linux|other
 */
(function () {
  var nav = navigator;
  var ua = nav.userAgent || '';
  var forced = /[?&]platform=(windows|ios|android|mac|linux|other)(?:&|$)/.exec(location.search);

  var platform = forced ? forced[1]
    // iPadOS reports a Mac user agent, so tell it apart by touch support.
    : /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1) ? 'ios'
    : /Android/.test(ua) ? 'android'
    : /Windows/.test(ua) ? 'windows'
    : /Macintosh|Mac OS X/.test(ua) ? 'mac'
    : /Linux|X11|CrOS/.test(ua) ? 'linux'
    : 'other';

  var root = document.documentElement;
  root.dataset.platform = platform;
  root.classList.add('js');

  document.addEventListener('DOMContentLoaded', function () {
    var cannotRunWindows = platform === 'ios' || platform === 'android' || platform === 'mac' || platform === 'linux';
    var dialog = document.getElementById('win-only');

    if (cannotRunWindows && dialog && dialog.showModal) {
      var copy = dialog.querySelector('[data-copy]');
      var copyLabel = copy.textContent;

      document.querySelectorAll('a[data-dl="windows"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
          // Let ctrl/cmd/shift/middle clicks do what the visitor asked for.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
          e.preventDefault();
          copy.textContent = copyLabel;
          dialog.showModal();
        });
      });

      copy.addEventListener('click', function () {
        var done = function (text) { copy.textContent = text; };
        if (!nav.clipboard) return done('Copy failed');
        nav.clipboard.writeText(location.origin + '/').then(
          function () { done('Copied'); },
          function () { done('Copy failed'); }
        );
      });

      // The dialog has no padding of its own, so a click on it is a click on the backdrop.
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) dialog.close();
      });
    }

    document.querySelectorAll('.frame > img').forEach(function (img) {
      var frame = img.parentNode;
      var show = function () { frame.classList.add('loaded'); };
      var drop = function () { img.remove(); };

      if (img.complete) {
        if (img.naturalWidth) show(); else drop();
      } else {
        img.addEventListener('load', show);
        img.addEventListener('error', drop);
      }
    });
  });
})();
