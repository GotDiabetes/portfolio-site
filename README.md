# Isaac Lee — portfolio website

A companion site to [tennis-site](../tennis-site). Same approach: plain HTML and
CSS, **no build step, no dependencies, no webfonts.** Edit a file, save, refresh.

Its job is to be the front door — the link you put on a résumé, a LinkedIn
profile or an application — and to point at the tennis site as proof you can
build and ship something real.

---

## 1. Open it

```
code C:\Users\21eui\portfolio-site
```

To preview, right-click `public/index.html` → **Open with Live Server**. Or just
double-click it — every path is relative, so it works straight off disk, résumé
page included.

> One caveat when opening off disk: the live preview of the tennis site inside
> the case study is an `<iframe>` pointing at the deployed URL, so it needs an
> internet connection. Without one you'll see the fallback card instead. That's
> by design.

> A note on editing: these files are UTF-8 and contain real typographic
> characters — em dashes, and the é in "résumé". If you edit them with a tool
> that guesses the encoding (PowerShell's `Get-Content`/`Set-Content` are the
> usual culprits), those turn into `â€”` and `Ã©`. VS Code handles it correctly.

---

## 2. Files

```
portfolio-site/
├── public/                ← everything here goes live
│   ├── index.html           the whole main page
│   ├── styles.css           all styling (adjustables at the top, under :root)
│   ├── main.js              fade-in, popups, nav highlight, mobile menu
│   ├── favicon.svg
│   ├── robots.txt
│   ├── sitemap.xml
│   └── resume/
│       ├── index.html       the résumé, as a web page
│       └── resume.css       screen + print styling for it
├── firebase.json          hosting config
└── README.md
```

There is no `.firebaserc` yet — that's deliberate, see §7. It stops an
accidental `firebase deploy` from overwriting the tennis site.

---

## 3. ⚠ Read this before publishing

**The live tennis URL and the local tennis folder are two different sites.**

Checked 7 Aug 2026: `https://tennis-b3bce.web.app` serves a bundled React/Vite
single-page app — page title *"Elegant Tennis Coach Landing Page"*, a
`<div id="root">` shell with `/assets/index-*.js`, last deployed 8 Mar 2026.

`C:\Users\21eui\tennis-site` is something else entirely: a hand-written,
no-framework, no-build site. It has never been what's live at that URL.

This matters because the featured case study on this portfolio says the site is
*"hand-written… no framework, no template, no build step"* — which is true of the
folder, and not true of the thing a recruiter sees when they click the preview.
The résumé page carries the same claim. **Right now those two disagree.**

Pick one:

1. **Deploy the hand-written site** to `tennis-b3bce`, and the claims become
   accurate. Be aware this replaces the React app currently live there.
2. **Point the case study somewhere else** — wherever the hand-written site
   actually lives. The URL appears in four places in `public/index.html`: the
   button, the `<iframe src>`, the `.browser-url` label, and the footer link.
3. **Rewrite the case study** to describe the React app instead, if that's the
   piece of work you'd rather show.

Until then, don't send the portfolio to anyone — a claim that doesn't survive
one click is worse than no claim.

The same applies to the "Portfolio" link this project added to the tennis site's
footer: it's in the local folder only, so it won't appear live unless option 1
above happens.

---

## 4. The two sites, connected

They're meant to work as a pair:

| From | To | Where |
|---|---|---|
| Portfolio | Tennis site | "Featured build" case study + footer link |
| Tennis site | Portfolio | Footer link (added by this project) |

If you ever change the tennis site's URL, it appears in **four** places here:
the case study button, the `<iframe>` `src`, the `.browser-url` label, and the
footer link. All four are in `public/index.html`.

---

## 5. Your details — where they live

Everything below is already filled in from your 2026 résumé.

| Detail | Current | Where |
|---|---|---|
| Email | 21euisungisaac@gmail.com | `index.html` (JSON-LD, contact, footer, popup, copy button) and `resume/index.html` |
| Phone | (224) 813-2883 | `index.html` contact list + popup, `resume/index.html` |
| LinkedIn | isaac-lee-2a5755293 | `index.html` profile card, contact list, popup; `resume/index.html` |
| Internship target | Summer 2027 | The contact section heading |

