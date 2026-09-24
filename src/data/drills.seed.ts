// Pattern drill prompts (BUILD_SPEC.md 8.3, F10): original 2 to 4 sentence mini-problems in
// everyday settings, never rewordings of known platform problems. Each names the pattern
// concept(s) that solve it and the key insight.
//
// Phase 5 writes the full bank: at least 270 prompts, three or more for each of the 90 DSA
// patterns. Until then the drill runs on these prompts plus any the owner generates with Claude.
import type { DrillPrompt } from "@/lib/types";

export const DRILL_PROMPTS: readonly DrillPrompt[] = [
  {
    id: "drill-delivery-minutes",
    text: "A delivery app logs how many orders arrive each minute. Find the longest stretch of consecutive minutes where the total stayed at or below 500 orders.",
    answerConceptIds: ["dsa.sliding-window.variable-size-window"],
    keyInsight:
      "All values are non-negative, so shrink from the left whenever the sum exceeds 500.",
    difficulty: "easy",
  },
  {
    id: "drill-cancel-meetings",
    text: "You have a list of meeting times for one room and want to know the fewest meetings to cancel so the rest don't overlap.",
    answerConceptIds: ["dsa.intervals.interval-scheduling"],
    keyInsight: "Keep the meetings that end earliest; every overlap you skip is one cancellation.",
    difficulty: "medium",
  },
];
