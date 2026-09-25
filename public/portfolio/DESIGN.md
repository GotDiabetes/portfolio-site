---
name: Isaac Lee — portfolio
description: A warm-paper editorial page set in a serif, structured by hairlines, with one burnt-sienna accent and a real dark mode.
colors:
  paper: "#fbfaf7"
  ink: "#1a1a17"
  muted: "#6a665d"
  rule: "#ddd8cc"
  accent: "#9c4221"
  accent-soft: "#f0e7e1"
  paper-dark: "#16150f"
  ink-dark: "#eae6da"
  muted-dark: "#9b9587"
  rule-dark: "#322f26"
  accent-dark: "#d98a5f"
typography:
  standfirst:
    fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.35rem, 3.4vw, 1.72rem)"
    fontWeight: 400
    lineHeight: 1.36
    letterSpacing: "normal"
  byline:
    fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif"
    fontSize: "1.4rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif"
    fontSize: "1.135rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: "normal"
  label:
    fontFamily: "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', 'SF Mono', Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.03em"
  section-title:
    fontFamily: "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', 'SF Mono', Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.12em"
rounded:
  none: "0px"
  pill: "999px"
  copy: "2px"
spacing:
  measure: "34rem"
  wrap: "46rem"
  lead-wrap: "62rem"
  pad: "clamp(1.5rem, 6vw, 3rem)"
  margin-col: "9.5rem"
components:
  pill:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0.3rem 0.32rem 0.3rem 1.15rem"
  pill-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.3rem 0.32rem 0.3rem 1.15rem"
  plate:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    rounded: "{rounded.none}"
    padding: "clamp(0.4rem, 0.9vw, 0.7rem)"
  entry:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1.6rem 0"
---

# Design System: Isaac Lee — portfolio

> This file governs `public/portfolio/` and `public/resume/` only. The tennis
> front page at `/` has its own world, documented in the repository root
> `DESIGN.md`. They are deliberately different: one sells a service to a
> parent, the other introduces a person to a recruiter. They share a domain,
> a name, and nothing visual.

## Overview

**Creative North Star: "The Long-Form Byline"**

A page written, not laid out. The name is a byline at reading size; the largest type on the page is a sentence about what he did and what he wants. Structure comes from hairline rules and a margin column of mono metadata — the layout of a well-set CV or an exhibition checklist — so that no entry needs a box to hold it. Photographs are mounted like prints in a mat: a hairline frame, a margin of paper, a second hairline, a mono caption inside. Colour is paper and ink and one warm accent, burnt sienna, chosen because blue was the obvious choice.

It is a Persuade surface with a Read temperament: the reader is a recruiter with thirty seconds, and the page's job is to make the first five of them count and then reward the rest. The ask is in the standfirst. Proof follows. Hobbies come last and small.

The page has a real dark mode — warm near-black paper, cream ink, a lifted sienna — driven by the system preference and overridable with a toggle whose label reads as state. The two palettes declare exactly the same tokens; a token missing from one silently falls back and breaks the other.

**Key Characteristics:**
- Serif for everything you read; mono for everything you scan
- Name as a byline; the standfirst is the largest type
- Hairline rules and whitespace, not boxes
- The mounted figure: frame, mat, frame, caption
- One accent, used for links, bullets and focus — never for surfaces
- A margin column of dates and marks, 9.5rem wide, that collapses to an inline meta line on a phone
- Two complete palettes, one toggle, no flash

## Colors

Paper, ink, and one warm accent; a second complete set for the dark theme.

### Primary
- **Burnt sienna** (`{colors.accent}` light / `{colors.accent-dark}` dark): links' underlines, the bullet dot, the focus ring, hover on a plate frame. It never fills a surface. `accent-soft` is its tint, held in reserve.

### Neutral
- **Paper** (`{colors.paper}` / `{colors.paper-dark}`): the page and the plate mat. Warm, not white — `#fff` reads as a blank template.
- **Ink** (`{colors.ink}` / `{colors.ink-dark}`): body, headings, the pill fill.
- **Muted** (`{colors.muted}` / `{colors.muted-dark}`): everything secondary — section titles, dates, roles, bullets, captions, nav, footer. 5.5:1 on light paper, 6.1:1 on dark. It is never further reduced with opacity; that is how two elements once fell below 3:1.
- **Rule** (`{colors.rule}` / `{colors.rule-dark}`): hairlines — section tops, entry tops, plate frames, the masthead's bottom edge. About 1.4:1 against paper by design; it is a line, not a boundary a control depends on.

### Named Rules
**The One Warm Thing Rule.** Sienna appears on lines and marks — an underline, a dot, a ring — and on nothing wider than a stroke.

