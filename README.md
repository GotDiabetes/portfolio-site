# Lee Tennis Co. — leetennisco.com

One repository, one site, two faces:

- **leetennisco.com/** — the tennis coaching page. This is the front door.
- **leetennisco.com/portfolio/** — Isaac's personal portfolio, with a printable résumé at **/resume**.

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
│   ├── CNAME  robots.txt  sitemap.xml
├── DESIGN.md                  the tennis page's visual system
├── .impeccable/               design sidecar, detector config, critique snapshots
└── .github/workflows/pages.yml
```

**The pages are hand-written HTML/CSS/vanilla JS with no build step.** There
are no dependencies and nothing to install.

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
