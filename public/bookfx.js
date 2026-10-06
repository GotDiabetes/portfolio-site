/* ============================================================================
   Book FX — a quick stick-figure serve on every Book button.

   Pressing any Book control (anything with data-cal-link: the header, the
   hero, the lesson cards, the contact band, and the copies inside the chat
   and the lesson matcher) puts a little player on top of the button who
   hits one serve, fast, while the calendar is still opening:

     · the button squashes and springs back, and a ring goes out from the
       press, in the button's own colour;
     · the player (always black, with a thin white outline so it reads on
       the black bands and the calendar's backdrop) starts in the trophy
       pose with the ball already tossed, Ben Shelton style: deep racket
       drop, a leap so contact happens in the air, then a landing on the
       front foot with the back leg kicking up;
     · at contact, a spark and a puff of felt fuzz, and the ball leaves
       forward and down, shrinking into the distance, toward the side of
       the screen with more room;
     · sound follows the swing: a "swish" and a "thwock" on contact.

   It is kept short (about 0.7s) on purpose: it is a beat between pressing
   Book and reading dates, not a scene played over the calendar. There is
   no court, net or bounce. Everything it draws, and the one-time sound
   note, is kept above the calendar popup even when the popup arrives late.

   The figure is a skeleton of joints keyed through five poses and eased
   every frame. Sound is synthesized with Web Audio and obeys the Ask Isaac
   chat's mute. Reduced motion keeps the sound and drops the visuals. Only
   real clicks count: tennis.js replays a click once the calendar loads,
   and that replay doesn't serve a second ball.
   ========================================================================== */

