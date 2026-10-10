// raw.json + videos.json + diagrams → public/admin/drills/data.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
import { DIAGRAMS } from './diagrams.mjs';

const NOTES = path.join(REPO, 'research_notes/Tennis drills by age and skill');
const OUT = path.join(REPO, 'public/admin/drills/data.js');
const raw = JSON.parse(fs.readFileSync(path.join(HERE, 'cache/raw.json'), 'utf8'));
const vmeta = JSON.parse(fs.readFileSync(path.join(HERE, 'cache/videos.json'), 'utf8'));

const STAGES = ['tots', 'red', 'orange', 'green', 'yellow', 'teen', 'adult', 'senior'];
const STAGE_RE = {
  tots: /\btots?\b|\b3-5\b|pre-red/i,
  red: /\bred\b/i,
  orange: /\borange\b/i,
  green: /\bgreen\b/i,
  yellow: /\byellow\b/i,
  teen: /\bteens?\b|14[-–]18|high school/i,
  adult: /\badults?\b|league/i,
  senior: /\bseniors?\b/i,
};
const WORD = '(tots?|red|orange|green|yellow|teens?|adults?|seniors?)';
const RANGE = new RegExp(`${WORD}[^;.]*?\\b(?:to|through)\\s+(?:adult\\s+)?${WORD}`, 'gi');
const norm = w => { w = w.toLowerCase(); return w.startsWith('tot') ? 'tots' : w.startsWith('teen') ? 'teen' : w.startsWith('adult') ? 'adult' : w.startsWith('senior') ? 'senior' : w; };

const STAGE_OVERRIDE = {
  gd21: ['green', 'adult'],
  gd34: ['green', 'yellow', 'teen', 'adult', 'senior'],
  tm6: ['green', 'yellow', 'teen', 'adult', 'senior'],
  nf11: ['red', 'orange', 'green', 'yellow', 'teen', 'adult', 'senior'],
  nf13: ['yellow', 'teen', 'adult'],
  td12: ['green', 'yellow', 'teen', 'adult', 'senior'],
  gd36: ['yellow', 'teen', 'adult', 'senior'],
  gd31: ['green', 'yellow', 'teen', 'adult'],
};

function stagesOf(d) {
  if (STAGE_OVERRIDE[d.id]) return STAGE_OVERRIDE[d.id];
  let t = (d.ages || '').replace(/\*?Not for[^.;*]*[.;*]*/gi, '');
  const set = new Set();
  for (const s of STAGES) if (STAGE_RE[s].test(t)) set.add(s);
  for (const m of t.matchAll(RANGE)) {
    const a = STAGES.indexOf(norm(m[1])), b = STAGES.indexOf(norm(m[2]));
    if (a >= 0 && b > a) for (let i = a; i <= b; i++) set.add(STAGES[i]);
  }
  if (/\ball (stages|ages)\b|^all\b/i.test(t)) for (const s of STAGES.slice(d.area === 'kids' ? 0 : 3)) set.add(s);
  return STAGES.filter(s => set.has(s));
}

function levelsOf(d) {
  const t = (d.level || '').toLowerCase();
  const set = new Set();
  if (/first-timer|beginner/.test(t)) set.add('beg');
  if (/developing|intermediate/.test(t)) set.add('int');
  if (/ready to move up|advanced/.test(t)) set.add('adv');
  if (/\ball\b/.test(t) || /beginner\s*(to|–|-|→)\s*advanced/.test(t)) ['beg', 'int', 'adv'].forEach(x => set.add(x));
  if (!set.size) set.add('int');
  return ['beg', 'int', 'adv'].filter(x => set.has(x));
}

const SKILL_RULES = [
  ['coord', /coordination|tracking|receiving|sending|hand.eye/i],
  ['forehand', /forehand/i],
  ['backhand', /backhand|two-hand|one-hand/i],
  ['rally', /\brally|consistency|depth|direction|topspin|defen[cs]e|angle/i, ['kids', 'ground']],
  ['serve', /serve|toss/i],
  ['return', /return/i],
  ['net', /volley|approach|transition|\bnet\b/i],
  ['overhead', /overhead|smash/i],
  ['footwork', /movement|footwork|agility|recovery|conditioning|first step|reaction|balance|mobility|split/i],
  ['tactics', /tactic|point play|singles|scoring|game/i],
  ['doubles', /doubles/i],
  ['mental', /mental|focus|pressure|concentration/i],
  ['group', /group|cardio|social/i],
];
function skillsOf(d) {
  const t = d.skill || '';
  const set = new Set();
  for (const [k, re, areas] of SKILL_RULES) if (re.test(t) && (!areas || areas.includes(d.area))) set.add(k);
  if (d.area === 'ground' && /slice/i.test(t)) set.add('backhand');
  if (d.area === 'serve' && /^serve/i.test(t)) { set.delete('tactics'); }
  if (d.area === 'tactics' && /return/i.test(t)) set.add('return');
  if (!set.size) set.add({ kids: 'coord', ground: 'rally', serve: 'serve', net: 'net', tactics: 'tactics' }[d.area]);
  return [...set];
}

