/* ============================================================================
   Tip demos: "Watch the fix" on the practice tips page (/tips/).

   Every tip (an <article class="tip"> with one of the ids below) gets a
   quiet link button. Pressing it opens a small stage under the title (under
   the fix on phones) and plays a 3-4 second side-view demo with the Book FX
   stick figure: the mistake first, ending in a small ✕, then the fix the
   tip describes, ending in a ✓. The court is a few thin grey lines; the
   ball is the page's one colour (the Ball Exception). There is no text in
   the drawing, so it works in every language; the words are the button
   (window.I18N.tipDemoPlay / tipDemoReplay) and the stage's accessible
   name (the tip's own heading + window.I18N.tipDemoLabel).

     · Nothing runs until a button is pressed; the canvas is made then.
     · One demo plays at a time: starting one finishes any other.
     · Each fix shows its body cue in ink (a ring where the toss belongs,
       the brush up the back of the ball, the finish over the shoulder,
       the split-step...), and playback slows to 0.4x around the fix's
       contact so the cue is seen.
     · The last frame stays: the mistake's path dashed grey with its ✕,
       the fix's path in ink with its ✓, and the cue left faint, so the
       still teaches on its own.
     · Reduced motion: the button shows that last frame, without playing.
     · Screen readers: the stage is an image named by the tip's heading
       and described by the tip's own fix paragraph (aria-describedby).
     · Sound: a soft "pok" on hits and bounces and a light swish on swings,
       synthesized with Web Audio through one gain (0.5) and a compressor,
       obeying the site's one mute (localStorage askIsaacSound = "off").
     · Right-to-left pages draw the scene mirrored (the ✓ is not).

   The figure is the Book FX rig: eleven joints in figure units (x forward,
   y up negative, feet on y = 0, about 85 units tall), keyed through poses
   and eased every frame, drawn in ink over a thin white halo with Book
   FX's racket glyph in the hitting hand.
   ========================================================================== */

