/* ============================================================================
   The margin ball: adds the rail and the ball (motion-court.css does the
   rest, scroll-driven). It is decoration, so it is added here rather than
   written into the page, and only where the styles can show it.
   ========================================================================== */

(function () {
  "use strict";
  var root = document.documentElement;
  if (root.classList.contains("classic")) return;
  if (!(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"))) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var rail = document.createElement("div");
  rail.className = "scroll-ball";
  rail.setAttribute("aria-hidden", "true");
  rail.innerHTML = "<i></i>";
  document.body.appendChild(rail);
})();
