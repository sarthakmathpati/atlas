// Attempts timeline (F7): every attempt with its date, result, minutes, hints, language and mode.
// Open one to read its code, notes, Claude's review and dry runs (or ask for a review now); pick
// two to compare their code side by side.
import { Code2, GitCompareArrows, Sparkles, Trash2 } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip, TagChip } from "@/components/ui/Chip";
import { CodeView } from "@/components/ui/code/CodeView";
import { CODE_LANGUAGE_LABEL, normalizeLanguage } from "@/components/ui/code/languages";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState, Skeleton } from "@/components/ui/Misc";
import { codeReviewPrompt } from "@/lib/ai/prompts";
import type { CodeReview } from "@/lib/ai/schemas";
import { ATTEMPT_CAP, ATTEMPT_WARN } from "@/lib/constants";
import { problemInfo } from "@/lib/problems/catalog";
import { attemptDate, attemptsInOrder, shortDate } from "@/lib/problems/progress";
import type { Attempt, ProblemState } from "@/lib/types";
import { useMistakeTagStore } from "@/stores/mistakeTagStore";
import { updateAttempt } from "@/stores/problemStore";
import { fitPrompt, gatherContext, promptEnv } from "../../ai/gather";
import { AIMarkdown, AIRunView, ClaudeTag } from "../../ai/parts";
import { useAIRequest } from "../../ai/useAI";
import { ResultLabel } from "../parts";
import { ReviewResult } from "./ClaudePanels";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));
const DiffView = lazy(() =>
  import("@/components/ui/code/DiffView").then((m) => ({ default: m.DiffView })),
);

const MODE_LABEL: Record<Attempt["mode"], string | null> = {
  normal: null,
  resolve: "Re-solve",
  mock: "Mock",
};

function langLabel(language: string): string {
  return CODE_LANGUAGE_LABEL[normalizeLanguage(language)];
}

function attemptTitle(a: Attempt, n: number): string {
  return `Attempt ${n} on ${shortDate(attemptDate(a))}`;
}

/** Claude's review of a saved attempt: the stored one, or a new one on request (F12). */
function AttemptReview({ attempt, state }: { attempt: Attempt; state: ProblemState | undefined }) {
  const request = useAIRequest<CodeReview>();
  const tags = useMistakeTagStore((s) => s.tags);
  const info = problemInfo(attempt.problemId, state);
  if (!info || !attempt.code.trim()) return null;
  const review = () =>
    void request.start(
      async () =>
        fitPrompt(
          await gatherContext({
            problemId: attempt.problemId,
            code: { language: attempt.language, code: attempt.code },
          }),
          (ctx) =>
            codeReviewPrompt(promptEnv(), ctx, {
              tags: Object.values(tags)
                .filter((t) => !t.archived)
                .map((t) => t.label),
              claimedTime: attempt.timeComplexity,
              claimedSpace: attempt.spaceComplexity,
            }),
        ),
      {
        cacheKey: `review:${attempt.id}`,
        title: `A review of your code for ${info.title}`,
        onDone: (result) => {
          if (result.data) updateAttempt(attempt.problemId, attempt.id, { review: result.data });
          request.reset();
        },
      },
    );
  return (
    <section aria-label="Claude's review" className="space-y-3">
      {attempt.review && request.state.phase === "idle" ? (
        <details className="rounded-control border border-rule px-3 py-2" open>
          <summary className="flex cursor-pointer items-center gap-2 text-base font-medium text-text">
            Claude's review <ClaudeTag />
          </summary>
          <div className="mt-3">
            <ReviewResult
              review={attempt.review}
              problemId={attempt.problemId}
              addedTagIds={attempt.mistakeTagIds}
              onAddTag={(tagId) =>
                updateAttempt(attempt.problemId, attempt.id, { addTagIds: [tagId] })
              }
              currentInsight={state?.insight}
            />
          </div>
        </details>
      ) : (
        request.state.phase === "idle" && (
          <Button size="sm" icon={Sparkles} onClick={review}>
            Review this attempt with Claude
          </Button>
        )
      )}
      <AIRunView
        request={request}
        showStream={false}
        thinkingLabel="Reading this attempt's code…"
      />
    </section>
  );
}

