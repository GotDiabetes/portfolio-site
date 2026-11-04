/* ============================================================================
   Flip cards: "What's covered" turns a lesson card over. After React Bits'
   FlipCard (reactbits.dev, MIT), rebuilt in plain JS. The turn itself is CSS
   (flip.css: a rotor with two faces, backface-visibility hidden); this
   script builds the back and keeps the state. The original's pointer tilt,
   glare and drag are left out: the page already has its own tilt.

   Markup it starts from (nothing is added to the HTML):
     <article class="lesson" data-lesson="private">
       …
       <div class="lesson-actions">
         <a class="btn …" data-cal-link="…">Book a private lesson</a>
         <button class="link-btn" data-open="modalPrivate">What's covered</button>
       </div>
     </article>
     <dialog class="modal" id="modalPrivate"><div class="modal-card">…

   The card's children move into a front face, untouched, and the back face
   is a copy of the popup's content, in the page's own language, without its
   close button. Ids, autofocus, tabindex and data-close go; the Cal, mail
   and data-open attributes stay. That is enough for the copies to work:
   tennis.js, bookfx.js and the Cal embed all listen on the document for
   [data-cal-link], [data-mail] and [data-open], which is how the matcher's
   and the chat's cloned Book buttons already book and count. The button
   loses data-open, so the popup no longer opens from it. The popups stay in
   the page: nothing else opens them today, but the chat can open any popup
   by id.

   The other scripts find the front first: match.js and ask.js ask for the
   first h3 and the first ".lesson-actions .btn", and the back uses the
   popup's ".actions", so they still get the card's own controls. motion.js
   has rolled the prices and features.js has added the tilt light by the time
   this runs (deferred scripts run in order), so the back gets a copy of that
   light and its prices stay still.

   With no script, or until the cards are near the screen, the button opens
   the popup as it always did. Reduced motion cross-fades the faces (CSS).
   ========================================================================== */

