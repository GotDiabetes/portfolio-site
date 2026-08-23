# Isaac Lee — portfolio website

This is your personal portfolio site — the page you'd put on a résumé, a
LinkedIn profile, or a job application. It shows your experience, your
projects, and links to your résumé and your tennis site.

It's simple by design — no logins, no monthly software fees. Just a handful
of files that make up the page a recruiter would see.

## Seeing the site

Open the `public` folder and double-click `index.html`. It opens right in
your browser and looks basically like the real thing — every photo and link
works straight off your computer, no internet connection needed except for
the small preview of the tennis site.

## Making changes

You don't need to know any code. Just tell your AI assistant what you want in
plain English — "add my new internship," "swap this photo," "fix this typo"
— and it'll make the edit for you.

Your contact info on the site right now:

| What | Current |
|---|---|
| Email | 21euisungisaac@gmail.com |
| Phone | (224) 813-2883 |
| LinkedIn | isaac-lee-2a5755293 |

## Your résumé page

There's a copy of your résumé built right into the site (`public/resume/`),
not just a PDF file. It's a real webpage version that always shows your
current résumé, and anyone can turn it into a clean PDF using the browser's
Print option — no separate file to keep updating.

## Publishing so people can actually see it

This site isn't live on the internet yet — there's no public web address
connected to it. It only exists on this computer for now. Whenever you're
ready, ask your assistant to help you set up free hosting (through Google's
Firebase service) and publish it — it only takes a few minutes and most of
it is automatic.

---

## For your assistant (technical details)

<details>
<summary>File structure and publishing commands</summary>

```
portfolio-site/
├── public/                ← everything here goes live
│   ├── index.html           the whole main page
│   ├── styles.css           all styling (adjustables at the top, under :root)
│   ├── main.js              fade-in, popups, nav highlight, mobile menu
│   ├── favicon.svg
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── images/
│   ├── resume/
│   │   ├── index.html       the résumé, as a web page
│   │   └── resume.css       screen + print styling for it
│   └── tennis/               the tennis coaching site, linked from Projects
│       ├── index.html
│       ├── styles.css
│       ├── main.js
│       ├── favicon.svg
│       └── images/
├── firebase.json          hosting config
└── README.md
```

No build step, no dependencies, no webfonts. Edit a file, save, refresh.

There is no `.firebaserc` yet — deliberate, so an accidental `firebase
deploy` can't overwrite the tennis site's project.

**Publish (one-time setup, then deploy):**

```bash
npm install -g firebase-tools
firebase login
firebase projects:create isaac-lee-portfolio
cd C:\Users\21eui\portfolio-site; firebase use --add
cd C:\Users\21eui\portfolio-site; firebase deploy --only hosting
```

**Custom domain:** buy one (Cloudflare or Porkbun, ~$11/yr), connect it via
Firebase Console → Hosting → Add custom domain, then update the placeholder
domain (`isaaclee.com`) in `index.html`, `resume/index.html`, `robots.txt`,
and `sitemap.xml`.

</details>
