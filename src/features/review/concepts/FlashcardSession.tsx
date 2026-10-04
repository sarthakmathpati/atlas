// A flashcard session (F14, offline): show a question, reveal the answer, rate it Again, Hard,
// Good or Easy. When the session ends (or is closed part way), each concept gets one check with
// the average of its ratings, which also moves its review schedule (section 11.1).
import { ArrowRight, Layers, RotateCcw } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CardLabel } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { LineDrawing } from "@/components/ui/LineDrawing";
import { Kbd, Skeleton } from "@/components/ui/Misc";
import { ProgressBar } from "@/components/ui/Progress";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { STATUS_LABEL } from "@/components/ui/labels";
import {
  buildDeck,
  RATING_LABEL,
  RATINGS,
  RATING_SCORE,
  sessionResults,
  type CardResult,
  type Flashcard,
  type Rating,
} from "@/lib/review/flashcards";
import { parseLocalDate } from "@/lib/time";
import type { Concept, Status } from "@/lib/types";
import { recordChecks, useConceptStateStore } from "@/stores/conceptStateStore";
import { studyContent } from "@/lib/concepts/custom";
import { useConceptNoteStore } from "@/stores/conceptNoteStore";
import { useConceptContents } from "@/stores/contentStore";
import { findConcept } from "@/stores/customConceptStore";
import { FlashcardDisc } from "@/features/adhd/FlashcardDisc";
import { sessionConcepts } from "./walkOrder";
import { WalkStrip } from "./WalkStrip";

import { ContentUnavailable } from "../../concept/ContentUnavailable";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));

const RATING_HINT: Record<Rating, string> = {
  again: "I didn't know it",
  hard: "Got there slowly",
  good: "Knew it",
  easy: "Instantly",
};

export interface SessionSummary {
  concepts: {
    concept: Concept;
    score: number;
    before: Status;
    after: Status;
    /** The next review date the session set (yyyy-mm-dd), when the concept is in review. */
    nextReview?: string;
  }[];
  cards: number;
}

const shortDate = (day: string) =>
  parseLocalDate(day).toLocaleDateString(undefined, { day: "numeric", month: "short" });

interface FlashcardSessionProps {
  conceptIds: readonly string[];
  session?: boolean;
  /** Order a topic's or subject's cards as a memory walk over their map places (F31). */
  walk?: boolean;
  /** Called once when the results are saved (end of deck, or closing part way). */
  onSaved?: (summary: SessionSummary) => void;
  onDone: () => void;
}

