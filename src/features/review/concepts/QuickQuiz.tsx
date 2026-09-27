// Quick quiz (F14): Claude writes 5 questions on a concept or topic (multiple choice and short
// answer). The reply is validated before anything is shown; multiple choice is marked at once and
// short answers are graded by Claude in one batch call (or by the owner, if grading fails).
// Each quiz records one check per concept (the average of its questions) and moves its reviews.
import { CheckCircle2, CircleDot, CircleX, ListChecks, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Textarea } from "@/components/ui/Field";
import { Callout, CodeSpans } from "@/components/ui/Misc";
import { quizGradePrompt, quizPrompt } from "@/lib/ai/prompts";
import type { QuizQuestion, ShortAnswerGrade } from "@/lib/ai/schemas";
import {
  cleanQuiz,
  quizChecks,
  scoreQuiz,
  type QuizAnswer,
  type QuizItemResult,
} from "@/lib/review/quiz";
import { useAIMode } from "@/stores/aiStore";
import type { QuizRequest } from "@/stores/conceptDialogStore";
import { recordChecks } from "@/stores/conceptStateStore";
import { findConcept } from "@/stores/customConceptStore";
import { fitPrompt, gatherContext, promptEnv } from "../../ai/gather";
import { AIMarkdown, AIRunView, ClaudeTag } from "../../ai/parts";
import { useAIRequest } from "../../ai/useAI";

type Phase = "intro" | "writing" | "answering" | "grading" | "self" | "results";

const SELF_MARKS = [
  { score: 1, label: "Got it" },
  { score: 0.5, label: "Partly" },
  { score: 0, label: "Missed it" },
] as const;

/** Stable, so it runs once when the results first render (they open at the top). */
const scrollToStart = (el: HTMLElement | null) => el?.scrollIntoView({ block: "start" });

function QuestionText({ text }: { text: string }) {
  return <AIMarkdown compact>{text}</AIMarkdown>;
}

