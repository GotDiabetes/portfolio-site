/* ============================================================================
   Isaac Lee — the theme toggle, copy email, footer year and a quiet reveal.

   The reveal returns by request: each block settles once as it comes into
   view. The command palette, cursor tilt and progress bar remain removed;
   the motion gives a little rhythm to a page that is still meant to be read.
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

  /* --------------------------------------------------------- 4. Reveal --
     The markup is visible by default. Only this running script arms hidden
     blocks, so a missing main.js cannot strand the text or portrait. */
  var fades = document.querySelectorAll(".fade");
  var motion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  if (fades.length && !(motion && motion.matches)
      && "IntersectionObserver" in window) {
    function reveal(el) {
      el.classList.remove("is-pending");
      el.classList.add("is-in");
      observer.unobserve(el);
    }

    function revealAll() {
      observer.disconnect();
      fades.forEach(function (el) {
        el.classList.remove("is-pending", "is-in");
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { threshold: 0, rootMargin: "0px 0px -6% 0px" });

    /* If an embedded browser never delivers observations, release the page.
       Register the fallback before arming any hidden states. */
    window.setTimeout(function () {
      if (!document.querySelector(".fade.is-in")) revealAll();
    }, 1500);

    document.querySelectorAll("section").forEach(function (section) {
      section.querySelectorAll(".fade").forEach(function (el, index) {
        el.style.setProperty("--d", Math.min(index, 4) * 0.06 + "s");
        el.classList.add("is-pending");
        observer.observe(el);
      });
    });

    /* Keyboard navigation must never focus a link inside an invisible block. */
    document.addEventListener("focusin", function (event) {
      var block = event.target.closest(".fade.is-pending");
      if (block) {
        reveal(block);
        block.classList.remove("is-in");
      }
    });

    if (motion && motion.addEventListener) {
      motion.addEventListener("change", function (event) {
        if (event.matches) revealAll();
      });
    }
  }
})();