export function AttemptDetails({ attempt, state }: { attempt: Attempt; state?: ProblemState }) {
  const tags = useMistakeTagStore((s) => s.tags);
  const rows: [string, string | undefined][] = [
    ["Minutes", attempt.minutes !== undefined ? String(attempt.minutes) : undefined],
    ["Hints used", attempt.hintsUsed ? String(attempt.hintsUsed) : undefined],
    ["Language", langLabel(attempt.language)],
    ["Time", attempt.timeComplexity],
    ["Space", attempt.spaceComplexity],
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base">
        <ResultLabel result={attempt.result} />
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <span key={k} className="text-muted">
              {k}: <span className="text-text">{v}</span>
            </span>
          ))}
        {MODE_LABEL[attempt.mode] && <Chip>{MODE_LABEL[attempt.mode]}</Chip>}
      </div>
      {attempt.mistakeTagIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attempt.mistakeTagIds.map((id) => (
            <TagChip key={id} label={tags[id]?.label ?? id} />
          ))}
        </div>
      )}
      {attempt.answer && (
        <div>
          <p className="mb-1 text-sm font-medium text-muted">
            Answer
            {attempt.answerTries
              ? ` (${attempt.answerTries} ${attempt.answerTries === 1 ? "check" : "checks"})`
              : ""}
          </p>
          <p className="text-base whitespace-pre-wrap text-text">{attempt.answer}</p>
        </div>
      )}
      {attempt.grade && (
        <div className="rounded-control border border-rule px-3 py-2">
          <p className="flex items-center gap-2 text-sm font-medium text-muted">
            {attempt.grade.by === "claude" ? "Graded by Claude" : "Graded by you against the note"}:{" "}
            {Math.round(attempt.grade.score * 100)}%{attempt.grade.by === "claude" && <ClaudeTag />}
          </p>
          {attempt.grade.feedback && (
            <p className="mt-1 text-base text-text">{attempt.grade.feedback}</p>
          )}
        </div>
      )}
      {attempt.approach && (
        <div>
          <p className="mb-1 text-sm font-medium text-muted">Approach</p>
          <Suspense fallback={<Skeleton className="h-10 w-full" />}>
            <MarkdownView compact>{attempt.approach}</MarkdownView>
          </Suspense>
        </div>
      )}
      {attempt.code.trim() ? (
        <CodeView code={attempt.code} language={attempt.language} lineNumbers maxHeight="50vh" />
      ) : (
        <p className="text-base text-muted">No code was saved with this attempt.</p>
      )}
      <AttemptReview attempt={attempt} state={state} />
      {attempt.dryRuns && attempt.dryRuns.length > 0 && (
        <section aria-label="Dry runs" className="space-y-2">
          <h3 className="flex items-center gap-2 text-base font-medium text-text">
            Dry runs <ClaudeTag />
          </h3>
          {attempt.dryRuns.map((d) => (
            <details key={d.createdAt} className="rounded-control border border-rule px-3 py-2">
              <summary className="cursor-pointer truncate font-mono text-sm text-text">
                {d.input}
              </summary>
              <div className="mt-2">
                <AIMarkdown compact>{d.output}</AIMarkdown>
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}

interface TimelineProps {
  state: ProblemState | undefined;
  onOpen: (attemptId: string) => void;
}

export function AttemptsTimeline({ state, onOpen }: TimelineProps) {
  const attempts = attemptsInOrder(state).reverse(); // newest first
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  if (attempts.length === 0) {
    return (
      <EmptyState icon={Code2} title="No attempts yet" compact>
        Write your solution in the editor, then save it as an attempt. Every attempt keeps its code,
        so you can read it again or compare two.
      </EmptyState>
    );
  }

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)));

  const numberOf = new Map(attemptsInOrder(state).map((a, i) => [a.id, i + 1]));
  const pair = attemptsInOrder(state).filter((a) => selected.includes(a.id));
  const [older, newer] = pair;

  return (
    <div>
      <ul className="overflow-hidden rounded-control border border-rule">
        {attempts.map((a) => {
          const n = numberOf.get(a.id)!;
          const checked = selected.includes(a.id);
          return (
            <li
              key={a.id}
              className={cx(
                "flex items-center gap-3 border-t border-rule px-3 py-2 first:border-t-0",
                checked && "bg-accent-soft",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(a.id)}
                aria-label={`Select ${attemptTitle(a, n)} to compare`}
                className="size-4 shrink-0 accent-[var(--accent)] max-md:size-5"
              />
              <button
                type="button"
                onClick={() => onOpen(a.id)}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-left text-sm"
              >
                <span className="w-14 shrink-0 font-medium text-text tabular-nums">
                  {shortDate(attemptDate(a))}
                </span>
                <ResultLabel result={a.result} short />
                <span className="text-muted tabular-nums">
                  {a.minutes !== undefined ? `${a.minutes} min` : ""}
                </span>
                {a.hintsUsed > 0 && (
                  <span className="text-muted">
                    {a.hintsUsed} {a.hintsUsed === 1 ? "hint" : "hints"}
                  </span>
                )}
                <span className="text-muted">
                  {a.code.trim() ? langLabel(a.language) : "No code"}
                </span>
                {MODE_LABEL[a.mode] && <Chip className="h-5 px-1.5">{MODE_LABEL[a.mode]}</Chip>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          icon={GitCompareArrows}
          disabled={pair.length !== 2}
          onClick={() => setComparing(true)}
        >
          Compare
        </Button>
        <span className="text-sm text-muted">
          {pair.length === 2
            ? "Two attempts selected."
            : "Tick two attempts to compare their code."}
        </span>
      </div>
      {attempts.length > ATTEMPT_WARN && (
        <p className="mt-2 text-sm text-warning">
          {attempts.length} attempts saved. Atlas keeps the latest {ATTEMPT_CAP}; older ones are
          removed as new ones arrive.
        </p>
      )}
      <Dialog
        open={comparing && Boolean(older && newer)}
        onClose={() => setComparing(false)}
        title="Compare attempts"
        description={
          older && newer
            ? `${attemptTitle(older, numberOf.get(older.id)!)} and ${attemptTitle(newer, numberOf.get(newer.id)!).replace("Attempt", "attempt")}`
            : undefined
        }
        size="lg"
      >
        {older && newer && (
          <div className="p-4 sm:p-5">
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
              <DiffView
                before={older.code}
                after={newer.code}
                language={newer.language}
                beforeLabel={`Attempt ${numberOf.get(older.id)}`}
                afterLabel={`Attempt ${numberOf.get(newer.id)}`}
              />
            </Suspense>
          </div>
        )}
      </Dialog>
    </div>
  );
}

interface AttemptDialogProps {
  state: ProblemState | undefined;
  attemptId: string | null;
  onClose: () => void;
  onLoadIntoEditor: (attempt: Attempt) => void;
  onDelete: (attempt: Attempt) => void;
}

export function AttemptDialog({
  state,
  attemptId,
  onClose,
  onLoadIntoEditor,
  onDelete,
}: AttemptDialogProps) {
  const ordered = attemptsInOrder(state);
  const index = ordered.findIndex((a) => a.id === attemptId);
  const attempt = index >= 0 ? ordered[index] : undefined;
  return (
    <Dialog
      open={Boolean(attempt)}
      onClose={onClose}
      title={attempt ? attemptTitle(attempt, index + 1) : "Attempt"}
      size="lg"
      footer={
        attempt && (
          <>
            <Button
              variant="ghost"
              icon={Trash2}
              onClick={() => onDelete(attempt)}
              className="mr-auto text-danger"
            >
              Delete attempt
            </Button>
            {attempt.code.trim() && (
              <Button onClick={() => onLoadIntoEditor(attempt)}>Copy into the editor</Button>
            )}
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </>
        )
      }
    >
      {attempt && (
        <div className="p-4 sm:p-5">
          <AttemptDetails attempt={attempt} state={state} />
        </div>
      )}
    </Dialog>
  );
}
