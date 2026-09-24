// F9: the review queue is correct across day boundaries and sorted by urgency.
import { describe, expect, it } from "vitest";
import { buildReviewQueue, dueReason } from "@/lib/review/queue";
import type { ConceptState, ProblemState } from "@/lib/types";
import { makeAttempt, makeProblem } from "../fixtures/userData";

function problem(
  id: string,
  srs: Partial<ProblemState["srs"]>,
  extra: Partial<ProblemState> = {},
): ProblemState {
  return {
    ...makeProblem(id, 1),
    srs: { step: 1, lapses: 0, soloStreak: 1, ...srs },
    inReview: true,
    ...extra,
  };
}

const concept = (id: string, dueAt: string, extra: Partial<ConceptState> = {}): ConceptState => ({
  conceptId: id,
  status: "learning",
  everStrong: false,
  studied: true,
  knowledge: 0.3,
  srs: { step: 0, dueAt, lapses: 0, soloStreak: 0 },
  updatedAt: "2026-09-01T00:00:00Z",
  ...extra,
});

describe("buildReviewQueue", () => {
  const problems = {
    "lc-1": problem("lc-1", { dueAt: "2026-09-24" }),
    "lc-743": problem("lc-743", { dueAt: "2026-09-20", lapses: 2 }),
    "lc-70": problem("lc-70", { dueAt: "2026-09-25" }),
    "lc-2": problem("lc-2", { dueAt: "2026-09-10" }, { inReview: false }),
    "lc-3": problem("lc-3", { dueAt: "2026-09-10", retired: true }),
    "lc-4": problem("lc-4", { dueAt: "2026-10-30" }),
  };
  const concepts = {
    "dsa.graph-basics.bfs": concept("dsa.graph-basics.bfs", "2026-09-22"),
    "dsa.graph-basics.dfs": concept("dsa.graph-basics.dfs", "2026-09-30"),
    "dsa.trees.tree-terminology": concept("dsa.trees.tree-terminology", "2026-09-01", {
      hidden: true,
    }),
  };

  it("lists due problems, most urgent first, leaving out retired and switched-off ones", () => {
    const q = buildReviewQueue(problems, concepts, "normal", "2026-09-24");
    expect(q.problems.map((p) => p.info.id)).toEqual(["lc-743", "lc-1"]);
    expect(q.problems[0]).toMatchObject({ daysLate: 4, tricky: true });
    expect(q.mastered).toBe(1);
    expect(q.upcoming.map((u) => u.info.id)).toEqual(["lc-70"]);
    expect(q.concepts.map((c) => c.conceptId)).toEqual(["dsa.graph-basics.bfs"]);
    expect(q.count).toBe(3);
  });

  it("rolls over at local midnight: tomorrow's problem is due the next day", () => {
    const next = buildReviewQueue(problems, concepts, "normal", "2026-09-25");
    expect(next.problems.map((p) => p.info.id)).toContain("lc-70");
    expect(next.upcoming.map((u) => u.info.id)).not.toContain("lc-70");
  });

  it("explains why a problem is back", () => {
    const state = problem("lc-1", { dueAt: "2026-09-24" });
    state.attempts = [
      makeAttempt("lc-1", 1, {
        result: "solved_alone",
        startedAt: "2026-09-17T09:00:00",
        finishedAt: "2026-09-17T09:30:00",
      }),
    ];
    const q = buildReviewQueue({ "lc-1": state }, {}, "normal", "2026-09-24");
    expect(dueReason(q.problems[0]!, "2026-09-24")).toBe("You solved it alone 7 days ago.");
  });
});

describe("the owner's own concepts in the review queue", () => {
  it("lists them when the lookup knows them", async () => {
    const { buildReviewQueue } = await import("@/lib/review/queue");
    const { createConceptState } = await import("@/lib/storage/defaults");
    const state = {
      ...createConceptState("custom.abc"),
      srs: { step: 0, lapses: 0, soloStreak: 0, dueAt: "2026-09-20" },
    };
    const without = buildReviewQueue({}, { "custom.abc": state }, "normal", "2026-09-24");
    expect(without.concepts).toHaveLength(0);
    const withIt = buildReviewQueue(
      {},
      { "custom.abc": state },
      "normal",
      "2026-09-24",
      () => true,
    );
    expect(withIt.concepts.map((c) => c.conceptId)).toEqual(["custom.abc"]);
  });
});
