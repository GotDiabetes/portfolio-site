/* ============================================================================
   "Tennis is for everyone": the people around the line.

       node tools/everyone-figures.mjs

   writes the SVG between the everyone-svg markers in public/index.html
   (then run tools/i18n/build.mjs for the copies): a row of players drawn
   in white line on the black band, the Book FX figure's own vocabulary
   (joints, a round head, the racket glyph), each a different person: a
   small child with a short racket and a red-stage ball, a teenager with a
   ponytail, a tall server, a player in a wheelchair, a woman in a skirt at
   the net, a man with a cap and a little stoop, a player in a hijab, a
   boy with curls hitting a two-handed backhand, and someone waving. One
   ball, the site's. Each line draws itself when the band arrives
   (features.css). No words.
   ========================================================================== */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const r2 = (n) => Math.round(n * 10) / 10;
const BALL = "#d9ef3f";

/* A figure is drawn at height h with feet on y = 0 (y up negative) in units
   of a 100-tall adult, then scaled. Joints: head (centre), neck, hip,
   knees, feet, elbows, hands; r = racket angle at rHand (0 forward/right,
   -90 up). Hair and clothes are small extras. */
const POSES = {
  ready: { head: [0, -89], neck: [0, -79], hip: [0, -45], lKnee: [-9, -23], lFoot: [-12, 0], rKnee: [9, -23], rFoot: [12, 0],
    lElbow: [-10, -66], lHand: [4, -58], rElbow: [12, -66], rHand: [6, -58], r: 20 },
  serve: { head: [2, -92], neck: [1, -82], hip: [-2, -47], lKnee: [-6, -24], lFoot: [-8, -2], rKnee: [8, -24], rFoot: [9, -2],
    lElbow: [-6, -98], lHand: [-2, -114], rElbow: [14, -94], rHand: [10, -108], r: -70 },
  forehand: { head: [2, -89], neck: [1, -79], hip: [0, -45], lKnee: [-10, -23], lFoot: [-14, 0], rKnee: [11, -23], rFoot: [14, 0],
    lElbow: [-14, -70], lHand: [-22, -62], rElbow: [14, -68], rHand: [28, -62], r: -20 },
  backhand2: { head: [-1, -89], neck: [-1, -79], hip: [0, -45], lKnee: [-10, -23], lFoot: [-13, 0], rKnee: [9, -23], rFoot: [12, 0],
    lElbow: [-12, -66], lHand: [-22, -60], rElbow: [-6, -64], rHand: [-20, -58], r: 200 },
  volley: { head: [1, -89], neck: [0, -79], hip: [0, -45], lKnee: [-8, -23], lFoot: [-11, 0], rKnee: [10, -22], rFoot: [15, 0],
    lElbow: [-12, -68], lHand: [-8, -58], rElbow: [14, -74], rHand: [20, -86], r: -80 },
  wave: { head: [0, -89], neck: [0, -79], hip: [0, -45], lKnee: [-8, -23], lFoot: [-10, 0], rKnee: [8, -23], rFoot: [10, 0],
    lElbow: [-12, -70], lHand: [-16, -92], rElbow: [12, -66], rHand: [14, -50], r: 70 },
  chair: { head: [2, -86], neck: [2, -76], hip: [-2, -46], lKnee: [16, -42], lFoot: [22, -26], rKnee: [16, -42], rFoot: [22, -26],
    lElbow: [-8, -62], lHand: [-2, -50], rElbow: [16, -66], rHand: [30, -62], r: -15, chair: true },
};

const FIGS = [
  { x: 52, h: 56, pose: "ready", hair: "short", racket: .62, ball: [16, -40], kid: true },
  { x: 146, h: 80, pose: "backhand2", hair: "ponytail", racket: .9 },
  { x: 258, h: 100, pose: "serve", hair: "short", racket: 1 },
  { x: 372, h: 82, pose: "chair", hair: "short", racket: .95 },
  { x: 486, h: 92, pose: "volley", hair: "bun", skirt: true, racket: .95 },
  { x: 596, h: 88, pose: "ready", hair: "cap", racket: .95, stoop: true },
  { x: 706, h: 94, pose: "forehand", hair: "hijab", racket: 1 },
  { x: 822, h: 70, pose: "backhand2", hair: "curls", racket: .8 },
  { x: 930, h: 96, pose: "wave", hair: "short", racket: .9, beard: true },
  { x: 1046, h: 64, pose: "forehand", hair: "pigtails", racket: .7, kid: true },
  { x: 1150, h: 90, pose: "ready", hair: "bun", skirt: true, racket: .92 },
];

function line(pts) { return "M" + pts.map((p) => r2(p[0]) + "," + r2(p[1])).join(" L"); }

