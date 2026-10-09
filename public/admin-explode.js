/* ============================================================================
   The admin gate's wrong-key scene: the padlock blows apart.

   admin-gate.js calls AdminFX.explode(scene) when the Worker says the key
   is wrong (the contract is at the top of admin-gate.js). Three beats.
   The promise settles at 1 s, mid-fall, so the gate can put "Wrong key.
   Sending you back…" over the scene while the scene plays on underneath;
   it ends by itself once everything has fallen out of frame or faded
   (about 2 s), then removes its canvas and stops asking for frames:

     1. Tension (0–170 ms). The padlock clenches: it squashes, the shackle
        slams down, cracks run out from the keyhole, it trembles, then
        swells. The field's border flashes.
     2. Detonation (170 ms). A white-hot flash, a crisp shockwave ring and
        a soft bloom, and the lock breaks along its own cracks into shards
        that tumble out with spin, drag and gravity. As the ring passes it
        throws the rest of the card: the title letter by letter, the
        eyebrow, the field, the button and the note. The screen shakes,
        smoke billows out and cools from white to grey, and sparks and a
        few amber embers trail away.
     3. Settle (to about 2 s). Debris falls out of frame, smoke thins,
        embers die, and the gate is left as empty ink.

   On a phone the field and the button are as wide as the screen, so they
   are thrown harder, start a little smaller and are gone in 0.4 s,
   clearing the middle for the gate's line.

   The canvas takes over the padlock on the first frame (same paths, same
   place), so the cracks and the break line up with what was on screen.
   Black and white like the site; the only colour is the Book FX spark's
   amber, on a few embers. Everything moves on closed-form paths (drag and
   gravity solved exactly), so a dropped frame skips ahead rather than
   slowing the blast down.

   Sound is synthesized with Web Audio like Book FX, through one
   compressor and a master gain so it never clips: a clack as it clenches
   and a breath in as it swells; then the boom (a crack, noise through a
   lowpass falling from 3.8 kHz to 150 Hz, a sine thump falling 92 → 34 Hz
   with a little drive so small speakers hear it, a rumble, a short room);
   then debris crackle and a few glassy tinkles, spread left and right.

   Reduced motion: no debris and no shake. One soft flash while the card
   fades, the same sound, and done in 0.7 s.
   ========================================================================== */

