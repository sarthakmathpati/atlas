// A concept (F3 precursor). Phase 4 turns this into the map's side panel with Learn, Practice,
// Notes and Ask tabs; this page already shows everything the syllabus knows about the concept:
// where it sits, what it covers, its content when written, connections and linked problems.
import { ArrowUpRight, BookOpenText, Map as MapIcon, Sparkles } from "lucide-react";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { conceptHref, problemHref, routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip, DifficultyChip, ImportanceChip, StatusChip } from "@/components/ui/Chip";
import { EmptyState, Skeleton } from "@/components/ui/Misc";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { leetCodeUrl } from "@/data/problems.seed";
import { seedProblemsByConcept } from "@/data/seed";
import { conceptById, dependentsOf, hasCoreContent, subjectById, topicById } from "@/data/syllabus";
import type { Concept } from "@/lib/types";
import { useConceptStatus } from "@/stores/conceptStateStore";
import { NotFoundPage } from "../placeholder/pages";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));

type Level = "simple" | "interview" | "deep";

function ConceptLink({ id, reason }: { id: string; reason?: string }) {
  const concept = conceptById.get(id);
  const status = useConceptStatus(id);
  if (!concept) return null;
  return (
    <li>
      <a
        href={conceptHref(id)}
        className="-mx-2 flex items-start gap-2.5 rounded-control px-2 py-1.5 hover:bg-surface-sunken"
      >
        <StatusGlyph status={status} size={14} className="mt-1" />
        <span className="min-w-0">
          <span className="block text-base text-text">{concept.name}</span>
          <span className="block text-sm text-muted">
            {reason ?? `${topicById.get(concept.topicId)?.name ?? ""}`}
          </span>
        </span>
      </a>
    </li>
  );
}

