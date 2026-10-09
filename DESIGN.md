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
    fontSize: "clamp(3rem, min(7.5vw, 9.5vh), 5.5rem)"
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
  # The translated pages: the same system face, named per script so each
  # language gets its regional glyphs. Sizes follow the roles above.
  script-korean:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', 'Malgun Gothic', 'Noto Sans KR', Roboto, sans-serif"
  script-japanese:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Segoe UI', 'Yu Gothic UI', Meiryo, 'Noto Sans JP', Roboto, sans-serif"
  script-chinese-simplified:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', 'Microsoft YaHei', 'Noto Sans SC', Roboto, sans-serif"
  script-chinese-traditional:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Segoe UI', 'Microsoft JhengHei', 'Noto Sans TC', Roboto, sans-serif"
  script-persian:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, 'Noto Sans Arabic', Roboto, sans-serif"
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
**The No-Colour Rule.** Nothing on the page carries hue except a photograph — and the ball. If an element needs emphasis it gets weight, size, or black — never a colour.

**The Ball Exception.** One object may be colour: the tennis ball, optic yellow (`#d9ef3f`), as the "o" in the hero headline and as the ball the Book FX player serves, plus that serve's amber contact spark. Nothing else on the page — not a link, a button, a badge or a highlight — borrows the yellow.

**The Two Blacks Rule.** Bands are `{colors.ink}`; text and buttons are `{colors.text}`. Do not collapse them; the 4-point gap is what keeps a black button on a black band legible.

**The White-on-Black Focus Rule.** The focus ring is text-black everywhere except inside the black bands, the footer, and the lightbox, where it is white. A black ring on a black band is invisible, and those bands hold the conversion buttons.

## Typography

