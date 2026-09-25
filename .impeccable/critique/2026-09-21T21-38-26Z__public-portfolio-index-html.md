---
target: my portfolio website
total_score: 26
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\21eui\\portfolio-site\\public\\portfolio\\index.html"
target_fingerprint: "sha256:ac124e8ca1de9e997dfa9b520f54e288da5340fcd5253a864bf09ccbb9bab726"
target_path: "C:\\Users\\21eui\\portfolio-site\\public\\portfolio\\index.html"
timestamp: 2026-09-21T21-38-26Z
slug: public-portfolio-index-html
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toggle reads as state, copy confirms via live region; LinkedIn and IVC open new tabs with no indicator — only ZEP carries ↗ |
| 2 | Match System / Real World | 4 | Plain language, real dates and places, "Earlier"; nothing needs decoding |
| 3 | User Control and Freedom | 3 | Non-sticky masthead, in-page anchors; no back-to-top on a 6,800–8,200px page |
| 4 | Consistency and Standards | 3 | `/resume/` loads the shared stylesheet with no cache key while the portfolio does; toggle's visible text "Theme: Light" vs accessible name "Switch to dark theme" fails Label-in-Name |
| 5 | Error Prevention | 4 | `preload="none"` video, lazy images, reveal fallback timer, clipboard fallback with a message, no overflow at any width |
| 6 | Recognition Rather Than Recall | 3 | Linear and titled; no current-section indication; on mobile the nav is a wall before the name |
| 7 | Flexibility and Efficiency | n/a | A one-page read; the copy button is the one accelerator and it is well placed |
| 8 | Aesthetic and Minimalist Design | 3 | Chrome is spare; the photo budget is not — NBTC entry is 885px with two team photos against ZEP's 949; the AI poster entry is 833 |
| 9 | Error Recovery | 3 | Clipboard-blocked message, video fallback text; a broken mp4 would still show a framed blank box |
| 10 | Help and Documentation | n/a | Nothing to document |
| **Total** | | **26/32** | **Good (81%)** |

## Design Specificity Verdict

**LLM assessment:** Authored, unmistakably. The byline-sized name under a sentence-sized standfirst is a decision no template makes; the copy has a voice ("Southern California snow is not good snow, but it is a two-hour drive, which counts for a lot"); the mounted-print figure is consistent across photo, screenshot and video; the "Earlier" variant deliberately drops logos and bullets for jobs that are history rather than evidence; burnt sienna touches only strokes, and the CSS says why blue isn't there; the dark palette is warm near-black, not inverted grey. The one imported element is the pill-with-arrow-disc CTA — the sole rounded thing on a square page.

**Deterministic scan:** 6 findings on `public/portfolio/index.html`, down from 29. **All six are false positives**, each disproven by a probe: four `cramped-padding` hits on `.details > div` vanish when `padding-block` is rewritten as longhands (the detector does not read the shorthand; computed padding is 18.4px); two `tight-leading` "1.28×" hits are the two standfirsts, which compute to 1.36 at every width — the figure is an artefact of the detector's `clamp()` resolution. The detector now reads the page's own `DESIGN.md`, so the font and colour mismatches from the first run are gone.

**What the evidence pass established:** every text pair passes AA in both themes — lowest is muted at 5.48:1 light / 6.13:1 dark, and the place names and footer year that failed last time now share the muted token; nothing renders below 12px; 14/14 images have alt and `width`/`height`; heading order has no skips; the video is named with fallback text; `climb.mp4` is not requested on load (poster is, at 89 KB, the largest initial asset); zero third-party requests, zero webfonts; `theme-color` changes on toggle; `/resume/` canonical now matches its links; MilkCow is plain text; two of eleven h3s are links (ZEP, Lee Tennis Co.).

**Where both agree independently, and where I was wrong:** the mobile masthead is **163px across three rows**, not the two rows the CSS comment claims and I reported — the nav gets 227px beside a 92px toggle and wraps Experience · Projects / Details · Outside work / Résumé. Three targets remain under 44px: the two lead-contact links (15px text, pseudo-extended to 40.6) and the copy button (32). The toggle sits beside "Résumé" at x≈703 rather than at the row's right edge, because `margin-right: auto` is on the `<ul>` inside the `<nav>` and does nothing.

No overlay injected; both agents worked from measured DOM, and both first hit a stale cached copy before re-fetching — the cache keys are doing their job on the portfolio, but `/resume/` loads the same stylesheet without one.

## Overall Impression

The above-the-fold now does the recruiter's job in four seconds: who, what, what he wants, one pill, "I reply to everything." Both agents called it the best-constructed opening they'd reviewed on a student page. The end is equally strong. What remains is the middle: a three-row mobile masthead before the name, and a photo budget spent by "has a photo" rather than by what a BD recruiter needs — two tennis-club team photos at the ZEP plate's size, and a class-project poster as the tallest image on the page.

## What's Working

1. **The standfirst pair.** Ink sentence, then the muted ask pulled tight beneath it, then the pill and the promise. On a phone the pill lands at y=495, inside the first screen; last run it was at 1,616.
2. **Evidence, not decoration.** The QUIZ authoring screen sits under "ran demos built around each school's own curriculum"; the ZEP team in Gangnam; the three hobby plates at a third of the measure each. The mat makes them exhibits.
3. **A real second palette.** Warm near-black, cream ink, lifted sienna at 6.75:1; two marks hand-inverted so the NBTC tree stays green; `theme-color` follows; the toggle reads as state.

## Priority Issues

