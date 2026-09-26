// The AIProvider interface (BUILD_SPEC.md 10.1). Every AI feature goes through it:
//   SampleAIProvider      the artifact's `sample` capability (the owner's Claude plan)
//   AnthropicApiProvider  the owner's API key, standalone build only (never in the artifact)
//   CopyPromptProvider    copy the prompt into claude.ai, paste the reply back
// Feature code calls `runAI` (lib/ai/run.ts) through the AI store, never a provider directly.
import type { ZodType } from "zod";
import type { AIMode, Tier } from "@/lib/types";

export type { AIMode, Tier };

/** One entry per prompt in section 10.4, plus chat and the connection test. */
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
  task: AITask; // for labels, logging and caching
  instructions: string; // standing instructions (shared preamble + task text)
  input: string | ChatTurn[]; // a prompt, or chat turns ending on a user turn
  tier?: Tier; // default "default"
  json?: ZodType<T>; // when set, parse and validate the reply
  onText?: (fullTextSoFar: string) => void;
  signal?: AbortSignal; // a NEW AbortController per call
  cacheKey?: string; // app-level cache for this visit (see lib/ai/run.ts)
  /** Chat turns and "Try again" must not be served from the runtime's 5-minute cache. */
  noCache?: boolean;
  /** API mode: overrides the tier's output budget. */
  maxTokens?: number;
  /** Copy-prompt mode: what the modal calls this request ("A hint for Two Sum"). */
  title?: string;
}

export type AIErrorCode =
  // the `sample` codes (contract 0.2.54) that can reach the app
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
  | "invalid_request"
  // API mode
  | "network"
  | "auth"
  | "http_error"
  | "overloaded"
  | "timeout"
  | "no_key"
  // no provider can serve the request in this view
  | "unavailable";

export type AIResult<T = unknown> =
  | { ok: true; text: string; data?: T; truncated: boolean; tierUsed?: Tier; mode: AIMode }
  | {
      ok: false;
      code: AIErrorCode;
      /** Plain, actionable copy for the owner (lib/ai/errors.ts). */
      message: string;
      /** Text that may stay on screen: streamed before a failure, or the raw invalid JSON. */
      partialText?: string;
      mode: AIMode;
    };

export interface AIProvider {
  readonly mode: AIMode;
  ask<T = unknown>(request: AIRequest<T>): Promise<AIResult<T>>;
}

/** Codes after which built-in Claude can't be used again in this view (switch to copy prompt). */
export const SAMPLE_BLOCKING_CODES: ReadonlySet<AIErrorCode> = new Set([
  "not_granted",
  "sampling_disabled",
  "not_declared",
  "capability_disabled",
  "capability_removed",
]);
