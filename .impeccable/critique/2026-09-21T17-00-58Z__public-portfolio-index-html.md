---
target: my portfolio website
total_score: 25
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\21eui\\portfolio-site\\public\\portfolio\\index.html"
target_fingerprint: "sha256:06b68f06a0d841b58dfc0f3be0a6e441668e7383523f5f447cb1c3f48265cbdd"
target_path: "C:\\Users\\21eui\\portfolio-site\\public\\portfolio\\index.html"
timestamp: 2026-09-21T17-00-58Z
slug: public-portfolio-index-html
closed: true
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Copy button confirms with a live region; theme toggle's visible label names the destination ("Dark" while light), which sighted users read as state |
| 2 | Match System / Real World | 3 | "Details" and "Work" (for skills) are opaque labels; "Bouldering / Aliso Viejo" sits in the date column |
| 3 | User Control and Freedom | 3 | Nine new-tab links with no indicator; reduced motion respected; theme persists |
| 4 | Consistency and Standards | 2 | Masthead is 46rem, lead is 62rem — the wordmark sits 128px right of the h1 on desktop; "Isaac Lee Tennis" here vs "Lee Tennis Co." on the tennis page; two visual systems on one domain |
| 5 | Error Prevention | 3 | Every contact path is mailto:; the copy fallback lives 8,000px below the lead pill |
| 6 | Recognition Rather Than Recall | 4 | Dates, logos, captions, org names — nothing to remember |
| 7 | Flexibility and Efficiency | 3 | Skip link, print styles, copy button, direct Résumé link; no in-page jump from the standfirst to the ZEP entry |
| 8 | Aesthetic and Minimalist Design | 2 | Beautiful type, but 8,084px desktop / 9,234px mobile; numbers stated twice; hobbies is the longest section |
| 9 | Error Recovery | 2 | Clipboard failure is swallowed silently; `<video>` has no fallback content |
| 10 | Help and Documentation | n/a | Read/Persuade surface; nothing to document |
| **Total** | | **25/36** | **Good (69%)** |

## Design Specificity Verdict

**LLM assessment:** Authored, not a template. The standfirst is a sentence, not a title, set larger than the name; the second lead paragraph ("Almost none of those meetings came from a first email. They came from the second or third.") is an observation no template contains; the Outside work intro draws a line from a running club to a sales pipeline; the double-hairline mounted figure with a mono caption treats phone photos as evidence; burnt sienna is the one accent, with a comment explaining why not blue. Where it lapses: the ZEP bullets are the résumé's bullets pasted verbatim, 600px after the lead gave the same four numbers in better prose; the Details `<dl>` is a generic CV block; the pill CTAs are stock landing-page furniture belonging to neither this page's hairline language nor the tennis page's 6px buttons.

**Site coherence:** two worlds under one domain. The tennis page is white, system sans, 86px display, cards; the portfolio is warm paper, Palatino, 22px h1, hairlines, sienna, with a dark mode the tennis page does not have. A dark-OS visitor gets a dark portfolio and a white tennis page one click apart. The tennis page calls itself "Lee Tennis Co."; the portfolio's project entry and the résumé both say "Isaac Lee Tennis."

**Deterministic scan:** 29 findings on `public/portfolio/index.html`, rendered in dark mode.
- **Real (10):** nine `figcaption`s at **10.56px** (`.66rem`, styles.css:175) — content-bearing captions like "Sneaky, a V5 — Aliso Viejo"; and `.7rem` = 11.2px on section titles, dates, footer text and links, the theme toggle, with `.copy` at 10.88px.
- **False positives (18):** four cramped-padding hits on `.details > div`, which measure 18.4px padding; six design-system font/colour hits because the detector compared this page to `DESIGN.md`, which documents the *tennis* page's monochrome system, not this one — every flagged colour is exactly this page's own dark token; one tight-leading at "1.28×" that matches no element.

**What the evidence pass caught that the design review missed:**
- `.footer-year` at opacity .7: **2.96:1 light / 3.63:1 dark — fails.**
- The eight logo `<img>`s carry no `width`/`height`; `logo-zep.png` is 84px natural rendered at 84 CSS px, so it upscales on every DPR > 1 screen.
- 725 KB of unreferenced `isaac-serve-*` assets on disk.
- The video has no `aria-label` or title.
- **This page has no DESIGN.md of its own.** The root file describes the tennis world, so every automated check of the portfolio is scored against the wrong system.

