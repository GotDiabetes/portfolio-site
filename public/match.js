/* ============================================================================
   Lesson matcher — the "Not sure which fits?" box under the lesson cards.

   The visitor's sentence goes to a Cloudflare Worker (worker/ in the repo),
   which holds the TypeSafe key and asks Jev which of the four offers fits,
   and, from the same sentence, the player's level, what they want to work
   on, and whether the player is a child. The Worker answers with keys (or
   null where the sentence doesn't say); everything the visitor sees is
   written here, in Isaac's voice. Jev only makes the decisions.

   The level and focus do one more job: they go into the booking notes of
   the Book button the answer offers (Cal.com prefills "notes" from the
   button's data-cal-config), in English, so Isaac knows who is coming and
   what they want before the first lesson, whatever language they read.

   The form stays hidden unless there is a Worker to call: on localhost that
   is the local Worker on :8787, on the live site it is the jev-endpoint
   meta tag, which stays empty until the Worker is deployed.
   ========================================================================== */

(function () {
  "use strict";

  var form = document.getElementById("matcher");
  if (!form || !window.fetch) return;

  var base = jevBase();
  if (!base) return;
  var endpoint = base + "/match";

  var input = document.getElementById("matchText");
  var button = form.querySelector("button[type=submit]");
  var result = form.querySelector(".matcher-result");
  var buttonText = button.textContent;

  /* What the page says for each match. The name is what the card is
     called; the line is the one reason it fits. A translated page brings
     its own (window.I18N, from tools/i18n/); Jev reads the visitor's
     sentence in any of those languages. */
  var T = window.I18N || {};
  var COPY = T.matchCopy || {
    private: { name: "a private lesson", line: "One-on-one, built around what you want to fix." },
    semi:    { name: "a semi-private lesson", line: "Two of you share the hour — $55 each." },
    hitting: { name: "a hitting partner session", line: "Straight rallying, no instruction, $45 an hour." },
    group:   { name: "an adult clinic", line: "Small group on one court. Join the clinic list and I'll put you in a group at your level." },
  };
  /* {name} is set in bold; the sentence around it is the language's own. */
  var ANSWER = T.matchAnswer || "Sounds like {name}. {line}";
  var TRAVEL = T.matchTravel || "One thing: lessons are at my home court, Toscana in Irvine. I can't travel to you, but you're welcome to come to me.";
  var UNSURE = T.matchUnsure || "I couldn't tell from that. Try your level and who's playing, or pick from the four above.";
  var DOWN = T.matchDown || "The matcher isn't answering right now. The four options are just above, or email me.";
  var BUSY = T.matchBusy || "That's a lot of matching. Give it a minute, or pick from the four above.";

  /* The five levels (the same five as the clinic list) and the focuses,
     as the visitor reads them, and in English for Isaac's notes. */
  var LEVELS = T.matchLevels || [
    "New to tennis", "Beginner", "Intermediate", "Advanced", "Competitive",
  ];
  var FOCUS = T.matchFocus || {
    serve: "the serve", groundstrokes: "forehand and backhand", net: "net play",
    movement: "footwork", match: "match play", basics: "the basics",
  };
  var LEVEL_LINE = T.matchLevelLine || "Level: {level}.";
  var FOCUS_LINE = T.matchFocusLine || "Focus: {focus}.";
  var NOTES_LINE = T.matchNotesLine || "Book here and this goes into your booking notes, so I can plan the first lesson.";
  var JUNIOR = T.matchJunior || "Booking for your child? Book in your own name and add their age in the notes.";
  var EN_LEVELS = ["new to tennis", "beginner", "intermediate", "advanced", "competitive"];
  var EN_FOCUS = {
    serve: "the serve", groundstrokes: "forehand and backhand", net: "net play",
    movement: "footwork", match: "match play", basics: "the basics",
  };

  form.hidden = false;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.replace(/\s+/g, " ").trim();
    if (text.length < 3) { input.focus(); return; }

    setBusy(true);
    clearMatch();

    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = window.setTimeout(function () { if (controller) controller.abort(); }, 12000);

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text, lang: T.lang || "" }),
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        if (res.status === 429) throw new Error("busy");
        if (!res.ok) throw new Error("down");
        return res.json();
      })
      .then(function (data) { show(data, text); })
      .catch(function (err) { say(err && err.message === "busy" ? BUSY : DOWN); })
      .then(function () { window.clearTimeout(timer); setBusy(false); });
  });

  function show(data, text) {
    var card = data.lesson && document.querySelector('.lesson[data-lesson="' + data.lesson + '"]');
    if (!card) { say(UNSURE, data.travel); return; }

    var copy = COPY[data.lesson];
    result.textContent = "";

    var p = document.createElement("p");
    p.className = "matcher-answer";
    fill(p, ANSWER.replace("{line}", copy.line), { name: copy.name });
    result.appendChild(p);

    var level = typeof data.level === "number" && LEVELS[data.level] ? data.level : null;
    var focus = data.focus && FOCUS[data.focus] ? data.focus : null;
    if (level !== null || focus) {
      var fit = document.createElement("p");
      fit.className = "matcher-fit";
      if (level !== null) fill(fit, LEVEL_LINE, { level: LEVELS[level] });
      if (level !== null && focus) fit.appendChild(document.createTextNode(" "));
      if (focus) fill(fit, FOCUS_LINE, { focus: FOCUS[focus] });
      result.appendChild(fit);
    }

    if (data.travel) result.appendChild(note(TRAVEL));
    if (data.junior === true) result.appendChild(note(JUNIOR));

    /* The card's own action, cloned: a real Book link with data-cal-link
       (or the clinic list's button), so the calendar, the loading state and
       the clinic popup all work exactly as they do on the card. */
    var action = card.querySelector(".lesson-actions .btn");
    if (action) {
      var clone = action.cloneNode(true);
      if (clone.hasAttribute("data-cal-link")) {
        addNotes(clone, bookingNote(text, level, focus, data.junior));
        result.appendChild(note(NOTES_LINE));
      }
      var wrap = document.createElement("div");
      wrap.className = "matcher-actions";
      wrap.appendChild(clone);
      /* The matched card is above, usually off screen: a way back to it,
         where it is marked "Your match". */
      var see = document.createElement("button");
      see.type = "button";
      see.className = "link-btn";
      see.textContent = T.matchSeeCard || "See the card ↑";
      see.addEventListener("click", function () {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      wrap.appendChild(see);
      result.appendChild(wrap);
    }

    /* The card's label ("Your match") is drawn by CSS from this attribute. */
    card.setAttribute("data-match", T.matchLabel || "Your match");
    card.classList.add("is-match");
  }

  /* What Isaac reads in the booking: the visitor's own words, then the
     guesses, in English. */
  function bookingNote(text, level, focus, junior) {
    var parts = ["From the lesson matcher" + (T.pageName ? " (" + T.pageName + " page)" : "") + ": “" + text + "”"];
    if (level !== null) parts.push("Level guess: " + EN_LEVELS[level]);
    if (focus) parts.push("Wants to work on: " + EN_FOCUS[focus]);
    if (junior === true) parts.push("Player: a junior");
    return parts.join(". ") + ".";
  }

  function addNotes(link, notes) {
    var config = {};
    try { config = JSON.parse(link.getAttribute("data-cal-config") || "{}"); } catch (e) {}
    config.notes = notes;
    link.setAttribute("data-cal-config", JSON.stringify(config));
  }

  /* A template's {placeholders} filled in bold, the rest as plain text. */
  function fill(el, template, values) {
    template.split(/(\{\w+\})/).forEach(function (part) {
      var key = /^\{(\w+)\}$/.exec(part);
      if (key && values[key[1]] != null) {
        var strong = document.createElement("strong");
        strong.textContent = values[key[1]];
        el.appendChild(strong);
      } else if (part) {
        el.appendChild(document.createTextNode(part));
      }
    });
  }

  function say(message, travel) {
    result.textContent = "";
    result.appendChild(note(message));
    if (travel) result.appendChild(note(TRAVEL));
  }

  function note(text) {
    var p = document.createElement("p");
    p.textContent = text;
    return p;
  }

  function clearMatch() {
    var prev = document.querySelector(".lesson.is-match");
    if (prev) prev.classList.remove("is-match");
    result.textContent = "";
  }

  function setBusy(on) {
    button.disabled = on;
    button.textContent = on ? T.matchBusyButton || "Matching…" : buttonText;
    form.setAttribute("aria-busy", on ? "true" : "false");
  }

  function jevBase() {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return "http://localhost:8787";
    var meta = document.querySelector('meta[name="jev-endpoint"]');
    return meta ? meta.content.replace(/\/+$/, "") : "";
  }
})();
