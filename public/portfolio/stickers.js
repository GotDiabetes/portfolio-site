/* ============================================================================
   Isaac Lee — the stickers in Outside work.

   The three Outside work entries each name a photograph (data-sticker, with
   data-sticker-alt describing it). This script turns each one into a die-cut
   photo sticker in the entry's margin column, under the date and the place:
   a paper border, a hairline round the sticker and another round the
   photograph, tilted a few degrees, matte, no shadow. On a phone the margin
   column is a meta line, so the sticker shrinks to about 72px and floats
   beside the heading instead.

   Hover a sticker and the corner nearest the pointer peels back to show the
   paper behind it; press and it peels further. Drag it and it comes off the
   page: it can be carried and thrown, slides, bounces off the edges and
   lands where it stops. A lifted sticker lives in #outside, positioned
   absolutely, and its floor is the foot of the text column: it never goes
   down onto the photo ring, which has a drag of its own. With a sticker
   focused, the arrow keys move it (Shift for bigger steps).

   It never gets in the way. At home it has its own space in the margin. If
   it lands on text or a link it lets the pointer through (data-over), so
   the text can still be selected and the link followed, and this script
   then finds it by its geometry instead. A press on it over blank paper
   picks it up at once. Over text a mouse picks it up by holding still for a
   moment, which a text selection never does; a finger just scrolls.

   After React Bits' StickerPeel (reactbits.dev, MIT), rebuilt in plain JS.
   The WebGL cylinder curl is a 2D canvas fold here: the peeled corner is
   mirrored across the fold line and drawn as the sticker's paper back. The
   swing while dragging and the throw (a 90 ms velocity window, a 2600 px/s
   cap, friction, bounce) are the original's numbers.

   Without JavaScript the entries read exactly as before. With reduced motion
   a sticker neither peels nor swings and stops where it is let go; it can
   still be dragged. The photographs are not fetched until the section is
   near the screen. Colours come from the --st-* properties in stickers.css.
   ========================================================================== */

