/* ============================================================================
   The not-found scene — "That one's out."

   The Book FX player (black #111, the same joints, racket and optic-yellow
   ball) stands on a baseline that runs the width of the screen. A ball comes
   in, bounces, and he winds up and swings hard: a big whiff. The ball skips
   on past him, bounces twice more and rolls off the edge of the screen; he
   does a double take, turns to watch it go, then faces us and shrugs, and
   his shoulders drop. About 3.5 s, once on load, silent (browsers hold sound
   until a gesture).

   The whole court is a <button>. Each press replays it with sound: the
   second try he swings late at a ball that's already gone, the third is a
   clean hit, a spark and a winner off the far edge, and a little fist pump.
   Then the count starts again.

   The body is eleven joints like Book FX, but posed by angles (spine, head,
   each arm bone) on fixed bone lengths, with the legs solved from hip to
   foot, so limbs swing in arcs and never stretch, and planted feet stay put.
   Sound is synthesized (Web Audio), goes through one gain of 0.5 and a
   compressor, and obeys the site's one mute (askIsaacSound = "off").
   Reduced motion: still poses only; a press swaps the picture and plays a
   single short cue. The Persian page mirrors the whole scene.
   ========================================================================== */

(function () {
  "use strict";

  var btn = document.querySelector(".nf-scene");
  var cv = btn && btn.querySelector("canvas");
  var label = btn && btn.querySelector(".nf-retry");
  var column = document.querySelector(".nf-text");
  var live = document.querySelector(".nf-live");
  var ctx = cv && cv.getContext && cv.getContext("2d");
  if (!ctx || !window.requestAnimationFrame) return;
  btn.hidden = false;

  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function still() { return !!(mq && mq.matches); }
  var rtl = document.documentElement.dir === "rtl";

  var INK = "#111111", BALL = "#d9ef3f", AMBER = "#f5b700";
  var RAD = Math.PI / 180, TAU = Math.PI * 2;
  /* Bone lengths in figure units (Book FX scale: about 85 tall). */
  var SPINE = 26, NECK = 10.5, UPPER = 13, FORE = 13.5, LEG = 18.5, R = 5.4, LW = 3.1, HEAD = 7.2;

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, u) { return a + (b - a) * u; }
  var E = {
    io: function (u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
    sine: function (u) { return -(Math.cos(Math.PI * u) - 1) / 2; },
    out: function (u) { return 1 - Math.pow(1 - u, 3); },
    out2: function (u) { return 1 - (1 - u) * (1 - u); },
    in2: function (u) { return u * u; },
    lin: function (u) { return u; },
    in3: function (u) { return u * u * u; },
    back: function (u) { var c = 1.6; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
    soft: function (u) { var c = .8; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }
  };

  /* ------------------------------------------------------------ Poses --
     x forward (toward the incoming ball), y down, feet on y = 0. Angles in
     degrees: 0 points forward, 90 down, -90 up. sp = spine (hip to neck),
     hd = neck to head, ra/la = [upper arm, forearm] of the racket arm and
     the free arm, rf/lf = front and back foot, k = which way the knees
     bend (1 forward, -1 back, 0 toward us), sw = shoulder half-width (0 in
     profile), sh = shoulders raised, hl = head distance (bowed < 1),
     r = racket angle. */
  function P(o) {
    return {
      hip: o.hip, sp: o.sp, hd: o.hd, ra: o.ra, la: o.la, lf: o.lf, rf: o.rf, r: o.r,
      k: o.k == null ? 1 : o.k, sw: o.sw || 0, sh: o.sh || 0, hl: o.hl || 1
    };
  }
  var READY = P({ hip: [0, -33], sp: -80, hd: -70, ra: [72, 8], la: [66, -10], lf: [-13, 0], rf: [13, 0], r: -38 });
  var SPLIT_UP = P({ hip: [0, -39], sp: -83, hd: -72, ra: [68, 2], la: [62, -14], lf: [-12, -6], rf: [12, -6], r: -34 });
  var SPLIT_LAND = P({ hip: [0, -30], sp: -77, hd: -67, ra: [74, 10], la: [68, -8], lf: [-15, 0], rf: [15, 0], r: -40 });
  var TURN = P({ hip: [-2, -33], sp: -92, hd: -66, ra: [160, -150], la: [-8, -14], lf: [-16, 0], rf: [12, 0], r: -100 });
  var LOOP = P({ hip: [-3, -29], sp: -86, hd: -62, ra: [150, 164], la: [12, 30], lf: [-16, 0], rf: [13, 0], r: 148 });
  var DRIVE = P({ hip: [0, -30], sp: -82, hd: -60, ra: [96, 28], la: [60, 100], lf: [-15, 0], rf: [13, 0], r: 140 });
  var CONTACT = P({ hip: [1, -31], sp: -80, hd: -58, ra: [68, 4], la: [110, 150], lf: [-15, -1], rf: [13, 0], r: 2 });
  var FINISH_BIG = P({ hip: [5, -33], sp: -76, hd: -72, ra: [-74, -168], la: [118, 150], lf: [-12, -5], rf: [14, 0], r: -150 });
  var STAGGER = P({ hip: [10, -32], sp: -68, hd: -48, ra: [-100, -178], la: [200, 190], lf: [2, -8], rf: [15, 0], r: -170 });
  var LOOKBACK = P({ hip: [8, -34], sp: -92, hd: -128, ra: [96, 70], la: [100, 80], lf: [-4, 0], rf: [16, 0], r: 66, sh: 1 });
  var WATCH = P({ hip: [6, -34], sp: -108, hd: -150, ra: [102, 106], la: [92, 100], lf: [-9, 0], rf: [14, 0], r: 100, k: -1 });
  var WATCH2 = P({ hip: [3, -32], sp: -115, hd: -160, ra: [106, 110], la: [168, 178], lf: [-15, 0], rf: [12, 0], r: 104, k: -1 });
  var FRONT = P({ hip: [0, -36], sp: -90, hd: -90, ra: [100, 94], la: [80, 86], lf: [-8, 0], rf: [8, 0], r: 94, k: 0, sw: 4.5 });
  var SHRUG = P({ hip: [0, -36.5], sp: -90, hd: -96, ra: [128, 212], la: [52, -32], lf: [-7, 0], rf: [7, 0], r: 102, k: 0, sw: 4.5, sh: 4.5, hl: .9 });
  var SHRUG2 = P({ hip: [0, -36.5], sp: -90, hd: -100, ra: [126, 207], la: [54, -27], lf: [-7, 0], rf: [7, 0], r: 104, k: 0, sw: 4.5, sh: 5, hl: .88 });
  var SLUMP = P({ hip: [0, -33], sp: -88, hd: -76, ra: [99, 95], la: [81, 85], lf: [-8, 0], rf: [8, 0], r: 112, k: 0, sw: 4.5, sh: -4.5, hl: .66 });
  var FINISH = P({ hip: [4, -33], sp: -80, hd: -74, ra: [-70, -164], la: [104, 140], lf: [-12, -4], rf: [14, 0], r: -146 });
  var FINISH_HOLD = P({ hip: [4, -34], sp: -82, hd: -70, ra: [-64, -160], la: [100, 136], lf: [-12, -3], rf: [14, 0], r: -140 });
  var CHEER = P({ hip: [3, -41], sp: -88, hd: -86, ra: [-48, -70], la: [72, -58], lf: [-9, -7], rf: [13, -6], r: -76 });
  var CHEER_LAND = P({ hip: [3, -31], sp: -82, hd: -78, ra: [-40, -64], la: [64, -48], lf: [-12, 0], rf: [14, 0], r: -70 });
  var SETTLE = P({ hip: [1, -35], sp: -86, hd: -78, ra: [78, 20], la: [92, 88], lf: [-12, 0], rf: [12, 0], r: -56 });

  function angMix(a, b, u) { var d = (((b - a) % 360) + 540) % 360 - 180; return a + d * u; }
  function ptMix(a, b, u) { return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]; }
  function mix(a, b, u) {
    return {
      hip: ptMix(a.hip, b.hip, u), lf: ptMix(a.lf, b.lf, u), rf: ptMix(a.rf, b.rf, u),
      sp: angMix(a.sp, b.sp, u), hd: angMix(a.hd, b.hd, u), r: angMix(a.r, b.r, u),
      ra: [angMix(a.ra[0], b.ra[0], u), angMix(a.ra[1], b.ra[1], u)],
      la: [angMix(a.la[0], b.la[0], u), angMix(a.la[1], b.la[1], u)],
      k: lerp(a.k, b.k, u), sw: lerp(a.sw, b.sw, u), sh: lerp(a.sh, b.sh, u), hl: lerp(a.hl, b.hl, u)
    };
  }
  function poseAt(keys, t) {
    if (t <= keys[0].t) return keys[0].p;
    for (var i = 1; i < keys.length; i++) {
      if (t < keys[i].t) {
        var a = keys[i - 1], b = keys[i];
        return mix(a.p, b.p, (b.e || E.io)(clamp((t - a.t) / (b.t - a.t), 0, 1)));
      }
    }
    return keys[keys.length - 1].p;
  }

  /* Joints from a pose: bones out from the hip by angle; each knee solved
     from hip and foot, bending the way k says (0 = toward us, so the leg
     reads shorter, as it would). */
  function from(o, deg, len) { return [o[0] + Math.cos(deg * RAD) * len, o[1] + Math.sin(deg * RAD) * len]; }
  function knee(h, f, k) {
    var dx = f[0] - h[0], dy = f[1] - h[1], d = Math.sqrt(dx * dx + dy * dy) || 1;
    var a = d / 2, hh = d >= 2 * LEG ? 0 : Math.sqrt(LEG * LEG - a * a);
    var vx = dx / d, vy = dy / d;
    return [h[0] + vx * a + vy * hh * k, h[1] + vy * a - vx * hh * k];
  }
  function fk(p) {
    var neck = from(p.hip, p.sp, SPINE);
    var px = -Math.sin(p.sp * RAD), py = Math.cos(p.sp * RAD);
    var sR = [neck[0] - px * p.sw, neck[1] - py * p.sw - p.sh];
    var sL = [neck[0] + px * p.sw, neck[1] + py * p.sw - p.sh];
    var rE = from(sR, p.ra[0], UPPER), lE = from(sL, p.la[0], UPPER);
    return {
      hip: p.hip, neck: neck, head: from(neck, p.hd, NECK * p.hl), sR: sR, sL: sL,
      rE: rE, rH: from(rE, p.ra[1], FORE), lE: lE, lH: from(lE, p.la[1], FORE),
      lK: knee(p.hip, p.lf, p.k), rK: knee(p.hip, p.rf, p.k), lf: p.lf, rf: p.rf, r: p.r
    };
  }
  function strings(j) { return from(j.rH, j.r, 22); }

  /* ----------------------------------------------------------- Layout -- */
  var W = 0, H = 0, dpr = 1, S = 1, GY = 0, PX = 0, Lu = 0, Ru = 0;
  function layout() {
    W = btn.clientWidth; H = btn.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(W * dpr));
    cv.height = Math.max(1, Math.round(H * dpr));
    GY = H - 54;                                         // the baseline; the label sits under it
    S = clamp(Math.min(W / 290, (GY - 20) / 130), 1, 2.1);
    /* Inside the text column on a wide screen, about a third of the way
       in, over the headline; mid-court on a phone. Measured from the
       inline start, so the Persian page (drawn mirrored) matches. */
    var c0 = 20, cw = W - 40;
    if (column) {
      var cr = column.getBoundingClientRect(), cs = getComputedStyle(column);
      var pad = parseFloat(cs.paddingLeft) || 0;
      c0 = (rtl ? W - cr.right : cr.left) + pad;
      cw = column.clientWidth - 2 * pad;
    }
    PX = Math.round(lerp(W * .5, c0 + cw * .3, clamp((W - 480) / 720, 0, 1)));
    Lu = PX / S; Ru = (W - PX) / S;
    /* The caption, "Try again", sits under his feet, kept on screen. */
    if (label) {
      var half = label.offsetWidth / 2 + 12;
      btn.style.setProperty("--nf-x", Math.round(clamp(PX, half, W - half)) + "px");
    }
  }

  /* ------------------------------------------------------------ A play --
     Builds one try: the player's keyframes, the ball's flight as a list of
     segments, the bounces (for the squash) and the sound cues. Times in
     seconds from the start of the try. o.from = the pose to turn back from
     (a replay), o.late = swing after the ball has gone. */
  function hopSeg(a, b, x0, x1, h) {
    return { a: a, b: b, f: function (t) { var u = (t - a) / (b - a); return [lerp(x0, x1, u), 4 * h * u * (1 - u)]; } };
  }

  function build(kind, o) {
    var rs = o.from ? .42 : 0;
    var C = strings(fk(CONTACT));                      // the ball's centre at contact
    var hc = -C[1] - R;                                // its bottom's height there
    var t1 = rs + .98, B1 = 108;                       // first bounce: when, and how far in front
    var edgeR = Ru + R + 8, edgeL = -(Lu + R + 4);
    var span = edgeR - B1;
    var Tin = clamp(span / 900, .3, .6);
    var hE = clamp(62 + span * .05, 60, 92);
    var bump = clamp((span - 160) * .07, 0, 26);       // a wide screen sees it rise over the net first
    var segs = [{ a: t1 - Tin, b: t1, f: function (t) {
      var u = (t - (t1 - Tin)) / Tin;
      return [lerp(edgeR, B1, u), hE * (1 - u * u) + bump * 4 * u * (1 - u)];
    } }];
    var bounces = [{ t: t1, s: .3 }];
    var events = [{ t: t1, k: "pok", v: 1 }];
    var x2 = -Math.min(115, Lu * .62), D2 = .46;
    var uz = (B1 - C[0]) / (B1 - x2);
    var h2 = hc / (4 * uz * (1 - uz));                 // the hop passes exactly through the strings
    var g = 8 * h2 / (D2 * D2);
    var tZone = t1 + uz * D2;
    var keys = o.from ? [{ t: 0, p: o.from }, { t: rs, p: READY, e: E.io }] : [{ t: 0, p: READY }];
    function key(t, p, e) { keys.push({ t: t, p: p, e: e }); }
    key(rs + .12, SPLIT_UP, E.out);
    key(rs + .27, SPLIT_LAND, E.in2);
    var fx = null, Z, end;

    if (kind === "win") {
      Z = tZone;
      segs.push(hopSeg(t1, t1 + D2, B1, x2, h2)); segs[1].b = tZone;
      /* Off the strings: flat and fast toward the far side, bouncing in if
         the screen is wide enough to see it land. */
      var vx = 1150, vy = 130, gw = 760, x = C[0], h = hc, t = tZone;
      for (var n = 0; n < 4 && x < edgeR + 40; n++) {
        var tb = (vy + Math.sqrt(vy * vy + 2 * gw * h)) / gw;
        segs.push((function (t0, x0, h0, vx0, vy0, dur) {
          return { a: t0, b: t0 + dur, f: function (tt) { var s = tt - t0; return [x0 + vx0 * s, h0 + vy0 * s - gw * s * s / 2]; } };
        })(t, x, h, vx, vy, tb));
        x += vx * tb; t += tb; h = 0;
        if (x < edgeR) { bounces.push({ t: t, s: .2 }); events.push({ t: t, k: "pok", v: .55 }); }
        vy = (gw * tb - vy) * .58; vx *= .86;
      }
      key(Z - .58, TURN, E.io);
      key(Z - .3, LOOP, E.io);
      key(Z - .1, DRIVE, E.in2);
      key(Z, CONTACT, E.lin);
      key(Z + .16, FINISH, E.out);
      key(Z + .42, FINISH_HOLD, E.sine);
      key(Z + .64, CHEER, E.back);
      key(Z + .86, CHEER_LAND, E.io);
      key(Z + 1.3, SETTLE, E.io);
      end = Z + 1.3;
      events.push({ t: Z - .1, k: "swish", v: 0 }, { t: Z, k: "thwock", v: 1 }, { t: Z + .62, k: "cheer", v: 1 });
      fx = { t: Z, at: C, streaks: [], fuzz: [] };
      for (var si = 0; si < 11; si++) {
        var a = (si / 11) * TAU + (Math.random() - .5) * .35;
        fx.streaks.push({ a: a, len: (.7 + Math.random() * .6) * (Math.cos(a) > .2 ? 1.35 : 1) });
      }
      for (var fi = 0; fi < 9; fi++) {
        fx.fuzz.push({ a: (TAU * fi) / 9 + Math.random() * .5, d: 18 + Math.random() * 26, s: .6 + Math.random() * .8, dur: .36 + Math.random() * .16, white: fi % 3 === 2 });
      }
    } else {
      Z = tZone + (o.late ? .12 : -.1);
      segs.push(hopSeg(t1, t1 + D2, B1, x2, h2));
      /* Past him: two smaller bounces, slowing hard, then a roll that is
         still going when it reaches the edge. */
      var v = (B1 - x2) / D2 * .5, xx = x2, tt = t1 + D2, D = .3;
      var bs = [.22, .1], vs = [.7, .4];
      for (var b = 0; b < 2; b++) {
        if (xx > edgeL) { bounces.push({ t: tt, s: bs[b] }); events.push({ t: tt, k: "pok", v: vs[b] }); }
        segs.push(hopSeg(tt, tt + D, xx, xx - v * D, g * D * D / 8));
        xx -= v * D; tt += D; v *= .55; D = .17;
      }
      if (xx > edgeL) { bounces.push({ t: tt, s: .05 }); events.push({ t: tt, k: "pok", v: .22 }); }
      v *= 1.6;                                        // the last hop's speed, rolling on
      var need = Math.max(0, xx - edgeL);
      var dec = Math.min(70, v * v / (2 * Math.max(need, 1)) * .55);
      segs.push((function (t0, x0, v0, a0) {
        return { a: t0, b: t0 + 3, f: function (q) { var s = q - t0; var ss = Math.min(s, v0 / a0); return [x0 - v0 * ss + a0 * ss * ss / 2, 0]; } };
      })(tt, xx, v, dec));
      var tPass = firstTime(segs, function (p) { return p[0] < -14; }, t1);
      var tExit = firstTime(segs, function (p) { return p[0] < edgeL; }, t1);
      key(Z - .58, TURN, E.io);
      key(Z - .3, LOOP, E.io);
      key(Z - .1, DRIVE, E.in2);
      key(Z, CONTACT, E.lin);
      key(Z + .13, FINISH_BIG, E.out);
      key(Z + .32, STAGGER, E.io);
      var tL = Math.max(Z + .5, tPass + .1);
      key(tL, LOOKBACK, E.back);
      key(tL + .34, WATCH, E.io);
      var tW = Math.max(tL + .66, tExit + .05);
      key(tW, WATCH2, E.io);
      key(tW + .3, FRONT, E.io);
      key(tW + .52, SHRUG, E.back);
      key(tW + .72, SHRUG2, E.sine);
      key(tW + 1.2, SLUMP, E.soft);
      end = tW + 1.2;
      events.push({ t: Z - .1, k: "swish", v: 1 }, { t: tW + .5, k: "womp", v: 1 });
    }
    /* What a replay tells a screen reader, once the result is clear. */
    var say = !o.from ? null : kind === "win" ? { t: Z + .12, k: "winner" } : { t: Z + .35, k: o.late ? "late" : "missed" };
    return { kind: kind, o: o, keys: keys, sw: [Z - .22, Z + .3], say: say, said: false, segs: segs, bounces: bounces, events: events, fx: fx, dur: end, t: 0 };
  }

  function segAt(segs, t) {
    if (t < segs[0].a) return null;
    for (var i = 0; i < segs.length; i++) if (t < segs[i].b) return segs[i].f(t);
    var l = segs[segs.length - 1]; return l.f(l.b);
  }
  function firstTime(segs, test, t0) {
    for (var t = t0; t < t0 + 4; t += .01) { var p = segAt(segs, t); if (p && test(p)) return t; }
    return t0 + 4;
  }
  function ballAt(an, t) {
    var p = segAt(an.segs, t);
    if (!p || p[0] > Ru + R + 12 || p[0] < -(Lu + R + 6)) return null;
    var q = 0;
    an.bounces.forEach(function (b) { var d = Math.abs(t - b.t); if (d < .05) q = Math.max(q, b.s * (1 - d / .05)); });
    return { x: p[0], h: Math.max(0, p[1]), ang: p[0] / R, q: q, a: 1 };
  }

  /* ---------------------------------------------------------- Drawing -- */
  function paint(p, balls, an, t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (rtl) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = INK;
    ctx.fillRect(0, GY, W, 2);                         // the baseline, edge to edge
    ctx.translate(PX, GY + .5);
    ctx.scale(S, S);
    var j = fk(p);

    /* Shadows: soft, on the line, shrinking as he or the ball leaves it. */
    var lift = Math.max(0, -Math.max(j.lf[1], j.rf[1]));
    shadow((j.lf[0] + j.rf[0]) / 2, 15 * Math.max(.5, 1 - lift / 30), .13);
    balls.forEach(function (b) { if (b.h < 70) shadow(b.x, R * 1.25 * (1 - b.h / 140), .12 * (1 - b.h / 70) * b.a); });

    if (an) swoosh(an, t);
    figure(j);
    if (an && an.fx) spark(an.fx, t);
    balls.forEach(drawBall);
  }

  function shadow(x, rx, a) {
    ctx.save();
    ctx.globalAlpha = a; ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(x, .4, rx, 2.2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function figure(j) {
    var b = new Path2D();
    b.moveTo(j.neck[0], j.neck[1]); b.lineTo(j.hip[0], j.hip[1]);
    b.moveTo(j.sR[0], j.sR[1]); b.lineTo(j.neck[0], j.neck[1]); b.lineTo(j.sL[0], j.sL[1]);
    b.moveTo(j.lf[0], j.lf[1]); b.lineTo(j.lK[0], j.lK[1]); b.lineTo(j.hip[0], j.hip[1]);
    b.lineTo(j.rK[0], j.rK[1]); b.lineTo(j.rf[0], j.rf[1]);
    b.moveTo(j.sL[0], j.sL[1]); b.lineTo(j.lE[0], j.lE[1]); b.lineTo(j.lH[0], j.lH[1]);
    b.moveTo(j.sR[0], j.sR[1]); b.lineTo(j.rE[0], j.rE[1]); b.lineTo(j.rH[0], j.rH[1]);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    /* A thin white outline, like Book FX, so he reads over the baseline
       and the ball. */
    ctx.strokeStyle = "#fff"; ctx.lineWidth = LW + 2.6; ctx.stroke(b);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(j.head[0], j.head[1], HEAD + 1.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke(b);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(j.head[0], j.head[1], HEAD, 0, TAU); ctx.fill();
    racket(j.rH, j.r);
  }

  /* Book FX's racket, exactly: a handle, an open oval head with one cross
     of strings, and the same thin white outline. */
  function racket(h, deg) {
    ctx.save();
    ctx.translate(h[0], h[1]); ctx.rotate(deg * RAD);
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 5.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(13, 0); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(22, 0, 9.5, 6.6, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(13, 0); ctx.stroke();
    ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(22, 0, 9.5, 6.6, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha *= .55; ctx.lineCap = "butt"; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(29, 0); ctx.moveTo(22, -5); ctx.lineTo(22, 5); ctx.stroke();
    ctx.restore();
  }

  /* The swing's smear: the band the racket head swept over the last few
     hundredths of a second, sampled from the keyframes (not from earlier
     frames, so it looks the same at any frame rate). Only when it's fast. */
  function swoosh(an, t) {
    if (t < an.sw[0] || t > an.sw[1]) return;
    var pts = [], len = 0;
    for (var k = 0; k < 9; k++) {
      var j = fk(poseAt(an.keys, t - k * .012));
      pts.push([from(j.rH, j.r, 13), from(j.rH, j.r, 31.5)]);
      if (k) len += Math.hypot(pts[k][1][0] - pts[k - 1][1][0], pts[k][1][1] - pts[k - 1][1][1]);
    }
    var s = clamp((len - 26) / 50, 0, 1);
    if (s <= 0) return;
    ctx.save();
    ctx.fillStyle = INK;
    for (var i = 1; i < pts.length; i++) {
      ctx.globalAlpha = .1 * s * (1 - (i - 1) / (pts.length - 1));
      var a = pts[i - 1], b = pts[i];
      ctx.beginPath();
      ctx.moveTo(a[0][0], a[0][1]); ctx.lineTo(a[1][0], a[1][1]);
      ctx.lineTo(b[1][0], b[1][1]); ctx.lineTo(b[0][0], b[0][1]);
      ctx.closePath(); ctx.fill();
    }
    /* and a hairline along the tip */
    ctx.globalAlpha = .45 * s; ctx.strokeStyle = INK; ctx.lineWidth = .8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(pts[0][1][0], pts[0][1][1]);
    for (var m = 1; m < pts.length; m++) ctx.lineTo(pts[m][1][0], pts[m][1][1]);
    ctx.stroke();
    ctx.restore();
  }

  /* The optic-yellow ball, shaded like the one in the hero headline, its
     seams turning as it travels. q = squash on a bounce. */
  var SEAM = (function () {
    var k = R / 11.4, p = new Path2D();
    p.moveTo(-9 * k, -5.8 * k); p.bezierCurveTo(-5.1 * k, -3.4 * k, -5.1 * k, 3.4 * k, -9 * k, 5.8 * k);
    p.moveTo(9 * k, -5.8 * k); p.bezierCurveTo(5.1 * k, -3.4 * k, 5.1 * k, 3.4 * k, 9 * k, 5.8 * k);
    return p;
  })();
  function drawBall(b) {
    if (!b || b.a <= 0) return;
    var q = b.q || 0;
    ctx.save();
    ctx.globalAlpha = b.a;
    ctx.translate(b.x, -(b.h + R * (1 - q)));
    ctx.scale(1 + q, 1 - q);
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU);
    ctx.fillStyle = BALL; ctx.fill();
    var g = ctx.createRadialGradient(-R * .3, -R * .4, 0, 0, 0, R * 1.05);
    g.addColorStop(0, "rgba(255,255,255,.5)"); g.addColorStop(.55, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(93,106,0,.4)");
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip(); ctx.rotate(b.ang);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5 * R / 11.4; ctx.lineCap = "round"; ctx.stroke(SEAM);
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = .3; ctx.stroke();
    ctx.restore();
  }

  /* Book FX's contact spark: a white flash ringed in amber, eleven amber
     streaks with pale cores, longer the way the ball goes, and a puff of
     felt fuzz. */
  function spark(fx, t) {
    var c = fx.at, q = (t - fx.t) / .18;
    ctx.save();
    if (q >= 0 && q <= 1) {
      var e = 1 - Math.pow(1 - q, 3);
      ctx.globalAlpha = 1 - q * q;
      fx.streaks.forEach(function (s) {
        var r1 = (5 + 16 * e) * s.len, r2 = (10 + 30 * e) * s.len;
        var x1 = c[0] + Math.cos(s.a) * r1, y1 = c[1] + Math.sin(s.a) * r1;
        var x2 = c[0] + Math.cos(s.a) * r2, y2 = c[1] + Math.sin(s.a) * r2;
        ctx.lineCap = "round";
        ctx.strokeStyle = AMBER; ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = "#fffbe0"; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      ctx.globalAlpha = 1 - q;
      ctx.beginPath(); ctx.arc(c[0], c[1], 4 + 7 * e, 0, TAU);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.strokeStyle = AMBER; ctx.lineWidth = 2; ctx.stroke();
    }
    fx.fuzz.forEach(function (f) {
      var u = (t - fx.t) / f.dur;
      if (u < 0 || u > 1) return;
      var e2 = 1 - Math.pow(1 - u, 4);
      ctx.globalAlpha = 1 - u;
      ctx.beginPath();
      ctx.arc(c[0] + Math.cos(f.a) * f.d * e2, c[1] + Math.sin(f.a) * f.d * e2, 1.5 * f.s * (1 - u), 0, TAU);
      ctx.fillStyle = f.white ? "#fff" : BALL; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = .3; ctx.stroke();
    });
    ctx.restore();
  }

  /* ------------------------------------------------------------ Loop -- */
  var an = null, raf = 0, tries = 1, ghost = null, stillKind = "miss";

  function render(t) {
    an.t = t;
    var balls = [];
    var b = ballAt(an, t);
    if (b) {
      /* a short trail when it's quick, as Book FX's served ball has */
      var p1 = ballAt(an, t - .016);
      if (p1 && Math.abs(b.x - p1.x) + Math.abs(b.h - p1.h) > 9) {
        for (var i = 3; i >= 1; i--) {
          var g = ballAt(an, t - i * .014);
          if (g) { g.a = .36 - i * .1; g.q = 0; balls.push(g); }
        }
      }
      balls.push(b);
    }
    if (ghost) {
      var ga = 1 - (performance.now() - ghost.t0) / 220;
      if (ga > 0) { ghost.b.a = ga; balls.unshift(ghost.b); } else ghost = null;
    }
    paint(poseAt(an.keys, t), balls, an, t);
  }

  function frame(now) {
    raf = 0;
    if (!an) return;
    var t = Math.max(0, (now - an.start) / 1000);
    if (t > an.dur) t = an.dur;
    render(t);
    if (an.say && !an.said && t >= an.say.t) { an.said = true; announce(an.say.k); }
    if (t < an.dur || ghost) raf = requestAnimationFrame(frame);
  }

  function play(kind, o, sound, delay) {
    an = build(kind, o);
    an.start = performance.now() + (delay || 0);
    if (sound) score(an);
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /* A short line in the page's language after each replay, cleared a few
     seconds later so it isn't read again out of context. Emptied first,
     so the same line twice in a row is still announced. */
  var words = (window.NF && window.NF.t) || { missed: "Missed it. Try again.", late: "Too late. One more.", winner: "Winner!" };
  var liveTimer = 0;
  function announce(k) {
    if (!live) return;
    live.textContent = "";
    window.clearTimeout(liveTimer);
    window.setTimeout(function () {
      live.textContent = words[k] || "";
      liveTimer = window.setTimeout(function () { live.textContent = ""; }, 4000);
    }, 50);
  }

  /* Reduced motion: the end of each try as a still picture. */
  function drawStill(kind) {
    if (kind === "win") {
      var x = Ru - R - 14, h = 48, balls = [];
      for (var i = 3; i >= 1; i--) balls.push({ x: x - i * 15, h: h - i * 1.2, ang: 0, a: .36 - i * .1 });
      balls.push({ x: x, h: h, ang: .6, a: 1 });
      paint(CHEER_LAND, balls, null, 0);
    } else {
      paint(SLUMP, [{ x: -(Lu - R - 8), h: 0, ang: kind === "miss2" ? 2.1 : .8, a: 1 }], null, 0);
    }
  }

  btn.addEventListener("click", function () {
    tries++;
    var n = tries % 3, kind = n === 0 ? "win" : "miss";
    if (still()) {
      stillKind = n === 0 ? "win" : n === 2 ? "miss2" : "miss";
      drawStill(stillKind);
      cue(kind);
      announce(n === 0 ? "winner" : n === 2 ? "late" : "missed");
      return;
    }
    var p = READY;
    if (an) {
      var t = clamp(an.t, 0, an.dur);
      p = poseAt(an.keys, t);
      var b = t < an.dur ? ballAt(an, t) : null;
      if (b) ghost = { b: b, t0: performance.now() };
    }
    play(kind, { from: p, late: n === 2 }, true, 0);
  });

  function relayout() {
    layout();
    if (still() || !an) { drawStill(stillKind); return; }
    var next = build(an.kind, an.o);
    next.start = an.start;
    an = next;
    if (!raf) render(clamp((performance.now() - an.start) / 1000, 0, an.dur));
  }
  var pending = 0;
  window.addEventListener("resize", function () {
    if (pending) return;
    pending = requestAnimationFrame(function () { pending = 0; relayout(); });
  });
  if (mq) {
    var onChange = function () { relayout(); };
    if (mq.addEventListener) mq.addEventListener("change", onChange); else if (mq.addListener) mq.addListener(onChange);
  }

  /* ------------------------------------------------------------ Sound -- */
  var ac = null, out = null, nb = null, bus = null;
  function muted() { try { return localStorage.getItem("askIsaacSound") === "off"; } catch (e) { return false; } }
  function audio() {
    if (muted()) return null;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      if (!ac) {
        ac = new AC();
        out = ac.createGain(); out.gain.value = .5;
        var comp = ac.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5;
        comp.attack.value = .003; comp.release.value = .25;
        out.connect(comp); comp.connect(ac.destination);
        nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 1.5), ac.sampleRate);
        var d = nb.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return ac;
    } catch (e) { ac = null; return null; }
  }

  /* Every cue of a try is scheduled up front against the audio clock, on
     its own gain, so a press mid-try fades the old one out cleanly. */
  function newBus() {
    if (bus) {
      var old = bus;
      try { old.gain.setTargetAtTime(0, ac.currentTime, .015); } catch (e) {}
      window.setTimeout(function () { try { old.disconnect(); } catch (e) {} }, 400);
    }
    bus = ac.createGain(); bus.connect(out);
    return bus;
  }
  function score(a) {
    if (!audio()) return;
    var dest = newBus();
    var go = function () {
      var el = (performance.now() - a.start) / 1000;
      var base = ac.currentTime + .01 - el;
      a.events.forEach(function (e) {
        if (e.t >= el - .01) SFX[e.k](Math.max(ac.currentTime + .005, base + e.t), e.v, dest);
      });
    };
    if (ac.state === "suspended") ac.resume().then(go, function () {}); else go();
  }
  function cue(kind) {
    if (!audio()) return;
    var dest = newBus();
    var go = function () {
      var t = ac.currentTime + .02;
      if (kind === "win") { SFX.thwock(t, 1, dest); SFX.cheer(t + .25, 1, dest); }
      else SFX.womp(t, 1, dest);
    };
    if (ac.state === "suspended") ac.resume().then(go, function () {}); else go();
  }

  function gainAt(dest) { var g = ac.createGain(); g.gain.value = 0; g.connect(dest); return g; }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(.0001, t + a + d);
  }
  function noise(t, dur, dest) {
    var n = ac.createBufferSource(); n.buffer = nb; n.connect(dest);
    n.start(t, Math.random() * (1.45 - dur)); n.stop(t + dur + .02);
  }
  function filt(type, f, q, dest) {
    var b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q;
    if (dest) b.connect(dest);
    return b;
  }
  function tone(type, t, f0, f1, dur, vol, dest) {
    var o = ac.createOscillator(), g = gainAt(dest);
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur * .7);
    env(g, t, .005, vol, dur);
    o.connect(g); o.start(t); o.stop(t + dur + .05);
    return o;
  }

  var SFX = {
    /* The racket through the air: a breath of noise whose band sweeps up.
       The whiff is longer, louder, with a low whoom under it. */
    swish: function (t, big, dest) {
      var d = big ? .3 : .17;
      var g = gainAt(dest);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(big ? .3 : .2, t + d * .7);
      g.gain.exponentialRampToValueAtTime(.0001, t + d);
      var bp = filt("bandpass", big ? 380 : 500, big ? 1.1 : 1.4, g);
      bp.frequency.setValueAtTime(big ? 380 : 500, t);
      bp.frequency.exponentialRampToValueAtTime(big ? 2600 : 3200, t + d * .75);
      noise(t, d, bp);
      if (big) {
        var g2 = gainAt(dest);
        env(g2, t + .05, d * .55, .16, d * .5);
        noise(t + .05, d, filt("lowpass", 420, .7, g2));
      }
    },
    /* The ball on the court: a short falling knock over a tiny click. */
    pok: function (t, v, dest) {
      tone("sine", t, 360, 140, .08, .34 * v, dest);
      var g = gainAt(dest);
      env(g, t, .001, .16 * v, .014);
      noise(t, .02, filt("bandpass", 2300, .9, g));
    },
    /* A little deflated "wah-womp": two soft falling notes behind a
       closing filter, the second with a sag of vibrato. */
    womp: function (t, v, dest) {
      [[0, 247, 220, .2, .15], [.22, 208, 139, .6, .17]].forEach(function (n, i) {
        var s = t + n[0];
        var g = gainAt(dest);
        var lp = filt("lowpass", 1300, .8, g);
        lp.frequency.setValueAtTime(1300, s);
        lp.frequency.exponentialRampToValueAtTime(420, s + n[3]);
        g.gain.setValueAtTime(.0001, s);
        g.gain.exponentialRampToValueAtTime(n[4] * v, s + .03);
        g.gain.setValueAtTime(n[4] * v, s + n[3] * .55);
        g.gain.exponentialRampToValueAtTime(.0001, s + n[3]);
        ["triangle", "sawtooth"].forEach(function (type, k) {
          var o = ac.createOscillator(); o.type = type;
          o.frequency.setValueAtTime(n[1], s);
          o.frequency.exponentialRampToValueAtTime(n[2], s + n[3] * .9);
          var og = ac.createGain(); og.gain.value = k ? .28 : 1;
          o.connect(og); og.connect(lp);
          if (i === 1) {
            var lfo = ac.createOscillator(), lg = ac.createGain();
            lfo.frequency.value = 6; lg.gain.setValueAtTime(0, s); lg.gain.linearRampToValueAtTime(5, s + n[3] * .6);
            lfo.connect(lg); lg.connect(o.frequency); lfo.start(s); lfo.stop(s + n[3] + .05);
          }
          o.start(s); o.stop(s + n[3] + .05);
        });
      });
    },
    /* Book FX's hit: a bright burst for the strings, a knock for the frame,
       a quick falling tone for the ball leaving. */
    thwock: function (t, v, dest) {
      var g = gainAt(dest);
      env(g, t, .001, .36, .03);
      noise(t, .035, filt("bandpass", 1900, .9, g));
      tone("sine", t, 620, 170, .09, .3, dest);
      tone("sine", t, 140, 90, .07, .22, dest);
    },
    /* A tiny cheer: two voices gliding up together, a breath of crowd
       under them, and a bright tick on top. */
    cheer: function (t, v, dest) {
      tone("sine", t, 523, 1046, .42, .07, dest);
      var o = tone("triangle", t + .02, 784, 1568, .4, .035, dest);
      var lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = 7; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t + .15); lfo.stop(t + .5);
      var g = gainAt(dest);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.05, t + .22);
      g.gain.exponentialRampToValueAtTime(.0001, t + .62);
      noise(t, .62, filt("bandpass", 1300, .6, g));
      tone("sine", t + .3, 2093, 2093, .12, .03, dest);
    }
  };

  /* ------------------------------------------------------------ Start -- */
  layout();
  if (still()) { drawStill("miss"); return; }
  /* Plays once, a beat after the page appears (and not in a tab nobody is
     looking at). The first frame is him ready, no ball yet. */
  function begin() { play("miss", {}, false, 450); }
  if (document.hidden) {
    an = build("miss", {}); an.start = Infinity; render(0);
    document.addEventListener("visibilitychange", function once() {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", once);
      begin();
    });
  } else begin();
})();
