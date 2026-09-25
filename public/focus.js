/* ============================================================================
   Focus reveal — a camera-style focus frame that travels between the words
   of one line, sharpening the word it lands on while the rest go soft.

   Markup: any element with [data-focus-reveal] holding plain text. The
   script splits it into word boxes, keeps a visually hidden copy of the
   sentence for screen readers, and adds the frame.

   Behaviour, deliberately readable at rest:
     · when the line first comes into view the frame sweeps it once, word by
       word, like a lens pulling focus, then settles with every word sharp;
     · a mouse over the line brings the frame back and it follows the word
       under the pointer; leaving the line settles it again;
     · on touch, tapping a word focuses it briefly, then settles;
     · reduced motion, or no JavaScript: plain, sharp text, no frame.

   The frame's leading edge moves faster than its trailing edge, so on the
   way from one word to the next it stretches across both and then closes
   on the new one, instead of jumping. Every box is measured from the real
   layout, so it works at any font and size, and is re-measured on resize.

   Theming (custom properties on the element):
     --fr-color    bracket colour (currentColor)
     --fr-blur     blur on unfocused words (.06em)
     --fr-dim      opacity of unfocused words (.4)
     --fr-corner   bracket arm length (.26em)
     --fr-stroke   bracket stroke (2px)
   ========================================================================== */

(function () {
  "use strict";

  var nodes = document.querySelectorAll("[data-focus-reveal]");
  if (!nodes.length) return;

  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  nodes.forEach(mount);

  function mount(el) {
    var text = el.textContent.replace(/\s+/g, " ").trim();
    if (!text) return;

    /* ---------------------------------------------------------- DOM -- */
    var sr = document.createElement("span");
    sr.className = "fr-sr";
    sr.textContent = text;

    var line = document.createElement("span");
    line.className = "fr-line";
    line.setAttribute("aria-hidden", "true");

    var words = [];
    text.split(" ").forEach(function (w, i) {
      if (i) line.appendChild(document.createTextNode(" "));
      var s = document.createElement("span");
      s.className = "fr-word";
      s.textContent = w;
      line.appendChild(s);
      words.push(s);
    });

    var frame = document.createElement("span");
    frame.className = "fr-frame";
    frame.setAttribute("aria-hidden", "true");
    for (var k = 0; k < 4; k++) frame.appendChild(document.createElement("i"));

    el.textContent = "";
    el.appendChild(sr);
    el.appendChild(line);
    el.appendChild(frame);
    el.classList.add("fr-live");

    if (mq && mq.matches) return;   // reduced motion: sharp text, no frame

    /* ------------------------------------------------------ Geometry -- */
    var boxes = [];
    function measure() {
      var b = el.getBoundingClientRect();
      var pad = parseFloat(getComputedStyle(el).fontSize) * 0.1;
      boxes = words.map(function (w) {
        var r = w.getBoundingClientRect();
        return { l: r.left - b.left - pad, t: r.top - b.top - pad * 0.6,
                 r: r.right - b.left + pad, b: r.bottom - b.top + pad * 0.6 };
      });
    }

    var cur = null;       // the frame's current box
    var target = null;    // where it is heading
    var active = -1;
    var raf = 0;

    function paint() {
      frame.style.transform = "translate(" + cur.l + "px," + cur.t + "px)";
      frame.style.width = (cur.r - cur.l) + "px";
      frame.style.height = (cur.b - cur.t) + "px";
    }

    function step() {
      /* Leading edge fast, trailing edge slow: the frame stretches toward
         the new word and then closes on it. */
      var right = target.l > cur.l;
      var kLead = 0.34, kTrail = 0.17, kV = 0.26;
      cur.l += (target.l - cur.l) * (right ? kTrail : kLead);
      cur.r += (target.r - cur.r) * (right ? kLead : kTrail);
      cur.t += (target.t - cur.t) * kV;
      cur.b += (target.b - cur.b) * kV;
      paint();
      var done = Math.abs(target.l - cur.l) + Math.abs(target.r - cur.r) +
                 Math.abs(target.t - cur.t) + Math.abs(target.b - cur.b) < 0.4;
      if (done) { cur = copy(target); paint(); raf = 0; return; }
      raf = requestAnimationFrame(step);
    }

    function focus(i) {
      if (i === active && el.classList.contains("is-focusing")) return;
      if (active >= 0) words[active].classList.remove("is-focus");
      active = i;
      words[i].classList.add("is-focus");
      if (!boxes.length) measure();
      target = copy(boxes[i]);
      /* Coming out of rest, the frame appears on its word rather than
         flying in from wherever it was last left. */
      if (!cur || !el.classList.contains("is-focusing")) { cur = copy(target); paint(); }
      el.classList.add("is-focusing");
      if (!raf) raf = requestAnimationFrame(step);
    }

    function settle() {
      el.classList.remove("is-focusing");
      if (active >= 0) words[active].classList.remove("is-focus");
      active = -1;
    }

    /* ---------------------------------------------- Opening focus pull -- */
    var passTimer = 0, passing = false;

    function pass() {
      passing = true;
      var i = 0;
      (function next() {
        if (!passing) return;
        if (i >= words.length) {
          passTimer = setTimeout(function () { passing = false; settle(); }, 650);
          return;
        }
        focus(i);
        /* Longer words hold a little longer, the way an eye would. */
        var hold = 150 + 16 * words[i].textContent.length;
        i++;
        passTimer = setTimeout(next, hold);
      })();
    }
    function cancelPass() { passing = false; clearTimeout(passTimer); }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        /* Wait for the page's own reveal of this block to finish first. */
        setTimeout(function () { measure(); pass(); }, 500);
      }, { threshold: 0.7 });
      io.observe(el);
    }

    /* ----------------------------------------------------- Following -- */
    var leaveTimer = 0, tapTimer = 0;

    el.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var w = e.target.closest ? e.target.closest(".fr-word") : null;
      if (!w) return;
      cancelPass();
      clearTimeout(leaveTimer);
      focus(words.indexOf(w));
    });
    el.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "touch") return;
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(function () { if (!passing) settle(); }, 320);
    });
    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "touch") return;
      var w = e.target.closest ? e.target.closest(".fr-word") : null;
      if (!w) return;
      cancelPass();
      clearTimeout(tapTimer);
      focus(words.indexOf(w));
      tapTimer = setTimeout(settle, 1600);
    });

    /* ----------------------------------------------------- Lifecycle -- */
    function remeasure() {
      measure();
      if (active >= 0) { target = copy(boxes[active]); cur = copy(target); paint(); }
    }
    if ("ResizeObserver" in window) new ResizeObserver(remeasure).observe(el);
    else window.addEventListener("resize", remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

    if (mq && mq.addEventListener) {
      mq.addEventListener("change", function () {
        if (mq.matches) { cancelPass(); settle(); el.classList.add("fr-still"); }
        else el.classList.remove("fr-still");
      });
    }
  }

  function copy(b) { return { l: b.l, t: b.t, r: b.r, b: b.b }; }
})();
