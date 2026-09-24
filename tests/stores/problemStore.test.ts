// F7 "On save" and the stores behind the tracker: saving an attempt schedules the problem,
// refreshes linked concepts, logs activity and clears the draft; CSV imports replay history;
// merging mistake tags re-tags attempts and can be undone.
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRepository } from "@/lib/storage/MemoryRepository";
import { prepareRepository } from "@/lib/storage";
import { planCsvImport } from "@/lib/problems/csv";
import { localDate } from "@/lib/time";
import { useActivityStore } from "@/stores/activityStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { hydrateAll } from "@/stores/hydrate";
import { mergeMistakeTags, useMistakeTagStore, addMistakeTag } from "@/stores/mistakeTagStore";
import {
  addCustomProblem,
  applyCsvPlan,
  deleteAttempt,
  restoreSnapshot,
  saveAttempt,
  saveDraft,
  updateProblem,
  useProblemStore,
} from "@/stores/problemStore";

let repo: MemoryRepository;

beforeEach(async () => {
  repo = new MemoryRepository();
  await prepareRepository(repo);
  await hydrateAll(repo);
});

const base = {
  startedAt: new Date().toISOString(),
  language: "cpp",
  code: "int main() {}",
  hintsUsed: 0 as const,
  mistakeTagIds: [] as string[],
  mode: "normal" as const,
};

