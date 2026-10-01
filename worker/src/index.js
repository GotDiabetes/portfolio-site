/* ============================================================================
   The server half of the tennis page's two Jev features: the lesson matcher
   ("Not sure which fits?", POST /match) and the Ask Isaac chat (POST /ask,
   further down).

   The page is static, so the TypeSafe key cannot live in it. This Worker
   holds the key as a secret, takes the visitor's text, asks Jev fixed
   questions about it, and returns only the decision.

   The questions live here, not in the page: a client can send text, never
   questions, so the Worker cannot be used as an open Jev proxy on Isaac's
   account.

   POST /match   { "text": "3.5 player, want to fix my serve, bringing a friend" }
   →             { "lesson": "semi", "confidence": 0.82, "travel": false }

   lesson is one of private | semi | hitting | group, or null when Jev could
   not tell (nothing tennis-related in the text, or the answer was split).
   ========================================================================== */

const ALLOWED_ORIGINS = [
  "https://leetennisco.com",
  "https://www.leetennisco.com",
  "http://localhost:5595",
];

const MAX_CHARS = 400;
const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_TIMEOUT_MS = 8000;

/* Below this, the page says it could not tell rather than guessing. The
   docs' own floor for acting on a Choice; a wrong guess here only means a
   visitor reads a different card, so there is no reason to set it higher
   until real traffic says otherwise. */
const MIN_CONFIDENCE = 0.5;
/* The travel note is a correction to the visitor, so it needs a clear yes. */
const TRAVEL_THRESHOLD = 0.6;

/* What Jev reads besides the visitor's sentence: the four offers as the page
   describes them, and the one fixed rule about where lessons happen. */
const OFFERS = {
  coach: "Isaac Lee, a tennis coach in Irvine, CA",
  where: "All sessions are at the Toscana Apartments tennis courts in Irvine. Players come to Isaac; he does not travel to other courts, clubs or homes.",
  offers: {
    private: "Private lesson, $80/hour: one player, junior or adult, one-on-one instruction on strokes, serve, footwork and a practice plan.",
    semi: "Semi-private lesson, $110/hour for two: two players of a similar level share one lesson and the cost.",
    hitting: "Hitting partner session, $45/hour: straight rallying with no instruction, for players who want a reliable ball to hit against.",
    group: "Adult clinic, group rate: small groups on one court doing drills and live-ball games.",
  },
};

const QUESTIONS = {
  lesson: {
    type: "choice",
    instructions: "Which of Isaac's offers in `offers` best fits the visitor described in `visitor`?",
    criteria: {
      private: {
        what: "One player who wants coaching or instruction: learning, fixing technique, improving a stroke or serve, a child starting out, preparing for matches.",
        not_for: "Two or more players who want to take the lesson together.",
      },
      semi: {
        what: "Exactly two players who want a lesson together: a friend, a sibling, a spouse, a doubles partner.",
        not_for: "One player, or three or more.",
      },
      hitting: {
        what: "A player who wants to rally, practise or get match play against a steady hitter, and does not ask to be taught.",
        not_for: "Anyone asking for instruction, corrections or technique work.",
      },
      group: {
        what: "Three or more players who want to come together as a group, or someone asking about clinics or group sessions.",
        not_for: "One or two players.",
      },
      none: "The text does not describe a tennis player or what they want from a session, so none of the offers can be matched.",
    },
  },
  travel: {
    type: "noul",
    instructions: "Does the visitor in `visitor` ask Isaac to come to them, rather than coming to his courts?",
    criteria: {
      true: "Asks Isaac to travel to their home, club, school, park or another court.",
      false: "Does not ask Isaac to travel, or says nothing about location.",
    },
  },
};

