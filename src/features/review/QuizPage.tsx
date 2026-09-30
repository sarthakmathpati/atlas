// Flashcards and quizzes (F14). Offline flashcards for everything due, a subject or a topic (one
// concept starts from the map or its page); each session records a check per concept and moves
// its review schedule. Quick quizzes written and graded by Claude cover the chosen set too.
import { CalendarClock, Layers, ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import { conceptHref } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { Field, Select, Switch, type SelectOption } from "@/components/ui/Field";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { STATUS_LABEL } from "@/components/ui/labels";
import {
  conceptsByTopic,
  subjectById,
  subjects,
  topicById,
  topicsBySubject,
} from "@/data/syllabus";
import { inScope } from "@/lib/concepts/scope";
import { relativeDate } from "@/lib/problems/progress";
import { deckSize } from "@/lib/review/flashcards";
import { localDate } from "@/lib/time";
import type { Check, Concept } from "@/lib/types";
import { openFlashcards, openQuickQuiz } from "@/stores/conceptDialogStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { findConcept, useCustomConceptStore } from "@/stores/customConceptStore";
import { useProfileStore } from "@/stores/profileStore";
import { useReviewQueue } from "./useReviewQueue";

const KIND_LABEL: Record<Check["kind"], string> = {
  flashcard: "Flashcards",
  explain: "Explain it back",
  quiz: "Quick quiz",
  drill: "Pattern drill",
  manual: "Set strong",
};

const SUBJECT_OPTIONS: SelectOption[] = subjects.map((s) => ({ value: s.id, label: s.name }));

export default function QuizPage() {
  const queue = useReviewQueue();
  const profile = useProfileStore((s) => s.profile);
  const states = useConceptStateStore((s) => s.states);
  const checks = useConceptStateStore((s) => s.checks);
  const custom = useCustomConceptStore((s) => s.concepts);
  const [subjectId, setSubjectId] = useState(profile?.focusSubjects[0] ?? "dsa");
  const [topicId, setTopicId] = useState("");
  const [started, setStarted] = useState(false);

  const scope = useMemo(
    () => ({
      track: profile?.track ?? "both",
      profile,
      isHidden: (id: string) => Boolean(states[id]?.hidden),
    }),
    [profile, states],
  );

  const topicOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "Every topic" },
      ...(topicsBySubject.get(subjectId) ?? []).map((t) => ({ value: t.id, label: t.name })),
    ],
    [subjectId],
  );

  const chosen = useMemo(() => {
    const topicIds = topicId ? [topicId] : (topicsBySubject.get(subjectId) ?? []).map((t) => t.id);
    const list: Concept[] = [];
    for (const t of topicIds) {
      list.push(...(conceptsByTopic.get(t) ?? []));
      list.push(...Object.values(custom).filter((c) => c.topicId === t));
    }
    // Fading first, then learning, strong and not started (learning order within each), so a
    // session that stops at 30 cards checks what matters most.
    const rank = { fading: 0, learning: 1, strong: 2, not_started: 3 } as const;
    const statusOf = (id: string) => states[id]?.status ?? "not_started";
    return list
      .filter((c) => inScope(c, scope) && (!started || statusOf(c.id) !== "not_started"))
      .map((c, i) => ({ c, i }))
      .sort((a, b) => rank[statusOf(a.c.id)] - rank[statusOf(b.c.id)] || a.i - b.i)
      .map(({ c }) => c);
  }, [subjectId, topicId, custom, scope, started, states]);

  const dueIds = queue.concepts.map((c) => c.conceptId);
  const recent = useMemo(
    () =>
      Object.values(checks)
        .flat()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 12),
    [checks],
  );
  const today = localDate();
  const setName = topicId ? topicById.get(topicId)?.name : subjectById.get(subjectId)?.name;

  return (
    <PageFrame>
      <PageHeader
        title="Flashcards and quizzes"
        description="Quick checks on theory. Answer in your head, reveal, and rate how well you knew it: that sets when each concept comes back."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="due-cards" className="rounded-panel bg-surface">
            <h2
              id="due-cards"
              className="border-b border-rule px-4 py-3 text-md font-semibold text-text"
            >
              Due for review
            </h2>
            <div className="px-4 py-4">
              {dueIds.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  drawing="flag"
                  title="Nothing is due today"
                  compact
                >
                  Concepts come back here a couple of days after you study them or check them, and
                  further apart each time you remember them.
                </EmptyState>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base text-text">
                    {dueIds.length} {dueIds.length === 1 ? "concept is" : "concepts are"} due, about{" "}
                    {
                      deckSize(dueIds.map((id) => findConcept(id)).filter((c) => c !== undefined))
                        .cards
                    }{" "}
                    cards.
                  </p>
                  <Button
                    variant="primary"
                    icon={Layers}
                    onClick={() =>
                      openFlashcards({
                        conceptIds: dueIds,
                        title: "Flashcards: everything due",
                        session: true,
                      })
                    }
                  >
                    Start flashcards
                  </Button>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="pick-cards" className="rounded-panel bg-surface">
            <h2
              id="pick-cards"
              className="border-b border-rule px-4 py-3 text-md font-semibold text-text"
            >
              Pick a set
            </h2>
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <Field label="Subject">
                <Select
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    setTopicId("");
                  }}
                  options={SUBJECT_OPTIONS}
                />
              </Field>
              <Field label="Topic">
                <Select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  options={topicOptions}
                />
              </Field>
              <Switch
                className="sm:col-span-2"
                label="Only concepts I've started"
                description="Skip what you haven't studied yet."
                checked={started}
                onChange={setStarted}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3">
              <p className="text-sm text-muted">
                {chosen.length === 0
                  ? "No concepts in this set yet."
                  : `${chosen.length} ${chosen.length === 1 ? "concept" : "concepts"}, up to ${deckSize(chosen).cards} cards.`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  icon={ListChecks}
                  disabled={chosen.length === 0}
                  onClick={() =>
                    openQuickQuiz({
                      conceptIds: chosen.slice(0, 40).map((c) => c.id),
                      title: `Quick quiz: ${setName}`,
                      scope: topicId ? `the topic ${setName}` : `the subject ${setName}`,
                    })
                  }
                >
                  Quick quiz
                </Button>
                <Button
                  variant="primary"
                  icon={Layers}
                  disabled={chosen.length === 0}
                  onClick={() =>
                    openFlashcards({
                      conceptIds: chosen.map((c) => c.id),
                      title: `Flashcards: ${setName}`,
                      walk: true,
                    })
                  }
                >
                  Start flashcards
                </Button>
              </div>
            </div>
          </section>

          <p className="text-sm text-muted">
            Flashcards use each concept's interview questions and work offline. A quick quiz asks
            Claude for five fresh questions on the set, weighted toward what needs review first.
          </p>
        </div>

        <aside className="space-y-6" aria-label="Recent checks">
          <section aria-labelledby="recent-checks" className="rounded-panel bg-surface">
            <h2
              id="recent-checks"
              className="border-b border-rule px-4 py-3 text-md font-semibold text-text"
            >
              Recent checks
            </h2>
            {recent.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">
                Your flashcard, quiz and explain-it-back results appear here.
              </p>
            ) : (
              <ul>
                {recent.map((c) => {
                  const concept = findConcept(c.conceptId);
                  const status = states[c.conceptId]?.status ?? "not_started";
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-2.5 border-t border-rule px-4 py-2 first:border-t-0"
                    >
                      <StatusGlyph status={status} size={14} title={STATUS_LABEL[status]} />
                      <span className="min-w-0 flex-1">
                        <a
                          href={conceptHref(c.conceptId)}
                          className="block truncate text-base text-text hover:underline"
                        >
                          {concept?.name ?? c.conceptId}
                        </a>
                        <span className="block text-xs text-muted">
                          {KIND_LABEL[c.kind]},{" "}
                          {relativeDate(localDate(new Date(c.createdAt)), today).toLowerCase()}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium text-text tabular-nums">
                        {Math.round(c.score * 100)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </PageFrame>
  );
}
