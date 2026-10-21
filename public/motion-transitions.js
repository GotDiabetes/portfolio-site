/* ============================================================================
   Transitions between states (styles in motion-transitions.css):

     1. Cross-document view transitions. The CSS opts the page in. The
        incoming page's half (marking a language change, so the words melt
        instead of wiping, and skipping under ?classic) is an inline
        script in each page's <head>: pagereveal fires before a deferred
        script like this one runs. This keeps the outgoing half: under
        ?classic, the page being left skips its transition too.
     2. window.leeMorph: tennis.js hands over a popup's open and close.
        The popup grows out of the card or button that opened it, with the
        page's own easing, and shrinks back on close. Reduced motion, or
        no Web Animations: the plain open.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var classic = root.classList.contains("classic");
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var EASE = "cubic-bezier(.22, 1, .36, 1)";

  /* ------------------------------------------- 1. Between pages -- */
  window.addEventListener("pageswap", function (e) {
    if (e.viewTransition && classic) e.viewTransition.skipTransition();
  });

  /* ------------------------------------------- 2. The card morph -- */
  if (classic || reduced || !Element.prototype.animate) return;
  var current = null;        // { dlg, from } while a morph is open

  function sourceFor(opener) {
    if (!opener || !opener.getBoundingClientRect) return null;
    return opener.closest(".lesson, .faq details, .review, .gift-line, .ask-panel") || opener;
  }
  function delta(from, to) {
    return "translate(" + (from.left - to.left) + "px, " + (from.top - to.top) + "px) scale(" + (from.width / to.width) + ", " + (from.height / to.height) + ")";
  }

  window.leeMorph = {
    open: function (dlg, opener, show) {
      /* Only the popups with a card inside grow; the photo lightbox has
         its own zoom (motion.js flies the picture out of its thumbnail). */
      if (!dlg.querySelector(".modal-card")) return false;
      var src = sourceFor(opener);
      if (!src) return false;
      var from = src.getBoundingClientRect();
      if (!from.width || !from.height) return false;
      show();
      /* The dialog is the full-screen dimmer; the card inside it is what grows. */
      var card = dlg.querySelector(".modal-card") || dlg;
      var to = card.getBoundingClientRect();
      if (!to.width || !to.height) return true;
      current = { dlg: dlg, src: src, card: card };
      card.style.transformOrigin = "0 0";
      card.animate(
        [{ transform: delta(from, to), opacity: .35 }, { transform: "none", opacity: 1 }],
        { duration: 460, easing: EASE }
      );
      return true;
    },
    close: function (dlg, hide) {
      if (!current || current.dlg !== dlg || !document.contains(current.src)) { current = null; return false; }
      var src = current.src, card = current.card; current = null;
      var to = src.getBoundingClientRect(), from = card.getBoundingClientRect();
      if (!to.width || !from.width) return false;
      var a = card.animate(
        [{ transform: "none", opacity: 1 }, { transform: delta(to, from), opacity: 0 }],
        { duration: 320, easing: "cubic-bezier(.4, 0, 1, 1)" }
      );
      var done = false;
      var finish = function () { if (done) return; done = true; hide(); };
      a.addEventListener("finish", finish);
      a.addEventListener("cancel", finish);
      window.setTimeout(finish, 400);
      return true;
    }
  };
})();
