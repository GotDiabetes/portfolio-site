/* ============================================================================
   More, October 19 2026 (styles in more.css). Isaac asked for every idea
   on the list, so this file carries the lot, each piece on its own and
   each skipping itself when the page lacks its markup:

     M1  Magnetic buttons: on a fine pointer the Book buttons lean a few
         pixels toward the pointer as it nears and snap back after.
     M5  The score: a small Love · 15 · 30 · 40 · Game in the header that
         follows how far down the page the reader is.
     I1  The court you'll learn on: hover or tap a part of the drawn court
         and the note beside it says what is worked on there.
     I2  The package builder: a lesson and a number of times a week, and
         the month's price rolls to the total, with the real rates.
     I3  The racket spin (tips page): tap, it spins, and lands Up or Down.
     I4  The photo pile: on a wide screen with a mouse the three photos sit
         in a loose pile that can be dragged about; a drag never opens the
         lightbox, a click still does.
     I5  The floodlight: on the black bands (and the hero in dark mode) a
         soft light follows the pointer.
     U1  The daylight bar: how much court daylight is left today, from the
         Worker's /court (sunrise and sunset for the court).
     U2  The lesson countdown: once a booking is made the lesson's time and
         a live "in 2 days" sit in a small card with an Add to calendar
         (.ics) link, remembered until the lesson has passed.
     U3  Keyboard shortcuts: B books, T opens the tips, D flips dark mode,
         ? lists them. Never while typing in a field.
     U4  The motion switch in the header: stores leeMotion=reduce, which
         the head script turns into the reduced-motion signal every script
         and stylesheet already honours, then reloads.
     U5  The tab: its title asks the reader back while they are away, and
         the favicon ball bounces once when they return.
     N1  Before and after: a drag handle between two photos or clips, once
         the figure's data-before and data-after name them.
     N3  The numbers: count-up figures, once each data-count has one.

   Words come from window.I18N on the translated pages; English is the
   fallback here. Nothing here runs under ?classic.
   ========================================================================== */

