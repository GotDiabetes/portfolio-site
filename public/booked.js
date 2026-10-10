/* ============================================================================
   You're booked — the celebration when a lesson is booked.

   When the Cal.com popup reports a finished booking, the visitor first
   gets the calendar's own confirmation, untouched: the scene waits until
   the popup is closed and plays 400ms later (if it is still open after a
   minute, only the bar is shown). Then the Book FX player (same rig,
   racket, colours and outline as bookfx.js) plays one short scene on its
   own layer above everything, which never takes a click:

     · a court fades in for it: a white band along the bottom with an ink
       baseline, so nothing lands on the page itself;
     · the player, on the baseline near the bottom left, walks through a
       full serve: a rock back, the toss, the trophy pose, the racket drop,
       a leap into contact (Book FX's amber spark and a puff of felt), and
       a landing on the front foot;
     · the ball streaks across and lands for an ace (on a wide screen in
       the gap between the hero's text and its photograph); on impact it
       bursts into a fountain of tennis balls that arc back over the page,
       bounce on the court and roll off or fade, while the player pumps a
       fist and jumps;
     · a small ink bar at the bottom centre says "You're booked. See you on
       court." for about four seconds, announced once to screen readers.

   About three seconds of drawing, then the bar. Sound is synthesized with
   Web Audio and obeys the Ask Isaac chat's mute, like Book FX: a swish and
   a thwock on the serve, a bright ping for the ace, a quick happy
   arpeggio, and light poks as the balls land. Reduced motion: no player
   and no balls, just the bar and a short chime.

   Counted as "booked" (window.leeHit) on a real booking only. On localhost,
   ?demo=booked plays it a second after load and window.__celebrateBooking()
   plays it on demand, so it can be seen without booking a real lesson.
   ========================================================================== */

