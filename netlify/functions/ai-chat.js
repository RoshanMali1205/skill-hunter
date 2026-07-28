// Netlify Function (v2, Fetch API style) — the only place the AI provider's
// API key is ever used. It never reaches the browser.
//
// Required environment variable (set in Netlify: Site settings > Environment
// variables, or locally in a git-ignored .env file for `netlify dev`):
//   ANTHROPIC_API_KEY   your Anthropic API key
//
// Optional:
//   AI_MODEL            defaults to "claude-sonnet-5"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          "AI Mentor is not configured yet. Set ANTHROPIC_API_KEY in your Netlify site's environment variables (or a local .env for `netlify dev`), then redeploy.",
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

  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || DEFAULT_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT + contextNote,
        messages: sanitized,
      }),
    });
  } catch (err) {
    return jsonResponse({ error: "Failed to reach the AI provider", detail: String(err) }, 502);
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return jsonResponse({ error: "AI provider returned an error", status: upstream.status, detail }, 502);
  }

  const data = await upstream.json();
  const reply = data?.content?.find((block) => block.type === "text")?.text ?? "";

  return jsonResponse({ reply });
};

export const config = {
  path: "/api/ai-chat",
};
