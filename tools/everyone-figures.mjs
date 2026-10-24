/* ============================================================================
   "Tennis is for everyone": the people under the line.

       node tools/everyone-figures.mjs

   writes the SVG between the everyone-svg markers in public/index.html
   (then run tools/i18n/build.mjs for the copies): a row of players drawn
   as solid white pictograms on the black band, the way sports pictograms
   are drawn, with the detail carried by narrow gaps in the ink rather than
   by lines. Every part is a white shape with a hairline of the band's own
   black around it, drawn in order (legs, shorts over them, the torso, the
   arms, sleeves over them, the neck, the head, the hair, the racket), so
   wherever a part lies over another the gap between them shows: a sleeve
   hem, the waist, the top of a shoe, the hairline, the wrist. Each is a
   different person: a small child holding a ball up, a teenager with a
   ponytail hitting a two-handed backhand, a server at full stretch with a
   headband, a player in a sports wheelchair on the forehand, a woman in a
   skirt punching a volley, an older man in a cap walking with his racket
   on his shoulder, a player in a hijab on a forehand follow-through, a boy
   with curls at the ready, a bearded man waving, a parent holding a
   toddler's hand (the toddler has a tiny racket), and a woman with a bun
   in a split-step. One ball, the site's.

   Each person is drawn once, as a <symbol> in a zero-size sprite, and the
   wide row (one line) and the phone rows (two lines, a little larger)
   place them with <use>, so the page carries one copy of each. Each
   <use> rises into place as the band arrives (features.css). No words.
   ========================================================================== */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const r2 = (n) => Math.round(n * 10) / 10;
const INK = "#0d0d0d";

/* Joints in units of a 100-tall adult, feet on y = 0, y up negative.
   sh = shoulder half-width, hp = hip half-width. r = racket angle at the
   racket hand (0 right, -90 up); rh = which hand holds it. Everyone faces
   a little to the right, where the ball comes from. */
