// The map as a list (F30's accessible alternative to the canvas): every subject, topic and concept
// in learning order (the owner's own concepts included), with statuses and status mixes.
// Searchable; a subject, topic or concept can be targeted from a link (#/map?view=list&subject=…,
// ?topic=…, ?focus=…), which opens it, scrolls to it and highlights it.
import { ChevronRight, Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { SegmentedBar } from "@/components/ui/Progress";
import { isCustomConceptId } from "@/lib/concepts/custom";
import { countStatuses } from "@/lib/map/summary";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { useCustomConceptStore } from "@/stores/customConceptStore";
import { conceptHref } from "@/app/router";
import { ImportanceChip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { prefersReducedMotion } from "@/components/ui/hooks";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { STATUS_LABEL } from "@/components/ui/labels";
import { SubjectIcon } from "@/components/ui/SubjectIcon";
import { seedProblemsByConcept } from "@/data/seed";
import {
  conceptById,
  conceptsByTopic,
  subjects,
  topicById,
  topicsBySubject,
} from "@/data/syllabus";
import type { Concept } from "@/lib/types";
import { useConceptStatus } from "@/stores/conceptStateStore";

function matches(c: Concept, q: string): boolean {
  return c.name.toLowerCase().includes(q) || c.scope.toLowerCase().includes(q);
}

function ConceptRow({ concept, highlighted }: { concept: Concept; highlighted: boolean }) {
  const status = useConceptStatus(concept.id);
  const hidden = useConceptStateStore((s) => Boolean(s.states[concept.id]?.hidden));
  const problems = seedProblemsByConcept.get(concept.id)?.length ?? 0;
  return (
    <li id={`list-${concept.id}`} className="scroll-mt-24 border-t border-rule first:border-t-0">
      <a
        href={conceptHref(concept.id)}
        className={cx(
          "flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface-sunken sm:flex-row sm:items-start sm:gap-4",
          highlighted && "bg-accent-soft",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusGlyph status={status} size={14} />
            <span className="sr-only">{STATUS_LABEL[status]}:</span>
            <span className="font-medium text-text">{concept.name}</span>
            {concept.isPattern && (
              <span className="rounded-control bg-accent-soft px-1.5 font-condensed text-xs font-semibold text-accent">
                Pattern
              </span>
            )}
            {isCustomConceptId(concept.id) && <Chip className="text-accent">Yours</Chip>}
            {hidden && <Chip className="border-dashed">Hidden from the map</Chip>}
          </div>
          {concept.scope !== concept.name && (
            <p className="mt-1 pl-[22px] text-sm text-muted">{concept.scope}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-[22px] sm:pl-0">
          {problems > 0 && (
            <span className="text-xs text-muted">
              {problems} {problems === 1 ? "problem" : "problems"}
            </span>
          )}
          <ImportanceChip importance={concept.importance} />
        </div>
      </a>
    </li>
  );
}

export interface ListTarget {
  kind: "subject" | "topic" | "concept";
  id: string;
  /** The link it came from; a new link scrolls again. */
  key: string;
}

interface MapListViewProps {
  target: ListTarget | null;
}

function subjectOf(target: ListTarget | null, custom: Record<string, Concept>): string | null {
  if (!target) return null;
  if (target.kind === "subject") return target.id;
  if (target.kind === "topic") return topicById.get(target.id)?.subjectId ?? null;
  return (conceptById.get(target.id) ?? custom[target.id])?.subjectId ?? null;
}

export function MapListView({ target }: MapListViewProps) {
  const custom = useCustomConceptStore((s) => s.concepts);
  const statuses = useConceptStateStore((s) => s.states);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => {
    const s = subjectOf(target, custom);
    return new Set(s ? [s] : []);
  });
  // A new link opens its subject.
  const [openedFor, setOpenedFor] = useState(target?.key ?? "");
  if (target && openedFor !== target.key) {
    setOpenedFor(target.key);
    const s = subjectOf(target, custom);
    if (s && !open.has(s)) setOpen(new Set(open).add(s));
  }
  const onToggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const byTopic = useMemo(() => {
    const map = new Map<string, Concept[]>();
    for (const t of topicById.keys()) {
      const extra = Object.values(custom)
        .filter((c) => c.topicId === t)
        .sort((a, b) => a.order - b.order);
      map.set(t, [...(conceptsByTopic.get(t) ?? []), ...extra]);
    }
    return map;
  }, [custom]);
  const statusOf = (id: string) => statuses[id]?.status ?? "not_started";
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  // Bring a targeted subject, topic or concept into view once it's rendered.
  useEffect(() => {
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      const el =
        target.kind === "subject"
          ? sectionRefs.current.get(target.id)
          : document.getElementById(`list-${target.id}`);
      el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const all = useMemo(() => [...byTopic.values()].flat(), [byTopic]);
  const matchCount = useMemo(
    () => (deferred ? all.filter((c) => matches(c, deferred)).length : all.length),
    [deferred, all],
  );

  return (
    <section aria-labelledby="syllabus-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="syllabus-heading" className="text-xl text-text">
            Every concept
          </h2>
          <p className="mt-1 text-base text-muted">
            Subjects, topics and concepts in learning order.
          </p>
        </div>
        <label className="relative block w-full sm:w-80">
          <span className="sr-only">Filter concepts</span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${all.length} concepts`}
            className="h-11 w-full rounded-control border border-rule bg-surface pr-3 pl-9 text-base text-text placeholder:text-faint hover:border-rule-strong focus-visible:border-accent sm:h-10"
          />
        </label>
      </div>
      {deferred && (
        <p className="mt-3 text-sm text-muted" role="status">
          {matchCount === 0
            ? "No concepts match. Try a shorter word."
            : `${matchCount} ${matchCount === 1 ? "concept matches" : "concepts match"}.`}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-panel border border-rule bg-surface">
        {subjects.map((subject) => {
          const subjectTopics = topicsBySubject.get(subject.id) ?? [];
          const visibleTopics = subjectTopics
            .map((t) => ({
              topic: t,
              items: (byTopic.get(t.id) ?? []).filter((c) => !deferred || matches(c, deferred)),
            }))
            .filter((t) => t.items.length > 0);
          if (deferred && visibleTopics.length === 0) return null;
          const subjectConcepts = subjectTopics.flatMap((t) => byTopic.get(t.id) ?? []);
          const total = subjectConcepts.length;
          const counts = countStatuses(
            subjectConcepts.map((c) => c.id),
            statusOf,
          );
          const isOpen = Boolean(deferred) || open.has(subject.id);
          const panelId = `subject-panel-${subject.id}`;
          const targeted = target?.kind === "subject" && target.id === subject.id;
          return (
            <section
              key={subject.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(subject.id, el);
                else sectionRefs.current.delete(subject.id);
              }}
              className="scroll-mt-4 border-t border-rule first:border-t-0"
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => onToggle(subject.id)}
                  className={cx(
                    "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left font-normal transition-colors hover:bg-surface-sunken",
                    targeted && "bg-accent-soft",
                  )}
                >
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className={cx(
                      "shrink-0 text-faint transition-transform duration-150",
                      isOpen && "rotate-90",
                    )}
                  />
                  <span className="text-muted">
                    <SubjectIcon name={subject.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-text">{subject.name}</span>
                    <span className="block truncate text-sm text-muted">{subject.description}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 text-right text-sm text-muted tabular-nums">
                    <span>
                      {counts.strong} of {total} strong
                      <span className="hidden sm:inline">, {subjectTopics.length} topics</span>
                    </span>
                    <SegmentedBar counts={counts} className="w-24" height={4} />
                  </span>
                </button>
              </h3>
              {isOpen && (
                <div id={panelId} className="border-t border-rule bg-canvas/40 px-2 pb-3 sm:px-4">
                  {visibleTopics.map(({ topic, items }) => (
                    <div
                      key={topic.id}
                      id={`list-${topic.id}`}
                      className={cx(
                        "scroll-mt-4 rounded-control pt-4",
                        target?.kind === "topic" &&
                          target.id === topic.id &&
                          "bg-accent-soft/60 px-2 pb-2 -mx-2",
                      )}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 px-2">
                        <h4 className="text-base font-semibold text-text">
                          {topic.name}
                          <span className="ml-2 text-sm font-normal text-muted tabular-nums">
                            {
                              countStatuses(
                                (byTopic.get(topic.id) ?? []).map((c) => c.id),
                                statusOf,
                              ).strong
                            }{" "}
                            of {byTopic.get(topic.id)?.length ?? 0} strong
                          </span>
                        </h4>
                        {topic.prereqTopics.length > 0 && (
                          <p className="text-xs text-muted">
                            After{" "}
                            {topic.prereqTopics
                              .map((id) => topicById.get(id)?.name ?? id)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                      <ul className="mt-2 overflow-hidden rounded-control border border-rule bg-surface">
                        {items.map((c) => (
                          <ConceptRow
                            key={c.id}
                            concept={c}
                            highlighted={target?.kind === "concept" && target.id === c.id}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
