// A searchable list of every subject, topic and concept. It previews the syllabus that powers the
// map and is the starting point of the map's accessible list view (F30).
import { ChevronRight, Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { SubjectIcon } from "@/components/ui/SubjectIcon";
import { seedProblemsByConcept } from "@/data/seed";
import { concepts, conceptsByTopic, subjects, topicById, topicsBySubject } from "@/data/syllabus";
import type { Concept, Importance } from "@/lib/types";

const IMPORTANCE_LABEL: Record<Importance, string> = {
  must: "Must-know",
  important: "Important",
  advanced: "Advanced",
};

function ImportanceChip({ importance }: { importance: Importance }) {
  const tone =
    importance === "must"
      ? "border-rule-strong text-text"
      : importance === "important"
        ? "border-rule text-muted"
        : "border-rule border-dashed text-faint";
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-xs ${tone}`}
    >
      {IMPORTANCE_LABEL[importance]}
    </span>
  );
}

function matches(c: Concept, q: string): boolean {
  return c.name.toLowerCase().includes(q) || c.scope.toLowerCase().includes(q);
}

function ConceptRow({ concept }: { concept: Concept }) {
  const problems = seedProblemsByConcept.get(concept.id)?.length ?? 0;
  return (
    <li className="flex flex-col gap-2 border-t border-rule px-4 py-3 first:border-t-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-full border-[1.5px] border-not-started"
            title="Not started"
          />
          <span className="font-medium text-text">{concept.name}</span>
          {concept.isPattern && (
            <span
              className="rounded-control bg-accent-soft px-1.5 font-condensed text-xs font-semibold text-accent"
              title="Pattern: problems attach to it"
            >
              Pattern
            </span>
          )}
        </div>
        {concept.scope !== concept.name && (
          <p className="mt-1 pl-5 text-sm text-muted">{concept.scope}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-5 sm:pl-0">
        {problems > 0 && (
          <span className="text-xs text-muted">
            {problems} {problems === 1 ? "problem" : "problems"}
          </span>
        )}
        <ImportanceChip importance={concept.importance} />
      </div>
    </li>
  );
}

interface SyllabusExplorerProps {
  selected: string | null;
  /** Subjects whose topics are shown. */
  open: ReadonlySet<string>;
  onToggle: (subjectId: string) => void;
  /** Set when a subject is picked on the map (and opened): scroll to it. */
  focusRequest: { id: string; n: number } | null;
}

export function SyllabusExplorer({
  selected,
  open,
  onToggle,
  focusRequest,
}: SyllabusExplorerProps) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  // A subject picked on the map is opened by the page; bring it into view here.
  useEffect(() => {
    if (!focusRequest) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    sectionRefs.current
      .get(focusRequest.id)
      ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [focusRequest]);

  const matchCount = useMemo(
    () => (deferred ? concepts.filter((c) => matches(c, deferred)).length : concepts.length),
    [deferred],
  );

  return (
    <section aria-labelledby="syllabus-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="syllabus-heading" className="text-xl text-text">
            Syllabus
          </h2>
          <p className="mt-1 text-base text-muted">
            Every subject, topic and concept on the map, in learning order.
          </p>
        </div>
        <label className="relative block w-full sm:w-80">
          <span className="sr-only">Search concepts</span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${concepts.length} concepts`}
            className="h-11 w-full rounded-control border border-rule bg-surface pr-3 pl-9 text-base text-text placeholder:text-faint focus-visible:border-accent sm:h-10"
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
              items: (conceptsByTopic.get(t.id) ?? []).filter(
                (c) => !deferred || matches(c, deferred),
              ),
            }))
            .filter((t) => t.items.length > 0);
          if (deferred && visibleTopics.length === 0) return null;
          const total = subjectTopics.reduce(
            (n, t) => n + (conceptsByTopic.get(t.id)?.length ?? 0),
            0,
          );
          const isOpen = Boolean(deferred) || open.has(subject.id);
          const panelId = `subject-panel-${subject.id}`;
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
                  className={`flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left font-normal transition-colors hover:bg-surface-sunken ${
                    selected === subject.id ? "bg-accent-soft" : ""
                  }`}
                >
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className={`shrink-0 text-faint transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
                  />
                  <span className="text-muted">
                    <SubjectIcon name={subject.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-text">{subject.name}</span>
                    <span className="block truncate text-sm text-muted">{subject.description}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm text-muted tabular-nums">
                    {subjectTopics.length} topics
                    <span className="hidden sm:inline">, {total} concepts</span>
                  </span>
                </button>
              </h3>
              {isOpen && (
                <div id={panelId} className="border-t border-rule bg-canvas/40 px-2 pb-3 sm:px-4">
                  {visibleTopics.map(({ topic, items }) => (
                    <div key={topic.id} className="pt-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 px-2">
                        <h4 className="text-base font-semibold text-text">{topic.name}</h4>
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
                          <ConceptRow key={c.id} concept={c} />
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
