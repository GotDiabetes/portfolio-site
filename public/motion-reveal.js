/* ============================================================================
   Two reveals (styles in motion-reveal.css):

     1. [data-statement-reveal]: the sentence is split into words, each
        with its own window of the scroll in which it brightens. Where the
        browser has scroll-driven animations the windows are CSS
        animation-ranges and nothing runs per frame; elsewhere a scroll
        handler lights the words. Reduced motion, or ?classic: the words
        stay bright and whole.
     2. [data-band-sweep] (the black bands): a white cover with a yellow
        cord is laid over the band and slides off once, the first time the
        band comes into view. Not under reduced motion.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  if (root.classList.contains("classic")) return;
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var hasIO = "IntersectionObserver" in window;

  /* ------------------------------------------------ 1. The statement -- */
  var statements = document.querySelectorAll("[data-statement-reveal]");
  var timeline = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()"));

  Array.prototype.forEach.call(statements, function (el) {
    if (reduced) return;
    var text = el.textContent.replace(/\s+/g, " ").trim();
    if (!text) return;
    var words = text.split(" ");
    el.setAttribute("aria-label", text);          // read as one sentence
    el.textContent = "";
    var n = words.length;
    /* The words light between 10% and 46% of the band's way across the
       screen (0 = its top at the bottom edge, 100 = its bottom at the
       top), each over a window one and a half words wide, so they overlap
       into a sweep instead of ticking on one by one. */
    var start = 10, span = 36, step = span / n, win = step * 1.6;
    words.forEach(function (w, i) {
      var s = document.createElement("span");
      s.className = "sw";
      s.textContent = w + (i < n - 1 ? " " : "");
      s.setAttribute("aria-hidden", "true");
      if (timeline) {
        var a = start + i * step, b = Math.min(start + span + 6, a + win);
        s.style.animationRange = "cover " + a.toFixed(2) + "% cover " + b.toFixed(2) + "%";
      }
      el.appendChild(s);
    });
    el.classList.add("is-split");
    if (timeline) { el.classList.add("is-timeline"); return; }

    /* Fallback: the same windows, measured by hand. */
    var spans = el.querySelectorAll(".sw"), ticking = false;
    function update() {
      ticking = false;
      var r = el.getBoundingClientRect(), vh = window.innerHeight || 1;
      var p = ((vh - r.top) / (vh + r.height)) * 100;      // 0..100 as "cover"
      for (var i = 0; i < spans.length; i++) {
        var a = start + i * step, b = a + win;
        spans[i].classList.toggle("is-lit", p >= (a + b) / 2);
      }
    }
    function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  });

  /* ------------------------------------------------ 2. The net cord -- */
  if (reduced || !hasIO) return;
  var bands = document.querySelectorAll("[data-band-sweep]");
  Array.prototype.forEach.call(bands, function (band) {
    var r = band.getBoundingClientRect();
    /* A band already on screen at load (a short page, a deep link) just
       shows; the sweep is for bands the reader scrolls to. */
    if (r.top < (window.innerHeight || 0) * .85) return;
    var cover = document.createElement("div");
    cover.className = "band-cover";
    cover.setAttribute("aria-hidden", "true");
    cover.innerHTML = '<i class="band-cord"></i>';
    band.appendChild(cover);
    /* Sweeps on every arrival: once the band has left the screen entirely
       the cover is laid back over it (and the band's own court, drawn by
       motion.js, is cleared), so the next scroll down plays it again. */
    var court = band.querySelector(".contact-court");
    var settle = 0;
    var swept = function () { band.classList.add("has-swept"); };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.intersectionRatio >= 0.22 && !band.classList.contains("is-sweeping")) {
          band.classList.add("is-sweeping");
          if (court) court.classList.add("is-in");
          cover.addEventListener("animationend", swept, { once: true });
          settle = window.setTimeout(swept, 1400);
        } else if (!e.isIntersecting && band.classList.contains("is-sweeping")) {
          window.clearTimeout(settle);
          cover.removeEventListener("animationend", swept);
          band.classList.remove("is-sweeping", "has-swept");
          if (court) court.classList.remove("is-in");
        }
      });
    }, { threshold: [0, 0.22] });
    io.observe(band);
  });
})();
