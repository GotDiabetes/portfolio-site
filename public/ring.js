/* ============================================================================
   Photo ring — cards seated around a tipped wheel, spun by dragging, thrown
   with momentum, and depth-sorted by hand every frame. No libraries.

   Markup: a [data-ring] element containing a .ring-source list of <figure>s,
   each with an <img> (the card thumbnail, optional data-full for the large
   view, width/height attributes for its shape) and a <figcaption>. That list
   IS the no-JS version: without this script it renders as a plain grid of
   captioned photographs. With it, the list is hidden and the same figures
   are rebuilt as a 3D ring.

   A figure can stand for a clip: data-video="<url>" on its <img> (and
   optionally data-poster) keeps the thumbnail on the card, adds a play mark,
   and opens a <video> in the lightbox instead of the photograph.

   Why depth is sorted here: the cards overlap and sit at shallow angles to
   one another, and a browser asked to resolve that in a shared 3D context
   flickers and slices cards through each other. Each card is instead
   projected on its own, and its z-index is set from its computed distance
   to the viewer on every frame.

   Options (data attributes on [data-ring]):
     data-ring-tilt   degrees the wheel is tipped toward the viewer (16)
     data-ring-yaw    degrees each card is turned from facing outward; 90 is
                      fully edge-out like a rolodex (48; 24 under 14 cards)
     data-ring-min    minimum card count; the set repeats to reach it (28)
   ========================================================================== */

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var NS = "http://www.w3.org/2000/svg";
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var coarse = window.matchMedia ? window.matchMedia("(pointer: coarse)") : null;
  var uid = 0;

  /* Cards keep their photograph's shape within these bounds: narrower than
     0.6 and a portrait reads as a sliver; wider than 1.7 and one screenshot
     takes a quarter of the wheel. */
  var ASPECT_MIN = 0.6, ASPECT_MAX = 1.7;
  /* Space between neighbouring cards, in card heights. */
  var GAP = 0.1;
  /* How far a crowded set may overlap on the wheel before the cards get
     smaller instead: 1.6 is a rolodex, more is a smear. */
  var OVERLAP = 1.6;
  /* The ring's share of the stage: cards no taller than half of it, the
     projected wheel within 90% of its height and its full width, with the
     widest card at its most side-on. */
  var CARD_SHARE = 0.5, HEIGHT_SHARE = 0.9, WIDTH_SHARE = 0.5;

  document.querySelectorAll("[data-ring]").forEach(mount);

  function mount(root) {
    var source = root.querySelector(".ring-source");
    if (!source) return;
    var figs = [].slice.call(source.querySelectorAll("figure")).filter(function (f) {
      return f.querySelector("img");
    });
    if (figs.length < 3) return;

    var items = figs.map(function (f) {
      var img = f.querySelector("img");
      var cap = f.querySelector("figcaption");
      var w = num(img.getAttribute("width"), 0);
      var h = num(img.getAttribute("height"), 0);
      var ratio = w > 0 && h > 0 ? w / h : 0.75;
      return {
        thumb: img.getAttribute("src"),
        full: img.getAttribute("data-full") || img.getAttribute("src"),
        video: img.getAttribute("data-video") || "",
        poster: img.getAttribute("data-poster") || img.getAttribute("data-full") || img.getAttribute("src"),
        alt: img.getAttribute("alt") || "",
        caption: cap ? cap.textContent.trim() : "",
        aspect: Math.max(ASPECT_MIN, Math.min(ASPECT_MAX, ratio))
      };
    });
    var L = items.length;

    var TILT = num(root.getAttribute("data-ring-tilt"), 16) * Math.PI / 180;
    var MIN = num(root.getAttribute("data-ring-min"), 28);
    var n = L * Math.max(1, Math.ceil(MIN / L));
    /* A crowded wheel reads best as a rolodex, cards turned well past
       face-out; a short one would show its cards nearly edge-on, so it
       turns them less and lets the photographs face the room. */
    var YAW = num(root.getAttribute("data-ring-yaw"), n < 14 ? 24 : 48) * Math.PI / 180;

    /* Each card gets a share of the circle in proportion to the room it
       takes along it, so a landscape card and a portrait one both sit an
       even gap from their neighbours. A card turned by the yaw takes less
       of the circle than its width. */
    var cosY = Math.cos(YAW);
    var foot = [], total = 0, maxAspect = 0;
    for (var f = 0; f < n; f++) {
      foot[f] = items[f % L].aspect * Math.abs(cosY) + GAP;
      total += foot[f];
      maxAspect = Math.max(maxAspect, items[f % L].aspect);
    }
    var angle = [], acc = 0;
    for (var g = 0; g < n; g++) {
      angle[g] = TAU * (acc + foot[g] / 2) / total;
      acc += foot[g];
    }

    /* ---------------------------------------------------------- DOM -- */
    var stage = el("div", "ring-stage");
    stage.tabIndex = 0;
    stage.setAttribute("role", "region");
    stage.setAttribute("aria-roledescription", "carousel");
    stage.setAttribute("aria-label",
      "Photographs. Arrow keys turn the ring; Enter opens the photograph in front.");

    var cards = [];
    var thumbs = [];               // [img, url] pairs, filled in once the ring is near
    for (var i = 0; i < n; i++) {
      var it = items[i % L];
      var card = el("div", "ring-card");
      card.setAttribute("data-index", String(i % L));
      if (it.video) card.classList.add("is-video");

      var front = el("div", "ring-face ring-front");
      var img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      front.appendChild(img);
      if (it.video) front.appendChild(playMark());

      /* The back carries the same photograph. Turned 180 degrees with the
         face, it reads the right way round from behind, so the far side of
         the wheel is pictures too, not a half-ring of blank paper. */
      var back = el("div", "ring-face ring-back");
      var bimg = img.cloneNode(false);
      back.appendChild(bimg);
      if (it.video) back.appendChild(playMark());

      thumbs.push([img, it.thumb], [bimg, it.thumb]);
      card.appendChild(front);
      card.appendChild(back);
      stage.appendChild(card);
      cards.push(card);
    }

    var status = el("p", "ring-status");
    status.setAttribute("aria-live", "polite");

    var controls = el("div", "ring-controls");
    var hint = el("p", "ring-hint");
    /* Pausing is for touch as much as for anyone: a phone has no hover to
       hold the wheel still while a caption is read. */
    var pauseBtn = el("button", "ring-pause");
    pauseBtn.type = "button";
    pauseBtn.textContent = "Pause";
    controls.appendChild(hint);
    controls.appendChild(pauseBtn);

    var box = buildLightbox();

    root.appendChild(stage);
    root.appendChild(controls);
    root.appendChild(status);
    root.appendChild(box.dialog);
    root.classList.add("is-live");

    function setHint() {
      hint.textContent = coarse && coarse.matches
        ? "Swipe to spin · tap a photo"
        : "Drag to spin · click a photo · arrow keys turn it";
    }
    setHint();

    /* ------------------------------------------------------ Geometry -- */
    var R = 300, ch = 187, cy = 0;

    /* The wheel is sized from the stage it has, not from fixed numbers: the
       largest card height whose ring still fits the stage, with the radius
       set so the cards go right round it with a small gap. A short set
       therefore gets large cards on a small wheel, a long one smaller cards
       on a large wheel, and a crowded one overlaps like a rolodex rather
       than shrinking to stamps.

       "Fits" is measured, not guessed: the corners of the widest card are
       carried round the wheel through the same transforms and perspective
       the browser will apply, and the projected box must sit inside the
       stage. The centre is then placed so the top and bottom margins match,
       so the wheel sits in the middle of the stage however far it is tipped. */
    function project(h, r, c, P, oy, H, W) {
      var sT = Math.sin(TILT), cT = Math.cos(TILT);
      var half = h * maxAspect / 2, hh = h / 2;
      var top = null, bot = null, reach = 0;
      for (var pass = 0; pass < 3; pass++) {
        top = bot = null; reach = 0;
        for (var s = 0; s < 36; s++) {
          var phi = s * TAU / 36;
          var sp = Math.sin(phi), cp = Math.cos(phi);
          var sa = Math.sin(phi + YAW), ca = Math.cos(phi + YAW);
          for (var cx = -1; cx <= 1; cx += 2) {
            for (var cyy = -1; cyy <= 1; cyy += 2) {
              var lx = cx * half, ly = cyy * hh;
              var x = lx * ca + r * sp;
              var z = -lx * sa + r * cp;
              var y2 = cT * ly + sT * z;
              var z2 = -sT * ly + cT * z;
              var k = P / (P - z2);
              var Y = (c + y2) * k;
              if (Math.abs(x * k) > reach) reach = Math.abs(x * k);
              if (!top || Y < top.Y) top = { Y: Y, y: y2, k: k };
              if (!bot || Y > bot.Y) bot = { Y: Y, y: y2, k: k };
            }
          }
        }
        c = (H - 2 * oy - top.y * top.k - bot.y * bot.k) / (top.k + bot.k);
      }
      return { c: c, span: bot.Y - top.Y, reach: reach };
    }

    function measure() {
      var W = stage.clientWidth, H = stage.clientHeight;
      if (!W || !H) return;
      var cs = getComputedStyle(stage);
      var P = parseFloat(cs.perspective) || 2000;
      var oy = parseFloat((cs.perspectiveOrigin || "").split(" ")[1]);
      if (!isFinite(oy)) oy = H * 0.3;

      function wide(h, r) { return project(h, r, 0, P, oy, H, W).reach <= W * WIDTH_SHARE; }
      /* The radius for a card height, or 0 if no radius fits: the full ring
         if the stage is wide enough, else the widest that fits, down to the
         most overlap allowed. */
      function radius(h) {
        var full = Math.max(0.6 * h, h * total / TAU);
        if (wide(h, full)) return full;
        var lo = full / OVERLAP, hi = full;
        if (!wide(h, lo)) return 0;
        for (var k = 0; k < 16; k++) {
          var mid = (lo + hi) / 2;
          if (wide(h, mid)) lo = mid; else hi = mid;
        }
        return lo;
      }
      function fits(h) {
        var r = radius(h);
        return r > 0 && project(h, r, 0, P, oy, H, W).span <= H * HEIGHT_SHARE;
      }
      var lo = 24, hi = H * CARD_SHARE;
      if (fits(hi)) lo = hi;
      else for (var k = 0; k < 18; k++) {
        var mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid; else hi = mid;
      }
      ch = Math.floor(lo);
      R = Math.round(radius(ch) || Math.max(0.6 * ch, ch * total / TAU / OVERLAP));
      cy = oy + project(ch, R, 0, P, oy, H, W).c;

      stage.style.setProperty("--ch", ch + "px");
      stage.style.setProperty("--cy", cy.toFixed(1) + "px");
      for (var i = 0; i < n; i++) {
        cards[i].style.setProperty("--cw", Math.round(ch * items[i % L].aspect) + "px");
      }
    }

    /* --------------------------------------------------------- State -- */
    var theta = -angle[0];         // wheel angle, radians; the first photo starts in front
    var reduce = mq ? mq.matches : false;
    var DRIFT = -0.00011;          // rad per ms: a slow drift, about 6 degrees a second
    var AUTO = reduce ? 0 : DRIFT;
    var vel = AUTO;
    var dragging = false;
    var target = null;             // keyboard stepping animates toward this
    var aim = null;                // ...which brings this card to the front
    var featured = -1;
    var hasFocus = false;          // the stage holds focus (announce what is in front)
    var holding = false;           // ...and it came by keyboard (hold the drift)
    var hovering = false;
    var paused = false;
    var openedByKey = false;

    function render() {
      var cosT = Math.cos(TILT);
      var best = -Infinity, bestI = 0;
      for (var i = 0; i < n; i++) {
        var phi = theta + angle[i];
        var c = Math.cos(phi);
        var depth = c * cosT;                  // +1 nearest, -1 furthest
        var facing = Math.cos(phi + YAW);      // how squarely the photo faces us
        var card = cards[i];

        card.style.transform =
          "rotateX(" + (-TILT) + "rad) rotateY(" + phi + "rad) translateZ(" + R + "px) rotateY(" + YAW + "rad)";
        card.style.zIndex = String(1000 + Math.round(depth * 500));

        /* Shade by how edge-on the card is and how far back it sits, so the
           ring reads as lit from the front without a single shadow. */
        var light = 0.28 + 0.72 * Math.abs(facing);
        light *= 0.62 + 0.38 * (depth + 1) / 2;
        card.style.setProperty("--shade", (1 - light).toFixed(3));

        /* The card in front is the one at the front of the wheel: nearest
           the viewer and on the stage's centre line. Not the one whose face
           happens to be squarest to us, which with a yaw sits off to one
           side. */
        if (c > best) { best = c; bestI = i; }
      }
      if (bestI !== featured) {
        if (featured >= 0) cards[featured].classList.remove("is-featured");
        featured = bestI;
        cards[featured].classList.add("is-featured");
        if (hasFocus) status.textContent = items[featured % L].caption;
      }
    }

    /* ---------------------------------------------------------- Loop -- */
    var running = false, raf = 0, last = 0, onScreen = false;

    function frame(t) {
      var dt = last ? Math.min(64, t - last) : 16;
      last = t;

      if (!dragging) {
        if (target !== null) {
          var k = reduce ? 1 : 1 - Math.pow(0.8, dt / 16);
          theta += (target - theta) * k;
          if (Math.abs(target - theta) < 0.0005) { theta = target; target = null; aim = null; vel = 0; }
        } else {
          var auto = (holding || hovering || paused || box.dialog.open) ? 0 : AUTO;
          theta += vel * dt;
          vel = auto + (vel - auto) * Math.pow(0.955, dt / 16);
        }
      }
      render();
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    /* Only spin while on screen and while the tab is visible. */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[entries.length - 1].isIntersecting;
        onScreen && !document.hidden ? start() : stop();
      }, { rootMargin: "100px" }).observe(stage);
    } else {
      onScreen = true;
      start();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (onScreen) start();
    });

    /* Thumbnails are not fetched until the ring is within a screen or so of
       being seen: on a long page it sits thousands of pixels down, and two
       hundred kilobytes of photographs nobody has scrolled to is a slower
       first paint for nothing. The large images wait for the lightbox. */
    var loaded = false;
    function loadThumbs() {
      if (loaded) return;
      loaded = true;
      thumbs.forEach(function (p) { p[0].src = p[1]; });
    }
    if ("IntersectionObserver" in window) {
      var near = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) { loadThumbs(); near.disconnect(); return; }
        }
      }, { rootMargin: "800px 0px" });
      near.observe(stage);
    } else {
      loadThumbs();
    }

    /* ------------------------------------------------------ Dragging -- */
    var lastX = 0, lastT = 0, moved = 0, downT = 0;

    stage.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      dragging = true;
      target = null;
      aim = null;
      moved = 0;
      lastX = e.clientX;
      lastT = downT = e.timeStamp;
      vel = 0;
      stage.classList.add("is-dragging");
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    });

    stage.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      var dt = Math.max(1, e.timeStamp - lastT);
      /* Dragging across the wheel's full width turns it about a half turn. */
      var d = dx * (Math.PI / (2 * R));
      theta += d;
      vel = 0.75 * (d / dt) + 0.25 * vel;
      moved += Math.abs(dx);
      lastX = e.clientX;
      lastT = e.timeStamp;
      if (!running) render();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      /* A pointer that stopped before letting go should not throw the wheel. */
      if (e.timeStamp - lastT > 80) vel = 0;
      if (reduce) vel = 0;
      /* A throw carries, but never further than the hand moved: capped at
         about a third of a turn a second, whatever the wheel's size. */
      vel = Math.max(-0.006, Math.min(0.006, vel * 0.7));
      if (moved < 6 && e.timeStamp - downT < 500 && e.type === "pointerup") {
        /* The card under the finger where it lifted, asked of the page
           rather than taken from the pointerdown: with the pointer captured
           to the stage, the event target is not the card that is on top. */
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        var card = hit && hit.closest ? hit.closest(".ring-card") : null;
        if (card && stage.contains(card)) {
          swallowClick();
          open(Number(card.getAttribute("data-index")), false);
        }
      }
    }
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);

    stage.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hovering = true; });
    stage.addEventListener("pointerleave", function () { hovering = false; });

    /* ------------------------------------------------------ Keyboard -- */
    /* A click focuses the stage too (it has a tabindex), but only focus that
       arrived by keyboard holds the drift: a mouse user who clicked once
       should not find the wheel frozen until they click somewhere else. */
    stage.addEventListener("focus", function () {
      hasFocus = true;
      holding = focusVisible(stage);
      status.textContent = items[Math.max(0, featured) % L].caption;
    });
    stage.addEventListener("blur", function () { hasFocus = false; holding = false; });

    stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        holding = true;
        /* Step to the next card's own angle rather than by a fixed amount:
           cards take shares of the circle by their width, and the step
           should land the next photograph squarely in front. */
        var from = target === null ? theta : target;
        var base = aim === null ? featured : aim;
        aim = (base + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
        var t = -angle[aim];
        target = t + TAU * Math.round((from - t) / TAU);
        vel = 0;
        if (!running) { theta = target; target = null; aim = null; render(); }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(featured % L, true);
      }
    });

    /* --------------------------------------------------------- Pause -- */
    pauseBtn.addEventListener("click", function () {
      paused = !paused;
      /* The label names the action, the way a media player's button does, so it
         carries no pressed state: "Play, pressed" would describe it twice. */
      pauseBtn.textContent = paused ? "Play" : "Pause";
    });

    /* ------------------------------------------------------ Lightbox -- */
    var current = 0;
    var locked = null;

    function open(i, byKey) {
      openedByKey = byKey;
      current = (i + L) % L;
      show(false);
      lockScroll();
      if (typeof box.dialog.showModal === "function") box.dialog.showModal();
      else box.dialog.setAttribute("open", "");
      box.close.focus();
    }

    function show(announce) {
      var it = items[current];
      stopVideo();
      if (it.video) {
        box.img.hidden = true;
        box.img.removeAttribute("src");
        box.video.hidden = false;
        box.video.poster = it.poster;
        box.video.setAttribute("aria-label", it.alt);
        box.video.src = it.video;
      } else {
        box.video.hidden = true;
        box.img.hidden = false;
        box.img.src = it.full;
        box.img.alt = it.alt;
      }
      box.dialog.setAttribute("aria-label", it.video ? "Video" : "Photograph");
      box.cap.textContent = it.caption;
      box.count.textContent = (current + 1) + " / " + L;
      /* Prev and next change what the dialog shows without moving focus, so
         the change is spoken from a live region. Opening needs no such help:
         the dialog is described by its caption. */
      if (announce) box.live.textContent = it.caption + ", " + (current + 1) + " of " + L;
    }

    /* A video left playing in a closed dialog keeps talking; one merely
       paused keeps its download open. Both are let go. */
    function stopVideo() {
      var v = box.video;
      if (!v.getAttribute("src")) return;
      v.pause();
      v.removeAttribute("src");
      v.load();
    }

    function shut() {
      if (typeof box.dialog.close === "function") box.dialog.close();
      else { box.dialog.removeAttribute("open"); onClose(); }
    }

    /* The page behind a modal should not scroll under the reader's wheel.
       Hiding the scrollbar would slide the page sideways by its width, so
       that width is put back as padding; everything is restored exactly. */
    function lockScroll() {
      if (locked) return;
      var html = document.documentElement, body = document.body;
      var gap = window.innerWidth - html.clientWidth;
      var stable = /stable/.test(getComputedStyle(html).scrollbarGutter || "");
      locked = { overflow: html.style.overflow, pad: body.style.paddingRight };
      if (gap > 0 && !stable) {
        body.style.paddingRight = (parseFloat(getComputedStyle(body).paddingRight) || 0) + gap + "px";
      }
      html.style.overflow = "hidden";
    }
    function unlockScroll() {
      if (!locked) return;
      document.documentElement.style.overflow = locked.overflow;
      document.body.style.paddingRight = locked.pad;
      locked = null;
    }

    function onClose() {
      stopVideo();
      unlockScroll();
      box.live.textContent = "";
      /* Focus goes back to the ring only for someone who opened it from the
         ring by keyboard. After a click, a focused stage would hold the
         drift still for no reason, so it lets go of focus instead. */
      if (openedByKey) stage.focus({ preventScroll: true });
      else if (document.activeElement === stage) stage.blur();
    }

    box.prev.addEventListener("click", function () { current = (current - 1 + L) % L; show(true); });
    box.next.addEventListener("click", function () { current = (current + 1) % L; show(true); });
    box.close.addEventListener("click", shut);
    /* The backdrop closes the dialog only when the press began on it too, so
       a drag that starts on the photograph and ends outside does not. */
    var downOnBackdrop = false;
    box.dialog.addEventListener("pointerdown", function (e) { downOnBackdrop = e.target === box.dialog; });
    box.dialog.addEventListener("click", function (e) {
      if (e.target === box.dialog && downOnBackdrop) shut();
      downOnBackdrop = false;
    });
    box.dialog.addEventListener("keydown", function (e) {
      /* Arrow keys on a focused video seek it; leave them to the video. */
      if (e.target === box.video) return;
      if (e.key === "ArrowRight") { e.preventDefault(); box.next.click(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); box.prev.click(); }
    });
    box.dialog.addEventListener("close", onClose);

    /* ----------------------------------------------------- Lifecycle -- */
    function syncMotion() {
      reduce = mq ? mq.matches : false;
      AUTO = reduce ? 0 : DRIFT;
      /* Under reduced motion there is no drift to pause. */
      pauseBtn.hidden = reduce;
    }
    syncMotion();
    measure();
    render();
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { measure(); render(); }).observe(stage);
    } else {
      window.addEventListener("resize", function () { measure(); render(); });
    }
    if (mq && mq.addEventListener) mq.addEventListener("change", syncMotion);
    if (coarse && coarse.addEventListener) coarse.addEventListener("change", setHint);
  }

  function buildLightbox() {
    var id = "ring-lightbox-caption-" + (++uid);
    var dialog = el("dialog", "ring-lightbox");
    dialog.setAttribute("aria-label", "Photograph");
    dialog.setAttribute("aria-describedby", id);
    var fig = el("figure", "ring-lightbox-figure");
    var img = document.createElement("img");
    var video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "metadata";
    video.hidden = true;
    var cap = el("figcaption", "ring-lightbox-caption");
    cap.id = id;
    var count = el("span", "ring-lightbox-count");
    var bar = el("div", "ring-lightbox-bar");
    var prev = button("ring-lightbox-btn", "Previous photograph", "M15 5l-7 7 7 7");
    var next = button("ring-lightbox-btn", "Next photograph", "M9 5l7 7-7 7");
    var close = button("ring-lightbox-btn ring-lightbox-close", "Close", "M6 6l12 12M18 6L6 18");
    var live = el("p", "ring-status");
    live.setAttribute("aria-live", "polite");
    fig.appendChild(img);
    fig.appendChild(video);
    fig.appendChild(cap);
    bar.appendChild(prev);
    bar.appendChild(count);
    bar.appendChild(next);
    bar.appendChild(close);
    dialog.appendChild(fig);
    dialog.appendChild(bar);
    dialog.appendChild(live);
    return { dialog: dialog, img: img, video: video, cap: cap, count: count,
             prev: prev, next: next, close: close, live: live };
  }

  /* Drawn icons, one stroke weight, rather than arrow and times glyphs whose
     shape depends on whichever font the machine happens to have. */
  function button(cls, label, path) {
    var b = el("button", cls);
    b.type = "button";
    b.setAttribute("aria-label", label);
    var svg = icon();
    svg.appendChild(stroke("path", { d: path, fill: "none" }));
    b.appendChild(svg);
    return b;
  }

  /* The play mark on a video card: a ring and a triangle in the same stroke
     as the lightbox icons, on a faint dark disc so it holds on a pale
     photograph as well as a dark one. */
  function playMark() {
    var svg = icon();
    svg.setAttribute("class", "ring-play");
    svg.appendChild(stroke("circle", { cx: "12", cy: "12", r: "10.25", fill: "rgba(12,12,12,.38)" }));
    svg.appendChild(stroke("path", { d: "M10 8.6v6.8l5.2-3.4z", fill: "currentColor" }));
    return svg;
  }

  function icon() {
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    return svg;
  }
  function stroke(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    e.setAttribute("stroke", "currentColor");
    e.setAttribute("stroke-width", "1.6");
    e.setAttribute("stroke-linecap", "round");
    e.setAttribute("stroke-linejoin", "round");
    return e;
  }

  /* A tap opens the lightbox on pointerup, and the browser then sends the
     tap's click to whatever is under the finger now: the new backdrop, or a
     lightbox button that happens to sit there. That one click is dropped. */
  function swallowClick() {
    function eat(e) { e.stopPropagation(); e.preventDefault(); done(); }
    function done() { window.removeEventListener("click", eat, true); clearTimeout(timer); }
    var timer = setTimeout(done, 400);
    window.addEventListener("click", eat, true);
  }

  function focusVisible(node) {
    try { return node.matches(":focus-visible"); } catch (err) { return true; }
  }
  function el(tag, cls) { var e = document.createElement(tag); e.className = cls; return e; }
  function num(v, d) { var x = parseFloat(v); return isFinite(x) ? x : d; }
})();
