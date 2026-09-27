// Quant puzzle practice (BUILD_SPEC.md F28): the library's filters and the rules that turn a
// checked or graded answer into an honest attempt result. Checkable puzzles are solved only once
// the typed answer checks out; open-ended ones once Claude or the owner (against the answer note)
// has graded the answer. Hints and a revealed answer limit the result, as in the workspace (F7).
import type { AttemptResult, ProblemState, PuzzleGrade, PuzzleProgress } from "@/lib/types";
import type { ProblemInfo } from "@/lib/problems/catalog";
import { checkAnswer } from "./answerCheck";

/** Subjects whose topics hold quant puzzles, in library order. */
export const PUZZLE_SUBJECTS = ["prob", "math", "puzzles", "markets"] as const;

export type PuzzleStatus = "todo" | "attempted" | "solved" | "mastered";

export function puzzleStatus(state: ProblemState | undefined): PuzzleStatus {
  if (!state) return "todo";
  if (state.srs.retired) return "mastered";
  return state.status;
}

/** Open-ended puzzles have no checkable answer (`answer: null`). */
export function isOpenEnded(info: Pick<ProblemInfo, "answer">): boolean {
  return info.answer === null || info.answer === undefined;
}

export interface PuzzleFilters {
  /** A subject id ("prob") or a topic id ("prob.expected-value"). */
  topic?: string;
  difficulty?: ProblemInfo["difficulty"];
  status?: PuzzleStatus;
  kind?: "checked" | "open";
}

export function filterPuzzles(
  list: readonly ProblemInfo[],
  states: Readonly<Record<string, ProblemState>>,
  f: PuzzleFilters,
): ProblemInfo[] {
  return list.filter((p) => {
    if (f.topic) {
      const t = p.topicId ?? "";
      if (t !== f.topic && !t.startsWith(`${f.topic}.`)) return false;
    }
    if (f.difficulty && p.difficulty !== f.difficulty) return false;
    if (f.status && puzzleStatus(states[p.id]) !== f.status) return false;
    if (f.kind === "open" && !isOpenEnded(p)) return false;
    if (f.kind === "checked" && isOpenEnded(p)) return false;
    return true;
  });
}

// ----- one attempt ---------------------------------------------------------------------------------

export type PuzzleCheck =
  | { verdict: "correct" | "incorrect"; progress: PuzzleProgress }
  | { verdict: "unreadable"; progress: PuzzleProgress };

/** Checks a typed answer against a checkable puzzle and counts the try (unreadable ones don't). */
export function checkPuzzleAnswer(
  expected: string,
  typed: string,
  progress: PuzzleProgress | undefined,
): PuzzleCheck {
  const base: PuzzleProgress = progress ?? { answer: "", tries: 0 };
  const verdict = checkAnswer(typed, expected);
  if (verdict === "unreadable") return { verdict, progress: { ...base, answer: typed } };
  return {
    verdict,
    progress: {
      ...base,
      answer: typed.trim(),
      tries: base.tries + 1,
      verdict,
      ...(verdict === "correct" && !base.firstCorrectTry
        ? { firstCorrectTry: base.tries + 1 }
        : {}),
    },
  };
}

/** Claude's grade (prompt 16) as the grade kept with the attempt. */
export function gradeFromClaude(g: PuzzleGrade): NonNullable<PuzzleProgress["grade"]> {
  return {
    by: "claude",
    correct: g.correct,
    score: Math.min(1, Math.max(0, g.score)),
    feedback: g.feedback,
    idealReasoning: g.idealReasoning,
  };
}

export const SELF_GRADES = {
  had: { label: "I had it", score: 1, correct: true },
  partly: { label: "Partly", score: 0.5, correct: false },
  missed: { label: "I missed it", score: 0, correct: false },
} as const;
export type SelfGrade = keyof typeof SELF_GRADES;

export function selfGrade(which: SelfGrade): NonNullable<PuzzleProgress["grade"]> {
  const g = SELF_GRADES[which];
  return { by: "self", correct: g.correct, score: g.score };
}

export interface PuzzleOutcome {
  /** The result the save dialog starts with (null: the owner chooses). */
  suggested: AttemptResult | null;
  /** Why "solved" results are locked, if they are. */
  solvedLock: string | null;
  /** Why "solved alone" is locked while "solved with hints" is allowed (a partly right grade). */
  aloneLock: string | null;
  /** Short line for the answer box ("Checked: correct on the 2nd try"). */
  summary: string | null;
}

const ORDINAL = ["", "first", "second", "third"];

/**
 * What an attempt on a puzzle may honestly be saved as. Checkable: solved only after the answer
 * checks out (alone unless hints were used). Open-ended: after a grade; a score of 0.8 or more
 * that is marked correct is a solve, 0.4 or more is a solve with help, less is not solved.
 * A revealed answer ("Show the answer") always means "saw the solution".
 */
export function puzzleOutcome(
  info: Pick<ProblemInfo, "answer">,
  progress: PuzzleProgress | undefined,
  session: { hintsUsed: number; sawSolution: boolean },
): PuzzleOutcome {
  if (session.sawSolution) {
    return {
      suggested: "saw_solution",
      solvedLock: "You saw the answer during this attempt.",
      aloneLock: null,
      summary: null,
    };
  }
  const helped = session.hintsUsed > 0;
  if (!isOpenEnded(info)) {
    if (progress?.verdict === "correct") {
      const n = progress.firstCorrectTry ?? progress.tries;
      return {
        suggested: helped ? "solved_with_hints" : "solved_alone",
        solvedLock: null,
        aloneLock: null,
        summary: `Correct${n > 1 ? ` on the ${ORDINAL[n] ?? `${n}th`} try` : ""}.`,
      };
    }
    if (progress?.verdict === "incorrect") {
      return {
        suggested: null,
        solvedLock: "Your last answer didn't match. Check a corrected answer first.",
        aloneLock: null,
        summary: `Not yet: ${progress.tries} ${progress.tries === 1 ? "try" : "tries"} so far.`,
      };
    }
    return {
      suggested: null,
      solvedLock: "Check your answer first.",
      aloneLock: null,
      summary: null,
    };
  }
  const g = progress?.grade;
  if (!g) {
    return {
      suggested: null,
      solvedLock: "Grade your answer first, with Claude or against the answer note.",
      aloneLock: null,
      summary: null,
    };
  }
  const who = g.by === "claude" ? "Claude" : "You";
  if (g.correct && g.score >= 0.8) {
    return {
      suggested: helped ? "solved_with_hints" : "solved_alone",
      solvedLock: null,
      aloneLock: null,
      summary: `${who} marked it right.`,
    };
  }
  if (g.score >= 0.4) {
    return {
      suggested: "solved_with_hints",
      solvedLock: null,
      aloneLock: "It was graded as partly right.",
      summary: `${who} marked it partly right.`,
    };
  }
  return {
    suggested: "not_solved",
    solvedLock: "The grade says it isn't solved yet.",
    aloneLock: null,
    summary: `${who} marked it as missed.`,
  };
}
