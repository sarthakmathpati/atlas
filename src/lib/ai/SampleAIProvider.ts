// Built-in Claude (BUILD_SPEC.md 10.1 and 10.2): the artifact's `sample` capability, which runs on
// the owner's own Claude plan. `sample` has no system role, so the standing instructions go in the
// first user turn. `onText` brings the WHOLE answer so far (assigned, never appended); every
// failure is one rejected `{ code, message, text? }`, never retried from code (lib/ai/run.ts makes
// the single, tightened retry for unreadable JSON that the owner asked for).
import type { ClaudeSample, SampleInput, SampleOptions } from "@/lib/runtime/claude";
import { isCodedError } from "@/lib/runtime/claude";
import {
  SAMPLE_BLOCKING_CODES,
  type AIErrorCode,
  type AIProvider,
  type AIRequest,
  type AIResult,
} from "./AIProvider";
import { failure, sampleCode } from "./errors";
import { extractJson, validateJson } from "./json";

/** The one-shot prompt or chat turns for `sample`, starting and ending on a user turn. */
export function sampleInput(request: Pick<AIRequest, "instructions" | "input">): SampleInput {
  if (typeof request.input === "string") return `${request.instructions}\n\n${request.input}`;
  const turns = request.input.filter((t) => t.content.trim() !== "");
  return [{ role: "user", content: request.instructions }, ...turns];
}

export class SampleAIProvider implements AIProvider {
  readonly mode = "sample" as const;

  constructor(
    private readonly sample: ClaudeSample,
    /** Told when a code means built-in Claude can't be used again in this view. */
    private readonly onBlocked?: (code: AIErrorCode) => void,
  ) {}

  async ask<T>(request: AIRequest<T>): Promise<AIResult<T>> {
    const input = sampleInput(request);
    let latest = "";
    const options: SampleOptions = {
      modelTier: request.tier ?? "default",
      onText: ({ text }) => {
        latest = text;
        request.onText?.(text);
      },
    };
    if (request.signal) options.signal = request.signal;
    if (request.noCache) options.cache = false;

    try {
      if (request.json) {
        // `json` may be missing on an older viewer app: read the text reply ourselves then.
        if (typeof this.sample.json !== "function")
          return await this.askTextThenParse(request, input, options);
        const value = await this.sample.json(input, options);
        const checked = validateJson(request.json, value);
        if (!checked.ok) {
          return failure("invalid_json", this.mode, {
            partialText: latest || safeStringify(value),
          });
        }
        return { ok: true, text: latest, data: checked.data, truncated: false, mode: this.mode };
      }
      const result = await this.sample(input, options);
      return {
        ok: true,
        text: result.text,
        truncated: result.truncated,
        tierUsed: result.modelTierApplied,
        mode: this.mode,
      };
    } catch (e) {
      if (!isCodedError(e)) return failure("upstream_error", this.mode, { partialText: latest });
      if (e.code === "capability_removed" && request.json) {
        // Fall back to a plain call and parse the reply here.
        return this.askTextThenParse(request, input, options);
      }
      const code = sampleCode(e.code);
      if (SAMPLE_BLOCKING_CODES.has(code)) this.onBlocked?.(code);
      // `refused` withdraws any partial answer: clear it.
      const partialText = code === "refused" ? undefined : (e.text ?? (latest || undefined));
      return failure(code, this.mode, { partialText });
    }
  }

  private async askTextThenParse<T>(
    request: AIRequest<T>,
    input: SampleInput,
    options: SampleOptions,
  ): Promise<AIResult<T>> {
    try {
      const result = await this.sample(input, options);
      const found = extractJson(result.text);
      const checked = found.ok ? validateJson(request.json!, found.value) : null;
      if (!checked?.ok) return failure("invalid_json", this.mode, { partialText: result.text });
      return {
        ok: true,
        text: result.text,
        data: checked.data,
        truncated: result.truncated,
        tierUsed: result.modelTierApplied,
        mode: this.mode,
      };
    } catch (e) {
      const code = isCodedError(e) ? sampleCode(e.code) : "upstream_error";
      if (SAMPLE_BLOCKING_CODES.has(code)) this.onBlocked?.(code);
      return failure(code, this.mode, {
        partialText: code === "refused" ? undefined : isCodedError(e) ? e.text : undefined,
      });
    }
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
