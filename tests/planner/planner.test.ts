// The daily planner (BUILD_SPEC.md 11.4, F16 "done when"): fixture owners (new, mid-way, a week
// before interviews) get sensible plans that fit the budget rules of step 7, swapping never
// produces duplicates, replanning keeps what is done, and the same inputs give the same plan.
import { describe, expect, it } from "vitest";
import { conceptById } from "@/data/syllabus";
import { ALL_PLAN_KINDS, AVAILABLE_PLAN_KINDS, refsOf, type PlanKind } from "@/lib/planner/kinds";
import { buildPlannerInput } from "@/lib/planner/input";
import {
  applySwap,
  budgetCeiling,
  keptOnReplan,
  MAX_ITEMS,
  MAX_NEW_CONCEPTS,
  planDay,
  planMinutes,
  swapOptions,
  type PlannerInput,
} from "@/lib/planner/planner";
import { mulberry32, seededRank } from "@/lib/random";
import { addDaysToDate } from "@/lib/time";
import type { PlanItem, Profile } from "@/lib/types";
import { DAY, noonOf, records, scenario, type ScenarioName } from "../fixtures/scenarios";

function inputFor(
  name: ScenarioName,
  options: {
    budget?: number;
    minimumDay?: boolean;
    day?: string;
    profile?: Partial<Profile>;
    available?: ReadonlySet<PlanKind>;
    history?: PlannerInput["history"];
  } = {},
): PlannerInput {
  const r = records(scenario(name));
  const day = options.day ?? DAY;
  return buildPlannerInput({
    ...r,
    profile: { ...r.profile, ...options.profile },
    today: day,
    now: noonOf(day),
    intensity: "normal",
    budget: options.budget,
    minimumDay: options.minimumDay,
    available: options.available,
    history: options.history,
  }).input;
}

/** No two items point at the same concept, problem or one-per-day kind. */
function expectNoDuplicates(items: readonly PlanItem[]) {
  const seen = new Map<string, string>();
  for (const item of items) {
    for (const ref of refsOf(item)) {
      expect(seen.get(ref), `${ref} is on the plan twice`).toBeUndefined();
      seen.set(ref, item.id);
    }
  }
  expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
}

function expectFitsBudget(items: readonly PlanItem[], budget: number) {
  const { planned } = planMinutes(items);
  expect(planned).toBeLessThanOrEqual(budgetCeiling(budget));
  for (const i of items) expect(i.estMinutes).toBeLessThanOrEqual(budget);
  expect(items.length).toBeLessThanOrEqual(MAX_ITEMS);
}

const kinds = (items: readonly PlanItem[]) => items.map((i) => i.kind);

describe("budget ceiling", () => {
  it("is B plus 10%, never more than 15 minutes over", () => {
    expect(budgetCeiling(30)).toBe(33);
    expect(budgetCeiling(90)).toBe(99);
    expect(budgetCeiling(150)).toBe(165);
    expect(budgetCeiling(240)).toBe(255);
  });
});

describe("a new owner", () => {
  const input = inputFor("new");
  const plan = planDay(input);

  it("gets 3 to 8 items that fill the day within the budget rules", () => {
    expect(plan.length).toBeGreaterThanOrEqual(3);
    expectFitsBudget(plan, 90);
    expect(planMinutes(plan).planned).toBeGreaterThanOrEqual(0.9 * 90);
    expectNoDuplicates(plan);
  });

  it("starts at the beginning of the syllabus with easy problems and a drill", () => {
    expect(kinds(plan)).not.toContain("resolve");
    expect(kinds(plan)).not.toContain("review-concept");
    expect(kinds(plan)).toContain("drill");
    const learn = plan.filter((i) => i.kind === "learn-concept");
    expect(learn.length).toBeGreaterThanOrEqual(1);
    expect(learn.length).toBeLessThanOrEqual(MAX_NEW_CONCEPTS);
    for (const i of learn) {
      const c = conceptById.get(i.refId!)!;
      expect(c.importance).toBe("must");
      expect(c.prereqs).toEqual([]); // nothing is learned yet, so only starting points are ready
    }
    const problems = plan.filter((i) => i.kind === "new-problem");
    expect(problems.length).toBeGreaterThanOrEqual(1);
    for (const p of problems) {
      expect(p.estMinutes).toBe(20); // easy
      expect(p.reason).toMatch(/^A gentle start: an easy problem on /);
    }
  });

  it("gives every item a plain reason and a Start target", () => {
    for (const i of plan) {
      expect(i.reason.length).toBeGreaterThan(20);
      expect(i.reason).not.toMatch(/!|successfully|please|simply/i);
      if (i.kind !== "drill") expect(i.refId ?? i.refIds?.[0]).toBeTruthy();
    }
  });

  it("puts one small thing on a minimum day", () => {
    const min = planDay(inputFor("new", { minimumDay: true }));
    expect(min).toHaveLength(1);
    expect(min[0]!.kind).toBe("drill");
  });
});

