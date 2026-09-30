// Claude on the code (F12). "Review my code" reads the problem, the language, the owner's claimed
// complexity and the code, and returns a structured review: correctness with line numbers,
// complexity against the optimum, missed edge cases, a better approach in words, code quality,
// a suggested insight (one click to use) and suggested mistake tags (one click to add). "Dry run"
// traces the code on an input the owner gives (or Claude picks) in a table of variables.
// Reviews and dry runs belong to the attempt: they ride in the draft and are saved with it.
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Input, Textarea } from "@/components/ui/Field";
import { codeReviewPrompt, dryRunPrompt } from "@/lib/ai/prompts";
import type { CodeReview } from "@/lib/ai/schemas";
import type { ProblemInfo } from "@/lib/problems/catalog";
import { matchTags } from "@/lib/mistakes/match";
import { useMistakeTagStore } from "@/stores/mistakeTagStore";
import { updateProblem } from "@/stores/problemStore";
import { toast } from "@/stores/toastStore";
import { fitPrompt, gatherContext, promptEnv } from "../../ai/gather";
import { AIMarkdown, AIRunView, ClaudeTag } from "../../ai/parts";
import { useAIRequest } from "../../ai/useAI";
import type { DryRun } from "./useAttemptSession";

const VERDICT: Record<CodeReview["verdict"], { label: string; tone: string; icon: typeof Bug }> = {
  correct: { label: "Correct", tone: "text-success", icon: CheckCircle2 },
  "likely correct": { label: "Likely correct", tone: "text-success", icon: CheckCircle2 },
  "has bugs": { label: "Has bugs", tone: "text-danger", icon: Bug },
  incomplete: { label: "Incomplete", tone: "text-warning", icon: AlertTriangle },
};

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold text-text">{title}</h4>
      <ul className="list-disc space-y-1 pl-5 text-base text-text">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

interface ReviewResultProps {
  review: CodeReview;
  problemId: string;
  /** Tags already on the attempt (or chosen for it). */
  addedTagIds: readonly string[];
  onAddTag: (tagId: string) => void;
  /** Hide "Use as insight" (for example in a re-solve before revealing). */
  canUseInsight?: boolean;
  currentInsight?: string;
}

