// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MODEL, handleRequest, type Env } from "@/worker/src/handler";

const ALLOWED = "https://gaurav-vv.github.io";

function makeEnv(over: Partial<Env> = {}): Env & { AI: { run: ReturnType<typeof vi.fn> } } {
  return {
    AI: { run: vi.fn(async () => ({ response: "Creatinine helps check kidney filtering." })) },
    RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    ALLOWED_ORIGINS: ALLOWED,
    ...over,
  } as Env & { AI: { run: ReturnType<typeof vi.fn> } };
}

const validBody = {
  term: "creatinine",
  status: "ABOVE_RANGE",
  question: "What does this test measure?",
  history: [],
};

function req(
  method: string,
  init: { origin?: string | null; path?: string; body?: string; ip?: string } = {},
): Request {
  const headers = new Headers();
  if (init.origin) headers.set("origin", init.origin);
  headers.set("cf-connecting-ip", init.ip ?? "1.2.3.4");
  if (method === "POST") headers.set("content-type", "application/json");
  return new Request(`https://worker.example.com${init.path ?? "/chat"}`, {
    method,
    headers,
    body: method === "POST" ? (init.body ?? JSON.stringify(validBody)) : undefined,
  });
}

afterEach(() => vi.clearAllMocks());

describe("worker handleRequest", () => {
  it("OPTIONS preflight returns 204 with allow-origin for an allowed origin", async () => {
    const res = await handleRequest(req("OPTIONS", { origin: ALLOWED }), makeEnv());
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED);
  });

  it("OPTIONS preflight returns 403 for a disallowed origin", async () => {
    const res = await handleRequest(req("OPTIONS", { origin: "https://evil.example" }), makeEnv());
    expect(res.status).toBe(403);
  });

  it("POST from a disallowed origin returns 403", async () => {
    const res = await handleRequest(req("POST", { origin: "https://evil.example" }), makeEnv());
    expect(res.status).toBe(403);
  });

  it("returns 404 for the wrong path", async () => {
    const res = await handleRequest(req("POST", { origin: ALLOWED, path: "/nope" }), makeEnv());
    expect(res.status).toBe(404);
  });

  it("returns 429 when rate limited", async () => {
    const env = makeEnv({ RATE_LIMITER: { limit: vi.fn(async () => ({ success: false })) } });
    const res = await handleRequest(req("POST", { origin: ALLOWED }), env);
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await handleRequest(req("POST", { origin: ALLOWED, body: "{not json" }), makeEnv());
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid body", async () => {
    const res = await handleRequest(
      req("POST", { origin: ALLOWED, body: JSON.stringify({ ...validBody, status: "DAMAGED" }) }),
      makeEnv(),
    );
    expect(res.status).toBe(400);
  });

  it("returns 503 when AI throws", async () => {
    const env = makeEnv({
      AI: {
        run: vi.fn(async () => {
          throw new Error("busy");
        }),
      },
    });
    const res = await handleRequest(req("POST", { origin: ALLOWED }), env);
    expect(res.status).toBe(503);
  });

  it("returns { withheld: true } and does not leak a guard-failing answer", async () => {
    const bad = "Your kidneys are damaged and you have severe disease.";
    const env = makeEnv({ AI: { run: vi.fn(async () => ({ response: bad })) } });
    const res = await handleRequest(req("POST", { origin: ALLOWED }), env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ withheld: true });
    expect(text).not.toContain(bad);
    expect(text).not.toContain("damaged");
  });

  it("returns { answer } with the access-control-allow-origin header for a valid request", async () => {
    const env = makeEnv();
    const res = await handleRequest(req("POST", { origin: ALLOWED }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED);
    const body = (await res.json()) as { answer: string };
    expect(body.answer).toBe("Creatinine helps check kidney filtering.");
  });

  it("calls AI.run with a system-role first message containing the curated measures text, using DEFAULT_MODEL", async () => {
    const env = makeEnv();
    await handleRequest(req("POST", { origin: ALLOWED }), env);
    expect(env.AI.run).toHaveBeenCalledTimes(1);
    const [model, input] = env.AI.run.mock.calls[0]! as [
      string,
      { messages: { role: string; content: string }[] },
    ];
    expect(model).toBe(DEFAULT_MODEL);
    expect(input.messages[0]!.role).toBe("system");
    expect(input.messages[0]!.content).toContain("Creatinine is a normal waste product made when muscles are used");
  });

  it("uses env.MODEL when set", async () => {
    const env = makeEnv({ MODEL: "@cf/custom/model" });
    await handleRequest(req("POST", { origin: ALLOWED }), env);
    const [model] = env.AI.run.mock.calls[0]! as [string, unknown];
    expect(model).toBe("@cf/custom/model");
  });
});