(function () {
  "use strict";

  var section = document.getElementById("outside");
  if (!section || !window.requestAnimationFrame) return;
  var entries = section.querySelectorAll("article.entry[data-sticker]");
  if (!entries.length) return;
  /* The text column. Its foot is the floor for a lifted sticker: below it
     is the ring, where a press already means "spin". */
  var wrap = section.querySelector(".wrap") || section;

  function query(q) { return window.matchMedia ? window.matchMedia(q) : null; }
  function onChange(mq, fn) {
    if (!mq) return;
    if (mq.addEventListener) mq.addEventListener("change", fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  var motion = query("(prefers-reduced-motion: reduce)");
  var small = query("(max-width: 40rem)");
  function reduced() { return !!(motion && motion.matches); }

  /* Sizes in CSS pixels. A sticker is W wide. Its photograph keeps its own
     proportion, held between 4:3 across and 6:7 up so a tall picture does
     not make a tall sticker. On a phone the whole thing scales to SMALL_W. */
  var W = 110, BORDER = 7, PW = W - 2 * BORDER, SMALL_W = 72;
  var MIN_RATIO = 3 / 4, MAX_RATIO = 7 / 6;
  var TILT = [-4, 3, -3];                 // degrees, one per sticker in turn
  /* A fold at 45° cuts a corner, where the original's 25% and 40% would cut
     half the sticker at this size, so these two are smaller. */
  var HOVER_PEEL = .13, ACTIVE_PEEL = .22;
  var CURL = 10, SWING = 1, FRICTION = .5, BOUNCE = .35, GROW = .07;
  var HOLD = 380;                         // ms a press on covered text must stay still
  var CONTROLS = "a, button, input, select, textarea, label, summary, [contenteditable]";
  var ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  /* A spring on st[key] with velocity st[key + "V"], as the original's. */
  function spring(st, key, target, freq, damping, dt) {
    var w = 2 * Math.PI * freq, vk = key + "V";
    st[vk] += (w * w * (target - st[key]) - 2 * damping * w * st[vk]) * dt;
    st[key] += st[vk] * dt;
  }

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var k = small && small.matches ? SMALL_W / W : 1;
  var bounds = { w: 1, h: 1 };
  var stack = 0, raf = 0, last = 0, queued = 0;
  var active = null;              // the sticker in the hand
  var hold = null;                // a press on covered text, not yet a pick-up
  var swallowClick = false, guarded = false, listening = false, loaded = false;
  var colours = null;
  var stickers = [];

  /* ------------------------------------------------------- 1. The slots --
     Built straight away, so the entries take their final height while they
     are still far below the screen. A tall photograph is assumed until the
     real one arrives; only a wide one changes it, and that entry's text is
     taller than its margin column. */
  Array.prototype.forEach.call(entries, function (entry, i) {
    var src = entry.getAttribute("data-sticker");
    var when = entry.querySelector(".entry-when"), body = entry.querySelector(".entry-body");
    if (!src || !when || !body) return;
    var slot = document.createElement("span");
    slot.className = "sticker-home";
    var ph = Math.round(PW * MAX_RATIO);
    stickers.push({
      src: src, alt: entry.getAttribute("data-sticker-alt") || "",
      when: when, body: body, slot: slot, el: null, ctx: null, face: null, img: null,
      w: W, h: ph + 2 * BORDER, ph: ph, tilt: TILT[i % TILT.length] * Math.PI / 180,
      ready: false, free: false, over: false, restless: false, z: 0,
      x: 0, y: 0, vx: 0, vy: 0, swing: 0, swingV: 0, peel: 0, peelV: 0, lift: 0, liftV: 0,
      dir: Math.PI / 4, hover: false, local: { x: 0, y: 0 }, press: null,
      pivotV: { x: 0, y: 0 }, drawn: "", transform: ""
    });
  });
  if (!stickers.length) return;
  section.classList.add("stickers-on");

  /* Moving a focused element in the DOM drops its focus, so it is put back. */
  function moveTo(el, parent, before) {
    var focused = document.activeElement === el;
    parent.insertBefore(el, before || null);
    if (focused) el.focus({ preventScroll: true });
  }

  function placeSlot(s) {
    var parent = k < 1 ? s.body : s.when;
    if (s.slot.parentNode !== parent) moveTo(s.slot, parent, k < 1 ? parent.firstChild : null);
    s.slot.style.width = s.w * k + "px";
    s.slot.style.height = s.h * k + "px";
    if (!s.free) { s.x = s.w * k / 2; s.y = s.h * k / 2; }
  }
  stickers.forEach(placeSlot);

  /* ----------------------------------------------------- 2. The picture --
     The sticker at rest, drawn once: paper, the photograph cover-fitted,
     then the two hairlines. The peel reuses this face. */
  function readColours(el) {
    var cs = getComputedStyle(el);
    function token(name, fallback) { return cs.getPropertyValue(name).trim() || fallback; }
    var rgb = token("--st-crease-rgb", "26, 26, 23");
    colours = {
      paper: token("--st-paper", "#fffdf8"),
      rule: token("--st-rule", "#ddd8cc"),
      back: token("--st-back", "#ece6d9"),
      backDeep: token("--st-back-deep", "#d6cebd"),
      crease: "rgba(" + rgb + ", " + token("--st-crease-a", ".16") + ")",
      creaseEnd: "rgba(" + rgb + ", 0)"
    };
  }

  function paintFace(s) {
    if (!colours) readColours(s.el);
    var c = s.face.getContext("2d"), w = s.w, h = s.h, img = s.img;
    var nw = img.naturalWidth, nh = img.naturalHeight;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.fillStyle = colours.paper;
    c.fillRect(0, 0, w, h);
    var r = Math.max(PW / nw, s.ph / nh), sw = PW / r, sh = s.ph / r;
    c.drawImage(img, (nw - sw) / 2, (nh - sh) / 2, sw, sh, BORDER, BORDER, PW, s.ph);
    c.strokeStyle = colours.rule;
    c.lineWidth = 1;
    c.strokeRect(.5, .5, w - 1, h - 1);
    c.strokeRect(BORDER + .5, BORDER + .5, PW - 1, s.ph - 1);
  }

  /* The fold. u points from the peeled corner toward the middle, and the
     sticker's extent along u runs -ext..ext, so the fold sits at
     -ext + peel · 2ext. What lies before it is lifted: the page shows
     through there, and the same shape, mirrored across the fold line, is
     drawn as the paper back. u is always at 45°, which makes the cut a
     right-angled corner whose mirror image stays inside the sticker. */
  function draw(s) {
    var c = s.ctx, w = s.w, h = s.h;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    var peel = clamp(s.peel, 0, 1);
    if (peel < .002) { c.drawImage(s.face, 0, 0, w, h); return; }
    var ux = -Math.sin(s.dir), uy = Math.cos(s.dir);
    var ext = (Math.abs(ux) * w + Math.abs(uy) * h) / 2;
    var fold = -ext + peel * 2 * ext;
    var R = 4 * ext;                     // a half-plane big enough to cover the sticker
    function halfPlane(sign) {           // +1: past the fold (kept); -1: before it (lifted)
      var px = -uy, py = ux, fx = fold * ux, fy = fold * uy;
      c.beginPath();
      c.moveTo(fx + px * R, fy + py * R);
      c.lineTo(fx - px * R, fy - py * R);
      c.lineTo(fx - px * R + ux * R * sign, fy - py * R + uy * R * sign);
      c.lineTo(fx + px * R + ux * R * sign, fy + py * R + uy * R * sign);
      c.closePath();
    }
    c.save();
    c.translate(w / 2, h / 2);

    c.save();
    halfPlane(1);
    c.clip();
    c.drawImage(s.face, -w / 2, -h / 2, w, h);
    /* The crease: the bend's own tone on the face just past the fold. */
    var crease = c.createLinearGradient(fold * ux, fold * uy, (fold + CURL * 1.6) * ux, (fold + CURL * 1.6) * uy);
    crease.addColorStop(0, colours.crease);
    crease.addColorStop(1, colours.creaseEnd);
    c.fillStyle = crease;
    c.fillRect(-w / 2, -h / 2, w, h);
    c.restore();

    /* The lifted part, reflected across the fold: p' = p + 2(fold - p·u)u. */
    c.save();
    c.transform(1 - 2 * ux * ux, -2 * ux * uy, -2 * ux * uy, 1 - 2 * uy * uy, 2 * fold * ux, 2 * fold * uy);
    halfPlane(-1);
    c.clip();
    c.beginPath();
    c.rect(-w / 2, -h / 2, w, h);
    c.clip();
    var back = c.createLinearGradient(fold * ux, fold * uy, (fold - CURL * 2) * ux, (fold - CURL * 2) * uy);
    back.addColorStop(0, colours.backDeep);
    back.addColorStop(1, colours.back);
    c.fillStyle = back;
    c.fillRect(-w / 2, -h / 2, w, h);
    c.strokeStyle = colours.rule;
    c.lineWidth = 1;
    c.strokeRect(-w / 2 + .5, -h / 2 + .5, w - 1, h - 1);
    c.restore();

    c.restore();
  }

  function repaint() {
    colours = null;
    stickers.forEach(function (s) {
      if (!s.ready) return;
      paintFace(s);
      write(s, true);
    });
  }

  /* ------------------------------------------------------- 3. Geometry -- */
  function grip(s) { return k * (1 + GROW * Math.max(0, s.lift)); }

  function measure() {
    var sr = section.getBoundingClientRect();
    bounds.w = Math.max(1, section.clientWidth);
    bounds.h = Math.max(1, wrap === section ? section.clientHeight : wrap.getBoundingClientRect().bottom - sr.top);
  }

  /* How far the turned sticker reaches from its centre along each axis. */
  function reach(s) {
    var a = s.tilt + s.swing, g = grip(s);
    var hw = s.w / 2 * g, hh = s.h / 2 * g, c = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a));
    return { x: hw * c + hh * sn, y: hw * sn + hh * c };
  }

  function confine(s) {
    var half = reach(s);
    var minX = Math.min(half.x, bounds.w / 2), maxX = Math.max(bounds.w - half.x, bounds.w / 2);
    var minY = Math.min(half.y, bounds.h / 2), maxY = Math.max(bounds.h - half.y, bounds.h / 2);
    if (s.x < minX) { s.x = minX; if (s.vx < 0) s.vx = -s.vx * BOUNCE; }
    else if (s.x > maxX) { s.x = maxX; if (s.vx > 0) s.vx = -s.vx * BOUNCE; }
    if (s.y < minY) { s.y = minY; if (s.vy < 0) s.vy = -s.vy * BOUNCE; }
    else if (s.y > maxY) { s.y = maxY; if (s.vy > 0) s.vy = -s.vy * BOUNCE; }
  }

  function toSection(e) {
    var r = section.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /* A point in the sticker's own unturned, unscaled frame, centre at 0,0. */
  function toLocal(s, p) {
    var a = -(s.tilt + s.swing), g = grip(s), dx = p.x - s.x, dy = p.y - s.y;
    return { x: (Math.cos(a) * dx - Math.sin(a) * dy) / g, y: (Math.sin(a) * dx + Math.cos(a) * dy) / g };
  }

  /* The topmost sticker under a point, by geometry, since one that has
     landed on text takes no pointer events of its own. */
  function hit(x, y, coveringOnly) {
    var sr = section.getBoundingClientRect(), best = null, height = -1;
    stickers.forEach(function (s) {
      if (!s.ready || (coveringOnly && !s.over)) return;
      var r = s.free ? sr : s.slot.getBoundingClientRect();
      var local = toLocal(s, { x: x - r.left, y: y - r.top });
      var z = s.free ? s.z : 0;
      if (Math.abs(local.x) <= s.w / 2 && Math.abs(local.y) <= s.h / 2 && z > height) {
        height = z;
        best = { s: s, local: local };
      }
    });
    return best;
  }

  /* Every line of text and every control in the column, as rectangles.
     Text nodes rather than their blocks: .entry-when stretches the height
     of its entry, and the paper below the date is free to land on. */
  function contentRects() {
    var out = [], range = document.createRange(), node, i;
    var walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT, null);
    while ((node = walker.nextNode())) {
      if (!/\S/.test(node.data)) continue;
      range.selectNodeContents(node);
      var lines = range.getClientRects();
      for (i = 0; i < lines.length; i++) out.push(lines[i]);
    }
    var controls = wrap.querySelectorAll(CONTROLS);
    for (i = 0; i < controls.length; i++) out.push(controls[i].getBoundingClientRect());
    return out;
  }

  function settle(s, rects) {
    if (!s.free || s.press) return;
    var r = s.el.getBoundingClientRect(), over = false;
    rects = rects || contentRects();
    for (var i = 0; i < rects.length && !over; i++) {
      var q = rects[i];
      over = q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top;
    }
    s.over = over;
    if (over) s.el.setAttribute("data-over", "");
    else s.el.removeAttribute("data-over");
  }

  function overContent(target, x, y) {
    if (target.closest && target.closest(CONTROLS)) return true;
    var rects = contentRects();
    for (var i = 0; i < rects.length; i++) {
      var q = rects[i];
      if (x >= q.left - 2 && x <= q.right + 2 && y >= q.top - 2 && y <= q.bottom + 2) return true;
    }
    return false;
  }

  /* ---------------------------------------------------------- 4. Motion -- */
  /* The corner nearest a point, as a fold direction. */
  function corner(p) { return Math.atan2(p.x < 0 ? -1 : 1, p.y < 0 ? 1 : -1); }

  function step(s, dt) {
    var still = reduced(), press = s.press, drag = press && press.moving ? press : null;
    var w = s.w, h = s.h;
    if (drag) {
      var t = drag.pointer;
      if (still) {
        s.swing = 0;
        s.swingV = 0;
      } else {
        var prev = drag.pivot, smoothing = 1 - Math.exp(-dt / .045);
        var vx = s.pivotV.x + ((t.x - prev.x) / dt - s.pivotV.x) * smoothing;
        var vy = s.pivotV.y + ((t.y - prev.y) / dt - s.pivotV.y) * smoothing;
        var ax = (vx - s.pivotV.x) / dt, ay = (vy - s.pivotV.y) / dt;
        s.pivotV.x = vx;
        s.pivotV.y = vy;
        drag.pivot = { x: t.x, y: t.y };
        var a = s.tilt + s.swing;
        var rx = -(Math.cos(a) * drag.grab.x - Math.sin(a) * drag.grab.y);
        var ry = -(Math.sin(a) * drag.grab.x + Math.cos(a) * drag.grab.y);
        var inertia = (w * w + h * h) / 12 + rx * rx + ry * ry;
        var torque = (rx * -clamp(ay, -24000, 24000) - ry * -clamp(ax, -24000, 24000)) / inertia;
        var om = 2 * Math.PI * 1.5;
        s.swingV += (torque * 1.1 * SWING - om * om * s.swing - 2 * .45 * om * s.swingV) * dt;
        s.swing = clamp(s.swing + s.swingV * dt, -1.2, 1.2);
      }
      var turned = s.tilt + s.swing, g = grip(s);
      s.x = t.x - (Math.cos(turned) * drag.grab.x - Math.sin(turned) * drag.grab.y) * g;
      s.y = t.y - (Math.sin(turned) * drag.grab.x + Math.cos(turned) * drag.grab.y) * g;
      confine(s);
    } else {
      if (still) { s.swing = 0; s.swingV = 0; }
      else spring(s, "swing", 0, 1.4, .32, dt);
      if (s.free) {
        var decay = Math.exp(-dt * (1.5 + 9 * FRICTION));
        s.vx *= decay;
        s.vy *= decay;
        if (Math.sqrt(s.vx * s.vx + s.vy * s.vy) < 4) { s.vx = 0; s.vy = 0; }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        confine(s);
      }
    }

    var peelTarget = still ? 0 : press ? ACTIVE_PEEL : s.hover ? HOVER_PEEL : 0;
    var liftTarget = drag && !still ? 1 : 0;
    if (still) {
      s.peel = 0; s.peelV = 0; s.lift = 0; s.liftV = 0;
    } else {
      spring(s, "peel", peelTarget, press || s.hover ? 3 : 3.6, press || s.hover ? .7 : .62, dt);
      spring(s, "lift", liftTarget, 3.2, .55, dt);
    }

    /* A corner that has barely started is simply the right corner; one
       that is already up slides round to the next. */
    var dirTarget = s.dir, far = Math.min(w, h) * .12;
    var aim = press ? press.grab : s.hover ? s.local : null;
    if (aim && Math.sqrt(aim.x * aim.x + aim.y * aim.y) > far) dirTarget = corner(aim);
    if (s.peel < .01) s.dir = dirTarget;
    else s.dir += wrapAngle(dirTarget - s.dir) * (1 - Math.exp(-dt / .12));

    return !!press ||
      Math.abs(s.peel - peelTarget) > .0005 || Math.abs(s.peelV) > .0005 ||
      Math.abs(s.lift - liftTarget) > .0005 || Math.abs(s.liftV) > .0005 ||
      Math.abs(s.swing) > .0005 || Math.abs(s.swingV) > .0005 ||
      s.vx !== 0 || s.vy !== 0 || Math.abs(wrapAngle(dirTarget - s.dir)) > .002;
  }

  function write(s, force) {
    var t = "translate(" + (s.x - s.w / 2).toFixed(2) + "px, " + (s.y - s.h / 2).toFixed(2) + "px) " +
      "rotate(" + (s.tilt + s.swing).toFixed(4) + "rad) scale(" + grip(s).toFixed(4) + ")";
    if (t !== s.transform) { s.transform = t; s.el.style.transform = t; }
    var key = Math.round(s.peel * 400) + "|" + Math.round(s.dir * 100);
    if (force || key !== s.drawn) { s.drawn = key; draw(s); }
  }

  function frame(now) {
    raf = 0;
    var dt = last ? clamp((now - last) / 1000, .001, 1 / 30) : 1 / 60;
    last = now;
    var busy = false;
    stickers.forEach(function (s) {
      if (!s.ready) return;
      var moving = step(s, dt);
      write(s);
      if (moving) { busy = true; s.restless = true; }
      else if (s.restless) { s.restless = false; settle(s); }
    });
    if (busy) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }

  /* --------------------------------------------- 5. Lifting and landing -- */
  /* Out of the margin and into the section, at the same spot on screen. */
  function lift(s) {
    if (s.free) return;
    var sr = section.getBoundingClientRect(), hr = s.slot.getBoundingClientRect();
    s.x += hr.left - sr.left;
    s.y += hr.top - sr.top;
    s.free = true;
    s.el.classList.add("is-free");
    moveTo(s.el, section);
  }

  function goHome(s) {
    s.free = false;
    s.over = false;
    s.z = 0;
    s.vx = 0;
    s.vy = 0;
    s.el.classList.remove("is-free");
    s.el.removeAttribute("data-over");
    s.el.style.zIndex = "";
    moveTo(s.el, s.slot);
    s.x = s.w * k / 2;
    s.y = s.h * k / 2;
  }

  function raise(s) {
    s.z = ++stack;
    s.el.style.zIndex = String(2 + s.z);
  }

  /* A sticker that has really left: its slot may close up on a phone, and
     landed stickers now need a finger's drag not to become a page scroll. */
  function left(s) {
    s.slot.setAttribute("data-empty", "");
    if (guarded) return;
    guarded = true;
    section.addEventListener("touchmove", function (e) {
      if (active && e.cancelable) e.preventDefault();
    }, { passive: false });
  }

  function clearSelection() {
    var sel = window.getSelection && window.getSelection();
    if (sel && !sel.isCollapsed) sel.removeAllRanges();
  }

  /* --------------------------------------------------------- 6. Pointer -- */
  function listen(on) {
    if (on === listening) return;
    listening = on;
    var method = on ? "addEventListener" : "removeEventListener";
    window[method]("pointermove", onMove);
    window[method]("pointerup", onUp);
    window[method]("pointercancel", onUp);
  }

  /* The press lifts the sticker at once, because pointer capture does not
     survive a move in the DOM; a press that never drags goes straight home. */
  function begin(s, e, fromText) {
    measure();
    var wasHome = !s.free;
    lift(s);
    var p = toSection(e), grab = toLocal(s, p);
    s.press = {
      id: e.pointerId, grab: grab, origin: p, pointer: p, pivot: p,
      moving: false, samples: [], wasHome: wasHome, fromText: !!fromText
    };
    s.pivotV = { x: 0, y: 0 };
    s.vx = 0;
    s.vy = 0;
    s.local = grab;
    s.over = false;
    s.el.removeAttribute("data-over");
    raise(s);
    active = s;
    try { s.el.setPointerCapture(e.pointerId); } catch (err) { /* the window listeners still see it */ }
    section.setAttribute("data-sticker-drag", "");
    listen(true);
    wake();
  }

  function cancelHold() {
    if (!hold) return;
    clearTimeout(hold.timer);
    hold = null;
    if (!active) listen(false);
  }

  function onDown(e) {
    if (e.button !== 0 || !e.isPrimary || active) return;
    var el = e.target.closest ? e.target.closest(".sticker") : null, s = null, i;
    for (i = 0; el && i < stickers.length; i++) if (stickers[i].el === el) s = stickers[i];
    if (s) {
      if (!s.ready) return;
      e.preventDefault();
      begin(s, e, false);
      return;
    }
    var found = hit(e.clientX, e.clientY, true);
    if (!found) return;
    if (!overContent(e.target, e.clientX, e.clientY)) {
      e.preventDefault();
      begin(found.s, e, false);
      return;
    }
    /* Over text or a link the press belongs to the page, unless it stays
       put. A finger's long press belongs to the phone. */
    if (e.pointerType === "touch") return;
    var waiting = {
      s: found.s, pointerId: e.pointerId, pointerType: e.pointerType,
      startX: e.clientX, startY: e.clientY, clientX: e.clientX, clientY: e.clientY, timer: 0
    };
    waiting.timer = setTimeout(function () {
      if (hold !== waiting) return;
      hold = null;
      clearSelection();
      swallowClick = true;
      begin(waiting.s, waiting, true);
    }, HOLD);
    hold = waiting;
    listen(true);
  }

  function onMove(e) {
    if (hold && e.pointerId === hold.pointerId) {
      hold.clientX = e.clientX;
      hold.clientY = e.clientY;
      var hx = e.clientX - hold.startX, hy = e.clientY - hold.startY;
      if (hx * hx + hy * hy > 25) cancelHold();
      return;
    }
    var s = active;
    if (!s || e.pointerId !== s.press.id) return;
    var press = s.press, p = toSection(e);
    press.pointer = p;
    if (!press.moving) {
      var dx = p.x - press.origin.x, dy = p.y - press.origin.y;
      if (dx * dx + dy * dy > 9) { press.moving = true; left(s); }
    }
    press.samples.push({ x: p.x, y: p.y, t: performance.now() });
    if (press.samples.length > 8) press.samples.shift();
    if (press.fromText) clearSelection();
    wake();
  }

  function onUp(e) {
    if (hold && e.pointerId === hold.pointerId) { cancelHold(); return; }
    var s = active;
    if (!s || e.pointerId !== s.press.id) return;
    var press = s.press;
    s.press = null;
    active = null;
    section.removeAttribute("data-sticker-drag");
    listen(false);
    if (!press.moving && press.wasHome) {
      goHome(s);
    } else if (press.moving && e.type === "pointerup" && !reduced()) {
      var now = performance.now();
      var recent = press.samples.filter(function (q) { return now - q.t < 90; });
      if (recent.length > 1) {
        var a = recent[0], b = recent[recent.length - 1], span = Math.max(b.t - a.t, 16) / 1000;
        s.vx = clamp((b.x - a.x) / span, -2600, 2600);
        s.vy = clamp((b.y - a.y) / span, -2600, 2600);
      }
    }
    if (e.pointerType !== "mouse") s.hover = false;
    s.restless = true;
    measure();
    /* The click that follows a carry from over a link is not a click. */
    if (swallowClick) setTimeout(function () { swallowClick = false; }, 0);
    wake();
  }

  function clearHover() {
    var changed = false;
    stickers.forEach(function (s) {
      if (s.hover && !s.press) { s.hover = false; changed = true; }
    });
    if (changed) wake();
  }

  function onHover(e) {
    if (e.pointerType === "touch" || active || reduced()) return;
    if (e.buttons) { clearHover(); return; }
    var found = hit(e.clientX, e.clientY, false), changed = false;
    stickers.forEach(function (s) {
      var on = !!found && found.s === s;
      if (on) s.local = found.local;
      if (s.hover !== on) { s.hover = on; changed = true; }
    });
    if (changed || found) wake();
  }

  section.addEventListener("pointerdown", onDown);
  section.addEventListener("pointermove", onHover, { passive: true });
  section.addEventListener("pointerleave", clearHover);
  section.addEventListener("dragstart", function (e) { if (active) e.preventDefault(); });
  window.addEventListener("click", function (e) {
    if (!swallowClick) return;
    swallowClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  /* -------------------------------------------------------- 7. Keyboard -- */
  function bindKeys(s) {
    s.el.addEventListener("keydown", function (e) {
      var d = ARROWS[e.key];
      if (!d || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      measure();
      if (!s.free) { lift(s); raise(s); left(s); }
      var by = e.shiftKey ? 40 : 10;
      s.x += d[0] * by;
      s.y += d[1] * by;
      s.vx = 0;
      s.vy = 0;
      confine(s);
      write(s);
      settle(s);
      var r = s.el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) s.el.scrollIntoView({ block: "nearest" });
    });
  }

  /* ---------------------------------------------------------- 8. Build -- */
  function build(s) {
    var el = document.createElement("canvas");
    el.className = "sticker";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", s.alt);
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight ArrowUp ArrowDown");
    el.width = Math.round(s.w * dpr);
    el.height = Math.round(s.h * dpr);
    el.style.width = s.w + "px";
    el.style.height = s.h + "px";
    s.face = document.createElement("canvas");
    s.face.width = el.width;
    s.face.height = el.height;
    s.el = el;
    s.ctx = el.getContext("2d");
    s.slot.appendChild(el);
    bindKeys(s);
  }

  function load() {
    if (loaded) return;
    loaded = true;
    stickers.forEach(function (s) {
      var img = new Image();
      img.decoding = "async";
      img.onload = function () {
        if (!img.naturalWidth) { img.onerror(); return; }
        s.img = img;
        s.ph = Math.round(PW * clamp(img.naturalHeight / img.naturalWidth, MIN_RATIO, MAX_RATIO));
        s.h = s.ph + 2 * BORDER;
        placeSlot(s);
        build(s);
        paintFace(s);
        s.ready = true;
        write(s, true);
      };
      /* No photograph, no sticker: the entry goes back to what it was. */
      img.onerror = function () {
        if (s.slot.parentNode) s.slot.parentNode.removeChild(s.slot);
        stickers.splice(stickers.indexOf(s), 1);
      };
      img.src = s.src;
    });
  }

  /* ------------------------------------------------------- 9. Layout --
     Lifted stickers keep their place in the section; the ones at home move
     with their slot, which changes parent at the phone breakpoint. */
  function layout() {
    k = small && small.matches ? SMALL_W / W : 1;
    stickers.forEach(placeSlot);
    measure();
    stickers.forEach(function (s) {
      if (!s.ready) return;
      if (s.free && !s.press) confine(s);
      write(s);
    });
    var rects = null;
    stickers.forEach(function (s) {
      if (!s.ready || !s.free) return;
      rects = rects || contentRects();
      settle(s, rects);
    });
  }
  function queue() {
    if (queued) return;
    queued = requestAnimationFrame(function () { queued = 0; layout(); });
  }
  window.addEventListener("resize", queue);
  onChange(small, queue);
  if ("ResizeObserver" in window) new ResizeObserver(queue).observe(section);

  /* The canvas cannot follow a token by itself, so a theme change repaints. */
  onChange(query("(prefers-color-scheme: dark)"), repaint);
  if ("MutationObserver" in window) {
    new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* The photographs are fetched when the section comes near the screen. */
  if ("IntersectionObserver" in window) {
    var heard = false;
    var io = new IntersectionObserver(function (seen) {
      heard = true;
      if (seen.some(function (en) { return en.isIntersecting; })) { io.disconnect(); load(); }
    }, { rootMargin: "800px 0px" });
    io.observe(section);
    /* A browser always reports once right after observe(); one that has
       said nothing after two seconds never will (some embedded browsers),
       so the photographs are fetched anyway. As in heart.js. */
    setTimeout(function () { if (!heard) { io.disconnect(); load(); } }, 2000);
  } else {
    load();
  }
})();
