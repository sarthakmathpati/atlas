// The owner's own API key (BUILD_SPEC.md 10.1), standalone build only: this module is never
// bundled into the claude.ai artifact (it's imported behind `!__ARTIFACT__`, CLAUDE.md decision 10).
//
// POST /v1/messages straight from the browser with the key from IndexedDB (SecretsStore), the
// instructions in `system`, and `stream: true`; text arrives as `content_block_delta` events with
// `text_delta`s. Current models think before they write (Sonnet 5 adaptively, Opus 5.5 always), and
// thinking counts toward `max_tokens`, so the output budgets are larger than the spec's first
// numbers (CLAUDE.md decision 75). No `temperature` or `thinking` fields are sent: the defaults suit
// every tier and the newest models reject changes to them.
import type { Tier } from "@/lib/types";
import type { AIErrorCode, AIProvider, AIRequest, AIResult, ChatTurn } from "./AIProvider";
import { failure } from "./errors";
import { parseReply } from "./json";

export const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";

/** Output budgets per tier (thinking included). A request may ask for its own. */
export const MAX_TOKENS: Record<Tier, number> = { quick: 4096, default: 16000, complex: 32000 };

export interface ApiProviderOptions {
  getKey: () => Promise<string | undefined>;
  modelFor: (tier: Tier) => string;
  fetchImpl?: typeof fetch;
  /** No response headers within this time: give up. */
  connectTimeoutMs?: number;
  /** No bytes on an open stream for this long: give up (the API sends pings meanwhile). */
  idleTimeoutMs?: number;
}

type SseEvent = { event: string; data: string };

/** Splits a server-sent-events buffer into complete events; returns the unfinished rest. */
export function splitSse(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];
  const normalized = buffer.replace(/\r\n/g, "\n");
  const blocks = normalized.split("\n\n");
  const rest = blocks.pop() ?? "";
  for (const block of blocks) {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (data.length || event !== "message") events.push({ event, data: data.join("\n") });
  }
  return { events, rest };
}

/** Maps an HTTP status and the API's error type to our code. */
export function apiErrorCode(status: number, type: string | undefined, message = ""): AIErrorCode {
  if (type === "authentication_error" || status === 401) return "auth";
  if (type === "permission_error" || status === 403) return "auth";
  if (type === "rate_limit_error" || status === 429) return "rate_limited";
  if (type === "overloaded_error" || status === 529) return "overloaded";
  if (type === "request_too_large" || status === 413) return "prompt_too_large";
  if (/prompt is too long|too many tokens|context (window|length)/i.test(message))
    return "prompt_too_large";
  if (type === "api_error" || status >= 500) return "upstream_error";
  if (type === "not_found_error" || status === 404) return "http_error";
  if (type === "invalid_request_error" || status === 400) return "invalid_request";
  return "http_error";
}

function messagesFor(input: string | ChatTurn[]): ChatTurn[] {
  if (typeof input === "string") return [{ role: "user", content: input }];
  const turns = input.filter((t) => t.content.trim() !== "");
  // The Messages API wants the conversation to start with the user.
  while (turns.length && turns[0]!.role !== "user") turns.shift();
  return turns;
}

class Timeout extends Error {}

export class AnthropicApiProvider implements AIProvider {
  readonly mode = "api" as const;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ApiProviderOptions) {
    this.fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
  }

  async ask<T>(request: AIRequest<T>): Promise<AIResult<T>> {
    const key = (await this.options.getKey())?.trim();
    if (!key) return failure("no_key", this.mode);
    if (request.signal?.aborted) return failure("cancelled", this.mode);

    const tier = request.tier ?? "default";
    const body = {
      model: this.options.modelFor(tier),
      max_tokens: request.maxTokens ?? MAX_TOKENS[tier],
      system: request.instructions,
      messages: messagesFor(request.input),
      stream: true,
    };

    // Our own controller, so the owner's Stop and the timeouts can both end the request.
    const controller = new AbortController();
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = (ms: number | undefined) => {
      if (timer) clearTimeout(timer);
      if (!ms) return;
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort(new Timeout());
      }, ms);
    };
    const onAbort = () => controller.abort(request.signal?.reason);
    request.signal?.addEventListener("abort", onAbort, { once: true });

    let text = "";
    let stopReason: string | null = null;
    try {
      arm(this.options.connectTimeoutMs ?? 60_000);
      const response = await this.fetchImpl(ANTHROPIC_MESSAGES_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": ANTHROPIC_VERSION,
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        let type: string | undefined;
        let message = "";
        try {
          const payload = (await response.json()) as {
            error?: { type?: string; message?: string };
          };
          type = payload.error?.type;
          message = payload.error?.message ?? "";
        } catch {
          /* not JSON: the status says enough */
        }
        const code = apiErrorCode(response.status, type, message);
        const detail =
          type === "not_found_error" || response.status === 404
            ? `model not found: ${body.model}`
            : `${response.status}`;
        return failure(code, this.mode, { detail });
      }
      if (!response.body) return failure("network", this.mode);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const idle = this.options.idleTimeoutMs ?? 90_000;
      for (;;) {
        arm(idle);
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = splitSse(buffer);
        buffer = rest;
        for (const ev of events) {
          if (!ev.data) continue;
          let payload: {
            type?: string;
            delta?: { type?: string; text?: string; stop_reason?: string | null };
            error?: { type?: string; message?: string };
          };
          try {
            payload = JSON.parse(ev.data) as typeof payload;
          } catch {
            continue;
          }
          const kind = payload.type ?? ev.event;
          if (kind === "content_block_delta" && payload.delta?.type === "text_delta") {
            text += payload.delta.text ?? "";
            if (text.trim()) request.onText?.(text);
          } else if (kind === "message_delta") {
            stopReason = payload.delta?.stop_reason ?? stopReason;
          } else if (kind === "error") {
            const code = apiErrorCode(0, payload.error?.type, payload.error?.message);
            return failure(code === "http_error" ? "upstream_error" : code, this.mode, {
              partialText: text,
            });
          }
        }
      }
    } catch (e) {
      if (timedOut) return failure("timeout", this.mode, { partialText: text });
      if (controller.signal.aborted) return failure("cancelled", this.mode, { partialText: text });
      // fetch rejects with a TypeError when the network (or CORS) fails.
      return failure(text ? "upstream_error" : "network", this.mode, { partialText: text });
    } finally {
      if (timer) clearTimeout(timer);
      request.signal?.removeEventListener("abort", onAbort);
    }

    if (stopReason === "refusal") return failure("refused", this.mode);
    const truncated = stopReason === "max_tokens";
    if (request.task === "test-connection") return { ok: true, text, truncated, mode: this.mode };
    if (!text.trim()) return failure("empty_completion", this.mode);

    if (request.json) {
      const parsed = parseReply(text, request.json);
      if (!parsed.ok) return failure("invalid_json", this.mode, { partialText: text });
      return { ok: true, text, data: parsed.data, truncated, tierUsed: tier, mode: this.mode };
    }
    return { ok: true, text, truncated, tierUsed: tier, mode: this.mode };
  }
}