**Display Font:** system UI stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial`)
**Body Font:** the same stack

**Character:** one family at every size, carried by scale and tracking rather than by a second face. The display sizes are set tighter than the platform default would ever go, which is what makes the native face read as designed rather than as default.

### Hierarchy
- **Display** (600, `clamp(3rem, min(7.5vw, 9.5vh), 5.5rem)`, line-height .92, tracking -0.055em): the hero headline only. Three words, three lines, each line a separate mask so the words drop in one at a time. Sized by the shorter of width and height, so a short laptop screen still shows the prices and the Book button without scrolling.
- **Statement** (600, `clamp(1.85rem, 5.2vw, 3.75rem)`, line-height 1.06, tracking -0.045em, max 36ch, `text-wrap: pretty`): white on the ink band. Three lines, breaking at the full stop.
- **Headline** (600, `clamp(1.75rem, 3.4vw, 2.5rem)`, line-height 1.15, tracking -0.03em): section h2s.
- **Figure** (600, 1.6rem, line-height 1.2, tracking -0.03em; 1.35rem for the hero facts on phones): prices and hero facts — the hero's three are the two key prices and where lessons happen ("Lessons at my home court" over "Toscana, Irvine"). The Grip N Rip / Newport Beach credential lives in About, never in this row: set at figure size, a club's name reads as the place you'll be coached. One treatment across the hero, the cards, and the modals; the unit after a price drops to label size and muted.
- **Title** (600, 1.125rem): card and modal h3s.
- **Body** (400, 1.0625rem, line-height 1.65): paragraphs; measure held by a 40rem section head and the two-column grid.
- **Label** (400, .8125rem, muted): eyebrows, fact labels, contact labels. Sentence case, never tracked out, never uppercase.

### Named Rules
**The One Voice Rule.** There is no second typeface. Emphasis is weight 600 or size; never italic, never a display face, never colour.

**The Figure Rule.** Every price on the page renders in text-black at figure size. A price is never muted and never body-sized; the selector that sets it always carries a class ahead of `.price` so a paragraph rule cannot outrank it.

## Layout

A single 1140px column (`{spacing.pad}` inline padding, `{spacing.section}` block rhythm) with two grids inside it: the hero's asymmetric text/photo split, where the type aligns to the column but the photograph runs to the viewport edge, and the two-column lesson and review grids. The About band uses a two-column text/photo split; the "In action" strip is three portraits on a 2px seam, edge to edge within the column.

Section order is fixed by the persuasion, not by the content type: hero → statement band → lessons → about → in action → reviews (with the one match clip as a closing figure) → before you book → contact band. The offer sits in the second screen. Proof follows it.

The hero eyebrow carries the credential: "RSPA-certified coach · Toscana courts, Irvine". Inside the hero the order is the same at every size: eyebrow, headline, intro, the three facts (prices first), then the Book and Email buttons, then one muted line under them, "No card, no deposit: booking just holds the time." The price is what the visitor weighs and the button is what they do about it, so the facts sit above the buttons, and the page's best reassurance sits where the decision is made. The hero's top padding is tight (`clamp(1.5rem, 3vw, 2.5rem)`) for the same reason as the headline's height cap. On short desktop windows (wider than 940px, 820px tall or less: a 1366×768 or 1536×864 laptop once the browser's bars are counted) the hero packs tighter (smaller headline and intro, closer facts and buttons) and the text starts at the top of the grid instead of centring on the portrait, which is taller than the window; the Book button then clears the fold in every language down to a 657px-tall window.

Breakpoints are content-driven. At **1100px** the desktop nav collapses to a toggle and a stacked menu whose first row is Book, and the header keeps a compact Book button (the links, the language menu and Book need about 1,050px in the longer languages; no nav label or button ever wraps). At **940px** the grids stack and the photo moves above the text (and back below it under 680px, so a phone's first screen holds the prices and Book). At **680px** the photo strip stacks to a single column, the hover-only photo tags become always-on, and every action button goes full width. At **480px** the wordmark shrinks to 126px, the header button's label shortens to "Book" and the language menu shows only its globe, so wordmark, globe, button and toggle share the width.

The sticky header is 66px with a blurred white ground and a hairline bottom rule; content scrolls under it.

## Elevation & Depth

Flat by default. Surfaces are separated by ground (white, soft, card, ink) and by hairline rules, not by shadow. The only shadows are responses to hover: a lesson card lifts 3px and gains a soft ambient shadow (`0 12px 30px rgba(0,0,0,.06)`); the video's play disc scales 8%. Photographs settle out of a 6% zoom on reveal. Nothing casts a shadow at rest.

### Named Rules
**The Rest-Is-Flat Rule.** A shadow is a hover state, never a resting state. If a resting element seems to need depth, it needs a different ground. The one exception is what genuinely floats above the page: the Ask Isaac launcher and panel, the open language list, and the one-time sound note. Those carry depth by shadow alone, never a hairline border and a wide shadow together.

**The One Motion, One Ball Rule.** The page moves in one way — a block fades and lifts into place as you reach it, once, with the hero's words dropping in as its strongest form — and has one delight: the ball. It lands in the headline once on arrival, and it is what the player serves when you press Book. New motion has to be one of those two or replace one; nothing is added beside them. (Heading line-splits, scroll parallax, a drifting hero photo, morphing review cards and hover wiggles were tried and taken out for this reason.)

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
- **Lesson card anatomy:** title, figure-size price with muted unit, muted body, then an actions row — a small primary button naming the tier ("Book a private lesson") and a "What's covered" link button with a per-tier accessible name. The private card (and its popup) carries one ink line at label size under the price: "Or 5 lessons for $375, 10 for $700, paid in person." The clinic card's button is "Join the clinic list", which opens the clinic popup instead of an email.
- **Gift line:** under the cards and the matcher, one muted sentence, "Giving tennis as a present? Any private lesson, package or hitting session can be a gift.", with "Give a lesson" as an ink link button on its own line, opening the gift popup. An offer in a sentence, never a fifth card.
- **Matched card:** when the lesson matcher picks a card it gets a black 1px edge plus a 1px black ring and a muted "Your match" label after the title (drawn from the card's `data-match`, so each language page shows its own). The other three cards are left exactly as they are, never dimmed.
- **Reviews:** headed "From people who've seen me coach", the two reviews in full, side by side, as plain cards (quote, then a rule, then avatar, name and role). The list is built to take more: a student's or a parent's words are the proof the section most needs. Under the cards, once Isaac's Google review link is in the `review-link` meta tag (and only then), one muted sentence asks for a review, "Had a lesson with me? A short Google review helps other players and parents find me.", with "Leave a review" as an ink link on its own line.

### Lesson matcher
One bold label, one plain input (1px `#c9c9c6` border, softened radius, darkening to text-black on focus) and the page's primary button, under the lesson cards (the offer comes first; the matcher is for whoever the four cards didn't settle; its messages point "above", and a match adds a "See the card ↑" link that scrolls to the marked card) and no wider than the section head. The answer is one sentence in Isaac's voice ("Sounds like **a semi-private lesson.** …"), then, when the sentence says, a second line in ink with the level and focus in weight ("Level: **Intermediate.** Focus: **the serve.**", from five fixed levels and six focuses), a muted line if the visitor asked him to travel or is booking for a child, then a clone of the matched card's own action, so booking behaves identically. That Book clone carries the sentence, the level and the focus into Cal.com's booking notes (in English, whatever the page language), and a muted line says so. A 13px muted note, held to 60ch, says in plain words that an AI reads the sentence and nothing is saved. Hidden with no JS or no endpoint; stacks full width under 680px.