/** Loads the cards' text (data/content.ts), then runs the session with a fixed deck. */
export function FlashcardSession(props: FlashcardSessionProps) {
  const concepts = useMemo(
    () => sessionConcepts(props.conceptIds, props.walk),
    // The deck is fixed for the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const { value: contents, failed, retry } = useConceptContents(concepts);
  const deck = useMemo(
    () =>
      contents
        ? buildDeck(
            concepts.map((concept, i) => ({
              concept,
              // The owner's own concepts use the questions Claude wrote for them, if kept.
              content: studyContent(
                contents[i]!,
                useConceptNoteStore.getState().notes[concept.id]?.generated,
              ),
            })),
          )
        : null,
    [concepts, contents],
  );
  if (!deck) {
    return (
      <div className="px-4 py-4 sm:px-5">
        {failed ? (
          <ContentUnavailable onRetry={retry} />
        ) : (
          <div role="status" aria-label="Loading the cards" className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </div>
    );
  }
  return <Session {...props} concepts={concepts} deck={deck} />;
}

function Session({
  concepts,
  deck,
  session,
  walk,
  onSaved,
  onDone,
}: FlashcardSessionProps & { concepts: readonly Concept[]; deck: readonly Flashcard[] }) {
  // The memory walk's stops: the concepts the deck reaches, in deck order.
  const stops = useMemo(() => {
    if (!walk) return [];
    const seen = new Set<string>();
    const out: { id: string; name: string }[] = [];
    for (const c of deck) {
      if (seen.has(c.conceptId)) continue;
      seen.add(c.conceptId);
      out.push({ id: c.conceptId, name: findConcept(c.conceptId)?.name ?? c.conceptId });
    }
    return out;
  }, [walk, deck]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<CardResult[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const savedRef = useRef(false);
  const before = useRef(
    Object.fromEntries(
      concepts.map((c) => [
        c.id,
        useConceptStateStore.getState().states[c.id]?.status ?? "not_started",
      ]),
    ) as Record<string, Status>,
  );

  const save = (all: CardResult[]) => {
    if (savedRef.current || all.length === 0) return;
    savedRef.current = true;
    const perConcept = sessionResults(all);
    recordChecks(
      perConcept.map((r) => ({
        conceptId: r.conceptId,
        kind: "flashcard" as const,
        score: r.score,
        detail: { cards: r.cards, ratings: r.ratings },
      })),
      { session },
    );
    const states = useConceptStateStore.getState().states;
    const out: SessionSummary = {
      cards: all.length,
      concepts: perConcept.map((r) => ({
        concept: findConcept(r.conceptId)!,
        score: r.score,
        before: before.current[r.conceptId] ?? "not_started",
        after: states[r.conceptId]?.status ?? "not_started",
        nextReview: states[r.conceptId]?.srs.dueAt,
      })),
    };
    setSummary(out);
    onSaved?.(out);
  };

  // Closing part way still saves what was rated.
  const resultsRef = useRef(results);
  useEffect(() => {
    resultsRef.current = results;
  });
  const saveLater = useRef(save);
  useEffect(() => {
    saveLater.current = save;
  });
  useEffect(() => () => saveLater.current(resultsRef.current), []);

  const card = deck[index];
  const rate = (rating: Rating) => {
    if (!card) return;
    const next = [...results, { card, rating }];
    setResults(next);
    setRevealed(false);
    if (index + 1 >= deck.length) save(next);
    else setIndex(index + 1);
  };

  // Space or Enter reveals; 1 to 4 rate.
  useEffect(() => {
    if (summary) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        rate(RATINGS[Number(e.key) - 1]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (deck.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-5">
        <p className="text-base text-muted">There are no cards for this selection.</p>
      </div>
    );
  }

  if (summary) {
    const avg =
      summary.concepts.reduce((s, c) => s + c.score, 0) / Math.max(1, summary.concepts.length);
    const changed = summary.concepts.filter((c) => c.before !== c.after);
    // A calm finish that says what changed (12.10.8).
    return (
      <div className="mx-auto max-w-xl space-y-5 px-4 py-6 sm:px-5" role="status">
        <div className="flex flex-col items-center text-center">
          <LineDrawing name="flag" size={64} />
          <p className="mt-2 font-display text-xl font-semibold text-text">Session saved</p>
          <p className="mt-1 text-base text-muted">
            {summary.cards} {summary.cards === 1 ? "card" : "cards"}, average{" "}
            {Math.round(avg * 100)}%.{" "}
            {changed.length === 0
              ? "No status changed this time; the reviews still count."
              : `${changed.length} ${changed.length === 1 ? "concept changed" : "concepts changed"} status.`}
          </p>
        </div>
        <ul className="space-y-1 rounded-panel bg-surface-sunken p-2">
          {summary.concepts.map(({ concept, score, before: b, after, nextReview }) => (
            <li key={concept.id} className="flex items-center gap-3 rounded-control px-2.5 py-2">
              <StatusGlyph status={after} size={16} title={STATUS_LABEL[after]} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base text-text">{concept.name}</span>
                <span className="block text-sm text-muted">
                  {b !== after
                    ? `${STATUS_LABEL[b]} to ${STATUS_LABEL[after].toLowerCase()}`
                    : STATUS_LABEL[after]}
                  {nextReview ? `, next review ${shortDate(nextReview)}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-sm text-muted tabular-nums">
                {Math.round(score * 100)}%
              </span>
              {b !== after && (
                <span className="sr-only">Now {STATUS_LABEL[after].toLowerCase()}</span>
              )}
            </li>
          ))}
        </ul>
        <div className="flex justify-center">
          <Button variant="primary" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  const concept = findConcept(card!.conceptId);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span className="min-w-0 truncate">{concept?.name}</span>
        <span className="flex shrink-0 items-center gap-2 tabular-nums">
          <FlashcardDisc cards={deck.length} running />
          Card {index + 1} of {deck.length}
        </span>
      </div>
      <ProgressBar value={index / deck.length} label={`Card ${index + 1} of ${deck.length}`} />
      {walk && (
        <WalkStrip stops={stops} current={stops.findIndex((s) => s.id === card!.conceptId)} />
      )}
      {/* The card turns to show the answer: the back keeps the question small above it. */}
      <div
        key={revealed ? `back-${index}` : `front-${index}`}
        className={cx(
          "flex min-h-56 flex-col justify-center rounded-focal bg-surface-raised px-5 py-6 shadow-focal sm:px-8 sm:py-8",
          revealed && "flashcard-turn",
        )}
        aria-live={revealed ? "polite" : undefined}
      >
        {revealed ? (
          <>
            <div className="text-sm text-muted [&_.atlas-prose]:text-base">
              <Suspense fallback={<Skeleton className="h-5 w-2/3" />}>
                <MarkdownView>{card!.front}</MarkdownView>
              </Suspense>
            </div>
            <CardLabel className="mt-4 mb-1.5">Answer</CardLabel>
            <Suspense fallback={<Skeleton className="h-6 w-full" />}>
              <MarkdownView>{card!.back}</MarkdownView>
            </Suspense>
          </>
        ) : (
          <>
            <CardLabel className="mb-1.5">Question</CardLabel>
            <Suspense fallback={<Skeleton className="h-6 w-2/3" />}>
              <MarkdownView>{card!.front}</MarkdownView>
            </Suspense>
            {card!.kind === "recall" && (
              <p className="mt-3 text-sm text-muted">
                Its written questions arrive with the content. For now, recall what it covers out
                loud or on paper, then compare.
              </p>
            )}
          </>
        )}
      </div>
      {revealed ? (
        <fieldset>
          <legend className="mb-2 flex w-full flex-wrap items-baseline justify-between gap-2 text-sm font-medium text-text">
            How well did you know it?
            <span className="font-normal text-muted max-md:hidden">
              Press <Kbd>1</Kbd> to <Kbd>4</Kbd> to rate
            </span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATINGS.map((r, i) => (
              <button
                key={r}
                type="button"
                onClick={() => rate(r)}
                className={cx(
                  "flex min-h-14 flex-col items-start justify-center rounded-control border border-transparent bg-surface-sunken px-3 py-2 text-left transition-colors hover:bg-rule",
                  r === "good" && "border-accent/50",
                )}
              >
                <span className="flex w-full items-center justify-between gap-2 font-medium text-text">
                  {RATING_LABEL[r]}
                  <Kbd className="max-md:hidden">{i + 1}</Kbd>
                </span>
                <span className="text-xs text-muted">
                  {RATING_HINT[r]} ({Math.round(RATING_SCORE[r] * 100)}%)
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Button
            variant="primary"
            icon={RotateCcw}
            onClick={() => setRevealed(true)}
            className="max-md:w-full"
          >
            Show answer
          </Button>
          <span className="text-sm text-muted max-md:hidden">
            or press <Kbd>Space</Kbd> to turn the card
          </span>
        </div>
      )}
    </div>
  );
}

export function FlashcardIntro({
  count,
  covered,
  cards,
  onStart,
}: {
  count: number;
  /** How many of the concepts the deck reaches (it stops at 30 cards). */
  covered: number;
  cards: number;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-5 sm:px-5">
      <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
        <Layers size={20} aria-hidden="true" />
      </span>
      <p className="text-base text-text">
        {cards} {cards === 1 ? "card" : "cards"} from{" "}
        {covered < count
          ? `the first ${covered} of ${count} concepts (fading and learning ones come first)`
          : `${count} ${count === 1 ? "concept" : "concepts"}`}
        . Answer in your head, reveal, then rate how well you knew it.
      </p>
      <Button variant="primary" trailingIcon={ArrowRight} onClick={onStart}>
        Start
      </Button>
    </div>
  );
}
