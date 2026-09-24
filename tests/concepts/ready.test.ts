// Section 11.5: "ready to learn", and 11.3 readiness scores used to rank it.
import { describe, expect, it } from "vitest";
import { conceptById, conceptsByTopic, topicById } from "@/data/syllabus";
import {
  conceptScore,
  overallReadiness,
  subjectReadiness,
  subjectWeight,
} from "@/lib/readiness/score";
import { isReady, rankReady, readiness, type ReadyContext } from "@/lib/recommend/ready";
import type { Concept, Status } from "@/lib/types";

const DIJKSTRA = conceptById.get("dsa.shortest-paths.dijkstras-algorithm")!;

function ctx(statuses: Record<string, Status> = {}, outOfScope: string[] = []): ReadyContext {
  return {
    statusOf: (id) => statuses[id] ?? "not_started",
    inScope: (c) => !outOfScope.includes(c.id),
  };
}

/** Marks the first `share` of a topic's must-know concepts as learning. */
function learnTopic(topicId: string, share: number, into: Record<string, Status>) {
  const musts = conceptsByTopic.get(topicId)!.filter((c) => c.importance === "must");
  musts.slice(0, Math.ceil(musts.length * share)).forEach((c) => (into[c.id] = "learning"));
  return musts.length;
}

describe("ready to learn", () => {
  it("needs the concept prerequisites and 60% of each prerequisite topic's must-knows", () => {
    const statuses: Record<string, Status> = {};
    expect(isReady(DIJKSTRA, ctx(statuses))).toBe(false);
    statuses["dsa.heaps.binary-heap"] = "strong";
    learnTopic("dsa.heaps", 0.6, statuses);
    learnTopic("dsa.graph-basics", 0.6, statuses);
    expect(isReady(DIJKSTRA, ctx(statuses))).toBe(true);
  });

  it("reports what is missing", () => {
    const statuses: Record<string, Status> = { "dsa.heaps.binary-heap": "learning" };
    learnTopic("dsa.heaps", 1, statuses);
    const total = learnTopic("dsa.graph-basics", 0.3, statuses);
    const r = readiness(DIJKSTRA, ctx(statuses));
    expect(r.ready).toBe(false);
    expect(r.missingConcepts).toEqual([]);
    expect(r.missingTopics).toEqual([
      { topicId: "dsa.graph-basics", learned: Math.ceil(total * 0.3), total },
    ]);
  });

  it("does not count fading prerequisites as learned", () => {
    const statuses: Record<string, Status> = { "dsa.heaps.binary-heap": "fading" };
    learnTopic("dsa.heaps", 1, statuses);
    statuses["dsa.heaps.binary-heap"] = "fading";
    learnTopic("dsa.graph-basics", 1, statuses);
    expect(readiness(DIJKSTRA, ctx(statuses)).missingConcepts).toEqual(["dsa.heaps.binary-heap"]);
  });

  it("ignores prerequisites outside the owner's scope", () => {
    const heapMusts = conceptsByTopic.get("dsa.heaps")!.filter((c) => c.importance === "must");
    const graphMusts = conceptsByTopic
      .get("dsa.graph-basics")!
      .filter((c) => c.importance === "must");
    const out = [...heapMusts, ...graphMusts].map((c) => c.id);
    // Out-of-scope prerequisites and topics with no must-knows in scope count as satisfied.
    expect(isReady(DIJKSTRA, ctx({}, out))).toBe(true);
  });

  it("is never true for a concept that is already started or out of scope", () => {
    // The first concept of a topic with no prerequisite topics (complexity analysis).
    const first = conceptsByTopic.get("dsa.complexity")![0]!;
    expect(first.prereqs).toEqual([]);
    expect(topicById.get(first.topicId)!.prereqTopics).toEqual([]);
    expect(isReady(first, ctx())).toBe(true);
    expect(isReady(first, ctx({ [first.id]: "learning" }))).toBe(false);
    expect(isReady(first, ctx({}, [first.id]))).toBe(false);
  });

  it("ranks must-know first, then focus subjects, then the subject with most to gain", () => {
    const pick = (id: string) => conceptById.get(id)!;
    const must = [...conceptById.values()].filter(
      (c) => c.prereqs.length === 0 && c.importance === "must",
    );
    const dsa = must.find((c) => c.subjectId === "dsa")!;
    const os = must.find((c) => c.subjectId === "os")!;
    const important = [...conceptById.values()].find(
      (c) => c.prereqs.length === 0 && c.importance === "important" && c.subjectId === "dsa",
    )!;
    const base = {
      ...ctx(),
      inScope: () => true,
      track: "sde" as const,
      focusSubjects: [] as string[],
      subjectReadiness: {},
    };
    const candidates: Concept[] = [important, os, dsa].map((c) => pick(c.id));
    // Topic prerequisites could make some unready; learn everything else first.
    const statusOf = (id: string): Status =>
      candidates.some((c) => c.id === id) ? "not_started" : "learning";
    const ranked = rankReady(candidates, { ...base, statusOf });
    // DSA has the larger SDE weight (34 vs 8), so with equal readiness it comes first.
    expect(ranked.map((c) => c.id)).toEqual([dsa.id, os.id, important.id]);
    const focused = rankReady(candidates, { ...base, statusOf, focusSubjects: ["os"] });
    expect(focused[0]!.id).toBe(os.id);
  });

  it("leaves out advanced concepts within 14 days of the interview", () => {
    const advanced = [...conceptById.values()].find(
      (c) => c.importance === "advanced" && c.prereqs.length === 0,
    )!;
    const base = {
      statusOf: (id: string): Status => (id === advanced.id ? "not_started" : "learning"),
      inScope: () => true,
      track: "both" as const,
      focusSubjects: [],
      subjectReadiness: {},
      today: "2026-09-24",
    };
    expect(rankReady([advanced], { ...base, interviewDate: "2026-12-01" })).toHaveLength(1);
    expect(rankReady([advanced], { ...base, interviewDate: "2026-10-05" })).toHaveLength(0);
  });
});

