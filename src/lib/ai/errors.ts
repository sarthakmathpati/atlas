// Plain, actionable copy for every AI failure (BUILD_SPEC.md 10.5: "never raw error strings").
// The providers put this text in AIResult.message; the UI shows it with the matching action.
import type { AIErrorCode, AIMode } from "./AIProvider";

/** What the UI offers next to the message. */
export type AIErrorAction = "retry" | "settings" | "none";

export interface AIErrorCopy {
  message: string;
  action: AIErrorAction;
}

export function aiErrorCopy(code: AIErrorCode, mode: AIMode, detail?: string): AIErrorCopy {
  switch (code) {
    case "cancelled":
      return { message: "Stopped.", action: "retry" };
    case "not_granted":
    case "sampling_disabled":
    case "not_declared":
    case "capability_disabled":
    case "capability_removed":
      return {
        message:
          "Claude isn't available in this view, so Atlas switched to copy-prompt mode for this visit. Try again to get the prompt.",
        action: "retry",
      };
    case "rate_limited":
      return {
        message:
          mode === "api"
            ? "Anthropic says there have been too many requests. Wait a minute, then try again."
            : "Claude is busy, or you've reached your usage limit for now. Try again in a bit.",
        action: "retry",
      };
    case "refused":
      return {
        message: "Claude declined to answer this. Try asking in a different way.",
        action: "none",
      };
    case "invalid_json":
      return {
        message:
          mode === "copy"
            ? "Atlas couldn't read that reply in the format it needs. Check that you pasted all of Claude's answer, then try again."
            : "Claude's reply wasn't in the format Atlas needs. Try again; the raw reply is below.",
        action: "retry",
      };
    case "prompt_too_large":
      return {
        message:
          "That was too much text to send at once. Shorten your code or notes, then try again.",
        action: "retry",
      };
    case "upstream_error":
      return {
        message: "Claude stopped part way through. What arrived is kept; try again for the rest.",
        action: "retry",
      };
    case "overloaded":
      return {
        message: "Claude is overloaded right now. Try again in a minute.",
        action: "retry",
      };
    case "empty_completion":
      return {
        message: "Claude didn't write anything. Try again, or ask for less at a time.",
        action: "retry",
      };
    case "session_expired":
      return {
        message: "Your claude.ai sign-in has ended. Sign in again, then try again.",
        action: "retry",
      };
    case "invalid_request":
      return {
        message:
          "Claude couldn't read this request. Try again; if it keeps happening, switch to copy-prompt mode in Settings.",
        action: "settings",
      };
    case "network":
      return {
        message: "Couldn't reach Claude. Check your connection and try again.",
        action: "retry",
      };
    case "auth":
      return {
        message:
          "Anthropic didn't accept your API key. Check it in Settings, under Claude, or switch to copy-prompt mode.",
        action: "settings",
      };
    case "http_error":
      return {
        message: `Anthropic returned an error${detail ? ` (${detail})` : ""}. Check the model names in Settings, under Claude, then try again.`,
        action: "settings",
      };
    case "timeout":
      return {
        message: "Claude took too long to answer. Try again, or ask for less at a time.",
        action: "retry",
      };
    case "no_key":
      return {
        message:
          "Add your API key in Settings, under Claude, or switch to copy-prompt mode to use Claude without one.",
        action: "settings",
      };
    case "unavailable":
      return {
        message: "Claude isn't set up in this view. Choose how Atlas reaches Claude in Settings.",
        action: "settings",
      };
  }
}

export function failure(
  code: AIErrorCode,
  mode: AIMode,
  extra: { partialText?: string; detail?: string } = {},
) {
  const result: {
    ok: false;
    code: AIErrorCode;
    message: string;
    mode: AIMode;
    partialText?: string;
  } = { ok: false, code, message: aiErrorCopy(code, mode, extra.detail).message, mode };
  if (extra.partialText) result.partialText = extra.partialText;
  return result;
}

const KNOWN_SAMPLE_CODES: ReadonlySet<string> = new Set<AIErrorCode>([
  "cancelled",
  "not_granted",
  "sampling_disabled",
  "not_declared",
  "capability_disabled",
  "capability_removed",
  "rate_limited",
  "refused",
  "invalid_json",
  "prompt_too_large",
  "upstream_error",
  "empty_completion",
  "session_expired",
  "invalid_request",
]);

/** Maps a `sample` rejection code to ours; unknown codes are treated as upstream errors. */
export function sampleCode(code: string): AIErrorCode {
  if (code === "transform_error" || code === "queue_overflow") return "invalid_request";
  if (code === "images_unavailable" || code === "tools_unavailable" || code === "image_rejected")
    return "invalid_request";
  return KNOWN_SAMPLE_CODES.has(code) ? (code as AIErrorCode) : "upstream_error";
}