Where both agree, independently: the place-name span at **3.07:1 light / 3.77:1 dark** (opacity .72 on muted); the 128px lead/masthead misalignment; `meta theme-color` never updated, so a dark-OS phone shows a cream browser bar over a `#16150f` page; the toggle label as destination; 25 of 28 tap targets under 44px (toggle 35.6×16, copy 43.8×19.8, both pills 41px tall, nav links 17px); the masthead stacking to four rows and 180px on a phone.

**Visual overlays:** injection verified working; no overlay injected — screenshots below the fold returned blank frames in this environment, so every layout number is measured from the DOM, not seen.

## Overall Impression

The first five seconds are excellent: a name as a byline, a sentence that says who this is, a portrait with a real caption. Then the page forgets it is a persuasion surface. The one line that turns "interesting student" into "candidate for my req" — the summer 2027 internship ask — is the last sentence of the third paragraph in body text, 1,400px down on a phone. The ZEP entry, the page's most important, re-reads as the résumé. And the longest section is the hobbies. The single biggest opportunity: put the ask in the standfirst, and spend the scroll budget in proportion to what a BD recruiter cares about.

## What's Working

1. **The standfirst-as-hero decision.** Name at 22px, sentence at 27.5px, `max-width: 28ch`, `text-wrap: balance`. In five seconds: economics student, IVC, GTM at an EdTech company, summer 2026. The right information in the right order.
2. **The mounted figure.** Padding, outer hairline, inner hairline on the image, mono caption inside the mat — the same treatment for a screenshot, a team photo, and a video. One idea, applied consistently, and it makes phone photos read as evidence.
3. **The engineering under the reading.** Theme applied before first paint; a reveal that arms only when JS runs, self-releases after 1.5s if the observer never fires, and reveals any block a keyboard user tabs into; `preload="none"` on a 1.7 MB video that was never requested; zero third-party requests, zero webfonts, real print styles; heading order clean; every logo `alt=""` with the org name adjacent in text; MilkCow correctly unlinked.

## Priority Issues

**[P1] The ask is the last sentence of the third paragraph.**
Why it matters: "I'm looking for a summer 2027 internship in business development, partnerships or research" sits at the end of `.lead-body` in 17px body text. The standfirst says what he did, never what he wants. A recruiter with 30 seconds reads the standfirst and maybe one paragraph.
Fix: a second standfirst line directly under the first — "Looking for a summer 2027 internship in business development or partnerships." Move "I reply to everything." to sit beside the lead pill as a mono line.
Suggested command: /impeccable clarify

**[P1] Mobile spends its first screen on chrome and a portrait.**
Why it matters: at 375px the masthead is 180px across four rows; the h1 is at 229px, the portrait runs 420–879px, the pitch starts at 910px, the first CTA is at 1,616px, the ZEP entry at 1,840px. Casey sees the name twice, one sentence, and the top of a photo.
Fix: under 40rem hide the wordmark (the h1 is 50px below it), collapse the nav to one row of three (Experience · Résumé · Contact), cap the portrait at `max-width: 14rem` beside the standfirst, and move the contact row and lead pill above `.lead-body`.
Suggested command: /impeccable adapt

**[P1] The ZEP entry repeats the lead in a worse voice.**
Why it matters: the first article's four bullets are the résumé's bullets verbatim, after the lead already gave 4,000 messages / 50 meetings / 3 pilots / 2 partnerships in prose. The page's reason to exist beside `/resume/` is that it is *not* the résumé; here it becomes one.
Fix: cut the ZEP bullets to two things the lead does not say — the Notion pipeline as an artifact, what a tailored ZEP QUIZ demo involved, one named partner — and let the plate carry the rest.
Suggested command: /impeccable distill

**[P2] Persuasion weight is inverted.**
Why it matters: Outside work is the longest section (2,154px on mobile — three plates, one a video). Starbucks and MilkCow each get a full entry with a logo. The snowboard plate renders at 432×576 on desktop; the ZEP QUIZ plate at 432×239. The scroll budget goes to the least relevant material at the highest visual weight.
Fix: merge Starbucks and MilkCow into one "Earlier" row with no logos or bullets; cap Outside work plates at `min(13rem, 45vw)` or run all three as one row of small mounted plates.
Suggested command: /impeccable layout

