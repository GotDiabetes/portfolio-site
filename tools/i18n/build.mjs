/* ============================================================================
   Builds the translated tennis pages from the English ones.

       node tools/i18n/build.mjs          every language
       node tools/i18n/build.mjs ko fa    just these

   The English pages (public/index.html, and the practice tips, flyer and
   gift card pages listed in PAGES) and the English chat answers
   (public/ask.json) are the source. Each dictionary here (ko.mjs, es.mjs
   ...) holds that language's version of every piece of English on those
   pages, and this writes public/<path>/index.html, public/<path>/tips/ and
   so on, and public/<path>/ask.json from them. Nothing is translated at
   run time and nothing is fetched: the output is plain static HTML like
   the rest of the site, and the deploy doesn't run this. Run it after
   editing the English, and commit what it writes.

   The practice tips page is partly made from ask.json: each
   <div class="tips" data-tips="tip_… tip_…"> is filled with those topics'
   titles and answers, in English on public/tips/index.html itself (this
   rewrites that part of it) and from the dictionaries' chat answers on the
   translated copies. So a tip is edited once, in ask.json, for the chat and
   the page alike.

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
       lives one folder down; links between the built pages (tips/, /#lessons)
       stay inside the language's folder;
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
  "isaacleetennis@gmail.com", "Grip N Rip", "LifeSport Libertyville", "RSPA",
  "leetennisco.com",
  // the language menu names every language in itself
  "English", "Español", "한국어", "简体中文", "繁體中文", "日本語", "Tiếng Việt", "فارسی", "EN",
];

/* The pages that are built in every language: the front page, then the
   ones under it. `sub` is the folder under the language's own. */
const PAGES = [
  { file: "index.html", sub: "" },
  { file: "tips/index.html", sub: "tips/" },
  { file: "flyer/index.html", sub: "flyer/" },
  { file: "gift-card/index.html", sub: "gift-card/" },
];
const SUBS = PAGES.map((p) => p.sub).filter(Boolean);

const askEn = JSON.parse(readFileSync(join(PUBLIC, "ask.json"), "utf8"));
for (const pg of PAGES) {
  const path = join(PUBLIC, pg.file);
  pg.english = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  // The English tips come from ask.json too; refresh them in place.
  const filled = fillTips(pg.english, (id) => askEn.topics.find((t) => t.id === id));
  if (filled !== pg.english) { writeFileSync(path, filled); pg.english = filled; }
}
const englishUnits = new Set(PAGES.flatMap((pg) => [...units(pg.english)]));
const only = process.argv.slice(2);