### Ask Isaac (chat)
A black launcher bottom-right ("Ask Isaac" with a speech-bubble icon), styled like the Book button, opening a white panel with the softened radius and a floating shadow and no border (it and its launcher are the only things above the content). Header: "Ask Isaac" and a muted line saying the answers are Isaac's own, picked by AI — the chat never pretends to be him typing. Isaac's messages sit on `{colors.paper-soft}` grey, the visitor's on black; each answer can carry buttons, and a Book button is a clone of the lesson card's own. The greeting doesn't claim to be Isaac typing ("These are my answers to what people ask most"). Four suggestion chips on open (the fourth is "What should I work on?", which leads to Isaac's short practice tips for common problems: a serve in the net, a forehand that flies long, rallies that don't last), and up to three follow-up chips after every answer (each topic's `next` in `ask.json`, minus anything already asked). When a parent is asking for a child, the answer is the topic's parent wording where Isaac wrote one. Abuse, or text aimed at the bot itself, gets one quiet line ("I can only answer questions about lessons here") and nothing else; contact details typed into the chat get a one-line request to leave them out, ahead of the answer. A chat button can open one of the page's popups (the clinic list, the gift popup) or go to the practice tips page ("See all the tips", in the page's language). Under the input, a 12px muted line says plainly that questions without an answer are kept for 90 days so Isaac can write one; nothing else a visitor types is kept. Replies feel live without faking it: typing dots for at least 650ms, then the answer types out word by word (words are laid out from the start and only fade in, so nothing jumps), then its buttons and chips rise in. Sound is two tiny Web Audio cues, no files: a high tick on send and a tennis-ball "pok" (a falling sine over a 12ms string click) when the answer lands; a speaker button in the header mutes them and the choice is remembered; it is the same setting the Book FX sound note switches off. Reduced motion skips the typing-out; screen readers get each answer once, whole. Non-modal: the page stays usable, Escape closes and returns focus to the launcher. Under 560px the panel is a bottom sheet, and the launcher shrinks to a 48px icon square that stays hidden while the hero's Book button is on screen, so it never covers the page's main action.

### Navigation
Sticky, translucent white, hairline bottom rule. Desktop: brand mark left, five muted 15px links (Lessons, About, Reviews, Contact, and a divider before the one off-page link), the language menu, and a small primary Book button. Hover darkens a link to text-black. Under 940px the links become a stacked menu behind a 44px toggle; the menu's first row is Book in 600 weight. Escape closes it and returns focus to the toggle.

**Language menu.** A `<details>` beside the Book button: a 18px line globe and the page's code (EN, KO, 简, FA…) in the muted nav colour, darkening on hover or when open. It opens a white list with the floating shadow, each language named in itself (English, Español, 한국어, 简体中文, 繁體中文, 日本語, Tiếng Việt, فارسی), the current one in 600 weight with a small black dot. It works with no script; `tennis.js` closes it on a tap outside, on Escape, and when the mobile menu opens. Under 480px only the globe shows; its accessible name still says the language ("Language: English", and on the translated pages the language's own word with "(Language)" beside it, so an English reader who landed there can find the way back).

### Before you book, and the FAQ
"Before you book" is eight short notes in a four-column grid (two on phones): where, who, paying, first session, safety (USTA Safe Play, RSPA), cancelling (24 hours; weather reschedules free), rackets (borrow one), packages. Every one is a fact Isaac has confirmed; nothing on the page is a policy he hasn't stated.

Under it, "Questions people ask": ten questions on hairlines, each a native `<details>` that opens in place with a drawn plus that becomes a minus; the answer reads muted at body size, held to 62ch. Parent questions come first ("Does my child need to have played before?", "Is my child safe with you?"), "Can I give lessons as a gift?" ends in a "Give a lesson" link to the gift popup, and "Why a younger coach?" answers plainly with the record. The last item, "Something specific keeps going wrong in my game.", sends the reader to the practice tips page, and adds "Ask the chat about yours" beside that link only when the chat can answer (two link buttons in a row, 1.5rem apart).

