// Which AI mode this view uses (BUILD_SPEC.md 2.3, F21). The owner's choice is kept in the profile;
// the view decides whether it can honor it:
//   - built-in Claude needs the `sample` capability, and stops for the visit once a call says it
//     isn't allowed (not_granted and friends);
//   - an API key works only in the standalone build, and only once a key is saved;
//   - copy prompt works everywhere, so it is the fallback.
import type { AIMode } from "@/lib/types";

export interface ModeInputs {
  preferred: AIMode;
  hasSample: boolean;
  sampleBlocked: boolean;
  apiAllowed: boolean;
  hasKey: boolean;
}

export type ModeFallback = "sample-missing" | "sample-blocked" | "api-unavailable" | "api-no-key";

export interface ResolvedMode {
  mode: AIMode;
  /** Why the owner's choice isn't the mode in use. */
  fallback?: ModeFallback;
}

export function resolveMode(i: ModeInputs): ResolvedMode {
  if (i.preferred === "sample") {
    if (!i.hasSample) return { mode: "copy", fallback: "sample-missing" };
    if (i.sampleBlocked) return { mode: "copy", fallback: "sample-blocked" };
    return { mode: "sample" };
  }
  if (i.preferred === "api") {
    if (!i.apiAllowed) return { mode: "copy", fallback: "api-unavailable" };
    if (!i.hasKey) return { mode: "copy", fallback: "api-no-key" };
    return { mode: "api" };
  }
  return { mode: "copy" };
}

export const FALLBACK_NOTE: Record<ModeFallback, string> = {
  "sample-missing":
    "Built-in Claude isn't available in this view, so Atlas uses copy prompt instead.",
  "sample-blocked":
    "Claude isn't allowed in this view right now, so Atlas uses copy prompt for this visit.",
  "api-unavailable": "API keys work only in the web app version, so Atlas uses copy prompt here.",
  "api-no-key": "No API key is saved yet, so Atlas uses copy prompt until you add one.",
};

export const MODE_LABEL: Record<AIMode, string> = {
  sample: "Built-in Claude",
  api: "Your API key",
  copy: "Copy prompt",
};
