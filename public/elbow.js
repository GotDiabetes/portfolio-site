/* ============================================================================
   The tennis elbow figure on the practice tips page (/tips/#elbow).

   Two buttons above the drawing choose its view, "What goes wrong" or "The
   fix" (the figure's data-state; elbow.css crossfades the two). Resting
   the pointer on a legend item, or tapping it, brings up the view it
   belongs to and lifts its number in the drawing (data-hot). Nothing moves
   until someone does one of those; the jolt arcs ripple once when the
   strain view is chosen, and not under reduced motion.
   ========================================================================== */

(function () {
  "use strict";

  var fig = document.getElementById("elbow-figure");
  if (!fig) return;
  var tabs = fig.querySelectorAll(".elbow-tab");
  var items = fig.querySelectorAll(".elbow-list li[data-mark]");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var joltTimer = 0;

  function setState(state) {
    if (fig.getAttribute("data-state") === state) return;
    fig.setAttribute("data-state", state);
    Array.prototype.forEach.call(tabs, function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-state") === state ? "true" : "false");
    });
    fig.classList.remove("is-jolting");
    window.clearTimeout(joltTimer);
    if (state === "strain" && !reduce) {
      void fig.offsetWidth;                       // restart the ripple
      fig.classList.add("is-jolting");
      joltTimer = window.setTimeout(function () { fig.classList.remove("is-jolting"); }, 1400);
    }
  }

  function setHot(li) {
    Array.prototype.forEach.call(items, function (x) { x.classList.toggle("is-hot", x === li); });
    if (li) {
      fig.setAttribute("data-hot", li.getAttribute("data-mark"));
      var list = li.closest(".elbow-list");
      if (list) setState(list.getAttribute("data-state"));
    } else {
      fig.removeAttribute("data-hot");
    }
  }

  Array.prototype.forEach.call(tabs, function (b) {
    b.addEventListener("click", function () { setHot(null); setState(b.getAttribute("data-state")); });
  });

  Array.prototype.forEach.call(items, function (li) {
    li.addEventListener("pointerenter", function (e) { if (e.pointerType !== "touch") setHot(li); });
    li.addEventListener("pointerleave", function (e) { if (e.pointerType !== "touch") setHot(null); });
    li.addEventListener("click", function () { setHot(li.classList.contains("is-hot") ? null : li); });
  });
})();
