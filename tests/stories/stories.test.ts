import { describe, expect, it } from "vitest";
import { BEHAVIORAL_QUESTIONS } from "@/data/behavioral.seed";
import { conceptById } from "@/data/syllabus";
import {
  clockText,
  coverageMatrix,
  critiqueScore,
  introScript,
  lengthVerdict,
  pickQuestion,
  practiceConcepts,
  practiceDates,
  readCritique,
  speakingSeconds,
  storiesForQuestion,
  suggestedQuestions,
  UNSORTED_STORY_ID,
  withQuestion,
  wordCount,
} from "@/lib/stories/stories";
import type { Story } from "@/lib/types";

const T = "2026-09-27T10:00:00.000Z";

function story(id: string, questionIds: string[], extra: Partial<Story> = {}): Story {
  return {
    id,
    title: id,
    situation: "",
    task: "",
    action: "",
    result: "",
    tags: [],
    questionIds,
    updatedAt: T,
    ...extra,
  };
}

const Q = (i: number) => BEHAVIORAL_QUESTIONS[i]!.id;

describe("the coverage matrix", () => {
  const stories = [
    story("s-outage", [Q(3), Q(7), Q(9)]),
    story("s-hackathon", [Q(7), Q(11)]),
    story(UNSORTED_STORY_ID, [Q(0)], { practice: [] }),
  ];
  const m = coverageMatrix(stories, BEHAVIORAL_QUESTIONS);

  it("has a row per question and a column per story, leaving out unsorted practice", () => {
    expect(m.rows).toHaveLength(30);
    expect(m.stories.map((s) => s.id)).toEqual(["s-outage", "s-hackathon"]);
  });

  it("marks exactly the linked cells and counts coverage", () => {
    const row = (i: number) => m.rows.find((r) => r.question.id === Q(i))!;
    expect(row(7).storyIds).toEqual(["s-outage", "s-hackathon"]);
    expect(row(3).storyIds).toEqual(["s-outage"]);
    expect(row(0).covered).toBe(false); // the unsorted holder doesn't cover anything
    expect(m.covered).toBe(4);
    expect(m.uncovered).toHaveLength(26);
    expect(m.uncovered.map((q) => q.id)).not.toContain(Q(11));
    expect(m.perStory).toEqual({ "s-outage": 3, "s-hackathon": 2 });
    // Every cell agrees with the story's own links.
    for (const r of m.rows)
      for (const s of m.stories)
        expect(r.storyIds.includes(s.id)).toBe(s.questionIds.includes(r.question.id));
  });

  it("ignores links to questions that aren't in the bank", () => {
    const odd = coverageMatrix([story("s", ["bq-gone", Q(1)])], BEHAVIORAL_QUESTIONS);
    expect(odd.perStory.s).toBe(1);
    expect(odd.covered).toBe(1);
  });
});

describe("links both ways", () => {
  it("links and unlinks through the story's own list", () => {
    const s = story("s", [Q(1)]);
    const linked = withQuestion(s, Q(2), true);
    expect(linked.questionIds).toEqual([Q(1), Q(2)]);
    expect(withQuestion(linked, Q(2), true)).toBe(linked);
    expect(storiesForQuestion([linked], Q(2)).map((x) => x.id)).toEqual(["s"]);
    const unlinked = withQuestion(linked, Q(1), false);
    expect(storiesForQuestion([unlinked], Q(1))).toHaveLength(0);
  });

  it("suggests questions that share tags, most shared first", () => {
    const s = story("s", [], { tags: ["conflict", "teamwork"] });
    const ids = suggestedQuestions(s, BEHAVIORAL_QUESTIONS).map((q) => q.id);
    expect(ids[0]).toMatch(/disagreed|conflict/);
    expect(ids.length).toBeLessThanOrEqual(5);
    expect(suggestedQuestions(story("t", []), BEHAVIORAL_QUESTIONS)).toEqual([]);
  });
});

describe("words and speaking time", () => {
  it("counts words and times them at 140 a minute", () => {
    expect(wordCount("I led a team of 4, and cut the build time by 30% in two weeks.")).toBe(16);
    expect(wordCount("  ")).toBe(0);
    expect(speakingSeconds(210)).toBe(90);
    expect(speakingSeconds(140)).toBe(60);
    expect(clockText(90)).toBe("1:30");
    expect(clockText(5)).toBe("0:05");
    expect(lengthVerdict(90, 90)).toBe("right");
    expect(lengthVerdict(70, 90)).toBe("short");
    expect(lengthVerdict(110, 90)).toBe("long");
    expect(introScript({ present: "A.", past: " ", why: "C." })).toBe("A.\n\nC.");
  });
});

describe("practice", () => {
  it("records checks on existing career.behavioral concepts", () => {
    for (const q of BEHAVIORAL_QUESTIONS) {
      for (const fromStory of [true, false]) {
        const ids = practiceConcepts(q.id, fromStory);
        expect(ids.length).toBeGreaterThan(0);
        for (const id of ids) {
          expect(id.startsWith("career.behavioral."), id).toBe(true);
          expect(conceptById.has(id), id).toBe(true);
        }
      }
    }
    expect(practiceConcepts("bq-tell-me-about-yourself", false)).toEqual([
      "career.behavioral.tell-me-about-yourself",
    ]);
    expect(practiceConcepts(Q(3), true)).toContain("career.behavioral.building-a-story-bank");
  });

  it("scores a critique by its mean and reads stored critiques safely", () => {
    expect(critiqueScore({ clarity: 4, specificity: 3, impact: 3, structure: 4 })).toBeCloseTo(0.7);
    expect(readCritique({ nope: 1 })).toBeNull();
    const ok = {
      clarity: 5,
      specificity: 5,
      impact: 4,
      structure: 5,
      lengthNote: "",
      tighterVersion: "x",
      tips: [],
    };
    expect(readCritique(ok)).toMatchObject({ clarity: 5 });
  });

  it("picks a random question, never the one to avoid, and lists practice dates", () => {
    for (let seed = 0; seed < 60; seed++) {
      expect(pickQuestion(BEHAVIORAL_QUESTIONS, seed, Q(seed % 30))!.id).not.toBe(Q(seed % 30));
    }
    const s = story("s", [], {
      practice: [
        { questionId: Q(1), answer: "a", createdAt: "2026-09-20T10:00:00.000Z" },
        { questionId: Q(2), answer: "b", createdAt: "2026-09-20T12:00:00.000Z" },
        { questionId: Q(3), answer: "c", createdAt: "2026-09-25T10:00:00.000Z" },
      ],
    });
    expect(practiceDates([s], (iso) => iso.slice(0, 10))).toEqual(["2026-09-20", "2026-09-25"]);
  });
});
