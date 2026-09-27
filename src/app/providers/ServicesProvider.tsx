// Detects the runtime and opens storage once, after the first paint (BUILD_SPEC.md 2.3, 2.4).
// The shell renders immediately with a skeleton; this provider fills in the services when ready.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createAIService } from "@/lib/ai/service";
import { chooseFileSaver } from "@/lib/files/FileSaver";
import { detectRuntime, type RuntimeInfo } from "@/lib/runtime/detect";
import { openRepository, prepareRepository } from "@/lib/storage";
import { getApiKey, modelFor, onSampleBlocked, presentCopyPrompt } from "@/stores/aiStore";
import { ServicesContext, type ServicesState } from "./servicesContext";

interface ServicesProviderProps {
  children: ReactNode;
  /** Tests inject a runtime instead of detecting one. */
  detect?: () => Promise<RuntimeInfo>;
}

export function ServicesProvider({ children, detect = detectRuntime }: ServicesProviderProps) {
  const [state, setState] = useState<ServicesState>({ status: "connecting" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ status: "connecting" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let opened: { close(): void } | null = null;
    (async () => {
      try {
        const runtime = await detect();
        const { repository, notice } = await openRepository(runtime);
        if (cancelled) {
          repository.close();
          return;
        }
        opened = repository;
        // A first visit with built-in Claude starts in that mode (BUILD_SPEC.md 2.3).
        await prepareRepository(repository, new Date(), {
          aiMode: runtime.sample ? "sample" : "copy",
        });
        if (cancelled) return;
        setState({
          status: "ready",
          services: {
            runtime,
            repository,
            fileSaver: chooseFileSaver(runtime),
            ai: createAIService(runtime, {
              presentCopy: presentCopyPrompt,
              getKey: getApiKey,
              modelFor,
              onSampleBlocked,
            }),
            storageNotice: notice,
          },
        });
      } catch (e) {
        console.error("Starting storage failed", e);
        if (!cancelled) {
          setState({
            status: "error",
            message:
              "Atlas couldn't open your saved data. Check that this browser allows site storage, then try again.",
            retry,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      opened?.close();
    };
  }, [attempt, detect, retry]);

  return <ServicesContext.Provider value={state}>{children}</ServicesContext.Provider>;
}
