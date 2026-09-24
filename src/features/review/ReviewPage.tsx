// Review (F9): problems due for a re-solve and concepts due for review, most urgent first, with
// what comes up this week. A re-solve opens the workspace with earlier work hidden.
import { ArrowRight, CalendarClock, Layers, RotateCcw, Trophy } from "lucide-react";
import { conceptHref, routeHref } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip, DifficultyChip } from "@/components/ui/Chip";
import { EmptyState, PageSkeleton } from "@/components/ui/Misc";
import { STATUS_LABEL } from "@/components/ui/labels";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { topicById } from "@/data/syllabus";
import { ESTIMATES } from "@/lib/constants";
import { problemLabel } from "@/lib/problems/catalog";
import { weekdayDate } from "@/lib/problems/progress";
import { dueReason, type DueConcept, type DueProblem } from "@/lib/review/queue";
import { useToday } from "@/stores/clockStore";
import { openConceptReview, openFlashcards } from "@/stores/conceptDialogStore";
import { findConcept } from "@/stores/customConceptStore";
import { useProblemStore } from "@/stores/problemStore";
import { useReviewQueue } from "./useReviewQueue";

function lateLabel(daysLate: number): string {
  return daysLate <= 0 ? "Due today" : `Overdue ${daysLate} ${daysLate === 1 ? "day" : "days"}`;
}

