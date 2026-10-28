/* ============================================================================
   Isaac Lee — the holo card in the lead.

   The lead's portrait is a collectible trading card: the photograph in an
   art window, the name across the top, two "moves" that are the two things
   the page says about the ZEP summer, and a holographic foil that sparkles
   as the card tilts under the pointer. The foil is a WebGL2 shader ported
   from React Bits' HoloCard (MIT, github.com/DavidHDev/react-bits); the
   card itself is drawn here, on a 2D canvas, from the JSON block inside the
   figure, so its text is edited in index.html, never in this file.

   The card's colours come from the photograph: its pixels are sampled once,
   the strongest hue becomes the frame (the sky, for the Newport picture) and
   the second one the panel and ink (the sand). Swap the photograph and the
   card recolours itself.

   Without JavaScript, without WebGL2, or before the photograph has loaded,
   the mounted <picture> underneath is what shows. With reduced motion the
   card neither drifts nor tilts, and the foil sits still.
   ========================================================================== */

(function () {
  "use strict";

  var fig = document.querySelector("[data-holo]");
  if (!fig || !window.requestAnimationFrame || !("ResizeObserver" in window)) return;
  var specEl = fig.querySelector('script[type="application/json"]');
  var spec;
  try { spec = JSON.parse(specEl.textContent); } catch (e) { return; }
  var src = fig.getAttribute("data-holo-image");
  if (!src) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var RATIO = 63 / 88;          // a trading card
  var PERSPECTIVE = 1100;
  var TEX_W = 1024;             // the drawn card, in texture pixels
  var TEX_H = Math.round(TEX_W / RATIO);
  /* A trading card's hand, not the page's: the humanist sans the Pokémon
     cards are set in (Gill Sans), from whatever the machine has. Macs and
     iPhones carry Gill Sans; Windows with Office has Gill Sans MT; the rest
     fall to the nearest humanist sans they do have. */
  var SANS = '"Gill Sans", "Gill Sans MT", "Gill Sans Nova", "Humanist 521", "Trebuchet MS", "Segoe UI", Calibri, sans-serif';

  /* ------------------------------------------------------- 1. Palette --
     The photograph, shrunk to a few thousand pixels, sorted into hue bins
     weighted by how saturated and mid-toned each pixel is. The heaviest
     bin is the frame; the heaviest one at least 60° away is the second
     colour. Sand and shadow pixels score low, sky scores high. */
  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  function samplePalette(img) {
    var w = 48, h = Math.max(1, Math.round(w * img.naturalHeight / img.naturalWidth));
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var x = c.getContext("2d", { willReadFrequently: true });
    var data;
    try { x.drawImage(img, 0, 0, w, h); data = x.getImageData(0, 0, w, h).data; }
    catch (e) { return null; }
    var bins = [];
    for (var i = 0; i < 24; i++) bins.push({ w: 0, sx: 0, sy: 0, s: 0, l: 0 });
    for (var p = 0; p < data.length; p += 4) {
      var v = hsl(data[p], data[p + 1], data[p + 2]);
      if (v[2] < 0.1 || v[2] > 0.94 || v[1] < 0.08) continue;
      var weight = v[1] * (1 - Math.abs(v[2] - 0.55));
      var b = bins[Math.floor(v[0] / 15) % 24];
      var rad = v[0] * Math.PI / 180;
      b.w += weight; b.sx += Math.cos(rad) * weight; b.sy += Math.sin(rad) * weight;
      b.s += v[1] * weight; b.l += v[2] * weight;
    }
    function pick(exclude) {
      var best = -1, bw = 0;
      for (var i = 0; i < 24; i++) {
        var dist = exclude < 0 ? 24 : Math.min(Math.abs(i - exclude), 24 - Math.abs(i - exclude));
        if (dist < 4) continue;
        if (bins[i].w > bw) { bw = bins[i].w; best = i; }
      }
      if (best < 0 || !bw) return null;
      var b = bins[best];
      var hue = Math.atan2(b.sy, b.sx) * 180 / Math.PI;
      return { i: best, h: (hue + 360) % 360, s: b.s / b.w, l: b.l / b.w };
    }
    var first = pick(-1);
    if (!first) return null;
    var second = pick(first.i) || { h: (first.h + 180) % 360, s: 0.2, l: 0.6 };
    return { primary: first, secondary: second };
  }

  /* The card's own colours, from the two sampled hues. Saturation and
     lightness are clamped so a dull or dark photograph still makes a card
     that reads as one. */
  function cardColors(pal) {
    var p = pal ? pal.primary : { h: 208, s: 0.5, l: 0.6 };
    var s = pal ? pal.secondary : { h: 32, s: 0.3, l: 0.6 };
    var fs = Math.min(0.78, Math.max(0.42, p.s * 1.25));
    function c(h, sat, l) { return "hsl(" + Math.round(h) + " " + Math.round(sat * 100) + "% " + Math.round(l * 100) + "%)"; }
    return {
      frame: c(p.h, fs, 0.58),
      frameDeep: c(p.h, fs, 0.47),
      frameLight: c(p.h, fs * 0.9, 0.7),
      frameEdge: c(p.h, fs * 0.8, 0.82),
      accent: c(p.h, Math.min(0.7, fs), 0.3),
      panel: c(s.h, Math.min(0.4, Math.max(0.15, s.s)), 0.93),
      panelDeep: c(s.h, Math.min(0.4, Math.max(0.15, s.s)), 0.86),
      line: c(s.h, 0.22, 0.74),
      ink: c(s.h, 0.3, 0.13),
      muted: c(s.h, 0.16, 0.38),
    };
  }

  /* ------------------------------------------------------- 2. The card --
     Drawn at TEX_W × TEX_H with transparent rounded corners; the shader
     keeps that alpha, so the corners stay clear under the foil. */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* Letter-spaced text, drawn a character at a time so it works where
     ctx.letterSpacing does not. align: "left" | "right" | "center". */
  function spaced(ctx, text, x, y, gap, align) {
    var chars = String(text).split(""), width = -gap, i;
    for (i = 0; i < chars.length; i++) width += ctx.measureText(chars[i]).width + gap;
    var cx = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
    ctx.textAlign = "left";
    for (i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], cx, y);
      cx += ctx.measureText(chars[i]).width + gap;
    }
    return width;
  }

  /* Breaks text into lines for the current ctx.font; past maxLines the
     rest is cut with an ellipsis. */
  function wrapLines(ctx, text, maxWidth, maxLines) {
    var words = String(text).split(" "), lines = [], line = "", cut = false;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        if (lines.length >= maxLines - 1) { line = words.slice(i).join(" "); break; }
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) {
      while (ctx.measureText(line).width > maxWidth && line.length > 1) { line = line.replace(/\s*…?\S+$/, "") + "…"; cut = true; }
      lines.push(line);
    }
    lines.cut = cut;                     // true when words were lost to the ellipsis
    return lines;
  }

  /* The moves' sentences are measured before anything is drawn, since the
     font differs from machine to machine (Gill Sans is narrower than its
     stand-ins): the sentence size steps down from 26px until both moves fit
     the room the panel has. Returns the size, the line height, each move's
     lines and the panel height they need. */
  function fitMoves(ctx, moves, textW, maxH) {
    var best = null;
    for (var size = 26; size >= 20; size -= 2) {
      ctx.font = "400 " + size + "px " + SANS;
      var lh = Math.round(size * 1.27);
      var blocks = moves.map(function (m) { return wrapLines(ctx, m.text || "", textW, 3); });
      var h = 52 + 12;
      blocks.forEach(function (lines, i) { h += (i ? 56 : 0) + 40 + (lines.length - 1) * lh + Math.round(size * 0.3); });
      best = { size: size, lh: lh, blocks: blocks, height: h };
      if (h <= maxH && !blocks.some(function (b) { return b.cut; })) break;
    }
    return best;
  }

  /* The photograph, cover-fitted into a window, with a focus point (0..1)
     choosing which part survives the crop. */
  function cover(ctx, img, x, y, w, h, fx, fy) {
    var s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var sw = w / s, sh = h / s;
    ctx.drawImage(img, (img.naturalWidth - sw) * fx, (img.naturalHeight - sh) * fy, sw, sh, x, y, w, h);
  }

  /* The card's type mark: the Lee Tennis Co. LT monogram in a disc. The
     two paths are public/images/lee-tennis-mark.svg (viewBox 94 × 78, the
     glyphs between x 11..83 and y 11..66), drawn here in the card's ink. */
  var LT = ["M24 11H38L26 53H58L54 66H11Z", "M44 11H83L79 24H66L58 49H44L52 24H40Z"];
  function monogram(ctx, cx, cy, r, fill, ink) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.strokeStyle = ink; ctx.stroke();
    var s = (r * 1.25) / 72;                         // the glyphs span 62% of the disc
    ctx.translate(cx - 47 * s, cy - 38.5 * s);
    ctx.scale(s, s);
    ctx.fillStyle = ink;
    LT.forEach(function (d) { ctx.fill(new Path2D(d), "evenodd"); });
    ctx.restore();
  }

  function compose(img, colors) {
    var W = TEX_W, H = TEX_H;
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var ctx = c.getContext("2d");
    var R = 40;                         // corner radius, matches --hc-radius at display size
    var M = 42;                         // the frame's width
    var inner = { x: M, y: M, w: W - 2 * M };

    roundRect(ctx, 0, 0, W, H, R);
    ctx.clip();

    /* Frame: a vertical sweep of the frame colour, lighter at the top, with
       fine diagonal hatching so the foil has a texture to catch. */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, colors.frameLight);
    g.addColorStop(0.5, colors.frame);
    g.addColorStop(1, colors.frameDeep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    for (var d = -H; d < W; d += 11) {
      ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + H, H); ctx.stroke();
    }
    ctx.restore();
    /* A light line just inside the edge, the way a printed card has one. */
    roundRect(ctx, 10, 10, W - 20, H - 20, R - 10);
    ctx.lineWidth = 2; ctx.strokeStyle = colors.frameEdge; ctx.globalAlpha = 0.7; ctx.stroke();
    ctx.globalAlpha = 1;

    /* Header: a small tag, the name, and the one number with its mark. */
    var y = 66;
    ctx.fillStyle = colors.ink;
    ctx.font = "700 22px " + SANS;
    ctx.textBaseline = "alphabetic";
    spaced(ctx, String(spec.tag || "").toUpperCase(), inner.x + 8, y, 1.6, "left");
    y += 70;
    ctx.font = "700 80px " + SANS;
    ctx.textAlign = "left";
    ctx.fillText(spec.name || "", inner.x + 4, y);
    if (spec.stat) {
      var right = W - M - 6;
      monogram(ctx, right - 30, y - 26, 30, colors.panel, colors.ink);
      ctx.font = "700 62px " + SANS;
      ctx.textAlign = "right";
      ctx.fillText(spec.stat.value, right - 76, y);
      var vw = ctx.measureText(spec.stat.value).width;
      ctx.font = "700 26px " + SANS;
      spaced(ctx, String(spec.stat.label).toUpperCase(), right - 76 - vw - 14, y - 2, 1, "right");
    }

    /* The moves panel is measured first, so the art window takes whatever
       height is left above it: up to 790, less if the sentences need more
       lines in this machine's font. The facts row sits at a fixed height. */
    var art = { x: M + 18, y: y + 26, w: W - 2 * (M + 18) };
    var panel = { x: M + 18, w: W - 2 * (M + 18) };
    var footTop = H - M - 92;             // where the facts row begins
    var stripH = spec.strip ? 56 : 26;    // from the art's bottom edge to the panel
    var moves = (spec.moves || []).slice(0, 2);
    var layout = fitMoves(ctx, moves, panel.w - 68, footTop - 16 - stripH - (art.y + 560));
    panel.h = layout.height;
    art.h = Math.min(spec.strip ? 760 : 790, footTop - 16 - panel.h - stripH - art.y);

    /* Art window: the photograph, with its own double rule. */
    ctx.save();
    ctx.fillStyle = colors.frameDeep;
    ctx.fillRect(art.x - 5, art.y - 5, art.w + 10, art.h + 10);
    ctx.beginPath(); ctx.rect(art.x, art.y, art.w, art.h); ctx.clip();
    cover(ctx, img, art.x, art.y, art.w, art.h, spec.focus ? spec.focus[0] : 0.5, spec.focus ? spec.focus[1] : 0.55);
    ctx.restore();
    ctx.strokeStyle = colors.frameEdge; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
    ctx.strokeRect(art.x + 0.75, art.y + 0.75, art.w - 1.5, art.h - 1.5);
    ctx.globalAlpha = 1;

    /* An optional strip under the art: one small line, centred. */
    y = art.y + art.h;
    if (spec.strip) {
      y += 34;
      ctx.fillStyle = colors.ink;
      ctx.font = "700 19px " + SANS;
      spaced(ctx, String(spec.strip).toUpperCase(), W / 2, y, 1.4, "center");
      y += 22;
    } else {
      y += 26;
    }

    /* Moves: a pale panel, each move a name, a number and a sentence, each
       placed under the measured end of the one before. */
    panel.y = y;
    roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 10);
    ctx.fillStyle = colors.panel; ctx.fill();
    ctx.strokeStyle = colors.line; ctx.lineWidth = 1.5; ctx.stroke();
    var top = panel.y + 52;               // the first move's title baseline
    moves.forEach(function (m, i) {
      var lines = layout.blocks[i];
      if (i) {
        ctx.strokeStyle = colors.line; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(panel.x + 28, top - 38); ctx.lineTo(panel.x + panel.w - 28, top - 38); ctx.stroke();
      }
      ctx.fillStyle = colors.accent;
      ctx.beginPath(); ctx.arc(panel.x + 46, top - 12, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colors.ink;
      ctx.font = "700 42px " + SANS; ctx.textAlign = "left";
      ctx.fillText(m.name || "", panel.x + 76, top);
      ctx.font = "700 48px " + SANS; ctx.textAlign = "right";
      ctx.fillText(m.number || "", panel.x + panel.w - 34, top);
      ctx.font = "400 " + layout.size + "px " + SANS; ctx.textAlign = "left";
      lines.forEach(function (line, k) { ctx.fillText(line, panel.x + 34, top + 40 + k * layout.lh); });
      top += 40 + (lines.length - 1) * layout.lh + Math.round(layout.size * 0.3) + 56;
    });

    /* Facts row: three labelled values on a pale band, like the bottom row
       of any card. */
    var facts = (spec.facts || []).slice(0, 3);
    var colW = (W - 2 * (M + 18)) / Math.max(1, facts.length);
    roundRect(ctx, panel.x, footTop - 2, panel.w, 76, 8);
    ctx.fillStyle = colors.panel; ctx.globalAlpha = 0.82; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.line; ctx.lineWidth = 1.5; ctx.stroke();
    facts.forEach(function (f, i) {
      var cx = M + 18 + colW * i + colW / 2;
      ctx.fillStyle = colors.muted;
      ctx.font = "700 16px " + SANS;
      spaced(ctx, String(f[0] || "").toUpperCase(), cx, footTop + 24, 1.6, "center");
      ctx.fillStyle = colors.ink;
      ctx.font = "400 27px " + SANS; ctx.textAlign = "center";
      ctx.fillText(f[1] || "", cx, footTop + 60);
    });

    /* Credit and set line, in the frame's bottom edge. */
    ctx.fillStyle = colors.ink;
    ctx.font = "400 17px " + SANS;
    spaced(ctx, spec.credit || "", M + 10, H - 22, 0.6, "left");
    ctx.font = "700 17px " + SANS;
    spaced(ctx, String(spec.set || "").toUpperCase(), W - M - 32, H - 22, 1.2, "right");
    ctx.font = "400 20px " + SANS; ctx.textAlign = "left";
    ctx.fillText("★", W - M - 24, H - 21);
    return c;
  }

  /* -------------------------------------------------------- 3. The foil --
     React Bits' fragment shader, unchanged: the foil pattern, the light
     and view vectors from the tilt, the glitter at the frame, the glare. */
  var VERTEX = "#version 300 es\nin vec2 position;\nvoid main() {\n  gl_Position = vec4(position, 0.0, 1.0);\n}\n";
  var FRAGMENT = [
    "#version 300 es",
    "precision highp float;",
    "uniform sampler2D uArt; uniform vec2 uSize; uniform float uAspect; uniform vec2 uTilt; uniform vec2 uLight;",
    "uniform float uDistance; uniform int uPreset; uniform float uIntensity; uniform float uScale; uniform float uEdge;",
    "uniform float uFrame; uniform float uRadius; uniform float uGlare; uniform vec3 uFoil; uniform float uReady;",
    "out vec4 outColor;",
    "const float TAU = 6.28318530718;",
    "struct Foil { float mask; float angle; float jitter; vec2 facet; };",
    "float hash(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }",
    "vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 17.31)); }",
    "vec3 hue(float t) {",
    "  t = abs(fract(t * 0.5) * 2.0 - 1.0);",
    "  vec3 c = mix(vec3(0.1, 0.25, 1.0), vec3(0.0, 0.85, 1.0), smoothstep(0.0, 0.25, t));",
    "  c = mix(c, vec3(0.25, 1.0, 0.2), smoothstep(0.25, 0.45, t));",
    "  c = mix(c, vec3(1.0, 0.92, 0.05), smoothstep(0.45, 0.65, t));",
    "  c = mix(c, vec3(1.0, 0.45, 0.05), smoothstep(0.65, 0.85, t));",
    "  return mix(c, vec3(0.95, 0.12, 0.3), smoothstep(0.85, 1.0, t));",
    "}",
    "Foil bursts(vec2 p) {",
    "  vec2 q = mat2(0.7071068, 0.7071068, -0.7071068, 0.7071068) * (p - vec2(0.5, 0.5 * uAspect)) / (0.283 / uScale);",
    "  vec2 d = fract(q) - 0.5; float u = length(d) / 0.49; float angle = atan(d.y, d.x);",
    "  if (u < 0.12) {",
    "    float ring = min(floor(u / 0.045 + 0.5), 2.0); float count = max(1.0, ring * 6.0);",
    "    float spot = (floor(angle / TAU * count) + 0.5) / count * TAU;",
    "    vec2 dot = vec2(cos(spot), sin(spot)) * ring * 0.045;",
    "    float m = smoothstep(0.024, 0.012, length(d / 0.49 - dot));",
    "    return Foil(m, angle, 0.5, vec2(0.0));",
    "  }",
    "  bool inner = u < 0.66; float slot = angle / TAU * (inner ? 56.0 : 72.0);",
    "  bool shifted = mod(floor(slot), 2.0) > 0.5;",
    "  vec2 band = inner ? (shifted ? vec2(0.45, 0.61) : vec2(0.33, 0.49)) : (shifted ? vec2(0.84, 0.99) : vec2(0.7, 0.85));",
    "  float across = abs(u - (band.x + band.y) * 0.5) / ((band.y - band.x) * 0.5);",
    "  float along = abs(fract(slot) - 0.5) * 2.0; float width = inner ? 0.72 : 0.6;",
    "  float m = smoothstep(1.0, 0.78, across) * smoothstep(width, width - 0.2, along);",
    "  return Foil(m, angle, 0.5, vec2(0.0));",
    "}",
    "Foil glitter(vec2 p) {",
    "  vec2 g = p * 72.0 * uScale; vec2 cell = floor(g); float size = mix(0.18, 0.4, hash(cell + 3.0));",
    "  float m = smoothstep(size, size * 0.55, length(fract(g) - 0.5 - (hash2(cell) - 0.5) * 0.5)) * step(0.25, hash(cell + 5.0));",
    "  return Foil(m, hash(cell + 7.0) * TAU, hash(cell + 9.0), (hash2(cell + 11.0) - 0.5) * 0.9);",
    "}",
    "Foil stars(vec2 p) {",
    "  Foil best = Foil(0.0, 0.0, 0.0, vec2(0.0)); vec2 g = p / (0.08 / uScale); vec2 base = floor(g);",
    "  for (int j = -1; j <= 1; j++) { for (int i = -1; i <= 1; i++) {",
    "    vec2 id = base + vec2(float(i), float(j)); float pick = hash(id + 1.3);",
    "    vec2 d = g - (id + 0.5 + (hash2(id) - 0.5) * 0.55); float m = smoothstep(0.07, 0.035, length(d));",
    "    if (pick < 0.62) {",
    "      float size = mix(0.16, 0.5, pow(hash(id + 9.0), 1.8)); float sector = TAU / (pick < 0.3 ? 4.0 : 5.0);",
    "      float k = abs(fract((atan(d.y, d.x) + hash(id + 4.0) * TAU) / sector) - 0.5) * 2.0;",
    "      float edge = size * mix(1.0, 0.36, pow(k, 0.6)); m = smoothstep(edge, edge * 0.8, length(d));",
    "    }",
    "    if (m > best.mask) best = Foil(m, hash(id + 6.0) * TAU, hash(id + 8.0), (hash2(id + 2.0) - 0.5) * 0.6);",
    "  } }",
    "  return best;",
    "}",
    "vec3 sparkles(vec2 p, vec3 halfway, vec2 sweep, float awake) {",
    "  vec2 g = p * 62.0; vec2 cell = floor(g); vec2 d = fract(g) - 0.5 - (hash2(cell) - 0.5) * 0.36;",
    "  float spin = hash(cell + 3.0) * TAU; d = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * d;",
    "  vec2 a = abs(d); float hexagon = max(a.x * 0.866 + a.y * 0.5, a.y);",
    "  float size = mix(0.22, 0.38, hash(cell + 2.0));",
    "  float piece = smoothstep(size, size - 0.07, hexagon) * step(0.42, hash(cell + 4.0));",
    "  vec3 facet = normalize(vec3((hash2(cell + 6.0) - 0.5) * 0.9, 1.0));",
    "  float flash = pow(max(dot(facet, halfway), 0.0), 6.0);",
    "  vec3 tint = hue(dot(sweep, vec2(cos(spin), sin(spin))) * 1.2 + dot(sweep, vec2(0.8, 0.6)) * 0.8 + hash(cell + 8.0) * 0.5);",
    "  vec3 color = piece * tint * (0.3 + 1.6 * flash) * awake;",
    "  vec2 fine = p * 210.0; vec2 speckCell = floor(fine);",
    "  float speck = smoothstep(0.24, 0.0, length(fract(fine) - 0.5 - (hash2(speckCell) - 0.5) * 0.5)) * step(0.72, hash(speckCell + 1.0));",
    "  float speckFlash = pow(max(dot(normalize(vec3((hash2(speckCell + 2.0) - 0.5) * 0.9, 1.0)), halfway), 0.0), 10.0);",
    "  return color + vec3(1.2) * speck * speckFlash * (1.0 - piece);",
    "}",
    "void main() {",
    "  vec2 uv = vec2(gl_FragCoord.x / uSize.x, 1.0 - gl_FragCoord.y / uSize.y);",
    "  vec2 p = vec2(uv.x, uv.y * uAspect); vec2 center = vec2(0.5, 0.5 * uAspect);",
    "  vec2 q = abs(p - center) - center + uRadius;",
    "  float outside = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;",
    "  float pixel = 1.0 / uSize.x; float alpha = clamp(0.5 - outside / pixel, 0.0, 1.0);",
    "  vec4 sampled = texture(uArt, uv); if (uReady > 0.5) alpha *= sampled.a;",
    "  if (alpha <= 0.0) { outColor = vec4(0.0); return; }",
    "  vec3 art = uReady > 0.5 ? pow(sampled.rgb, vec3(2.2)) : vec3(0.12);",
    "  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(uTilt.x), sin(uTilt.x), 0.0, -sin(uTilt.x), cos(uTilt.x));",
    "  mat3 ry = mat3(cos(uTilt.y), 0.0, -sin(uTilt.y), 0.0, 1.0, 0.0, sin(uTilt.y), 0.0, cos(uTilt.y));",
    "  mat3 turn = rx * ry; vec3 world = turn * vec3(p - center, 0.0);",
    "  vec3 view = normalize(transpose(turn) * (vec3(0.0, 0.0, uDistance) - world));",
    "  vec3 lamp = vec3((uLight - 0.5) * vec2(1.1, 1.1 * uAspect), 0.9);",
    "  vec3 light = normalize(transpose(turn) * (lamp - world));",
    "  vec3 halfway = normalize(light + view); vec2 sweep = light.xy + view.xy;",
    "  float sheen = pow(max(halfway.z, 0.0), 10.0); float shine = pow(max(halfway.z, 0.0), 80.0);",
    "  float frame = 1.0 - smoothstep(uFrame - pixel, uFrame + pixel, -outside);",
    "  Foil f; if (uPreset == 0) f = bursts(p); else if (uPreset == 1) f = stars(p); else f = glitter(p);",
    "  vec3 metal = uFoil;",
    "  vec4 look = uPreset == 0 ? vec4(0.25, 1.9, 0.12, 1.0) : uPreset == 1 ? vec4(0.6, 1.4, 0.3, 1.0) : vec4(0.9, 1.0, 0.6, 1.0);",
    "  vec2 dir = vec2(cos(f.angle), sin(f.angle));",
    "  float phase = dot(sweep, dir) * look.x + dot(sweep, vec2(0.8, 0.6)) * look.y + f.jitter * look.z;",
    "  vec3 tint = hue(phase);",
    "  float glint = pow(max(dot(normalize(vec3(f.facet, 1.0)), halfway), 0.0), 24.0) * step(0.001, length(f.facet));",
    "  vec3 foil = mix(tint, vec3(1.0), 0.12) * (1.15 + 0.3 * sheen) + metal * glint * 1.2;",
    "  float tilted = smoothstep(0.02, 0.21, length(sin(uTilt))); float awake = mix(0.2, 1.0, tilted);",
    "  float strength = uIntensity * f.mask * (1.0 - frame) * awake;",
    "  vec3 color = mix(art, foil, clamp(strength * look.w, 0.0, 1.0));",
    "  color += sparkles(p, halfway, sweep, mix(0.55, 1.0, tilted)) * uEdge * frame;",
    "  color += uFoil * sheen * 0.12 * frame;",
    "  color += vec3(sheen * 0.07 + shine * 0.3) * uGlare;",
    "  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));",
    "  outColor = vec4(color * alpha, alpha);",
    "}",
  ].join("\n");

  var SETTINGS = {
    preset: { bursts: 0, stars: 1, glitter: 2 }[spec.preset] || 0,
    intensity: 0.85, scale: 1, edgeSparkle: 0.8, frame: 0.04, glare: 0.5,
    foil: [0.78, 0.8, 0.84],
    radius: 14, tiltMax: 14, hoverScale: 1.04, idle: true,
  };

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  }

  /* ---------------------------------------------------------- 4. Build --
     The card's DOM, built once the photograph is in: a shadow, a rotor
     that tilts, and a face holding the drawn card with the foil canvas on
     top. The <picture> stays in the markup and hides when the card is up. */
  var img = new Image();
  img.decoding = "async";
  img.onload = function () {
    if (!img.naturalWidth) return;
    var colors = cardColors(samplePalette(img));
    var art = compose(img, colors);

    var root = document.createElement("div");
    root.className = "holo-card";
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", spec.alt || (spec.name + ", a holographic trading card"));
    root.innerHTML =
      '<span class="holo-card__shadow" aria-hidden="true"></span>' +
      '<div class="holo-card__rotor"><div class="holo-card__face"></div></div>';
    var shadow = root.firstChild;
    var rotor = root.querySelector(".holo-card__rotor");
    var face = root.querySelector(".holo-card__face");
    face.appendChild(art);               // the card itself, visible even without WebGL2
    var canvas = document.createElement("canvas");
    face.appendChild(canvas);

    var picture = fig.querySelector("picture");
    fig.insertBefore(root, picture);
    picture.hidden = true;
    fig.classList.add("portrait--live");

    /* ---- WebGL2: the foil. Missing it, the card still tilts. ---- */
    var gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    var program = null, texture = null, uniforms = {};
    if (gl) {
      var vs = compile(gl, gl.VERTEX_SHADER, VERTEX), fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      if (vs && fs) {
        program = gl.createProgram();
        gl.attachShader(program, vs); gl.attachShader(program, fs);
        gl.bindAttribLocation(program, 0, "position");
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); program = null; }
      }
      if (program) {
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, art);
        gl.generateMipmap(gl.TEXTURE_2D);
        ["uArt", "uSize", "uAspect", "uTilt", "uLight", "uDistance", "uPreset", "uIntensity", "uScale", "uEdge",
          "uFrame", "uRadius", "uGlare", "uFoil", "uReady"].forEach(function (name) {
          uniforms[name] = gl.getUniformLocation(program, name);
        });
        root.setAttribute("data-foil", "");
      }
    }

    var state = {
      tiltX: 0, tiltY: 0, tiltVX: 0, tiltVY: 0,
      lightX: 0.36, lightY: 0.26, lightVX: 0, lightVY: 0,
      lift: 1, liftV: 0, clock: Math.random() * 40,
    };
    var pointer = { x: 0.5, y: 0.5, inside: false };
    var raf = 0, last = 0, visible = true, calm = 0;

    function draw() {
      if (!program) return;
      var w = canvas.width, h = canvas.height;
      if (!w || !h) return;
      var s = SETTINGS;
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniforms.uArt, 0);
      gl.uniform2f(uniforms.uSize, w, h);
      gl.uniform1f(uniforms.uAspect, h / w);
      gl.uniform2f(uniforms.uTilt, state.tiltX * Math.PI / 180, state.tiltY * Math.PI / 180);
      gl.uniform2f(uniforms.uLight, state.lightX, state.lightY);
      gl.uniform1f(uniforms.uDistance, PERSPECTIVE / Math.max(1, canvas.clientWidth));
      gl.uniform1i(uniforms.uPreset, s.preset);
      gl.uniform1f(uniforms.uIntensity, s.intensity);
      gl.uniform1f(uniforms.uScale, s.scale);
      gl.uniform1f(uniforms.uEdge, s.edgeSparkle);
      gl.uniform1f(uniforms.uFrame, s.frame);
      gl.uniform1f(uniforms.uRadius, s.radius / Math.max(1, canvas.clientWidth));
      gl.uniform1f(uniforms.uGlare, s.glare);
      gl.uniform3f(uniforms.uFoil, s.foil[0], s.foil[1], s.foil[2]);
      gl.uniform1f(uniforms.uReady, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function spring(value, velocity, target, stiffness, damping, dt) {
      var next = velocity + ((target - value) * stiffness - velocity * damping) * dt;
      return [value + next * dt, next];
    }

    /* The loop runs only while something moves: the pointer, the idle
       drift, or a spring still settling. Calm for a third of a second and
       it stops until the next pointer event or scroll into view. */
    function tick(now) {
      raf = 0;
      var dt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000));
      last = now;
      var s = SETTINGS;
      var targetX = 0, targetY = 0, lightX = 0.36, lightY = 0.26, lift = 1;
      var drifting = s.idle && !reduce && !pointer.inside;
      if (pointer.inside && !reduce) {
        targetX = (0.5 - pointer.y) * 2 * s.tiltMax;
        targetY = (pointer.x - 0.5) * 2 * s.tiltMax;
        lightX = pointer.x; lightY = pointer.y;
        lift = s.hoverScale;
      } else if (drifting) {
        state.clock += dt;
        var t = state.clock;
        targetX = Math.sin(t * 0.7) * s.tiltMax * 0.28;
        targetY = Math.sin(t * 0.53 + 1.2) * s.tiltMax * 0.4;
        lightX = 0.5 + Math.sin(t * 0.41) * 0.42;
        lightY = 0.38 + Math.sin(t * 0.33 + 0.6) * 0.3;
      }
      var steps = Math.ceil(dt / (1 / 240)), h = dt / steps, r;
      for (var i = 0; i < steps; i++) {
        r = spring(state.tiltX, state.tiltVX, targetX, 150, 16, h); state.tiltX = r[0]; state.tiltVX = r[1];
        r = spring(state.tiltY, state.tiltVY, targetY, 150, 16, h); state.tiltY = r[0]; state.tiltVY = r[1];
        r = spring(state.lightX, state.lightVX, lightX, 220, 30, h); state.lightX = r[0]; state.lightVX = r[1];
        r = spring(state.lightY, state.lightVY, lightY, 220, 30, h); state.lightY = r[0]; state.lightVY = r[1];
        r = spring(state.lift, state.liftV, lift, 320, 30, h); state.lift = r[0]; state.liftV = r[1];
      }
      rotor.style.transform = "perspective(" + PERSPECTIVE + "px) scale(" + state.lift + ") rotateX(" + state.tiltX + "deg) rotateY(" + state.tiltY + "deg)";
      shadow.style.transform = "translate(" + (-state.tiltY * 0.7) + "px, " + (state.tiltX * 0.7) + "px) scale(" + (0.9 + (state.lift - 1) * 1.5) + ")";
      draw();
      var motion = Math.abs(state.tiltVX) + Math.abs(state.tiltVY) + Math.abs(state.liftV) * 40 +
        (Math.abs(state.lightVX) + Math.abs(state.lightVY)) * 60 +
        Math.abs(state.tiltX - targetX) + Math.abs(state.tiltY - targetY);
      calm = motion > 0.02 ? 0 : calm + dt;
      if (!visible || (!drifting && !pointer.inside && calm > 0.3)) return;
      raf = requestAnimationFrame(tick);
    }

    function wake() {
      if (raf) return;
      calm = 0;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      draw();
      wake();
    }

    function track(e) {
      if (e.pointerType === "touch" && e.type === "pointermove" && !e.buttons) return;
      var rect = root.getBoundingClientRect();
      pointer.x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      pointer.y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      pointer.inside = true;
      wake();
    }
    function leave() { pointer.inside = false; wake(); }

    root.addEventListener("pointerenter", track);
    root.addEventListener("pointermove", track);
    root.addEventListener("pointerdown", track);
    root.addEventListener("pointerleave", leave);
    root.addEventListener("pointercancel", leave);

    new ResizeObserver(resize).observe(canvas);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries.some(function (entry) { return entry.isIntersecting; });
        if (visible) wake();
      }).observe(root);
    }
    resize();
    root.setAttribute("data-ready", "");
  };
  img.src = src;
})();
