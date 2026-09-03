/* ============================================================================
   Isaac Lee Tennis — interaction. No libraries.

     1. Fade blocks in as they scroll into view
     2. Popups (booking, lesson details, photo lightbox)
     3. Copy-email button
     4. Mobile menu
     5. Footer year
   ========================================================================== */

(function () {
  "use strict";

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
    /* The reveal runs in both directions: blocks fade up as they come into
       view and fade back out as they leave, so scrolling up reverses the
       animation instead of leaving everything stuck on. That means we keep
       observing rather than unobserving after the first hit. */
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-in", entry.isIntersecting);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
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
        copyBtn.textContent = "Copied";
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
    toggle.setAttribute("aria-label", "Open menu");
  }

  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { closeMenu(); toggle.focus(); }
    });
  }

  /* ----------------------------------------------------- 5. Footer year -- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
