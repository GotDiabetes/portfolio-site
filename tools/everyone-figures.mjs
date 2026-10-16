/* ============================================================================
   "Tennis is for everyone": the people under the line.

       node tools/everyone-figures.mjs

   writes the SVG between the everyone-svg markers in public/index.html
   (then run tools/i18n/build.mjs for the copies): a row of players drawn
   in white line on the black band, in the Book FX figure's family but a
   step more human: a head (filled), a neck, shoulders, a torso with a
   little curve, hips, arms and legs with elbows and knees, small hands,
   feet, and a racket with its strings. Each is a different person: a
   small child holding a ball up, a teenager with a ponytail hitting a
   two-handed backhand, a tall server at full stretch, a player in a
   wheelchair on the forehand, a woman in a skirt punching a volley, an
   older man with a cap and a stoop walking with his racket on his
   shoulder, a player in a hijab on a forehand follow-through, a boy with
   curls at the ready, a bearded man waving, a parent holding a toddler's
   hand (the toddler has a tiny racket), and a woman with a bun in a
   split-step. One ball, the site's. Each figure draws itself as the band
   arrives (features.css). No words. Phones get the same people in two
   rows.
   ========================================================================== */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const r2 = (n) => Math.round(n * 10) / 10;

/* Joints in units of a 100-tall adult, feet on y = 0, y up negative.
   sh = shoulder half-width, hp = hip half-width. r = racket angle at the
   racket hand (0 right, -90 up); rh = which hand holds it. */
