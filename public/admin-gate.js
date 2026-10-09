/* ============================================================================
   The admin page's gate (/admin/): asks for the stats key before the page.

   The key is checked by the Worker (GET /stats with it, the same check the
   numbers page uses), so it never lives in the page:
     · right (200): the key is remembered for the numbers page, the ascend
       scene plays (a stick figure rises with two rackets and unlocks the
       lock), and the gate lifts like a curtain onto the admin page;
     · wrong (401): the explode scene plays (the lock blows apart) and the
       visitor is sent back where they came from;
     · too many tries (429), not set up (503) or no connection: a plain
       line under the field, and nothing blows up.

   The two scenes are separate files (admin-explode.js, admin-ascend.js).
   Each registers on window.AdminFX and returns a promise that settles when
   its scene is done; it gets this page's pieces and a sound context:

     AdminFX.explode(scene) / AdminFX.ascend(scene), where scene is
       { gate, card, lock, layer, audio(), reduced }
       gate   the full-screen gate element
       card   the centred column (lock, title, form)
       lock   the padlock <svg> (.gate-shackle, .gate-body, .gate-hole)
       layer  an empty full-screen element on top, for the scene to draw in
       audio  a function returning a running AudioContext, or null when
              sounds are muted
       reduced  true when the visitor prefers reduced motion
       onSkip   onSkip(fn): fn runs once if the visitor skips (a tap,
                Enter, Escape or Space, from 600 ms in; the right-key
                scene only), so the scene can jump to its payoff

   If a scene is missing or fails, the gate still works: wrong keys still
   send you back, right keys still open it.

   On localhost only, ?demo=right or ?demo=wrong plays a scene without a
   key (and a wrong demo stays on the page), for working on the scenes.
   ========================================================================== */