(function () {
  "use strict";

  if (!window.requestAnimationFrame || !document.body) return;

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var BALL = "#d9ef3f", INK = "#111111", HALO = "rgba(255,255,255,.9)";
  var AMBER = "#f5b700", AMBER_CORE = "#fffbe0";
  var SEAM = "M3 6.2c3.9 2.4 3.9 9.2 0 11.6M21 6.2c-3.9 2.4-3.9 9.2 0 11.6";
  var EASE = "cubic-bezier(.22, 1, .36, 1)";

  /* The timeline, in ms from the start of the scene. The impact time
     depends on the screen (the ball's flight is longer on a wide one). */
  var RELEASE = 330;            // the ball leaves the tossing hand
  var CONTACT = 720;            // racket meets ball, in the air
  var TOAST_AT = 1750;          // the bar comes up as the balls come down
  var TOAST_FOR = 4000;         // how long it stays
  var FIG_OUT = [2350, 2750];   // the player fades
  var ALL_OUT = [2600, 3050];   // whatever is still rolling fades
  var END = 3050;

  /* ---------------------------------------------------- The Cal hook --
     Cal.com reports a finished booking as "bookingSuccessfulV2" (current)
     and, on older embeds, "bookingSuccessful". Both are listened to; one
     booking can report under both names, so a booking is celebrated once:
     the same uid never twice, and nothing within 15s of the last one. */
  var hooked = false;
  function hook() {
    if (hooked) return;
    var api = window.Cal && window.Cal.ns && window.Cal.ns.lesson;
    if (typeof api !== "function") return;
    hooked = true;
    liveRegion();
    ["bookingSuccessfulV2", "bookingSuccessful"].forEach(function (action) {
      try { api("on", { action: action, callback: onBooked }); } catch (e) { /* no calendar, no party */ }
    });
  }
  if (root.classList.contains("cal-ready")) hook();
  else window.addEventListener("cal:ready", hook);

  var seen = {}, lastAt = -1e9;
  function onBooked(e) {
    var d = (e && e.detail && e.detail.data) || {};
    var uid = d.uid || (d.booking && d.booking.uid) || "";
    if (uid && seen[uid]) return;
    if (uid) seen[uid] = true;
    var now = Date.now();
    if (now - lastAt < 15000) return;
    lastAt = now;
    if (window.leeHit) window.leeHit("booked");
    afterCalendar();
  }

  /* ------------------------------------------- After the calendar --
     The booking ends on the calendar's own confirmation, and nothing is
     played over it. If the popup is open, wait until it closes and play
     400ms later; if it is still open after a minute, show only the bar.

     The popup is a <cal-modal-box> the embed adds to <body>. Closing it
     doesn't remove it: the embed hides it (visibility: hidden, sometimes
     state="closed") and keeps it for next time, and a hidden one can also
     sit there prerendered. So "open" means a box that is actually shown,
     and the box's own style and state are watched as well as <body>. */
  function calOpen() {
    var boxes = document.querySelectorAll("cal-modal-box");
    for (var i = 0; i < boxes.length; i++) {
      var state = boxes[i].getAttribute("state");
      if (state === "closed" || state === "prerendering") continue;
      var cs = getComputedStyle(boxes[i]);
      if (cs.visibility !== "hidden" && cs.display !== "none") return true;
    }
    return false;
  }

  var waiting = false;
  function afterCalendar() {
    if (running || waiting) return;
    if (!calOpen() || !window.MutationObserver) { celebrate(); return; }
    waiting = true;
    var settle = 0, limit = 0;
    var mo = new MutationObserver(check);
    function watchBoxes() {
      Array.prototype.forEach.call(document.querySelectorAll("cal-modal-box"), function (b) {
        mo.observe(b, { attributes: true, attributeFilter: ["style", "state", "class"] });
      });
    }
    function check() {
      watchBoxes();
      window.clearTimeout(settle);
      if (!calOpen()) settle = window.setTimeout(function () { if (!calOpen()) stop(false); }, 400);
    }
    function stop(timedOut) {
      mo.disconnect();
      window.clearTimeout(settle); window.clearTimeout(limit);
      waiting = false;
      celebrate(timedOut);
    }
    mo.observe(document.body, { childList: true });
    watchBoxes();
    limit = window.setTimeout(function () { stop(true); }, 60000);
  }

  /* On localhost the same path can be played without booking anything:
     ?demo=booked a second after load, window.__celebrateBooking() on
     demand. Neither is counted. */
  if (LOCAL) {
    window.__celebrateBooking = function () { afterCalendar(); };
    if (/(^|&)demo=booked(&|$)/.test(location.search.slice(1))) {
      var later = function () { window.setTimeout(afterCalendar, 1000); };
      if (document.readyState === "complete") later();
      else window.addEventListener("load", later, { once: true });
    }
  }

  /* ------------------------------------------------------- The player --
     The Book FX rig: joints in figure units, x forward (toward the serve),
     y up negative, feet on y = 0, about 85 units tall. r = racket angle in
     degrees (0 forward, 90 down, 180 back), unwrapped so the racket always
     turns the way a real swing does. l = back leg and tossing arm, r =
     front leg and hitting arm. Keys are joined by a smooth spline; a key
     marked hold is reached at rest (the trophy pause, the landings). */
  var KEYS = [
    { t: 0,    // ready: side-on, ball and racket throat together in front
      head: [-2, -77], neck: [-1, -67], hip: [-3, -40],
      lKnee: [-9, -21], lFoot: [-12, 0], rKnee: [6, -21], rFoot: [10, 0],
      lElbow: [3, -51], lHand: [16, -56], rElbow: [2, -50], rHand: [14, -52], r: -28 },
    { t: 170,  // rock back: weight on the back foot, both hands drop
      head: [-6, -76], neck: [-5, -66], hip: [-6, -39],
      lKnee: [-11, -20], lFoot: [-12, 0], rKnee: [5, -21], rFoot: [10, 0],
      lElbow: [-2, -50], lHand: [9, -44], rElbow: [-3, -49], rHand: [8, -41], r: 20 },
    { t: 360,  // toss: arm up, racket swinging back, back foot sliding up
      head: [-10, -72], neck: [-7, -63], hip: [-1, -36],
      lKnee: [4, -19], lFoot: [0, 0], rKnee: [12, -19], rFoot: [11, 0],
      lElbow: [-3, -79], lHand: [0, -95], rElbow: [-20, -52], rHand: [-31, -44], r: 150 },
    { t: 540, hold: true,  // trophy: knees bent, back arched, racket up behind
      head: [-15, -62], neck: [-10, -53], hip: [-3, -27],
      lKnee: [15, -14], lFoot: [7, 0], rKnee: [19, -15], rFoot: [13, 0],
      lElbow: [-2, -71], lHand: [2, -88], rElbow: [-21, -58], rHand: [-24, -72], r: 248 },
    { t: 650,  // racket drop: exploding up, racket head deep behind the back
      head: [-4, -78], neck: [-2, -68], hip: [2, -41],
      lKnee: [8, -22], lFoot: [6, -5], rKnee: [12, -22], rFoot: [13, -5],
      lElbow: [8, -64], lHand: [12, -55], rElbow: [-11, -74], rHand: [-13, -60], r: 96 },
    { t: CONTACT,  // contact in the air: fully stretched, racket straight up
      head: [7, -97], neck: [11, -86], hip: [8, -58],
      lKnee: [4, -39], lFoot: [-1, -22], rKnee: [12, -39], rFoot: [10, -20],
      lElbow: [17, -73], lHand: [13, -65], rElbow: [16, -104], rHand: [20, -119], r: 284 },
    { t: 930, hold: true,  // landing on the front foot, back leg kicking up
      head: [43, -63], neck: [37, -57], hip: [24, -36],
      lKnee: [11, -31], lFoot: [-3, -37], rKnee: [30, -18], rFoot: [33, 0],
      lElbow: [31, -48], lHand: [37, -43], rElbow: [33, -46], rHand: [25, -34], r: 565 },
    { t: 1120, // recover
      head: [35, -72], neck: [32, -62], hip: [25, -37],
      lKnee: [21, -19], lFoot: [18, 0], rKnee: [32, -19], rFoot: [35, 0],
      lElbow: [38, -53], lHand: [43, -46], rElbow: [33, -50], rHand: [29, -38], r: 570 },
    { t: 1380, hold: true, // fist pump: crouch, fist pulled down, racket up
      head: [33, -68], neck: [30, -59], hip: [24, -35],
      lKnee: [18, -18], lFoot: [16, 0], rKnee: [33, -18], rFoot: [35, 0],
      lElbow: [20, -47], lHand: [30, -42], rElbow: [38, -73], rHand: [42, -89], r: 632 },
    { t: 1600, // the jump: arms up in a V, racket held high
      head: [28, -91], neck: [27, -81], hip: [25, -54],
      lKnee: [20, -35], lFoot: [17, -15], rKnee: [31, -36], rFoot: [33, -16],
      lElbow: [17, -94], lHand: [11, -108], rElbow: [37, -94], rHand: [43, -108], r: 640 },
    { t: 1800, hold: true, // landing soft
      head: [29, -70], neck: [28, -61], hip: [25, -35],
      lKnee: [19, -18], lFoot: [17, 0], rKnee: [33, -18], rFoot: [34, 0],
      lElbow: [18, -75], lHand: [13, -89], rElbow: [38, -75], rHand: [43, -89], r: 636 },
    { t: FIG_OUT[0], // standing tall, arms still up
      head: [28, -78], neck: [27, -68], hip: [25, -41],
      lKnee: [20, -21], lFoot: [17, 0], rKnee: [31, -21], rFoot: [34, 0],
      lElbow: [16, -81], lHand: [9, -95], rElbow: [38, -81], rHand: [45, -95], r: 636 },
  ];
  var JOINTS = ["head", "neck", "hip", "lKnee", "lFoot", "rKnee", "rFoot", "lElbow", "lHand", "rElbow", "rHand"];
  var J = {};
  JOINTS.forEach(function (j, i) { J[j] = i * 2; });
  var R = JOINTS.length * 2;   // index of the racket angle

  var VEC = KEYS.map(function (k) {
    var v = [];
    JOINTS.forEach(function (j) { v.push(k[j][0], k[j][1]); });
    v.push(k.r);
    return v;
  });
  /* Catmull-Rom tangents in time: the body keeps moving through a key
     instead of stopping at each one (Book FX's short serve can afford to
     stop; a three-second scene can't). */
  var TAN = KEYS.map(function (k, i) {
    return VEC[i].map(function (_, c) {
      if (k.hold || i === 0 || i === KEYS.length - 1) return 0;
      return (VEC[i + 1][c] - VEC[i - 1][c]) / (KEYS[i + 1].t - KEYS[i - 1].t);
    });
  });
  function poseAt(t) {
    var last = KEYS.length - 1;
    if (t <= 0) return VEC[0];
    if (t >= KEYS[last].t) return VEC[last];
    var i = 0;
    while (t > KEYS[i + 1].t) i++;
    var h = KEYS[i + 1].t - KEYS[i].t, s = (t - KEYS[i].t) / h, s2 = s * s, s3 = s2 * s;
    var a = 2 * s3 - 3 * s2 + 1, b = s3 - 2 * s2 + s, c = 3 * s2 - 2 * s3, d = s3 - s2;
    var P = VEC[i], Q = VEC[i + 1], M = TAN[i], N = TAN[i + 1], out = [];
    for (var k = 0; k < P.length; k++) out.push(a * P[k] + b * h * M[k] + c * Q[k] + d * h * N[k]);
    return out;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function easeOut(u) { return 1 - Math.pow(1 - u, 3); }
  function easeOutBack(u) { var c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }

  /* ------------------------------------------------------ Celebrate --
     barOnly: the calendar stayed open a full minute, so just the bar,
     silently, no player and no balls. */
  var running = false;
  function celebrate(barOnly) {
    if (running || !document.body) return;
    running = true;
    var still = !!(reduce && reduce.matches);
    var start = performance.now();
    var timers = [];
    var layer, watch = null, parts = still || barOnly ? 1 : 2;

    liveRegion();
    layer = mount();

    function part() { if (--parts === 0) teardown(); }
    function teardown() {
      timers.forEach(window.clearTimeout);
      if (watch) watch.disconnect();
      if (layer.isConnected) {
        try { if (layer.hidePopover && layer.matches(":popover-open")) layer.hidePopover(); } catch (e) {}
        layer.remove();
      }
      running = false;
    }

    /* The layer goes in the browser's top layer (a manual popover), which
       sits above every z-index on the page, the calendar's included, even
       if the calendar adds anything later. Without popover support it is
       the last child of <body> at the top z-index, and is moved back to
       the end whenever something else is added. Book FX's own layer and
       sound note are left alone, so the two never trade places forever. */
    function mount() {
      var el = document.createElement("div");
      el.className = "booked-fx";
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = "position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;" +
        "margin:0;padding:0;border:0;background:transparent;color:inherit;overflow:hidden;" +
        "pointer-events:none;z-index:2147483647;";
      var top = typeof el.showPopover === "function";
      if (top) el.setAttribute("popover", "manual");
      document.body.appendChild(el);
      if (top) { try { el.showPopover(); } catch (e) { top = false; } }
      if (!top && window.MutationObserver) {
        watch = new MutationObserver(function (records) {
          var foreign = records.some(function (r) {
            return Array.prototype.some.call(r.addedNodes, function (n) {
              return n.nodeType === 1 && n !== el && !/(^|\s)(bookfx|sound-note)(\s|$)/.test(n.className || "");
            });
          });
          if (foreign && el.isConnected) document.body.appendChild(el);
        });
        watch.observe(document.body, { childList: true });
      }
      return el;
    }

    if (still || barOnly) {
      if (!barOnly) sound(start, 0);
      toast(still);
      return;
    }
    scene();

    /* ------------------------------------------------------- The bar -- */
    function toast(quiet) {
      var T = window.I18N || {};
      var text = T.bookedToast || "You're booked. See you on court.";
      var bar = document.createElement("div");
      bar.className = "booked-note";
      bar.style.cssText = "position:absolute;left:50%;bottom:max(1rem, env(safe-area-inset-bottom));" +
        "transform:translateX(-50%);display:flex;align-items:center;gap:.6rem;box-sizing:border-box;" +
        "max-width:calc(100% - 2rem);width:max-content;padding:.6rem 1.1rem;padding-inline-start:.85rem;" +
        "background:#0d0d0d;color:#fff;border-radius:6px;box-shadow:0 10px 28px rgba(0,0,0,.28);" +
        "font-size:.9375rem;line-height:1.35;font-weight:600;letter-spacing:-.01em;text-align:start;";
      bar.innerHTML =
        '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" style="flex:none;overflow:visible">' +
        '<defs><radialGradient id="bookedShade" cx="35%" cy="30%" r="75%">' +
        '<stop offset="0" stop-color="#fff" stop-opacity=".5"/>' +
        '<stop offset=".55" stop-color="#fff" stop-opacity="0"/>' +
        '<stop offset="1" stop-color="#5d6a00" stop-opacity=".4"/></radialGradient></defs>' +
        '<circle cx="12" cy="12" r="11.4" fill="' + BALL + '"/>' +
        '<circle cx="12" cy="12" r="11.4" fill="url(#bookedShade)"/>' +
        '<path d="' + SEAM + '" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>';
      var words = document.createElement("span");
      words.textContent = text;
      bar.appendChild(words);
      layer.appendChild(bar);
      say(text);

      var rise = quiet
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: "translate(-50%, 14px)" }, { opacity: 1, transform: "translate(-50%, 0)" }];
      if (bar.animate) {
        bar.animate(rise, { duration: quiet ? 300 : 460, easing: EASE, fill: "backwards" });
        /* The little ball drops into the bar and bounces twice. */
        if (!quiet) bar.firstChild.animate([
          { transform: "translateY(-22px) scale(.9)", opacity: 0 },
          { transform: "translateY(0) scale(1.18, .8)", opacity: 1, offset: .34 },
          { transform: "translateY(-7px) scale(.96, 1.04)", offset: .55 },
          { transform: "translateY(0) scale(1.08, .92)", offset: .74 },
          { transform: "translateY(-2px) scale(1)", offset: .86 },
          { transform: "translateY(0) scale(1)" },
        ], { duration: 720, delay: 120, easing: "ease-out", fill: "backwards" });
      }
      var gone = false;
      function finished() { if (!gone) { gone = true; part(); } }
      timers.push(window.setTimeout(function () {
        if (!bar.animate) { finished(); return; }
        bar.animate(quiet
          ? [{ opacity: 1 }, { opacity: 0 }]
          : [{ opacity: 1, transform: "translate(-50%, 0)" }, { opacity: 0, transform: "translate(-50%, 8px)" }],
          { duration: 340, easing: EASE, fill: "forwards" }).onfinish = finished;
        timers.push(window.setTimeout(finished, 800));   // in case a hidden tab never finishes it
      }, TOAST_FOR));
    }

    /* ----------------------------------------------------- The scene -- */
    function scene() {
      var W = layer.clientWidth || window.innerWidth, H = layer.clientHeight || window.innerHeight;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var cv = document.createElement("canvas");
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.cssText = "position:absolute;left:0;top:0;width:" + W + "px;height:" + H + "px;";
      var g = cv.getContext("2d");
      if (!g) { sound(start, 0); toast(true); part(); return; }
      layer.appendChild(cv);

      /* Mirror the whole drawing on a right-to-left page, so the player
         serves from the bottom right. */
      var rtl = getComputedStyle(document.body).direction === "rtl";
      var base = rtl ? [-dpr, 0, 0, dpr, W * dpr, 0] : [dpr, 0, 0, dpr, 0, 0];

      /* Sized from the viewport: a 170px player on a laptop, 95px on a
         phone; the floor a little above the bottom edge. */
      var S = clamp(Math.min(W / 560, H / 440), 1.25, 2.1);
      var floorY = H - Math.max(26, H * .075);
      var ox = Math.max(48 * S, W * .11);
      var K = Math.min(S, 1.45);                        // sparks stay crisp, not chunky, on big screens
      var Rb = 6 * S;                                   // the served ball
      var R0 = clamp(Math.min(W, H) * .02, 9, 15);      // the shower's balls
      var hMax = floorY - H * .26;                      // the fountain's tallest arc
      var G = 6 * hMax;                                 // the tallest is in the air ~1.15s on any screen
      var wide = W >= 900;

      /* The scene's own ground, so nothing lands on the page: a white band
         from just above the baseline to the bottom, feathered on top, and
         the baseline itself, ink, across the full width. */
      var courtTop = floorY - 12 * S;
      var feather = g.createLinearGradient(0, courtTop - 24, 0, courtTop);
      feather.addColorStop(0, "rgba(255,255,255,0)");
      feather.addColorStop(1, "rgba(255,255,255,.94)");

      function fx(p, j) { return ox + p[J[j]] * S; }
      function fy(p, j, lift) { return floorY + p[J[j] + 1] * S + lift; }

      /* The toss: out of the hand at RELEASE, up past the strings and
         down onto them at CONTACT, as a parabola in figure units. */
      var cp = VEC[5];
      var ang = cp[R] * Math.PI / 180;
      var strike = [cp[J.rHand] + Math.cos(ang) * 22, cp[J.rHand + 1] + Math.sin(ang) * 22];
      var rp = poseAt(RELEASE);
      var rel = [rp[J.lHand] + 1, rp[J.lHand + 1] - 4.5];
      var D = rel[1] - strike[1], A = 12;
      var qc = ((2 * D + 4 * A) + Math.sqrt(Math.pow(2 * D + 4 * A, 2) - 4 * D * D)) / 2, qb = -D - qc;

      /* The serve: from the strings to the far side, flat and fast at
         first, diving at the end (drag on x, gravity and spin on y). */
      /* On a wide screen the ace lands in the gap between the hero's text
         and its photograph; on a phone, near the far side. */
      var C = [ox + strike[0] * S, floorY + strike[1] * S];
      var I = [W * (wide ? .56 : .8), floorY - Rb];
      var FLIGHT = clamp(200 + Math.hypot(I[0] - C[0], I[1] - C[1]) * .14, 250, 380);
      var IMPACT = CONTACT + FLIGHT;
      sound(start, IMPACT);
      function flight(u) {
        u = clamp(u, 0, 1);
        return [C[0] + (I[0] - C[0]) * (1 - Math.pow(1 - u, 1.35)), C[1] + (I[1] - C[1]) * (.3 * u + .7 * u * u)];
      }

      /* Sprites: the hero ball's look (ballo.js) drawn once. The felt and
         seam turn with the ball; the light and the outline don't. */
      var sprR = Math.ceil(Math.max(R0 * 1.1, Rb) * dpr * 1.2);
      var felt = sprite(sprR, true), shade = sprite(sprR, false);

      /* The contact spark (Book FX's), a puff of felt, the impact spark. */
      var sparkC = streaks(11, 0, Math.PI * 2, 1);
      var sparkI = streaks(14, Math.PI * 1.02, Math.PI * 1.96, -1);
      var RAY = 60 * K / 1.45;                          // the longest ray, px: they stay low
      var puff = [];
      for (var pi = 0; pi < 9; pi++) puff.push({ a: (Math.PI * 2 * pi) / 9 + Math.random() * .5, d: (18 + Math.random() * 26) * S * .8, s: .6 + Math.random() * .8, w: pi % 3 === 2 });

      /* The shower. The served ball is the first of them: it skids on,
         low, and away. The rest burst out of the impact, back over the
         screen (on a wide screen only that way, so none crosses the
         photograph). Each has a depth: far ones are smaller, land on a line
         a little higher up the court, and are drawn behind the player. */
      var balls = [];
      var n = Math.round(clamp(W / 48, 16, 30));
      for (var bi = 0; bi < n; bi++) {
        var d = Math.random();
        var hh = hMax * (.28 + .72 * Math.pow(Math.random(), .7));
        balls.push({
          d: d, r: R0 * (.62 + .45 * d), floor: floorY - (1 - d) * 10 * S,
          vx: W * (wide ? -.62 + .6 * Math.random() : -.72 + .94 * Math.random()) * (.85 + .3 * Math.random()),
          vy: -Math.sqrt(2 * G * hh),
          e: .45 + Math.random() * .17, rot: Math.random() * 6.3, spin: (Math.random() - .5) * 24,
          born: IMPACT + Math.pow(Math.random(), 1.5) * 150, x: 0, y: 0, live: false, hops: 0, sqAt: -1e9, sqK: 0, roll: false,
        });
      }
      var v1 = flight(1), v0 = flight(.97);
      balls.push({
        d: .6, r: Rb, floor: floorY, served: true,
        vx: (v1[0] - v0[0]) / (FLIGHT * .03) * 1000 * .6, vy: -Math.sqrt(2 * G * hMax * (wide ? .1 : .3)),
        e: .55, rot: 0, spin: 14, born: IMPACT, x: I[0], y: I[1], live: false, hops: 1, sqAt: IMPACT, sqK: .28, roll: false,
      });
      balls.sort(function (a, b) { return a.d - b.d; });

      var raf = 0, last = start, toasted = false, poks = 0, lastPok = -1e9;
      var minHop = Math.sqrt(2 * G * 5 * S);

      raf = requestAnimationFrame(frame);

      function frame(now) {
        var t = Math.max(0, now - start);
        var dt = clamp((now - last) / 1000, 0, 1 / 30);
        last = now;

        if (!toasted && t >= TOAST_AT) { toasted = true; toast(false); }

        /* Physics, in small steps so a slow frame can't tunnel a ball
           through the floor. */
        var steps = Math.max(1, Math.ceil(dt * 120));
        for (var si = 0; si < steps; si++) balls.forEach(function (b) { move(b, dt / steps, t); });

        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, cv.width, cv.height);
        g.setTransform(base[0], base[1], base[2], base[3], base[4], base[5]);

        var all = t < ALL_OUT[0] ? 1 : Math.max(0, 1 - (t - ALL_OUT[0]) / (ALL_OUT[1] - ALL_OUT[0]));
        var figA = t < 160 ? easeOut(t / 160) : t > FIG_OUT[0] ? Math.max(0, 1 - (t - FIG_OUT[0]) / (FIG_OUT[1] - FIG_OUT[0])) : 1;
        var lift = (1 - easeOut(Math.min(1, t / 260))) * 10;
        var p = poseAt(t);

        /* The court: in over the first 200ms, out over the last 300ms. */
        var courtA = Math.min(1, t / 200, Math.max(0, (END - t) / 300));
        if (courtA > 0) court(courtA);

        /* Shadows next, on the court. */
        balls.forEach(function (b) { if (b.live) shadow(b.x, b.floor, b.floor - b.r - b.y, b.r, all); });
        if (t >= CONTACT && t < IMPACT) { var fp = flight((t - CONTACT) / FLIGHT); shadow(fp[0], floorY, floorY - Rb - fp[1], Rb, 1); }

        balls.forEach(function (b) { if (b.live && b.d < .5) drawShowerBall(b, t, all); });
        if (figA > 0) drawFigure(p, figA, lift);

        if (t < CONTACT) {                                     // the toss
          var bx, by;
          if (t < RELEASE) { bx = p[J.lHand] + 1; by = p[J.lHand + 1] - 4.5; }
          else { var u = (t - RELEASE) / (CONTACT - RELEASE); bx = rel[0] + (strike[0] - rel[0]) * u; by = rel[1] + qb * u + qc * u * u; }
          ball(ox + bx * S, floorY + by * S + (t < RELEASE ? lift : 0), Rb, t / 180, 1, 1, figA);
        } else if (t < IMPACT) {                               // the serve
          var fu = (t - CONTACT) / FLIGHT, at = flight(fu);
          trail(fu);
          ball(at[0], at[1], Rb, t / 25, 1, 1, 1);
        }
        drawSpark(sparkC, C, (t - CONTACT) / 180, RAY * .9, 11 * K);
        drawPuff((t - CONTACT) / 480);

        balls.forEach(function (b) { if (b.live && b.d >= .5) drawShowerBall(b, t, all); });
        drawRing((t - IMPACT) / 460);
        drawSpark(sparkI, [I[0], I[1] + Rb * .4], (t - IMPACT) / 260, RAY, 15 * K);

        if (t < END) raf = requestAnimationFrame(frame);
        else { cancelAnimationFrame(raf); cv.width = cv.height = 0; cv.remove(); if (!toasted) toast(false); part(); }
      }

      function move(b, h, t) {
        if (!b.live) {
          if (t < b.born) return;
          b.live = true;
          if (!b.served) { b.x = I[0] + (Math.random() - .5) * 8 * S; b.y = Math.min(I[1], b.floor - b.r); }
        }
        b.vy += G * h;
        b.x += b.vx * h;
        b.y += b.vy * h;
        if (b.vy > 0 && b.y >= b.floor - b.r) {
          b.y = b.floor - b.r;
          if (b.vy > minHop) {
            var hit = b.vy;
            b.vy = -b.vy * b.e;
            b.vx *= .86;
            b.spin = b.vx / b.r;
            b.sqAt = t; b.sqK = Math.min(.3, hit / (G * .55));
            b.hops++;
            if (b.hops <= 2 && b.x > -b.r && b.x < W + b.r) pokNow(hit / Math.sqrt(2 * G * hMax), b.r, b.hops, t);
          } else { b.vy = 0; b.roll = true; }
        }
        if (b.roll) { b.vx *= Math.exp(-1.4 * h); b.spin = b.vx / b.r; }
        b.rot += b.spin * h;
      }

      function pokNow(v, r, hop, t) {
        if (poks >= 14 || t - lastPok < 30) return;
        poks++; lastPok = t;
        pok(clamp(v, .15, 1) * (hop === 1 ? 1 : .55), r);
      }

      /* ------------------------------------------------------ Drawing -- */
      function sprite(px, isFelt) {
        var c = document.createElement("canvas");
        c.width = c.height = px * 2;
        var x = c.getContext("2d");
        x.scale(px / 12, px / 12);
        x.beginPath(); x.arc(12, 12, 11.4, 0, Math.PI * 2);
        if (isFelt) {
          x.fillStyle = BALL; x.fill();
          if (window.Path2D) {
            x.save(); x.clip();
            x.strokeStyle = "#fff"; x.lineWidth = 1.5; x.lineCap = "round";
            x.stroke(new Path2D(SEAM));
            x.restore();
          }
        } else {
          var gr = x.createRadialGradient(8.58, 7.44, 0, 8.58, 7.44, 17.1);
          gr.addColorStop(0, "rgba(255,255,255,.5)");
          gr.addColorStop(.55, "rgba(255,255,255,0)");
          gr.addColorStop(1, "rgba(93,106,0,.4)");
          x.fillStyle = gr; x.fill();
          x.strokeStyle = "rgba(0,0,0,.28)"; x.lineWidth = .9; x.stroke();
        }
        return c;
      }

      /* One ball: felt turned by rot, light fixed; squashed against the
         court around its lowest point when it lands. */
      function ball(x, y, r, rot, sx, sy, a) {
        if (a <= 0) return;
        var s = r / .95;
        g.save();
        g.globalAlpha = a;
        g.translate(x, y + r);
        if (sx !== 1 || sy !== 1) g.scale(sx, sy);
        g.translate(0, -r);
        g.save(); g.rotate(rot); g.drawImage(felt, -s, -s, s * 2, s * 2); g.restore();
        g.drawImage(shade, -s, -s, s * 2, s * 2);
        g.restore();
      }

      function drawShowerBall(b, t, all) {
        var pop = b.served ? 1 : easeOutBack(clamp((t - b.born) / 120, 0, 1)) * .65 + .35;
        var k = 0, since = t - b.sqAt;
        if (since >= 0 && since < 80) k = b.sqK * (1 - since / 80);
        ball(b.x, b.y, b.r * pop, b.rot, 1 + k, 1 - k, all);
      }

      function shadow(x, floor, height, r, a) {
        var f = clamp(height / (H * .4), 0, 1);
        var al = .16 * (1 - f) * a;
        if (al <= .005) return;
        g.fillStyle = "rgba(0,0,0," + al.toFixed(3) + ")";
        g.beginPath();
        g.ellipse(x, floor + 1, r * (1.05 - .45 * f), r * .28 * (1.05 - .45 * f), 0, 0, Math.PI * 2);
        g.fill();
      }

      /* The ball's streak: a tapered ribbon along the path it just took,
         fading to nothing about 70ms back. */
      function trail(u) {
        var N = 12, step = 6 / FLIGHT, L = [], Rr = [];
        var pts = [];
        for (var k = 0; k <= N; k++) pts.push(flight(Math.max(0, u - k * step)));
        if (Math.hypot(pts[0][0] - pts[N][0], pts[0][1] - pts[N][1]) < 4) return;
        for (k = 0; k <= N; k++) {
          var a = pts[Math.max(0, k - 1)], b = pts[Math.min(N, k + 1)];
          var dx = a[0] - b[0], dy = a[1] - b[1], len = Math.hypot(dx, dy) || 1;
          var w = Rb * .92 * (1 - k / N);
          L.push([pts[k][0] - dy / len * w, pts[k][1] + dx / len * w]);
          Rr.push([pts[k][0] + dy / len * w, pts[k][1] - dx / len * w]);
        }
        var gr = g.createLinearGradient(pts[0][0], pts[0][1], pts[N][0], pts[N][1]);
        gr.addColorStop(0, "rgba(217,239,63,.85)");
        gr.addColorStop(1, "rgba(217,239,63,0)");
        g.beginPath();
        g.moveTo(L[0][0], L[0][1]);
        for (k = 1; k <= N; k++) g.lineTo(L[k][0], L[k][1]);
        for (k = N; k >= 0; k--) g.lineTo(Rr[k][0], Rr[k][1]);
        g.closePath();
        g.fillStyle = gr;
        g.fill();
      }

      function drawFigure(p, a, lift) {
        function X(j) { return fx(p, j); }
        function Y(j) { return fy(p, j, lift); }
        g.save();
        g.globalAlpha = a;
        g.lineCap = "round"; g.lineJoin = "round";

        /* The shadow follows the feet, so the leaps read as leaps. */
        var air = floorY - Math.max(Y("lFoot"), Y("rFoot"));
        var srx = 16 * S * Math.max(.55, 1 - air / (40 * S));
        g.fillStyle = "rgba(0,0,0,.18)";
        g.beginPath(); g.ellipse((X("lFoot") + X("rFoot")) / 2, floorY + 1.5 * S, srx, 2.6 * S, 0, 0, Math.PI * 2); g.fill();

        function body() {
          g.beginPath();
          [["neck", "hip"], ["lFoot", "lKnee", "hip", "rKnee", "rFoot"], ["lHand", "lElbow", "neck", "rElbow", "rHand"]]
            .forEach(function (run) { run.forEach(function (j, i) { g[i ? "lineTo" : "moveTo"](X(j), Y(j)); }); });
        }
        var hx = X("head"), hy = Y("head");
        /* A thin white outline under the ink, like a sticker, so the player
           reads on the white page and on the calendar's dimmed backdrop. */
        body(); g.strokeStyle = HALO; g.lineWidth = 6.4 * S; g.stroke();
        g.fillStyle = HALO; circle(hx, hy, 8.9 * S); g.fill();
        body(); g.strokeStyle = INK; g.lineWidth = 3.2 * S; g.stroke();
        g.fillStyle = INK; circle(hx, hy, 7.2 * S); g.fill();

        /* The racket, exactly Book FX's: a 13-unit handle and a 9.5 × 6.6
           head centred 22 units out, each with its white outline, and the
           strings as one cross ("M15 0H29M22 -5V5") at .55, square-ended. */
        g.translate(X("rHand"), Y("rHand"));
        g.rotate(p[R] * Math.PI / 180);
        g.strokeStyle = HALO;
        g.lineWidth = 5.2 * S; line(0, 0, 13 * S, 0);
        g.lineWidth = 5 * S; g.beginPath(); g.ellipse(22 * S, 0, 9.5 * S, 6.6 * S, 0, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = INK;
        g.lineWidth = 2.6 * S; line(0, 0, 13 * S, 0);
        g.lineWidth = 2.4 * S; g.beginPath(); g.ellipse(22 * S, 0, 9.5 * S, 6.6 * S, 0, 0, Math.PI * 2); g.stroke();
        g.globalAlpha = a * .55; g.lineWidth = .9 * S; g.lineCap = "butt";
        g.beginPath();
        g.moveTo(15 * S, 0); g.lineTo(29 * S, 0);
        g.moveTo(22 * S, -5 * S); g.lineTo(22 * S, 5 * S);
        g.stroke();
        g.restore();
      }
      function circle(x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
      function line(x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }

      /* Sparks: a white flash ringed in amber and streaks with white
         cores, longer one way (forward off the racket; up and back over
         the screen off the court). */
      function streaks(count, from, to, bias) {
        var out = [];
        for (var i = 0; i < count; i++) {
          var a = from + (to - from) * (i / (count - 1)) + (Math.random() - .5) * .35;
          var long = bias > 0 ? Math.cos(a) > .2 : Math.cos(a) < .1;
          out.push({ a: a, len: (.7 + Math.random() * .6) * (long ? 1.35 : 1) / 1.755 });   // 1 = the longest
        }
        return out;
      }
      function drawSpark(set, at, q, ray, flashR) {
        if (q < 0 || q > 1) return;
        var e = easeOut(q);
        g.save();
        g.globalAlpha = 1 - q * q;
        g.lineCap = "round";
        set.forEach(function (s) {
          var r2 = ray * s.len * (10 + 30 * e) / 40, r1 = r2 * .5;
          var x1 = at[0] + Math.cos(s.a) * r1, y1 = at[1] + Math.sin(s.a) * r1;
          var x2 = at[0] + Math.cos(s.a) * r2, y2 = at[1] + Math.sin(s.a) * r2;
          g.strokeStyle = AMBER; g.lineWidth = 3.2 * K; line(x1, y1, x2, y2);
          g.strokeStyle = AMBER_CORE; g.lineWidth = 1.3 * K; line(x1, y1, x2, y2);
        });
        g.globalAlpha = 1 - q;
        circle(at[0], at[1], (4 / 11 + 7 / 11 * e) * flashR);
        g.fillStyle = "#fff"; g.fill();
        g.strokeStyle = AMBER; g.lineWidth = 2 * K; g.stroke();
        g.restore();
      }
      function drawPuff(q) {
        if (q < 0 || q > 1) return;
        var e = 1 - Math.pow(1 - q, 4);
        g.save();
        g.globalAlpha = 1 - q;
        g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = 1;
        puff.forEach(function (f) {
          circle(C[0] + Math.cos(f.a) * f.d * e, C[1] + Math.sin(f.a) * f.d * e, 3 * S * .8 * f.s * (1 - q * .9));
          g.fillStyle = f.w ? "#fff" : BALL; g.fill(); g.stroke();
        });
        g.restore();
      }
      function court(a) {
        g.save();
        g.globalAlpha = a;
        g.fillStyle = feather; g.fillRect(0, courtTop - 24, W, 24);
        g.fillStyle = "rgba(255,255,255,.94)"; g.fillRect(0, courtTop, W, H - courtTop);
        g.fillStyle = INK; g.fillRect(0, floorY - .75, W, 1.5);
        g.restore();
      }
      /* Where the ace lands: one flat ring going out across the court. */
      function drawRing(q) {
        if (q < 0 || q > 1) return;
        var e = easeOut(q), rx = (8 + 64 * e) * S, ry = rx * .2;
        g.save();
        g.globalAlpha = (1 - q) * .9;
        g.beginPath(); g.ellipse(I[0], floorY, rx, ry, 0, 0, Math.PI * 2);
        g.strokeStyle = "rgba(0,0,0,.2)"; g.lineWidth = 3.6 * S; g.stroke();
        g.strokeStyle = "#fff"; g.lineWidth = 1.8 * S; g.stroke();
        g.restore();
      }
    }
  }

  /* ---------------------------------------------- The screen reader -- */
  /* A polite live region that exists before anything is said into it
     (made when the calendar is ready), so the words are announced once. */
  var sayEl = null;
  function liveRegion() {
    if (sayEl && sayEl.isConnected) return sayEl;
    sayEl = document.createElement("div");
    sayEl.setAttribute("role", "status");
    sayEl.setAttribute("aria-live", "polite");
    sayEl.setAttribute("aria-atomic", "true");
    sayEl.style.cssText = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;" +
      "clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;";
    document.body.appendChild(sayEl);
    return sayEl;
  }
  function say(text) {
    var el = liveRegion();
    window.setTimeout(function () {
      el.textContent = text;
      window.setTimeout(function () { el.textContent = ""; }, 7000);
    }, 60);
  }

  /* ---------------------------------------------------------- Sound -- */
  /* Same mute as Book FX and the chat. Everything goes through one gain
     (.55) into a compressor, so the busy moment can't clip or bite. The
     cues are scheduled once the context is running; if it can't start
     yet, they are dropped rather than played in a heap later. */
  var actx = null, out = null, noiseBuf = null, closeT = 0;
  function muted() {
    try { return localStorage.getItem("askIsaacSound") === "off"; } catch (e) { return false; }
  }

  /* impact: ms from the start when the ace lands; 0 = the reduced-motion
     chime instead of the scene's cues. */
  function sound(start, impact) {
    var quiet = !impact;
    if (muted()) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!actx) {
        actx = new AC();
        var comp = actx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4;
        comp.attack.value = .002; comp.release.value = .18;
        out = actx.createGain(); out.gain.value = .55;
        out.connect(comp); comp.connect(actx.destination);
        var len = Math.floor(actx.sampleRate * .5);
        noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
        var data = noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      var cues = quiet
        ? [[0, function (t) { arpeggio(t, [1046.5, 1318.5, 1568], .09, .1); }]]
        : [
          [CONTACT - 125, swish],
          [CONTACT, thwock],
          [impact, ping],
          [impact + 110, function (t) { arpeggio(t, [784, 1046.5, 1318.5, 1568, 2093], .065, .11); }],
        ];
      var go = function () {
        if (!actx) return;
        var late = performance.now() - start;
        cues.forEach(function (c) {
          var wait = c[0] - late;
          if (wait >= -150) c[1](actx.currentTime + .01 + Math.max(0, wait) / 1000);
        });
      };
      if (actx.state === "running") go();
      else actx.resume().then(go, function () {});
      window.clearTimeout(closeT);
      closeT = window.setTimeout(closeAudio, quiet ? 2500 : END + 1500);
    } catch (e) { closeAudio(); }
  }
  function closeAudio() {
    if (actx) { try { actx.close(); } catch (e) {} }
    actx = null; out = null; noiseBuf = null;
  }

  function envelope(t, peak, attack, decay) {
    var gn = actx.createGain();
    gn.gain.setValueAtTime(.0001, t);
    gn.gain.exponentialRampToValueAtTime(peak, t + attack);
    gn.gain.exponentialRampToValueAtTime(.0001, t + attack + decay);
    gn.connect(out);
    return gn;
  }
  function tone(t, type, f0, f1, glide, peak, attack, decay) {
    var o = actx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    o.connect(envelope(t, peak, attack, decay));
    o.start(t); o.stop(t + attack + decay + .03);
  }
  function hiss(t, type, freq, q, peak, decay) {
    var n = actx.createBufferSource(), f = actx.createBiquadFilter();
    n.buffer = noiseBuf;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    n.connect(f).connect(envelope(t, peak, .002, decay));
    n.start(t, Math.random() * .3, decay + .03);
  }

  /* The racket through the air: a breath of noise sweeping up. */
  function swish(t) {
    var n = actx.createBufferSource(), f = actx.createBiquadFilter(), gn = actx.createGain();
    n.buffer = noiseBuf;
    f.type = "bandpass"; f.Q.value = 1.4;
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3200, t + .12);
    gn.gain.setValueAtTime(.0001, t);
    gn.gain.exponentialRampToValueAtTime(.16, t + .09);
    gn.gain.exponentialRampToValueAtTime(.0001, t + .15);
    n.connect(f).connect(gn).connect(out);
    n.start(t, 0, .17);
  }
  /* The serve: strings, a crisp edge, the frame's knock, the body. */
  function thwock(t) {
    hiss(t, "bandpass", 1900, .9, .5, .035);
    hiss(t, "highpass", 4200, .7, .1, .014);
    tone(t, "sine", 640, 170, .055, .42, .003, .09);
    tone(t, "sine", 150, 90, .04, .3, .003, .06);
  }
  /* The ace: a bright, bell-like ping that rises a hair into pitch. */
  function ping(t) {
    tone(t, "sine", 1480, 1568, .02, .24, .003, .55);
    tone(t, "sine", 3136, 3136, 0, .06, .002, .25);
    tone(t, "sine", 4327, 4327, 0, .03, .002, .12);
  }
  /* Up a major chord, quick, the last note left to ring. */
  function arpeggio(t, notes, step, peak) {
    notes.forEach(function (f, i) {
      var end = i === notes.length - 1;
      tone(t + i * step, "triangle", f, f, 0, peak, .006, end ? .6 : .26);
      tone(t + i * step, "sine", f * 2, f * 2, 0, peak * .22, .004, end ? .32 : .14);
    });
  }
  /* A ball landing: a short falling knock and a tick of felt. Bigger
     balls a little lower; louder for a harder landing. */
  function pok(v, r) {
    if (!actx || actx.state !== "running" || muted()) return;
    try {
      var t = actx.currentTime + .005, f = (1150 - r * 20) * (.92 + Math.random() * .16);
      tone(t, "sine", f, f * .55, .035, .04 + .09 * v, .002, .07);
      hiss(t, "bandpass", 2600, 1.2, .02 + .05 * v, .014);
    } catch (e) { /* a missed pok is fine */ }
  }
})();
