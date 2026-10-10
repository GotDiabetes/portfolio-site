# Drill library build

`public/admin/drills/data.js` is generated from the research notes in
`research_notes/Tennis drills by age and skill/`. Everything else in
`public/admin/drills/` is hand-written: `app.js` (the page), `court.js` (the court
diagrams), `guide.js` (the age guide) and `drills.css`.

To rebuild after changing the notes, from this folder:

```
node parse.mjs      # notes → cache/raw.json (drills, faults, video ids)
node oembed.mjs     # re-checks every YouTube id → cache/videos.json (needs the internet)
node build.mjs      # tags ages, levels and skills, adds diagrams → public/admin/drills/data.js
```

`oembed.mjs` is only needed when the notes gain new videos; `build.mjs`
leaves out any video that failed the check. Then bump the `?v=` numbers in
`public/admin/drills/index.html`.

- **Court diagrams:** one line per drill in `diagrams.mjs`. The little
  language is described at the top of `public/admin/drills/court.js`.
- **Age guide videos:** `ageoembed.mjs` checks the age-guide video ids in
  `cache/ageids.json`.
