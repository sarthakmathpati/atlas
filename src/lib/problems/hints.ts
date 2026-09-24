// The offline hint ladder (F11 without AI), built from seed data:
//   1. Nudge: the broad area, a clue (the pattern's first signal) and a guiding question.
//   2. Approach: the pattern's name, what it covers, and how to spot it.
//   3. Pseudocode: the pattern's template, or a step outline until the template is written.
// With Claude (phase 6) each level is generated for the problem and cached in ProblemState.hints.
import { hintsForTopic } from "@/data/hintLadder";
import { conceptById } from "@/data/syllabus";
import type { ConceptContent } from "@/lib/types";
import type { ProblemInfo } from "./catalog";

export type HintLevelNumber = 1 | 2 | 3;

export interface HintLevel {
  level: HintLevelNumber;
  title: string;
  /** Markdown. */
  markdown: string;
}

export const HINT_TITLES: Record<HintLevelNumber, string> = {
  1: "Nudge",
  2: "Approach",
  3: "Pseudocode",
};

// Lowercase a leading capital, but not an acronym such as "BFS" or "XOR".
const lowerFirst = (s: string) =>
  /^[A-Z][^A-Z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
const trimDot = (s: string) => s.replace(/[.\s]+$/, "");

/**
 * The three offline levels. `primaryContent` is the text of the first linked pattern (loaded with
 * data/content.ts); without it the ladder falls back to the topic's outline.
 */
export function buildOfflineHints(
  info: Pick<ProblemInfo, "conceptIds" | "topicId">,
  primaryContent?: ConceptContent,
): HintLevel[] {
  const concepts = info.conceptIds
    .map((id) => conceptById.get(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const primary = concepts[0];
  const hints = hintsForTopic(primary?.topicId ?? info.topicId);
  const signals = primaryContent?.signals ?? [];

  const question = signals[0]
    ? `A clue to look for: ${lowerFirst(trimDot(signals[0]))}. ${hints.nudge}`
    : hints.nudge;
  const nudge = `**Area:** ${hints.area}\n\n${question}`;

  let approach: string;
  if (!primary) {
    approach = [
      "No pattern is linked to this problem yet, so here is a general checklist.",
      "",
      "- Lookups repeated many times: a hash map or set.",
      "- Sorted data or pairs: two pointers or binary search.",
      "- A contiguous range: a sliding window or prefix sums.",
      "- Connections between things: a graph with BFS or DFS.",
      "- The same subproblem solved again and again: dynamic programming.",
      "",
      "Add patterns to this problem to get a more specific hint next time.",
    ].join("\n");
  } else {
    const others = concepts.slice(1).map((c) => `**${c.name}**`);
    const lines = [
      `Try **${primary.name}**.${others.length ? ` It may also help to think about ${others.join(" and ")}.` : ""}`,
      "",
      `What it covers: ${trimDot(primary.scope)}.`,
    ];
    if (signals.length) {
      lines.push("", "You can often spot it by:", ...signals.map((s) => `- ${s}`));
    }
    approach = lines.join("\n");
  }

  const template = primaryContent?.template;
  const pseudocode =
    primary && template
      ? `Adapt the template for **${primary.name}** to this problem:\n\n${template}`
      : [
          ...hints.outline.map((step, i) => `${i + 1}. ${step}`),
          ...(primary
            ? [
                "",
                `The full template for ${primary.name} is still being written; these steps cover the usual shape.`,
              ]
            : []),
        ].join("\n");

  return [
    { level: 1, title: HINT_TITLES[1], markdown: nudge },
    { level: 2, title: HINT_TITLES[2], markdown: approach },
    { level: 3, title: HINT_TITLES[3], markdown: pseudocode },
  ];
}
