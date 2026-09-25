---
target: critique (portfolio)
total_score: 24
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\21eui\\portfolio-site\\public\\portfolio\\index.html"
target_fingerprint: "sha256:c9fe6687e6d616a5980151b912f7963fd350530a1056413ad64c273d47784907"
target_path: "C:\\Users\\21eui\\portfolio-site\\public\\portfolio\\index.html"
timestamp: 2026-09-24T19-30-53Z
slug: public-portfolio-index-html
---
Method: dual-agent (A: design review · B: detector + headless-browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | The ring's "featured" card — the one Enter opens, the live region announces and the focus ring marks — is not the front card; measured ~128px left of centre and never the nearest |
| 2 | Match System / Real World | 3 | The ring hint says "click a photo" on touch screens |
| 3 | User Control and Freedom | 2 | Lightbox close sits at `top: -3.4rem` outside the dialog — y = −20 on a 637px-tall viewport; the drift has no pause for touch users |
| 4 | Consistency and Standards | 2 | The ring breaks the page's own system: 3px radius against the Square rule, a black shade overlay greying the paper mats, a centred hint, a dark lightbox in both themes, "Nothing loops" still in the stylesheet header |
| 5 | Error Prevention | 3 | Mailto-only contact, covered by the copy button |
| 6 | Recognition Rather Than Recall | 3 | Keyboard controls for the ring exist only in an aria-label; no nav link to Photographs or Contact |
| 7 | Flexibility and Efficiency | 3 | Skip link, arrow keys, copy button, anchors |
| 8 | Aesthetic and Minimalist Design | 2 | 8 of the ring's 14 photographs already appear on the page; each shows twice on the wheel; it follows directly after three plates it repeats |
| 9 | Error Recovery | 3 | Copy-blocked message, video fallback |
| 10 | Help and Documentation | n/a | A portfolio; the ring hint is covered under 6 |
| **Total** | | **24/36** | **Acceptable (67%)** |

## Design Specificity Verdict

**LLM assessment:** Strongly authored everywhere except the ring. The byline-sized name under a sentence-sized standfirst, the mono margin column with hanging marks, the mounted-print plates, sienna middle-dot bullets, the stateful toggle, the "Earlier" line, "I reply to everything." in mono beside the pill — none of that is a template. The Photographs ring is the one element that reads as borrowed: a known 3D-carousel pattern in the page's colours, still carrying the tennis page's habits — rounded corners, a black shade that turns paper mats grey in light mode, a dark lightbox in both themes, centred text on a page with no centred text. The engineering is high; the materials don't yet belong to this world.

**Deterministic scan:** 7 findings. Six are false positives the detector has produced every run (the `clamp()` line-height quirk on the standfirsts; `padding-block` unread on `.details > div`). **The seventh is new and real**: `design-system-radius` — 3px on ring images and faces, outside the page's documented Square rule. The design review flagged the same rule independently.

**What the evidence pass caught that the design review missed:**
- **The ring's 14 thumbnails load on page load** — ~262 KB (282 KB with its JS and CSS) for a section 5,000px down on desktop and 6,800px on a phone. `ring.js` creates the card images without `loading="lazy"`. First load went from ~370 KB to 663 KB.
- **The lightbox backdrop lets page text through** at ~1.5:1 behind the caption and buttons; the button borders are 2.4:1 (under the 3:1 bar for UI boundaries); the close button's focus outline in light mode is **1.92:1**.
- **The stage shows three focus indicators at once**: the global outline wins over the ring's `outline: none` (same specificity, loaded later), plus the inset shadow, plus a ring around the featured card.
- **A click can open the neighbour**: clicking the featured card's centre opened the next card, because a different card was on top at that point.
- Oversized sources elsewhere: `run-camino.webp` is 1400px shown at 146px (9.6×), `snowboard.webp` 6.8×.

**Where both agree:** the featured-card error; the triple focus frame; the Square-rule break; the cards at 55–58px wide on a phone — too small to read a photograph.

Everything else measured holds from the last run: every text pair passes AA in both themes (lowest 5.48:1), 25 tab stops in a sane order, clean headings, 44px targets throughout, MilkCow unlinked, no third-party requests, no webfonts. The ring's mechanics measured exactly as designed — 6.3°/s drift, 400px drag = π·400/2R, a coast of ~35° that settles in 1.5s, one card per arrow key, zero drift under reduced motion, a captioned grid with JS off.

## Overall Impression

The top of the page is still the best thing on it and scored as such. The regression is entirely the ring: it is well-engineered and wrongly curated. It repeats photographs the reader has just scrolled past, half of it is tennis on a page whose own comments say its reader "is not here for tennis," it crops the one piece of product evidence (the ZEP QUIZ screenshot) into an unreadable white strip, and its keyboard and screen-reader "front" is a card to the left of the front. The biggest opportunity: give every photograph exactly one home, and make the ring show what the page doesn't.

## What's Working

1. **The lead.** Sentence above name, ask in the standfirst, pill and promise where a 30-second reader looks.
2. **The entry system.** Margin column, hanging marks, hand-picked dark-mode inversion, "Earlier," matted plates — a mature layout with no cards, and a real second palette.
3. **The ring's engineering.** Hand depth-sorting, off-screen pause, reduced motion, no-JS fallback, focus return, `pan-y`, a capped throw — the mechanics are right; what they carry isn't yet.

## Priority Issues

**[P1] The ring's "front" is not the front card.**
Why it matters: Enter opens, the live region announces, and the focus ring marks a card ~128px left of centre that is never the nearest; a click at its centre opened the neighbour. For keyboard and screen-reader users the ring describes the wrong photograph.
Fix: choose the featured card by projected screen position nearest the stage's centre among the near half, and read clicks from the top-most card under the pointer (`elementFromPoint`) rather than the pointer-down target.
Suggested command: /impeccable harden

**[P1] The ring repeats the page, tilts toward tennis, and crops the product evidence.**
Why it matters: 14 photographs, 8 already on the page, doubled to 28, directly after the three plates it repeats; 7 of 14 are tennis. The ZEP QUIZ screenshot (420×232) is forced into a 3:4 card and becomes a white strip. The last strong image before Get in touch is a tennis wheel.
Fix: one home per photograph — either the ring replaces the Outside work plates and carries the hobbies, or it holds only photographs that appear nowhere else; tennis capped at two; `data-ring-min="14"` so no card repeats; cards sized from each image's aspect ratio so landscapes stay landscape; a one-line section intro.
Suggested command: /impeccable distill

**[P1] The lightbox fails on short screens and on contrast.**
Why it matters: Close sits outside the dialog and is half off-screen on a 637px-tall laptop; page text bleeds through the backdrop behind the caption; button borders are 2.4:1; the light-mode focus outline on Close is 1.92:1; the page scrolls behind the open modal.
Fix: Close moves into the bar (prev · count · next · close); backdrop to ~.94 opacity; button borders at .5 white; focus ring white inside the lightbox; image `max-height: calc(92vh - 8rem)`; lock body scroll while open.
Suggested command: /impeccable audit

**[P2] The ring doesn't match the page's materials, and costs too much up front.**
Why it matters: 3px radius against the Square rule; a black shade overlay greys the paper mats in light mode; three simultaneous focus frames; 262 KB of thumbnails on first load for a section at the bottom; 58px cards on a phone; the drift can't be paused on touch, and after a mouse-closed lightbox the stage stays focused so the wheel stops.
Fix: square corners in `.ring--portfolio`; shade by lowering card opacity against paper rather than overlaying black; one focus indicator; lazy card images, created only when the stage nears the viewport; a larger radius share on phones; a mono "pause" beside the hint; re-focus the stage only when the lightbox was opened from the keyboard.
Suggested command: /impeccable optimize

**[P2] The proof sits below the first screen, and the ask is the quieter sentence.**
Why it matters: at 1280×637 the fold cuts at "Most of the job was outbound"; on a phone the portrait pushes the numbers more than a screen down. The ask is muted, the context sentence above it is ink. The 4.0 GPA is under Details.
Fix: on phones, body before portrait (or portrait at ~10rem); the ask in ink; "4.0 GPA" in the lead's contact row.
Suggested command: /impeccable layout

## Persona Red Flags

**Jordan (recruiter):** sees name, ZEP, ask and email without scrolling — but no numbers. Can't tell where he'll be in summer 2027 (AA expected May 2027; no transfer plan or location). "Lee Tennis Co." links to `/` in the same tab without a ↗ and drops him into a different visual world.

**Riley (stress tester):** "coach tennis, and have for three years" against an earliest coaching entry of Sep 2024. Camino Fidei is "Aug 2026 – present" — a month — yet the section intro calls it where he "learned the most about getting people to show up." 4,000 messages → ~50 meetings is 1.25%, and a BD recruiter will do that division. The clinic photo is captioned Newport Beach Tennis Club; the same frame elsewhere reads as a generic junior clinic. One British spelling ("neighbouring").

**Casey (mobile):** 58px ring cards, unreadable; the hint says "click"; ~9.5 screens of page; the ring drifts on screen while the closing paragraph is being read. The lightbox itself fits.

**Sam (keyboard / screen reader):** `aria-roledescription="carousel"` on a region with no slides — cards are decorative clones, the source list is hidden — so the 14 good alt texts reach a screen reader only one at a time in the lightbox; Next in the lightbox announces nothing; "drag to spin" in the label is noise; sighted keyboard users are never told the arrow keys work; triple focus frame. Contrast and 200% zoom hold.

## Minor Observations

- The Outside work `.plate-row` stretches every plate to the tallest one's height, leaving ~200px of empty mat under the Camino caption; `align-items: start`.
- The closing paragraph has no `.fade` and appears before its heading.
- `.copy:hover` sets the border colour it already has.
- The no-JS ring grid sits at the 62rem edge (x=272) while its title is at 46rem (x=400).
- DESIGN.md says only ZEP's heading links (Lee Tennis Co.'s does too) and that the copy button is 2rem (it is 44px); the stylesheet header still says "Nothing loops" and "no lightbox."
- The lightbox counter reads "/ 14" while the wheel shows 28 cards, which draws attention to the repeats.
- Lightbox buttons keep a .25s transition under reduced motion.

## Questions to Consider

1. If the ring is for "the one who stayed," why is half of it the subject the rest of the page deliberately plays down?
2. Should Photographs replace the Outside work plates rather than follow them?
3. Why is the ask the quieter of the two largest sentences?
4. Would 14 larger cards, each shown once, beat 28 small ones?
5. After "I reply to everything," what would actually get the email sent — a start window, a location, a time zone?
