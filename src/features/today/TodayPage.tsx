// Today (home, F16): a greeting with the interview countdown, the day's plan (PlanSection), then
// "Ready to learn next" (section 11.5), the fading count, the streak with a small heatmap, and a
// setup checklist while it isn't finished.
import { ArrowRight, Check, Circle, Flame, RotateCcw, Search, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { routeHref } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Callout, Kbd, Skeleton } from "@/components/ui/Misc";
import { MOD_KEY } from "@/components/ui/platform";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import { LEETCODE_PROBLEMS } from "@/data/problems.seed";
import { QUANT_PUZZLES } from "@/data/quant.seed";
import { syllabus, topicById } from "@/data/syllabus";
import { daysBetween, localDate } from "@/lib/time";
import { useToday } from "@/stores/clockStore";
import { useConceptStatus } from "@/stores/conceptStateStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { Heatmap } from "../insight/Heatmap";
import { useActivityInsight } from "../insight/useInsight";
import { useReviewQueue } from "../review/useReviewQueue";
import { PlanSection } from "./PlanSection";
import { setupStepDone } from "./setupSteps";
import { useReadyToLearn } from "./useReadyToLearn";

function greeting(hour: number): string {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const TRACK_LABEL = { sde: "SDE", quant: "Quant", both: "SDE and quant" } as const;

function Countdown({ date }: { date: string }) {
  const days = daysBetween(localDate(), date);
  const text =
    days > 1
      ? `${days} days to go`
      : days === 1
        ? "Tomorrow"
        : days === 0
          ? "Today"
          : "Interview date passed";
  return (
    <a
      href="#/settings?section=profile"
      className="inline-flex h-9 items-center rounded-full border border-rule bg-surface px-3.5 text-base font-medium text-text tabular-nums hover:border-rule-strong"
      title="Interview date (change it in Settings)"
    >
      {text}
    </a>
  );
}

function ReadyRow({
  id,
  name,
  topicId,
  minutes,
}: {
  id: string;
  name: string;
  topicId: string;
  minutes: number;
}) {
  const status = useConceptStatus(id);
  return (
    <li>
      <a
        href={routeHref("/map", undefined, { focus: id })}
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-sunken"
      >
        <StatusGlyph status={status} size={14} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-text">{name}</span>
          <span className="block truncate text-sm text-muted">{topicById.get(topicId)?.name}</span>
        </span>
        <span className="shrink-0 text-sm text-muted tabular-nums">{minutes} min</span>
        <ArrowRight size={15} aria-hidden="true" className="shrink-0 text-faint" />
      </a>
    </li>
  );
}

/** The streak, this week's freeze, and the last 16 weeks of activity (F16, F29). */
function StreakCard() {
  const { lookup, streak, frozen, loaded } = useActivityInsight();
  const today = useToday();
  const freezeOn = useProfileStore((s) => s.profile?.prefs.streakFreeze ?? true);
  if (!loaded) return <Skeleton className="h-40 w-full" />;
  const days = streak.current;
  return (
    <section aria-labelledby="streak-heading" className="rounded-panel border border-rule bg-surface">
      <div className="flex items-baseline justify-between gap-2 border-b border-rule px-4 py-3">
        <h2 id="streak-heading" className="text-md font-semibold text-text">
          Streak
        </h2>
        <a href="#/dashboard" className="text-sm text-accent hover:underline">
          Dashboard
        </a>
      </div>
      <div className="space-y-3 px-4 py-3">
        <p className="flex items-center gap-2 text-base text-text">
          <Flame
            size={18}
            aria-hidden="true"
            className={days > 0 ? "text-warning" : "text-faint"}
          />
          <span>
            <span className="text-lg font-semibold tabular-nums">{days}</span>{" "}
            {days === 1 ? "day" : "days"}
            {!streak.activeToday && days > 0 && (
              <span className="text-sm text-muted"> (today still counts once you start)</span>
            )}
          </span>
        </p>
        {freezeOn && streak.frozenDays.length > 0 && (
          <p className="text-sm text-muted">
            The weekly freeze covered {streak.frozenDays.length === 1 ? "a missed day" : `${streak.frozenDays.length} missed days`}.
          </p>
        )}
        <Heatmap lookup={lookup} today={today} weeks={16} frozen={frozen} compact />
      </div>
    </section>
  );
}

interface Step {
  id: string;
  done: boolean;
  title: string;
  detail: string;
  action: ReactNode;
}

export default function TodayPage() {
  const profile = useProfileStore((s) => s.profile);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const queue = useReviewQueue();
  const hasAttempt = useProblemStore((s) =>
    Object.values(s.states).some((p) => p.attempts.length > 0),
  );
  const { ready, fading } = useReadyToLearn(5);
  const now = new Date();
  const name = profile?.name.trim();
  const dateLine = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const steps: Step[] = profile
    ? [
        {
          id: "profile",
          done: profile.onboardingDone,
          title: "Tell Atlas about you",
          detail:
            "Your track, daily time and what you already know shape the map, the plan and the readiness score.",
          action: (
            <Button size="sm" href="#/welcome">
              {profile.onboardingDone ? "Run it again" : "Start"}
            </Button>
          ),
        },
        {
          id: "date",
          done: Boolean(profile.interviewDate),
          title: "Set your interview date",
          detail: "Atlas counts down to it and shifts toward revision in the last two weeks.",
          action: (
            <Button size="sm" href="#/settings?section=profile">
              Add a date
            </Button>
          ),
        },
        {
          id: "problem",
          done: hasAttempt,
          title: "Save your first attempt",
          detail: `Open any of the ${LEETCODE_PROBLEMS.length} LeetCode problems, write your code and save it. Already solving elsewhere? Import a CSV.`,
          action: (
            <Button size="sm" href="#/problems">
              Open problems
            </Button>
          ),
        },
        {
          id: "map",
          done: setupStepDone("map"),
          title: "Look around the syllabus",
          detail: `${syllabus.counts.subjects} subjects and ${syllabus.counts.concepts} concepts, from arrays to options pricing, in learning order.`,
          action: (
            <Button size="sm" href="#/map">
              Open the map
            </Button>
          ),
        },
        {
          id: "search",
          done: setupStepDone("search"),
          title: "Jump anywhere with search",
          detail: "Find any concept, problem or page by typing a few letters.",
          action: (
            <Button size="sm" icon={Search} onClick={() => setPaletteOpen(true)}>
              <span>Search</span>
              <span className="hidden gap-1 sm:inline-flex" aria-hidden="true">
                <Kbd>{MOD_KEY}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </Button>
          ),
        },
        {
          id: "backup",
          done: Boolean(profile.lastBackupAt),
          title: "Export your first backup",
          detail: "One file holds all your progress. Keep one somewhere safe every week or so.",
          action: (
            <Button size="sm" href="#/settings?section=data">
              Go to backups
            </Button>
          ),
        },
      ]
    : [];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <PageFrame>
      <PageHeader
        documentTitle="Today"
        eyebrow={dateLine}
        title={name ? `${greeting(now.getHours())}, ${name}` : greeting(now.getHours())}
        description={
          profile
            ? `Preparing for ${TRACK_LABEL[profile.track]} interviews, about ${profile.dailyMinutes} minutes a day.`
            : undefined
        }
        actions={profile?.interviewDate ? <Countdown date={profile.interviewDate} /> : undefined}
      />

      {profile && !profile.onboardingDone && (
        <Callout
          className="mb-6"
          icon={Sparkles}
          title="Finish setting up"
          actions={
            <Button variant="primary" href="#/welcome">
              Start
            </Button>
          }
        >
          Two minutes: your track, your time and what you already know, so the map starts where you
          are.
        </Callout>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div className="space-y-6">
          <PlanSection />

          <section
            aria-labelledby="ready-heading"
            className="rounded-panel border border-rule bg-surface"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
              <h2 id="ready-heading" className="text-md font-semibold text-text">
                Ready to learn next
              </h2>
              <a
                href={routeHref("/map", undefined, { ready: "1" })}
                className="text-sm text-accent hover:underline"
              >
                See all on the map
              </a>
            </div>
            {ready.length === 0 ? (
              <p className="px-4 py-4 text-base text-muted sm:px-5">
                Nothing is waiting: everything you can start is under way. Open the map to pick
                something new.
              </p>
            ) : (
              <ul className="divide-y divide-rule">
                {ready.map((c) => (
                  <ReadyRow
                    key={c.id}
                    id={c.id}
                    name={c.name}
                    topicId={c.topicId}
                    minutes={c.estMinutes}
                  />
                ))}
              </ul>
            )}
            {fading > 0 && (
              <a
                href="#/review"
                className="flex items-center gap-3 border-t border-rule px-4 py-2.5 text-base hover:bg-surface-sunken sm:px-5"
              >
                <StatusGlyph status="fading" size={14} />
                <span className="flex-1 text-text">
                  {fading} {fading === 1 ? "concept is" : "concepts are"} fading. Review them to
                  bring them back.
                </span>
                <ArrowRight size={15} aria-hidden="true" className="text-faint" />
              </a>
            )}
          </section>

          {(!profile || doneCount < steps.length) && (
          <section
            aria-labelledby="setup-heading"
            className="rounded-panel border border-rule bg-surface"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
              <h2 id="setup-heading" className="text-md font-semibold text-text">
                Get set up
              </h2>
              {profile && (
                <span className="text-sm text-muted">
                  {doneCount} of {steps.length} done
                </span>
              )}
            </div>
            {!profile ? (
              <div className="space-y-3 p-5" role="status" aria-label="Loading">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            ) : (
              <ol>
                {steps.map((step) => (
                  <li
                    key={step.id}
                    className="flex flex-col gap-3 border-b border-rule px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:px-5"
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      {step.done ? (
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-strong text-canvas">
                          <Check size={13} strokeWidth={3} aria-hidden="true" />
                        </span>
                      ) : (
                        <Circle
                          size={20}
                          strokeWidth={1.5}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-faint"
                        />
                      )}
                      <div className="min-w-0">
                        <p className={cx("font-medium", step.done ? "text-muted" : "text-text")}>
                          {step.title}
                          <span className="sr-only">{step.done ? " (done)" : ""}</span>
                        </p>
                        <p className="text-sm text-muted">{step.detail}</p>
                      </div>
                    </div>
                    <div className="shrink-0 pl-8 sm:pl-0">{step.action}</div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          )}
        </div>

        <div className="space-y-6 self-start">
          <StreakCard />
          {queue.count > 0 && (
            <a
              href="#/review"
              className="flex items-center gap-3 rounded-panel border border-rule bg-surface px-4 py-3 text-base hover:bg-surface-sunken"
            >
              <RotateCcw size={16} aria-hidden="true" className="shrink-0 text-muted" />
              <span className="flex-1 text-text">
                {queue.count} due for review in all
                <span className="block text-sm text-muted">
                  {queue.problems.length} {queue.problems.length === 1 ? "problem" : "problems"},{" "}
                  {queue.concepts.length} {queue.concepts.length === 1 ? "concept" : "concepts"}
                </span>
              </span>
              <ArrowRight size={15} aria-hidden="true" className="shrink-0 text-faint" />
            </a>
          )}
          <aside
            aria-labelledby="atlas-heading"
            className="rounded-panel border border-rule bg-surface"
          >
            <h2
              id="atlas-heading"
              className="border-b border-rule px-4 py-3 text-md font-semibold text-text"
            >
              Your atlas
            </h2>
            <ul className="divide-y divide-rule text-base">
              {[
                ["Subjects", syllabus.counts.subjects, "#/map"],
                ["Concepts", syllabus.counts.concepts, "#/map"],
                ["Must-know concepts", syllabus.counts.must, "#/map"],
                ["DSA patterns", syllabus.counts.patterns, "#/map?subject=dsa"],
                ["LeetCode problems", LEETCODE_PROBLEMS.length, "#/problems"],
                ["Quant puzzles", QUANT_PUZZLES.length, "#/puzzles"],
                ["Design prompts", DESIGN_PROBLEMS.length, "#/designs"],
              ].map(([label, value, href]) => (
                <li key={label as string}>
                  <a
                    href={href as string}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-sunken"
                  >
                    <span className="text-muted">{label}</span>
                    <span className="font-medium text-text tabular-nums">{value}</span>
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </PageFrame>
  );
}
