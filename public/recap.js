/* ============================================================================
   Lesson recap (/recap/): Isaac ticks what a lesson covered and this writes
   the note. The tips are the chat's (tip_* in ask.json, or a language's
   own ask.json), so the note says what the site says; the few lines around
   them are below, one set per language. Nothing leaves the page except
   through Gmail (the phone's own mail app on a phone) or the clipboard,
   when he presses a button.
   ========================================================================== */

(function () {
  "use strict";

  var form = document.getElementById("recapForm");
  var box = document.getElementById("recapTips");
  if (!form || !box || !window.fetch) return;
  var out = form.elements.out;

  /* The note's own words. {name}, {next} and {link} are filled in. */
  var LINES = {
    en: { subject: "Your lesson recap", hi: "Hi {name},", hiNone: "Hi,",
      intro: "Thanks for today's lesson. Here's what we worked on, and one thing to practise for each before next time.",
      introShort: "Thanks for today's lesson.", next: "Next lesson: {next}.",
      review: "If the lessons are helping, a short Google review would mean a lot: {link}", sheet: "Your practice sheet, to print or keep: {link}", bye: "See you on court,\nIsaac" },
    es: { subject: "Resumen de tu clase", hi: "Hola, {name}:", hiNone: "Hola:",
      intro: "Gracias por la clase de hoy. Esto es lo que trabajamos, con una cosa para practicar de cada tema antes de la próxima vez.",
      introShort: "Gracias por la clase de hoy.", next: "Próxima clase: {next}.",
      review: "Si las clases te están ayudando, una breve reseña en Google me ayudaría mucho: {link}", sheet: "Tu hoja de práctica, para imprimir o guardar: {link}", bye: "Nos vemos en la cancha,\nIsaac" },
    ko: { subject: "오늘 레슨 정리", hi: "{name} 님, 안녕하세요.", hiNone: "안녕하세요.",
      intro: "오늘 레슨 고마웠어요. 오늘 연습한 내용과, 다음 레슨 전까지 하나씩 연습해 볼 것을 정리했어요.",
      introShort: "오늘 레슨 고마웠어요.", next: "다음 레슨: {next}",
      review: "레슨이 도움이 되고 있다면, 구글에 짧은 리뷰를 남겨 주시면 정말 큰 힘이 돼요: {link}", sheet: "연습 시트예요. 인쇄하거나 보관해 두세요: {link}", bye: "코트에서 만나요.\nIsaac" },
    "zh-hans": { subject: "本次课程小结", hi: "{name}，你好：", hiNone: "你好：",
      intro: "谢谢你今天来上课。下面是我们今天练习的内容，每一项都附上一个下次课前可以练习的方法。",
      introShort: "谢谢你今天来上课。", next: "下次课：{next}。",
      review: "如果课程对你有帮助，欢迎在 Google 上留下简短的评价，这对我意义很大：{link}", sheet: "你的练习单，可以打印或保存：{link}", bye: "球场上见，\nIsaac" },
    "zh-hant": { subject: "本次課程重點整理", hi: "{name}，你好：", hiNone: "你好：",
      intro: "謝謝你今天來上課。以下是我們今天練習的內容，每一項都附上一個下次上課前可以練習的方法。",
      introShort: "謝謝你今天來上課。", next: "下次上課：{next}。",
      review: "如果課程對你有幫助，歡迎在 Google 上留下簡短的評價，這對我意義很大：{link}", sheet: "你的練習單，可以列印或保存：{link}", bye: "球場上見，\nIsaac" },
    ja: { subject: "今日のレッスンのまとめ", hi: "{name}さん、こんにちは。", hiNone: "こんにちは。",
      intro: "今日のレッスン、ありがとうございました。今日取り組んだことと、次回までにそれぞれ練習してほしいことをまとめました。",
      introShort: "今日のレッスン、ありがとうございました。", next: "次回のレッスン：{next}",
      review: "レッスンがお役に立っていれば、Google に短いレビューをいただけるととても励みになります：{link}", sheet: "練習シートです。印刷するか保存しておいてください：{link}", bye: "コートでお会いしましょう。\nIsaac" },
    vi: { subject: "Tóm tắt buổi học của bạn", hi: "Chào {name},", hiNone: "Xin chào,",
      intro: "Cảm ơn bạn về buổi học hôm nay. Dưới đây là những gì chúng ta đã luyện, kèm một điều để tập cho mỗi phần trước buổi sau.",
      introShort: "Cảm ơn bạn về buổi học hôm nay.", next: "Buổi học tiếp theo: {next}.",
      review: "Nếu các buổi học giúp ích cho bạn, một đánh giá ngắn trên Google sẽ rất có ý nghĩa với tôi: {link}", sheet: "Phiếu luyện tập của bạn, để in hoặc giữ lại: {link}", bye: "Hẹn gặp lại trên sân,\nIsaac" },
    fa: { subject: "خلاصهٔ جلسهٔ تمرین", hi: "سلام {name}،", hiNone: "سلام،",
      intro: "ممنون بابت جلسهٔ امروز. این‌ها چیزهایی است که امروز رویشان کار کردیم، و برای هر کدام یک تمرین تا جلسهٔ بعد.",
      introShort: "ممنون بابت جلسهٔ امروز.", next: "جلسهٔ بعد: {next}.",
      review: "اگر جلسه‌ها کمکتان کرده، یک نظر کوتاه در گوگل برایم خیلی ارزشمند است: {link}", sheet: "برگهٔ تمرین شما، برای چاپ یا نگه داشتن: {link}", bye: "در زمین می‌بینمتان،\nIsaac" },
  };

  var reviewMeta = document.querySelector('meta[name="review-link"]');
  var reviewUrl = reviewMeta && /^https:\/\//.test(reviewMeta.content) ? reviewMeta.content : "";
  if (reviewUrl) document.getElementById("recapReviewRow").hidden = false;

  var files = {};      // lang → { byId }
  function load(lang) {
    if (!files[lang]) {
      files[lang] = fetch((lang ? "/" + lang : "") + "/ask.json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("ask"); return r.json(); })
        .then(function (data) {
          var byId = {};
          (data.topics || []).forEach(function (t) { byId[t.id] = t; });
          return { byId: byId, topics: data.topics || [] };
        });
      files[lang].catch(function () { delete files[lang]; });
    }
    return files[lang];
  }

  /* The checkboxes, from the English tips (Isaac reads English); the note
     uses the chosen language's version of each. */
  load("").then(function (en) {
    box.innerHTML = "";
    en.topics.filter(function (t) { return /^tip_/.test(t.id) && t.title; }).forEach(function (t) {
      var label = document.createElement("label");
      label.className = "choice";
      var input = document.createElement("input");
      input.type = "checkbox";
      input.name = "tips";
      input.value = t.id;
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + t.title));
      box.appendChild(label);
    });
    compose();
  }, function () {
    box.innerHTML = '<p class="form-error">The tips didn\'t load. Check the connection and reload the page.</p>';
  });

  function fill(s, v) { return s.replace(/\{(\w+)\}/g, function (_, k) { return v[k] || ""; }); }

  /* The practice sheet's link: the form's content, packed into the address
     of /sheet/ (base64url JSON), so the sheet needs nothing stored. */
  function sheetLink() {
    var picked = Array.prototype.map.call(form.querySelectorAll("input[name=tips]:checked"), function (b) { return b.value; });
    var d = new Date(), day = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    var data = { n: field("name"), d: day, l: form.elements.lang.value || "en", t: picked, o: field("note"), x: field("next") };
    var bytes = new TextEncoder().encode(JSON.stringify(data)), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return location.origin + "/sheet/#s=" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function field(name) { return form.elements[name].value.replace(/[ \t]+/g, " ").trim(); }

  /* Only the latest compose writes: one still waiting on a slower language
     file must not overwrite the note for the language picked after it. A
     failed load leaves the note as it was and says so. */
  var seq = 0;
  var loadErr = document.getElementById("recapErr");
  function compose() {
    var my = ++seq;
    var lang = form.elements.lang.value;
    var L = LINES[lang || "en"];
    var picked = Array.prototype.map.call(form.querySelectorAll("input[name=tips]:checked"), function (b) { return b.value; });
    return Promise.all([load(""), load(lang)]).then(function (both) {
      if (my !== seq) return;
      if (loadErr) loadErr.hidden = true;
      var en = both[0], here = both[1];
      var name = field("name");
      var lines = [name ? fill(L.hi, { name: name }) : L.hiNone, "", picked.length ? L.intro : L.introShort, ""];
      picked.forEach(function (id) {
        var t = here.byId[id] || en.byId[id];
        if (!t) return;
        lines.push("• " + (t.title || ""), t.answer, "");
      });
      if (field("note")) lines.push(field("note"), "");
      if (field("next")) lines.push(fill(L.next, { next: field("next") }), "");
      if (reviewUrl && form.elements.review.checked) lines.push(fill(L.review, { link: reviewUrl }), "");
      if (form.elements.sheet.checked && picked.length) lines.push(fill(L.sheet, { link: sheetLink() }), "");
      lines.push(L.bye);
      out.value = lines.join("\n");
    }, function () {
      if (my !== seq) return;
      if (loadErr) loadErr.hidden = false;
    });
  }

  /* Every field but the note itself and "Send to" (which the note doesn't
     use) writes the note again: typing the address keeps Isaac's edits. */
  var recompose = function (e) { if (e.target === out || e.target.name === "to") return; compose(); };
  form.addEventListener("input", recompose);
  form.addEventListener("change", recompose);
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  document.getElementById("recapGmail").addEventListener("click", function () {
    var L = LINES[form.elements.lang.value || "en"];
    var subject = L.subject + (field("name") ? " — " + field("name") : "");
    var url = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(field("to")) +
      "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(out.value);
    /* As tennis.js does: on a phone or tablet (or with the popup blocked)
       the draft goes through mailto: to the phone's own mail app, where
       Gmail's web compose would land on a sign-in page. */
    var mailto = "mailto:" + encodeURIComponent(field("to")).replace(/%40/g, "@") +
      "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(out.value);
    var fine = !!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    if (!fine) { location.href = mailto; return; }
    var w = window.open(url, "_blank");
    if (!w) { location.href = mailto; return; }
    try { w.opener = null; } catch (err) { /* already cut */ }
  });

  document.getElementById("recapSheet").addEventListener("click", function () {
    var w = window.open(sheetLink(), "_blank");
    if (w) { try { w.opener = null; } catch (err) { /* already cut */ } }
  });

  var copy = document.getElementById("recapCopy");
  copy.addEventListener("click", function () {
    var label = copy.textContent;
    var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = label; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(out.value).then(done, function () { out.select(); });
    } else {
      out.select();
    }
  });
})();
