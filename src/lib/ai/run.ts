// Running a request (BUILD_SPEC.md 10.1): the one place that adds behavior on top of a provider.
//   - JSON replies are validated by the provider; if the first reply can't be read, the request is
//     sent once more with a firmer format reminder and without the runtime cache. Never more than
//     once, and never in copy-prompt mode (the owner pastes again instead).
//   - `cacheKey` keeps successful results in memory for this visit, so reopening costs nothing.
//     Hints, generated explanations and reviews are also stored with the owner's data by features.
import type { AIProvider, AIRequest, AIResult } from "./AIProvider";
import { JSON_RETRY_REMINDER } from "./json";

const memory = new Map<string, AIResult>();

export interface RunOptions {
  /** Ignore a cached result for this cacheKey and ask again. */
  refresh?: boolean;
}

export async function runAI<T>(
  provider: AIProvider,
  request: AIRequest<T>,
  options: RunOptions = {},
): Promise<AIResult<T>> {
  const key = request.cacheKey ? `${provider.mode}|${request.cacheKey}` : null;
  if (key && !options.refresh) {
    const hit = memory.get(key) as AIResult<T> | undefined;
    if (hit?.ok) {
      request.onText?.(hit.text);
      return hit;
    }
  }
  const first = await provider.ask(options.refresh ? { ...request, noCache: true } : request);
  let result = first;
  if (
    !first.ok &&
    first.code === "invalid_json" &&
    request.json &&
    provider.mode !== "copy" &&
    !request.signal?.aborted
  ) {
    result = await provider.ask({
      ...request,
      instructions: `${request.instructions}\n\n${JSON_RETRY_REMINDER}`,
      noCache: true,
    });
    // Keep the first raw reply if the retry produced nothing to show.
    if (!result.ok && !result.partialText && first.partialText)
      result = { ...result, partialText: first.partialText };
  }
  if (key && result.ok) memory.set(key, result);
  return result;
}

/** Forget cached results (after an import or reset, and in tests). */
export function clearAICache(): void {
  memory.clear();
}