let failed = false;
for (const file of readdirSync(HERE).filter((f) => /^[a-z-]+\.mjs$/.test(f) && f !== "build.mjs").sort()) {
  let d = (await import(pathToFileURL(join(HERE, file)))).default;
  if (d.dir === "rtl") d = { ...d, pairs: d.pairs.map(([en, tr]) => [en, isolatePrices(tr)]), js: isolatePrices(d.js), ask: isolatePrices(d.ask) };
  if (only.length && !only.includes(d.lang.toLowerCase()) && !only.includes(file.replace(".mjs", ""))) continue;

  const report = { missing: [], untranslated: [], used: new Map() };
  const keep = new Set([...KEEP, ...(d.keep || [])]);
  const words = (u) => /\p{L}{2}/u.test(u.replace(/&[a-z0-9#]+;/gi, ""));   // "&times;" is not English
  const base = join(PUBLIC, d.path.replace(/^\/|\/$/g, ""));

  for (const pg of PAGES) {
    const html = page(d, file, report, pg);
    const out = join(base, pg.sub);
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "index.html"), html);
    for (const u of units(html)) {
      if (englishUnits.has(u) && words(u) && !keep.has(u)) report.untranslated.push((pg.sub || "/") + "  " + u);
    }
  }
  // A dictionary string is stale only when no page has it any more.
  for (const [en] of d.pairs) if (!report.used.get(en)) report.missing.push(en);

  const ask = answers(d, file, report);
  writeFileSync(join(base, "ask.json"), JSON.stringify(ask, null, 2) + "\n");

  const bad = report.missing.length + report.untranslated.length;
  console.log(`${bad ? "✗" : "✓"} ${d.path}  (${d.pairs.length} strings, ${ask.topics.length} answers, ${PAGES.length} pages)`);
  for (const m of report.missing) console.log("    no longer on the English page: " + m.slice(0, 110));
  for (const u of report.untranslated) console.log("    still in English:              " + u.slice(0, 110));
  if (bad) failed = true;
}
if (failed) {
  console.log("\nSome pages are out of step with the English. Update the dictionaries above and run this again.");
  process.exitCode = 1;
}

/* ----------------------------------------------------------- The page -- */
function page(d, file, report, pg) {
  const where = `${file}, ${pg.file}`;
  /* The tips come from the dictionary's chat answers, before anything else
     (the markers are comments), and are then set aside with the scripts so
     no dictionary string can land inside a translated tip. */
  let html = fillTips(pg.english, (id) => {
    const tr = d.ask.topics[id];
    if (!tr || !tr.title) { report.missing.push("tips page: no translated title for " + id); return null; }
    return tr;
  });
  html = html.replace(/[ \t]*<!--[\s\S]*?-->[ \t]*\n?/g, "");

  /* Scripts are code, not copy: set aside so no string can land in one.
     (The structured data block is left in: it is data in English.) */
  const kept = [];
  html = html.replace(/<script\b[\s\S]*?<\/script>|<div class="tips" data-tips="[^"]*">[\s\S]*?<\/div>/g, (m) => {
    kept.push(m);
    return "\u0003" + (kept.length - 1) + "\u0003";
  });

  const slots = [];
  for (const [en, tr] of [...d.pairs].sort((a, b) => b[0].length - a[0].length)) {
    let n = 0;
    html = html.replace(pattern(en), () => {
      n++;
      slots.push(tr);
      return "\u0001" + (slots.length - 1) + "\u0002";
    });
    report.used.set(en, (report.used.get(en) || 0) + n);
  }
  html = html.replace(/\u0001(\d+)\u0002/g, (_, i) => slots[i]);
  html = html.replace(/\u0003(\d+)\u0003/g, (_, i) => kept[i]);

  /* Relative paths to absolute: the copy is served from /ko/ etc. Except a
     link to another built page (tips/), which stays relative so it lands
     on that page in the same language. */
  html = html.replace(/(\s(?:src|href|data-lightbox|data-src)=")(?![a-z][a-z0-9+.-]*:|\/|#|")([^"]*)/gi,
    (m, attr, path) => (SUBS.some((s) => path.startsWith(s)) ? m : attr + "/" + path));
  html = html.replace(/\ssrcset="([^"]*)"/g, (_, set) =>
    ' srcset="' + set.split(",").map((s) => s.trim()).map((s) => (/^(\/|[a-z]+:)/i.test(s) ? s : "/" + s)).join(", ") + '"');
  /* Root links to the built pages (/, /#lessons, /tips/) go to this
     language's copy, except in the language menu, which names each one. */
  const pageLink = new RegExp(`(\\shref=")\\/((?:#[^"]*)?"|(?:${SUBS.map((s) => s.replace(/[-/]/g, "\\$&")).join("|")})[^"]*")`, "g");
  html = html.replace(/<a\b[^>]*>/g, (tag) => (/\shreflang=/.test(tag) ? tag : tag.replace(pageLink, `$1${d.path}$2`)));

  const must = (from, to) => {
    if (!html.includes(from)) throw new Error(`${where}: the English page no longer has ${from}`);
    html = html.replace(from, to);
  };
  const here = d.path + pg.sub;
  must('<html lang="en">', `<html lang="${d.lang}"${d.dir === "rtl" ? ' dir="rtl"' : ""}>`);
  if (html.includes('rel="canonical"')) {
    must(`<link rel="canonical" href="${SITE}/${pg.sub}" />`, `<link rel="canonical" href="${SITE}${here}" />`);
    must(`<meta property="og:url" content="${SITE}/${pg.sub}" />`, `<meta property="og:url" content="${SITE}${here}" />`);
  }
  if (html.includes('class="lang-code"')) must('<span class="lang-code">EN</span>', `<span class="lang-code">${d.code}</span>`);
  // The language menu (or the printed pages' language row) marks this one.
  if (html.includes(' aria-current="page">English</a>')) {
    html = html.replace(' aria-current="page">English</a>', ">English</a>");
    html = html.replace(new RegExp(`(<a href="${here}" hreflang="[^"]+" lang="[^"]+"(?: dir="rtl")?)>`), '$1 aria-current="page">');
  }

  const tag = encodeURIComponent(` (${d.name} page)`);
  html = html.replace(/(\?subject=)([^"]+)"/g, `$1$2${tag}"`);
  html = html.replace(/data-mail="([^"]+)"/g, `data-mail="$1${tag}"`);

  const i18n = {
    ...d.js,
    lang: d.path.replace(/\//g, ""),
    pageName: d.name,
    askUrl: d.path + "ask.json",
    mailSubject: `Tennis lessons (${d.name} page)`,
    mailSubjectQuestion: `Question about lessons (${d.name} page)`,
  };
  // Just before the page's first script file.
  const first = html.search(/\n[ \t]*<script src="\//);
  if (first < 0) throw new Error(`${where}: no script file to put window.I18N before`);
  html = html.slice(0, first) + `\n  <script>window.I18N = ${JSON.stringify(i18n).replace(/</g, "\\u003c")};</script>` + html.slice(first);

  must("<!DOCTYPE html>\n", `<!DOCTYPE html>\n<!-- Built by tools/i18n/build.mjs from ${pg.file} and tools/i18n/${file}.\n     Edit those and run it again; changes made here are overwritten. -->\n`);
  return html;
}

/* Fills each <div class="tips" data-tips="tip_a tip_b"> … </div><!-- /tips -->
   with those topics as <article class="tip fade">: the title as its heading,
   then the answer. get(id) gives the topic in the page's language. */
function fillTips(html, get) {
  return html.replace(/(<div class="tips" data-tips="([^"]+)">)[\s\S]*?(<\/div><!-- \/tips -->)/g, (m, open, ids, close) => {
    const items = ids.trim().split(/\s+/).map((id) => {
      const t = get(id);
      if (!t) return "";
      if (!t.title) throw new Error(`ask.json: tip ${id} needs a "title" for the tips page`);
      const slug = id.replace(/^tip_/, "").replace(/_/g, "-");
      return `\n          <article class="tip fade" id="${slug}">\n            <h3>${escapeHtml(t.title)}</h3>\n            <p>${escapeHtml(t.answer)}</p>\n          </article>`;
    });
    return open + items.join("") + "\n        " + close;
  });
}
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