**The No-Opacity Rule.** Text colour comes from the token, never from the token at reduced opacity. If muted is too loud, the answer is a smaller size or a different word.

**The Twin Palette Rule.** `:root[data-theme="dark"]` and the `prefers-color-scheme: dark` block declare identical variable sets. Add a token to one and you add it to both.

## Typography

**Display / Body Font:** Iowan Old Style → Palatino Linotype → Palatino → Georgia
**Label Font:** ui-monospace → Cascadia Mono → Segoe UI Mono → SF Mono → Menlo → Consolas

**Character:** an old-style serif at reading sizes only, and a monospace for anything you scan. No webfonts; the stacks resolve to whatever good serif and mono the machine has. There is no display size — the largest type is a sentence.

### Hierarchy
- **Standfirst** (400, `clamp(1.35rem, 3.4vw, 1.72rem)`, 1.36, 28ch, `text-wrap: balance`): the largest type on the page. Two of them: what he did, then what he wants — the second in muted.
- **Byline** (400, 1.4rem): the h1. The name, at reading scale.
- **Title** (400, 1.135rem): entry h3s. Two are links: ZEP (off-site, with a ↗) and Lee Tennis Co. (the site's own front page).
- **Body** (400, 1.0625rem, 1.62): paragraphs, at a 34rem measure.
- **Label** (mono, .75rem, +.03em): dates, place names, nav, contact row, captions, footer, the cta note. Nothing on the page is set below .75rem.
- **Section title** (mono, .75rem, +.12em, uppercase, muted): the only uppercase on the page.

### Named Rules
**The Sentence-First Rule.** The standfirst outranks the name. If a redesign ever puts the name at display size, it has become a different page.

**The Floor Rule.** Nothing under .75rem (12px): not a date, a label, a caption, or a footer line.

## Layout

One reading column of 34rem inside a 46rem wrap, with `clamp(1.5rem, 6vw, 3rem)` inline padding. The lead and the masthead are allowed a 62rem wrap so the portrait can sit in the right margin beside the opening paragraphs and the nav's left edge can meet the h1's. Entries are a two-column grid — a 9.5rem mono margin column for date, place and mark, then the record — separated by hairlines rather than boxes.

Section order is the persuasion: lead (byline, standfirst, ask, pill, body, contact) → experience → projects and leadership → details → outside work → get in touch. The masthead is not sticky; on a document this short a sticky bar is a product habit that costs the top of every section.

At **60rem** the lead stacks: reading order becomes name, what, want, pill, portrait (capped at 16rem), body, contact. At **40rem** the entry grid collapses and the margin column becomes an inline meta line with the mark beside the date; the three Outside work plates go from one row of three to two-up; the masthead wraps.

## Elevation & Depth

None. The page is flat, and depth is conveyed by the mat: two hairlines with a margin of paper between them read as a mounted print. The one motion of depth is a plate rising 2px on hover with its frame warming to sienna. No shadow anywhere, at rest or on hover.

### Named Rules
**The Mat Rule.** A photograph is never pasted in. It gets a frame, a mat, a second frame, and a caption inside the mat — the same for a screenshot, a team photo, and a video.

## Shapes

Square. Hairlines are 1px in `{colors.rule}`. The only rounded objects are the two pills (fully round, `{rounded.pill}`) and the tiny copy button (`{rounded.copy}`); they are the entire exception list, confined to the lead's call to action and the closing. The photo ring and its lightbox are square too: the page sets the component's `--ring-radius` to 0 and squares its lightbox buttons. The bullet is a sienna middle dot with a hanging indent, not a glyph.

## Components

### Pill (call to action)
Confident and small: the one filled control on the page.
- **Shape:** fully round, 2.75rem minimum height, serif label
- **Primary** (`pill`): ink fill, paper label, a paper disc holding an arrow
- **Quiet** (`pill-quiet`): transparent, muted border so the edge is visible, ink label, ink disc
- **Hover:** the gap between label and disc widens; the disc scales 8%. Under reduced motion neither happens.
- **Where:** once in the lead beside "I reply to everything." in mono, and once in the closing beside the Résumé pill.

### Entry
- **Grid:** 9.5rem margin column, 2rem gap, hairline top, 1.6rem block padding; first entry has no top rule
- **Margin column:** date, then place name (both mono, muted, no opacity), then the org mark hanging beneath at up to 2.75rem tall with intrinsic `width`/`height`
- **Record:** serif h3, italic muted role, hanging-indent bullets at .97rem; plates below
- **Earlier** variant: date range, one role line, no logo, no bullets — for jobs that are history rather than evidence
- **Dark mode:** three near-black marks (NBTC, St Paul Chong, and any like them) get `invert(1) hue-rotate(180deg)` by hand; light marks do not

### Plate (mounted figure)
- **Mat:** `clamp(.4rem, .9vw, .7rem)` of paper inside a hairline; the image has its own hairline
- **Caption:** mono, .75rem, inside the mat
- **Sizes:** full reading measure by default; `plate--wide` lets the ZEP QUIZ screenshot span the whole entry, date column included, so its text stays legible; `plate--medium` caps the single coaching photograph at 20rem. Outside work has no plates: its photographs live in the ring.
- **Video:** `preload="none"`, poster, native controls, an accessible name, fallback text

### Navigation
Mono links at .75rem in muted, ink on hover with a sienna underline; each link padded to a 44px row. A theme toggle at the right reading "Theme: Light" with the state in ink, and an accessible name that says the action. No wordmark — the h1 fifty pixels below is the name.

### Copy button
A 2px-radius mono button beside the closing email address, muted border, 44px tall; hover turns text and border to ink. Confirms in a visually-hidden live region, and says so in the same region if the clipboard is blocked.

### Photo ring (Outside work)
The one interactive, moving element on the page. It closes the Outside work section, where it replaces the row of plates that used to sit there, so it belongs to the part of the page about life rather than competing with the work. **One home per photograph:** it holds the seven pictures that appear nowhere else — the Camino night run, the climbing clip, snowboarding, the ZEP team, the research poster, and two tennis shots (serve, forehand). Each card appears once (`data-ring-min="7"`); the ZEP entry keeps only its QUIZ screenshot and the Projects entry no longer carries the poster.

It drifts at about 6° a second, follows a drag, and coasts after a flick, never further than the hand moved. The card nearest the reader is the front: it is the one Enter opens, the one announced, and the one outlined on keyboard focus. Clicking any visible card opens that card. The climbing card carries a drawn play mark and opens as a playable video.

- **Shared code:** `/ring.js` and `/ring.css` at the site root, themed through `.ring--portfolio` via the component's custom properties: `--ring-radius: 0`, `--ring-shade-color: var(--paper)` (cards turning away fade toward the paper, never grey), `--ring-paper`, `--ring-muted`, `--ring-focus` (sienna), `--ring-mono`, and the lightbox set `--ring-lb-backdrop` (`--paper-veil`, the paper at .975, declared in all three palette blocks), `--ring-lb-ink`, `--ring-lb-muted`, `--ring-lb-btn-border`, `--ring-lb-btn-fg`, `--ring-lb-focus`.
- **Materials:** each card is a mounted print — paper edge, a hairline round the card and another round the photograph; the enlarged photograph keeps its paper edge with a hairline outside. Card widths follow each photograph's own aspect, so landscapes stay landscape.
- **Lightbox:** in the page's own palette in both themes; previous · count · next · close in one bar; the page does not scroll behind it; the caption and count are announced on every step.
- **Controls:** the hint follows the pointer — "Drag to spin · click a photo · arrow keys turn it" with a mouse, "Swipe to spin · tap a photo" on touch — and a mono Pause/Play text button stops the drift. One focus indicator only: a 2px sienna outline on the front card.
- **Cost:** thumbnails are not requested until the ring is within about 800px of the viewport; full images and the video only when opened.
- **Access:** reduced motion stops the drift and the coast and hides Pause; without JavaScript the same list is a captioned grid of mounted plates on the 46rem column.

## Do's and Don'ts

### Do:
- **Do** keep the ask in the standfirst; a recruiter reads the first two sentences and the first pill.
- **Do** put the pill and "I reply to everything." directly under the standfirst, before the body.
- **Do** give every logo `width` and `height`, and hand-pick which marks invert in dark mode.
- **Do** declare every token in both palettes.
- **Do** keep the mat: frame, margin, frame, caption — for every figure including video.
- **Do** hold 44px targets through padding or a pseudo-element, not by enlarging the visible text.
- **Do** swap `theme-color` when the theme changes.

### Don't:
- **Don't** set text with opacity. Use the token.
- **Don't** link an org name unless the page has a reason to send the reader there; ZEP is the one, and it carries ↗.
- **Don't** repeat the résumé's bullets here. The résumé is at `/resume/`; this page says what those bullets mean.
- **Don't** give a hobby a larger photograph than the work.
- **Don't** add a display-size name, a stat row, a card, or a shadow.
- **Don't** make the masthead sticky.
- **Don't** link MilkCow Cafe.