function figure(f, base = 200) {
  const p = POSES[f.pose], k = f.h / 100, out = [];
  const P = (j) => [f.x + p[j][0] * k, base + p[j][1] * k];
  const path = (d, cls = "") => out.push(`<path${cls ? ` class="${cls}"` : ""} pathLength="1" d="${d}"/>`);
  const circ = (cx, cy, r) => out.push(`<circle pathLength="1" cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}"/>`);
  const [hx, hy] = P("head"), R = 8 * k;
  // body
  const neck = P("neck"), hip = P("hip");
  path(line([neck, f.stoop ? [hip[0] - 3 * k, hip[1]] : hip]));
  if (!p.chair) {
    path(line([hip, P("lKnee"), P("lFoot")]));
    path(line([hip, P("rKnee"), P("rFoot")]));
  } else {
    path(line([hip, P("lKnee"), P("lFoot")]));
    // the chair: a seat line, a big wheel behind, a small one in front, a footrest
    const wx = f.x - 6 * k, wy = base - 22 * k;
    circ(wx, wy, 22 * k);
    circ(wx, wy, 4 * k);
    circ(f.x + 26 * k, base - 7 * k, 7 * k);
    path(line([[f.x - 16 * k, base - 48 * k], [f.x + 10 * k, base - 48 * k], [f.x + 26 * k, base - 24 * k]]));
  }
  path(line([neck, P("lElbow"), P("lHand")]));
  path(line([neck, P("rElbow"), P("rHand")]));
  // head and hair
  circ(hx, hy, R);
  if (f.hair === "short") path(`M${r2(hx - R * .95)},${r2(hy - R * .3)} A${r2(R)} ${r2(R)} 0 0 1 ${r2(hx + R * .95)},${r2(hy - R * .3)}`);
  if (f.hair === "ponytail") { path(`M${r2(hx - R)},${r2(hy - R * .2)} A${r2(R)} ${r2(R)} 0 0 1 ${r2(hx + R * .9)},${r2(hy - R * .4)}`); path(line([[hx - R * .9, hy - R * .1], [hx - R * 2.2, hy + R * 1.2]])); }
  if (f.hair === "bun") { path(`M${r2(hx - R * .95)},${r2(hy - R * .3)} A${r2(R)} ${r2(R)} 0 0 1 ${r2(hx + R * .95)},${r2(hy - R * .3)}`); circ(hx - R * .4, hy - R * 1.35, R * .42); }
  if (f.hair === "curls") { for (let i = -2; i <= 2; i++) circ(hx + i * R * .5, hy - R * .95 - Math.abs(i) * R * .05, R * .36); }
  if (f.hair === "cap") { path(`M${r2(hx - R)},${r2(hy - R * .25)} A${r2(R)} ${r2(R)} 0 0 1 ${r2(hx + R)},${r2(hy - R * .25)}`); path(line([[hx + R * .6, hy - R * .25], [hx + R * 2, hy - R * .05]])); }
  if (f.hair === "hijab") { path(`M${r2(hx - R * 1.25)},${r2(hy + R * .9)} A${r2(R * 1.25)} ${r2(R * 1.25)} 0 1 1 ${r2(hx + R * 1.25)},${r2(hy + R * .9)} L${r2(hx + R * 1.1)},${r2(hy + R * 2.4)}`); }
  if (f.hair === "pigtails") { path(`M${r2(hx - R * .95)},${r2(hy - R * .3)} A${r2(R)} ${r2(R)} 0 0 1 ${r2(hx + R * .95)},${r2(hy - R * .3)}`); path(line([[hx - R, hy], [hx - R * 1.9, hy + R * .9]])); path(line([[hx + R, hy], [hx + R * 1.9, hy + R * .9]])); }
  if (f.beard) path(`M${r2(hx - R * .7)},${r2(hy + R * .5)} Q${r2(hx)},${r2(hy + R * 1.5)} ${r2(hx + R * .7)},${r2(hy + R * .5)}`);
  // a skirt: a short flare from the hip
  if (f.skirt) path(line([[hip[0] - 5 * k, hip[1] + 2 * k], [hip[0] - 13 * k, hip[1] + 20 * k], [hip[0] + 13 * k, hip[1] + 20 * k], [hip[0] + 5 * k, hip[1] + 2 * k]]));
  // the racket: a handle and a head from the hitting hand
  const hand = P("rHand"), a = p.r * Math.PI / 180, rk = k * f.racket;
  const tip = [hand[0] + Math.cos(a) * 12 * rk, hand[1] + Math.sin(a) * 12 * rk];
  path(line([hand, tip]));
  const hc = [hand[0] + Math.cos(a) * 22 * rk, hand[1] + Math.sin(a) * 22 * rk];
  out.push(`<ellipse pathLength="1" cx="${r2(hc[0])}" cy="${r2(hc[1])}" rx="${r2(10 * rk)}" ry="${r2(7.5 * rk)}" transform="rotate(${r2(p.r)} ${r2(hc[0])} ${r2(hc[1])})"/>`);
  if (f.ball) out.push(`<circle class="ev-ball" fill="#d9ef3f" stroke="none" cx="${r2(f.x + f.ball[0] * k)}" cy="${r2(base + f.ball[1] * k)}" r="${r2(4.5 * k)}"/>`);
  return `<g class="ev-fig" style="--d:${r2(f.x / 1200 * .9)}s">${out.join("")}</g>`;
}


const ATTR = 'fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"';
const wide = `<svg class="everyone-art is-wide" viewBox="0 0 1200 212" aria-hidden="true" focusable="false" ${ATTR}>
<path class="ev-ground" pathLength="1" d="M0 200 H1200" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
${FIGS.map((f) => figure(f)).join("\n")}
</svg>`;
/* Phones: the same people in two rows, a little larger. */
const half = Math.ceil(FIGS.length / 2);
const rowOf = (figs, base) => figs.map((f, i) => figure({ ...f, x: 60 + i * (520 / (figs.length - 1)), h: f.h * 1.15 }, base)).join("\n");
const narrow = `<svg class="everyone-art is-narrow" viewBox="0 0 640 450" aria-hidden="true" focusable="false" ${ATTR} stroke-width="2.8">
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
