/* ==========================================================================
   Drill library — the page. A small hash router over the data in data.js
   (drills, faults, videos) and guide.js (the age guide).

   #/                 drills, with filters in the query (?age=&skill=&level=&q=&video=1)
   #/drill/:id        one drill
   #/fix, #/fix/:id   problems and their fixes
   #/students, #/student/new, #/student/:id, #/student/:id/edit
   #/plan             the lesson-plan builder (?student=)
   #/ages, #/age/:k   the age guide
   #/videos           every checked video

   Students, lesson picks and the last plan live in localStorage, in this
   browser only. Nothing is sent anywhere.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DRILLS_DATA, G = window.AGE_GUIDE;
  const drills = D.drills, faults = D.faults, videos = D.videos;
  const byId = Object.fromEntries(drills.map(d => [d.id, d]));
  const faultById = Object.fromEntries(faults.map(f => [f.id, f]));
  const main = document.getElementById('main');

  const STAGES = [
    { k: 'tots', n: 'Tots', a: '3–5' }, { k: 'red', n: 'Red', a: '5–8' }, { k: 'orange', n: 'Orange', a: '8–10' },
    { k: 'green', n: 'Green', a: '9–11' }, { k: 'yellow', n: 'Yellow', a: '11–14' }, { k: 'teen', n: 'Teens', a: '14–18' },
    { k: 'adult', n: 'Adults', a: '18+' }, { k: 'senior', n: 'Seniors', a: '55+' },
  ];
  const ST = Object.fromEntries(STAGES.map((s, i) => [s.k, { ...s, i }]));
  const SKILLS = [
    { k: 'coord', n: 'Ball skills' }, { k: 'forehand', n: 'Forehand' }, { k: 'backhand', n: 'Backhand' },
    { k: 'rally', n: 'Rally & depth' }, { k: 'serve', n: 'Serve' }, { k: 'return', n: 'Return' },
    { k: 'net', n: 'Volley & net' }, { k: 'overhead', n: 'Overhead' }, { k: 'footwork', n: 'Footwork' },
    { k: 'tactics', n: 'Singles tactics' }, { k: 'doubles', n: 'Doubles' }, { k: 'mental', n: 'Mental' },
    { k: 'group', n: 'Group & cardio' },
  ];
  const SK = Object.fromEntries(SKILLS.map(s => [s.k, s]));
  const LEVELS = [{ k: 'beg', n: 'Beginner' }, { k: 'int', n: 'Intermediate' }, { k: 'adv', n: 'Advanced' }];
  const LV = Object.fromEntries(LEVELS.map(l => [l.k, l]));
  const AREA = {
    kids: { n: 'Kids\u2019 game', group: 'Young kids (tots, red & orange)' },
    ground: { n: 'Groundstrokes', group: 'Forehand & backhand' },
    serve: { n: 'Serve, return & overhead', group: 'Serve, return & overhead' },
    net: { n: 'Net play & footwork', group: 'Volleys, net play & footwork' },
    tactics: { n: 'Tactics, doubles & mental', group: 'Tactics, doubles & mental' },
  };
  const PREFIX = { kids: 'k', ground: 'g', serve: 's', net: 'n', tactics: 't' };

  /* ------------------------------------------------------------ helpers */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ltc-drills:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ltc-drills:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  const thumb = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  const PLAY = '<svg viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0 L10 6 L0 12 z"/></svg>';

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  // stage list → "Red–Orange, Adults"
  function stageRange(st) {
    if (!st || !st.length) return '';
    const idx = st.map(s => ST[s].i).sort((a, b) => a - b);
    const runs = [];
    for (const i of idx) { const r = runs[runs.length - 1]; if (r && i === r[1] + 1) r[1] = i; else runs.push([i, i]); }
    return runs.map(([a, b]) => a === b ? STAGES[a].n : `${STAGES[a].n}–${STAGES[b].n}`).join(', ');
  }
  const dots = st => `<span class="dots" aria-hidden="true">${(st || []).map(s => `<span class="dot s-${s}"></span>`).join('')}</span>`;
  const levelText = lv => (lv || []).length === 3 ? 'All levels' : (lv || []).map(l => LV[l].n).join(' / ');

  /* ------------------------------------------------------------ text → html */
  const BADGE = '<span class="adapt" title="A coach\u2019s adaptation or suggestion, not the source\u2019s own words">adapted</span>';
  function inline(raw, area) {
    let t = esc(raw);
    t = t.replace(/\*?\((?:added|coach suggestion): ([^)]*)\)\*?/gi, (m, x) => `${x} ${BADGE}`);
    t = t.replace(/\*?\[(?:A|added|coach suggestion)\]\*?|\*?\((?:added|inferred|inferred mapping|stage mapping inferred\.?|Stage mapping inferred\.?)\)\*?/gi, BADGE);
    t = t.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (m, txt, url) => `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`);
    t = t.replace(/(^|[\s(;])(https?:\/\/[^\s<);]+)/g, (m, p, url) => `${p}<a href="${url}" target="_blank" rel="noopener">${url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42)}${url.length > 52 ? '…' : ''}</a>`);
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:)]|$)/g, '$1<em>$2</em>');
    if (area) {
      const pre = PREFIX[area];
      t = t.replace(/(^|[^\w/=.-])([A-Z])(\d{1,2})\b(?![^<]*<\/a>)/g, (m, p, L, n) => {
        const id = pre + L.toLowerCase() + n;
        if (byId[id]) return `${p}<a class="xref" href="#/drill/${id}" title="${esc(byId[id].n)}">${L}${n}</a>`;
        if (faultById[id]) return `${p}<a class="xref" href="#/fix/${id}" title="${esc(faultById[id].n)}">${L}${n}</a>`;
        return m;
      });
    }
    return t;
  }
  function md(raw, area) {
    if (!raw) return '';
    const lines = String(raw).split('\n').map(l => l.trim()).filter(Boolean);
    const out = [];
    let list = null;
    const flush = () => { if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${i}</li>`).join('')}</${list.tag}>`); list = null; } };
    for (const line of lines) {
      const ul = line.match(/^[-*•]\s+(.*)$/), ol = line.match(/^\d{1,2}[.)]\s+(.*)$/);
      if (ul || ol) {
        const tag = ol ? 'ol' : 'ul';
        if (!list || list.tag !== tag) { flush(); list = { tag, items: [] }; }
        list.items.push(inline((ul || ol)[1], area));
        continue;
      }
      flush();
      // "(1) … (2) …" or "1) … 2) …" inside one paragraph → a numbered list
      const marks = line.match(/(?:^|\s)\(?\d{1,2}\)\s/g) || [];
      if (marks.length >= 2 && /(?:^|\s)\(?1\)\s/.test(line) && /\s\(?2\)\s/.test(line)) {
        const parts = line.split(/(?:^|\s)\(?\d{1,2}\)\s+/);
        const head = parts.shift().trim();
        if (head) out.push(`<p>${inline(head, area)}</p>`);
        out.push(`<ol>${parts.filter(p => p.trim()).map(p => `<li>${inline(p.trim(), area)}</li>`).join('')}</ol>`);
      } else out.push(`<p>${inline(line, area)}</p>`);
    }
    flush();
    return out.join('');
  }
  function cuesOf(raw) {
    const found = [];
    for (const m of String(raw || '').matchAll(/["\u201c]([^"\u201d\n]{3,56})["\u201d]/g)) {
      const c = m[1].trim().replace(/[.,;]$/, '');
      if (!found.includes(c) && !/^https?:/.test(c)) found.push(c);
    }
    return found.slice(0, 6);
  }

  /* ------------------------------------------------------------ diagrams */
  const dgCache = {};
  function diagram(d) {
    if (!d.dg) return null;
    return dgCache[d.id] || (dgCache[d.id] = Court.draw(d.dg, d.st));
  }
  function legend(spec) {
    const has = w => spec.split(/\s+/).some(w);
    const items = [];
    if (has(x => x[0] === '>')) items.push('<span><svg viewBox="0 0 22 12"><path class="lg-shot" d="M1 9 Q11 1 21 6"/></svg>Ball</span>');
    if (has(x => x[0] === '^')) items.push('<span><svg viewBox="0 0 22 12"><path class="lg-shot" stroke-dasharray="4 2" d="M1 11 Q11 -6 21 11"/></svg>Lob</span>');
    if (has(x => x[0] === '~')) items.push('<span><svg viewBox="0 0 22 12"><path class="lg-move" d="M1 6 L21 6"/></svg>Player moves</span>');
    if (has(x => /^C:/.test(x))) items.push('<span><svg viewBox="0 0 22 12"><circle class="lg-c" cx="11" cy="6" r="5"/></svg>Coach / feeder</span>');
    if (has(x => /^[A-WY]:/.test(x) && !/^[CZ]:/.test(x)) || has(x => /^scatter/.test(x))) items.push('<span><svg viewBox="0 0 22 12"><circle class="lg-p" cx="11" cy="6" r="5"/></svg>Player</span>');
    if (has(x => /^X:/.test(x))) items.push('<span><svg viewBox="0 0 22 12"><circle cx="11" cy="6" r="5" fill="#b9b9b3"/></svg>Waiting</span>');
    if (has(x => /^Z:/.test(x))) items.push('<span><svg viewBox="0 0 22 12"><rect class="lg-zone" x="2" y="1" width="18" height="10"/></svg>Target</span>');
    if (has(x => /^c:/.test(x))) items.push('<span><svg viewBox="0 0 22 12"><path class="lg-cone" d="M11 1 L16 11 L6 11 z"/></svg>Cone</span>');
    if (has(x => /^o:|^balls:/.test(x))) items.push('<span><svg viewBox="0 0 22 12"><circle cx="11" cy="6" r="3.5" fill="#d8e84a" stroke="#4c5212"/></svg>Ball / spot</span>');
    return items.join('');
  }

  /* ------------------------------------------------------------ cards */
  function card(d) {
    const g = diagram(d);
    const nv = d.v.length;
    return `<a class="card" href="#/drill/${d.id}">
      <div class="art">${g ? g.svg : '<div class="nodiag">No court needed</div>'}${nv ? `<span class="badge">${PLAY}${nv > 1 ? nv + ' videos' : 'Video'}</span>` : ''}</div>
      <div class="body">
        <div class="meta">${dots(d.st)}<span>${esc(stageRange(d.st))} · ${esc(levelText(d.lv))}</span></div>
        <h3>${esc(d.n)}</h3>
        <p>${esc(d.sum || '')}</p>
        <div class="tags">${d.sk.map(s => `<span class="tag">${esc(SK[s] ? SK[s].n : s)}</span>`).join('')}</div>
      </div></a>`;
  }
  function vtile(id, opts = {}) {
    const v = videos[id];
    if (!v) return '';
    return `<button class="vtile" type="button" data-video="${id}">
      <span class="vthumb"><img src="${thumb(id)}" alt="" loading="lazy" width="320" height="180">${opts.exact ? '<span class="vflag">Shows this drill</span>' : ''}<span class="vplay"><span>${PLAY}</span></span></span>
      <b>${esc(v.t)}</b><small>${esc(v.c)}</small></button>`;
  }

  // drills that suit a stage, best first: fewer stages listed = more specific, then videos
  function rank(list, stage) {
    return list.slice().sort((a, b) => {
      const sa = stage ? a.st.length : 0, sb = stage ? b.st.length : 0;
      const va = a.v.length ? (a.v.some(v => v[1]) ? 2 : 1) : 0, vb = b.v.length ? (b.v.some(v => v[1]) ? 2 : 1) : 0;
      return (sa - sb) || (vb - va);
    });
  }

  /* ------------------------------------------------------------ router */
  function parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
  }
  let lastList = '#/';
  function route() {
    const { parts, q } = parse();
    const [p0, p1, p2] = parts;
    closeModal();
    let nav = 'drills';
    if (!p0) { lastList = location.hash || '#/'; viewDrills(q); }
    else if (p0 === 'drill' && byId[p1]) viewDrill(byId[p1]);
    else if (p0 === 'fix' && p1 && faultById[p1]) { nav = 'fix'; viewFault(faultById[p1]); }
    else if (p0 === 'fix') { nav = 'fix'; viewFixes(q); }
    else if (p0 === 'students') { nav = 'students'; viewStudents(); }
    else if (p0 === 'student' && p1 === 'new') { nav = 'students'; viewStudentForm(null); }
    else if (p0 === 'student' && p2 === 'edit') { nav = 'students'; viewStudentForm(p1); }
    else if (p0 === 'student' && p1) { nav = 'students'; viewStudent(p1); }
    else if (p0 === 'plan') { nav = 'plan'; viewPlan(q); }
    else if (p0 === 'ages') { nav = 'ages'; viewAges(); }
    else if (p0 === 'age' && G.stages[p1]) { nav = 'ages'; viewAge(p1); }
    else if (p0 === 'videos') { nav = 'videos'; viewVideos(q); }
    else { location.hash = '#/'; return; }
    $$('.nav a').forEach(a => a.dataset.nav === nav ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    // Replay the arrival on every route.
    main.classList.remove('is-arriving');
    if (document.visibilityState === 'visible') { void main.offsetWidth; main.classList.add('is-arriving'); }
  }
  function go(hash, replace) {
    if (replace) { history.replaceState(null, '', hash); } else location.hash = hash;
  }
  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); main.focus({ preventScroll: true }); });

  /* ------------------------------------------------------------ view: drills */
  function viewDrills(q) {
    const state = { age: q.get('age') || '', skill: q.get('skill') || '', level: q.get('level') || '', q: q.get('q') || '', video: q.get('video') === '1', shown: 36 };
    document.title = 'Drill library — Lee Tennis Co.';
    const nVideos = Object.keys(videos).length;
    main.innerHTML = `
      <section class="hero">
        <div>
          <p class="eyebrow">For Isaac · coaching reference</p>
          <h1 class="h-display">Find the right drill for every student.</h1>
          <p class="lede">${drills.length} drills and games from USTA Net Generation, the LTA, Tennis Australia, Tennis Canada and top coaches. Pick an age, a skill or the problem you\u2019re fixing.</p>
          <div class="stats"><div><b>${drills.length}</b><span>drills &amp; games</span></div><div><b>${faults.length}</b><span>problems &amp; fixes</span></div><div><b>${nVideos}</b><span>checked videos</span></div><div><b>8</b><span>age stages</span></div></div>
        </div>
        <div class="hero-photos" aria-hidden="true">
          <img src="/images/forehand-600.webp" alt="" loading="lazy"><img src="/images/serve-600.webp" alt="" loading="lazy"><img src="/images/ready-600.webp" alt="" loading="lazy">
        </div>
      </section>
      ${jevPanel('jevHome', 'Describe a student and Jev places them', 'e.g. 9-year-old, can rally a little, serves underhand and gets upset when she misses')}
      <div class="quick">
        <a href="#/fix"><b>Fix a problem →</b><span>Late contact, waiter\u2019s tray, swinging at volleys…</span></a>
        <a href="#/students"><b>My students →</b><span>Save each player\u2019s age and focus; get their drills</span></a>
        <a href="#/plan"><b>Build a lesson →</b><span>Warm-up, skill, game, timed for their age</span></a>
        <a href="#/ages"><b>Age guide →</b><span>Court, ball, session length and milestones</span></a>
      </div>
      <section class="filters" aria-label="Filter drills">
        <div class="frow"><span class="flabel">Age</span><div class="chips scroll" id="fAge">${STAGES.map(s => `<button type="button" class="chip" data-v="${s.k}" aria-pressed="false"><span class="dot s-${s.k}"></span>${s.n}<small>${s.a}</small></button>`).join('')}</div></div>
        <div class="frow"><span class="flabel">Skill</span><div class="chips" id="fSkill">${SKILLS.map(s => `<button type="button" class="chip" data-v="${s.k}" aria-pressed="false">${s.n}</button>`).join('')}</div></div>
        <div class="frow"><span class="flabel">Level</span><div class="chips" id="fLevel">${LEVELS.map(s => `<button type="button" class="chip" data-v="${s.k}" aria-pressed="false">${s.n}</button>`).join('')}</div></div>
        <div class="frow"><span class="flabel">Search</span><div class="search"><input type="search" id="fQ" placeholder="Drill name, cue or problem — e.g. split step, toss, poach" aria-label="Search drills"><label class="toggle"><input type="checkbox" id="fVideo"> With video</label></div></div>
      </section>
      <div class="resultbar"><span id="count"></span><button type="button" class="linkbtn" id="fClear">Clear filters</button></div>
      <div class="grid" id="results"></div>
      <div class="more"><button type="button" class="btn quiet" id="moreBtn">Show more</button></div>`;

    const sync = () => {
      for (const [id, key] of [['fAge', 'age'], ['fSkill', 'skill'], ['fLevel', 'level']])
        $$('#' + id + ' .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state[key])));
      $('#fQ').value = state.q; $('#fVideo').checked = state.video;
    };
    const render = () => {
      const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      let list = drills.filter(d =>
        (!state.age || d.st.includes(state.age)) && (!state.skill || d.sk.includes(state.skill)) &&
        (!state.level || d.lv.includes(state.level)) && (!state.video || d.v.length) &&
        (!words.length || words.every(w => (d.n + ' ' + (d.sum || '') + ' ' + (d.works || '') + ' ' + (d.cues || '') + ' ' + (d.skill || '')).toLowerCase().includes(w))));
      if (state.age) list = rank(list, state.age);
      $('#count').textContent = `${list.length} drill${list.length === 1 ? '' : 's'}` + (state.age ? ` for ${ST[state.age].n.toLowerCase()} (${ST[state.age].a})` : '');
      $('#results').innerHTML = list.length ? list.slice(0, state.shown).map(card).join('') : '<div class="empty">No drills match all of those. Try removing a filter.</div>';
      $('#moreBtn').hidden = list.length <= state.shown;
      $('#fClear').hidden = !(state.age || state.skill || state.level || state.q || state.video);
      const p = new URLSearchParams();
      for (const k of ['age', 'skill', 'level', 'q']) if (state[k]) p.set(k, state[k]);
      if (state.video) p.set('video', '1');
      const h = '#/' + (p.toString() ? '?' + p : '');
      lastList = h;
      if (location.hash !== h && !(h === '#/' && !location.hash)) go(h, true);
    };
    for (const [id, key] of [['fAge', 'age'], ['fSkill', 'skill'], ['fLevel', 'level']]) {
      $('#' + id).addEventListener('click', e => {
        const b = e.target.closest('.chip'); if (!b) return;
        state[key] = state[key] === b.dataset.v ? '' : b.dataset.v; state.shown = 36; sync(); render();
      });
    }
    let t;
    $('#fQ').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); state.shown = 36; render(); }, 160); });
    $('#fVideo').addEventListener('change', e => { state.video = e.target.checked; render(); });
    $('#fClear').addEventListener('click', () => { Object.assign(state, { age: '', skill: '', level: '', q: '', video: false, shown: 36 }); sync(); render(); });
    $('#moreBtn').addEventListener('click', () => { state.shown += 36; render(); });
    wireJev($('#jevHome'), homeJevResult);
    sync(); render();
  }

  /* ------------------------------------------------------------ view: drill */
  function viewDrill(d) {
    document.title = `${d.n} — Drill library`;
    const g = diagram(d);
    const picks = store.get('picks', []);
    const inPlan = picks.includes(d.id);
    const fixes = faults.filter(f => f.d.includes(d.id));
    const exact = d.v.filter(v => v[1]).map(v => v[0]);
    const vids = d.v.map(v => v[0]);
    const cues = cuesOf(d.cues);
    const similar = rank(drills.filter(x => x.id !== d.id && x.sk[0] === d.sk[0] && x.st.some(s => d.st.includes(s))), d.st[0]).slice(0, 4);
    const block = (title, body) => body ? `<section class="block"><h2>${title}</h2><div class="prose">${body}</div></section>` : '';
    main.innerHTML = `
      <a class="crumb" href="${lastList}">← All drills</a>
      <div class="d-head">
        <div>
          <p class="eyebrow">${esc(AREA[d.a].n)} · ${esc(stageRange(d.st))}</p>
          <h1 class="h-page">${esc(d.n)}</h1>
          <div class="d-chips">
            ${d.st.map(s => `<a class="chip" href="#/?age=${s}"><span class="dot s-${s}"></span>${ST[s].n}</a>`).join('')}
            <span class="chip">${esc(levelText(d.lv))}</span>
            ${d.sk.map(s => `<a class="chip" href="#/?skill=${s}">${esc(SK[s].n)}</a>`).join('')}
          </div>
        </div>
        <div class="btns noprint">
          <button type="button" class="btn${inPlan ? ' quiet' : ''}" id="pickBtn">${inPlan ? 'In your lesson picks ✓' : 'Add to lesson plan'}</button>
          <button type="button" class="btn quiet" onclick="window.print()">Print</button>
        </div>
      </div>
      <div class="d-grid">
        <div class="d-art">
          <figure class="diagram" style="margin:0">
            ${g ? g.svg : '<div class="nodiag" style="aspect-ratio:400/210;display:grid;place-items:center;color:var(--muted)">No court needed — this one is off court or in your head.</div>'}
            ${g ? `<figcaption class="legend">${legend(d.dg)}<span style="margin-left:auto">${esc(g.label)}</span></figcaption>` : ''}
          </figure>
          ${g ? '<p class="diag-note">A sketch of the setup. The written setup has the exact spots.</p>' : ''}
          ${vids.length ? `<div style="margin-top:1.25rem" class="noprint"><div class="vgrid" style="grid-template-columns:1fr">${vtile(vids[0], { exact: exact.includes(vids[0]) })}</div></div>` : ''}
        </div>
        <div>
          ${block('Works on', md(d.works, d.a))}
          ${block('Players & equipment', md(d.players, d.a))}
          ${block('Setup', md(d.setup, d.a))}
          ${block('How it runs', md(d.steps, d.a))}
          ${d.cues ? `<section class="block"><h2>Coaching cues</h2>${cues.length ? `<div class="cues">${cues.map(c => `<span class="cue">${esc(c)}</span>`).join('')}</div>` : ''}<div class="prose">${md(d.cues, d.a)}</div></section>` : ''}
          ${(d.prog || d.reg) ? `<section class="block"><div class="two">${d.prog ? `<div><h3>Make it harder</h3><div class="prose">${md(d.prog, d.a)}</div></div>` : ''}${d.reg ? `<div><h3>Make it easier</h3><div class="prose">${md(d.reg, d.a)}</div></div>` : ''}</div></section>` : ''}
          ${block('Who it\u2019s for', md(d.ages, d.a) + (d.level ? `<p class="muted small">Level: ${inline(d.level, d.a)}</p>` : ''))}
          ${fixes.length ? `<section class="block"><h2>Fixes</h2><div class="fixlist">${fixes.map(f => `<a class="fixitem" href="#/fix/${f.id}"><b>${esc(f.n)}</b><em>${esc(AREA[f.a].group)}</em></a>`).join('')}</div></section>` : ''}
          ${block('Source', md(d.src))}
        </div>
      </div>
      ${vids.length > 1 ? `<h2 class="h-sec">More videos</h2><div class="vgrid">${vids.slice(1).map(id => vtile(id, { exact: exact.includes(id) })).join('')}</div>` : ''}
      ${vids.length ? '<p class="note">Videos were checked to exist and matched to the drill by title; preview before assigning one.</p>' : ''}
      ${similar.length ? `<h2 class="h-sec">Similar drills</h2><div class="grid">${similar.map(card).join('')}</div>` : ''}`;
    $('#pickBtn').addEventListener('click', e => {
      let p = store.get('picks', []);
      if (p.includes(d.id)) { p = p.filter(x => x !== d.id); toast('Removed from your lesson picks'); }
      else { p.push(d.id); toast('Added to your lesson picks'); }
      store.set('picks', p);
      const on = p.includes(d.id);
      e.target.textContent = on ? 'In your lesson picks ✓' : 'Add to lesson plan';
      e.target.classList.toggle('quiet', on);
    });
  }

  /* ------------------------------------------------------------ view: fixes */
  function viewFixes(q) {
    document.title = 'Fix a problem — Drill library';
    main.innerHTML = `
      <p class="eyebrow">Fix a problem</p>
      <h1 class="h-page">What\u2019s going wrong?</h1>
      <p class="lede">${faults.length} common problems, what they look like, why they happen, the cues that fix them and the drills that train the fix. The research\u2019s rule of thumb: change the task — a target, a zone, a catch, a scoring rule — more than you explain.</p>
      <div class="filters" style="margin-top:1.5rem"><div class="search"><input type="search" id="fxQ" placeholder="Search — e.g. toss, late, net, nervous" aria-label="Search problems" value="${esc(q.get('q') || '')}"></div></div>
      <div class="fixgroups" id="fxList"></div>`;
    const render = () => {
      const w = $('#fxQ').value.toLowerCase().trim();
      const groups = Object.keys(AREA).map(a => {
        const list = faults.filter(f => f.a === a && (!w || (f.n + ' ' + (f.looks || '') + ' ' + (f.fix || '')).toLowerCase().includes(w)));
        if (!list.length) return '';
        return `<section><h2 class="h-sub">${esc(AREA[a].group)} <span class="muted small">${list.length}</span></h2><div class="fixlist">${list.map(f => `<a class="fixitem" href="#/fix/${f.id}"><b>${esc(f.n)}</b><span>${esc(plain(f.looks || f.fix || ''))}</span></a>`).join('')}</div></section>`;
      }).join('');
      $('#fxList').innerHTML = groups || '<div class="empty">Nothing matches that. Try a shorter word.</div>';
    };
    $('#fxQ').addEventListener('input', render);
    render();
  }
  const plain = s => String(s).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').replace(/\*|—\s*$/g, '').replace(/\s+/g, ' ').trim();

  function viewFault(f) {
    document.title = `${f.n} — Fix a problem`;
    const cues = cuesOf(f.fix);
    const ds = f.d.map(id => byId[id]).filter(Boolean);
    const block = (title, body) => body ? `<section class="block"><h2>${title}</h2><div class="prose">${body}</div></section>` : '';
    main.innerHTML = `
      <a class="crumb" href="#/fix">← All problems</a>
      <p class="eyebrow">${esc(AREA[f.a].group)}</p>
      <h1 class="h-page">${esc(f.n)}</h1>
      ${f.fix && cues.length ? `<div class="cues" style="margin:1.25rem 0 0">${cues.map(c => `<span class="cue">${esc(c)}</span>`).join('')}</div>` : ''}
      <div class="d-grid" style="margin-top:1.5rem">
        <div>
          ${block('What it looks like', md(f.looks, f.a))}
          ${block('Why it happens', md(f.cause, f.a))}
        </div>
        <div>
          ${block('Cues that fix it', md(f.fix, f.a))}
          ${block(f.a === 'kids' ? 'Games that fix it' : 'Corrective plan', md(f.drills, f.a))}
        </div>
      </div>
      ${ds.length ? `<h2 class="h-sec">Drills that train the fix</h2><div class="grid">${ds.map(card).join('')}</div>` : ''}
      ${f.v.length ? `<h2 class="h-sec">Watch</h2><div class="vgrid">${f.v.map(id => vtile(id)).join('')}</div><p class="note">Checked to exist and matched by title; preview before sending one to a player.</p>` : ''}`;
  }

  /* ------------------------------------------------------------ Jev
     Describe a student in a sentence and Jev (through the site's Worker,
     POST /drills/describe) places them: stage, level, what to work on and
     which of the library's problems the sentence describes. The Worker
     takes the admin key this device already holds from unlocking /admin/,
     so the route is Isaac's alone. Jev only suggests; nothing is saved
     until he presses Save. */
  // On localhost a local Worker answers (:8787 by default; another port can
  // be saved as ltc-drills:jev-base for a preview).
  const JEV_BASE = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? ((() => { try { return localStorage.getItem('ltc-drills:jev-base'); } catch (e) { return null; } })() || 'http://localhost:8787')
    : 'https://lee-tennis-jev.leetennis.workers.dev';
  async function askJev(text) {
    let key = null;
    try { key = localStorage.getItem('lee-stats-key'); } catch (e) { /* storage blocked */ }
    if (!key) throw { code: 'nokey' };
    let res;
    try {
      res = await fetch(JEV_BASE + '/drills/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ text }),
      });
    } catch (e) { throw { code: 'net' }; }
    if (!res.ok) throw { code: res.status };
    return res.json();
  }
  function jevError(err) {
    const c = err && err.code;
    if (c === 'nokey') return 'Jev needs the admin key on this device. <a href="/admin/">Unlock the admin page</a> once, then come back.';
    if (c === 401) return 'The admin key saved on this device was turned down. <a href="/admin/">Unlock the admin page</a> again.';
    if (c === 429) return 'That was a lot at once. Wait a minute and try again.';
    if (c === 400) return 'Write a sentence of 3 to 600 characters.';
    return 'Couldn’t reach Jev just now. Check the connection and try again.';
  }
  function jevPanel(id, label, placeholder) {
    return `<form class="jev" id="${id}" autocomplete="off">
      <label class="jev-label" for="${id}In"><span class="jev-tag">Jev</span>${label}</label>
      <div class="jev-row"><input id="${id}In" maxlength="600" placeholder="${esc(placeholder)}" aria-describedby="${id}Note"><button class="btn jev-go" type="submit">Place them</button></div>
      <p class="jev-note" id="${id}Note">Jev reads the sentence and suggests; you check it before anything is saved.</p>
      <div class="jev-out" aria-live="polite"></div>
    </form>`;
  }
  function wireJev(form, onResult) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = $('input', form), out = $('.jev-out', form), btn = $('.jev-go', form);
      const text = input.value.trim();
      if (text.length < 3) { out.innerHTML = '<p class="jev-msg">Write a sentence about the student first.</p>'; input.focus(); return; }
      btn.disabled = true; btn.textContent = 'Reading…'; form.classList.add('is-busy');
      out.innerHTML = '';
      try { onResult(await askJev(text), text, out); }
      catch (err) { out.innerHTML = `<p class="jev-msg">${jevError(err)}</p>`; }
      finally { btn.disabled = false; btn.textContent = 'Place them'; form.classList.remove('is-busy'); }
    });
  }
  const jevAny = r => r && (r.stage || r.level || (r.skills || []).length || (r.faults || []).length);
  const JEV_NONE = '<p class="jev-msg">Jev couldn’t place that one. Add their age and what goes wrong, like “10, forehand flies long, nervous in matches”.</p>';
  function jevHrefs(r) {
    const sk = r.skills || [];
    return {
      drills: `#/?age=${r.stage}${sk[0] ? '&skill=' + sk[0] : ''}${r.level ? '&level=' + r.level : ''}`,
      plan: `#/plan?stage=${r.stage}${r.level ? '&level=' + r.level : ''}${sk.length ? '&focus=' + sk.filter(k => k !== 'mental').slice(0, 2).join(',') : ''}`,
    };
  }
  function homeJevResult(r, text, out) {
    if (!jevAny(r)) { out.innerHTML = JEV_NONE; return; }
    const none = t => `<span class="jev-none">${t}</span>`;
    const h = r.stage ? jevHrefs(r) : null;
    out.innerHTML = `
      <dl class="jev-res">
        <div><dt>Stage</dt><dd>${r.stage ? `<span class="chip"><span class="dot s-${r.stage}"></span>${ST[r.stage].n}<small>${ST[r.stage].a}</small></span>` : none('Not sure — add their age')}</dd></div>
        <div><dt>Level</dt><dd>${r.level ? `<span class="chip">${LV[r.level].n}</span>` : none('Not said')}</dd></div>
        <div><dt>Work on</dt><dd>${(r.skills || []).length ? r.skills.map(k => `<span class="chip">${esc(SK[k].n)}</span>`).join('') : none('Nothing specific')}</dd></div>
        <div class="wide"><dt>Problems to fix</dt><dd>${(r.faults || []).length ? r.faults.filter(id => faultById[id]).map(id => `<a class="chip" href="#/fix/${id}">${esc(faultById[id].n)}</a>`).join('') : none('None named')}</dd></div>
      </dl>
      <div class="btns">
        ${h ? `<a class="btn invert" href="${h.drills}">Show their drills</a>` : ''}
        <button class="btn outline" type="button" data-jev-save>Save as a student</button>
        ${h ? `<a class="btn outline" href="${h.plan}">Build today’s lesson</a>` : ''}
      </div>`;
    $('[data-jev-save]', out).addEventListener('click', () => {
      try { sessionStorage.setItem('ltc-drills:prefill', JSON.stringify({ age: r.age || '', stage: r.stage || '', level: r.level || 'beg', skills: r.skills || [], faults: r.faults || [], notes: text })); } catch (e) { /* the form just opens empty */ }
      go('#/student/new');
    });
  }

  /* ------------------------------------------------------------ students */
  const getStudents = () => store.get('students', []);
  const saveStudents = s => store.set('students', s);
  function stageForAge(age) {
    age = +age;
    if (!age) return '';
    if (age <= 4) return 'tots';
    if (age <= 7) return 'red';
    if (age <= 9) return 'orange';
    if (age <= 10) return 'green';
    if (age <= 13) return 'yellow';
    if (age <= 18) return 'teen';
    if (age < 55) return 'adult';
    return 'senior';
  }

  function viewStudents() {
    document.title = 'Students — Drill library';
    const list = getStudents();
    main.innerHTML = `
      <p class="eyebrow">Students</p>
      <h1 class="h-page">Your players</h1>
      <p class="lede">Save each player\u2019s age, level and what they\u2019re working on, and their page pulls the right drills, fixes and videos. Kept in this browser only — nothing is uploaded.</p>
      <div class="btns" style="margin:1.25rem 0 1.75rem"><a class="btn" href="#/student/new">Add a student</a>
        <button type="button" class="btn quiet" id="exp"${list.length ? '' : ' disabled'}>Download a backup</button>
        <label class="btn quiet" style="cursor:pointer">Restore a backup<input type="file" id="imp" accept="application/json" hidden></label></div>
      ${list.length ? `<div class="roster">${list.map(s => `<a class="stu s-${s.stage}" href="#/student/${s.id}"><span class="av">${esc((s.name || '?').trim()[0].toUpperCase())}</span><span><b>${esc(s.name)}</b><small>${s.age ? 'Age ' + esc(s.age) + ' · ' : ''}${s.stage ? esc(ST[s.stage].n) : ''}${s.skills && s.skills.length ? ' · ' + esc(s.skills.map(k => SK[k].n).join(', ')) : ''}</small></span></a>`).join('')}</div>`
        : '<div class="empty">No students yet. Add one and their page will gather the drills for their age and focus.</div>'}`;
    $('#exp').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify({ students: getStudents(), picks: store.get('picks', []) }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'drill-library-students.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('#imp').addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!Array.isArray(data.students)) throw new Error('bad');
        const cur = getStudents(), ids = new Set(cur.map(s => s.id));
        const merged = cur.concat(data.students.filter(s => s && s.id && s.name && !ids.has(s.id)));
        saveStudents(merged); toast(`Restored ${merged.length - cur.length} student(s)`); viewStudents();
      } catch (err) { toast('That file isn\u2019t a drill-library backup'); }
    });
  }

  function viewStudentForm(id) {
    const list = getStudents();
    let prefill = null;
    if (!id) {
      try { prefill = JSON.parse(sessionStorage.getItem('ltc-drills:prefill') || 'null'); sessionStorage.removeItem('ltc-drills:prefill'); } catch (e) { prefill = null; }
    }
    const s = id ? list.find(x => x.id === id) : Object.assign({ id: '', name: '', age: '', stage: '', level: 'beg', skills: [], faults: [], notes: '' }, prefill || {});
    if (!s) { go('#/students'); return; }
    document.title = (id ? 'Edit ' + s.name : 'New student') + ' — Drill library';
    main.innerHTML = `
      <a class="crumb" href="${id ? '#/student/' + id : '#/students'}">← ${id ? esc(s.name) : 'Students'}</a>
      <h1 class="h-page">${id ? 'Edit ' + esc(s.name) : 'Add a student'}</h1>
      ${prefill ? '<p class="lede">Filled in from Jev. Add their name, check the rest, then save.</p>' : ''}
      <div style="margin-top:1.25rem">${jevPanel('jevForm', id ? 'Update from a sentence' : 'Fill this in from a sentence', 'e.g. 14, high school JV, double faults under pressure, toss all over the place')}</div>
      <form class="form panel" id="sf" style="margin-top:1rem">
        <div class="fgrid">
          <label class="field"><span>First name</span><input name="sname" required maxlength="40" autocomplete="off" value="${esc(s.name)}"></label>
          <label class="field"><span>Age</span><input name="age" type="number" min="2" max="99" inputmode="numeric" value="${esc(s.age)}"></label>
          <label class="field"><span>Stage <em class="muted" id="stHint" style="font-style:normal"></em></span><select name="stage" required><option value="">Choose…</option>${STAGES.map(x => `<option value="${x.k}"${s.stage === x.k ? ' selected' : ''}>${x.n} (${x.a})</option>`).join('')}</select></label>
          <label class="field"><span>Level</span><select name="level">${LEVELS.map(x => `<option value="${x.k}"${s.level === x.k ? ' selected' : ''}>${x.n}</option>`).join('')}</select></label>
        </div>
        <div class="field"><span>Working on</span><div class="chips" id="sfSkills">${SKILLS.map(x => `<button type="button" class="chip" data-v="${x.k}" aria-pressed="${(s.skills || []).includes(x.k)}">${x.n}</button>`).join('')}</div></div>
        <div class="field"><span>Problems to fix <em class="muted" style="font-style:normal">— pick what you see</em></span><div class="chips" id="sfFaults"></div></div>
        <label class="field"><span>Notes</span><textarea name="notes" maxlength="1000" placeholder="Goals, what clicked last time, anything to remember">${esc(s.notes || '')}</textarea></label>
        <div class="btns"><button class="btn" type="submit">Save</button>${id ? '<button class="btn quiet" type="button" id="del">Delete student</button>' : ''}</div>
        <p class="note">Saved in this browser only. Use “Download a backup” on the Students page to move them to another device.</p>
      </form>`;
    const form = $('#sf');
    let skills = (s.skills || []).slice(), picked = new Set(s.faults || []);
    const renderFaults = () => {
      const stage = form.stage.value;
      const young = ['tots', 'red', 'orange'].includes(stage);
      const relevant = !stage ? faults.filter(f => picked.has(f.id)) : faults.filter(f => picked.has(f.id) || (young && f.a === 'kids') || (!young && f.a !== 'kids' && skills.length && f.sk.some(k => skills.includes(k))));
      $('#sfFaults').innerHTML = relevant.length ? relevant.map(f => `<button type="button" class="chip" data-v="${f.id}" aria-pressed="${picked.has(f.id)}">${esc(f.n.length > 52 ? f.n.slice(0, 50) + '…' : f.n)}</button>`).join('') : '<span class="muted small">Pick a stage and what they\u2019re working on to see matching problems.</span>';
    };
    const hint = () => { const sug = stageForAge(form.age.value); $('#stHint').textContent = sug ? `— age ${form.age.value} suggests ${ST[sug].n}` : ''; if (sug && !form.stage.value) form.stage.value = sug; };
    form.age.addEventListener('input', () => { hint(); renderFaults(); });
    form.stage.addEventListener('change', renderFaults);
    $('#sfSkills').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const k = b.dataset.v; skills = skills.includes(k) ? skills.filter(x => x !== k) : skills.concat(k);
      b.setAttribute('aria-pressed', String(skills.includes(k))); renderFaults();
    });
    $('#sfFaults').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      picked.has(b.dataset.v) ? picked.delete(b.dataset.v) : picked.add(b.dataset.v);
      b.setAttribute('aria-pressed', String(picked.has(b.dataset.v)));
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const rec = { id: s.id || 's' + Date.now().toString(36), name: form.sname.value.trim(), age: form.age.value, stage: form.stage.value, level: form.level.value, skills, faults: [...picked], notes: form.notes.value.trim() };
      if (!rec.name || !rec.stage) return;
      const all = getStudents().filter(x => x.id !== rec.id).concat(rec);
      if (!saveStudents(all)) { toast('Couldn\u2019t save — this browser is blocking storage'); return; }
      go('#/student/' + rec.id);
    });
    wireJev($('#jevForm'), (r, text, out) => {
      if (!jevAny(r)) { out.innerHTML = JEV_NONE; return; }
      if (r.age && !form.age.value) form.age.value = r.age;
      if (r.stage) form.stage.value = r.stage;
      if (r.level) form.level.value = r.level;
      if ((r.skills || []).length) {
        skills = r.skills.slice();
        $$('#sfSkills .chip').forEach(b => b.setAttribute('aria-pressed', String(skills.includes(b.dataset.v))));
      }
      (r.faults || []).forEach(f => picked.add(f));
      if (!form.notes.value.trim()) form.notes.value = text;
      hint(); renderFaults();
      const filled = [r.stage && 'stage', r.level && 'level', (r.skills || []).length && 'what to work on', (r.faults || []).length && 'problems'].filter(Boolean);
      out.innerHTML = `<p class="jev-msg">Filled in ${esc(filled.join(', '))}. Check it over below, then save.</p>`;
    });
    if (id) $('#del').addEventListener('click', () => {
      if (!confirm(`Delete ${s.name}? This can\u2019t be undone.`)) return;
      saveStudents(getStudents().filter(x => x.id !== id)); go('#/students');
    });
    hint(); renderFaults();
  }

  function drillsFor(stage, skill, level, n) {
    let list = drills.filter(d => d.st.includes(stage) && (!skill || d.sk.includes(skill)));
    const lv = list.filter(d => !level || d.lv.includes(level));
    if (lv.length >= Math.min(3, list.length)) list = lv;
    return rank(list, stage).slice(0, n);
  }

  function viewStudent(id) {
    const s = getStudents().find(x => x.id === id);
    if (!s) { go('#/students'); return; }
    document.title = `${s.name} — Drill library`;
    const stg = G.stages[s.stage];
    const fx = (s.faults || []).map(f => faultById[f]).filter(Boolean);
    const skills = s.skills && s.skills.length ? s.skills : (stg ? stg.skills.slice(0, 3) : []);
    const vidIds = [];
    for (const k of skills) for (const d of drillsFor(s.stage, k, s.level, 8)) for (const [v] of d.v) if (!vidIds.includes(v)) vidIds.push(v);
    main.innerHTML = `
      <a class="crumb" href="#/students">← Students</a>
      <div class="d-head">
        <div class="age-hero s-${s.stage}"><span class="ballmark" aria-hidden="true"></span>
          <div><p class="eyebrow">${s.age ? 'Age ' + esc(s.age) + ' · ' : ''}${esc(ST[s.stage].n)} (${ST[s.stage].a}) · ${esc(LV[s.level] ? LV[s.level].n : '')}</p>
          <h1 class="h-page" style="margin:0">${esc(s.name)}</h1></div></div>
        <div class="btns noprint"><a class="btn" href="#/plan?student=${s.id}">Build today\u2019s lesson</a><a class="btn quiet" href="#/student/${s.id}/edit">Edit</a></div>
      </div>
      ${s.notes ? `<div class="panel prose" style="margin-bottom:1rem">${md(s.notes)}</div>` : ''}
      ${stg ? `<div class="kit" style="margin-top:0">${stg.kit.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</div><p class="note" style="margin-top:.6rem">${esc(stg.session)} <a href="#/age/${s.stage}">Full ${esc(stg.name.toLowerCase())} guide →</a></p>` : ''}
      ${fx.length ? `<h2 class="h-sec">Fix first</h2>${fx.map(f => {
        const ds = f.d.map(i => byId[i]).filter(Boolean);
        const fit = ds.filter(d => d.st.includes(s.stage));
        const use = (fit.length ? fit : ds).slice(0, 4);
        return `<h3 class="h-sub"><a href="#/fix/${f.id}">${esc(f.n)}</a></h3>${cuesOf(f.fix).length ? `<div class="cues">${cuesOf(f.fix).slice(0, 4).map(c => `<span class="cue">${esc(c)}</span>`).join('')}</div>` : ''}<div class="grid">${use.map(card).join('')}</div>`;
      }).join('')}` : ''}
      <h2 class="h-sec">${s.skills && s.skills.length ? 'What they\u2019re working on' : 'Good places to start for this stage'}</h2>
      ${skills.map(k => {
        const ds = drillsFor(s.stage, k, s.level, 4);
        return ds.length ? `<h3 class="h-sub">${esc(SK[k].n)} <a class="small muted" href="#/?age=${s.stage}&skill=${k}${s.level ? '&level=' + s.level : ''}">see all →</a></h3><div class="grid">${ds.map(card).join('')}</div>` : '';
      }).join('') || '<p class="muted">Add what they\u2019re working on to see drills here.</p>'}
      ${vidIds.length ? `<h2 class="h-sec">Videos to watch together</h2><div class="vgrid">${vidIds.slice(0, 8).map(v => vtile(v)).join('')}</div>` : ''}`;
  }

  /* ------------------------------------------------------------ lesson plan */
  const GAME_SHARE = { tots: .25, red: .3, orange: .33, green: .33, yellow: .4, teen: .4, adult: .35, senior: .4 };
  function candidates(kind, stage, level, focus) {
    const stageOk = d => d.st.includes(stage);
    const lvOk = d => !level || d.lv.includes(level);
    let pool;
    if (kind === 'warm') {
      const young = ST[stage].i <= 2;
      pool = drills.filter(d => stageOk(d) && (young ? d.sk.some(k => k === 'coord' || k === 'footwork') : (d.sk.includes('footwork') || /mini|warm|rally now|build up|ten to move/i.test(d.n))));
    } else if (kind === 'game') {
      pool = drills.filter(d => stageOk(d) && d.sk.some(k => k === 'tactics' || k === 'doubles' || k === 'group' || k === 'mental'));
    } else {
      pool = drills.filter(d => stageOk(d) && d.sk.includes(kind));
      if (!pool.length) pool = drills.filter(d => d.sk.includes(kind));
    }
    // best first: games that use today's focus, then the right level, each ranked
    const tiers = [
      d => kind === 'game' && focus.some(k => d.sk.includes(k)) && lvOk(d),
      d => kind === 'game' && focus.some(k => d.sk.includes(k)),
      d => lvOk(d),
      () => true,
    ];
    const seen = new Set(), out = [];
    for (const t of tiers) for (const d of rank(pool.filter(x => !seen.has(x.id) && t(x)), stage)) { seen.add(d.id); out.push(d); }
    return out;
  }
  function buildPlan(o) {
    const len = +o.len, stage = o.stage, focus = o.focus.length ? o.focus : (G.stages[stage].skills.slice(0, 1));
    const review = len <= 30 ? 2 : 3;
    const warm = Math.round(len * (ST[stage].i <= 1 ? .2 : .15));
    const game = Math.round(len * GAME_SHARE[stage]);
    const skillT = len - warm - game - review;
    const blocks = [{ kind: 'warm', label: 'Warm-up', t: warm }];
    if (focus.length > 1) { blocks.push({ kind: focus[0], label: SK[focus[0]].n, t: Math.round(skillT / 2) }); blocks.push({ kind: focus[1], label: SK[focus[1]].n, t: skillT - Math.round(skillT / 2) }); }
    else if (len >= 45) { blocks.push({ kind: focus[0], label: SK[focus[0]].n + ' — build it', t: Math.round(skillT * .5), closed: true }); blocks.push({ kind: focus[0], label: SK[focus[0]].n + ' — use it live', t: skillT - Math.round(skillT * .5), live: true }); }
    else blocks.push({ kind: focus[0], label: SK[focus[0]].n, t: skillT });
    blocks.push({ kind: 'game', label: 'Game', t: game });
    const used = new Set();
    const picks = (store.get('picks', []) || []).map(i => byId[i]).filter(d => d && d.st.includes(stage));
    blocks.forEach((b, i) => {
      let pool = candidates(b.kind, stage, o.level, focus);
      if (b.closed) pool = pool.filter(d => /\bC:/.test(d.dg || '')).concat(pool.filter(d => !/\bC:/.test(d.dg || '')));
      if (b.live) pool = pool.filter(d => !/\bC:/.test(d.dg || '')).concat(pool.filter(d => /\bC:/.test(d.dg || '')));
      const mine = picks.filter(d => !used.has(d.id) && (b.kind === 'warm' ? d.sk.some(k => k === 'footwork' || k === 'coord') : b.kind === 'game' ? d.sk.some(k => ['tactics', 'doubles', 'group'].includes(k)) : d.sk.includes(b.kind)));
      pool = mine.concat(pool.filter(d => !mine.includes(d)));
      pool = pool.filter(d => !used.has(d.id));
      // a small stage (tots) can run out of games: any unused drill for the stage will do
      if (!pool.length) pool = rank(drills.filter(d => d.st.includes(stage) && !used.has(d.id)), stage);
      const off = (o.swaps && o.swaps[i]) || 0;
      b.pool = pool.length;
      b.d = pool.length ? pool[off % pool.length] : null;
      if (b.d) used.add(b.d.id);
    });
    blocks.push({ kind: 'review', label: 'Wrap-up', t: review });
    let clock = 0;
    for (const b of blocks) { b.from = clock; clock += b.t; b.to = clock; }
    return { blocks, focus };
  }
  // minutes into the lesson, as 0:05
  const mm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

  function viewPlan(q) {
    document.title = 'Lesson plan — Drill library';
    const students = getStudents();
    const saved = store.get('plan', {});
    const st = students.find(x => x.id === q.get('student'));
    const o = {
      student: st ? st.id : (saved.student || ''),
      stage: st ? st.stage : (saved.stage || 'green'),
      level: st ? st.level : (saved.level || 'beg'),
      len: saved.len || 60,
      focus: st ? (st.skills || []).slice(0, 2) : (saved.focus || ['forehand']),
      swaps: {},
    };
    if (st && !o.focus.length) o.focus = G.stages[st.stage].skills.slice(0, 1);
    // From Jev's "Build today's lesson": ?stage=&level=&focus=a,b
    if (!st && ST[q.get('stage')]) {
      o.student = ''; o.stage = q.get('stage');
      if (LV[q.get('level')]) o.level = q.get('level');
      const f = (q.get('focus') || '').split(',').filter(k => SK[k] && k !== 'mental' && k !== 'group').slice(0, 2);
      o.focus = f.length ? f : G.stages[o.stage].skills.slice(0, 1);
    }
    main.innerHTML = `
      <p class="eyebrow">Lesson plan</p>
      <h1 class="h-page">Build today\u2019s lesson</h1>
      <p class="lede">Warm-up, one or two skill blocks and a game, timed the way the federations split a session for that age. Swap any block, then print it or copy it.</p>
      <div class="panel noprint" style="margin:1.25rem 0 1.5rem">
        <div class="fgrid">
          <label class="field"><span>Student</span><select id="pStudent"><option value="">— none —</option>${students.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>
          <label class="field"><span>Stage</span><select id="pStage">${STAGES.map(x => `<option value="${x.k}">${x.n} (${x.a})</option>`).join('')}</select></label>
          <label class="field"><span>Level</span><select id="pLevel">${LEVELS.map(x => `<option value="${x.k}">${x.n}</option>`).join('')}</select></label>
          <label class="field"><span>Length</span><select id="pLen">${[30, 45, 60, 75, 90].map(x => `<option value="${x}">${x} minutes</option>`).join('')}</select></label>
        </div>
        <div class="field" style="margin-top:1rem"><span>Focus <em class="muted" style="font-style:normal">— up to two</em></span><div class="chips" id="pFocus">${SKILLS.filter(x => !['group', 'mental'].includes(x.k)).map(x => `<button type="button" class="chip" data-v="${x.k}" aria-pressed="false">${x.n}</button>`).join('')}</div></div>
      </div>
      <div id="planOut"></div>
      <div id="picksOut" class="noprint"></div>`;
    $('#pStudent').value = o.student; $('#pStage').value = o.stage; $('#pLevel').value = o.level; $('#pLen').value = o.len;
    const syncFocus = () => $$('#pFocus .chip').forEach(b => b.setAttribute('aria-pressed', String(o.focus.includes(b.dataset.v))));
    const render = () => {
      store.set('plan', { student: o.student, stage: o.stage, level: o.level, len: o.len, focus: o.focus });
      const plan = buildPlan(o);
      const who = students.find(x => x.id === o.student);
      $('#planOut').innerHTML = `
        <div class="d-head" style="margin-bottom:1rem"><div><h2 class="h-sub" style="margin:0">${who ? esc(who.name) + ' · ' : ''}${esc(ST[o.stage].n)} · ${o.len} minutes · ${esc(plan.focus.map(k => SK[k].n).join(' + '))}</h2>
          <p class="note" style="margin:.2rem 0 0">${esc(G.stages[o.stage].session)}</p></div>
          <div class="btns noprint"><button class="btn quiet" type="button" id="pCopy">Copy as text</button><button class="btn quiet" type="button" onclick="window.print()">Print</button></div></div>
        <div class="plan">${plan.blocks.map((b, i) => {
          if (b.kind === 'review') {
            const cs = plan.blocks.filter(x => x.d).flatMap(x => cuesOf(x.d.cues).slice(0, 1));
            return `<div class="pblock"><div class="ptime">${mm(b.from)}–${mm(b.to)}<small>${b.t} min</small></div><div><h3>Wrap-up</h3><p>Ask what felt different, repeat today\u2019s cue words${cs.length ? ': ' + cs.map(c => '\u201c' + esc(c) + '\u201d').join(', ') : ''}, and give one thing to practise at home.</p></div></div>`;
          }
          const d = b.d;
          return `<div class="pblock"><div class="ptime">${mm(b.from)}–${mm(b.to)}<small>${b.t} min · ${esc(b.label)}</small></div><div>${d ? `
            <h3><a href="#/drill/${d.id}">${esc(d.n)}</a></h3><p>${esc(d.sum || '')}</p>
            ${cuesOf(d.cues).length ? `<div class="pcues"><b>Cues:</b> ${cuesOf(d.cues).slice(0, 3).map(c => '\u201c' + esc(c) + '\u201d').join(' · ')}</div>` : ''}
            <div class="btns noprint">${b.pool > 1 ? `<button type="button" class="btn quiet sm" data-swap="${i}">Swap drill</button>` : ''}<a class="btn quiet sm" href="#/drill/${d.id}">Setup & steps</a></div>`
            : `<h3>${esc(b.label)}</h3><p>No drill in the library fits this stage and focus — try another focus.</p>`}</div></div>`;
        }).join('')}</div>`;
      $$('[data-swap]').forEach(btn => btn.addEventListener('click', () => { const i = +btn.dataset.swap; o.swaps[i] = (o.swaps[i] || 0) + 1; render(); }));
      $('#pCopy').addEventListener('click', () => {
        const lines = [`Lesson plan — ${who ? who.name + ', ' : ''}${ST[o.stage].n}, ${o.len} min, ${plan.focus.map(k => SK[k].n).join(' + ')}`, ''];
        for (const b of plan.blocks) lines.push(`${mm(b.from)}–${mm(b.to)}  ${b.label}${b.d ? ': ' + b.d.n : ''}` + (b.d && cuesOf(b.d.cues).length ? `\n      Cues: ${cuesOf(b.d.cues).slice(0, 3).join(' / ')}` : ''));
        navigator.clipboard.writeText(lines.join('\n')).then(() => toast('Plan copied'), () => toast('Couldn\u2019t copy — select and copy instead'));
      });
      const picks = store.get('picks', []).map(i => byId[i]).filter(Boolean);
      $('#picksOut').innerHTML = picks.length ? `<h2 class="h-sec">Your lesson picks</h2><p class="note">Drills you added with “Add to lesson plan”. Ones that suit the stage go into the plan first.</p><div class="grid" style="margin-top:.75rem">${picks.map(card).join('')}</div><div class="btns" style="margin-top:1rem"><button class="btn quiet sm" type="button" id="clearPicks">Clear picks</button></div>` : '';
      const cp = $('#clearPicks'); if (cp) cp.addEventListener('click', () => { store.set('picks', []); render(); });
    };
    $('#pStudent').addEventListener('change', e => {
      o.student = e.target.value; const s = students.find(x => x.id === o.student);
      if (s) { o.stage = s.stage; o.level = s.level; if (s.skills && s.skills.length) o.focus = s.skills.slice(0, 2); $('#pStage').value = o.stage; $('#pLevel').value = o.level; syncFocus(); }
      o.swaps = {}; render();
    });
    $('#pStage').addEventListener('change', e => { o.stage = e.target.value; o.swaps = {}; render(); });
    $('#pLevel').addEventListener('change', e => { o.level = e.target.value; o.swaps = {}; render(); });
    $('#pLen').addEventListener('change', e => { o.len = +e.target.value; o.swaps = {}; render(); });
    $('#pFocus').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      const k = b.dataset.v;
      if (o.focus.includes(k)) o.focus = o.focus.filter(x => x !== k);
      else { o.focus = o.focus.concat(k); if (o.focus.length > 2) o.focus.shift(); }
      o.swaps = {}; syncFocus(); render();
    });
    syncFocus(); render();
  }

  /* ------------------------------------------------------------ age guide */
  function viewAges() {
    document.title = 'Age guide — Drill library';
    const I = G.intro;
    main.innerHTML = `
      <p class="eyebrow">Age guide</p>
      <h1 class="h-page">What each age needs</h1>
      <p class="lede">Court, ball, racquet, how long a lesson should run, how they learn, what to master before moving up and what to watch for — stage by stage, from the federations\u2019 own plans.</p>
      <div class="stages" style="margin:1.75rem 0 2.5rem">${STAGES.map(s => { const g = G.stages[s.k]; return `<a class="stagecard s-${s.k}" href="#/age/${s.k}"><span class="big">${esc(g.ages)}</span><b>${esc(g.name)}</b><span>${esc(g.ball)}</span></a>`; }).join('')}</div>
      <div class="callout"><b style="font-size:1.25rem;letter-spacing:-.03em">${esc(I.rule)}</b><p>${esc(I.why)}</p></div>
      <h2 class="h-sec">When to move up a colour</h2>
      <table class="table"><thead><tr><th style="width:9rem">Step</th><th>Ready when</th></tr></thead><tbody>${I.moveUp.map(([a, b]) => `<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>
      <p class="note" style="margin-top:.75rem">${esc(I.moveUpNote)}</p>
      <h2 class="h-sec">Sources</h2>
      <ul class="prose">${I.sources.map(([n, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join('')}</ul>`;
  }

  function viewAge(k) {
    const g = G.stages[k];
    document.title = `${g.name} (${g.ages}) — Age guide`;
    const top = rank(drills.filter(d => d.st.includes(k)), k);
    const n = top.length;
    main.innerHTML = `
      <a class="crumb" href="#/ages">← Age guide</a>
      <div class="age-hero s-${k}"><span class="ballmark" aria-hidden="true"></span><div><p class="eyebrow">Ages ${esc(g.ages)} · ${esc(g.ball)}</p><h1 class="h-page" style="margin:0">${esc(g.name)}</h1></div></div>
      <dl class="kit">${g.kit.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
      <div class="cols" style="margin-top:2rem">
        <section><h2 class="h-sub">The session</h2><p class="prose">${esc(g.session)}</p>
          <h2 class="h-sub">How they learn</h2><ul class="prose">${g.howTheyLearn.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
        <section><h2 class="h-sub">What to master here</h2><ul class="checks prose">${g.milestones.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
      </div>
      <div class="two" style="margin-top:1.75rem"><div><h3>Body</h3><p class="prose" style="margin:0">${esc(g.body)}</p></div><div><h3>Watch for</h3><p class="prose" style="margin:0">${esc(g.watch)}</p></div></div>
      <h2 class="h-sec">Skills that matter now</h2>
      <div class="chips">${g.skills.map(s => `<a class="chip" href="#/?age=${k}&skill=${s}">${esc(SK[s].n)} <small>${drills.filter(d => d.st.includes(k) && d.sk.includes(s)).length}</small></a>`).join('')}</div>
      <h2 class="h-sec">Drills for ${esc(g.name.toLowerCase())} <a class="small muted" href="#/?age=${k}">all ${n} →</a></h2>
      <div class="grid">${top.slice(0, 8).map(card).join('')}</div>
      ${g.videos.length ? `<h2 class="h-sec">See a session</h2><div class="vgrid">${g.videos.map(v => vtile(v)).join('')}</div>` : ''}`;
  }

  /* ------------------------------------------------------------ videos */
  function viewVideos(q) {
    document.title = 'Videos — Drill library';
    const ids = Object.keys(videos);
    const state = { skill: q.get('skill') || '', age: q.get('age') || '', q: '', shown: 36 };
    const VS = SKILLS.concat({ k: 'guide', n: 'Whole sessions' });
    main.innerHTML = `
      <p class="eyebrow">Videos</p>
      <h1 class="h-page">Watch and learn</h1>
      <p class="lede">${ids.length} YouTube videos from the research — federation demos, drill walk-throughs and technique fixes. Each was checked to exist; titles and channels are YouTube\u2019s own.</p>
      <section class="filters" style="margin-top:1.5rem">
        <div class="frow"><span class="flabel">Skill</span><div class="chips" id="vSkill">${VS.map(s => `<button type="button" class="chip" data-v="${s.k}" aria-pressed="false">${s.n}</button>`).join('')}</div></div>
        <div class="frow"><span class="flabel">Age</span><div class="chips scroll" id="vAge">${STAGES.map(s => `<button type="button" class="chip" data-v="${s.k}" aria-pressed="false"><span class="dot s-${s.k}"></span>${s.n}</button>`).join('')}</div></div>
        <div class="frow"><span class="flabel">Search</span><div class="search"><input type="search" id="vQ" placeholder="Title or channel — e.g. kick serve, USTA, volley" aria-label="Search videos"></div></div>
      </section>
      <div class="resultbar"><span id="vCount"></span></div>
      <div class="vgrid" id="vList"></div>
      <div class="more"><button type="button" class="btn quiet" id="vMore">Show more</button></div>`;
    const render = () => {
      $$('#vSkill .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.skill)));
      $$('#vAge .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.age)));
      const w = state.q.toLowerCase();
      const list = ids.filter(id => { const v = videos[id]; return (!state.skill || v.sk.includes(state.skill)) && (!state.age || v.st.includes(state.age)) && (!w || (v.t + ' ' + v.c).toLowerCase().includes(w)); });
      $('#vCount').textContent = `${list.length} video${list.length === 1 ? '' : 's'}`;
      $('#vList').innerHTML = list.length ? list.slice(0, state.shown).map(id => vtile(id)).join('') : '<div class="empty">No videos match.</div>';
      $('#vMore').hidden = list.length <= state.shown;
    };
    $('#vSkill').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; state.skill = state.skill === b.dataset.v ? '' : b.dataset.v; state.shown = 36; render(); });
    $('#vAge').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; state.age = state.age === b.dataset.v ? '' : b.dataset.v; state.shown = 36; render(); });
    let t; $('#vQ').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); state.shown = 36; render(); }, 160); });
    $('#vMore').addEventListener('click', () => { state.shown += 36; render(); });
    render();
  }

  /* ------------------------------------------------------------ video modal */
  const modal = $('#modal'), modalBody = $('#modalBody');
  let lastFocus = null;
  function openVideo(id) {
    const v = videos[id]; if (!v) return;
    const used = drills.filter(d => d.v.some(x => x[0] === id));
    const usedF = faults.filter(f => f.v.includes(id));
    lastFocus = document.activeElement;
    modalBody.innerHTML = `
      <div class="player"><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${esc(v.t)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
      <h2 id="modalTitle">${esc(v.t)}</h2>
      <p class="muted small" style="margin:0 0 .6rem">${esc(v.c)} · <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Open on YouTube</a></p>
      ${used.length || usedF.length ? `<p class="small" style="margin:0">Used with: ${used.map(d => `<a href="#/drill/${d.id}">${esc(d.n)}</a>`).concat(usedF.map(f => `<a href="#/fix/${f.id}">${esc(f.n)}</a>`)).join(' · ')}</p>` : ''}`;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal-x', modal).focus();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true; modalBody.innerHTML = ''; document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', e => {
    const v = e.target.closest('[data-video]');
    if (v) { e.preventDefault(); openVideo(v.dataset.video); return; }
    if (e.target.closest('[data-close]')) closeModal();
    const a = e.target.closest('#modalBody a[href^="#/"]');
    if (a) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  route();
})();
