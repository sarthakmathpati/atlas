import { describe, expect, it } from "vitest";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import {
  attemptScore,
  designKind,
  filledSections,
  overallFromPoints,
  resultFromOverall,
  sectionsFor,
  summarizeDesign,
} from "@/lib/designs/designs";
import { designReviewPrompt } from "@/lib/ai/prompts";
import { demoSampleResponder } from "@/lib/runtime/fakeSampleDemo";
import { designReviewSchema } from "@/lib/ai/schemas";
import type { DesignAttempt } from "@/lib/types";

const env = { language: "C++", fence: "cpp" };

function attempt(extra: Partial<DesignAttempt>): DesignAttempt {
  return {
    id: "d1",
    problemId: "hld-url-shortener",
    sections: {},
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
    ...extra,
  };
}

describe("design sections", () => {
  it("has the F26 sections for each kind, the code editor for LLD and the sketch for both", () => {
    const lld = sectionsFor("lld").map((s) => s.label);
    expect(lld).toEqual([
      "Requirements",
      "Entities and classes",
      "Relationships",
      "Class sketch",
      "Key methods and APIs",
      "Design patterns used",
      "Concurrency concerns",
      "Code",
      "Extensions",
    ]);
    const hld = sectionsFor("hld").map((s) => s.label);
    expect(hld).toEqual([
      "Functional and non-functional requirements",
      "Estimates",
      "API",
      "Data model",
      "High-level architecture",
      "Architecture sketch",
      "Deep dives",
      "Bottlenecks and trade-offs",
    ]);
    expect(sectionsFor("lld").find((s) => s.key === "code")?.editor).toBe("code");
    expect(sectionsFor("hld").some((s) => s.editor === "code")).toBe(false);
  });

  it("covers all 46 prompts, each with a rubric", () => {
    expect(DESIGN_PROBLEMS).toHaveLength(46);
    expect(DESIGN_PROBLEMS.filter((p) => designKind(p) === "lld").length).toBeGreaterThan(5);
    for (const p of DESIGN_PROBLEMS) expect(p.rubric?.length).toBeGreaterThanOrEqual(3);
  });

  it("sends only the sections written, by their labels", () => {
    expect(filledSections("hld", { api: "GET /x", estimates: "  ", sketch: "A -> B" })).toEqual({
      API: "GET /x",
      "Architecture sketch": "A -> B",
    });
  });
});

describe("scoring a design", () => {
  it("turns rubric points into an overall score and a result", () => {
    expect(overallFromPoints([2, 2, 2, 2])).toBe(5);
    expect(overallFromPoints([0, 0, 0])).toBe(1);
    expect(overallFromPoints([2, 1, 0, 1])).toBe(3);
    expect(overallFromPoints([])).toBe(1);
    expect(resultFromOverall(5)).toBe("solved_alone");
    expect(resultFromOverall(4)).toBe("solved_alone");
    expect(resultFromOverall(3.5)).toBe("solved_with_hints");
    expect(resultFromOverall(2)).toBe("not_solved");
  });

  it("prefers Claude's review, else the owner's", () => {
    const review = { rubric: [], missed: [], suggestions: [], overall: 4 };
    expect(attemptScore(attempt({ review, selfReview: [0, 0] }))).toEqual({
      score: 4,
      by: "claude",
    });
    expect(attemptScore(attempt({ selfReview: [2, 2, 1, 1] }))).toEqual({ score: 4, by: "self" });
    expect(attemptScore(attempt({ review: { nope: 1 } }))).toBeNull();
  });

  it("summarizes status and the last score for the list", () => {
    expect(summarizeDesign([]).status).toBe("not_started");
    const done = attempt({
      id: "a",
      finishedAt: "2026-09-21T10:00:00.000Z",
      selfReview: [2, 2, 2],
    });
    const later = attempt({
      id: "b",
      finishedAt: "2026-09-25T10:00:00.000Z",
      review: { rubric: [], missed: [], suggestions: [], overall: 3 },
    });
    const open = attempt({ id: "c", updatedAt: "2026-09-26T10:00:00.000Z" });
    expect(summarizeDesign([done, later])).toMatchObject({
      status: "done",
      lastScore: 3,
      lastScoreBy: "claude",
      finished: 2,
      lastFinished: "2026-09-25T10:00:00.000Z",
    });
    expect(summarizeDesign([done, open])).toMatchObject({
      status: "in_progress",
      open: { id: "c" },
    });
  });
});

describe("the stand-in Claude's design review", () => {
  it("answers prompt 12 in the right shape", () => {
    const p = DESIGN_PROBLEMS.find((x) => x.id === "lld-parking-lot")!;
    const spec = designReviewPrompt(env, {
      prompt: p.prompt!,
      rubric: p.rubric!,
      sections: { Requirements: "Spot types: bike, car, truck. Pricing strategy per hour." },
    });
    const reply = demoSampleResponder(`${spec.instructions}\n\n${spec.input as string}`);
    const parsed = designReviewSchema.parse(JSON.parse(reply));
    expect(parsed.rubric).toHaveLength(p.rubric!.length);
    expect(parsed.overall).toBeGreaterThanOrEqual(1);
  });
});
