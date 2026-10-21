/* ============================================================================
   The clinic list on the admin page (/admin/): everyone who asked to join
   a clinic, by level, newest first, and under it the gift requests.

   The sign-ups come from the Worker's /stats answer that the gate got for
   the right key: admin-gate.js hands it over with its "admin:unlocked"
   event ({ key, data }), so nothing is fetched twice. Only if that answer
   is missing does this ask /stats once itself, with the key from the
   event. Every call spends the visitor's per-minute allowance on the
   Worker, so the list never loads on its own or on a timer.

   The Worker stores each sign-up's answers as one English text, which this
   reads back by its "Level:", "Who's coming:", "Times that usually work:"
   and "Anything else:" lines. Nothing here is written anywhere; it is only
   read. Names and contacts are visitors' own text: always set as text,
   and a contact only becomes a link through a strict email or phone match.
   ========================================================================== */

(function () {
  "use strict";

  var section = document.getElementById("clinic");
  if (!section) return;
  var table = document.getElementById("clinicTable");
  var note = document.getElementById("clinicNote");
  var gifts = document.getElementById("giftList");

  var LEVELS = ["New to tennis", "Beginner", "Intermediate", "Advanced", "Competitive"];
  /* The page a sign-up came from, as the numbers page names it (stats.js). */
  var PAGES = { en: "English", es: "Spanish", ko: "Korean", "zh-hans": "Chinese (S)", "zh-hant": "Chinese (T)", ja: "Japanese", vi: "Vietnamese", fa: "Persian" };

  /* The Worker's address from the page's jev-endpoint meta, like every
     other page; the literal is only a fallback if the meta goes missing. */
  function base() {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return "http://localhost:8787";
    var meta = document.querySelector('meta[name="jev-endpoint"]');
    var url = meta && /^https?:\/\//.test(meta.content) ? meta.content.replace(/\/+$/, "") : "";
    return url || "https://lee-tennis-jev.leetennis.workers.dev";
  }
  function text(tag, s, cls) { var el = document.createElement(tag); if (cls) el.className = cls; el.textContent = s; return el; }
  function when(iso) { try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) { return ""; } }
  function pageName(p) { return p && p !== "en" ? " · " + (PAGES[p] || p) : ""; }

  /* A contact as links: one well-formed email (encoded, so a typed
     "?bcc=…" can never add recipients) and, from what is left, a phone
     number of seven digits or more. Both when both are there; plain text
     when neither is. */
  var EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
  function contactLinks(contact) {
    var raw = String(contact || "");
    var frag = document.createDocumentFragment();
    var m = EMAIL.exec(raw);
    var rest = m ? raw.replace(m[0], "") : raw;
    var tel = rest.replace(/[^\d+]/g, "");
    var hasTel = (tel.match(/\d/g) || []).length >= 7;
    if (m) {
      var at = m[0].lastIndexOf("@");
      var a = text("a", m[0]);
      a.href = "mailto:" + encodeURIComponent(m[0].slice(0, at)) + "@" + encodeURIComponent(m[0].slice(at + 1));
      frag.appendChild(a);
    }
    if (hasTel) {
      if (m) frag.appendChild(document.createTextNode(" · "));
      var t = text("a", m ? rest.replace(/^[\s,;\/·-]+|[\s,;\/·-]+$/g, "") : raw);
      t.href = "sms:" + tel;
      frag.appendChild(t);
    }
    if (!m && !hasTel) frag.appendChild(document.createTextNode(raw));
    return frag;
  }

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

  /* Gift requests, as a plain list. Drawn first and on its own, so it is
     never left blank when the clinic list is empty. */
  function renderGifts(rows) {
    if (!gifts) return;
    gifts.innerHTML = "";
    var g = rows.filter(function (r) { return r.kind === "gift"; });
    if (!g.length) gifts.appendChild(text("li", "None yet.", "is-empty"));
    g.forEach(function (r) {
      var li = document.createElement("li");
      var who = document.createElement("strong");
      who.appendChild(document.createTextNode(r.name + " · "));
      who.appendChild(contactLinks(r.contact));
      li.appendChild(who);
      li.appendChild(text("span", r.body, "desk-signup-body"));
      li.appendChild(text("span", when(r.at) + pageName(r.page), "desk-q-meta"));
      gifts.appendChild(li);
    });
  }
  /* Both lists say so when there is nothing to show yet. */
  function status(msg) {
    note.textContent = msg;
    if (gifts) { gifts.innerHTML = ""; gifts.appendChild(text("li", msg, "is-empty")); }
  }

  function render(rows) {
    renderGifts(rows);
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
    /* One <tbody> per level, its heading row first, so the heading's
       scope="rowgroup" covers that level's rows and no others. */
    var tbody = null;
    var lastLevel = null;
    clinic.forEach(function (p) {
      var levelName = p.level ? p.level.replace(/\s*\(.*$/, "") : "Level not given";
      if (levelName !== lastLevel || !tbody) {
        lastLevel = levelName;
        tbody = document.createElement("tbody");
        table.appendChild(tbody);
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
      contact.appendChild(contactLinks(p.contact));
      tr.appendChild(contact);
      tr.appendChild(text("td", /own group/i.test(p.who) ? "Own group" : "Alone"));
      tr.appendChild(text("td", p.times && p.times !== "not given" ? p.times : "—"));
      tr.appendChild(text("td", p.notes || "—"));
      tr.appendChild(text("td", when(p.at) + pageName(p.page)));
      tbody.appendChild(tr);
    });
  }

  function load(k) {
    if (!k) { status("Unlock the page with your key and the list shows here."); return; }
    fetch(base() + "/stats", { headers: { Authorization: "Bearer " + k } })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (data) { render(data.signups || []); })
      .catch(function () { status("Couldn't reach the list just now. Your numbers page has the same sign-ups."); });
  }

  section.hidden = false;
  note.textContent = "Unlock the page with your key and the list shows here.";
  document.addEventListener("admin:unlocked", function (e) {
    var d = e.detail || {};
    if (d.data) render(d.data.signups || []);
    else load(d.key);
  });
})();
