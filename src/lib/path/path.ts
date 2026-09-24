// Path to a concept (F25): "I want to learn Dijkstra. What do I need first?"
//
// The path is every unmet prerequisite, in an order you can learn them:
//   - the concept's prerequisites, followed transitively;
//   - the must-know concepts of its topic's prerequisite topics (and their prerequisites);
//   - minus anything already learning or strong. A learned concept ends that branch: what it
//     needed is behind you.
// Prerequisites outside the owner's scope (another track, hidden, another language) are skipped.
// The target comes last. Order: prerequisites first, ties by subject, topic and learning order.
import { conceptsByTopic, subjectById, topicById } from "@/data/syllabus";
import type { Concept, Status } from "@/lib/types";
import { isLearnedStatus } from "../recommend/ready";

export interface PathContext {
  getConcept: (id: string) => Concept | undefined;
  statusOf: (id: string) => Status;
  inScope: (concept: Concept) => boolean;
}

export interface PathStep {
  concept: Concept;
  status: Status;
  minutes: number;
  /** The concept the path leads to (always last). */
  target: boolean;
}

export interface ConceptPath {
  steps: PathStep[];
  /** Minutes for every step, the target included. */
  totalMinutes: number;
  /** How many steps come before the target. */
  before: number;
}

function sortKey(c: Concept): [number, number, number] {
  return [
    subjectById.get(c.subjectId)?.order ?? 999,
    topicById.get(c.topicId)?.order ?? 999,
    c.order,
  ];
}

function compare(a: Concept, b: Concept): number {
  const ka = sortKey(a);
  const kb = sortKey(b);
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
}

export function pathTo(targetId: string, ctx: PathContext): ConceptPath | null {
  const target = ctx.getConcept(targetId);
  if (!target) return null;
  const needed = new Map<string, Concept>();

  const want = (c: Concept | undefined) => {
    if (!c || c.id === target.id || needed.has(c.id) || !ctx.inScope(c)) return;
    if (isLearnedStatus(ctx.statusOf(c.id))) return;
    needed.set(c.id, c);
    for (const p of c.prereqs) want(ctx.getConcept(p));
  };

  for (const p of target.prereqs) want(ctx.getConcept(p));
  for (const topicId of topicById.get(target.topicId)?.prereqTopics ?? []) {
    for (const c of conceptsByTopic.get(topicId) ?? []) {
      if (c.importance === "must") want(c);
    }
  }

  // Topological order (Kahn), choosing the earliest in syllabus order among the available.
  const pending = new Map<string, Set<string>>();
  for (const c of needed.values()) {
    pending.set(c.id, new Set(c.prereqs.filter((p) => needed.has(p))));
  }
  const ordered: Concept[] = [];
  while (pending.size > 0) {
    let next: Concept | undefined;
    for (const [id, deps] of pending) {
      if (deps.size > 0) continue;
      const c = needed.get(id)!;
      if (!next || compare(c, next) < 0) next = c;
    }
    if (!next) break; // the syllabus build rejects cycles; stop rather than loop forever
    ordered.push(next);
    pending.delete(next.id);
    for (const deps of pending.values()) deps.delete(next.id);
  }

  const steps: PathStep[] = [...ordered, target].map((c) => ({
    concept: c,
    status: ctx.statusOf(c.id),
    minutes: c.estMinutes,
    target: c.id === target.id,
  }));
  return {
    steps,
    totalMinutes: steps.reduce((n, s) => n + s.minutes, 0),
    before: ordered.length,
  };
}
