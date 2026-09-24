// Flashcards (F14, offline): cards come from each concept's seeded interview questions. A concept
// whose questions aren't written yet gets one recall card ("explain it in your own words"), with
// what it covers as the answer, so reviews work before the content is complete.
// Ratings score Again 0, Hard 0.4, Good 0.8, Easy 1; a session records one check per concept with
// the average of its cards.
import type { Concept, ConceptContent } from "@/lib/types";

export type Rating = "again" | "hard" | "good" | "easy";

export const RATING_SCORE: Record<Rating, number> = { again: 0, hard: 0.4, good: 0.8, easy: 1 };
export const RATINGS: Rating[] = ["again", "hard", "good", "easy"];
export const RATING_LABEL: Record<Rating, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

/** Sessions stay short: at most this many cards. */
export const MAX_SESSION_CARDS = 30;

export interface Flashcard {
  id: string;
  conceptId: string;
  /** Markdown. */
  front: string;
  /** Markdown. */
  back: string;
  kind: "question" | "recall";
}

/** A concept with its loaded text (data/content.ts). */
export interface DeckItem {
  concept: Concept;
  content: ConceptContent;
}

export function cardsForConcept({ concept, content }: DeckItem): Flashcard[] {
  const { questions, interview } = content;
  if (questions.length > 0) {
    return questions.map((qa, i) => ({
      id: `${concept.id}#${i}`,
      conceptId: concept.id,
      front: qa.q,
      back: qa.a,
      kind: "question",
    }));
  }
  const points = interview.length ? `\n\n${interview.map((b) => `- ${b}`).join("\n")}` : "";
  return [
    {
      id: `${concept.id}#recall`,
      conceptId: concept.id,
      front: `Explain **${concept.name}** in your own words. What does it cover?`,
      back: `${concept.scope.charAt(0).toUpperCase()}${concept.scope.slice(1)}.${points}`,
      kind: "recall",
    },
  ];
}

/**
 * A session deck: every concept gets at least one card (concepts in the given order), then the
 * rest of their questions, up to `max` cards in total.
 */
export function buildDeck(items: readonly DeckItem[], max = MAX_SESSION_CARDS): Flashcard[] {
  const concepts = items.map((i) => i.concept);
  const perConcept = items.map(cardsForConcept);
  const deck: Flashcard[] = [];
  for (const cards of perConcept) {
    if (deck.length >= max) break;
    if (cards[0]) deck.push(cards[0]);
  }
  for (let round = 1; deck.length < max; round++) {
    let added = false;
    for (const cards of perConcept) {
      const card = cards[round];
      if (!card) continue;
      deck.push(card);
      added = true;
      if (deck.length >= max) break;
    }
    if (!added) break;
  }
  // Keep each concept's cards together, in the concepts' order.
  const order = new Map(concepts.map((c, i) => [c.id, i]));
  const within = new Map(deck.map((c, i) => [c.id, i]));
  return deck.sort(
    (a, b) =>
      (order.get(a.conceptId) ?? 0) - (order.get(b.conceptId) ?? 0) ||
      within.get(a.id)! - within.get(b.id)!,
  );
}

/**
 * The size of the deck buildDeck would make, from the concepts' `written` flags alone (no text
 * needs to load): each concept has one card per written question, or one recall card.
 */
export function deckSize(
  concepts: readonly Concept[],
  max = MAX_SESSION_CARDS,
): { cards: number; covered: number } {
  const total = concepts.reduce((n, c) => n + Math.max(1, c.written.questions), 0);
  return { cards: Math.min(max, total), covered: Math.min(max, concepts.length) };
}

export interface CardResult {
  card: Flashcard;
  rating: Rating;
}

export interface ConceptResult {
  conceptId: string;
  /** Average rating score of the concept's cards (0 to 1). */
  score: number;
  cards: number;
  ratings: Rating[];
}

/** One result per concept, in the order the concepts were first seen. */
export function sessionResults(results: readonly CardResult[]): ConceptResult[] {
  const map = new Map<string, ConceptResult>();
  for (const { card, rating } of results) {
    const r = map.get(card.conceptId) ?? {
      conceptId: card.conceptId,
      score: 0,
      cards: 0,
      ratings: [],
    };
    r.ratings.push(rating);
    r.cards++;
    map.set(card.conceptId, r);
  }
  for (const r of map.values()) {
    r.score = r.ratings.reduce((s, x) => s + RATING_SCORE[x], 0) / r.ratings.length;
  }
  return [...map.values()];
}