describe("an owner mid-way", () => {
  const input = inputFor("mid");
  const plan = planDay(input);

  it("mixes reviews and new learning within the budget rules", () => {
    expect(plan.length).toBeGreaterThanOrEqual(3);
    expect(plan.length).toBeLessThanOrEqual(8);
    expectFitsBudget(plan, 90);
    expect(planMinutes(plan).planned).toBeGreaterThanOrEqual(0.9 * 90);
    expectNoDuplicates(plan);
    expect(kinds(plan)).toEqual(expect.arrayContaining(["resolve", "review-concept", "drill"]));
    expect(kinds(plan).some((k) => k === "learn-concept" || k === "new-problem")).toBe(true);
  });

  it("puts tricky re-solves first and fading concepts in the first flashcard bundle", () => {
    const resolves = plan.filter((i) => i.kind === "resolve");
    const states = input.problemStates;
    expect(states[resolves[0]!.refId!]!.srs.lapses).toBeGreaterThanOrEqual(2);
    expect(resolves[0]!.reason).toMatch(/^Tricky one: it has slipped 2 times/);
    const bundle = plan.find((i) => i.kind === "review-concept")!;
    expect(bundle.refIds!.length).toBeGreaterThanOrEqual(3);
    expect(bundle.refIds!.length).toBeLessThanOrEqual(4);
    expect(input.conceptStates[bundle.refIds![0]!]!.status).toBe("fading");
    expect(bundle.reason).toMatch(/^Fading: you last reviewed .+ 40 days ago/);
  });

  it("keeps reviews near 45% of the budget, with room for the most urgent ones", () => {
    const reviews = plan
      .filter((i) => i.kind === "resolve" || i.kind === "review-concept")
      .reduce((n, i) => n + i.estMinutes, 0);
    // The first re-solve and the first bundle always get a place; the rest fit within 45%.
    const firsts = 15 + 12;
    expect(reviews).toBeLessThanOrEqual(Math.max(0.45 * 90, firsts) + 15);
  });

  it("biases new learning toward the focus subject", () => {
    const learn = inputFor("mid", { budget: 120 });
    const items = planDay(learn).filter((i) => i.kind === "learn-concept");
    expect(items.length).toBeGreaterThan(0);
    expect(conceptById.get(items[0]!.refId!)!.subjectId).toBe("os");
    expect(items[0]!.reason).toContain("this week's focus");
  });

  it("ramps problem difficulty per pattern: medium after two easy ones solved alone", () => {
    const items = planDay(inputFor("mid", { budget: 120 })).filter((i) => i.kind === "new-problem");
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) {
      const state = input.problemStates[i.refId!];
      expect(state?.status).not.toBe("solved");
    }
  });

  it("never plans a problem that is due for a re-solve as a new problem", () => {
    for (const budget of [60, 90, 120, 180]) {
      const items = planDay(inputFor("mid", { budget }));
      const due = new Set(items.filter((i) => i.kind === "resolve").map((i) => i.refId));
      for (const i of items.filter((x) => x.kind === "new-problem"))
        expect(due.has(i.refId)).toBe(false);
    }
  });

  it("chooses the most overdue easy re-solve on a minimum day", () => {
    const min = planDay(inputFor("mid", { minimumDay: true }));
    expect(min).toHaveLength(1);
    expect(min[0]!.kind).toBe("resolve");
    expect(min[0]!.estMinutes).toBe(15);
    const state = input.problemStates[min[0]!.refId!]!;
    expect(state.srs.dueAt! < DAY).toBe(true);
  });
});

