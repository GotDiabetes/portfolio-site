/* ============================================================================
   Isaac Lee — the ZEP badge in Experience.

   The ZEP entry (data-badge) keeps a staff badge in its margin column: a
   paper badge on an ink strap that comes down from the entry's top edge. The
   front holds the ZEP logo, the name, the role, the place and the dates, all
   read from the page, so it never says anything the entry doesn't. The back
   is the LT monogram. It gives one gentle swing when it first scrolls into
   view, can be pulled around by hand, and a click turns it over (so do Enter
   and Space when it has focus).

   Wired to the page like this. The entry's logo, date and place stay in the
   markup; badge.css hides them above 40rem because the badge carries them
   and the strap has to pass where they sit. The date is a bare text node, so
   it gets a span to be hidden by. A spacer holds the column open to the
   badge's foot, so the ZEP QUIZ plate below starts clear of it, and the
   badge sits inside the margin column at rest, off the entry's text. At
   40rem and under no badge is built; if the window narrows later, badge.css
   hides the one that was.

   After React Bits' Lanyard (reactbits.dev, MIT), rebuilt in plain JS. The
   original is three.js with a rope solver; this is a two-link pendulum at
   240 Hz, with the original's grab-and-release handling and tap-to-flip rule
   and a HoloCard-style turn spring. The strap is one link and the badge a
   second that lags behind it.

   Without JavaScript the entry reads as it always has. With reduced motion
   there is no swing: let go and it is simply back in place, and the turn is
   instant. The loop runs only while something moves.
   ========================================================================== */

