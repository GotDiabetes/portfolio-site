/* ============================================================================
   The net cord (styles in motion-reveal.css): on [data-band-sweep] (the
   black bands) a white cover with a yellow cord is laid over the band and
   slides off as the band comes into view, and again on every later
   arrival once the band has left the screen entirely. Not under reduced
   motion or ?classic.

   (The statement band once lit up word by word with the scroll here; it
   uses the focus frame now, data-focus-reveal in focus.js.)
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  if (root.classList.contains("classic")) return;
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var hasIO = "IntersectionObserver" in window;

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
       motion.js, is cleared), so the next scroll down plays it again. The
       court is looked up each time rather than once here: motion.js runs
       after this file and only then draws it. */
    var settle = 0;
    var swept = function () { band.classList.add("has-swept"); };
    var io = new IntersectionObserver(function (entries) {
      var court = band.querySelector(".contact-court");
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
