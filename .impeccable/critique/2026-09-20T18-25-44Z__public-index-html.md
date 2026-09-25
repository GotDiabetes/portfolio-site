---
target: public/index.html
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:C:\\Users\\21eui\\portfolio-site\\public\\index.html"
target_fingerprint: "sha256:d74b3356897c8b236e89e22c63c2d97747b02504e51d243ab93a15507ec7612a"
target_path: "C:\\Users\\21eui\\portfolio-site\\public\\index.html"
timestamp: 2026-09-20T18-25-44Z
slug: public-index-html
closed: true
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Booking popup shows a pinhead spinner on a dim overlay for 5–10s with no "Loading calendar" text. Copy-email feedback and nav aria-expanded are good. |
| 2 | Match System / Real World | 3 | Hero says "across Orange County"; contact says "players come to me". Cal shows location as "In Person (Organizer Address)". |
| 3 | User Control and Freedom | 2 | Email buttons hijack left-click to Gmail; Cal popup returns focus to body on Escape; mobile menu has no outside-tap close. |
| 4 | Consistency and Standards | 2 | Six different booking/contact labels. Cal popup opens black for dark-OS users on a white page. Brand named three ways (Lee Tennis Co. / Isaac Lee Tennis / Isaac Lee). |
| 5 | Error Prevention | 2 | Adult clinics "Book online" opens a Cal list with no clinic event. Generic list orders Semi-Private first, Private last. |
| 6 | Recognition Rather Than Recall | 3 | Price repeats at every step. Location appears once, at the bottom, and never in the booking flow. |
| 7 | Flexibility and Efficiency | 2 | Scored, not n/a: the header CTA accelerator is display:none under 940px; cards have no direct Book. |
| 8 | Aesthetic and Minimalist Design | 3 | Hero and statement band excellent. "In action" runs 2,078px between About and the offer. |
| 9 | Error Recovery | 2 | Seven Book buttons are `<button>` with no href; if cal.com is blocked the primary CTA silently does nothing. |
| 10 | Help and Documentation | 1 | Scored, not n/a: ages, court access, what to bring, cancellation, pay-in-person are answered nowhere. |
| **Total** | | **22/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment:** Authored for this coach in the hero and the photography — the three-line dropped headline, the right-bleeding photo, "Coaching since 2023 / Part time", "a hit against my former coach", real reviews with real faces. None of that lifts onto another site. It goes generic in the middle: the statement band is a fortune-cookie line any coach could run; the four lesson cards are identical grey peers with identical "What's covered" links and no point of view about which tier to pick; the contact block is the standard three-button pattern. The specificity a parent needs most — where, what ages, what a first lesson is — is buried or missing.

**Deterministic scan:** 9 findings from `impeccable detect` on `public/index.html`, all warnings: 4× low-contrast "#fff on #fff", 3× cramped-padding (`.band`, `.statement`, `.wrap`), 1× broken-image, 1× tight-leading. **All 9 are false positives**, each verified against source: the white text sits on `var(--ink)` backgrounds the detector could not resolve (measured 18.9–19.4:1); the padded `.wrap` child sits one level below the sections it flagged; the empty `<img>` is the lightbox placeholder filled on click; the 1.0 line-height is on single-line figures.

What the evidence pass caught that the design review missed:
- `.lesson .price` renders at **16px in muted grey**, not the intended 1.6rem ink, because `.lesson p` (specificity 0,1,1) beats `.price` (0,1,0). No price on the page renders in the ink colour.
- Lightbox caption is white over a 50% backdrop on a white page: **3.51:1, fails** 4.5:1.
- Tap targets under 44px at 375: nav toggle 38×38, modal close 31.5×31.5 ×5, lightbox close 32×32, four "What's covered" at 25px tall, contact email link 23px tall.
- 1,123 KB of JPEG, no WebP, no srcset; hero is 174 KB served at 375px wide on mobile.
- `app.cal.com/embed/embed.js` loads and executes at ~40ms, before any interaction; it is 1,531 of the 1,575ms load.

**Visual overlays:** script injection was verified working, but no overlay was injected — screenshots were failing in the pane, so all evidence is numeric rather than visual.

