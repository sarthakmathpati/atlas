// F5 self-assessment: "Some" → 0.3 (learning), "Comfortable" → 0.5 plus a review spread over the
// coming days (at most 15 a day), and nothing turns strong from this alone.
import { describe, expect, it } from "vitest";
import { conceptById, conceptsByTopic, topicsBySubject } from "@/data/syllabus";
import { computeStatus } from "@/lib/mastery/status";
import {
  assessmentFromStates,
  planSelfAssessment,
  type SelfAssessment,
} from "@/lib/onboarding/selfAssess";
import { createConceptState } from "@/lib/storage/defaults";
import type { ConceptState } from "@/lib/types";

const TODAY = "2026-09-24";
const NOW = new Date("2026-09-24T12:00:00");
const all = () => true;
const dsaTopics = topicsBySubject.get("dsa")!.map((t) => t.id);

function asRecord(list: ConceptState[]): Record<string, ConceptState> {
  return Object.fromEntries(list.map((s) => [s.conceptId, s]));
}

describe("self-assessment", () => {
  it("marks ticked topics and leaves the rest alone", () => {
    const assessment: SelfAssessment = {
      dsa: { level: "some", topics: ["dsa.arrays"] },
      os: { level: "comfortable", topics: ["os.processes"] },
      cn: { level: "none", topics: ["cn.fundamentals"] },
    };
    const plan = planSelfAssessment(assessment, {}, { today: TODAY, now: NOW, inScope: all });
    const states = asRecord(plan.changed);
    for (const c of conceptsByTopic.get("dsa.arrays")!) {
      expect(states[c.id]!.selfAssessed).toBe(0.3);
      expect(states[c.id]!.srs.dueAt).toBeUndefined();
    }
    for (const c of conceptsByTopic.get("os.processes")!) {
      expect(states[c.id]!.selfAssessed).toBe(0.5);
      expect(states[c.id]!.srs.dueAt).toBe("2026-09-25");
    }
    expect(Object.keys(states).some((id) => id.startsWith("cn."))).toBe(false);
    expect(plan.learning).toBe(
      conceptsByTopic.get("dsa.arrays")!.length + conceptsByTopic.get("os.processes")!.length,
    );
  });

  it("spreads reviews at most 15 a day, must-know concepts first", () => {
    const assessment: SelfAssessment = { dsa: { level: "comfortable", topics: dsaTopics } };
    const plan = planSelfAssessment(assessment, {}, { today: TODAY, now: NOW, inScope: all });
    const perDay = new Map<string, number>();
    for (const s of plan.changed) {
      const d = s.srs.dueAt!;
      perDay.set(d, (perDay.get(d) ?? 0) + 1);
    }
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(15);
    expect([...perDay.keys()].sort()[0]).toBe("2026-09-25");
    expect(plan.scheduled).toBe(plan.changed.length);
    expect(plan.days).toBe(Math.ceil(plan.scheduled / 15));
    const firstDay = plan.changed.filter((s) => s.srs.dueAt === "2026-09-25");
    expect(firstDay.every((s) => conceptById.get(s.conceptId)!.importance === "must")).toBe(true);
  });

  it("keeps existing schedules and never turns a concept strong", () => {
    const id = conceptsByTopic.get("os.processes")![0]!.id;
    const existing = {
      ...createConceptState(id, NOW),
      srs: { step: 2, lapses: 0, soloStreak: 0, dueAt: "2026-10-10" },
    };
    const plan = planSelfAssessment(
      { os: { level: "comfortable", topics: ["os.processes"] } },
      { [id]: existing },
      { today: TODAY, now: NOW, inScope: all },
    );
    const state = asRecord(plan.changed)[id]!;
    expect(state.srs).toEqual(existing.srs);
    const result = computeStatus({
      concept: conceptById.get(id)!,
      state,
      checks: [],
      linked: [],
      today: TODAY,
      now: NOW,
      intensity: "normal",
    });
    expect(result.status).toBe("learning");
    expect(result.knowledge).toBe(0.5);
  });

  it("takes answers back on a re-run, and derives the answers from stored states", () => {
    const first = asRecord(
      planSelfAssessment(
        {
          dsa: { level: "some", topics: ["dsa.arrays", "dsa.hashing"] },
          os: { level: "comfortable", topics: ["os.processes"] },
        },
        {},
        { today: TODAY, now: NOW, inScope: all },
      ).changed,
    );
    const derived = assessmentFromStates(first);
    expect(derived.dsa).toEqual({ level: "some", topics: ["dsa.arrays", "dsa.hashing"] });
    expect(derived.os).toEqual({ level: "comfortable", topics: ["os.processes"] });
    expect(derived.cn).toEqual({ level: "none", topics: [] });

    const second = planSelfAssessment({ dsa: { level: "some", topics: ["dsa.arrays"] } }, first, {
      today: TODAY,
      now: NOW,
      inScope: all,
    });
    const changed = asRecord(second.changed);
    const hashing = conceptsByTopic.get("dsa.hashing")![0]!.id;
    expect(changed[hashing]!.selfAssessed).toBeUndefined();
    const arrays = conceptsByTopic.get("dsa.arrays")![0]!.id;
    expect(changed[arrays]).toBeUndefined(); // unchanged, not rewritten
  });

  it("skips concepts outside the owner's scope", () => {
    const plan = planSelfAssessment(
      { dsa: { level: "some", topics: ["dsa.arrays"] } },
      {},
      { today: TODAY, now: NOW, inScope: (c) => c.importance === "must" },
    );
    expect(plan.changed.every((s) => conceptById.get(s.conceptId)!.importance === "must")).toBe(
      true,
    );
  });
});
