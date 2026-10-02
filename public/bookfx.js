/* ============================================================================
   Book FX — a tennis moment on every Book button.

   Pressing any Book control (anything with data-cal-link: the header, the
   hero, the lesson cards, the contact band, and the copies inside the chat
   and the lesson matcher) "hits" a ball off it while the calendar opens:

     · the button squashes and springs back, like strings taking the ball;
     · a ring rings out from the point of contact, in the button's colour;
     · a few flecks of felt fuzz burst off;
     · an optic-yellow ball leaves the button, peaks, and bounces three
       times along an invisible court line before it fades;
     · the sound follows the picture: a racket "thwock" on the press, then
       a "pok … pok . pok" landing exactly on each bounce.

   Sound is synthesized with Web Audio (no files) and obeys the same mute
   the Ask Isaac chat sets. Reduced motion keeps the sound and drops the
   visuals. Only real clicks count: tennis.js replays a click when the
   calendar finishes loading, and that replay doesn't get a second ball.
   ========================================================================== */

(function () {
  "use strict";

  if (!document.documentElement.animate) return;   // no Web Animations, no show

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var layer = null;
  var ctx = null;

  /* Timing of the ball, shared by the picture and the sound so the "pok"s
     land on the bounces. Milliseconds from the press. */
  var FLIGHT = [
    { end: 430, height: 150 },   // off the strings, up, down to the line
    { end: 660, height: 52 },    // first bounce
    { end: 800, height: 18 },    // second, small
  ];
  var FADE_END = 1050;

  document.addEventListener("click", function (e) {
    if (!e.isTrusted) return;
    var btn = e.target.closest && e.target.closest("[data-cal-link]");
    if (!btn) return;

    play();
    if (reduce && reduce.matches) return;

    var r = btn.getBoundingClientRect();
    /* Keyboard "clicks" report 0,0: use the button's centre then. */
    var x = e.clientX || r.left + r.width / 2;
    var y = e.clientY || r.top + r.height / 2;
    /* The ring takes the button's fill; a text link (the menu's "Book a
       lesson") has none, so it takes the text colour instead. */
    var cs = getComputedStyle(btn);
    var color = /rgba\(.*,\s*0\)|transparent/.test(cs.backgroundColor) ? cs.color : cs.backgroundColor;

    /* One frame later, so the calendar's popup (opened by this same click)
       is already in the page, and the layer can go after it: both sit at
       the top z-index, so the later one draws on top and the ball isn't
       dimmed by the popup's backdrop. */
    requestAnimationFrame(function () {
      document.body.appendChild(getLayer());
      squash(btn);
      ring(x, y, color);
      fuzz(x, y);
      ball(x, y, r);
    });
  });

  /* ---------------------------------------------------------- Visuals -- */
  function getLayer() {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement("div");
    layer.className = "bookfx";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    return layer;
  }

  function add(el) { getLayer().appendChild(el); return el; }
  function done(anim, el) { anim.onfinish = function () { el.remove(); }; }

  function squash(btn) {
    btn.animate([
      { transform: "scale(1)" },
      { transform: "scale(.94, .9)", offset: .3 },
      { transform: "scale(1.03, 1.02)", offset: .65 },
      { transform: "scale(1)" },
    ], { duration: 340, easing: "cubic-bezier(.22, 1, .36, 1)" });
  }

  function ring(x, y, color) {
    var el = add(document.createElement("span"));
    el.className = "bookfx-ring";
    el.style.left = x + "px"; el.style.top = y + "px";
    el.style.borderColor = color;
    done(el.animate([
      { transform: "translate(-50%, -50%) scale(.15)", opacity: .7 },
      { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
    ], { duration: 520, easing: "cubic-bezier(.22, 1, .36, 1)" }), el);
  }

  function fuzz(x, y) {
    for (var i = 0; i < 9; i++) {
      var el = add(document.createElement("span"));
      el.className = "bookfx-fuzz";
      el.style.left = x + "px"; el.style.top = y + "px";
      var a = (Math.PI * 2 * i) / 9 + Math.random() * .5;
      var d = 26 + Math.random() * 34;
      var s = .6 + Math.random() * .8;
      done(el.animate([
        { transform: "translate(-50%, -50%) scale(" + s + ")", opacity: 1 },
        { transform: "translate(calc(-50% + " + Math.cos(a) * d + "px), calc(-50% + " + Math.sin(a) * d + "px)) scale(0)", opacity: 0 },
      ], { duration: 380 + Math.random() * 180, easing: "cubic-bezier(.16, 1, .3, 1)" }), el);
    }
  }

  /* The ball: sampled parabolas, one per hop, with a squash on each
     landing and a spin that slows as it loses height. It drifts toward
     the side of the screen with more room, so it never leaves at once. */
  function ball(x, y, r) {
    var el = add(document.createElement("span"));
    el.className = "bookfx-ball";
    el.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="11" fill="#d9ef3f"/><circle cx="12" cy="12" r="11" fill="url(#bookfxShade)"/><path d="M3.2 6.5c3.6 2.2 3.6 8.8 0 11M20.8 6.5c-3.6 2.2-3.6 8.8 0 11" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><defs><radialGradient id="bookfxShade" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#5d6a00" stop-opacity=".35"/></radialGradient></defs></svg>';
    el.style.left = x + "px"; el.style.top = y + "px";

    var shadow = add(document.createElement("span"));
    shadow.className = "bookfx-shadow";

    var dir = x < window.innerWidth / 2 ? 1 : -1;
    var travel = dir * Math.min(260, Math.max(150, window.innerWidth * .28));
    var floor = Math.min(r.bottom + 18, window.innerHeight - 20) - y;   // relative to the press
    shadow.style.left = x + "px"; shadow.style.top = (y + floor + 10) + "px";

    var frames = [], shadowFrames = [];
    var start = 0, from = 0, spin = 0;
    FLIGHT.forEach(function (hop, h) {
      var steps = h === 0 ? 12 : 8;
      for (var i = 0; i <= steps; i++) {
        if (h > 0 && i === 0) continue;
        var s = i / steps;
        var t = start + (hop.end - start) * s;
        /* First hop starts at the press point, above the line; later hops
           start and end on the line. */
        var base = from + (floor - from) * s;
        var dy = base - 4 * hop.height * s * (1 - s);
        var dx = travel * (t / FLIGHT[2].end);
        spin += dir * (h === 0 ? 34 : 18);
        var landing = i === steps;
        var scale = landing ? "scale(1.18, .78)" : "scale(1)";
        frames.push({
          offset: t / FADE_END,
          /* scale before rotate in the list, so the squash flattens against
             the ground whatever way the ball has spun. */
          transform: "translate(-50%, -50%) translate(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px) " + scale + " rotate(" + spin + "deg)",
          opacity: 1,
        });
        var lift = Math.max(0, floor - dy);
        shadowFrames.push({
          offset: t / FADE_END,
          transform: "translate(-50%, -50%) translateX(" + dx.toFixed(1) + "px) scale(" + Math.max(.35, 1 - lift / 190).toFixed(2) + ")",
          opacity: Math.max(.1, .5 - lift / 400).toFixed(2),
        });
      }
      start = hop.end; from = floor;
    });
    /* Then it rolls a little further and fades out. */
    frames.push({ offset: 1, transform: "translate(-50%, -50%) translate(" + (travel * 1.22).toFixed(1) + "px, " + floor.toFixed(1) + "px) scale(1) rotate(" + (spin + dir * 120) + "deg)", opacity: 0 });
    shadowFrames.push({ offset: 1, transform: "translate(-50%, -50%) translateX(" + (travel * 1.22).toFixed(1) + "px) scale(1)", opacity: 0 });
    frames[0].offset = 0; shadowFrames[0].offset = 0;

    done(el.animate(frames, { duration: FADE_END, easing: "linear" }), el);
    done(shadow.animate(shadowFrames, { duration: FADE_END, easing: "linear" }), shadow);
  }

  /* ------------------------------------------------------------ Sound -- */
  function muted() {
    try { return localStorage.getItem("askIsaacSound") === "off"; } catch (e) { return false; }
  }

  function play() {
    if (muted()) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!ctx) ctx = new AC();
      var go = function () {
        var t = ctx.currentTime + .005;
        thwock(t);
        pok(t + FLIGHT[0].end / 1000, .16);
        pok(t + FLIGHT[1].end / 1000, .09);
        pok(t + FLIGHT[2].end / 1000, .045);
      };
      if (ctx.state === "suspended") ctx.resume().then(go, function () {});
      else go();
    } catch (e) { ctx = null; }
  }

  /* The hit: a bright burst of noise for the strings, a short low knock
     for the frame, and a quick falling tone for the ball leaving. */
  function thwock(t) {
    var len = Math.floor(ctx.sampleRate * .03);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    var n = ctx.createBufferSource(); n.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1900; bp.Q.value = .9;
    var ng = ctx.createGain(); ng.gain.value = .32;
    n.connect(bp).connect(ng).connect(ctx.destination);
    n.start(t);

    tone(t, 620, 170, .09, .3);
    tone(t, 140, 90, .06, .22);
  }

  /* A landing: the same falling sine as the chat's reply sound. */
  function pok(t, vol) { tone(t, 430, 150, .14, vol); }

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