**[P2] Small text, low contrast, and under-size targets.**
Why it matters: place names 3.07:1; footer year 2.96:1; figcaptions 10.56px; the Résumé pill's border is 1.36:1 so the secondary CTA has no visible edge; 25 of 28 tap targets under 44px; `meta theme-color` stays cream in dark mode; the toggle reads "Dark" while the page is light.
Fix: drop the opacities (muted alone is 5.48:1); figcaptions to `.75rem`; pill-quiet border to `--muted`; `padding-block: .5rem` on nav and footer links, `min-height: 2rem` on toggle and copy; swap theme-color in `labelToggle()`; render the toggle as "Theme: Light"; add `width`/`height` to the eight logos.
Suggested command: /impeccable audit

## Persona Red Flags

**Jordan (recruiter, never heard of him):** knows who he is in five seconds. Doesn't learn what he wants until the end of the lead. Doesn't know what "Details" or "Outside work" mean beside "Projects." Doesn't know what ZEP QUIZ is until the plate 600px later. Clicks "ZEP" in the h3 expecting Isaac's work; gets zep.us in a new tab.

**Riley (stress tester):** clicks "Starbucks" → starbucks.com. Toggles to dark; the label now says "Light" while the page is dark — reads as a bug. Blocks the clipboard: copy does nothing, no message. Resizes to 45rem: the portrait stacks at 26rem wide between standfirst and body. Notices `.plate:hover { translateY(-2px) }` under a CSS header that says "no hover lifts." The résumé canonical is `/resume` without a slash while every link is `/resume/`.

**Casey (distracted mobile):** three rows of 12px mono nav, 17px tall. Toggle 35.6×16. Portrait eats 459px. First real sentence at 910px, first CTA at 1,616px, 11.4 screens to "Get in touch," with 2.7 screens of running, climbing, and snowboarding between Details and the ask.

**Sam (keyboard / screen reader / contrast / zoom):** place names 3.07:1 and footer year 2.96:1 fail. Figcaptions 10.56px. Nine new-tab links unannounced. h3 links whose text is an org and whose destination is that org's homepage. Video has no accessible name. On the plus side: focus ring is the accent at 6.3:1 in both themes, skip link works, heading order clean, 200% zoom holds with no overflow.

## Minor Observations

- The masthead `.wrap` is 46rem and the lead is 62rem: on 1440 the wordmark's left edge is at x=392, the h1's at x=264, and both say "Isaac Lee." On a page built on left-edge alignment, the first two lines of text are misaligned and identical.
- Org names in h3s carry the page's strongest link style and open third-party homepages. Unlink all but ZEP; give ZEP a ↗.
- `.plate video { background: var(--ink) }` flips to cream in dark mode, hidden only by the poster.
- `.section-intro` margin `-.4rem` fights `.section-title` padding.
- OG description names four countries; the meta description names none.
- The résumé page duplicates the theme script inline rather than loading `main.js`; the two will drift. `entry-role` for the tennis site reads "Built and shipped it myself" here and "Built and shipped independently" on the résumé.
- "Snowboarding / Winter" in the date column above an h3 that also says "Snowboarding."
- `isaac-serve-*` (four files, 725 KB) are on disk and unreferenced.
- Four of eight content photos are single JPEGs with no `<picture>`/srcset.

## Questions to Consider

1. If the recruiter reads only the standfirst and the first pill, do they know what you are asking for? Right now: no.
2. The CSS manifesto says no cards, no rounded boxes, no hover lifts. The page has pill buttons, a 2px-radius copy button, and a plate that lifts. Which is the design — the comment or the code?
3. Would you cut the snowboard plate if it bought you one more reply? If yes, why is it the largest photograph below the fold?
4. The page exists because it is not the résumé. Why does its most important entry read exactly like the résumé?
5. A recruiter clicks "Isaac Lee Tennis" and lands on "Lee Tennis Co." in a different typeface on a different colour. Is that one person's site, or two?
6. Why does Starbucks get a link and a logo on a business-development portfolio?
