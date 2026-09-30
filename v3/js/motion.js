/* Nova motion + utilities. Plain JS, no framework. Respects prefers-reduced-motion.
   data-grain        -> adds film grain to dark surfaces
   data-marquee="40" -> first child scrolls left forever (seconds per loop); pauses on hover/focus
   data-reveal       -> clip-path image reveal when scrolled into view
   data-stamp        -> stamp drops in when visible; window.novaStamp(el) replays
   canvas[data-qr]   -> draws a deterministic QR-style code from the attribute string
   data-countdown="600" -> live mm:ss countdown
   data-ring="60"    -> SVG circle drains over N seconds (stroke-dasharray must be set)
   data-go="url#id"  -> click navigates (buttons in the prototype flow)
*/
(function () {
  if (window.__nova) return; window.__nova = 1;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
  var done = new WeakSet();
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) || 7; }
  function rng(seed) { return function () { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 10000) / 10000; }; }
  function qr(c) {
    var n = 29, px = c.width, s = px / (n + 2), ctx = c.getContext('2d'), r = rng(hash(c.dataset.qr || 'nova'));
    var fg = c.dataset.fg || '#15120F', bg = c.dataset.bg || '#FFFFFF';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, px, px); ctx.fillStyle = fg;
    function box(x, y, w, col) { ctx.fillStyle = col; ctx.fillRect(Math.round((x + 1) * s), Math.round((y + 1) * s), Math.ceil(w * s), Math.ceil(w * s)); }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var f = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!f && r() > .5) box(x, y, 1, fg);
    }
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (p) { box(p[0], p[1], 7, fg); box(p[0] + 1, p[1] + 1, 5, bg); box(p[0] + 2, p[1] + 2, 3, fg); });
  }
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); (e.target.dataset.stamp !== undefined ? stamp : reveal)(e.target); } });
  }, { threshold: .2 }) : null;
  function reveal(el) {
    el.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: 900, easing: 'cubic-bezier(.2,.7,.2,1)' });
    var img = el.querySelector('img'); if (img) img.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 1400, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
  function stamp(el) {
    if (reduce) return;
    el.animate([
      { transform: 'scale(2.6) rotate(-30deg)', opacity: 0 },
      { transform: 'scale(.92) rotate(-11deg)', opacity: 1, offset: .7 },
      { transform: 'scale(1) rotate(-12deg)', opacity: 1 }
    ], { duration: 650, delay: 350, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'backwards' });
  }
  window.novaStamp = function (sel) { document.querySelectorAll(sel || '[data-stamp]').forEach(function (el) { el.getAnimations().forEach(function (a) { a.cancel(); }); stamp(el); }); };
  function marquee(el) {
    if (reduce || !el.firstElementChild) return;
    var a = el.firstElementChild.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: (+el.dataset.marquee || 40) * 1000, iterations: Infinity });
    ['mouseenter', 'focusin'].forEach(function (e) { el.addEventListener(e, function () { a.pause(); }); });
    ['mouseleave', 'focusout'].forEach(function (e) { el.addEventListener(e, function () { a.play(); }); });
  }
  function countdown(el) {
    var t = +el.dataset.countdown;
    var tick = function () { var m = Math.floor(t / 60), s = t % 60; el.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; t = t > 0 ? t - 1 : +el.dataset.countdown; };
    tick(); setInterval(tick, 1000);
  }
  function ring(el) {
    if (reduce) return;
    var len = parseFloat(el.getAttribute('stroke-dasharray')) || 0;
    el.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: len }], { duration: (+el.dataset.ring || 60) * 1000, iterations: Infinity });
  }
  function scan() {
    document.querySelectorAll('[data-grain],[data-marquee],[data-reveal],[data-stamp],canvas[data-qr],[data-countdown],[data-ring]').forEach(function (el) {
      if (done.has(el)) return; done.add(el);
      var d = el.dataset;
      if (d.grain !== undefined) el.style.backgroundImage = GRAIN;
      if (d.marquee !== undefined) marquee(el);
      if (d.reveal !== undefined && io && !reduce) io.observe(el);
      if (d.stamp !== undefined && io) io.observe(el);
      if (d.qr !== undefined) qr(el);
      if (d.countdown !== undefined) countdown(el);
      if (d.ring !== undefined) ring(el);
    });
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-go]'); if (!b) return; var g = b.getAttribute('data-go'); if (g.charAt(0) === '#') { var el = document.getElementById(g.slice(1)); if (el) { history.replaceState(null, '', g); window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: reduce ? 'auto' : 'smooth' }); return; } } location.href = g; });
  var pend; new MutationObserver(function () { clearTimeout(pend); pend = setTimeout(scan, 120); }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState !== 'loading') scan(); else document.addEventListener('DOMContentLoaded', scan);
})();
