// The design workspace (F26): a 45-minute timer and one editor per section of a strong answer
// (LLD and HLD differ; LLD has a code section), plus the architecture sketch. Everything saves
// itself as you type. "Finish and review" moves to the review (Claude's or your own), then
// saving records the attempt. The mock interview's design round reuses this workspace (F15).
import { CheckCircle2, Pause, Play } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { normalizeLanguage } from "@/components/ui/code/languages";
import { cx } from "@/components/ui/cx";
import { Skeleton } from "@/components/ui/Misc";
import { ProgressBar } from "@/components/ui/Progress";
import { formatClock, useTimer } from "@/components/ui/timer";
import { DESIGN_MINUTES, designKind, sectionsFor, wordsWritten } from "@/lib/designs/designs";
import type { DesignAttempt, SeedProblem } from "@/lib/types";
import { startActivitySource, stopActivitySource } from "@/stores/activityStore";
import { setDesignElapsed, updateSection } from "@/stores/designStore";
import { useProfileStore } from "@/stores/profileStore";
import { AutoField } from "../problems/workspace/fields";
import { DesignReviewPanel } from "./DesignReviewPanel";
import { SketchEditor } from "./SketchEditor";

const CodeEditor = lazy(() => import("@/components/ui/code/CodeEditor"));

const LIMIT_MS = DESIGN_MINUTES * 60_000;

function CodeSection({
  attempt,
  label,
  hint,
  onBegin,
}: {
  attempt: DesignAttempt;
  label: string;
  hint: string;
  onBegin: () => void;
}) {
  const language = normalizeLanguage(useProfileStore((s) => s.profile?.primaryLanguage ?? "cpp"));
  const [code, setCode] = useState(attempt.sections.code ?? "");
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(code);
  useEffect(() => {
    latest.current = code;
  });
  useEffect(
    () => () => {
      if (pending.current) {
        clearTimeout(pending.current);
        updateSection(attempt.id, "code", latest.current);
      }
    },
    [attempt.id],
  );
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-text" id={`code-${attempt.id}`}>
        {label}
      </p>
      <div className="h-80 overflow-hidden rounded-control border border-rule bg-code">
        <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
          <CodeEditor
            value={code}
            onChange={(v) => {
              setCode(v);
              if (pending.current) clearTimeout(pending.current);
              pending.current = setTimeout(() => {
                pending.current = null;
                updateSection(attempt.id, "code", v);
              }, 700);
            }}
            language={language}
            label={`${label} for this design`}
            placeholder="The core classes and their main methods."
            height="100%"
            minHeight="100%"
            className="h-full rounded-none border-0"
            onFirstEdit={onBegin}
          />
        </Suspense>
      </div>
      <p className="text-sm text-muted">{hint}</p>
    </div>
  );
}

