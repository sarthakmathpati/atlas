// Pattern drill (F10): short original prompts (or the owner's solved problems), two minutes each,
// pick the pattern (or two) and optionally write the approach, then reveal. A picked answer is
// correct; one from the same topic is partial. Each answer records a drill check on the correct
// pattern. With Claude, the typed approach is graded (quick tier) and new prompts can be written
// for the weakest patterns (validated against the 90 patterns and kept in the bank). The side
// panel shows accuracy per pattern and the pairs most often confused (11.6).
import {
  CheckCircle2,
  CircleDot,
  CircleX,
  Dumbbell,
  Sparkles,
  Timer as TimerIcon,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { conceptHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button, IconButton } from "@/components/ui/Button";
import { CardLabel } from "@/components/ui/Card";
import { DifficultyChip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Switch, Textarea } from "@/components/ui/Field";
import { LineDrawing } from "@/components/ui/LineDrawing";
import { EmptyState, Kbd } from "@/components/ui/Misc";
import { MOD_KEY } from "@/components/ui/platform";
import { MultiCombobox, type ComboOption } from "@/components/ui/MultiCombobox";
import { ProgressBar } from "@/components/ui/Progress";
import { HorizonLine } from "@/components/ui/Horizon";
import { TimeDisc } from "@/features/adhd/TimeDisc";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatClock, useTimer } from "@/components/ui/timer";
import { DRILL_PROMPTS } from "@/data/drills.seed";
import { conceptById, patternConcepts, topicById } from "@/data/syllabus";
import { drillGeneratePrompt, drillGradePrompt } from "@/lib/ai/prompts";
import type { DrillGeneration, DrillGrade } from "@/lib/ai/schemas";
import {
  confusionPairs,
  DRILL_SCORE,
  DRILL_SECONDS,
  hashSeed,
  judge,
  patternAccuracy,
  pickSession,
  solvedProblemPrompts,
  validGeneratedPrompts,
  weakestPatterns,
  type DrillDetail,
  type DrillItem,
  type DrillResult,
} from "@/lib/drill/drill";
import { problemInfo } from "@/lib/problems/catalog";
import { addDaysToDate, localDate } from "@/lib/time";
import type { Check } from "@/lib/types";
import { recordChecks, useConceptStateStore } from "@/stores/conceptStateStore";
import {
  addGeneratedDrills,
  deleteGeneratedDrill,
  finishDrillSession,
  noteDrillAnswer,
  restoreGeneratedDrill,
  useDrillStore,
} from "@/stores/drillStore";
import { useProblemStore } from "@/stores/problemStore";
import { toast } from "@/stores/toastStore";
import { promptEnv } from "../ai/gather";
import { AIRunView, ClaudeTag } from "../ai/parts";
import { useAIRequest } from "../ai/useAI";
import { usePageFocusLine } from "@/features/focus/hooks";

type Source = "bank" | "solved";

const LENGTHS = [3, 5, 8, 10] as const;

const RESULT_COPY: Record<DrillResult, { label: string; icon: typeof CheckCircle2; tone: string }> =
  {
    correct: { label: "Correct", icon: CheckCircle2, tone: "text-success" },
    partial: { label: "Close: same topic", icon: CircleDot, tone: "text-warning" },
    wrong: { label: "Not this time", icon: CircleX, tone: "text-danger" },
  };

const name = (id: string) => conceptById.get(id)?.name ?? id;
const topicOf = (id: string) => conceptById.get(id)?.topicId;

const PATTERN_OPTIONS: ComboOption[] = patternConcepts.map((c) => ({
  value: c.id,
  label: c.name,
  detail: topicById.get(c.topicId)?.name,
  keywords: c.scope,
}));

const EMPTY_CHECKS: Check[] = [];

function useDrillChecks(): Check[] {
  const checks = useConceptStateStore((s) => s.checks);
  return useMemo(() => {
    const list = Object.values(checks)
      .flat()
      .filter((c) => c.kind === "drill");
    return list.length ? list : EMPTY_CHECKS;
  }, [checks]);
}

// ----- one prompt -------------------------------------------------------------------------------