const ROUTES = { "/match": match, "/ask": ask };

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);
    const url = new URL(request.url);
    const route = ROUTES[url.pathname];

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!route) return json({ error: "not_found" }, 404, cors);
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: "forbidden" }, 403, cors);

    /* Two limits: one per visitor, one for the whole site, so a single
       script cannot run up the bill and a crowd cannot either. The bindings
       are absent in the local test harness, which is fine. */
    const ip = request.headers.get("CF-Connecting-IP") || "local";
    if (env.PER_VISITOR && !(await env.PER_VISITOR.limit({ key: ip })).success) {
      return json({ error: "rate_limited" }, 429, cors);
    }
    if (env.SITE_WIDE && !(await env.SITE_WIDE.limit({ key: "all" })).success) {
      return json({ error: "rate_limited" }, 429, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "bad_request" }, 400, cors);
    }
    if (!body || typeof body !== "object") return json({ error: "bad_request" }, 400, cors);
    if (!env.TYPESAFE_API_KEY) return json({ error: "unavailable" }, 503, cors);

    try {
      const out = await route(body, env);
      return out ? json(out, 200, cors) : json({ error: "bad_request" }, 400, cors);
    } catch {
      return json({ error: "unavailable" }, 503, cors);
    }
  },
};

/* ------------------------------------------------------ /match -------- */
async function match(body, env) {
  const text = clean(body.text);
  if (text.length < 3 || text.length > MAX_CHARS) return null;

  const answers = await askJev(env.TYPESAFE_API_KEY, { visitor: text, ...OFFERS }, QUESTIONS);
  const lesson = answers.lesson;
  const matched = lesson.choice !== "none" && lesson.confidence >= MIN_CONFIDENCE;
  return {
    lesson: matched ? lesson.choice : null,
    confidence: round(lesson.confidence),
    travel: answers.travel.noul >= TRAVEL_THRESHOLD,
  };
}

/* -------------------------------------------------------- /ask ---------
   The Ask Isaac chat. Isaac writes every answer in public/ask.json; Jev
   only picks which one answers the visitor's question, so the chat can
   never say anything he did not write. The Worker reads the topics from
   the live site (FAQ_URL), so editing answers is an ordinary push, not a
   Worker redeploy. It returns topic ids; the page shows the text.

   POST /ask   { "question": "and for two people?", "previous": "how much is a lesson?" }
   →           { "topics": ["semi"] }        ([] when nothing fits)
   ---------------------------------------------------------------------- */
const FAQ_URL = "https://leetennisco.com/ask.json";
const FAQ_TTL_MS = 5 * 60 * 1000;
const MAX_QUESTION = 300;
/* A topic is shown only when Jev puts at least this much probability on
   it; below, the chat says it doesn't have that written down, which is
   the honest answer when the model is unsure. */
const TOPIC_FLOOR = 0.35;
/* A second topic joins the first when the question plainly asks two
   things ("how much, and where?") and the probability splits between them. */
const SECOND_FLOOR = 0.2;
/* The verify step has to be fairly sure the answer really answers: showing
   the wrong answer confidently is worse than "email me". */
const VERIFY_FLOOR = 0.6;

let faqCache = null;

async function loadTopics(env) {
  if (faqCache && Date.now() - faqCache.at < FAQ_TTL_MS) return faqCache.topics;
  const res = await fetch(env.FAQ_URL || FAQ_URL, { cf: { cacheTtl: 300 } });
  if (!res.ok) throw new Error("faq " + res.status);
  const data = await res.json();
  const topics = (Array.isArray(data.topics) ? data.topics : [])
    .filter((t) => t && /^[a-z_]{1,40}$/.test(t.id) && typeof t.covers === "string" && t.id !== "none")
    .slice(0, 100)
    .map((t) => ({ id: t.id, covers: t.covers.slice(0, 400), answer: String(t.answer || "").slice(0, 1500) }));
  if (!topics.length) throw new Error("faq empty");
  faqCache = { at: Date.now(), topics };
  return topics;
}

