/* ============================================================================
   Isaac's numbers (/stats/). Asks the Worker's /stats with his key and lays
   the counts out as one table (what happened × language, for a period) and
   the unanswered chat questions as a list. The key stays on his device if
   he ticks "Remember"; it is only ever sent to the Worker.
   ========================================================================== */

(function () {
  "use strict";

  var form = document.getElementById("statsForm");
  var outBox = document.getElementById("statsOut");
  var table = document.getElementById("statsTable");
  var list = document.getElementById("statsQuestions");
  var daysSel = document.getElementById("statsDays");
  var error = form.querySelector(".form-error");
  if (!window.fetch) return;

  /* What each counted event means, in the order the table shows them. */
  var EVENTS = [
    ["book_private", "Pressed Book: private lesson"],
    ["book_semi", "Pressed Book: semi-private"],
    ["book_hitting", "Pressed Book: hitting session"],
    ["book_other", "Pressed Book: other"],
    ["booked", "Finished a booking"],
    ["match", "Lesson matcher: found a lesson"],
    ["match_unsure", "Lesson matcher: couldn't tell"],
    ["chat_open", "Opened the chat"],
    ["ask", "Chat questions answered"],
    ["ask_unanswered", "Chat questions with no answer"],
    ["ask_misuse", "Chat messages refused"],
    ["clinic_list", "Sent the clinic list form"],
    ["gift", "Sent a gift request"],
    ["flyer_visit", "Came from the flyer's QR code"],
  ];
  var PAGES = { en: "English", es: "Spanish", ko: "Korean", "zh-hans": "Chinese (S)", "zh-hant": "Chinese (T)", ja: "Japanese", vi: "Vietnamese", fa: "Persian" };

  var STORE = "lee-stats-key";
  var data = null;
  try {
    var saved = localStorage.getItem(STORE);
    if (saved) { form.elements.key.value = saved; fetchStats(saved); }
  } catch (err) { /* private window: just ask each time */ }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var key = form.elements.key.value.trim();
    if (!key) return;
    try {
      if (form.elements.remember.checked) localStorage.setItem(STORE, key);
      else localStorage.removeItem(STORE);
    } catch (err) { /* fine */ }
    fetchStats(key);
  });
  daysSel.addEventListener("change", render);

  function base() {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return "http://localhost:8787";
    var meta = document.querySelector('meta[name="jev-endpoint"]');
    return meta ? meta.content.replace(/\/+$/, "") : "";
  }

  function fetchStats(key) {
    error.hidden = true;
    fetch(base() + "/stats", { headers: { Authorization: "Bearer " + key } })
      .then(function (r) {
        return r.json().then(function (body) { return { status: r.status, body: body }; });
      })
      .then(function (res) {
        if (res.status === 401) return fail("That key isn't right.");
        if (res.status === 503) return fail("The numbers aren't set up yet: the Worker needs its database and a STATS_KEY (see the README).");
        if (res.status !== 200) return fail("The Worker didn't answer (" + res.status + "). Try again in a minute.");
        data = res.body;
        outBox.hidden = false;
        render();
      })
      .catch(function () { fail("Couldn't reach the Worker. Check the connection and try again."); });
  }

  function fail(msg) {
    error.textContent = msg;
    error.hidden = false;
    outBox.hidden = true;
  }

  function render() {
    if (!data) return;
    var days = +daysSel.value;
    var since = dayString(-days + 1);
    var rows = (data.counts || []).filter(function (r) { return r.day >= since; });
    var langs = Object.keys(PAGES).filter(function (p) { return rows.some(function (r) { return r.page === p; }); });
    if (!langs.length) langs = ["en"];

    var html = "<thead><tr><th scope=\"col\">What</th><th scope=\"col\">Total</th>";
    langs.forEach(function (p) { html += "<th scope=\"col\">" + PAGES[p] + "</th>"; });
    html += "</tr></thead><tbody>";
    EVENTS.forEach(function (ev) {
      var mine = rows.filter(function (r) { return r.event === ev[0]; });
      var total = mine.reduce(function (s, r) { return s + r.n; }, 0);
      html += "<tr" + (total ? "" : " class=\"is-zero\"") + "><th scope=\"row\">" + ev[1] + "</th><td>" + total + "</td>";
      langs.forEach(function (p) {
        var n = mine.filter(function (r) { return r.page === p; }).reduce(function (s, r) { return s + r.n; }, 0);
        html += "<td>" + (n || "") + "</td>";
      });
      html += "</tr>";
    });
    table.innerHTML = html + "</tbody>";

    list.innerHTML = "";
    var qs = data.questions || [];
    if (!qs.length) {
      var li = document.createElement("li");
      li.className = "is-empty";
      li.textContent = "None yet.";
      list.appendChild(li);
    }
    qs.forEach(function (q) {
      var li = document.createElement("li");
      var meta = document.createElement("span");
      meta.className = "desk-q-meta";
      meta.textContent = new Date(q.at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " + (PAGES[q.page] || q.page);
      var text = document.createElement("span");
      text.textContent = q.question;        // visitor text: always as text, never as HTML
      li.appendChild(text);
      li.appendChild(meta);
      list.appendChild(li);
    });
  }

  /* Irvine's date, offset by whole days, as the Worker stores it. */
  function dayString(offset) {
    var at = new Date(Date.now() + offset * 864e5);
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
    } catch (err) {
      return at.toISOString().slice(0, 10);
    }
  }
})();
