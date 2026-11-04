/* ============================================================================
   The live lines on a split-flap board: the hero's two lines from the
   Worker (#nextOpen, the next open lesson, and #courtDay, the court's
   weather) arrive the way a departure board changes, every letter on its
   own black tile, flapping through a few others before it settles.
   After React Bits' SplitFlapText (reactbits.dev, MIT), rebuilt in plain JS.

   How it is wired: features.js fills each line (textContent, then hidden
   off) when the Worker answers. A MutationObserver here sees that and
   rebuilds the line as
     <span class="flap-sr">the sentence</span>        (visually hidden)
     <span class="flap-board" aria-hidden="true">tiles</span>
   so a screen reader hears the sentence once and never the tiles. A tile
   is one grapheme (Intl.Segmenter, so a Vietnamese letter with its marks
   is one tile, not three). Each word's tiles sit in a group that never
   breaks, so the board wraps between words as the sentence did; a space
   is a gap, not a tile. Chinese and Japanese have no spaces, so there
   any two characters may part, except before closing punctuation. The
   glyphs are drawn from a data attribute (flap.css), which keeps the
   line's textContent the sentence alone.

   The board is built in the same microtask that unhides the line, so the
   first paint already has its final height: no jump. The tiles start
   blank; when the line comes into view each one flaps through three to
   six of the line's own characters and lands on its own, left to right,
   about a second and a half in all. Once per new text: the reveal's
   replays (tennis.js) fade the line in again but don't rerun the board.

   Left as plain text: the Persian page (right to left, and its letters
   join, so they can't be cut into tiles) and ?classic. Under reduced
   motion the tiles are drawn already settled. #daylight is not touched.
   Styles in flap.css.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var lines = [document.getElementById("nextOpen"), document.getElementById("courtDay")].filter(Boolean);
  if (!lines.length || !window.MutationObserver || root.classList.contains("classic")) return;
  if ((root.getAttribute("dir") || "").toLowerCase() === "rtl") return;

  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var lang = root.getAttribute("lang") || "en";

  /* The component's mechanism (a front leaf falls from the top half, a
     back leaf lands on the bottom half, random glyphs before the target,
     staggered left to right) with timings fitted to a sentence: 85 ms a
     flip, 3 to 6 random glyphs, and the stagger worked out per line so the
     last tile lands about 1.5 s after the first one starts. LEAD lets the
     line's own fade (--d .26s) begin before the first flap. */
  var FLIP_MS = 85, FLIPS_MIN = 3, FLIPS_MAX = 6, TOTAL_MS = 1500, STAGGER_MAX = 45, LEAD_MS = 280, WAIT_MS = 2000;

  var NOBREAK = /^[   ]$/;   // the narrow space in "5 PM" holds its two sides together
  var SPACE = /^\s+$/;
  /* Han, kana, CJK punctuation and full-width forms: a Chinese or Japanese
     line may break between any two of them. Hangul is wide too, but Korean
     breaks at its spaces like English. */
  var CJK = /[⺀-〾぀-㏿㐀-䶿一-鿿豈-﫿︰-﹏＀-｠￠-￦]/;
  var WIDE = /[ᄀ-ᅟ⺀-〾぀-㏿㐀-䶿一-鿿ꥠ-꥿가-힣豈-﫿︰-﹏＀-｠￠-￦]/;
  /* Closing marks never start a line: they stay with the tile before. */
  var CLOSE = /^[、。々〉》」』】〕〜・ー！），．：；？]$/;

  var seg = null;
  try { if (window.Intl && Intl.Segmenter) seg = new Intl.Segmenter(lang, { granularity: "grapheme" }); } catch (e) { seg = null; }
  function graphemes(text) {
    return seg ? Array.from(seg.segment(text), function (s) { return s.segment; }) : Array.from(text);
  }

  /* One tile: two still halves that show the glyph at rest, and two
     leaves that only show mid-flip. Cloned from one template. */
  var proto = document.createElement("span");
  proto.className = "flap-tile";
  proto.innerHTML =
    '<span class="flap-half flap-half--top"><span class="flap-char"></span></span>' +
    '<span class="flap-half flap-half--bottom"><span class="flap-char"></span></span>' +
    '<span class="flap-leaf flap-leaf--front"><span class="flap-char"></span></span>' +
    '<span class="flap-leaf flap-leaf--back"><span class="flap-char"></span></span>';

  function makeTile(ch) {
    var el = proto.cloneNode(true);
    var wide = WIDE.test(ch);
    if (wide) el.className += " flap-tile--wide";
    var p = el.children;
    return { el: el, ch: ch, wide: wide, top: p[0].firstChild, bottom: p[1].firstChild,
             front: p[2], back: p[3], frontChar: p[2].firstChild, backChar: p[3].firstChild };
  }

  /* The sentence as tiles, grouped into units that never break inside. */
  function build(text) {
    var board = document.createElement("span");
    board.className = "flap-board";
    board.setAttribute("aria-hidden", "true");
    var tiles = [], narrow = [], wide = [], unit = null, lastCJK = false;
    function open() {
      unit = document.createElement("span");
      unit.className = "flap-unit";
      board.appendChild(unit);
    }
    graphemes(text).forEach(function (g) {
      if (NOBREAK.test(g)) {
        if (!unit) open();
        var gap = document.createElement("span");
        gap.className = "flap-gap";
        unit.appendChild(gap);
        lastCJK = false;
        return;
      }
      if (SPACE.test(g)) {
        if (unit) unit.className += " is-spaced";
        unit = null;
        lastCJK = false;
        return;
      }
      /* The middle dot joins two facts ("Next open lesson: Thu 11 AM · 30
         open hours this week"): on the board each gets its own row, rather
         than the second wrapping a lone word. The sentence keeps the dot. */
      if (g === "·") {
        var row = document.createElement("span");
        row.className = "flap-break";
        board.appendChild(row);
        unit = null;
        lastCJK = false;
        return;
      }
      var cjk = CJK.test(g);
      if (!unit || (!CLOSE.test(g) && (cjk || lastCJK))) open();
      lastCJK = cjk;
      var t = makeTile(g);
      unit.appendChild(t.el);
      tiles.push(t);
      var pool = t.wide ? wide : narrow;
      if (pool.indexOf(g) < 0) pool.push(g);
    });
    return { board: board, tiles: tiles, narrow: narrow, wide: wide };
  }

  /* At rest: both halves show the glyph and the leaves are hidden. */
  function rest(t, ch) {
    t.el.classList.remove("is-flipping");
    t.top.setAttribute("data-c", ch);
    t.bottom.setAttribute("data-c", ch);
    t.front.style.visibility = "hidden";
    t.back.style.visibility = "hidden";
    t.front.style.transform = "";
    t.back.style.transform = "";
  }
  /* Mid-flip: the top half already shows the next glyph, under the front
     leaf (the current one); the bottom half still shows the current one,
     about to be covered by the back leaf (the next). */
  function stage(t, cur, next) {
    t.el.classList.add("is-flipping");
    t.top.setAttribute("data-c", next);
    t.bottom.setAttribute("data-c", cur);
    t.frontChar.setAttribute("data-c", cur);
    t.backChar.setAttribute("data-c", next);
    t.front.style.visibility = "visible";
    t.back.style.visibility = "visible";
  }
  /* p runs 0..1 over one flip: the front leaf falls (easing in) in the
     first half, the back leaf lands (easing out) in the second. */
  function pose(t, p) {
    if (p < 0.5) {
      var k = p / 0.5;
      t.front.style.transform = "rotateX(" + (-90 * k * k).toFixed(2) + "deg)";
      t.back.style.transform = "rotateX(90deg)";
    } else {
      var q = (p - 0.5) / 0.5;
      q = 1 - (1 - q) * (1 - q);
      t.front.style.transform = "rotateX(-90deg)";
      t.back.style.transform = "rotateX(" + (90 - 90 * q).toFixed(2) + "deg)";
    }
  }

  /* A random glyph from the line's own characters, of the tile's width
     (a Chinese character would be cut off on a narrow tile), never the
     one just shown, and never the target as the last stop before it. */
  function pick(pool, a, b) {
    var free = pool.filter(function (g) { return g !== a && g !== b; });
    if (!free.length) free = pool;
    return free.length ? free[Math.floor(Math.random() * free.length)] : "";
  }
  function sequence(job, t) {
    var pool = t.wide ? job.wide : job.narrow;
    if (pool.length < 2) pool = job.narrow.concat(job.wide);
    var n = FLIPS_MIN + Math.floor(Math.random() * (FLIPS_MAX - FLIPS_MIN + 1));
    var seq = [], prev = "";
    for (var i = 0; i < n; i++) {
      prev = pick(pool, prev, i === n - 1 ? t.ch : prev);
      seq.push(prev);
    }
    seq.push(t.ch);
    return seq;
  }

  /* The cascade. The clock starts on the first frame, so a line that
     comes into view in a background tab plays when the tab is shown. */
  function run(job) {
    var n = job.tiles.length;
    var longest = (FLIPS_MAX + 1) * FLIP_MS;
    var stagger = n > 1 ? Math.max(0, Math.min(STAGGER_MAX, (TOTAL_MS - longest) / (n - 1))) : 0;
    var plans = job.tiles.map(function (t, i) {
      return { t: t, seq: sequence(job, t), start: i * stagger, step: -1, done: false };
    });
    var t0 = 0;
    function tick(now) {
      if (job.dead) return;
      if (!t0) t0 = now;
      var elapsed = now - t0, running = false;
      for (var i = 0; i < plans.length; i++) {
        var p = plans[i];
        if (p.done) continue;
        var local = elapsed - p.start;
        if (local < 0) { running = true; continue; }
        var step = Math.floor(local / FLIP_MS);
        if (step < p.seq.length) {
          running = true;
          if (step !== p.step) { p.step = step; stage(p.t, step === 0 ? "" : p.seq[step - 1], p.seq[step]); }
          pose(p.t, local / FLIP_MS - step);
        } else {
          p.done = true;
          rest(p.t, p.t.ch);
        }
      }
      job.raf = running ? requestAnimationFrame(tick) : 0;
    }
    job.raf = requestAnimationFrame(tick);
  }

  /* Run it when the line is on screen, not before. A browser always
     reports once right after observe(); one that has said nothing after
     two seconds never will (some embedded browsers), so it runs anyway,
     as heart.js does. */
  function arm(job) {
    function go() {
      if (job.dead || job.going) return;
      job.going = true;
      if (job.io) { job.io.disconnect(); job.io = null; }
      clearTimeout(job.wait);
      job.lead = setTimeout(function () { if (!job.dead) run(job); }, LEAD_MS);
    }
    if (!("IntersectionObserver" in window)) { go(); return; }
    var heard = false;
    job.io = new IntersectionObserver(function (entries) {
      heard = true;
      for (var i = 0; i < entries.length; i++) if (entries[i].isIntersecting) { go(); return; }
    });
    job.io.observe(job.line);
    job.wait = setTimeout(function () { if (!heard) go(); }, WAIT_MS);
  }

  function stop(job) {
    job.dead = true;
    if (job.raf) cancelAnimationFrame(job.raf);
    clearTimeout(job.lead);
    clearTimeout(job.wait);
    if (job.io) job.io.disconnect();
  }

  var jobs = [];

  function show(i, text) {
    var line = lines[i];
    if (jobs[i]) stop(jobs[i]);
    var built = build(text);
    var sr = document.createElement("span");
    sr.className = "flap-sr";
    sr.textContent = text;
    line.textContent = "";
    line.appendChild(sr);
    line.appendChild(built.board);
    line.classList.add("is-flap");
    var job = jobs[i] = { line: line, sr: sr, board: built.board, tiles: built.tiles,
                          narrow: built.narrow, wide: built.wide, raf: 0, io: null };
    built.tiles.forEach(function (t) { rest(t, reduced ? t.ch : ""); });
    if (!reduced) arm(job);
  }

  /* A line needs building when it is shown and what is in it is not our
     own board (features.js replaced it, or this is the first look). */
  function check() {
    lines.forEach(function (line, i) {
      if (line.hidden) return;
      var job = jobs[i];
      if (job && line.childNodes.length === 2 && job.sr.parentNode === line && job.board.parentNode === line) return;
      var text = (line.textContent || "").replace(/[ \t\n\r\f]+/g, " ").trim();
      if (text) show(i, text);
    });
    mo.takeRecords();   // our own rebuild is not news
  }

  var mo = new MutationObserver(check);
  lines.forEach(function (line) {
    mo.observe(line, { childList: true, attributes: true, attributeFilter: ["hidden"] });
  });
  /* The Worker may already have answered before this file ran. */
  check();
})();
