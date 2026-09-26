// The AI layer without network access or real keys: the three providers, tolerant JSON, the single
// retry on unreadable JSON, the visit cache and mode resolution (BUILD_SPEC.md 10.1, 10.2, F21).
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AnthropicApiProvider, apiErrorCode, splitSse } from "@/lib/ai/AnthropicApiProvider";
import type { AIRequest } from "@/lib/ai/AIProvider";
import {
  CopyPromptProvider,
  copyPromptText,
  type CopyPromptView,
} from "@/lib/ai/CopyPromptProvider";
import { extractJson, parseReply, validateJson } from "@/lib/ai/json";
import { resolveMode } from "@/lib/ai/mode";
import { clearAICache, runAI } from "@/lib/ai/run";
import { SampleAIProvider, sampleInput } from "@/lib/ai/SampleAIProvider";
import { createFakeSample } from "@/lib/runtime/fakeClaude";

const gradeSchema = z.object({ score: z.number().min(0).max(5), note: z.string() });

const base: AIRequest = {
  task: "explain",
  instructions: "You are the tutor.",
  input: "Explain BFS.",
};

afterEach(() => clearAICache());

describe("tolerant JSON", () => {
  it("reads the whole text, a fenced block, or the first bracket to the last", () => {
    expect(extractJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
    expect(extractJson('Here you go:\n```json\n{"a":2}\n```\nThanks')).toEqual({
      ok: true,
      value: { a: 2 },
    });
    expect(extractJson('Sure. {"a":3} Hope that helps.')).toEqual({ ok: true, value: { a: 3 } });
    expect(extractJson("[1, 2, 3]")).toEqual({ ok: true, value: [1, 2, 3] });
    expect(extractJson("No JSON here.")).toEqual({ ok: false });
    expect(extractJson('{"a": 1')).toEqual({ ok: false });
  });

  it("validates with zod and names the problem", () => {
    const bad = parseReply('{"score": 9, "note": "x"}', gradeSchema);
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.reason).toBe("shape");
      expect(bad.issues[0]).toMatch(/score/);
    }
    expect(parseReply("nothing", gradeSchema)).toMatchObject({ ok: false, reason: "no_json" });
    expect(parseReply('{"score": 4, "note": "fine"}', gradeSchema)).toEqual({
      ok: true,
      data: { score: 4, note: "fine" },
    });
  });

  it("accepts an array wrapped in an object with one key", () => {
    const list = z.array(z.object({ q: z.string() }));
    expect(validateJson(list, { questions: [{ q: "a" }] })).toEqual({
      ok: true,
      data: [{ q: "a" }],
    });
  });
});