**[P1] The mobile masthead is three rows and 163px before the name.**
Why it matters: at 375px the nav wraps to three lines with the toggle floating beside the second; the h1 arrives at y=211. It is the one place the page looks unfinished, and it is the first thing a phone visitor sees.
Fix: let the links and the toggle share one wrapping row (`display: contents` on the nav and list under 40rem, toggle `margin-left: auto`), so it packs to two rows.
Suggested command: /impeccable adapt

**[P1] Photo budget is allocated by "has a photo," not by relevance.**
Why it matters: desktop entry heights are ZEP 949px, NBTC 885px, AI poster 833px. Two tennis staff photos at full reading measure, a 432×575 poster shot. Experience is 2,242px; Projects 1,434px. The domain already says "tennis"; two racquet-club marks and two team photos under Experience say it again. This is where a 30-second reader leaves.
Fix: NBTC keeps one plate — the clinic shot, not the staff photo — capped near 20rem; the poster becomes a small plate or a landscape crop of the poster itself; ZEP's two plates run as a two-up row so it stays the tallest entry by a clear margin.
Suggested command: /impeccable layout

**[P2] The reveal hides the lead at first paint.**
Why it matters: all 28 `.fade` blocks — including the h1, both standfirsts, the pill and the portrait — start at opacity 0 and wait on the observer. In the embedded pane the observer never delivered and the page was blank for exactly 1.5s until the fallback fired; in-app browsers (LinkedIn, Gmail) throttle it the same way. The page's own philosophy is "a written page, not a product page"; a delay on the sentence that does the persuading is the product habit it says it rejects.
Fix: don't arm any `.fade` whose top is inside the viewport at load; keep the settle-in for below-fold blocks where it costs nothing.
Suggested command: /impeccable animate

**[P2] Small control defects.**
Why it matters: the toggle isn't at the right edge on desktop (the `margin-right: auto` is on the wrong element); the toggle's accessible name doesn't contain its visible text, so voice control "click Theme" fails; the two lead-contact links reach 40.6px, not 44; the copy button is 32px; LinkedIn and IVC open new tabs without saying so.
Fix: `margin-left: auto` on the toggle; `aria-label="Theme: Light. Switch to dark"`; `-.95rem` insets on the contact links; `min-height: 2.75rem` on copy; ↗ or drop `target="_blank"` on the two.
Suggested command: /impeccable audit

**[P3] Cache-key drift between the two pages.**
Why it matters: `/resume/` loads `../portfolio/styles.css` with no `?v=`; both agents hit a stale portfolio in this session, and a visitor who has seen the résumé will carry an old stylesheet into the portfolio.
Fix: the same `?v=` on the résumé's stylesheet link.
Suggested command: /impeccable harden

## Persona Red Flags

**Jordan (recruiter):** the address bar says `leetennisco.com` before the standfirst says go-to-market — a headwind the design can't fix. Two of three logo'd experience entries are tennis clubs. Never told what ZEP makes beyond "an EdTech company"; one clause would anchor it for a US recruiter.

**Riley:** toggle then reload — fine; toggle then `/resume/` — fine, shared storage; JS off — page fully visible, but the toggle still renders and says "Theme: Light" on a dark OS. Tab into a pending block — the `focusin` handler reveals it. Blocked clipboard — a message now.

**Casey:** the three-row masthead. Ten screens tall; the copyable address is at y=7,715, and the lead-contact email at y=1,579 is 12px muted mono, easy to miss under a thumb. The portrait sits between the pill and the body — a scroller could take it for the end.

**Sam:** skip link, focus ring at 6.3:1 in both themes, headings clean, every image sized and described, video named. Label-in-Name fails on the toggle. "Earlier" as an h3 is meaningless in a headings list — "Earlier work" would read. Two unannounced new-tab links. 200% zoom holds; the pill drops just below a 450px fold.

## Minor Observations

- `text-wrap: balance` gives the ask a 20-character first line against 27–28 for the rest; `max-width: 26ch` on `.standfirst--ask` alone would even it.
- The portrait is full-body at distance — at 280px wide the face is ~25px tall. A waist-up crop of the same frame would let a recruiter recognise him on a call.
- `.entry-role` holds job titles everywhere except "Built and shipped it myself" and "Indoors, mostly" — charming, but the slot's grammar changes.
- Running's meta column says "Camino Fidei" in the place slot, then the role line says it again: three lines carrying two facts.
- Footer repeats Résumé and Outside work from the nav; Tennis · LinkedIn would do.
- `logo-ivc.png` is the only mark in Details; the asymmetry is slight but there.
- The CSS comment says "Three of the marks" invert; two carry the class.
- `.wordmark` is still in the stylesheet's mono list but no longer in the portfolio markup; `/resume/` uses it.
- The ramp in `DESIGN.md`'s frontmatter omits the `.95rem`/`.97rem` sizes the prose documents; scanning `styles.css` directly flags them.

## Questions to Consider

1. Why does a BD candidate's portfolio live at `leetennisco.com`? Every recruiter reads "tennisco" before "go-to-market." Is a second $12 domain the highest-leverage change left — bigger than anything in the CSS?
2. Who is the second tennis photo for? The tennis parents have their own page at `/`.
3. Is the portrait meant to introduce a person or a mood? Would he rather be recognised or be atmospheric?
4. What does ZEP make? "An EdTech company" is a category, not a product.
5. Would the page be stronger with the theme toggle removed? It's the second-most-prominent control on mobile, the one thing a recruiter never uses, and the system preference already works.
