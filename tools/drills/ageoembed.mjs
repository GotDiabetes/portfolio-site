import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const ids = JSON.parse(fs.readFileSync(path.join(HERE, 'cache/ageids.json'), 'utf8'));
const out = {};
await Promise.all(ids.map(async id => {
  const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}&format=json`);
  out[id] = r.ok ? (j => ({ t: j.title, c: j.author_name }))(await r.json()) : { err: r.status };
}));
fs.writeFileSync(path.join(HERE, 'cache/agevideos.json'), JSON.stringify(out, null, 1));
console.log(Object.entries(out).map(([k, v]) => k + (v.err ? ' ERR ' + v.err : ' ok')).join('\n'));