### Clinic list (popup)
Opened from the clinic card, its popup, and the chat. The modal card with a short form in the matcher's field style: level (the same five levels as the matcher), who's coming (just me / my own group), the times that usually work (four checkboxes, 44px rows), an optional note. "Email my answers" opens an email to Isaac, from the visitor's own account, with the answers in English; a muted line says nothing is saved on the site. No level, no send: a bold line says to choose one first.

### Gift popup
Opened from the gift line, the FAQ and the chat. The clinic popup's form, unchanged in style: the four gifts as radio rows with the price at the row's end in weight (One private lesson $80, 5 private lessons $375, 10 private lessons $700, One hitting session $45), then who it's for, who it's from and a message for the card, all optional. "Email my request" opens an English email to Isaac from the visitor's own account; the muted line under it says he replies to settle payment in person and then hands over the card, and that nothing is saved. No gift, no send: a bold line says to choose one first.

### Contact band
The page's last word, on ink: "Let's get you on court", one sentence on what to send when you book, then one main action, an invert "Book a lesson", with "Email me first" as the outline second. Under them, in 72% white, "Booking just holds the time: no card, no deposit. You pay in person.", and on its own line a white text link, "Other ways to reach me", which opens the popup with the form and the copy-email button. Beside it, the email address and the home court as plain details.

### Dialogs
Native `<dialog>` opened with `showModal()`, a 50% dark backdrop, a white card with the softened radius, a 44px close control top-right, and focus placed on the heading so a reader hears the title before the price. Closing returns focus to the opener. The lightbox variant is a transparent dialog with the image centred and its caption on an 88% ink plate.

### The Statement Band (signature)
A full-bleed `{colors.ink}` block carrying one sentence in statement type. In a monochrome system this hard cut is what colour would otherwise do; it is used once between the hero and the offer, and again as the contact band at the end.

### The Photo Strip (signature)
Three portrait photographs on a 2px seam, each a button that opens the lightbox, each with a tag that slides up on hover (always visible on touch). Photographs zoom 4% on hover. Responsive sources: 600w and 1200w, WebP with JPEG fallback.

### The living hero
The hero photograph holds still. A muted looping clip made from the same photograph (`images/hero-loop.mp4`, generated in Higgsfield: Isaac nearly still, the windscreen and leaf shadows moving behind him) can sit over it: `hero.js` loads it only when the `<video class="hero-loop">` has a `data-src`, fades it in once it is actually playing, pauses it off screen, and skips it for reduced motion and Save-Data. Until there is a clip, nothing moves. On phones (under 680px) the photo follows the text instead of leading it, cropped from the top so the head stays in, so the first screen is the headline, the intro, the prices and the Book button.

### The ball in "lessons" (hero headline)
The "o" of "lessons" is an optic-yellow tennis ball, the same ball Book FX serves (the Ball Exception). The letter stays in the text (transparent, holding its width), so the heading still reads "Private tennis lessons"; `ballo.js` draws the ball over it, sized and placed from the font's own measured glyph and baseline, so it sits right in any system font at any width. After the words rise in, the ball drops in from behind the line above and bounces three times (fall time grows with height, a squash on each landing), once; then it is just the letter. It is not a control: no hover, no click, no sound, nothing a keyboard can't reach. Reduced motion: the ball just sits there. No JS: a plain "o".

### The translated pages
The tennis page also exists in Spanish (`/es/`), Korean (`/ko/`), Simplified and Traditional Chinese (`/zh-hans/`, `/zh-hant/`), Japanese (`/ja/`), Vietnamese (`/vi/`) and Persian (`/fa/`). They are the same page, not variants: `tools/i18n/build.mjs` writes each from `public/index.html` and a dictionary (`tools/i18n/ko.mjs` …) holding that language's version of every English string, plus the words the scripts write (`window.I18N`) and the chat's answers. Edit the English, update the dictionaries, run the build; it fails loudly when a dictionary string no longer appears on the English page or English is left on a translated one. Every page lists all eight with `hreflang` links, and the sitemap names them.

