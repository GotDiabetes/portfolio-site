/* ============================================================================
   Isaac Lee — the only three things this page needs JavaScript for.

     1. The theme toggle
     2. The copy-email button
     3. The footer year

   Everything else that used to live here (scroll reveals, a command palette,
   counting statistics, cursor tilt, a progress bar) has been removed. None of
   it was doing anything for a reader, and collectively it made a written page
   behave like a product demo.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------------------------------------------------------- 1. Theme --
     The inline script in <head> has already applied the saved choice before
     first paint. This wires the button and keeps its label pointing at the
     destination rather than the current state. */
  var toggle = document.getElementById("themeToggle");
  var systemDark = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : { matches: false, addEventListener: null };

  function currentTheme() {
    var explicit = root.getAttribute("data-theme");
    if (explicit === "dark" || explicit === "light") return explicit;
    return systemDark.matches ? "dark" : "light";
  }

  function labelToggle() {
    if (!toggle) return;
    var next = currentTheme() === "dark" ? "light" : "dark";
    var label = toggle.querySelector(".theme-toggle-label");
    if (label) label.textContent = next === "dark" ? "Dark" : "Light";
    toggle.setAttribute("aria-label", "Switch to " + next + " theme");
  }

  if (toggle) {
    labelToggle();

    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* private mode */ }
      labelToggle();
    });

    /* If no explicit choice has been made, follow the system when it changes. */
    if (systemDark.addEventListener) {
      systemDark.addEventListener("change", function () {
        if (!root.hasAttribute("data-theme")) labelToggle();
      });
    }
  }

  /* ----------------------------------------------------- 2. Copy email -- */
  var copyBtn = document.getElementById("copyEmail");
  var copyStatus = document.getElementById("copyStatus");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var email = copyBtn.getAttribute("data-email") || "";
      var original = copyBtn.textContent;

      function done() {
        copyBtn.textContent = "copied";
        if (copyStatus) copyStatus.textContent = "Email address copied to clipboard.";
        window.setTimeout(function () { copyBtn.textContent = original; }, 1600);
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

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done).catch(fallback);
      } else {
        fallback();
      }
    });
  }

  /* ----------------------------------------------------- 3. Footer year -- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
