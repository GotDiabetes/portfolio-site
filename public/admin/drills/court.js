/* ==========================================================================
   Court diagrams for the drill library.

   Each drill carries a one-line spec (built into data.js) and this turns it
   into an SVG. The court lies on its side: the near half on the left, the
   far half on the right, the net down the middle.

   Spec words, space separated:
     @full @orange @red @open   court (otherwise picked from the drill's ages)
     C:anchor                   coach or feeder (outlined)
     P: S: R: A: B: …           players, labelled with that letter
     X:anchor                   someone waiting their turn (grey)
     >a>b>c                     the ball's path        ^a>b  a lob
     ~a~b~c                     a player's movement (dashed)
     Z:zone                     a target zone            c:anchor  a cone
     o:anchor                   a ball or spot marker    split  a centre line
     line:a>b  net+  string  fence  balls:n|f  scatter:n
     target:x,y  hop:x,y  ladder:x,y  hex:x,y
   Anchors: n|f + BACK|BL|MID|SL|BOX|NET + lane ('' centre, l/r, lw/rw
   singles sideline, la/ra alley, lo/ro outside), nSERVEr/l, POSTr/l, or
   plain numbers "x,y" (x ±1 = singles sidelines, y ±1 = baselines).
   ========================================================================== */
(function () {
  const W = 400, H = 210;
  const COURTS = {
    full:   { len: 39, wid: 13.5, dbl: 18,   sl: 21 / 39, label: '78 ft court' },
    orange: { len: 30, wid: 10.5, dbl: 13.5, sl: 18 / 30, label: '60 ft orange court' },
    red:    { len: 18, wid: 9,    dbl: 0,    sl: 0.5,     label: '36 ft red court' },
    open:   { len: 18, wid: 9,    dbl: 0,    sl: 0,       label: 'Open space' },
  };
  const DEPTH = { BACK: 1.13, BL: 1, MID: 0.77, SL: 0.54, BOX: 0.27, NET: 0.15 };
  const LANE = { '': 0, l: -0.5, r: 0.5, lw: -1, rw: 1, la: -1.165, ra: 1.165, lo: -1.42, ro: 1.42 };

  function anchor(tok, c) {
    if (/^-?[\d.]+,-?[\d.]+$/.test(tok)) { const [x, y] = tok.split(',').map(Number); return { x, y }; }
    let m = tok.match(/^(n|f)SERVE(l|r)$/);
    if (m) return { x: (m[2] === 'r' ? 0.12 : -0.12), y: (m[1] === 'n' ? -1.04 : 1.04) };
    m = tok.match(/^POST(l|r)$/);
    if (m) return { x: m[1] === 'r' ? 1.45 : -1.45, y: 0 };
    m = tok.match(/^(n|f)(BACK|BL|MID|SL|BOX|NET)(l|r|lw|rw|la|ra|lo|ro)?$/);
    if (!m) return null;
    let y = DEPTH[m[2]];
    if (m[2] === 'SL') y = c.sl || 0.54;
    if (m[2] === 'BOX') y = (c.sl || 0.54) / 2;
    return { x: LANE[m[3] || ''], y: m[1] === 'n' ? -y : y };
  }

  // court units → svg. Near half on the left.
  function proj(c, s) {
    return p => ({ X: W / 2 + p.y * c.len * s, Y: H / 2 + p.x * c.wid * s });
  }

  function zoneRect(name, c) {
    const m = name.match(/^(n|f)(.+)$/);
    if (!m) return null;
    const sgn = m[1] === 'n' ? -1 : 1, z = m[2], sl = c.sl || 0.54;
    const dblX = c.dbl ? c.dbl / c.wid : 1;
    const R = (x0, x1, y0, y1) => ({ x0, x1, y0: sgn * y0, y1: sgn * y1 });
    // x sign: on the far side "L" is still screen-left in the upright frame
    const map = {
      Deep: R(-1, 1, sl, 1), DeepR: R(0, 1, sl, 1), DeepL: R(-1, 0, sl, 1),
      BoxR: R(0, 1, 0, sl), BoxL: R(-1, 0, 0, sl), Boxes: R(-1, 1, 0, sl),
      BoxRT: R(0, 0.5, 0, sl), BoxRW: R(0.5, 1, 0, sl), BoxLT: R(-0.5, 0, 0, sl), BoxLW: R(-1, -0.5, 0, sl),
      HalfR: R(0, dblX, 0, 1), HalfL: R(-dblX, 0, 0, 1),
      AlleyR: R(1, dblX, 0, 1), AlleyL: R(-dblX, -1, 0, 1),
      CornerR: R(0.55, 1, 0.78, 1), CornerL: R(-1, -0.55, 0.78, 1),
      ShortR: R(0.45, 1, 0, sl * 0.75), ShortL: R(-1, -0.45, 0, sl * 0.75),
      Court: R(-1, 1, 0, 1),
    };
    return map[z] || null;
  }

  const SCATTER = [[-0.55, -0.55], [0.5, -0.6], [0, -0.15], [-0.6, 0.4], [0.55, 0.45], [0.05, 0.75], [-0.1, -0.85], [0.75, 0.05]];

  function court(spec, stages) {
    const words = (spec || '').trim().split(/\s+/).filter(Boolean);
    let type = (words.find(w => w[0] === '@') || '').slice(1);
    if (!COURTS[type]) {
      const st = stages || [];
      const big = st.some(s => ['green', 'yellow', 'teen', 'adult', 'senior'].includes(s));
      type = big ? 'full' : st.includes('orange') ? 'orange' : st.length ? 'red' : 'full';
    }
    const c = COURTS[type];
    // fit the court plus run-off into the box
    const s = Math.min(W / (2 * c.len * 1.2), H / (2 * c.wid * 1.55));
    const P = proj(c, s);
    const pt = t => { const a = anchor(t, c); return a ? P(a) : null; };
    const out = [];
    const N = n => n.toFixed(1);

    // ground
    out.push(`<rect class="cd-ground" x="0" y="0" width="${W}" height="${H}" rx="6"/>`);
    const xs = c.dbl || c.wid;
    if (type === 'open') {
      const a = P({ x: -1.35, y: -1.1 }), b = P({ x: 1.35, y: 1.1 });
      out.push(`<rect class="cd-space" x="${N(a.X)}" y="${N(a.Y)}" width="${N(b.X - a.X)}" height="${N(b.Y - a.Y)}" rx="10"/>`);
    } else {
      const tl = P({ x: -xs / c.wid, y: -1 }), br = P({ x: xs / c.wid, y: 1 });
      out.push(`<rect class="cd-surface" x="${N(tl.X)}" y="${N(tl.Y)}" width="${N(br.X - tl.X)}" height="${N(br.Y - tl.Y)}"/>`);
      const L = (x1, y1, x2, y2, cls = 'cd-line') => { const a = P({ x: x1, y: y1 }), b = P({ x: x2, y: y2 }); out.push(`<line class="${cls}" x1="${N(a.X)}" y1="${N(a.Y)}" x2="${N(b.X)}" y2="${N(b.Y)}"/>`); };
      const d = xs / c.wid;
      L(-d, -1, d, -1); L(-d, 1, d, 1); L(-d, -1, -d, 1); L(d, -1, d, 1);
      if (c.dbl) { L(-1, -1, -1, 1); L(1, -1, 1, 1); }
      if (c.sl) { L(-1, -c.sl, 1, -c.sl); L(-1, c.sl, 1, c.sl); L(0, -c.sl, 0, c.sl); }
      L(0, -1, 0, -0.97); L(0, 1, 0, 0.97);
    }
    // overlays that sit under the people
    for (const w of words) {
      if (w.startsWith('Z:')) {
        const r = zoneRect(w.slice(2), c);
        if (!r) continue;
        const a = P({ x: r.x0, y: r.y0 }), b = P({ x: r.x1, y: r.y1 });
        out.push(`<rect class="cd-zone" x="${N(Math.min(a.X, b.X))}" y="${N(Math.min(a.Y, b.Y))}" width="${N(Math.abs(b.X - a.X))}" height="${N(Math.abs(b.Y - a.Y))}"/>`);
      } else if (w === 'split') {
        const a = P({ x: 0, y: -1.1 }), b = P({ x: 0, y: 1.1 });
        out.push(`<line class="cd-tdl" x1="${N(a.X)}" y1="${N(a.Y)}" x2="${N(b.X)}" y2="${N(b.Y)}"/>`);
      } else if (w.startsWith('line:')) {
        const [a, b] = w.slice(5).split('>').map(pt);
        if (a && b) out.push(`<line class="cd-tdl" x1="${N(a.X)}" y1="${N(a.Y)}" x2="${N(b.X)}" y2="${N(b.Y)}"/>`);
      } else if (w.startsWith('target:')) {
        const p = pt(w.slice(7));
        if (p) [34, 22, 9].forEach((r, i) => out.push(`<rect class="cd-target t${i}" x="${N(p.X - r)}" y="${N(p.Y - r)}" width="${2 * r}" height="${2 * r}" rx="3"/>`));
      } else if (w.startsWith('hop:')) {
        const p = pt(w.slice(4));
        if (p) for (let i = 0; i < 5; i++) out.push(`<rect class="cd-grid" x="${N(p.X - 40 + i * 16)}" y="${N(p.Y - 8)}" width="16" height="16"/>`);
      } else if (w.startsWith('ladder:')) {
        const p = pt(w.slice(7));
        if (p) for (let i = 0; i < 8; i++) out.push(`<rect class="cd-grid" x="${N(p.X - 64 + i * 16)}" y="${N(p.Y - 9)}" width="16" height="18"/>`);
      } else if (w.startsWith('hex:')) {
        const p = pt(w.slice(4));
        if (p) { const r = 30, pts = [...Array(6)].map((_, i) => `${N(p.X + r * Math.cos(Math.PI / 3 * i))},${N(p.Y + r * Math.sin(Math.PI / 3 * i))}`).join(' '); out.push(`<polygon class="cd-grid" points="${pts}"/>`); }
      } else if (w.startsWith('balls:')) {
        const sgn = w.endsWith('n') ? -1 : 1;
        [[-0.6, 0.35], [0.2, 0.6], [0.7, 0.25], [-0.2, 0.85], [0.5, 0.8], [-0.75, 0.7], [0.05, 0.3]].forEach(([x, y]) => { const p = P({ x, y: sgn * y }); out.push(`<circle class="cd-ball" cx="${N(p.X)}" cy="${N(p.Y)}" r="3.2"/>`); });
      }
    }
    // the net
    if (type !== 'open') {
      const a = P({ x: -(xs / c.wid) - 0.12, y: 0 }), b = P({ x: (xs / c.wid) + 0.12, y: 0 });
      out.push(`<line class="cd-net${words.includes('net+') ? ' raised' : ''}" x1="${N(a.X)}" y1="${N(a.Y)}" x2="${N(b.X)}" y2="${N(b.Y)}"/>`);
      out.push(`<circle class="cd-post" cx="${N(a.X)}" cy="${N(a.Y)}" r="2.2"/><circle class="cd-post" cx="${N(b.X)}" cy="${N(b.Y)}" r="2.2"/>`);
    } else if (words.includes('string') || words.includes('fence')) {
      const a = P({ x: -1.25, y: 0 }), b = P({ x: 1.25, y: 0 });
      out.push(`<line class="${words.includes('fence') ? 'cd-fence' : 'cd-string'}" x1="${N(a.X)}" y1="${N(a.Y)}" x2="${N(b.X)}" y2="${N(b.Y)}"/>`);
    }
    // paths
    const pathD = pts => {
      if (pts.length === 2) {
        const [a, b] = pts, mx = (a.X + b.X) / 2, my = (a.Y + b.Y) / 2;
        const dx = b.X - a.X, dy = b.Y - a.Y, len = Math.hypot(dx, dy) || 1;
        const bow = Math.min(18, len * 0.08);
        return `M${N(a.X)} ${N(a.Y)} Q${N(mx - dy / len * bow)} ${N(my + dx / len * bow)} ${N(b.X)} ${N(b.Y)}`;
      }
      return 'M' + pts.map(p => `${N(p.X)} ${N(p.Y)}`).join(' L');
    };
    for (const w of words) {
      if (w[0] === '>' || w[0] === '^') {
        const pts = w.slice(1).split('>').map(pt).filter(Boolean);
        if (pts.length < 2) continue;
        let d = pathD(pts);
        if (w[0] === '^') {
          const [a, b] = pts, mx = (a.X + b.X) / 2, my = (a.Y + b.Y) / 2;
          const dx = b.X - a.X, dy = b.Y - a.Y, len = Math.hypot(dx, dy) || 1;
          d = `M${N(a.X)} ${N(a.Y)} Q${N(mx - dy / len * 46)} ${N(my + dx / len * 46 - 30)} ${N(b.X)} ${N(b.Y)}`;
        }
        out.push(`<path class="cd-shot${w[0] === '^' ? ' lob' : ''}" d="${d}" marker-end="url(#cdArrow)"/>`);
      } else if (w[0] === '~') {
        const pts = w.slice(1).split('~').map(pt).filter(Boolean);
        if (pts.length >= 2) out.push(`<path class="cd-move" d="${'M' + pts.map(p => `${N(p.X)} ${N(p.Y)}`).join(' L')}" marker-end="url(#cdStep)"/>`);
      }
    }
    // cones and markers
    for (const w of words) {
      if (w.startsWith('c:')) {
        const p = pt(w.slice(2));
        if (p) out.push(`<path class="cd-cone" d="M${N(p.X)} ${N(p.Y - 5.5)} L${N(p.X + 5)} ${N(p.Y + 4)} L${N(p.X - 5)} ${N(p.Y + 4)} Z"/>`);
      } else if (w.startsWith('o:')) {
        const p = pt(w.slice(2));
        if (p) out.push(`<circle class="cd-ball" cx="${N(p.X)}" cy="${N(p.Y)}" r="3.6"/>`);
      }
    }
    // people
    const person = (role, p) => {
      const cls = role === 'C' ? 'coach' : role === 'X' ? 'wait' : 'player';
      out.push(`<g class="cd-p ${cls}"><circle cx="${N(p.X)}" cy="${N(p.Y)}" r="8.5"/><text x="${N(p.X)}" y="${N(p.Y + 3.4)}">${role === 'X' ? '' : role}</text></g>`);
    };
    for (const w of words) {
      const m = w.match(/^([A-Z]):(.+)$/);
      if (m && m[1] !== 'Z') { const p = pt(m[2]); if (p) person(m[1], p); }
      const sc = w.match(/^scatter:(\d+)$/);
      if (sc) SCATTER.slice(0, +sc[1]).forEach(([x, y]) => { const p = P({ x, y }); person('P', p); out.push(`<circle class="cd-ball" cx="${N(p.X + 11)}" cy="${N(p.Y - 8)}" r="3.2"/>`); });
    }
    // The arrowhead markers live once in the page (index.html), not per diagram.
    return { svg: `<svg class="court" viewBox="0 0 ${W} ${H}" role="img" aria-label="Court diagram, ${c.label}">${out.join('')}</svg>`, label: c.label, type };
  }

  window.Court = { draw: court };
})();