- **Same world.** Same layout, same black and white, same motion, same ball. Nothing is redesigned per language; only type is fitted to the script.
- **Type per script.** The system face still, but named per language so each gets its regional forms (Apple SD Gothic Neo / Malgun Gothic for Korean, Hiragino / Yu Gothic for Japanese, PingFang SC / Microsoft YaHei and PingFang TC / Microsoft JhengHei for the two Chinese, Segoe UI / Tahoma for Persian). The tight Latin tracking is eased for Hangul, Han and kana and removed entirely for Persian (it would pull its joined letters apart); line heights open up for their taller glyphs; the CJK headline is a step smaller (`clamp(2.75rem, min(6.6vw, 8.4vh), 4.9rem)`) because those glyphs fill the whole em. Korean breaks lines between words (`word-break: keep-all`).
- **The ball becomes the full stop.** Translated headlines have no "o" to borrow, so the ball sits at the end of the last word as its full stop (`.ball-stop`), the size of an "o" in the same font, landing with the same bounce.
- **Persian runs right to left.** `dir="rtl"` on the page; the stylesheet uses logical sides (`inset-inline-end`, `padding-inline-start` …) throughout, so the header, hero bleed, chat corner, dialogs and lists all mirror without a second set of rules. Arrows flip; the video's play triangle doesn't.
- **The chat and matcher speak the language.** Jev reads questions in any of these languages and still picks from the English topics, so `public/ask.json` stays the one source; each page shows that language's answers (`/ko/ask.json` …). Chinese and Japanese answers type out character by character. Email subjects gain "(Korean page)" and so on, so Isaac knows which language the visitor read.
- **Honest about translation.** Names, clubs and courts stay in Latin letters; the reviews are translated and the section says so in one muted line.

### The practice tips page (/tips/)
A Read page in the same world, at `/tips/` and in every language. The front page's header without its section links (wordmark home, language menu, Book), then a section head: eyebrow "Practice tips", the headline "Quick fixes for common problems" (600, `clamp(2.25rem, 5vw, 3.5rem)`, tracking -0.045em, held to 16ch), one muted sentence, and a row of muted, hairline-underlined topic links. Five groups follow (Serve; Forehands, backhands and rallies; Footwork and the net; Matches and practice; For parents), each a section h2 over the FAQ's hairlines, every tip a row with the problem as a title-size heading on the left third and the fix at body size beside it, held to 62ch; on phones they stack. The tips are the chat's own (`tip_*` in `ask.json`, written in by the build), so the page and the chat never disagree. It ends on the ink band, the front page's close: "Want the real cause?", one sentence, an invert Book and an outline "See lessons and prices". The front page links to it from the FAQ and the footer.

### The printed pieces (/flyer/, /gift-card/)
Paper versions of the same world (`print.css`, `print.js`), sized in inches and points: on screen, a Letter sheet with a hairline edge on the soft band, under a bar with a heading, one muted instruction, the primary Print button (shown only when the script runs) and each language named in itself; on a screen narrower than the paper the sheet zooms down to fit, and it always prints at full size, alone.
- **The flyer:** the wordmark, the eyebrow, "Tennis lessons in Irvine" at 50pt tight, one muted sentence and the pointing photograph in a rounded portrait beside it; then the four offers in two columns with figure-size prices (the Figure Rule holds on paper); then a QR code (error correction Q, so a creased corner still scans) beside "Scan to see times and book.", the address, the email and three muted reassurances; then eight tear-off strips behind a dashed cut line, the words turned to run up each strip. The QR code and the printed address are drawn for the flyer's own language and carry `?from=flyer`, which the front page counts once and then removes from the address bar.
- **The gift card:** 7 × 5 in inside a dashed cut line: wordmark and "Gift card" with a number, then For, the gift at 30pt, the message in quotes and From, then a hairline over the booking line and a small QR code. Every field is filled from the form above it as Isaac types; one left empty prints as a ruled line to write on. No expiry date, on purpose.

