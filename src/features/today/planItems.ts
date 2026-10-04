// Facts about a plan item that Up next, the route and ADHD mode's Now card share: its subject,
// a problem's difficulty, and whether it can be swapped.
import { subjectById, topicById } from "@/data/syllabus";
import { problemInfo } from "@/lib/problems/catalog";
import type { Difficulty, PlanItem, ProblemState, Subject } from "@/lib/types";
import { findConcept } from "@/stores/customConceptStore";

type Problems = Readonly<Record<string, ProblemState>>;

/** The subject an item belongs to (its concept, or its problem's first concept or topic). */
export function itemSubject(
  item: PlanItem,
  problems: Problems,
): Subject | undefined {
  const ref = item.refIds?.[0] ?? item.refId;
  if (!ref) return item.kind === "story" ? subjectById.get("career") : undefined;
  if (item.kind === "resolve" || item.kind === "new-problem" || item.kind === "design") {
    const info = problemInfo(ref, problems[ref]);
    const concept = info?.conceptIds[0] ? findConcept(info.conceptIds[0]) : undefined;
    const subjectId =
      concept?.subjectId ?? (info?.topicId ? topicById.get(info.topicId)?.subjectId : undefined);
    return subjectId ? subjectById.get(subjectId) : undefined;
  }
  if (item.kind === "story") return subjectById.get("career");
  const concept = findConcept(ref);
  return concept ? subjectById.get(concept.subjectId) : undefined;
}

export function itemDifficulty(
  item: PlanItem,
  problems: Problems,
): Difficulty | undefined {
  if (item.kind !== "resolve" && item.kind !== "new-problem") return undefined;
  return item.refId ? problemInfo(item.refId, problems[item.refId])?.difficulty : undefined;
}

export const swappable = (item: PlanItem) =>
  item.kind !== "drill" && item.kind !== "mental-math" && item.kind !== "thought";