(function () {
  "use strict";

  var entry = document.querySelector("#experience article.entry[data-badge]");
  if (!entry || !window.requestAnimationFrame) return;
  var when = entry.querySelector(".entry-when");
  var logo = when && when.querySelector("img.entry-logo");
  if (!logo) return;

  var motion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var small = window.matchMedia ? window.matchMedia("(max-width: 40rem)") : null;
  function reduced() { return !!(motion && motion.matches); }
  function narrow() { return !!(small && small.matches); }

  var SVG = "http://www.w3.org/2000/svg";
  /* The Lee Tennis Co. monogram, as in holo.js (viewBox 94 × 78). */
  var LT = ["M24 11H38L26 53H58L54 66H11Z", "M44 11H83L79 24H66L58 49H44L52 24H40Z"];
  /* Lengths in px. L runs from the peg to the slot, SLOT from the badge's top
     edge to the slot's centre, PEG from the foot of the place line to the
     peg: the date and place stay readable above everything that swings. */
  var STEP = 1 / 240, G = 4500, L = 30, SLOT = 11, STRAP_W = 12, CLEAR = 8, PEG = 14;
  var PUSH = .9;                   // rad/s to the strap: about 7° of swing

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function shortest(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function words(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

  var built = false, pushed = false, flipped = false;
  var rig, space, peg, badge, rotor, front, back, band, weave, edgeA, edgeB;
  var anchor = { x: 0, y: 0 }, com = 80;
  /* a: strap angle from vertical, b: badge angle, r: strap stretch, turn: flip.
     ex, ey: the slot's velocity, which the badge feels as a pull. */
  var st = { a: 0, aV: 0, b: 0, bV: 0, r: 0, rV: 0, exV: 0, eyV: 0, turn: 0, turnV: 0, turnTarget: 0 };
  var grab = null, press = null, raf = 0, last = 0, calm = 0;

  function make(tag, cls, parent, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }
  function strapPath(cls, parent) {
    var p = document.createElementNS(SVG, "path");
    p.setAttribute("class", cls);
    parent.appendChild(p);
    return p;
  }

  /* --------------------------------------------------- 1. Reading the page -- */
  function orgName() {
    var h = entry.querySelector("h3");
    if (!h) return "";
    var copy = h.cloneNode(true), marks = copy.querySelectorAll('[aria-hidden="true"]');
    for (var i = 0; i < marks.length; i++) marks[i].parentNode.removeChild(marks[i]);
    return words(copy.textContent);
  }

  /* ---------------------------------------------------------- 2. Building --
     All spans and inline SVG: this lives inside a <p>. */
  function build() {
    built = true;
    var h1 = document.querySelector(".lead h1") || document.querySelector("h1");
    var name = h1 ? words(h1.textContent) : "";
    var roleEl = entry.querySelector(".entry-role");
    var role = roleEl ? words(roleEl.textContent) : "";

    space = make("span", "badge-space", when);
    space.setAttribute("aria-hidden", "true");
    rig = make("span", "badge-rig", when);
    rig.style.setProperty("--badge-slot", SLOT + "px");
    rig.style.setProperty("--badge-strap", STRAP_W + "px");

    var strap = document.createElementNS(SVG, "svg");
    strap.setAttribute("class", "badge-strap");
    strap.setAttribute("aria-hidden", "true");
    strap.setAttribute("focusable", "false");
    band = strapPath("badge-strap__band", strap);
    weave = strapPath("badge-strap__weave", strap);
    edgeA = strapPath("badge-strap__edge", strap);
    edgeB = strapPath("badge-strap__edge", strap);
    rig.appendChild(strap);
    peg = make("span", "badge-peg", rig);
    peg.setAttribute("aria-hidden", "true");

    /* The name is the entry's own words; aria-pressed says it is a toggle. */
    badge = make("span", "badge", rig);
    badge.setAttribute("role", "button");
    badge.setAttribute("tabindex", "0");
    badge.setAttribute("aria-pressed", "false");
    badge.setAttribute("aria-label", [orgName(), name, role].filter(Boolean).join(", "));
    rotor = make("span", "badge__rotor", badge);

    front = make("span", "badge__face badge__face--front", rotor);
    front.setAttribute("aria-hidden", "true");
    make("span", "badge__slot", front);
    var mark = make("img", "badge__logo", front);
    mark.src = logo.currentSrc || logo.src;
    mark.width = 84;
    mark.height = 30;
    mark.alt = "";
    mark.draggable = false;
    make("span", "badge__name", front, name);
    make("span", "badge__rule", front);
    make("span", "badge__role", front, role);

    back = make("span", "badge__face badge__face--back", rotor);
    back.setAttribute("aria-hidden", "true");
    back.setAttribute("inert", "");
    make("span", "badge__slot", back);
    var frame = make("span", "badge__mark", back);
    var lt = document.createElementNS(SVG, "svg");
    lt.setAttribute("viewBox", "0 0 94 78");
    lt.setAttribute("focusable", "false");
    LT.forEach(function (d) {
      var p = document.createElementNS(SVG, "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", "currentColor");
      p.setAttribute("fill-rule", "evenodd");
      lt.appendChild(p);
    });
    frame.appendChild(lt);

    entry.classList.add("has-badge");
    bind();
    measure();
    watch();
  }

  /* The badge's width is fixed, but its height comes from the words. */
  function measure() {
    if (!built || narrow()) return;
    var height = badge.offsetHeight;
    if (!height) return;
    var wr = when.getBoundingClientRect(), place = when.querySelector("span");
    var foot = place ? place.getBoundingClientRect().bottom - wr.top : 0;
    anchor.x = badge.offsetWidth / 2;
    anchor.y = foot + PEG;
    peg.style.left = anchor.x + "px";
    peg.style.top = anchor.y + "px";
    com = height / 2 - SLOT;
    space.style.height = Math.max(0, PEG + L - SLOT + height + CLEAR) + "px";
    write();
  }

  /* ---------------------------------------------------------- 3. The swing -- */
  function eyelet() {
    var len = L + st.r;
    return { x: anchor.x + Math.sin(st.a) * len, y: anchor.y + Math.cos(st.a) * len };
  }

  function rest() {
    st.a = 0; st.aV = 0; st.b = 0; st.bV = 0; st.r = 0; st.rV = 0; st.exV = 0; st.eyV = 0;
  }

  /* One 240 Hz step. Free: the strap is a damped pendulum of length L + com
     (the badge's mass at its centre), and the badge a second pendulum of
     length com, hung from a slot that accelerates with the strap. Held: the
     slot is pinned to the pointer less the grab offset, the strap takes up
     the stretch, and the badge turns so the held point faces the pointer.

     The angle b is a CSS rotation, so a positive b swings the foot left while
     a positive a swings the slot right. That is why the badge is drawn toward
     -a, carrying on the strap's line, and why a slot accelerating to the
     right turns it the positive way: the foot stays behind. */
  function substep(h) {
    var prev = eyelet(), now;
    if (grab) {
      var cb = Math.cos(st.b), sb = Math.sin(st.b);
      var tx = grab.px - (cb * grab.ox - sb * grab.oy), ty = grab.py - (sb * grab.ox + cb * grab.oy);
      var dx = tx - anchor.x, dy = ty - anchor.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var da = shortest(clamp(Math.atan2(dx, dy), -1.4, 1.4) - st.a);
      st.aV = da / h * .35;
      st.a += da * .35;
      var targetR = clamp(len - L, -L * .15, Math.max(L * .45, 40));
      st.rV += ((targetR - st.r) * 900 - st.rV * 40) * h;
      st.r += st.rV * h;
      now = eyelet();
      /* Near the slot the held point has no direction worth following. */
      if (grab.far) {
        var want = Math.atan2(grab.ox, grab.oy) - Math.atan2(grab.px - now.x, grab.py - now.y);
        var db = shortest(want - st.b);
        st.bV += (db * 260 - st.bV * 18) * h;
        st.b += st.bV * h;
      }
      st.exV = (now.x - prev.x) / h;
      st.eyV = (now.y - prev.y) / h;
    } else if (reduced()) {
      rest();
    } else {
      st.aV += (-(G / (L + com)) * Math.sin(st.a) - 1.1 * st.aV) * h;
      st.a += st.aV * h;
      var w = 2 * Math.PI * 3;
      st.rV += (-w * w * st.r - 2 * .55 * w * st.rV) * h;
      st.r += st.rV * h;
      now = eyelet();
      var vx = (now.x - prev.x) / h, vy = (now.y - prev.y) / h;
      var ax = vx - st.exV, ay = vy - st.eyV;           // the slot's acceleration × h
      st.exV = vx;
      st.eyV = vy;
      var pull = (ax * Math.cos(st.b) + ay * Math.sin(st.b)) / com;
      st.bV += (-(G / com) * Math.sin(st.b) - 2.6 * st.bV + 55 * (-st.a - st.b)) * h + pull;
      st.b += st.bV * h;
    }
    if (reduced()) {
      st.turn = st.turnTarget;
      st.turnV = 0;
    } else {
      st.turnV += ((st.turnTarget - st.turn) * 170 - st.turnV * 20) * h;
      st.turn += st.turnV * h;
    }
  }

  function tick(now) {
    raf = 0;
    if (narrow()) { grab = null; press = null; rest(); return; }
    var dt = clamp((now - last) / 1000, 1 / 240, 1 / 30);
    last = now;
    var steps = Math.ceil(dt / STEP), h = dt / steps;
    for (var i = 0; i < steps; i++) substep(h);
    if (!isFinite(st.a + st.b + st.r)) rest();
    write();
    var energy = Math.abs(st.aV) + Math.abs(st.bV) + Math.abs(st.rV) / 40 + Math.abs(st.r) / 40 +
      Math.abs(st.a) * .2 + Math.abs(st.a + st.b) + Math.abs(st.turnTarget - st.turn) + Math.abs(st.turnV);
    calm = energy < .01 && !grab ? calm + dt : 0;
    if (calm < .4) raf = requestAnimationFrame(tick);
  }
  function wake() {
    if (raf) return;
    calm = 0;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  /* The strap is a quadratic curve that bows against the swing, as a real
     strap lags; the weave and the edges follow the same path. It runs behind
     the badge to the slot, where the ink shows through. */
  function write() {
    var e = eyelet();
    var mx = (anchor.x + e.x) / 2, my = (anchor.y + e.y) / 2;
    var nx = Math.cos(st.a), ny = -Math.sin(st.a);       // across the strap
    var bow = clamp(-st.aV * (L + st.r) * .045, -8, 8);
    var cx = mx + nx * bow, cy = my + ny * bow;
    var off = STRAP_W / 2 - .5;
    function curve(o) {
      return "M" + (anchor.x + nx * o) + " " + (anchor.y + ny * o) +
        " Q" + (cx + nx * o) + " " + (cy + ny * o) +
        " " + (e.x + nx * o) + " " + (e.y + ny * o);
    }
    var d = curve(0);
    band.setAttribute("d", d);
    weave.setAttribute("d", d);
    edgeA.setAttribute("d", curve(off));
    edgeB.setAttribute("d", curve(-off));
    badge.style.transform = "translate(" + e.x + "px, " + e.y + "px) rotate(" + st.b + "rad)";
    rotor.style.transform = "perspective(1100px) rotateY(" + st.turn + "deg)";
  }

  /* --------------------------------------------------------- 4. The hand -- */
  function flip() {
    flipped = !flipped;
    st.turnTarget += 180;
    badge.setAttribute("aria-pressed", flipped ? "true" : "false");
    (flipped ? back : front).removeAttribute("inert");
    (flipped ? front : back).setAttribute("inert", "");
    if (reduced()) {
      st.turn = st.turnTarget;
      st.turnV = 0;
      write();
      return;
    }
    st.bV += .6;                                         // a little kick as it turns
    wake();
  }

  function toRig(ev) {
    var r = rig.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  function release(ev) {
    if (!grab) return;
    grab = null;
    badge.removeAttribute("data-held");
    if (press && ev.type === "pointerup" && performance.now() - press.t < 450) flip();
    press = null;
    st.aV = clamp(st.aV, -5, 5);
    st.bV = clamp(st.bV, -8, 8);
    if (reduced()) { rest(); write(); }
    wake();
  }

  function bind() {
    badge.addEventListener("pointerdown", function (ev) {
      if (ev.button !== 0) return;
      var p = toRig(ev), e = eyelet(), cb = Math.cos(-st.b), sb = Math.sin(-st.b);
      var dx = p.x - e.x, dy = p.y - e.y;
      grab = { px: p.x, py: p.y, ox: cb * dx - sb * dy, oy: sb * dx + cb * dy, far: dx * dx + dy * dy > 400 };
      press = { x: ev.clientX, y: ev.clientY, t: performance.now() };
      badge.setPointerCapture(ev.pointerId);
      badge.setAttribute("data-held", "");
      ev.preventDefault();
      wake();
    });
    badge.addEventListener("pointermove", function (ev) {
      if (!grab) return;
      var p = toRig(ev);
      grab.px = p.x;
      grab.py = p.y;
      if (press) {
        var mx = ev.clientX - press.x, my = ev.clientY - press.y;
        if (mx * mx + my * my > 36) press = null;
      }
      wake();
    });
    badge.addEventListener("pointerup", release);
    badge.addEventListener("pointercancel", release);
    badge.addEventListener("lostpointercapture", release);
    badge.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      if (!ev.repeat) flip();
    });
  }

  /* ------------------------------------------------ 5. The one gentle push --
     Once, when most of the badge's column is on screen. */
  function push() {
    if (pushed) return;
    pushed = true;
    if (reduced() || narrow() || grab) return;
    st.aV = PUSH;
    wake();
  }

  function watch() {
    if (!("IntersectionObserver" in window)) { push(); return; }
    var heard = false;
    var io = new IntersectionObserver(function (seen) {
      heard = true;
      if (seen.some(function (en) { return en.isIntersecting; })) { io.disconnect(); push(); }
    }, { threshold: .6 });
    io.observe(space);
    /* A browser always reports once right after observe(); one that has
       said nothing after two seconds never will (some embedded browsers),
       so the push happens anyway. As in heart.js. */
    setTimeout(function () { if (!heard) { io.disconnect(); push(); } }, 2000);
  }

  /* ----------------------------------------------------------- 6. Start -- */
  function sync() {
    if (narrow()) return;
    if (!built) build();
    else measure();
  }
  window.addEventListener("resize", sync);
  if (small) {
    if (small.addEventListener) small.addEventListener("change", sync);
    else if (small.addListener) small.addListener(sync);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  sync();
})();
