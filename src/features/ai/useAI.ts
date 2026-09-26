// One Claude request in a component (BUILD_SPEC.md 10.5, F21): "Thinking…" until the first text,
// then the answer streams in; Stop cancels (a NEW AbortController per call); errors become plain
// copy with the right action; "Try again" asks again without the runtime's answer cache. Leaving
// the screen stops the call (and closes the copy prompt modal).
import { useCallback, useEffect, useRef, useState } from "react";
import type { AIErrorCode, AIMode, AIResult } from "@/lib/ai/AIProvider";
import { aiErrorCopy, type AIErrorAction } from "@/lib/ai/errors";
import type { PromptSpec } from "@/lib/ai/prompts";
import { askAI, currentAIMode, type AskOptions } from "@/stores/aiStore";

export type AIPhase = "idle" | "thinking" | "streaming" | "done" | "stopped" | "error";

export interface AIRunState<T> {
  phase: AIPhase;
  /** The answer so far (streaming), the whole answer (done), or what may stay (stopped, error). */
  text: string;
  data?: T;
  truncated?: boolean;
  /** The mode that served (or is serving) the request. */
  mode: AIMode;
  error?: { code: AIErrorCode; message: string; action: AIErrorAction };
  /** Context was left out to fit the size limit. */
  trimmed?: boolean;
}

export interface BuiltPrompt<T> {
  spec: PromptSpec<T>;
  trimmed?: boolean;
}

export type PromptBuilder<T> = () => Promise<BuiltPrompt<T>> | BuiltPrompt<T>;

export type StartOptions<T = unknown> = Omit<AskOptions, "signal" | "onText"> & {
  /** Runs after a successful answer, including after "Try again". */
  onDone?: (result: Extract<AIResult<T>, { ok: true }>) => void;
};

export interface AIRequestHandle<T> {
  state: AIRunState<T>;
  /** True while thinking or streaming. */
  busy: boolean;
  start: (build: PromptBuilder<T>, options?: StartOptions<T>) => Promise<AIResult<T> | null>;
  /** Asks again (no cache) with the last prompt builder. */
  retry: () => Promise<AIResult<T> | null>;
  stop: () => void;
  reset: () => void;
}

const idle = <T>(): AIRunState<T> => ({ phase: "idle", text: "", mode: currentAIMode().mode });

export function useAIRequest<T = unknown>(): AIRequestHandle<T> {
  const [state, setState] = useState<AIRunState<T>>(idle);
  const controller = useRef<AbortController | null>(null);
  const last = useRef<{ build: PromptBuilder<T>; options: StartOptions<T> } | null>(null);

  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = null;
    },
    [],
  );

  const start = useCallback(async (build: PromptBuilder<T>, options: StartOptions<T> = {}) => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    last.current = { build, options };
    const mode = currentAIMode().mode;
    setState({ phase: "thinking", text: "", mode });
    let built: BuiltPrompt<T>;
    try {
      built = await build();
    } catch (e) {
      console.error("Building the prompt failed", e);
      if (controller.current === c)
        setState({
          phase: "error",
          text: "",
          mode,
          error: {
            code: "invalid_request",
            message: "Atlas couldn't prepare this request. Reload the page, then try again.",
            action: "retry",
          },
        });
      return null;
    }
    if (c.signal.aborted) return null;
    const trimmed = built.trimmed;
    const { onDone, ...ask } = options;
    const result = await askAI(built.spec, {
      ...ask,
      signal: c.signal,
      onText: (text) => {
        if (controller.current !== c) return;
        setState({ phase: "streaming", text, mode, trimmed });
      },
    });
    // A newer request (or leaving the screen) replaced this one.
    if (controller.current !== c) return result;
    controller.current = null;
    if (result.ok) {
      setState({
        phase: "done",
        text: result.text,
        data: result.data,
        truncated: result.truncated,
        mode: result.mode,
        trimmed,
      });
      onDone?.(result);
    } else if (result.code === "cancelled") {
      setState(
        result.partialText
          ? { phase: "stopped", text: result.partialText, mode: result.mode, trimmed }
          : { phase: "idle", text: "", mode: result.mode },
      );
    } else {
      const copy = aiErrorCopy(result.code, result.mode);
      setState({
        phase: "error",
        text: result.partialText ?? "",
        mode: result.mode,
        trimmed,
        error: { code: result.code, message: result.message, action: copy.action },
      });
    }
    return result;
  }, []);

  const retry = useCallback(async () => {
    if (!last.current) return null;
    return start(last.current.build, { ...last.current.options, refresh: true });
  }, [start]);

  const stop = useCallback(() => {
    controller.current?.abort();
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setState(idle());
  }, []);

  return {
    state,
    busy: state.phase === "thinking" || state.phase === "streaming",
    start,
    retry,
    stop,
    reset,
  };
}
