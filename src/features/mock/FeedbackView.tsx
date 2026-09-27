// A mock interview's feedback (F15, prompt 11): the hire signal, a score out of 5 for each point
// of the type's rubric, strengths, what to improve and a short summary.
import { cx } from "@/components/ui/cx";
import { HIRE_LABEL, feedbackMean, scoreLabel } from "@/lib/mock/mock";
import type { MockFeedback } from "@/lib/types";
import { ClaudeTag } from "../ai/parts";

const HIRE_TONE: Record<MockFeedback["hireSignal"], string> = {
  "strong yes": "border-success text-success",
  yes: "border-success text-success",
  "lean no": "border-warning text-warning",
  no: "border-danger text-danger",
};

export function FeedbackView({
  feedback,
  className,
}: {
  feedback: MockFeedback;
  className?: string;
}) {
  const entries = Object.entries(feedback.scores);
  return (
    <section aria-label="Feedback" className={cx("space-y-5", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
          Feedback <ClaudeTag />
        </h2>
        <span
          className={cx(
            "inline-flex h-7 items-center rounded-full border px-3 text-sm font-medium",
            HIRE_TONE[feedback.hireSignal],
          )}
        >
          Hire signal: {HIRE_LABEL[feedback.hireSignal]}
        </span>
        <span className="text-base text-muted tabular-nums">
          Average {feedbackMean(feedback)} out of 5
        </span>
      </div>
      <p className="max-w-[70ch] text-md text-text">{feedback.summary}</p>
      <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2" aria-label="Scores">
        {entries.map(([key, value]) => (
          <li key={key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-base">
              <span className="text-text">{scoreLabel(key)}</span>
              <span className="font-medium text-text tabular-nums">{value}/5</span>
            </div>
            <div
              role="img"
              aria-label={`${scoreLabel(key)}: ${value} out of 5`}
              className="flex h-1.5 gap-0.5"
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={cx(
                    "flex-1 rounded-full",
                    i <= Math.round(value) ? "bg-accent" : "bg-surface-sunken",
                  )}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-5 sm:grid-cols-2">
        {feedback.strengths.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-text">Strengths</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-base text-text">
              {feedback.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {feedback.improvements.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-text">To work on</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-base text-text">
              {feedback.improvements.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
