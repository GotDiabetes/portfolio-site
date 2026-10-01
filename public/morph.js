/* ============================================================================
   Morph pill cards — the reviews on the tennis page.

   With JS, the reviews become a row of pills (photo and name) with one
   opened out into its full card. Hovering a pill (or tapping it, or
   pressing Enter on it) grows it into its card while the open one shrinks
   back to a pill: the box animates between the two measured sizes and the
   round photo swells into the card's portrait. One review is always open,
   so the page never hides all of its proof behind an interaction.

   Without JS the same markup shows every review as a full card.
   Reduced motion swaps instantly, without the morph.
   ========================================================================== */

(function () {
  "use strict";

  var list = document.querySelector("[data-morph]");
  if (!list) return;
  var items = Array.prototype.slice.call(list.querySelectorAll(".review"));
  if (items.length < 2) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)");
  var DURATION = 560;
  var open = 0;
  var clearTimer = 0;

  list.classList.add("morph-stage");

  /* Each pill gets a real button over it, so it can be reached and opened
     from the keyboard and announced as expandable. When its card is open
     the button stays (focus stays on it) but steps out of the way. */
  var buttons = items.map(function (item, i) {
    var name = (item.querySelector("figcaption strong") || {}).textContent || "this";
    var b = document.createElement("button");
    b.type = "button";
    b.className = "morph-hit";
    b.setAttribute("aria-label", "Read " + name.trim() + "'s review");
    b.addEventListener("click", function () { setOpen(i); });
    item.appendChild(b);

    item.addEventListener("mouseenter", function () {
      if (!finePointer || !finePointer.matches) return;
      window.clearTimeout(item._intent);
      /* A short beat of intent, so sweeping the pointer across the row on
         the way somewhere else doesn't flip the cards. */
      item._intent = window.setTimeout(function () { setOpen(i); }, 90);
    });
    item.addEventListener("mouseleave", function () { window.clearTimeout(item._intent); });
    return b;
  });

  render();
  fitStage();

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(fitStage, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitStage);

  function render() {
    items.forEach(function (item, i) {
      item.classList.toggle("is-open", i === open);
      buttons[i].setAttribute("aria-expanded", i === open ? "true" : "false");
    });
  }

  function setOpen(next) {
    if (next === open) return;
    var animate = !(reduce && reduce.matches);

    var before = animate ? items.map(rect) : null;
    open = next;
    render();
    if (!animate) return;

    /* FLIP on size: measure where every box ends up, put it back where it
       was, then let the CSS transition carry width and height across. */
    window.clearTimeout(clearTimer);
    items.forEach(function (el) { el.style.width = ""; el.style.height = ""; });
    var after = items.map(rect);
    items.forEach(function (el, k) {
      el.style.transition = "none";
      el.style.width = before[k].width + "px";
      el.style.height = before[k].height + "px";
    });
    void list.offsetWidth;   // commit the starting sizes
    items.forEach(function (el, k) {
      el.style.transition = "";
      el.style.width = after[k].width + "px";
      el.style.height = after[k].height + "px";
    });
    /* Hand sizing back to the stylesheet once settled, so the cards stay
       responsive. */
    clearTimer = window.setTimeout(function () {
      items.forEach(function (el) { el.style.width = ""; el.style.height = ""; });
    }, DURATION + 60);
  }

  /* The row holds its tallest arrangement (each card open in turn, with the
     others as pills — stacked, on a phone), so switching cards never moves
     the rest of the page. */
  function fitStage() {
    list.style.minHeight = "";
    items.forEach(function (el) {
      el.style.transition = "none";
      el.style.width = ""; el.style.height = "";
    });
    var max = 0;
    items.forEach(function (_, i) {
      items.forEach(function (el, k) { el.classList.toggle("is-open", k === i); });
      max = Math.max(max, list.getBoundingClientRect().height);
    });
    render();
    void list.offsetWidth;
    items.forEach(function (el) { el.style.transition = ""; });
    list.style.minHeight = Math.ceil(max) + "px";
  }

  function rect(el) { return el.getBoundingClientRect(); }
})();