// which videos are flagged as showing exactly this drill
function videoList(text, ids) {
  return ids.map(id => {
    const line = (text || '').split(/\n|;\s(?=https?:)/).find(l => l.includes(id)) || '';
    const exact = /\bexact\b/i.test(line) && !/not drill-identical/i.test(line) || /\bexact\b/i.test((text || '').split('\n')[0]) && ids.length === 1;
    return exact ? [id, 1] : [id];
  });
}

const clean = s => (s || '').replace(/\r/g, '').trim();
const firstSentence = s => {
  const t = (s || '').replace(/s*((?:[A-Z]d{1,2}(?:,s*)?)+)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*?|\[A\]|\[added\]|\*?\(added[^)]*\)\*?|\(inferred\)/gi, '').replace(/\s+/g, ' ').trim();
  const m = t.match(/^.{20,170}?[.;](?=\s|$)/);
  return (m ? m[0] : t.slice(0, 160)).replace(/[;.]$/, '');
};

const drills = raw.drills.map(d => {
  const out = {
    id: d.id, a: d.area, n: d.name.replace(/\s+/g, ' ').trim(),
    st: stagesOf(d), lv: levelsOf(d), sk: skillsOf(d),
    sum: firstSentence(d.works || d.steps),
    ages: clean(d.ages), level: clean(d.level), skill: clean(d.skill), works: clean(d.works),
    players: clean(d.players), setup: clean(d.setup), steps: clean(d.steps), cues: clean(d.cues),
    prog: clean(d.progression), reg: clean(d.regression), src: clean(d.source),
    v: videoList(d.video, d.videoIds), dg: DIAGRAMS[d.id] || '',
  };
  for (const k of Object.keys(out)) if (out[k] === '' || (Array.isArray(out[k]) && !out[k].length && k !== 'v')) delete out[k];
  return out;
});

// faults
const FAULT_SKILL = { g: null, s: null, n: null, t: null };
function faultSkills(f) {
  const t = `${f.name} ${f.looks || ''}`;
  if (f.area === 'ground') {
    const s = [];
    if (/two-hand|one-hand|backhand|slice/i.test(t)) s.push('backhand');
    if (/forehand/i.test(t) || !s.length) s.push('forehand');
    if (/split|flat feet|spacing/i.test(f.name)) s.push('footwork');
    return s;
  }
  if (f.area === 'serve') return /overhead/i.test(f.name) ? ['overhead'] : /return/i.test(f.name) ? ['return'] : ['serve'];
  if (f.area === 'net') return /split|recover|feet|crossing|reaching|backpedal/i.test(f.name) ? ['footwork'] : ['net'];
  if (f.area === 'tactics') return /doubles|net player|lob/i.test(f.name) ? ['doubles'] : /focus|pressure|routine|self-talk|close|choking|tight/i.test(f.name) ? ['mental'] : ['tactics'];
  return ['coord'];
}
const faults = raw.faults.map(f => ({
  id: f.id, a: f.area, n: f.name.replace(/\s*\(bonus\)/i, '').replace(/\s+/g, ' ').trim(), sk: faultSkills(f),
  looks: clean(f.looks), cause: clean(f.cause), fix: clean(f.fix || f.cues), drills: clean(f.drills),
  d: f.drillIds, v: f.videoIds,
}));

// kids fault → game table
{
  const text = fs.readFileSync(`${NOTES}/red_orange_kids_games.md`, 'utf8');
  const i = text.indexOf('#### Fault → corrective game map');
  const rows = text.slice(i).split('\n').filter(l => /^\|/.test(l)).slice(2);
  rows.forEach((r, n) => {
    const [, fault, games, cue] = r.split('|').map(s => s.trim());
    const d = [...games.matchAll(/\((\d+)\)/g)].map(m => 'k' + m[1]);
    faults.push({ id: 'kf' + (n + 1), a: 'kids', n: fault, sk: ['kids'], fix: cue, drills: games, d, v: [] });
  });
}

// video library: every verified id, tagged by what points at it
const vids = {};
for (const [id, m] of Object.entries(vmeta)) if (!m.err) vids[id] = { t: m.t, c: m.c, sk: new Set(), st: new Set() };
for (const d of drills) for (const [id] of d.v) if (vids[id]) { d.sk.forEach(s => vids[id].sk.add(s)); d.st.forEach(s => vids[id].st.add(s)); }
for (const f of faults) for (const id of f.v) if (vids[id]) f.sk.forEach(s => vids[id].sk.add(s === 'kids' ? 'coord' : s));
const AREA_SKILL = { kids: 'coord', ground: 'rally', serve: 'serve', net: 'net', tactics: 'tactics' };
for (const v of raw.videoIds) if (vids[v.id] && !vids[v.id].sk.size) vids[v.id].sk.add(AREA_SKILL[v.area]);
const videos = Object.fromEntries(Object.entries(vids).map(([id, v]) => [id, { t: v.t, c: v.c, sk: [...v.sk], st: [...v.st] }]));