(function () {
  "use strict";

  if (!window.requestAnimationFrame || !document.documentElement.animate) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var SVG = "http://www.w3.org/2000/svg";
  var BALL = "#d9ef3f";
  var DURATION = 720;      // ms, the whole serve including the fade
  var CONTACT = 0.36;      // fraction of DURATION where racket meets ball
  var layer = null;
  var ctx = null;

  /* --------------------------------------------------------- The serve --
     Joints in figure units: x forward (toward the serve), y up negative,
     feet on y = 0, about 85 units tall. r = racket angle in degrees,
     0 = pointing forward, -90 = straight up, 90 = straight down.
     lFoot/lKnee = back leg, rFoot/rKnee = front leg; lHand = tossing arm,
     rHand = hitting arm. */
  var POSES = [
    { t: 0,     // trophy: feet together, knees bent, back arched, racket up behind, ball in the air
      head: [-15, -62], neck: [-10, -53], hip: [-3, -27],
      lKnee: [15, -14], lFoot: [7, 0], rKnee: [19, -15], rFoot: [13, 0],
      lElbow: [-2, -71], lHand: [2, -88], rElbow: [-21, -58], rHand: [-24, -72], r: -112 },
    { t: 0.2,   // racket drop: exploding up, heels off, racket head deep behind the back
      head: [-4, -78], neck: [-2, -68], hip: [2, -41],
      lKnee: [8, -22], lFoot: [6, -5], rKnee: [12, -22], rFoot: [13, -5],
      lElbow: [8, -64], lHand: [12, -55], rElbow: [-11, -74], rHand: [-13, -60], r: 96 },
    { t: CONTACT, // contact in the air: fully stretched, toes pointed, arm and racket straight up
      head: [7, -97], neck: [11, -86], hip: [8, -58],
      lKnee: [4, -39], lFoot: [-1, -22], rKnee: [12, -39], rFoot: [10, -20],
      lElbow: [17, -73], lHand: [13, -65], rElbow: [16, -104], rHand: [20, -119], r: -76 },
    { t: 0.72,  // landing: on the front foot, back leg kicks up, racket across the body
      head: [43, -63], neck: [37, -57], hip: [24, -36],
      lKnee: [11, -31], lFoot: [-3, -37], rKnee: [30, -18], rFoot: [33, 0],
      lElbow: [31, -48], lHand: [37, -43], rElbow: [33, -46], rHand: [25, -34], r: 205 },
    { t: 1,     // recover
      head: [35, -72], neck: [32, -62], hip: [25, -37],
      lKnee: [21, -19], lFoot: [18, 0], rKnee: [32, -19], rFoot: [35, 0],
      lElbow: [38, -53], lHand: [43, -46], rElbow: [33, -50], rHand: [29, -38], r: 210 },
  ];
  var JOINTS = ["head", "neck", "hip", "lKnee", "lFoot", "rKnee", "rFoot", "lElbow", "lHand", "rElbow", "rHand"];

  function easeInOut(u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function easeOut(u) { return 1 - Math.pow(1 - u, 3); }
  function lerp(a, b, u) { return a + (b - a) * u; }

  function poseAt(t) {
    var i = 0;
    while (i < POSES.length - 2 && t > POSES[i + 1].t) i++;
    var a = POSES[i], b = POSES[i + 1];
    var u = easeInOut(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))));
    var p = { r: lerp(a.r, b.r, u) };
    JOINTS.forEach(function (j) { p[j] = [lerp(a[j][0], b[j][0], u), lerp(a[j][1], b[j][1], u)]; });
    return p;
  }

  /* -------------------------------------------------------------- Press -- */
  document.addEventListener("click", function (e) {
    if (!e.isTrusted) return;
    var btn = e.target.closest && e.target.closest("[data-cal-link]");
    if (!btn) return;

    playSound();
    noteSound();
    if (reduce && reduce.matches) return;

    var r = btn.getBoundingClientRect();
    var x = e.clientX || r.left + r.width / 2;    // keyboard clicks report 0,0
    var y = e.clientY || r.top + r.height / 2;
    var cs = getComputedStyle(btn);
    /* The ring takes the button's fill; a text link (the menu's "Book a
       lesson") has none, so it takes the text colour instead. */
    var color = /rgba\(.*,\s*0\)|transparent/.test(cs.backgroundColor) ? cs.color : cs.backgroundColor;

    requestAnimationFrame(function () {
      document.body.appendChild(getLayer());
      keepOnTop();
      squash(btn);
      ring(x, y, color);
      /* The player is always black (the page's ink); its white outline
         keeps it visible on the black bands and the calendar's backdrop. */
      serve(x, r, "#111111");
    });
  });

  function getLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement("div");
    layer.className = "bookfx";
    layer.setAttribute("aria-hidden", "true");
    return layer;
  }

  /* The calendar popup and the effect layer both sit at the top z-index, so
     whichever comes later in the page draws on top. On a warm click the
     popup already exists; on a cold one (first visit, slow phone) the
     embed adds it a moment later — after the layer and after the sound
     note, which would then be under its backdrop and unclickable. So for a
     few seconds after a press, anything new added to <body> sends the
     layer and the note back to the end. */
  var watching = null;
  function keepOnTop() {
    if (watching) return;
    watching = new MutationObserver(function (records) {
      var ours = [layer, document.querySelector(".sound-note")];
      var foreign = records.some(function (r) {
        return Array.prototype.some.call(r.addedNodes, function (n) {
          return n.nodeType === 1 && ours.indexOf(n) < 0;
        });
      });
      if (!foreign) return;
      ours.forEach(function (n) { if (n && n.isConnected) document.body.appendChild(n); });
    });
    watching.observe(document.body, { childList: true });
    window.setTimeout(function () { watching.disconnect(); watching = null; }, 8000);
  }

  function squash(btn) {
    btn.animate([
      { transform: "scale(1)" },
      { transform: "scale(.94, .9)", offset: .3 },
      { transform: "scale(1.03, 1.02)", offset: .65 },
      { transform: "scale(1)" },
    ], { duration: 340, easing: "cubic-bezier(.22, 1, .36, 1)" });
  }

  function ring(x, y, color) {
    var el = document.createElement("span");
    el.className = "bookfx-ring";
    el.style.left = x + "px"; el.style.top = y + "px";
    el.style.borderColor = color;
    layer.appendChild(el);
    el.animate([
      { transform: "translate(-50%, -50%) scale(.15)", opacity: .7 },
      { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
    ], { duration: 520, easing: "cubic-bezier(.22, 1, .36, 1)" }).onfinish = function () { el.remove(); };
  }

  function fuzz(x, y) {
    for (var i = 0; i < 9; i++) {
      var el = document.createElement("span");
      el.className = "bookfx-fuzz";
      el.style.left = x + "px"; el.style.top = y + "px";
      layer.appendChild(el);
      var a = (Math.PI * 2 * i) / 9 + Math.random() * .5;
      var d = 18 + Math.random() * 26;
      el.animate([
        { transform: "translate(-50%, -50%) scale(" + (.6 + Math.random() * .8) + ")", opacity: 1 },
        { transform: "translate(calc(-50% + " + Math.cos(a) * d + "px), calc(-50% + " + Math.sin(a) * d + "px)) scale(0)", opacity: 0 },
      ], { duration: 360 + Math.random() * 160, easing: "cubic-bezier(.16, 1, .3, 1)" }).onfinish = (function (n) { return function () { n.remove(); }; })(el);
    }
  }

  /* --------------------------------------------------------- The player -- */
  function serve(pressX, r, color) {
    var W = window.innerWidth, H = window.innerHeight;
    var S = W < 560 ? .85 : 1;                                   // figure scale
    /* Stand on top of the button, just behind the press, facing the side
       of the screen with more room. Near the top of the screen (the
       header's Book button) there's no room above, so the player stands
       just below the button instead. */
    var dir = W - pressX >= pressX ? 1 : -1;
    var ox = Math.min(W - 40, Math.max(40, pressX - dir * 18 * S));
    var oy = r.top > 130 * S ? r.top - 1 : r.bottom + 112 * S;
    var room = dir > 0 ? W - ox - 16 : ox - 16;

    var svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("class", "bookfx-court");
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    layer.appendChild(svg);

    function el(tag, attrs, parent) {
      var n = document.createElementNS(SVG, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    }
    var line = { fill: "none", stroke: color, "stroke-width": 3.2 * S, "stroke-linecap": "round", "stroke-linejoin": "round" };
    /* A thin outline in the opposite tone, like a sticker, so the figure
       still reads when the calendar's backdrop dims the page behind it. */
    var halo = "rgba(255,255,255,.9)";
    var shadow = el("ellipse", { cx: ox, cy: oy + 1.5, rx: 16 * S, ry: 2.6 * S, fill: "rgba(0,0,0,.18)" });
    var bodyHalo = el("path", Object.assign({}, line, { stroke: halo, "stroke-width": 6.4 * S }));
    var headHalo = el("circle", { r: 8.9 * S, fill: halo });
    var body = el("path", line);
    var head = el("circle", { r: 7.2 * S, fill: color });
    var racket = el("g", {});
    el("line", Object.assign({ x1: 0, y1: 0, x2: 13 * S, y2: 0 }, line, { stroke: halo, "stroke-width": 5.2 * S }), racket);
    el("ellipse", { cx: 22 * S, cy: 0, rx: 9.5 * S, ry: 6.6 * S, fill: "none", stroke: halo, "stroke-width": 5 * S }, racket);
    el("line", Object.assign({ x1: 0, y1: 0, x2: 13 * S, y2: 0 }, line, { "stroke-width": 2.6 * S }), racket);
    el("ellipse", { cx: 22 * S, cy: 0, rx: 9.5 * S, ry: 6.6 * S, fill: "none", stroke: color, "stroke-width": 2.4 * S }, racket);
    el("path", { d: "M" + 15 * S + " 0H" + 29 * S + "M" + 22 * S + " -5V5", stroke: color, "stroke-width": .9 * S, opacity: .55 }, racket);

    /* The spark at contact: a flash and a ring of streaks thrown out from
       the strings, biased the way the ball is going. Amber with a white
       core, so it reads on white and on black. */
    var spark = el("g", { opacity: 0 });
    var flash = el("circle", { r: 0, fill: "#fff", stroke: "#f5b700", "stroke-width": 2 * S }, spark);
    var streaks = [];
    for (var si = 0; si < 11; si++) {
      var a = (si / 11) * Math.PI * 2 + (Math.random() - .5) * .35;
      var len = (.7 + Math.random() * .6) * (Math.cos(a) * dir > .2 ? 1.35 : 1);   // longer forward
      streaks.push({
        a: a, len: len,
        outer: el("line", { stroke: "#f5b700", "stroke-width": 3.2 * S, "stroke-linecap": "round" }, spark),
        inner: el("line", { stroke: "#fffbe0", "stroke-width": 1.3 * S, "stroke-linecap": "round" }, spark),
      });
    }

    var trail = [0, 1, 2].map(function (i) { return el("circle", { r: (5.6 - i) * S, fill: BALL, opacity: 0 }); });
    var ball = el("circle", { r: 6 * S, fill: BALL, stroke: "rgba(0,0,0,.25)", "stroke-width": .8 });

    function pt(p) { return [ox + dir * p[0] * S, oy + p[1] * S]; }

    /* The ball: already tossed, falling the last little way onto the
       strings, then away — forward and down, shrinking into the distance. */
    var contactP = poseAt(CONTACT);
    var ang = contactP.r * Math.PI / 180;
    var strike = pt([contactP.rHand[0] + Math.cos(ang) * 22, contactP.rHand[1] + Math.sin(ang) * 22]);
    var R0 = 6 * S;
    var travel = Math.max(120, Math.min(300, room - 20)) * dir;
    var drop = 46 * S;
    var past = [];
    var fuzzed = false;

    var start = performance.now();
    (function frame(now) {
      var t = Math.min(1, (now - start) / DURATION);
      var p = poseAt(t);
      var j = {};
      JOINTS.forEach(function (k) { j[k] = pt(p[k]); });

      var d = "M" + j.neck + "L" + j.hip +
        "M" + j.lFoot + "L" + j.lKnee + "L" + j.hip + "L" + j.rKnee + "L" + j.rFoot +
        "M" + j.lHand + "L" + j.lElbow + "L" + j.neck + "L" + j.rElbow + "L" + j.rHand;
      body.setAttribute("d", d); bodyHalo.setAttribute("d", d);
      head.setAttribute("cx", j.head[0]); head.setAttribute("cy", j.head[1]);
      headHalo.setAttribute("cx", j.head[0]); headHalo.setAttribute("cy", j.head[1]);
      /* Mirror the racket angle with the figure when serving leftwards. */
      var deg = dir === 1 ? p.r : 180 - p.r;
      racket.setAttribute("transform", "translate(" + j.rHand + ") rotate(" + deg + ")");

      var bx, by, bs = 1, bo = 1;
      if (t < CONTACT) {                                      // falling onto the strings
        var u = t / CONTACT;
        bx = strike[0] - dir * 3 * S * (1 - u);
        by = strike[1] - 26 * S * (1 - u * u);
      } else {                                                // served: away, forward and down
        var v = (t - CONTACT) / (1 - CONTACT);
        bx = strike[0] + travel * easeOut(v);
        by = strike[1] + drop * v * v - 10 * S * Math.sin(Math.PI * v);
        bs = 1 - .45 * v;
        bo = v > .6 ? 1 - (v - .6) / .4 : 1;
        if (!fuzzed) { fuzzed = true; fuzz(strike[0], strike[1]); }
      }

      /* Spark: a fifth of a second from contact. */
      var q = (t - CONTACT) / (180 / DURATION);
      if (q >= 0 && q <= 1) {
        var e = easeOut(q);
        spark.setAttribute("opacity", 1 - q * q);
        flash.setAttribute("cx", strike[0]); flash.setAttribute("cy", strike[1]);
        flash.setAttribute("r", (4 + 7 * e) * S);
        flash.setAttribute("opacity", 1 - q);
        streaks.forEach(function (s) {
          var r1 = (5 + 16 * e) * S * s.len, r2 = (10 + 30 * e) * S * s.len;
          var x1 = strike[0] + Math.cos(s.a) * r1, y1 = strike[1] + Math.sin(s.a) * r1;
          var x2 = strike[0] + Math.cos(s.a) * r2, y2 = strike[1] + Math.sin(s.a) * r2;
          [s.outer, s.inner].forEach(function (l) {
            l.setAttribute("x1", x1); l.setAttribute("y1", y1);
            l.setAttribute("x2", x2); l.setAttribute("y2", y2);
          });
        });
      } else if (q > 1) {
        spark.setAttribute("opacity", 0);
      }

      ball.setAttribute("cx", bx); ball.setAttribute("cy", by);
      ball.setAttribute("r", R0 * bs); ball.setAttribute("opacity", bo);
      past.unshift([bx, by]); past.length = 4;
      trail.forEach(function (c, i) {
        var qq = past[i + 1];
        var on = t > CONTACT && qq;
        c.setAttribute("opacity", on ? (.35 - i * .1) * bo : 0);
        if (qq) { c.setAttribute("cx", qq[0]); c.setAttribute("cy", qq[1]); }
      });

      /* In quickly, out at the end. */
      var fig = t < .06 ? t / .06 : t > .8 ? Math.max(0, 1 - (t - .8) / .2) : 1;
      [body, head, bodyHalo, headHalo, racket, shadow].forEach(function (n) { n.setAttribute("opacity", fig); });
      /* The shadow follows the feet, so the leap reads as a leap. */
      var feet = (j.lFoot[0] + j.rFoot[0]) / 2, lift = oy - Math.max(j.lFoot[1], j.rFoot[1]);
      shadow.setAttribute("cx", feet);
      shadow.setAttribute("rx", 16 * S * Math.max(.55, 1 - lift / (40 * S)));

      if (t < 1) requestAnimationFrame(frame);
      else svg.remove();
    })(start);
  }

  /* ------------------------------------------------------------- Sound -- */
  /* The first time a Book press makes a sound, say so and offer the off
     switch right there, instead of only inside the chat. Once per visitor;
     turning it off here mutes the chat too (same setting, and the chat is
     told through an event so an open page stays in sync). The note is kept
     above the calendar popup by keepOnTop(). */
  function noteSound() {
    if (muted()) return;
    try { if (localStorage.getItem("isaacSoundNoted")) return; localStorage.setItem("isaacSoundNoted", "1"); } catch (e) { return; }
    var T = window.I18N || {};   // the translated pages' words (tools/i18n/)
    var bar = document.createElement("div");
    bar.className = "sound-note";
    bar.setAttribute("role", "status");
    var said = document.createElement("span");
    said.textContent = T.soundsOn || "Tennis sounds on";
    var off = document.createElement("button");
    off.type = "button";
    off.textContent = T.soundsTurnOff || "Turn off";
    bar.appendChild(said);
    bar.appendChild(off);
    document.body.appendChild(bar);
    keepOnTop();
    var gone = false;
    function hide() {
      if (gone) return; gone = true;
      bar.classList.add("is-out");
      window.setTimeout(function () { bar.remove(); }, 400);
    }
    off.addEventListener("click", function () {
      try { localStorage.setItem("askIsaacSound", "off"); } catch (e) {}
      window.dispatchEvent(new CustomEvent("isaac:sound", { detail: { on: false } }));
      said.textContent = T.soundsOff || "Sounds off";
      off.remove();
      window.setTimeout(hide, 1200);
    });
    window.setTimeout(hide, 6000);
  }

  function muted() {
    try { return localStorage.getItem("askIsaacSound") === "off"; } catch (e) { return false; }
  }

  function playSound() {
    if (muted()) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!ctx) ctx = new AC();
      var go = function () {
        var hit = ctx.currentTime + .02 + (DURATION * CONTACT) / 1000;
        swish(hit - .12);
        thwock(hit);
      };
      if (ctx.state === "suspended") ctx.resume().then(go, function () {}); else go();
    } catch (e) { ctx = null; }
  }

  function noise(seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var n = ctx.createBufferSource(); n.buffer = buf;
    return n;
  }

  /* The racket through the air: a breath of noise whose band sweeps up as
     the racket accelerates into the ball. */
  function swish(t) {
    var n = noise(.14);
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + .12);
    var g = ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(.14, t + .09);
    g.gain.exponentialRampToValueAtTime(.0001, t + .14);
    n.connect(bp).connect(g).connect(ctx.destination);
    n.start(t);
  }

  /* The hit: a bright burst for the strings, a short knock for the frame,
     and a quick falling tone for the ball leaving. */
  function thwock(t) {
    var n = noise(.03);
    var d = n.buffer.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] *= Math.pow(1 - i / d.length, 2.5);
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1900; bp.Q.value = .9;
    var ng = ctx.createGain(); ng.gain.value = .34;
    n.connect(bp).connect(ng).connect(ctx.destination);
    n.start(t);
    tone(t, 620, 170, .09, .3);
    tone(t, 140, 90, .06, .22);
  }

  function tone(t, f0, f1, dur, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * .6);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .004);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + .02);
  }
})();