function ProblemRow({ item, today }: { item: DueProblem; today: string }) {
  const href = routeHref("/problems", item.info.id, { mode: "resolve" });
  return (
    <li className="flex flex-col gap-2 border-t border-rule px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <a href={href} className="font-medium text-text hover:text-accent hover:underline">
            {problemLabel(item.info)}
          </a>
          <DifficultyChip difficulty={item.info.difficulty} />
          {item.tricky && (
            <Chip className="border-dashed text-warning" title="It slipped twice or more">
              Tricky
            </Chip>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted">{dueReason(item, today)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span
          className={
            item.daysLate > 0
              ? "text-sm font-medium text-warning"
              : "text-sm font-medium text-accent"
          }
        >
          {lateLabel(item.daysLate)}
        </span>
        <span className="text-sm text-muted tabular-nums">
          {ESTIMATES.resolve[item.info.difficulty]} min
        </span>
        <Button size="sm" href={href} icon={RotateCcw}>
          Re-solve
        </Button>
      </div>
    </li>
  );
}

function ConceptRow({ item }: { item: DueConcept }) {
  const concept = findConcept(item.conceptId);
  if (!concept) return null;
  return (
    <li className="flex flex-col gap-2 border-t border-rule px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <StatusGlyph status={item.state.status} size={16} title={STATUS_LABEL[item.state.status]} />
        <div className="min-w-0 flex-1">
          <a
            href={conceptHref(concept.id)}
            className="font-medium text-text hover:text-accent hover:underline"
          >
            {concept.name}
          </a>
          <p className="text-sm text-muted">{topicById.get(concept.topicId)?.name}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 pl-7 sm:pl-0">
        <span
          className={
            item.daysLate > 0
              ? "text-sm font-medium text-warning"
              : "text-sm font-medium text-accent"
          }
        >
          {lateLabel(item.daysLate)}
        </span>
        <Button size="sm" icon={RotateCcw} onClick={() => openConceptReview(concept.id)}>
          Review
        </Button>
      </div>
    </li>
  );
}

function Panel({
  title,
  count,
  children,
  id,
  action,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  id: string;
  action?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="rounded-panel border border-rule bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
        <h2 id={id} className="flex items-baseline gap-3 py-0.5 text-md font-semibold text-text">
          {title}
          {count !== undefined && (
            <span className="text-sm font-normal text-muted tabular-nums">{count}</span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function ReviewPage() {
  const loaded = useProblemStore((s) => s.loaded);
  const queue = useReviewQueue();
  const today = useToday();
  const minutes = queue.problems.reduce((n, p) => n + ESTIMATES.resolve[p.info.difficulty], 0);

  const description =
    queue.count === 0
      ? "Problems and concepts come back here just before you'd forget them."
      : `${queue.problems.length} ${queue.problems.length === 1 ? "problem" : "problems"} to re-solve${
          queue.concepts.length
            ? ` and ${queue.concepts.length} ${queue.concepts.length === 1 ? "concept" : "concepts"} to review`
            : ""
        }${minutes ? `, about ${minutes} minutes` : ""}. Most urgent first.`;

  return (
    <PageFrame>
      <PageHeader title="Review" description={description} />
      {!loaded ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <div className="min-w-0 space-y-6">
            {queue.problems.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title={
                  queue.upcoming.length ? "Nothing to re-solve today" : "Nothing to re-solve yet"
                }
                actions={
                  <Button href="#/problems" trailingIcon={ArrowRight}>
                    Go to problems
                  </Button>
                }
              >
                {queue.upcoming.length
                  ? "The next re-solves are listed alongside. Coming back at the right moment is what makes a solution stick."
                  : "When you save an attempt, the problem is scheduled to come back: tomorrow if it was hard going, a few days later if you solved it alone, and further apart each time after that."}
              </EmptyState>
            ) : (
              <Panel title="Problems to re-solve" count={queue.problems.length} id="due-problems">
                <ul>
                  {queue.problems.map((p) => (
                    <ProblemRow key={p.info.id} item={p} today={today} />
                  ))}
                </ul>
              </Panel>
            )}
            <Panel
              title="Concepts to review"
              count={queue.concepts.length}
              id="due-concepts"
              action={
                queue.concepts.length > 1 ? (
                  <Button
                    size="sm"
                    icon={Layers}
                    onClick={() =>
                      openFlashcards({
                        conceptIds: queue.concepts.map((c) => c.conceptId),
                        title: "Flashcards: everything due",
                        session: true,
                      })
                    }
                  >
                    Flashcards for all
                  </Button>
                ) : undefined
              }
            >
              {queue.concepts.length > 0 && (
                <ul>
                  {queue.concepts.map((c) => (
                    <ConceptRow key={c.conceptId} item={c} />
                  ))}
                </ul>
              )}
              <p className="border-t border-rule px-4 py-3 text-sm text-muted first:border-t-0">
                {queue.concepts.length === 0
                  ? "Concepts join the review queue once you study them or take a quick check. "
                  : ""}
                A review shows the interview points, then checks you with flashcards or by
                explaining it back. How it goes sets the next review, further apart each time.
              </p>
            </Panel>
          </div>
          <aside className="space-y-6" aria-label="Coming up">
            <Panel title="Coming up this week" count={queue.upcoming.length} id="upcoming">
              {queue.upcoming.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted">Nothing else in the next seven days.</p>
              ) : (
                <ul>
                  {queue.upcoming.slice(0, 12).map((u) => (
                    <li
                      key={u.info.id}
                      className="flex items-baseline justify-between gap-3 border-t border-rule px-4 py-2 first:border-t-0"
                    >
                      <a
                        href={routeHref("/problems", u.info.id)}
                        className="min-w-0 truncate text-base text-text hover:underline"
                      >
                        {problemLabel(u.info)}
                      </a>
                      <span className="shrink-0 text-sm text-muted">
                        {u.inDays === 1 ? "Tomorrow" : weekdayDate(u.dueAt, today)}
                      </span>
                    </li>
                  ))}
                  {queue.upcoming.length > 12 && (
                    <li className="border-t border-rule px-4 py-2 text-sm text-muted">
                      and {queue.upcoming.length - 12} more
                    </li>
                  )}
                </ul>
              )}
            </Panel>
            {queue.mastered > 0 && (
              <a
                href={routeHref("/problems", undefined, { status: "mastered" })}
                className="flex items-center gap-3 rounded-panel border border-rule bg-surface px-4 py-3 hover:bg-surface-sunken"
              >
                <Trophy size={18} aria-hidden="true" className="text-success" />
                <span className="text-base text-text">
                  {queue.mastered} {queue.mastered === 1 ? "problem" : "problems"} mastered
                </span>
              </a>
            )}
          </aside>
        </div>
      )}
    </PageFrame>
  );
}
