// The memory walk (F31): a topic's or subject's flashcards come in the order of a walk through
// the concepts' places on the map, so ideas are revisited as places (the method of loci applied
// to review order). A nearest-neighbour tour from a start concept: from each stop, go to the
// closest place not yet visited (ties keep the given order). Concepts without a place come last.
export interface Point {
  x: number;
  y: number;
}

export function memoryWalk(
  ids: readonly string[],
  placeOf: (id: string) => Point | undefined,
  startId: string,
): string[] {
  const placed: { id: string; p: Point; i: number }[] = [];
  const unplaced: string[] = [];
  ids.forEach((id, i) => {
    const p = placeOf(id);
    if (p) placed.push({ id, p, i });
    else unplaced.push(id);
  });
  if (placed.length === 0) return [...ids];
  const route: string[] = [];
  let current = placed.find((x) => x.id === startId) ?? placed[0]!;
  const left = placed.filter((x) => x !== current);
  route.push(current.id);
  while (left.length > 0) {
    let best = 0;
    let bestDist = Infinity;
    for (let k = 0; k < left.length; k++) {
      const q = left[k]!;
      const d = (q.p.x - current.p.x) ** 2 + (q.p.y - current.p.y) ** 2;
      if (d < bestDist || (d === bestDist && q.i < left[best]!.i)) {
        best = k;
        bestDist = d;
      }
    }
    current = left.splice(best, 1)[0]!;
    route.push(current.id);
  }
  return [...route, ...unplaced];
}

/** Total length of a route (for tests and the strip's scale). */
export function walkLength(route: readonly string[], placeOf: (id: string) => Point | undefined) {
  let total = 0;
  for (let k = 1; k < route.length; k++) {
    const a = placeOf(route[k - 1]!);
    const b = placeOf(route[k]!);
    if (a && b) total += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return total;
}

/**
 * The order of a flashcard session's concepts on a memory walk. A session reaches its first
 * `covered` concepts (the rest get no card), so those are chosen as before and only their order
 * changes: the walk starts from the one that comes first in the syllabus (a topic's first
 * concept in topic order).
 */
export function walkDeckOrder(
  ids: readonly string[],
  placeOf: (id: string) => Point | undefined,
  syllabusIndex: (id: string) => number,
  covered: number,
): string[] {
  const head = ids.slice(0, covered);
  if (head.length === 0) return [...ids];
  const start = head.reduce((best, id) => (syllabusIndex(id) < syllabusIndex(best) ? id : best));
  return [...memoryWalk(head, placeOf, start), ...ids.slice(covered)];
}
