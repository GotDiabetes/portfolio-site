/* ============================================================================
   The printed pages' script: the flyer (/flyer/) and the gift card
   (/gift-card/).

     1. QR codes
     2. The print button
     3. The gift card's fields

   1. QR codes. No library: a small encoder (byte mode, versions 1–6, error
   correction Q where it fits, so a creased or torn corner still scans),
   enough for a page address.

   Every element with data-qr gets an SVG of the code for this page's own
   language: https://leetennisco.com/<lang>/ plus whatever data-qr holds
   (?from=flyer, so visits from paper are counted). Every element with
   data-qr-text gets the same address as plain text, for anyone who would
   rather type it. The element carries its own role="img" and aria-label.
   ========================================================================== */

(function () {
  "use strict";

  // The encoder's table (used below): for each level, its format bits, then
  // error-correction codewords per block and blocks, for versions 1–6.
  var LEVELS = {
    Q: [3, [13, 22, 18, 26, 18, 24], [1, 1, 2, 2, 4, 4]],
    M: [0, [10, 16, 26, 18, 24, 16], [1, 1, 1, 2, 2, 4]],
  };

  var SITE = "https://leetennisco.com";
  // "/ko/flyer/" → "/ko/", "/flyer/" → "/"
  var langPath = location.pathname.replace(/(?:flyer|gift-card)\/.*$/, "");
  if (!/^\/(?:[a-z-]+\/)?$/.test(langPath)) langPath = "/";

  document.querySelectorAll("[data-qr]").forEach(function (el) {
    var m = encode(SITE + langPath + (el.getAttribute("data-qr") || ""));
    if (m) el.innerHTML = svg(m);
  });
  document.querySelectorAll("[data-qr-text]").forEach(function (el) {
    el.textContent = "leetennisco.com" + langPath.replace(/\/$/, "");
  });

  /* On a screen narrower than the paper, the preview shrinks to fit (the
     --fit zoom in print.css); printing is always at full size. */
  var fit = function () {
    var room = document.documentElement.clientWidth - 32;
    document.documentElement.style.setProperty("--fit", room < 816 ? (room / 816).toFixed(3) : "1");
  };
  fit();
  window.addEventListener("resize", fit);

  /* --------------------------------------------------- 2. Print button -- */
  document.querySelectorAll("[data-print]").forEach(function (b) {
    b.hidden = false;
    b.addEventListener("click", function () { window.print(); });
  });

  /* ------------------------------------------- 3. The gift card's fields --
     Each field in the form writes into the card element with the same
     data-card name; a select writes its chosen option's words. A field
     left empty prints as a line to write on by hand. */
  var cardForm = document.getElementById("cardForm");
  if (cardForm) {
    var sync = function () {
      Array.prototype.forEach.call(cardForm.elements, function (f) {
        if (!f.name) return;
        var v = f.tagName === "SELECT" ? f.options[f.selectedIndex].text : f.value.replace(/\s+/g, " ").trim();
        document.querySelectorAll('[data-card="' + f.name + '"]').forEach(function (el) {
          el.textContent = v;
          el.classList.toggle("is-blank", !v);
          if (el.hasAttribute("data-card-row")) el.parentNode.hidden = !v;
        });
      });
    };
    cardForm.addEventListener("input", sync);
    cardForm.addEventListener("change", sync);
    cardForm.addEventListener("submit", function (e) { e.preventDefault(); });
    sync();
  }

  /* ------------------------------------------------------------ Encoder -- */
  function encode(text) {
    var bytes = utf8(text);
    var order = ["Q", "M"];
    for (var l = 0; l < order.length; l++) {
      for (var ver = 1; ver <= 6; ver++) {
        var lv = LEVELS[order[l]];
        var total = rawModules(ver) >> 3;
        var dataCap = total - lv[1][ver - 1] * lv[2][ver - 1];
        if (12 + bytes.length * 8 <= dataCap * 8) {
          return build(bytes, ver, lv, dataCap, total);
        }
      }
    }
    return null;
  }

  function rawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var n = Math.floor(ver / 7) + 2;
      r -= (25 * n - 10) * n - 55;
    }
    return r;
  }

  function build(bytes, ver, lv, dataCap, total) {
    var eccLen = lv[1][ver - 1], blocks = lv[2][ver - 1];
    var bits = [];
    push(bits, 4, 4);                 // byte mode
    push(bits, bytes.length, 8);
    bytes.forEach(function (b) { push(bits, b, 8); });
    push(bits, 0, Math.min(4, dataCap * 8 - bits.length));
    push(bits, 0, (8 - bits.length % 8) % 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) {
      var v = 0;
      for (var j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      data.push(v);
    }
    for (var pad = 0xEC; data.length < dataCap; pad ^= 0xEC ^ 0x11) data.push(pad);

    var size = ver * 4 + 17;
    var q = { size: size, ver: ver, format: lv[0], dark: grid(size), fn: grid(size) };
    drawFunctionPatterns(q);
    drawCodewords(q, interleave(data, eccLen, blocks, total));

    var best = 0, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(q, m);
      drawFormat(q, m);
      var score = penalty(q);
      if (score < bestScore) { best = m; bestScore = score; }
      applyMask(q, m);                // masking twice undoes it
    }
    applyMask(q, best);
    drawFormat(q, best);
    return q.dark;
  }

  function interleave(data, eccLen, numBlocks, total) {
    var numShort = numBlocks - total % numBlocks;
    var shortLen = Math.floor(total / numBlocks);
    var div = rsDivisor(eccLen);
    var blocks = [], k = 0;
    for (var i = 0; i < numBlocks; i++) {
      var dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (i < numShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var out = [];
    for (var c = 0; c < blocks[0].length; c++) {
      for (var b = 0; b < blocks.length; b++) {
        if (c !== shortLen - eccLen || b >= numShort) out.push(blocks[b][c]);
      }
    }
    return out;
  }

  function rsDivisor(degree) {
    var r = [];
    for (var i = 0; i < degree; i++) r.push(0);
    r[degree - 1] = 1;
    var root = 1;
    for (var n = 0; n < degree; n++) {
      for (var j = 0; j < degree; j++) {
        r[j] = gfMul(r[j], root);
        if (j + 1 < degree) r[j] ^= r[j + 1];
      }
      root = gfMul(root, 2);
    }
    return r;
  }

  function rsRemainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ r.shift();
      r.push(0);
      div.forEach(function (c, i) { r[i] ^= gfMul(c, f); });
    });
    return r;
  }

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  function drawFunctionPatterns(q) {
    var s = q.size;
    for (var i = 0; i < s; i++) { setFn(q, 6, i, i % 2 === 0); setFn(q, i, 6, i % 2 === 0); }
    finder(q, 3, 3); finder(q, s - 4, 3); finder(q, 3, s - 4);
    if (q.ver > 1) align(q, q.ver * 4 + 10, q.ver * 4 + 10);   // versions 2–6 have one
    drawFormat(q, 0);   // reserves the format areas; redrawn with the real mask
  }

  function finder(q, x, y) {
    for (var dy = -4; dy <= 4; dy++) {
      for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < q.size && yy >= 0 && yy < q.size) setFn(q, xx, yy, d !== 2 && d !== 4);
      }
    }
  }

  function align(q, x, y) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) setFn(q, x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }

  function drawFormat(q, mask) {
    var data = (q.format << 3) | mask, rem = data, s = q.size, i;
    for (i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var bits = ((data << 10) | rem) ^ 0x5412;
    for (i = 0; i <= 5; i++) setFn(q, 8, i, bit(bits, i));
    setFn(q, 8, 7, bit(bits, 6));
    setFn(q, 8, 8, bit(bits, 7));
    setFn(q, 7, 8, bit(bits, 8));
    for (i = 9; i < 15; i++) setFn(q, 14 - i, 8, bit(bits, i));
    for (i = 0; i < 8; i++) setFn(q, s - 1 - i, 8, bit(bits, i));
    for (i = 8; i < 15; i++) setFn(q, 8, s - 15 + i, bit(bits, i));
    setFn(q, 8, s - 8, true);
  }

  function drawCodewords(q, data) {
    var i = 0, s = q.size;
    for (var right = s - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < s; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? s - 1 - vert : vert;
          if (!q.fn[y][x] && i < data.length * 8) {
            q.dark[y][x] = bit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  function applyMask(q, m) {
    for (var y = 0; y < q.size; y++) {
      for (var x = 0; x < q.size; x++) {
        if (q.fn[y][x]) continue;
        var flip;
        switch (m) {
          case 0: flip = (x + y) % 2 === 0; break;
          case 1: flip = y % 2 === 0; break;
          case 2: flip = x % 3 === 0; break;
          case 3: flip = (x + y) % 3 === 0; break;
          case 4: flip = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: flip = (x * y) % 2 + (x * y) % 3 === 0; break;
          case 6: flip = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
          default: flip = ((x + y) % 2 + (x * y) % 3) % 2 === 0;
        }
        if (flip) q.dark[y][x] = !q.dark[y][x];
      }
    }
  }

  /* The standard's four penalties, used only to pick the mask that reads
     most easily: long runs, 2×2 blocks, finder look-alikes, and a dark/light
     balance far from half. */
  function penalty(q) {
    var s = q.size, d = q.dark, score = 0, x, y;
    var lines = [];
    for (y = 0; y < s; y++) {
      var row = [], col = [];
      for (x = 0; x < s; x++) { row.push(d[y][x]); col.push(d[x][y]); }
      lines.push(row, col);
    }
    var A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0].join(""), B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1].join("");
    lines.forEach(function (line) {
      for (var i = 0, run = 1; i < s; i++) {
        if (i > 0 && line[i] === line[i - 1]) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
      var str = line.map(function (v) { return v ? 1 : 0; }).join("");
      for (var k = 0; k + 11 <= s; k++) {
        var part = str.substr(k, 11);
        if (part === A || part === B) score += 40;
      }
    });
    var darkCount = 0;
    for (y = 0; y < s; y++) {
      for (x = 0; x < s; x++) {
        if (d[y][x]) darkCount++;
        if (x < s - 1 && y < s - 1 && d[y][x] === d[y][x + 1] && d[y][x] === d[y + 1][x] && d[y][x] === d[y + 1][x + 1]) score += 3;
      }
    }
    score += Math.floor(Math.abs(darkCount * 20 - s * s * 10) / (s * s)) * 10;
    return score;
  }

  function setFn(q, x, y, dark) { q.dark[y][x] = dark; q.fn[y][x] = true; }
  function bit(v, i) { return ((v >>> i) & 1) !== 0; }
  function push(bits, v, len) { for (var i = len - 1; i >= 0; i--) bits.push((v >>> i) & 1); }
  function grid(s) { var g = []; for (var i = 0; i < s; i++) { g.push([]); for (var j = 0; j < s; j++) g[i].push(false); } return g; }
  function utf8(s) {
    var out = [], b = unescape(encodeURIComponent(s));
    for (var i = 0; i < b.length; i++) out.push(b.charCodeAt(i));
    return out;
  }

  /* One path of unit squares inside a four-module quiet zone, drawn crisp,
     black on white whatever surrounds it. */
  function svg(m) {
    var n = m.length, p = "";
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) if (m[y][x]) p += "M" + (x + 4) + " " + (y + 4) + "h1v1h-1z";
    }
    return '<svg viewBox="0 0 ' + (n + 8) + " " + (n + 8) + '" aria-hidden="true" focusable="false" shape-rendering="crispEdges">' +
      '<rect width="100%" height="100%" fill="#fff"/><path d="' + p + '" fill="#000"/></svg>';
  }

  // For testing: window.__qr("text") gives the module grid.
  window.__qr = encode;
})();