function Section({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-panel border border-rule bg-surface">
      <h2
        id={id}
        className="border-b border-rule px-4 py-3 text-md font-semibold text-text sm:px-5"
      >
        {title}
      </h2>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

function Content({ concept }: { concept: Concept }) {
  const status = useConceptStatus(concept.id);
  const [level, setLevel] = useState<Level>(status === "not_started" ? "simple" : "interview");
  const { content } = concept;
  if (!hasCoreContent(concept)) {
    return (
      <EmptyState
        icon={BookOpenText}
        title="The explanation for this concept is still being written"
        compact
      >
        Content is added subject by subject. Until then, the scope above says what it covers, and
        “Explain with Claude” arrives with the Claude features in phase 6.
      </EmptyState>
    );
  }
  const text =
    level === "simple"
      ? content.simple
      : level === "interview"
        ? content.interview.map((b) => `- ${b}`).join("\n")
        : (content.deep ?? "");
  return (
    <div className="space-y-4">
      <SegmentedControl<Level>
        label="Depth"
        value={level}
        onChange={setLevel}
        options={[
          { value: "simple", label: "Simple" },
          { value: "interview", label: "Interview" },
          ...(content.deep ? [{ value: "deep" as const, label: "Deep" }] : []),
        ]}
      />
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <MarkdownView>{text}</MarkdownView>
      </Suspense>
    </div>
  );
}

export default function ConceptPage() {
  const route = useRoute();
  const concept = route.id ? conceptById.get(route.id) : undefined;
  const status = useConceptStatus(route.id ?? "");
  if (!concept) return <NotFoundPage />;

  const topic = topicById.get(concept.topicId);
  const subject = subjectById.get(concept.subjectId);
  const unlocks = dependentsOf.get(concept.id) ?? [];
  const problems = seedProblemsByConcept.get(concept.id) ?? [];
  const { content } = concept;

  return (
    <PageFrame>
      <PageHeader
        eyebrow={
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <a
                  href={routeHref("/map", undefined, { subject: concept.subjectId })}
                  className="hover:text-text hover:underline"
                >
                  {subject?.name}
                </a>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <a
                  href={routeHref("/map", undefined, { topic: concept.topicId })}
                  className="hover:text-text hover:underline"
                >
                  {topic?.name}
                </a>
              </li>
            </ol>
          </nav>
        }
        title={concept.name}
        actions={
          <Button icon={MapIcon} href={routeHref("/map", undefined, { focus: concept.id })}>
            Show on the map
          </Button>
        }
      />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <StatusChip status={status} />
        <ImportanceChip importance={concept.importance} />
        {concept.isPattern && (
          <Chip className="border-transparent bg-accent-soft text-accent">Pattern</Chip>
        )}
        <Chip>About {concept.estMinutes} min</Chip>
        {concept.tracks.map((t) => (
          <Chip key={t}>{t === "sde" ? "SDE" : "Quant"}</Chip>
        ))}
        {content.needsReview && (
          <Chip
            className="border-dashed text-warning"
            title="Some facts here haven't been double-checked yet"
          >
            Unverified
          </Chip>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Section title="What it covers" id="scope-heading">
            <p className="max-w-[70ch] text-md text-text">{concept.scope}</p>
          </Section>
          <Section title="Learn" id="learn-heading">
            <Content concept={concept} />
          </Section>
          {content.questions.length > 0 && (
            <Section title="Interview questions" id="questions-heading">
              <ul className="divide-y divide-rule">
                {content.questions.map((qa, i) => (
                  <li key={i} className="py-2 first:pt-0 last:pb-0">
                    <details className="group">
                      <summary className="cursor-pointer list-none py-1 font-medium text-text marker:hidden">
                        {qa.q}
                        <span className="ml-2 text-sm font-normal text-accent group-open:hidden">
                          Show answer
                        </span>
                      </summary>
                      <p className="mt-1 text-base text-muted">{qa.a}</p>
                    </details>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {concept.isPattern && content.signals && content.signals.length > 0 && (
            <Section title="How to spot it" id="signals-heading">
              <ul className="list-disc space-y-1 pl-5 text-base text-text">
                {content.signals.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </Section>
          )}
          <Section title={`Practice problems (${problems.length})`} id="practice-heading">
            {problems.length === 0 ? (
              <p className="text-base text-muted">No problems are linked to this concept yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {problems.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0"
                  >
                    <a
                      href={problemHref(p.id)}
                      className="min-w-0 flex-1 text-base text-text hover:underline"
                    >
                      {p.number ? `${p.number}. ` : ""}
                      {p.title}
                    </a>
                    <DifficultyChip difficulty={p.difficulty} />
                    {p.slug && (
                      <a
                        href={leetCodeUrl(p.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                      >
                        LeetCode
                        <ArrowUpRight size={14} aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="space-y-6" aria-label="Connections">
          <Section title="Learn first" id="prereq-heading">
            {concept.prereqs.length === 0 ? (
              <p className="text-base text-muted">Nothing. You can start here.</p>
            ) : (
              <ul className="space-y-0.5">
                {concept.prereqs.map((id) => (
                  <ConceptLink key={id} id={id} />
                ))}
              </ul>
            )}
          </Section>
          <Section title="Unlocks" id="unlocks-heading">
            {unlocks.length === 0 ? (
              <p className="text-base text-muted">No concepts build directly on this one.</p>
            ) : (
              <ul className="space-y-0.5">
                {unlocks.map((id) => (
                  <ConceptLink key={id} id={id} />
                ))}
              </ul>
            )}
          </Section>
          {concept.related.length > 0 && (
            <Section title="Connected ideas" id="related-heading">
              <ul className="space-y-0.5">
                {concept.related.map((link) => (
                  <ConceptLink key={link.to} id={link.to} reason={link.reason} />
                ))}
              </ul>
            </Section>
          )}
          <p className="flex gap-2 text-sm text-muted">
            <Sparkles size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            Notes, quick checks and a Claude tutor for each concept arrive with the map in phase 4
            and the Claude features in phase 6.
          </p>
        </aside>
      </div>
    </PageFrame>
  );
}
