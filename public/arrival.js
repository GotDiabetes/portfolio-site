/* ============================================================================
   The arrival: the hero's opening three seconds, once per visit.

     · A court draws itself behind the hero in the page's hairline grey: the
       baseline nearest the reader, the sidelines running away to the far
       baseline, the service boxes, and the net across the middle. Drawn
       every load (CSS, stroke by stroke); after the first visit of a
       session it is simply there.
     · The first time in a session, on a wide screen: the Book FX player
       stands at the right of the hero's words, on the court's baseline,
       and serves. The ball leaves his racket on an arc toward the headline
       and arrives above the "o" of "lessons", where ballo.js's own drop
       takes over and lands it. The player fades once he has landed.
     · Reduced motion, phones, the translated headlines (no "o"): no
       player; the court is drawn and the ball drops as before.

   ballo.js waits for the ball when <html> has the class "arrival-serve"
   (set here before ballo runs), and gives up waiting after four seconds.
   No sound: nothing on this page makes a sound before a gesture.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var hero = document.querySelector(".hero");
  if (!hero || root.classList.contains("classic")) return;
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var BALL = "#d9ef3f";
  /* The player is the page's ink: black on the light page, pale on the
     dark one, each over a halo of the page's own colour. */
  var dark = root.getAttribute("data-theme") === "dark";
  var INK = dark ? "#f2f2f0" : "#111111", HALO = dark ? "rgba(20,20,19,.95)" : "rgba(255,255,255,.95)";

  /* ------------------------------------------------------- The court -- */
  var SVG = "http://www.w3.org/2000/svg";
  var court = document.createElementNS(SVG, "svg");
  court.setAttribute("class", "hero-court");
  court.setAttribute("viewBox", "0 0 1000 620");
  court.setAttribute("preserveAspectRatio", "xMidYMax slice");
  court.setAttribute("aria-hidden", "true");
  /* A court seen from behind its baseline. Each line draws in the order
     the eye would walk it: the near baseline, the sidelines away, the
     service line, the centre line, the far court, then the net. */
  var lines = [
    ["M150 590 H850", 0],            // near baseline
    ["M150 590 L372 205", .18], ["M850 590 L628 205", .18],   // sidelines
    ["M228 455 H772", .42],          // near service line
    ["M500 455 V590", .55],          // centre mark line (near box)
    ["M372 205 H628", .62],          // far baseline
    ["M318 300 H682", .7],           // far service line
    ["M500 300 V455", .78],          // centre line
    ["M270 382 H730", .9],           // the net
  ];
  lines.forEach(function (l) {
    var p = document.createElementNS(SVG, "path");
    p.setAttribute("d", l[0]);
    p.setAttribute("pathLength", "1");
    p.style.setProperty("--cd", l[1] + "s");
    if (l[0] === "M270 382 H730") p.setAttribute("class", "hero-net");
    court.appendChild(p);
  });
  hero.insertBefore(court, hero.firstChild);
  window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { court.classList.add("is-drawn"); }); });

  /* -------------------------------------------------------- The serve -- */
  var slot = document.querySelector(".hero-drop .ball-o");
  var wide = window.matchMedia && window.matchMedia("(min-width: 900px)").matches;
  var first = true;
  try { first = !sessionStorage.getItem("leeArrived"); } catch (e) {}
  if (!slot || !wide || reduced || !first || !window.requestAnimationFrame) return;
  try { sessionStorage.setItem("leeArrived", "1"); } catch (e) {}
  root.classList.add("arrival-serve");

  /* The Book FX serve, by the same joints and poses. x forward, y up
     negative, feet on y = 0; about 85 units tall. */
  var POSES = [
    { t: 0, head: [-15, -62], neck: [-10, -53], hip: [-3, -27], lKnee: [15, -14], lFoot: [7, 0], rKnee: [19, -15], rFoot: [13, 0], lElbow: [-2, -71], lHand: [2, -88], rElbow: [-21, -58], rHand: [-24, -72], r: -112 },
    { t: .2, head: [-4, -78], neck: [-2, -68], hip: [2, -41], lKnee: [8, -22], lFoot: [6, -5], rKnee: [12, -22], rFoot: [13, -5], lElbow: [8, -64], lHand: [12, -55], rElbow: [-11, -74], rHand: [-13, -60], r: 96 },
    { t: .36, head: [7, -97], neck: [11, -86], hip: [8, -58], lKnee: [4, -39], lFoot: [-1, -22], rKnee: [12, -39], rFoot: [10, -20], lElbow: [17, -73], lHand: [13, -65], rElbow: [16, -104], rHand: [20, -119], r: -76 },
    { t: .72, head: [43, -63], neck: [37, -57], hip: [24, -36], lKnee: [11, -31], lFoot: [-3, -37], rKnee: [30, -18], rFoot: [33, 0], lElbow: [31, -48], lHand: [37, -43], rElbow: [33, -46], rHand: [25, -34], r: 205 },
    { t: 1, head: [35, -72], neck: [32, -62], hip: [25, -37], lKnee: [21, -19], lFoot: [18, 0], rKnee: [32, -19], rFoot: [35, 0], lElbow: [38, -53], lHand: [43, -46], rElbow: [33, -50], rHand: [29, -38], r: 210 },
  ];
  var JOINTS = ["head", "neck", "hip", "lKnee", "lFoot", "rKnee", "rFoot", "lElbow", "lHand", "rElbow", "rHand"];
  var CONTACT = .36, SERVE_MS = 720, FLIGHT_MS = 700;
  function easeInOut(u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
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

  var cv = document.createElement("canvas");
  cv.className = "hero-serve";
  cv.setAttribute("aria-hidden", "true");
  hero.appendChild(cv);
  var ctx = cv.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  function size() {
    var r = hero.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    cv.style.width = r.width + "px"; cv.style.height = r.height + "px";
  }

  /* Where he stands: the right of the words' column, on the court's near
     baseline (590/620 of the hero's height). Facing the headline. */
  function stage() {
    var hr = hero.getBoundingClientRect();
    var text = document.querySelector(".hero-text");
    var tr = text ? text.getBoundingClientRect() : hr;
    var x = Math.min(tr.right - 90, hr.width - 120);
    var y = hr.height * (590 / 620) - 6;
    var ball = document.querySelector(".ball-o-ball");
    var br = ball ? ball.getBoundingClientRect() : null;
    var d = br ? br.width : 40;
    var target = br ? [br.left - hr.left + d / 2, br.top - hr.top + d / 2 - d * 1.7] : null;
    return { x: x, y: y, d: d, target: target, facingLeft: !target || target[0] < x };
  }

  function drawPlayer(p, s, flip, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(s.x, s.y);
    if (flip) ctx.scale(-1, 1);
    var k = 1.3;
    var P = function (j) { return [p[j][0] * k, p[j][1] * k]; };
    var segs = [["hip", "neck"], ["neck", "lElbow"], ["lElbow", "lHand"], ["neck", "rElbow"], ["rElbow", "rHand"], ["hip", "lKnee"], ["lKnee", "lFoot"], ["hip", "rKnee"], ["rKnee", "rFoot"]];
    var pass = function (color, w) {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.fillStyle = color;
      ctx.beginPath();
      segs.forEach(function (sg) { var a = P(sg[0]), b = P(sg[1]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); });
      ctx.stroke();
      var h = P("head"); ctx.beginPath(); ctx.arc(h[0], h[1], 7.2 * k, 0, Math.PI * 2); ctx.fill();
      var hand = P("rHand"), a = p.r * Math.PI / 180;
      var tip = [hand[0] + Math.cos(a) * 14 * k, hand[1] + Math.sin(a) * 14 * k];
      ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
      var hc = [hand[0] + Math.cos(a) * 23 * k, hand[1] + Math.sin(a) * 23 * k];
      ctx.beginPath(); ctx.ellipse(hc[0], hc[1], 9 * k, 6.5 * k, a, 0, Math.PI * 2); ctx.stroke();
    };
    pass(HALO, 6.5);
    pass(INK, 2.6);
    ctx.restore();
  }
  function racketTip(p, s, flip) {
    var k = 1.3, hand = p.rHand, a = p.r * Math.PI / 180;
    var x = (hand[0] + Math.cos(a) * 23) * k, y = (hand[1] + Math.sin(a) * 23) * k;
    return [s.x + (flip ? -x : x), s.y + y];
  }
  function drawBall(x, y, d) {
    ctx.save();
    ctx.fillStyle = BALL; ctx.beginPath(); ctx.arc(x, y, d / 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1.2, d * .07); ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(x - d * .22, y, d * .36, -1.1, 1.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + d * .22, y, d * .36, Math.PI - 1.1, Math.PI + 1.1); ctx.stroke();
    ctx.restore();
  }

  /* Wait for the words to be in (the "o" has to be where it will stay),
     then play. */
  var head = slot.closest(".hero-drop");
  var done = false;
  function release() { if (done) return; done = true; window.dispatchEvent(new Event("lee:arrival-ball")); }
  window.setTimeout(release, 4000);               // never hold the page's ball hostage

  function play() {
    size();
    var s = stage();
    if (!s.target) { release(); cv.remove(); return; }
    var flip = s.facingLeft;
    var t0 = null, contactPt = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      var t = now - t0;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.save(); ctx.scale(dpr, dpr);
      var u = Math.min(1, t / SERVE_MS);
      var p = poseAt(u);
      var alpha = t < SERVE_MS + 500 ? 1 : Math.max(0, 1 - (t - SERVE_MS - 500) / 450);
      drawPlayer(p, s, flip, alpha);
      if (u < CONTACT) {
        /* the toss: the ball hangs above the contact point, dropping into it */
        var c = racketTip(poseAt(CONTACT), s, flip);
        drawBall(c[0], c[1] - 28 * (1 - u / CONTACT), s.d);
      } else {
        if (!contactPt) contactPt = racketTip(p, s, flip);
        var f = Math.min(1, (t - CONTACT * SERVE_MS) / FLIGHT_MS);
        var e = easeInOut(f);
        var mx = (contactPt[0] + s.target[0]) / 2, my = Math.min(contactPt[1], s.target[1]) - 180;
        var x = (1 - e) * (1 - e) * contactPt[0] + 2 * (1 - e) * e * mx + e * e * s.target[0];
        var y = (1 - e) * (1 - e) * contactPt[1] + 2 * (1 - e) * e * my + e * e * s.target[1];
        if (f < 1) drawBall(x, y, s.d); else release();
      }
      ctx.restore();
      if (t < SERVE_MS + 950) window.requestAnimationFrame(frame); else cv.remove();
    }
    window.requestAnimationFrame(frame);
  }
  function whenIn() {
    if (head.classList.contains("is-in")) window.setTimeout(play, 650);
    else new MutationObserver(function (_, obs) {
      if (!head.classList.contains("is-in")) return;
      obs.disconnect();
      window.setTimeout(play, 650);
    }).observe(head, { attributes: true, attributeFilter: ["class"] });
  }
  if (document.readyState === "complete") whenIn(); else window.addEventListener("load", whenIn, { once: true });
})();
