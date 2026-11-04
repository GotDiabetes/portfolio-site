/* ============================================================================
   The counting lead: the three numbers in the lead's first paragraph
   ("about 4,000 messages", "roughly 50 meetings", "Three Estonian schools")
   count up in place, once, as that paragraph arrives. "Three" counts 0 to 3
   in figures, then the word takes over.

   Markup (the real words, so without this script the sentence simply reads):
     <span class="count-up" data-count="4000">4,000</span>
     <span class="count-up" data-count="3" data-word="Three">Three</span>
   Each span's words move into .count-up__final, which stays in the DOM and
   is what a screen reader reads, invisible while a counting copy
   (.count-up__run, aria-hidden) runs beside it. The span is held at the
   width of its final text, in tabular figures, so the sentence never
   reflows. When a number lands, the copy is removed and the real words are
   back in the flow, exactly where they started.

   Wired to main.js's reveal, which hides .lead-body with .is-pending until
   it comes into view: the spans are built when the block is near the screen,
   and so while it is still hidden, then the count waits for the first number
   to be on screen and .is-pending to go. If the reveal has released the page
   instead (.is-pending gone, nothing animated), the count just runs.

   Reduced motion: nothing here happens at all, and the sentence is as written.

   The styles are in this file (the piece is too small for its own sheet).
   No colour of its own, so the theme needs nothing.

   After React Bits' CountUp (reactbits.dev, MIT), rebuilt in plain JS.
   ========================================================================== */

