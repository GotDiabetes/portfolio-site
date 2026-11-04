/* ============================================================================
   Pen-drawn section headings (styles in stroke.css). A section heading
   used to rise through a mask (motion.js wraps its words in .rise and
   tennis.css lifts that line). Now, when the heading arrives (the page's
   reveal in tennis.js adds .is-in), its words are written out like a pen:
   an SVG laid exactly over the heading traces each letter's outline in
   turn, ink floods in behind the pen line by line, and then the SVG takes
   itself away and the real heading is there, as it always was.

   The real heading never moves or changes. While the pen draws, its words
   are only made transparent (data-stroke on the h2, read by stroke.css),
   so screen readers, find-in-page and copying keep the real text; the
   drawing is aria-hidden. Every letter is drawn where the browser itself
   put it: a Range over each grapheme of .rise gives its box, a zero-size
   probe gives the baseline, and the SVG text is set in the heading's own
   computed font. So it holds however the width wraps the heading, and in
   every left-to-right language: Chinese and Japanese have no spaces, so
   there a word is everything on one line, and each of their characters is
   placed one by one.

   Reveals replay (tennis.js): when a heading has left the screen, .is-in
   goes, and the heading waits, transparent, to be drawn again next time.

   Left exactly as before: the Persian page (right to left; its letters
   join, so it keeps the rise), reduced motion (tennis.css's fade), ?classic
   (the October comparison switch), and a page whose reveal never started.
   <html class="stroke-on"> and data-stroke tell stroke.css which headings
   are the pen's.

   After React Bits' StrokeText (reactbits.dev, MIT), rebuilt in plain JS.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var NS = "http://www.w3.org/2000/svg";
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }

  if (reduced() || root.classList.contains("classic")) return;
  if (root.dir === "rtl" || getComputedStyle(root).direction === "rtl") return;
  /* tennis.js marks <html> first thing; without it no .is-in will ever come,
     and tennis.css's failsafe shows the headings through the old rise. */
  if (!root.classList.contains("reveal-on")) return;
  if (!window.MutationObserver || !document.createRange || !window.requestAnimationFrame) return;

  /* The pen's timing, in seconds. Each letter takes DRAW to trace; their
     starts are STEP apart but spread over no more than SPREAD, however long
     the heading. Ink floods each line from FILL_AT after that line's first
     letter starts until its last letter is nearly traced. Then the pen
     line fades over FADE, so swapping back to the real text doesn't thin
     the letters by the stroke's width. A long heading takes about 1.3 s. */
  var DRAW = 0.8, STEP = 0.04, SPREAD = 0.42, FILL_AT = 0.45, FILL_MIN = 0.35, FILL_TAIL = 0.7, FADE = 0.25;

  /* Han, kana, Hangul and their punctuation: placed one by one, and their
     outlines run longer, so their dash is longer too. The dash restarts on
     every closed outline of a glyph (the outside of an O and its counter
     each get their own), so it only has to outlast the longest one. */
  var CJK = /[\u1100-\u11ff\u2e80-\u9fff\ua960-\ua97f\uac00-\ud7ff\uf900-\ufaff\uff00-\uffef]/;
  var DASH = 5, DASH_CJK = 8;      // in ems

  var FONT = ["font-family", "font-size", "font-weight", "font-style", "font-stretch", "font-kerning",
    "font-feature-settings", "font-variation-settings", "font-variant-ligatures", "font-variant-numeric",
    "letter-spacing", "text-transform"];

  var segmenter = null;
  try {
    if (window.Intl && Intl.Segmenter) segmenter = new Intl.Segmenter(root.lang || undefined, { granularity: "grapheme" });
  } catch (e) { segmenter = null; }

  /* A string as graphemes, each with its offset in the string (for the
     Range). Without Intl.Segmenter, code points, which split only the
     rare letter built from several. */
  function graphemes(str) {
    if (segmenter) return Array.from(segmenter.segment(str), function (s) { return { s: s.segment, i: s.index }; });
    var at = 0;
    return Array.from(str, function (ch) { var g = { s: ch, i: at }; at += ch.length; return g; });
  }

  function make(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function median(list) { var s = list.slice().sort(function (a, b) { return a - b; }); return s[s.length >> 1]; }

  /* ------------------------------------------------------ The headings -- */
  var heads = [];
  Array.prototype.forEach.call(document.querySelectorAll("main h2.fade"), function (h) {
    for (var c = h.firstElementChild; c; c = c.nextElementSibling) {
      if (c.classList.contains("rise")) {
        heads.push({ h: h, rise: c, state: "", token: 0, raf: 0, timer: 0, svg: null });
        return;
      }
    }
  });
  if (!heads.length) return;

  function setState(s, state) { s.state = state; s.h.setAttribute("data-stroke", state); }

  /* A heading already shown when this runs stays shown; the pen takes it
     from its next arrival. */
  heads.forEach(function (s) { setState(s, s.h.classList.contains("is-in") ? "done" : "wait"); });
  root.classList.add("stroke-on");

  var observer = new MutationObserver(function (records) {
    records.forEach(function (r) {
      for (var i = 0; i < heads.length; i++) if (heads[i].h === r.target) { sync(heads[i]); return; }
    });
  });
  heads.forEach(function (s) { observer.observe(s.h, { attributes: true, attributeFilter: ["class"] }); });

  function sync(s) {
    var on = s.h.classList.contains("is-in");
    if (on && s.state === "wait") start(s);
    else if (!on && s.state !== "wait") { stop(s); setState(s, "wait"); }
  }

  function stop(s) {
    s.token++;
    if (s.raf) cancelAnimationFrame(s.raf);
    clearTimeout(s.timer);
    s.raf = s.timer = 0;
    if (s.svg && s.svg.parentNode) s.svg.parentNode.removeChild(s.svg);
    s.svg = null;
  }
  function finish(s) { stop(s); setState(s, "done"); }

  /* The heading has arrived. An empty one (the tip of the week before
     features.js has filled it) or one that can't be watched (reduced
     motion turned on since load, a tab in the background) just shows. */
  function start(s) {
    if (!/\S/.test(s.rise.textContent) || reduced() || document.visibilityState !== "visible") { setState(s, "done"); return; }
    setState(s, "draw");
    var token = ++s.token;
    fontsReady(function (ok) {
      if (s.token !== token) return;
      if (!ok || !draw(s)) finish(s);
    });
  }

  /* The letters are measured in the face they will finally show in. If
     the webfont is still on its way after a moment, the heading shows
     without the pen rather than staying blank. */
  function fontsReady(then) {
    var fonts = document.fonts;
    if (!fonts || fonts.status === "loaded") { then(true); return; }
    var answered = false;
    var late = setTimeout(function () { if (!answered) { answered = true; then(false); } }, 1200);
    fonts.ready.then(function () {
      if (answered) return;
      answered = true;
      clearTimeout(late);
      then(true);
    });
  }

  /* ------------------------------------------------------ Measuring -- */
  // One read pass: the probe goes in, every box is read, the probe comes
  // out. Positions are relative to the heading's padding box, where the
  // SVG will sit.
  function measure(s) {
    var h = s.h, rise = s.rise;
    var probe = document.createElement("span");
    // A zero-size inline-block's bottom edge sits on the line's baseline.
    probe.style.cssText = "display:inline-block;width:0;height:0;margin:0;padding:0;border:0;vertical-align:baseline";
    rise.insertBefore(probe, rise.firstChild);

    var box = h.getBoundingClientRect();
    var ox = box.left + h.clientLeft, oy = box.top + h.clientTop;
    var out = null;
    if (box.width && box.bottom > 0 && box.top < (window.innerHeight || document.documentElement.clientHeight)) {
      var baseline = probe.getBoundingClientRect().top;
      var marks = [], fonts = [], range = document.createRange();
      var walker = document.createTreeWalker(rise, NodeFilter.SHOW_TEXT, null, false);
      for (var node = walker.nextNode(); node; node = walker.nextNode()) {
        collect(node, range, marks, fonts, ox);
        marks.push(null);                       // a word never runs across elements
      }
      out = { w: h.clientWidth, h: h.clientHeight, baseline: baseline - oy, oy: oy, marks: marks,
        delay: parseFloat(getComputedStyle(h).getPropertyValue("--d")) || 0 };
    }
    rise.removeChild(probe);
    return out;
  }

  function collect(node, range, marks, fonts, ox) {
    var host = node.parentNode, font = null;
    for (var f = 0; f < fonts.length; f++) if (fonts[f].el === host) font = fonts[f];
    if (!font) {
      var cs = getComputedStyle(host), css = "";
      FONT.forEach(function (p) { css += p + ":" + cs.getPropertyValue(p) + ";"; });
      font = { el: host, css: css, size: parseFloat(cs.fontSize) || 16 };
      fonts.push(font);
    }
    graphemes(node.nodeValue).forEach(function (g) {
      if (!/\S/.test(g.s)) { marks.push(null); return; }   // a space ends a word
      range.setStart(node, g.i);
      range.setEnd(node, g.i + g.s.length);
      var r = range.getBoundingClientRect();
      if (!r.width && !r.height) return;                  // collapsed: nothing drawn there
      marks.push({ s: g.s, font: font, x: r.left - ox, right: r.right - ox, top: r.top, ht: r.height, cjk: CJK.test(g.s) });
    });
  }

  /* -------------------------------------------------------- Drawing -- */
  var uid = 0;

  function draw(s) {
    var m = measure(s);
    if (!m) return false;
    var glyphs = m.marks.filter(Boolean);
    if (!glyphs.length) return false;

    // Lines: a letter whose box starts lower than half the last one's
    // height has wrapped. Each line's baseline is the probe's, moved down
    // by however far that line's boxes sit below the first line's.
    var lines = [], line = null, prev = null;
    glyphs.forEach(function (g) {
      if (!line || g.top > prev.top + prev.ht * 0.5) { line = { tops: [], glyphs: [] }; lines.push(line); }
      g.line = line;
      line.tops.push(g.top);
      line.glyphs.push(g);
      prev = g;
    });
    var firstTop = median(lines[0].tops);
    lines.forEach(function (l) { l.y = m.baseline + (median(l.tops) - firstTop); });

    // Words: broken at spaces, at elements and at the end of a line.
    var words = [], word = null;
    m.marks.forEach(function (g) {
      if (!g) { word = null; return; }
      if (!word || word.line !== g.line || word.font !== g.font) { word = { line: g.line, font: g.font, glyphs: [] }; words.push(word); }
      word.glyphs.push(g);
    });

    var n = glyphs.length;
    var step = n > 1 ? Math.min(STEP, SPREAD / (n - 1)) : 0;
    glyphs.forEach(function (g, i) { g.start = i * step; });

    var id = "stroke-" + (++uid);
    var size = glyphs[0].font.size;
    var svg = make("svg", { "class": "stroke-svg", width: m.w, height: m.h, viewBox: "0 0 " + m.w + " " + m.h, "aria-hidden": "true", focusable: "false" });
    var defs = make("defs", {}, svg);
    var ink = make("g", { fill: "currentColor", stroke: "none" }, svg);
    var pen = make("g", { fill: "none", stroke: "currentColor", "stroke-width": Math.min(1.75, Math.max(1, size / 30)).toFixed(2), "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);

    // Ink: each line's letters, uncovered left to right by a growing rect.
    var wipes = [], settle = (n - 1) * step + DRAW;
    lines.forEach(function (l, i) {
      var left = Infinity, right = -Infinity, fs = l.glyphs[0].font.size;
      l.glyphs.forEach(function (g) { left = Math.min(left, g.x); right = Math.max(right, g.right); });
      var clip = make("clipPath", { id: id + "-" + i, clipPathUnits: "userSpaceOnUse" }, defs);
      var x = left - fs * 0.2, full = right - left + fs * 0.4;
      var rect = make("rect", { x: x.toFixed(2), y: (l.y - fs * 1.3).toFixed(2), width: 0, height: (fs * 1.85).toFixed(2) }, clip);
      l.ink = make("g", { "clip-path": "url(#" + id + "-" + i + ")" }, ink);
      var a = l.glyphs[0].start + FILL_AT;
      var b = Math.max(a + FILL_MIN, l.glyphs[l.glyphs.length - 1].start + FILL_TAIL);
      wipes.push({ rect: rect, full: full, a: a, b: b, last: -1 });
      settle = Math.max(settle, b);
    });

    // The pen: one <text> per word at its measured x, on its line's
    // baseline, one <tspan> per letter so each traces in turn. The ink is
    // the same text without the dash.
    var traces = [];
    words.forEach(function (w) {
      var first = w.glyphs[0];
      var text = make("text", { x: first.x.toFixed(2), y: w.line.y.toFixed(2), style: w.font.css }, pen);
      var placeEach = w.glyphs.some(function (g) { return g.cjk; });
      w.glyphs.forEach(function (g) {
        var dash = (g.cjk ? DASH_CJK : DASH) * w.font.size;
        var span = make("tspan", { "stroke-dasharray": dash.toFixed(1), "stroke-dashoffset": dash.toFixed(1) }, text);
        if (placeEach) span.setAttribute("x", g.x.toFixed(2));
        span.textContent = g.s;
        traces.push({ el: span, dash: dash, start: g.start, last: -1 });
      });
      var fill = text.cloneNode(true);
      Array.prototype.forEach.call(fill.childNodes, function (t) { t.removeAttribute("stroke-dasharray"); t.removeAttribute("stroke-dashoffset"); });
      w.line.ink.appendChild(fill);
    });

    var fadeAt = settle - FADE * 0.6, total = fadeAt + FADE, penOpacity = 1;

    function paint(t) {
      var i, k;
      for (i = 0; i < traces.length; i++) {
        var tr = traces[i];
        k = easeOut(clamp01((t - tr.start) / DRAW));
        if (k !== tr.last) { tr.last = k; tr.el.setAttribute("stroke-dashoffset", (tr.dash * (1 - k)).toFixed(1)); }
      }
      for (i = 0; i < wipes.length; i++) {
        var wp = wipes[i];
        k = easeInOut(clamp01((t - wp.a) / (wp.b - wp.a)));
        if (k !== wp.last) { wp.last = k; wp.rect.setAttribute("width", (wp.full * k).toFixed(1)); }
      }
      k = 1 - clamp01((t - fadeAt) / FADE);
      if (k !== penOpacity) { penOpacity = k; pen.setAttribute("opacity", k.toFixed(3)); }
    }

    paint(0);
    s.svg = svg;
    s.h.appendChild(svg);

    var token = s.token;
    var t0 = performance.now() + m.delay * 1000;
    function tick(now) {
      s.raf = 0;
      if (s.token !== token) return;
      var t = (now - t0) / 1000;
      if (t >= total) { finish(s); return; }
      paint(t);
      s.raf = requestAnimationFrame(tick);
    }
    s.raf = requestAnimationFrame(tick);
    /* If frames stop coming (a hidden pane, a backgrounded tab), the real
       heading is put back anyway shortly after the pen would have ended. */
    s.timer = setTimeout(function () { if (s.token === token) finish(s); }, (m.delay + total) * 1000 + 600);
    return true;
  }

  /* A new width rewraps the heading under the drawing, so a heading being
     drawn just shows. (Height alone changes as a phone's address bar
     slides; that moves nothing.) */
  var lastWidth = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    heads.forEach(function (s) { if (s.state === "draw") finish(s); });
  });
})();
