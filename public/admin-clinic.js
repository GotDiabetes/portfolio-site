/* ============================================================================
   The clinic list on the admin page (/admin/): everyone who asked to join
   a clinic, by level, newest first, and under it the gift requests.

   The sign-ups come from the Worker's /stats with the key the gate just
   checked (kept on this device as lee-stats-key); the Worker stores each
   sign-up's answers as one English text, which this reads back by its
   "Level:", "Who's coming:", "Times that usually work:" and "Anything
   else:" lines. Nothing here is written anywhere; it is only read.
   ========================================================================== */

(function () {
  "use strict";

  var STORE = "lee-stats-key";
  var section = document.getElementById("clinic");
  if (!section) return;
  var table = document.getElementById("clinicTable");
  var note = document.getElementById("clinicNote");
  var gifts = document.getElementById("giftList");

  var LEVELS = ["New to tennis", "Beginner", "Intermediate", "Advanced", "Competitive"];

  function base() {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return "http://localhost:8787";
    return "https://lee-tennis-jev.leetennis.workers.dev";
  }
  function key() { try { return localStorage.getItem(STORE) || ""; } catch (e) { return ""; } }
  function text(tag, s, cls) { var el = document.createElement(tag); if (cls) el.className = cls; el.textContent = s; return el; }
  function when(iso) { try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) { return ""; } }

  /* One sign-up's answers, read out of its text. */
  function parse(body) {
    var out = { level: "", who: "", times: "", notes: "" };
    String(body || "").split("\n").forEach(function (line) {
      var m = /^(Level|Who's coming|Times that usually work|Anything else):\s*(.*)$/.exec(line.trim());
      if (!m) return;
      if (m[1] === "Level") out.level = m[2];
      else if (m[1] === "Who's coming") out.who = m[2];
      else if (m[1] === "Times that usually work") out.times = m[2];
      else out.notes = m[2];
    });
    return out;
  }
  function levelIndex(level) {
    for (var i = 0; i < LEVELS.length; i++) if (level.indexOf(LEVELS[i]) === 0) return i;
    return LEVELS.length;
  }

  function render(rows) {
    var clinic = rows.filter(function (r) { return r.kind === "clinic"; }).map(function (r) {
      var a = parse(r.body);
      return { at: r.at, name: r.name, contact: r.contact, page: r.page, level: a.level, who: a.who, times: a.times, notes: a.notes, li: levelIndex(a.level) };
    });
    table.innerHTML = "";
    if (!clinic.length) {
      note.textContent = "Nobody has joined the list yet. Each sign-up from the site appears here.";
      return;
    }
    clinic.sort(function (x, y) { return x.li - y.li || (x.at < y.at ? 1 : -1); });
    note.textContent = clinic.length + (clinic.length === 1 ? " person" : " people") + " on the list. Grouped by level; the newest first within each.";
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    ["Who", "How to reach them", "Coming", "Times that work", "Notes", "Joined"].forEach(function (h) { var th = text("th", h); th.setAttribute("scope", "col"); hr.appendChild(th); });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    var lastLevel = null;
    clinic.forEach(function (p) {
      var levelName = p.level ? p.level.replace(/\s*\(.*$/, "") : "Level not given";
      if (levelName !== lastLevel) {
        lastLevel = levelName;
        var gr = document.createElement("tr");
        gr.className = "desk-group";
        var gh = text("th", levelName);
        gh.setAttribute("scope", "rowgroup");
        gh.colSpan = 6;
        gr.appendChild(gh);
        tbody.appendChild(gr);
      }
      var tr = document.createElement("tr");
      var who = text("th", p.name); who.setAttribute("scope", "row");
      tr.appendChild(who);
      var contact = document.createElement("td");
      if (/@/.test(p.contact)) { var a = text("a", p.contact); a.href = "mailto:" + p.contact; contact.appendChild(a); }
      else { var t = text("a", p.contact); t.href = "sms:" + p.contact.replace(/[^\d+]/g, ""); contact.appendChild(t); }
      tr.appendChild(contact);
      tr.appendChild(text("td", /own group/i.test(p.who) ? "Own group" : "Alone"));
      tr.appendChild(text("td", p.times && p.times !== "not given" ? p.times : "—"));
      tr.appendChild(text("td", p.notes || "—"));
      tr.appendChild(text("td", when(p.at) + (p.page && p.page !== "en" ? " · " + p.page : "")));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    /* Gift requests, as a plain list. */
    if (gifts) {
      gifts.innerHTML = "";
      var g = rows.filter(function (r) { return r.kind === "gift"; });
      if (!g.length) gifts.appendChild(text("li", "None yet.", "is-empty"));
      g.forEach(function (r) {
        var li = document.createElement("li");
        li.appendChild(text("strong", r.name + " · " + r.contact));
        li.appendChild(text("span", r.body, "desk-signup-body"));
        li.appendChild(text("span", when(r.at), "desk-q-meta"));
        gifts.appendChild(li);
      });
    }
  }

  function load() {
    var k = key();
    if (!k) { note.textContent = "Unlock the page with your key and the list shows here."; return; }
    fetch(base() + "/stats", { headers: { Authorization: "Bearer " + k } })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (data) { render(data.signups || []); })
      .catch(function () { note.textContent = "Couldn't reach the list just now. Your numbers page has the same sign-ups."; });
  }

  section.hidden = false;
  load();
  /* The gate stores the key as it opens; load again once it has. */
  window.addEventListener("storage", function (e) { if (e.key === STORE) load(); });
  document.addEventListener("admin:unlocked", load);
  window.setTimeout(load, 2500);
})();
