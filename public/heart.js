/* ============================================================================
   The heart: "Like this if you like my site", at the foot of the tennis
   page and of the portfolio. A plain-JavaScript port of React Bits' Pulse
   Heart (reactbits.dev/micro/pulse-heart): press it and the heart shrinks
   to a dot, fills, and springs back past its size while the pill beats and
   the count rolls up a digit.

   Markup (the text is the button's name, so it is translated with the page):
     <div class="like" data-like="tennis" hidden>
       <span class="like-text" id="likeText">Like this if you like my site</span>
     </div>
   This script adds the button after the text and unhides the block, so
   without JavaScript nothing shows. data-like names the site's total on the
   Worker (GET/POST /likes). The visitor's own like is kept on this device
   (localStorage) so the heart stays filled on their next visit. The count
   shows only once it reaches data-like-min (default 5): a heart that says
   "1" reads worse than one that says nothing. If the Worker can't be
   reached the heart still works, it just shows no number.

   Shared by both sites (/heart.js, /heart.css); each page colours it with
   the --ph-* properties in heart.css.
   ========================================================================== */

(function () {
  "use strict";

  var boxes = document.querySelectorAll(".like[data-like]");
  if (!boxes.length) return;

  /* The Worker, from the page's jev-endpoint meta like every other script;
     on localhost ?local reads from a Worker run locally on :8787. */
  var meta = document.querySelector('meta[name="jev-endpoint"]');
  var base = meta && /^https?:\/\//.test(meta.content) ? meta.content.replace(/\/$/, "") : "";
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && /[?&]local\b/.test(location.search)) base = "http://localhost:8787";
  var lang = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
  var page = /^(es|ko|zh-hans|zh-hant|ja|vi|fa)$/.test(lang) ? lang : "en";

  var HEART = "M2 8.69444C2 13.0348 7.58942 17.858 10.4107 19.9677C11.3601 20.6776 12.6399 20.6776 13.5893 19.9677C16.4106 17.858 22 13.0348 22 8.69444C22 5.82563 19.8947 3.5 17 3.5C15.5 3.5 14 4 12 6C10 4 8.5 3.5 7 3.5C4.10526 3.5 2 5.82563 2 8.69444Z";
  /* The component's own timing: 560ms, the heart down to 30% by 40% of
     the way through, then back with a 1.7 overshoot; the pill beats 3%. */
  var DURATION = 560, OUT = 0.4, DOT = 0.3, OVERSHOOT = 1.7, BEAT = 3, ROLL = 350;

  function reduced() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function back(k, c) { var u = k - 1; return 1 + (c + 1) * u * u * u + c * u * u; }
  function swellOf(t, c) { return t <= 0 ? 0 : t < OUT ? 1 - Math.pow(1 - t / OUT, 3) : 1 - back((t - OUT) / (1 - OUT), c); }
  var fmt = window.Intl && Intl.NumberFormat ? new Intl.NumberFormat(document.documentElement.lang || undefined) : null;
  function format(n) { return fmt ? fmt.format(n) : String(n); }
  function store(key, value) {
    try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch (e) { return null; }
  }

  function api(site, on) {
    if (!base || !window.fetch) return Promise.reject(new Error("no endpoint"));
    var req = on === undefined
      ? fetch(base + "/likes?site=" + encodeURIComponent(site))
      : fetch(base + "/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site: site, on: on, page: page }) });
    return req.then(function (r) { if (!r.ok) throw new Error("likes " + r.status); return r.json(); })
      .then(function (j) { if (typeof j.count !== "number") throw new Error("likes"); return j.count; });
  }

  Array.prototype.forEach.call(boxes, function (box, index) {
    var site = box.getAttribute("data-like");
    var min = parseInt(box.getAttribute("data-like-min") || "5", 10);
    var key = "leeLike:" + site;
    var text = box.querySelector(".like-text");
    if (text && !text.id) text.id = "likeText" + index;

    var liked = store(key) === "1";
    var count = null;               // null until the Worker answers

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pulse-heart";
    if (text) btn.setAttribute("aria-labelledby", text.id);
    btn.innerHTML =
      '<span class="pulse-heart__pill">' +
        '<span class="pulse-heart__heart" aria-hidden="true"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path d="' + HEART + '" vector-effect="non-scaling-stroke"/></g></svg></span>' +
        '<span class="pulse-heart__count" aria-hidden="true"></span>' +
      '</span>' +
      '<span class="pulse-heart__sr" id="likeCount' + index + '"></span>';
    var pill = btn.querySelector(".pulse-heart__pill");
    var heart = btn.querySelector(".pulse-heart__heart");
    var glyph = btn.querySelector("g");
    var countEl = btn.querySelector(".pulse-heart__count");
    var sr = btn.querySelector(".pulse-heart__sr");
    btn.setAttribute("aria-describedby", sr.id);
    box.appendChild(btn);
    box.hidden = false;

    var raf = 0, rollTimer = 0, viaPointer = false;

    /* The number, as plain digits or with one slot rolling between two. */
    function paintCount(from, to) {
      var visible = to !== null && to >= min;
      btn.toggleAttribute("data-no-count", !visible);
      sr.textContent = visible ? format(to) : "";
      if (!visible) { countEl.textContent = ""; return; }
      var b = format(to);
      if (from === null || from === to || from < min || reduced()) { countEl.textContent = b; return; }
      var a = format(from), up = to > from, at = -1;
      if (a.length === b.length) {
        var diff = [];
        for (var i = 0; i < b.length; i++) if (a[i] !== b[i]) diff.push(i);
        if (diff.length === 1) at = diff[0];
      }
      function slot(top, bottom) {
        return '<span class="pulse-heart__slot"><span class="pulse-heart__roll"><span>' + top + "</span><span>" + bottom + "</span></span></span>";
      }
      countEl.innerHTML = at === -1
        ? slot(up ? a : b, up ? b : a)
        : b.split("").map(function (ch, i) { return i === at ? slot(up ? a[i] : ch, up ? ch : a[i]) : "<span>" + ch + "</span>"; }).join("");
      var roll = countEl.querySelector(".pulse-heart__roll");
      roll.style.transition = "none";
      roll.style.transform = "translateY(" + (up ? "0" : "-1em") + ")";
      roll.getBoundingClientRect();
      roll.style.transition = "";
      roll.style.transform = "translateY(" + (up ? "-1em" : "0") + ")";
      clearTimeout(rollTimer);
      rollTimer = setTimeout(function () { countEl.textContent = b; }, ROLL);
    }

    function paintLiked(on) {
      btn.setAttribute("data-liked", String(on));
      btn.setAttribute("aria-pressed", String(on));
    }

    paintLiked(liked);
    paintCount(null, count);

    /* The pulse: the heart shrinks to a dot, the fill swaps in at the
       bottom of the dip, and it springs back past full size. */
    function pulse(onSwap) {
      btn.setAttribute("data-running", "");
      var swapped = false, prev = 0, t0 = performance.now();
      function tick(now) {
        var t = Math.min(1, (now - t0) / DURATION);
        var step = prev ? now - prev : 1000 / 60;
        prev = now;
        var s = swellOf(t, OVERSHOOT);
        glyph.setAttribute("transform", "translate(12 12) scale(" + (1 - (1 - DOT) * s) + ") translate(-12 -12)");
        pill.style.transform = "scale(" + (1 - (BEAT / 100) * s) + ")";
        if (!swapped && t + step / 2 / DURATION >= OUT) { swapped = true; onSwap(); }
        if (t < 1) { raf = requestAnimationFrame(tick); return; }
        raf = 0;
        glyph.removeAttribute("transform");
        pill.style.transform = "";
        btn.removeAttribute("data-running");
      }
      raf = requestAnimationFrame(tick);
    }

    btn.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      viaPointer = true;
      if (!reduced()) btn.setAttribute("data-pressed", "");
    });
    function release() { btn.removeAttribute("data-pressed"); }
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("pointercancel", function () { viaPointer = false; release(); });
    btn.addEventListener("keydown", function () { viaPointer = false; });

    btn.addEventListener("click", function (e) {
      if (raf) return;
      var pointer = viaPointer && e.detail !== 0;
      viaPointer = false;
      liked = !liked;
      store(key, liked ? "1" : "0");
      var before = count;
      if (count !== null) count = Math.max(0, count + (liked ? 1 : -1));
      var after = count, on = liked;
      function swap() { paintLiked(on); paintCount(before, after); }
      if (pointer && !reduced()) pulse(swap); else swap();
      /* The Worker's total wins once it answers; until then the guess stands. */
      api(site, on).then(function (n) {
        var shown = count;
        count = n;
        if (!raf) paintCount(shown, n);
        else setTimeout(function () { paintCount(shown, n); }, DURATION);
      }).catch(function () {});
    });

    /* The total is fetched when the heart comes near the screen, not on
       every page load: most visitors never scroll to the foot. */
    function load() {
      api(site).then(function (n) { count = n; paintCount(null, n); }).catch(function () {});
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); load(); }
      }, { rootMargin: "400px 0px" });
      io.observe(box);
    } else {
      load();
    }
  });
})();