export function DesignWorkspace({
  problem,
  attempt,
  onSaved,
  stage: controlledStage,
  onStage,
  hideReview,
  saveLabel,
  autoStart,
  clock = true,
}: {
  problem: SeedProblem;
  attempt: DesignAttempt;
  onSaved: () => void;
  /** The mock interview controls the stage itself. */
  stage?: "write" | "review";
  onStage?: (stage: "write" | "review") => void;
  hideReview?: boolean;
  saveLabel?: string;
  /** Start the timer at once (a new attempt); a resumed one waits for Resume or typing. */
  autoStart?: boolean;
  /** Its own 45-minute clock; a mock interview keeps time itself, so it turns this off. */
  clock?: boolean;
}) {
  const kind = designKind(problem);
  const sections = sectionsFor(kind);
  const [ownStage, setOwnStage] = useState<"write" | "review">("write");
  const stage = controlledStage ?? ownStage;
  const setStage = onStage ?? setOwnStage;
  const [timeUp, setTimeUp] = useState((attempt.elapsedMs ?? 0) >= LIMIT_MS);
  const timer = useTimer({
    countdownMs: LIMIT_MS,
    initialMs: attempt.elapsedMs ?? 0,
    onFinish: () => setTimeUp(true),
  });

  // The timer counts toward today's minutes, and its time is saved with the attempt.
  const running = timer.running;
  useEffect(() => {
    if (!running) return;
    const source = `design:${attempt.id}`;
    startActivitySource(source);
    return () => stopActivitySource(source);
  }, [running, attempt.id]);
  const elapsed = useRef(timer.elapsedMs);
  useEffect(() => {
    elapsed.current = timer.elapsedMs;
  });
  useEffect(() => {
    const id = setInterval(() => setDesignElapsed(attempt.id, elapsed.current), 15_000);
    const save = () => setDesignElapsed(attempt.id, elapsed.current);
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [attempt.id]);

  const begin = () => {
    if (clock && !timer.running && !timeUp) timer.start();
  };
  const [autoStarted, setAutoStarted] = useState(false);
  if (autoStart && !autoStarted) {
    setAutoStarted(true);
    if (!timeUp) timer.start();
  }

  const remaining = timer.remainingMs ?? 0;
  const words = wordsWritten(attempt.sections);
  return (
    <div className="space-y-6">
      {clock && (
        <div className="sticky top-2 z-20 flex items-center gap-3 rounded-panel bg-surface/95 px-3 py-2 backdrop-blur max-sm:gap-1.5">
          <span
            role="timer"
            aria-label="Time left"
            className={cx(
              "text-lg font-semibold tabular-nums",
              timeUp ? "text-warning" : remaining < 5 * 60_000 ? "text-warning" : "text-text",
            )}
          >
            {formatClock(remaining)}
          </span>
          {stage === "write" && !timeUp && (
            <Button
              size="sm"
              variant="ghost"
              icon={timer.running ? Pause : Play}
              onClick={() => {
                timer.toggle();
                setDesignElapsed(attempt.id, timer.elapsedMs);
              }}
            >
              {timer.running ? "Pause" : timer.elapsedMs > 0 ? "Resume" : "Start the timer"}
            </Button>
          )}
          <ProgressBar
            value={remaining / LIMIT_MS}
            label="Time left for the design"
            className="h-1 min-w-24 flex-1 max-sm:hidden"
          />
          <span className="text-sm text-muted tabular-nums max-sm:hidden">{words} words</span>
          {stage === "write" && !hideReview && (
            <Button
              size="sm"
              variant="primary"
              icon={CheckCircle2}
              onClick={() => {
                timer.pause();
                setDesignElapsed(attempt.id, timer.elapsedMs);
                setStage("review");
              }}
              disabled={words === 0}
              className="max-sm:ml-auto"
            >
              Finish and review
            </Button>
          )}
        </div>
      )}
      {clock && timeUp && stage === "write" && (
        <p role="status" className="rounded-control bg-warning-soft px-3 py-2 text-base text-text">
          45 minutes are up. Wrap up the section you're on, then finish and review.
        </p>
      )}

      {stage === "write" || hideReview ? (
        <div className="space-y-6">
          {sections.map((s) =>
            s.editor === "code" ? (
              <CodeSection
                key={s.key}
                attempt={attempt}
                label={s.label}
                hint={s.hint}
                onBegin={begin}
              />
            ) : s.editor === "sketch" ? (
              <SketchEditor
                key={s.key}
                label={s.label}
                hint={s.hint}
                value={attempt.sections.sketch ?? ""}
                onSave={(v) => {
                  begin();
                  updateSection(attempt.id, "sketch", v);
                }}
              />
            ) : (
              <AutoField
                key={s.key}
                label={s.label}
                hint={s.hint}
                multiline
                rows={s.rows ?? 4}
                value={attempt.sections[s.key] ?? ""}
                onSave={(v) => {
                  begin();
                  updateSection(attempt.id, s.key, v);
                }}
              />
            ),
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Button size="sm" variant="ghost" onClick={() => setStage("write")}>
            Back to the design
          </Button>
          <DesignReviewPanel
            problem={problem}
            attempt={attempt}
            onSave={onSaved}
            saveLabel={saveLabel}
          />
        </div>
      )}
    </div>
  );
}