export function QuickQuizBody({ request, onDone }: { request: QuizRequest; onDone: () => void }) {
  const writer = useAIRequest<QuizQuestion[]>();
  const grader = useAIRequest<ShortAnswerGrade[]>();
  const { mode } = useAIMode();
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selfMarks, setSelfMarks] = useState<Record<number, number>>({});
  const [results, setResults] = useState<QuizItemResult[]>([]);
  const [unusable, setUnusable] = useState(false);
  const recorded = useRef(false);

  const concepts = request.conceptIds
    .map((id) => findConcept(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const write = (refresh = false) => {
    setUnusable(false);
    setPhase("writing");
    void writer.start(
      async () =>
        fitPrompt(
          await gatherContext({ conceptId: concepts.length === 1 ? concepts[0]!.id : undefined }),
          (ctx) =>
            quizPrompt(promptEnv(), ctx, {
              scope: request.scope,
              concepts: concepts.slice(0, 40).map((c) => ({ id: c.id, name: c.name })),
            }),
        ),
      {
        refresh,
        title: `A quick quiz on ${request.scope}`,
        onDone: (result) => {
          const clean = cleanQuiz(result.data ?? [], request.conceptIds);
          if (clean.length === 0) {
            setUnusable(true);
            return;
          }
          setQuestions(clean);
          setAnswers(clean.map(() => ({})));
          setPhase("answering");
        },
      },
    );
  };

  const finish = (items: QuizItemResult[]) => {
    setResults(items);
    setPhase("results");
    if (recorded.current) return;
    recorded.current = true;
    recordChecks(
      quizChecks(items).map((c) => ({
        conceptId: c.conceptId,
        kind: "quiz" as const,
        score: c.score,
        detail: {
          mode: "claude",
          questions: items
            .filter((r) => r.conceptId === c.conceptId)
            .map((r) => ({
              question: questions[r.index]!.question,
              type: questions[r.index]!.type,
              score: r.score,
            })),
        },
      })),
      { session: request.session },
    );
  };

  const submit = () => {
    const shortItems = questions
      .map((q, index) => ({ q, index }))
      .filter(({ q, index }) => q.type === "short" && answers[index]?.text?.trim());
    if (shortItems.length === 0) {
      finish(scoreQuiz(questions, answers, []));
      return;
    }
    setPhase("grading");
    void grader.start(
      () => ({
        spec: quizGradePrompt(
          promptEnv(),
          shortItems.map(({ q, index }) => ({
            index,
            question: q.question,
            modelAnswer: q.type === "short" ? q.modelAnswer : "",
            answer: answers[index]?.text ?? "",
          })),
        ),
      }),
      {
        title: "Grading your short answers",
        onDone: (result) => finish(scoreQuiz(questions, answers, result.data ?? [])),
      },
    );
  };

  const finishSelf = () =>
    finish(
      scoreQuiz(
        questions,
        answers,
        Object.entries(selfMarks).map(([index, score]) => ({
          index: Number(index),
          score,
          feedback: "Marked by you.",
        })),
      ),
    );

  const setAnswer = (index: number, answer: QuizAnswer) =>
    setAnswers((list) => list.map((a, i) => (i === index ? { ...a, ...answer } : a)));

  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-4 px-4 py-5 sm:px-5">
        <p className="text-base text-text">
          Claude writes 5 questions on {request.scope}: multiple choice and short answer. Multiple
          choice is marked at once, and Claude grades your short answers.
        </p>
        <p className="text-sm text-muted">
          {mode === "copy"
            ? "You'll copy a prompt into claude.ai and paste the quiz back, then do the same for the grading."
            : "Your result counts as a check and sets when the concept comes back for review."}
        </p>
        <div className="flex justify-end">
          <Button variant="primary" icon={ListChecks} onClick={() => write()}>
            Write my quiz
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "writing") {
    return (
      <div className="flex flex-col gap-4 px-4 py-5 sm:px-5">
        <AIRunView request={writer} showStream={false} thinkingLabel="Writing your quiz…" />
        {unusable && (
          <Callout
            tone="warning"
            actions={
              <Button size="sm" icon={RotateCcw} onClick={() => write(true)}>
                Try again
              </Button>
            }
          >
            Claude's questions couldn't be used (they were incomplete). Try again for a new quiz.
          </Callout>
        )}
      </div>
    );
  }

  if (phase === "answering" || phase === "grading" || phase === "self") {
    const locked = phase !== "answering";
    return (
      <div className="flex flex-col">
        <ol className="flex flex-col gap-5 px-4 py-4 sm:px-5">
          {questions.map((q, index) => (
            <li key={index} className="space-y-2">
              <fieldset disabled={locked} className="space-y-2">
                <legend className="flex gap-2 text-base font-medium text-text">
                  <span className="shrink-0 tabular-nums">{index + 1}.</span>
                  <span className="min-w-0">
                    <QuestionText text={q.question} />
                  </span>
                </legend>
                {q.type === "mcq" ? (
                  <div className="divide-y divide-rule rounded-control border border-rule">
                    {q.options.map((option, i) => (
                      <label
                        key={i}
                        className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-surface-sunken"
                      >
                        <input
                          type="radio"
                          name={`quiz-${index}`}
                          checked={answers[index]?.choice === i}
                          onChange={() => setAnswer(index, { choice: i })}
                          className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                        />
                        <span className="text-base text-text">
                          <CodeSpans text={option} />
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    rows={3}
                    value={answers[index]?.text ?? ""}
                    onChange={(e) => setAnswer(index, { text: e.target.value })}
                    aria-label={`Your answer to question ${index + 1}`}
                    placeholder="A sentence or two."
                  />
                )}
              </fieldset>
              {phase === "self" && q.type === "short" && answers[index]?.text?.trim() && (
                <div className="space-y-2 rounded-control bg-surface-sunken px-3 py-2">
                  <p className="text-sm text-muted">Model answer</p>
                  <AIMarkdown compact>{q.modelAnswer}</AIMarkdown>
                  <div
                    className="flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-label="How did you do?"
                  >
                    {SELF_MARKS.map((m) => (
                      <Button
                        key={m.label}
                        size="sm"
                        role="radio"
                        aria-checked={selfMarks[index] === m.score}
                        variant={selfMarks[index] === m.score ? "primary" : "secondary"}
                        onClick={() => setSelfMarks((s) => ({ ...s, [index]: m.score }))}
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
        {phase === "grading" && (
          <div className="space-y-3 px-4 pb-4 sm:px-5">
            <AIRunView
              request={grader}
              showStream={false}
              thinkingLabel="Claude is grading your short answers…"
            />
            {grader.state.phase === "error" && (
              <Button size="sm" onClick={() => setPhase("self")}>
                Mark them myself
              </Button>
            )}
          </div>
        )}
        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-rule bg-surface-raised px-4 py-3 sm:px-5">
          {phase === "answering" && (
            <Button variant="primary" onClick={submit}>
              Check my answers
            </Button>
          )}
          {phase === "self" && (
            <Button
              variant="primary"
              disabled={questions.some(
                (q, i) =>
                  q.type === "short" && answers[i]?.text?.trim() && selfMarks[i] === undefined,
              )}
              onClick={finishSelf}
            >
              See my result
            </Button>
          )}
        </div>
      </div>
    );
  }

  const total = results.reduce((n, r) => n + r.score, 0);
  return (
    <div className="flex flex-col">
      <div ref={scrollToStart} className="flex scroll-mt-4 flex-col gap-4 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1" role="status">
          <p className="text-2xl font-semibold text-text tabular-nums">
            {Number.isInteger(total) ? total : total.toFixed(1)} / {results.length}
          </p>
          <ClaudeTag label="Quiz by Claude" />
        </div>
        <ol className="flex flex-col gap-4">
          {questions.map((q, index) => {
            const r = results[index]!;
            const Icon = r.score >= 1 ? CheckCircle2 : r.score > 0 ? CircleDot : CircleX;
            const tone =
              r.score >= 1 ? "text-success" : r.score > 0 ? "text-warning" : "text-danger";
            return (
              <li
                key={index}
                className="space-y-1.5 rounded-control border border-rule px-3 py-2.5"
              >
                <div className="flex gap-2">
                  <Icon size={18} aria-hidden="true" className={cx("mt-0.5 shrink-0", tone)} />
                  <div className="min-w-0 flex-1 text-base text-text">
                    <QuestionText text={q.question} />
                  </div>
                  <span className="shrink-0 text-sm text-muted tabular-nums">
                    {r.score === 1 ? "1" : r.score === 0 ? "0" : r.score.toFixed(1)} / 1
                  </span>
                </div>
                {q.type === "mcq" ? (
                  <p className="text-sm text-muted">
                    Answer: <CodeSpans text={q.options[q.answerIndex]!} />
                    {answers[index]?.choice !== undefined &&
                      answers[index]?.choice !== q.answerIndex && (
                        <>
                          {" "}
                          (you chose <CodeSpans text={q.options[answers[index]!.choice!]!} />)
                        </>
                      )}
                  </p>
                ) : (
                  <div className="text-sm text-muted">
                    <p>Model answer: {q.modelAnswer}</p>
                    {r.feedback && <p className="mt-0.5">{r.feedback}</p>}
                  </div>
                )}
                {q.explanation.trim() && (
                  <div className="text-sm text-muted">
                    <AIMarkdown compact>{q.explanation}</AIMarkdown>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-muted">
          Saved as a quiz check for{" "}
          {quizChecks(results)
            .map((c) => findConcept(c.conceptId)?.name ?? c.conceptId)
            .join(", ")}
          .
        </p>
      </div>
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-rule bg-surface-raised px-4 py-3 sm:px-5">
        <Button
          onClick={() => {
            recorded.current = false;
            setResults([]);
            setSelfMarks({});
            write(true);
          }}
        >
          Another quiz
        </Button>
        <Button variant="primary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
