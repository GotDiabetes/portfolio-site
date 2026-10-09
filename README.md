# Lee Tennis Co. — leetennisco.com

One repository, one site, two faces:

- **leetennisco.com/** — the tennis coaching page. This is the front door.
  It also comes in Spanish, Korean, Chinese (simplified and traditional),
  Japanese, Vietnamese and Persian, at **/es/**, **/ko/**, **/zh-hans/**,
  **/zh-hant/**, **/ja/**, **/vi/** and **/fa/**.
- **leetennisco.com/tips/** — practice tips: Isaac's short fixes for common
  problems, the same ones the chat gives, in every language (/ko/tips/ …).
- **leetennisco.com/portfolio/** — Isaac's personal portfolio, with a printable résumé at **/resume**.

And pages that are Isaac's own, kept out of search. **leetennisco.com/admin/**
(the "Admin" link at the end of the footer) links them all, plus Cal.com,
Gmail, Cloudflare, TypeSafe billing and the Google Business Profile:

- **/flyer/** — a printable flyer for notice boards, with a QR code and
  tear-off strips, in every language (/ko/flyer/ …).
- **/gift-card/** — makes a printable gift card when someone buys lessons as
  a gift (the "Give a lesson" popup emails you the request).
- **/recap/** — after a lesson, tick what you worked on and it writes a short
  note for the player or parent, in their language, to send from Gmail or
  paste into a text.
- **/stats/** — your numbers: Book presses, chat and matcher use, forms sent,
  flyer visits, by language, and the chat questions it had no answer for.

It's live. Every push to `main` deploys within about a minute.

## Making changes

Tell your assistant what you want in plain English — "change the price,"
"swap this photo," "fix this typo." Edits are made locally first and shown to
you; nothing goes to GitHub until you say it's good. A push is a publish.

## Seeing it locally

From the repo folder:

```bash
python -m http.server 5595 --directory public
```

then open http://localhost:5595/ (tennis) or http://localhost:5595/portfolio/.
Hard-refresh (`Ctrl+Shift+R`) after a change if something looks stale.

---

## Two things to switch on when you have them

Both are a single line in `public/index.html` (and the same line in the
pages named), and both stay off until filled in:

- **Your Google review link** (`review-link`; also in `public/recap/`).
  `GOOGLE-PROFILE.md` walks through setting up the profile and finding the
  link. Once it's in, "Leave a review" appears under the reviews.
- **Visit counts** (`cf-analytics`; also in `public/tips/`). In the
  Cloudflare dashboard: Analytics & Logs → Web Analytics → Add a site →
  leetennisco.com; copy the token from the snippet it shows. No cookies, no
  consent banner.

## For your assistant (technical details)

<details>
<summary>Structure, deploy, and conventions</summary>

```
portfolio-site/
├── public/                    ← everything here is what GitHub Pages serves
│   ├── index.html               the tennis page (front page)
│   ├── tennis.css / tennis.js
│   ├── ring.css / ring.js       the shared photo ring (used by the portfolio)
│   ├── images/                  tennis photographs, WebP + JPEG, 2-step srcset;
│   │                            images/ring/ holds the ring's card thumbnails
│   ├── portfolio/               the portfolio: index.html, styles.css, main.js,
│   │                            images/, and its own DESIGN.md
│   ├── resume/                  the résumé as a web page, print-styled
│   ├── tips/                    practice tips (its tips come from ask.json)
│   ├── flyer/  gift-card/       the printed pieces; print.css / print.js
│   │                            (QR codes, the print button, the card's fields)
│   ├── recap/  stats/           Isaac's own pages; recap.js / stats.js
│   ├── es/ ko/ zh-hans/ zh-hant/ ja/ vi/ fa/
│   │                            the tennis page, tips, flyer and gift card in
│   │                            other languages: built, not hand-written (see
│   │                            Translations below)
│   ├── CNAME  robots.txt  sitemap.xml
├── tools/i18n/                the translation build and one dictionary per language
├── worker/                    the Cloudflare Worker (Jev, and Isaac's numbers)
├── DESIGN.md                  the tennis page's visual system
├── GOOGLE-PROFILE.md          setting up the Google Business Profile
├── .impeccable/               design sidecar, detector config, critique snapshots
└── .github/workflows/pages.yml
```

**The pages are hand-written HTML/CSS/vanilla JS with no build step.** There
are no dependencies and nothing to install. (The translated pages are the one
generated thing, and they are generated on Isaac's machine and committed;
the deploy never runs anything.)

**Deploy:** GitHub Actions uploads `public/` as-is to GitHub Pages. Custom domain is `leetennisco.com` (Namecheap DNS → Pages
IPs, `www` CNAME, HTTPS enforced). The domain is set in Settings → Pages by
hand; the `CNAME` file alone is not enough with Actions deploys.

**Conventions that matter:**
- Two visual worlds, each with its own `DESIGN.md`: the tennis page is black
  and white (root `DESIGN.md` — the Figure Rule and the Two Blacks Rule are the
  two that get broken by accident); the portfolio is warm paper, serif,
  hairlines and a real dark mode (`public/portfolio/DESIGN.md`). Don't score
  one against the other.
- Every Book control is a real `<a href>` to the event on cal.com with
  `data-cal-link`; the Cal embed loads on first interaction, not on load.
- `tennis.css?v=…` and `tennis.js?v=…` are cache keys. Bump them when the
  file changes.
- The `.js` class on `<html>` gates every hidden-until-revealed style, so a
  failed script leaves a readable page.
- `MilkCow Cafe` on the portfolio stays unlinked (site was compromised 2026-08).

</details>

<details>
<summary>Jev features: lesson matcher and Ask Isaac chat (Cloudflare Worker)</summary>

Two features on the tennis page use TypeSafe's Jev model through `worker/`, a
Cloudflare Worker. The API key never reaches the page: it lives as a Worker
secret, and the Windows user environment variable `TYPESAFE_API_KEY` on
Isaac's machine.

- **Lesson matcher** (`public/match.js`, `POST /match`): the "Not sure which
  fits?" box under the lesson cards. Jev picks the card, and from the same
  sentence the player's level (five levels), what they want to work on, and
  whether it's a child. The page highlights the card, shows the level and
  focus, and puts all of it (in English) into the Cal.com booking notes of the
  Book button it offers.
- **Ask Isaac** (`public/ask.js`, `POST /ask`): the chat in the corner. Every
  answer is written in **`public/ask.json`**; Jev only picks which one answers
  the question, then checks that it really does (in the language the visitor
  reads), and the chat says "email me" when nothing fits. It can never say
  anything that isn't in that file. In the same single Jev call it also spots
  a parent asking for a child (the chat then shows a topic's `answer_parent`),
  abuse or attempts to instruct the bot (one refusal line), and phone numbers
  or addresses typed in (a one-line "leave those out").
- **Practice tips:** the `tip_*` topics in `ask.json` are short fixes for
  common problems ("my serve goes into the net"). They were drafted for Isaac
  to read and edit like any other answer.
- The Jev model is pinned (`MODEL` in `worker/src/index.js`); the thresholds
  were tuned on that version. Move to a newer one deliberately.
  **To change or add an answer, edit `ask.json` and push** — the Worker reads
  it from the live site (cached 5 minutes), no redeploy needed. Each topic's
  `covers` line is what Jev reads to choose it, so describe the questions it
  answers.
- The questions Jev is asked are in `worker/src/index.js`. The page can send
  text, never questions, so the Worker is not an open proxy.
- Only `leetennisco.com` and `localhost:5595` may call it; 6 requests a
  minute per visitor and 60 across the site.
- Both stay hidden until `<meta name="jev-endpoint">` in `public/index.html`
  holds the Worker's address, so the page is unchanged until the Worker is up.
  On localhost they call a local Worker on `:8787` instead.

- **Isaac's numbers** (`POST /hit`, `GET /stats`): the Worker also counts,
  per day (Irvine time) and page language, what the page reports (Book
  pressed and for which lesson, the clinic list or a gift request sent, the
  chat opened, a visit from the flyer's QR code: `tennis.js` sends these
  with `sendBeacon`) and what it sees itself (matches, answered, unanswered
  and refused chat questions). It keeps the chat's unanswered questions for
  90 days, minus any Jev thinks hold personal details, with email- and
  phone-shaped text blanked; the chat says so under its input. Counts
  only: no IPs, no names. They live in a D1 database (`DB` in
  `wrangler.toml`); the Worker makes its tables on first use, and every
  counting call does nothing when the binding is missing. `/stats` needs
  the `STATS_KEY` secret and is what `public/stats/` reads. Page events
  have their own limit (`HITS`, 30 a minute per visitor).

**Deploy (once, from `worker/`):**

```bash
npx wrangler login
npx wrangler deploy
npx wrangler secret put TYPESAFE_API_KEY
npx wrangler secret put STATS_KEY
```

`secret put` asks for the value; type it yourself. For `STATS_KEY`, make up
a long passphrase (four or five random words); it's what you type on
/stats/. `deploy` prints the Worker's address
(`https://lee-tennis-jev.<you>.workers.dev`), and on the first deploy with
the `[[d1_databases]]` block it creates the `lee-tennis-stats` database.
Put the address in the `jev-endpoint` meta tag and push.

**After changing `worker/src/index.js`,** run `npx wrangler deploy` again from
`worker/` (only from there). Answers in `ask.json` don't need this.

</details>

<details>
<summary>Translations (/es/, /ko/, /zh-hans/, /zh-hant/, /ja/, /vi/, /fa/)</summary>

Each translated page is built from the English page by

```bash
node tools/i18n/build.mjs
```

which reads the English pages (`public/index.html`, `public/tips/`,
`public/flyer/`, `public/gift-card/`: the `PAGES` list in the build),
`public/ask.json` and one dictionary per language (`tools/i18n/ko.mjs` and so
on), and writes `public/<lang>/` with the same pages, plus
`public/<lang>/ask.json`. **Never edit those output files by hand**; they are
overwritten on the next build. One dictionary covers all four pages.

- **After changing the English page or `ask.json`, run the build.** If a
  sentence was reworded or added, it stops with a list: "no longer on the
  English page" (update that dictionary entry) or "still in English" (add one).
  Each entry is `[English exactly as on the page, translation]`; inline markup
  can be part of it.
- The chat: Jev still chooses from the English topics (the Worker reads
  `public/ask.json`), and each page shows its own language's answer for that
  topic. A new topic needs an answer in every dictionary's `ask.topics`.
  Each translated answer carries `src`, a fingerprint of the English it came
  from: change an English answer and the build lists every translation of it
  as out of date, with the new `src` to set once it's updated.
- **The tips page is made from `ask.json`.** Each `<div class="tips"
  data-tips="…">` in `public/tips/index.html` is filled with those `tip_*`
  topics (`title` as the heading, then the answer): in English on that file
  itself, and from each dictionary's chat answers on the copies. Edit a tip
  in `ask.json` and run the build; a new tip needs a `title` and its id in
  one of the `data-tips` lists.
- Links between the built pages stay in the language: `tips/` on the front
  page and `/#lessons` on the tips page lead to `/ko/tips/` and `/ko/#lessons`
  on the Korean copies, and a chat button linking to `/tips/` does too.
- What the scripts write (chat messages, matcher sentences, the sound note,
  menu labels) is in each dictionary's `js`, handed to the page as
  `window.I18N`.
- Persian is right to left (`dir: "rtl"`); the stylesheet uses logical sides,
  so new CSS should too (`margin-inline-start`, not `margin-left`).
- The translations were written by Claude. Have a native speaker read a
  language before leaning on it.

</details>
