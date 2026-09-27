// Explain it back, graded by Claude (F13): a score from 0 to 5 against the concept's interview
// points, what was right, what was missing, misconceptions, a better short explanation and one
// follow-up question. Answering the follow-up regrades the explanation with the answer; a higher
// score is recorded as a new check. Each grade is saved as a check (score / 5) with the text, so
// it appears in the concept's Notes tab.
import { CheckCircle2, CircleAlert, CircleX, MessageCircleQuestion } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { AIMarkdown, AIRunView, ClaudeTag } from "../../ai/parts";
import type { ExplainGrading } from "./useExplainGrade";

function Points({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: typeof CheckCircle2;
  tone: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold text-text">{title}</h4>
      <ul className="space-y-1">
        {items.map((p, i) => (
          <li key={i} className="flex gap-2 text-base text-text">
            <Icon size={16} aria-hidden="true" className={`mt-0.5 shrink-0 ${tone}`} />
            <span className="min-w-0">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ClaudeExplainGradeProps {
  grading: ExplainGrading;
  onEdit: () => void;
  onSelfCheck: () => void;
  onDone: () => void;
}

export function ClaudeExplainGrade({
  grading,
  onEdit,
  onSelfCheck,
  onDone,
}: ClaudeExplainGradeProps) {
  const { request, grade, best, run } = grading;
  const [answer, setAnswer] = useState("");
  const [followUp, setFollowUp] = useState<string | null>(null);
  const phase = request.state.phase;
  const working =
    phase === "thinking" || phase === "streaming" || phase === "error" || phase === "stopped";

  if (grade === null) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <AIRunView
          request={request}
          showStream={false}
          thinkingLabel="Claude is reading your explanation…"
        />
        {(phase === "error" || phase === "stopped" || phase === "idle") && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={onEdit}>
              Edit my explanation
            </Button>
            <Button onClick={onSelfCheck}>Check it myself instead</Button>
          </div>
        )}
      </div>
    );
  }

  const score5 = Math.max(0, Math.min(5, grade.score));
  const kept = best > score5;
  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1" role="status">
        <p className="text-2xl font-semibold text-text tabular-nums">{score5} / 5</p>
        <ClaudeTag label="Graded by Claude" />
        {kept && (
          <span className="text-sm text-muted">Your best this time, {best} / 5, is kept.</span>
        )}
      </div>
      <Points
        title="What you got right"
        items={grade.correctPoints}
        icon={CheckCircle2}
        tone="text-success"
      />
      <Points
        title="What was missing"
        items={grade.missingPoints}
        icon={CircleAlert}
        tone="text-warning"
      />
      <Points
        title="Misconceptions"
        items={grade.misconceptions}
        icon={CircleX}
        tone="text-danger"
      />
      {grade.betterExplanation.trim() && (
        <div className="rounded-control border border-rule bg-surface-sunken px-3 py-2">
          <h4 className="mb-1 text-sm font-semibold text-text">A stronger explanation</h4>
          <AIMarkdown compact>{grade.betterExplanation}</AIMarkdown>
        </div>
      )}
      {grade.followUpQuestion.trim() && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-text">
            <MessageCircleQuestion size={16} aria-hidden="true" className="text-accent" />
            Follow-up question
          </h4>
          <p className="text-base text-text">{grade.followUpQuestion}</p>
          {followUp === null ? (
            <Button size="sm" onClick={() => setFollowUp(grade.followUpQuestion)}>
              Answer it to improve your score
            </Button>
          ) : (
            <>
              <Textarea
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                aria-label="Your answer to the follow-up question"
                disabled={request.busy}
              />
              <Button
                size="sm"
                variant="primary"
                disabled={request.busy || answer.trim().split(/\s+/).length < 5}
                onClick={() => {
                  run({ question: followUp, answer });
                  setFollowUp(null);
                  setAnswer("");
                }}
              >
                Grade my answer
              </Button>
            </>
          )}
        </div>
      )}
      {working && (
        <AIRunView
          request={request}
          showStream={false}
          thinkingLabel="Claude is reading your answer…"
        />
      )}
      <p className="text-sm text-muted">
        Saved in the concept's notes with your explanation.{" "}
        {best >= 4
          ? "A strong result: it counts toward this concept turning green."
          : "Read what was missing, then try again another day."}
      </p>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onDone} disabled={request.busy}>
          Done
        </Button>
      </div>
    </div>
  );
}
