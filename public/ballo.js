/* ============================================================================
   The ball in "lessons" — the hero headline's "o" is a tennis ball.

   The letter stays in the heading (so it still reads, copies and indexes as
   "lessons"); it is made transparent and an optic-yellow ball is drawn
   exactly over it, sized to the letter's real height. The size and position
   come from the font itself — the glyph's measured ascent/descent and the
   line's baseline — so it sits right in whatever system font the visitor's
   device uses, at any width.

   Once the words have risen in, the ball drops into its place from behind
   the line above and bounces three times before settling, once, on arrival.
   After that it is just the letter. Reduced motion: the ball simply sits
   there. No JS: a plain "o".

   The translated headlines have no "o" to borrow, so there the ball is the
   full stop: an empty .ball-stop slot at the end of the last word, a ball
   the size of an "o" in the same font, sitting on the baseline. No JS: no
   stop, which a headline doesn't need.
   ========================================================================== */

(function () {
  "use strict";

  var slot = document.querySelector(".ball-o");
  if (!slot || !document.createElement("canvas").getContext) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var still = function () { return reduce && reduce.matches; };

  var svgNS = "http://www.w3.org/2000/svg";
  var ball = document.createElementNS(svgNS, "svg");
  ball.setAttribute("viewBox", "0 0 24 24");
  ball.setAttribute("aria-hidden", "true");
  ball.setAttribute("class", "ball-o-ball");
  ball.innerHTML =
    '<defs><radialGradient id="ballOShade" cx="35%" cy="30%" r="75%">' +
    '<stop offset="0" stop-color="#fff" stop-opacity=".5"/>' +
    '<stop offset=".55" stop-color="#fff" stop-opacity="0"/>' +
    '<stop offset="1" stop-color="#5d6a00" stop-opacity=".4"/></radialGradient></defs>' +
    '<circle cx="12" cy="12" r="11.4" fill="#d9ef3f"/>' +
    '<circle cx="12" cy="12" r="11.4" fill="url(#ballOShade)"/>' +
    '<path d="M3 6.2c3.9 2.4 3.9 9.2 0 11.6M21 6.2c-3.9 2.4-3.9 9.2 0 11.6" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>';

  var probe = document.createElement("i");
  probe.className = "ball-o-probe";
  slot.insertBefore(probe, slot.firstChild);
  slot.appendChild(ball);
  slot.classList.add("is-ball");

  /* ------------------------------------------------------- Placement -- */
  var canvas = document.createElement("canvas").getContext("2d");
  var stop = slot.classList.contains("ball-stop");
  function place() {
    var cs = getComputedStyle(slot);
    canvas.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    var m = canvas.measureText("o");
    var asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
    if (!asc) return;                                  // no glyph metrics: leave the letter
    var left = -m.actualBoundingBoxLeft, right = m.actualBoundingBoxRight;
    /* A zero-height inline-block sits on the baseline, so its top is the
       baseline's distance from the top of the slot. */
    var baseline = probe.getBoundingClientRect().top - slot.getBoundingClientRect().top;
    var glyph = asc + desc;
    var d = glyph * 1.04;                              // a hair larger than the o: it's the hero
    var cx = stop ? slot.getBoundingClientRect().width / 2 : (left + right) / 2;
    var cy = baseline - (asc - desc) / 2;
    ball.style.width = ball.style.height = d + "px";
    ball.style.left = (cx - d / 2) + "px";
    ball.style.top = (cy - d / 2) + "px";
    return d;
  }
  var size = place();
  window.addEventListener("resize", function () { size = place() || size; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { size = place() || size; });

  /* ------------------------------------------------------------ Motion -- */
  var FALL = "cubic-bezier(.55, 0, 1, .45)";    // gathering speed toward the line
  var RISE = "cubic-bezier(0, .55, .45, 1)";    // losing it on the way up

  /* A run of bounces: the ball goes through each peak in turn and lands on
     the line between them, squashing a little less each time. Each leg's
     time grows with the square root of its height, as a real fall does. */
  function bounce(peaks, startHigh, duration, squash) {
    if (still() || !ball.animate) return null;
    var points = [];
    if (startHigh) points.push({ y: -peaks[0], up: true });
    else points.push({ y: 0 });
    peaks.forEach(function (p, i) {
      if (!(startHigh && i === 0)) points.push({ y: -p, up: true });
      points.push({ y: 0, land: true });
    });
    var legs = [], total = 0;
    for (var i = 1; i < points.length; i++) {
      var h = Math.abs(points[i].y - points[i - 1].y);
      legs.push(Math.sqrt(h) || 1); total += legs[legs.length - 1];
    }
    var t = 0, s = squash;
    var frames = points.map(function (p, i) {
      if (i > 0) t += legs[i - 1] / total;
      var squish = p.land && i < points.length - 1 ? s : 0;
      if (p.land) s *= .5;
      return {
        offset: Math.min(1, t),
        transform: "translateY(" + p.y.toFixed(2) + "px) scale(" + (1 + squish) + "," + (1 - squish) + ")",
        easing: p.up ? FALL : RISE,
      };
    });
    return ball.animate(frames, { duration: duration });
  }

  /* The entrance waits for the headline's own drop. It starts behind the
     line above (the line still clips, as it does for the words); once it
     has settled the clip is lifted, so later hops can clear the line. */
  var head = slot.closest(".hero-drop");
  function enter() {
    if (!size) return;
    var a = bounce([size * 1.7, size * .6, size * .2], true, 1000, .24);
    var settle = function () { if (head) head.classList.add("is-settled"); };
    if (a) a.onfinish = settle; else settle();
  }
  if (head) {
    if (head.classList.contains("is-in")) window.setTimeout(enter, 700);
    else new MutationObserver(function (_, obs) {
      if (!head.classList.contains("is-in")) return;
      obs.disconnect();
      window.setTimeout(enter, 950);
    }).observe(head, { attributes: true, attributeFilter: ["class"] });
  }

  /* That is the whole of it: the ball lands once and then is a letter. It
     is not a control (no hover, no click, no sound), so there is nothing a
     keyboard or screen-reader user can't reach. */
})();
