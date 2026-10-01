/* ============================================================================
   Lesson matcher — the "Not sure which fits?" box above the lesson cards.

   The visitor's sentence goes to a Cloudflare Worker (worker/ in the repo),
   which holds the TypeSafe key and asks Jev which of the four offers fits.
   The Worker answers with a lesson key, or null when Jev could not tell,
   plus whether the visitor asked Isaac to travel. Everything the visitor
   sees is written here, in Isaac's voice; Jev only makes the decision.

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
     called; the line is the one reason it fits. */
  var COPY = {
    private: { name: "a private lesson", line: "One-on-one, built around what you want to fix." },
    semi:    { name: "a semi-private lesson", line: "Two of you share the hour — $55 each." },
    hitting: { name: "a hitting partner session", line: "Straight rallying, no instruction, $45 an hour." },
    group:   { name: "an adult clinic", line: "Small group on one court. Email me with how many of you there are and I'll quote it." },
  };
  var TRAVEL = "One thing: lessons are at my home court, Toscana in Irvine. I can't travel to you, but you're welcome to come to me.";
  var UNSURE = "I couldn't tell from that. Try your level and who's playing, or pick from the four below.";
  var DOWN = "The matcher isn't answering right now. The four options are just below, or email me.";
  var BUSY = "That's a lot of matching. Give it a minute, or pick from the four below.";

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
      body: JSON.stringify({ text: text }),
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        if (res.status === 429) throw new Error("busy");
        if (!res.ok) throw new Error("down");
        return res.json();
      })
      .then(show)
      .catch(function (err) { say(err && err.message === "busy" ? BUSY : DOWN); })
      .then(function () { window.clearTimeout(timer); setBusy(false); });
  });

  function show(data) {
    var card = data.lesson && document.querySelector('.lesson[data-lesson="' + data.lesson + '"]');
    if (!card) { say(UNSURE, data.travel); return; }

    var copy = COPY[data.lesson];
    result.textContent = "";

    var p = document.createElement("p");
    p.className = "matcher-answer";
    p.appendChild(document.createTextNode("Sounds like "));
    var strong = document.createElement("strong");
    strong.textContent = copy.name + ".";
    p.appendChild(strong);
    p.appendChild(document.createTextNode(" " + copy.line));
    result.appendChild(p);

    if (data.travel) result.appendChild(note(TRAVEL));

    /* The card's own action, cloned: a real Book link with data-cal-link
       (or the clinic's email link), so the calendar, the loading state and
       the Gmail hand-off all work exactly as they do on the card. */
    var action = card.querySelector(".lesson-actions .btn");
    if (action) {
      var clone = action.cloneNode(true);
      var wrap = document.createElement("div");
      wrap.className = "matcher-actions";
      wrap.appendChild(clone);
      result.appendChild(wrap);
    }

    card.classList.add("is-match");
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
    button.textContent = on ? "Matching…" : buttonText;
    form.setAttribute("aria-busy", on ? "true" : "false");
  }

  function jevBase() {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return "http://localhost:8787";
    var meta = document.querySelector('meta[name="jev-endpoint"]');
    return meta ? meta.content.replace(/\/+$/, "") : "";
  }
})();