async function ask(body, env) {
  const question = clean(body.question);
  const previous = clean(body.previous).slice(0, MAX_QUESTION);
  if (question.length < 1 || question.length > MAX_QUESTION) return null;

  const topics = await loadTopics(env);
  const criteria = {};
  for (const t of topics) criteria[t.id] = t.covers;
  criteria.none = "No topic answers the question: it asks about something not listed here, or it is not about Isaac, his coaching or this website.";

  const state = { coach: OFFERS.coach, question };
  if (previous) state.previous_question = previous;

  const answers = await askJev(env.TYPESAFE_API_KEY, state, {
    topic: {
      type: "choice",
      instructions: {
        question: "A visitor on Isaac Lee's tennis coaching website asked the question in `question`. Which topic answers it?",
        follow_ups: "If `previous_question` is present, it is what the visitor asked just before. Use it to resolve short follow-ups such as 'how much is that?' or 'and for two people?'.",
      },
      criteria,
    },
  });

  /* Shortlist: the top topic if it clears the floor, and the runner-up if
     the question may be asking two things. */
  const ranked = Object.entries(answers.topic.probabilities).sort((a, b) => b[1] - a[1]);
  const shortlist = [];
  if (ranked[0] && ranked[0][0] !== "none" && ranked[0][1] >= TOPIC_FLOOR) {
    shortlist.push(ranked[0][0]);
    if (ranked[1] && ranked[1][0] !== "none" && ranked[1][1] >= SECOND_FLOOR) shortlist.push(ranked[1][0]);
  }
  if (!shortlist.length) return { topics: [] };

  /* Verify: the pick is the closest topic, which is not the same as an
     answer. "Do you provide rackets?" lands nearest "first session", and
     "cancellation policy?" nearest "booking", yet neither answer says
     anything about what was asked. So Jev reads each shortlisted answer's
     actual text and says whether it gives the visitor what they asked
     for; one that doesn't is dropped, and the chat says to email. */
  const byId = Object.fromEntries(topics.map((t) => [t.id, t]));
  const candidates = {};
  const checks = {};
  for (const id of shortlist) {
    candidates[id] = byId[id].answer;
    checks[id] = {
      type: "noul",
      instructions: "The visitor wrote `question`. Is the reply in `candidates." + id + "` a good response to it? If they ask several things, a reply that handles one of them counts.",
      criteria: {
        true: "The reply gives what the visitor asked for or is looking for, or tells them exactly where to find it; for a greeting, thanks or a statement about themselves, it responds sensibly.",
        false: "The reply is on a related subject but never gives what was asked or where to find it, so the visitor would have to ask again.",
      },
    };
  }
  const verified = await askJev(env.TYPESAFE_API_KEY, { ...state, candidates }, checks);
  const out = { topics: shortlist.filter((id) => verified[id].noul >= VERIFY_FLOOR) };
  if (env.DEBUG) {
    out.debug = {
      ranked: ranked.slice(0, 3).map(([id, p]) => id + " " + round(p)),
      verified: shortlist.map((id) => id + " " + round(verified[id].noul)),
    };
  }
  return out;
}

/* ------------------------------------------------------ helpers ------- */
function clean(s) { return typeof s === "string" ? s.replace(/\s+/g, " ").trim() : ""; }

/* One retry, after a pause, for the two statuses the docs say are worth
   retrying. Anything else fails straight away and the page falls back. */
async function askJev(key, state, questions) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(JEV_URL, {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "jev-latest", state, questions }),
      signal: AbortSignal.timeout(JEV_TIMEOUT_MS),
    });
    if (res.ok) return (await res.json()).answers;
    if ((res.status === 429 || res.status === 529) && attempt === 0) {
      await new Promise((r) => setTimeout(r, 600));
      continue;
    }
    throw new Error("jev " + res.status);
  }
}

function corsHeaders(origin) {
  const h = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (ALLOWED_ORIGINS.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function round(n) { return Math.round(n * 100) / 100; }