describe("readiness scores", () => {
  const base = {
    status: "learning" as Status,
    knowledge: 0.8,
    practice: 0.4,
    hasLinkedProblems: false,
    overdue: false,
    overdueDays: 0,
    overdueInterval: 12,
  };

  it("scores concepts from knowledge, practice and recency", () => {
    expect(conceptScore({ ...base, status: "not_started" })).toBe(0);
    expect(conceptScore(base)).toBeCloseTo(80);
    expect(conceptScore({ ...base, hasLinkedProblems: true })).toBeCloseTo(60);
    // 6 days overdue on a 12-day interval: 1 − 6/24 = 0.75.
    expect(conceptScore({ ...base, overdue: true, overdueDays: 6 })).toBeCloseTo(60);
    // Recency never drops below 0.5.
    expect(conceptScore({ ...base, overdue: true, overdueDays: 100 })).toBeCloseTo(40);
  });

  it("weights subjects by importance and tracks by the subject table", () => {
    const concepts = [
      { id: "a", importance: "must" as const },
      { id: "b", importance: "advanced" as const },
    ];
    const scores: Record<string, number> = { a: 90, b: 0 };
    expect(subjectReadiness(concepts, (id) => scores[id]!)).toBeCloseTo((3 * 90) / 3.5);
    expect(subjectReadiness([], () => 50)).toBe(0);
    expect(subjectWeight("dsa", "sde")).toBe(34);
    expect(subjectWeight("dsa", "both")).toBe(29);
    expect(subjectWeight("prob", "sde")).toBe(0);
    // prob has no SDE weight, so it doesn't count for SDE.
    expect(overallReadiness({ dsa: 50, prob: 100 }, "sde")).toBeCloseTo(50);
    expect(overallReadiness({ dsa: 50, prob: 100 }, "quant")).toBeCloseTo(
      (24 * 50 + 22 * 100) / 46,
    );
  });
});
