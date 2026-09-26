// The AI adapter chosen once at startup from detectRuntime() (BUILD_SPEC.md 2.4), like the
// Repository and the FileSaver. It knows which providers this view can offer:
//   - built-in Claude when the runtime gave us `sample`;
//   - the API key provider in the standalone build only (the artifact never contains it);
//   - copy prompt always.
// The mode itself can change without a reload (F21), so the service hands out the provider for
// whichever mode the AI store resolves.
import type { RuntimeInfo } from "@/lib/runtime/detect";
import type { AIMode, Tier } from "@/lib/types";
import type { AIErrorCode, AIProvider } from "./AIProvider";
import { CopyPromptProvider, type CopyPresenter } from "./CopyPromptProvider";
import { SampleAIProvider } from "./SampleAIProvider";

export interface AIService {
  /** The view has the `sample` capability. */
  readonly hasSample: boolean;
  /** An API key can be used here (the standalone web app). */
  readonly apiAllowed: boolean;
  provider(mode: AIMode): Promise<AIProvider>;
}

export interface AIServiceDeps {
  presentCopy: CopyPresenter;
  getKey: () => Promise<string | undefined>;
  modelFor: (tier: Tier) => string;
  onSampleBlocked: (code: AIErrorCode) => void;
  /** Tests pass a fetch stand-in; the app uses the browser's. */
  fetchImpl?: typeof fetch;
}

export function createAIService(runtime: RuntimeInfo, deps: AIServiceDeps): AIService {
  const sample = runtime.sample ? new SampleAIProvider(runtime.sample, deps.onSampleBlocked) : null;
  const copy = new CopyPromptProvider(deps.presentCopy);
  let api: Promise<AIProvider> | null = null;
  return {
    hasSample: sample !== null,
    apiAllowed: !__ARTIFACT__,
    async provider(mode) {
      if (mode === "sample" && sample) return sample;
      if (mode === "api" && !__ARTIFACT__) {
        // Loaded on first use, and left out of the artifact build entirely.
        api ??= import("./AnthropicApiProvider").then(
          ({ AnthropicApiProvider }) =>
            new AnthropicApiProvider({
              getKey: deps.getKey,
              modelFor: deps.modelFor,
              fetchImpl: deps.fetchImpl,
            }),
        );
        return api;
      }
      return copy;
    },
  };
}