const POSES = {
  ready: { head: [3, -88], neck: [2, -78], sh: 7, hip: [0, -45], hp: 5,
    lKnee: [-13, -23], lFoot: [-17, 0], rKnee: [13, -23], rFoot: [17, 0],
    lElbow: [-10, -62], lHand: [-1, -53], rElbow: [13, -62], rHand: [5, -53], r: 15, rh: "r", lean: 2 },
  serve: { head: [5, -95], neck: [3, -85], sh: 6, hip: [1, -50], hp: 4,
    lKnee: [-3, -26], lFoot: [-4, -3], rKnee: [5, -26], rFoot: [6, -3],
    lElbow: [-8, -100], lHand: [-5, -116], rElbow: [17, -100], rHand: [15, -116], r: -78, rh: "r", lean: 0, toes: true, headband: true, wristband: true },
  forehand: { head: [-2, -89], neck: [-1, -79], sh: 7, hip: [0, -46], hp: 5,
    lKnee: [-12, -23], lFoot: [-15, 0], rKnee: [11, -23], rFoot: [14, 0],
    lElbow: [-17, -67], lHand: [-11, -58], rElbow: [1, -72], rHand: [-10, -86], r: 205, rh: "r", lean: -2, wristband: true },
  backhand2: { head: [-1, -89], neck: [-1, -79], sh: 7, hip: [0, -46], hp: 5,
    lKnee: [-11, -23], lFoot: [-14, 0], rKnee: [10, -23], rFoot: [13, 0],
    lElbow: [-16, -67], lHand: [-22, -60], rElbow: [-5, -69], rHand: [-20, -59], r: 192, rh: "r", lean: -1 },
  volley: { head: [7, -89], neck: [5, -79], sh: 7, hip: [2, -46], hp: 5,
    lKnee: [-8, -23], lFoot: [-11, 0], rKnee: [13, -24], rFoot: [17, 0],
    lElbow: [-8, -66], lHand: [1, -58], rElbow: [21, -70], rHand: [25, -84], r: -72, rh: "r", lean: 3, wristband: true },
  wave: { head: [0, -89], neck: [0, -79], sh: 7, hip: [0, -46], hp: 5,
    lKnee: [-7, -23], lFoot: [-9, 0], rKnee: [7, -23], rFoot: [9, 0],
    lElbow: [-11, -62], lHand: [-12, -48], rElbow: [14, -90], rHand: [10, -104], r: 100, rh: "l", lean: 0 },
  chair: { head: [7, -87], neck: [5, -77], sh: 7, hip: [-2, -44], hp: 4,
    lKnee: [14, -44], lFoot: [19, -27], rKnee: [15, -43], rFoot: [20, -26],
    lElbow: [-10, -62], lHand: [-15, -40], rElbow: [21, -70], rHand: [32, -66], r: -12, rh: "r", lean: 3, chair: true },
  kidball: { head: [0, -89], neck: [0, -79], sh: 7, hip: [0, -46], hp: 5,
    lKnee: [-7, -23], lFoot: [-9, 0], rKnee: [7, -23], rFoot: [9, 0],
    lElbow: [-11, -92], lHand: [-7, -106], rElbow: [11, -62], rHand: [13, -48], r: 95, rh: "r", lean: 0, ball: [-7, -114] },
  walk: { head: [8, -86], neck: [5, -77], sh: 7, hip: [0, -46], hp: 5,
    lKnee: [-7, -23], lFoot: [-11, 0], rKnee: [8, -22], rFoot: [9, 0],
    lElbow: [-9, -62], lHand: [-7, -48], rElbow: [15, -66], rHand: [12, -74], r: -122, rh: "r", lean: 4 },
  stand: { head: [0, -89], neck: [0, -79], sh: 7, hip: [0, -46], hp: 5,
    lKnee: [-6, -23], lFoot: [-8, 0], rKnee: [6, -23], rFoot: [8, 0],
    lElbow: [-11, -62], lHand: [-14, -44], rElbow: [11, -62], rHand: [13, -48], r: 95, rh: "r", lean: 0 },
  kidhand: { head: [0, -89], neck: [0, -79], sh: 7, hip: [0, -46], hp: 5,
    lKnee: [-6, -23], lFoot: [-8, 0], rKnee: [6, -23], rFoot: [8, 0],
    lElbow: [-12, -64], lHand: [-16, -56], rElbow: [14, -84], rHand: [22, -96], r: 100, rh: "l", lean: 0 },
};

/* Left to right. x in the 1200-wide row; h the height in units. */
const FIGS = [
  { x: 48, h: 58, pose: "kidball", hair: "short", racket: .62 },
  { x: 146, h: 82, pose: "backhand2", hair: "ponytail", racket: .9 },
  { x: 258, h: 100, pose: "serve", hair: "short", racket: 1 },
  { x: 372, h: 84, pose: "chair", hair: "short", racket: .95 },
  { x: 488, h: 92, pose: "volley", hair: "bun", skirt: true, racket: .95 },
  { x: 596, h: 86, pose: "walk", hair: "cap", racket: .92 },
  { x: 710, h: 94, pose: "forehand", hair: "hijab", racket: 1 },
  { x: 822, h: 72, pose: "ready", hair: "curls", racket: .82 },
  { x: 930, h: 96, pose: "wave", hair: "short", racket: .9, beard: true },
  { x: 1052, h: 96, pose: "stand", hair: "bob", skirt: true, racket: .92, pair: true },
  { x: 1150, h: 90, pose: "ready", hair: "bun", racket: .92 },
];

const line = (pts) => "M" + pts.map((p) => r2(p[0]) + "," + r2(p[1])).join(" L");
const P2 = (p) => r2(p[0]) + "," + r2(p[1]);

