/* ============================================================================
   The rally game on the not-found page.

   "Play a rally" under the words swaps the scene for a court seen from
   above, drawn on a canvas: a ball in the page's optic yellow, a racket
   you move with the pointer (or a finger) along the near baseline, and
   the far wall it comes back from. Keep it in play and the count goes up;
   each return is a touch quicker. Miss and it's out: the best streak is
   kept on this device. Words come from the page's own table (window.NF.t:
   play, rally, best, out, serve). Sound is the site's ball "pok",
   synthesized, obeying the one mute (askIsaacSound = "off"). The Persian
   page mirrors nothing here: a court is the same both ways.
   ========================================================================== */

(function () {
  "use strict";

  var NF = window.NF, t = NF && NF.t;
  var link = document.querySelector("[data-rally]");
  var scene = document.querySelector(".nf-scene");
  if (!t || !link || !scene || !window.requestAnimationFrame) return;
  link.hidden = false;

  var INK = "#111111", BALL = "#d9ef3f", LINE = "#cfcfcf";
  var stage, cv, ctx, running = false, raf = 0;
  var G = null;
  var best = 0;
  try { best = parseInt(localStorage.getItem("leeRallyBest") || "0", 10) || 0; } catch (e) {}

  /* ---------------------------------------------------------- Sound -- */
  var ac = null;
  function muted() { try { return localStorage.getItem("askIsaacSound") === "off"; } catch (e) { return false; } }
  function pok(hi) {
    if (muted()) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      var o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime;
      o.type = "sine"; o.frequency.setValueAtTime(hi ? 520 : 300, now); o.frequency.exponentialRampToValueAtTime(hi ? 240 : 120, now + .09);
      g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(.35, now + .006); g.gain.exponentialRampToValueAtTime(.0001, now + .12);
      o.connect(g); g.connect(ac.destination); o.start(now); o.stop(now + .14);
    } catch (e) {}
  }

  /* ----------------------------------------------------------- Game -- */
  function reset() {
    G = { x: .5, y: .35, vx: .0035 * (Math.random() < .5 ? -1 : 1), vy: .006, px: .5, streak: 0, live: false, msg: t.serve };
  }
  function serve() { reset(); G.live = true; G.msg = ""; }
  function step() {
    if (!G.live) return;
    G.x += G.vx; G.y += G.vy;
    if (G.x < .05) { G.x = .05; G.vx = Math.abs(G.vx); pok(false); }
    if (G.x > .95) { G.x = .95; G.vx = -Math.abs(G.vx); pok(false); }
    if (G.y < .08) { G.y = .08; G.vy = Math.abs(G.vy); pok(false); }
    var padY = .86, half = .09;
    if (G.vy > 0 && G.y >= padY - .02 && G.y <= padY + .02 && Math.abs(G.x - G.px) <= half) {
      G.vy = -Math.abs(G.vy) * 1.035;
      G.vx += (G.x - G.px) * .05;
      G.vx = Math.max(-.012, Math.min(.012, G.vx));
      G.y = padY - .025;
      G.streak++;
      if (G.streak > best) { best = G.streak; try { localStorage.setItem("leeRallyBest", String(best)); } catch (e) {} }
      pok(true);
    }
    if (G.y > 1.04) { G.live = false; G.msg = t.out; pok(false); }
  }

  function draw() {
    var dpr = window.devicePixelRatio || 1, W = cv.width, H = cv.height, s = dpr;
    ctx.clearRect(0, 0, W, H);
    /* the court: a far wall, side lines, the service line */
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5 * s;
    ctx.strokeRect(.05 * W, .08 * H, .9 * W, .92 * H);
    ctx.beginPath(); ctx.moveTo(.05 * W, .5 * H); ctx.lineTo(.95 * W, .5 * H); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(.05 * W, .08 * H); ctx.lineTo(.95 * W, .08 * H); ctx.stroke();
    /* the racket: a short handle and a head, under the pointer */
    var px = G.px * W, py = .86 * H;
    ctx.save(); ctx.translate(px, py); ctx.strokeStyle = INK; ctx.fillStyle = "#fff"; ctx.lineWidth = 2.6 * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.ellipse(0, 0, .09 * W, 6 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 6 * s); ctx.lineTo(0, 24 * s); ctx.stroke();
    ctx.restore();
    /* the ball */
    ctx.fillStyle = BALL; ctx.beginPath(); ctx.arc(G.x * W, G.y * H, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2 * s;
    ctx.beginPath(); ctx.arc(G.x * W - 3 * s, G.y * H, 5 * s, -1.1, 1.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(G.x * W + 3 * s, G.y * H, 5 * s, Math.PI - 1.1, Math.PI + 1.1); ctx.stroke();
    /* the count */
    ctx.fillStyle = INK; ctx.font = "600 " + (15 * s) + "px " + getComputedStyle(document.body).fontFamily; ctx.textBaseline = "top";
    var rtl = document.documentElement.dir === "rtl";
    ctx.textAlign = rtl ? "right" : "left";
    var x0 = rtl ? .95 * W - 10 * s : .05 * W + 10 * s;
    ctx.fillText(t.rally + " " + G.streak + "   " + t.best + " " + best, x0, .08 * H + 10 * s);
    if (G.msg) { ctx.textAlign = "center"; ctx.fillStyle = "#5e5e5e"; ctx.font = (14 * s) + "px " + getComputedStyle(document.body).fontFamily; ctx.fillText(G.msg, .5 * W, .5 * H + 14 * s); }
  }
  function loop() { if (!running) return; step(); draw(); raf = window.requestAnimationFrame(loop); }

  function size() {
    var r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  }

  function start() {
    if (!stage) {
      stage = document.createElement("div");
      stage.className = "nf-rally";
      cv = document.createElement("canvas");
      cv.setAttribute("aria-hidden", "true");
      stage.appendChild(cv);
      scene.parentNode.insertBefore(stage, scene.nextSibling);
      ctx = cv.getContext("2d");
      var move = function (e) { var r = stage.getBoundingClientRect(); G.px = Math.max(.14, Math.min(.86, (e.clientX - r.left) / r.width)); };
      stage.addEventListener("pointermove", move, { passive: true });
      stage.addEventListener("pointerdown", function (e) { move(e); if (!G.live) serve(); });
      window.addEventListener("resize", function () { if (running) { size(); draw(); } });
    }
    scene.classList.add("nf-off");      // (the scene's [hidden] is overridden by its own css)
    stage.hidden = false;
    link.hidden = true;
    reset(); size(); running = true; loop();
  }
  link.addEventListener("click", start);
})();
