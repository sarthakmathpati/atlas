// The one-line intention of a focus block (F31): "In this block I will…", filled in from the
// plan item or the page the owner is on ("Re-solve 69. Sqrt(x)").
import type { PlanItem } from "@/lib/types";

export const INTENTION_MAX = 140;

/** The part of a plan title after its label ("Re-solve: 69. Sqrt(x)" → "69. Sqrt(x)"). */
function subjectOf(title: string): string {
  return title.replace(/^[^:]{1,24}:\s*/, "").trim();
}

/** A plan item as something to do in a block. */
export function intentionForItem(item: Pick<PlanItem, "kind" | "title">): string {
  const rest = subjectOf(item.title);
  switch (item.kind) {
    case "resolve":
      return `Re-solve ${rest}`;
    case "new-problem":
      return `Solve ${rest}`;
    case "learn-concept":
      return `Learn ${rest}`;
    case "review-concept":
      return /^Flashcards:/.test(item.title) ? `Review ${rest} with flashcards` : `Review ${rest}`;
    case "drill":
      return "Finish a pattern drill";
    case "mental-math":
      return "Finish a mental math sprint";
    case "revision":
      return `Read ${rest || "the revision sheet"}`;
    case "mock":
      return `Do a ${rest} mock interview`;
    case "design":
      return `Design ${rest}`;
    case "story":
      return "Practice one behavioral answer";
    case "thought":
      return item.title;
  }
}

/** Trims a line to one short sentence without a trailing full stop. */
export function cleanIntention(line: string): string {
  return line.replace(/\s+/g, " ").trim().slice(0, INTENTION_MAX);
}