(function () {
  "use strict";

  var host = document.querySelector(".lead-body");
  if (!host) return;
  var spans = host.querySelectorAll(".count-up[data-count]");
  if (!spans.length) return;
  var motion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  if ((motion && motion.matches) || !window.requestAnimationFrame) return;

  /* In seconds: each number's run; the gap between one number's start and
     the next's; the wait after the paragraph is released, so the fast early
     figures aren't spent while it is still fading in; the word's cross-fade. */
  var DURATION = 1.8, STAGGER = 0.12, LEAD_IN = 0.6, SWAP = 0.25;

  var CSS =
    ".count-up--set{display:inline-block;position:relative;font-variant-numeric:tabular-nums}" +
    ".count-up.is-counting>.count-up__final{position:absolute;left:0;top:0;white-space:nowrap;opacity:0;transition:opacity " + SWAP + "s ease}" +
    ".count-up.is-counting>.count-up__run{-webkit-user-select:none;user-select:none;transition:opacity " + SWAP + "s ease}" +
    ".count-up.is-word>.count-up__final{opacity:1}" +
    ".count-up.is-word>.count-up__run{opacity:0}" +
    "@media print{.count-up__run{display:none}.count-up.is-counting>.count-up__final{position:static;opacity:1}}";

  var items = [], built = false, seen = false, begun = false, off = false;
  var raf = 0, safety = 0, watcher = null;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* React Bits' default ease-out, cubic-bezier(0.33, 1, 0.68, 1), solved for
     x by bisection. */
  function bezier(x1, y1, x2, y2) {
    function at(a, b, t) { return 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 24; i++) {
        var cx = at(x1, x2, t);
        if (Math.abs(cx - x) < 1e-5) break;
        if (cx < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return at(y1, y2, t);
    };
  }
  var ease = bezier(0.33, 1, 0.68, 1);

  /* The figures are written the way the page writes them: the separator
     comes from the span's own text ("4,000"), not from a locale. */
  function format(value, sep) {
    var digits = String(value);
    return sep ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : digits;
  }

  /* All the writes, all the reads, then all the writes again, so the block
     is laid out once. */
  function build() {
    if (built || off) return;
    built = true;

    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    Array.prototype.forEach.call(spans, function (el) {
      var to = parseInt(el.getAttribute("data-count"), 10);
      if (isNaN(to)) return;
      var group = /\d(\D)\d{3}(?!\d)/.exec(el.textContent);
      el.classList.add("count-up--set");
      items.push({ el: el, to: to, sep: group ? group[1] : "", word: el.hasAttribute("data-word"), final: null, run: null, shown: 0, ended: false });
    });

    var widths = items.map(function (it) { return it.el.getBoundingClientRect().width; });

    items.forEach(function (it, i) {
      var final = document.createElement("span");
      final.className = "count-up__final";
      while (it.el.firstChild) final.appendChild(it.el.firstChild);
      var run = document.createElement("span");
      run.className = "count-up__run";
      run.setAttribute("aria-hidden", "true");
      run.textContent = "0";
      it.el.style.minWidth = widths[i] + "px";
      it.el.classList.add("is-counting");
      it.el.appendChild(final);
      it.el.appendChild(run);
      it.final = final;
      it.run = run;
    });
  }

  /* The real words back in the flow. Safe to call twice. */
  function settle(it) {
    if (it.run && it.run.parentNode) it.el.removeChild(it.run);
    it.el.classList.remove("is-counting", "is-word");
    it.el.style.minWidth = "";
  }

  function stop() {
    off = true;
    if (raf) cancelAnimationFrame(raf);
    clearTimeout(safety);
    raf = 0;
    if (watcher) watcher.disconnect();
    document.removeEventListener("visibilitychange", begin);
    items.forEach(settle);
  }

  function land(it) {
    it.ended = true;
    it.run.textContent = format(it.to, it.sep);
    if (!it.word) { settle(it); return; }
    it.el.classList.add("is-word");
    setTimeout(function () { settle(it); }, SWAP * 1000 + 50);
  }

  /* Runs when anything it waits for changes: the first number on screen,
     the block released, the tab brought forward. */
  function begin() {
    if (begun || off || !seen || host.classList.contains("is-pending")) return;
    if (document.visibilityState !== "visible") return;
    begun = true;
    build();
    if (watcher) watcher.disconnect();
    document.removeEventListener("visibilitychange", begin);

    var delay = (parseFloat(getComputedStyle(host).getPropertyValue("--d")) || 0) + LEAD_IN;
    var t0 = performance.now() + delay * 1000;

    function frame(now) {
      raf = 0;
      var t = (now - t0) / 1000, running = false;
      items.forEach(function (it, i) {
        if (it.ended) return;
        var u = clamp01((t - i * STAGGER) / DURATION);
        if (u >= 1) { land(it); return; }
        running = true;
        var value = Math.round(it.to * ease(u));
        if (value !== it.shown) { it.shown = value; it.run.textContent = format(value, it.sep); }
      });
      if (running) raf = requestAnimationFrame(frame);
      else clearTimeout(safety);
    }
    raf = requestAnimationFrame(frame);

    /* If frames stop coming (a pane that went hidden), the sentence must
       not be left on a half-counted figure. */
    safety = setTimeout(stop, (delay + DURATION + STAGGER * items.length) * 1000 + 800);
  }

  /* Like heart.js: a browser always reports once right after observe(), so
     one that has said nothing after two seconds never will. */
  function whenSeen(el, margin, then) {
    if (!("IntersectionObserver" in window)) { then(); return; }
    var heard = false;
    var io = new IntersectionObserver(function (entries) {
      heard = true;
      if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); then(); }
    }, { rootMargin: margin });
    io.observe(el);
    setTimeout(function () { if (!heard) { io.disconnect(); then(); } }, 2000);
  }

  if (window.MutationObserver) {
    watcher = new MutationObserver(begin);
    watcher.observe(host, { attributes: true, attributeFilter: ["class"] });
  }
  document.addEventListener("visibilitychange", begin);

  /* Built ahead of the screen, so a reader never sees "4,000" snap to 0.
     Counted once the first number is in view, not merely the top of the
     block: on a phone the block starts well above its numbers. */
  whenSeen(host, "200px 0px", build);
  whenSeen(spans[0], "0px 0px -8% 0px", function () { seen = true; begin(); });

  if (motion && motion.addEventListener) {
    motion.addEventListener("change", function (e) { if (e.matches) stop(); });
  }
})();
