// Mental math (F28): timed sprints generated locally, fully offline. Pick a mode and a tier, then
// type answers and press Enter (Tab skips). Feedback is instant and the next question is already
// there. A finished sprint is saved as a MentalMathRun, records a check on the mode's concepts and
// ticks off today's mental math item; the side panel charts score and speed over time.
import {
  Calculator,
  CheckCircle2,
  CircleX,
  Play,
  SkipForward,
  Timer as TimerIcon,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { conceptHref, navigate, routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { prefersReducedMotion, useLatest } from "@/components/ui/hooks";
import { Kbd, Skeleton } from "@/components/ui/Misc";
import { HorizonLine } from "@/components/ui/Horizon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatClock, useTimer } from "@/components/ui/timer";
import { conceptById } from "@/data/syllabus";
import {
  answerLine,
  SPRINT_MODE_ORDER,
  SPRINT_MODES,
  SPRINT_TIERS,
  generateSprint,
  gradeSprintAnswer,
  sprintCheckScore,
  summarizeSprint,
  type SprintAnswer,
  type SprintMode,
  type SprintQuestion,
  type SprintSummary,
  type SprintTier,
} from "@/lib/quant/mentalMath";
import { relativeDate } from "@/lib/problems/progress";
import { hashSeed } from "@/lib/random";
import { localDate } from "@/lib/time";
import type { MentalMathRun } from "@/lib/types";
import { runsOf, saveSprint, useMentalMathStore } from "@/stores/mentalMathStore";
import { usePageFocusLine } from "@/features/focus/hooks";

const HistoryCharts = lazy(() => import("./HistoryCharts"));

const TIER_ORDER: SprintTier[] = ["easy", "medium", "hard"];

function isMode(v: string | null): v is SprintMode {
  return v !== null && (SPRINT_MODE_ORDER as readonly string[]).includes(v);
}
function isTier(v: string | null): v is SprintTier {
  return v !== null && (TIER_ORDER as readonly string[]).includes(v);
}

const conceptName = (id: string) => conceptById.get(id)?.name ?? id;

// ----- the sprint --------------------------------------------------------------------------------

interface SprintResult {
  mode: SprintMode;
  tier: SprintTier;
  questions: SprintQuestion[];
  answers: SprintAnswer[];
  seconds: number;
  summary: SprintSummary;
  run: MentalMathRun | null;
}

type Flash = { tone: "good" | "bad" | "skip"; n: number } | null;

function Sprint({
  mode,
  tier,
  seed,
  onFinish,
  onQuit,
}: {
  mode: SprintMode;
  tier: SprintTier;
  seed: number;
  onFinish: (result: SprintResult) => void;
  onQuit: () => void;
}) {
  const info = SPRINT_MODES[mode];
  const questions = useMemo(() => generateSprint(mode, tier, seed), [mode, tier, seed]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<SprintAnswer[]>([]);
  const [flash, setFlash] = useState<Flash>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const shownAt = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  const finish = (list: SprintAnswer[], seconds: number) => {
    if (done.current) return;
    done.current = true;
    const summary = summarizeSprint(list, info.count, seconds);
    const run =
      list.length > 0
        ? saveSprint({
            mode,
            tier,
            correct: summary.correct,
            answered: summary.answered,
            seconds,
          })
        : null;
    onFinish({ mode, tier, questions, answers: list, seconds, summary, run });
  };

  const answersRef = useLatest(answers);
  const timer = useTimer({
    countdownMs: info.seconds * 1000,
    onFinish: () => finish(answersRef.current, info.seconds),
  });

  const [started, setStarted] = useState(false);
  if (!started) {
    setStarted(true);
    timer.start();
  }
  useEffect(() => {
    shownAt.current = performance.now();
    inputRef.current?.focus();
  }, []);

  // Instant feedback: the answer box glows green or red for a moment (no motion when reduced).
  useEffect(() => {
    const el = inputRef.current;
    if (!flash || flash.tone === "skip" || !el || prefersReducedMotion() || !el.animate) return;
    const color = getComputedStyle(el)
      .getPropertyValue(flash.tone === "good" ? "--success" : "--danger")
      .trim();
    if (!color) return;
    el.animate([{ boxShadow: `0 0 0 3px ${color}` }, { boxShadow: "0 0 0 0 transparent" }], {
      duration: 400,
      easing: "ease-out",
    });
  }, [flash]);

  const q = questions[index];

  const record = (entry: Omit<SprintAnswer, "index" | "ms">) => {
    if (!q || done.current) return;
    const now = performance.now();
    const ms = Math.round(now - (shownAt.current ?? now));
    const next = [...answers, { ...entry, index: q.index, ms }];
    shownAt.current = now;
    setAnswers(next);
    setInput("");
    setHint(null);
    setFlash({
      tone: entry.verdict === "correct" ? "good" : entry.verdict === "incorrect" ? "bad" : "skip",
      n: next.length,
    });
    if (index + 1 >= questions.length) finish(next, Math.min(info.seconds, timer.elapsedMs / 1000));
    else setIndex(index + 1);
  };

  const submit = () => {
    if (!q) return;
    if (!input.trim()) {
      setHint("Type an answer, or press Tab to skip.");
      return;
    }
    const verdict = gradeSprintAnswer(q, input);
    if (verdict === "unreadable") {
      setHint(
        q.fraction
          ? "Type a number, such as 12, 0.375, 37.5% or 5/12."
          : "Type a number, such as 282, 14,123 or 0.5.",
      );
      return;
    }
    record({ given: input.trim(), verdict });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      record({ given: "", verdict: "skipped" });
    }
  };

  const last = answers[answers.length - 1];
  const lastQ = last ? questions[last.index] : undefined;
  const correct = answers.filter((a) => a.verdict === "correct").length;
  const remaining = timer.remainingMs ?? 0;

  return (
    <section
      aria-label={`${info.label} sprint`}
      className="space-y-5 rounded-panel bg-surface p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm font-medium text-muted">
          {info.label}, {SPRINT_TIERS[tier].label.toLowerCase()}
        </span>
        <span className="text-sm text-muted tabular-nums">
          Question {Math.min(index + 1, questions.length)} of {questions.length}
        </span>
        <span className="text-sm text-muted tabular-nums">{correct} correct</span>
        <span
          role="timer"
          aria-label="Time left"
          className={cx(
            "ml-auto flex items-center gap-1.5 text-lg font-semibold tabular-nums",
            remaining < 30_000 ? "text-warning" : "text-text",
          )}
        >
          <TimerIcon size={18} aria-hidden="true" />
          {formatClock(remaining)}
        </span>
      </div>
      {/* The round's horizon line (F31): 5-second steps, dotted near the end. */}
      <HorizonLine
        elapsedMs={info.seconds * 1000 - remaining}
        totalMs={info.seconds * 1000}
        label="Time left in the sprint"
      />

      <div className="py-2 sm:py-6">
        <p
          className="text-center text-3xl font-semibold text-text tabular-nums max-sm:text-2xl"
          aria-live="off"
          id="mm-question"
        >
          {q?.prompt}
        </p>
        <div className="mx-auto mt-5 max-w-xs">
          <label htmlFor="mm-answer" className="sr-only">
            Your answer to {q?.prompt}
          </label>
          <input
            ref={inputRef}
            id="mm-answer"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (hint) setHint(null);
            }}
            onKeyDown={onKeyDown}
            inputMode={info.inputMode}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby="mm-help"
            placeholder="Your answer"
            className={cx(
              "h-14 w-full rounded-control border border-rule-strong bg-canvas px-4 text-center text-2xl text-text tabular-nums outline-none focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent",
            )}
          />
          <p id="mm-help" className="mt-2 text-center text-sm text-muted">
            {hint ?? (
              <>
                <Kbd>Enter</Kbd> to answer, <Kbd>Tab</Kbd> to skip
              </>
            )}
          </p>
        </div>
      </div>

      <div aria-live="polite" className="min-h-7 text-center text-base">
        {last && lastQ && (
          <p
            className={cx(
              "inline-flex items-center gap-2",
              last.verdict === "correct"
                ? "text-success"
                : last.verdict === "incorrect"
                  ? "text-danger"
                  : "text-muted",
            )}
          >
            {last.verdict === "correct" ? (
              <CheckCircle2 size={16} aria-hidden="true" />
            ) : last.verdict === "incorrect" ? (
              <CircleX size={16} aria-hidden="true" />
            ) : (
              <SkipForward size={16} aria-hidden="true" />
            )}
            <span className="tabular-nums">
              {last.verdict === "correct"
                ? "Right: "
                : last.verdict === "incorrect"
                  ? "Not quite: "
                  : "Skipped: "}
              {answerLine(lastQ)}
              {last.verdict === "incorrect" && (
                <span className="text-muted"> (you typed {last.given})</span>
              )}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-4">
        {confirmQuit ? (
          <div className="flex flex-wrap items-center gap-2" role="alert">
            <span className="text-base text-text">
              End now? A sprint is saved only when the time runs out or every question is answered.
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setConfirmQuit(false);
                inputRef.current?.focus();
              }}
            >
              Keep going
            </Button>
            <Button size="sm" onClick={onQuit}>
              End without saving
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmQuit(true)}>
            End early
          </Button>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            icon={SkipForward}
            onClick={() => {
              record({ given: "", verdict: "skipped" });
              inputRef.current?.focus();
            }}
          >
            Skip
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              submit();
              inputRef.current?.focus();
            }}
          >
            Answer
          </Button>
        </div>
      </div>
    </section>
  );
}

