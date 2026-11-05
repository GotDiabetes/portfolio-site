/* ============================================================================
   The gift voucher: under the gift line in Lessons, a small paper voucher
   with a perforated stub. Tear the stub off, click it, or press Enter or
   Space on it, and the gift popup opens. After React Bits' TearTicket
   (reactbits.dev, MIT), rebuilt in plain JS.

   Markup it starts from:
     <p class="gift-line">Giving tennis as a present? …
       <button class="link-btn" data-open="giftForm">Give a lesson</button></p>

   Everything is built from spans and SVG, because it sits inside a <p>. The
   button stays in the page, hidden and out of the tab order, and the voucher
   presses it (.click()), so tennis.js opens the popup the way it always has.
   The voucher is the control: role="button", the button's name, a focus ring.
   It holds the focus when the popup opens, so tennis.js hands it back there.

   The drag is the original's. A grab hinges the stub at the far end of the
   perforation; it follows the pointer's angle, the paper bridges between the
   holes stretch and snap one by one (thread fibres across the gap, the body
   jolting a little), and once free the stub is yours to drop. A click rips
   it off in one go. Either way the popup opens as the stub falls, and when
   the popup's <dialog> fires "close" the stub comes back. Let go too early
   and the stub springs back with nothing opened.

   Words: the title is the button's own, so it is translated with the page.
   "Lee Tennis Co." and "leetennisco.com" are names.

   Right to left: the stub goes on the left. The physics stay in one set of
   coordinates; the stage is mirrored, the pointer is mirrored to match, and
   the words are mirrored back (voucher.css).

   Reduced motion: no tear. A click or a key opens the popup at once, and a
   drag past 28px takes the stub off with no animation.
   ========================================================================== */

