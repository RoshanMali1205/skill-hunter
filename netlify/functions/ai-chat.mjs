// Netlify Function (v2, Fetch API style) — the only place the AI provider's
// API key is ever used. It never reaches the browser.
//
// Required environment variables (set in Netlify: Site configuration >
// Environment variables, or locally in a git-ignored .env file for `netlify dev`):
//   GEMINI_API_KEY      your Google AI Studio API key (aistudio.google.com)
//   APP_SHARED_TOKEN    any string you make up — must match the value baked
//                       into AiAssistantService (see core/services/ai-assistant.service.ts)
//
// Optional:
//   AI_MODEL            defaults to "gemini-flash-latest" (a Google-maintained
//                       alias that always resolves to a currently-available
//                       flash model — dated model IDs like "gemini-2.5-flash"
//                       can stop being available to newer projects without notice)
//
// APP_SHARED_TOKEN is a light deterrent against random bots/scrapers hitting
// this endpoint directly and burning your free quota — it is NOT real
// authentication (its value ships in the built JS bundle, so anyone who reads
// the client code can find it). The thing that's actually protected is the
// API key itself, which never leaves this function.

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-flash-latest";
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

const SYSTEM_PROMPT = `You are the AI Mentor inside Skill Hunter, a frontend interview preparation app
covering Angular, JavaScript, TypeScript, and UI Engineering (HTML5/CSS/SCSS/responsive design).

Act like an experienced senior frontend interviewer and mentor:
- Give correct, precise, senior-level technical answers.
- When explaining a concept, briefly cover: what it is, why it matters in interviews, and one
  common mistake or edge case.
- When asked to generate a question, produce a realistic interview question appropriate to the
  requested subject and difficulty, and be ready to reveal the answer only when asked.
- Keep answers focused and skimmable — short paragraphs or bullet points, not essays.
- If the user pastes their own answer to a question, evaluate it honestly and suggest a concrete
  improvement rather than just praising it.`;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const sharedToken = process.env.APP_SHARED_TOKEN;
  if (sharedToken && req.headers.get("x-app-token") !== sharedToken) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          "AI Mentor is not configured yet. Set GEMINI_API_KEY in your Netlify site's environment variables (or a local .env for `netlify dev`), then redeploy.",
      },
      503,
    );
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : null;
  if (!messages || messages.length === 0) {
    return jsonResponse({ error: "\"messages\" must be a non-empty array" }, 400);
  }
  if (messages.length > MAX_MESSAGES) {
    return jsonResponse({ error: `Too many messages (max ${MAX_MESSAGES}) — start a new chat.` }, 400);
  }

  const sanitized = [];
  for (const message of messages) {
    if (
      !message ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string" ||
      message.content.length === 0
    ) {
      return jsonResponse({ error: "Each message needs role: 'user' | 'assistant' and non-empty string content" }, 400);
    }
    sanitized.push({ role: message.role, content: message.content.slice(0, MAX_MESSAGE_LENGTH) });
  }

  const context = payload?.context;
  const contextNote =
    context?.subjectTitle || context?.topicTitle
      ? `\n\nThe user is currently viewing: ${[context.subjectTitle, context.topicTitle].filter(Boolean).join(" › ")}.`
      : "";

  // Anthropic-style { role: 'user' | 'assistant', content } -> Gemini "contents"
  const contents = sanitized.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  let upstream;
  try {
    upstream = await fetch(`${GEMINI_API_URL}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT + contextNote }] },
        generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
      }),
    });
  } catch (err) {
    return jsonResponse({ error: "Failed to reach the AI provider", detail: String(err) }, 502);
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    // Surface 429 (quota exhausted) distinctly so the UI can show a clear,
    // non-retryable message instead of a generic failure.
    if (upstream.status === 429) {
      return jsonResponse(
        { error: "The AI Mentor has hit its daily quota for everyone sharing this deployment. Please try again later." },
        429,
      );
    }
    return jsonResponse({ error: "AI provider returned an error", status: upstream.status, detail }, 502);
  }

  const data = await upstream.json();
  const candidate = data?.candidates?.[0];
  let reply = candidate?.content?.parts?.[0]?.text ?? "";

  if (candidate?.finishReason === "MAX_TOKENS") {
    reply += "\n\n*(Reply hit the length limit — ask me to \"continue\" for the rest.)*";
  }

  return jsonResponse({ reply });
};

export const config = {
  path: "/api/ai-chat",
};
