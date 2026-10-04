// The Now card's steps (F32, part 2): each plan item broken into small steps, so the next thing
// to do is always written down. Ticks are kept on the plan item (`PlanItem.steps`), one boolean
// per step. A flashcard round has a step per concept (its cards come one at a time in the
// session); a parked thought is one thing, so it has no steps.
import type { PlanItem } from "@/lib/types";

const RESOLVE = [
  "Read the problem again",
  "Say your approach in one line",
  "Write the code",
  "Test with three inputs",
  "Save the attempt",
];
const NEW_PROBLEM = ["Read it", "Name the pattern", "Plan", "Code", "Test", "Save"];
const LEARN = ["Read Simple", "Read Interview", "One quick check", "Mark as studied"];
const REVIEW_ONE = ["Read the interview points", "Answer the cards one at a time", "Rate each card"];
const DRILL = ["Start the drill", "Name the pattern for each prompt", "Read what you missed"];
const MENTAL_MATH = ["Start the sprint", "Answer, or skip with Tab", "Look at your score"];
const MOCK = [
  "Start the interview",
  "Think out loud through each phase",
  "End the interview",
  "Read the feedback",
];
const DESIGN = ["Read the prompt", "Write the requirements", "Sketch the parts", "Review it"];
const STORY = ["Read the question", "Answer out loud in 2 minutes", "Check it against the list"];
const REVISION = ["Open the sheet", "Read it to the end"];

/** The concepts a flashcard round covers. */
export function itemConcepts(item: Pick<PlanItem, "refId" | "refIds">): string[] {
  return item.refIds?.length ? [...item.refIds] : item.refId ? [item.refId] : [];
}

/**
 * The steps of a plan item. `conceptName` names a flashcard round's concepts (the store passes
 * the syllabus and the owner's own concepts).
 */
export function stepsFor(
  item: Pick<PlanItem, "kind" | "refId" | "refIds">,
  conceptName: (id: string) => string = (id) => id,
): string[] {
  switch (item.kind) {
    case "resolve":
      return RESOLVE;
    case "new-problem":
      return NEW_PROBLEM;
    case "learn-concept":
      return LEARN;
    case "review-concept": {
      const ids = itemConcepts(item);
      return ids.length > 1 ? ids.map((id) => `Cards: ${conceptName(id)}`) : REVIEW_ONE;
    }
    case "drill":
      return DRILL;
    case "mental-math":
      return MENTAL_MATH;
    case "mock":
      return MOCK;
    case "design":
      return DESIGN;
    case "story":
      return STORY;
    case "revision":
      return REVISION;
    case "thought":
      return [];
  }
}

/** The item's ticks, one per step (missing ticks are false; extra ticks are dropped). */
export function ticksOf(item: Pick<PlanItem, "steps">, count: number): boolean[] {
  return Array.from({ length: count }, (_, i) => item.steps?.[i] === true);
}

/** Index of the first step not ticked, or -1 when all are. */
export function currentStep(ticks: readonly boolean[]): number {
  return ticks.findIndex((t) => !t);
}

/** Ticks with one step set (or cleared). */
export function withTick(ticks: readonly boolean[], index: number, on: boolean): boolean[] {
  return ticks.map((t, i) => (i === index ? on : t));
}

/** How many ticks are new in `after` compared with `before` (each new one drops ink). */
export function newTicks(before: readonly boolean[], after: readonly boolean[]): number {
  let n = 0;
  for (let i = 0; i < after.length; i++) if (after[i] && !before[i]) n++;
  return n;
}
