// Reading support (F32, part 8): a concept level one part at a time. Each part is followed by
// one quick check from the concept's questions, self-rated like a flashcard (Again, Hard, Good,
// Easy) and recorded as a check; "Next part" shows the next one. "Read aloud" reads the newest
// part with the browser's voice (hidden where there is none), and the optional line focus dims
// the text outside the paragraph being read (the one in the middle of the screen, or tapped).
import { ArrowDown, ListChecks, Square, Volume2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { CardLabel } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { Skeleton } from "@/components/ui/Misc";
import { levelParts, partQuestion, speechText, type ReadingLevel } from "@/lib/adhd/reading";
import { RATING_LABEL, RATING_SCORE, RATINGS, type Rating } from "@/lib/review/flashcards";
import type { Concept, ConceptContent, QA } from "@/lib/types";
import { useAdhd } from "@/stores/adhdStore";
import { recordChecks } from "@/stores/conceptStateStore";
import { speak, speechAvailable, stopSpeaking } from "./readAloud";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));

/** How many parts are open, per concept and level, for this visit (so a return keeps the place). */
const opened = new Map<string, number>();

const RATING_HINT: Record<Rating, string> = {
  again: "I didn't know it",
  hard: "Got there slowly",
  good: "Knew it",
  easy: "Instantly",
};

function PartCheck({
  concept,
  level,
  index,
  qa,
}: {
  concept: Concept;
  level: ReadingLevel;
  index: number;
  qa: QA | undefined;
}) {
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState<Rating | null>(null);
  if (!qa) return null;
  const rate = (rating: Rating) => {
    setRated(rating);
    recordChecks([
      {
        conceptId: concept.id,
        kind: "flashcard",
        score: RATING_SCORE[rating],
        detail: { source: "reading", level, part: index + 1, question: qa.q, rating },
      },
    ]);
  };
  return (
    <section
      aria-label={`Quick check after part ${index + 1}`}
      className="max-w-[74ch] rounded-panel bg-surface-sunken px-4 py-3"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-accent">
        <ListChecks size={15} aria-hidden="true" />
        Quick check
      </p>
      <p className="mt-1 text-base font-medium text-text">{qa.q}</p>
      {!revealed ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button size="sm" onClick={() => setRevealed(true)}>
            Show the answer
          </Button>
          <span className="text-sm text-muted">Answer in your head first.</span>
        </div>
      ) : (
        <>
          <p className="mt-1 text-base text-muted">{qa.a}</p>
          {rated ? (
            <p className="mt-2 text-sm text-muted" role="status">
              Saved as a check: {RATING_LABEL[rated]}.
            </p>
          ) : (
            <fieldset className="mt-2">
              <legend className="mb-1.5 text-sm font-medium text-text">
                How well did you know it?
              </legend>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {RATINGS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => rate(r)}
                    className="flex min-h-11 flex-col items-start justify-center rounded-control bg-surface px-2.5 py-1.5 text-left hover:bg-rule"
                  >
                    <span className="text-sm font-medium text-text">{RATING_LABEL[r]}</span>
                    <span className="text-xs text-muted">{RATING_HINT[r]}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}
    </section>
  );
}

function ReadAloud({ markdown, label }: { markdown: string; label: string }) {
  const [speaking, setSpeaking] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      stop.current?.();
      stopSpeaking();
    },
    [],
  );
  if (!speechAvailable()) return null;
  return speaking ? (
    <Button
      size="sm"
      variant="ghost"
      icon={Square}
      onClick={() => {
        stop.current?.();
        setSpeaking(false);
      }}
    >
      Stop reading
    </Button>
  ) : (
    <Button
      size="sm"
      variant="ghost"
      icon={Volume2}
      aria-label={`Read aloud: ${label}`}
      onClick={() => {
        setSpeaking(true);
        stop.current = speak(speechText(markdown), () => setSpeaking(false));
      }}
    >
      Read aloud
    </Button>
  );
}

const UNITS =
  ".atlas-prose > :not(ul):not(ol):not(.atlas-table-wrap), .atlas-prose > ul > li, .atlas-prose > ol > li, .atlas-prose > .atlas-table-wrap";

