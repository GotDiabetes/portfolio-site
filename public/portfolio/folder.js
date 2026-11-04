/* ============================================================================
   Isaac Lee — the projects folder.

   Under the Projects and leadership heading, an index of the section as
   sheets in a manila folder: one sheet per entry below, each holding the
   entry's title, its role and its date, read from the entries themselves
   so the folder never says anything they don't. It opens by itself once,
   the first time it is mostly on screen, and stays open; a click on the
   folder closes or opens it. Each sheet is a link to its entry, and the
   page's own scroll-behavior (styles.css: smooth, or instant under reduced
   motion) carries the reader there.

   Wiring: index.html carries an empty <div class="folder fade" data-folder
   hidden> after the section's h2. This script fills it and unhides it, so
   without JavaScript the section reads exactly as before. main.js reveals
   it like any other .fade; this file only adds the folder's own motion,
   whose frame loop runs only while something is still moving.

   The flap is the button (aria-expanded, named by the section heading).
   While the folder is closed the sheets are inert, so the keyboard never
   lands on a link tucked in the pocket.

   Motion: the flap is a panel tipped about its bottom edge in 3D; the
   sheets are flat layers between the folder's back and the flap, each on
   its own springs (place, turn, scale). Closed, they rest in the pocket
   and peek out by their tops; hovered, the flap lifts a little and they
   rise toward the pointer; open, they fan out above the folder, one row
   on a wide column and two rows of two on a phone, where four across
   would leave no room to read. The type is set at the page's own sizes
   (nothing under .75rem) and the sheets are sized to fit it: the folder
   gets smaller on a narrow screen, the type never does.

   Reduced motion: the folder starts open and every change is a cut.

   After React Bits' Folder (reactbits.dev, MIT), rebuilt in plain JS.
   Flap mode: the original's angles (open -64°, peek -15°), spring rates
   (flap 2 Hz, sheets 2.1 Hz, tilt 1.6 Hz, damping 1 - 0.72 × bounce) and
   its rest, peek and spread offsets. Its glass and drag-out are left aside.
   ========================================================================== */