const data = { built: '2026-10-09', drills, faults, videos };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, '// Built from the research notes by the drill-library build script. Do not edit by hand.\nwindow.DRILLS_DATA = ' + JSON.stringify(data) + ';\n');

// report
const count = (arr, key) => arr.reduce((a, x) => { for (const k of x[key] || []) a[k] = (a[k] || 0) + 1; return a; }, {});
console.log('drills', drills.length, 'faults', faults.length, 'videos', Object.keys(videos).length, 'bytes', fs.statSync(OUT).size);
console.log('stages', JSON.stringify(count(drills, 'st')));
console.log('levels', JSON.stringify(count(drills, 'lv')));
console.log('skills', JSON.stringify(count(drills, 'sk')));
console.log('no stage:', drills.filter(d => !d.st || !d.st.length).map(d => d.id).join(' '));
console.log('no diagram:', drills.filter(d => !d.dg).map(d => d.id).join(' '));
console.log('exact videos:', drills.reduce((a, d) => a + d.v.filter(v => v[1]).length, 0));
console.log('kids faults', faults.filter(f => f.a === 'kids').map(f => f.n.slice(0, 30) + '→' + f.d.join(',')).join(' | '));

// videos from the age guide (stage-tagged), merged after the main build
{
  const age = JSON.parse(fs.readFileSync(path.join(HERE, 'cache/agevideos.json'), 'utf8'));
  const STAGE_OF = {
    tots: ['WMLtpl30zqk', '9l3t-awNkeM', 'ayf_DKgi-Ys'],
    red: ['lkwawy09alg', '7xNJdW18KSA', 'n58MYRvWzww', 'HPVCJg784Jw', 'M30ze_Z9szI', 'z0pM9jEw9Fs'],
    orange: ['JhCe7LuftZs', 'jox_GF8xiDU', 'BvzYFe482YQ'],
    green: ['qeGeYuSz40s', 'yrNjehla-ag'],
    yellow: ['DtBMp8_ZCx4', 'nv5hr5Za4TI'],
    teen: ['sgC4uI4911s', 'FSLGu_--E5Q', 'okv0xvTs8KY'],
    adult: ['a5OnlJ0kdmI', 'ZW3Q85Yczo4', 'n787-oFXpgo', '3xJoL1TXMy8', 'qD879Py0e1o', 'EPrfJDmk4jQ', 'IfvtQgdE0BY', 'DPkE_4_PtH8'],
    senior: ['x_hA1qDkQ_0', 'Kubafd_lzCU', '4KTGlCGGc_M'],
  };
  for (const [st, ids] of Object.entries(STAGE_OF)) for (const id of ids) {
    if (!age[id] || age[id].err) continue;
    const v = data.videos[id] || (data.videos[id] = { t: age[id].t, c: age[id].c, sk: ['guide'], st: [] });
    if (!v.st.includes(st)) v.st.push(st);
    if (!v.sk.includes('guide')) v.sk.push('guide');
  }
  fs.writeFileSync(OUT, '// Built from the research notes by the drill-library build script. Do not edit by hand.\nwindow.DRILLS_DATA = ' + JSON.stringify(data) + ';\n');
  console.log('videos incl. age guide', Object.keys(data.videos).length);
}

// The Worker's copy of the problems, for the drill library's "describe a
// student" route: each problem's name and what it looks like, in plain
// words, so Jev can say which ones a coach's note describes.
{
  const plain = s => String(s || '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '')
    .replace(/\*\*?|\[A\]|\[added\]|\*?\((?:added|inferred)[^)]*\)\*?/gi, '')
    .replace(/\s*—\s*$/g, '').replace(/\s+/g, ' ').trim();
  const firstSentence = s => { const t = plain(s); const m = t.match(/^.{20,220}?[.;](?=\s|$)/); return (m ? m[0] : t.slice(0, 220)).replace(/[;.]$/, ''); };
  const AREA_NOTE = { kids: 'a young child (about 3–10)', ground: 'forehand or backhand', serve: 'serve, return or overhead', net: 'net play or footwork', tactics: 'tactics, doubles or the mental game' };
  const list = faults.map(f => ({
    id: f.id,
    area: AREA_NOTE[f.a],
    problem: plain(f.n),
    looks: f.looks ? firstSentence(f.looks) : '',
  }));
  const WORKER = path.join(REPO, 'worker/src/drill-faults.js');
  fs.writeFileSync(WORKER, '// Built by tools/drills/build.mjs from the drill library\'s research notes. Do not edit by hand.\nexport const DRILL_FAULTS = ' + JSON.stringify(list, null, 1) + ';\n');
  console.log('worker faults', list.length);
}
