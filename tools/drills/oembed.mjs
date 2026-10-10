import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const raw = JSON.parse(fs.readFileSync(path.join(HERE, 'cache/raw.json'), 'utf8'));
const ids = raw.videoIds.map(v => v.id);
const out = {};
let i = 0;
async function worker() {
  while (i < ids.length) {
    const id = ids[i++];
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}&format=json`;
    try {
      const r = await fetch(url);
      if (r.ok) { const j = await r.json(); out[id] = { t: j.title, c: j.author_name }; }
      else out[id] = { err: r.status };
    } catch (e) { out[id] = { err: String(e.message) }; }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
fs.writeFileSync(path.join(HERE, 'cache/videos.json'), JSON.stringify(out, null, 1));
const bad = Object.entries(out).filter(([, v]) => v.err);
console.log('checked', ids.length, 'ok', ids.length - bad.length, 'bad', bad.map(([k, v]) => k + ':' + v.err).join(' '));
