// The answer box on a quant puzzle's page (F28). Checkable puzzles: type the answer and press
// Enter; equivalent forms (2/3, 0.667, 66.7%, 1/e, sqrt(2)) count, within 0.5%. Open-ended
// puzzles: write the answer and reasoning, then grade it with Claude (prompt 16) or compare it
// with the answer note and grade it yourself. The result then decides how the attempt can be
// saved (lib/quant/puzzles.ts). Everything here rides in the draft, so a reload keeps it.
import { CheckCircle2, CircleX, Save, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Input, Textarea } from "@/components/ui/Field";
import type { ProblemInfo } from "@/lib/problems/catalog";
import { puzzleGradePrompt } from "@/lib/ai/prompts";
import type { PuzzleGrade } from "@/lib/ai/schemas";
import {
  checkPuzzleAnswer,
  gradeFromClaude,
  isOpenEnded,
  puzzleOutcome,
  SELF_GRADES,
  selfGrade,
  type SelfGrade,
} from "@/lib/quant/puzzles";
import type { PuzzleProgress } from "@/lib/types";
import { promptEnv } from "../../ai/gather";
import { AIRunView, ClaudeTag } from "../../ai/parts";
import { useAIRequest } from "../../ai/useAI";

interface PuzzleAnswerProps {
  info: ProblemInfo;
  progress: PuzzleProgress | undefined;
  hintsUsed: number;
  sawSolution: boolean;
  onChange: (progress: PuzzleProgress) => void;
  /** The first keystroke starts the attempt (and its timer), as in the editor. */
  onBegin: () => void;
  onSave: () => void;
  disabled?: boolean;
}

function Note({ info }: { info: ProblemInfo }) {
  if (!info.answerNote) return null;
  return (
    <div className="rounded-control bg-surface-sunken px-3 py-2.5">
      <p className="text-sm font-medium text-muted">
        {isOpenEnded(info) ? "The answer note" : `The answer: ${info.answer}`}
      </p>
      <p className="mt-1 max-w-[70ch] text-base text-text">{info.answerNote}</p>
    </div>
  );
}

