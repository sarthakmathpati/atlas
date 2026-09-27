// Plan item kinds (section 4.2 PlanItem.kind) and which of them have a working screen today.
//
// The planner (section 11.4) knows every kind, and tests exercise all of them. A kind is planned
// only once its screen works, so Start never leads to a page that can't do the thing yet
// (CLAUDE.md decision 85). Phase 8 added mental math, story practice, design practice and mocks.
import type { PlanItem } from "@/lib/types";

export type PlanKind = PlanItem["kind"];

export const ALL_PLAN_KINDS: readonly PlanKind[] = [
  "revision",
  "resolve",
  "review-concept",
  "learn-concept",
  "new-problem",
  "drill",
  "mental-math",
  "design",
  "mock",
  "story",
];

/** Kinds whose Start button opens a screen that does the thing today. */
export const AVAILABLE_PLAN_KINDS: ReadonlySet<PlanKind> = new Set<PlanKind>([
  "revision",
  "resolve",
  "review-concept",
  "learn-concept",
  "new-problem",
  "drill",
  "mental-math",
]);

/** Display order in the plan: revision first near the interview, reviews, learning, practice. */
export const KIND_ORDER: Record<PlanKind, number> = Object.fromEntries(
  ALL_PLAN_KINDS.map((k, i) => [k, i]),
) as Record<PlanKind, number>;

/** Every concept or problem an item points at (its refId and bundle refIds). */
export function refsOf(item: Pick<PlanItem, "refId" | "refIds" | "kind">): string[] {
  const refs = new Set<string>();
  if (item.refId) refs.add(item.refId);
  for (const r of item.refIds ?? []) refs.add(r);
  // Kinds without a reference (a drill, a mock) are one per day: the kind is the reference.
  if (refs.size === 0) refs.add(`kind:${item.kind}`);
  return [...refs];
}
