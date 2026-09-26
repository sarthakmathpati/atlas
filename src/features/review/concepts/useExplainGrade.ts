// Grading an explanation with Claude (F13): the first grade and any follow-up regrades. Each
// grade is saved as a check (score / 5); a follow-up only counts when it raises the score.
import { useRef, useState } from "react";
import { explainGradePrompt } from "@/lib/ai/prompts";
import type { ExplainGrade } from "@/lib/ai/schemas";
import type { Concept } from "@/lib/types";
import { recordChecks } from "@/stores/conceptStateStore";
import { fitPrompt, gatherContext, promptEnv } from "../../ai/gather";
import { useAIRequest } from "../../ai/useAI";

/** What a Claude-graded explanation stores in its check's `detail`. */
export interface ClaudeExplainDetail {
  mode: "claude";
  text: string;
  score5: number;
  covered: string[];
  missed: string[];
  misconceptions: string[];
  betterExplanation: string;
  followUp?: { question: string; answer?: string };
}

/** Grading state for one explanation: the first grade and any follow-up regrades. */
export function useExplainGrade(opts: {
  concept: Concept | undefined;
  text: string;
  points: string[];
  session?: boolean;
}) {
  const request = useAIRequest<ExplainGrade>();
  const [grade, setGrade] = useState<ExplainGrade | null>(null);
  const [best, setBest] = useState(-1);
  const bestRef = useRef(-1);
  const { concept, text, points, session } = opts;

  const run = (followUp?: { question: string; answer: string }) => {
    if (!concept) return;
    void request.start(
      async () =>
        fitPrompt(await gatherContext({ conceptId: concept.id }), (ctx) =>
          explainGradePrompt(promptEnv(), ctx, {
            concept: concept.name,
            points,
            explanation: text,
            followUp,
          }),
        ),
      {
        title: `Feedback on your explanation of ${concept.name}`,
        noCache: Boolean(followUp),
        onDone: (result) => {
          const g = result.data;
          if (!g) return;
          const score5 = Math.max(0, Math.min(5, g.score));
          setGrade(g);
          // The first grade always counts; a follow-up counts only when it raises the score.
          if (!followUp || score5 > bestRef.current) {
            const detail: ClaudeExplainDetail = {
              mode: "claude",
              text,
              score5,
              covered: g.correctPoints,
              missed: g.missingPoints,
              misconceptions: g.misconceptions,
              betterExplanation: g.betterExplanation,
              followUp:
                followUp ?? (g.followUpQuestion ? { question: g.followUpQuestion } : undefined),
            };
            recordChecks([{ conceptId: concept.id, kind: "explain", score: score5 / 5, detail }], {
              session,
            });
            bestRef.current = Math.max(bestRef.current, score5);
            setBest(bestRef.current);
          }
        },
      },
    );
  };

  return { request, grade, best, run };
}

export type ExplainGrading = ReturnType<typeof useExplainGrade>;
