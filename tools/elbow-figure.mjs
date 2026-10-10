/* ============================================================================
   Writes the tennis elbow figure's markup on the practice tips page.

       node tools/elbow-figure.mjs

   fills the space between the elbow-svg markers in public/tips/index.html
   (then run tools/i18n/build.mjs for the copies). The figure is two
   drawings in public/images, elbow-strain and elbow-fix (a player at
   backhand contact with the racket arm drawn as an anatomy cutaway and a
   magnifier on the outside of the elbow; made with an image model from a
   written description, then saved as JPEG + WebP), one per view, stacked,
   and over them a transparent SVG with the numbered badges the legend
   refers to, the sore spot's glow and the jolt arcs. Badge positions are
   in the drawings' own pixels (1200 × 896), so a new drawing means new
   numbers below. elbow.css shows one view (.st-strain / .st-fix) and
   elbow.js switches them. The drawings have no words, numbers only, so
   they serve every language. See DESIGN.md, "The tennis elbow figure".
   ========================================================================== */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const INK = "#111111", BALL = "#d9ef3f";
const r2 = (n) => Math.round(n * 100) / 100;

/* A numbered badge with a hairline leader ending in a dot on the spot. */
const marker = (n, mx, my, tx, ty) => {
  const ang = Math.atan2(ty - my, tx - mx), sx = mx + Math.cos(ang) * 23, sy = my + Math.sin(ang) * 23;
  return `<g class="mk" data-n="${n}"><line x1="${r2(sx)}" y1="${r2(sy)}" x2="${tx}" y2="${ty}" stroke="${INK}" stroke-width="2"/>` +
    `<circle cx="${tx}" cy="${ty}" r="4.5" fill="${INK}"/>` +
    `<g class="mk-badge" style="transform-origin:${mx}px ${my}px"><circle cx="${mx}" cy="${my}" r="23" fill="${INK}"/><text x="${mx}" y="${my + 1}" text-anchor="middle" dominant-baseline="central" font-size="25" font-weight="600" fill="#fff">${n}</text></g></g>`;
};
const jolt = (cx, cy) => [44, 66, 88].map((r, i) => `<path class="jolt" style="--i:${i}" d="M${r2(cx - r * .94)},${r2(cy - r * .34)} A${r} ${r} 0 0 1 ${r2(cx - r * .17)},${r2(cy - r * .98)}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`).join("");

/* The strain drawing: the elbow's outer bump, the frayed tendon in the
   magnifier, the wrist and the grip. */
const S = { hot: [442, 480], hotIn: [865, 278] };
const strain = `<g class="st st-strain">
  <g class="hot"><circle cx="${S.hot[0]}" cy="${S.hot[1]}" r="34" fill="${BALL}" opacity=".4"/><circle cx="${S.hot[0]}" cy="${S.hot[1]}" r="17" fill="none" stroke="${BALL}" stroke-width="6"/></g>
  <g class="hot-in"><circle cx="${S.hotIn[0]}" cy="${S.hotIn[1]}" r="52" fill="${BALL}" opacity=".38"/><circle cx="${S.hotIn[0]}" cy="${S.hotIn[1]}" r="24" fill="${BALL}" opacity=".55"/></g>
  ${jolt(S.hot[0], S.hot[1])}
  ${marker(1, 540, 392, 452, 474)}
  ${marker(2, 672, 752, 714, 652)}
  ${marker(3, 842, 798, 792, 676)}
</g>`;

/* The fix drawing: the shoulder, the ball on the strings, the grip; the
   elbow gets a quiet dotted ring, nothing lit. */
const fix = `<g class="st st-fix">
  <circle cx="432" cy="438" r="18" fill="none" stroke="${INK}" stroke-width="2.2" stroke-dasharray="4 5"/>
  ${marker(4, 418, 236, 512, 298)}
  ${marker(5, 318, 128, 168, 276)}
  ${marker(6, 236, 606, 284, 512)}
</g>`;

const picture = (name, cls) =>
  `<picture class="st ${cls}"><source srcset="/images/${name}.webp" type="image/webp" /><img src="/images/${name}.jpg" width="1200" height="896" alt="" loading="lazy" decoding="async" /></picture>`;

const html = `<!-- elbow-svg -->
          <span class="visually-hidden" id="elbow-title">A player at backhand contact, drawn with the forearm muscles showing, and a close-up of the outside of the elbow</span>
          <span class="visually-hidden" id="elbow-desc">The muscles that lift the wrist run from a small bump on the outside of the elbow to the back of the hand. A late, wristy backhand, numbered 1 to 3, jolts that spot; a straight arm meeting the ball out in front, numbered 4 to 6, spreads the work over the shoulder and arm.</span>
          ${picture("elbow-strain", "st-strain")}
          ${picture("elbow-fix", "st-fix")}
          <svg class="elbow-svg" viewBox="0 0 1200 896" aria-hidden="true" focusable="false">
${strain}
${fix}
          </svg>
          `;

const page = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "tips", "index.html");
let src = readFileSync(page, "utf8");
const a = src.indexOf("<!-- elbow-svg -->"), b = src.indexOf("<!-- /elbow-svg -->");
if (a < 0 || b < 0) throw new Error("public/tips/index.html: the elbow-svg markers are missing");
src = src.slice(0, a) + html + src.slice(b);
writeFileSync(page, src);
console.log("wrote the figure into public/tips/index.html");
