/* ============================================================
   BENO CAFÉ — le scroll verse le matcha, puis tourne autour
   ============================================================ */
(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var lenis = null;
  if (!reduceMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  var loader = document.getElementById('loader');
  window.addEventListener('load', function () {
    setTimeout(function () { loader.classList.add('is-done'); }, 500);
  });
  setTimeout(function () { loader.classList.add('is-done'); }, 2400);

  /* ---------------- sequence scrub ---------------- */
  var exp = document.getElementById('exp');
  var canvas = document.getElementById('seqCanvas');
  var pin = document.querySelector('.pin');

  fetch('img/seq2/manifest.json?v=4')
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (m) { setup(m.count, m.pad, m.ext, m.split, m.e1, m.s2); })
    .catch(function () { /* frames not built yet — static page */ });

  function setup(COUNT, PAD, EXT, SPLIT, E1, S2) {
    var ctx = canvas.getContext('2d');
    var frames = new Array(COUNT);
    var loaded = new Array(COUNT);
    var current = 0, target = 0, drawnFrame = -1;

    function src(i) {
      var n = String(i + 1); while (n.length < (PAD || 4)) n = '0' + n;
      return 'img/seq2/s_' + n + '.' + (EXT || 'jpg');
    }
    function load(i, cb) {
      if (frames[i]) return;
      var im = new Image();
      im.onload = function () { loaded[i] = true; if (cb) cb(); };
      im.src = src(i);
      frames[i] = im;
    }

    load(0, function () { drawnFrame = -1; });
    var q = 1;
    (function pump() {
      var batch = 0;
      while (q < COUNT && batch < 6) { load(q); q++; batch++; }
      if (q < COUNT) setTimeout(pump, 110);
    })();

    function nearestLoaded(i) {
      if (loaded[i]) return i;
      for (var d = 1; d < COUNT; d++) {
        if (i - d >= 0 && loaded[i - d]) return i - d;
        if (i + d < COUNT && loaded[i + d]) return i + d;
      }
      return -1;
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      drawnFrame = -1;
    }
    window.addEventListener('resize', resize);
    resize();

    function draw(i) {
      var im = frames[i];
      if (!im || !loaded[i]) return;
      var cw = canvas.width, ch = canvas.height;
      var ir = im.naturalWidth / im.naturalHeight, cr = cw / ch;
      var dw, dh, dx, dy;
      if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
      else { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
      ctx.drawImage(im, dx, dy, dw, dh);
      drawnFrame = i;
    }

    gsap.ticker.add(function () {
      current += (target - current) * 0.22;
      var i = nearestLoaded(Math.round(current));
      if (i !== -1 && i !== drawnFrame) draw(i);
    });

    /* UI elements */
    var dashes = document.querySelectorAll('#dashes i');
    var dots = document.querySelectorAll('#dots i');
    var phaseEls = document.querySelectorAll('#phases span');
    var finale = document.getElementById('finale');

    /* arrivée → versement → orbite → « à table » (bourikas & jus) → finale.
       Sans s2 : l'orbite s'étire ; sans e1 : pas de segment d'entrée. */
    var ENTRY_END = E1 ? 0.25 : 0;
    var POUR_END = 0.56, ORBIT_END = S2 ? 0.74 : 0.93, SPREAD_END = 0.93;
    var ENTRY_N = E1 || 1;
    var SPREAD_N = S2 || COUNT;
    if (!S2) {
      var ph5 = document.querySelector('#phases span[data-i="5"]');
      if (ph5) ph5.style.display = 'none';
    }
    var PHASE_RANGES = [
      [0, ENTRY_END],
      [Math.max(ENTRY_END, 0.001), 0.36],
      [0.36, 0.46],
      [0.46, POUR_END],
      [POUR_END, ORBIT_END],
      [ORBIT_END, SPREAD_END]
    ];

    ScrollTrigger.create({
      trigger: exp,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: function (self) {
        var p = self.progress;
        if (p > 0.005) exp.classList.add('is-started');

        var f;
        if (p <= ENTRY_END) f = (p / ENTRY_END) * (ENTRY_N - 1);
        else if (p <= POUR_END) f = (ENTRY_N - 1) + ((p - ENTRY_END) / (POUR_END - ENTRY_END)) * (SPLIT - ENTRY_N);
        else if (p <= ORBIT_END) f = (SPLIT - 1) + ((p - POUR_END) / (ORBIT_END - POUR_END)) * (SPREAD_N - SPLIT);
        else if (p <= SPREAD_END) f = (SPREAD_N - 1) + ((p - ORBIT_END) / (SPREAD_END - ORBIT_END)) * (COUNT - SPREAD_N);
        else f = COUNT - 1;
        target = Math.max(0, Math.min(COUNT - 1, f));

        var seg = Math.min(5, Math.floor(p * 6));
        dashes.forEach(function (d, i) { d.classList.toggle('is-on', i <= seg); });
        dots.forEach(function (d, i) { d.classList.toggle('is-on', i === seg); });

        phaseEls.forEach(function (el, i) {
          var r = PHASE_RANGES[i];
          el.classList.toggle('is-on', p >= r[0] && p < r[1]);
        });

        var fin = p > 0.94;
        pin.classList.toggle('is-finale', fin);
        finale.classList.toggle('is-on', fin);
      }
    });
  }
})();