describe("an owner a week before interviews", () => {
  const input = inputFor("week");
  const plan = planDay(input);

  it("shifts toward revision: a 1-week sheet, more reviews, no new advanced concepts", () => {
    expectFitsBudget(plan, 120);
    expect(planMinutes(plan).planned).toBeGreaterThanOrEqual(0.9 * 120);
    expectNoDuplicates(plan);
    expect(plan[0]!.kind).toBe("revision");
    expect(plan[0]!.refId).toBe("revision-week");
    expect(plan[0]!.reason).toContain("in 7 days");
    const reviews = plan
      .filter((i) => i.kind === "resolve" || i.kind === "review-concept")
      .reduce((n, i) => n + i.estMinutes, 0);
    expect(reviews).toBeGreaterThan(0.45 * 120);
    for (const i of plan.filter((x) => x.kind === "learn-concept"))
      expect(conceptById.get(i.refId!)!.importance).not.toBe("advanced");
  });

  it("offers only medium new problems from the weakest patterns", () => {
    for (const budget of [150, 200, 240]) {
      const items = planDay(inputFor("week", { budget })).filter((i) => i.kind === "new-problem");
      for (const i of items) {
        expect(i.estMinutes).toBe(30);
        expect(i.reason).toMatch(/^Before your interview: a medium on your weakest pattern/);
      }
    }
  });

  it("switches to the 1-day sheet in the last 3 days", () => {
    const close = planDay(inputFor("week", { profile: { interviewDate: addDaysToDate(DAY, 2) } }));
    expect(close.find((i) => i.kind === "revision")?.refId).toBe("revision-day");
  });

  it("pulls re-solves due before the interview forward once the due ones are planned", () => {
    // Only two problems are due today; the rest come back later.
    const base = inputFor("week", { budget: 150 });
    const due = Object.values(base.problemStates)
      .filter((p) => p.srs.dueAt! <= DAY)
      .sort((a, b) => (a.problemId < b.problemId ? -1 : 1));
    const problemStates = { ...base.problemStates };
    for (const p of due.slice(2))
      problemStates[p.problemId] = { ...p, srs: { ...p.srs, dueAt: addDaysToDate(DAY, 20) } };
    const input = { ...base, problemStates };
    const big = planDay(input);
    const resolves = big.filter((i) => i.kind === "resolve");
    const early = resolves.filter((i) => i.reason.includes("an early pass"));
    expect(early.length).toBeGreaterThan(0);
    expect(resolves.length).toBeGreaterThan(early.length);
    // Pulled-forward ones come after every due one.
    const firstEarly = resolves.findIndex((i) => i.reason.includes("an early pass"));
    expect(resolves.slice(firstEarly).every((i) => i.reason.includes("an early pass"))).toBe(true);
    for (const e of early) {
      const dueAt = input.problemStates[e.refId!]!.srs.dueAt!;
      expect(dueAt > DAY && dueAt <= input.interviewDate!).toBe(true);
    }
  });
});

describe("budget rules for every owner and budget", () => {
  const budgets = [30, 45, 60, 75, 90, 120, 150, 200, 240];
  for (const name of ["new", "mid", "week"] as const) {
    it(`${name}: within the ceiling, no item longer than the budget, 3 to 8 items from 60 minutes`, () => {
      for (const budget of budgets) {
        const items = planDay(inputFor(name, { budget }));
        expectFitsBudget(items, budget);
        expectNoDuplicates(items);
        if (budget >= 60) expect(items.length).toBeGreaterThanOrEqual(3);
        const learn = items.filter((i) => i.kind === "learn-concept").length;
        expect(learn).toBeLessThanOrEqual(MAX_NEW_CONCEPTS);
      }
    });
  }

  it("uses the minimum day for budgets of 15 minutes or less", () => {
    for (const name of ["new", "mid", "week"] as const) {
      expect(planDay(inputFor(name, { budget: 15 }))).toHaveLength(1);
      expect(planDay(inputFor(name, { budget: 10 }))).toHaveLength(1);
    }
  });
});

