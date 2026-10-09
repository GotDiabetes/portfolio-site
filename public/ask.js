/* ============================================================================
   Ask Isaac — the chat in the corner of the tennis page.

   Isaac writes every answer in /ask.json. A question goes to the Cloudflare
   Worker (worker/ in the repo), which asks TypeSafe's Jev model which of
   those answers fits and checks that it really answers the question. The
   Worker returns topic ids; this file shows the answer text and buttons for
   them. So the chat can only ever say what Isaac wrote, and when nothing
   fits it says so and points to email.

   What makes it feel alive, all of it optional to the reading:
     · a short "thinking" beat with typing dots, so a reply doesn't snap in;
     · the answer types itself out word by word, then its buttons arrive;
     · follow-up questions to tap after every answer (each topic's "next");
     · sounds: a light tick when you send, a tennis-ball "pok" when the
       answer lands. Made with Web Audio, no files. The speaker button in
       the header mutes them, and the choice is remembered on this device.
   Reduced motion skips the typing-out; screen readers get each answer once,
   whole, rather than word by word.

   Hidden unless there is a Worker to call: on localhost the local Worker on
   :8787, on the live site the jev-endpoint meta tag.

   On a translated page (tools/i18n/), window.I18N supplies this file's
   words and points it at that language's answers (/ko/ask.json and so
   on). Jev reads questions in any of the languages; it still picks from
   the English topics, and the page shows the translated answer.
   ========================================================================== */