(function () {
  "use strict";

  var section = document.getElementById("projects");
  var folder = section && section.querySelector("[data-folder]");
  if (!folder || !window.requestAnimationFrame) return;
  var entries = Array.prototype.slice.call(section.querySelectorAll("article.entry[id]"));
  if (!entries.length) return;

  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var TAU = Math.PI * 2, STEP = 1 / 240;

  /* The original's tables for four sheets in flap mode: where each rests
     in the pocket (x across the folder, rise as a share of its height,
     turn in degrees), and how each turns and drops when fanned out. */
  var REST = [{ x: 0.16, rise: 0, r: 3 }, { x: -0.17, rise: 0.05, r: -3.5 }, { x: 0, rise: 0.1, r: 0.5 }, { x: 0.25, rise: 0.08, r: 5 }];
  var SPREAD_TURN = [4, -5, 3, -6], SPREAD_DROP = [0.03, -0.04, 0.05, -0.02];
  var ANGLES = { open: -64, peek: -15, rest: 0 };
  var BOUNCE = 0.4, TILT = 0.5;
  var ZETA = 1 - 0.72 * BOUNCE;
  var FLAP_W = TAU * 2, SHEET_W = TAU * 2.1, SOFT_W = TAU * 1.6;

  var NARROW = 480;     // below this column width the sheets fan out in two rows
  var TAB_H = 22;       // the tab: one line of mono caps
  var HEADROOM = 16;    // above the fan, for a raised sheet and a turned corner

  function text(node) { return node ? node.textContent.replace(/\s+/g, " ").trim() : ""; }
  /* The date is the margin column's first line: its first text node, before
     the place <span> and the logo. */
  function firstText(node) {
    for (var n = node && node.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && n.nodeValue.trim()) return n.nodeValue.replace(/\s+/g, " ").trim();
    }
    return "";
  }
  function make(tag, cls) { var el = document.createElement(tag); if (cls) el.className = cls; return el; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------------------------------------------------------- 1. Build --
     Back (the folder's rear wall and tab, drawn as one SVG outline), the
     flap (a real <button>), and the sheets (a list of links). The flap
     comes before the sheets in the DOM so the keyboard meets the control
     before what it opens; z-index puts it in front. */
  var heading = section.querySelector("h2");
  var navLink = document.querySelector('a[href="#projects"]');
  var tabWord = text(navLink) || text(heading).split(" ")[0] || "";

  var stage = make("div", "folder__stage");
  var back = make("div", "folder__back");
  back.setAttribute("aria-hidden", "true");
  var NS = "http://www.w3.org/2000/svg";
  var shape = document.createElementNS(NS, "svg");
  shape.setAttribute("focusable", "false");
  var outline = document.createElementNS(NS, "path");
  shape.appendChild(outline);
  var tab = make("span", "folder__tab");
  var tabLabel = make("span", "folder__tab-label");
  tabLabel.appendChild(make("i"));
  tabLabel.appendChild(document.createTextNode(tabWord));
  tab.appendChild(tabLabel);
  back.appendChild(shape);
  back.appendChild(tab);

  var list = make("ul", "folder__sheets");
  list.id = "folderSheets";
  list.setAttribute("role", "list");      // list-style: none drops it in Safari
  var items = entries.map(function (entry) {
    var li = make("li", "folder__item");
    var a = make("a", "folder__sheet");
    a.setAttribute("href", "#" + entry.id);
    var title = make("span", "folder__title");
    title.textContent = text(entry.querySelector("h3"));
    a.appendChild(title);
    var role = text(entry.querySelector(".entry-role"));
    if (role) { var r = make("span", "folder__role"); r.textContent = role; a.appendChild(r); }
    var when = firstText(entry.querySelector(".entry-when"));
    if (when) { var d = make("span", "folder__date"); d.textContent = when; a.appendChild(d); }
    li.appendChild(a);
    list.appendChild(li);
    return li;
  });
  var links = items.map(function (li) { return li.firstChild; });

  var flap = make("button", "folder__flap");
  flap.type = "button";
  flap.setAttribute("aria-label", text(heading) || tabWord);
  flap.setAttribute("aria-controls", list.id);
  flap.setAttribute("aria-expanded", "false");

  stage.appendChild(back);
  stage.appendChild(flap);
  stage.appendChild(list);
  folder.appendChild(stage);

  /* Closed: the sheets are out of reach of the keyboard and of assistive
     tech. inert does both; the tabindex is for browsers without it. */
  function closeSheets(closed) {
    if (closed) list.setAttribute("inert", ""); else list.removeAttribute("inert");
    links.forEach(function (a) {
      if (closed) a.setAttribute("tabindex", "-1"); else a.removeAttribute("tabindex");
    });
  }
  closeSheets(true);

  /* ------------------------------------------------------- 2. Geometry --
     Everything is measured from the column. The sheets are given a width,
     their text is laid out at its real size, and the tallest one sets the
     height of all four; the folder is then cut to hold them. The stage
     reserves the open state's height from the start, so neither the
     opening nor a later close moves anything below it. */
  var g = { W: 0 };

  function measure() {
    var W = folder.clientWidth;
    var n = items.length;
    var grid = W < NARROW && n > 2;
    var cols = grid ? 2 : n, rows = Math.ceil(n / cols);
    var gap = grid ? 10 : 12;
    var sw = Math.floor(Math.min(grid ? 180 : 140, (W - (cols - 1) * gap) / cols));

    /* Writes, then every read, then the writes that depend on them: one
       layout, not one per sheet. data-narrow tightens the sheets (folder.css):
       two rows have to come out no taller than the wide column's one. */
    if (grid) folder.setAttribute("data-narrow", ""); else folder.removeAttribute("data-narrow");
    items.forEach(function (li) { li.style.width = sw + "px"; li.style.height = ""; });
    var tallest = 0;
    items.forEach(function (li) { tallest = Math.max(tallest, li.offsetHeight); });
    var labelW = tabLabel.offsetWidth;

    var sh = Math.ceil(Math.max(tallest, sw * (grid ? 0.55 : 1.2)));
    var fw = Math.round(Math.min(W, Math.max(sw + 28, (sh + 10) * 1.27)));   // the original's 224 × 176
    var h = Math.round(grid ? sh + 10 : Math.max(fw * 0.786, sh + 10));      // on a phone, just deep enough to hold a sheet
    var shoulder = TAB_H * 0.75;
    var tabW = Math.min(fw - 20, Math.max(fw * 0.34, labelW + 2 * shoulder + 16));
    var tabX = fw - tabW - 10;
    /* Fanned out, the sheets' lower edge stops this far into the folder:
       the original's height on a wide column; lower on a phone, where two
       rows need the room, but still clear of the opened flap. */
    var openLine = TAB_H + (grid ? 0.6 : 0.45) * h;
    var fy = Math.max(0, Math.round(HEADROOM + rows * sh + (rows - 1) * gap - openLine));
    var fx = Math.round((W - fw) / 2);
    var frontTop = TAB_H + 0.3 * h;

    g = { W: W, grid: grid, cols: cols, rows: rows, gap: gap, sw: sw, sh: sh,
          fw: fw, h: h, fx: fx, fy: fy, openLine: openLine };

    stage.style.height = Math.ceil(fy + TAB_H + h + 2) + "px";
    back.style.left = fx + "px";
    back.style.top = fy + "px";
    back.style.width = fw + "px";
    back.style.height = (TAB_H + h) + "px";
    shape.setAttribute("width", fw);
    shape.setAttribute("height", TAB_H + h);
    shape.setAttribute("viewBox", "0 0 " + fw + " " + (TAB_H + h));
    outline.setAttribute("d", ["M.5", TAB_H, "H", tabX, "L", tabX + shoulder, 0.5, "H", tabX + tabW - shoulder,
      "L", tabX + tabW, TAB_H, "H", fw - 0.5, "V", TAB_H + h - 0.5, "H", 0.5, "Z"].join(" "));
    tab.style.left = (tabX + shoulder) + "px";
    tab.style.width = (tabW - 2 * shoulder) + "px";
    tab.style.height = TAB_H + "px";
    flap.style.left = fx + "px";
    flap.style.top = (fy + frontTop) + "px";
    flap.style.width = fw + "px";
    flap.style.height = (TAB_H + h - frontTop) + "px";
    items.forEach(function (li) { li.style.height = sh + "px"; });

    /* The flap's perspective, and the tilt's, both centred on the folder. */
    var depth = Math.round(Math.max(fw, h) * 5);
    var origin = (fx + fw / 2) + "px " + (fy + TAB_H + h / 2) + "px";
    stage.style.perspective = depth + "px";
    stage.style.perspectiveOrigin = origin;
    stage.style.transformOrigin = origin;
    folder.style.perspective = depth + "px";
    folder.style.perspectiveOrigin = origin;
  }

  /* Where sheet i sits in a phase: a centre, a turn and a scale. */
  function place(i, phase, pointerX) {
    if (phase === "open") {
      var col = i % g.cols, row = Math.floor(i / g.cols);
      var inRow = Math.min(g.cols, items.length - row * g.cols);
      var bottom = g.fy + g.openLine - (g.rows - 1 - row) * (g.sh + g.gap);
      return {
        x: g.W / 2 + (col - (inRow - 1) / 2) * (g.sw + g.gap),
        y: bottom - g.sh / 2 + SPREAD_DROP[i % 4] * g.h * (g.grid ? 0.3 : 0.7),
        r: SPREAD_TURN[i % 4] * (g.grid ? 0.3 : 0.55),
        s: 1
      };
    }
    var rest = REST[i % 4];
    var reach = Math.max(0, (g.fw - g.sw) / 2 - 6);       // a resting sheet stays inside the folder
    var x = g.fx + g.fw / 2 + clamp(rest.x * 0.8 * g.fw * (phase === "peek" ? 1.3 : 1), -reach, reach);
    var floor = g.fy + TAB_H + g.h - 5 - g.sh / 2;
    if (phase === "rest") return { x: x, y: floor - rest.rise * g.h, r: rest.r, s: 1 };
    var near = pointerX == null ? 0 : Math.max(0, 1 - Math.abs(pointerX - x) / (g.fw * 0.32));
    return { x: x, y: floor - (rest.rise + 0.1) * g.h - near * near * g.h * 0.09, r: rest.r * 1.6, s: 1 };
  }

  /* -------------------------------------------------------- 3. Springs -- */
  function spring(v) { return { value: v, velocity: 0 }; }
  /* Damped spring at 240 Hz substeps; once it is within a hundredth of
     its target it lands exactly, so nothing is left a fraction off. */
  function integrate(item, target, omega, zeta, dt) {
    var k = omega * omega, c = 2 * zeta * omega, steps = Math.max(1, Math.ceil(dt / STEP)), h = dt / steps;
    for (var i = 0; i < steps; i++) {
      item.velocity += (k * (target - item.value) - c * item.velocity) * h;
      item.value += item.velocity * h;
    }
    if (Math.abs(target - item.value) > 0.01 || Math.abs(item.velocity) > 0.01) return true;
    item.value = target; item.velocity = 0;
    return false;
  }
  function snap(item, v) { item.value = v; item.velocity = 0; }

  var state = {
    open: false, hovered: false, px: 0, py: 0, localX: 0,
    lead: -1, leadFocus: false,
    phase: "rest", previous: "rest", changedAt: 0,
    flap: spring(0), rx: spring(0), ry: spring(0),
    sheets: items.map(function () { return { x: spring(0), y: spring(0), r: spring(0), s: spring(1) }; })
  };
  var raf = 0, last = 0, ready = false;

  function phaseNow() {
    if (state.open) return "open";
    if (state.hovered && !reduce) return "peek";
    return "rest";
  }

  /* A sheet's target, with the original's hover in the open fan: the one
     under the pointer (or keyboard focus) rises, straightens and grows a
     little; its neighbours lean away. */
  function target(i, phase) {
    var t = place(i, phase, state.hovered ? state.localX : null);
    var lead = state.lead;
    if (phase !== "open" || lead < 0 || reduce) return t;
    if (i === lead) return { x: t.x, y: t.y - 6, r: t.r * 0.2, s: 1.05 };
    var d = t.x - place(lead, "open").x;
    var away = d > 0 ? 1 : d < 0 ? -1 : 0;
    return { x: t.x + away * 12 * Math.max(0, 1 - Math.abs(d) / (g.fw * 1.1)), y: t.y, r: t.r, s: t.s };
  }

  function write() {
    var rx = state.rx.value, ry = state.ry.value;
    stage.style.transform = rx || ry ? "rotateX(" + rx + "deg) rotateY(" + ry + "deg)" : "";
    flap.style.transform = "rotateX(" + state.flap.value + "deg)";
    state.sheets.forEach(function (s, i) {
      items[i].style.transform = "translate(" + (s.x.value - g.sw / 2) + "px, " + (s.y.value - g.sh / 2) +
        "px) rotate(" + s.r.value + "deg) scale(" + s.s.value + ")";
    });
  }

  /* The loop runs only while a spring is still moving. */
  function tick(now) {
    raf = 0;
    var dt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000));
    last = now;
    var phase = phaseNow(), busy = false;
    if (phase !== state.phase) { state.phase = phase; state.changedAt = now; }

    /* Closing, the flap waits a beat so the sheets drop in first. */
    var closing = state.previous === "open" && phase !== "open";
    var elapsed = (now - state.changedAt) / 1000;
    var delay = closing ? 0.06 + 0.035 * items.length : 0;
    busy = integrate(state.flap, ANGLES[elapsed < delay ? "open" : phase], FLAP_W, ZETA, dt) || busy;
    /* The flap cannot swing in past shut: it bounces off it. */
    if (state.flap.value > 0) { state.flap.value = -state.flap.value; state.flap.velocity *= -(0.2 + 0.35 * BOUNCE); busy = true; }
    if (elapsed < delay) busy = true;

    /* The tilt toward the pointer is for the closed folder only; open, the
       sheets are links and hold still under the hand. */
    var engaged = state.hovered && !state.open;
    busy = integrate(state.rx, engaged ? -state.py * 8 * TILT : 0, SOFT_W, 1, dt) || busy;
    busy = integrate(state.ry, engaged ? state.px * 10 * TILT : 0, SOFT_W, 1, dt) || busy;

    state.sheets.forEach(function (s, i) {
      var t = target(i, phase), z = phase === "open" ? ZETA : 1;
      busy = integrate(s.x, t.x, SHEET_W, z, dt) || busy;
      busy = integrate(s.y, t.y, SHEET_W, z, dt) || busy;
      busy = integrate(s.r, t.r, SHEET_W, ZETA, dt) || busy;
      busy = integrate(s.s, t.s, SHEET_W, ZETA, dt) || busy;
    });
    if (!busy) state.previous = phase;
    write();
    if (busy) raf = requestAnimationFrame(tick);
  }

  /* Everything straight to where it belongs: the first layout, a resize,
     and every change under reduced motion. */
  function settle() {
    var phase = phaseNow();
    state.phase = state.previous = phase;
    snap(state.flap, ANGLES[phase]);
    snap(state.rx, 0);
    snap(state.ry, 0);
    state.sheets.forEach(function (s, i) {
      var t = target(i, phase);
      snap(s.x, t.x); snap(s.y, t.y); snap(s.r, t.r); snap(s.s, t.s);
    });
    write();
  }

  function wake() {
    if (!ready) return;
    if (reduce) { settle(); return; }
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function setOpen(next) {
    if (state.open === next) return;
    state.open = next;
    flap.setAttribute("aria-expanded", next ? "true" : "false");
    if (next) folder.setAttribute("data-open", ""); else folder.removeAttribute("data-open");
    if (!next) {
      /* Focus on a sheet would be stranded in an inert list: hand it back
         to the flap that closed it. */
      if (list.contains(document.activeElement)) flap.focus();
      setLead(-1);
    }
    closeSheets(!next);
    wake();
  }

  function setLead(i, viaFocus) {
    if (state.lead === i) { state.leadFocus = !!viaFocus && i >= 0; return; }
    state.lead = i;
    state.leadFocus = !!viaFocus && i >= 0;
    items.forEach(function (li, k) {
      if (k === i) li.setAttribute("data-lead", ""); else li.removeAttribute("data-lead");
    });
    wake();
  }

  /* --------------------------------------------------------- 4. Events -- */
  var auto = true;    // the one opening on first view; any click cancels it
  var autoTimer = 0;

  stage.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest || t.closest(".folder__sheet")) return;     // a sheet is a link, not a handle
    if (!t.closest(".folder__back, .folder__flap")) return;     // the empty desk around it does nothing
    auto = false;
    window.clearTimeout(autoTimer);
    setOpen(!state.open);
  });

  stage.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch" || !ready) return;
    var box = stage.getBoundingClientRect();
    var lx = e.clientX - box.left, ly = e.clientY - box.top;
    state.localX = lx;
    state.px = clamp((lx - (g.fx + g.fw / 2)) / (g.fw / 2), -1, 1);
    state.py = clamp((ly - (g.fy + TAB_H + g.h / 2)) / ((TAB_H + g.h) / 2), -1, 1);
    var over = !!(e.target.closest && e.target.closest(".folder__back, .folder__flap, .folder__item"));
    if (over || state.hovered) { state.hovered = over; wake(); }
  });
  stage.addEventListener("pointerleave", function () {
    state.hovered = false;
    if (!state.leadFocus) setLead(-1);
    wake();
  });

  items.forEach(function (li, i) {
    li.addEventListener("pointerenter", function (e) {
      if (state.open && e.pointerType !== "touch") setLead(i);
    });
    li.addEventListener("pointerleave", function () {
      if (state.lead === i && !state.leadFocus) setLead(-1);
    });
    links[i].addEventListener("focus", function () { if (state.open) setLead(i, true); });
    links[i].addEventListener("blur", function () { if (state.lead === i) setLead(-1); });
  });

  /* ---------------------------------------------------------- 5. Start --
     Built and unhidden at once, so the page below never jumps when the
     reader arrives; laid out again whenever the column's width changes. */
  folder.hidden = false;

  function layout() {
    var W = folder.clientWidth;
    if (!W || (ready && W === g.W)) return;
    measure();
    ready = true;
    settle();
  }
  layout();
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(folder);
  else window.addEventListener("resize", layout);

  if (reduce) {
    setOpen(true);
    return;
  }

  /* Opens once, a beat after the folder is mostly on screen, so the reader
     sees it shut before it opens. */
  function openOnce() {
    if (!auto) return;
    auto = false;
    autoTimer = window.setTimeout(function () { setOpen(true); }, 300);
  }
  if ("IntersectionObserver" in window) {
    var heard = false;
    var io = new IntersectionObserver(function (seen) {
      heard = true;
      seen.forEach(function (en) {
        var tall = en.rootBounds ? en.intersectionRect.height >= en.rootBounds.height * 0.4 : false;
        if (en.isIntersecting && (en.intersectionRatio >= 0.5 || tall)) { io.disconnect(); openOnce(); }
      });
      if (!auto) io.disconnect();
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    io.observe(folder);
    /* A browser always reports once right after observe(); one that has
       said nothing after two seconds never will (some embedded browsers),
       so the folder opens anyway. As in /heart.js. */
    window.setTimeout(function () { if (!heard) { io.disconnect(); openOnce(); } }, 2000);
  } else {
    openOnce();
  }
})();