/* One person, drawn in adult units around x = 0 with the feet on y = 0
   (a child is the same drawing at a smaller k, so its gaps and limbs are
   finer too). Returns the SVG for the symbol's body.

   Every white part carries a hairline of the band's own black around it,
   so where parts overlap a gap shows; the order of drawing decides what
   lies over what: the chair, the legs, the shoes, the shorts or the skirt
   (their hem the gap over the legs), the sleeves and the neck in plain
   white (so they join the torso), the torso, the arms, the hands, the
   head, the hair, the racket, the ball. */
function person(f, ox = 0) {
  const p = POSES[f.pose], k = f.h / 100, out = [];
  const P = (j) => [ox + p[j][0] * k, p[j][1] * k];
  const pt = (x, y) => [ox + x * k, y * k];
  const G = 1.2 * k;                                   // the gap: a hairline of ink
  const RAD = Math.PI / 180;
  const polar = (cx, cy, r, deg) => [cx + r * Math.cos(deg * RAD), cy + r * Math.sin(deg * RAD)];
  /* A stroke with the gap around it: ink first, a little wider, then white. */
  const limb = (d, w) => {
    out.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${r2(w + 2 * G)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    out.push(`<path d="${d}" fill="none" stroke="#fff" stroke-width="${r2(w)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  };
  /* A plain white stroke, no gap: it merges with what comes after it. */
  const plain = (d, w) => out.push(`<path d="${d}" fill="none" stroke="#fff" stroke-width="${r2(w)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  /* A filled shape with rounded corners (its own white stroke) and the gap outside. */
  const shape = (d, round = 1.6 * k) => {
    out.push(`<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${r2(round + 2 * G)}" stroke-linejoin="round"/>`);
    out.push(`<path d="${d}" fill="#fff" stroke="#fff" stroke-width="${r2(round)}" stroke-linejoin="round"/>`);
  };
  const disc = (cx, cy, r) => out.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="#fff" stroke="${INK}" stroke-width="${r2(2 * G)}" paint-order="stroke"/>`);
  const ring = (cx, cy, r, w) => {
    out.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="none" stroke="${INK}" stroke-width="${r2(w + 2 * G)}"/>`);
    out.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="none" stroke="#fff" stroke-width="${r2(w)}"/>`);
  };
  const ink = (d, w) => out.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${r2(w)}" stroke-linecap="round"/>`);
  const towards = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
  /* A crescent between two radii, from one angle to another, travelling
     clockwise (dir 1, increasing degrees on screen) or counterclockwise. */
  const crescent = (cx, cy, outer, inner, from, to, dir) => {
    const span = ((to - from) * dir + 720) % 360, large = span > 180 ? 1 : 0;
    const o1 = polar(cx, cy, outer, from), o2 = polar(cx, cy, outer, to), i2 = polar(cx, cy, inner, to), i1 = polar(cx, cy, inner, from);
    return `M${P2(o1)} A${r2(outer)} ${r2(outer)} 0 ${large} ${dir > 0 ? 1 : 0} ${P2(o2)} L${P2(i2)} A${r2(inner)} ${r2(inner)} 0 ${large} ${dir > 0 ? 0 : 1} ${P2(i1)} Z`;
  };

  const head = P("head"), R = 7.6 * k;
  const lSh = pt(p.neck[0] - p.sh + 1.5, p.neck[1] + 3), rSh = pt(p.neck[0] + p.sh - 1.5, p.neck[1] + 3);
  const lHip = pt(p.hip[0] - p.hp + 1, p.hip[1]), rHip = pt(p.hip[0] + p.hp - 1, p.hip[1]);
  const LEG = 6.6 * k, ARM = 5.6 * k;
  const lKnee = P("lKnee"), rKnee = P("rKnee"), lFoot = P("lFoot"), rFoot = P("rFoot");
  const lElbow = P("lElbow"), rElbow = P("rElbow"), lHand = P("lHand"), rHand = P("rHand");
  const [hx, hy] = head;

  /* ---- the chair first: a sports chair in profile, the body in front of it */
  if (p.chair) {
    const wx = ox - 5 * k, wy = -20 * k, wr = 19 * k;
    ring(wx, wy, wr, 3.4 * k);
    out.push(`<circle cx="${r2(wx)}" cy="${r2(wy)}" r="${r2(wr + 3.6 * k)}" fill="none" stroke="#fff" stroke-width="${r2(1.3 * k)}" stroke-opacity=".75"/>`);   // the push rim
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + .35; limb(line([[wx + Math.cos(a) * 4.5 * k, wy + Math.sin(a) * 4.5 * k], [wx + Math.cos(a) * (wr - 2 * k), wy + Math.sin(a) * (wr - 2 * k)]]), 1.5 * k); }
    disc(wx, wy, 3.4 * k);
    limb(line([pt(-14, -46), pt(10, -46)]), 5 * k);                      // the seat
    limb(line([pt(-13, -46), pt(-15.5, -72)]), 3.6 * k);                 // the backrest
    limb(line([pt(10, -46), pt(21, -27), pt(28, -27)]), 3 * k);          // the frame to the footplate
    limb(line([pt(19, -24), pt(29, -24)]), 2.6 * k);                     // the footplate
    ring(ox + 25 * k, -5 * k, 4.6 * k, 2.6 * k);                         // the caster
    disc(ox + 25 * k, -5 * k, 1.3 * k);
  }

  /* ---- legs, shoes, then the shorts or the skirt over them */
  limb(line([lHip, lKnee, lFoot]), LEG);
  limb(line([rHip, rKnee, rFoot]), LEG);
  const shoe = (foot) => {
    if (p.chair) { limb(line([[foot[0] - 2 * k, foot[1] - 1.5 * k], [foot[0] + 6.5 * k, foot[1] + 1 * k]]), 4.2 * k); return; }
    if (p.toes) { limb(line([[foot[0] - 1 * k, foot[1] - 1.5 * k], [foot[0] + 5.5 * k, foot[1] + 2.4 * k]]), 4.2 * k); return; }
    limb(line([[foot[0] - 2.2 * k, foot[1] - 2 * k], [foot[0] + 6.8 * k, foot[1] - 2 * k]]), 4.4 * k);
    ink(line([[foot[0] - 1 * k, foot[1] - 4.6 * k], [foot[0] + 1.8 * k, foot[1] - 4.6 * k]]), G * .9);   // the sock's edge
  };
  shoe(lFoot); shoe(rFoot);
  if (f.skirt) {
    const a = [lHip[0] - 2.5 * k, lHip[1] - 3 * k], b = [rHip[0] + 2.5 * k, rHip[1] - 3 * k];
    const c = [rHip[0] + 11 * k, rHip[1] + 21 * k], d = [lHip[0] - 11 * k, lHip[1] + 21 * k];
    shape(`M${P2(a)} L${P2(b)} L${P2(c)} Q${P2([(c[0] + d[0]) / 2, c[1] + 2.5 * k])} ${P2(d)} Z`);
  } else {
    /* one pair of shorts: from the hips to mid-thigh on each leg, with the
       crotch between */
    const w = LEG * .95;
    const side = (hip, knee, sign) => { const u = unit(hip, knee); let n = [-u[1], u[0]]; if (Math.sign(n[0]) !== sign) n = [-n[0], -n[1]]; return n; };
    const ln = side(lHip, lKnee, -1), rn = side(rHip, rKnee, 1);
    const lm = towards(lHip, lKnee, .5), rm = towards(rHip, rKnee, .5);
    const crotch = towards(towards(lHip, lKnee, .3), towards(rHip, rKnee, .3), .5);
    const pts = [
      [lHip[0] + ln[0] * w * 1.15 - 0, lHip[1] + ln[1] * w * 1.15 - 2.5 * k],
      [lm[0] + ln[0] * w, lm[1] + ln[1] * w], [lm[0] - ln[0] * w * .85, lm[1] - ln[1] * w * .85],
      crotch,
      [rm[0] - rn[0] * w * .85, rm[1] - rn[1] * w * .85], [rm[0] + rn[0] * w, rm[1] + rn[1] * w],
      [rHip[0] + rn[0] * w * 1.15, rHip[1] + rn[1] * w * 1.15 - 2.5 * k],
    ];
    shape(line(pts) + " Z");
  }

  /* ---- sleeves and the neck, plain, so the torso's edge is a seam over them */
  plain(line([lSh, towards(lSh, lElbow, .45)]), ARM * 1.65);
  plain(line([rSh, towards(rSh, rElbow, .45)]), ARM * 1.65);
  plain(line([pt(p.neck[0], p.neck[1] + 5), [hx, hy + R * .5]]), 4.6 * k);

  /* ---- the torso: shoulders to hips, a little waist, the lean in the middle */
  const nw = pt(p.neck[0], p.neck[1] + 2.5);
  const tl = [lSh[0] - 2.4 * k, lSh[1] - 1 * k], tr = [rSh[0] + 2.4 * k, rSh[1] - 1 * k];
  const bl = [lHip[0] - 1.8 * k, lHip[1] + 2 * k], br = [rHip[0] + 1.8 * k, rHip[1] + 2 * k];
  const midY = (tl[1] + bl[1]) / 2, lean = p.lean * k;
  shape(`M${P2(tl)} Q${P2([nw[0], tl[1] - 1.5 * k])} ${P2(tr)} Q${P2([tr[0] - 2.2 * k + lean, midY])} ${P2(br)} L${P2(bl)} Q${P2([tl[0] + 2.2 * k + lean, midY])} ${P2(tl)} Z`, 2.6 * k);

  /* ---- arms over the body, a hand at each end */
  limb(line([lSh, lElbow, lHand]), ARM);
  limb(line([rSh, rElbow, rHand]), ARM);
  out.push(`<circle cx="${r2(lHand[0])}" cy="${r2(lHand[1])}" r="${r2(ARM * .62)}" fill="#fff"/>`);
  out.push(`<circle cx="${r2(rHand[0])}" cy="${r2(rHand[1])}" r="${r2(ARM * .62)}" fill="#fff"/>`);
  if (p.wristband) {
    const h = p.rh === "l" ? lHand : rHand, e = p.rh === "l" ? lElbow : rElbow;
    const u = unit(h, e), c = [h[0] + u[0] * 6 * k, h[1] + u[1] * 6 * k], n = [-u[1], u[0]];
    ink(line([[c[0] - n[0] * 3.4 * k, c[1] - n[1] * 3.4 * k], [c[0] + n[0] * 3.4 * k, c[1] + n[1] * 3.4 * k]]), G);
  }

  /* ---- the head, then the hair (a crescent of the head's own circle) */
  if (f.hair === "hijab") {
    /* the drape: from under the chin round to the shoulders, over the shirt */
    const A = polar(hx, hy, R * 1.28, 62), B = [hx + R * .78, hy + R * 2.55], C = [hx - R * 1.62, hy + R * 2.7], D = polar(hx, hy, R * 1.28, 168);
    shape(`M${P2(A)} L${P2(B)} L${P2(C)} L${P2(D)} A${r2(R * 1.28)} ${r2(R * 1.28)} 0 0 0 ${P2(A)} Z`);
  }
  disc(hx, hy, R);
  const cap = (outer, inner, from, to) => shape(crescent(hx, hy, R * outer, R * inner, from, to, -1), .8 * k);
  if (f.hair === "short" || f.hair === "bun" || f.hair === "ponytail" || f.hair === "pigtails" || f.hair === "curls") cap(1.1, .8, -55, 150);
  if (f.hair === "bun") { const b = polar(hx, hy, R * 1.22, -150); disc(b[0], b[1], R * .52); }
  if (f.hair === "ponytail") {
    const s = polar(hx, hy, R * 1.0, 172);
    limb(`M${P2(s)} Q${r2(hx - R * 2.3)},${r2(hy + R * .2)} ${r2(hx - R * 1.95)},${r2(hy + R * 1.9)}`, 3.6 * k);
    ink(line([[hx - R * 1.32, hy - R * .5], [hx - R * 1.12, hy + R * .3]]), G);   // the tie
  }
  if (f.hair === "pigtails") {
    const l = polar(hx, hy, R * .95, 165), r = polar(hx, hy, R * .95, -15);
    limb(line([l, [hx - R * 2.1, hy + R * 1.0]]), 3.2 * k); limb(line([r, [hx + R * 1.95, hy + R * .85]]), 3.2 * k);
    disc(hx - R * 2.1, hy + R * 1.0, 2.1 * k); disc(hx + R * 1.95, hy + R * .85, 2.1 * k);
  }
  if (f.hair === "curls") for (const a of [-35, -65, -95, -125, -155]) { const c = polar(hx, hy, R * 1.04, a); disc(c[0], c[1], R * .4); }
  if (f.hair === "bob") {
    cap(1.18, .8, -55, 130);
    const a = polar(hx, hy, R * 1.18, 130), b = polar(hx, hy, R * .8, 125);
    shape(`M${P2(a)} L${r2(hx - R * 1.12)},${r2(hy + R * 1.5)} L${r2(hx - R * .5)},${r2(hy + R * 1.55)} L${P2(b)} Z`, .8 * k);
  }
  if (f.hair === "cap") {
    cap(1.12, .86, -40, 165);
    const a = polar(hx, hy, R * .98, -42), b = polar(hx, hy, R * .98, -8);
    shape(`M${P2(a)} L${r2(hx + R * 2.45)},${r2(hy - R * .22)} L${r2(hx + R * 2.4)},${r2(hy + R * .16)} L${P2(b)} Z`, .8 * k);   // the peak
  }
  if (f.hair === "hijab") cap(1.28, .92, -70, 110);
  if (f.beard) shape(crescent(hx, hy, R * 1.02, R * .66, 15, 150, 1), .8 * k);
  if (p.headband) { const a = polar(hx, hy, R * .72, -40), b = polar(hx, hy, R * .72, -140); ink(`M${P2(a)} A${r2(R * .72)} ${r2(R * .72)} 0 0 0 ${P2(b)}`, G * 1.1); }

  /* ---- the racket: a grip with a butt cap, the throat, the frame, the strings */
  const hand = p.rh === "l" ? lHand : rHand, a = p.r * RAD, rk = k * f.racket;
  const along = (d, side = 0) => [hand[0] + Math.cos(a) * d - Math.sin(a) * side, hand[1] + Math.sin(a) * d + Math.cos(a) * side];
  const CX = 27, RX = 10.5, RY = 8.2;
  limb(line([along(-2.5 * rk), along(11 * rk)]), 3.8 * rk);
  limb(line([along(-2.5 * rk), along(-.5 * rk)]), 5 * rk);                                 // the butt cap
  limb(line([along(10.5 * rk, 0), along(17.6 * rk, -5.2 * rk)]), 2.6 * rk);                 // the throat
  limb(line([along(10.5 * rk, 0), along(17.6 * rk, 5.2 * rk)]), 2.6 * rk);
  const hc = along(CX * rk);
  out.push(`<ellipse cx="${r2(hc[0])}" cy="${r2(hc[1])}" rx="${r2(RX * rk)}" ry="${r2(RY * rk)}" transform="rotate(${r2(p.r)} ${r2(hc[0])} ${r2(hc[1])})" fill="none" stroke="${INK}" stroke-width="${r2(2.8 * rk + 2 * G)}"/>`);
  out.push(`<ellipse cx="${r2(hc[0])}" cy="${r2(hc[1])}" rx="${r2(RX * rk)}" ry="${r2(RY * rk)}" transform="rotate(${r2(p.r)} ${r2(hc[0])} ${r2(hc[1])})" fill="none" stroke="#fff" stroke-width="${r2(2.8 * rk)}"/>`);
  const strings = [];
  for (const s of [-6, -3, 0, 3, 6]) { const half = RX * Math.sqrt(1 - (s / RY) ** 2) - 1.2; strings.push(line([along((CX - half) * rk, s * rk), along((CX + half) * rk, s * rk)])); }
  for (const d of [-7, -3.5, 0, 3.5, 7]) { const half = RY * Math.sqrt(1 - (d / RX) ** 2) - 1.2; strings.push(line([along((CX + d) * rk, -half * rk), along((CX + d) * rk, half * rk)])); }
  out.push(`<path d="${strings.join(" ")}" fill="none" stroke="#fff" stroke-width="${r2(.9 * rk)}" stroke-opacity=".6"/>`);

  if (p.ball) out.push(`<circle class="ev-ball" fill="#d9ef3f" stroke="none" cx="${r2(ox + p.ball[0] * k)}" cy="${r2(p.ball[1] * k)}" r="${r2(4.4 * k)}"/>`);
  return out.join("");
}