const POSES = {
  ready: { head: [3, -88], neck: [2, -78], sh: 7, hip: [0, -45], hp: 5,
    lKnee: [-13, -23], lFoot: [-17, 0], rKnee: [13, -23], rFoot: [17, 0],
    lElbow: [-10, -62], lHand: [-1, -53], rElbow: [13, -62], rHand: [5, -53], r: 15, rh: "r", lean: 2 },
  serve: { head: [5, -95], neck: [3, -85], sh: 6, hip: [1, -50], hp: 4,
    lKnee: [-3, -26], lFoot: [-4, -3], rKnee: [5, -26], rFoot: [6, -3],
    lElbow: [-8, -100], lHand: [-5, -116], rElbow: [17, -100], rHand: [15, -116], r: -78, rh: "r", lean: 0, toes: true },
  forehand: { head: [-2, -89], neck: [-1, -79], sh: 7, hip: [0, -46], hp: 5,
    lKnee: [-12, -23], lFoot: [-15, 0], rKnee: [11, -23], rFoot: [14, 0],
    lElbow: [-17, -67], lHand: [-11, -58], rElbow: [1, -72], rHand: [-10, -86], r: 205, rh: "r", lean: -2 },
  backhand2: { head: [-1, -89], neck: [-1, -79], sh: 7, hip: [0, -46], hp: 5,
    lKnee: [-11, -23], lFoot: [-14, 0], rKnee: [10, -23], rFoot: [13, 0],
    lElbow: [-16, -67], lHand: [-22, -60], rElbow: [-5, -69], rHand: [-20, -59], r: 192, rh: "r", lean: -1 },
  volley: { head: [7, -89], neck: [5, -79], sh: 7, hip: [2, -46], hp: 5,
    lKnee: [-8, -23], lFoot: [-11, 0], rKnee: [13, -24], rFoot: [17, 0],
    lElbow: [-8, -66], lHand: [1, -58], rElbow: [21, -70], rHand: [25, -84], r: -72, rh: "r", lean: 3 },
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

function line(pts) { return "M" + pts.map((p) => r2(p[0]) + "," + r2(p[1])).join(" L"); }

/* Pictogram drawing: solid white silhouettes. A separate round head, a
   capsule torso, limbs as thick rounded strokes, filled hair shapes, a
   racket with a thin-strung head. Widths are in figure units, so a child
   is drawn with finer limbs than an adult. */
function figure(f, base = 200) {
  const p = POSES[f.pose], k = f.h / 100, out = [];
  const P = (j) => [f.x + p[j][0] * k, base + p[j][1] * k];
  const pt = (x, y) => [f.x + x * k, base + y * k];
  const stroke = (d, w, cls = "") => out.push(`<path${cls ? ` class="${cls}"` : ""} d="${d}" fill="none" stroke="#fff" stroke-width="${r2(w)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  const fill = (d, cls = "") => out.push(`<path${cls ? ` class="${cls}"` : ""} d="${d}" fill="#fff" stroke="none"/>`);
  const dot = (cx, cy, r, cls = "") => out.push(`<circle${cls ? ` class="${cls}"` : ""} cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="#fff" stroke="none"/>`);
  const ring = (cx, cy, r, w) => out.push(`<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="none" stroke="#fff" stroke-width="${r2(w)}"/>`);

  const head = P("head"), R = 7.4 * k;
  const hip = P("hip");
  const lSh = pt(p.neck[0] - p.sh + 2, p.neck[1] + 3), rSh = pt(p.neck[0] + p.sh - 2, p.neck[1] + 3);
  const lHip = pt(p.hip[0] - p.hp + 1, p.hip[1]), rHip = pt(p.hip[0] + p.hp - 1, p.hip[1]);
  const LIMB = 6.2 * k, ARM = 5.4 * k, TORSO = 13 * k;

  // torso: a capsule from just under the head to the hips, with the lean
  const tTop = pt(p.neck[0], p.neck[1] + 1.5);
  stroke(`M${r2(tTop[0])},${r2(tTop[1])} Q${r2((tTop[0] + hip[0]) / 2 + p.lean * k)},${r2((tTop[1] + hip[1]) / 2)} ${r2(hip[0])},${r2(hip[1] + 1 * k)}`, TORSO);
  // legs
  if (!p.chair) {
    stroke(line([lHip, P("lKnee"), P("lFoot")]), LIMB);
    stroke(line([rHip, P("rKnee"), P("rFoot")]), LIMB);
    const lf = P("lFoot"), rf = P("rFoot");
    if (p.toes) { stroke(line([[lf[0], lf[1]], [lf[0] + 4 * k, lf[1] + 2.5 * k]]), LIMB); stroke(line([[rf[0], rf[1]], [rf[0] + 4 * k, rf[1] + 2.5 * k]]), LIMB); }
    else { stroke(line([[lf[0] - 1 * k, lf[1]], [lf[0] + 6 * k, lf[1]]]), LIMB); stroke(line([[rf[0] - 1 * k, rf[1]], [rf[0] + 6 * k, rf[1]]]), LIMB); }
  } else {
    stroke(line([lHip, P("lKnee"), P("lFoot")]), LIMB);
    stroke(line([rHip, P("rKnee"), P("rFoot")]), LIMB);
    const wx = f.x - 5 * k, wy = base - 20 * k;
    ring(wx, wy, 19 * k, 3.4 * k);
    dot(wx, wy, 3.2 * k);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + .3; stroke(line([[wx + Math.cos(a) * 4 * k, wy + Math.sin(a) * 4 * k], [wx + Math.cos(a) * 17.5 * k, wy + Math.sin(a) * 17.5 * k]]), 1.6 * k); }
    ring(f.x + 22 * k, base - 5 * k, 4.5 * k, 2.4 * k);
    stroke(line([pt(-13, -46), pt(10, -46), pt(21, -27), pt(27, -27)]), 3.2 * k);
    stroke(line([pt(-13, -46), pt(-15, -70)]), 3.2 * k);
  }
  // arms (over the torso)
  stroke(line([lSh, P("lElbow"), P("lHand")]), ARM);
  stroke(line([rSh, P("rElbow"), P("rHand")]), ARM);
  // a skirt
  if (f.skirt) fill(line([[lHip[0] - 2 * k, lHip[1] - 2 * k], [lHip[0] - 10 * k, lHip[1] + 20 * k], [rHip[0] + 10 * k, rHip[1] + 20 * k], [rHip[0] + 2 * k, rHip[1] - 2 * k]]) + " Z");
  // head and hair
  const [hx, hy] = head;
  dot(hx, hy, R, "ev-head");
  if (f.hair === "ponytail") stroke(`M${r2(hx - R * .9)},${r2(hy - R * .2)} Q${r2(hx - R * 2.2)},${r2(hy + R * .1)} ${r2(hx - R * 1.9)},${r2(hy + R * 1.7)}`, 3.6 * k);
  if (f.hair === "bun") dot(hx - R * .55, hy - R * 1.25, R * .5);
  if (f.hair === "bob") fill(`M${r2(hx - R * 1.25)},${r2(hy + R * 1.0)} A${r2(R * 1.25)} ${r2(R * 1.25)} 0 1 1 ${r2(hx + R * 1.25)},${r2(hy + R * 1.0)} Z`);
  if (f.hair === "curls") { for (let i = -2; i <= 2; i++) dot(hx + i * R * .5, hy - R * .9 + Math.abs(i) * R * .12, R * .42); }
  if (f.hair === "cap") { stroke(line([[hx + R * .4, hy - R * .45], [hx + R * 2.3, hy - R * .25]]), 2.6 * k); fill(`M${r2(hx - R * 1.05)},${r2(hy - R * .3)} A${r2(R * 1.08)} ${r2(R * 1.08)} 0 0 1 ${r2(hx + R * 1.05)},${r2(hy - R * .3)} Z`); }
  if (f.hair === "hijab") stroke(`M${r2(hx - R * 1.35)},${r2(hy + R * 1.2)} A${r2(R * 1.35)} ${r2(R * 1.35)} 0 1 1 ${r2(hx + R * 1.35)},${r2(hy + R * 1.2)} Q${r2(hx + R * 1.5)},${r2(hy + R * 2.6)} ${r2(hx + R * .5)},${r2(hy + R * 3)}`, 3.2 * k);
  if (f.hair === "pigtails") { stroke(line([[hx - R * .9, hy - R * .1], [hx - R * 1.9, hy + R * .9]]), 3.4 * k); stroke(line([[hx + R * .9, hy - R * .1], [hx + R * 1.9, hy + R * .9]]), 3.4 * k); }
  if (f.beard) fill(`M${r2(hx - R * .85)},${r2(hy + R * .35)} A${r2(R * .9)} ${r2(R * .9)} 0 0 0 ${r2(hx + R * .85)},${r2(hy + R * .35)} Z`);
  // the racket
  const hand = P(p.rh === "l" ? "lHand" : "rHand"), a = p.r * Math.PI / 180, rk = k * f.racket;
  const along = (d, side = 0) => [hand[0] + Math.cos(a) * d - Math.sin(a) * side, hand[1] + Math.sin(a) * d + Math.cos(a) * side];
  stroke(line([along(0), along(13 * rk)]), 3.6 * rk);
  const hc = along(25 * rk);
  out.push(`<ellipse cx="${r2(hc[0])}" cy="${r2(hc[1])}" rx="${r2(12 * rk)}" ry="${r2(9 * rk)}" transform="rotate(${r2(p.r)} ${r2(hc[0])} ${r2(hc[1])})" fill="none" stroke="#fff" stroke-width="${r2(3 * rk)}"/>`);
  for (const sd of [-5.5, 0, 5.5]) stroke(line([along(15 * rk, sd * rk), along(35 * rk, sd * rk)]), 1 * rk, "ev-string");
  for (const d of [18, 25, 32]) stroke(line([along(d * rk, -8 * rk), along(d * rk, 8 * rk)]), 1 * rk, "ev-string");
  if (p.ball) out.push(`<circle class="ev-ball" fill="#d9ef3f" stroke="none" cx="${r2(f.x + p.ball[0] * k)}" cy="${r2(base + p.ball[1] * k)}" r="${r2(4.4 * k)}"/>`);
  const g = `<g class="ev-fig" style="--d:${r2(f.x / 1200 * .8)}s">${out.join("")}</g>`;
  if (f.pair) {
    const kid = { x: 0, h: f.h * .5, pose: "kidhand", hair: "pigtails", racket: .55 };
    const kk = kid.h / 100;
    kid.x = P("lHand")[0] - POSES.kidhand.rHand[0] * kk;
    return figure(kid, base) + g;
  }
  return g;
}

const ATTR = 'fill="#fff"';
const wide = `<svg class="everyone-art is-wide" viewBox="0 0 1200 212" aria-hidden="true" focusable="false" ${ATTR}>
<path class="ev-ground" pathLength="1" d="M0 200 H1200" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
${FIGS.map((f) => figure(f)).join("\n")}
</svg>`;
/* Phones: the same people in two rows, a little larger. */
const half = Math.ceil(FIGS.length / 2);
const rowOf = (figs, base) => figs.map((f, i) => figure({ ...f, x: 64 + i * (512 / (figs.length - 1)), h: f.h * 1.12 }, base)).join("\n");
const narrow = `<svg class="everyone-art is-narrow" viewBox="0 0 640 450" aria-hidden="true" focusable="false" ${ATTR}>
<path class="ev-ground" pathLength="1" d="M0 212 H640" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
<path class="ev-ground" pathLength="1" d="M0 438 H640" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
${rowOf(FIGS.slice(0, half), 212)}
${rowOf(FIGS.slice(half), 438)}
</svg>`;
const svg = wide + "\n" + narrow;

const page = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "index.html");
let src = readFileSync(page, "utf8");
const a = src.indexOf("<!-- everyone-svg -->"), b = src.indexOf("<!-- /everyone-svg -->");
if (a < 0 || b < 0) throw new Error("public/index.html: the everyone-svg markers are missing");
src = src.slice(0, a) + "<!-- everyone-svg -->\n" + svg + "\n        " + src.slice(b);
writeFileSync(page, src);
console.log("wrote the figures into public/index.html");
