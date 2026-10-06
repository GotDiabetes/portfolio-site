/* ============================================================================
   Builds the translated tennis pages from the English one.

       node tools/i18n/build.mjs          every language
       node tools/i18n/build.mjs ko fa    just these

   The English page (public/index.html) and the English chat answers
   (public/ask.json) are the source. Each dictionary here (ko.mjs, es.mjs
   ...) holds that language's version of every piece of English on the
   page, and this writes public/<path>/index.html and public/<path>/ask.json
   from them. Nothing is translated at run time and nothing is fetched: the
   output is plain static HTML like the rest of the site, and the deploy
   doesn't run this. Run it after editing the English, and commit what it
   writes.

   How a page is made:
     · HTML comments are dropped (they explain the English source, and the
       copies are never edited by hand);
     · every English string in the dictionary is swapped for its
       translation, longest first, so "Email me first" is never half-caught
       by "Email me". A string can carry inline markup (the hero intro
       keeps Isaac's name span and emoji), and the match ignores line
       breaks and indentation, so the source can be reflowed freely;
     · <html lang>, dir="rtl" for Persian, the canonical URL, the current
       item in the language menu and its code are set;
     · relative asset paths become absolute (/tennis.css), since the copy
       lives one folder down;
     · email subjects get "(Korean page)" and so on, so Isaac can see which
       language a visitor read;
     · window.I18N, the words the scripts write (chat, matcher, menus),
       goes in just before the first script.

   It then checks its own work and exits with an error when the English
   has moved on: a dictionary string that no longer appears in the page
   (the English was reworded), or a piece of English text still sitting
   in a translated page (something new was added). Names that stay in
   English are listed in each dictionary's keep[].
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, "..", "..", "public");
const SITE = "https://leetennisco.com";

/* Stay in English everywhere: names, the brand, the address. */
const KEEP = [
  "Lee Tennis Co.", "Isaac Lee", "Brice Krizman", "Albert Kim",
  "isaacleetennis@gmail.com", "Grip N Rip", "LifeSport Libertyville",
  // the language menu names every language in itself
  "English", "Español", "한국어", "简体中文", "繁體中文", "日本語", "Tiếng Việt", "فارسی", "EN",
];

const english = readFileSync(join(PUBLIC, "index.html"), "utf8").replace(/\r\n/g, "\n");
const askEn = JSON.parse(readFileSync(join(PUBLIC, "ask.json"), "utf8"));
const englishUnits = units(english);
const only = process.argv.slice(2);

