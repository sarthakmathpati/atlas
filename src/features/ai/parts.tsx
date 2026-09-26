// Shared pieces for every Claude feature (BUILD_SPEC.md 10.5): the small "Claude" tag on AI text,
// the "Thinking…" state, a Stop button, and one view that shows a request from thinking to done,
// with plain errors and the right next step.
import { Copy, RotateCcw, Settings, Sparkles, Square } from "lucide-react";
import { lazy, Suspense, type ReactNode } from "react";
import { routeHref } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Callout, Skeleton } from "@/components/ui/Misc";
import type { AIMode } from "@/lib/types";
import { toast } from "@/stores/toastStore";
import type { AIRequestHandle, AIRunState } from "./useAI";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));

/** Marks text Claude wrote (section 10.5). */
export function ClaudeTag({ className, label = "Claude" }: { className?: string; label?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-accent-soft px-1.5 text-xs font-medium text-accent",
        className,
      )}
    >
      <Sparkles size={11} aria-hidden="true" />
      {label}
    </span>
  );
}

/** "Thinking…" with a quiet pulse (still under reduced motion). */
export function Thinking({ mode, label }: { mode: AIMode; label?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-base text-muted">
      <span className="atlas-thinking inline-flex gap-1" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {label ??
        (mode === "copy"
          ? "Waiting for the reply you paste in the copy prompt window…"
          : "Thinking…")}
    </p>
  );
}

export function StopButton({ onStop, className }: { onStop: () => void; className?: string }) {
  return (
    <Button size="sm" variant="ghost" icon={Square} onClick={onStop} className={className}>
      Stop
    </Button>
  );
}

export function AIMarkdown({ children, compact }: { children: string; compact?: boolean }) {
  return (
    <Suspense fallback={<Skeleton className="h-16 w-full" />}>
      <MarkdownView compact={compact}>{children}</MarkdownView>
    </Suspense>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied.");
  } catch {
    toast("Couldn't copy here. Select the text and press Ctrl+C (or long-press and Copy).", {
      tone: "error",
    });
  }
}

/** What went wrong, in plain words, with the next step (Try again, or Settings). */
export function AIErrorView<T>({
  state,
  onRetry,
  className,
}: {
  state: AIRunState<T>;
  onRetry?: () => void;
  className?: string;
}) {
  if (state.phase !== "error" || !state.error) return null;
  const { code, message, action } = state.error;
  return (
    <div className={cx("space-y-2", className)}>
      <Callout
        tone={code === "refused" ? "info" : "warning"}
        actions={
          <>
            {action === "settings" && (
              <Button size="sm" icon={Settings} href={`${routeHref("/settings")}#claude`}>
                Open Settings
              </Button>
            )}
            {(action === "retry" || action === "settings") && onRetry && (
              <Button size="sm" icon={RotateCcw} onClick={onRetry}>
                Try again
              </Button>
            )}
          </>
        }
      >
        {message}
      </Callout>
      {state.text.trim() && (
        <details className="rounded-control border border-rule px-3 py-2 text-sm">
          <summary className="cursor-pointer text-muted">
            {code === "invalid_json"
              ? "Claude's reply as it came"
              : "What arrived before it stopped"}
          </summary>
          <div className="mt-2 space-y-2">
            {code === "invalid_json" ? (
              <pre className="max-h-64 overflow-auto rounded-control bg-surface-sunken p-2 font-mono text-xs whitespace-pre-wrap text-text">
                {state.text}
              </pre>
            ) : (
              <AIMarkdown compact>{state.text}</AIMarkdown>
            )}
            <Button size="sm" variant="ghost" icon={Copy} onClick={() => void copyText(state.text)}>
              Copy text
            </Button>
          </div>
        </details>
      )}
    </div>
  );
}

interface AIRunViewProps<T> {
  request: AIRequestHandle<T>;
  /** Renders a finished result; defaults to the text as Markdown. */
  children?: (state: AIRunState<T>) => ReactNode;
  /** Label while waiting ("Writing your quiz…"). */
  thinkingLabel?: string;
  className?: string;
  compact?: boolean;
  /** Show the streaming text (JSON tasks stream raw JSON, which isn't worth showing). */
  showStream?: boolean;
}

/** A request from start to finish: thinking, streaming with Stop, done, stopped or failed. */
export function AIRunView<T>({
  request,
  children,
  thinkingLabel,
  className,
  compact,
  showStream = true,
}: AIRunViewProps<T>) {
  const { state, stop, retry } = request;
  if (state.phase === "idle") return null;
  return (
    <div className={cx("space-y-3", className)} aria-live="polite" aria-busy={request.busy}>
      {(state.phase === "thinking" || (state.phase === "streaming" && !showStream)) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Thinking mode={state.mode} label={thinkingLabel} />
          {state.mode !== "copy" && <StopButton onStop={stop} />}
        </div>
      )}
      {state.phase === "streaming" && showStream && (
        <div className="space-y-2">
          <AIMarkdown compact={compact}>{state.text}</AIMarkdown>
          <StopButton onStop={stop} />
        </div>
      )}
      {state.phase === "done" && (
        <>
          {children ? children(state) : <AIMarkdown compact={compact}>{state.text}</AIMarkdown>}
          {state.truncated && (
            <p className="text-sm text-muted">
              Claude's answer was cut short. Ask for less at a time to get the rest.
            </p>
          )}
        </>
      )}
      {state.phase === "stopped" && (
        <div className="space-y-2">
          {showStream && <AIMarkdown compact={compact}>{state.text}</AIMarkdown>}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Stopped.</span>
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => void retry()}>
              Try again
            </Button>
          </div>
        </div>
      )}
      <AIErrorView state={state} onRetry={() => void retry()} />
      {state.trimmed && (state.phase === "done" || state.phase === "streaming") && (
        <p className="text-xs text-muted">
          Some of your notes or code were shortened to fit what Claude can read at once.
        </p>
      )}
    </div>
  );
}