(function () {
  "use strict";

  var T = window.I18N || {};

  var root = document.getElementById("ask");
  if (!root || !window.fetch) return;

  var base = jevBase();
  if (!base) return;

  var panel = root.querySelector(".ask-panel");
  var launch = root.querySelector(".ask-launch");
  var closeBtn = root.querySelector(".ask-close");
  var soundBtn = root.querySelector(".ask-sound");
  var log = root.querySelector(".ask-log");
  var form = root.querySelector(".ask-form");
  var input = root.querySelector(".ask-input");
  var send = root.querySelector(".ask-send");

  var MAIL_TO = "isaacleetennis@gmail.com";
  var SUGGESTIONS = T.askSuggestions || ["How much are lessons?", "Where are lessons?", "How do I book?", "What should I work on?"];
  var DOWN = T.askDown || "The chat isn't answering right now. Email me and I'll get back to you.";
  var EMAIL = { type: "email", subject: T.mailSubject || "Tennis lessons", label: T.emailMe || "Email me" };
  var MIN_THINK_MS = 650;     // the dots show at least this long
  var WORD_MS = 28;           // typing-out pace

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");

  var faq = null;          // ask.json, loaded on first open
  var faqLoading = null;
  var previous = "";       // the last question, for follow-ups like "and for two?"
  var lastTopics = [];     // what the last answer covered
  var asked = {};          // questions already asked, so chips don't repeat them
  var busy = false;
  var latest = 0;          // numbers each message, so only the newest offers chips

  root.hidden = false;

  /* On a phone the launcher floats over the hero's headline, intro and Book
     button, so it waits until the hero has scrolled away (the CSS only acts
     on this class under 560px). */
  var hero = document.querySelector(".hero");
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      root.classList.toggle("is-tucked", entries[0].isIntersecting);
    }).observe(hero);
  }

  /* The launcher is black, so over the page's black bands (statement,
     contact, footer) it would vanish: while one of them is behind it —
     the bottom tenth of the screen — it turns white. */
  var darkBands = document.querySelectorAll(".statement, .contact, .footer");
  if (darkBands.length && "IntersectionObserver" in window) {
    var behind = new Set();
    var darkWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) behind.add(e.target); else behind.delete(e.target); });
      root.classList.toggle("on-dark", behind.size > 0);
    }, { rootMargin: "-90% 0px 0px 0px" });
    darkBands.forEach(function (el) { darkWatch.observe(el); });
  }

  /* ------------------------------------------------------ Open / close -- */
  launch.addEventListener("click", function () { panel.hidden ? open() : close(); });
  closeBtn.addEventListener("click", function () { close(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) { close(); }
  });

  var counted = false;
  function open() {
    /* Counted once a page view, for Isaac's numbers (tennis.js). */
    if (!counted && window.leeHit) { counted = true; window.leeHit("chat_open"); }
    panel.hidden = false;
    root.classList.add("is-open");
    launch.setAttribute("aria-expanded", "true");
    sound.wake();
    loadFaq().then(function () {
      if (!log.childElementCount) greet();
    }, function () {
      if (!log.childElementCount) {
        addMessage("isaac", DOWN, [EMAIL], null, true);
      }
    });
    input.focus();
  }

  function close() {
    panel.hidden = true;
    root.classList.remove("is-open");
    launch.setAttribute("aria-expanded", "false");
    launch.focus();
  }

  function loadFaq() {
    if (faq) return Promise.resolve(faq);
    if (!faqLoading) {
      faqLoading = fetch(T.askUrl || "/ask.json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("faq"); return r.json(); })
        .then(function (data) {
          faq = { data: data, byId: {} };
          (data.topics || []).forEach(function (t) { faq.byId[t.id] = t; });
          return faq;
        })
        .catch(function (err) { faqLoading = null; throw err; });
    }
    return faqLoading;
  }

  function greet() {
    addMessage("isaac", faq.data.greeting, null, SUGGESTIONS, true);
  }

  /* ---------------------------------------------------------- Asking -- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    askQuestion(input.value);
  });

  function askQuestion(raw) {
    var question = String(raw).replace(/\s+/g, " ").trim();
    if (!question || busy) return;
    input.value = "";
    removeChips();
    asked[question.toLowerCase()] = true;
    addMessage("visitor", question);
    sound.send();

    busy = true;
    send.disabled = true;
    var typing = typingDots();
    var started = Date.now();

    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = window.setTimeout(function () { if (controller) controller.abort(); }, 12000);

    Promise.all([
      loadFaq(),
      fetch(base + "/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /* lang: the Worker checks each answer in the words this visitor
           will read (/ko/ask.json and so on). */
        body: JSON.stringify({ question: question, previous: previous, lang: T.lang || "" }),
        signal: controller ? controller.signal : undefined,
      }).then(function (r) {
        if (r.status === 429) throw new Error("busy");
        if (!r.ok) throw new Error("down");
        return r.json();
      }),
    ])
      .then(function (both) { return afterThinking(started).then(function () { return both[1]; }); })
      .then(function (res) { typing.remove(); return reply(res); })
      .catch(function (err) {
        typing.remove();
        var text = err && err.message === "busy"
          ? T.askBusy || "That's a lot of questions at once. Give it a minute, or email me."
          : (faq && faq.data.unavailable) || DOWN;
        return addMessage("isaac", text, [EMAIL]);
      })
      .then(function () {
        window.clearTimeout(timer);
        busy = false;
        send.disabled = false;
        previous = question;
        if (!panel.hidden) input.focus();
      });
  }

  /* Jev usually answers in a few hundred milliseconds; a reply that lands
     before the dots have registered feels like a canned response. */
  function afterThinking(started) {
    var wait = MIN_THINK_MS - (Date.now() - started);
    return new Promise(function (r) { window.setTimeout(r, Math.max(0, wait)); });
  }

  /* res: { topics: [ids], parent: bool, notice: "misuse" | "personal" }.
     Misuse (abuse, or text aimed at the bot) gets Isaac's one-line refusal
     and nothing else; personal details typed in get a one-line note ahead
     of the answer. When a parent is asking, a topic's parent wording is
     shown where Isaac wrote one. */
  function reply(res) {
    res = res || {};
    if (res.notice === "misuse") {
      return addMessage("isaac", faq.data.misuse || faq.data.fallback, null, faq.data.fallback_next || SUGGESTIONS);
    }
    var ids = res.topics || [];
    var lead = res.notice === "personal" && faq.data.personal ? faq.data.personal + "\n\n" : "";
    /* A follow-up ("and for two people?") often pulls the previous answer
       in as a second topic; the visitor has just read it, so drop it
       whenever something new is left to say. */
    var fresh = ids.filter(function (id) { return lastTopics.indexOf(id) < 0; });
    if (fresh.length) ids = fresh;
    lastTopics = ids;
    var topics = ids.map(function (id) { return faq.byId[id]; }).filter(Boolean);
    if (!topics.length) {
      return addMessage("isaac", lead + faq.data.fallback,
        [{ type: "email", subject: T.mailSubjectQuestion || "Question about lessons", label: EMAIL.label }],
        faq.data.fallback_next || SUGGESTIONS);
    }
    /* Two topics become one message, with each topic's buttons and
       follow-ups once. */
    var seen = {};
    var actions = [];
    var next = [];
    topics.forEach(function (t) {
      (t.actions || []).forEach(function (a) {
        var key = JSON.stringify(a);
        if (!seen[key]) { seen[key] = true; actions.push(a); }
      });
      (t.next || []).forEach(function (q) { if (next.indexOf(q) < 0) next.push(q); });
    });
    var text = topics.map(function (t) { return res.parent && t.answer_parent ? t.answer_parent : t.answer; }).join("\n\n");
    return addMessage("isaac", lead + text, actions, next);
  }

  /* -------------------------------------------------------- Rendering -- */
  /* A message: the speaker (for screen readers), the text, then buttons and
     follow-up chips. Isaac's replies type themselves out; the whole text
     goes to screen readers at once through a hidden copy, and the visible,
     growing copy is hidden from them so it isn't read word by word.
     Returns a promise that settles when the message is fully shown. */
  function addMessage(who, text, actions, next, quiet) {
    var seq = ++latest;
    var msg = document.createElement("div");
    msg.className = "ask-msg ask-msg--" + who;

    var label = document.createElement("span");
    label.className = "ask-sr";
    label.textContent = (who === "visitor" ? T.askYou || "You: " : T.askIsaac || "Isaac: ") + text.replace(/\n\n/g, " ");
    msg.appendChild(label);

    var body = document.createElement("div");
    body.className = "ask-body";
    body.setAttribute("aria-hidden", "true");
    msg.appendChild(body);

    log.appendChild(msg);
    scrollToAnswer(msg, who);

    var paras = text.split("\n\n");
    var animate = who === "isaac" && !(reduceMotion && reduceMotion.matches);
    if (who === "isaac" && !quiet) sound.reply();

    var typed = animate ? typeOut(body, paras) : Promise.resolve(fill(body, paras));
    return typed.then(function () {
      var row = actionRow(actions);
      if (row) { row.classList.add("ask-arrive"); msg.appendChild(row); }
      /* A visitor who asks while the greeting is still typing has moved
         on; its suggestions would land under their question. */
      if (who === "isaac" && seq === latest) chipsFor(next);
      scrollToAnswer(msg, who);
    });
  }

  function fill(body, paras) {
    paras.forEach(function (para) {
      var p = document.createElement("p");
      p.textContent = para;
      body.appendChild(p);
    });
  }

  /* Word by word, a paragraph at a time. The text is laid out in full from
     the start (the unrevealed words are transparent), so the bubble is its
     final size at once and nothing below it jumps while it types. Chinese
     and Japanese have no spaces between words, so those pages type
     character by character (I18N.typeBy). */
  function typeOut(body, paras) {
    var spans = [];
    var byChar = T.typeBy === "char";
    paras.forEach(function (para) {
      var p = document.createElement("p");
      (byChar ? Array.from(para) : para.split(" ")).forEach(function (w, i) {
        if (i && !byChar) p.appendChild(document.createTextNode(" "));
        var s = document.createElement("span");
        s.className = "ask-w";
        s.textContent = w;
        p.appendChild(s);
        spans.push(s);
      });
      body.appendChild(p);
    });
    return new Promise(function (done) {
      var i = 0;
      (function tick() {
        /* A hidden tab or a closed panel has no one watching: finish. */
        if (document.hidden || panel.hidden) { spans.forEach(show); done(); return; }
        var batch = Math.max(1, Math.round(spans.length / 60));   // long answers go a bit quicker
        for (var k = 0; k < batch && i < spans.length; k++) show(spans[i++]);
        if (i >= spans.length) { done(); return; }
        window.setTimeout(tick, WORD_MS);
      })();
    });
    function show(s) { s.classList.add("is-in"); }
  }

  function actionRow(actions) {
    if (!actions || !actions.length) return null;
    var row = document.createElement("div");
    row.className = "ask-actions";
    actions.forEach(function (a) {
      var el = actionEl(a);
      if (el) row.appendChild(el);
    });
    return row.childElementCount ? row : null;
  }

  /* Follow-up questions, as chips under the conversation. Ones the visitor
     has already asked are left out. */
  function chipsFor(questions) {
    removeChips();
    var list = (questions || []).filter(function (q) { return !asked[q.toLowerCase()]; }).slice(0, 4);
    if (!list.length) return;
    var chips = document.createElement("div");
    chips.className = "ask-chips ask-arrive";
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", T.askSuggested || "Suggested questions");
    list.forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ask-chip";
      b.textContent = q;
      b.addEventListener("click", function () { askQuestion(q); });
      chips.appendChild(b);
    });
    log.appendChild(chips);
  }

  /* Show as much of the newest exchange as fits — answer, buttons and
     follow-ups — but never scroll the visitor's question off the top: a
     long answer then reads down from its first line. */
  function scrollToAnswer(msg, who) {
    var bottom = log.scrollHeight - log.clientHeight;
    if (who !== "isaac") { log.scrollTop = bottom; return; }
    var anchor = msg.previousElementSibling || msg;
    log.scrollTop = Math.max(log.scrollTop, Math.min(bottom, anchor.offsetTop - 12));
  }

  /* Each button is the page's own control where one exists: a Book button
     is a clone of the lesson card's, so the calendar popup, its loading
     state and the fallback link behave exactly as on the card. */
  function actionEl(a) {
    var el;
    if (a.type === "book") {
      var src = document.querySelector('.lesson[data-lesson="' + a.lesson + '"] .lesson-actions .btn');
      if (!src) return null;
      el = src.cloneNode(true);
    } else if (a.type === "email") {
      el = document.createElement("a");
      var subject = encodeURIComponent(a.subject || EMAIL.subject);
      el.href = "mailto:" + MAIL_TO + "?subject=" + subject;
      el.setAttribute("data-mail", subject);
      el.textContent = a.label || EMAIL.label;
    } else if (a.type === "link" && /^\/[^/]/.test(a.href || "")) {
      el = document.createElement("a");
      el.href = a.href;
      el.textContent = a.label || T.open || "Open";
    } else if (a.type === "open" && /^[\w-]+$/.test(a.target || "") && document.getElementById(a.target)) {
      /* One of the page's popups (the clinic list). tennis.js opens anything
         with data-open, clones and chat buttons included. */
      el = document.createElement("button");
      el.type = "button";
      el.setAttribute("data-open", a.target);
      el.textContent = a.label || T.open || "Open";
    } else if (a.type === "scroll" && /^#[\w-]+$/.test(a.target || "")) {
      var target = document.querySelector(a.target);
      if (!target) return null;
      el = document.createElement("button");
      el.type = "button";
      el.textContent = a.label || T.showMe || "Show me";
      el.addEventListener("click", function () {
        /* On a phone the panel covers the page, so get out of the way. */
        if (window.matchMedia("(max-width: 560px)").matches) close();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      return null;
    }
    el.className = "btn btn-sm " + (a.type === "book" || a.type === "open" ? "btn-primary" : "btn-quiet");
    return el;
  }

  /* Elsewhere on the page, a [data-ask] button opens the chat and asks its
     question (the FAQ's "something keeps going wrong" item); those items
     stay hidden unless the chat is here to answer. */
  document.querySelectorAll(".faq-ask").forEach(function (el) { el.hidden = false; });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-ask]");
    if (!b) return;
    var q = b.getAttribute("data-ask");
    if (panel.hidden) open();
    loadFaq().then(function () { askQuestion(q); }, function () {});
  });

  function typingDots() {
    var t = document.createElement("div");
    t.className = "ask-msg ask-msg--isaac ask-typing";
    t.setAttribute("role", "status");
    t.setAttribute("aria-label", T.askFinding || "Finding an answer");
    t.innerHTML = '<span class="ask-dot"></span><span class="ask-dot"></span><span class="ask-dot"></span>';
    log.appendChild(t);
    log.scrollTop = log.scrollHeight;
    return t;
  }

  function removeChips() {
    var chips = log.querySelectorAll(".ask-chips");
    for (var i = 0; i < chips.length; i++) chips[i].remove();
  }

  /* ----------------------------------------------------------- Sound -- */
  /* Two tiny synthesized sounds, quiet on purpose:
       send  — a short, high tick, like a finger on glass;
       reply — a tennis-ball "pok": a low sine that drops in pitch fast,
               over a very short filtered click for the strings.
     The AudioContext is created on the first open (a click, so browsers
     allow it). Muting is remembered in localStorage where available. */
  var sound = (function () {
    var KEY = "askIsaacSound";
    var on = true;
    try { on = localStorage.getItem(KEY) !== "off"; } catch (e) {}
    var ctx = null;

    render();
    /* The same setting can be switched off from the note that appears the
       first time a Book press makes a sound (bookfx.js). */
    window.addEventListener("isaac:sound", function (e) {
      on = !!(e.detail && e.detail.on);
      render();
    });
    if (soundBtn) {
      soundBtn.addEventListener("click", function () {
        on = !on;
        try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {}
        render();
        /* A sample, so turning sound on proves it works. */
        if (on) { wake(); if (ctx) ctx.resume().then(pok, function () {}); }
      });
    }

    function render() {
      if (!soundBtn) return;
      soundBtn.classList.toggle("is-off", !on);
      var label = on ? T.soundMute || "Mute sounds" : T.soundOn || "Turn sounds on";
      soundBtn.setAttribute("aria-label", label);
      soundBtn.title = label;
    }

    function wake() {
      if (!on) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        if (!ctx) ctx = new AC();
        if (ctx.state === "suspended") ctx.resume();
      } catch (e) { ctx = null; }
    }

    function ready() { return on && ctx && ctx.state === "running"; }

    function tick() {
      if (!ready()) return;
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(1800, t);
      o.frequency.exponentialRampToValueAtTime(1200, t + 0.04);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.07);
    }

    function pok() {
      if (!ready()) return;
      var t = ctx.currentTime;

      // The body of the ball: a sine that falls fast, like a bounce.
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(150, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.18);

      // The strings: 12ms of band-passed noise at the very start.
      var len = Math.floor(ctx.sampleRate * 0.012);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var n = ctx.createBufferSource();
      var f = ctx.createBiquadFilter();
      var ng = ctx.createGain();
      n.buffer = buf;
      f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 1.2;
      ng.gain.value = 0.09;
      n.connect(f).connect(ng).connect(ctx.destination);
      n.start(t);
    }

    return { wake: wake, send: tick, reply: pok };
  })();

  function jevBase() {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return "http://localhost:8787";
    var meta = document.querySelector('meta[name="jev-endpoint"]');
    return meta ? meta.content.replace(/\/+$/, "") : "";
  }
})();