(function () {
  "use strict";

  var IDS = ["serve-net", "serve-long", "double-fault", "forehand-net", "forehand-long", "backhand",
    "rally", "footwork", "volley", "matches", "practice", "kids"];

  if (!window.requestAnimationFrame) return;
  var probe = document.createElement("canvas");
  if (!probe.getContext || !probe.getContext("2d")) return;

  var T = window.I18N || {};
  var docLang = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
  var RTL = (document.documentElement.getAttribute("dir") || "").toLowerCase() === "rtl";
  var reduceMQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  /* ------------------------------------------------------------ World --
     A 320 × 160 side view of a court: the player's baseline near the left,
     the net, the far service line and the far baseline. GY is the court
     surface; a ball's centre sits on GB when it touches the ground. */
  var W = 320, H = 160, GY = 138, NX = 176, NH = 20, NT = GY - NH;
  var BR = 3.4, GB = GY - BR, K = 0.72, PX = 42;
  var FSL = 236, FBL = 294;                       // far service line, far baseline
  var INK = "#111111", BALL = "#d9ef3f", LINE = "#cfcfcf", NET = "#a3a3a3";
  var OPP = "#a9a9a9", MISSPATH = "#9a9a9a", MISS = "#c4c4c4", XMARK = "#767676";

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(u) { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function backOut(u) { var c1 = 1.70158, v = u - 1; return 1 + (c1 + 1) * v * v * v + c1 * v * v; }
  function mix(a, b, u) {
    if (typeof a === "number") return a + (b - a) * u;
    var o = new Array(a.length);
    for (var i = 0; i < a.length; i++) o[i] = a[i] + (b[i] - a[i]) * u;
    return o;
  }
  /* keys: [[time, value], ...] (value: a pose array or a number), eased. */
  function at(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 0; i < keys.length - 1; i++) {
      var a = keys[i], b = keys[i + 1];
      if (t <= b[0]) return mix(a[1], b[1], ease((t - a[0]) / ((b[0] - a[0]) || 1)));
    }
    return keys[keys.length - 1][1];
  }
  function shift(keys, t0) { return keys.map(function (k) { return [k[0] + t0, k[1]]; }); }

  /* ------------------------------------------------------------ Poses --
     A pose is 24 numbers: head, neck, hip, lKnee, lFoot (back leg), rKnee,
     rFoot (front leg), lElbow, lHand (free/tossing arm), rElbow, rHand
     (racket arm) as x,y pairs, then r (racket angle: 0 forward, -90 up,
     90 down, 180 back) and rl (racket length along its axis: 1 as drawn,
     near 0 pointing at the viewer, -1 flipped; it is how a flat swing
     reads from the side). */
  var JN = ["head", "neck", "hip", "lKnee", "lFoot", "rKnee", "rFoot", "lElbow", "lHand", "rElbow", "rHand"];
  function P(base, o) {
    var a = base ? base.slice() : [], i;
    if (!base) { for (i = 0; i < 24; i++) a.push(0); a[23] = 1; }
    for (i = 0; i < JN.length; i++) if (o[JN[i]]) { a[i * 2] = o[JN[i]][0]; a[i * 2 + 1] = o[JN[i]][1]; }
    if ("r" in o) a[22] = o.r;
    if ("rl" in o) a[23] = o.rl;
    return a;
  }

  var STAND = P(null, { head: [1, -75], neck: [1, -65], hip: [0, -38], lKnee: [-6, -19], lFoot: [-10, 0], rKnee: [7, -19], rFoot: [10, 0],
    lElbow: [7, -50], lHand: [15, -46], rElbow: [6, -48], rHand: [14, -44], r: -50 });
  var READY = P(STAND, { head: [3, -72], neck: [2, -62], hip: [0, -36], lKnee: [-8, -18], lFoot: [-13, 0], rKnee: [9, -18], rFoot: [13, 0],
    lElbow: [9, -48], lHand: [17, -44], rElbow: [8, -46], rHand: [16, -42], r: -45 });

  /* Forehand: low take-back, contact out in front, finish over the shoulder. */
  var FH_BACK = P(READY, { head: [-2, -72], neck: [-2, -62], hip: [-1, -36], lElbow: [7, -54], lHand: [16, -55], rElbow: [-13, -46], rHand: [-21, -33], r: 145 });
  var FH_HIT = P(READY, { head: [5, -73], neck: [4, -63], hip: [1, -36], lElbow: [2, -52], lHand: [6, -47], rElbow: [11, -48], rHand: [22, -45], r: -12 });
  var FH_FIN = P(READY, { head: [5, -73], neck: [4, -63], hip: [2, -36], lKnee: [-5, -19], lFoot: [-12, -2], lElbow: [-3, -53], lHand: [3, -47],
    rElbow: [3, -68], rHand: [-6, -77], r: -160 });
  /* The same stroke hit flat: straight back, met late beside the body, pushed at the target. */
  var FLAT_BACK = P(FH_BACK, { rElbow: [-14, -50], rHand: [-24, -47], r: 180, rl: 1 });
  var FLAT_LATE = P(READY, { head: [1, -73], neck: [0, -63], lElbow: [6, -54], lHand: [12, -50], rElbow: [-4, -48], rHand: [5, -46], r: 180, rl: -.35 });
  var FLAT_FIN = P(READY, { head: [3, -73], neck: [2, -63], lElbow: [2, -52], lHand: [6, -48], rElbow: [12, -50], rHand: [25, -49], r: 180, rl: -1 });
  var FLAT_OPEN = P(READY, { head: [3, -73], neck: [2, -63], lElbow: [4, -52], lHand: [8, -48], rElbow: [8, -48], rHand: [18, -47], r: 168, rl: -.6 });
  var FLAT_OPEN_FIN = P(READY, { head: [3, -73], neck: [2, -63], lElbow: [2, -52], lHand: [6, -48], rElbow: [14, -54], rHand: [27, -58], r: 160, rl: -1 });

  /* Two-handed backhand: both hands on the grip, so it can't be read as a forehand. */
  var BH_TURN = P(READY, { head: [-1, -72], neck: [-3, -62], hip: [-2, -36], lKnee: [-9, -18], lFoot: [-14, 0], rKnee: [9, -18], rFoot: [14, 0],
    lElbow: [-11, -50], lHand: [-19, -40], rElbow: [-9, -48], rHand: [-18, -38], r: 150 });
  var BH_HIT = P(READY, { head: [5, -73], neck: [4, -63], hip: [1, -36], lElbow: [8, -48], lHand: [17, -46], rElbow: [8, -46], rHand: [18, -45], r: -15 });
  var BH_FIN = P(READY, { head: [4, -73], neck: [3, -63], hip: [1, -36], lElbow: [7, -64], lHand: [9, -77], rElbow: [8, -62], rHand: [10, -76], r: -125 });
  var BH_HALF = P(READY, { lElbow: [-2, -48], lHand: [-8, -42], rElbow: [-1, -46], rHand: [-7, -40], r: 170 });
  var BH_LATE = P(READY, { head: [2, -73], neck: [1, -63], lElbow: [0, -50], lHand: [5, -46], rElbow: [1, -48], rHand: [6, -45], r: 180, rl: -.3 });
  var BH_LATE_FIN = P(READY, { lElbow: [6, -52], lHand: [13, -52], rElbow: [7, -50], rHand: [14, -51], r: 185, rl: -1 });

  /* Serve, after the Book FX serve (grounded, a small hop at contact). */
  var SV_STANCE = P(null, { head: [-2, -74], neck: [-2, -64], hip: [-2, -38], lKnee: [-8, -19], lFoot: [-12, 0], rKnee: [7, -19], rFoot: [10, 0],
    lElbow: [6, -50], lHand: [14, -47], rElbow: [-4, -47], rHand: [4, -40], r: 15 });
  var SV_TOSS = P(null, { head: [-8, -70], neck: [-6, -60], hip: [-2, -34], lKnee: [6, -17], lFoot: [2, 0], rKnee: [14, -17], rFoot: [12, 0],
    lElbow: [4, -72], lHand: [8, -90], rElbow: [-16, -56], rHand: [-22, -66], r: -120 });
  var SV_DROP = P(SV_TOSS, { head: [-3, -74], neck: [-1, -65], hip: [2, -38], lKnee: [8, -19], lFoot: [4, 0], rKnee: [13, -19], rFoot: [12, 0],
    lElbow: [8, -60], lHand: [12, -52], rElbow: [-10, -70], rHand: [-12, -56], r: 96 });
  var SV_HIT = P(SV_TOSS, { head: [8, -91], neck: [11, -81], hip: [8, -51], lKnee: [4, -29], lFoot: [0, -6], rKnee: [12, -29], rFoot: [11, -6],
    lElbow: [17, -70], lHand: [14, -60], rElbow: [15, -99], rHand: [18, -114], r: -78 });
  var SV_FOL = P(SV_TOSS, { head: [26, -66], neck: [23, -57], hip: [16, -34], lKnee: [6, -24], lFoot: [-6, -20], rKnee: [24, -18], rFoot: [27, 0],
    lElbow: [28, -46], lHand: [33, -40], rElbow: [26, -44], rHand: [18, -30], r: 205 });
  /* Toss too low and too far in front: bent arm, hitting down early. */
  var SV_HIT_LOW = P(SV_TOSS, { head: [16, -80], neck: [18, -70], hip: [9, -42], lKnee: [6, -21], lFoot: [2, 0], rKnee: [16, -21], rFoot: [14, 0],
    lElbow: [22, -58], lHand: [20, -50], rElbow: [26, -84], rHand: [36, -94], r: -15 });
  var SV_FOL_LOW = P(SV_FOL, { head: [24, -68], neck: [22, -58], rElbow: [30, -50], rHand: [30, -36], r: 120 });
  /* Toss drifting behind: leaning back, the face open, no turn-over. */
  var SV_HIT_BACK = P(SV_TOSS, { head: [-14, -86], neck: [-10, -76], hip: [-2, -48], lKnee: [2, -27], lFoot: [0, -4], rKnee: [10, -27], rFoot: [12, -4],
    lElbow: [6, -70], lHand: [8, -60], rElbow: [-8, -98], rHand: [-10, -114], r: -100 });
  var SV_FOL_OPEN = P(SV_FOL, { head: [10, -72], neck: [9, -62], hip: [6, -37], lKnee: [2, -19], lFoot: [-4, 0], rKnee: [14, -19], rFoot: [16, 0],
    lElbow: [16, -50], lHand: [20, -44], rElbow: [18, -66], rHand: [26, -76], r: -45 });
  /* Second serve with spin: racket dropped deeper, brushing up the back of the ball. */
  var SV_BR_DROP = P(SV_DROP, { rElbow: [-11, -66], rHand: [-15, -50], r: 100 });
  var SV_BR_HIT = P(SV_HIT, { head: [5, -90], neck: [8, -80], rElbow: [10, -97], rHand: [12, -110], r: -112 });
  var SV_BR_UP = P(SV_HIT, { head: [12, -88], neck: [14, -78], rElbow: [22, -96], rHand: [28, -106], r: -40 });

  /* Volley: racket up in front, a short punch with a step. */
  var VOL_READY = P(READY, { lElbow: [10, -54], lHand: [17, -58], rElbow: [9, -52], rHand: [16, -56], r: -70 });
  var VOL_SET = P(VOL_READY, { head: [1, -72], neck: [0, -62], lElbow: [9, -54], lHand: [16, -54], rElbow: [6, -54], rHand: [12, -58], r: -78 });
  var VOL_PUNCH = P(READY, { head: [9, -72], neck: [8, -62], hip: [5, -36], lKnee: [-4, -19], lFoot: [-9, 0], rKnee: [18, -18], rFoot: [24, 0],
    lElbow: [4, -54], lHand: [8, -50], rElbow: [16, -54], rHand: [27, -56], r: -60 });
  var VOL_HOLD = P(VOL_PUNCH, { rElbow: [18, -54], rHand: [30, -55], r: -55 });
  var VOL_BIG = P(READY, { head: [-2, -73], neck: [-2, -63], lElbow: [8, -56], lHand: [16, -56], rElbow: [-14, -66], rHand: [-26, -74], r: -150 });
  var VOL_BIG_HIT = P(READY, { head: [3, -73], neck: [2, -63], lElbow: [6, -54], lHand: [10, -50], rElbow: [0, -60], rHand: [6, -64], r: -100 });
  var VOL_BIG_FIN = P(READY, { head: [6, -71], neck: [5, -61], lElbow: [2, -52], lHand: [6, -46], rElbow: [16, -44], rHand: [24, -36], r: 60 });

  /* Footwork. */
  var FLATFOOT = P(STAND, { head: [1, -77], neck: [1, -67], hip: [0, -40], lKnee: [-4, -20], lFoot: [-6, 0], rKnee: [5, -20], rFoot: [7, 0],
    lElbow: [5, -52], lHand: [10, -46], rElbow: [5, -50], rHand: [10, -44], r: 60 });
  var CROUCH = P(READY, { head: [3, -68], neck: [2, -58], hip: [0, -32], lKnee: [-9, -16], rKnee: [10, -16] });
  var SPLIT_AIR = P(READY, { head: [2, -78], neck: [1, -68], hip: [0, -42], lKnee: [-8, -24], lFoot: [-12, -7], rKnee: [9, -24], rFoot: [12, -7] });
  var SPLIT_LAND = P(READY, { head: [2, -66], neck: [1, -56], hip: [0, -31], lKnee: [-11, -16], lFoot: [-17, 0], rKnee: [12, -16], rFoot: [17, 0],
    lElbow: [8, -43], lHand: [16, -40], rElbow: [7, -41], rHand: [15, -38] });
  var STEP_A = P(READY, { lKnee: [-3, -21], lFoot: [-6, -5], rKnee: [11, -18], rFoot: [15, 0] });
  var STEP_B = P(READY, { lKnee: [-8, -18], lFoot: [-13, 0], rKnee: [12, -21], rFoot: [14, -5] });

  /* Between points: bouncing the ball before the serve. */
  var BNC_UP = P(SV_STANCE, { head: [4, -73], neck: [3, -63], hip: [0, -37], lElbow: [10, -50], lHand: [17, -46], rElbow: [-3, -48], rHand: [-5, -38], r: 112 });
  var BNC_DN = P(BNC_UP, { head: [5, -71], neck: [4, -61], lElbow: [11, -45], lHand: [18, -37] });

  /* Practice wall: the ball held out in front for a drop-feed. */
  var FEED = P(READY, { lElbow: [12, -52], lHand: [24, -56], rElbow: [-10, -48], rHand: [-18, -38], r: 150 });

  /* A child: catching, then bouncing the ball on the racket. */
  var KID_READY = P(STAND, { head: [2, -76], neck: [1, -66], hip: [0, -38], lElbow: [10, -56], lHand: [19, -60], rElbow: [11, -54], rHand: [20, -58] });
  var KID_REACH = P(KID_READY, { head: [4, -75], neck: [3, -65], lElbow: [14, -60], lHand: [24, -64], rElbow: [15, -58], rHand: [25, -62] });
  var KID_CATCH = P(KID_READY, { head: [3, -73], neck: [2, -63], hip: [0, -36], lKnee: [-6, -18], rKnee: [8, -18], lElbow: [12, -52], lHand: [15, -60], rElbow: [13, -50], rHand: [16, -58] });
  var KID_JOY = P(KID_CATCH, { head: [3, -77], neck: [2, -67], hip: [0, -40], lKnee: [-5, -20], rKnee: [7, -20], lElbow: [10, -58], lHand: [14, -66], rElbow: [11, -56], rHand: [15, -64] });
  var KID_BAT = P(STAND, { head: [2, -75], neck: [1, -65], hip: [0, -38], lElbow: [6, -50], lHand: [10, -45], rElbow: [10, -48], rHand: [18, -46], r: 0 });
  var KID_BAT_UP = P(KID_BAT, { rElbow: [10, -51], rHand: [18, -50] });

  /* ----------------------------------------------------------- Figures -- */
  function fig(o) {
    o.k = o.k || K; o.dir = o.dir || 1; o.color = o.color || INK;
    o.racket = o.racket !== false; o.win = o.win || [0, 1e9];
    if (o.x == null) o.x = PX;
    return o;
  }
  function figX(f, t) { return typeof f.x === "number" ? f.x : at(f.x, t); }
  function joint(f, p, i, X) { return [X + f.dir * p[i * 2] * f.k, GY + p[i * 2 + 1] * f.k]; }
  function racketAng(f, p) { return (f.dir === 1 ? p[22] : 180 - p[22]) * Math.PI / 180; }
  /* Centre of the strings at time t, in world units: where a hit ball sits. */
  function headAt(f, t) {
    var p = at(f.keys, t), h = joint(f, p, 10, figX(f, t)), a = racketAng(f, p), L = 22 * f.k * p[23];
    return [h[0] + Math.cos(a) * L, h[1] + Math.sin(a) * L];
  }
  function handAt(f, t) {
    var p = at(f.keys, t), h = joint(f, p, 8, figX(f, t));
    return [h[0] + f.dir, h[1] - 2.4];
  }
  function figAlpha(f, t) {
    if (t < f.win[0] || t > f.win[1]) return 0;
    var a = 1;
    if (f.fadeIn) a *= clamp((t - f.win[0]) / 160);
    if (f.fadeOut) a *= clamp((f.win[1] - t) / 160);
    return a;
  }

  /* The Book FX figure: ink over a thin white halo (so it reads where it
     crosses a path, the net or a ghost), and Book FX's racket glyph: a
     13-unit handle, a 9.5 × 6.6 head centred 22 units out, and its two
     faint strings. rl foreshortens the racket along its axis; a child's
     face-up racket (f.flat) is the same glyph seen nearly edge-on. */
  var HALO = "rgba(255,255,255,.9)";
  function drawFig(c, f, t, alpha, p) {
    var a = (alpha == null ? 1 : alpha) * figAlpha(f, t);
    if (a <= .01) return;
    p = p || at(f.keys, t);
    var X = figX(f, t), k = f.k, j = [], i;
    for (i = 0; i < 11; i++) j.push(joint(f, p, i, X));
    c.globalAlpha = a;
    if (f.shadow !== false) {
      var lift = GY - Math.max(j[4][1], j[6][1]);
      c.fillStyle = "rgba(0,0,0,.13)";
      c.beginPath();
      c.ellipse((j[4][0] + j[6][0]) / 2, GY + .4, 15 * k * Math.max(.55, 1 - lift / 30), 1.6, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.lineCap = "round"; c.lineJoin = "round";
    var lw = (f.kid ? 3.8 : 3.2) * k, hr = (f.kid ? 9 : 7.2) * k;
    function body() {
      c.beginPath();
      c.moveTo(j[1][0], j[1][1]); c.lineTo(j[2][0], j[2][1]);
      c.moveTo(j[4][0], j[4][1]); c.lineTo(j[3][0], j[3][1]); c.lineTo(j[2][0], j[2][1]); c.lineTo(j[5][0], j[5][1]); c.lineTo(j[6][0], j[6][1]);
      c.moveTo(j[8][0], j[8][1]); c.lineTo(j[7][0], j[7][1]); c.lineTo(j[1][0], j[1][1]); c.lineTo(j[9][0], j[9][1]); c.lineTo(j[10][0], j[10][1]);
      c.stroke();
    }
    c.strokeStyle = HALO; c.lineWidth = lw * 2; body();
    c.fillStyle = HALO; c.beginPath(); c.arc(j[0][0], j[0][1], hr * 1.24, 0, Math.PI * 2); c.fill();
    c.strokeStyle = f.color; c.lineWidth = lw; body();
    c.fillStyle = f.color; c.beginPath(); c.arc(j[0][0], j[0][1], hr, 0, Math.PI * 2); c.fill();
    if (f.racket) {
      var ang = racketAng(f, p), rl = p[23], ux = Math.cos(ang), uy = Math.sin(ang), hx = j[10][0], hy = j[10][1];
      var sq = f.flat ? .3 : 1;
      var along = function (d) { return [hx + ux * d * k * rl, hy + uy * d * k * rl]; };
      var hc = along(22), h13 = along(13);
      var rx = Math.max(.7, Math.abs(rl) * 9.5 * k), ry = 6.6 * k * sq;
      var grip = function () { c.beginPath(); c.moveTo(hx, hy); c.lineTo(h13[0], h13[1]); c.stroke(); };
      var rim = function () { c.beginPath(); c.ellipse(hc[0], hc[1], rx, ry, ang, 0, Math.PI * 2); c.stroke(); };
      c.strokeStyle = HALO; c.lineWidth = 5.2 * k; grip();
      c.lineWidth = 5 * k; rim();
      c.strokeStyle = f.color; c.lineWidth = 2.6 * k; grip();
      c.lineWidth = 2.4 * k; rim();
      var s1 = along(15), s2 = along(29), px = -uy * 5 * k * sq, py = ux * 5 * k * sq;
      c.globalAlpha = a * .55; c.lineWidth = .9 * k;
      c.beginPath();
      c.moveTo(s1[0], s1[1]); c.lineTo(s2[0], s2[1]);
      c.moveTo(hc[0] - px, hc[1] - py); c.lineTo(hc[0] + px, hc[1] + py);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  function jointAt(f, t, i) { return joint(f, at(f.keys, t), i, figX(f, t)); }

  /* The swing's blur: the racket head's last tenth of a second, fading. */
  function drawSwing(c, f, t) {
    if (!f.racket || f.blur === false) return;
    var a = figAlpha(f, t);
    if (a <= .01) return;
    var prev = headAt(f, t), i, q, tt;
    c.strokeStyle = "#a0a0a0"; c.lineCap = "round"; c.lineWidth = 1.5;
    for (i = 1; i <= 7; i++) {
      tt = t - i * 15;
      if (tt < f.win[0]) break;
      q = headAt(f, tt);
      c.globalAlpha = a * .5 * (1 - i / 8);
      c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(q[0], q[1]); c.stroke();
      prev = q;
    }
    c.globalAlpha = 1;
  }

  /* ------------------------------------------------------------- Balls --
     A ball is a list of timed segments. fly: a parabola from A to B, with
     its height set by where it crosses the net (via) or by h; p > 1 slows
     the ball's forward travel late in the flight, so it dips (topspin). */
  function fly(t0, t1, A, B, o) {
    o = o || {};
    var p = o.p || 1, h = o.h || 0;
    if (o.via != null) {
      var fx = ((o.vx == null ? NX : o.vx) - A[0]) / (B[0] - A[0]);
      var un = p === 1 ? fx : 1 - Math.pow(1 - fx, 1 / p);
      h = (A[1] + (B[1] - A[1]) * un - o.via) / (4 * un * (1 - un));
    }
    return { t0: t0, t1: t1, fly: true, spin: !!o.spin, fn: function (u) {
      var e = p === 1 ? u : 1 - Math.pow(1 - u, p);
      return [A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * u - 4 * h * u * (1 - u)];
    } };
  }
  /* A toss: up from the hand, apex, and down onto the strings. */
  function toss(t0, t1, A, B, apexY) {
    var h1 = Math.max(0, A[1] - apexY), h2 = Math.max(0, B[1] - apexY);
    var ua = Math.sqrt(h1) / ((Math.sqrt(h1) + Math.sqrt(h2)) || 1);
    return { t0: t0, t1: t1, fly: true, fn: function (u) {
      var x = A[0] + (B[0] - A[0]) * u, v;
      if (u < ua) { v = u / ua; return [x, A[1] - h1 * (1 - (1 - v) * (1 - v))]; }
      v = (u - ua) / (1 - ua || 1);
      return [x, apexY + h2 * v * v];
    } };
  }
  function drop(t0, t1, A, B) {
    return { t0: t0, t1: t1, fly: true, fn: function (u) { return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u * u]; } };
  }
  function rise(t0, t1, A, B) {
    return { t0: t0, t1: t1, fly: true, fn: function (u) { var e = 1 - (1 - u) * (1 - u); return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * e]; } };
  }
  function roll(t0, t1, A, B) {
    return { t0: t0, t1: t1, fn: function (u) { var e = 1 - (1 - u) * (1 - u); return [A[0] + (B[0] - A[0]) * e, A[1]]; } };
  }
  /* Follows something (a hand, the strings) through absolute time. */
  function hold(t0, t1, get) { return { t0: t0, t1: t1, abs: true, fn: get }; }
  function ballAt(b, t) {
    var s = b.segs, g = s[s.length - 1], i;
    for (i = 0; i < s.length; i++) if (t <= s[i].t1) { g = s[i]; break; }
    var p = g.abs ? g.fn(Math.min(g.t1, Math.max(g.t0, t))) : g.fn(clamp((t - g.t0) / ((g.t1 - g.t0) || 1)));
    return { x: p[0], y: p[1], seg: g };
  }
  function endOf(seg) { return seg.abs ? seg.fn(seg.t1) : seg.fn(1); }

  function drawBall(c, b, t) {
    if (t < b.win[0] || t > b.win[1]) return;
    var q = ballAt(b, t), a = 1, i, p;
    if (b.fade) a = 1 - clamp((t - b.fade[0]) / (b.fade[1] - b.fade[0]));
    if (b.fadeIn) a *= clamp((t - b.win[0]) / 160);
    if (a <= .01) return;
    if (b.ghostAt != null && t >= b.ghostAt) {          // the missed ball, left where it ended
      c.globalAlpha = clamp((t - b.ghostAt) / 200) * .9;
      c.strokeStyle = MISS; c.lineWidth = .9;
      c.beginPath(); c.arc(q.x, q.y, BR, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = Math.max(0, 1 - (t - b.ghostAt) / 200);
      if (c.globalAlpha > 0) { c.fillStyle = BALL; c.beginPath(); c.arc(q.x, q.y, BR, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
      return;
    }
    if (b.shadow !== false) {
      var hgt = GB - q.y, s = Math.max(.25, 1 - hgt / 80);
      c.globalAlpha = a * .17 * s; c.fillStyle = "#000";
      c.beginPath(); c.ellipse(q.x, GY + .4, 4.4 * s, 1.1, 0, 0, Math.PI * 2); c.fill();
    }
    if (q.seg.fly) {
      for (i = 1; i <= 3; i++) {
        p = ballAt(b, t - i * 16);
        if (!p.seg.fly || t - i * 16 < b.win[0]) break;
        c.globalAlpha = a * (.34 - i * .09); c.fillStyle = BALL;
        c.beginPath(); c.arc(p.x, p.y, BR * (1 - i * .12), 0, Math.PI * 2); c.fill();
      }
    }
    c.globalAlpha = a;
    c.fillStyle = BALL; c.strokeStyle = "rgba(0,0,0,.32)"; c.lineWidth = .6;
    c.beginPath(); c.arc(q.x, q.y, BR, 0, Math.PI * 2); c.fill(); c.stroke();
    if (q.seg.spin) {                                    // topspin: the arcs turn over the top, forward
      var r0 = t * .024;
      c.strokeStyle = "#8a8a8a"; c.lineWidth = .8; c.lineCap = "round";
      c.beginPath(); c.arc(q.x, q.y, BR + 2, r0, r0 + 1.5); c.stroke();
      c.beginPath(); c.arc(q.x, q.y, BR + 2, r0 + Math.PI, r0 + Math.PI + 1.5); c.stroke();
    }
    c.globalAlpha = 1;
  }

  /* A shot tracer: the path the ball has flown, from ta to tb. The fix's
     path is ink; the mistake's (missAt set) is dashed grey. Both have to
     read at the real stage size, about 337 px wide. */
  function drawTracer(c, r, t) {
    if (t < r.ta) return;
    var end = Math.min(t, r.tb), pts = [], tt;
    for (tt = r.ta; tt < end; tt += 10) pts.push(ballAt(r.b, tt));
    pts.push(ballAt(r.b, end));
    if (pts.length < 2) return;
    var miss = r.missAt != null;
    c.strokeStyle = miss ? MISSPATH : INK; c.lineWidth = miss ? 1 : 1.4; c.lineCap = "round"; c.lineJoin = "round";
    if (miss) c.setLineDash([3, 3]);
    c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.stroke();
    c.setLineDash([]);
  }

  /* A cue: the body part of the fix, drawn in ink. It comes in, holds for
     about 0.6 s, then stays faint, so the last frame still carries it. */
  function cueAlpha(q, t) {
    if (t < q.t0) return 0;
    var a = clamp((t - q.t0) / 120), e = q.t0 + (q.hold || 600);
    if (t > e) a = 1 - .7 * clamp((t - e) / 260);
    if (q.until != null) a *= 1 - clamp((t - q.until) / 200);
    return a;
  }
  function arrow(c, pts, head) {
    var n = pts.length, i;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i < n; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
    var b = pts[n - 1], a = pts[Math.max(0, n - 3)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), h = head || 3.4;
    c.beginPath();
    c.moveTo(b[0] - Math.cos(ang - .55) * h, b[1] - Math.sin(ang - .55) * h);
    c.lineTo(b[0], b[1]);
    c.lineTo(b[0] - Math.cos(ang + .55) * h, b[1] - Math.sin(ang + .55) * h);
    c.stroke();
  }
  /* Points on an ellipse from a0 to a1 degrees (canvas angles: 90 is down). */
  function arcPts(cx, cy, rx, ry, a0, a1, n) {
    var o = [], i, a;
    for (i = 0; i <= n; i++) { a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return o;
  }
  function ring(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }

  function drawMark(c, m, t, mirror) {
    if (t < m.t) return;
    var a = m.until ? 1 - clamp((t - m.until) / 200) : 1;
    if (a <= .01) return;
    var u = clamp((t - m.t) / 260), sc = u < 1 ? Math.max(0, backOut(u)) : 1;
    c.save();
    c.translate(mirror ? W - m.x : m.x, m.y); c.scale(sc, sc);
    c.globalAlpha = a;
    c.strokeStyle = m.type === "x" ? XMARK : INK; c.lineWidth = 1.9; c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath();
    if (m.type === "x") { c.moveTo(-4.3, -4.3); c.lineTo(4.3, 4.3); c.moveTo(4.3, -4.3); c.lineTo(-4.3, 4.3); }
    else { c.moveTo(-5, .4); c.lineTo(-1.6, 4); c.lineTo(5.4, -4.6); }
    c.stroke();
    c.restore();
  }

  /* ------------------------------------------------------------- Court -- */
  function drawCourt(c, s) {
    c.lineCap = "butt";
    c.strokeStyle = LINE; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(6, GY + .5); c.lineTo(s.wall ? s.wall : 314, GY + .5);
    (s.ticks || [[36, 4], [FSL, 4], [FBL, 4]]).forEach(function (k) { c.moveTo(k[0], GY + .5); c.lineTo(k[0], GY + .5 + k[1]); });
    c.stroke();
    if (s.net !== false && !s.wall) {
      c.strokeStyle = NET; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(NX, GY); c.lineTo(NX, NT); c.moveTo(NX - 2, NT); c.lineTo(NX + 2, NT); c.stroke();
    }
    if (s.wall) {                    // a practice wall, seen a little from the side, with its line
      var x = s.wall;
      c.fillStyle = "#f4f4f2"; c.strokeStyle = "#c2c2c2"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, 24); c.lineTo(x + 16, 15); c.lineTo(x + 16, GY - 9); c.lineTo(x, GY); c.closePath();
      c.fill(); c.stroke();
      c.strokeStyle = "#7d7d7d"; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(x, s.line); c.lineTo(x + 16, s.line - 9); c.stroke();
    }
  }

  /* ------------------------------------------------------------ Scenes --
     Each builder returns { dur, figs, balls, tracers, marks, ghosts, cues,
     slow, ev, court, under(c,t), over(c,t) } with every time absolute, in
     scene ms. slow lists the fix's contact moments: playback eases down
     to 0.4x for about 0.3 s around each (see warp()). */
  function scene(dur) { return { dur: dur, figs: [], balls: [], tracers: [], marks: [], ghosts: [], cues: [], slow: [], ev: [], court: {} }; }
  function hit(s, t, v) { s.ev.push({ t: t - 110, s: "swish", v: v || 1 }); s.ev.push({ t: t, s: "hit", v: v || 1 }); }
  function sfx(s, t, name, v) { s.ev.push({ t: t, s: name, v: v || 1 }); }
  /* A ball fed in from the right: one bounce at bx, then up onto the strings. */
  function feed(t0, tb, tc, bx, strike, from) {
    var A = from || [332, 94];
    return [fly(t0, tb, A, [bx, GB], { via: NT - 9 }), fly(tb, tc, [bx, GB], strike, { h: 7 })];
  }
  /* After a ball lands in: a short bounce on, then it rolls to a stop. */
  function settle(t, L, dx) {
    var B = [L[0] + dx, GB];
    return [fly(t, t + 260, L, B, { h: 7 }), roll(t + 260, t + 560, B, [B[0] + dx * .5, GB])];
  }
  /* Into the net: hits it, drops to the court at its foot. */
  function intoNet(t, y) {
    var A = [NX - BR, y];
    return [drop(t, t + 240, A, [NX - BR - 5, GB]), roll(t + 240, t + 400, [NX - BR - 5, GB], [NX - BR - 9, GB])];
  }

  /* A serve, from the stance to the follow-through; returns the figure,
     the ball's segments up to contact, and the contact point. */
  function serve(s, o) {
    var t0 = o.t0, tc = o.tc || 860;
    var keys = (o.pre || []).concat([
      [o.st || 0, SV_STANCE], [o.tt || 380, SV_TOSS], [tc - 170, o.drop || SV_DROP], [tc, o.hit],
    ]).concat(o.post || [[tc + 340, o.fol || SV_FOL]]);
    var f = fig({ keys: shift(keys, t0), win: o.win, fadeIn: o.fadeIn, fadeOut: o.fadeOut });
    s.figs.push(f);
    var rel = t0 + (o.rel || 300), at0 = t0 + tc;
    var strike = headAt(f, at0);
    var segs = (o.preBall || []).concat([
      hold(o.holdFrom == null ? t0 : o.holdFrom, rel, function (t) { return handAt(f, t); }),
      toss(rel, at0, handAt(f, rel), strike, strike[1] - o.rise),
    ]);
    hit(s, at0);
    return { f: f, segs: segs, strike: strike, tc: at0 };
  }

  var BUILD = {
    /* Toss low and in front → hit down into the net ✕; higher toss in
       front of the hitting shoulder, full reach → over the net, in ✓.
       Cue: a ring where the toss should come down. */
    "serve-net": function () {
      var s = scene(3500), B0 = 1750;
      s.court.ticks = [[36, 4], [FSL, 7], [FBL, 4]];
      var a = serve(s, { t0: 0, tc: 800, hit: SV_HIT_LOW, fol: SV_FOL_LOW, rise: 5, win: [0, 1560], fadeOut: true });
      var ta = a.tc + 270;
      var ba = { segs: a.segs.concat([fly(a.tc, ta, a.strike, [NX - BR, NT + 8], { h: 2 })]).concat(intoNet(ta, NT + 8)), win: [0, s.dur], ghostAt: B0 };
      s.balls.push(ba);
      s.tracers.push({ b: ba, ta: a.tc, tb: ta, missAt: B0 });
      s.marks.push({ type: "x", x: NX - 15, y: NT - 9, t: ta });
      sfx(s, ta, "net");
      var b = serve(s, { t0: B0, hit: SV_HIT, rise: 15, win: [B0, 1e9], fadeIn: true });
      var L = [208, GB], tl = b.tc + 430;
      var bb = { segs: b.segs.concat([fly(b.tc, tl, b.strike, L, { via: 108 })]).concat(settle(tl, L, 16)), win: [B0, s.dur], fadeIn: true };
      s.balls.push(bb);
      s.tracers.push({ b: bb, ta: b.tc, tb: tl });
      s.ghosts.push({ f: b.f, at: b.tc, from: b.tc + 120 });
      s.marks.push({ type: "v", x: L[0] + 9, y: GY - 15, t: tl });
      sfx(s, tl, "bounce");
      var R = b.strike;
      s.cues.push({ t0: B0 + 300, draw: function (c) { ring(c, R[0], R[1], 6.5); } });
      s.slow.push(b.tc);
      return s;
    },

    /* Toss drifting behind, face open → long, past the service line ✕;
       toss in front, up and over, racket turning over → mid-box ✓.
       Cue: the ring in front, where the toss belongs. */
    "serve-long": function () {
      var s = scene(3500), B0 = 1750;
      s.court.ticks = [[36, 4], [FSL, 7], [FBL, 4]];
      var a = serve(s, { t0: 0, tc: 860, hit: SV_HIT_BACK, fol: SV_FOL_OPEN, rise: 13, win: [0, 1600], fadeOut: true });
      var L1 = [262, GB], ta = a.tc + 470;
      var ba = { segs: a.segs.concat([fly(a.tc, ta, a.strike, L1, { via: 82 })]).concat(settle(ta, L1, 22)), win: [0, s.dur], ghostAt: B0 };
      s.balls.push(ba);
      s.tracers.push({ b: ba, ta: a.tc, tb: ta, missAt: B0 });
      s.marks.push({ type: "x", x: L1[0] + 9, y: GY - 15, t: ta });
      sfx(s, ta, "bounce");
      var b = serve(s, { t0: B0, hit: SV_HIT, rise: 12, win: [B0, 1e9], fadeIn: true });
      var L = [206, GB], tl = b.tc + 430;
      var bb = { segs: b.segs.concat([fly(b.tc, tl, b.strike, L, { via: 108 })]).concat(settle(tl, L, 14)), win: [B0, s.dur], fadeIn: true };
      s.balls.push(bb);
      s.tracers.push({ b: bb, ta: b.tc, tb: tl });
      s.marks.push({ type: "v", x: L[0] + 9, y: GY - 15, t: tl });
      sfx(s, tl, "bounce");
      var R = b.strike;
      s.cues.push({ t0: B0 + 300, draw: function (c) { ring(c, R[0], R[1], 6.5); } });
      s.slow.push(b.tc);
      return s;
    },

    /* A second serve hit like a slower first serve: flat, into the net ✕;
       brushed up the back of the ball: spin, high over the net, dipping in ✓.
       Cue: a curved arrow brushing up the back of the ball on the strings. */
    "double-fault": function () {
      var s = scene(3600), B0 = 1750;
      s.court.ticks = [[36, 4], [FSL, 7], [FBL, 4]];
      var a = serve(s, { t0: 0, tc: 860, hit: SV_HIT, rise: 12, win: [0, 1560], fadeOut: true });
      var ta = a.tc + 330;
      var ba = { segs: a.segs.concat([fly(a.tc, ta, a.strike, [NX - BR, NT + 3], { h: 3 })]).concat(intoNet(ta, NT + 3)), win: [0, s.dur], ghostAt: B0 };
      s.balls.push(ba);
      s.tracers.push({ b: ba, ta: a.tc, tb: ta, missAt: B0 });
      s.marks.push({ type: "x", x: NX - 15, y: NT - 10, t: ta });
      sfx(s, ta, "net");
      var b = serve(s, { t0: B0, hit: SV_BR_HIT, drop: SV_BR_DROP, rise: 12, win: [B0, 1e9], fadeIn: true,
        post: [[860 + 90, SV_BR_UP], [860 + 380, SV_FOL]] });
      var L = [220, GB], tl = b.tc + 600;
      var bb = { segs: b.segs.concat([fly(b.tc, tl, b.strike, L, { via: 84, p: 1.5, spin: true })]).concat(settle(tl, L, 18)), win: [B0, s.dur], fadeIn: true };
      s.balls.push(bb);
      s.tracers.push({ b: bb, ta: b.tc, tb: tl });
      s.marks.push({ type: "v", x: L[0] + 9, y: GY - 15, t: tl });
      sfx(s, tl, "bounce");
      var S = b.strike;
      s.cues.push({ t0: b.tc - 200, draw: function (c) { arrow(c, arcPts(S[0], S[1], 10.5, 10.5, 140, 262, 16), 3.6); } });
      s.slow.push(b.tc);
      return s;
    },

    /* Flat and late → into the net ✕; racket below the ball, contact in
       front, finish high, the ball about a net's height over the net ✓.
       Cue: the finish, an arc up and over the opposite shoulder. */
    "forehand-net": function () {
      var s = scene(3400), B0 = 1650;
      var fa = fig({ keys: [[0, READY], [300, FLAT_BACK], [560, FLAT_BACK], [700, FLAT_LATE], [950, FLAT_FIN]], win: [0, 1480], fadeOut: true });
      s.figs.push(fa);
      var sa = headAt(fa, 700), ta = 1000;
      var ba = { segs: feed(0, 470, 700, 120, sa).concat([fly(700, ta, sa, [NX - BR, NT + 9], { h: 3 })]).concat(intoNet(ta, NT + 9)), win: [0, s.dur], ghostAt: B0 };
      s.balls.push(ba); s.tracers.push({ b: ba, ta: 700, tb: ta, missAt: B0 });
      sfx(s, 470, "bounce"); hit(s, 700); sfx(s, ta, "net");
      s.marks.push({ type: "x", x: NX - 15, y: NT - 9, t: ta });
      var fb = fig({ keys: shift([[0, READY], [260, FH_BACK], [560, FH_BACK], [700, FH_HIT], [960, FH_FIN]], B0), win: [B0, 1e9], fadeIn: true });
      s.figs.push(fb);
      var tc = B0 + 700, sb = headAt(fb, tc), L = [264, GB], tl = tc + 560;
      var bb = { segs: feed(B0, B0 + 470, tc, 128, sb).concat([fly(tc, tl, sb, L, { via: NT - NH - 1, p: 1.15 })]).concat(settle(tl, L, 16)), win: [B0, s.dur] };
      s.balls.push(bb); s.tracers.push({ b: bb, ta: tc, tb: tl });
      sfx(s, B0 + 470, "bounce"); hit(s, tc); sfx(s, tl, "bounce");
      s.marks.push({ type: "v", x: L[0] + 9, y: GY - 15, t: tl });
      s.ghosts.push({ f: fb, at: tc, from: tc + 200 });
      var nk = jointAt(fb, tc + 260, 1), arc = [], q, h;
      for (q = tc - 40; q <= tc + 260; q += 20) { h = headAt(fb, q); arc.push([nk[0] + (h[0] - nk[0]) * 1.22, nk[1] + (h[1] - nk[1]) * 1.22]); }
      s.cues.push({ t0: tc - 140, draw: function (c) { arrow(c, arc, 3.4); } });
      s.slow.push(tc);
      /* The margin: a net's height above the net. */
      s.under = function (c, t) {
        var u = clamp((t - (tc - 150)) / 250);
        if (u <= 0) return;
        c.globalAlpha = u; c.strokeStyle = XMARK; c.lineWidth = 1.1;
        c.setLineDash([1.8, 2]);
        c.beginPath(); c.moveTo(NX, NT - 2); c.lineTo(NX, NT - NH); c.stroke();
        c.setLineDash([]);
        c.beginPath(); c.moveTo(NX - 3, NT - NH); c.lineTo(NX + 3, NT - NH); c.stroke();
        c.globalAlpha = 1;
      };
      return s;
    },

    /* Flat with an open face → sails past the baseline ✕; brushed up for
       topspin, finishing over the shoulder → dips in, deep to the middle ✓.
       Cue: the brush-up arrow on the strings. */
    "forehand-long": function () {
      var s = scene(3500), B0 = 1650;
      var fa = fig({ keys: [[0, READY], [300, FLAT_BACK], [560, FLAT_BACK], [700, FLAT_OPEN], [950, FLAT_OPEN_FIN]], win: [0, 1480], fadeOut: true });
      s.figs.push(fa);
      var sa = headAt(fa, 700), L1 = [312, GB], ta = 700 + 640;
      var ba = { segs: feed(0, 470, 700, 126, sa).concat([fly(700, ta, sa, L1, { via: 74 }), fly(ta, ta + 300, L1, [350, GB - 10], { h: 10 })]), win: [0, ta + 300] };
      s.balls.push(ba); s.tracers.push({ b: ba, ta: 700, tb: ta, missAt: B0 });
      sfx(s, 470, "bounce"); hit(s, 700); sfx(s, ta, "bounce");
      s.marks.push({ type: "x", x: L1[0] - 1, y: GY - 17, t: ta });
      var fb = fig({ keys: shift([[0, READY], [260, FH_BACK], [560, FH_BACK], [700, FH_HIT], [960, FH_FIN]], B0), win: [B0, 1e9], fadeIn: true });
      s.figs.push(fb);
      var tc = B0 + 700, sb = headAt(fb, tc), L = [266, GB], tl = tc + 640;
      var bb = { segs: feed(B0, B0 + 470, tc, 128, sb).concat([fly(tc, tl, sb, L, { via: 90, p: 1.6, spin: true })]).concat(settle(tl, L, 14)), win: [B0, s.dur] };
      s.balls.push(bb); s.tracers.push({ b: bb, ta: tc, tb: tl });
      sfx(s, B0 + 470, "bounce"); hit(s, tc); sfx(s, tl, "bounce");
      s.marks.push({ type: "v", x: L[0] + 9, y: GY - 15, t: tl });
      s.cues.push({ t0: tc - 200, draw: function (c) { arrow(c, arcPts(sb[0], sb[1], 10.5, 10.5, 140, 262, 16), 3.6); } });
      s.slow.push(tc);
      return s;
    },

    /* Turning late, rushed → a weak ball into the net ✕; shoulders turned
       as soon as the ball is coming, low to high in front → deep ✓.
       Cue: the turn (an arrow round the shoulders) and both hands on the grip. */
    "backhand": function () {
      var s = scene(3500), B0 = 1650;
      var fa = fig({ keys: [[0, READY], [470, READY], [580, BH_HALF], [680, BH_LATE], [900, BH_LATE_FIN]], win: [0, 1480], fadeOut: true });
      s.figs.push(fa);
      var sa = headAt(fa, 680), ta = 680 + 420;
      var ba = { segs: feed(0, 470, 680, 118, sa).concat([fly(680, ta, sa, [NX - BR, NT + 7], { h: 16 })]).concat(intoNet(ta, NT + 7)), win: [0, s.dur], ghostAt: B0 };
      s.balls.push(ba); s.tracers.push({ b: ba, ta: 680, tb: ta, missAt: B0 });
      sfx(s, 470, "bounce"); hit(s, 680, .7); sfx(s, ta, "net");
      s.marks.push({ type: "x", x: NX - 15, y: NT - 9, t: ta });
      var fb = fig({ keys: shift([[0, READY], [60, READY], [320, BH_TURN], [580, BH_TURN], [720, BH_HIT], [980, BH_FIN]], B0), win: [B0, 1e9], fadeIn: true });
      s.figs.push(fb);
      var tc = B0 + 720, sb = headAt(fb, tc), L = [270, GB], tl = tc + 560;
      var bb = { segs: feed(B0, B0 + 490, tc, 126, sb).concat([fly(tc, tl, sb, L, { via: 100, p: 1.15 })]).concat(settle(tl, L, 14)), win: [B0, s.dur] };
      s.balls.push(bb); s.tracers.push({ b: bb, ta: tc, tb: tl });
      sfx(s, B0 + 490, "bounce"); hit(s, tc); sfx(s, tl, "bounce");
      s.marks.push({ type: "v", x: L[0] + 9, y: GY - 15, t: tl });
      s.ghosts.push({ f: fb, at: B0 + 320, from: B0 + 520 });
      var tt = B0 + 320, nk = jointAt(fb, tt, 1), h1 = jointAt(fb, tt, 8), h2 = jointAt(fb, tt, 10);
      s.cues.push({ t0: B0 + 80, draw: function (c) {
        arrow(c, arcPts(nk[0], nk[1] + 2, 11, 3.6, 10, 200, 16), 3);
        ring(c, (h1[0] + h2[0]) / 2, (h1[1] + h2[1]) / 2, 4.4);
      } });
      s.slow.push(tc);
      return s;
    },

    /* Aimed at the top of the net → clips the tape ✕; high over the net
       and deep to the middle, again and again, counted ✓ | |
       Cue: the aim, a ring well above the net. */
    "rally": function () {
      var s = scene(4000), B0 = 1300;
      var fa = fig({ keys: [[0, READY], [220, FH_BACK], [480, FH_BACK], [620, FLAT_LATE], [860, FLAT_FIN]], win: [0, 1180], fadeOut: true });
      s.figs.push(fa);
      var sa = headAt(fa, 620), ta = 620 + 300, tape = [NX - BR, NT + 1];
      var ba = { segs: feed(0, 420, 620, 122, sa).concat([fly(620, ta, sa, tape, { h: 4 }), fly(ta, ta + 300, tape, [NX - 16, GB], { h: 9 }),
        roll(ta + 300, ta + 460, [NX - 16, GB], [NX - 22, GB])]), win: [0, s.dur], ghostAt: B0 };
      s.balls.push(ba); s.tracers.push({ b: ba, ta: 620, tb: ta, missAt: B0 });
      sfx(s, 420, "bounce"); hit(s, 620); sfx(s, ta, "net"); sfx(s, ta + 300, "bounce", .6);
      s.marks.push({ type: "x", x: NX - 14, y: NT - 11, t: ta });
      var fb = fig({ keys: shift([[0, READY], [220, FH_BACK], [480, FH_BACK], [620, FH_HIT], [860, FH_FIN], [1150, READY],
        [1500, FH_BACK], [1740, FH_BACK], [1880, FH_HIT], [2120, FH_FIN]], B0), win: [B0, 1e9], fadeIn: true });
      s.figs.push(fb);
      var AIM = 94;
      var c1 = B0 + 620, s1 = headAt(fb, c1), L1 = [270, GB], l1 = c1 + 500;
      var c2 = B0 + 1880, s2 = headAt(fb, c2), L2 = [274, GB], l2 = c2 + 500;
      var bb = { segs: feed(B0, B0 + 420, c1, 124, s1).concat([fly(c1, l1, s1, L1, { via: AIM, p: 1.15 }), fly(l1, l1 + 220, L1, [338, GB - 12], { h: 8 })]),
        win: [B0, l1 + 220] };
      var bc = { segs: feed(l1 + 200, c2 - 200, c2, 120, s2, [334, 86]).concat([fly(c2, l2, s2, L2, { via: AIM, p: 1.15 })]).concat(settle(l2, L2, 10)),
        win: [l1 + 200, s.dur] };
      s.balls.push(bb, bc);
      s.tracers.push({ b: bb, ta: c1, tb: l1 }, { b: bc, ta: c2, tb: l2 });
      sfx(s, B0 + 420, "bounce"); hit(s, c1); sfx(s, l1, "bounce");
      sfx(s, c2 - 200, "bounce"); hit(s, c2); sfx(s, l2, "bounce");
      s.marks.push({ type: "v", x: L1[0] + 9, y: GY - 15, t: l1 });
      s.cues.push({ t0: B0 + 200, draw: function (c) { ring(c, NX, AIM, 5.6); } });
      s.slow.push(c1);
      /* The count: one stroke per ball that lands in. */
      s.over = function (c, t) {
        [l1, l2].forEach(function (tt, i) {
          var u = clamp((t - tt) / 180);
          if (u <= 0) return;
          c.globalAlpha = u; c.strokeStyle = INK; c.lineWidth = 1.6; c.lineCap = "round";
          var x = 294 + i * 7;
          c.beginPath(); c.moveTo(x, 28); c.lineTo(x, 28 - 12 * u); c.stroke();
        });
        c.globalAlpha = 1;
      };
      return s;
    },

    /* Flat-footed when the opponent hits → late, cramped, into the net ✕;
       a small split-step as the opponent hits, small steps, swing in time ✓.
       Cue: the split-step's landing ring, in time with the opponent's hit. */
    "footwork": function () {
      var s = scene(3500), B0 = 1650, OX = 302;
      function opp(t0, win, fadeIn, fadeOut) {
        var o = fig({ keys: shift([[0, READY], [140, FH_BACK], [300, FH_HIT], [520, FH_FIN]], t0), x: OX, dir: -1, k: .45, color: OPP, win: win,
          fadeIn: fadeIn, fadeOut: fadeOut, blur: false, shadow: false });
        s.figs.push(o);
        return o;
      }
      var oa = opp(0, [0, 1480], false, true);
      var fa = fig({ keys: [[0, FLATFOOT], [640, FLATFOOT], [860, FLAT_BACK], [1060, FLAT_LATE], [1260, FLAT_FIN]], win: [0, 1480], fadeOut: true });
      s.figs.push(fa);
      var oS = headAt(oa, 300), sa = headAt(fa, 1060), ta = 1060 + 280;
      var ba = { segs: [fly(300, 820, oS, [118, GB], { via: 100 }), fly(820, 1060, [118, GB], sa, { h: 7 }), fly(1060, ta, sa, [NX - BR, NT + 10], { h: 2 })]
        .concat(intoNet(ta, NT + 10)), win: [300, s.dur], ghostAt: B0 };
      s.balls.push(ba); s.tracers.push({ b: ba, ta: 1060, tb: ta, missAt: B0 });
      hit(s, 300, .6); sfx(s, 820, "bounce"); hit(s, 1060); sfx(s, ta, "net");
      s.marks.push({ type: "x", x: NX - 15, y: NT - 9, t: ta });
      var ob = opp(B0, [B0, 1e9], true, false);
      var fb = fig({ keys: shift([[0, READY], [170, CROUCH], [300, SPLIT_AIR], [400, SPLIT_LAND], [530, STEP_A], [650, STEP_B], [780, FH_BACK],
        [860, FH_BACK], [990, FH_HIT], [1230, FH_FIN]], B0), x: shift([[0, PX], [420, PX], [780, PX + 14]], B0), win: [B0, 1e9], fadeIn: true });
      s.figs.push(fb);
      var oS2 = headAt(ob, B0 + 300), tc = B0 + 990, sb = headAt(fb, tc), L = [254, GB], tl = tc + 540;
      var bb = { segs: [fly(B0 + 300, B0 + 820, oS2, [122, GB], { via: 100 }), fly(B0 + 820, tc, [122, GB], sb, { h: 7 }),
        fly(tc, tl, sb, L, { via: 98, p: 1.15 })].concat(settle(tl, L, 14)), win: [B0 + 300, s.dur] };
      s.balls.push(bb); s.tracers.push({ b: bb, ta: tc, tb: tl });
      hit(s, B0 + 300, .6); sfx(s, B0 + 400, "tap"); sfx(s, B0 + 820, "bounce"); hit(s, tc); sfx(s, tl, "bounce");
      s.marks.push({ type: "v", x: L[0] + 9, y: GY - 15, t: tl });
      s.ghosts.push({ f: fb, at: B0 + 300, from: B0 + 520 });
      s.cues.push({ t0: B0 + 400, draw: function (c, t) {
        var u = clamp((t - B0 - 400) / 160);
        c.beginPath(); c.ellipse(PX, GY + .5, 6 + 8 * u, 1.4 + 1.4 * u, 0, 0, Math.PI * 2); c.stroke();
      } });
      s.slow.push(tc);
      return s;
    },

    /* A big backswing at the net → late, into the net ✕; racket up in
       front, a short punch stepping forward → deep ✓.
       Cue: the punch, a short straight arrow. */
    "volley": function () {
      var s = scene(3200), B0 = 1550, VX = 124;
      s.court.ticks = [[FSL, 4], [FBL, 4]];
      var fa = fig({ keys: [[0, VOL_READY], [260, VOL_BIG], [470, VOL_BIG], [600, VOL_BIG_HIT], [800, VOL_BIG_FIN]], x: VX, win: [0, 1400], fadeOut: true });
      s.figs.push(fa);
      var sa = headAt(fa, 600), ta = 600 + 230;
      var ba = { segs: [fly(0, 600, [332, 80], sa, { h: 6 }), fly(600, ta, sa, [NX - BR, NT + 11], { h: 0 })].concat(intoNet(ta, NT + 11)), win: [0, s.dur], ghostAt: B0 };
      s.balls.push(ba); s.tracers.push({ b: ba, ta: 600, tb: ta, missAt: B0 });
      hit(s, 600); sfx(s, ta, "net");
      s.marks.push({ type: "x", x: NX + 12, y: NT - 6, t: ta });
      var fb = fig({ keys: shift([[0, VOL_READY], [300, VOL_READY], [440, VOL_SET], [560, VOL_PUNCH], [720, VOL_HOLD]], B0), x: VX, win: [B0, 1e9], fadeIn: true });
      s.figs.push(fb);
      var tc = B0 + 560, sb = headAt(fb, tc), L = [282, GB], tl = tc + 520;
      var bb = { segs: [fly(B0, tc, [332, 80], sb, { h: 6 }), fly(tc, tl, sb, L, { via: 100 })].concat(settle(tl, L, 12)), win: [B0, s.dur] };
      s.balls.push(bb); s.tracers.push({ b: bb, ta: tc, tb: tl });
      hit(s, tc); sfx(s, tl, "bounce");
      s.marks.push({ type: "v", x: L[0] + 9, y: GY - 15, t: tl });
      var p0 = headAt(fb, tc - 110), p1 = headAt(fb, tc + 160);
      s.cues.push({ t0: tc - 220, draw: function (c) { arrow(c, [[p0[0], p0[1] - 10], [p1[0], p1[1] - 10]], 3.2); } });
      s.slow.push(tc);
      return s;
    },

    /* A rushed point: no routine, straight into a flat swing at the line
       on the first ball, just long ✕. The fix: the same short routine
       before every point (three bounces), then the simple plan: deep, well
       over the net, until a short ball comes; then step in and hit it ✓.
       Cue: the step in, an arrow along the court. */
    "matches": function () {
      var s = scene(4100), B0 = 1050;
      var fa = fig({ keys: [[0, READY], [130, FLAT_BACK], [320, FLAT_BACK], [460, FLAT_OPEN], [700, FLAT_OPEN_FIN]], win: [0, 940], fadeOut: true });
      s.figs.push(fa);
      var sa = headAt(fa, 460), L0 = [304, GB], ta = 460 + 420;
      var ba = { segs: feed(0, 290, 460, 128, sa).concat([fly(460, ta, sa, L0, { via: 104 }), fly(ta, ta + 260, L0, [346, GB - 8], { h: 8 })]), win: [0, ta + 260] };
      s.balls.push(ba); s.tracers.push({ b: ba, ta: 460, tb: ta, missAt: B0 });
      sfx(s, 290, "bounce"); hit(s, 460); sfx(s, ta, "bounce");
      s.marks.push({ type: "x", x: L0[0] - 1, y: GY - 17, t: ta });
      /* The routine, then the plan. */
      var cyc = [0, 240, 480], keys = [[0, BNC_UP]], i;
      cyc.forEach(function (c0) { keys.push([c0 + 80, BNC_DN], [c0 + 210, BNC_UP]); });
      keys.push([700, BNC_UP], [860, READY], [1020, FH_BACK], [1150, FH_BACK], [1280, FH_HIT], [1500, FH_FIN], [1640, READY],
        [1760, STEP_A], [1880, STEP_B], [2000, STEP_A], [2120, FH_BACK], [2220, FH_BACK], [2340, FH_HIT], [2580, FH_FIN]);
      var fb = fig({ keys: shift(keys, B0), x: shift([[0, PX], [1640, PX], [2160, PX + 50]], B0), win: [B0, 1e9], fadeIn: true });
      s.figs.push(fb);
      var hand = function (t) { return handAt(fb, t); }, segs = [];
      for (i = 0; i < cyc.length; i++) {
        var c0 = B0 + cyc[i], h1 = hand(c0 + 35);
        segs.push(hold(i ? c0 - 30 : B0, c0 + 35, hand));
        segs.push(drop(c0 + 35, c0 + 110, h1, [h1[0], GB]));
        segs.push(rise(c0 + 110, c0 + 210, [h1[0], GB], hand(c0 + 210)));
        sfx(s, c0 + 110, "bounce", .8);
      }
      segs.push(hold(B0 + 690, B0 + 860, hand));
      s.balls.push({ segs: segs, win: [B0, B0 + 860], fadeIn: true, fade: [B0 + 740, B0 + 860] });
      var c1 = B0 + 1280, s1 = headAt(fb, c1), L1 = [288, GB], l1 = c1 + 520;
      var c2 = B0 + 2340, s2 = headAt(fb, c2), L2 = [240, GB], l2 = c2 + 380;
      var b1 = { segs: feed(B0 + 760, B0 + 1100, c1, 124, s1, [334, 92]).concat([fly(c1, l1, s1, L1, { via: 92, p: 1.15 }),
        fly(l1, l1 + 220, L1, [338, GB - 12], { h: 8 })]), win: [B0 + 760, l1 + 220] };
      var b2 = { segs: [fly(B0 + 1840, B0 + 2160, [334, 88], [152, GB], { via: 106 }), fly(B0 + 2160, c2, [152, GB], s2, { h: 7 }),
        fly(c2, l2, s2, L2, { via: 106 })].concat(settle(l2, L2, 8)), win: [B0 + 1840, s.dur] };
      s.balls.push(b1, b2);
      s.tracers.push({ b: b1, ta: c1, tb: l1 }, { b: b2, ta: c2, tb: l2 });
      sfx(s, B0 + 1100, "bounce"); hit(s, c1); sfx(s, l1, "bounce");
      sfx(s, B0 + 2160, "bounce"); hit(s, c2); sfx(s, l2, "bounce");
      s.marks.push({ type: "v", x: L2[0] + 11, y: GY - 15, t: l2 });
      s.ghosts.push({ f: fb, at: B0 + 80, from: B0 + 1700 });
      s.cues.push({ t0: B0 + 1680, draw: function (c) { arrow(c, [[PX + 2, GY + 9], [PX + 48, GY + 9]], 3.2); } });
      s.slow.push(c2);
      return s;
    },

    /* Against a wall: below the line ✕; above the line, rally after rally ✓.
       Cue: the wall's line, and an arrow up from it. */
    "practice": function () {
      var s = scene(3850), B0 = 1400, WX = 228, LY = NT, FX = 60;
      s.court = { wall: WX, line: LY, ticks: [] };
      function feedSegs(f, t0, tc) {
        var h = handAt(f, t0 + 220), g = [h[0], GB], st = headAt(f, tc);
        return { st: st, segs: [hold(t0, t0 + 220, function (t) { return handAt(f, t); }), drop(t0 + 220, t0 + 420, h, g), rise(t0 + 420, tc, g, st)] };
      }
      var fa = fig({ keys: [[0, FEED], [380, FH_BACK], [520, FH_BACK], [640, FH_HIT], [880, FH_FIN]], x: FX, win: [0, 1260], fadeOut: true });
      s.figs.push(fa);
      var A = feedSegs(fa, 0, 640), wa = [WX - BR, 127], ta = 640 + 340, ra = [172, GB];
      var ba = { segs: A.segs.concat([fly(640, ta, A.st, wa, { h: 4 }), fly(ta, ta + 300, wa, ra, { h: 3 }), roll(ta + 300, ta + 520, ra, [150, GB])]), win: [0, s.dur], ghostAt: B0 };
      s.balls.push(ba); s.tracers.push({ b: ba, ta: 640, tb: ta, missAt: B0 });
      sfx(s, 420, "bounce", .7); hit(s, 640); sfx(s, ta, "wall"); sfx(s, ta + 300, "bounce", .6);
      s.marks.push({ type: "x", x: WX + 26, y: 127, t: ta });
      var fb = fig({ keys: shift([[0, FEED], [380, FH_BACK], [520, FH_BACK], [640, FH_HIT], [880, FH_FIN], [1120, READY],
        [1300, FH_BACK], [1420, FH_BACK], [1560, FH_HIT], [1800, FH_FIN]], B0), x: FX, win: [B0, 1e9], fadeIn: true });
      s.figs.push(fb);
      var Bf = feedSegs(fb, B0, B0 + 640), w1 = [WX - BR, 98], t1 = B0 + 640 + 320, bx = [126, GB], c2 = B0 + 1560, s2 = headAt(fb, c2);
      var w2 = [WX - BR, 101], t2 = c2 + 320, r2 = [140, GB];
      var bb = { segs: Bf.segs.concat([fly(B0 + 640, t1, Bf.st, w1, { h: 8 }), fly(t1, c2 - 200, w1, bx, { h: 8 }), fly(c2 - 200, c2, bx, s2, { h: 7 }),
        fly(c2, t2, s2, w2, { h: 8 }), fly(t2, t2 + 380, w2, r2, { h: 8 }), roll(t2 + 380, t2 + 620, r2, [116, GB])]), win: [B0, s.dur] };
      s.balls.push(bb);
      s.tracers.push({ b: bb, ta: B0 + 640, tb: t1 }, { b: bb, ta: c2, tb: t2 });
      sfx(s, B0 + 420, "bounce", .7); hit(s, B0 + 640); sfx(s, t1, "wall"); sfx(s, c2 - 200, "bounce");
      hit(s, c2); sfx(s, t2, "wall"); sfx(s, t2 + 380, "bounce", .7);
      s.marks.push({ type: "v", x: WX + 26, y: 96, t: t1 });
      s.cues.push({ t0: B0 + 240, draw: function (c) {
        c.beginPath(); c.moveTo(WX, LY); c.lineTo(WX + 16, LY - 9); c.stroke();
        arrow(c, [[WX + 8, LY - 7], [WX + 8, LY - 21]], 3);
      } });
      s.slow.push(B0 + 640);
      return s;
    },

    /* Short and playful: a catch ✓, then bouncing the ball on the racket ✓.
       Cues: a ring where the hands meet the ball; how high to bounce it. */
    "kids": function () {
      var s = scene(3700), B0 = 1600, KX = 112, KK = .54;
      s.court.net = false; s.court.ticks = [];
      var fa = fig({ keys: [[0, KID_READY], [700, KID_REACH], [880, KID_CATCH], [1060, KID_JOY], [1240, KID_CATCH]], x: KX, k: KK, kid: true, racket: false,
        win: [0, 1460], fadeOut: true, blur: false });
      s.figs.push(fa);
      var catchAt = function (t) {
        var p = at(fa.keys, t), l = joint(fa, p, 8, KX), r = joint(fa, p, 10, KX);
        return [(l[0] + r[0]) / 2 + 2.2, (l[1] + r[1]) / 2 - 1];
      };
      var cp = catchAt(880);
      var ba = { segs: [fly(80, 880, [334, 66], cp, { h: 30 }), hold(880, 1460, catchAt)], win: [80, 1460], fade: [1300, 1460] };
      s.balls.push(ba);
      sfx(s, 880, "catch");
      s.marks.push({ type: "v", x: KX + 34, y: cp[1] - 16, t: 930, until: 1250 });
      s.cues.push({ t0: 560, until: 1250, draw: function (c) { ring(c, cp[0], cp[1], 6.4); } });
      s.slow.push(880);
      var fb = fig({ keys: shift([[0, KID_BAT]], B0), x: KX, k: KK, kid: true, flat: true, win: [B0, 1e9], fadeIn: true, blur: false });
      s.figs.push(fb);
      var cs = [B0 + 360, B0 + 800, B0 + 1240], keys = [[B0, KID_BAT]];
      cs.forEach(function (c0) { keys.push([c0 - 70, KID_BAT], [c0, KID_BAT_UP], [c0 + 110, KID_BAT]); });
      keys.push([B0 + 1680, KID_BAT_UP], [B0 + 1790, KID_BAT]);
      fb.keys = keys;
      var onStrings = function (t) { var h = headAt(fb, t); return [h[0], h[1] - BR - .9]; };
      var segs = [hold(B0, cs[0], onStrings)], i, top = 62;
      for (i = 0; i < cs.length; i++) {
        var c0 = cs[i], c1 = i < cs.length - 1 ? cs[i + 1] : B0 + 1680, A = onStrings(c0), Bp = onStrings(c1);
        segs.push(toss(c0, c1, A, Bp, top + i * 3));
        sfx(s, c0, "hit", .55);
      }
      sfx(s, B0 + 1680, "hit", .45);
      segs.push(hold(B0 + 1680, s.dur, onStrings));
      s.balls.push({ segs: segs, win: [B0, s.dur], shadow: true });
      var rest = onStrings(B0 + 1790), r0 = onStrings(B0 + 300);
      s.marks.push({ type: "v", x: rest[0] + 22, y: rest[1] - 14, t: B0 + 1720 });
      s.cues.push({ t0: B0 + 200, draw: function (c) {
        var x = r0[0] + 9;
        arrow(c, [[x, r0[1] - 4], [x, top + 6]], 2.8);
        arrow(c, [[x, top + 6], [x, r0[1] - 4]], 2.8);
      } });
      return s;
    },
  };

  /* ------------------------------------------------------------- Sound --
     Built on the first press (a click, so browsers allow it); every sound
     is scheduled up front against the audio clock and runs through one
     gain (0.5) into a compressor. Stopping a demo disconnects its gain. */
  var actx = null, noiseBuf = null, live = null;
  function soundOn() { try { return localStorage.getItem("askIsaacSound") !== "off"; } catch (e) { return true; } }
  window.addEventListener("isaac:sound", function (e) { if (!(e.detail && e.detail.on)) audioStop(); });

  function audioPlay(s) {
    audioStop();
    if (!soundOn()) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume();
      if (!noiseBuf) {
        noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      var out = actx.createGain(); out.gain.value = .5;
      var comp = actx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
      out.connect(comp); comp.connect(actx.destination);
      var t0 = actx.currentTime + .03;
      s.ev.forEach(function (e) { if (e.t >= 0 && SFX[e.s]) SFX[e.s](t0 + realTime(s, e.t) / 1000, out, e.v); });
      live = { out: out, comp: comp };
    } catch (err) { live = null; }
  }
  function audioStop() {
    if (!live) return;
    try { live.out.disconnect(); live.comp.disconnect(); } catch (e) {}
    live = null;
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(.0001, t + a + d);
  }
  function tone(t, out, f0, f1, dur, peak) {
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * .6);
    env(g, t, .004, peak, dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + .03);
  }
  function hiss(t, out, type, f, q, att, dur, peak, sweep) {
    var n = actx.createBufferSource(), b = actx.createBiquadFilter(), g = actx.createGain();
    n.buffer = noiseBuf;
    b.type = type; b.Q.value = q;
    b.frequency.setValueAtTime(f, t);
    if (sweep) b.frequency.exponentialRampToValueAtTime(sweep, t + att + dur * .5);
    env(g, t, att, peak, dur);
    n.connect(b); b.connect(g); g.connect(out);
    n.start(t, Math.random() * .6); n.stop(t + att + dur + .02);
  }
  var SFX = {
    swish: function (t, o, v) { hiss(t, o, "bandpass", 500, 1.4, .085, .06, .22 * (v || 1), 3000); },
    hit: function (t, o, v) { v = v || 1; tone(t, o, 520, 165, .14, .5 * v); hiss(t, o, "bandpass", 2400, 1.2, .002, .014, .26 * v); },
    bounce: function (t, o, v) { v = v || 1; tone(t, o, 340, 125, .12, .3 * v); hiss(t, o, "bandpass", 1700, 1, .002, .012, .1 * v); },
    net: function (t, o, v) { v = v || 1; hiss(t, o, "lowpass", 650, .7, .004, .08, .32 * v); tone(t, o, 150, 90, .1, .16 * v); },
    wall: function (t, o, v) { v = v || 1; tone(t, o, 290, 125, .12, .38 * v); hiss(t, o, "bandpass", 1200, 1, .002, .03, .2 * v); },
    "catch": function (t, o, v) { v = v || 1; tone(t, o, 230, 130, .07, .24 * v); hiss(t, o, "lowpass", 900, .7, .003, .025, .12 * v); },
    tap: function (t, o, v) { v = v || 1; tone(t, o, 120, 70, .06, .18 * v); hiss(t, o, "lowpass", 500, .7, .003, .03, .08 * v); },
  };

  /* -------------------------------------------------------------- Time --
     Scenes are written in scene time; playback runs in real time. Around
     each fix contact (scene.slow) the clock eases down to 0.4x for about
     0.3 s, so the body cue is seen, then eases back. map[i] is the scene
     time at real millisecond i. */
  function warp(s) {
    var sl = s.slow, map = [0], st = 0, n = 0;
    function speed(t) {
      var v = 1, i, a, b, r = 60, w;
      for (i = 0; i < sl.length; i++) {
        a = sl[i] - 70; b = sl[i] + 50; w = 0;
        if (t >= a && t <= b) w = 1;
        else if (t > a - r && t < a) w = .5 - .5 * Math.cos(Math.PI * (t - a + r) / r);
        else if (t > b && t < b + r) w = .5 + .5 * Math.cos(Math.PI * (t - b) / r);
        v = Math.min(v, 1 - .6 * w);
      }
      return v;
    }
    while (st < s.dur && n++ < 20000) { st = Math.min(s.dur, st + speed(st)); map.push(st); }
    s.map = map; s.real = map.length - 1;
  }
  function sceneTime(s, real) {
    if (real >= s.real) return s.dur;
    if (real <= 0) return 0;
    var i = Math.floor(real);
    return s.map[i] + (s.map[i + 1] - s.map[i]) * (real - i);
  }
  function realTime(s, st) {
    var lo = 0, hi = s.real, m;
    while (lo < hi) { m = (lo + hi) >> 1; if (s.map[m] < st) lo = m + 1; else hi = m; }
    return lo;
  }

  /* ------------------------------------------------------------ Render -- */
  function render(d, t) {
    var c = d.ctx, s = d.scene, cw = d.canvas.width, sc = cw / W, i;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cw, d.canvas.height);
    if (RTL) c.setTransform(-sc, 0, 0, sc, cw, 0); else c.setTransform(sc, 0, 0, sc, 0, 0);
    drawCourt(c, s.court);
    if (s.under) s.under(c, t);
    for (i = 0; i < s.tracers.length; i++) drawTracer(c, s.tracers[i], t);
    for (i = 0; i < s.ghosts.length; i++) {
      var g = s.ghosts[i];
      if (t >= g.from) drawFig(c, g.f, g.at, .16 * clamp((t - g.from) / 250));
    }
    for (i = 0; i < s.figs.length; i++) drawSwing(c, s.figs[i], t);
    for (i = 0; i < s.figs.length; i++) drawFig(c, s.figs[i], t);
    for (i = 0; i < s.cues.length; i++) {
      var q = s.cues[i], qa = cueAlpha(q, t);
      if (qa <= .01) continue;
      c.globalAlpha = qa; c.strokeStyle = INK; c.lineWidth = 1.6; c.lineCap = "round"; c.lineJoin = "round";
      q.draw(c, t);
    }
    c.globalAlpha = 1;
    for (i = 0; i < s.balls.length; i++) drawBall(c, s.balls[i], t);
    if (s.over) s.over(c, t);
    c.setTransform(sc, 0, 0, sc, 0, 0);
    for (i = 0; i < s.marks.length; i++) drawMark(c, s.marks[i], t, RTL);
    d.lastT = t;
  }

  /* -------------------------------------------------------------- DOM -- */
  function word(key, fallback) {
    var v = T[key];
    return typeof v === "string" && v ? { text: v, own: true } : { text: fallback, own: false };
  }
  function setWord(el, w) {
    el.textContent = w.text;
    if (!w.own && docLang.indexOf("en") !== 0) el.setAttribute("lang", "en"); else el.removeAttribute("lang");
  }
  var PLAY = word("tipDemoPlay", "Watch the fix");
  var AGAIN = word("tipDemoReplay", "Watch again");
  var LABEL = word("tipDemoLabel", "Animation of the fix");

  var current = null, demos = [];

  function Demo(article) {
    var self = this;
    this.id = article.id;
    this.article = article;
    this.stage = null; this.canvas = null; this.ctx = null; this.scene = null;
    this.raf = 0; this.playing = false; this.lastT = 0;
    var box = document.createElement("div");
    box.className = "tip-demo";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "link-btn tip-demo-btn";
    btn.setAttribute("aria-pressed", "false");
    setWord(btn, PLAY);
    box.appendChild(btn);
    article.appendChild(box);
    article.classList.add("has-demo");
    this.box = box; this.btn = btn;
    btn.addEventListener("click", function () { self.press(); });
  }

  Demo.prototype.ensureStage = function () {
    if (this.stage) return;
    var h3 = this.article.querySelector("h3");
    var stage = document.createElement("div");
    stage.className = "tip-demo-stage is-new";
    stage.id = "tip-demo-" + this.id;
    stage.setAttribute("role", "img");
    stage.setAttribute("aria-label", (h3 ? h3.textContent.trim() + " — " : "") + LABEL.text);
    /* The description is the tip's own fix, in the page's language. */
    var fix = this.article.querySelector("p");
    if (fix) {
      if (!fix.id) fix.id = "tip-fix-" + this.id;
      stage.setAttribute("aria-describedby", fix.id);
    }
    var cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    stage.appendChild(cv);
    this.box.appendChild(stage);
    this.btn.setAttribute("aria-controls", stage.id);
    this.stage = stage; this.canvas = cv; this.ctx = cv.getContext("2d");
    this.scene = BUILD[this.id]();
    warp(this.scene);
    this.size();
  };

  Demo.prototype.size = function () {
    if (!this.stage) return;
    var w = this.stage.clientWidth || 320, dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = Math.max(1, Math.round(w * dpr)), ch = Math.round(cw / 2);
    if (this.canvas.width !== cw || this.canvas.height !== ch) { this.canvas.width = cw; this.canvas.height = ch; }
  };

  Demo.prototype.press = function () {
    if (this.playing) { this.stop(); return; }
    if (current && current !== this) current.stop();
    this.ensureStage();
    if (reduceMQ && reduceMQ.matches) {          // reduced motion: the finished picture, still
      render(this, this.scene.dur);
      return;
    }
    this.play();
  };

  Demo.prototype.play = function () {
    var self = this, s = this.scene, start = 0;
    current = this;
    this.playing = true;
    this.btn.setAttribute("aria-pressed", "true");
    this.stage.setAttribute("aria-busy", "true");
    audioPlay(s);
    render(this, 0);
    this.raf = requestAnimationFrame(function frame(now) {
      if (!start) start = now - 1;
      var t = now - start;
      render(self, sceneTime(s, t));
      if (t < s.real) self.raf = requestAnimationFrame(frame);
      else self.finish();
    });
  };

  /* Stopping early (pressed again, or another demo started) jumps to the
     end, so the stage is never left on a half-drawn frame. */
  Demo.prototype.stop = function () {
    if (!this.playing) return;
    cancelAnimationFrame(this.raf);
    audioStop();
    render(this, this.scene.dur);
    this.finish();
  };

  Demo.prototype.finish = function () {
    this.playing = false;
    this.raf = 0;
    if (current === this) current = null;
    this.btn.setAttribute("aria-pressed", "false");
    this.stage.setAttribute("aria-busy", "false");
    setWord(this.btn, AGAIN);
  };

  Array.prototype.forEach.call(document.querySelectorAll("article.tip[id]"), function (a) {
    if (IDS.indexOf(a.id) >= 0 && BUILD[a.id]) demos.push(new Demo(a));
  });

  /* A stage follows its column: on resize, redraw the frame it shows. */
  var pend = 0;
  window.addEventListener("resize", function () {
    if (pend) return;
    pend = requestAnimationFrame(function () {
      pend = 0;
      demos.forEach(function (d) {
        if (!d.stage) return;
        d.size();
        if (!d.playing) render(d, d.lastT);
      });
    });
  });
})();
