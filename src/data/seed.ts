// All seed problems in one list (LeetCode, quant puzzles, design prompts) with lookups.
import type { SeedProblem } from "@/lib/types";
import { DESIGN_PROBLEMS } from "./designs.seed";
import { LEETCODE_PROBLEMS } from "./problems.seed";
import { QUANT_PUZZLES } from "./quant.seed";

export const SEED_PROBLEMS: readonly SeedProblem[] = [
  ...LEETCODE_PROBLEMS,
  ...QUANT_PUZZLES,
  ...DESIGN_PROBLEMS,
];

export const seedProblemById: ReadonlyMap<string, SeedProblem> = new Map(
  SEED_PROBLEMS.map((p) => [p.id, p]),
);

/** Seed problems tagged with each concept (for the concept panel's Practice tab). */
export const seedProblemsByConcept: ReadonlyMap<string, SeedProblem[]> = (() => {
  const map = new Map<string, SeedProblem[]>();
  for (const p of SEED_PROBLEMS) {
    for (const c of p.conceptIds) {
      const list = map.get(c);
      if (list) list.push(p);
      else map.set(c, [p]);
    }
  }
  return map;
})();
