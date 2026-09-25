---
name: Lee Tennis Co.
description: Black-and-white editorial coaching page — presence from scale, photography and one motion idea, not from decoration.
colors:
  paper: "#ffffff"
  paper-soft: "#f4f4f2"
  card: "#fafafa"
  ink: "#0d0d0d"
  text: "#111111"
  muted: "#5e5e5e"
  rule: "#e5e5e3"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(3rem, 8.5vw, 6.5rem)"
    fontWeight: 600
    lineHeight: 0.92
    letterSpacing: "-0.055em"
  statement:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(1.85rem, 5.2vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "clamp(1.75rem, 3.4vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  base: "6px"
  none: "0px"
spacing:
  pad: "clamp(1.25rem, 5vw, 2.5rem)"
  section: "clamp(4rem, 9vw, 7rem)"
  gap: "1.5rem"
  seam: "2px"
components:
  button-primary:
    backgroundColor: "{colors.text}"
    textColor: "{colors.paper}"
    rounded: "{rounded.base}"
    padding: "0.8rem 1.5rem"
  button-primary-hover:
    backgroundColor: "#383838"
    textColor: "{colors.paper}"
  button-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text}"
    rounded: "{rounded.base}"
    padding: "0.8rem 1.5rem"
  button-invert:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "0.95rem 1.8rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.base}"
    padding: "0.95rem 1.8rem"
  card-lesson:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.base}"
    padding: "clamp(1.5rem, 2.5vw, 2rem)"
  band-statement:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "clamp(3.5rem, 8vw, 6.5rem) 0"
---

# Design System: Lee Tennis Co.

> This file governs the tennis front page at `/` (`public/index.html`,
> `tennis.css`, `tennis.js`). The portfolio at `/portfolio/` and the résumé
> are a different world with their own `public/portfolio/DESIGN.md`. Do not
> score one against the other.

## Overview

**Creative North Star: "The Broadsheet Court"**

A coaching page set like a newspaper sports section: one enormous headline, photographs run to the edge, black bands that stop the eye, and body copy that reads rather than sells. There is no colour. Presence comes from scale, from the photographs' own colour against a white ground, and from one motion idea — a block lifting into place as you reach it — applied everywhere with a short stagger. Everything that would decorate has been left out so the person in the photographs is the only ornament.

The page is a Persuade surface with a Read-page temperament. It puts the price in the first viewport, repeats it at every step, and treats the Book control as the one saturated thing on screen: black on white, or white on black, never softened. The tone is a coach who is confident enough to be quiet.

Single theme. There is no dark mode and no toggle; the black bands *are* the dark, placed deliberately. A dark-OS visitor sees the same white page, and the one embedded third party (the Cal.com calendar) is pinned to light so it cannot break the world.

**Key Characteristics:**
- Strictly black and white; the only decisions are how far down from white the greys sit
- System UI face at every size — zero font requests, native rendering
- Display type set tight (line-height .92, tracking -0.055em) and dropped in line by line
- Full-bleed black bands as punctuation, not as sections
- Photographs in their own colour, edge to edge, on a 2px seam
- One motion: fade + lift, exponential ease-out, reveal once
- Every control readable with JavaScript off; every third party loaded on intent, not on load

## Colors

A monochrome system: white paper, near-black ink, and three greys chosen for their distance from white.

### Primary
- **Ink** (`{colors.ink}`): the full-bleed statement and contact bands, the lightbox plate, and the invert button's text. It is the page's only "colour" moment and is used as a block, never as a tint.
- **Text** (`{colors.text}`): body ink, the primary button fill, the accent rule under an eyebrow, and the focus ring. Deliberately one step lighter than the bands so text on white and the bands themselves read as different materials.

### Neutral
- **Paper** (`{colors.paper}`): the page ground. Also the primary button's label and the invert button's fill on black bands.
- **Paper, soft** (`{colors.paper-soft}`): the alternating band behind About — a section change you feel more than see.
- **Card** (`{colors.card}`): lesson and review card fill on white sections, held apart by a rule rather than a shadow.
- **Muted** (`{colors.muted}`): secondary copy, eyebrows, labels, figure units (`/hour`), and card body text. 6.5:1 on paper, 5.9:1 on the soft band, 6.2:1 on card — never lower.
- **Rule** (`{colors.rule}`): hairline borders on cards, the header's bottom edge, and the stacked mobile menu's dividers.

