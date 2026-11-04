/* ============================================================================
   The credentials loop: the row of marks at the foot of About (RSPA,
   USTA Safe Play, Newport Beach Tennis Club with Grip N Rip, LifeSport)
   runs as a slow, seamless loop between its two hairlines.
   After React Bits' LogoLoop (reactbits.dev, MIT), rebuilt in plain JS.

   Markup (index.html): div.creds.fade > ul.creds-list[aria-label] >
   li.creds-item > span.creds-word, with an img.creds-logo in two. Without
   the script, under reduced motion and under ?classic it stays the still
   row creds.css draws. With it, once the row comes near the screen, the
   list moves into a masked strip, copies of it are laid end to end (as
   many as the width needs, measured again whenever the strip or the list
   changes size: a font arriving, a phone turning), and an offset wrapped
   on one list's length moves them along at 35 px a second, so the loop
   never shows a seam. The copies are aria-hidden and inert; the original
   stays the one list a screen reader hears.

   Kept from the component: the speed eases toward its target (tau .25 s),
   so a hover eases the loop to a stop rather than freezing it; a drag
   scrubs it (6 px threshold) and a fling glides back to cruising speed
   (tau .8 s). The strip takes keyboard focus, which stops it the same
   way (the moving row can always be stopped), and the arrow keys then
   move it along by a step. The frame loop runs only while the strip is
   near the screen and something is moving. In Persian the lists lie
   right to left and the loop runs the other way, as a mirror of this one.
   Styles in creds.css.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var box = document.querySelector(".creds");
  var list = box && box.querySelector(".creds-list");
  if (!list || root.classList.contains("classic")) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var SPEED = 35;                                   // px a second
  var SMOOTH_TAU = 0.25, GLIDE_TAU = 0.8, NUDGE_TAU = 0.18;
  var DRAG_THRESHOLD = 6, MAX_FLING = 4000, STEP = 160, WAIT_MS = 2000;

  var viewport = null, track = null, copies = [], ro = null;
  var dir = 1;                                      // 1 runs leftward; -1 (Persian) rightward
  var st = { offset: 0, velocity: 0, period: 0, nudge: 0, hovered: false, focused: false,
             near: false, drag: null, glide: false, raf: 0, last: 0 };

  function mod(v, b) { return ((v % b) + b) % b; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  /* Copies after the original until there are n lists in all. */
  function setCopies(n) {
    while (copies.length < n - 1) {
      var c = list.cloneNode(true);
      c.removeAttribute("aria-label");
      c.setAttribute("aria-hidden", "true");
      c.setAttribute("inert", "");
      c.className += " is-copy";
      track.appendChild(c);
      copies.push(c);
    }
    while (copies.length > n - 1) track.removeChild(copies.pop());
  }

  function render() {
    track.style.transform = "translate3d(" + (-dir * st.offset).toFixed(2) + "px, 0px, 0px)";
  }

  /* The period is the distance from one list to the next; enough copies
     cover the strip plus two spare, so the wrap is never in view. */
  function measure() {
    if (!copies.length) setCopies(2);
    track.style.transform = "none";
    var a = list.getBoundingClientRect(), b = copies[0].getBoundingClientRect();
    st.period = Math.abs(b.left - a.left);
    if (st.period <= 0) return;                     // not laid out (display: none)
    setCopies(Math.max(2, Math.ceil(viewport.clientWidth / st.period) + 2));
    st.offset = mod(st.offset, st.period);
    render();
  }

  function frame(now) {
    st.raf = 0;
    if (st.period <= 0) return;
    var dt = st.last ? clamp((now - st.last) / 1000, 0, 0.1) : 0;
    st.last = now;
    var busy = false;
    if (!(st.drag && st.drag.active)) {             // while dragging, the pointer moves it
      var target = (st.hovered || st.focused) ? 0 : SPEED;
      var tau = st.glide ? GLIDE_TAU : SMOOTH_TAU;
      st.velocity += (target - st.velocity) * (1 - Math.exp(-dt / tau));
      if (st.glide && Math.abs(st.velocity - target) < 2) st.glide = false;
      if (Math.abs(st.velocity - target) < 0.01) st.velocity = target;
      var step = Math.abs(st.nudge) < 0.5 ? st.nudge : st.nudge * (1 - Math.exp(-dt / NUDGE_TAU));
      st.nudge -= step;
      st.offset += st.velocity * dt + step;
      busy = st.velocity !== 0 || target !== 0 || st.nudge !== 0;
    }
    st.offset = mod(st.offset, st.period);
    render();
    if (busy && st.near) st.raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (st.raf || !st.near || !track) return;
    st.last = 0;
    st.raf = requestAnimationFrame(frame);
  }

  function build() {
    if (track) return;
    dir = (box.closest("[dir]") || root).getAttribute("dir") === "rtl" ? -1 : 1;
    viewport = document.createElement("div");
    viewport.className = "creds-viewport";
    track = document.createElement("div");
    track.className = "creds-track";
    list.parentNode.insertBefore(viewport, list);
    viewport.appendChild(track);
    track.appendChild(list);
    Array.prototype.forEach.call(list.querySelectorAll("img"), function (img) { img.draggable = false; });
    box.classList.add("is-loop");
    /* Focusable, so a keyboard can stop it; named after the list. */
    box.tabIndex = 0;
    box.setAttribute("role", "group");
    if (list.getAttribute("aria-label")) box.setAttribute("aria-label", list.getAttribute("aria-label"));
    measure();

    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(function () { measure(); wake(); });
      ro.observe(viewport);
      ro.observe(list);
    } else {
      window.addEventListener("resize", function () { measure(); wake(); });
    }
    listen();
  }

  function listen() {
    /* Hover is a mouse's (or a pen's): a finger's pointerenter is a tap. */
    box.addEventListener("pointerenter", function (e) { if (e.pointerType !== "touch") { st.hovered = true; wake(); } });
    box.addEventListener("pointerleave", function () { st.hovered = false; wake(); });

    /* Focus from the keyboard stops it; the focus a click leaves behind
       doesn't (the hover has already done that). */
    box.addEventListener("focusin", function () {
      var keyboard = true;
      try { keyboard = box.matches(":focus-visible"); } catch (err) { /* older engines */ }
      st.focused = keyboard;
      wake();
    });
    box.addEventListener("focusout", function () { st.focused = false; wake(); });
    box.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      st.focused = true;
      /* The arrow names the way the row moves on screen, in both directions. */
      st.nudge += (e.key === "ArrowRight" ? STEP : -STEP) * dir;
      wake();
    });

    box.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      st.drag = { id: e.pointerId, x: e.clientX, anchor: 0, start: 0, active: false, samples: [] };
    });
    box.addEventListener("pointermove", function (e) {
      var d = st.drag;
      if (!d || e.pointerId !== d.id || st.period <= 0) return;
      var along = e.clientX - d.x;
      if (!d.active) {
        if (Math.abs(along) < DRAG_THRESHOLD) return;
        d.active = true; d.anchor = along; d.start = st.offset;
        st.velocity = 0; st.glide = false; st.nudge = 0;
        try { box.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
        box.setAttribute("data-dragging", "");
      }
      st.offset = mod(d.start - dir * (along - d.anchor), st.period);
      var now = performance.now();
      d.samples.push([now, along]);
      while (d.samples.length > 2 && now - d.samples[0][0] > 100) d.samples.shift();
      wake();
    });
    function endDrag(e, cancelled) {
      var d = st.drag;
      if (!d || e.pointerId !== d.id) return;
      st.drag = null;
      if (!d.active) return;
      box.removeAttribute("data-dragging");
      try { box.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
      /* The fling: the speed over the last 100 ms of the drag, if the
         pointer was still moving when it let go. */
      var now = performance.now(), v = 0, s = d.samples;
      if (!cancelled && s.length > 1) {
        var t0 = s[0][0], a0 = s[0][1], t1 = s[s.length - 1][0], a1 = s[s.length - 1][1];
        if (t1 > t0 && now - t1 < 80) v = clamp(-dir * (a1 - a0) / (t1 - t0) * 1000, -MAX_FLING, MAX_FLING);
      }
      st.velocity = v;
      st.glide = Math.abs(v) > 30;
      wake();
    }
    box.addEventListener("pointerup", function (e) { endDrag(e, false); });
    box.addEventListener("pointercancel", function (e) { endDrag(e, true); });
    box.addEventListener("lostpointercapture", function (e) { endDrag(e, true); });
    box.addEventListener("dragstart", function (e) { e.preventDefault(); });
  }

  /* Built when the row comes near the screen, and run only while it is
     near. A browser always reports once right after observe(); one that
     has said nothing after two seconds never will (some embedded
     browsers), so then it is built and runs anyway, as heart.js does. */
  if ("IntersectionObserver" in window) {
    var heard = false;
    var io = new IntersectionObserver(function (entries) {
      heard = true;
      st.near = entries[entries.length - 1].isIntersecting;
      if (st.near) { build(); wake(); }
    }, { rootMargin: "300px 0px" });
    io.observe(box);
    setTimeout(function () {
      if (heard) return;
      io.disconnect();
      st.near = true;
      build();
      wake();
    }, WAIT_MS);
  } else {
    st.near = true;
    build();
    wake();
  }
})();
