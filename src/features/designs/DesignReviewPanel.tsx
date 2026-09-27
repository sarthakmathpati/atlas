// Reviewing a design (F26): Claude scores each must-discuss point 0 to 2, lists what was missed
// and suggests improvements (prompt 12), or the owner scores the same points against the rubric
// offline. Either is stored with the DesignAttempt; saving then records the attempt as practice.
import { CheckCircle2, CircleDot, CircleX, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { designReviewPrompt } from "@/lib/ai/prompts";
import type { DesignReview } from "@/lib/ai/schemas";
import { designKind, filledSections, overallFromPoints, readReview } from "@/lib/designs/designs";
import type { DesignAttempt, SeedProblem } from "@/lib/types";
import { setDesignReview, setSelfReview } from "@/stores/designStore";
import { promptEnv } from "../ai/gather";
import { AIRunView, ClaudeTag } from "../ai/parts";
import { useAIRequest } from "../ai/useAI";

const POINT_ICON = [CircleX, CircleDot, CheckCircle2] as const;
const POINT_TONE = ["text-danger", "text-warning", "text-success"] as const;
const POINT_LABEL = ["Missed", "Partly", "Covered"] as const;

export function ReviewView({ review, className }: { review: DesignReview; className?: string }) {
  return (
    <div className={cx("space-y-4", className)}>
      <p className="flex flex-wrap items-center gap-2 text-md font-semibold text-text">
        Overall {review.overall}/5 <ClaudeTag />
      </p>
      <ul className="divide-y divide-rule rounded-control border border-rule">
        {review.rubric.map((r, i) => {
          const s = Math.max(0, Math.min(2, Math.round(r.score)));
          const Icon = POINT_ICON[s]!;
          return (
            <li key={`${r.point}-${i}`} className="flex gap-3 px-3 py-2.5">
              <Icon size={18} aria-hidden="true" className={cx("mt-0.5 shrink-0", POINT_TONE[s])} />
              <div className="min-w-0">
                <p className="text-base font-medium text-text">
                  {r.point}{" "}
                  <span className="text-sm font-normal text-muted">
                    {POINT_LABEL[s]} ({r.score}/2)
                  </span>
                </p>
                {r.comment && <p className="text-base text-muted">{r.comment}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      {review.missed.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted">What you missed</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-text">
            {review.missed.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {review.suggestions.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted">Suggestions</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-text">
            {review.suggestions.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SelfReviewView({
  rubric,
  points,
}: {
  rubric: readonly string[];
  points: number[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-md font-semibold text-text">Your review: {overallFromPoints(points)}/5</p>
      <ul className="divide-y divide-rule rounded-control border border-rule">
        {rubric.map((point, i) => {
          const s = points[i] ?? 0;
          const Icon = POINT_ICON[s]!;
          return (
            <li key={point} className="flex gap-3 px-3 py-2">
              <Icon size={18} aria-hidden="true" className={cx("mt-0.5 shrink-0", POINT_TONE[s])} />
              <span className="text-base text-text">
                {point} <span className="text-sm text-muted">{POINT_LABEL[s]}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The review step of an unfinished attempt. */
export function DesignReviewPanel({
  problem,
  attempt,
  onSave,
  saveLabel = "Save attempt",
}: {
  problem: SeedProblem;
  attempt: DesignAttempt;
  onSave: () => void;
  saveLabel?: string;
}) {
  const rubric = problem.rubric ?? [];
  const request = useAIRequest<DesignReview>();
  const review = readReview(attempt.review);
  // Points chosen so far (-1 = not yet); stored once every point has one.
  const [points, setPoints] = useState<number[]>(() =>
    rubric.map((_, i) => attempt.selfReview?.[i] ?? -1),
  );
  const selfDone = rubric.length > 0 && points.every((p) => p >= 0);
  const kind = designKind(problem);

  const ask = () =>
    void request.start(
      () => ({
        spec: designReviewPrompt(promptEnv(), {
          prompt: problem.prompt ?? problem.title,
          rubric,
          sections: filledSections(kind, attempt.sections),
        }),
      }),
      {
        title: `Review of my design for ${problem.title}`,
        onDone: (result) => {
          if (!result.data) return;
          setDesignReview(attempt.id, result.data);
          request.reset();
        },
      },
    );

  const setPoint = (i: number, v: number) => {
    const next = points.map((p, k) => (k === i ? v : p));
    setPoints(next);
    if (next.every((p) => p >= 0)) setSelfReview(attempt.id, next);
  };

  return (
    <section aria-label="Review" className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-md font-semibold text-text">Review with Claude</h3>
        <p className="text-base text-muted">
          Claude scores each must-discuss point from 0 to 2, lists what you missed and suggests
          improvements.
        </p>
        {!review && request.state.phase === "idle" && (
          <Button icon={Sparkles} onClick={ask}>
            Review with Claude
          </Button>
        )}
        <AIRunView request={request} showStream={false} thinkingLabel="Reading your design…" />
        {review && (
          <>
            <ReviewView review={review} />
            {request.state.phase === "idle" && (
              <Button size="sm" variant="ghost" icon={Sparkles} onClick={ask}>
                Review it again
              </Button>
            )}
          </>
        )}
      </div>
      {!review && (
        <div className="space-y-3">
          <h3 className="text-md font-semibold text-text">Or review it yourself</h3>
          <p className="text-base text-muted">
            For each point a strong answer covers, how well did yours?
          </p>
          <ul className="space-y-3">
            {rubric.map((point, i) => (
              <li key={point} className="space-y-1.5">
                <p className="text-base text-text">{point}</p>
                <SegmentedControl<string>
                  label={point}
                  size="sm"
                  value={points[i]! >= 0 ? String(points[i]) : ""}
                  onChange={(v) => setPoint(i, Number(v))}
                  options={[
                    { value: "0", label: "Missed" },
                    { value: "1", label: "Partly" },
                    { value: "2", label: "Covered" },
                  ]}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule pt-4">
        <span className="mr-auto text-sm text-muted">
          {review
            ? `Counts as ${review.overall}/5 for ${problem.title}.`
            : selfDone
              ? `Counts as ${overallFromPoints(points)}/5 for ${problem.title}.`
              : "Review it with Claude or yourself to save it."}
        </span>
        <Button variant="primary" onClick={onSave} disabled={!review && !selfDone}>
          {saveLabel}
        </Button>
      </div>
    </section>
  );
}