let failed = false;
for (const file of readdirSync(HERE).filter((f) => /^[a-z-]+\.mjs$/.test(f) && f !== "build.mjs").sort()) {
  const d = (await import(pathToFileURL(join(HERE, file)))).default;
  if (only.length && !only.includes(d.lang.toLowerCase()) && !only.includes(file.replace(".mjs", ""))) continue;

  const report = { missing: [], untranslated: [] };
  const html = page(d, file, report);
  const ask = answers(d, file, report);

  const out = join(PUBLIC, d.path.replace(/^\/|\/$/g, ""));
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.html"), html);
  writeFileSync(join(out, "ask.json"), JSON.stringify(ask, null, 2) + "\n");

  const keep = new Set([...KEEP, ...(d.keep || [])]);
  const words = (u) => /\p{L}{2}/u.test(u.replace(/&[a-z0-9#]+;/gi, ""));   // "&times;" is not English
  report.untranslated = [...units(html)].filter((u) => englishUnits.has(u) && words(u) && !keep.has(u));

  const bad = report.missing.length + report.untranslated.length;
  console.log(`${bad ? "✗" : "✓"} ${d.path}  (${d.pairs.length} strings, ${ask.topics.length} answers)`);
  for (const m of report.missing) console.log("    no longer on the English page: " + m.slice(0, 110));
  for (const u of report.untranslated) console.log("    still in English:              " + u.slice(0, 110));
  if (bad) failed = true;
}
if (failed) {
  console.log("\nSome pages are out of step with the English. Update the dictionaries above and run this again.");
  process.exitCode = 1;
}

/* ----------------------------------------------------------- The page -- */
function page(d, file, report) {
  let html = english.replace(/[ \t]*<!--[\s\S]*?-->[ \t]*\n?/g, "");

  /* Scripts are code, not copy: set aside so no string can land in one.
     (The structured data block is left in: it is data in English.) */
  const scripts = [];
  html = html.replace(/<script\b[\s\S]*?<\/script>/g, (m) => {
    scripts.push(m);
    return "\u0003" + (scripts.length - 1) + "\u0003";
  });

  const slots = [];
  for (const [en, tr] of [...d.pairs].sort((a, b) => b[0].length - a[0].length)) {
    let n = 0;
    html = html.replace(pattern(en), () => {
      n++;
      slots.push(tr);
      return "\u0001" + (slots.length - 1) + "\u0002";
    });
    if (!n) report.missing.push(en);
  }
  html = html.replace(/\u0001(\d+)\u0002/g, (_, i) => slots[i]);
  html = html.replace(/\u0003(\d+)\u0003/g, (_, i) => scripts[i]);

  // Relative asset paths to absolute: the copy is served from /ko/ etc.
  html = html.replace(/(\s(?:src|href|data-lightbox|data-src)=")(?![a-z][a-z0-9+.-]*:|\/|#|")/gi, "$1/");
  html = html.replace(/\ssrcset="([^"]*)"/g, (_, set) =>
    ' srcset="' + set.split(",").map((s) => s.trim()).map((s) => (/^(\/|[a-z]+:)/i.test(s) ? s : "/" + s)).join(", ") + '"');

  const must = (from, to) => {
    if (!html.includes(from)) throw new Error(`${file}: the English page no longer has ${from}`);
    html = html.replace(from, to);
  };
  must('<html lang="en">', `<html lang="${d.lang}"${d.dir === "rtl" ? ' dir="rtl"' : ""}>`);
  must(`<link rel="canonical" href="${SITE}/" />`, `<link rel="canonical" href="${SITE}${d.path}" />`);
  must(`<meta property="og:url" content="${SITE}/" />`, `<meta property="og:url" content="${SITE}${d.path}" />`);
  must('<span class="lang-code">EN</span>', `<span class="lang-code">${d.code}</span>`);
  must(' aria-current="page">English</a>', ">English</a>");
  html = html.replace(new RegExp(`(<a href="${d.path}" hreflang="[^"]+" lang="[^"]+"(?: dir="rtl")?)>`), '$1 aria-current="page">');

  const tag = encodeURIComponent(` (${d.name} page)`);
  html = html.replace(/(\?subject=)([^"]+)"/g, `$1$2${tag}"`);
  html = html.replace(/data-mail="([^"]+)"/g, `data-mail="$1${tag}"`);

  const i18n = {
    ...d.js,
    askUrl: d.path + "ask.json",
    mailSubject: `Tennis lessons (${d.name} page)`,
    mailSubjectQuestion: `Question about lessons (${d.name} page)`,
  };
  must('  <script src="/tennis.js', `  <script>window.I18N = ${JSON.stringify(i18n).replace(/</g, "\\u003c")};</script>\n  <script src="/tennis.js`);

  must("<!DOCTYPE html>\n", `<!DOCTYPE html>\n<!-- Built by tools/i18n/build.mjs from index.html and tools/i18n/${file}.\n     Edit those and run it again; changes made here are overwritten. -->\n`);
  return html;
}

/* An English string as a pattern: any run of whitespace matches any
   other, and a string that starts or ends with a letter only matches
   whole words, so "About" can't match inside "Abouts". */
function pattern(en) {
  const s = en.trim();
  const body = s.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  const pre = /^[\p{L}\p{N}]/u.test(s) ? "(?<![\\p{L}\\p{N}])" : "";
  const post = /[\p{L}\p{N}]$/u.test(s) ? "(?![\\p{L}\\p{N}])" : "";
  return new RegExp(pre + body + post, "gu");
}

/* What a reader sees or hears: text between tags, plus the attributes
   that are read out or shown. Used to spot English left behind. */
function units(html) {
  const s = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[\s\S]*?<\/\1>/g, "");
  const out = new Set();
  for (const t of s.split(/<[^>]+>/)) {
    const v = t.replace(/\s+/g, " ").trim();
    if (v) out.add(v);
  }
  for (const m of s.matchAll(/\s(?:alt|aria-label|placeholder|title|data-caption|data-text)="([^"]+)"/g)) out.add(m[1].trim());
  for (const m of s.matchAll(/<meta (?:name="description"|property="og:(?:title|description)")\s+content="([^"]+)"/g)) out.add(m[1].replace(/\s+/g, " ").trim());
  return out;
}

/* --------------------------------------------------------- The answers --
   The English file decides which topics exist, their buttons and where
   they lead; the dictionary only supplies the words. Jev keeps choosing
   from the English topics (the Worker reads public/ask.json), so the ids
   here have to match those exactly. */
function answers(d, file, report) {
  const a = d.ask;
  const label = (l) => {
    if (!l) return l;
    if (!a.labels[l]) report.missing.push("chat button label: " + l);
    return a.labels[l] || l;
  };
  const topics = askEn.topics.map((t) => {
    const tr = a.topics[t.id];
    if (!tr) report.missing.push("chat answer: " + t.id);
    const out = { id: t.id, answer: tr ? tr.answer : t.answer };
    if (t.actions) {
      out.actions = t.actions.map((x) => {
        const y = { ...x };
        if (y.label) y.label = label(y.label);
        if (y.subject) y.subject += ` (${d.name} page)`;
        return y;
      });
    }
    if (t.next) out.next = tr && tr.next ? tr.next : t.next;
    return out;
  });
  for (const id of Object.keys(a.topics)) {
    if (!askEn.topics.some((t) => t.id === id)) report.missing.push("chat answer for a topic the English no longer has: " + id);
  }
  return {
    _readme: `Built by tools/i18n/build.mjs from ask.json and tools/i18n/${file}; edit those, not this. The Worker still picks topics from the English file.`,
    greeting: a.greeting,
    fallback: a.fallback,
    unavailable: a.unavailable,
    topics,
    fallback_next: a.fallback_next,
  };
}