### Named Rules
**The No-Colour Rule.** Nothing on the page carries hue except a photograph. If an element needs emphasis it gets weight, size, or black — never a colour.

**The Two Blacks Rule.** Bands are `{colors.ink}`; text and buttons are `{colors.text}`. Do not collapse them; the 4-point gap is what keeps a black button on a black band legible.

**The White-on-Black Focus Rule.** The focus ring is text-black everywhere except inside the black bands, the footer, and the lightbox, where it is white. A black ring on a black band is invisible, and those bands hold the conversion buttons.

## Typography

**Display Font:** system UI stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial`)
**Body Font:** the same stack

**Character:** one family at every size, carried by scale and tracking rather than by a second face. The display sizes are set tighter than the platform default would ever go, which is what makes the native face read as designed rather than as default.

### Hierarchy
- **Display** (600, `clamp(3rem, 8.5vw, 6.5rem)`, line-height .92, tracking -0.055em): the hero headline only. Three words, three lines, each line a separate mask so the words drop in one at a time.
- **Statement** (600, `clamp(1.85rem, 5.2vw, 3.75rem)`, line-height 1.06, tracking -0.045em, max 36ch, `text-wrap: pretty`): white on the ink band. Three lines, breaking at the full stop.
- **Headline** (600, `clamp(1.75rem, 3.4vw, 2.5rem)`, line-height 1.15, tracking -0.03em): section h2s.
- **Figure** (600, 1.6rem, line-height 1.2, tracking -0.03em): prices and hero facts. One treatment across the hero, the cards, and the modals; the unit after a price drops to label size and muted.
- **Title** (600, 1.125rem): card and modal h3s.
- **Body** (400, 1.0625rem, line-height 1.65): paragraphs; measure held by a 40rem section head and the two-column grid.
- **Label** (400, .8125rem, muted): eyebrows, fact labels, contact labels. Sentence case, never tracked out, never uppercase.

### Named Rules
**The One Voice Rule.** There is no second typeface. Emphasis is weight 600 or size; never italic, never a display face, never colour.

**The Figure Rule.** Every price on the page renders in text-black at figure size. A price is never muted and never body-sized; the selector that sets it always carries a class ahead of `.price` so a paragraph rule cannot outrank it.

## Layout

A single 1140px column (`{spacing.pad}` inline padding, `{spacing.section}` block rhythm) with two grids inside it: the hero's asymmetric text/photo split, where the type aligns to the column but the photograph runs to the viewport edge, and the two-column lesson and review grids. The About band uses a two-column text/photo split; the "In action" strip is three portraits on a 2px seam, edge to edge within the column.

Section order is fixed by the persuasion, not by the content type: hero → statement band → lessons → about → in action → reviews (with the one match clip as a closing figure) → before you book → contact band. The offer sits in the second screen. Proof follows it.

Breakpoints are content-driven. At **940px** the grids stack, the photo moves above the text, the desktop nav collapses to a toggle and a stacked menu whose first row is Book, and the header keeps a compact Book button. At **680px** the photo strip stacks to a single column, the hover-only photo tags become always-on, and every action button goes full width. At **480px** the wordmark shrinks to 126px and the header button's label shortens to "Book" so wordmark, button, and toggle share the width.

The sticky header is 66px with a blurred white ground and a hairline bottom rule; content scrolls under it.

## Elevation & Depth

Flat by default. Surfaces are separated by ground (white, soft, card, ink) and by hairline rules, not by shadow. The only shadows are responses to hover: a lesson card lifts 3px and gains a soft ambient shadow (`0 12px 30px rgba(0,0,0,.06)`); the video's play disc scales 8%. Photographs settle out of a 6% zoom on reveal. Nothing casts a shadow at rest.

### Named Rules
**The Rest-Is-Flat Rule.** A shadow is a hover state, never a resting state. If a resting element seems to need depth, it needs a different ground.

## Shapes

Gently softened corners (`{rounded.base}`, 6px) on cards, buttons, photos, dialogs and the lightbox image. The full-bleed bands and the photo strip have no radius at all — they are cut by the viewport, not framed. Rules are 1px hairlines in `{colors.rule}` on white and 30% white on black. The eyebrow carries a 22×2px black dash before it; that dash is the page's only graphic mark apart from the LT monogram.

## Components

### Buttons
Confident and quiet: solid fills, hairline outlines, no icons, and a 1px lift on hover.
- **Shape:** softened (`{rounded.base}`), 500 weight, .9375rem; `btn-lg` is 1rem with taller padding, `btn-sm` is .875rem.
- **Primary** (`button-primary`): text-black fill, white label; hover lifts to `#383838`.
- **Quiet** (`button-quiet`): white fill, hairline rule border; hover darkens the border to black.
- **Invert** (`button-invert`): white fill, ink label; the primary action on black bands.
- **Outline** (`button-outline`): transparent, 38% white border, white label; the tertiary action on black bands.
- **Link** (`link-btn`): underlined text, 4px offset, no fill — always given a 44px hit area through its own block.
- **States:** every Book control is a real link to the event on cal.com that also carries `data-cal-link`; while the calendar script is still arriving its label reads "Loading calendar…" with `aria-busy`. Focus is a 2px ring, 3px offset, white on black bands.
- **Touch:** 44px minimum height under 940px; the header button and every card button meet it.

