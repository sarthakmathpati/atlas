// Status mixes for topic bubbles, subject regions and the list view (section 11.2: "topic and
// subject summaries are counts and shares of these statuses over the concepts in the track").
import type { Status } from "@/lib/types";

export type StatusCounts = Record<Status, number>;

export function emptyCounts(): StatusCounts {
  return { not_started: 0, learning: 0, strong: 0, fading: 0 };
}

export function countStatuses(
  ids: Iterable<string>,
  statusOf: (id: string) => Status,
): StatusCounts {
  const counts = emptyCounts();
  for (const id of ids) counts[statusOf(id)]++;
  return counts;
}

export function totalOf(counts: StatusCounts): number {
  return counts.not_started + counts.learning + counts.strong + counts.fading;
}

/** Share of concepts that are strong (a subject's progress ring). */
export function strongShare(counts: StatusCounts): number {
  const total = totalOf(counts);
  return total > 0 ? counts.strong / total : 0;
}