**Premise correction:** this page has **no dark theme and no theme toggle**. `tennis.css` has zero `[data-theme]` or `prefers-color-scheme` rules. The portfolio has a theme system; the tennis page does not.

## Overall Impression

The first second is the best thing on the page and the strongest argument that it was made by a person. Then it spends its longest stretch on the coach playing rather than coaching, arrives at the offer at 66% depth, renders every price at body size in grey, and on a phone loses the Book button after the first screen and does not offer another for seven screens. The single biggest opportunity: make booking the $80 private lesson the default path on every device, one press, before the proof.

## What's Working

1. **The hero composition is editorial craft.** `hero-text` padding is computed against `--wrap` so type aligns to the container while the photo runs to the viewport edge; `.drop-line` masks with a padding/margin trick so descenders survive `line-height .92`. This is why it does not read as a theme.
2. **The engineering under the persuasion is honest.** `.js` gating so a failed script never blanks the page; a reduced-motion branch that keeps a cross-fade; the YouTube poster/iframe swap keeps third-party cookies off until asked; `mailto:` preserved as the real href; `<dialog>` with `showModal`, scroll lock, and focus restoration to the opener (verified). Headings in order, 10/10 images with alt, one `<main>`, a working skip link.
3. **Price transparency, repeated.** $80 appears in the hero facts, the card, the modal, and Cal. A parent never hunts. This is the most persuasive thing on a lesson page and it is done right — which makes the cascade bug that shrinks it to grey body text more costly.

## Priority Issues

**[P0] Mobile has no booking path after the hero.**
Why it matters: `.header-cta` is `display:none` under 940px, the mobile menu has no Book item, the hero button's bottom edge sits below the 812px fold, and the next Book control is at y≈6,924 — seven and a half screens down. A distracted phone visitor scrolls once and the button is gone.
Fix: keep a compact Book in the mobile header (drop "Career portfolio" from the bar or collapse the wordmark to the mark); add "Book a lesson" as the first row of the mobile menu; put a direct Book button on each lesson card.
Suggested command: /impeccable adapt

**[P1] Every price renders at body size in muted grey.**
Why it matters: `.lesson p { color: var(--muted); font-size: 1rem }` outranks `.price { font-size: 1.6rem }` by specificity, and `.modal-card > p` does the same in the modals. The number a parent came for is the least emphasised text in the card. This is a pricing page whose prices have no hierarchy.
Fix: raise `.price` specificity (`.lesson .price`, `.modal-card .price`) and set it in ink at the intended size; then the hero-facts figures, card prices, and modal prices share one treatment.
Suggested command: /impeccable typeset

**[P1] The booking popup breaks the world, mis-orders the offer, and has no fallback.**
Why it matters: `Cal.ns.lesson("ui")` sets only `brandColor`, so dark-OS visitors get a black panel over a white page at the moment of highest anxiety. The generic profile link lists Semi-Private → Hitting → Private, flagship last and below the popup fold on a 581px laptop. The Adult clinics modal's "Book online" opens a list with no clinic event — a dead end. All seven Book controls are `<button>`s with no href, so a blocked `cal.com` script leaves the primary CTA doing nothing, silently.
Fix: add `theme: "light"` to the Cal ui config; point every generic "Book a lesson" at `isaac-lee-hlkghj/60-min-private-lesson` as the default; replace the clinic modal's Book with "Email for a quote"; make Book controls `<a href="https://cal.com/…">` with `data-cal-link` so the embed intercepts and the fallback is a real page. Reorder events on cal.com.
Suggested command: /impeccable harden

**[P1] Keyboard focus is invisible on the black bands; several targets are under size; lightbox caption fails contrast.**
Why it matters: `:focus-visible` uses `--accent: #111` with no override for `.contact` or `.footer`, so the ring is #111 on #0d0d0d exactly where the conversion buttons live. Nav toggle 38px, modal close 31.5px, "What's covered" 25px tall, contact email link 23px — under 44×44 on a phone. Lightbox caption measures 3.51:1 over the white page. Four identical "What's covered" accessible names.
Fix: `.contact :focus-visible, .footer :focus-visible { outline-color: #fff }`; pad the toggle, close buttons, and link-btns to 44px hit areas; give the lightbox caption a solid dark plate; `aria-label="What's covered — Private lessons"` etc.
Suggested command: /impeccable audit