/* A symbol per person (the pair is one symbol: the toddler's hand in the
   parent's). The box is wide and tall enough for a server's racket and a
   chair's wheels. */
const BOX = { x: -60, y: -168, w: 120, h: 176 };
const symbols = FIGS.map((f, i) => {
  let body = person(f);
  if (f.pair) {
    const kid = { h: f.h * .5, pose: "kidhand", hair: "pigtails", racket: .55 };
    const k = f.h / 100, kk = kid.h / 100;
    const parentHand = POSES[f.pose].lHand[0] * k;
    body = person(kid, parentHand - POSES.kidhand.rHand[0] * kk) + body;
  }
  return `<symbol id="ev-p${i + 1}" viewBox="${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}" overflow="visible">${body}</symbol>`;
});
const use = (i, x, base, h) => {
  const k = h / FIGS[i].h;   // the symbol is drawn at the figure's own height; scale to the row's
  return `<use class="ev-fig" href="#ev-p${i + 1}" x="${r2(x + BOX.x * k)}" y="${r2(base + BOX.y * k)}" width="${r2(BOX.w * k)}" height="${r2(BOX.h * k)}" style="--d:${r2(x / 1200 * .8)}s"/>`;
};

const sprite = `<svg class="everyone-defs" aria-hidden="true" focusable="false" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden"><defs>
${symbols.join("\n")}
</defs></svg>`;
const wide = `<svg class="everyone-art is-wide" viewBox="0 0 1200 212" aria-hidden="true" focusable="false">
<path class="ev-ground" pathLength="1" d="M0 200 H1200" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
${FIGS.map((f, i) => use(i, f.x, 200, f.h)).join("\n")}
</svg>`;
/* Phones: the same people in two rows, a little larger. */
const half = Math.ceil(FIGS.length / 2);
const rowOf = (from, to, base) => FIGS.slice(from, to).map((f, j, arr) => use(from + j, 64 + j * (512 / (arr.length - 1)), base, f.h * 1.12)).join("\n");
const narrow = `<svg class="everyone-art is-narrow" viewBox="0 0 640 450" aria-hidden="true" focusable="false">
<path class="ev-ground" pathLength="1" d="M0 212 H640" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
<path class="ev-ground" pathLength="1" d="M0 438 H640" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
${rowOf(0, half, 212)}
${rowOf(half, FIGS.length, 438)}
</svg>`;
const svg = sprite + "\n" + wide + "\n" + narrow;

const page = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "index.html");
let src = readFileSync(page, "utf8");
const a = src.indexOf("<!-- everyone-svg -->"), b = src.indexOf("<!-- /everyone-svg -->");
if (a < 0 || b < 0) throw new Error("public/index.html: the everyone-svg markers are missing");
src = src.slice(0, a) + "<!-- everyone-svg -->\n" + svg + "\n        " + src.slice(b);
writeFileSync(page, src);
console.log(`wrote the figures into public/index.html (${(svg.length / 1024).toFixed(1)} KB of SVG)`);
