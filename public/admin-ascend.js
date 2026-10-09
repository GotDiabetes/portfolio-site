/* ============================================================================
   The admin gate's right-key scene: a stick figure leaps into the air with
   two rackets and unlocks the padlock.

   admin-gate.js calls AdminFX.ascend(scene) when the Worker says the key is
   right (the contract is at the top of admin-gate.js). The promise settles
   at about 4 s; then the player and the lock fly up and out ahead of the
   gate's curtain:

     1. Click (0–0.6 s). The padlock gives one satisfied click while the
        eyebrow, the title and the field ease away downward; the lock glides
        to its stage above the middle and grows. A floor line fades in near
        the bottom with Book FX's player standing on it, in white, a racket
        in each hand. He crouches.
     2. Leap (0.6–1.5 s). He springs off the floor and rises fast, slowing
        into a hover well above it: arms sweeping up, legs together and
        trailing. A puff of dust at takeoff, a contact glow on the floor
        that shrinks as he climbs, a thin column of lift and rising motes
        under him, faint speed lines. Then he floats: a gentle bob with the
        legs swinging.
     3. Unlock (1.7–3.1 s). He twirls both rackets like batons and clinks
        them into an X (a bright "ting" and an amber spark); a key forms in
        the crossing. He flings the rackets apart, the key spins up to the
        keyhole and snaps in (the lock dips, the first clack), holds, turns
        a quarter about its own blade (past 90° and back), and the shackle
        springs open with a jolt.
     4. Victory (3.1–4 s). A ring of light, rays and sparkles from the open
        lock; the player pops into a star jump, rackets high. When the
        promise settles, the lock and then the player shoot up off the top
        of the screen, ahead of the curtain.

   A skip (scene.onSkip, when the gate offers it) jumps straight to the
   shackle springing, so the payoff still shows.

   Everything is drawn on one canvas in the gate's fx layer. The canvas
   takes over the padlock on the first frame (same paths, same place), so
   it can move and open. The player is the Book FX rig (joints keyed through
   poses and eased every frame, about 85 units tall, round caps, a thin
   halo in the opposite tone), seen from the front, with shoulders, and
   Book FX's racket in both hands. Sound is synthesized with Web Audio like
   Book FX's, through one compressor, and stays silent when the site's
   sound is muted.

   Reduced motion: no flight. The words fade, the shackle slides open, a
   short chime, and the gate lifts after 0.7 s.

   Colours: white and greys on the gate's ink. The only hue is Book FX's
   spark amber, on the two sparks.
   ========================================================================== */