(function () {
  "use strict";

  var gate = document.getElementById("gate");
  var form = document.getElementById("gateForm");
  if (!gate || !form || !window.fetch) { if (gate) gate.classList.add("is-gone"); return; }

  var card = document.getElementById("gateCard");
  var lock = document.getElementById("gateLock");
  var input = document.getElementById("gateKey");
  var go = form.querySelector(".gate-go");
  var note = document.getElementById("gateNote");
  var soundBtn = document.getElementById("gateSound");
  var content = document.getElementById("adminContent");
  var forget = document.getElementById("adminLock");

  var KEY_STORE = "lee-stats-key";      // the numbers page reads the same one
  var SOUND_STORE = "askIsaacSound";     // the site's one mute setting
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var demo = LOCAL ? (location.search.match(/[?&]demo=(right|wrong)\b/) || [])[1] : null;
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var NOTE = note.textContent;
  var busy = false;

  document.body.classList.add("is-gated");
  document.documentElement.classList.add("is-gated");
  content.setAttribute("aria-hidden", "true");
  input.focus();

  /* ------------------------------------------------------------- Sound --
     One AudioContext, made on the first key press or click (browsers only
     allow sound after one). Muting is the site's shared setting, so the
     chat, Book and this gate are all quiet together. */
  var ac = null;
  function muted() { try { return localStorage.getItem(SOUND_STORE) === "off"; } catch (e) { return false; } }
  function audio() {
    if (muted()) return null;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      if (!ac) ac = new AC();
      if (ac.state === "suspended") ac.resume();
    } catch (e) { return null; }
    return ac;
  }
  function setSoundButton() {
    var off = muted();
    soundBtn.setAttribute("aria-pressed", String(off));
    soundBtn.setAttribute("aria-label", off ? "Turn sounds on" : "Mute sounds");
  }
  setSoundButton();
  soundBtn.addEventListener("click", function () {
    var off = !muted();
    try { localStorage.setItem(SOUND_STORE, off ? "off" : "on"); } catch (e) { /* fine */ }
    setSoundButton();
    if (!off) tick(1.6);
  });

  /* A soft click for each character typed: a tiny filtered noise tap,
     like a key on a good keyboard. */
  function tick(gain) {
    var c = audio();
    if (!c) return;
    var t = c.currentTime;
    var len = Math.floor(c.sampleRate * 0.03);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    var src = c.createBufferSource();
    src.buffer = buf;
    var bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600 + Math.random() * 900;
    bp.Q.value = 1.2;
    var g = c.createGain();
    g.gain.value = 0.18 * (gain || 1);
    src.connect(bp).connect(g).connect(c.destination);
    src.start(t);
  }
  input.addEventListener("input", function () {
    if (note.classList.contains("is-strong")) { note.classList.remove("is-strong"); note.textContent = NOTE; }
    tick();
  });

  /* ------------------------------------------------------------- Check -- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var key = input.value.trim();
    if (!key && !demo) { say("Type the key first.", true); input.focus(); return; }
    audio();                       // unlock sound inside the click
    busy = true;
    go.disabled = true;
    go.textContent = "Checking…";
    gate.classList.add("is-checking");

    check(key).then(function (result) {
      gate.classList.remove("is-checking");
      /* Whatever happens next, the button is itself again, not a grey
         "Checking…" (it may be thrown across the screen). busy still
         stops a second submit. */
      go.textContent = "Unlock";
      go.disabled = false;
      go.setAttribute("aria-disabled", "true");
      if (result === "right") return right(key);
      if (result === "wrong") return wrong();
      busy = false;
      go.removeAttribute("aria-disabled");
      if (result === "busy") say("Too many tries. Wait a minute, then try again.", true);
      else if (result === "unset") say("The key isn't set up yet. Run the STATS_KEY command from the README first.", true);
      else say("Couldn't reach the site's server. Check the connection and try again.", true);
    });
  });

  function check(key) {
    if (demo) return new Promise(function (r) { setTimeout(function () { r(demo); }, 500); });
    return fetch(base() + "/stats", { headers: { Authorization: "Bearer " + key } })
      .then(function (r) {
        if (r.status === 200) return "right";
        if (r.status === 401) return "wrong";
        if (r.status === 429) return "busy";
        if (r.status === 503) return "unset";
        return "error";
      }, function () { return "error"; });
  }

  function base() {
    if (LOCAL) return "http://localhost:8787";
    return "https://lee-tennis-jev.leetennis.workers.dev";
  }

  function say(text, strong) {
    note.textContent = text;
    note.classList.toggle("is-strong", !!strong);
  }

  /* --------------------------------------------------------- Endings -- */
  function scene(skippable) {
    var layer = document.createElement("div");
    layer.className = "gate-fx";
    layer.setAttribute("aria-hidden", "true");
    gate.appendChild(layer);
    var skips = [];
    var s = { gate: gate, card: card, lock: lock, layer: layer, audio: audio, reduced: reduced,
      onSkip: function (fn) { skips.push(fn); } };
    /* Skipping: Isaac sees the reward every visit, so from 600 ms in a tap
       or Enter, Escape or Space jumps the scene to its payoff. */
    if (skippable) {
      var armed = false, used = false;
      setTimeout(function () { armed = true; }, 600);
      var skip = function (e) {
        if (!armed || used) return;
        if (e.type === "keydown" && ["Enter", "Escape", " ", "Spacebar"].indexOf(e.key) < 0) return;
        used = true;
        if (e.type === "keydown") e.preventDefault();
        skips.forEach(function (fn) { try { fn(); } catch (err) { /* the scene carries on */ } });
      };
      gate.addEventListener("pointerdown", skip);
      document.addEventListener("keydown", skip);
      s.stopSkip = function () {
        gate.removeEventListener("pointerdown", skip);
        document.removeEventListener("keydown", skip);
      };
    }
    return s;
  }

  /* A scene gets at most this long; after that the gate moves on anyway. */
  function play(name) {
    var fx = window.AdminFX && window.AdminFX[name];
    var s = scene(name === "ascend");
    var run;
    try { run = fx ? Promise.resolve(fx(s)) : Promise.resolve(); } catch (err) { run = Promise.resolve(); }
    var cap = new Promise(function (r) { setTimeout(r, 7000); });
    return Promise.race([run.catch(function () {}), cap]).then(function () {
      if (s.stopSkip) s.stopSkip();
      return s;
    });
  }

  function right(key) {
    try { localStorage.setItem(KEY_STORE, key); } catch (e) { /* the numbers page will just ask */ }
    say("Unlocked.", true);
    return play("ascend").then(function (s) {
      document.body.classList.remove("is-gated");
      document.documentElement.classList.remove("is-gated");
      content.removeAttribute("aria-hidden");
      content.classList.add("is-arriving");
      gate.classList.add("is-open");
      if (forget) forget.hidden = false;
      setTimeout(function () {
        gate.classList.add("is-gone");
        if (s.layer.parentNode) s.layer.parentNode.removeChild(s.layer);
        var h = content.querySelector("h1");
        if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
      }, reduced ? 450 : 950);
    });
  }

  /* The wrong-key ending: the explosion, then the last word stamped into
     the middle while the debris still falls, then the whole gate slides
     off to the left (back) and the visitor goes back where they came from. */
  function wrong() {
    say("Wrong key.", true);
    return play("explode").then(function () {
      card.style.transition = "opacity .3s ease";
      card.style.opacity = "0";
      var after = document.createElement("p");
      after.className = "gate-after";
      after.setAttribute("role", "status");
      after.setAttribute("tabindex", "-1");
      after.textContent = "Wrong key. Sending you back…";
      gate.appendChild(after);
      requestAnimationFrame(function () {
        after.classList.add("is-in");
        after.focus({ preventScroll: true });
        thud();
      });
      setTimeout(function () {
        gate.classList.add("is-leaving");
        setTimeout(function () {
          if (demo) location.reload();             // stay, for working on the scene
          else location.replace(backTo());
        }, reduced ? 250 : 340);
      }, 220 + 650);
    });
  }

  /* The stamp's sound: a short, low thud under the line landing. */
  function thud() {
    var c = audio();
    if (!c) return;
    var t = c.currentTime;
    var o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.25);
  }

  /* Back where they came from on this site, or to the front page. */
  function backTo() {
    try {
      var ref = new URL(document.referrer);
      if (ref.origin === location.origin && !/\/admin\/?$/.test(ref.pathname)) return ref.pathname + ref.search;
    } catch (e) { /* no referrer */ }
    return "/";
  }

  /* -------------------------------------------- Forget on this device --
     The numbers page remembers the key once the gate has seen it; this
     clears that, so the next visit to the numbers page asks again. */
  if (forget) {
    forget.addEventListener("click", function () {
      try { localStorage.removeItem(KEY_STORE); } catch (e) { /* fine */ }
      forget.textContent = "Forgotten on this device";
      forget.disabled = true;
    });
  }

  if (demo) input.value = "demo-key";
})();
