// What the interviewer sees with every turn (F15): the learner block, the interview brief (the
// problem's title and patterns for coding, subjects for theory, the design prompt and the
// workspace so far, or the behavioral questions), and the candidate's current code.
import { CODE_LANGUAGE_LABEL, normalizeLanguage } from "@/components/ui/code/languages";
import { BEHAVIORAL_QUESTIONS } from "@/data/behavioral.seed";
import { seedProblemById } from "@/data/seed";
import { subjectById } from "@/data/syllabus";
import type { ContextBlock } from "@/lib/ai/context";
import { designKind, filledSections } from "@/lib/designs/designs";
import { mockBrief, type MockBriefInput } from "@/lib/mock/brief";
import { problemInfo } from "@/lib/problems/catalog";
import type { MockSession } from "@/lib/types";
import { findConcept } from "@/stores/customConceptStore";
import { useDesignStore } from "@/stores/designStore";
import { useProblemStore } from "@/stores/problemStore";
import { codeContext, learnerContext, problemContextLabel } from "../ai/gather";

export function languageLabel(language: string | undefined): string {
  const lang = normalizeLanguage(language ?? "cpp");
  return CODE_LANGUAGE_LABEL[lang] ?? language ?? "C++";
}

export const questionText = (id: string) =>
  BEHAVIORAL_QUESTIONS.find((q) => q.id === id)?.text ?? id;

/** The brief's inputs from the stores; null when the session points at something unknown. */
export function briefInput(
  session: MockSession,
  options: { withCode?: boolean } = {},
): MockBriefInput | null {
  switch (session.kind) {
    case "dsa": {
      const id = session.topicOrProblemId;
      const info = id ? problemInfo(id, useProblemStore.getState().states[id]) : undefined;
      if (!info) return null;
      return {
        kind: "dsa",
        problem: {
          label: problemContextLabel(info),
          difficulty: info.difficulty,
          patterns: info.conceptIds.map((c) => findConcept(c)?.name ?? c),
          leetcode: info.source === "leetcode",
        },
        language: languageLabel(session.language),
        ...(options.withCode ? { code: session.code } : {}),
      };
    }
    case "theory":
      return {
        kind: "theory",
        subjects: (session.subjects ?? []).map((s) => subjectById.get(s)?.name ?? s),
      };
    case "design": {
      const p = session.topicOrProblemId
        ? seedProblemById.get(session.topicOrProblemId)
        : undefined;
      if (!p) return null;
      const attempt = session.designAttemptId
        ? useDesignStore.getState().attempts[session.designAttemptId]
        : undefined;
      return {
        kind: "design",
        design: {
          title: p.title,
          lld: designKind(p) === "lld",
          prompt: p.prompt ?? p.title,
          rubric: p.rubric ?? [],
        },
        sections: attempt ? filledSections(designKind(p), attempt.sections) : undefined,
      };
    }
    case "behavioral":
      return { kind: "behavioral", questions: (session.questionIds ?? []).map(questionText) };
  }
}

/** Context blocks for a turn: the learner, the brief, and the code (trimmed first if needed). */
export function mockBlocks(session: MockSession): ContextBlock[] {
  const input = briefInput(session);
  const near =
    session.kind === "dsa" && session.topicOrProblemId
      ? findConcept(
          problemInfo(
            session.topicOrProblemId,
            useProblemStore.getState().states[session.topicOrProblemId],
          )?.conceptIds[0] ?? "",
        )
      : undefined;
  const blocks: ContextBlock[] = [learnerContext(near)];
  if (input) blocks.push({ kind: "other", text: mockBrief(input) });
  if (session.kind === "dsa") {
    const code = codeContext(languageLabel(session.language), session.code ?? "");
    if (code) blocks.push(code);
  }
  return blocks;
}

/** The design round's sections by label, for the feedback transcript. */
export function designSectionsFor(session: MockSession): Record<string, string> | undefined {
  if (session.kind !== "design" || !session.designAttemptId || !session.topicOrProblemId)
    return undefined;
  const p = seedProblemById.get(session.topicOrProblemId);
  const attempt = useDesignStore.getState().attempts[session.designAttemptId];
  return p && attempt ? filledSections(designKind(p), attempt.sections) : undefined;
}