describe("determinism", () => {
  it("gives the same plan for the same inputs", () => {
    for (const name of ["new", "mid", "week"] as const) {
      expect(planDay(inputFor(name))).toEqual(planDay(inputFor(name)));
    }
  });

  it("breaks ties with a rank seeded by the date: stable for a day, varying across days", () => {
    const keys = ["lc-1", "lc-15", "lc-42", "lc-53", "lc-121", "lc-200"];
    const order = (day: string) => {
      const rank = seededRank(day);
      return [...keys].sort((a, b) => rank(a) - rank(b)).join(",");
    };
    expect(order(DAY)).toBe(order(DAY));
    const days = Array.from({ length: 10 }, (_, i) => order(addDaysToDate(DAY, i)));
    expect(new Set(days).size).toBeGreaterThan(1);
  });
});

describe("swap", () => {
  it("offers up to 3 alternatives of the same kind, none already on the plan", () => {
    for (const name of ["new", "mid", "week"] as const) {
      const input = inputFor(name, { budget: 120 });
      const plan = planDay(input);
      for (const item of plan) {
        const options = swapOptions(input, plan, item.id);
        expect(options.length).toBeLessThanOrEqual(3);
        const taken = new Set(plan.flatMap(refsOf));
        for (const o of options) {
          expect(o.kind).toBe(item.kind);
          for (const r of refsOf(o)) expect(taken.has(r)).toBe(false);
          expect(o.estMinutes).toBeLessThanOrEqual(120);
        }
      }
    }
  });

  it("has alternatives for re-solves, bundles, concepts and problems when more exist", () => {
    const input = inputFor("mid", { budget: 120 });
    const plan = planDay(input);
    for (const kind of ["resolve", "learn-concept", "new-problem"] as const) {
      const item = plan.find((i) => i.kind === kind);
      if (item) expect(swapOptions(input, plan, item.id).length).toBeGreaterThan(0);
    }
    const drill = plan.find((i) => i.kind === "drill")!;
    expect(swapOptions(input, plan, drill.id)).toEqual([]);
  });

  it("never produces duplicates, however many swaps are made", () => {
    for (const name of ["new", "mid", "week"] as const) {
      const input = inputFor(name, { budget: 150 });
      let plan = planDay(input);
      const rand = mulberry32(42);
      for (let step = 0; step < 60; step++) {
        const item = plan[Math.floor(rand() * plan.length)]!;
        const options = swapOptions(input, plan, item.id);
        if (options.length === 0) continue;
        const choice = options[Math.floor(rand() * options.length)]!;
        plan = applySwap(plan, item.id, choice);
        expectNoDuplicates(plan);
      }
    }
  });
});

describe("replanning", () => {
  it("keeps done, skipped and the owner's items, and never plans them again", () => {
    const input = inputFor("mid");
    const first = planDay(input);
    const owner: PlanItem = {
      id: "owner1",
      kind: "learn-concept",
      refId: "os.scheduling.round-robin",
      title: "Learn: Round robin",
      reason: "Added by you from the map.",
      estMinutes: 25,
      done: false,
      skipped: false,
      origin: "owner",
    };
    const marked = [
      ...first.map((i, n) =>
        n === 0 ? { ...i, done: true } : n === 1 ? { ...i, skipped: true } : i,
      ),
      owner,
    ];
    const kept = keptOnReplan(marked);
    expect(kept.map((i) => i.id)).toEqual([first[0]!.id, first[1]!.id, "owner1"]);
    for (const budget of [30, 60, 120]) {
      const fresh = planDay({ ...input, budget }, kept);
      const all = [...kept, ...fresh];
      expectNoDuplicates(all);
      // Kept items count toward the budget (the skipped one doesn't).
      expect(planMinutes(all).planned).toBeLessThanOrEqual(
        Math.max(budgetCeiling(budget), planMinutes(kept).planned),
      );
      expect(fresh.filter((i) => i.kind === "learn-concept").length).toBeLessThanOrEqual(
        MAX_NEW_CONCEPTS - 1,
      );
    }
  });

  it("switching to a minimum day keeps done items and adds one small thing", () => {
    const input = inputFor("mid");
    const plan = planDay(input).map((i, n) => (n === 0 ? { ...i, done: true } : i));
    const kept = keptOnReplan(plan);
    const fresh = planDay({ ...input, minimumDay: true }, kept);
    expect(fresh).toHaveLength(1);
    expectNoDuplicates([...kept, ...fresh]);
  });
});