describe("SampleAIProvider (fake sample, contract 0.2.54)", () => {
  it("puts the instructions in the first user turn and streams the whole text so far", async () => {
    const sample = createFakeSample({ responder: () => "Breadth-first search visits levels." });
    const seen: string[] = [];
    const result = await new SampleAIProvider(sample).ask({
      ...base,
      tier: "quick",
      onText: (t) => seen.push(t),
    });
    expect(result).toMatchObject({
      ok: true,
      text: "Breadth-first search visits levels.",
      mode: "sample",
    });
    expect(sample.calls[0]!.input).toBe("You are the tutor.\n\nExplain BFS.");
    expect(sample.calls[0]!.options.modelTier).toBe("quick");
    // Every update carries the whole answer so far, growing.
    expect(seen.length).toBeGreaterThan(1);
    for (let i = 1; i < seen.length; i++) expect(seen[i]!.startsWith(seen[i - 1]!)).toBe(true);
    expect(seen.at(-1)).toBe("Breadth-first search visits levels.");
  });

  it("sends chats as turns that start and end on a user turn, without the cache", async () => {
    const input = sampleInput({
      instructions: "Rules",
      input: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello" },
        { role: "user", content: "More" },
      ],
    });
    expect(input).toEqual([
      { role: "user", content: "Rules" },
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
      { role: "user", content: "More" },
    ]);
    const sample = createFakeSample({ responder: () => "Sure." });
    await new SampleAIProvider(sample).ask({
      ...base,
      task: "chat",
      input: [{ role: "user", content: "Hi" }],
      noCache: true,
    });
    expect(sample.calls[0]!.options.cache).toBe(false);
  });

  it("validates sample.json replies with zod", async () => {
    const sample = createFakeSample({
      responder: () => '```json\n{"score": 4, "note": "good"}\n```',
    });
    const ok = await new SampleAIProvider(sample).ask({ ...base, json: gradeSchema });
    expect(ok).toMatchObject({ ok: true, data: { score: 4, note: "good" } });
    expect(sample.calls[0]!.verb).toBe("json");

    sample.setResponder(() => '{"score": "high"}');
    const shape = await new SampleAIProvider(sample).ask({
      ...base,
      input: "again",
      json: gradeSchema,
    });
    expect(shape).toMatchObject({ ok: false, code: "invalid_json" });
    if (!shape.ok) expect(shape.partialText).toContain("high");

    sample.setResponder(() => "I can't produce JSON for that.");
    const none = await new SampleAIProvider(sample).ask({
      ...base,
      input: "third",
      json: gradeSchema,
    });
    expect(none).toMatchObject({ ok: false, code: "invalid_json" });
    if (!none.ok) expect(none.partialText).toBe("I can't produce JSON for that.");
  });

  it("keeps the partial text on Stop", async () => {
    const sample = createFakeSample({
      responder: () => "one two three four five six",
      chunks: 6,
      delayMs: 5,
    });
    const controller = new AbortController();
    const result = await new SampleAIProvider(sample).ask({
      ...base,
      signal: controller.signal,
      onText: (t) => {
        if (t.length > 6) controller.abort();
      },
    });
    expect(result).toMatchObject({ ok: false, code: "cancelled" });
    if (!result.ok) expect(result.partialText?.length).toBeGreaterThan(0);
  });

  it("reports blocking codes so the view can switch to copy prompt", async () => {
    const sample = createFakeSample();
    const blocked = vi.fn();
    sample.failNext({ code: "not_granted", message: "declined" });
    const result = await new SampleAIProvider(sample, blocked).ask(base);
    expect(result).toMatchObject({ ok: false, code: "not_granted" });
    if (!result.ok) expect(result.message).toMatch(/copy-prompt mode/);
    expect(blocked).toHaveBeenCalledWith("not_granted");
  });

  it("clears the partial answer on refused and maps unknown codes to upstream_error", async () => {
    const sample = createFakeSample();
    sample.failNext({ code: "refused", message: "no", text: "partial" });
    const refused = await new SampleAIProvider(sample).ask(base);
    expect(refused).toMatchObject({ ok: false, code: "refused" });
    if (!refused.ok) expect(refused.partialText).toBeUndefined();

    sample.failNext({ code: "something_new", message: "?", text: "half an answer" });
    const unknown = await new SampleAIProvider(sample).ask({ ...base, input: "x" });
    expect(unknown).toMatchObject({
      ok: false,
      code: "upstream_error",
      partialText: "half an answer",
    });
  });

  it("rejects too-large prompts and rate limits with plain messages", async () => {
    const sample = createFakeSample();
    const big = await new SampleAIProvider(sample).ask({ ...base, input: "x".repeat(70_000) });
    expect(big).toMatchObject({ ok: false, code: "prompt_too_large" });
    sample.failNext({ code: "rate_limited", message: "slow down" });
    const limited = await new SampleAIProvider(sample).ask(base);
    expect(limited).toMatchObject({ ok: false, code: "rate_limited" });
    if (!limited.ok) expect(limited.message).not.toMatch(/slow down/);
  });
});

