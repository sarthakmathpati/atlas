// The weekly review (F18): the past week's numbers, rebuilt from the activity records (minutes,
// problems solved by difficulty, concepts that turned strong or started to fade, reviews, drills,
// top mistakes), a short summary written without Claude, and Claude's reflection (prompt 14) with
// up to 3 focus subjects for next week, accepted in one click. It opens on the first visit after
// Sunday 18:00 and on demand from the dashboard; past weeks stay viewable.
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { conceptHref, navigate, routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Skeleton } from "@/components/ui/Misc";
import { conceptById, subjectById } from "@/data/syllabus";
import { heatLevel } from "@/lib/activity/heatmap";
import { parseWeeklyReflection, weeklyReflectionPrompt } from "@/lib/ai/prompts";
import {
  dayName,
  offlineReflection,
  pastWeeks,
  reviewWeek,
  suggestFocus,
  weekSummary,
  weekSummaryText,
  type WeekSummary,
} from "@/lib/insight/weekly";
import { plural } from "@/lib/planner/reasons";
import { addDaysToDate, formatMinutes, nowIso, parseLocalDate } from "@/lib/time";
import { saveWeeklyNote, useWeeklyNote } from "@/stores/activityStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { findConcept } from "@/stores/customConceptStore";
import { useDataReady } from "@/stores/hydrate";
import { useMistakeTagStore } from "@/stores/mistakeTagStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { promptEnv } from "../ai/gather";
import { AIMarkdown, AIRunView, ClaudeTag } from "../ai/parts";
import { useAIRequest } from "../ai/useAI";
import { ExplainNumber, MathTable } from "../insight/Explain";
import { useActivityInsight, useReadiness } from "../insight/useInsight";

const longDate = (day: string) =>
  parseLocalDate(day).toLocaleDateString(undefined, { day: "numeric", month: "long" });
const shortDay = (day: string) =>
  parseLocalDate(day).toLocaleDateString(undefined, { weekday: "short" });
const subjectName = (id: string) => subjectById.get(id)?.name ?? id;

function names(ids: readonly string[]): string {
  const list = ids.map(subjectName);
  return list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}

/** The per-day records behind a number, as the popover's table. */
function daysTable(s: WeekSummary, rows: { label: string; value: (i: number) => number }[]) {
  return (
    <MathTable
      head={["Day", ...rows.map((r) => r.label)] as [string, ...string[]]}
      rows={s.days.map((d, i) => [shortDay(d.date), ...rows.map((r) => r.value(i))])}
    />
  );
}

function Stat({
  label,
  value,
  valueText,
  explain,
  sub,
}: {
  label: string;
  value: string | number;
  valueText: string;
  explain: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="min-w-0 rounded-panel border border-rule bg-surface px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold text-text tabular-nums">
        <ExplainNumber label={label} valueText={valueText} explain={explain} wide>
          {value}
        </ExplainNumber>
      </p>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
    </div>
  );
}

