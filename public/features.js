/* ============================================================================
   The small features added in October 2026 (styles in features.css):

     1. The press ripple on every .btn.
     2. Tip of the week (#tipWeek): one of the practice tips from ask.json
        (this language's copy), chosen by the week of the year, so it
        changes every Monday without anyone touching the page.
     3. The live lines under the hero's Book button, from the Worker:
        /slots (the next open private lesson on the calendar and how many
        hours are open in the next seven days) and /court (the Irvine
        forecast: dry and warm, rain today, or rain coming). Each line
        stays hidden unless it has something true to say.
     4. The intro video in About, shown once its data-video names a file.

   Words come from window.I18N on the translated pages; the English is
   the fallback here.
   ========================================================================== */

(function () {
  "use strict";

  var T = window.I18N || {};
  var root = document.documentElement;
  var lang = (root.getAttribute("lang") || "en").toLowerCase();
  var folder = /^(es|ko|zh-hans|zh-hant|ja|vi|fa)$/.test(lang) ? "/" + lang : "";
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var meta = document.querySelector('meta[name="jev-endpoint"]');
  var base = meta && /^https?:\/\//.test(meta.content) ? meta.content.replace(/\/$/, "") : "";
  /* On localhost, ?local in the address reads from a Worker run locally. */
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && /[?&]local\b/.test(location.search)) base = "http://localhost:8787";
  var W = {
    nextOpen: T.nextOpen || "Next open lesson: {when}",
    openHours: T.openHours || "{n} open hours this week",
    openHour: T.openHour || "1 open hour this week",
    courtDry: T.courtDry || "Dry and {hi}° at the court today.",
    courtRain: T.courtRain || "Rain likely today. If we have to move a lesson, I'll text you.",
    courtRainSoon: T.courtRainSoon || "Rain expected {day}; I'll text you if a lesson has to move.",
  };
  function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return k in o ? o[k] : m; }); }

  /* ------------------------------------------------- 1. The ripple -- */
  if (!reduced) {
    document.addEventListener("pointerdown", function (e) {
      var btn = e.target.closest && e.target.closest(".btn");
      if (!btn || e.button) return;
      var r = btn.getBoundingClientRect();
      var layer = document.createElement("span");
      layer.className = "ripple";
      layer.setAttribute("aria-hidden", "true");
      var dot = document.createElement("i");
      dot.style.left = (e.clientX - r.left) + "px";
      dot.style.top = (e.clientY - r.top) + "px";
      layer.appendChild(dot);
      btn.appendChild(layer);
      window.setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 750);
    }, { passive: true });
  }

  /* ----------------------------------------- 2. Tip of the week -- */
  var week = document.getElementById("tipWeek");
  if (week && window.fetch) {
    fetch(folder + "/ask.json", { cache: "default" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !data.topics) return;
      var tips = data.topics.filter(function (t) { return /^tip_/.test(t.id) && t.title && t.answer; });
      if (!tips.length) return;
      /* ISO week number, so the pick changes on Mondays. */
      var d = new Date(); d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
      var jan4 = new Date(d.getFullYear(), 0, 4);
      var wk = 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
      var tip = tips[((wk % tips.length) + tips.length) % tips.length];
      week.querySelector(".tip-week-title").textContent = tip.title;
      week.querySelector(".tip-week-text").textContent = tip.answer;
      var link = week.querySelector(".tip-week-link");
      if (link) link.setAttribute("href", link.getAttribute("href").replace(/#.*$/, "") + "#" + tip.id.replace(/^tip_/, "").replace(/_/g, "-"));
      week.hidden = false;
    }).catch(function () {});
  }

  /* -------------------------------------------- 3. The live lines -- */
  var nextEl = document.getElementById("nextOpen"), courtEl = document.getElementById("courtDay");
  if (base && window.fetch && (nextEl || courtEl)) {
    var locale = root.getAttribute("lang") || "en";
    var get = function (path) {
      return fetch(base + path, { headers: { "Accept": "application/json" } }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    };
    if (nextEl) get("/slots").then(function (s) {
      if (!s || !s.next) return;
      var when;
      try {
        when = new Intl.DateTimeFormat(locale, { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" }).format(new Date(s.next));
      } catch (e) { return; }
      var text = fill(W.nextOpen, { when: when.replace(/:00(?=\s?[AP]M|\s?[ap]m)/, "") });
      if (s.week > 1) text += " · " + fill(W.openHours, { n: s.week });
      else if (s.week === 1) text += " · " + W.openHour;
      nextEl.textContent = text;
      nextEl.hidden = false;
    });
    if (courtEl) get("/court").then(function (c) {
      if (!c || !c.days || !c.days.length) return;
      var today = c.days[0], text = "";
      if (today.rain >= 50) text = W.courtRain;
      else {
        for (var i = 1; i < c.days.length; i++) {
          if (c.days[i].rain >= 50) {
            var day;
            try { day = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "America/Los_Angeles" }).format(new Date(c.days[i].date + "T12:00:00")); } catch (e) { break; }
            text = fill(W.courtRainSoon, { day: day });
            break;
          }
        }
        if (!text && typeof today.hi === "number") text = fill(W.courtDry, { hi: today.hi });
      }
      if (!text) return;
      courtEl.textContent = text;
      courtEl.hidden = false;
    });
  }

  /* ------------------------------------------- 4. The intro video -- */
  var fig = document.querySelector(".intro-video[data-video]");
  if (fig && fig.getAttribute("data-video")) {
    var v = fig.querySelector("video");
    if (v) { v.src = fig.getAttribute("data-video"); fig.hidden = false; }
  }
})();