If the phone number changes, update **both** the visible text and the
`tel:+12248132883` link — the `tel:` version takes no spaces or dashes.

**About the email:** this uses `21euisungisaac@gmail.com` — the same address as
the tailored internship résumés in `Isaac/output/internship_resumes/`, so an
employer holding one of those finds the same contact here. Your `.edu` address
was the other candidate, but it stops working when you graduate in 2027.

Your tennis site keeps `isaacleetennis@gmail.com` on purpose: that's the
coaching business's address, and it's wired to the booking Google Form.

---

## 6. The résumé page

`public/resume/` is your résumé as a real web page rather than a PDF download.
That's on purpose:

- It's a link you can send that always shows the current version.
- **Print / Save as PDF** in the toolbar produces a clean one-page document —
  the toolbar, background and link colours all drop out in print.
- It's another thing recruiters can see you built.

`Isaac/build_resume.py` had `[ADD EMAIL]` printing in red in the header; that's
fixed and `Isaac_Lee_Resume_2026.docx` has been regenerated with the real
address. **The matching `.pdf` is stale** — there's no LibreOffice on this
machine to reconvert it. Either open the new `.docx` in Word and *Save As PDF*,
or just use this page's **Print / Save as PDF**, which is measured to fit one
page (911px of 960px printable at US Letter, ~half an inch spare).

To edit the résumé page, the content is plain HTML in `resume/index.html` — each
role is one `<div class="entry">`. Copy an existing one to add another.

---

## 7. Publishing

Do **not** reuse the `tennis-b3bce` project — deploying to it would replace your
tennis site. This needs its own.

One-time setup:

```bash
npm install -g firebase-tools
```

```bash
firebase login
```

Create a new project (or make one in the [console](https://console.firebase.google.com)):

```bash
firebase projects:create isaac-lee-portfolio
```

Point this folder at it — this writes the `.firebaserc` for you:

```bash
cd C:\Users\21eui\portfolio-site; firebase use --add
```

Then publish, now and for every future update:

```bash
cd C:\Users\21eui\portfolio-site; firebase deploy --only hosting
```

To preview on a temporary URL without touching the live site:

```bash
firebase hosting:channel:deploy preview
```

---

## 8. Custom domain

**Buy it** — you'll need to do this yourself, it takes a payment method.
[Cloudflare](https://domains.cloudflare.com) (~$11/yr, sold at cost) or
[Porkbun](https://porkbun.com) are the best value. Decline every add-on at
checkout; Firebase gives you SSL and hosting free.

A name like `isaaclee.com` on an application beats a `.web.app` URL. If it's
taken, `isaacleee.com` variants look worse than `isaac-lee.com` or `isaaclee.co`.

**Connect it** — Firebase Console → Hosting → Add custom domain → add the TXT
record it gives you to verify, then the two A records at your registrar. SSL is
issued automatically within a few hours. Add the `www` version as a second
domain so both work.

**Then update the placeholder domain**, which is `isaaclee.com` in three files —
`index.html` (the `canonical`, `og:url` and JSON-LD `url`), `resume/index.html`
(the `canonical`), `robots.txt` and `sitemap.xml` — and redeploy. Finally,
submit the site to [Google Search Console](https://search.google.com/search-console).

---

## 9. Making changes

**Wording** → `public/index.html`. Each section has a comment banner like
`<!-- ==== EXPERIENCE ==== -->`.

**Colors, spacing, type size** → the `:root` block at the top of `styles.css`:

```css
--ink:    #10243a;   /* the full-bleed navy blocks */
--accent: #1f4e79;   /* accent marks — matches the résumé's blue */
--text:   #14181d;
--muted:  #5a6270;
```

**Add a job** → copy an existing `<li class="job fade">` in the timeline. Add
`is-current` to the class list if it's a role you still hold — that's what fills
in the dot on the timeline.

**Add a project** → copy an `<article class="project fade">`. If it deserves the
big treatment, copy the `<article class="case">` block instead.

**Add a popup** → copy an existing `<dialog>` at the bottom of `index.html`, give
it a new `id`, and point a button at it with `data-open="thatId"`. `data-close`
on anything inside closes it.

**The animation** → there is one, a fade and lift, staggered with `--d`. That's
deliberate, same as on the tennis site. Restraint is what keeps it from looking
templated.