(function () {
  "use strict";

  var FX = window.AdminFX = window.AdminFX || {};

  var AMBER = "245, 183, 0";      // the Book FX spark (#f5b700), the one colour here
  var INK = "#0d0d0d";
  var T0 = 170;                    // ms from the call to the detonation
  var END = 1000;                  // ms: the promise resolves (the scene plays on)
  var SOFT_END = 700;              // the same, with reduced motion
  var SNAP = 4;                    // lock units the shackle slams down
  var SWELL = 1.1;                 // how far the lock swells before it goes

  /* The padlock as drawn in admin/index.html (viewBox 0 0 64 84). */
  var LOCK = {
    shackle: "M18 38V24a14 14 0 0 1 28 0v14",
    body: "M14 36H50A7 7 0 0 1 57 43V73A7 7 0 0 1 50 80H14A7 7 0 0 1 7 73V43A7 7 0 0 1 14 36Z",
    hole: "M32 51a5 5 0 0 1 2.5 9.3V67h-5v-6.7A5 5 0 0 1 32 51z",
    cx: 32, cy: 58,                // the keyhole: where it goes off
    box: [5, 6, 59, 82]            // all it draws, shackle down included
  };

  FX.explode = function (scene) {
    return new Promise(function (resolve) {
      /* Resolving hands over to the gate; it doesn't stop the scene, which
         cleans up after itself when its last piece is gone. */
      var over = false;
      function done() {
        if (over) return;
        over = true;
        resolve();
      }
      var soft = !!scene.reduced || !canDraw();
      var ac = null;
      try { ac = scene.audio ? scene.audio() : null; } catch (e) { ac = null; }
      try { (soft ? fade : blast)(scene, done); } catch (e) {
        try { while (scene.layer.firstChild) scene.layer.removeChild(scene.layer.firstChild); } catch (e2) { /* fine */ }
        done();
      }
      /* Sound is scheduled once the first frame is up, so the boom lands
         on the flash even when setting up took a moment. */
      try { if (ac) sound(ac, soft ? .05 : T0 / 1000, !soft); } catch (e) { /* silent, then */ }
      setTimeout(done, (soft ? SOFT_END : END) + 900);     // a hidden tab gets no frames
    });
  };

  function canDraw() {
    try {
      return !!(window.requestAnimationFrame && window.Path2D &&
        document.createElement("canvas").getContext("2d"));
    } catch (e) { return false; }
  }

  /* --------------------------------------------------- Reduced motion -- */
  function fade(scene, done) {
    var card = scene.card;
    var flash = document.createElement("div");
    flash.style.cssText = "position:absolute;left:0;top:0;right:0;bottom:0;background:#fff;opacity:0;";
    scene.layer.appendChild(flash);
    card.style.transition = "opacity .3s ease";
    setTimeout(function () {
      card.style.opacity = "0";
      if (flash.animate) {
        flash.animate([{ opacity: 0 }, { opacity: .2, offset: .12 }, { opacity: 0 }],
          { duration: 560, easing: "ease-out", fill: "forwards" })
          .onfinish = function () { if (flash.parentNode) flash.parentNode.removeChild(flash); };
      } else if (flash.parentNode) {
        flash.parentNode.removeChild(flash);
      }
    }, 50);
    setTimeout(done, SOFT_END);
  }

  /* ------------------------------------------------------------ Blast -- */
  function blast(scene, done) {
    var card = scene.card, lock = scene.lock, layer = scene.layer;
    var box = layer.getBoundingClientRect();
    var W = box.width || window.innerWidth, H = box.height || window.innerHeight;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var S = (W + H) / 2;                                  // speeds scale with the screen
    var G = H * 2.3;                                      // gravity, px/s²
    var LW = Math.max(.75, Math.min(1.3, S / 1000));      // line weights
    var SHAKE = Math.max(6, Math.min(14, S * .012));
    var RMAX = Math.sqrt(W * W + H * H) * .62;            // the shockwave's reach
    var PHONE = W < 500;                                  // the field and button span the screen

    var cv = document.createElement("canvas");
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.cssText = "position:absolute;left:0;top:0;width:" + W + "px;height:" + H + "px;";
    var g = cv.getContext("2d");
    layer.appendChild(cv);

    var lr = lock.getBoundingClientRect();
    var k = lr.width ? lr.width / 64 : .875;              // px per lock unit
    var LX = lr.left - box.left, LY = lr.top - box.top;
    var CX = LX + LOCK.cx * k, CY = LY + LOCK.cy * k;     // ground zero
    var BX = LX + 32 * k, BY = LY + 80 * k;               // the lock's foot: it squashes onto it

    var paths = { shackle: new Path2D(LOCK.shackle), body: new Path2D(LOCK.body), hole: new Path2D(LOCK.hole) };
    function drawLock(x, snap) {
      x.save();
      x.translate(0, snap);
      x.lineWidth = 5; x.lineCap = "round"; x.strokeStyle = "#fff";
      x.stroke(paths.shackle);
      x.restore();
      x.fillStyle = "#fff";
      x.fill(paths.body);
      x.save();
      x.globalCompositeOperation = "destination-out";     // the keyhole is a hole
      x.fill(paths.hole);
      x.restore();
    }

    var F = fracture();
    var B = LOCK.box, bw = B[2] - B[0], bh = B[3] - B[1];

    /* The intact lock, redrawn each frame of the clench with its cracks. */
    var lres = k * dpr;
    var lockCv = document.createElement("canvas");
    lockCv.width = Math.ceil(bw * lres) + 2;
    lockCv.height = Math.ceil(bh * lres) + 2;
    var lx = lockCv.getContext("2d");

    /* ------------------------------------------- Pieces, made up front -- */
    var shards = makeShards();
    var HOT = [], SMOKE = [];
    [150, 135, 165].forEach(function (grey) {
      var pair = puff(["255,255,255", grey + "," + grey + "," + grey]);
      HOT.push(pair[0]); SMOKE.push(pair[1]);
    });
    var GLOW = glow("255,255,255"), EMBER = glow(AMBER);
    var i, a, sp;

    var chips = [];
    var SHADES = ["#ffffff", "#e6e6e6", "#c4c4c4", "#9a9a9a"];
    for (i = 0; i < 64; i++) {
      a = Math.random() * Math.PI * 2;
      sp = S * (.5 + Math.random() * 2.1);
      chips.push(mover(CX + Math.cos(a) * k * 10 * Math.random(), CY + Math.sin(a) * k * 10 * Math.random(),
        a, sp, S * (.1 + Math.random() * .35), 2.2 + Math.random() * .8, G * 1.4, {
          s: (1.3 + Math.random() * 3) * LW, asp: .4 + Math.random() * .8, tri: Math.random() < .5,
          col: SHADES[(Math.random() * SHADES.length) | 0],
          rot: Math.random() * 6, w: (Math.random() - .5) * 40, fw: 6 + Math.random() * 16,
          life: 1 + Math.random() * .6
        }));
    }

    var sparks = [];
    for (i = 0; i < 72; i++) {
      a = Math.random() * Math.PI * 2;
      sp = S * (1.3 + Math.random() * 2.5);
      sparks.push(mover(CX, CY, a, sp, S * .2 * Math.random(), 3.4 + Math.random() * 1.2, G * .35, {
        w: (.9 + Math.random() * 1.1) * LW, amber: i < 10, life: .22 + Math.random() * .4
      }));
    }

    var embers = [];
    for (i = 0; i < 16; i++) {
      a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.7;     // mostly up and out
      sp = S * (.35 + Math.random() * .85);
      embers.push(mover(CX, CY, a, sp, S * (.1 + Math.random() * .25), 1.5 + Math.random() * .6, G * .16, {
        r: (1 + Math.random() * .9) * LW, amber: i < 9, life: .9 + Math.random() * .6,
        ph: Math.random() * 9, sway: (Math.random() - .5) * 14 * LW
      }));
    }

    var smoke = [];
    for (i = 0; i < 36; i++) {
      var hot = i < 10;
      a = Math.random() * Math.PI * 2;
      var off = k * (hot ? 8 : 6 + 16 * Math.random()) * Math.random();
      sp = S * (hot ? .1 + Math.random() * .3 : .22 + Math.random() * .6);
      smoke.push(mover(CX + Math.cos(a) * off, CY + Math.sin(a) * off, a, sp, 0, 3.4 + Math.random(), -H * .08, {
        t: hot ? Math.random() * .02 : .01 + Math.random() * .1,
        r0: k * (hot ? 9 : 12), r1: S * (hot ? .05 + Math.random() * .045 : .06 + Math.random() * .07),
        peak: hot ? .9 : .2 + Math.random() * .2, cool: hot ? .12 + Math.random() * .12 : .05,
        life: hot ? .5 + Math.random() * .3 : .9 + Math.random() * .5,
        v: (Math.random() * 3) | 0, rot: Math.random() * 6, spin: (Math.random() - .5) * 1.6
      }));
    }

    /* ------------------------------------------------ The card's pieces -- */
    var input = card.querySelector(".gate-input");
    var pieces = null;

    function throwCard() {
      var list = [];
      var title = card.querySelector(".gate-title");
      var letters = title ? split(title) : [];
      if (document.activeElement && card.contains(document.activeElement)) document.activeElement.blur();
      var els = [[card.querySelector(".gate-eyebrow"), "mid"]];
      letters.forEach(function (el) { els.push([el, "letter"]); });
      els.push([input, "heavy"], [card.querySelector(".gate-go"), "heavy"], [card.querySelector(".gate-note"), "mid"]);
      els.forEach(function (pair) {
        var el = pair[0], kind = pair[1];
        if (!el) return;
        var r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var x = r.left - box.left + r.width / 2, y = r.top - box.top + r.height / 2;
        var dx = x - CX, dy = y - CY, d = Math.sqrt(dx * dx + dy * dy) || 1;
        var near = .55 + 1 / (1 + d / (S * .35));
        var ang = Math.atan2(dy, dx) + (Math.random() - .5) * .7;
        var heavy = kind === "heavy", quick = heavy && PHONE;
        var base = kind === "letter" ? 1 + Math.random() * .8 : heavy ? .42 + Math.random() * .25 : .6 + Math.random() * .4;
        var spin = kind === "letter" ? 5 + Math.random() * 9 : heavy ? 1.2 + Math.random() * 2.4 : 2.5 + Math.random() * 4;
        var axA = Math.random() * Math.PI * 2;
        /* On a phone the field and button go 1.5x harder with hardly any
           kick up, start at 0.8 scale, and are gone inside 0.4 s. */
        var p = mover(0, 0, ang, S * base * near * (quick ? 1.5 : 1),
          S * (quick ? .03 + Math.random() * .07 : .2 + Math.random() * .35), heavy ? 1.4 : 1.8, G * (heavy ? 1.6 : 1.15), {
          el: el, delay: shockAt(d), cx: x, cy: y, size: Math.max(r.width, r.height),
          spin: (Math.random() < .5 ? -1 : 1) * spin,
          tumble: (Math.random() < .5 ? -1 : 1) * spin * (.5 + Math.random() * .7),
          ax: Math.cos(axA).toFixed(3), ay: Math.sin(axA).toFixed(3),
          s0: quick ? .8 : 1,
          zs: kind === "letter" ? -.15 + Math.random() * .75 : quick ? -.15 + Math.random() * .1 : -.1 + Math.random() * .3,
          hold: kind === "letter" ? .6 : quick ? .22 : .42, fadeFor: quick ? .18 : .45
        });
        el.style.transition = "none";
        el.style.willChange = "transform, opacity";
        /* The gate hides the card when the promise settles, while these
           are still in the air: they stay visible on their own until they
           fade, and out of reach of focus and screen readers. */
        el.style.visibility = "visible";
        el.setAttribute("aria-hidden", "true");
        el.setAttribute("inert", "");
        list.push(p);
      });
      return list;
    }

    /* When the ring reaches a distance d (its radius eases out over .62 s). */
    function shockAt(d) {
      if (d >= RMAX) return .62;
      return .62 * (1 - Math.pow(1 - d / RMAX, 1 / 3));
    }

    /* ------------------------------------------------------------ Shards --
       The lock is cut along the fracture into cells; each cell with any
       lock in it becomes a sprite, drawn once, that tumbles about its own
       centre of mass. A darker band inside each cut reads as a broken
       edge catching less light. */
    function makeShards() {
      var res = k * dpr * 2.2;                     // room to grow as they fly at you
      var out = [], n = F.n, rings = F.p[0].length;
      for (var ii = 0; ii < n; ii++) {
        for (var j = 0; j < rings - 1; j++) {
          var p0 = F.p[ii][j], p1 = F.p[(ii + 1) % n][j], p2 = F.p[(ii + 1) % n][j + 1], p3 = F.p[ii][j + 1];
          var poly = j === 0 ? [p0, p2, p3] : [p0, p1, p2, p3];
          var xs = poly.map(function (q) { return q[0]; }), ys = poly.map(function (q) { return q[1]; });
          var x0 = Math.max(B[0], Math.min.apply(0, xs)), x1 = Math.min(B[2], Math.max.apply(0, xs));
          var y0 = Math.max(B[1], Math.min.apply(0, ys)), y1 = Math.min(B[3], Math.max.apply(0, ys));
          if (x1 - x0 < .5 || y1 - y0 < .5) continue;
          var cw = Math.ceil((x1 - x0) * res) + 2, ch = Math.ceil((y1 - y0) * res) + 2;
          var c = document.createElement("canvas");
          c.width = cw; c.height = ch;
          var x = c.getContext("2d", { willReadFrequently: true });
          x.setTransform(res, 0, 0, res, 1 - x0 * res, 1 - y0 * res);
          x.beginPath();
          poly.forEach(function (q, m) { if (m) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); });
          x.closePath();
          x.save();
          x.clip();
          drawLock(x, SNAP);
          x.globalCompositeOperation = "source-atop";
          x.strokeStyle = "rgba(13,13,13,.42)";
          x.lineWidth = 2.6;
          x.stroke();
          x.restore();
          var data = x.getImageData(0, 0, cw, ch).data, sx = 0, sy = 0, m = 0;
          for (var yy = 0; yy < ch; yy++) {
            for (var xx = 0; xx < cw; xx++) {
              if (data[(yy * cw + xx) * 4 + 3] > 110) { sx += xx; sy += yy; m++; }
            }
          }
          if (m < res * res * 1.6) continue;       // a sliver, or nothing at all
          var px = sx / m, py = sy / m;
          var hx = x0 + (px - 1) / res, hy = y0 + (py - 1) / res;      // lock units
          var homeX = BX + (LX + hx * k - BX) * SWELL, homeY = BY + (LY + hy * k - BY) * SWELL;
          var dx = homeX - CX, dy = homeY - CY;
          var ang = Math.atan2(dy, dx) + (Math.random() - .5) * .5;
          var speed = S * [1.9, 1.5, 1.2, .95][Math.min(3, j)] * (.75 + Math.random() * .5);
          out.push(mover(homeX, homeY, ang, speed, S * (.1 + Math.random() * .3), 1.8 + Math.random() * .5, G * 1.35, {
            img: c, w: cw / res * k, h: ch / res * k, ox: -px / res * k, oy: -py / res * k,
            spin: (Math.random() < .5 ? -1 : 1) * (7 + Math.random() * 15),
            fw: (Math.random() < .5 ? -1 : 1) * (4 + Math.random() * 11),
            zs: -.25 + Math.random() * 1.9,
            life: 1.3 + Math.random() * .4
          }));
        }
      }
      return out;
    }

    /* --------------------------------------------------------- Run it -- */
    lock.style.visibility = "hidden";                   // the canvas has it now
    card.style.transition = "none";
    if (input) input.style.transition = "none";
    var start = performance.now(), still = false;
    var P = [0, 0], Q = [0, 0];

    /* Each frame counts what is still on screen; when nothing is, the
       scene takes its canvas away and stops (4 s at most, regardless). */
    function loop(now) {
      var t = Math.max(0, now - start);
      if (t >= END) done();                              // the gate takes over; this plays on
      var live = render(t);
      if ((t > T0 && !live) || t > 4000) {
        if (cv.parentNode) cv.parentNode.removeChild(cv);
        card.style.transform = "";
        return;
      }
      requestAnimationFrame(loop);
    }
    render(0);                                           // same frame the SVG hides
    requestAnimationFrame(loop);

    function render(t) {
      var tau = (t - T0) / 1000, sx = 0, sy = 0, sr = 0, amp;
      if (t < T0) {
        if (t > 70) {                                    // the card trembles with it
          amp = .35 + 1.1 * Math.pow(t / T0, 2);
          sx = (Math.random() - .5) * 2 * amp;
          sy = (Math.random() - .5) * 2 * amp;
        }
      } else if (tau < .34) {                            // shake, decaying
        amp = SHAKE * Math.pow(1 - tau / .34, 2);
        sx = amp * (Math.sin(tau * 87 + .4) * .6 + Math.sin(tau * 151 + 1.7) * .4);
        sy = amp * (Math.sin(tau * 109 + 1.1) * .6 + Math.sin(tau * 173 + 2.9) * .4);
        sr = amp * .05 * Math.sin(tau * 71 + .3);
      }
      if (t < T0 + 360) card.style.transform = "translate(" + sx.toFixed(2) + "px," + sy.toFixed(2) + "px) rotate(" + sr.toFixed(3) + "deg)";
      else if (!still) { card.style.transform = ""; still = true; }

      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);

      if (t < T0) { tension(t); return 1; }
      if (!pieces) {
        pieces = throwCard();
        if (input) input.style.boxShadow = "";
      }
      return detonation(tau) + movePieces(tau);
    }

    /* --------------------------------------------------- 1. Tension -- */
    function tension(t) {
      var u = t / T0;
      var snap = t < 45 ? SNAP * Math.pow(t / 45, 2)
        : SNAP - .9 * Math.sin(Math.PI * Math.min(1, (t - 45) / 45));
      var q = t < 50 ? 1 - Math.pow(1 - t / 50, 3) : 1;
      var sw = t > 110 ? Math.pow((t - 110) / (T0 - 110), 2) : 0;
      var sxL = (1 + .08 * q) * (1 - sw) + SWELL * sw;
      var syL = (1 - .1 * q) * (1 - sw) + SWELL * sw;
      var j = t > 40 ? .25 + 1.5 * u * u : 0;
      var jx = (Math.random() - .5) * 2 * j, jy = (Math.random() - .5) * 2 * j;

      if (u > .2) sprite(GLOW, CX, CY, k * (40 + 60 * u), .3 * u * u);

      lx.setTransform(lres, 0, 0, lres, 1 - B[0] * lres, 1 - B[1] * lres);
      lx.clearRect(B[0] - 1, B[1] - 1, bw + 2, bh + 2);
      drawLock(lx, snap);
      if (t > 58) cracks((t - 58) / (T0 - 58));

      g.save();
      g.translate(BX + jx, BY + jy);
      g.scale(sxL, syL);
      g.drawImage(lockCv, (B[0] - 32 - 1 / lres) * k, (B[1] - 80 - 1 / lres) * k, lockCv.width / lres * k, lockCv.height / lres * k);
      g.restore();

      if (input) {                                      // the field flashes, twice
        input.style.boxShadow = (t < 55 || t > 118) ? "0 0 0 1px #fff, 0 0 22px rgba(255,255,255,.45)" : "";
        input.style.borderColor = (t < 55 || t > 118) ? "#fff" : "";
      }
    }

    /* Cracks run out from the keyhole along the lines the lock will break
       on: thin, jagged, a few at a time, then a few across. */
    function cracks(cu) {
      lx.save();
      lx.globalCompositeOperation = "source-atop";
      lx.strokeStyle = INK;
      lx.lineWidth = .85;
      lx.lineCap = "round"; lx.lineJoin = "round";
      lx.beginPath();
      for (var ii = 0; ii < F.n; ii++) {
        var pr = Math.max(0, Math.min(1, (cu - F.d[ii]) / .5));
        if (!pr) continue;
        var tip = 5 + 30 * pr, line = F.crack[ii];
        lx.moveTo(line[0][0], line[0][1]);
        for (var j = 1; j < line.length && line[j][2] <= tip; j++) lx.lineTo(line[j][0], line[j][1]);
        var br = Math.max(0, Math.min(1, (cu - .55 - F.d[ii] * .5) / .3));
        if (br && F.d[ii] < .25) {                     // and one branch across
          var a0 = F.p[ii][1], a1 = F.p[(ii + 1) % F.n][1];
          lx.moveTo(a0[0], a0[1]);
          lx.lineTo(a0[0] + (a1[0] - a0[0]) * br, a0[1] + (a1[1] - a0[1]) * br);
        }
      }
      lx.stroke();
      lx.restore();
    }

    /* ------------------------------------------------ 2. Detonation -- */
    function detonation(tau) {
      var ii, p, a, u, al, live = tau < .62 ? 1 : 0;     // the ring and flash count too

      /* The core: a white-hot bloom where the lock was. */
      if (tau < .6) sprite(GLOW, CX, CY, S * .5 * (.65 + .35 * easeOut(Math.min(1, tau / .12))), .9 * Math.exp(-tau / .16));

      /* Smoke: hot white puffs that cool to grey, billow out, rise a little. */
      for (ii = 0; ii < smoke.length; ii++) {
        p = smoke[ii];
        a = tau - p.t;
        if (a > p.life) continue;
        live++;
        if (a < 0) continue;
        u = a / p.life;
        pos(p, a, P);
        var rad = p.r0 + (p.r1 - p.r0) * (1 - Math.pow(1 - u, 2.4));
        al = Math.min(1, a / .04) * Math.pow(1 - u, 1.6) * p.peak;
        var heat = Math.max(0, 1 - a / p.cool);
        g.save();
        g.translate(P[0], P[1]);
        g.rotate(p.rot + p.spin * a);
        if (heat > 0) {
          g.globalAlpha = al * heat;
          g.drawImage(HOT[p.v], -rad, -rad, rad * 2, rad * 2);
        }
        g.globalAlpha = al * (1 - heat * .7) * (p.peak > .8 ? .35 : 1);
        g.drawImage(SMOKE[p.v], -rad, -rad, rad * 2, rad * 2);
        g.restore();
      }
      g.globalAlpha = 1;

      /* The shockwave: a crisp ring with a soft band of pressure behind,
         and a fainter echo just after. */
      ring(tau, .62, RMAX, .9, 3.4, 30);
      ring(tau - .07, .55, RMAX * .5, .32, 1.6, 0);

      /* Fine debris: chips tumbling edge-on and back. */
      for (ii = 0; ii < chips.length; ii++) {
        p = chips[ii];
        if (tau > p.life) continue;
        pos(p, tau, P);
        if (gone(P, 10)) continue;
        live++;
        if (offscreen(P, 10)) continue;
        var fl = Math.cos(p.fw * tau);
        g.globalAlpha = Math.min(1, (p.life - tau) / .3) * (.5 + .5 * Math.abs(fl));
        g.fillStyle = p.col;
        g.save();
        g.translate(P[0], P[1]);
        g.rotate(p.rot + p.w * tau * Math.exp(-tau));
        g.scale(Math.max(.15, Math.abs(fl)), 1);
        if (p.tri) {
          g.beginPath();
          g.moveTo(-p.s / 2, p.s * p.asp / 2); g.lineTo(p.s / 2, p.s * p.asp / 2); g.lineTo(0, -p.s * p.asp / 2);
          g.fill();
        } else {
          g.fillRect(-p.s / 2, -p.s * p.asp / 2, p.s, p.s * p.asp);
        }
        g.restore();
      }

      /* The shards: tumbling in 3D (one axis squashed by the flip, light
         catching on the faces), some flying at you, a smear while fast. */
      for (ii = 0; ii < shards.length; ii++) {
        p = shards[ii];
        if (tau > p.life) continue;
        pos(p, tau, P);
        if (gone(P, 60)) continue;
        live++;
        al = tau < p.life - .35 ? 1 : (p.life - tau) / .35;
        var ghosts = tau < .2 ? 2 : 0;
        for (var gi = ghosts; gi >= 0; gi--) {
          var ta = Math.max(0, tau - gi * .014);
          pos(p, ta, P);
          if (offscreen(P, 60)) continue;
          var rot = p.spin * (1 - Math.exp(-.9 * ta)) / .9;
          var flip = Math.cos(p.fw * ta);
          var zoom = SWELL + (1 + p.zs - SWELL) * (1 - Math.exp(-1.6 * ta));
          g.globalAlpha = al * (gi ? .28 / gi : 1) * (.55 + .45 * Math.abs(flip));
          g.save();
          g.translate(P[0], P[1]);
          g.rotate(rot);
          g.scale(zoom * (Math.abs(flip) < .12 ? (flip < 0 ? -.12 : .12) : flip), zoom);
          g.drawImage(p.img, p.ox, p.oy, p.w, p.h);
          g.restore();
        }
      }
      g.globalAlpha = 1;

      /* Embers: slower, flickering, each with a short trail. Amber ones
         are drawn plain over the ink so they keep their colour. */
      for (ii = 0; ii < embers.length; ii++) {
        p = embers[ii];
        if (tau > p.life) continue;
        live++;
        u = tau / p.life;
        var flick = .7 + .3 * Math.sin(tau * 41 + p.ph) * Math.sin(tau * 23 + p.ph * 2);
        al = Math.pow(1 - u, 1.2) * flick;
        var col = p.amber ? "rgba(" + AMBER + "," : "rgba(255,255,255,";
        pos(p, tau, P);
        var hx = P[0] + p.sway * Math.sin(tau * 6 + p.ph) * tau, hy = P[1];
        g.lineCap = "round";
        var px = hx, py = hy;
        for (var m = 1; m <= 6; m++) {
          var tm = tau - m * .018;
          if (tm < 0) break;
          pos(p, tm, Q);
          var qx = Q[0] + p.sway * Math.sin(tm * 6 + p.ph) * tm;
          g.strokeStyle = col + (al * .6 * (1 - m / 7)).toFixed(3) + ")";
          g.lineWidth = p.r * 1.6 * (1 - m / 8);
          g.beginPath(); g.moveTo(px, py); g.lineTo(qx, Q[1]); g.stroke();
          px = qx; py = Q[1];
        }
        sprite(p.amber ? EMBER : GLOW, hx, hy, p.r * 7, al * .45);
        g.fillStyle = p.amber ? col + al.toFixed(3) + ")" : "rgba(255,255,255," + al.toFixed(3) + ")";
        g.beginPath(); g.arc(hx, hy, p.r, 0, Math.PI * 2); g.fill();
      }

      /* Sparks: fast streaks, white ones added as light, a few amber. */
      for (var pass = 0; pass < 2; pass++) {
        g.globalCompositeOperation = pass ? "lighter" : "source-over";
        g.strokeStyle = pass ? "#fff" : "rgb(" + AMBER + ")";
        for (ii = 0; ii < sparks.length; ii++) {
          p = sparks[ii];
          if (p.amber === !!pass || tau > p.life) continue;
          live++;
          u = tau / p.life;
          pos(p, tau, P);
          pos(p, Math.max(0, tau - .026), Q);
          g.globalAlpha = Math.pow(1 - u, 1.3);
          g.lineWidth = p.w * (1 - u * .6);
          g.beginPath(); g.moveTo(Q[0], Q[1]); g.lineTo(P[0], P[1]); g.stroke();
        }
      }
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;

      /* The nucleus: white-hot, blowing out in the first 150 ms. */
      if (tau < .15) {
        u = tau / .15;
        var nr = k * (18 + 80 * easeOut(Math.min(1, tau / .09)));
        var ng = g.createRadialGradient(CX, CY, 0, CX, CY, nr);
        ng.addColorStop(0, "rgba(255,255,255," + (1 - u * u).toFixed(3) + ")");
        ng.addColorStop(.55, "rgba(255,255,255," + (.8 * (1 - u)).toFixed(3) + ")");
        ng.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = ng;
        g.beginPath(); g.arc(CX, CY, nr, 0, Math.PI * 2); g.fill();
      }

      /* The flash: the whole screen, brief (peak .35 over the ink). */
      if (tau < .4) {
        al = tau < .018 ? .35 * tau / .018 : .35 * Math.exp(-(tau - .018) / .075);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = "rgba(255,255,255," + al.toFixed(3) + ")";
        g.fillRect(0, 0, cv.width, cv.height);
      }
      return live;
    }

    function ring(tau, dur, reach, alpha, width, band) {
      if (tau < 0 || tau > dur) return;
      var u = tau / dur, R = reach * (1 - Math.pow(1 - u, 3));
      if (band) {
        var bandW = band * LW * (1 - u * .4);
        var gr = g.createRadialGradient(CX, CY, Math.max(0, R - bandW), CX, CY, R);
        gr.addColorStop(0, "rgba(255,255,255,0)");
        gr.addColorStop(1, "rgba(255,255,255," + (.08 * Math.pow(1 - u, 1.5)).toFixed(3) + ")");
        g.fillStyle = gr;
        g.beginPath(); g.arc(CX, CY, R, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = alpha * Math.pow(1 - u, 1.6);
      g.strokeStyle = "#fff";
      g.lineWidth = Math.max(.6, width * Math.pow(1 - u, 1.2)) * LW;
      g.beginPath(); g.arc(CX, CY, R, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 1;
    }

    /* The card's own pieces, as the ring reaches each one. */
    function movePieces(tau) {
      var live = 0;
      for (var ii = 0; ii < pieces.length; ii++) {
        var p = pieces[ii], a = tau - p.delay;
        if (p.done) continue;
        live++;
        if (a <= 0) continue;
        pos(p, a, P);
        var rz = p.spin * (1 - Math.exp(-.8 * a)) / .8;
        var tb = p.tumble * a;
        var s = (p.s0 + (1 - p.s0) * Math.exp(-a / .025)) * (1 + p.zs * (1 - Math.exp(-2 * a)));
        var o = a < p.hold ? 1 : Math.max(0, 1 - (a - p.hold) / p.fadeFor);
        p.el.style.transform = "translate(" + P[0].toFixed(1) + "px," + P[1].toFixed(1) + "px) perspective(600px) rotate3d(" +
          p.ax + "," + p.ay + ",0," + tb.toFixed(3) + "rad) rotate(" + rz.toFixed(3) + "rad) scale(" + s.toFixed(3) + ")";
        p.el.style.opacity = o.toFixed(3);
        Q[0] = p.cx + P[0]; Q[1] = p.cy + P[1];
        if (!o || gone(Q, p.size)) {                     // faded, or fallen out of frame
          p.el.style.opacity = "0";
          p.done = true;
        }
      }
      return live;
    }

    function sprite(img, x, y, size, alpha) {
      if (alpha <= .002) return;
      g.globalAlpha = Math.min(1, alpha);
      g.drawImage(img, x - size / 2, y - size / 2, size, size);
      g.globalAlpha = 1;
    }

    /* Out of frame for good: below it, or off a side (drag never turns
       anything back; above the top, it can still fall back in). */
    function gone(pt, m) {
      return pt[1] > H + m || pt[0] < -m - 40 || pt[0] > W + m + 40;
    }

    function offscreen(pt, m) {
      return pt[0] < -m || pt[0] > W + m || pt[1] < -m || pt[1] > H + m;
    }
  }

  /* ----------------------------------------------------------- Helpers -- */

  /* The break: lines out from the keyhole, cut across by three rings, so
     the middle goes to splinters and the shackle to a few curved pieces. */
  function fracture() {
    var n = 11, radii = [0, 9, 19, 31, 82], p = [], d = [], crack = [];
    var a0 = Math.random() * Math.PI * 2;
    for (var i = 0; i < n; i++) {
      var a = a0 + (i + (Math.random() - .5) * .55) * Math.PI * 2 / n;
      var line = radii.map(function (r, j) {
        var rr = j && j < radii.length - 1 ? r * (.82 + Math.random() * .36) : r;
        var aa = a + (j ? (Math.random() - .5) * .22 : 0);
        return [LOCK.cx + Math.cos(aa) * rr, LOCK.cy + Math.sin(aa) * rr];
      });
      p.push(line);
      /* Not every line cracks before it goes: about a third stay hidden. */
      d.push(Math.random() < .35 ? 9 : Math.random() * .4);
      /* The visible crack: the same line from the keyhole's edge, walked
         in small steps with a little sideways jitter. [x, y, radius] */
      var pts = [];
      for (var seg = 0; seg < line.length - 1; seg++) {
        var A = line[seg], Bp = line[seg + 1];
        var dx = Bp[0] - A[0], dy = Bp[1] - A[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
        var steps = Math.max(1, Math.round(L / 2.4));
        for (var st = 0; st < steps; st++) {
          var f = st / steps, jit = st ? (Math.random() - .5) * 1.5 : 0;
          var x = A[0] + dx * f - dy / L * jit, y = A[1] + dy * f + dx / L * jit;
          var r = dist([x, y]);
          if (r >= 4.5 && r < 40) pts.push([x, y, r]);
        }
      }
      crack.push(pts.length ? pts : [[LOCK.cx, LOCK.cy, 0]]);
    }
    return { n: n, p: p, d: d, crack: crack };
  }

  function dist(q) {
    var dx = q[0] - LOCK.cx, dy = q[1] - LOCK.cy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* A body thrown from (x, y) at angle a and speed sp (plus a kick up),
     with drag k (1/s) and gravity gr (px/s²). */
  function mover(x, y, a, sp, up, k, gr, extra) {
    var p = { x0: x, y0: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up, k: k, g: gr };
    for (var key in extra) p[key] = extra[key];
    return p;
  }

  /* Where it is t seconds in, solved exactly (linear drag, gravity). */
  function pos(p, t, out) {
    var e = Math.exp(-p.k * t), gk = p.g / p.k;
    out[0] = p.x0 + p.vx * (1 - e) / p.k;
    out[1] = p.y0 + gk * t + (p.vy - gk) * (1 - e) / p.k;
    return out;
  }

  function easeOut(u) { return 1 - Math.pow(1 - u, 3); }

  /* The title, one span a letter (words kept whole so it wraps the same). */
  function split(h) {
    var text = h.textContent, out = [];
    h.setAttribute("aria-label", text);
    h.textContent = "";
    text.split(/(\s+)/).forEach(function (word) {
      if (!word) return;
      if (/^\s+$/.test(word)) { h.appendChild(document.createTextNode(word)); return; }
      var w = document.createElement("span");
      w.style.whiteSpace = "nowrap";
      w.setAttribute("aria-hidden", "true");
      Array.from(word).forEach(function (ch) {
        var s = document.createElement("span");
        s.textContent = ch;
        s.style.display = "inline-block";
        w.appendChild(s);
        out.push(s);
      });
      h.appendChild(w);
    });
    return out;
  }

  /* A puff of smoke: fractal value noise under a soft round falloff, so
     it reads as wisps rather than a disc. One noise field, one small
     canvas per colour (white while hot, grey once cool). */
  function puff(colours) {
    var n = 96, field = new Float32Array(n * n);
    var octaves = [[4, .5], [8, .27], [16, .15], [32, .08]].map(function (o) {
      var g = [], m = o[0] + 1;
      for (var i = 0; i < m * m; i++) g.push(Math.random());
      return { cells: o[0], amp: o[1], grid: g, m: m };
    });
    function smooth(u) { return u * u * (3 - 2 * u); }
    for (var py = 0; py < n; py++) {
      for (var px = 0; px < n; px++) {
        var v = 0;
        for (var oi = 0; oi < octaves.length; oi++) {
          var o = octaves[oi], fx = px / n * o.cells, fy = py / n * o.cells;
          var ix = Math.floor(fx), iy = Math.floor(fy), ux = smooth(fx - ix), uy = smooth(fy - iy);
          var a = o.grid[iy * o.m + ix], b = o.grid[iy * o.m + ix + 1];
          var cc = o.grid[(iy + 1) * o.m + ix], dd = o.grid[(iy + 1) * o.m + ix + 1];
          v += o.amp * ((a + (b - a) * ux) * (1 - uy) + (cc + (dd - cc) * ux) * uy);
        }
        var dx = px / n * 2 - 1, dy = py / n * 2 - 1, r2 = dx * dx + dy * dy;
        var fall = r2 >= 1 ? 0 : Math.pow(1 - r2, 1.8);
        field[py * n + px] = Math.min(1, Math.max(0, Math.min(1, (v - .3) * 2.1)) * fall * .9 + fall * .12);
      }
    }
    return colours.map(function (rgb) {
      var c = document.createElement("canvas");
      c.width = c.height = n;
      var x = c.getContext("2d"), img = x.createImageData(n, n), d = img.data;
      var col = rgb.split(",").map(Number);
      for (var i = 0; i < n * n; i++) {
        d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2];
        d[i * 4 + 3] = Math.round(255 * field[i]);
      }
      x.putImageData(img, 0, 0);
      return c;
    });
  }

  function glow(rgb) {
    var n = 128, c = document.createElement("canvas");
    c.width = c.height = n;
    var x = c.getContext("2d");
    var gr = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    gr.addColorStop(0, "rgba(" + rgb + ",1)");
    gr.addColorStop(.18, "rgba(" + rgb + ",.55)");
    gr.addColorStop(.5, "rgba(" + rgb + ",.14)");
    gr.addColorStop(1, "rgba(" + rgb + ",0)");
    x.fillStyle = gr;
    x.fillRect(0, 0, n, n);
    return c;
  }

  /* ------------------------------------------------------------- Sound -- */
  var bank = null;      // noise and a small room, made once per AudioContext

  function sounds(c) {
    if (bank && bank.c === c) return bank;
    var sr = c.sampleRate, len = Math.floor(sr * 2);
    var white = c.createBuffer(1, len, sr), brown = c.createBuffer(1, len, sr);
    var w = white.getChannelData(0), b = brown.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) {
      var r = Math.random() * 2 - 1;
      w[i] = r;
      last = (last + .02 * r) / 1.02;
      b[i] = last * 3.5;
    }
    var rl = Math.floor(sr * 1.3), room = c.createBuffer(2, rl, sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = room.getChannelData(ch);
      for (var j = 0; j < rl; j++) d[j] = j < sr * .007 ? 0 : (Math.random() * 2 - 1) * Math.pow(1 - j / rl, 4);
    }
    bank = { c: c, white: white, brown: brown, room: room };
    return bank;
  }

  function sound(c, delay, clench) {
    var N = sounds(c);
    var now = c.currentTime + .005, t0 = now + delay;

    var master = c.createGain();
    master.gain.value = .55;
    var comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6;
    comp.attack.value = .002; comp.release.value = .25;
    var bus = c.createGain();
    var verb = c.createConvolver();
    verb.buffer = N.room;
    var wet = c.createGain();
    wet.gain.value = .45;
    bus.connect(comp);
    verb.connect(wet); wet.connect(comp);
    comp.connect(master); master.connect(c.destination);
    var pans = !!c.createStereoPanner;

    function out(node, send, pan) {
      var end = node;
      if (pan && pans) {
        var p = c.createStereoPanner();
        p.pan.value = pan;
        node.connect(p);
        end = p;
      }
      end.connect(bus);
      if (send) {
        var s = c.createGain();
        s.gain.value = send;
        end.connect(s); s.connect(verb);
      }
    }
    function noise(buf, t, dur, rate) {
      var s = c.createBufferSource();
      s.buffer = buf;
      if (rate) s.playbackRate.value = rate;
      s.start(t, Math.random() * .2, dur);
      return s;
    }
    function filt(type, f, q) {
      var x = c.createBiquadFilter();
      x.type = type; x.frequency.value = f;
      if (q != null) x.Q.value = q;
      return x;
    }
    function amp(t, peak, attack, decay) {
      var x = c.createGain();
      x.gain.setValueAtTime(.0001, t);
      x.gain.exponentialRampToValueAtTime(peak, t + attack);
      x.gain.exponentialRampToValueAtTime(.0001, t + attack + decay);
      return x;
    }
    function ping(t, f, v, d, pan, type) {
      var o = c.createOscillator();
      o.type = type || "sine";
      o.frequency.value = f;
      var a = amp(t, v, .002, d);
      o.connect(a); out(a, .6, pan);
      o.start(t); o.stop(t + d + .05);
    }
    function sweep(t, f0, f1, dur, v, decay) {
      var o = c.createOscillator();
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      var a = amp(t, v, .003, decay);
      o.connect(a);
      o.start(t); o.stop(t + decay + .05);
      return a;
    }

    /* A clack of metal as it clenches. */
    function clack(t, v) {
      var s = noise(N.white, t, .03);
      var bp = filt("bandpass", 3400, 1.4);
      var a = amp(t, .5 * v, .0008, .022);
      s.connect(bp); bp.connect(a); out(a, .2);
      ping(t, 1760, .05 * v, .05, 0, "triangle");
      ping(t, 2710, .03 * v, .035);
      out(sweep(t, 260, 120, .04, .2 * v, .05), 0);
    }

    if (clench) {
      clack(now, .8);
      clack(now + .045, 1);                    // the shackle slamming home
      /* A breath in as it swells: noise whose band rises to the blast. */
      var br = noise(N.white, now + .03, delay + .01);
      var bbp = filt("bandpass", 300, .9);
      bbp.frequency.setValueAtTime(300, now + .03);
      bbp.frequency.exponentialRampToValueAtTime(2600, t0);
      var bg = c.createGain();
      bg.gain.setValueAtTime(.0001, now + .03);
      bg.gain.exponentialRampToValueAtTime(.3, t0 - .008);
      bg.gain.exponentialRampToValueAtTime(.0001, t0 + .006);
      br.connect(bbp); bbp.connect(bg); out(bg, .1);
    }

    /* The crack: the first few milliseconds, bright and wide. */
    var cr = noise(N.white, t0, .05);
    var hp = filt("highpass", 800, .7);
    var ca = amp(t0, .75, .0008, .045);
    cr.connect(hp); hp.connect(ca); out(ca, .35);

    /* The body: noise through a lowpass falling from bright to dull. */
    var bo = noise(N.white, t0, 1.7);
    var lp1 = filt("lowpass", 3800, .8), lp2 = filt("lowpass", 3800, .5);
    [lp1, lp2].forEach(function (f) {
      f.frequency.setValueAtTime(3800, t0);
      f.frequency.exponentialRampToValueAtTime(150, t0 + 1);
    });
    var ba = c.createGain();
    ba.gain.setValueAtTime(.0001, t0);
    ba.gain.exponentialRampToValueAtTime(.9, t0 + .006);
    ba.gain.exponentialRampToValueAtTime(.32, t0 + .3);
    ba.gain.exponentialRampToValueAtTime(.0001, t0 + 1.6);
    bo.connect(lp1); lp1.connect(lp2); lp2.connect(ba); out(ba, .3);

    /* The rumble under it: brown noise, darker still. */
    var ru = noise(N.brown, t0 + .01, 1.75);
    var rl = filt("lowpass", 420, .7);
    rl.frequency.setValueAtTime(420, t0);
    rl.frequency.exponentialRampToValueAtTime(70, t0 + 1.4);
    var ra = c.createGain();
    ra.gain.setValueAtTime(.0001, t0);
    ra.gain.exponentialRampToValueAtTime(.8, t0 + .03);
    ra.gain.exponentialRampToValueAtTime(.0001, t0 + 1.7);
    ru.connect(rl); rl.connect(ra); out(ra, .15);

    /* The thump: a sine falling 92 → 34 Hz, driven a little so phones and
       laptops (which can't play that low) still hear its overtones. */
    var drive = c.createWaveShaper();
    var curve = new Float32Array(1024);
    for (var ci = 0; ci < 1024; ci++) {
      var xx = ci / 511.5 - 1;
      curve[ci] = Math.tanh(2.6 * xx) / Math.tanh(2.6);
    }
    drive.curve = curve;
    drive.oversample = "2x";
    var thump = sweep(t0, 92, 34, .45, 1, .75);
    var post = c.createGain();
    post.gain.value = .85;
    thump.connect(drive); drive.connect(post); out(post, .08);
    out(sweep(t0, 185, 64, .3, .28, .32), .1);

    /* Debris: sparse clicks, thick at first, thinning out, left and right. */
    for (var i = 0; i < 38; i++) {
      var u = Math.pow(Math.random(), 1.8), t = t0 + .045 + u * .95;
      var v = Math.pow(1 - u, 1.3) * (.3 + Math.random() * .7);
      var s = noise(N.white, t, .02, .8 + Math.random() * .7);
      var bp = filt("bandpass", 1300 + Math.random() * 5200, 2 + Math.random() * 5);
      var a = amp(t, .55 * v, .0006, .003 + Math.random() * .014);
      s.connect(bp); bp.connect(a); out(a, .25, (Math.random() - .5) * 1.5);
    }

    /* Glass: shards ringing as they part, three inharmonic partials each. */
    for (var m = 0; m < 9; m++) {
      var tt = t0 + .09 + Math.pow(Math.random(), 1.2) * .8, f = 2300 + Math.random() * 3300;
      var vv = (.035 + Math.random() * .04) * (1 - (tt - t0) * .5), dd = .06 + Math.random() * .16;
      var pp = (Math.random() - .5) * 1.6;
      ping(tt, f, vv, dd, pp);
      ping(tt, f * 2.32, vv * .45, dd * .7, pp);
      ping(tt, f * 4.25, vv * .2, dd * .5, pp);
    }

    /* The shackle's steel: two low metallic rings. */
    for (var q = 0; q < 2; q++) {
      var tq = t0 + .12 + Math.random() * .3, fq = 1050 + Math.random() * 500, pq = q ? .5 : -.5;
      ping(tq, fq, .045, .4, pq, "triangle");
      ping(tq, fq * 2.76, .025, .25, pq);
      ping(tq, fq * 5.4, .012, .15, pq);
    }

    setTimeout(function () { try { master.disconnect(); } catch (e) { /* gone */ } }, (delay + 2.8) * 1000);
  }
})();