(function () {
  "use strict";

  window.AdminFX = window.AdminFX || {};

  var INK = "#0d0d0d";
  var AMBER = "#f5b700", AMBER_CORE = "#fffbe0";   // Book FX's spark
  var RULE = "rgba(255,255,255,.3)";                 // the site's rule on black
  var TAU = Math.PI * 2, RAD = Math.PI / 180;
  var LW = 3.1;                                       // the player's line, in figure units

  /* ---------------------------------------------------------- Timeline --
     Milliseconds from the call. */
  var T = {
    ground: [120, 420],       // the floor and the player fade in
    takeoff: 580,             // he leaves the floor
    rise: [580, 1450],        // up to the hover
    twirl: [1760, 2020],      // both rackets spin once
    gather: [1940, 2100],     // light pulls into the crossing
    ting: 2100,               // the rackets clink into an X
    keyPop: [2100, 2310],     // the key forms in the crossing
    hold: 2380,               // the key leaves the rackets
    fling: [2380, 2660],      // up, spinning, to the mouth of the keyhole
    snap: [2680, 2740],       // and in, to a hard stop
    seated: 2740,
    turn: [2850, 3070],       // a quarter turn, overshooting to ~98°
    open: 3110,               // the shackle springs
    victory: [3130, 3410],    // the pose
    done: 4000,               // the promise settles
    exit: 700,                // then up and away (the lock leads by 60 ms)
    tail: 1500                // keep drawing until the gate drops the layer
  };

  /* ------------------------------------------------------------ Easing -- */
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(t, a, b) { return clamp01((t - a) / (b - a)); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function inOutSine(u) { return -(Math.cos(Math.PI * u) - 1) / 2; }
  function inOutCubic(u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function inCubic(u) { return u * u * u; }
  function outCubic(u) { return 1 - Math.pow(1 - u, 3); }
  function outExpo(u) { return u >= 1 ? 1 : 1 - Math.pow(2, -10 * u); }
  function outBack(u, s) { var c = s == null ? 1.70158 : s; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }
  function back(s) { return function (u) { return outBack(u, s); }; }

  /* ----------------------------------------------------------- The rig --
     Book FX's skeleton, seen from the front: x to the right, y up negative,
     feet near y = 0, about 85 units tall. l = the screen-left limb. The
     arms hang from shoulders 3.5 units either side of the neck. rL and rR
     are the racket angles in degrees (0 points right, -90 straight up); the
     poses are mirror images, so rR = -180 - rL. */
  var J = ["head", "neck", "hip", "lKnee", "lFoot", "rKnee", "rFoot", "lElbow", "lHand", "rElbow", "rHand"];
  var SHOULDER = 3.5;
  var STAND = [[-3.5, -20], [-5.5, 0], [3.5, -20], [5.5, 0]];
  var CROUCH = [[-8, -16], [-5.5, 0], [8, -16], [5.5, 0]];
  var REACH = [[-2.4, -21], [-1.6, -.4], [2.4, -21], [1.6, -.4]];      // legs straight, toes down
  var TRAIL = [[-2.8, -20.4], [-1.5, -.6], [3.1, -20.9], [2.3, -1.8]];   // legs together, trailing
  var HOVER = [[-3.2, -20.2], [-2, -.2], [3.4, -21], [2.6, -1.6]];
  var DIP = [[-5, -21.6], [-2.6, -3.2], [5.2, -22], [3, -3.8]];          // knees drawn up a little
  var STAR = [[-7.5, -21], [-12.5, -2.5], [7.5, -21], [12.5, -2.5]];    // a star jump: joy
  var STAR2 = [[-7, -21], [-11.5, -2], [7, -21], [11.5, -2]];

  /* dy lowers the body; the head sits 13 above the neck, so a short neck
     shows between it and the shoulders. */
  function pose(dy, legs, elbow, hand, rL, look) {
    return {
      head: [0, -79 + dy - (look || 0)], neck: [0, -66 + dy], hip: [0, -40 + dy],
      lKnee: legs[0], lFoot: legs[1], rKnee: legs[2], rFoot: legs[3],
      lElbow: elbow, lHand: hand, rElbow: [-elbow[0], elbow[1]], rHand: [-hand[0], hand[1]],
      rL: rL, rR: -180 - rL
    };
  }

  var CROSS = pose(-.6, HOVER, [-12, -80], [-6.3, -95.5], -42);         // the X
  var KEYS = [
    { t: 0,    p: pose(0,   STAND,  [-8, -52],     [-11, -38],    -250) },                // standing, rackets down
    { t: 380,  p: pose(0,   STAND,  [-8, -52],     [-11, -38],    -250), e: inOutSine },
    { t: 560,  p: pose(10,  CROUCH, [-10, -43],    [-15, -30],    -235), e: inOutSine },  // crouch
    { t: 660,  p: pose(-1,  REACH,  [-16, -72],    [-28, -80],    -155), e: outCubic },   // spring: arms sweep up
    { t: 950,  p: pose(0,   TRAIL,  [-12, -78],    [-15, -94],    -100), e: inOutSine },  // rising, rackets high
    { t: 1550, p: pose(0,   HOVER,  [-13, -77.5],  [-17, -93],    -104), e: inOutSine },  // hover
    { t: 1780, p: pose(1.6, DIP,    [-16, -70],    [-26, -80],    -150), e: inOutSine },  // dip, rackets out
    { t: 2020, p: pose(0,   HOVER,  [-13, -79],    [-15, -94.5],  -100), e: inOutCubic }, // up out of the twirl, apart
    { t: 2100, p: CROSS, e: inCubic },                                                      // clink
    { t: 2160, p: pose(-.3, HOVER,  [-12, -79.8],  [-6.8, -95.2], -47),  e: outCubic },   // recoil
    { t: 2300, p: CROSS, e: inOutSine },                                                    // hold the X
    { t: 2380, p: pose(1.4, DIP,    [-12.5, -77],  [-6.3, -92],   -44),  e: inOutSine },  // wind up
    { t: 2530, p: pose(-1,  HOVER,  [-13, -80.5],  [-19, -96],    -120), e: outExpo },    // fling apart
    { t: 3090, p: pose(0,   HOVER,  [-13, -79],    [-18, -94.5],  -113, 1), e: inOutSine },    // watch it turn
    { t: 3410, p: pose(-1,  STAR,   [-14, -82],    [-22, -97.5],  -123, .8), e: back(1.5) },   // victory
    { t: 3950, p: pose(-.6, STAR2,  [-14, -81.6],  [-21.5, -97],  -120, .6), e: inOutSine },
    { t: 4220, p: pose(-1,  TRAIL,  [-8, -80],     [-8.5, -96],   -96, .5),  e: inOutCubic }  // away: streamlined
  ];

  function poseAt(t) {
    var i = 0;
    while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
    var a = KEYS[i], b = KEYS[i + 1];
    var u = (b.e || inOutSine)(clamp01((t - a.t) / (b.t - a.t)));
    var p = { rL: lerp(a.p.rL, b.p.rL, u), rR: lerp(a.p.rR, b.p.rR, u) };
    for (var k = 0; k < J.length; k++) {
      var n = J[k];
      p[n] = [lerp(a.p[n][0], b.p[n][0], u), lerp(a.p[n][1], b.p[n][1], u)];
    }
    return p;
  }

  /* Where the two racket shafts cross, in figure units. */
  function crossing(p) {
    var a = p.lHand, b = p.rHand;
    var ax = Math.cos(p.rL * RAD), ay = Math.sin(p.rL * RAD);
    var bx = Math.cos(p.rR * RAD), by = Math.sin(p.rR * RAD);
    var den = ax * by - ay * bx;
    if (Math.abs(den) < 1e-3) return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 14];
    var s = ((b[0] - a[0]) * by - (b[1] - a[1]) * bx) / den;
    return [a[0] + ax * s, a[1] + ay * s];
  }

  /* The X: the throats cross just below the heads, and the heads fan out
     into a V that holds the key. */
  var X_AT = crossing(CROSS);

  function swing(pt, hip, a) {
    var dx = pt[0] - hip[0], dy = pt[1] - hip[1], c = Math.cos(a), s = Math.sin(a);
    pt[0] = hip[0] + dx * c - dy * s; pt[1] = hip[1] + dx * s + dy * c;
  }

  /* ----------------------------------------------------------- Shapes --
     The padlock is the gate's own SVG (viewBox 0 0 64 84); the key is drawn
     about the point that meets the keyhole, blade up. */
  var LOCK_BODY = "M14 36H50A7 7 0 0 1 57 43V73A7 7 0 0 1 50 80H14A7 7 0 0 1 7 73V43A7 7 0 0 1 14 36Z";
  var LOCK_HOLE = "M32 51a5 5 0 0 1 2.5 9.3V67h-5v-6.7A5 5 0 0 1 32 51z";
  var KEY_BODY = "M0 -12.4L1.8 -10.8H6.2V-8.6H4.4V-6.8H6.2V-4.2H5V-2.4H1.8V6.2H3.8V9.2H1.8V10.4H-1.8V9.2H-3.8V6.2H-1.8V-10.8Z";
  var KEY_BOW = "M7 16.5A7 7 0 1 1 -7 16.5A7 7 0 1 1 7 16.5ZM2.9 16.5A2.9 2.9 0 1 0 -2.9 16.5A2.9 2.9 0 1 0 2.9 16.5Z";
  var KEY_SEAT = 8;      // how far past the keyhole the seated key goes, in key units

  /* ------------------------------------------------------------ Entry -- */
  window.AdminFX.ascend = function (scene) {
    return new Promise(function (resolve) {
      var settled = false;
      function done() { if (!settled) { settled = true; resolve(); } }
      try {
        if (scene.reduced) quiet(scene, done);
        else full(scene, done);
      } catch (err) { done(); }
    });
  };

  /* The card's words and field ease away; the lock stays. */
  function fadeCard(card, lock, reduced) {
    if (!card) return;
    var kids = Array.prototype.filter.call(card.children, function (n) { return n !== lock; });
    kids.forEach(function (n, i) {
      if (!n.animate) { n.style.opacity = "0"; return; }
      n.animate(reduced
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(18px)" }],
        { duration: reduced ? 280 : 380, delay: i * 55, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" });
    });
  }

  /* ---------------------------------------------------- Reduced motion -- */
  function quiet(sc, done) {
    fadeCard(sc.card, sc.lock, true);
    var sh = sc.lock && sc.lock.querySelector(".gate-shackle");
    if (sh && sh.animate) {
      sh.animate([{ transform: "translateY(0) rotate(0deg)" }, { transform: "translateY(-3px) rotate(20deg)" }],
        { duration: 420, delay: 140, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "forwards" });
    }
    var s = sound(sc.audio && sc.audio(), 0);
    if (s) { s.lockClick(s.at(0)); s.bell(s.at(150), 659.26); s.bell(s.at(270), 880); s.release(); }
    setTimeout(done, 700);
  }

  /* -------------------------------------------------------- The scene -- */
  function full(sc, done) {
    var layer = sc.layer, lockEl = sc.lock;
    var cv = document.createElement("canvas");
    cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;display:block";
    var ctx = cv.getContext && cv.getContext("2d");
    if (!ctx || typeof Path2D === "undefined" || !window.requestAnimationFrame) return quiet(sc, done);
    layer.appendChild(cv);

    var P_BODY = new Path2D(LOCK_BODY), P_HOLE = new Path2D(LOCK_HOLE);
    var P_KEY = new Path2D(KEY_BODY), P_BOW = new Path2D(KEY_BOW);
    var MATRIX = typeof DOMMatrix === "function" && typeof P_KEY.addPath === "function";
    var keyFill = ctx.createLinearGradient(-6, -12, 6, 23);
    keyFill.addColorStop(0, "#ffffff"); keyFill.addColorStop(.55, "#ececec"); keyFill.addColorStop(1, "#c4c4c4");
    var shaft = shaftSprite();

    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var lr = lockEl.getBoundingClientRect(), gr = layer.getBoundingClientRect();
    var lock0 = { x: lr.left - gr.left + lr.width / 2, y: lr.top - gr.top + lr.height / 2, s: (lr.width || 56) / 64 };

    /* Sizes follow the viewport: the player's body is about 24% of its
       height, the lock about 15%, both narrowed on thin screens. GY is the
       floor; UP is how high he hovers above it. */
    var W, H, S, LS, GY, UP, FOOT, LX, LY;
    function layout() {
      W = layer.clientWidth || window.innerWidth;
      H = layer.clientHeight || window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      S = Math.min(H * .24 / 85, W * .78 / 112);
      LS = Math.max(lock0.s, Math.min(H * .15 / 84, W * .26 / 64));
      GY = Math.round(H * .94);
      FOOT = GY - 1 - 1.6 * S;                     // his feet when standing on the line
      UP = H * .2;
      var crossY = FOOT - UP + X_AT[1] * S;        // where the rackets will cross
      LX = W / 2;
      LY = crossY - Math.max(H * .13, 72) - 38 * LS; // the lock's centre on its stage
    }
    layout();
    window.addEventListener("resize", layout);

    fadeCard(sc.card, lockEl, false);
    var snd = sound(sc.audio && sc.audio(), 0);
    if (snd) score(snd, 0);

    /* Particles and one-off effects. */
    var motes = [], lines = [], dust = [], sparks = [], rings = [], rays = [], stars = [], flashes = [], trail = [];
    var i;
    for (i = 0; i < 30; i++) motes.push(mote({}, true));
    for (i = 0; i < 10; i++) lines.push({ xo: (i % 2 ? 1 : -1) * (15 + Math.random() * 30), ph: Math.random(), lf: .5 + Math.random() * .6 });
    var fired = {}, prevBase = null, speed = 0, scroll = 0, keyHeld = null, lastStar = 0, took = false;

    function mote(m, init) {
      m.x = (Math.random() + Math.random() + Math.random() - 1.5) * 13;   // figure units from his centre
      m.y = init ? -1 : GY - Math.random() * 6;
      m.v = 50 + Math.random() * 110;
      m.r = .7 + Math.random() * 1.2;
      m.ph = Math.random() * TAU;
      m.a = .35 + Math.random() * .5;
      return m;
    }
    function once(name, t, at) { if (fired[name] || t < at) return false; fired[name] = true; return true; }

    var start = performance.now(), last = start, raf = 0, over = false;
    function stop() {
      if (over) return;
      over = true;
      cancelAnimationFrame(raf);
      clearInterval(guard);
      window.removeEventListener("resize", layout);
      done();
    }
    /* If frames stop coming (a hidden tab), the gate still opens on time. */
    var guard = setInterval(function () { if (performance.now() - start > T.done + 250) done(); }, 250);

    /* A skip lands just before the shackle springs: the key is home and
       turned, and the payoff plays out as usual. */
    if (typeof sc.onSkip === "function") sc.onSkip(function () {
      var t = performance.now() - start, to = T.open - 40;
      if (over || t >= to) return;
      start -= to - t;
      ["takeoff", "ting", "keyStars", "seat"].forEach(function (n) { fired[n] = true; });
      prevBase = null; speed = 0;
      trail.length = 0; dust.length = 0; sparks.length = 0; rings.length = 0; stars.length = 0;
      if (snd) snd.hush();
      snd = sound(sc.audio && sc.audio(), to);
      if (snd) score(snd, to);
    });

    function frame(now) {
      if (over) return;
      var t = Math.max(0, now - start), dt = Math.max(0, Math.min(50, now - last));
      last = now;
      try { draw(t, dt); } catch (err) { stop(); return; }
      if (t >= T.done) done();
      if (t > T.done + T.tail || !layer.isConnected) { stop(); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    /* ------------------------------------------------------- One frame -- */
    var fig = { x: 0, y: 0, rot: 0, a: 0 }, PIV = [0, -94];   // he sways from his hands
    function F(u) {
      var dx = (u[0] - PIV[0]) * S, dy = (u[1] - PIV[1]) * S, c = Math.cos(fig.rot), s = Math.sin(fig.rot);
      return [fig.x + PIV[0] * S + dx * c - dy * s, fig.y + PIV[1] * S + dx * s + dy * c];
    }

    function draw(t, dt) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.lineCap = "round"; ctx.lineJoin = "round";

      /* Where everything is. */
      var L = lockAt(t);
      var hole = [L.x, L.y + 14 * L.s];
      var lin = seg(t, T.rise[0], T.rise[1]);
      var up = UP * outExpo(lin);                                       // the leap
      var away = inCubic(seg(t, T.done + 60, T.done + 60 + T.exit));    // the exit
      var base = FOOT - up;
      base -= away * (base + 14 * S);
      if (prevBase != null && dt > 0) speed = lerp(speed, Math.max(0, (prevBase - base) / dt * 1000), .5);
      prevBase = base;
      var hov = seg(t, 1250, 1600);                                     // the float, once he's up
      var ph = TAU * 1.4 * t / 1000;
      fig.a = outCubic(seg(t, T.ground[0], T.ground[1]));
      fig.x = W / 2 + S * 5 * Math.sin(lin * Math.PI * 1.6) * (1 - lin);
      fig.y = base + (1 - fig.a) * 10 + 3 * S * Math.sin(ph) * hov
        - S * 7 * outBack(seg(t, T.victory[0], T.victory[1]), 1.6);
      fig.rot = 1.8 * RAD * Math.sin(TAU * t / 1900 + .6) * seg(t, 650, 1100)
        * (1 - .6 * seg(t, 2000, 2150) + .3 * seg(t, 3150, 3450));

      var p = poseAt(t);
      /* The twirl: each racket slides up through the hand and spins once
         about its middle, like a baton, then drops back to the grip. */
      var tw = seg(t, T.twirl[0], T.twirl[1]);
      var spin = 360 * inOutCubic(tw);
      var omega = (spin - 360 * inOutCubic(seg(t - 12, T.twirl[0], T.twirl[1]))) / 12;   // deg per ms
      var slide = 15 * Math.sin(Math.PI * inOutSine(tw));
      var pump = 5 * Math.sin(TAU * (t - T.victory[1]) / 300) * seg(t, T.victory[1], T.victory[1] + 110) * (1 - seg(t, 3700, 4000));
      p.rL -= spin + pump; p.rR += spin + pump;
      /* Legs: a flutter on the way up, then a slow trailing swing. */
      var fl = .9 * seg(t, 650, 800) * (1 - seg(t, 1200, 1600));
      p.lFoot[0] += fl * Math.sin(t / 170); p.rFoot[0] += fl * Math.sin(t / 190 + 2.1);
      var sw = 4.5 * RAD * hov * (1 - .4 * seg(t, T.victory[0], T.victory[1]));
      swing(p.lKnee, p.hip, sw * Math.sin(ph - .9)); swing(p.lFoot, p.hip, sw * Math.sin(ph - 1.1));
      swing(p.rKnee, p.hip, sw * Math.sin(ph - 1.5)); swing(p.rFoot, p.hip, sw * Math.sin(ph - 1.7));
      var cr = F(X_AT);                                                 // where the key forms

      if (!took) { took = true; lockEl.style.visibility = "hidden"; }   // the canvas has the lock now

      /* A breath of light over everything when the lock opens. */
      flashes.forEach(function (f) {
        var u = (t - f.t0) / f.dur;
        if (u < 0 || u > 1) return;
        ctx.globalAlpha = f.a * (1 - u) * (1 - u);
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      });

      /* The floor, and the soft glow where his feet touch it: it shrinks
         and fades as he climbs. */
      ctx.globalAlpha = fig.a;
      ctx.fillStyle = RULE;
      ctx.fillRect(0, GY - 1, W, 2);
      var h = clamp01((FOOT - base) / UP);
      var ga = .5 * (1 - h) * fig.a;
      if (ga > .01) {
        var sc2 = 1 - .6 * h, rx = 17 * S * sc2;
        ctx.save();
        ctx.translate(fig.x, GY); ctx.scale(1, .16);
        var g0 = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        g0.addColorStop(0, "rgba(255,255,255," + (ga * .55).toFixed(3) + ")"); g0.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = 1; ctx.fillStyle = g0;
        ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
        ctx.restore();
      }

      /* Takeoff: a puff of dust along the floor. */
      if (once("takeoff", t, T.takeoff)) {
        for (i = 0; i < 14; i++) {
          var side = i % 2 ? 1 : -1;
          dust.push({ x: fig.x + side * (2 + Math.random() * 6) * S, y: GY - 1 - Math.random() * 2,
            vx: side * (50 + Math.random() * 150), vy: -(10 + Math.random() * 45), t0: t, life: 420 + Math.random() * 220, r: .8 + Math.random() });
        }
      }
      ctx.fillStyle = "#fff";
      dust.forEach(function (d) {
        var u = (t - d.t0) / d.life;
        if (u < 0 || u > 1) return;
        var k = (1 - Math.exp(-5 * u * d.life / 1000)) / 5;               // drag
        ctx.globalAlpha = .45 * (1 - u) * (1 - u);
        ctx.beginPath(); ctx.arc(d.x + d.vx * k, d.y + d.vy * k, d.r * (1 + 2.2 * u), 0, TAU); ctx.fill();
      });

      /* Lift: a thin column of light just under his feet, fading long
         before the floor, and motes rising from the floor into it. */
      var feetY = fig.y + 3 * S, air = GY - feetY;
      var I = .17 * clamp01(up / (40 * S)) * (1 - .45 * seg(t, 1450, 1900)) * (1 - seg(t, T.done - 300, T.done));
      if (I > .005 && air > 6) {
        ctx.globalAlpha = I;
        ctx.drawImage(shaft, fig.x - 24 * S, feetY, 48 * S, Math.min(air, H * .3));
      }
      var mI = clamp01(up / (30 * S)) * (1 - .4 * seg(t, 3100, 3600)) * (1 - seg(t, T.done, T.done + 250));
      ctx.fillStyle = "#fff";
      motes.forEach(function (m) {
        m.y -= (m.v + speed * .5) * dt / 1000;
        if (m.y < feetY + 4 * S || m.y > GY) mote(m, false);
        var a = m.a * mI * clamp01((m.y - feetY - 4 * S) / (30 * S)) * clamp01((GY - m.y) / 24) * (.7 + .3 * Math.sin(t / 90 + m.ph));
        if (a <= .01) return;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(fig.x + m.x * S + Math.sin(t / 400 + m.ph) * 3, m.y, m.r, 0, TAU);
        ctx.fill();
      });

      /* Speed lines beside him, streaming down while he climbs or leaves. */
      var sp = clamp01(speed / 800);
      if (sp > .02) {
        scroll += speed * 1.6 * dt / 1000;
        var range = 200 * S;
        ctx.lineWidth = 1.2;
        lines.forEach(function (l) {
          var yr = (l.ph * range + scroll) % range;
          var y = fig.y - 140 * S + yr, x = fig.x + l.xo * S;
          var len = Math.min(170, speed * .1) * l.lf;
          var a = sp * .32 * Math.sin(Math.PI * yr / range);
          if (a <= .01 || y > GY - 2) return;
          var g = ctx.createLinearGradient(0, y - len, 0, y);
          g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255," + a.toFixed(3) + ")");
          ctx.globalAlpha = 1; ctx.strokeStyle = g;
          ctx.beginPath(); ctx.moveTo(x, y - len); ctx.lineTo(x, y); ctx.stroke();
        });
      }

      /* Light gathering into the crossing, then the clink. */
      if (t >= T.gather[0] && t < T.ting) gather(cr, seg(t, T.gather[0], T.ting));
      if (once("ting", t, T.ting)) {
        spark(cr[0], cr[1], S * .5, 11, t);
        rings.push({ x: cr[0], y: cr[1], t0: t, dur: 520, r0: 4 * S, r1: 36 * S, w: 1.5, a: .7, c: "#fff" });
      }
      if (once("keyStars", t, T.ting + 90)) {
        star(cr[0] - 15 * S, cr[1] - 20 * S, 7, 0, 420, t);
        star(cr[0] + 14 * S, cr[1] - 10 * S, 5, 90, 380, t);
      }

      /* The key home: a ripple on the lock's face. Open: the turn's spark,
         a ring of light, rays and sparkles. */
      if (once("seat", t, T.seated)) rings.push({ x: hole[0], y: hole[1], t0: t, dur: 340, r0: 3 * L.s, r1: 15 * L.s, w: 1.4, a: .55, c: INK });
      if (once("burst", t, T.open)) {
        spark(hole[0], hole[1], L.s * .8, 9, t);
        var R = 40 * L.s, m = Math.min(W, H);
        rings.push({ x: L.x, y: L.y, t0: t + 10, dur: 900, r0: R, r1: m * .48, w: 2.4, a: .8, c: "#fff" });
        rings.push({ x: L.x, y: L.y, t0: t + 120, dur: 760, r0: R * .9, r1: m * .3, w: 1.2, a: .55, c: "#fff" });
        rays.push({ x: L.x, y: L.y, t0: t + 10, dur: 620, n: 18, r0: R * 1.12, span: m * .2, off: Math.random() * TAU });
        flashes.push({ t0: t + 10, dur: 300, a: .055 });
        for (i = 0; i < 12; i++) {
          var a = Math.random() * TAU, d = R * (1.3 + Math.random() * 1.5);
          star(L.x + Math.cos(a) * d * 1.15, L.y + Math.sin(a) * d, 4 + Math.random() * 7, Math.random() * 420, 520 + Math.random() * 300, t);
        }
      }
      /* Sparkles keep coming while the pose is held. */
      if (t > T.open + 160 && t < T.done && t - lastStar > 120) {
        lastStar = t;
        var a2 = Math.random() * TAU, d2 = 40 * L.s * (1.3 + Math.random() * 1.6);
        if (Math.random() < .3) {
          var tip = F(Math.random() < .5 ? [-39, -124] : [39, -124]);
          star(tip[0] + (Math.random() - .5) * 30, tip[1] + (Math.random() - .5) * 30, 3 + Math.random() * 5, 0, 520, t);
        } else star(L.x + Math.cos(a2) * d2 * 1.15, L.y + Math.sin(a2) * d2, 3 + Math.random() * 6, 0, 560, t);
      }

      drawRings(t);
      drawRays(t);
      drawLock(L);
      drawFigure(p, omega, slide);
      var K = keyAt(t, cr, hole, L);
      if (K) {
        /* In flight, a thin comet streak along the key's path. */
        if (t > T.hold && t < T.seated) {
          trail.unshift([K.x - Math.sin(K.r) * 5 * K.k, K.y + Math.cos(K.r) * 5 * K.k]);
          if (trail.length > 9) trail.length = 9;
        } else trail.length = Math.max(0, trail.length - 1);
        streak();
        drawKey(K);
      }
      drawSparks(t);
      drawStars(t);
      ctx.globalAlpha = 1;
    }

    /* ---------------------------------------------------------- Lock -- */
    function lockAt(t) {
      var g = inOutCubic(seg(t, 120, 820));
      var x = lerp(lock0.x, LX, g), y = lerp(lock0.y, LY, g), s = lerp(lock0.s, LS, g);
      var c = seg(t, 0, 260);
      s *= 1 + .05 * Math.sin(Math.PI * c) * (1 - c);                        // the click
      y += 2 * Math.sin(Math.PI * seg(t, T.seated - 10, T.seated + 120));     // the key seats: a 2 px dip
      var h = seg(t, T.open, T.open + 200);
      y -= 3 * Math.sin(Math.PI * h);                                         // it opens: a 3 px jolt
      s *= 1 + .035 * Math.sin(Math.PI * h);
      var lift = -1.8 * Math.sin(Math.PI * seg(t, 0, 200));                    // shackle settles
      if (t > T.open) { var tau = (t - T.open) / 1000; lift = 12 * (1 - Math.exp(-10 * tau) * Math.cos(30 * tau)); }
      var tilt = 17 * RAD * outBack(seg(t, T.open + 30, T.open + 330), 2);
      y -= inCubic(seg(t, T.done, T.done + T.exit)) * (y + 64 * s + 30);      // away, ahead of the player
      return { x: x, y: y, s: s, lift: lift, tilt: tilt };
    }

    function drawLock(L) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.translate(L.x, L.y); ctx.scale(L.s, L.s); ctx.translate(-32, -42);
      ctx.save();
      ctx.translate(46, 36); ctx.rotate(L.tilt); ctx.translate(-46, -36 - L.lift);
      ctx.beginPath();
      ctx.moveTo(18, 38); ctx.lineTo(18, 24); ctx.arc(32, 24, 14, Math.PI, 0); ctx.lineTo(46, 39 + Math.max(0, L.lift));
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#fff"; ctx.fill(P_BODY);
      ctx.fillStyle = INK; ctx.fill(P_HOLE);
      ctx.restore();
    }

    /* ----------------------------------------------------------- Key -- */
    function keyAt(t, cr, hole, L) {
      if (t < T.keyPop[0]) return null;
      var kF = LS * 1.2, kI = L.s * 1.4;
      if (t < T.hold) {                                  // forming, bow on the crossing
        var u = seg(t, T.keyPop[0], T.keyPop[1]);
        var k = kF * Math.max(0, outBack(u, 2.2));
        var r = -25 * RAD * (1 - outCubic(u));
        keyHeld = [cr[0], cr[1] - 16.5 * kF];
        return { x: cr[0] + Math.sin(r) * 16.5 * k, y: cr[1] - Math.cos(r) * 16.5 * k, k: k, r: r, turn: 0, a: clamp01(u * 5), clip: null };
      }
      var from = keyHeld || [cr[0], cr[1] - 16.5 * kF];
      var e = outCubic(seg(t, T.fling[0], T.fling[1]));
      var k2 = lerp(kF, kI, e);
      var x = lerp(from[0], hole[0], e) + 24 * Math.sin(Math.PI * e) * (W < 600 ? .7 : 1);
      var y = lerp(from[1], hole[1] + 12.4 * k2, e);    // tip at the keyhole
      var sn = seg(t, T.snap[0], T.snap[1]);
      y -= (12.4 + KEY_SEAT) * k2 * sn * sn;             // in, faster and faster, to a hard stop
      var depth = (hole[1] - y) / k2;                    // the keyhole, in key units
      return {
        x: x, y: y, k: k2, a: 1,
        r: -TAU * outCubic(seg(t, T.fling[0], T.fling[0] + 220)),
        turn: 90 * RAD * outBack(seg(t, T.turn[0], T.turn[1]), 1.6),
        clip: depth > -12.6 ? depth : null
      };
    }

    /* The key turns about its own blade: the face narrows (never quite to
       its edge, so the bow still reads as a bow) and shades as it turns,
       so it stays inside the lock's outline. clip hides the part inside. */
    function drawKey(K) {
      if (K.k <= 0 || K.a <= 0) return;
      ctx.save();
      ctx.globalAlpha = K.a;
      ctx.translate(K.x, K.y); ctx.rotate(K.r); ctx.scale(K.k, K.k);
      if (K.clip != null) { ctx.beginPath(); ctx.rect(-40, K.clip, 80, 80); ctx.clip(); }
      ctx.lineJoin = "round";
      var c = Math.cos(K.turn), s = Math.abs(Math.sin(K.turn));
      var sx = c >= 0 ? Math.max(c, .32) : Math.min(c, -.32);
      var face = P_KEY, bow = P_BOW;
      if (s > .01) {
        if (MATRIX) {
          var m = new DOMMatrix([sx, 0, 0, 1, 0, 0]);
          face = new Path2D(); face.addPath(P_KEY, m);
          bow = new Path2D(); bow.addPath(P_BOW, m);
        } else ctx.scale(sx, 1);
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.stroke(face); ctx.stroke(bow);
      ctx.fillStyle = keyFill;
      ctx.fill(face); ctx.fill(bow, "evenodd");
      if (s > .01) {                                     // it shades as it turns away
        ctx.fillStyle = "rgba(0,0,0," + (.3 * s).toFixed(3) + ")";
        ctx.fill(face); ctx.fill(bow, "evenodd");
      }
      ctx.restore();
    }

    function streak() {
      ctx.strokeStyle = "#fff"; ctx.lineCap = "round";
      for (var j = 1; j < trail.length; j++) {
        var q = 1 - j / trail.length;
        ctx.globalAlpha = .5 * q;
        ctx.lineWidth = .5 + 3.2 * q;
        ctx.beginPath(); ctx.moveTo(trail[j - 1][0], trail[j - 1][1]); ctx.lineTo(trail[j][0], trail[j][1]); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    /* -------------------------------------------------------- Player -- */
    function drawFigure(p, omega, slide) {
      if (fig.a <= 0) return;
      ctx.save();
      ctx.globalAlpha = fig.a;
      ctx.translate(fig.x + PIV[0] * S, fig.y + PIV[1] * S); ctx.rotate(fig.rot); ctx.scale(S, S); ctx.translate(-PIV[0], -PIV[1]);
      var n = p.neck, lS = [n[0] - SHOULDER, n[1] + .4], rS = [n[0] + SHOULDER, n[1] + .4];
      var b = new Path2D();
      b.moveTo(p.head[0], p.head[1]); b.lineTo(n[0], n[1]); b.lineTo(p.hip[0], p.hip[1]);    // neck and spine
      b.moveTo(lS[0], lS[1]); b.lineTo(rS[0], rS[1]);                                       // shoulders
      b.moveTo(p.lFoot[0], p.lFoot[1]); b.lineTo(p.lKnee[0], p.lKnee[1]); b.lineTo(p.hip[0], p.hip[1]);
      b.lineTo(p.rKnee[0], p.rKnee[1]); b.lineTo(p.rFoot[0], p.rFoot[1]);
      b.moveTo(lS[0], lS[1]); b.lineTo(p.lElbow[0], p.lElbow[1]); b.lineTo(p.lHand[0], p.lHand[1]);
      b.moveTo(rS[0], rS[1]); b.lineTo(p.rElbow[0], p.rElbow[1]); b.lineTo(p.rHand[0], p.rHand[1]);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = INK; ctx.lineWidth = LW + 3; ctx.stroke(b);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(p.head[0], p.head[1], 8.9, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = LW; ctx.stroke(b);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.head[0], p.head[1], 7.2, 0, TAU); ctx.fill();
      racket(p.lHand, p.rL, -omega, slide);
      racket(p.rHand, p.rR, omega, slide);
      ctx.restore();
    }

    /* Book FX's racket: a handle, an open throat, an oval head and a few
       strings. While it spins, a soft swept band trails the head and a
       hairline trails the tip. slide = how far up the shaft the hand is. */
    function racket(h, deg, omega, slide) {
      ctx.save();
      var base = ctx.globalAlpha;
      ctx.translate(h[0], h[1]); ctx.rotate(deg * RAD);
      var sm = Math.min(1, Math.abs(omega) / 1.2);
      if (sm > .05) {
        var sweep = -omega * 46 * RAD, rc = 22 - slide, rt = 31.5 - slide;
        ctx.strokeStyle = "#fff"; ctx.lineCap = "butt";
        for (var g = 0; g < 4; g++) {
          var a0 = sweep * g / 4, a1 = sweep * (g + 1) / 4;
          ctx.globalAlpha = base * .13 * sm * (1 - g / 4);
          ctx.lineWidth = 12;
          ctx.beginPath(); ctx.arc(0, 0, rc, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
          ctx.globalAlpha = base * .45 * sm * (1 - g / 4);
          ctx.lineWidth = .9;
          ctx.beginPath(); ctx.arc(0, 0, rt, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
        }
        ctx.globalAlpha = base; ctx.lineCap = "round";
      }
      ctx.translate(-slide, 0);
      /* The halo rings the frame only, so the grip runs on from the hand. */
      var f = new Path2D();
      f.moveTo(14.3, -3.87); f.lineTo(9.5, 0); f.lineTo(14.3, 3.87);
      f.ellipse(22, 0, 9.5, 6.6, 0, Math.PI, Math.PI + TAU);
      ctx.strokeStyle = INK; ctx.lineWidth = 5.4; ctx.stroke(f);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.4; ctx.stroke(f);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9.5, 0); ctx.stroke();
      ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-.6, 0); ctx.lineTo(5.4, 0); ctx.stroke();   // grip
      ctx.save();
      ctx.beginPath(); ctx.ellipse(22, 0, 8.4, 5.5, 0, 0, TAU); ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = .5;
      ctx.beginPath();
      for (var x = 15.5; x <= 29; x += 3.3) { ctx.moveTo(x, -7); ctx.lineTo(x, 7); }
      for (var y = -3.6; y <= 3.7; y += 2.4) { ctx.moveTo(12, y); ctx.lineTo(32, y); }
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    /* --------------------------------------------------------- Light -- */
    function gather(c, u) {
      var R0 = 46 * S;
      ctx.fillStyle = "#fff";
      for (var k = 0; k < 14; k++) {
        var a = k / 14 * TAU + u * 2.2 + (k % 2) * .2;
        var r = R0 * (1 - inCubic(u)) * (k % 2 ? .78 : 1);
        ctx.globalAlpha = .85 * Math.sin(Math.PI * Math.min(1, u * 1.15));
        ctx.beginPath(); ctx.arc(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, 1.1 + .8 * u, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = .4 * u;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(c[0], c[1], lerp(30 * S, 3 * S, inCubic(u)), 0, TAU); ctx.stroke();
    }

    /* Book FX's spark: a white flash ringed in amber and a spray of amber
       streaks with pale cores. k is pixels per Book FX unit. */
    function spark(x, y, k, n, t) {
      var s = { x: x, y: y, k: k, t0: t, dur: 220, st: [] };
      for (var j = 0; j < n; j++) s.st.push({ a: (j / n) * TAU + (Math.random() - .5) * .35, len: .7 + Math.random() * .6 });
      sparks.push(s);
    }
    function drawSparks(t) {
      sparks.forEach(function (s) {
        var q = (t - s.t0) / s.dur;
        if (q < 0 || q > 1) return;
        var e = outCubic(q);
        ctx.globalAlpha = 1 - q;
        ctx.fillStyle = "#fff"; ctx.strokeStyle = AMBER; ctx.lineWidth = 2 * s.k;
        ctx.beginPath(); ctx.arc(s.x, s.y, (4 + 7 * e) * s.k, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 1 - q * q;
        s.st.forEach(function (st) {
          var r1 = (5 + 16 * e) * s.k * st.len, r2 = (10 + 30 * e) * s.k * st.len;
          var c = Math.cos(st.a), sn = Math.sin(st.a);
          ctx.beginPath(); ctx.moveTo(s.x + c * r1, s.y + sn * r1); ctx.lineTo(s.x + c * r2, s.y + sn * r2);
          ctx.strokeStyle = AMBER; ctx.lineWidth = 3.2 * s.k * .8; ctx.stroke();
          ctx.strokeStyle = AMBER_CORE; ctx.lineWidth = 1.3 * s.k * .8; ctx.stroke();
        });
      });
    }

    function drawRings(t) {
      rings.forEach(function (r) {
        var u = (t - r.t0) / r.dur;
        if (u < 0 || u > 1) return;
        ctx.globalAlpha = r.a * Math.pow(1 - u, 1.6);
        ctx.strokeStyle = r.c; ctx.lineWidth = r.w * (1 - .6 * u);
        ctx.beginPath(); ctx.arc(r.x, r.y, lerp(r.r0, r.r1, outExpo(u)), 0, TAU); ctx.stroke();
      });
    }

    function drawRays(t) {
      rays.forEach(function (r) {
        var u = (t - r.t0) / r.dur;
        if (u < 0 || u > 1) return;
        var e = outExpo(u);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
        ctx.globalAlpha = .75 * (1 - u);
        ctx.beginPath();
        for (var k = 0; k < r.n; k++) {
          var a = r.off + k / r.n * TAU, long = k % 2 ? .55 : 1;
          var r1 = r.r0 + r.span * e * long, r2 = r1 + r.span * .3 * long * (1 - u);
          ctx.moveTo(r.x + Math.cos(a) * r1, r.y + Math.sin(a) * r1);
          ctx.lineTo(r.x + Math.cos(a) * r2, r.y + Math.sin(a) * r2);
        }
        ctx.stroke();
      });
    }

    /* Four-point twinkles that swell and shrink. */
    function star(x, y, r, delay, life, t) {
      stars.push({ x: x, y: y, r: r * Math.max(.7, Math.min(W, H) / 900), t0: t + delay, life: life, rot: Math.random() * TAU });
    }
    function drawStars(t) {
      ctx.fillStyle = "#fff";
      for (var k = stars.length - 1; k >= 0; k--) {
        var s = stars[k], u = (t - s.t0) / s.life;
        if (u > 1) { stars.splice(k, 1); continue; }
        if (u < 0) continue;
        var w = Math.sin(Math.PI * u), r = s.r * (.25 + .75 * w), q = r * .16;
        ctx.save();
        ctx.globalAlpha = w;
        ctx.translate(s.x, s.y); ctx.rotate(s.rot + u * .9);
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(q, -q, r, 0); ctx.quadraticCurveTo(q, q, 0, r);
        ctx.quadraticCurveTo(-q, q, -r, 0); ctx.quadraticCurveTo(-q, -q, 0, -r);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /* A soft column of light, brightest at its centre and just under the
     player, gone well before the floor: lift, not a spotlight. */
  function shaftSprite() {
    var c = document.createElement("canvas");
    c.width = 64; c.height = 256;
    var g = c.getContext("2d");
    var gx = g.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, "rgba(255,255,255,0)"); gx.addColorStop(.22, "rgba(255,255,255,.16)");
    gx.addColorStop(.4, "rgba(255,255,255,.7)"); gx.addColorStop(.5, "rgba(255,255,255,1)");
    gx.addColorStop(.6, "rgba(255,255,255,.7)"); gx.addColorStop(.78, "rgba(255,255,255,.16)");
    gx.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = "destination-in";
    var gy = g.createLinearGradient(0, 0, 0, 256);
    gy.addColorStop(0, "rgba(0,0,0,0)"); gy.addColorStop(.06, "rgba(0,0,0,1)");
    gy.addColorStop(.4, "rgba(0,0,0,.45)"); gy.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gy; g.fillRect(0, 0, 64, 256);
    return c;
  }

  /* ------------------------------------------------------------ Sound --
     Everything is scheduled up front against the AudioContext clock, so it
     stays in time with the picture even if a frame is late; from is the
     scene time the clock starts at (later after a skip, which silences the
     old schedule and starts a new one). All of it goes through one gain
     (0.55) and a compressor. */
  function score(s, from) {
    function cue(ms, f) { if (ms >= from - 1) f(s.at(ms)); }
    cue(0, s.lockClick);
    cue(T.takeoff, s.push);
    cue(T.takeoff, function (t) { s.whoosh(t, 1.3); });
    cue(1300, s.shimmer);
    cue(1810, function (t) { s.swish(t, 2600, .1); });
    cue(1890, function (t) { s.swish(t, 3400, .12); });
    cue(T.gather[0], function (t) { s.gather(t, (T.ting - T.gather[0]) / 1000); });
    cue(T.ting, s.ting);
    cue(T.ting + 70, s.pings);
    cue(T.fling[0], s.zip);
    cue(T.seated - 4, s.seat);
    cue(2885, function (t) { s.tick(t, 0); });
    cue(2935, function (t) { s.tick(t, 1); });
    cue(2990, function (t) { s.tick(t, 2); });
    cue(T.open - 3, s.clack);
    cue(T.open + 5, s.spring);
    cue(T.open + 25, s.flourish);
    cue(3420, s.twinkles);
    cue(T.done, s.soar);
    s.release();
  }

  function sound(ac, from) {
    if (!ac) return null;
    try {
      var out = ac.createGain();
      out.gain.value = .55;
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5;
      comp.attack.value = .003; comp.release.value = .25;
      out.connect(comp); comp.connect(ac.destination);
      var t0 = ac.currentTime + .03;
      var nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 2), ac.sampleRate);
      var nd = nb.getChannelData(0);
      for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    } catch (e) { return null; }

    function at(ms) { return t0 + (ms - (from || 0)) / 1000; }
    function gain(v, dest) { var g = ac.createGain(); g.gain.value = v || 0; g.connect(dest || out); return g; }
    function filt(type, f, q, dest) { var b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; b.connect(dest); return b; }
    function env(g, t, a, peak, d) {
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(.0001, t + a + d);
    }
    function noise(t, dur, dest) {
      var n = ac.createBufferSource(); n.buffer = nb; n.connect(dest);
      n.start(t, Math.random() * Math.max(0, 1.95 - dur)); n.stop(t + dur);
    }
    function osc(type, f, t, dur, dest, detune) {
      var o = ac.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (detune) o.detune.value = detune;
      if (dest) o.connect(dest);
      o.start(t); o.stop(t + dur + .05);
      return o;
    }
    /* Book FX's swish: a breath of noise whose band sweeps up. */
    function swish(t, f1, v) {
      var g = gain();
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + .09);
      g.gain.exponentialRampToValueAtTime(.0001, t + .15);
      var bp = filt("bandpass", 500, 1.4, g);
      bp.frequency.setValueAtTime(500, t);
      bp.frequency.exponentialRampToValueAtTime(f1, t + .12);
      noise(t, .16, bp);
    }
    /* A rush of air: noise sweeping up through a band, air on top, and a
       soft tone climbing with a slow vibrato. */
    function rush(t, dur, f0, f1, peak) {
      var g = gain();
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + dur * .35);
      g.gain.exponentialRampToValueAtTime(peak * .45, t + dur * .65);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      var bp = filt("bandpass", 240, .9, g);
      bp.frequency.setValueAtTime(240, t);
      bp.frequency.exponentialRampToValueAtTime(2400, t + dur * .7);
      bp.frequency.exponentialRampToValueAtTime(1500, t + dur);
      noise(t, dur, filt("highpass", 140, .7, bp));
      var ga = gain();
      ga.gain.setValueAtTime(.0001, t);
      ga.gain.exponentialRampToValueAtTime(peak * .22, t + dur * .4);
      ga.gain.exponentialRampToValueAtTime(.0001, t + dur);
      noise(t, dur, filt("highpass", 4500, .7, ga));
      var gt = gain();
      gt.gain.setValueAtTime(.0001, t);
      gt.gain.exponentialRampToValueAtTime(peak * .28, t + dur * .4);
      gt.gain.exponentialRampToValueAtTime(.0001, t + dur + .1);
      var o = osc("sine", f0, t, dur + .15, gt);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      var lfo = osc("sine", 5.5, t, dur + .15, null), lg = ac.createGain();
      lg.gain.value = 4; lfo.connect(lg); lg.connect(o.frequency);
    }

    var api = {
      at: at,
      /* The padlock taking the key: a small tick and a settle. */
      lockClick: function (t) {
        var g = gain(); env(g, t, .002, .22, .03); noise(t, .04, filt("bandpass", 3200, 1.6, g));
        var g2 = gain(); env(g2, t, .002, .05, .05);
        osc("sine", 2200, t, .07, g2).frequency.exponentialRampToValueAtTime(1500, t + .05);
        var g3 = gain(); env(g3, t + .07, .002, .1, .025); noise(t + .07, .03, filt("bandpass", 2400, 1.4, g3));
      },
      /* Takeoff: a soft thud off the floor and a scuff of dust. */
      push: function (t) {
        var g = gain(); env(g, t, .004, .22, .16);
        osc("sine", 95, t, .2, g).frequency.exponentialRampToValueAtTime(48, t + .12);
        var gd = gain(); env(gd, t, .004, .09, .14); noise(t, .2, filt("bandpass", 700, .8, gd));
      },
      /* The leap: a rush of air and a tone climbing an octave. */
      whoosh: function (t, dur) {
        rush(t, dur, 220, 440, .2);
        var g2 = gain();
        g2.gain.setValueAtTime(.0001, t);
        g2.gain.exponentialRampToValueAtTime(.02, t + .5);
        g2.gain.exponentialRampToValueAtTime(.0001, t + dur + .1);
        osc("triangle", 330, t, dur + .15, filt("lowpass", 1800, .5, g2)).frequency.exponentialRampToValueAtTime(660, t + dur);
      },
      /* The hover: an A major add9 chord of slow-attack sines, each a
         detuned pair, so it shimmers. */
      shimmer: function (t) {
        var f = [440, 554.37, 659.26, 987.77, 1318.51], v = [.036, .03, .026, .018, .012];
        f.forEach(function (hz, k) {
          [-6, 6].forEach(function (c) {
            var g = gain();
            g.gain.setValueAtTime(.0001, t);
            g.gain.exponentialRampToValueAtTime(v[k], t + .32 + k * .05);
            g.gain.exponentialRampToValueAtTime(.0001, t + 1.9);
            osc("sine", hz, t, 2, g, c);
          });
        });
      },
      swish: swish,
      /* Light pulling in: a rising hiss that stops dead on the ting. */
      gather: function (t, dur) {
        var g = gain();
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.06, t + dur);
        g.gain.linearRampToValueAtTime(.0001, t + dur + .012);
        var bp = filt("bandpass", 2500, .8, g);
        bp.frequency.setValueAtTime(2500, t);
        bp.frequency.exponentialRampToValueAtTime(8000, t + dur);
        noise(t, dur + .02, bp);
      },
      /* Racket frames meeting: bar partials (1, 2.76, 5.40) on A6, one
         detuned twin for a slow beat, and a bright transient. */
      ting: function (t) {
        var f0 = 1760;
        [[1, .15, 1.6], [2.756, .06, .7], [5.404, .028, .32], [1.0035, .08, 1.3]].forEach(function (p) {
          var g = gain(); env(g, t, .002, p[1], p[2]); osc("sine", f0 * p[0], t, p[2] + .05, g);
        });
        var gn = gain(); env(gn, t, .001, .12, .03); noise(t, .04, filt("highpass", 5000, .7, gn));
        var gk = gain(); env(gk, t, .002, .06, .06); noise(t, .06, filt("bandpass", 1400, 1.2, gk));
      },
      /* The key appearing: three small pings, up the chord. */
      pings: function (t) {
        [1760, 2217.46, 2637.02].forEach(function (f, k) {
          var g = gain(); env(g, t + k * .045, .003, .03, .32); osc("sine", f, t + k * .045, .36, g);
        });
      },
      /* The fling: a quick rising tone and a swish. */
      zip: function (t) {
        var g = gain(); env(g, t, .03, .045, .2);
        osc("sine", 480, t, .25, g).frequency.exponentialRampToValueAtTime(1500, t + .22);
        swish(t, 4200, .1);
      },
      /* The key going home: the first clack, crisp on top, a knock under. */
      seat: function (t) {
        var g = gain(); env(g, t, .001, .3, .024); noise(t, .03, filt("bandpass", 4200, 2, g));
        var g2 = gain(); env(g2, t, .001, .05, .04);
        osc("triangle", 2400, t, .05, g2).frequency.exponentialRampToValueAtTime(1700, t + .04);
        var gk = gain(); env(gk, t, .002, .16, .07);
        osc("sine", 230, t, .1, gk).frequency.exponentialRampToValueAtTime(120, t + .06);
        var gn = gain(); env(gn, t, .001, .18, .04); noise(t, .05, filt("bandpass", 1200, 1.2, gn));
      },
      /* The pins, as the key turns: small ticks, rising. */
      tick: function (t, k) {
        var g = gain(); env(g, t, .001, .09 + k * .02, .016); noise(t, .025, filt("bandpass", 3600 + k * 400, 3, g));
      },
      /* The bolt letting go: a weighty clack, a falling thump under a
         knock and the latch's snap. */
      clack: function (t) {
        var g = gain(); env(g, t, .003, .3, .18);
        osc("sine", 160, t, .22, g).frequency.exponentialRampToValueAtTime(58, t + .15);
        var gk = gain(); env(gk, t, .001, .3, .07); noise(t, .09, filt("bandpass", 950, 1.3, gk));
        var gc = gain(); env(gc, t, .0008, .18, .018); noise(t, .025, filt("highpass", 2800, .7, gc));
      },
      /* The shackle springing: a short metallic shing, then a tiny rattle
         as it settles. */
      spring: function (t) {
        var g = gain(); env(g, t, .004, .045, .35);
        osc("sine", 1320, t, .4, g).frequency.exponentialRampToValueAtTime(1980, t + .07);
        var g2 = gain(); env(g2, t, .004, .016, .2);
        osc("sine", 1320 * 2.756, t, .25, g2);
        var g3 = gain(); env(g3, t + .11, .001, .07, .02); noise(t + .11, .025, filt("bandpass", 3600, 2, g3));
      },
      /* Victory: a low whump, a quick A major arpeggio of soft bells, a
         chord that hangs on, and a hiss of sparkle. */
      flourish: function (t) {
        var gw = gain(); env(gw, t, .004, .26, .3);
        osc("sine", 120, t, .35, gw).frequency.exponentialRampToValueAtTime(48, t + .25);
        var arp = [440, 554.37, 659.26, 880, 1108.73];
        arp.forEach(function (f, k) {
          var s = t + .02 + k * .06, d = k === arp.length - 1 ? 1.3 : .7;
          var g = gain(); env(g, s, .005, .08, d); osc("triangle", f, s, d + .05, filt("lowpass", 3500, .5, g));
          var g2 = gain(); env(g2, s, .005, .018, d * .7); osc("sine", f * 2, s, d, g2);
        });
        [440, 659.26, 880, 1108.73].forEach(function (f) {
          [-5, 5].forEach(function (c) {
            var g = gain(); env(g, t + .3, .12, .012, 1.6); osc("sine", f, t + .3, 1.8, g, c);
          });
        });
        var ga = gain(); env(ga, t + .05, .02, .03, .9); noise(t + .05, 1, filt("highpass", 7000, .5, ga));
      },
      /* A few far-off twinkles while the pose is held. */
      twinkles: function (t) {
        [2637.02, 3520, 2217.46, 2959.96].forEach(function (f, k) {
          var g = gain(); env(g, t + k * .14, .003, .012, .25); osc("sine", f, t + k * .14, .3, g);
        });
      },
      /* Away: a short rush up and out. */
      soar: function (t) { rush(t, .75, 330, 990, .16); },
      /* Reduced motion's chime: a soft bell. */
      bell: function (t, f) {
        var g = gain(); env(g, t, .004, .07, .9); osc("sine", f, t, .95, g);
        var g2 = gain(); env(g2, t, .003, .02, .5); osc("sine", f * 2, t, .55, g2);
        var g3 = gain(); env(g3, t, .002, .01, .3); osc("sine", f * 2.756, t, .35, g3);
      },
      /* Silence this schedule at once (a skip starts a new one). */
      hush: function () {
        try { out.gain.cancelScheduledValues(ac.currentTime); out.gain.setTargetAtTime(0, ac.currentTime, .015); } catch (e) { /* fine */ }
        setTimeout(function () { try { out.disconnect(); comp.disconnect(); } catch (e) { /* fine */ } }, 250);
      },
      /* Let the graph go once everything has rung out. */
      release: function () {
        setTimeout(function () { try { out.disconnect(); comp.disconnect(); } catch (e) { /* fine */ } }, 8000);
      }
    };
    return api;
  }
})();