**[P2] The offer sits at 66% depth behind a player reel, and contradicts itself on location when reached.**
Why it matters: `#in-action` is 2,078px on desktop — two portraits, a high-school match clip, an orphaned clinic photo with inline styles — between About and Lessons. Lessons begin at y=4,335 of 6,565. The hero says "across Orange County"; the contact band says "players come to me" at Toscana Apartments. Cal says "Organizer Address". No ages, no guest-access note, no cancellation, no "pay in person, no card".
Fix: move `#lessons` directly after the hero; fold the portraits into About; make the clinic photo (the only coaching image) the About photo and move or cut the match clip; change the hero eyebrow to "Private coaching · Toscana courts, Irvine"; add a four-line "Before you book" block above contact; set the Cal event location to the real address.
Suggested command: /impeccable layout, then /impeccable clarify

## Persona Red Flags

**Jordan (first-time parent):** reads "across Orange County" and assumes Isaac travels; finds "players come to me" 6,000px later. Sees four cards whose only control is "What's covered" and does not realise they are bookable. Hits "Red, orange and green ball progression" with no definition. Opens Adult clinics → Book online → a list with no clinic. Abandons or emails.

**Riley (stress tester):** "Email me" opens Gmail in a new tab regardless of mail client; with a popup blocker it silently falls to `mailto:` — two clicks, two behaviours. Scrolls back up to re-check a price and every `.fade` re-hides and replays; the headline re-drops on every return to top. Opens the mobile menu, taps outside, menu stays. Blocks `cal.com` and all seven Book buttons go dead with no message.

**Casey (one-handed phone):** first screen is logo, hamburger, photo, eyebrow, three-line headline, four lines of sub, and a Book button cut by the fold — no price visible. No header CTA, no Book in the menu, next Book seven screens down. Nav toggle 38px. Four stacked full-width contact buttons with three near-identical labels.

**Sam (keyboard, screen reader, zoom):** invisible focus ring across the contact band. Four identical "What's covered" names in the link list. Modal opens with focus on "×" so the reader hears "Close, button" before the price. Cal popup never receives focus and Escape returns it to `<body>`. Contrast passes everywhere except the lightbox caption. 200% zoom holds with no overflow.

## Minor Observations

- CSS comments still say "dark green block", "green rule", "green block" — the palette is black. The design intent lives only in stale comments; there is no DESIGN.md.
- `.brand-logo` declares 336×112, SVG is 300×100, rendered 168×56.
- Dead weight in `/images`: `brice.png` (477 KB, unused), `ready.webp` (unused while `ready.jpg` serves), two logo families.
- Hero JPEG 174 KB, no srcset, downloaded in full for a 375px slot.
- `.hero-facts` "Coaching since 2023" and `.facts` "Coaching 3 years" say the same thing 900px apart.
- Statement `max-width: 22ch` wraps to four even lines at 1280 rather than the intended break.
- The clinic figure uses inline `style` for layout on a page that otherwise keeps everything in `tennis.css`.
- `<span id="top">` anchor for the logo; `href="/"` would do.
- Footer "Portfolio" vs nav "Career portfolio" for the same link.
- `.js .fade` with `rootMargin -5%` leaves the bottom 5% of the viewport invisible on a 581px laptop — the page feels like it is withholding.

## Questions to Consider

1. Why does a page whose job is selling *coaching* spend its longest section on Isaac *playing*? The Brice review does credibility in sixty words. What if the clinic photo were the hero?
2. Every "Book a lesson" opens a menu. What if it opened the $80 private lesson calendar directly, and the other tiers were the exception you reach for?
3. Five ways to contact, one way to book. Could the page survive with exactly two controls — Book, and one email link in the footer?
4. "Players come to me" at one court is a constraint. Is it a weakness to bury, or a feature to lead with — one court, no drive time, always there?
5. Is the brand "Lee Tennis Co." or Isaac? The logo says company; every sentence says "I". The schema, title, footer, and wordmark currently vote three different ways.