describe("saveAttempt", () => {
  it("saves code, schedules, refreshes concepts, logs activity and clears the draft", async () => {
    saveDraft("lc-743", { language: "cpp", code: "draft", updatedAt: new Date().toISOString() });
    expect(useProblemStore.getState().states["lc-743"]?.draft?.code).toBe("draft");
    const saved = saveAttempt({
      ...base,
      problemId: "lc-743",
      result: "solved_alone",
      minutes: 25,
      insight: "Dijkstra from the source; answer is the max distance.",
      mistakeTagIds: ["mt-off-by-one", "mt-off-by-one"],
    });
    expect(saved.message).toBe("Attempt saved. Next review in 3 days.");
    const state = useProblemStore.getState().states["lc-743"]!;
    expect(state.status).toBe("solved");
    expect(state.inReview).toBe(true);
    expect(state.srs.step).toBe(1);
    expect(state.draft).toBeUndefined();
    expect(state.insight).toBe("Dijkstra from the source; answer is the max distance.");
    expect(state.attempts[0]).toMatchObject({
      code: "int main() {}",
      minutes: 25,
      mistakeTagIds: ["mt-off-by-one"],
    });

    // The code is stored and survives a reload.
    await repo.flush();
    const stored = await repo.problemStates.get("lc-743");
    expect(stored?.attempts[0]?.code).toBe("int main() {}");

    // Linked concepts now have evidence: learning.
    const concepts = useConceptStateStore.getState().states;
    expect(concepts["dsa.shortest-paths.dijkstras-algorithm"]?.status).toBe("learning");
    expect((await repo.conceptStates.get("dsa.shortest-paths.dijkstras-algorithm"))?.status).toBe(
      "learning",
    );

    const today = localDate();
    const day = useActivityStore.getState().months[today.slice(0, 7)]?.days[today];
    expect(day).toMatchObject({ attempts: 1, problemsSolved: 1 });
  });

  it("marks a matching Today item done", async () => {
    const today = localDate();
    await repo.dayPlans.put({
      date: today,
      budgetMinutes: 60,
      minimumDay: false,
      items: [
        {
          id: "i1",
          kind: "resolve",
          refId: "lc-1",
          title: "Re-solve",
          reason: "",
          estMinutes: 15,
          done: false,
          skipped: false,
        },
      ],
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    saveAttempt({ ...base, problemId: "lc-1", result: "not_solved" });
    await new Promise((r) => setTimeout(r, 10));
    expect((await repo.dayPlans.get(today))?.items[0]?.done).toBe(true);
  });

  it("keeps at most 30 attempts and can delete one", () => {
    for (let i = 0; i < 32; i++)
      saveAttempt({ ...base, problemId: "lc-1", result: "solved_alone" });
    const state = useProblemStore.getState().states["lc-1"]!;
    expect(state.attempts).toHaveLength(30);
    const before = deleteAttempt("lc-1", state.attempts[0]!.id);
    expect(before?.attempts).toHaveLength(30);
    expect(useProblemStore.getState().states["lc-1"]!.attempts).toHaveLength(29);
  });

  it("feeds custom problems' concepts", () => {
    const id = addCustomProblem({
      title: "My heap problem",
      difficulty: "medium",
      source: "custom",
      conceptIds: ["dsa.heaps.top-k-elements"],
    });
    saveAttempt({ ...base, problemId: id, result: "solved_with_hints" });
    expect(useConceptStateStore.getState().states["dsa.heaps.top-k-elements"]?.status).toBe(
      "learning",
    );
  });

  it("updates owner fields and drops empty ones", () => {
    updateProblem("lc-2", { insight: "Carry.", starred: true, tags: ["amazon"] });
    updateProblem("lc-2", { insight: "" });
    const s = useProblemStore.getState().states["lc-2"]!;
    expect(s.insight).toBeUndefined();
    expect(s).toMatchObject({ starred: true, tags: ["amazon"], status: "todo" });
  });
});

describe("CSV import", () => {
  it("adds attempts without code, creates new problems, replays schedules, and can be undone", () => {
    const text = [
      "title,date,result,minutes",
      "Two Sum,2026-09-01,solved,10",
      "Two Sum,2026-09-04,solved,8",
      "Totally New Problem,2026-09-02,failed,",
    ].join("\n");
    const opts = { monthFirst: false, defaultResult: "solved_alone" as const, addUnmatched: true };
    const plan = planCsvImport(text, useProblemStore.getState().states, opts);
    const result = applyCsvPlan(plan, opts);
    expect(result).toMatchObject({ attempts: 3, created: 1, problems: 2, duplicates: 0 });
    const twoSum = useProblemStore.getState().states["lc-1"]!;
    expect(twoSum.attempts.map((a) => a.code)).toEqual(["", ""]);
    expect(twoSum.srs).toMatchObject({ step: 2, soloStreak: 2, dueAt: "2026-09-12" }); // easy: 7 × 1.1 ≈ 8 days
    expect(twoSum.inReview).toBe(true);
    const created = Object.values(useProblemStore.getState().states).find(
      (s) => s.custom?.title === "Totally New Problem",
    );
    expect(created?.status).toBe("attempted");

    // Importing the same file again adds nothing.
    const again = applyCsvPlan(planCsvImport(text, useProblemStore.getState().states, opts), opts);
    // (the new problem now exists, so its row matches it instead of creating another)
    expect(again).toMatchObject({ duplicates: 3, created: 0, attempts: 0 });

    restoreSnapshot(result.snapshot);
    expect(useProblemStore.getState().states["lc-1"]).toBeUndefined();
  });
});

describe("mistake tags", () => {
  it("merges tags, re-tagging attempts, and undoes the merge", () => {
    const mine = addMistakeTag("Forgot the base case", "logic", "Write the base case first.");
    expect(useMistakeTagStore.getState().tags[mine.id]?.custom).toBe(true);
    saveAttempt({
      ...base,
      problemId: "lc-70",
      result: "not_solved",
      mistakeTagIds: [mine.id, "mt-wrong-base-case"],
    });
    const { attempts, undo } = mergeMistakeTags(mine.id, "mt-wrong-base-case");
    expect(attempts).toBe(1);
    expect(useMistakeTagStore.getState().tags[mine.id]).toBeUndefined();
    expect(useProblemStore.getState().states["lc-70"]!.attempts[0]!.mistakeTagIds).toEqual([
      "mt-wrong-base-case",
    ]);
    undo();
    expect(useMistakeTagStore.getState().tags[mine.id]).toBeDefined();
    expect(useProblemStore.getState().states["lc-70"]!.attempts[0]!.mistakeTagIds).toEqual([
      mine.id,
      "mt-wrong-base-case",
    ]);
  });
});