function FocusChoice({
  week,
  ids,
  source,
}: {
  week: string;
  ids: string[];
  source: "claude" | "offline";
}) {
  const current = useProfileStore((s) => s.profile?.focusSubjects ?? []);
  const note = useWeeklyNote(week);
  if (ids.length === 0) return null;
  const same = ids.length === current.length && ids.every((id) => current.includes(id));
  const accept = () => {
    const before = [...current];
    useProfileStore.getState().update({ focusSubjects: ids });
    saveWeeklyNote(week, {
      acceptedAt: nowIso(),
      ...(source === "offline" && !note?.suggested ? { suggested: ids } : {}),
    });
    toast(`Focus for next week: ${names(ids)}. New learning on Today leans toward it.`, {
      action: {
        label: "Undo",
        onClick: () => useProfileStore.getState().update({ focusSubjects: before }),
      },
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Suggested focus:</span>
      {ids.map((id) => (
        <span
          key={id}
          className="inline-flex h-7 items-center rounded-full border border-rule px-2.5 text-sm text-text"
        >
          {subjectName(id)}
        </span>
      ))}
      {same ? (
        <span className="text-sm text-success">This is your focus now.</span>
      ) : (
        <Button size="sm" icon={Target} onClick={accept}>
          Use as my focus
        </Button>
      )}
    </div>
  );
}

export default function WeeklyPage() {
  const route = useRoute();
  const profile = useProfileStore((s) => s.profile);
  const ready = useDataReady((s) => s.ready);
  const model = useReadiness();
  const { lookup } = useActivityInsight();
  const problems = useProblemStore((s) => s.states);
  const concepts = useConceptStateStore((s) => s.states);
  const tags = useMistakeTagStore((s) => s.tags);
  const current = useMemo(() => reviewWeek(new Date()), []);
  const asked = route.query.get("week");
  const week = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : current;
  const note = useWeeklyNote(week);
  const reflection = useAIRequest<unknown>();

  // Opening this week's review counts as seeing it (it opens once after Sunday 18:00).
  const marked = useRef(false);
  useEffect(() => {
    if (!profile || marked.current || week !== current) return;
    marked.current = true;
    useProfileStore.getState().update({ weeklyReviewSeenAt: nowIso() });
  }, [profile, week, current]);

  const summary = useMemo(
    () =>
      weekSummary(week, {
        lookup,
        problemStates: problems,
        conceptStates: concepts,
        tags,
        conceptName: (id) => findConcept(id)?.name,
      }),
    [week, lookup, problems, concepts, tags],
  );
  const past = useMemo(() => pastWeeks(lookup, week, 8), [lookup, week]);
  const offlineFocus = useMemo(
    () => (model && profile ? suggestFocus(model, profile.track) : []),
    [model, profile],
  );

  const go = (w: string) =>
    navigate(routeHref("/weekly", undefined, w === current ? undefined : { week: w }));

  const header = (
    <PageHeader
      title="Weekly review"
      eyebrow={`${longDate(week)} to ${longDate(addDaysToDate(week, 6))}`}
      description="A look back at the week, without guilt, and a focus for the next one."
      actions={
        <div className="flex items-center gap-1">
          <IconButton
            icon={ChevronLeft}
            label="The week before"
            variant="secondary"
            onClick={() => go(addDaysToDate(week, -7))}
          />
          <IconButton
            icon={ChevronRight}
            label="The week after"
            variant="secondary"
            disabled={week >= current}
            onClick={() => go(addDaysToDate(week, 7))}
          />
          {week !== current && (
            <Button size="sm" variant="ghost" onClick={() => go(current)}>
              This week
            </Button>
          )}
        </div>
      }
    />
  );

  if (!ready || !profile || !model) {
    return (
      <PageFrame>
        {header}
        <div className="space-y-4" role="status" aria-label="Loading the week">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageFrame>
    );
  }

  const s = summary;
  const validIds = new Set(model.subjects.filter((x) => x.weight > 0).map((x) => x.subjectId));
  const write = (refresh = false) =>
    void reflection.start(
      () => ({
        spec: weeklyReflectionPrompt(
          promptEnv(),
          weekSummaryText(s, model, profile.focusSubjects),
          [...validIds].map((id) => ({ id, name: subjectName(id) })),
        ),
      }),
      {
        title: "Your weekly reflection",
        refresh,
        onDone: (r) => {
          const parsed = parseWeeklyReflection(r.text, validIds);
          saveWeeklyNote(week, { reflection: parsed.markdown, suggested: parsed.focusSubjects });
        },
      },
    );
  const day = (i: number) => lookup(s.days[i]!.date);

  return (
    <PageFrame>
      {header}
      <div className="space-y-6">
        <section aria-label="The week in numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Time studied"
            value={formatMinutes(s.minutes)}
            valueText={`${s.minutes} minutes`}
            sub={`${s.activeDays} of 7 days active`}
            explain={
              <>
                <p>
                  Minutes from the focus timer and attempt timers, day by day (overlaps counted
                  once). A day is active with 10 minutes or any attempt, check or finished plan
                  item.
                </p>
                {daysTable(s, [
                  { label: "Minutes", value: (i) => s.days[i]!.minutes },
                  { label: "Active", value: (i) => (s.days[i]!.active ? 1 : 0) },
                ])}
              </>
            }
          />
          <Stat
            label="Problems solved"
            value={s.solved.total}
            valueText={String(s.solved.total)}
            sub={`${s.solved.easy} easy, ${s.solved.medium} medium, ${s.solved.hard} hard`}
            explain={
              <>
                <p>
                  Attempts saved as solved, alone or with hints, re-solves included.
                  {s.solvedFrom !== "activity" &&
                    " For days recorded before Atlas counted difficulty, the split comes from the attempts themselves."}
                </p>
                {daysTable(s, [
                  { label: "Solved", value: (i) => day(i)?.problemsSolved ?? 0 },
                  { label: "Attempts", value: (i) => day(i)?.attempts ?? 0 },
                ])}
              </>
            }
          />
          <Stat
            label="Turned strong"
            value={s.turnedStrong}
            valueText={plural(s.turnedStrong, "concept")}
            sub={`${plural(s.turnedFading, "concept")} started to fade`}
            explain={
              <>
                <p>
                  Status changes recorded when they happened: to strong (the ink moment on the map)
                  and to fading (a review is overdue).
                </p>
                {daysTable(s, [
                  { label: "Strong", value: (i) => day(i)?.turnedStrong ?? 0 },
                  { label: "Fading", value: (i) => day(i)?.turnedFading ?? 0 },
                ])}
              </>
            }
          />
          <Stat
            label="Reviews and drills"
            value={s.reviews + s.drills.answers}
            valueText={`${s.reviews} reviews and ${s.drills.answers} drill prompts`}
            sub={`${plural(s.reviews, "review")}, ${plural(s.drills.answers, "drill prompt")}, ${plural(s.mocks, "mock")}`}
            explain={
              <>
                <p>
                  Reviews are re-solves and concept reviews done when due; drill prompts are pattern
                  drill answers ({plural(s.drills.sessions, "session")} finished).
                </p>
                {daysTable(s, [
                  { label: "Reviews", value: (i) => day(i)?.reviews ?? 0 },
                  { label: "Drill prompts", value: (i) => day(i)?.drillAnswers ?? 0 },
                  { label: "Mocks", value: (i) => day(i)?.mocks ?? 0 },
                ])}
              </>
            }
          />
        </section>

        <section
          aria-label="Day by day"
          className="rounded-panel border border-rule bg-surface px-4 py-3"
        >
          <ol className="grid grid-cols-7 gap-1.5">
            {s.days.map((d) => (
              <li key={d.date} className="flex flex-col items-center gap-1 text-center">
                <span className="text-xs text-muted">{shortDay(d.date)}</span>
                <span
                  className={cx(
                    "grid h-9 w-full max-w-16 place-items-center rounded-control text-sm font-medium tabular-nums",
                    heatLevel(d.minutes) >= 3 ? "text-[var(--surface)]" : "text-text",
                  )}
                  style={{ background: `var(--heat-${heatLevel(d.minutes)})` }}
                  title={`${dayName(d.date)}: ${formatMinutes(d.minutes)}`}
                >
                  {d.minutes}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted">Minutes per day, Monday to Sunday.</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section
            aria-labelledby="short-heading"
            className="space-y-3 rounded-panel border border-rule bg-surface px-4 py-4 sm:px-5"
          >
            <h2 id="short-heading" className="text-md font-semibold text-text">
              In short
            </h2>
            <p className="text-base leading-relaxed text-text">
              {offlineReflection(s, offlineFocus)}
            </p>
            <FocusChoice week={week} ids={offlineFocus} source="offline" />
          </section>

          <section
            aria-labelledby="claude-heading"
            className="space-y-3 rounded-panel border border-rule bg-surface px-4 py-4 sm:px-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="claude-heading"
                className="flex items-center gap-2 text-md font-semibold text-text"
              >
                Claude's reflection
                {note?.reflection && <ClaudeTag />}
              </h2>
              {note?.reflection && reflection.state.phase === "idle" && (
                <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => write(true)}>
                  Write it again
                </Button>
              )}
            </div>
            {reflection.state.phase !== "idle" && reflection.state.phase !== "done" ? (
              <AIRunView request={reflection} thinkingLabel="Reading your week…" />
            ) : note?.reflection ? (
              <>
                <AIMarkdown compact>{note.reflection}</AIMarkdown>
                <FocusChoice week={week} ids={note.suggested ?? []} source="claude" />
              </>
            ) : (
              <>
                <p className="text-base text-muted">
                  Claude reads the numbers above and your readiness by subject, writes a short, kind
                  reflection, and suggests up to 3 subjects to focus on next week.
                </p>
                <Button icon={Sparkles} onClick={() => write()}>
                  Write my reflection
                </Button>
              </>
            )}
          </section>
        </div>

        {(s.strongNames.length > 0 || s.topMistakes.length > 0) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {s.strongNames.length > 0 && (
              <section
                aria-labelledby="strong-heading"
                className="rounded-panel border border-rule bg-surface px-4 py-3 sm:px-5"
              >
                <h2 id="strong-heading" className="text-md font-semibold text-text">
                  Turned strong this week
                </h2>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {s.strongNames.map((c) => (
                    <li key={c.id}>
                      <a
                        href={conceptHref(c.id)}
                        className="inline-flex h-8 items-center rounded-full border border-rule px-3 text-sm text-text hover:border-accent"
                      >
                        {c.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {s.topMistakes.length > 0 && (
              <section
                aria-labelledby="mistakes-heading"
                className="rounded-panel border border-rule bg-surface px-4 py-3 sm:px-5"
              >
                <h2 id="mistakes-heading" className="text-md font-semibold text-text">
                  Top mistakes
                </h2>
                <ul className="mt-2 divide-y divide-rule">
                  {s.topMistakes.map((m) => (
                    <li key={m.tagId} className="flex items-center justify-between gap-3 py-1.5">
                      <a
                        href={routeHref("/mistakes", undefined, { tag: m.tagId })}
                        className="text-base text-text hover:underline"
                      >
                        {m.label}
                      </a>
                      <span className="text-sm text-muted tabular-nums">
                        {plural(m.count, "attempt")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {past.length > 0 && (
          <section
            aria-labelledby="past-heading"
            className="rounded-panel border border-rule bg-surface"
          >
            <h2
              id="past-heading"
              className="border-b border-rule px-4 py-2.5 text-md font-semibold text-text sm:px-5"
            >
              Earlier weeks
            </h2>
            <ul className="divide-y divide-rule">
              {past.map((w) => (
                <PastWeek key={w} week={w} onOpen={() => go(w)} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageFrame>
  );
}

function PastWeek({ week, onOpen }: { week: string; onOpen: () => void }) {
  const { lookup } = useActivityInsight();
  const note = useWeeklyNote(week);
  const s = useMemo(
    () =>
      weekSummary(week, {
        lookup,
        problemStates: {},
        conceptStates: {},
        tags: {},
        conceptName: (id) => conceptById.get(id)?.name,
      }),
    [lookup, week],
  );
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-0.5 px-4 py-2.5 text-left hover:bg-surface-sunken sm:px-5"
      >
        <span className="min-w-40 font-medium text-text">Week of {longDate(week)}</span>
        <span className="text-sm text-muted tabular-nums">
          {formatMinutes(s.minutes)}, {s.activeDays} active days, {plural(s.solved.total, "solve")}
        </span>
        {note?.reflection && <ClaudeTag className="ml-auto" label="Reflection kept" />}
      </button>
    </li>
  );
}
