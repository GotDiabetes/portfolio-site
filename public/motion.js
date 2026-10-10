/* ============================================================================
   Section signatures that need a script (the rest is CSS, in tennis.css
   under SECTION SIGNATURES). No libraries.

     1. Prices roll in like a scoreboard
     2. A light follows the pointer over the lesson cards and the contact band
     3. Big Book and Email buttons lean toward the pointer
     4. The contact band's court draws its lines when the band arrives
     5. The lightbox zooms out of the photograph that was pressed

   Everything here is an enhancement over a page that already reads: with
   no script nothing is hidden, and reduced motion keeps the prices still,
   the buttons still and the court already drawn.
   ========================================================================== */

(function () {
  "use strict";

  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var finePointer = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  var hasIO = "IntersectionObserver" in window;

  function onceVisible(el, fn, margin) {
    if (!hasIO) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.disconnect();
        fn();
      });
    }, { threshold: 0.2, rootMargin: margin || "0px" });
    io.observe(el);
  }

  /* ------------------------------------------------- 0. Heading rise -- */
  // Each section heading's text goes into one inner line, which the CSS
  // masks and lifts; the heading itself stays unmasked so the page's reveal
  // still sees it arrive.
  document.querySelectorAll("main h2.fade").forEach(function (h) {
    if (h.querySelector(".rise")) return;
    var rise = document.createElement("span");
    rise.className = "rise";
    while (h.firstChild) rise.appendChild(h.firstChild);
    h.appendChild(rise);
  });

  /* -------------------------------------------------- 1. Scoreboard -- */
  // The first number in each price turns into columns of digits that roll
  // up and stop on the real figure, the rightmost spinning longest. The
  // columns are hidden from screen readers; a visually hidden copy of the
  // number keeps the price reading as it always did.
  if (!reduced) {
    document.querySelectorAll(".hero-facts dd, .lesson-list .lesson .price").forEach(function (el) {
      var node = null;
      for (var c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3 && /[0-9]/.test(c.nodeValue)) { node = c; break; }
      }
      if (!node) return;
      var m = node.nodeValue.match(/[0-9]+/);
      var num = m[0];
      var before = document.createTextNode(node.nodeValue.slice(0, m.index));
      var after = document.createTextNode(node.nodeValue.slice(m.index + num.length));

      var board = document.createElement("span");
      board.className = "sb";
      board.setAttribute("aria-hidden", "true");
      num.split("").forEach(function (ch, i) {
        var d = +ch;
        var turns = 6 + i * 3;                    // later digits spin more
        var col = document.createElement("span");
        col.className = "sb-col";
        var strip = document.createElement("span");
        strip.style.setProperty("--n", String(turns));
        strip.style.setProperty("--i", String(i));
        for (var k = 0; k <= turns; k++) {
          var cell = document.createElement("span");
          // Drawn by CSS (attr), so the spinning digits are never part of
          // the page's text: copying the price, or a search engine reading
          // it, gets only the real number in .sb-sr.
          cell.setAttribute("data-d", String(((d - turns + k) % 10 + 10) % 10));
          strip.appendChild(cell);
        }
        col.appendChild(strip);
        board.appendChild(col);
      });
      var sr = document.createElement("span");
      sr.className = "sb-sr";
      sr.textContent = num;

      var parent = node.parentNode;
      parent.insertBefore(before, node);
      parent.insertBefore(board, node);
      parent.insertBefore(sr, node);
      parent.insertBefore(after, node);
      parent.removeChild(node);

      // Start once the block holding the price has begun to arrive.
      var host = el.closest(".fade") || el;
      var delay = parseFloat(getComputedStyle(host).getPropertyValue("--d")) || 0;
      board.style.setProperty("--sb-d", (delay + 0.28) + "s");
      onceVisible(host, function () {
        // A tab that isn't being drawn would freeze the roll partway, so
        // there the price simply stays as it is: the real number.
        if (document.visibilityState !== "visible") return;
        board.classList.add("is-reset");
        void board.offsetWidth;                    // commit the start position
        board.classList.remove("is-reset");
        board.classList.add("is-rolling");
      });
    });
  }

  /* ------------------------------------------------ 2. Pointer light -- */
  function follow(el, onMove, onLeave) {
    var raf = 0, x = 0, y = 0;
    el.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = el.getBoundingClientRect();
        onMove(x - r.left, y - r.top, r);
      });
    });
    el.addEventListener("pointerleave", function () { if (onLeave) onLeave(); });
  }

  if (finePointer) {
    document.querySelectorAll(".lesson").forEach(function (card) {
      follow(card, function (x, y) {
        card.style.setProperty("--mx", x + "px");
        card.style.setProperty("--my", y + "px");
      });
    });

    var band = document.querySelector(".contact");
    if (band) {
      follow(band, function (x, y) {
        band.style.setProperty("--mx", x + "px");
        band.style.setProperty("--my", y + "px");
        band.classList.add("is-lit");
      }, function () { band.classList.remove("is-lit"); });
    }
  }

  /* --------------------------------------------- 3. Magnetic buttons -- */
  // The large buttons drift a few pixels toward the pointer while it's over
  // them and spring back when it leaves. Translate only, so the Book FX
  // squash and the hover lift (both transforms) still apply on top.
  if (finePointer && !reduced) {
    document.querySelectorAll(".btn-lg").forEach(function (btn) {
      follow(btn, function (x, y, r) {
        var dx = (x - r.width / 2) / (r.width / 2);
        var dy = (y - r.height / 2) / (r.height / 2);
        btn.classList.add("is-magnet");
        btn.style.setProperty("--tx", (dx * 7).toFixed(2) + "px");
        btn.style.setProperty("--ty", (dy * 5).toFixed(2) + "px");
      }, function () {
        btn.classList.remove("is-magnet");
        btn.style.setProperty("--tx", "0px");
        btn.style.setProperty("--ty", "0px");
      });
    });
  }

  /* ------------------------------------------------- 4. The court -- */
  // A tennis court seen from above and tipped back, in faint white lines
  // behind "Let's get you on court". Each line is drawn in order: the
  // outside, the singles lines, the service lines, the centre, the net.
  var contact = document.querySelector(".contact");
  if (contact) {
    var NS = "http://www.w3.org/2000/svg";
    var holder = document.createElement("div");
    holder.className = "contact-court";
    holder.setAttribute("aria-hidden", "true");
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "-2 -3 82 42");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("focusable", "false");
    svg.style.transform = "perspective(1100px) rotateX(50deg) rotateZ(-7deg)";
    var lines = [
      // [x1, y1, x2, y2, delay, width]
      [0, 0, 78, 0, 0, .16], [78, 0, 78, 36, .12, .16], [78, 36, 0, 36, .24, .16], [0, 36, 0, 0, .36, .16],
      [0, 4.5, 78, 4.5, .5, .12], [0, 31.5, 78, 31.5, .58, .12],
      [18, 4.5, 18, 31.5, .78, .12], [60, 4.5, 60, 31.5, .84, .12],
      [18, 18, 60, 18, .98, .12],
      [0, 18, .9, 18, 1.1, .12], [77.1, 18, 78, 18, 1.1, .12],
      [39, -2.2, 39, 38.2, 1.2, .26],
    ];
    lines.forEach(function (l) {
      var p = document.createElementNS(NS, "line");
      p.setAttribute("x1", l[0]); p.setAttribute("y1", l[1]);
      p.setAttribute("x2", l[2]); p.setAttribute("y2", l[3]);
      p.setAttribute("pathLength", "1");
      p.style.strokeWidth = String(l[5]);
      p.style.setProperty("--cd", l[4] + "s");
      svg.appendChild(p);
    });
    holder.appendChild(svg);
    contact.insertBefore(holder, contact.firstChild);
    onceVisible(contact, function () { holder.classList.add("is-in"); });
  }

  /* ------------------------------------------------ 5. Lightbox zoom -- */
  // tennis.js opens the lightbox on the same click (it registered first);
  // this then flies the large image out of the thumbnail's place. If the
  // large image isn't ready within a moment, the dialog's own fade is
  // enough and nothing flies.
  var big = document.getElementById("lightboxImg");
  if (big && !reduced && big.animate) {
    document.querySelectorAll("[data-lightbox]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var thumb = btn.querySelector("img");
        if (!thumb) return;
        var from = thumb.getBoundingClientRect();
        var started = Date.now();
        var ready = big.decode ? big.decode() : Promise.resolve();
        var timeout = new Promise(function (r) { setTimeout(r, 380); });
        Promise.race([ready.catch(function () {}), timeout]).then(function () {
          if (!big.complete || Date.now() - started > 380) return;
          var to = big.getBoundingClientRect();
          if (!to.width || !from.width) return;
          var s = from.width / to.width;
          var dx = from.left + from.width / 2 - (to.left + to.width / 2);
          var dy = from.top + from.height / 2 - (to.top + to.height / 2);
          big.animate([
            { transformOrigin: "50% 50%", transform: "translate(" + dx + "px," + dy + "px) scale(" + s + ")", opacity: .6 },
            { transformOrigin: "50% 50%", transform: "none", opacity: 1 },
          ], { duration: 560, easing: "cubic-bezier(.16, 1, .3, 1)" });
        });
      });
    });
  }
})();
