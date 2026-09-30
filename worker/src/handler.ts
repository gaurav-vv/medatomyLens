/**
 * AnatomyLens chat Worker (Cloudflare Workers + Workers AI, free tier).
 * POST /chat { term, status, question, history } → { answer } or { withheld: true }.
 *
 * Privacy: the request holds no report text, values or patient details, and
 * nothing is logged or stored. Cloudflare states it does not use Workers AI
 * inputs to train models. Safety: the prompt is built here from the app's
 * curated data, and answers are checked before they are returned.
 */
import { buildMessages, parseChatRequest, type ChatMessage } from "../../lib/ai/grounding";
import { checkAnswer } from "../../lib/ai/guard";

export interface AiBinding {
  run(model: string, input: { messages: ChatMessage[]; max_tokens?: number; temperature?: number }): Promise<unknown>;
}
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
export interface Env {
  AI: AiBinding;
  RATE_LIMITER: RateLimiter;
  /** Comma-separated list of site origins allowed to call the Worker. */
  ALLOWED_ORIGINS: string;
  MODEL?: string;
}

export const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const MAX_BODY_BYTES = 16_000;

function json(body: unknown, status: number, origin: string | null): Response {
  const headers: Record<string, string> = { "content-type": "application/json", "cache-control": "no-store" };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["vary"] = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
  const origin = request.headers.get("origin");
  const okOrigin = origin && allowed.includes(origin) ? origin : null;
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    if (!okOrigin) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": okOrigin,
        "access-control-allow-methods": "POST",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
        vary: "Origin",
      },
    });
  }
  if (url.pathname !== "/chat") return json({ error: "Not found." }, 404, okOrigin);
  if (request.method !== "POST") return json({ error: "Use POST." }, 405, okOrigin);
  if (!okOrigin) return json({ error: "This site is not allowed to use the chat." }, 403, null);

  // Rate limit per client (Cloudflare sets cf-connecting-ip).
  const client = request.headers.get("cf-connecting-ip") ?? "unknown";
  const { success } = await env.RATE_LIMITER.limit({ key: client });
  if (!success) return json({ error: "rate_limited" }, 429, okOrigin);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: "Request too large." }, 413, okOrigin);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "Invalid JSON." }, 400, okOrigin);
  }
  const req = parseChatRequest(body);
  if ("error" in req) return json({ error: req.error }, 400, okOrigin);

  let answer = "";
  try {
    const out = (await env.AI.run(env.MODEL || DEFAULT_MODEL, {
      messages: buildMessages(req),
      max_tokens: 320,
      temperature: 0.2,
    })) as { response?: unknown };
    answer = typeof out?.response === "string" ? out.response.trim() : "";
  } catch {
    // Daily free allowance used up, or the model is busy. Never log the question.
    return json({ error: "ai_unavailable" }, 503, okOrigin);
  }
  if (!answer) return json({ error: "ai_unavailable" }, 503, okOrigin);
  if (!checkAnswer(answer).ok) return json({ withheld: true }, 200, okOrigin);
  return json({ answer }, 200, okOrigin);
}
