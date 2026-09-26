// Quick quizzes (F14), the pure parts: cleaning up Claude's questions before showing them, marking
// multiple choice, and turning per-question scores into one check per concept.
import type { QuizQuestion, ShortAnswerGrade } from "@/lib/ai/schemas";

export const QUIZ_SIZE = 5;

/**
 * Keeps only questions the app can show and grade: a multiple choice question needs 2 or more
 * distinct options and a valid answer index; every question gets a concept from the quiz (an
 * unknown id falls back to the first concept). At most QUIZ_SIZE.
 */
export function cleanQuiz(
  questions: readonly QuizQuestion[],
  conceptIds: readonly string[],
): QuizQuestion[] {
  const allowed = new Set(conceptIds);
  const fallback = conceptIds[0] ?? "";
  const out: QuizQuestion[] = [];
  for (const q of questions) {
    if (!q.question.trim()) continue;
    const conceptId = allowed.has(q.conceptId) ? q.conceptId : fallback;
    if (q.type === "mcq") {
      const options = q.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 2 || new Set(options).size !== options.length) continue;
      if (q.answerIndex < 0 || q.answerIndex >= options.length) continue;
      out.push({ ...q, options, conceptId });
    } else {
      if (!q.modelAnswer.trim()) continue;
      out.push({ ...q, conceptId });
    }
    if (out.length >= QUIZ_SIZE) break;
  }
  return out;
}

export type QuizAnswer = { choice?: number; text?: string };

export interface QuizItemResult {
  index: number;
  conceptId: string;
  score: number;
  feedback?: string;
}

/** Scores every question: multiple choice at once, short answers from Claude's (or own) grades. */
export function scoreQuiz(
  questions: readonly QuizQuestion[],
  answers: readonly QuizAnswer[],
  shortGrades: readonly ShortAnswerGrade[],
): QuizItemResult[] {
  const byIndex = new Map(shortGrades.map((g) => [g.index, g]));
  return questions.map((q, index) => {
    const answer = answers[index] ?? {};
    if (q.type === "mcq")
      return { index, conceptId: q.conceptId, score: answer.choice === q.answerIndex ? 1 : 0 };
    if (!answer.text?.trim())
      return { index, conceptId: q.conceptId, score: 0, feedback: "No answer given." };
    const grade = byIndex.get(index);
    return {
      index,
      conceptId: q.conceptId,
      score: Math.min(1, Math.max(0, grade?.score ?? 0)),
      feedback: grade?.feedback,
    };
  });
}

/** One check per concept: the average score of its questions, in first-seen order. */
export function quizChecks(
  results: readonly QuizItemResult[],
): { conceptId: string; score: number; count: number }[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const r of results) {
    const entry = map.get(r.conceptId) ?? { total: 0, count: 0 };
    entry.total += r.score;
    entry.count += 1;
    map.set(r.conceptId, entry);
  }
  return [...map.entries()].map(([conceptId, e]) => ({
    conceptId,
    score: e.total / e.count,
    count: e.count,
  }));
}