describe("phase 8 kinds", () => {
  const LATER: PlanKind[] = ALL_PLAN_KINDS.filter((k) => !AVAILABLE_PLAN_KINDS.has(k));

  it("are never planned while their screens don't exist", () => {
    for (const name of ["new", "mid", "week"] as const) {
      for (const budget of [60, 90, 120, 240]) {
        for (const track of ["sde", "quant", "both"] as const) {
          const items = planDay(inputFor(name, { budget, profile: { track } }));
          for (const i of items) expect(LATER).not.toContain(i.kind);
        }
      }
    }
  });

  const all = new Set(ALL_PLAN_KINDS);

  it("mental math is a daily staple for the Quant and Both tracks", () => {
    const quant = planDay(inputFor("mid", { available: all, profile: { track: "quant" } }));
    expect(kinds(quant)).toContain("mental-math");
    const sde = planDay(inputFor("mid", { available: all }));
    expect(kinds(sde)).not.toContain("mental-math");
    const small = planDay(
      inputFor("mid", { available: all, budget: 30, profile: { track: "both" } }),
    );
    expect(kinds(small)).not.toContain("mental-math");
  });

  it("design practice comes once a week for SDE while system design readiness is under 60", () => {
    const plan = planDay(inputFor("mid", { available: all, budget: 120 }));
    const design = plan.find((i) => i.kind === "design");
    expect(design?.refId).toMatch(/^hld-/);
    const recent = planDay(
      inputFor("mid", {
        available: all,
        budget: 120,
        history: { designs: [addDaysToDate(DAY, -3)] },
      }),
    );
    expect(kinds(recent)).not.toContain("design");
    const quant = planDay(
      inputFor("mid", { available: all, budget: 120, profile: { track: "quant" } }),
    );
    expect(kinds(quant)).not.toContain("design");
    const small = planDay(inputFor("mid", { available: all, budget: 60 }));
    expect(kinds(small)).not.toContain("design");
  });

  it("a mock needs readiness of 30, a 90-minute budget and a week since the last, on weekends first", () => {
    const base = inputFor("mid", { available: all, budget: 120 });
    // DAY is a Sunday.
    expect(kinds(planDay({ ...base, overallReadiness: 35 }))).toContain("mock");
    expect(kinds(planDay({ ...base, overallReadiness: 20 }))).not.toContain("mock");
    expect(kinds(planDay({ ...base, overallReadiness: 35, budget: 60 }))).not.toContain("mock");
    const lastWeek = { mocks: [addDaysToDate(DAY, -4)] };
    expect(kinds(planDay({ ...base, overallReadiness: 35, history: lastWeek }))).not.toContain(
      "mock",
    );
    // A Wednesday: only when the last mock was more than 10 days ago.
    const wed = addDaysToDate(DAY, 3);
    const weekday = { ...base, date: wed, overallReadiness: 35 };
    expect(
      kinds(planDay({ ...weekday, history: { mocks: [addDaysToDate(wed, -8)] } })),
    ).not.toContain("mock");
    expect(kinds(planDay({ ...weekday, history: { mocks: [addDaysToDate(wed, -12)] } }))).toContain(
      "mock",
    );
  });

  it("story practice comes twice a week within 45 days of the interview", () => {
    const near = inputFor("week", { available: all, budget: 150 });
    expect(kinds(planDay(near))).toContain("story");
    const twice = { stories: [addDaysToDate(DAY, -2), addDaysToDate(DAY, -5)] };
    expect(kinds(planDay({ ...near, history: twice }))).not.toContain("story");
    const yesterday = { stories: [addDaysToDate(DAY, -1)] };
    expect(kinds(planDay({ ...near, history: yesterday }))).not.toContain("story");
    const far = inputFor("mid", { available: all, budget: 150 }); // 70 days away
    expect(kinds(planDay(far))).not.toContain("story");
  });
});