### Isaac's pages (/recap/, /stats/)
Working pages, not the shop window: no header, plain white, the site's face, fields and buttons held to a 54rem column under a "For Isaac" eyebrow, English only, kept out of search. The recap is the clinic form's fields plus a grid of tick rows (the tips' titles) and a large editable note it writes, in the family's language if picked, with "Open in Gmail" and "Copy the note". The numbers page asks once for the stats key, then shows one table (what happened × language, a period picker, totals in weight, empty rows muted) and the unanswered questions on hairlines, always shown as text, never as markup.

### Page transitions
The tennis page and the portfolio both declare `@view-transition { navigation: auto; }`: crossing between them, the old page lifts 2.5vh and fades in .32s while the new one rises 4vh in .55s. Browsers without cross-document view transitions navigate normally; reduced motion turns it off.

### Book FX (every Book button)
Pressing any `[data-cal-link]` control plays one quick serve on top of the button while the calendar is still opening (`bookfx.js`), about 0.7s: the button squashes and springs back and a ring in its own fill goes out from the press; the player — always black (`#111`) with a thin white outline so it reads on the white page, the black bands and the calendar's dimmed backdrop — starts in the trophy pose with the optic-yellow ball (`#d9ef3f`) already tossed, and serves Ben Shelton style: deep racket drop, a leap so contact is in the air, landing on the front foot with the back leg kicking up. Contact throws a spark (a white flash ringed in amber, eleven amber streaks with white cores, longer in the direction of the hit, gone in under a fifth of a second) and a puff of felt fuzz, and the ball leaves forward and down, shrinking into the distance, toward the side of the screen with more room. It is deliberately short: a beat between pressing Book and reading dates, never a scene played over the calendar — no court, net or bounce (a longer version with all three was tried and covered the date grid). Sound follows the swing, a rising "swish" and a "thwock" on contact, obeying the chat's mute; the first time a press makes a sound, a small one-line ink bar at the bottom centre says "Tennis sounds on" with a "Turn off" button, once per visitor. Everything it draws and that bar are kept above the calendar popup even when the popup is added late (a cold first click): for a few seconds after a press, anything new added to the page sends them back to the end. The body is eleven joints keyed through five poses and eased every frame. Near the top of the screen (the header button) the player stands just below the button. Replayed clicks don't serve twice; reduced motion keeps the sound and drops the visuals.

### Focus reveal (the statement band)
The statement sentence on the black band carries the focus reveal: white brackets (`--fr-color: #fff`), unfocused words at .38 opacity and a .055em blur. It is the page's one display sentence and purely decorative, so it is the only place the effect goes — never on the hero headline, a price, or a Book control.

- **Shared code:** `/focus.js` and `/focus.css` at the site root. The line reads sharp at rest. On the tennis page it also arrives sharp (`data-focus-reveal="hover"`): no opening sweep, because a blurred sentence while you are trying to read it is a cost, not a delight; the portfolio's closing line keeps the one-time sweep, where a camera-style frame (four corner brackets) passes over it word by word and settles; a mouse over the line brings the frame back to follow the word under the pointer, stretching across both words on the way (leading edge faster than trailing); on touch, tapping a word focuses it for a moment. Unfocused words soften (`--fr-blur`, `--fr-dim`) but stay legible. Screen readers get the sentence as one string; reduced motion and no-JS show plain sharp text.

## Do's and Don'ts

### Do:
- **Do** keep every price in text-black at 1.6rem/600 — the Figure Rule — and give the unit its own muted span.
- **Do** make every booking control a real `<a href>` to the event on cal.com; the embed intercepts the click, the href is the fallback.
- **Do** load third-party scripts on intent (pointer over a control, focus, scroll, tap) or on a timer, never in the critical path.
- **Do** reveal each block once and let the observer go; a page that re-animates on scroll-up is telling the reader to stop reading.
- **Do** ship `<picture>` with WebP and a 2-step srcset for every photograph over 100KB.
- **Do** hold the 44px touch floor under 940px, using padding or a pseudo-element hit area rather than enlarging the visible control.
- **Do** switch the focus ring to white inside `.contact`, `.footer`, `.statement`, and `.lightbox`.
- **Do** keep anything that needs a fact Isaac hasn't given (a review link, an analytics token) hidden until its meta tag is filled, rather than showing an empty promise.

### Don't:
- **Don't** introduce a hue. Not for a CTA, not for a link, not for a chart.
- **Don't** add a second typeface or an icon set; the page has one dash and one monogram, and that is the graphic vocabulary. (The per-language font stacks are still the system face, picked per script.)
- **Don't** hand-edit a translated page. Change the English page or the dictionary and run `node tools/i18n/build.mjs`.
- **Don't** add a theme toggle or `prefers-color-scheme` rules; the black bands are the dark, placed on purpose.
- **Don't** put a shadow on anything at rest.
- **Don't** let a paragraph rule (`.lesson p`, `.modal-card > p`) style a price; that is how every price on the page once rendered 16px grey.
- **Don't** describe the bands as green anywhere — comments, tokens, or copy. The palette was black before this file existed.
- **Don't** put the offer below the proof. Lessons stay in the second screen.