/** The line focus: the paragraph crossing the middle of the screen (or the one tapped) stays clear. */
function useLineFocus(ref: RefObject<HTMLDivElement | null>, on: boolean, version: string) {
  useEffect(() => {
    const root = ref.current;
    if (!on || !root || typeof IntersectionObserver === "undefined") return;
    let current: Element | null = null;
    const mark = (el: Element | null) => {
      if (el === current) return;
      current?.removeAttribute("data-current");
      current = el;
      current?.setAttribute("data-current", "");
    };
    const units = [...root.querySelectorAll(UNITS)];
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).map((e) => e.target);
        if (hit.length) mark(hit[hit.length - 1]!);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const u of units) observer.observe(u);
    if (!current && units[0]) mark(units[0]);
    const onClick = (e: MouseEvent) => {
      const unit = (e.target as Element | null)?.closest(UNITS);
      if (unit && root.contains(unit)) mark(unit);
    };
    root.addEventListener("click", onClick);
    return () => {
      observer.disconnect();
      root.removeEventListener("click", onClick);
      current?.removeAttribute("data-current");
    };
  }, [ref, on, version]);
}

export function ReadingParts({
  concept,
  level,
  content,
  questions,
  onOpenConcept,
  after,
}: {
  concept: Concept;
  level: ReadingLevel;
  content: ConceptContent;
  questions: QA[];
  onOpenConcept?: (id: string) => void;
  /** What follows the level once every part is open (Mark as studied, Check yourself). */
  after?: React.ReactNode;
}) {
  const parts = useMemo(() => levelParts(level, content), [level, content]);
  const key = `${concept.id}:${level}`;
  const [shown, setShown] = useState(() =>
    Math.max(1, Math.min(parts.length, opened.get(key) ?? 1)),
  );
  useEffect(() => {
    opened.set(key, shown);
  }, [key, shown]);
  const lineFocus = useAdhd().lineFocus === true;
  const ref = useRef<HTMLDivElement>(null);
  useLineFocus(ref, lineFocus, `${key}:${shown}`);
  const newest = useRef<HTMLElement>(null);
  const all = shown >= parts.length;
  if (parts.length === 0) return null;
  return (
    <div ref={ref} className="space-y-4" data-line-focus={lineFocus || undefined}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm text-muted tabular-nums" aria-live="polite">
          Part {shown} of {parts.length}
        </p>
        <ReadAloud markdown={parts[shown - 1]!.markdown} label={`part ${shown}`} />
        {!all && (
          <button
            type="button"
            onClick={() => setShown(parts.length)}
            className="text-sm text-accent hover:underline"
          >
            Show the whole level
          </button>
        )}
      </div>
      {parts.slice(0, shown).map((part, i) => (
        <section
          key={i}
          ref={i === shown - 1 ? newest : undefined}
          tabIndex={-1}
          aria-label={`Part ${i + 1} of ${parts.length}`}
          className="space-y-3 outline-none"
        >
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
            {level === "interview" ? (
              <div className="max-w-[74ch] rounded-panel bg-surface-sunken px-5 py-4">
                {i === 0 && <CardLabel className="mb-1">Interview points</CardLabel>}
                <MarkdownView onConceptLink={onOpenConcept}>{part.markdown}</MarkdownView>
              </div>
            ) : (
              <MarkdownView onConceptLink={onOpenConcept}>
                {part.title ? `#### ${part.title}\n\n${part.markdown}` : part.markdown}
              </MarkdownView>
            )}
          </Suspense>
          <PartCheck
            key={`${key}:${i}`}
            concept={concept}
            level={level}
            index={i}
            qa={partQuestion(questions, level, i)}
          />
        </section>
      ))}
      {all ? (
        after
      ) : (
        <Button
          variant="primary"
          icon={ArrowDown}
          onClick={() => {
            setShown(shown + 1);
            // The new part takes focus, so keyboard and screen reader users land on it.
            requestAnimationFrame(() => newest.current?.focus({ preventScroll: false }));
          }}
          className={cx("max-sm:w-full")}
        >
          Next part
        </Button>
      )}
    </div>
  );
}