(function () {
  "use strict";

  var line = document.querySelector("#lessons .gift-line");
  var btn = line && line.querySelector('button[data-open="giftForm"]');
  var dialog = document.getElementById("giftForm");
  if (!btn || !dialog) return;

  /* The stage, in px, and the perforation. The tear's numbers are the
     original's, with the stretch and the jolt cut to this size of paper. */
  var W = 360, H = 140, S = 92, R = 6, HOLES = 7, HOLE = 5, NOTCH = 4, ROUGH = 1.6;
  var TEAR_ANGLE = 28, STRETCH = 16, RESIST = 0.45, GRAVITY = 2400, RETRACT = 0.17;
  var PULL = 120;        // px of straight pull outward that parts the last bridge
  var JOLT = 300;        // the body's kick, shared out among the bridges
  var CLICK_SLOP = 6;    // px of travel before a press counts as a drag
  var REDUCED_TEAR = 28; // px of drag that takes the stub off with no motion
  var OPEN_AFTER = 220;  // ms of falling stub before the popup opens

  var MARK = '<img src="/images/lee-tennis-mark.svg" alt="" width="26" height="22" draggable="false">';
  var SVG = 'viewBox="0 0 ' + W + " " + H + '" aria-hidden="true" focusable="false"';
  var rtl = document.documentElement.getAttribute("dir") === "rtl";

  function reduced() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function rad(d) { return d * Math.PI / 180; }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function f(n) { return n.toFixed(2); }

  /* The sound of the tear. Made here, like the site's other sounds, so there
     is no file to load, and silent when the visitor has turned sounds off
     (the "askIsaacSound" setting bookfx.js and the chat share). Paper tearing
     is a run of tiny noise grains, so each bridge that snaps is a grain or
     two: a slow pull crackles and a quick one rips. A click plays one short
     whole tear. The context starts on the first press, because browsers
     won't play before one, and is suspended again soon after, as in bookfx.js. */
  var actx = null, grit = null, hush = 0;
  function muted() {
    try { return localStorage.getItem("askIsaacSound") === "off"; } catch (e) { return false; }
  }
  function wake() {
    if (muted()) return false;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      if (!actx) {
        actx = new AC();
        grit = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
        var d = grit.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (actx.state === "suspended") actx.resume().catch(function () {});
      window.clearTimeout(hush);
      hush = window.setTimeout(function () {
        if (actx && actx.state === "running") actx.suspend().catch(function () {});
      }, 1500);
      return true;
    } catch (e) {
      actx = null;
      return false;
    }
  }
  function grain(ac, noise, t, len, hz, level) {
    var n = ac.createBufferSource(), band = ac.createBiquadFilter(), g = ac.createGain();
    n.buffer = noise;
    band.type = "bandpass";
    band.frequency.value = hz;
    band.Q.value = 1.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    n.connect(band);
    band.connect(g);
    g.connect(ac.destination);
    n.start(t, Math.random() * 0.9, len + 0.01);
  }
  /* One bridge: a bright tick with a little body under it. The last one to
     go is the fuller sound of the stub coming free. */
  function snapAt(ac, noise, t, last) {
    var level = last ? 0.62 : 0.36 + Math.random() * 0.14;
    grain(ac, noise, t, last ? 0.07 : 0.04 + Math.random() * 0.02, 2600 + Math.random() * 1800, level);
    grain(ac, noise, t + 0.012, 0.03, 3800 + Math.random() * 1400, level * 0.55);
    grain(ac, noise, t, 0.05, 950, level * 0.5);
  }
  /* The whole perforation at once: grains running together and thinning out,
     climbing in pitch as the tear runs along the paper. */
  function ripAt(ac, noise, t) {
    var at = 0, end = 0.26;
    while (at < end) {
      var k = at / end;
      grain(ac, noise, t + at, 0.03 + Math.random() * 0.025, 2200 + 2400 * k + Math.random() * 900, (0.9 - 0.55 * k) * (0.7 + Math.random() * 0.3));
      if (Math.random() < 0.5) grain(ac, noise, t + at, 0.05, 1000 + Math.random() * 400, 0.34 * (1 - k));
      at += 0.006 + Math.random() * 0.013 + k * 0.012;
    }
  }
  function snapSound(index, last) {
    if (wake()) snapAt(actx, grit, actx.currentTime + 0.004 + index * 0.011, last);
  }
  function ripSound() {
    if (wake()) ripAt(actx, grit, actx.currentTime + 0.004);
  }
  function noise(seed) {
    var s = seed | 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* The perforation is a column of round holes; the paper between them
     ("bridges") is traced with jittered points, so both torn edges come out
     ragged. The body and the stub share those points, so they meet exactly
     until they part. */
  function buildGeometry() {
    var x = W - S, hr = HOLE / 2, n = HOLES, span = H - 2 * NOTCH;
    var bridge = Math.max(2, (span - n * HOLE) / (n + 1));
    var random = noise(n * 7919 + H), bridges = [], i, k, b;
    for (i = 0; i <= n; i++) {
      var y0 = NOTCH + i * (bridge + HOLE), y1 = y0 + bridge, steps = Math.max(2, Math.round(bridge / 2.2)), pts = [];
      for (k = 1; k < steps; k++) pts.push([x + (random() - 0.5) * 2 * ROUGH, y0 + bridge * k / steps]);
      bridges.push({ y0: y0, y1: y1, mid: (y0 + y1) / 2, pts: pts, x: x, y: (y0 + y1) / 2 });
    }
    function arc(r, sweep, u, v) { return "A" + f(r) + "," + f(r) + " 0 0 " + sweep + " " + f(u) + "," + f(v); }
    function L(u, v) { return "L" + f(u) + "," + f(v); }
    var down = "", up = "";
    for (i = 0; i <= n; i++) {
      b = bridges[i];
      for (k = 0; k < b.pts.length; k++) down += L(b.pts[k][0], b.pts[k][1]);
      down += L(x, b.y1);
      if (i < n) down += arc(hr, 0, x, b.y1 + HOLE);
    }
    for (i = n; i >= 0; i--) {
      b = bridges[i];
      for (k = b.pts.length - 1; k >= 0; k--) up += L(b.pts[k][0], b.pts[k][1]);
      up += L(x, b.y0);
      if (i > 0) up += arc(hr, 0, x, b.y0 - HOLE);
    }
    var bodyOutline = "M" + f(x) + "," + f(H - NOTCH) + arc(NOTCH, 0, x - NOTCH, H) + L(R, H) + arc(R, 1, 0, H - R) + L(0, R) + arc(R, 1, R, 0) + L(x - NOTCH, 0) + arc(NOTCH, 0, x, NOTCH);
    var stubOutline = "M" + f(x) + "," + f(NOTCH) + arc(NOTCH, 0, x + NOTCH, 0) + L(W - R, 0) + arc(R, 1, W, R) + L(W, H - R) + arc(R, 1, W - R, H) + L(x + NOTCH, H) + arc(NOTCH, 0, x, H - NOTCH);
    return {
      body: bodyOutline + down + "Z", stub: stubOutline + up + "Z",
      bodyOutline: bodyOutline, stubOutline: stubOutline,
      bodyPerf: "M" + f(x) + "," + f(NOTCH) + down, stubPerf: "M" + f(x) + "," + f(H - NOTCH) + up,
      bridges: bridges, ends: [{ x: x, y: NOTCH }, { x: x, y: H - NOTCH }]
    };
  }

  function build() {
    var geo = buildGeometry();

    var vc = document.createElement("span");
    vc.className = "vc";
    vc.setAttribute("role", "button");
    vc.setAttribute("tabindex", "0");
    vc.setAttribute("aria-haspopup", "dialog");
    vc.setAttribute("aria-label", btn.getAttribute("aria-label") || btn.textContent.trim());
    /* The two torn shapes are SVG clip paths (clip-path: url()), not CSS
       path() strings: a long path() on a moving layer stalls the
       compositor's capture in Chromium. */
    vc.innerHTML =
      '<span class="vc-stage" aria-hidden="true">' +
        '<span class="vc-piece vc-body">' +
          '<span class="vc-paper vc-paper--body">' +
            '<span class="vc-content">' +
              '<span class="vc-brand">' + MARK + "<span dir=\"ltr\">Lee Tennis Co.</span></span>" +
              '<span class="vc-title"></span>' +
            "</span>" +
          "</span>" +
          '<svg class="vc-edge" ' + SVG + '><path class="vc-outline"/><path class="vc-perf"/></svg>' +
        "</span>" +
        '<svg class="vc-fibres" ' + SVG + "></svg>" +
        '<svg class="vc-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' +
          '<clipPath id="vcClipBody" clipPathUnits="userSpaceOnUse"><path/></clipPath>' +
          '<clipPath id="vcClipStub" clipPathUnits="userSpaceOnUse"><path/></clipPath>' +
        "</defs></svg>" +
        '<span class="vc-piece vc-stub">' +
          '<span class="vc-paper vc-paper--stub">' +
            '<span class="vc-label">' + MARK + "<span dir=\"ltr\">leetennisco.com</span></span>" +
          "</span>" +
          '<svg class="vc-edge" ' + SVG + '><path class="vc-outline"/><path class="vc-perf"/></svg>' +
        "</span>" +
      "</span>";

    var stage = vc.querySelector(".vc-stage");
    var bodyEl = vc.querySelector(".vc-body");
    var stubEl = vc.querySelector(".vc-stub");
    var bodyPaper = vc.querySelector(".vc-paper--body");
    var stubPaper = vc.querySelector(".vc-paper--stub");
    var fibresSvg = vc.querySelector(".vc-fibres");

    vc.querySelector(".vc-title").textContent = btn.textContent.trim();
    vc.querySelector("#vcClipBody path").setAttribute("d", geo.body);
    vc.querySelector("#vcClipStub path").setAttribute("d", geo.stub);
    bodyPaper.style.webkitClipPath = bodyPaper.style.clipPath = "url(#vcClipBody)";
    stubPaper.style.webkitClipPath = stubPaper.style.clipPath = "url(#vcClipStub)";
    bodyEl.querySelector(".vc-outline").setAttribute("d", geo.bodyOutline);
    bodyEl.querySelector(".vc-perf").setAttribute("d", geo.bodyPerf);
    stubEl.querySelector(".vc-outline").setAttribute("d", geo.stubOutline);
    stubEl.querySelector(".vc-perf").setAttribute("d", geo.stubPerf);

    var fibres = [];
    geo.bridges.forEach(function () {
      for (var j = 0; j < 2; j++) {
        var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        fibresSvg.appendChild(p);
        fibres.push(p);
      }
    });

    line.insertBefore(vc, btn);
    btn.classList.add("vc-src");
    btn.setAttribute("tabindex", "-1");
    btn.setAttribute("aria-hidden", "true");

    var s = {
      raf: 0, last: 0, phase: "idle", hinge: { x: 0, y: 0 }, sign: 1,
      grab: { x: 0, y: 0 }, start: { x: 0, y: 0 }, point: { x: 0, y: 0 },
      a0: 0, theta: 0, thetaV: 0, sx: 0, sy: 0, vx: 0, vy: 0, spin: 0,
      pvx: 0, pvy: 0, pt: 0, fade: 1, age: 0, bx: 0, bv: 0,
      snapped: [], snapAt: [], span: []
    };
    var pointer = null;     // the id of the pointer on the stub
    var travelled = 0;      // how far that pointer has gone
    var eatClick = false;   // the click that ends a drag isn't a click
    var spaceDown = false;  // Space went down on the voucher, not elsewhere
    var openTimer = 0;

    function used() { return vc.hasAttribute("data-used"); }

    function paint(now) {
      stubEl.style.transform = "translate(" + f(s.sx) + "px, " + f(s.sy) + "px) rotate(" + (s.theta * s.sign * 180 / Math.PI).toFixed(3) + "deg)";
      stubEl.style.opacity = s.fade.toFixed(3);
      bodyEl.style.transform = "translateX(" + f(s.bx) + "px)";
      var cos = Math.cos(s.theta * s.sign), sin = Math.sin(s.theta * s.sign), ly = 1.2, busy = false;
      var live = s.phase !== "idle";
      geo.bridges.forEach(function (b, i) {
        var dx = b.x - s.hinge.x, dy = b.y - s.hinge.y;
        var tx = s.hinge.x + dx * cos - dy * sin + s.sx, ty = s.hinge.y + dx * sin + dy * cos + s.sy;
        var ox = b.x + s.bx, oy = b.y, gx = tx - ox, gy = ty - oy, gap = Math.sqrt(gx * gx + gy * gy);
        var near = fibres[i * 2], far = fibres[i * 2 + 1];
        if (!s.snapped[i]) {
          if (!live || gap < 0.35) { near.style.opacity = "0"; far.style.opacity = "0"; return; }
          var k = clamp(gap / STRETCH, 0, 1), sag = gap * 0.18, w = (1.4 - 0.95 * k).toFixed(2), qx = gx / 2, qy = sag + gy / 2;
          near.setAttribute("d", "M" + f(ox) + "," + f(oy - ly) + "Q" + f(ox + qx) + "," + f(oy - ly + qy) + " " + f(tx) + "," + f(ty - ly));
          far.setAttribute("d", "M" + f(ox) + "," + f(oy + ly) + "Q" + f(ox + gx - qx) + "," + f(oy + ly + gy - qy) + " " + f(tx) + "," + f(ty + ly));
          near.style.strokeWidth = w; far.style.strokeWidth = w;
          near.style.opacity = "1"; far.style.opacity = "1";
          s.span[i] = gap;
          return;
        }
        var t = (now - s.snapAt[i]) / 1000 / RETRACT;
        if (!live || t >= 1 || !s.snapAt[i]) { near.style.opacity = "0"; far.style.opacity = "0"; return; }
        busy = true;
        var left = (1 - t) * (1 - t), len = (s.span[i] || STRETCH) * 0.5 * left;
        var ux = gap > 0.01 ? gx / gap : 1, uy = gap > 0.01 ? gy / gap : 0;
        near.setAttribute("d", "M" + f(ox) + "," + f(oy) + "L" + f(ox + ux * len) + "," + f(oy + uy * len));
        far.setAttribute("d", "M" + f(tx) + "," + f(ty) + "L" + f(tx - ux * len) + "," + f(ty - uy * len));
        near.style.strokeWidth = "0.8"; far.style.strokeWidth = "0.8";
        near.style.opacity = left.toFixed(2); far.style.opacity = left.toFixed(2);
      });
      return busy;
    }

    /* The stub has fallen out of sight. It stays gone until the popup closes. */
    function finish() {
      stubEl.style.visibility = "hidden";
      vc.setAttribute("data-used", "");
    }

    function step(now) {
      var dt = clamp((now - s.last) / 1000, 0.001, 0.034), limit = rad(TEAR_ANGLE), i;
      s.last = now;
      if (s.phase === "held") {
        var count = geo.bridges.length, intact = 0;
        for (i = 0; i < count; i++) if (!s.snapped[i]) intact++;
        var follow = 0.92 * (1 - RESIST * (intact / count));
        var a = Math.atan2(s.point.y - s.hinge.y, s.point.x - s.hinge.x);
        var want = clamp(wrap(a - s.a0) * s.sign * follow, 0, limit + 0.1);
        s.theta += (want - s.theta) * (1 - Math.exp(-dt / 0.035));
        var away = clamp((s.point.x - s.start.x) * 0.05, -2, 4), side = clamp((s.point.y - s.start.y) * 0.05, -3, 3);
        s.sx += (away - s.sx) * (1 - Math.exp(-dt / 0.05));
        s.sy += (side - s.sy) * (1 - Math.exp(-dt / 0.05));
        /* The original tears on the angle alone. On paper this small a long
           diagonal pull barely turns the stub, so distance outward counts
           too, the far end giving way first as it does on the angle. Pushing
           the stub into the body is never a tear. */
        var slack = Math.sqrt(s.sx * s.sx + s.sy * s.sy), pulled = s.point.x - s.start.x, left = 0, gone = 0;
        geo.bridges.forEach(function (b, j) {
          if (s.snapped[j]) return;
          var d = Math.abs(b.mid - s.hinge.y);
          if (2 * d * Math.sin(s.theta / 2) + slack > STRETCH || s.theta >= limit || pulled > PULL * (1 - 0.5 * d / H)) {
            s.snapped[j] = true;
            s.snapAt[j] = now;
            s.bv -= JOLT / count;
            snapSound(gone++, false);
          } else left++;
        });
        if (left === 0) { s.phase = "free"; s.bv -= JOLT / 4; snapSound(gone, true); }
      } else if (s.phase === "free") {
        var cos = Math.cos(s.theta * s.sign), sin = Math.sin(s.theta * s.sign);
        var gx = s.grab.x - s.hinge.x, gy = s.grab.y - s.hinge.y;
        var wx = s.point.x - s.hinge.x - (gx * cos - gy * sin), wy = s.point.y - s.hinge.y - (gx * sin + gy * cos);
        s.sx += (wx - s.sx) * (1 - Math.exp(-dt / 0.045));
        s.sy += (wy - s.sy) * (1 - Math.exp(-dt / 0.045));
        var hang = limit * 0.55 + clamp(s.pvx * 0.0009 * s.sign, -0.3, 0.3);
        s.theta += (hang - s.theta) * (1 - Math.exp(-dt / 0.12));
      } else if (s.phase === "drop") {
        s.age += dt;
        s.vy += GRAVITY * dt;
        s.sx += s.vx * dt;
        s.sy += s.vy * dt;
        s.theta += s.spin * dt;
        if (s.age > 0.16) s.fade = clamp(1 - (s.age - 0.16) / 0.42, 0, 1);
        if (s.fade <= 0) { s.phase = "idle"; finish(); }
      } else if (s.phase === "return") {
        s.thetaV += (-300 * s.theta - 24 * s.thetaV) * dt;
        s.theta += s.thetaV * dt;
        s.sx += (0 - s.sx) * (1 - Math.exp(-dt / 0.07));
        s.sy += (0 - s.sy) * (1 - Math.exp(-dt / 0.07));
        if (Math.abs(s.theta) < 0.0008 && Math.abs(s.thetaV) < 0.01 && Math.sqrt(s.sx * s.sx + s.sy * s.sy) < 0.05) {
          s.theta = 0; s.thetaV = 0; s.sx = 0; s.sy = 0;
          s.snapped = []; s.snapAt = []; s.span = [];
          s.phase = "idle";
        }
      }
      s.bv += (-520 * s.bx - 30 * s.bv) * dt;
      s.bx += s.bv * dt;
      var busy = paint(now), moving = Math.abs(s.bx) > 0.02 || Math.abs(s.bv) > 0.5;
      if (s.phase !== "idle" || moving || busy) {
        s.raf = requestAnimationFrame(step);
      } else {
        s.bx = 0; s.bv = 0;
        paint(now);
        s.raf = 0;
      }
    }
    function run() {
      if (s.raf) return;
      s.last = performance.now();
      s.raf = requestAnimationFrame(step);
    }

    /* The original button is pressed, not the dialog opened, so the popup
       logic stays in one place. */
    function open() {
      window.clearTimeout(openTimer);
      openTimer = 0;
      if (!dialog.open) btn.click();
    }
    function openSoon() {
      if (!openTimer) openTimer = window.setTimeout(open, OPEN_AFTER);
    }

    /* A click: the whole perforation goes at once, and the stub flies off
       from its top corner. */
    function rip() {
      var now = performance.now(), end = geo.ends[1];
      s.sign = 1;
      s.hinge = { x: end.x, y: end.y };
      stubEl.style.transformOrigin = end.x + "px " + end.y + "px";
      geo.bridges.forEach(function (b, i) {
        s.snapped[i] = true;
        s.snapAt[i] = now;
        s.span[i] = STRETCH;
      });
      s.theta = 0.05; s.thetaV = 0; s.sx = 0; s.sy = 0;
      s.vx = 340; s.vy = -260; s.spin = 2.4; s.age = 0; s.fade = 1;
      s.bv -= JOLT;
      s.phase = "drop";
      ripSound();
      run();
      openSoon();
    }

    function activate() {
      if (openTimer || dialog.open || s.phase === "drop") return;
      if (reduced() || used()) open();
      else rip();
    }

    /* Back after the popup: whole again, faded in. */
    function reset() {
      if (!used() && s.phase !== "drop") return;
      window.clearTimeout(openTimer);
      openTimer = 0;
      window.cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.phase = "idle";
      s.theta = 0; s.thetaV = 0; s.sx = 0; s.sy = 0; s.fade = 1; s.age = 0; s.bx = 0; s.bv = 0;
      s.snapped = []; s.snapAt = []; s.span = [];
      vc.removeAttribute("data-used");
      stubEl.style.visibility = "";
      stubEl.classList.remove("vc-stub--back");
      void stubEl.offsetWidth;   // so the fade runs again on a second gift
      stubEl.classList.add("vc-stub--back");
      paint(performance.now());
    }

    /* The pointer in the stage's own units. The stage is scaled on a narrow
       screen, and mirrored on the Persian page. */
    function local(e) {
      var r = stage.getBoundingClientRect(), k = r.width / W || 1;
      return { x: (rtl ? r.right - e.clientX : e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
    }

    /* A grab starts a hinge at the far end of the perforation; the stub then
       follows the pointer's angle. */
    function begin(p) {
      s.start = p;
      s.point = p;
      s.pt = performance.now();
      s.pvx = 0;
      s.pvy = 0;
      if (s.theta < 0.01) {
        var far = p.y < H / 2, end = geo.ends[far ? 1 : 0];
        s.sign = far ? 1 : -1;
        s.hinge = { x: end.x, y: end.y };
        stubEl.style.transformOrigin = end.x + "px " + end.y + "px";
      }
      var cos = Math.cos(-s.theta * s.sign), sin = Math.sin(-s.theta * s.sign);
      var ux = p.x - s.sx - s.hinge.x, uy = p.y - s.sy - s.hinge.y;
      s.grab = { x: s.hinge.x + ux * cos - uy * sin, y: s.hinge.y + ux * sin + uy * cos };
      s.a0 = Math.atan2(s.grab.y - s.hinge.y, s.grab.x - s.hinge.x) - (s.theta * s.sign) / 0.92;
      s.phase = "held";
      s.thetaV = 0;
      run();
    }
    function track(p, now) {
      var dt = Math.max(0.004, (now - s.pt) / 1000);
      s.pvx += ((p.x - s.point.x) / dt - s.pvx) * 0.35;
      s.pvy += ((p.y - s.point.y) / dt - s.pvy) * 0.35;
      s.pt = now;
      s.point = p;
    }
    function release() {
      if (s.phase === "free") {
        var still = performance.now() - s.pt > 80;
        s.vx = still ? 0 : clamp(s.pvx, -1600, 1600);
        s.vy = still ? 0 : clamp(s.pvy, -1600, 1200);
        s.spin = clamp(s.vx * 0.004, -6, 6) + 1.2 * s.sign;
        s.age = 0;
        s.phase = "drop";
        openSoon();
      } else if (s.phase === "held") {
        s.phase = "return";
      }
      run();
    }

    stubPaper.addEventListener("pointerdown", function (e) {
      if (pointer !== null || e.button !== 0 || used() || openTimer || s.phase === "drop") return;
      try { stubPaper.setPointerCapture(e.pointerId); } catch (err) { /* it still follows, just less far */ }
      pointer = e.pointerId;
      travelled = 0;
      var p = local(e);
      s.start = p;
      if (!reduced()) { wake(); begin(p); }
      vc.setAttribute("data-grabbing", "");
    });
    stubPaper.addEventListener("pointermove", function (e) {
      if (pointer !== e.pointerId) return;
      var p = local(e), dx = p.x - s.start.x, dy = p.y - s.start.y;
      travelled = Math.max(travelled, Math.sqrt(dx * dx + dy * dy));
      if (!reduced()) track(p, performance.now());
      else if (travelled > REDUCED_TEAR && !used()) finish();
    });
    function up(e) {
      if (pointer !== e.pointerId) return;
      pointer = null;
      try { if (stubPaper.hasPointerCapture(e.pointerId)) stubPaper.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
      vc.removeAttribute("data-grabbing");
      /* A press that went nowhere is a click, and the click event that
         follows does the work. Anything further was a drag: its click, if
         the browser sends one, comes straight after this and is dropped. */
      if (travelled > CLICK_SLOP) {
        eatClick = true;
        window.setTimeout(function () { eatClick = false; }, 0);
      }
      /* Under reduced motion the stub went during the drag; the popup waits
         for the release, so it never opens under a pressed pointer. */
      if (!reduced()) release();
      else if (used()) open();
    }
    stubPaper.addEventListener("pointerup", up);
    stubPaper.addEventListener("pointercancel", up);
    stubPaper.addEventListener("lostpointercapture", up);

    vc.addEventListener("click", function () {
      if (eatClick) { eatClick = false; return; }
      activate();
    });
    /* A native button's keys: Enter on the press, Space on the release. */
    vc.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (!e.repeat) activate();
      } else if (e.key === " ") {
        e.preventDefault();
        spaceDown = true;
      }
    });
    vc.addEventListener("keyup", function (e) {
      if (e.key !== " " || !spaceDown) return;
      spaceDown = false;
      activate();
    });
    vc.addEventListener("blur", function () { spaceDown = false; });
    vc.addEventListener("dragstart", function (e) { e.preventDefault(); });

    dialog.addEventListener("close", reset);

    /* The stage is a fixed size, scaled down when the column is narrower. */
    function measure() {
      var fit = Math.min(1, vc.clientWidth / W) || 1;
      stage.style.transform = rtl
        ? "translateX(" + f(W * fit) + "px) scale(" + (-fit).toFixed(4) + ", " + fit.toFixed(4) + ")"
        : "scale(" + fit.toFixed(4) + ")";
      vc.style.height = f(H * fit) + "px";
    }
    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(vc);
    else window.addEventListener("resize", measure);
    paint(performance.now());
  }

  /* Built a screen ahead of the visitor, so the line has its full height
     before they arrive; a voucher already above the screen (a reload further
     down the page) is built at once, not while they scroll back past it. */
  if ("IntersectionObserver" in window) {
    var heard = false, built = false;
    var start = function () {
      if (built) return;
      built = true;
      io.disconnect();
      build();
    };
    var io = new IntersectionObserver(function (entries) {
      heard = true;
      if (entries.some(function (en) { return en.isIntersecting || en.boundingClientRect.bottom < 0; })) start();
    }, { rootMargin: "100% 0px" });
    io.observe(line);
    /* A browser always reports once right after observe(); one that has
       said nothing after two seconds never will (some embedded browsers),
       so the voucher is built anyway. Like heart.js. */
    setTimeout(function () { if (!heard) start(); }, 2000);
  } else {
    build();
  }
})();