/* Right-to-left pages: a dollar price that follows Persian words is read
   by the bidi algorithm as an Arabic-context number, which moves the $ to
   the wrong side ("375$"). Each price is wrapped in an invisible isolate
   (LRI … PDI) so it reads "$375" wherever it sits. */
function isolatePrices(v) {
  if (typeof v === "string") return v.replace(/\$\d[\d,.]*/g, (m) => "⁦" + m + "⁩");
  if (Array.isArray(v)) return v.map(isolatePrices);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, isolatePrices(x)]));
  return v;
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
   here have to match those exactly.

   Each translated topic carries "src", a fingerprint of the English it was
   translated from (answer, parent wording, follow-ups). When the English
   changes, the fingerprints stop matching and the build says which
   translations are out of date; after updating one, set its src to the
   value the message gives. The chat's fixed lines (greeting, fallback and
   so on) share one fingerprint, ask.src. */
function fingerprint(value) {
  let h = 2166136261;
  for (const ch of JSON.stringify(value)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
function topicSource(t) { return fingerprint([t.answer, t.answer_parent || "", t.next || []]); }
function linesSource(a) { return fingerprint([a.greeting, a.fallback, a.unavailable, a.misuse || "", a.personal || "", a.fallback_next || []]); }

function answers(d, file, report) {
  const a = d.ask;
  const label = (l) => {
    if (!l) return l;
    if (!a.labels[l]) report.missing.push("chat button label: " + l);
    return a.labels[l] || l;
  };
  if (a.src !== linesSource(askEn)) report.missing.push(`chat greeting/fallback lines changed in English (set ask.src to "${linesSource(askEn)}" once updated)`);
  const topics = askEn.topics.map((t) => {
    const tr = a.topics[t.id];
    if (!tr) report.missing.push("chat answer: " + t.id);
    else if (tr.src !== topicSource(t)) report.missing.push(`chat answer changed in English: ${t.id} (set its src to "${topicSource(t)}" once updated)`);
    if (t.answer_parent && tr && !tr.answer_parent) report.missing.push("chat parent wording: " + t.id);
    if (t.title && tr && !tr.title) report.missing.push("tip title: " + t.id);
    const out = { id: t.id };
    if (t.title) out.title = tr && tr.title ? tr.title : t.title;
    out.answer = tr ? tr.answer : t.answer;
    if (t.answer_parent) out.answer_parent = tr && tr.answer_parent ? tr.answer_parent : t.answer_parent;
    if (t.actions) {
      out.actions = t.actions.map((x) => {
        const y = { ...x };
        if (y.label) y.label = label(y.label);
        if (y.subject) y.subject += ` (${d.name} page)`;
        // A link to a built page goes to this language's copy.
        if (y.href && SUBS.some((s) => y.href.startsWith("/" + s))) y.href = d.path + y.href.slice(1);
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
    misuse: a.misuse || askEn.misuse,
    personal: a.personal || askEn.personal,
    topics,
    fallback_next: a.fallback_next,
  };
}