interface Answer {
  item: DrillItem;
  picked: string[];
  approach: string;
  result: DrillResult;
  grade?: DrillGrade;
}

function PromptCard({
  item,
  index,
  total,
  onAnswered,
  onNext,
  last,
}: {
  item: DrillItem;
  index: number;
  total: number;
  onAnswered: (answer: Answer) => void;
  onNext: () => void;
  last: boolean;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [approach, setApproach] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const timer = useTimer({ countdownMs: DRILL_SECONDS * 1000, onFinish: () => setTimeUp(true) });
  const grader = useAIRequest<DrillGrade>();
  const [started, setStarted] = useState(false);
  if (!started) {
    setStarted(true);
    timer.start();
  }

  const reveal = () => {
    timer.pause();
    const result = judge(picked, item.answerConceptIds, topicOf);
    const main = item.answerConceptIds[0]!;
    const detail: DrillDetail = {
      promptId: item.id,
      correctConceptIds: item.answerConceptIds,
      pickedConceptIds: picked,
      correct: result === "correct",
      result,
      source: item.source,
    };
    if (approach.trim()) detail.approach = approach.trim();
    recordChecks([{ conceptId: main, kind: "drill", score: DRILL_SCORE[result], detail }]);
    noteDrillAnswer();
    const a: Answer = { item, picked, approach: approach.trim(), result };
    setAnswer(a);
    onAnswered(a);
  };

  const grade = () =>
    void grader.start(
      () => ({
        spec: drillGradePrompt(promptEnv(), {
          prompt: item.text,
          correct: item.answerConceptIds.map(name),
          picked: picked.map(name),
          approach,
          keyInsight: item.keyInsight,
        }),
      }),
      {
        title: "Feedback on your approach",
        onDone: (result) => {
          if (!result.data || !answer) return;
          const graded = { ...answer, grade: result.data };
          setAnswer(graded);
          onAnswered(graded);
        },
      },
    );

  // Keyboard: Ctrl or Cmd + Enter reveals; after the reveal, Enter goes on (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.defaultPrevented) return;
      if (document.querySelector("dialog[open]")) return;
      const typing =
        e.target instanceof HTMLElement && e.target.closest("input, textarea, [role=combobox]");
      if (!answer && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        reveal();
      } else if (answer && !typing && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const remaining = timer.remainingMs ?? 0;
  const copy = answer ? RESULT_COPY[answer.result] : null;
  return (
    <section aria-label={`Prompt ${index + 1} of ${total}`} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted">
          Prompt {index + 1} of {total}
        </span>
        <DifficultyChip difficulty={item.difficulty} />
        {item.source === "solved" && (
          <span className="text-sm text-muted">From your solved problems</span>
        )}
        {item.id.startsWith("gen-") && <ClaudeTag label="Written by Claude" />}
        <span className="ml-auto flex items-center gap-2">
          <TimeDisc
            elapsedMs={DRILL_SECONDS * 1000 - remaining}
            totalMs={DRILL_SECONDS * 1000}
            running={timer.running}
            label="Time for this prompt"
            cueKey={`drill:${item.id}`}
            size="sm"
            showText={false}
          />
          <span
            role="timer"
            aria-label="Time left"
            className={cx(
              "flex items-center gap-1.5 font-display text-xl font-semibold tabular-nums",
              timeUp ? "text-warning" : "text-text",
            )}
          >
            <TimerIcon size={16} aria-hidden="true" />
            {formatClock(remaining)}
          </span>
        </span>
      </div>
      {/* The round's horizon line (F31): 5-second steps, dotted in the last quarter. */}
      <HorizonLine
        elapsedMs={DRILL_SECONDS * 1000 - remaining}
        totalMs={DRILL_SECONDS * 1000}
        label="Time left for this prompt"
      />
      {/* The prompt is a card that turns over to show the pattern and the key insight. */}
      <div
        key={answer ? "back" : "front"}
        className={cx(
          "flex min-h-44 flex-col justify-center rounded-focal bg-surface-raised px-5 py-6 shadow-focal sm:px-8 sm:py-8",
          answer && "flashcard-turn",
        )}
      >
        {!answer ? (
          <>
            <CardLabel className="mb-2">The problem</CardLabel>
            <p className="max-w-[64ch] text-xl leading-relaxed text-text">{item.text}</p>
          </>
        ) : (
          <div className="space-y-3">
            <p className="max-w-[64ch] text-base leading-relaxed text-muted">{item.text}</p>
            {copy && (
              <p
                className={cx("flex items-center gap-2 text-md font-semibold", copy.tone)}
                role="status"
              >
                <copy.icon size={18} aria-hidden="true" />
                {copy.label}
              </p>
            )}
            <p className="text-lg text-text">
              The pattern:{" "}
              {item.answerConceptIds.map((id, i) => (
                <span key={id}>
                  {i > 0 && " or "}
                  <a href={conceptHref(id)} className="font-semibold text-accent hover:underline">
                    {name(id)}
                  </a>
                </span>
              ))}
              {answer.picked.length > 0 && answer.result !== "correct" && (
                <span className="text-base text-muted">
                  {" "}
                  (you picked {answer.picked.map(name).join(" and ")})
                </span>
              )}
            </p>
            <div className="rounded-control bg-surface-sunken px-3 py-2">
              <p className="text-sm font-medium text-muted">Key insight</p>
              <p className="text-base text-text">{item.keyInsight}</p>
            </div>
          </div>
        )}
      </div>

      {!answer ? (
        <div className="space-y-3">
          <MultiCombobox
            label="Which pattern solves it?"
            options={PATTERN_OPTIONS}
            value={picked}
            onChange={setPicked}
            max={2}
            placeholder="Search patterns, such as sliding window"
          />
          <div className="space-y-1.5">
            <label htmlFor={`approach-${item.id}`} className="text-sm font-medium text-text">
              Your approach <span className="font-normal text-muted">(optional)</span>
            </label>
            <Textarea
              id={`approach-${item.id}`}
              rows={2}
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
              placeholder="One or two lines: how you'd use it."
            />
          </div>
          {timeUp && (
            <p className="text-sm text-warning" role="status">
              Time's up. Pick your best guess and reveal.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            <span className="text-sm text-muted max-md:hidden">
              <Kbd>{MOD_KEY}</Kbd> <Kbd>Enter</Kbd> to reveal
            </span>
            <Button variant="primary" onClick={reveal}>
              {picked.length ? "Reveal the answer" : "I don't know: reveal it"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {answer.approach && (
            <div className="space-y-2">
              <p className="text-sm text-muted">
                Your approach: <span className="text-text">{answer.approach}</span>
              </p>
              {answer.grade ? (
                <div className="rounded-control bg-surface-sunken px-3 py-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-text">
                    Approach {Math.round(answer.grade.approachScore * 100)}% <ClaudeTag />
                  </p>
                  <p className="mt-1 text-base text-text">{answer.grade.feedback}</p>
                </div>
              ) : (
                grader.state.phase === "idle" && (
                  <Button size="sm" icon={Sparkles} onClick={grade}>
                    Grade my approach with Claude
                  </Button>
                )
              )}
              {!answer.grade && (
                <AIRunView
                  request={grader}
                  showStream={false}
                  thinkingLabel="Reading your approach…"
                />
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            <span className="text-sm text-muted max-md:hidden">
              <Kbd>Enter</Kbd> to go on
            </span>
            <Button variant="primary" onClick={onNext}>
              {last ? "See my results" : "Next prompt"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

// ----- a session -------------------------------------------------------------------------------

function Session({ items, onEnd }: { items: DrillItem[]; onEnd: () => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const done = index >= items.length;
  const answered = Object.keys(answers).length;
  const finished = useRef(false);
  useEffect(() => {
    if (!done || answered === 0 || finished.current) return;
    finished.current = true;
    finishDrillSession();
  }, [done, answered]);

  if (done) {
    const list = items.map((_, i) => answers[i]).filter((a): a is Answer => Boolean(a));
    const correct = list.filter((a) => a.result === "correct").length;
    const partial = list.filter((a) => a.result === "partial").length;
    return (
      <section className="space-y-4 rounded-panel bg-surface p-4 sm:p-6" aria-label="Results">
        <div className="flex flex-col items-center text-center">
          <LineDrawing name="flag" size={64} />
          <p
            className="mt-2 font-display text-2xl font-semibold text-text tabular-nums"
            role="status"
          >
            {correct} of {list.length} correct
            {partial > 0 && (
              <span className="text-base font-normal text-muted"> and {partial} close</span>
            )}
          </p>
          <p className="mt-1 text-base text-muted">
            {list.length} {list.length === 1 ? "drill check" : "drill checks"} recorded on{" "}
            {new Set(list.map((a) => a.item.answerConceptIds[0])).size}{" "}
            {new Set(list.map((a) => a.item.answerConceptIds[0])).size === 1
              ? "pattern"
              : "patterns"}
            .
          </p>
        </div>
        <ul className="divide-y divide-rule rounded-control bg-surface-sunken">
          {list.map((a, i) => {
            const c = RESULT_COPY[a.result];
            return (
              <li key={i} className="flex gap-3 px-3 py-2.5">
                <c.icon size={18} aria-hidden="true" className={cx("mt-0.5 shrink-0", c.tone)} />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-base text-text">{a.item.text}</p>
                  <p className="text-sm text-muted">
                    {a.item.answerConceptIds.map(name).join(" or ")}
                    {a.grade && ` · approach ${Math.round(a.grade.approachScore * 100)}%`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted">
          Each answer counts as a drill check on its pattern. Fully correct answers also move the
          pattern's review when it is due.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="primary" onClick={onEnd}>
            Done
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <PromptCard
        key={items[index]!.id}
        item={items[index]!}
        index={index}
        total={items.length}
        last={index === items.length - 1}
        onAnswered={(a) => setAnswers((m) => ({ ...m, [index]: a }))}
        onNext={() => setIndex((i) => i + 1)}
      />
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setIndex(items.length)}>
          End the session
        </Button>
      </div>
    </div>
  );
}

// ----- side panel: stats and generated prompts ----------------------------------------------------

function Stats({ checks }: { checks: Check[] }) {
  const today = localDate();
  const accuracy = useMemo(() => patternAccuracy(checks, today), [checks, today]);
  const pairs = useMemo(() => confusionPairs(checks, today), [checks, today]);
  const [all, setAll] = useState(false);
  const shown = all ? accuracy : accuracy.slice(0, 8);
  return (
    <section aria-labelledby="drill-stats" className="rounded-panel bg-surface">
      <h2
        id="drill-stats"
        className="border-b border-rule px-4 py-3 text-md font-semibold text-text"
      >
        Accuracy by pattern
      </h2>
      {accuracy.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted">
          Your accuracy per pattern over the last 60 days appears here after your first session.
        </p>
      ) : (
        <>
          <ul className="space-y-2 px-4 py-3">
            {shown.map((a) => (
              <li key={a.conceptId} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <a href={conceptHref(a.conceptId)} className="truncate text-text hover:underline">
                    {name(a.conceptId)}
                  </a>
                  <span className="shrink-0 text-muted tabular-nums">
                    {a.correct} of {a.total}
                  </span>
                </div>
                <ProgressBar
                  value={a.accuracy}
                  label={`${name(a.conceptId)} accuracy`}
                  className="h-1.5"
                />
              </li>
            ))}
          </ul>
          {accuracy.length > 8 && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="mx-4 mb-3 text-sm text-accent hover:underline"
            >
              {all ? "Show fewer" : `Show all ${accuracy.length}`}
            </button>
          )}
        </>
      )}
      <h3 className="border-t border-rule px-4 pt-3 text-base font-semibold text-text">
        Patterns you mix up
      </h3>
      {pairs.length === 0 ? (
        <p className="px-4 pt-1 pb-3 text-sm text-muted">
          When you pick the same wrong pattern for another one twice, the pair shows here.
        </p>
      ) : (
        <ul className="space-y-1.5 px-4 pt-1 pb-3">
          {pairs.map((p) => (
            <li key={`${p.picked}>${p.correct}`} className="text-sm text-text">
              You picked <span className="font-medium">{name(p.picked)}</span> when it was{" "}
              <span className="font-medium">{name(p.correct)}</span>{" "}
              <span className="text-muted">({p.count} times)</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Generate({ checks }: { checks: Check[] }) {
  const generated = useDrillStore((s) => s.generated);
  const request = useAIRequest<DrillGeneration>();
  const list = Object.values(generated).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const today = localDate();
  const focus = useMemo(
    () =>
      weakestPatterns(
        patternAccuracy(checks, today),
        patternConcepts.map((c) => c.id),
      ),
    [checks, today],
  );
  const patternIds = useMemo(() => new Set(patternConcepts.map((c) => c.id)), []);

  const write = () =>
    void request.start(
      () => ({
        spec: drillGeneratePrompt(promptEnv(), {
          patterns: patternConcepts.map((c) => ({ id: c.id, name: c.name })),
          focus: focus.map(name),
        }),
      }),
      {
        title: "New drill prompts for your weakest patterns",
        noCache: true,
        onDone: (result) => {
          const valid = validGeneratedPrompts(result.data ?? [], patternIds);
          const dropped = (result.data?.length ?? 0) - valid.length;
          if (valid.length === 0) {
            toast("Claude's prompts couldn't be used (unknown patterns). Try again.", {
              tone: "error",
            });
            return;
          }
          const added = addGeneratedDrills(valid);
          request.reset();
          toast(
            `${added.length} new ${added.length === 1 ? "prompt" : "prompts"} added to your bank${dropped ? ` (${dropped} left out: unknown patterns)` : ""}.`,
            {
              action: {
                label: "Undo",
                onClick: () => added.forEach((d) => deleteGeneratedDrill(d.id)),
              },
            },
          );
        },
      },
    );

  return (
    <section aria-labelledby="drill-generate" className="rounded-panel bg-surface">
      <h2
        id="drill-generate"
        className="flex items-center gap-2 border-b border-rule px-4 py-3 text-md font-semibold text-text"
      >
        New prompts from Claude
      </h2>
      <div className="space-y-3 px-4 py-3">
        <p className="text-sm text-muted">
          Claude writes 5 original prompts for{" "}
          {focus.length ? focus.map(name).join(", ") : "your weakest patterns"}, checked against the
          90 patterns before they join your bank.
        </p>
        {request.state.phase === "idle" && (
          <Button size="sm" icon={Sparkles} onClick={write}>
            Write 5 new prompts
          </Button>
        )}
        <AIRunView request={request} showStream={false} thinkingLabel="Writing new prompts…" />
        {list.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm text-accent">
              Your {list.length} prompts from Claude
            </summary>
            <ul className="mt-2 divide-y divide-rule rounded-control border border-rule">
              {list.map((d) => (
                <li key={d.id} className="flex items-start gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-3 text-sm text-text">{d.text}</p>
                    <p className="text-xs text-muted">
                      {d.answerConceptIds.map(name).join(" or ")}
                    </p>
                  </div>
                  <IconButton
                    size="sm"
                    icon={Trash2}
                    label="Remove this prompt"
                    onClick={() => {
                      const removed = deleteGeneratedDrill(d.id);
                      if (removed)
                        toast("Prompt removed.", {
                          action: { label: "Undo", onClick: () => restoreGeneratedDrill(removed) },
                        });
                    }}
                  />
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}

// ----- the page --------------------------------------------------------------------------------------

export default function DrillPage() {
  const route = useRoute();
  const onlyPattern = route.query.get("pattern");
  const focusPattern = onlyPattern && conceptById.get(onlyPattern)?.isPattern ? onlyPattern : null;
  const checks = useDrillChecks();
  const generated = useDrillStore((s) => s.generated);
  const states = useProblemStore((s) => s.states);
  const [source, setSource] = useState<Source>("bank");
  const [length, setLength] = useState<(typeof LENGTHS)[number]>(5);
  const [focusWeak, setFocusWeak] = useState(false);
  const [session, setSession] = useState<DrillItem[] | null>(null);
  const [runs, setRuns] = useState(0);
  usePageFocusLine("Finish a pattern drill");

  const bank = useMemo<DrillItem[]>(
    () => [
      ...DRILL_PROMPTS.map((p) => ({ ...p, source: "bank" as const })),
      ...Object.values(generated).map((g) => ({ ...g, source: "bank" as const })),
    ],
    [generated],
  );
  const solved = useMemo(
    () =>
      solvedProblemPrompts(states, (id, s) => {
        const info = problemInfo(id, s);
        return info
          ? {
              title: info.title,
              conceptIds: info.conceptIds.filter((c) => conceptById.get(c)?.isPattern),
              difficulty: info.difficulty,
            }
          : undefined;
      }),
    [states],
  );

  const start = () => {
    const today = localDate();
    const since = addDaysToDate(today, -13);
    const recent = new Set(
      checks
        .filter((c) => localDate(new Date(c.createdAt)) >= since)
        .map((c) => (c.detail as DrillDetail | undefined)?.promptId)
        .filter((id): id is string => Boolean(id)),
    );
    const accuracy = new Map(patternAccuracy(checks, today).map((a) => [a.conceptId, a.accuracy]));
    const pool = source === "bank" ? bank : solved;
    setSession(
      pickSession(
        focusPattern ? pool.filter((p) => p.answerConceptIds.includes(focusPattern)) : pool,
        {
          count: length,
          recent,
          accuracy,
          focusWeak,
          seed: hashSeed(`${today}|${runs}|${source}`),
        },
      ),
    );
    setRuns((n) => n + 1);
  };

  const solvedReady = solved.length >= 3;
  return (
    <PageFrame>
      <PageHeader
        title="Pattern drill"
        description="Recognizing the pattern is most of the battle. Read a short problem, name the technique within two minutes, then check."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="min-w-0">
          {session ? (
            <Session key={runs} items={session} onEnd={() => setSession(null)} />
          ) : (
            <section
              aria-labelledby="drill-setup"
              className="space-y-5 rounded-panel bg-surface p-4 sm:p-5"
            >
              <h2
                id="drill-setup"
                className="flex items-center gap-2 text-md font-semibold text-text"
              >
                <Dumbbell size={18} aria-hidden="true" className="text-accent" />
                Start a session
              </h2>
              {focusPattern && (
                <p className="flex flex-wrap items-center gap-2 text-base text-text">
                  Only prompts for <span className="font-medium">{name(focusPattern)}</span>.
                  <a href="#/drill" className="text-sm text-accent hover:underline">
                    Drill every pattern
                  </a>
                </p>
              )}
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-text">Prompts</span>
                <SegmentedControl<Source>
                  label="Where the prompts come from"
                  value={source}
                  onChange={setSource}
                  options={[
                    { value: "bank", label: "Fresh prompts" },
                    { value: "solved", label: "My solved problems" },
                  ]}
                />
                <p className="text-sm text-muted">
                  {source === "bank"
                    ? `${bank.length} original prompts in everyday settings${Object.keys(generated).length ? `, ${Object.keys(generated).length} of them written by Claude` : ""}.`
                    : solvedReady
                      ? `${solved.length} problems you solved: recall the pattern from the title and your own summary.`
                      : "Solve at least 3 problems with patterns to drill from your own list."}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-text">Length</span>
                <SegmentedControl<string>
                  label="Number of prompts"
                  value={String(length)}
                  onChange={(v) => setLength(Number(v) as (typeof LENGTHS)[number])}
                  options={LENGTHS.map((n) => ({ value: String(n), label: `${n} prompts` }))}
                />
              </div>
              <Switch
                label="Focus on weak patterns"
                description="Patterns you get wrong most often come first."
                checked={focusWeak}
                onChange={setFocusWeak}
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  icon={Dumbbell}
                  disabled={source === "solved" && !solvedReady}
                  onClick={start}
                >
                  Start drill
                </Button>
              </div>
            </section>
          )}
          {!session && checks.length === 0 && (
            <EmptyState icon={Dumbbell} title="How it works" compact className="mt-6">
              Each prompt is a short, original problem. Pick the pattern that solves it (or two),
              write a line on how if you like, and reveal. You'll see the key insight, and your
              accuracy per pattern builds up on the right.
            </EmptyState>
          )}
        </div>
        <aside className="space-y-6" aria-label="Drill progress">
          <Stats checks={checks} />
          <Generate checks={checks} />
        </aside>
      </div>
    </PageFrame>
  );
}
