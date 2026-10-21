/* ============================================================================
   More, October 19 2026 (styles in more.css). Isaac asked for every idea
   on the list, so this file carries the lot, each piece on its own and
   each skipping itself when the page lacks its markup:

     M1  Magnetic buttons: on a fine pointer the Book buttons lean a few
         pixels toward the pointer as it nears and snap back after.
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
     U5  The tab: its title asks the reader back while they are away, and
         the LT mark in the favicon hops once when they return.
     FAQ The questions: four show, the rest drop in like a ladder's rungs
         on request, and each answer unfolds rung by rung.
     N1  Before and after: a drag handle between two photos or clips, once
         the figure's data-before and data-after name them.
     N3  The numbers: count-up figures, once each data-count has one.

   (A header score that counted Love, 15, 30, 40, Game with the scroll, and
   an animations switch beside the dark-mode one, were here for a day:
   Isaac found neither would be understood.)

   Words come from window.I18N on the translated pages; English is the
   fallback here. ?classic (the motion preview switch) turns off the
   motion pieces only: the shortcuts, the tab title, the court and the
   builder still work under it (the builder without its rolling number).
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
  /* Counts in the page's own digits (Persian writes ۴, not 4); dollar
     prices stay as they are, like the page's own. */
  function num(n) { try { return new Intl.NumberFormat(locale).format(n); } catch (e) { return String(n); } }

  /* ------------------------------------------ U3. Keyboard shortcuts -- */
  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && t.closest && t.closest("input, textarea, select, [contenteditable]")) return;
    /* Nothing over an open popup (the list would stack on it), and a held
       key doesn't repeat (holding B would press Book again and again). */
    if (e.repeat || document.querySelector("dialog[open]")) return;
    var is = function (code, re) { return e.code === code || re.test(e.key); };
    if (e.key === "?") {
      var opener = document.querySelector("[data-open='shortcuts']");
      if (opener) { e.preventDefault(); opener.click(); }
      return;
    }
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
    /* The frames are the site's own favicon (tennis-favicon.svg, the LT
       mark) lifted by dy and dropped back, so the icon itself hops rather
       than giving way to a different picture. */
    function frame(dy) {
      return "data:image/svg+xml," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 94 94"><style>.mark{fill:#171916}@media(prefers-color-scheme:dark){.mark{fill:#fff}}</style>' +
        '<g class="mark" transform="translate(0 ' + (8 + dy) + ')"><path d="M24 11H38L26 53H58L54 66H11Z"/><path d="M44 11H83L79 24H66L58 49H44L52 24H40Z"/></g></svg>');
    }
    var frames = [-8, -14, -16, -12, -4, 0].map(frame);
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

  /* ------------------------------------------------- I1. The court --
     The tabs ship hidden and every note shown, so with no script the five
     notes simply read as a list; here the tabs come out and one note shows
     at a time. Hovering the court or a tab previews a part; only a press
     (a click, or Enter or Space on a tab) chooses it, and only the chosen
     tab reads as pressed. */
  var court = document.querySelector("[data-court]");
  if (court) {
    var zones = court.querySelectorAll("[data-zone]"), notes = court.querySelectorAll("[data-note]");
    var tabs = court.querySelector(".court-tabs");
    var chosen = court.getAttribute("data-current") || "baseline";
    var showZone = function (id) {
      court.setAttribute("data-current", id);
      each(zones, function (z) { z.classList.toggle("is-on", z.getAttribute("data-zone") === id); });
      each(notes, function (n) { n.hidden = n.getAttribute("data-note") !== id; });
    };
    var choose = function (id) {
      chosen = id;
      each(zones, function (z) {
        if (z.tagName.toLowerCase() === "button") z.setAttribute("aria-pressed", z.getAttribute("data-zone") === id ? "true" : "false");
      });
      showZone(id);
    };
    each(zones, function (z) {
      var id = z.getAttribute("data-zone");
      z.addEventListener("click", function () { choose(id); });
      z.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") showZone(id); });
    });
    var back = function () { showZone(chosen); };
    var art = court.querySelector(".court-art");
    if (art) art.addEventListener("pointerleave", back);
    if (tabs) { tabs.hidden = false; tabs.addEventListener("pointerleave", back); }
    choose(chosen);
  }

  /* ---------------------------------------------- I2. The builder --
     Shipped hidden: with no script its total couldn't follow the choices.
     Shown here once it is wired. The total is set at once on load and
     rolls on a change (not under ?classic or reduced motion); a screen
     reader hears the final figure once, from a hidden status line, rather
     than every frame of the roll. */
  var builder = document.getElementById("builder");
  if (builder) {
    builder.hidden = false;
    var RATE = { private: 80, semi: 110, hitting: 45 };   // the semi-private is $110 the hour, for the pair
    var totalEl = builder.querySelector("[data-total]"), monthEl = builder.querySelector("[data-month]"), packEl = builder.querySelector("[data-pack]");
    var status = document.createElement("p");
    status.className = "builder-status";
    status.setAttribute("role", "status");
    builder.appendChild(status);
    var shown = null, rolling = 0;
    var roll = function (to) {
      var from = shown; shown = to;
      if (from === null || reduced || classic || !window.requestAnimationFrame) { rolling++; totalEl.textContent = "$" + to; return; }
      var t0 = performance.now(), id = ++rolling;
      var step = function (now) {
        if (id !== rolling) return;
        var p = Math.min(1, (now - t0) / 520), e = 1 - Math.pow(1 - p, 3);
        totalEl.textContent = "$" + Math.round(from + (to - from) * e);
        if (p < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };
    var calc = function (announce) {
      var typeIn = builder.querySelector('input[name="type"]:checked'), nIn = builder.querySelector('input[name="n"]:checked');
      if (!typeIn || !nIn) return;
      var type = typeIn.value, n = +nIn.value, lessons = n * 4, total = RATE[type] * lessons;
      roll(total);
      if (monthEl) monthEl.textContent = fill(T.builderMonth || "a month, for {n} lessons", { n: num(lessons) });
      if (packEl) {
        if (type === "private") {
          packEl.hidden = false;
          packEl.textContent = n === 1
            ? fill(T.builderPack5 || "With the 5-lesson package that's $75 a lesson: {total} a month.", { total: "$" + 75 * lessons })
            : fill(T.builderPack10 || "With the 10-lesson package that's $70 a lesson: {total} a month.", { total: "$" + 70 * lessons });
        } else if (type === "semi") {
          /* The total is for the pair: say what each player pays. */
          packEl.hidden = false;
          packEl.textContent = fill(T.builderPair || "For two players: {each} a month each.", { each: "$" + 55 * lessons });
        } else packEl.hidden = true;
      }
      each(builder.querySelectorAll("[data-book]"), function (a) { a.hidden = a.getAttribute("data-book") !== type; });
      builder.classList.add("is-live");
      if (announce === true) {
        status.textContent = "$" + total + " " + (monthEl ? monthEl.textContent : "") +
          (packEl && !packEl.hidden ? " " + packEl.textContent : "");
      }
    };
    builder.addEventListener("change", function () { calc(true); });
    builder.addEventListener("submit", function (e) { e.preventDefault(); });
    calc();
  }

  /* --------------------------------------- M4. The stacked cards --
     On a phone the lesson cards stick under the header and stack
     (more.css). A card taller than the screen below its stuck top would
     never show its lower part before the next card covered it, so it is
     marked and scrolls by normally. clientHeight, not innerHeight: it
     stays put while a phone's toolbar slides away, so cards don't flip
     mid-scroll. */
  var stack = document.querySelectorAll(".lesson-list .lesson");
  if (stack.length) {
    var fitStack = function () {
      var room = document.documentElement.clientHeight;
      each(stack, function (card, i) {
        card.classList.toggle("is-tall", card.offsetHeight > room - (78 + i * 12));
      });
    };
    var stackTimer = 0;
    var refit = function () { window.clearTimeout(stackTimer); stackTimer = window.setTimeout(fitStack, 150); };
    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);
    window.addEventListener("load", fitStack);
    fitStack();
  }

  if (classic) return;

  /* ------------------------------------------- M1. Magnetic buttons --
     The only magnet on the page (motion.js had a second one for the big
     buttons): the Book buttons, and the big Email buttons beside them. */
  if (fine && !reduced) {
    var mags = Array.prototype.slice.call(document.querySelectorAll(".btn-primary, .btn-invert, .nav-book, .btn-quiet.btn-lg, .btn-outline.btn-lg"));
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
      /* Without the spin the result still lands a beat later, so the same
         side twice in a row visibly (and audibly, in the live region)
         arrives again instead of leaving the page unchanged. */
      if (reduced || !art2.animate) { window.setTimeout(done, 150); return; }
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
  /* The page's one pointer light on the contact band (motion.js no longer
     draws a second). The hero's light only shows in the dark, so in the
     light theme its handler does nothing; the writes wait for a frame. */
  if (fine && !reduced) {
    each(document.querySelectorAll(".hero, .contact"), function (sec) {
      var isHero = sec.classList.contains("hero"), sraf = 0, sx = 0, sy = 0;
      sec.classList.add("spot");
      sec.addEventListener("pointermove", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        if (isHero && root.getAttribute("data-theme") !== "dark") return;
        sx = e.clientX; sy = e.clientY;
        if (sraf) return;
        sraf = window.requestAnimationFrame(function () {
          sraf = 0;
          var r = sec.getBoundingClientRect();
          sec.style.setProperty("--sx", (sx - r.left).toFixed(0) + "px");
          sec.style.setProperty("--sy", (sy - r.top).toFixed(0) + "px");
          sec.classList.add("is-lit");
        });
      }, { passive: true });
      sec.addEventListener("pointerleave", function () {
        if (sraf) { window.cancelAnimationFrame(sraf); sraf = 0; }
        sec.classList.remove("is-lit");
      });
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
    /* Kept current: redrawn every minute (and when the tab comes back),
       and gone once the sun has set. "3 hr", not "3 hr 0 min". */
    courtP.then(function (c) {
      if (!c || !c.sun) return;
      var rise = mins(c.sun.rise), set = mins(c.sun.set), dayTick = 0;
      var draw = function () {
        var now;
        try { now = nowMins(); } catch (e) { now = NaN; }
        if (!(now >= rise && now < set)) {
          dayEl.hidden = true;
          window.clearInterval(dayTick);
          document.removeEventListener("visibilitychange", onShow);
          return;
        }
        var left = set - now, frac = left / (set - rise);
        var t = left >= 60 ? unit(Math.floor(left / 60), "hour") + (left % 60 ? " " + unit(left % 60, "minute") : "") : unit(left, "minute");
        var bar = dayEl.querySelector(".daylight-bar i"), text = dayEl.querySelector(".daylight-text");
        if (bar) bar.style.setProperty("--p", frac.toFixed(3));
        if (text) text.textContent = fill(T.daylightLeft || "{t} of daylight left at the court", { t: t });
        dayEl.hidden = false;
      };
      var onShow = function () { if (!document.hidden) draw(); };
      draw();
      if (dayEl.hidden) return;
      dayTick = window.setInterval(draw, 60000);
      document.addEventListener("visibilitychange", onShow);
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
      /* Under way: "now", in the page's language. */
      if (ms <= 0) {
        try { return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second"); } catch (e) { return "now"; }
      }
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
    /* Dates in the Gregorian calendar on every page: Persian's default is
       the Solar Hijri one, which matches nothing in the booking itself
       (Persian digits and month names stay). */
    var dateLocale = /^fa\b/i.test(locale) ? locale + "-u-ca-gregory" : locale;
    var shownFor = "";   // the lesson the card was last announced for
    var render = function () {
      var L = read();
      if (!L || !L.start) return;
      var start = new Date(L.start).getTime();
      var end = L.end ? new Date(L.end).getTime() : NaN;
      if (isNaN(end)) end = start + 36e5;
      if (isNaN(start) || end < Date.now() || L.dismissed) { if (!L.dismissed) write(null); if (card) { card.remove(); card = null; } window.clearInterval(tick); return; }
      if (!card) {
        card = document.createElement("aside");
        card.className = "lesson-card";
        card.innerHTML = '<p class="lesson-card-text"></p><div class="lesson-card-actions"><a class="lesson-card-add" download="tennis-lesson.ics"></a>' +
          '<button class="lesson-card-x" type="button"></button></div>';
        card.querySelector(".lesson-card-add").textContent = T.addCal || "Add to calendar";
        var x = card.querySelector(".lesson-card-x");
        x.setAttribute("aria-label", T.dismiss || "Dismiss");
        x.textContent = "×";
        /* The record as it is now, not as it was when the card was made:
           a second booking in the same visit replaces the first. */
        x.addEventListener("click", function () { var cur = read(); if (cur) { cur.dismissed = true; write(cur); } render(); });
        document.body.appendChild(card);
        window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { if (card) card.classList.add("is-in"); }); });
        window.clearInterval(tick);
        tick = window.setInterval(render, 60000);
      }
      card.querySelector(".lesson-card-add").setAttribute("href", ics(L));
      /* Announced once per lesson; the minute-by-minute countdown after
         that is not read out. */
      card.setAttribute("aria-live", shownFor === L.start ? "off" : "polite");
      shownFor = L.start;
      var when;
      try { when = new Intl.DateTimeFormat(dateLocale, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ }).format(new Date(start)); }
      catch (e) { when = new Date(start).toLocaleString(); }
      var line = fill(T.lessonLine || "Your lesson: {when}, {rel}.", { when: when, rel: relative(start - Date.now()) });
      var textEl = card.querySelector(".lesson-card-text");
      if (textEl.textContent !== line) textEl.textContent = line;
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

  /* ---------------------------------------------- The FAQ ladder -- */
  var faq = document.querySelector("[data-faq-show]");
  if (faq) {
    var faqItems = Array.prototype.slice.call(faq.children).filter(function (el) { return el.tagName === "DETAILS"; });
    var faqShow = parseInt(faq.getAttribute("data-faq-show"), 10) || 4;
    var faqMore = document.querySelector("[data-faq-more]");
    /* The extra questions wait behind the line. */
    if (faqMore && faqItems.length > faqShow) {
      faqItems.slice(faqShow).forEach(function (d) { d.classList.add("faq-extra"); });
      faqMore.hidden = false;
      faqMore.addEventListener("click", function () {
        faqMore.hidden = true;
        faqItems.slice(faqShow).forEach(function (d, i) {
          d.style.setProperty("--i", i);
          d.classList.add("is-dropped");
        });
        /* The button that had focus is gone: focus moves to the first new
           question, so the reader keeps their place. */
        var first = faqItems[faqShow] && faqItems[faqShow].querySelector("summary");
        if (first) first.focus();
      });
    }
    /* Each answer becomes rungs: one per sentence, in a body whose height
       opens and closes smoothly, so <details> keeps its semantics and its
       no-JS behaviour but moves like a ladder. The sentence splitter is
       built at run time: a lookbehind written as a literal is a syntax
       error in Safari before 16.4 and would stop this whole file there;
       built in a try, those browsers just keep each answer as one rung. */
    var SENTENCE = null;
    try { SENTENCE = new RegExp("(?<=[.!?\\u3002\\uff01\\uff1f])\\s*(?=\\S)"); } catch (e) { /* no lookbehind */ }
    faqItems.forEach(function (d) {
      var body = document.createElement("div");
      body.className = "faq-body";
      var inner = document.createElement("div");
      inner.className = "faq-inner";
      body.appendChild(inner);
      Array.prototype.slice.call(d.children).forEach(function (child) {
        if (child.tagName === "SUMMARY") return;
        if (child.tagName === "P" && !child.children.length) {
          var parts;
          try { parts = SENTENCE ? child.textContent.trim().split(SENTENCE) : [child.textContent.trim()]; } catch (e) { parts = [child.textContent.trim()]; }
          if (parts.length > 1) {
            child.textContent = "";
            parts.forEach(function (t, i) {
              var s = document.createElement("span");
              s.className = "rung";
              s.style.setProperty("--i", i);
              s.textContent = t;
              child.appendChild(s);
              if (i < parts.length - 1) child.appendChild(document.createTextNode(" "));
            });
          } else child.classList.add("rung");
        } else child.classList.add("rung");
        inner.appendChild(child);
      });
      d.appendChild(body);
      var summary = d.querySelector("summary");
      if (!summary || reduced) return;
      summary.addEventListener("click", function (e) {
        if (!d.open) return;                         // opening: the browser does it, the CSS plays
        e.preventDefault();                          // closing: fold first, then close
        if (d.classList.contains("is-closing")) return;
        d.classList.add("is-closing");
        /* One finisher per close: only the body's own height transition
           (not a link's hover colour inside it) or the timer ends it, it
           runs once, and it leaves nothing attached for the next opening. */
        var timer = 0;
        var done = function (ev) {
          if (ev && (ev.target !== body || ev.propertyName !== "grid-template-rows")) return;
          body.removeEventListener("transitionend", done);
          window.clearTimeout(timer);
          if (!d.classList.contains("is-closing")) return;
          d.classList.remove("is-closing");
          d.open = false;
        };
        body.addEventListener("transitionend", done);
        timer = window.setTimeout(done, 600);
      });
    });
  }

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