(function () {
  "use strict";

  var list = document.querySelector("#lessons .lesson-list");
  var cards = list ? list.querySelectorAll("article.lesson[data-lesson]") : [];
  if (!cards.length) return;

  var T = window.I18N || {};
  var BACK = T.flipBack || "Back";
  var STRIP = ["id", "autofocus", "tabindex", "data-close"];
  var canInert = "inert" in HTMLElement.prototype;

  function each(nodes, fn) { Array.prototype.forEach.call(nodes, fn); }
  function make(tag, cls) {
    var el = document.createElement(tag);
    el.className = cls;
    return el;
  }

  /* A copy must not repeat an id, take the focus or try to close a popup
     it is no longer in. */
  function clean(node) {
    [node].concat(Array.prototype.slice.call(node.querySelectorAll("*"))).forEach(function (el) {
      STRIP.forEach(function (name) { el.removeAttribute(name); });
    });
  }

  /* The face you can't see: inert, so it takes no focus and no clicks (the
     two faces share one grid cell), and aria-hidden as the original does.
     A browser without inert gets the same tab order by hand. */
  function conceal(face, hidden) {
    if (hidden) {
      face.setAttribute("inert", "");
      face.setAttribute("aria-hidden", "true");
    } else {
      face.removeAttribute("inert");
      face.removeAttribute("aria-hidden");
    }
    if (canInert) return;
    each(face.querySelectorAll("a[href], button"), function (el) {
      if (hidden) el.setAttribute("tabindex", "-1");
      else el.removeAttribute("tabindex");
    });
  }

  /* Focus goes with the turn: to Back on the way over, to "What's covered"
     on the way home. Done at once, not after the turn, so a keyboard is
     never left on a face that has gone inert. */
  function turn(card, toBack) {
    var parts = card.__flip;
    if (card.classList.contains("is-flipped") === toBack) return;
    card.classList.toggle("is-flipped", toBack);
    conceal(parts.back, !toBack);
    conceal(parts.front, toBack);
    parts.opener.setAttribute("aria-expanded", toBack ? "true" : "false");
    (toBack ? parts.backBtn : parts.opener).focus();
  }

  function build(card) {
    var opener = card.querySelector(".lesson-actions .link-btn[data-open]");
    var dialog = opener && document.getElementById(opener.getAttribute("data-open"));
    var source = dialog && dialog.querySelector(".modal-card");
    if (!source) return;

    var rotor = make("div", "flip-rotor");
    var front = make("div", "flip-face flip-front");
    var back = make("div", "flip-face flip-back");
    back.id = "flip-" + card.getAttribute("data-lesson");

    while (card.firstChild) front.appendChild(card.firstChild);

    /* Only what the back is for: the title, the list, and the card's main
       Book button. The price and the pitch are already on the front, and a
       card is as tall as its taller face, so repeating them would leave a
       hole in the front of every card. */
    each(source.children, function (child) {
      if (!/^(H3|UL)$/.test(child.tagName) && !child.classList.contains("actions")) return;
      var copy = child.cloneNode(true);
      clean(copy);
      back.appendChild(copy);
    });
    /* The popup's buttons are popup-sized; on a card they match the front's. */
    each(back.querySelectorAll(".actions .btn"), function (btn, i) {
      if (i) btn.parentNode.removeChild(btn);
      else btn.classList.add("btn-sm");
    });

    var row = back.querySelector(".actions");
    if (!row) {
      row = make("div", "actions");
      back.appendChild(row);
    }
    var backBtn = make("button", "link-btn flip-back-btn");
    backBtn.type = "button";
    backBtn.textContent = BACK;
    row.appendChild(backBtn);

    /* features.js's light moved with the card's children; the back needs
       its own, or the tilt would go dark on that side. */
    each(front.children, function (child) {
      if (child.classList.contains("tilt-light")) back.appendChild(child.cloneNode(true));
    });

    rotor.appendChild(front);
    rotor.appendChild(back);
    card.appendChild(rotor);
    card.classList.add("flip-card");

    opener.removeAttribute("data-open");
    opener.setAttribute("aria-expanded", "false");
    opener.setAttribute("aria-controls", back.id);
    conceal(back, true);

    card.__flip = { front: front, back: back, opener: opener, backBtn: backBtn };

    opener.addEventListener("click", function () { turn(card, true); });
    backBtn.addEventListener("click", function () { turn(card, false); });
    card.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !card.classList.contains("is-flipped")) return;
      e.preventDefault();
      turn(card, false);
    });

    /* "Your match" is drawn from the title's own data-match, and match.js
       marks the front title only; a card lying on its back gets the label
       too. */
    var title = back.querySelector("h3");
    if (title && "MutationObserver" in window) {
      var copyMatch = function () { title.setAttribute("data-match", card.getAttribute("data-match") || ""); };
      copyMatch();
      new MutationObserver(copyMatch).observe(card, { attributes: true, attributeFilter: ["data-match"] });
    }
  }

  /* Each card is as tall as its taller face, so building can change its
     height. more.js decides which stacked cards are too tall to stick from
     those heights, on load and on resize; a resize tells it to look again. */
  function buildAll() {
    each(cards, build);
    window.dispatchEvent(new Event("resize"));
  }

  /* Built a screen ahead of the visitor, so the cards have settled before
     they arrive. Cards already above the screen (a reload further down the
     page) are built at once, not while the visitor scrolls back past them. */
  if ("IntersectionObserver" in window) {
    var heard = false, built = false;
    var start = function () {
      if (built) return;
      built = true;
      io.disconnect();
      buildAll();
    };
    var io = new IntersectionObserver(function (entries) {
      heard = true;
      if (entries.some(function (en) { return en.isIntersecting || en.boundingClientRect.bottom < 0; })) start();
    }, { rootMargin: "100% 0px" });
    io.observe(list);
    /* A browser always reports once right after observe(); one that has
       said nothing after two seconds never will (some embedded browsers),
       so the cards are built anyway. Like heart.js. */
    setTimeout(function () { if (!heard) start(); }, 2000);
  } else {
    buildAll();
  }
})();