/** A structured review, with the insight and the tags one click away. */
export function ReviewResult({
  review,
  problemId,
  addedTagIds,
  onAddTag,
  canUseInsight = true,
  currentInsight,
}: ReviewResultProps) {
  const tags = useMistakeTagStore((s) => s.tags);
  const matched = useMemo(() => matchTags(review.suggestedMistakeTags, tags), [review, tags]);
  const verdict = VERDICT[review.verdict];
  const VerdictIcon = verdict.icon;
  const insight = review.suggestedInsight.trim();
  const useInsight = () => {
    const before = currentInsight;
    updateProblem(problemId, { insight });
    toast("Insight saved.", {
      action: { label: "Undo", onClick: () => updateProblem(problemId, { insight: before ?? "" }) },
    });
  };
  return (
    <div className="space-y-4">
      <p className={cx("flex items-center gap-2 text-base font-semibold", verdict.tone)}>
        <VerdictIcon size={18} aria-hidden="true" />
        {verdict.label}
      </p>
      {review.correctnessConcerns.length > 0 && (
        <div>
          <h4 className="mb-1 text-sm font-semibold text-text">Correctness</h4>
          <ul className="space-y-1 text-base text-text">
            {review.correctnessConcerns.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-16 shrink-0 font-mono text-sm text-muted">
                  {c.line ? `Line ${c.line}` : "General"}
                </span>
                <span className="min-w-0">{c.issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
        <dt className="text-muted">Time</dt>
        <dd className="font-mono text-sm text-text">{review.timeComplexity}</dd>
        <dt className="text-muted">Space</dt>
        <dd className="font-mono text-sm text-text">{review.spaceComplexity}</dd>
        <dt className="text-muted">Optimal</dt>
        <dd className="text-text">
          {review.isOptimal ? (
            "Yes"
          ) : (
            <>
              Not yet. The best known is{" "}
              <span className="font-mono text-sm">{review.optimalComplexity || "lower"}</span>.
            </>
          )}
        </dd>
      </dl>
      <List title="Edge cases to handle" items={review.edgeCasesMissed} />
      {review.betterApproach.trim() && (
        <div>
          <h4 className="mb-1 text-sm font-semibold text-text">A better approach</h4>
          <p className="text-base text-text">{review.betterApproach}</p>
        </div>
      )}
      <List title="Code quality" items={review.codeQuality} />
      {insight && (
        <div className="rounded-control bg-surface px-3 py-2">
          <h4 className="text-sm font-semibold text-text">Suggested insight</h4>
          <p className="mt-0.5 text-base text-text">{insight}</p>
          {canUseInsight &&
            (currentInsight?.trim() === insight ? (
              <p className="mt-1 text-sm text-muted">This is your insight now.</p>
            ) : (
              <Button size="sm" className="mt-2" onClick={useInsight}>
                Use as insight
              </Button>
            ))}
        </div>
      )}
      {matched.length > 0 && (
        <div>
          <h4 className="mb-1 text-sm font-semibold text-text">Suggested mistake tags</h4>
          <div className="flex flex-wrap gap-2">
            {matched.map(({ label, tag }) => {
              const added = tag ? addedTagIds.includes(tag.id) : false;
              return tag ? (
                <button
                  key={label}
                  type="button"
                  disabled={added}
                  onClick={() => onAddTag(tag.id)}
                  className={cx(
                    "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-sm max-md:h-9",
                    added
                      ? "border-rule bg-surface-sunken text-muted"
                      : "border-dashed border-accent text-accent hover:bg-accent-soft",
                  )}
                >
                  {added ? (
                    <CheckCircle2 size={13} aria-hidden="true" />
                  ) : (
                    <Plus size={13} aria-hidden="true" />
                  )}
                  {tag.label}
                  <span className="sr-only">{added ? " (added)" : " (add to this attempt)"}</span>
                </button>
              ) : (
                <span
                  key={label}
                  title="Not one of your tags"
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-rule px-2.5 text-sm text-muted"
                >
                  <CircleHelp size={13} aria-hidden="true" />
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ----- the panels in the workspace -----------------------------------------------------------------

interface PanelFrameProps {
  title: string;
  icon: typeof Bug;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}

function PanelFrame({ title, icon: Icon, onClose, className, children }: PanelFrameProps) {
  return (
    <section
      aria-label={title}
      className={cx(
        // A soft tray under the editor (12.10.8): rounded, sunken, no hairline.
        "mx-2 mt-2 flex min-h-0 flex-col rounded-panel bg-surface-sunken",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 px-3.5 pt-2.5 pb-2">
        <Icon size={16} aria-hidden="true" className="text-accent" />
        <h2 className="text-base font-semibold text-text">{title}</h2>
        <ClaudeTag />
        <span className="flex-1" />
        <IconButton
          icon={ChevronDown}
          label={`Hide ${title.toLowerCase()}`}
          size="sm"
          onClick={onClose}
        />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 pb-3.5">{children}</div>
    </section>
  );
}

interface CodeContext {
  info: ProblemInfo;
  code: { language: string; code: string };
  hideOwnWork: boolean;
}

interface ReviewPanelProps extends CodeContext {
  review?: CodeReview;
  reviewedCode?: string;
  pendingTagIds: string[];
  currentInsight?: string;
  onReviewed: (review: CodeReview, code: string) => void;
  onAddTag: (tagId: string) => void;
  onClose: () => void;
  className?: string;
}

export function ReviewPanel({
  info,
  code,
  hideOwnWork,
  review,
  reviewedCode,
  pendingTagIds,
  currentInsight,
  onReviewed,
  onAddTag,
  onClose,
  className,
}: ReviewPanelProps) {
  const request = useAIRequest<CodeReview>();
  const tags = useMistakeTagStore((s) => s.tags);
  const [time, setTime] = useState("");
  const [space, setSpace] = useState("");
  const blank = code.code.trim() === "";
  const changed = review !== undefined && reviewedCode !== undefined && reviewedCode !== code.code;

  const run = (refresh = false) => {
    const snapshot = code.code;
    void request.start(
      async () =>
        fitPrompt(await gatherContext({ problemId: info.id, code, hideOwnWork }), (ctx) =>
          codeReviewPrompt(promptEnv(), ctx, {
            tags: Object.values(tags)
              .filter((t) => !t.archived)
              .map((t) => t.label),
            claimedTime: time.trim() || undefined,
            claimedSpace: space.trim() || undefined,
          }),
        ),
      {
        refresh,
        title: `A review of your code for ${info.title}`,
        onDone: (result) => {
          if (result.data) onReviewed(result.data, snapshot);
          request.reset();
        },
      },
    );
  };

  const showForm = request.state.phase === "idle" && (!review || changed);
  return (
    <PanelFrame title="Code review" icon={Bug} onClose={onClose} className={className}>
      {blank ? (
        <p className="text-base text-muted">Write some code first, then Claude can review it.</p>
      ) : (
        <>
          {changed && request.state.phase === "idle" && (
            <p className="text-sm text-warning">
              Your code has changed since this review. Review it again to include the changes.
            </p>
          )}
          {showForm && (
            <div className="space-y-3">
              {!review && (
                <p className="text-base text-muted">
                  Claude checks correctness, complexity, edge cases and style, and suggests an
                  insight and mistake tags for this attempt.
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="Your time complexity (optional)"
                  aria-label="Your time complexity (optional)"
                  className="font-mono text-sm"
                />
                <Input
                  value={space}
                  onChange={(e) => setSpace(e.target.value)}
                  placeholder="Your space complexity (optional)"
                  aria-label="Your space complexity (optional)"
                  className="font-mono text-sm"
                />
              </div>
              <Button
                size="sm"
                variant="primary"
                icon={Sparkles}
                onClick={() => run(Boolean(review))}
              >
                {review ? "Review my code again" : "Review my code"}
              </Button>
            </div>
          )}
          <AIRunView request={request} showStream={false} thinkingLabel="Reading your code…" />
          {review && request.state.phase === "idle" && (
            <>
              <ReviewResult
                review={review}
                problemId={info.id}
                addedTagIds={pendingTagIds}
                onAddTag={onAddTag}
                canUseInsight={!hideOwnWork}
                currentInsight={currentInsight}
              />
              {!changed && (
                <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => run(true)}>
                  Review again
                </Button>
              )}
              <p className="text-sm text-muted">
                The review is saved with this attempt when you save it.
              </p>
            </>
          )}
        </>
      )}
    </PanelFrame>
  );
}

interface DryRunPanelProps extends CodeContext {
  dryRuns: DryRun[];
  onDryRun: (run: DryRun) => void;
  onClose: () => void;
  className?: string;
}

export function DryRunPanel({
  info,
  code,
  hideOwnWork,
  dryRuns,
  onDryRun,
  onClose,
  className,
}: DryRunPanelProps) {
  const request = useAIRequest();
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState("");
  const blank = code.code.trim() === "";
  const run = () => {
    const given = input.trim();
    void request.start(
      async () =>
        fitPrompt(await gatherContext({ problemId: info.id, code, hideOwnWork }), (ctx) =>
          dryRunPrompt(promptEnv(), ctx, { input: given, expected }),
        ),
      {
        title: `A dry run of your code for ${info.title}`,
        noCache: true,
        onDone: (result) =>
          onDryRun({
            input: given || "Chosen by Claude",
            output: result.text,
            createdAt: new Date().toISOString(),
          }),
      },
    );
  };
  const earlier = request.state.phase === "done" ? dryRuns.slice(0, -1) : dryRuns;
  return (
    <PanelFrame title="Dry run" icon={Play} onClose={onClose} className={className}>
      {blank ? (
        <p className="text-base text-muted">Write some code first, then Claude can trace it.</p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
            <Textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Input to trace"
              placeholder="An input, like nums = [2, 7, 11, 15], target = 9. Leave empty and Claude picks one."
              className="font-mono text-sm"
            />
            <Textarea
              rows={2}
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              aria-label="Expected output (optional)"
              placeholder="Expected output (optional)"
              className="font-mono text-sm"
            />
          </div>
          <Button size="sm" variant="primary" icon={Play} disabled={request.busy} onClick={run}>
            {input.trim() ? "Dry run on this input" : "Dry run on an input Claude picks"}
          </Button>
          <AIRunView request={request} compact />
          {earlier.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text">Earlier dry runs in this attempt</h3>
              {[...earlier].reverse().map((d) => (
                <details key={d.createdAt} className="rounded-control bg-surface px-3 py-2">
                  <summary className="cursor-pointer truncate font-mono text-sm text-text">
                    {d.input}
                  </summary>
                  <div className="mt-2">
                    <AIMarkdown compact>{d.output}</AIMarkdown>
                  </div>
                </details>
              ))}
            </div>
          )}
          <p className="text-sm text-muted">
            Claude traces your code as written, bugs included. Dry runs are saved with this attempt.
          </p>
        </>
      )}
    </PanelFrame>
  );
}
