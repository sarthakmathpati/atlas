// The AIProvider interface (BUILD_SPEC.md 10.1). Every AI feature goes through it.
// Implementations arrive in Phase 6: SampleAIProvider (artifact `sample`), AnthropicApiProvider
// (the owner's API key, standalone only) and CopyPromptProvider (copy the prompt, paste back).
import type { ZodType } from "zod";
import type { Tier } from "@/lib/types";

export type { Tier };

/** One entry per prompt in section 10.4. */
export type AITask =
  | "explain"
  | "generate-content"
  | "hint"
  | "review"
  | "dry-run"
  | "explain-grade"
  | "quiz"
  | "quiz-grade"
  | "drill-grade"
  | "drill-generate"
  | "mock"
  | "mock-feedback"
  | "design-review"
  | "story-critique"
  | "weekly-reflection"
  | "revision-tighten"
  | "puzzle-grade"
  | "concept-suggest"
  | "mistake-advice"
  | "full-solution"
  | "chat"
  | "test-connection";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export interface AIRequest<T = unknown> {
  task: AITask; // for logging and caching
  instructions: string; // standing instructions (shared preamble + task text)
  input: string | ChatTurn[]; // a prompt, or chat turns ending on a user turn
  tier?: Tier; // default "default"
  json?: ZodType<T>; // when set, parse and validate the reply
  onText?: (fullTextSoFar: string) => void;
  signal?: AbortSignal; // a NEW AbortController per call
  cacheKey?: string; // app-level cache (hints, generated content)
  /** Chat turns and "Try again" must not be served from the runtime's 5-minute cache. */
  noCache?: boolean;
}

export type AIErrorCode =
  | "cancelled"
  | "not_granted"
  | "sampling_disabled"
  | "not_declared"
  | "capability_disabled"
  | "capability_removed"
  | "rate_limited"
  | "refused"
  | "invalid_json"
  | "prompt_too_large"
  | "upstream_error"
  | "empty_completion"
  | "session_expired"
  | "network"
  | "auth"
  | "http_error"
  | "unavailable";

export type AIResult<T = unknown> =
  | { ok: true; text: string; data?: T; truncated: boolean; tierUsed?: Tier }
  | { ok: false; code: AIErrorCode; message: string; partialText?: string };

export interface AIProvider {
  readonly mode: "sample" | "api" | "copy";
  ask<T = unknown>(request: AIRequest<T>): Promise<AIResult<T>>;
}