### Cards / Containers
- **Corner Style:** softened (`{rounded.base}`)
- **Background:** `{colors.card}` on white sections
- **Shadow Strategy:** none at rest; ambient lift on hover (see Elevation)
- **Border:** 1px `{colors.rule}`, warming to `#d6d3cb` on hover
- **Internal Padding:** `clamp(1.5rem, 2.5vw, 2rem)`
- **Lesson card anatomy:** title, figure-size price with muted unit, muted body, then an actions row — a small primary button naming the tier ("Book a private lesson") and a "What's covered" link button with a per-tier accessible name.

### Navigation
Sticky, translucent white, hairline bottom rule. Desktop: brand mark left, five muted 15px links (Lessons, About, Reviews, Contact, and a divider before the one off-page link), and a small primary Book button. Hover darkens a link to text-black. Under 940px the links become a stacked menu behind a 44px toggle; the menu's first row is Book in 600 weight. Escape closes it and returns focus to the toggle.

### Dialogs
Native `<dialog>` opened with `showModal()`, a 50% dark backdrop, a white card with the softened radius, a 44px close control top-right, and focus placed on the heading so a reader hears the title before the price. Closing returns focus to the opener. The lightbox variant is a transparent dialog with the image centred and its caption on an 88% ink plate.

### The Statement Band (signature)
A full-bleed `{colors.ink}` block carrying one sentence in statement type. In a monochrome system this hard cut is what colour would otherwise do; it is used once between the hero and the offer, and again as the contact band at the end.

### The Photo Strip (signature)
Three portrait photographs on a 2px seam, each a button that opens the lightbox, each with a tag that slides up on hover (always visible on touch). Photographs zoom 4% on hover. Responsive sources: 600w and 1200w, WebP with JPEG fallback.

## Do's and Don'ts

### Do:
- **Do** keep every price in text-black at 1.6rem/600 — the Figure Rule — and give the unit its own muted span.
- **Do** make every booking control a real `<a href>` to the event on cal.com; the embed intercepts the click, the href is the fallback.
- **Do** load third-party scripts on intent (pointer over a control, focus, scroll, tap) or on a timer, never in the critical path.
- **Do** reveal each block once and let the observer go; a page that re-animates on scroll-up is telling the reader to stop reading.
- **Do** ship `<picture>` with WebP and a 2-step srcset for every photograph over 100KB.
- **Do** hold the 44px touch floor under 940px, using padding or a pseudo-element hit area rather than enlarging the visible control.
- **Do** switch the focus ring to white inside `.contact`, `.footer`, `.statement`, and `.lightbox`.

### Don't:
- **Don't** introduce a hue. Not for a CTA, not for a link, not for a chart.
- **Don't** add a second typeface or an icon set; the page has one dash and one monogram, and that is the graphic vocabulary.
- **Don't** add a theme toggle or `prefers-color-scheme` rules; the black bands are the dark, placed on purpose.
- **Don't** put a shadow on anything at rest.
- **Don't** let a paragraph rule (`.lesson p`, `.modal-card > p`) style a price; that is how every price on the page once rendered 16px grey.
- **Don't** describe the bands as green anywhere — comments, tokens, or copy. The palette was black before this file existed.
- **Don't** put the offer below the proof. Lessons stay in the second screen.
