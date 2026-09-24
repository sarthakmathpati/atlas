// F14 flashcards and F13 offline self-check: decks, scores and checklists.
import { describe, expect, it } from "vitest";
import { EMPTY_CONTENT } from "@/data/content";
import { conceptById } from "@/data/syllabus";
import {
  buildDeck,
  cardsForConcept,
  deckSize,
  RATING_SCORE,
  sessionResults,
  type DeckItem,
} from "@/lib/review/flashcards";
import {
  MIN_EXPLAIN_WORDS,
  plainText,
  scopeParts,
  selfCheckItems,
  selfCheckScore,
  wordCount,
} from "@/lib/review/selfCheck";
import type { Concept } from "@/lib/types";

const bfs = conceptById.get("dsa.graph-basics.bfs")!;

function withQuestions(c: Concept, n: number): DeckItem {
  return {
    concept: { ...c, written: { core: n > 0, deep: false, questions: n, any: true } },
    content: {
      simple: "Like ripples in a pond.",
      interview: ["Explores level by level", "Uses a **queue**", "O(V + E) time"],
      questions: Array.from({ length: n }, (_, i) => ({ q: `Q${i}`, a: `A${i}` })),
    },
  };
}
const unwritten = { concept: bfs, content: EMPTY_CONTENT };

describe("flashcards", () => {
  it("uses seeded questions, or one recall card until they are written", () => {
    expect(cardsForConcept(withQuestions(bfs, 3)).map((c) => c.front)).toEqual(["Q0", "Q1", "Q2"]);
    const recall = cardsForConcept(unwritten);
    expect(recall).toHaveLength(1);
    expect(recall[0]!.kind).toBe("recall");
    expect(recall[0]!.front).toContain(bfs.name);
    expect(recall[0]!.back.toLowerCase()).toContain(bfs.scope.slice(0, 10).toLowerCase());
  });

  it("gives every concept a card first, then fills up to the limit", () => {
    const a = withQuestions({ ...bfs, id: "a" }, 5);
    const b = withQuestions({ ...bfs, id: "b" }, 1);
    const c = withQuestions({ ...bfs, id: "c" }, 5);
    const deck = buildDeck([a, b, c], 5);
    expect(deck).toHaveLength(5);
    expect(deck.map((x) => x.conceptId)).toEqual(["a", "a", "b", "c", "c"]);
    expect(buildDeck([a, b, c], 2).map((x) => x.conceptId)).toEqual(["a", "b"]);
  });

  it("predicts the deck size from the written flags alone", () => {
    const items = [
      withQuestions({ ...bfs, id: "a" }, 5),
      withQuestions({ ...bfs, id: "b" }, 0),
      withQuestions({ ...bfs, id: "c" }, 3),
    ];
    const concepts = items.map((i) => i.concept);
    for (const max of [1, 2, 5, 9, 30]) {
      const deck = buildDeck(items, max);
      expect(deckSize(concepts, max)).toEqual({
        cards: deck.length,
        covered: new Set(deck.map((c) => c.conceptId)).size,
      });
    }
  });

  it("scores Again, Hard, Good and Easy and averages per concept", () => {
    expect(RATING_SCORE).toEqual({ again: 0, hard: 0.4, good: 0.8, easy: 1 });
    const [a1, a2] = cardsForConcept(withQuestions({ ...bfs, id: "a" }, 2));
    const [b1] = cardsForConcept(withQuestions({ ...bfs, id: "b" }, 1));
    const results = sessionResults([
      { card: a1!, rating: "good" },
      { card: b1!, rating: "again" },
      { card: a2!, rating: "easy" },
    ]);
    expect(results.map((r) => [r.conceptId, r.cards])).toEqual([
      ["a", 2],
      ["b", 1],
    ]);
    expect(results[0]!.score).toBeCloseTo(0.9);
    expect(results[1]!.score).toBe(0);
  });
});

describe("explain it back, offline", () => {
  it("counts words", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("  BFS visits nodes level-by-level, doesn't it?  ")).toBe(6);
    expect(MIN_EXPLAIN_WORDS).toBe(40);
  });

  it("uses interview bullets as the checklist", () => {
    const { concept, content } = withQuestions(bfs, 1);
    const items = selfCheckItems(concept, content);
    expect(items.map((i) => i.text)).toEqual([
      "Explores level by level",
      "Uses a queue",
      "O(V + E) time",
    ]);
  });

  it("falls back to the parts of the scope", () => {
    expect(scopeParts("a, b (c, d); `x, y`, e")).toEqual(["a", "b (c, d)", "x, y", "e"]);
    const items = selfCheckItems(bfs, EMPTY_CONTENT);
    expect(items.length).toBeGreaterThan(1);
    expect(items.map((i) => i.text).join(", ")).toBe(scopeParts(bfs.scope).join(", "));
  });

  it("scores ticked over total", () => {
    expect(selfCheckScore(3, 4)).toBe(0.75);
    expect(selfCheckScore(0, 0)).toBe(0);
    expect(plainText("Use a [queue](x) and **mark** `seen`")).toBe("Use a queue and mark seen");
  });
});
