/* ============================================================================
   The coach application (/coach/).

   As the coach types, this works out what they keep of each rate and fills
   the listing preview. On send it checks the required answers, marking each
   one that is missing, and posts everything to the Worker as one English
   text (POST /signup, kind "coach"), which /admin/ lists and can copy.

   If the Worker can't be reached the button turns into the email hand-off,
   the same way the clinic and gift forms do (tennis.js, which this page
   doesn't load): Gmail's compose window on a desktop, the mail app elsewhere.

   Everything typed here is set as text, never as markup.
   ========================================================================== */

(function () {
  "use strict";

  var form = document.getElementById("coachForm");
  if (!form) return;

  var MAIL_TO = "21euisungisaac@gmail.com";
  var f = form.elements;
  var errorBox = document.getElementById("coachError");
  var words = document.getElementById("splitWords");
  var bioCount = document.getElementById("bioCount");
  var plainWords = words.textContent;

  function value(name) { return f[name].value.replace(/\s+/g, " ").trim(); }
  function picked(name) {
    return Array.prototype.filter.call(form.querySelectorAll('input[name="' + name + '"]'), function (el) { return el.checked; })
      .map(function (el) { return el.value; });
  }
  function slot(name) { return form.querySelector('[data-l="' + name + '"]'); }

  /* A rate in whole dollars, or 0 for none. */
  function rate(name) { return parseInt(f[name].value, 10) || 0; }
  /* 10% of a whole-dollar rate has at most one decimal place. */
  function money(n) { return "$" + (n % 1 ? n.toFixed(2) : String(n)); }
  function fee(n) { return Math.round(n * 10) / 100; }
  function keep(n) { return Math.round(n * 90) / 100; }

  /* ------------------------------------------------- 1. As they type -- */
  function fill(el, text, blank) {
    el.textContent = text || blank;
    el.classList.toggle("is-blank", !text);
  }
  function initials(name) {
    var parts = name.split(" ").filter(Boolean);
    if (!parts.length) return "You";
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : "")).toUpperCase();
  }
  function atToscana() { return picked("where")[0] === "Toscana"; }
  function courtLine() {
    if (atToscana()) return "Toscana, Irvine";
    return [value("court"), value("city")].filter(Boolean).join(", ");
  }
  function certs() {
    var list = picked("cert");
    if (value("certOther")) list.push(value("certOther"));
    return list;
  }

  function draw() {
    ["ratePrivate", "rateSemi", "rateHitting"].forEach(function (name) {
      var out = form.querySelector('output[for="' + name + '"]');
      out.textContent = rate(name) ? "You keep " + money(keep(rate(name))) : "";
    });
    var main = rate("ratePrivate");
    words.textContent = main ? "Charge " + money(main) + " and you keep " + money(keep(main)) + ". I take " + money(fee(main)) + "." : plainWords;

    var name = value("name");
    slot("initials").textContent = initials(name);
    fill(slot("name"), name, "Your name");
    fill(slot("court"), courtLine(), "Your court");
    fill(slot("bio"), value("bio"), "A few sentences about you go here.");
    slot("rate").textContent = main ? "$" + main : "$—";
    slot("rate").parentNode.classList.toggle("is-blank", !main);

    var more = [];
    if (rate("rateSemi")) more.push("Semi-private $" + rate("rateSemi"));
    if (rate("rateHitting")) more.push("Hitting $" + rate("rateHitting"));
    slot("more").textContent = more.join(" · ");
    slot("more").hidden = !more.length;

    var facts = picked("who").concat(certs());
    if (value("times")) facts.push(value("times"));
    slot("facts").textContent = facts.join(" · ");
    slot("facts").hidden = !facts.length;

    slot("book").textContent = name ? "Book " + name.split(" ")[0] : "Book a lesson";
    bioCount.textContent = f.bio.value.length + " of 400";

    /* Questions that depend on another answer. An answer given before its
       question went away isn't checked or sent. */
    var juniors = picked("who").indexOf("Juniors") !== -1;
    form.querySelector('[data-when="juniors"]').hidden = !juniors;
    form.querySelector('[data-when="toscana"]').hidden = !atToscana();
    form.querySelector('[data-when="other"]').hidden = picked("where")[0] !== "Other";
    form.querySelector('[data-when="unsure"]').hidden = picked("permission")[0] !== "Not sure yet";
  }

  /* Whole dollars only, whatever is typed or pasted. */
  form.addEventListener("input", function (e) {
    if (e.target.closest(".rate-box")) e.target.value = e.target.value.replace(/\D/g, "");
    draw();
    unmark(e.target);
    errorBox.hidden = true;
  });
  form.addEventListener("change", function (e) { draw(); unmark(e.target); });

  /* ------------------------------------------------- 2. Checking it ---- */
  function holder(el) { return el.closest("fieldset[data-need]") || el; }
  function box(el) { return el.closest(".field") || el.closest(".choice"); }
  function unmark(el) {
    var target = holder(el);
    var note = target.__error;
    if (!note) return;
    note.remove();
    target.__error = null;
    target.removeAttribute("aria-invalid");
    target.removeAttribute("aria-describedby");
    if (target.__describedBy) target.setAttribute("aria-describedby", target.__describedBy);
  }
  var errorId = 0;
  function mark(target, text) {
    var note = document.createElement("p");
    note.className = "field-error";
    note.id = "coachError" + (++errorId);
    note.textContent = text;
    target.__describedBy = target.getAttribute("aria-describedby") || "";
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-describedby", (target.__describedBy + " " + note.id).trim());
    target.__error = note;
    /* A confirm box is a row in its fieldset: its note sits straight after it. */
    if (target.type === "checkbox") target.closest(".choice").after(note);
    else (target.tagName === "FIELDSET" ? target : box(target)).appendChild(note);
  }
  function problem(el) {
    if (el.closest("[hidden]")) return "";
    if (el.tagName === "FIELDSET") return el.querySelector("input:checked") ? "" : el.getAttribute("data-need");
    if (el.type === "checkbox") return el.checked ? "" : el.getAttribute("data-need");
    if (!el.value.trim()) return el.getAttribute("data-need");
    if (el.name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email"))) return "That email doesn't look right. Check it and try again.";
    if (el.name === "phone" && (el.value.match(/\d/g) || []).length < 7) return "Add a phone number with at least seven digits.";
    if (el.name === "ratePrivate" && !rate("ratePrivate")) return "Add a rate of at least $1.";
    return "";
  }
  function check() {
    var bad = [];
    Array.prototype.forEach.call(form.querySelectorAll("[data-need]"), function (el) {
      if (el.__error) unmark(el);
      var text = problem(el);
      if (!text) return;
      mark(el, text);
      bad.push(el);
    });
    return bad;
  }

  /* ------------------------------------------------- 3. Sending it ----- */
  function lines() {
    var main = rate("ratePrivate");
    var out = [
      "COURT",
      "Court: " + courtLine(),
      "Permission: " + (atToscana() ? "Toscana, Isaac's home court" : picked("permission")[0]),
      "",
      "RATES (per hour, before the 10%)",
      "Private: $" + main + " (keeps " + money(keep(main)) + ", Lee Tennis Co. " + money(fee(main)) + ")",
    ];
    if (rate("rateSemi")) out.push("Semi-private: $" + rate("rateSemi"));
    if (rate("rateHitting")) out.push("Hitting session: $" + rate("rateHitting"));
    out.push("", "COACHING", "Years coaching: " + value("years"), "Coaches: " + picked("who").join(", "));
    if (picked("who").indexOf("Juniors") !== -1) out.push("USTA Safe Play: " + (picked("safeplay")[0] || "not given"));
    out.push("Certifications: " + (certs().join(", ") || "none given"), "Liability insurance: " + picked("insurance")[0]);
    out.push("", "LISTING (agreed to publish)", "Bio: " + value("bio"), "Usually teaches: " + (value("times") || "not given"), "Booking link: " + (value("booking") || "none yet"));
    if (value("notes")) out.push("", "PRIVATE NOTE", value("notes"));
    out.push("", "CONFIRMED", "Only gives paid lessons where allowed: yes", "Pays 10% of site-booked lessons each month, by Zelle or cash: yes", "OK to list name, photo, bio, court and rates once agreed: yes");
    return out;
  }
  function base() {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return "http://localhost:8787";
    var meta = document.querySelector('meta[name="jev-endpoint"]');
    return meta ? meta.content.replace(/\/+$/, "") : "";
  }
  function sendMail(contact, body) {
    var text = ["Name: " + value("name"), "Contact: " + contact, ""].concat(body).join("\n");
    var subject = "Coach application: " + value("name");
    var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
    var w = fine ? window.open("https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(MAIL_TO) + "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text), "_blank") : null;
    if (w) { try { w.opener = null; } catch (err) { /* cross-origin already */ } return; }
    window.location.href = "mailto:" + MAIL_TO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
  }
  function finished() {
    var done = document.getElementById("coachDone");
    document.getElementById("coachDoneTo").textContent = value("email");
    form.hidden = true;
    document.querySelector(".coach-apply-head").hidden = true;
    done.hidden = false;
    done.focus();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = check();
    if (bad.length) {
      errorBox.textContent = bad.length === 1 ? "One answer still needs you. It's marked above." : bad.length + " answers still need you. They're marked above.";
      errorBox.hidden = false;
      var first = bad[0].tagName === "FIELDSET" ? bad[0].querySelector("input") : bad[0];
      first.focus();
      return;
    }
    errorBox.hidden = true;

    var contact = value("email") + ", " + value("phone");
    var body = lines();
    var url = base();
    if (form.__fallback || !url || !window.fetch) { sendMail(contact, body); return; }

    var button = form.querySelector("button[type=submit]");
    var label = button.textContent;
    button.disabled = true;
    button.textContent = "Sending…";
    button.setAttribute("aria-busy", "true");
    /* A connection that stalls rather than fails is cut off after 12 seconds
       and goes to the email hand-off like any other failure. */
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl ? window.setTimeout(function () { ctl.abort(); }, 12000) : 0;
    var settle = function () {
      window.clearTimeout(timer);
      button.disabled = false;
      button.textContent = label;
      button.removeAttribute("aria-busy");
    };
    fetch(url + "/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "coach", name: value("name"), contact: contact, body: body.join("\n"), lang: "en" }),
      signal: ctl ? ctl.signal : undefined,
    }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(function () {
      settle();
      finished();
    }).catch(function () {
      settle();
      form.__fallback = true;
      errorBox.textContent = "That didn't send. Press the button again to email me your answers instead.";
      errorBox.hidden = false;
    });
  });

  draw();
})();
