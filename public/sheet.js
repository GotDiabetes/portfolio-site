/* ============================================================================
   The practice sheet (/sheet/): reads the link the recap page made and
   writes the page in that language.

   The link is /sheet/#s=<data>, where data is base64url of a JSON object:
     { n: "Maya", d: "2026-10-14", l: "ko", t: ["tip_serve_net", …],
       o: "Isaac's own line", x: "Saturday 10am" }
   Only t (the tips) is needed; the rest is optional. The tips' words are
   fetched from that language's ask.json, so a tip edited in ask.json is
   edited on every sheet. Nothing is stored anywhere: the link is the sheet.
   ========================================================================== */

(function () {
  "use strict";

  var L = {
    en: { title: "Practice sheet — Lee Tennis Co.", barTitle: "Practice sheet", barLine: "Print it, or keep the link: it opens this sheet on any phone.", eyebrow: "Practice sheet", h1: "After today's lesson", h1Name: "{name}, after today's lesson", intro: "What we worked on, and one thing to practise for each before next time.", from: "From Isaac", next: "Next lesson: {next}", tips: "All the tips: leetennisco.com/tips", coach: "Isaac Lee · RSPA-certified coach · Toscana courts, Irvine", print: "Print the sheet", copy: "Copy the link", copied: "Copied", back: "Back to the site", empty: "Nothing here yet: this sheet is made from a link on the recap page." },
    es: { title: "Hoja de práctica — Lee Tennis Co.", barTitle: "Hoja de práctica", barLine: "Imprímela o guarda el enlace: abre esta hoja en cualquier teléfono.", eyebrow: "Hoja de práctica", h1: "Después de la clase de hoy", h1Name: "{name}, después de la clase de hoy", intro: "Lo que trabajamos, y una cosa para practicar de cada tema antes de la próxima vez.", from: "De Isaac", next: "Próxima clase: {next}", tips: "Todos los consejos: leetennisco.com/es/tips", coach: "Isaac Lee · Entrenador certificado por la RSPA · Canchas de Toscana, Irvine", print: "Imprimir la hoja", copy: "Copiar el enlace", copied: "Copiado", back: "Volver al sitio", empty: "Aquí no hay nada todavía: esta hoja se crea desde un enlace de la página de resumen." },
    ko: { title: "연습 시트 — Lee Tennis Co.", barTitle: "연습 시트", barLine: "인쇄하거나 링크를 보관하세요. 어떤 휴대폰에서든 이 시트가 열려요.", eyebrow: "연습 시트", h1: "오늘 레슨을 마치고", h1Name: "{name} 님, 오늘 레슨을 마치고", intro: "오늘 연습한 내용과, 다음 레슨 전까지 하나씩 연습해 볼 것이에요.", from: "Isaac의 한마디", next: "다음 레슨: {next}", tips: "모든 팁: leetennisco.com/ko/tips", coach: "Isaac Lee · RSPA 공인 코치 · Toscana 코트, 어바인", print: "시트 인쇄", copy: "링크 복사", copied: "복사됨", back: "사이트로 돌아가기", empty: "아직 내용이 없어요. 이 시트는 레슨 정리 페이지의 링크로 만들어져요." },
    "zh-hans": { title: "练习单 — Lee Tennis Co.", barTitle: "练习单", barLine: "打印出来，或保存链接：在任何手机上都能打开这张练习单。", eyebrow: "练习单", h1: "今天的课之后", h1Name: "{name}，今天的课之后", intro: "我们今天练习的内容，每一项附一个下次课前可以练习的方法。", from: "Isaac 的话", next: "下次课：{next}", tips: "全部技巧：leetennisco.com/zh-hans/tips", coach: "Isaac Lee · RSPA 认证教练 · 尔湾 Toscana 球场", print: "打印练习单", copy: "复制链接", copied: "已复制", back: "返回网站", empty: "这里还没有内容：练习单由课程小结页面的链接生成。" },
    "zh-hant": { title: "練習單 — Lee Tennis Co.", barTitle: "練習單", barLine: "列印出來，或保存連結：在任何手機上都能打開這張練習單。", eyebrow: "練習單", h1: "今天的課之後", h1Name: "{name}，今天的課之後", intro: "我們今天練習的內容，每一項附一個下次上課前可以練習的方法。", from: "Isaac 的話", next: "下次上課：{next}", tips: "全部技巧：leetennisco.com/zh-hant/tips", coach: "Isaac Lee · RSPA 認證教練 · 爾灣 Toscana 球場", print: "列印練習單", copy: "複製連結", copied: "已複製", back: "返回網站", empty: "這裡還沒有內容：練習單由課程整理頁面的連結產生。" },
    ja: { title: "練習シート — Lee Tennis Co.", barTitle: "練習シート", barLine: "印刷するか、リンクを保存してください。どのスマートフォンでもこのシートが開きます。", eyebrow: "練習シート", h1: "今日のレッスンのあとに", h1Name: "{name}さん、今日のレッスンのあとに", intro: "今日取り組んだことと、次回までにそれぞれ練習してほしいことです。", from: "Isaacから", next: "次回のレッスン：{next}", tips: "ヒントはすべてこちら：leetennisco.com/ja/tips", coach: "Isaac Lee · RSPA認定コーチ · アーバイン、Toscanaコート", print: "シートを印刷", copy: "リンクをコピー", copied: "コピーしました", back: "サイトに戻る", empty: "まだ何もありません。このシートはレッスンまとめページのリンクから作られます。" },
    vi: { title: "Phiếu luyện tập — Lee Tennis Co.", barTitle: "Phiếu luyện tập", barLine: "In ra, hoặc giữ liên kết: nó mở phiếu này trên mọi điện thoại.", eyebrow: "Phiếu luyện tập", h1: "Sau buổi học hôm nay", h1Name: "{name}, sau buổi học hôm nay", intro: "Những gì chúng ta đã luyện, kèm một điều để tập cho mỗi phần trước buổi sau.", from: "Lời nhắn từ Isaac", next: "Buổi học tiếp theo: {next}", tips: "Tất cả mẹo: leetennisco.com/vi/tips", coach: "Isaac Lee · HLV được RSPA chứng nhận · Sân Toscana, Irvine", print: "In phiếu", copy: "Sao chép liên kết", copied: "Đã sao chép", back: "Về trang chính", empty: "Chưa có gì ở đây: phiếu này được tạo từ liên kết trên trang tóm tắt buổi học." },
    fa: { title: "برگهٔ تمرین — Lee Tennis Co.", barTitle: "برگهٔ تمرین", barLine: "چاپش کنید یا لینک را نگه دارید: این برگه روی هر گوشی‌ای باز می‌شود.", eyebrow: "برگهٔ تمرین", h1: "بعد از جلسهٔ امروز", h1Name: "{name}، بعد از جلسهٔ امروز", intro: "چیزهایی که امروز رویشان کار کردیم، و برای هر کدام یک تمرین تا جلسهٔ بعد.", from: "از طرف Isaac", next: "جلسهٔ بعد: {next}", tips: "همهٔ نکته‌ها: leetennisco.com/fa/tips", coach: "Isaac Lee · مربی دارای گواهی RSPA · زمین‌های Toscana، ارواین", print: "چاپ برگه", copy: "کپی لینک", copied: "کپی شد", back: "بازگشت به سایت", empty: "هنوز چیزی اینجا نیست: این برگه از لینکی در صفحهٔ خلاصهٔ جلسه ساخته می‌شود." },
  };
  var CODES = { en: "en", es: "es", ko: "ko", "zh-hans": "zh-Hans", "zh-hant": "zh-Hant", ja: "ja", vi: "vi", fa: "fa" };

  function fill(s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k] || ""; }); }
  function decode(hash) {
    var m = /[#&]s=([A-Za-z0-9_-]+)/.exec(hash || "");
    if (!m) return null;
    try {
      var b = m[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b.length % 4) b += "=";
      var bytes = atob(b), arr = new Uint8Array(bytes.length);
      for (var i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      var data = JSON.parse(new TextDecoder().decode(arr));
      return data && typeof data === "object" ? data : null;
    } catch (e) { return null; }
  }

  /* A different link to the same page is a different sheet: start over. */
  window.addEventListener("hashchange", function () { location.reload(); });

  var data = decode(location.hash) || {};
  var lang = L[data.l] ? data.l : "en";
  var t = L[lang];
  var root = document.documentElement;
  root.lang = CODES[lang];
  if (lang === "fa") root.dir = "rtl";
  document.title = t.title;
  Array.prototype.forEach.call(document.querySelectorAll("[data-s]"), function (el) { var k = el.getAttribute("data-s"); if (t[k]) el.textContent = t[k]; });
  var home = document.querySelector(".print-home");
  if (home) home.href = lang === "en" ? "/" : "/" + lang + "/";

  var name = typeof data.n === "string" ? data.n.replace(/\s+/g, " ").trim().slice(0, 40) : "";
  document.querySelector("[data-s-title]").textContent = name ? fill(t.h1Name, { name: name }) : t.h1;

  var dateEl = document.querySelector("[data-s-date]");
  if (typeof data.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.d)) {
    try { dateEl.textContent = new Intl.DateTimeFormat(CODES[lang], { year: "numeric", month: "long", day: "numeric" }).format(new Date(data.d + "T12:00:00")); }
    catch (e) { dateEl.textContent = data.d; }
  }

  var note = document.querySelector("[data-s-note]");
  if (typeof data.o === "string" && data.o.trim()) { note.querySelector(".ps-note-text").textContent = data.o.trim().slice(0, 600); note.hidden = false; }
  var next = document.querySelector("[data-s-next]");
  if (typeof data.x === "string" && data.x.trim()) { next.textContent = fill(t.next, { next: data.x.trim().slice(0, 80) }); next.hidden = false; }

  var ids = Array.isArray(data.t) ? data.t.filter(function (x) { return typeof x === "string" && /^tip_[a-z_]+$/.test(x); }).slice(0, 8) : [];
  var list = document.querySelector("[data-s-tips]");
  var empty = document.querySelector("[data-s=empty]");
  var printBtn = document.querySelector("[data-print]"), copyBtn = document.querySelector("[data-copy]");

  function ready() {
    if (printBtn) { printBtn.hidden = false; printBtn.addEventListener("click", function () { window.print(); }); }
    if (copyBtn) {
      copyBtn.hidden = false;
      copyBtn.addEventListener("click", function () {
        var done = function () { copyBtn.textContent = t.copied; setTimeout(function () { copyBtn.textContent = t.copy; }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, function () {});
      });
    }
  }

  if (!ids.length) { empty.hidden = false; list.hidden = true; ready(); return; }
  fetch((lang === "en" ? "" : "/" + lang) + "/ask.json").then(function (r) { if (!r.ok) throw new Error("ask"); return r.json(); }).then(function (ask) {
    var byId = {};
    (ask.topics || []).forEach(function (x) { byId[x.id] = x; });
    ids.forEach(function (id) {
      var tip = byId[id];
      if (!tip || !tip.title) return;
      var li = document.createElement("li");
      var h = document.createElement("h2"); h.textContent = tip.title;
      var p = document.createElement("p"); p.textContent = tip.answer || "";
      li.appendChild(h); li.appendChild(p);
      list.appendChild(li);
    });
    if (!list.children.length) empty.hidden = false;
    ready();
  }).catch(function () { empty.hidden = false; ready(); });
})();
