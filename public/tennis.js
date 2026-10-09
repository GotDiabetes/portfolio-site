/* ============================================================================
   Isaac Lee Tennis — interaction. No libraries.

     1. Fade blocks in as they scroll into view
     2. Popups (booking, lesson details, photo lightbox)
     3. Copy-email button
     4. Mobile menu
     5. The clip in "In action"
     6. Email buttons open Gmail
     7. Booking before the calendar script has arrived
     8. Footer year
     9. Language menu
    10. Clinic list
    11. Gift request
    12. Review link
    13. Isaac's numbers (visit counts and page events)

   Words this file writes into the page come from window.I18N on the
   translated pages (tools/i18n/), and fall back to English here.
   ========================================================================== */

(function () {
  "use strict";

  var T = window.I18N || {};

  /* ------------------------------------------------------- 1. Fade in -- */
  // .fade lifts text and blocks; .fade-img eases photos out of a slight zoom.
  //
  // We deliberately do NOT skip this when the visitor prefers reduced motion.
  // The stylesheet handles that case by removing the movement and keeping a
  // plain cross-fade, which stays within the accessibility guidance.
  var fadeEls = document.querySelectorAll(".fade, .fade-img, .hero-drop");

  function revealAll() {
    fadeEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  if (!("IntersectionObserver" in window)) {
    revealAll();
  } else {
    /* Reveal once. It used to run in both directions, fading blocks back out
       as they left the viewport, and scrolling up to re-read a price replayed
       the whole entrance. A reading page should not animate again because
       the reader went back. The observer lets go of each block after its
       first arrival.

       The margin is zero rather than the -5% it was: on a short laptop
       viewport that strip held back the last few lines of whatever section
       the reader was in, so the page looked like it was withholding. */
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.05, rootMargin: "0px" }
    );
    fadeEls.forEach(function (el) { observer.observe(el); });

    /* Safety net. These elements start at opacity 0, so if the observer never
       delivers a callback — which happens in some embedded and non-rendering
       contexts — the page would sit there blank. If nothing at all has been
       revealed shortly after load, assume the observer is dead and show
       everything. A partial reveal means it's working, so we leave it alone. */
    window.setTimeout(function () {
      var revealed = document.querySelectorAll(".fade.is-in, .fade-img.is-in, .hero-drop.is-in").length;
      if (revealed === 0 && fadeEls.length > 0) {
        observer.disconnect();   // so it can't later toggle anything back off
        revealAll();
      }
    }, 1600);
  }

  /* --------------------------------------------------------- 2. Popups -- */
  var openerFocus = null;
  var dialogs = document.querySelectorAll("dialog");

  /* The scroll lock is derived from the DOM rather than from the "close"
     event, which does not fire reliably everywhere. A <dialog> can also be
     closed by the Escape key without our code ever running. Watching the
     open attribute catches every route, so the page can't be left stuck. */
  function syncDialogState() {
    var anyOpen = !!document.querySelector("dialog[open]");
    document.body.classList.toggle("modal-open", anyOpen);
    if (!anyOpen && openerFocus) {
      if (typeof openerFocus.focus === "function") {
        try { openerFocus.focus(); } catch (err) { /* opener may be gone */ }
      }
      openerFocus = null;
    }
  }

  if ("MutationObserver" in window) {
    var watcher = new MutationObserver(syncDialogState);
    dialogs.forEach(function (dlg) {
      watcher.observe(dlg, { attributes: true, attributeFilter: ["open"] });
    });
  }

  function openDialog(id) {
    var dlg = document.getElementById(id);
    if (!dlg || dlg.open) return;
    openerFocus = document.activeElement;
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    syncDialogState();
  }

  function closeDialog(dlg) {
    if (!dlg || !dlg.open) return;
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
    syncDialogState();
  }

  // data-open="dialogId" opens a popup; data-close closes the one it's inside.
  // Both on one button (the Book buttons) swaps one popup for the other.
  document.addEventListener("click", function (e) {
    var closer = e.target.closest("[data-close]");
    var opener = e.target.closest("[data-open]");

    if (closer) {
      closeDialog(closer.closest("dialog"));
      if (opener && opener === closer) {
        window.setTimeout(function () { openDialog(opener.getAttribute("data-open")); }, 180);
        return;
      }
    }
    if (opener && opener !== closer) {
      e.preventDefault();
      openDialog(opener.getAttribute("data-open"));
    }
  });

  dialogs.forEach(function (dlg) {
    // Clicking the dimmed area closes; clicking the card does not.
    dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDialog(dlg); });
    dlg.addEventListener("close", syncDialogState);
    dlg.addEventListener("cancel", function () { window.setTimeout(syncDialogState, 0); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") window.setTimeout(syncDialogState, 0);
  });

  /* ---- Photo lightbox ---- */
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxCap = document.getElementById("lightboxCap");

  if (lightboxImg) {
    document.querySelectorAll("[data-lightbox]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var inner = btn.querySelector("img");
        lightboxImg.setAttribute("src", btn.getAttribute("data-lightbox"));
        lightboxImg.setAttribute("alt", inner ? inner.alt : "");
        if (lightboxCap) lightboxCap.textContent = btn.getAttribute("data-caption") || "";
        openDialog("lightbox");
      });
    });
  }

  /* ----------------------------------------------------- 3. Copy email -- */
  var copyBtn = document.getElementById("copyEmail");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var email = copyBtn.getAttribute("data-email") || "";
      var original = copyBtn.textContent;
      var done = function () {
        copyBtn.textContent = T.copied || "Copied";
        window.setTimeout(function () { copyBtn.textContent = original; }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done).catch(fallback);
      } else {
        fallback();
      }

      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = email;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:absolute;left:-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (err) { /* no-op */ }
        document.body.removeChild(ta);
      }
    });
  }

  /* ---------------------------------------------------- 4. Mobile menu -- */
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");

  function closeMenu() {
    if (!nav) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", T.menuOpen || "Open menu");
  }

  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? (T.menuClose || "Close menu") : (T.menuOpen || "Open menu"));
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    /* A tap anywhere outside the menu and its toggle closes it, the way every
       other overlay on the page closes. Without this the open menu sat over
       the hero until the visitor found the toggle again. */
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("is-open")) return;
      if (e.target.closest("#nav") || e.target.closest("#navToggle")) return;
      closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { closeMenu(); toggle.focus(); }
    });
  }

  /* ------------------------------------------------------- 5. The clip --
     The poster is ours and the player is not fetched until someone asks for
     it. Swapping in the iframe on click keeps YouTube — its script, its
     cookies and its red chrome — off the page for everyone who only reads. */
  var play = document.querySelector(".video-play");
  if (play) {
    play.addEventListener("click", function () {
      var id = play.getAttribute("data-video");
      if (!id || play.classList.contains("is-playing")) return;

      var frame = document.createElement("iframe");
      /* autoplay because the click *was* the request to play; without it the
         viewer has to press a second button inside the player. */
      frame.src = "https://www.youtube-nocookie.com/embed/" + id +
                  "?autoplay=1&rel=0&playsinline=1";
      frame.title = play.getAttribute("aria-label") || "Video";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; " +
                    "gyroscope; picture-in-picture; web-share";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.allowFullscreen = true;

      play.innerHTML = "";
      play.appendChild(frame);
      play.classList.add("is-playing");
      play.removeAttribute("aria-label");
    });
  }

  /* -------------------------------------------------- 6. Email buttons --
     The href stays a real mailto:, so the link still works with no JS, still
     offers "copy email address" on right-click, and still reads as an email
     link to a screen reader. This only intercepts the plain left-click and
     sends it to Gmail's compose window instead, because a bare mailto: hands
     the visitor over to whatever desktop client their machine happens to have
     registered — on Windows that is usually Outlook, even for people who have
     never opened it. Modified clicks are left alone so ctrl/cmd-click, middle
     click and "open in new tab" keep doing what the browser normally does. */
  var MAIL_TO = "isaacleetennis@gmail.com";

  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest("[data-mail]");
    if (!link) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    /* data-mail is already URI-encoded. */
    if (gmail("&su=" + (link.getAttribute("data-mail") || ""))) e.preventDefault();
  });

  /* Opens Gmail's compose window to Isaac. Returns false if the popup was
     blocked, so the caller can fall back to mailto:. Not opened with the
     "noopener" feature: with it, window.open always returns null, which
     read as "blocked" and sent every click to the desktop mail app as
     well. The new window's opener is cut by hand instead. */
  function gmail(params) {
    var w = window.open("https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(MAIL_TO) + params, "_blank");
    if (!w) return false;
    try { w.opener = null; } catch (err) { /* cross-origin already */ }
    return true;
  }

  /* ------------------------------------------- 7. Booking before ready --
     The calendar script is deferred (see the loader in <head>). Every Book
     control is a real link to the event on cal.com, so with no script at all
     the click still lands on a booking page. This handles the narrower case:
     the script is on its way and the click beats it. Rather than navigate
     away from the page, hold the click, say so on the control, and replay it
     the moment the embed reports ready. If nothing arrives within a few
     seconds, let the link do what links do. */
  var calReady = document.documentElement.classList.contains("cal-ready");
  window.addEventListener("cal:ready", function () { calReady = true; });

  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-cal-link]");
    if (!el) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    /* The embed opens its popup on this click but leaves the link's own
       navigation alone, so a plain click would open the calendar and then
       leave the page for cal.com. Cancel the navigation; the popup is the
       point of the link, the href is only the fallback. */
    e.preventDefault();
    if (calReady) return;

    if (window.__loadCal) window.__loadCal();

    var label = el.querySelector(".cta-full") || el;
    var original = label.textContent;
    label.textContent = T.loadingCal || "Loading calendar…";
    el.setAttribute("aria-busy", "true");

    var fallback = window.setTimeout(function () {
      window.location.href = el.getAttribute("href") || "https://cal.com/isaac-lee-hlkghj";
    }, 6000);

    function replay() {
      window.clearTimeout(fallback);
      label.textContent = original;
      el.removeAttribute("aria-busy");
      /* A macrotask, not a frame: the embed binds its listeners synchronously
         on load, and rAF is paused in a background tab, which is exactly
         where a slow-loading visitor may have gone while waiting. */
      window.setTimeout(function () { el.click(); }, 0);
    }
    window.addEventListener("cal:ready", replay, { once: true });
    window.addEventListener("cal:error", function () {
      window.clearTimeout(fallback);
      window.location.href = el.getAttribute("href") || "https://cal.com/isaac-lee-hlkghj";
    }, { once: true });
  });

  /* ----------------------------------------------------- 8. Footer year -- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* --------------------------------------------------- 9. Language menu --
     A <details> in the header, so it opens and its links work with no
     script at all. This only adds the closing every other overlay on the
     page has: a tap outside, Escape, or opening the mobile menu. */
  var lang = document.querySelector(".lang");
  if (lang) {
    var closeLang = function () { lang.removeAttribute("open"); };
    document.addEventListener("click", function (e) {
      if (lang.open && !lang.contains(e.target)) closeLang();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lang.open) { closeLang(); lang.querySelector("summary").focus(); }
    });
    lang.addEventListener("toggle", function () { if (lang.open && nav) closeMenu(); });
  }

  /* ------------------------------------------------- 10. Clinic list --
     The popup's form becomes an email to Isaac, through the same Gmail
     hand-off as the email buttons (mailto: if the popup is blocked), sent
     from the visitor's own account so his reply goes straight back. The
     body is always English: the form's values are codes, and these are the
     words he reads, whatever language the visitor saw. Nothing is stored. */
  var clinicForm = document.getElementById("clinicForm");
  if (clinicForm) {
    var LEVELS = [
      "New to tennis (never played, or not since childhood)",
      "Beginner (can hit some balls back; rallies are short)",
      "Intermediate (rallies and serves; working on consistency)",
      "Advanced (plays matches: high school, league or USTA)",
      "Competitive (tournament junior, college, or 4.5+ adult)",
    ];
    var TIMES = {
      "weekday-afternoon": "weekday afternoons", "weekday-evening": "weekday evenings",
      "weekend-morning": "weekend mornings", "weekend-afternoon": "weekend afternoons",
    };
    var clinicError = clinicForm.querySelector(".form-error");
    var levelField = clinicForm.querySelector("select[name=level]");
    levelField.addEventListener("change", function () { clinicError.hidden = true; });

    clinicForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var level = levelField.value;
      if (!LEVELS[level]) {
        clinicError.hidden = false;
        levelField.focus();
        return;
      }
      clinicError.hidden = true;
      var group = clinicForm.querySelector("input[name=group]:checked");
      var times = Array.prototype.map.call(clinicForm.querySelectorAll("input[name=times]:checked"), function (b) { return TIMES[b.value]; });
      var notes = clinicForm.elements.notes.value.replace(/\s+/g, " ").trim();
      var lines = [
        "Please add me to the clinic list.",
        "",
        "Level: " + LEVELS[level],
        "Who's coming: " + (group && group.value === "own" ? "I'm bringing my own group" : "just me, please put me in a group"),
        "Times that usually work: " + (times.length ? times.join(", ") : "not given"),
      ];
      if (notes) lines.push("Anything else: " + notes);
      sendMail("Clinic list", lines);
      hit("clinic_list");
    });
  }

  /* Both forms end the same way: an English email to Isaac, through Gmail
     or, if its window is blocked, the visitor's mail app. */
  function sendMail(subject, lines) {
    subject += T.pageName ? " (" + T.pageName + " page)" : "";
    if (T.pageName) lines = lines.concat("", "(Sent from the " + T.pageName + " page.)");
    var body = lines.join("\n");
    if (!gmail("&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body))) {
      window.location.href = "mailto:" + MAIL_TO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }
  }

  /* ------------------------------------------------- 11. Gift request --
     The gift popup, the same way as the clinic list: codes in, English out.
     Isaac replies to settle payment in person and makes the card on
     /gift-card/. */
  var giftForm = document.getElementById("giftRequest");
  if (giftForm) {
    var GIFTS = {
      private1: "One private lesson ($80)", private5: "5 private lessons ($375)",
      private10: "10 private lessons ($700)", hitting1: "One hitting session ($45)",
    };
    var giftError = giftForm.querySelector(".form-error");
    giftForm.addEventListener("change", function () { giftError.hidden = true; });

    giftForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var picked = giftForm.querySelector("input[name=gift]:checked");
      if (!picked || !GIFTS[picked.value]) {
        giftError.hidden = false;
        giftForm.querySelector("input[name=gift]").focus();
        return;
      }
      giftError.hidden = true;
      var field = function (name) { return giftForm.elements[name].value.replace(/\s+/g, " ").trim(); };
      var lines = [
        "I'd like to give a lesson as a gift.",
        "",
        "Gift: " + GIFTS[picked.value],
        "For: " + (field("to") || "not given"),
        "From: " + (field("from") || "not given"),
      ];
      if (field("message")) lines.push("Message for the card: " + field("message"));
      lines.push("", "Please reply so we can settle payment in person.");
      sendMail("Gift lesson", lines);
      hit("gift");
    });
  }

  /* --------------------------------------------------- 12. Review link --
     Isaac's Google review link goes in the review-link meta tag once his
     Business Profile exists. Until then the request under the reviews stays
     hidden, so the page never points at nothing. */
  var reviewMeta = document.querySelector('meta[name="review-link"]');
  var reviewUrl = reviewMeta && /^https:\/\//.test(reviewMeta.content) ? reviewMeta.content : "";
  if (reviewUrl) {
    document.querySelectorAll("[data-review-link]").forEach(function (a) { a.href = reviewUrl; });
    document.querySelectorAll(".review-ask").forEach(function (p) { p.hidden = false; });
  }

  /* --------------------------------------------- 13. Isaac's numbers --
     Two sources, both counts with no record of who:
       · Cloudflare Web Analytics, for visits (which pages, which language,
         where people came from). No cookies, so no consent banner. Loads
         only when the cf-analytics meta tag holds Isaac's token, after the
         page has finished loading.
       · The Worker's /hit, for what only the page sees: Book pressed (and
         which lesson), the clinic list or a gift request sent, the chat
         opened, a visit from the flyer's QR code. sendBeacon, so it never
         holds up a click or a page change.
     Isaac reads both on /stats/. */
  var cfMeta = document.querySelector('meta[name="cf-analytics"]');
  if (cfMeta && /^[\w-]{16,64}$/.test(cfMeta.content) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    window.addEventListener("load", function () {
      var s = document.createElement("script");
      s.defer = true;
      s.src = "https://static.cloudflareinsights.com/beacon.min.js";
      s.setAttribute("data-cf-beacon", JSON.stringify({ token: cfMeta.content }));
      document.body.appendChild(s);
    });
  }

  function hitBase() {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return "http://localhost:8787";
    var meta = document.querySelector('meta[name="jev-endpoint"]');
    return meta ? meta.content.replace(/\/+$/, "") : "";
  }
  function hit(event) {
    var base = hitBase();
    if (!base || !navigator.sendBeacon) return;
    try {
      navigator.sendBeacon(base + "/hit", JSON.stringify({ event: event, page: T.lang || "en" }));
    } catch (err) { /* counting is never worth an error */ }
  }
  window.leeHit = hit;

  var BOOKED = { "60-min-private-lesson": "book_private", "60-min-semi-private-lesson": "book_semi", "60-min-hitting-session": "book_hitting" };
  /* One count per press: a click the calendar loader holds and replays a
     moment later (section 7) is the same press. */
  var counted = window.WeakMap ? new WeakMap() : null;
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-cal-link]");
    if (!el) return;
    if (counted) {
      if (Date.now() - (counted.get(el) || 0) < 8000) return;
      counted.set(el, Date.now());
    }
    var slug = (el.getAttribute("data-cal-link") || "").split("/").pop();
    hit(BOOKED[slug] || "book_other");
  });

  /* The flyer's QR code opens the page with ?from=flyer: counted once,
     then taken out of the address so a shared link doesn't count again. */
  if (/[?&]from=flyer\b/.test(location.search)) {
    hit("flyer_visit");
    if (window.history && history.replaceState) {
      var rest = location.search.replace(/[?&]from=flyer\b/, "").replace(/^&/, "?");
      history.replaceState(null, "", location.pathname + (rest === "?" ? "" : rest) + location.hash);
    }
  }
})();