describe("runAI", () => {
  it("retries once with a firmer format reminder when JSON can't be read", async () => {
    let n = 0;
    const sample = createFakeSample({
      responder: () => (++n === 1 ? "Here is my grade: great" : '{"score": 5, "note": "ok"}'),
    });
    const result = await runAI(new SampleAIProvider(sample), { ...base, json: gradeSchema });
    expect(result).toMatchObject({ ok: true, data: { score: 5 } });
    expect(sample.calls).toHaveLength(2);
    expect(String(sample.calls[1]!.input)).toMatch(/could not be read/);
    expect(sample.calls[1]!.options.cache).toBe(false);
  });

  it("stops after one retry and keeps the raw reply", async () => {
    const sample = createFakeSample({ responder: () => "still not JSON" });
    const result = await runAI(new SampleAIProvider(sample), { ...base, json: gradeSchema });
    expect(result).toMatchObject({
      ok: false,
      code: "invalid_json",
      partialText: "still not JSON",
    });
    expect(sample.calls).toHaveLength(2);
  });

  it("never retries in copy-prompt mode", async () => {
    const present = vi.fn(async () => "not json");
    const result = await runAI(new CopyPromptProvider(present), { ...base, json: gradeSchema });
    expect(result).toMatchObject({ ok: false, code: "invalid_json", partialText: "not json" });
    expect(present).toHaveBeenCalledTimes(1);
  });

  it("keeps results with a cacheKey for the visit unless asked to refresh", async () => {
    const sample = createFakeSample({ responder: (_input, { call }) => `answer ${call}` });
    const provider = new SampleAIProvider(sample);
    const a = await runAI(provider, { ...base, cacheKey: "hint:lc-1:1" });
    const b = await runAI(provider, { ...base, cacheKey: "hint:lc-1:1" });
    expect(a).toEqual(b);
    expect(sample.calls).toHaveLength(1);
    const c = await runAI(provider, { ...base, cacheKey: "hint:lc-1:1" }, { refresh: true });
    expect(c).toMatchObject({ ok: true, text: "answer 2" });
    expect(sample.calls[1]!.options.cache).toBe(false);
  });
});

// ----- API mode with a mocked fetch -------------------------------------------------------------