// ----- results -----------------------------------------------------------------------------------

function Results({
  result,
  onAgain,
  onDone,
}: {
  result: SprintResult;
  onAgain: () => void;
  onDone: () => void;
}) {
  const { summary, mode, tier, questions, answers } = result;
  const info = SPRINT_MODES[mode];
  const misses = answers.filter((a) => a.verdict !== "correct");
  const unanswered = questions.length - answers.length;
  const score = sprintCheckScore(summary.correct, summary.total, tier);
  const againRef = useRef<HTMLButtonElement>(null);
  useEffect(() => againRef.current?.focus(), []);
  return (
    <section aria-label="Sprint results" className="space-y-5 rounded-panel bg-surface p-4 sm:p-6">
      <div>
        <p className="text-2xl font-semibold text-text tabular-nums" role="status">
          {summary.correct} of {summary.total} correct
        </p>
        <p className="mt-1 text-base text-muted">
          {info.label}, {SPRINT_TIERS[tier].label.toLowerCase()}.{" "}
          {unanswered > 0 ? `Time ran out with ${unanswered} left.` : "Every question answered."}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Score", `${Math.round(summary.score * 100)}%`],
          ["Accuracy", summary.answered ? `${Math.round(summary.accuracy * 100)}%` : "–"],
          [
            "Speed",
            summary.secondsPerAnswer === null
              ? "–"
              : `${summary.secondsPerAnswer.toFixed(1)} s each`,
          ],
          ["Time", formatClock(result.seconds * 1000)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-control border border-rule px-3 py-2">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-lg font-semibold text-text tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {result.run ? (
        <p className="text-base text-muted">
          Saved. It counts as a check of {Math.round(score * 100)}% on{" "}
          {info.conceptIds.map((id, i) => (
            <span key={id}>
              {i > 0 && " and "}
              <a href={conceptHref(id)} className="text-accent hover:underline">
                {conceptName(id)}
              </a>
            </span>
          ))}
          {tier === "easy" ? " (easy sprints count at 80%)." : "."}
        </p>
      ) : (
        <p className="text-base text-muted">Nothing was answered, so this sprint wasn't saved.</p>
      )}
      {misses.length > 0 && (
        <details className="group" open={misses.length <= 12}>
          <summary className="cursor-pointer text-base font-medium text-text">
            To look at again ({misses.length})
          </summary>
          <ul className="mt-2 divide-y divide-rule rounded-control border border-rule">
            {misses.map((a) => {
              const q = questions[a.index]!;
              return (
                <li
                  key={a.index}
                  className="flex flex-wrap items-baseline gap-x-3 px-3 py-2 text-base"
                >
                  <span className="text-text tabular-nums">{answerLine(q)}</span>
                  <span className="text-sm text-muted">
                    {a.verdict === "skipped" ? "skipped" : `you typed ${a.given}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Choose another sprint
        </Button>
        <Button ref={againRef} variant="primary" icon={Play} onClick={onAgain}>
          Run it again
        </Button>
      </div>
    </section>
  );
}

// ----- history -----------------------------------------------------------------------------------

function History({ mode }: { mode: SprintMode }) {
  const all = useMentalMathStore((s) => s.runs);
  const runs = useMemo(() => runsOf(all, mode), [all, mode]);
  const today = localDate();
  const best = runs.reduce<MentalMathRun | null>(
    (b, r) => (!b || r.correct / r.total > b.correct / b.total ? r : b),
    null,
  );
  const lastFive = runs.slice(-5);
  const avg = lastFive.length
    ? lastFive.reduce((s, r) => s + r.correct / r.total, 0) / lastFive.length
    : 0;
  return (
    <section aria-labelledby="mm-history" className="rounded-panel bg-surface">
      <h2
        id="mm-history"
        className="border-b border-rule px-4 py-3 text-md font-semibold text-text"
      >
        {SPRINT_MODES[mode].label}: your history
      </h2>
      {runs.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted">
          Your score and speed over time appear here after your first sprint in this mode.
        </p>
      ) : (
        <div className="space-y-5 px-4 py-4">
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-muted">Sprints</dt>
              <dd className="text-lg font-semibold text-text tabular-nums">{runs.length}</dd>
            </div>
            <div>
              <dt className="text-muted">Best</dt>
              <dd className="text-lg font-semibold text-text tabular-nums">
                {best ? `${best.correct}/${best.total}` : "–"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Last 5</dt>
              <dd className="text-lg font-semibold text-text tabular-nums">
                {Math.round(avg * 100)}%
              </dd>
            </div>
          </dl>
          {runs.length >= 2 ? (
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <HistoryCharts runs={runs} />
            </Suspense>
          ) : (
            <p className="text-sm text-muted">The charts start with your second sprint.</p>
          )}
          <ul className="space-y-1 text-sm">
            {[...runs]
              .reverse()
              .slice(0, 5)
              .map((r) => (
                <li key={r.id} className="flex justify-between gap-2 text-text">
                  <span className="text-muted">
                    {relativeDate(localDate(new Date(r.createdAt)), today)}
                    {r.tier ? `, ${SPRINT_TIERS[r.tier].label.toLowerCase()}` : ""}
                  </span>
                  <span className="tabular-nums">
                    {r.correct}/{r.total} in {formatClock(r.seconds * 1000)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ----- the page ----------------------------------------------------------------------------------

type Phase =
  { kind: "setup" } | { kind: "running"; seed: number } | { kind: "results"; result: SprintResult };

export default function MentalMathPage() {
  const route = useRoute();
  const qMode = route.query.get("mode");
  const qTier = route.query.get("tier");
  const mode: SprintMode = isMode(qMode) ? qMode : "speed";
  const tier: SprintTier = isTier(qTier) ? qTier : "medium";
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const runs = useRef(0);
  usePageFocusLine("Finish a mental math sprint");

  const setChoice = (next: { mode?: SprintMode; tier?: SprintTier }) =>
    navigate(
      routeHref("/mental-math", undefined, { mode: next.mode ?? mode, tier: next.tier ?? tier }),
      { replace: true },
    );

  const start = () => {
    runs.current += 1;
    setPhase({
      kind: "running",
      seed: hashSeed(`${Date.now()}|${runs.current}|${mode}|${tier}`),
    });
  };

  const info = SPRINT_MODES[mode];
  return (
    <PageFrame>
      <PageHeader
        title="Mental math"
        description="Short timed sprints for quant rounds, generated on your device. Type the answer and press Enter; Tab skips."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="min-w-0">
          {phase.kind === "running" ? (
            <Sprint
              key={phase.seed}
              mode={mode}
              tier={tier}
              seed={phase.seed}
              onFinish={(result) => setPhase({ kind: "results", result })}
              onQuit={() => setPhase({ kind: "setup" })}
            />
          ) : phase.kind === "results" ? (
            <Results
              result={phase.result}
              onAgain={start}
              onDone={() => setPhase({ kind: "setup" })}
            />
          ) : (
            <section
              aria-labelledby="mm-setup"
              className="space-y-5 rounded-panel bg-surface p-4 sm:p-5"
            >
              <h2 id="mm-setup" className="flex items-center gap-2 text-md font-semibold text-text">
                <Calculator size={18} aria-hidden="true" className="text-accent" />
                Start a sprint
              </h2>
              <div role="radiogroup" aria-label="Sprint mode" className="grid gap-2 sm:grid-cols-2">
                {SPRINT_MODE_ORDER.map((m) => {
                  const mi = SPRINT_MODES[m];
                  const checked = m === mode;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() => setChoice({ mode: m })}
                      className={cx(
                        "flex flex-col items-start gap-1 rounded-panel border px-3 py-2.5 text-left transition-colors",
                        checked
                          ? "border-accent bg-accent-soft"
                          : "border-rule bg-surface hover:border-rule-strong hover:bg-surface-sunken",
                      )}
                    >
                      <span className="font-medium text-text">{mi.label}</span>
                      <span className="text-sm text-muted">{mi.description}</span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-text">Difficulty</p>
                <SegmentedControl<SprintTier>
                  label="Difficulty"
                  value={tier}
                  onChange={(t) => setChoice({ tier: t })}
                  options={TIER_ORDER.map((t) => ({ value: t, label: SPRINT_TIERS[t].label }))}
                />
                <p className="text-sm text-muted">{SPRINT_TIERS[tier].description}</p>
              </div>
              <p className="text-sm text-muted">
                A finished sprint counts as a check on{" "}
                {info.conceptIds.map(conceptName).join(" and ")}.
              </p>
              <div className="flex justify-end">
                <Button variant="primary" icon={Play} onClick={start}>
                  Start sprint
                </Button>
              </div>
            </section>
          )}
        </div>
        <aside aria-label="Sprint history">
          <History mode={phase.kind === "results" ? phase.result.mode : mode} />
        </aside>
      </div>
    </PageFrame>
  );
}
