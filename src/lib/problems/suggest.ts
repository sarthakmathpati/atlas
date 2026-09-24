// "Suggested next problem" for a concept (F3 Practice tab, and the planner later): easy first,
// medium once two easy ones are solved alone, hard once three medium ones are solved alone.
// Picks an unsolved problem (never tried before one tried and not solved), in syllabus order.
import type { Difficulty, ProblemState } from "@/lib/types";
import type { ProblemInfo } from "./catalog";

export interface Ramp {
  easySolo: number;
  mediumSolo: number;
  target: Difficulty;
}

function solvedAloneEver(state: ProblemState | undefined): boolean {
  return Boolean(state?.attempts.some((a) => a.result === "solved_alone"));
}

export function difficultyRamp(
  problems: readonly ProblemInfo[],
  states: Readonly<Record<string, ProblemState>>,
): Ramp {
  let easySolo = 0;
  let mediumSolo = 0;
  for (const p of problems) {
    if (!solvedAloneEver(states[p.id])) continue;
    if (p.difficulty === "easy") easySolo++;
    else if (p.difficulty === "medium") mediumSolo++;
  }
  const target: Difficulty = easySolo < 2 ? "easy" : mediumSolo < 3 ? "medium" : "hard";
  return { easySolo, mediumSolo, target };
}

const FALLBACK: Record<Difficulty, Difficulty[]> = {
  easy: ["easy", "medium", "hard"],
  medium: ["medium", "hard", "easy"],
  hard: ["hard", "medium", "easy"],
};

export function suggestNextProblem(
  problems: readonly ProblemInfo[],
  states: Readonly<Record<string, ProblemState>>,
  options: { hidePremium?: boolean } = {},
): ProblemInfo | undefined {
  const ramp = difficultyRamp(problems, states);
  const open = problems
    .filter((p) => states[p.id]?.status !== "solved")
    .filter((p) => !(options.hidePremium && p.premium))
    .sort(
      (a, b) =>
        Number(Boolean(states[a.id]?.attempts.length)) -
          Number(Boolean(states[b.id]?.attempts.length)) || a.order - b.order,
    );
  for (const d of FALLBACK[ramp.target]) {
    const pick = open.find((p) => p.difficulty === d);
    if (pick) return pick;
  }
  return undefined;
}