function sseBody(events: object[], split = 7): ReadableStream<Uint8Array> {
  const text = events
    .map((e) => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`)
    .join("");
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) return controller.close();
      controller.enqueue(bytes.slice(offset, offset + split));
      offset += split;
    },
  });
}

function streamOf(parts: string[], stop = "end_turn"): object[] {
  return [
    { type: "message_start", message: { id: "msg_1" } },
    { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "" } },
    { type: "content_block_stop", index: 0 },
    { type: "ping" },
    { type: "content_block_start", index: 1, content_block: { type: "text", text: "" } },
    ...parts.map((p) => ({
      type: "content_block_delta",
      index: 1,
      delta: { type: "text_delta", text: p },
    })),
    { type: "content_block_stop", index: 1 },
    { type: "message_delta", delta: { stop_reason: stop } },
    { type: "message_stop" },
  ];
}

function apiProvider(
  fetchImpl: typeof fetch,
  key: string | undefined = "sk-ant-test-key",
  extra = {},
) {
  return new AnthropicApiProvider({
    getKey: async () => key,
    modelFor: (tier) =>
      ({ quick: "model-quick", default: "model-default", complex: "model-complex" })[tier],
    fetchImpl,
    ...extra,
  });
}

describe("AnthropicApiProvider (mocked fetch)", () => {
  it("posts to the Messages API with the key, browser access header, system and stream", async () => {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(sseBody(streamOf(["Hello", " there"])), { status: 200 }),
    );
    const seen: string[] = [];
    const result = await apiProvider(fetchImpl as unknown as typeof fetch).ask({
      ...base,
      tier: "complex",
      onText: (t) => seen.push(t),
    });
    expect(result).toMatchObject({ ok: true, text: "Hello there", truncated: false, mode: "api" });
    expect(seen).toEqual(["Hello", "Hello there"]);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
    const headers = init!.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test-key");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    const body = JSON.parse(String(init!.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "model-complex",
      system: "You are the tutor.",
      messages: [{ role: "user", content: "Explain BFS." }],
      stream: true,
      max_tokens: 32000,
    });
    expect(body).not.toHaveProperty("temperature");
  });

  it("parses JSON replies tolerantly and flags truncation", async () => {
    const fetchImpl = async () =>
      new Response(sseBody(streamOf(['Here:\n```json\n{"score": 3,', ' "note": "ok"}\n```'])), {
        status: 200,
      });
    const result = await apiProvider(fetchImpl).ask({ ...base, json: gradeSchema });
    expect(result).toMatchObject({ ok: true, data: { score: 3, note: "ok" } });

    const cut = async () =>
      new Response(sseBody(streamOf(["Part of an answer"], "max_tokens")), { status: 200 });
    expect(await apiProvider(cut).ask(base)).toMatchObject({ ok: true, truncated: true });
  });

  it("maps a wrong key, a missing model, limits and overload to plain errors", async () => {
    const error =
      (status: number, type: string, message = "x") =>
      async () =>
        new Response(JSON.stringify({ type: "error", error: { type, message } }), { status });
    const auth = await apiProvider(error(401, "authentication_error", "invalid x-api-key")).ask(
      base,
    );
    expect(auth).toMatchObject({ ok: false, code: "auth" });
    if (!auth.ok) expect(auth.message).toMatch(/API key/);
    const missing = await apiProvider(error(404, "not_found_error", "model: nope")).ask(base);
    expect(missing).toMatchObject({ ok: false, code: "http_error" });
    if (!missing.ok) expect(missing.message).toMatch(/model-default/);
    expect(await apiProvider(error(429, "rate_limit_error")).ask(base)).toMatchObject({
      code: "rate_limited",
    });
    expect(await apiProvider(error(529, "overloaded_error")).ask(base)).toMatchObject({
      code: "overloaded",
    });
    expect(
      await apiProvider(
        error(400, "invalid_request_error", "prompt is too long: 300000 tokens"),
      ).ask(base),
    ).toMatchObject({
      code: "prompt_too_large",
    });
    expect(apiErrorCode(500, "api_error")).toBe("upstream_error");
  });

  it("keeps partial text when the stream reports an error", async () => {
    const events = [
      ...streamOf(["Half an"]).slice(0, 7),
      { type: "error", error: { type: "overloaded_error", message: "Overloaded" } },
    ];
    const fetchImpl = async () => new Response(sseBody(events), { status: 200 });
    const result = await apiProvider(fetchImpl).ask(base);
    expect(result).toMatchObject({ ok: false, code: "overloaded", partialText: "Half an" });
  });

  it("says when there is no key, no network, a refusal or nothing written", async () => {
    const never = vi.fn();
    expect(await apiProvider(never as unknown as typeof fetch, "  ").ask(base)).toMatchObject({
      code: "no_key",
    });
    expect(never).not.toHaveBeenCalled();
    const offline = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await apiProvider(offline).ask(base)).toMatchObject({ code: "network" });
    const refused = async () => new Response(sseBody(streamOf([], "refusal")), { status: 200 });
    expect(await apiProvider(refused).ask(base)).toMatchObject({ code: "refused" });
    const empty = async () => new Response(sseBody(streamOf([])), { status: 200 });
    expect(await apiProvider(empty).ask(base)).toMatchObject({ code: "empty_completion" });
  });

  it("stops on Stop and times out a silent stream", async () => {
    const hanging = (_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    const controller = new AbortController();
    const pending = apiProvider(hanging).ask({ ...base, signal: controller.signal });
    controller.abort();
    expect(await pending).toMatchObject({ code: "cancelled" });

    const slow = apiProvider(hanging, "sk-ant-test-key", { connectTimeoutMs: 20 });
    expect(await slow.ask(base)).toMatchObject({ code: "timeout" });

    const stalled = async (_url: RequestInfo | URL, init?: RequestInit) =>
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(
              new TextEncoder().encode('event: message_start\ndata: {"type":"message_start"}\n\n'),
            );
            init?.signal?.addEventListener("abort", () =>
              c.error(new DOMException("aborted", "AbortError")),
            );
          },
        }),
        { status: 200 },
      );
    const idle = apiProvider(stalled, "sk-ant-test-key", { idleTimeoutMs: 20 });
    expect(await idle.ask(base)).toMatchObject({ code: "timeout" });
  });

  it("splits server-sent events across chunk boundaries", () => {
    const { events, rest } = splitSse('event: a\ndata: {"x":1}\n\nevent: b\ndata: {"y"');
    expect(events).toEqual([{ event: "a", data: '{"x":1}' }]);
    expect(rest).toBe('event: b\ndata: {"y"');
  });
});

describe("CopyPromptProvider", () => {
  it("shows one complete prompt and returns the pasted reply", async () => {
    const views: CopyPromptView[] = [];
    const provider = new CopyPromptProvider(async (v) => {
      views.push(v);
      return "  A pasted answer.  ";
    });
    const seen: string[] = [];
    const result = await provider.ask({ ...base, task: "hint", onText: (t) => seen.push(t) });
    expect(result).toMatchObject({ ok: true, text: "A pasted answer.", mode: "copy" });
    expect(views[0]).toMatchObject({ task: "hint", title: "A hint", expectsJson: false });
    expect(views[0]!.prompt).toBe("You are the tutor.\n\nExplain BFS.\n");
    expect(seen).toEqual(["A pasted answer."]);
  });

  it("reads pasted JSON tolerantly and cancels on close", async () => {
    const provider = new CopyPromptProvider(
      async () => 'Sure!\n```\n{"score": 2, "note": "partial"}\n```',
    );
    expect(await provider.ask({ ...base, json: gradeSchema })).toMatchObject({
      ok: true,
      data: { score: 2 },
    });
    const closed = new CopyPromptProvider(async () => null);
    expect(await closed.ask(base)).toMatchObject({ ok: false, code: "cancelled" });
  });

  it("renders a chat as the conversation so far plus the new message", () => {
    const text = copyPromptText({
      instructions: "Rules",
      input: [
        { role: "user", content: "What is a heap?" },
        { role: "assistant", content: "A tree with an order." },
        { role: "user", content: "Simpler please" },
      ],
    });
    expect(text).toContain("Me: What is a heap?");
    expect(text).toContain("You: A tree with an order.");
    expect(text).toMatch(/My new message:\nSimpler please\n$/);
  });
});

describe("resolveMode", () => {
  const inputs = { hasSample: true, sampleBlocked: false, apiAllowed: true, hasKey: true };
  it("honors the choice when the view supports it and falls back to copy prompt otherwise", () => {
    expect(resolveMode({ ...inputs, preferred: "sample" })).toEqual({ mode: "sample" });
    expect(resolveMode({ ...inputs, preferred: "sample", hasSample: false })).toEqual({
      mode: "copy",
      fallback: "sample-missing",
    });
    expect(resolveMode({ ...inputs, preferred: "sample", sampleBlocked: true }).fallback).toBe(
      "sample-blocked",
    );
    expect(resolveMode({ ...inputs, preferred: "api" })).toEqual({ mode: "api" });
    expect(resolveMode({ ...inputs, preferred: "api", hasKey: false }).fallback).toBe("api-no-key");
    expect(resolveMode({ ...inputs, preferred: "api", apiAllowed: false }).fallback).toBe(
      "api-unavailable",
    );
    expect(resolveMode({ ...inputs, preferred: "copy" })).toEqual({ mode: "copy" });
  });
});