(function () {
  "use strict";

  var T = window.I18N || {};
  var root = document.documentElement;
  var lang = (root.getAttribute("lang") || "en").toLowerCase();
  var folder = /^(es|ko|zh-hans|zh-hant|ja|vi|fa)$/.test(lang) ? "/" + lang : "";
  var locale = root.getAttribute("lang") || "en";
  var classic = root.classList.contains("classic");
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var fine = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var meta = document.querySelector('meta[name="jev-endpoint"]');
  var base = meta && /^https?:\/\//.test(meta.content) ? meta.content.replace(/\/$/, "") : "";
  if (local && /[?&]local\b/.test(location.search)) base = "http://localhost:8787";
  var TZ = "America/Los_Angeles";
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return k in o ? o[k] : m; }); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  /* ------------------------------------------ U4. The motion switch -- */
  var motionBtn = document.querySelector("[data-motion-toggle]");
  if (motionBtn) {
    var off = root.classList.contains("reduce-motion");
    motionBtn.setAttribute("aria-pressed", off ? "true" : "false");
    motionBtn.setAttribute("aria-label", off ? (T.motionOn || "Turn animations on") : (T.motionOff || "Turn animations off"));
    motionBtn.addEventListener("click", function () {
      try { if (off) localStorage.removeItem("leeMotion"); else localStorage.setItem("leeMotion", "reduce"); } catch (e) {}
      location.reload();
    });
  }

  /* ------------------------------------------ U3. Keyboard shortcuts -- */
  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && t.closest && t.closest("input, textarea, select, [contenteditable]")) return;
    var is = function (code, re) { return e.code === code || re.test(e.key); };
    if (e.key === "?") {
      var opener = document.querySelector("[data-open='shortcuts']");
      var dlg = document.getElementById("shortcuts");
      if (opener && dlg && !dlg.open) { e.preventDefault(); opener.click(); }
      return;
    }
    if (document.querySelector("dialog[open]")) return;
    if (is("KeyB", /^[bB]$/)) {
      var cta = document.querySelector(".header-cta") || document.querySelector("[data-cal-link]");
      if (cta) { e.preventDefault(); cta.click(); }
    } else if (is("KeyT", /^[tT]$/)) {
      if (!/\/tips\/?$/.test(location.pathname)) location.href = folder + "/tips/";
    } else if (is("KeyD", /^[dD]$/)) {
      var tg = document.querySelector("[data-theme-toggle]");
      if (tg) tg.click();
    }
  });

  /* ------------------------------------------------- U5. The tab -- */
  (function () {
    var away = T.titleAway || "Come back and book a lesson";
    var icon = document.querySelector('link[rel="icon"]');
    var icon0 = icon ? icon.getAttribute("href") : "", title0 = document.title, timer = 0;
    function frame(dy) {
      return "data:image/svg+xml," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="' + (18 + dy) + '" r="10.5" fill="#d9ef3f"/>' +
        '<path d="M8.5 ' + (12.5 + dy) + 'c4.5 2.4 10.5 2.4 15 0M8.5 ' + (23.5 + dy) + 'c4.5-2.4 10.5-2.4 15 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>');
    }
    var frames = [-4, -7, -8, -6, -2, 0].map(frame);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { title0 = document.title; document.title = away; return; }
      document.title = title0;
      if (!icon || reduced || classic) return;
      window.clearInterval(timer);
      var i = 0;
      timer = window.setInterval(function () {
        if (i >= frames.length) { window.clearInterval(timer); icon.setAttribute("href", icon0); return; }
        icon.setAttribute("href", frames[i++]);
      }, 90);
    });
  })();

  if (classic) return;

  /* ------------------------------------------- M1. Magnetic buttons -- */
  if (fine && !reduced) {
    var mags = Array.prototype.slice.call(document.querySelectorAll(".btn-primary, .btn-invert, .nav-book"));
    var near = null, mraf = 0, px = 0, py = 0, PULL = 30, MAX = 7;
    var magnet = function () {
      mraf = 0;
      var best = null, bd = Infinity, bx = 0, by = 0, br = null;
      for (var i = 0; i < mags.length; i++) {
        var r = mags[i].getBoundingClientRect();
        if (!r.width || r.bottom < -PULL || r.top > window.innerHeight + PULL) continue;
        var dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
        var ox = Math.max(0, Math.abs(dx) - r.width / 2), oy = Math.max(0, Math.abs(dy) - r.height / 2);
        var d = Math.sqrt(ox * ox + oy * oy);
        if (d < PULL && d < bd) { bd = d; best = mags[i]; bx = dx; by = dy; br = r; }
      }
      if (near && near !== best) { near.style.translate = ""; near.classList.remove("is-near"); }
      near = best;
      if (!best) return;
      var k = 1 - bd / PULL;
      var tx = Math.max(-MAX, Math.min(MAX, (bx / br.width) * 2 * MAX * k));
      var ty = Math.max(-MAX, Math.min(MAX, (by / br.height) * 2 * MAX * k * .7));
      best.style.translate = tx.toFixed(1) + "px " + ty.toFixed(1) + "px";
      best.classList.add("is-near");
    };
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      px = e.clientX; py = e.clientY;
      if (!mraf) mraf = window.requestAnimationFrame(magnet);
    }, { passive: true });
    var letGo = function () { if (near) { near.style.translate = ""; near.classList.remove("is-near"); near = null; } };
    document.addEventListener("pointerleave", letGo);
    window.addEventListener("blur", letGo);
    window.addEventListener("scroll", letGo, { passive: true });
  }

  /* ------------------------------------------------- M5. The score -- */
  var score = document.querySelector("[data-score]");
  if (score) {
    var STEPS = [T.scoreLove || "Love", "15", "30", "40", T.scoreGame || "Game"];
    var val = score.querySelector(".score-val") || score, cur = -1, sraf = 0;
    var setScore = function () {
      sraf = 0;
      var max = (root.scrollHeight - window.innerHeight) || 1;
      var p = Math.min(1, Math.max(0, (window.scrollY || root.scrollTop) / max));
      var i = p >= .97 ? 4 : Math.min(3, Math.floor(p * 4));
      if (i === cur) return;
      var first = cur < 0;
      cur = i;
      if (first || reduced) { val.textContent = STEPS[i]; return; }
      score.classList.add("is-flip");
      window.setTimeout(function () { val.textContent = STEPS[i]; score.classList.remove("is-flip"); }, 150);
    };
    window.addEventListener("scroll", function () { if (!sraf) sraf = window.requestAnimationFrame(setScore); }, { passive: true });
    window.addEventListener("resize", function () { cur = -1; setScore(); });
    score.hidden = false;
    setScore();
  }

  /* ------------------------------------------------- I1. The court -- */
  var court = document.querySelector("[data-court]");
  if (court) {
    var zones = court.querySelectorAll("[data-zone]"), notes = court.querySelectorAll("[data-note]");
    var chosen = court.getAttribute("data-current") || "baseline";
    var showZone = function (id) {
      court.setAttribute("data-current", id);
      each(zones, function (z) {
        var on = z.getAttribute("data-zone") === id;
        z.classList.toggle("is-on", on);
        if (z.tagName.toLowerCase() === "button") z.setAttribute("aria-pressed", on ? "true" : "false");
      });
      each(notes, function (n) { n.hidden = n.getAttribute("data-note") !== id; });
    };
    each(zones, function (z) {
      var id = z.getAttribute("data-zone");
      z.addEventListener("click", function () { chosen = id; showZone(id); });
      z.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") showZone(id); });
      z.addEventListener("focus", function () { showZone(id); });
      z.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); chosen = id; showZone(id); } });
    });
    var art = court.querySelector(".court-art");
    if (art) art.addEventListener("pointerleave", function () { showZone(chosen); });
    showZone(chosen);
  }

  /* ---------------------------------------------- I2. The builder -- */
  var builder = document.getElementById("builder");
  if (builder) {
    var RATE = { private: 80, semi: 110, hitting: 45 };   // the semi-private is $110 the hour, for the pair
    var totalEl = builder.querySelector("[data-total]"), monthEl = builder.querySelector("[data-month]"), packEl = builder.querySelector("[data-pack]");
    var shown = 0, rolling = 0;
    var roll = function (to) {
      var from = shown; shown = to;
      if (reduced || !window.requestAnimationFrame) { totalEl.textContent = "$" + to; return; }
      var t0 = performance.now(), id = ++rolling;
      var step = function (now) {
        if (id !== rolling) return;
        var p = Math.min(1, (now - t0) / 520), e = 1 - Math.pow(1 - p, 3);
        totalEl.textContent = "$" + Math.round(from + (to - from) * e);
        if (p < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };
    var calc = function () {
      var typeIn = builder.querySelector('input[name="type"]:checked'), nIn = builder.querySelector('input[name="n"]:checked');
      if (!typeIn || !nIn) return;
      var type = typeIn.value, n = +nIn.value, lessons = n * 4;
      roll(RATE[type] * lessons);
      if (monthEl) monthEl.textContent = fill(T.builderMonth || "a month, for {n} lessons", { n: lessons });
      if (packEl) {
        if (type === "private") {
          packEl.hidden = false;
          packEl.textContent = n === 1
            ? fill(T.builderPack5 || "With the 5-lesson package that's $75 a lesson: {total} a month.", { total: "$" + 75 * lessons })
            : fill(T.builderPack10 || "With the 10-lesson package that's $70 a lesson: {total} a month.", { total: "$" + 70 * lessons });
        } else packEl.hidden = true;
      }
      each(builder.querySelectorAll("[data-book]"), function (a) { a.hidden = a.getAttribute("data-book") !== type; });
      builder.classList.add("is-live");
    };
    builder.addEventListener("change", calc);
    builder.addEventListener("submit", function (e) { e.preventDefault(); });
    calc();
  }

  /* ------------------------------------------- I3. The racket spin -- */
  var spin = document.querySelector("[data-spin]");
  if (spin) {
    var racket = spin.querySelector(".spin-racket"), art2 = spin.querySelector(".spin-art"), out = spin.querySelector(".spin-result");
    var angle = 0, busy = false;
    racket.addEventListener("click", function () {
      if (busy) return;
      busy = true;
      var up = Math.random() < .5, turns = 3 + Math.floor(Math.random() * 2);
      var target = Math.round(angle / 360) * 360 + turns * 360 + (up ? 0 : 180);
      var word = up ? (T.spinUp || "Up") : (T.spinDown || "Down");
      out.textContent = "";
      spin.classList.remove("is-done");
      var done = function () { angle = target; art2.style.rotate = target + "deg"; out.textContent = word; spin.classList.add("is-done"); busy = false; };
      if (reduced || !art2.animate) { done(); return; }
      var a = art2.animate([{ rotate: angle + "deg" }, { rotate: target + "deg" }], { duration: 1900, easing: "cubic-bezier(.15, .85, .25, 1)", fill: "forwards" });
      a.onfinish = function () { done(); a.cancel(); };
    });
  }

  /* ---------------------------------------------- I4. The photo pile -- */
  var strip = document.querySelector(".photo-strip");
  var wideMQ = window.matchMedia && window.matchMedia("(min-width: 900px)");
  if (strip && fine && wideMQ && wideMQ.matches && strip.querySelectorAll(".photo").length >= 3) {
    var photos = strip.querySelectorAll(".photo");
    var LAY = [[2, 10, -6], [33, 0, 3.5], [63, 7, -2.5]];
    strip.classList.add("is-pile");
    each(photos, function (p, i) {
      var l = LAY[i % LAY.length];
      p.style.setProperty("--pl", l[0] + "%");
      p.style.setProperty("--pt", l[1] + "%");
      p.style.setProperty("--pr", l[2] + "deg");
      p.style.setProperty("--px", "0px");
      p.style.setProperty("--py", "0px");
      p.style.zIndex = i + 1;
    });
    var top = photos.length, drag = null;
    strip.addEventListener("pointerdown", function (e) {
      var p = e.target.closest && e.target.closest(".photo");
      if (!p || e.button || e.pointerType !== "mouse") return;
      drag = { el: p, x: e.clientX, y: e.clientY, ox: parseFloat(p.style.getPropertyValue("--px")) || 0, oy: parseFloat(p.style.getPropertyValue("--py")) || 0, moved: false };
      p.style.zIndex = ++top;
      try { p.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    strip.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.sqrt(dx * dx + dy * dy) > 6) { drag.moved = true; drag.el.classList.add("is-drag"); }
      if (!drag.moved) return;
      drag.el.style.setProperty("--px", (drag.ox + dx).toFixed(1) + "px");
      drag.el.style.setProperty("--py", (drag.oy + dy).toFixed(1) + "px");
    });
    var endDrag = function () {
      if (!drag) return;
      var d = drag; drag = null;
      d.el.classList.remove("is-drag");
      if (d.moved) { d.el.classList.add("no-click"); window.setTimeout(function () { d.el.classList.remove("no-click"); }, 0); }
    };
    strip.addEventListener("pointerup", endDrag);
    strip.addEventListener("pointercancel", endDrag);
    strip.addEventListener("click", function (e) {
      var p = e.target.closest && e.target.closest(".photo");
      if (p && p.classList.contains("no-click")) { e.stopPropagation(); e.preventDefault(); }
    }, true);
  }

  /* ------------------------------------------------ I5. The light -- */
  if (fine && !reduced) {
    each(document.querySelectorAll(".hero, .contact"), function (sec) {
      sec.classList.add("spot");
      sec.addEventListener("pointermove", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        var r = sec.getBoundingClientRect();
        sec.style.setProperty("--sx", (e.clientX - r.left).toFixed(0) + "px");
        sec.style.setProperty("--sy", (e.clientY - r.top).toFixed(0) + "px");
        sec.classList.add("is-lit");
      }, { passive: true });
      sec.addEventListener("pointerleave", function () { sec.classList.remove("is-lit"); });
    });
  }

  /* ------------------------------------------- U1. The daylight bar -- */
  var dayEl = document.getElementById("daylight");
  if (dayEl && (window.leeCourt || (base && window.fetch))) {
    var courtP = window.leeCourt || fetch(base + "/court", { headers: { "Accept": "application/json" } }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    var mins = function (iso) { var m = /T(\d\d):(\d\d)/.exec(iso || ""); return m ? (+m[1]) * 60 + (+m[2]) : NaN; };
    var nowMins = function () {
      var parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour12: false, hour: "2-digit", minute: "2-digit" }).formatToParts(new Date());
      var h = 0, m = 0;
      parts.forEach(function (p) { if (p.type === "hour") h = +p.value % 24; if (p.type === "minute") m = +p.value; });
      return h * 60 + m;
    };
    var unit = function (n, u) {
      try { return new Intl.NumberFormat(locale, { style: "unit", unit: u, unitDisplay: "short" }).format(n); }
      catch (e) { return n + (u === "hour" ? " h" : " min"); }
    };
    courtP.then(function (c) {
      if (!c || !c.sun) return;
      var rise = mins(c.sun.rise), set = mins(c.sun.set), now;
      try { now = nowMins(); } catch (e) { return; }
      if (!(now >= rise && now < set)) return;
      var left = set - now, frac = left / (set - rise);
      var t = left >= 60 ? unit(Math.floor(left / 60), "hour") + " " + unit(left % 60, "minute") : unit(left, "minute");
      var bar = dayEl.querySelector(".daylight-bar i"), text = dayEl.querySelector(".daylight-text");
      if (bar) bar.style.setProperty("--p", frac.toFixed(3));
      if (text) text.textContent = fill(T.daylightLeft || "{t} of daylight left at the court", { t: t });
      dayEl.hidden = false;
    });
  }

  /* --------------------------------------- U2. The lesson countdown -- */
  (function () {
    var KEY = "leeLesson";
    var read = function () { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } };
    var write = function (v) { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch (e) {} };
    var card = null, tick = 0;
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var stamp = function (d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00Z"; };
    var ics = function (L) {
      var s = new Date(L.start), e = L.end ? new Date(L.end) : new Date(s.getTime() + 36e5);
      var title = T.icsTitle || "Tennis lesson with Isaac Lee";
      var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lee Tennis Co//Lesson//EN", "BEGIN:VEVENT",
        "UID:" + (L.uid || s.getTime()) + "@leetennisco.com", "DTSTAMP:" + stamp(new Date()), "DTSTART:" + stamp(s), "DTEND:" + stamp(e),
        "SUMMARY:" + title, "LOCATION:Toscana Apartments tennis courts\\, Irvine\\, CA", "URL:https://leetennisco.com/", "END:VEVENT", "END:VCALENDAR"];
      return "data:text/calendar;charset=utf-8," + encodeURIComponent(lines.join("\r\n"));
    };
    var relative = function (ms) {
      var rtf = null;
      try { rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always" }); } catch (e) {}
      var mins = Math.round(ms / 6e4);
      var n, u;
      if (mins >= 36 * 60) { n = Math.round(mins / 1440); u = "day"; }
      else if (mins >= 60) { n = Math.round(mins / 60); u = "hour"; }
      else { n = Math.max(1, mins); u = "minute"; }
      if (rtf) return rtf.format(n, u);
      return "in " + n + " " + u + (n === 1 ? "" : "s");
    };
    var render = function () {
      var L = read();
      if (!L || !L.start) return;
      var start = new Date(L.start).getTime();
      if (isNaN(start) || start < Date.now() - 36e5 || L.dismissed) { if (!L.dismissed) write(null); if (card) { card.remove(); card = null; } window.clearInterval(tick); return; }
      if (!card) {
        card = document.createElement("aside");
        card.className = "lesson-card";
        card.setAttribute("aria-live", "polite");
        card.innerHTML = '<p class="lesson-card-text"></p><div class="lesson-card-actions"><a class="lesson-card-add" download="tennis-lesson.ics"></a>' +
          '<button class="lesson-card-x" type="button"></button></div>';
        card.querySelector(".lesson-card-add").textContent = T.addCal || "Add to calendar";
        card.querySelector(".lesson-card-add").setAttribute("href", ics(L));
        var x = card.querySelector(".lesson-card-x");
        x.setAttribute("aria-label", T.dismiss || "Dismiss");
        x.textContent = "×";
        x.addEventListener("click", function () { L.dismissed = true; write(L); render(); });
        document.body.appendChild(card);
        window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { if (card) card.classList.add("is-in"); }); });
        window.clearInterval(tick);
        tick = window.setInterval(render, 60000);
      }
      var when;
      try { when = new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ }).format(new Date(start)); }
      catch (e) { when = new Date(start).toLocaleString(); }
      card.querySelector(".lesson-card-text").textContent = fill(T.lessonLine || "Your lesson: {when}, {rel}.", { when: when, rel: relative(start - Date.now()) });
    };
    var onBooked = function (e) {
      var d = (e && e.detail && e.detail.data) || {};
      var b = d.booking || d;
      var start = b.startTime || d.startTime || d.date;
      if (!start) return;
      write({ start: start, end: b.endTime || d.endTime || "", uid: b.uid || d.uid || "", at: Date.now() });
      render();
    };
    var hooked = false;
    var hook = function () {
      if (hooked) return;
      var api = window.Cal && window.Cal.ns && window.Cal.ns.lesson;
      if (typeof api !== "function") return;
      hooked = true;
      ["bookingSuccessfulV2", "bookingSuccessful"].forEach(function (action) {
        try { api("on", { action: action, callback: onBooked }); } catch (err) {}
      });
    };
    if (root.classList.contains("cal-ready")) hook(); else window.addEventListener("cal:ready", hook);
    if (local && /[?&]demo=lesson\b/.test(location.search)) {
      var fake = new Date(Date.now() + (2 * 24 + 5) * 36e5); fake.setMinutes(0, 0, 0);
      write({ start: fake.toISOString(), end: new Date(fake.getTime() + 36e5).toISOString(), uid: "demo", at: Date.now() });
    }
    render();
  })();

  /* ------------------------------------------- N1. Before and after -- */
  each(document.querySelectorAll(".compare[data-before]"), function (fig) {
    var b = fig.getAttribute("data-before"), a = fig.getAttribute("data-after");
    if (!b || !a) return;
    var stage = fig.querySelector(".compare-stage"), range = fig.querySelector(".compare-range");
    if (!stage || !range) return;
    var media = function (src, cls) {
      var isV = /\.(mp4|webm|mov)(\?|$)/i.test(src);
      var el = document.createElement(isV ? "video" : "img");
      el.className = cls;
      if (isV) { el.muted = true; el.loop = true; el.autoplay = !reduced; el.playsInline = true; el.setAttribute("playsinline", ""); }
      else el.alt = "";
      el.setAttribute("aria-hidden", "true");
      el.src = src;
      return el;
    };
    stage.insertBefore(media(a, "compare-after"), stage.firstChild);
    stage.insertBefore(media(b, "compare-before"), stage.firstChild);
    var set = function () { fig.style.setProperty("--split", range.value + "%"); };
    range.addEventListener("input", set);
    set();
    fig.hidden = false;
  });

  /* --------------------------------------------------- N3. Numbers -- */
  var counts = document.querySelector(".counts");
  if (counts) {
    var items = counts.querySelectorAll("[data-count]");
    var live = Array.prototype.filter.call(items, function (b) { return /^\d+$/.test(b.getAttribute("data-count") || ""); });
    if (live.length) {
      each(items, function (b) { if (live.indexOf(b) < 0) b.closest("li").hidden = true; });
      counts.hidden = false;
      var countUp = function (el) {
        var to = +el.getAttribute("data-count"), sfx = el.getAttribute("data-suffix") || "";
        var show = function (n) { el.textContent = n.toLocaleString(locale) + sfx; };
        if (reduced || !window.requestAnimationFrame) { show(to); return; }
        var t0 = performance.now();
        var step = function (now) { var p = Math.min(1, (now - t0) / 1400); show(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) window.requestAnimationFrame(step); };
        window.requestAnimationFrame(step);
      };
      if ("IntersectionObserver" in window) {
        var cio = new IntersectionObserver(function (entries) {
          if (!entries.some(function (en) { return en.isIntersecting; })) return;
          cio.disconnect();
          live.forEach(countUp);
        }, { threshold: .3 });
        cio.observe(counts);
      } else live.forEach(countUp);
    }
  }
})();
