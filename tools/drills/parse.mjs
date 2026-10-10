// Parse the six research notes into one data file for the drill library.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');

const DIR = path.join(REPO, 'research_notes/Tennis drills by age and skill');
const FILES = [
  { file: 'red_orange_kids_games.md', pre: 'k', area: 'kids' },
  { file: 'groundstrokes.md', pre: 'g', area: 'ground' },
  { file: 'serve_return_overhead.md', pre: 's', area: 'serve' },
  { file: 'net_play_footwork.md', pre: 'n', area: 'net' },
  { file: 'tactics_doubles_mental.md', pre: 't', area: 'tactics' },
];

const HEAD_MD = /^#{4,5}\s+([A-Z]?\d{1,2})\.\s+(.+?)\s*$/;
const HEAD_BOLD = /^\*\*([A-Z]\d{1,2})\.\s+(.+?)\*\*\s*$/;
const YT = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/g;

const FIELD_KEYS = [
  ['ages', /^ages/i], ['level', /^level/i], ['skill', /^skill area/i],
  ['works', /^works on/i], ['players', /^players/i], ['setup', /setup/i],
  ['steps', /\bsteps\b/i], ['cues', /\bcues\b/i], ['progression', /^progression/i],
  ['regression', /^regression/i], ['source', /^sources?( url)?$/i], ['video', /^videos?/i],
  ['looks', /^what it looks like/i], ['cause', /^likely cause/i], ['fix', /^fix (cues|approach)/i],
  ['drills', /^corrective/i],
];

function keyOf(label) {
  for (const [k, re] of FIELD_KEYS) if (re.test(label.trim())) return k;
  return null;
}

function parseEntry(lines) {
  const f = {};
  let cur = null;
  for (const raw of lines) {
    if (!raw.trim() || /^---\s*$/.test(raw)) continue;
    const top = /^- /.test(raw);
    const line = raw.replace(/\*\*/g, '');
    const m = top && line.match(/^- ([A-Za-z][^:]{1,70}?)(?:\s*\([^)]*\))?:\s*(.*)$/);
    const k = m && keyOf(m[1]);
    if (k) {
      cur = k;
      let q = m[1].replace(/^(steps|setup|coaching cues|cues)\b[,\s]*/i, '').replace(/\s*(setup|steps)$/i, '').trim();
      if (!q || /^(\/|and\b|&)/.test(q) || q === m[1]) q = '';
      const val = (q ? `**${q}:** ` : '') + m[2].trim();
      f[k] = (f[k] ? f[k] + '\n' : '') + val;
    } else if (cur) {
      f[cur] += '\n' + raw.replace(/^\s*/, '');
    }
  }
  // "Progression: ... Regression: ..." on one line
  if (f.progression && !f.regression) {
    const i = f.progression.search(/\bRegression( \([^)]*\))?:/);
    if (i > 0) {
      f.regression = f.progression.slice(i).replace(/^Regression( \([^)]*\))?:\s*/, '');
      f.progression = f.progression.slice(0, i).trim();
    }
  }
  for (const k in f) f[k] = f[k].trim();
  return f;
}

const drills = [];
const faults = [];
const allVideos = new Map();

for (const { file, pre, area } of FILES) {
  const text = fs.readFileSync(path.join(DIR, file), 'utf8');
  const lines = text.split(/\r?\n/);
  for (const m of text.matchAll(YT)) {
    if (!allVideos.has(m[1])) allVideos.set(m[1], { area });
  }
  const entries = [];
  let curr = null;
  for (const line of lines) {
    const h = line.match(HEAD_MD) || line.match(HEAD_BOLD);
    if (h) {
      curr = { code: h[1], name: h[2].trim(), body: [] };
      entries.push(curr);
      continue;
    }
    if (/^#/.test(line) || /^\|/.test(line)) { curr = null; continue; }
    if (curr) curr.body.push(line);
  }
  for (const e of entries) {
    const f = parseEntry(e.body);
    const isFault = 'looks' in f || 'cause' in f;
    const id = `${pre}${e.code.toLowerCase()}`;
    const rec = { id, code: e.code, area, name: e.name.replace(/\*\*/g, ''), ...f };
    if (isFault) faults.push(rec); else if (f.setup || f.steps) drills.push(rec);
  }
}

const ids = new Set(drills.map(d => d.id));
for (const f of faults) {
  const pre = f.id[0];
  const refs = new Set();
  for (const m of (f.drills || '').matchAll(/\b([A-Z]\d{1,2})\b/g)) {
    const id = pre + m[1].toLowerCase();
    if (ids.has(id)) refs.add(id);
  }
  f.drillIds = [...refs];
}

function vids(s) {
  const out = [];
  for (const m of (s || '').matchAll(YT)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}
for (const d of drills) d.videoIds = vids(d.video);
for (const f of faults) f.videoIds = vids(f.video);

fs.writeFileSync(path.join(HERE, 'cache/raw.json'), JSON.stringify({ drills, faults, videoIds: [...allVideos].map(([id, v]) => ({ id, ...v })) }, null, 1));
console.log('drills', drills.length, 'faults', faults.length, 'videos', allVideos.size);
const missing = drills.filter(d => !d.ages || !d.setup || !d.steps || !d.cues);
console.log('drills missing fields:', missing.map(d => d.id + ':' + ['ages', 'setup', 'steps', 'cues'].filter(k => !d[k]).join('/')).join(' '));
console.log('faults w/o drill refs:', faults.filter(f => !f.drillIds.length).map(f => f.id).join(' '));
console.log('drills w/o video:', drills.filter(d => !d.videoIds.length).length);
console.log('per area:', JSON.stringify(drills.reduce((a, d) => (a[d.area] = (a[d.area] || 0) + 1, a), {})));