export function PuzzleAnswer({
  info,
  progress,
  hintsUsed,
  sawSolution,
  onChange,
  onBegin,
  onSave,
  disabled,
}: PuzzleAnswerProps) {
  const open = isOpenEnded(info);
  const [text, setText] = useState(progress?.answer ?? "");
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const grader = useAIRequest<PuzzleGrade>();
  const outcome = puzzleOutcome(info, progress, { hintsUsed, sawSolution });
  const correct = !open && progress?.verdict === "correct";
  const graded = open && progress?.grade;

  const edit = (value: string) => {
    if (!text && value) onBegin();
    setText(value);
    setUnreadable(null);
    const base: PuzzleProgress = progress ?? { answer: "", tries: 0 };
    // A changed answer needs a new check or grade.
    const next: PuzzleProgress = { ...base, answer: value };
    delete next.verdict;
    delete next.grade;
    onChange(next);
    if (comparing) setComparing(false);
    if (grader.state.phase !== "idle") grader.reset();
  };

  const check = () => {
    if (open || !info.answer || !text.trim()) return;
    const result = checkPuzzleAnswer(info.answer, text, progress);
    if (result.verdict === "unreadable") {
      setUnreadable(text.trim());
      return;
    }
    onChange(result.progress);
  };

  const gradeWithClaude = () =>
    void grader.start(
      () => ({
        spec: puzzleGradePrompt(promptEnv(), {
          prompt: info.prompt ?? info.title,
          reference: info.answerNote,
          answer: text,
        }),
      }),
      {
        title: `Grade my answer to ${info.title}`,
        onDone: (result) => {
          if (!result.data) return;
          onChange({
            ...(progress ?? { tries: 0 }),
            answer: text,
            grade: gradeFromClaude(result.data),
          });
        },
      },
    );

  const gradeSelf = (which: SelfGrade) => {
    onChange({ ...(progress ?? { tries: 0 }), answer: text, grade: selfGrade(which) });
    setComparing(false);
  };

  if (sawSolution) {
    return (
      <div className="space-y-3">
        <p className="text-base text-muted">
          You saw the answer, so this attempt counts as “saw the solution” and the puzzle comes back
          tomorrow to solve on your own.
        </p>
        <Button size="sm" icon={Save} onClick={onSave} disabled={disabled}>
          Save attempt
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {open ? (
        <div className="space-y-1.5">
          <label htmlFor="puzzle-answer" className="text-sm font-medium text-text">
            Your answer and reasoning
          </label>
          <Textarea
            id="puzzle-answer"
            rows={4}
            value={text}
            disabled={disabled}
            onChange={(e) => edit(e.target.value)}
            placeholder="Say what you'd do and why, as you would to an interviewer."
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="puzzle-answer" className="text-sm font-medium text-text">
            Your answer
          </label>
          <div className="flex gap-2">
            <Input
              id="puzzle-answer"
              value={text}
              readOnly={correct}
              disabled={disabled}
              onChange={(e) => edit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  check();
                }
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="For example 2/3, 0.25, 1/e or sqrt(2)"
              aria-describedby="puzzle-answer-help"
              className={cx("min-w-0 flex-1 font-medium tabular-nums", correct && "border-success")}
            />
            {!correct && (
              <Button onClick={check} disabled={disabled || !text.trim()}>
                Check answer
              </Button>
            )}
          </div>
          <p id="puzzle-answer-help" className="text-sm text-muted">
            {unreadable !== null
              ? `Atlas couldn't read “${unreadable}” as a number. Try a form such as 2/3, 0.667, 25%, 1/e or sqrt(2).`
              : "Fractions, decimals, percentages and forms like 1/e or sqrt(2) all work, within 0.5%."}
          </p>
        </div>
      )}

      {!open && progress?.verdict && (
        <p
          role="status"
          className={cx(
            "flex items-center gap-2 text-md font-semibold",
            correct ? "text-success" : "text-danger",
          )}
        >
          {correct ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : (
            <CircleX size={18} aria-hidden="true" />
          )}
          {correct ? outcome.summary : "Not quite. Try again, or take a hint."}
          {!correct && (
            <span className="text-sm font-normal text-muted">
              {progress.tries} {progress.tries === 1 ? "try" : "tries"}
            </span>
          )}
        </p>
      )}
      {correct && <Note info={info} />}

      {open && !graded && !comparing && (
        <div className="flex flex-wrap gap-2">
          {grader.state.phase === "idle" && (
            <Button
              size="sm"
              icon={Sparkles}
              onClick={gradeWithClaude}
              disabled={disabled || text.trim().length < 3}
            >
              Grade with Claude
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setComparing(true)}
            disabled={disabled || text.trim().length < 3}
          >
            Compare with the answer note
          </Button>
        </div>
      )}
      {open && !graded && (
        <AIRunView request={grader} showStream={false} thinkingLabel="Reading your answer…" />
      )}
      {open && comparing && !graded && (
        <div className="space-y-2">
          <Note info={info} />
          <p className="text-base text-text">How close was your answer?</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SELF_GRADES) as SelfGrade[]).map((k) => (
              <Button key={k} size="sm" onClick={() => gradeSelf(k)}>
                {SELF_GRADES[k].label}
              </Button>
            ))}
          </div>
        </div>
      )}
      {graded && progress?.grade && (
        <div className="space-y-2 rounded-control border border-rule px-3 py-2.5">
          <p className="flex flex-wrap items-center gap-2 text-base font-medium text-text">
            {progress.grade.correct && progress.grade.score >= 0.8 ? (
              <CheckCircle2 size={16} aria-hidden="true" className="text-success" />
            ) : (
              <CircleX size={16} aria-hidden="true" className="text-warning" />
            )}
            {outcome.summary}
            {progress.grade.by === "claude" && (
              <>
                <span className="text-sm font-normal text-muted">
                  Score {Math.round(progress.grade.score * 100)}%
                </span>
                <ClaudeTag />
              </>
            )}
          </p>
          {progress.grade.feedback && (
            <p className="text-base text-text">{progress.grade.feedback}</p>
          )}
          {progress.grade.idealReasoning && (
            <div>
              <p className="text-sm font-medium text-muted">Ideal reasoning</p>
              <p className="text-base text-text">{progress.grade.idealReasoning}</p>
            </div>
          )}
          {progress.grade.by === "self" && <Note info={info} />}
        </div>
      )}

      {(correct || graded) && (
        <Button variant="primary" size="sm" icon={Save} onClick={onSave} disabled={disabled}>
          Save attempt
        </Button>
      )}
      {!open && !correct && (progress?.tries ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" icon={Save} onClick={onSave} disabled={disabled}>
            Save attempt
          </Button>
          <span className="text-sm text-muted">Done for now? It comes back tomorrow.</span>
        </div>
      )}
    </div>
  );
}
