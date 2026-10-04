// Today (home, F16, 12.10.8): the page head with living terrain, the countdown as a scale bar
// and today's minutes as a ring; "Up next" (the one focal card) and "Today's route"; on the side
// the 7-day streak strip, ready-to-learn cards with subject tiles and the review count as one big
// number; a setup checklist while it isn't finished. On the interview date and the day before,
// a calm interview day view replaces the plan (F31); `?view=plan` shows the plan anyway.
// In ADHD mode (F32) the Now card replaces Up next and the route (folded as "Then: 3 more
// stops"), with the if-then line, Today's ink, the coming break and Welcome back; the calm
// screen puts everything else behind "Show more".
import { CalendarRange, Check, Circle, Search, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { Callout, Kbd, Skeleton } from "@/components/ui/Misc";
import { MOD_KEY } from "@/components/ui/platform";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import { LEETCODE_PROBLEMS } from "@/data/problems.seed";
import { QUANT_PUZZLES } from "@/data/quant.seed";
import { syllabus } from "@/data/syllabus";
import { interviewDay } from "@/lib/focus/interviewDay";
import { weeklyReviewDue } from "@/lib/insight/weekly";
import { useToday } from "@/stores/clockStore";
import { usePlanStore } from "@/stores/planStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { useAdhd } from "@/stores/adhdStore";
import { NowCard, ThenMore } from "../adhd/NowCard";
import { ShowMore } from "../adhd/ShowMore";
import { BreakHint, InkCard, StartLine, WelcomeBack } from "../adhd/TodayParts";
import { useReadiness } from "../insight/useInsight";
import { useReviewQueue } from "../review/useReviewQueue";
import { InterviewDayView } from "./InterviewDay";
import { RouteCard, UpNextCard } from "./PlanSection";
import { setupStepDone } from "./setupSteps";
import { TodayHead } from "./TodayHead";
import { ReadyCard, ReviewCount, StreakStrip } from "./TodaySide";
import { useReadyToLearn } from "./useReadyToLearn";
import { useTodayPlan } from "./useTodayPlan";

interface Step {
  id: string;
  done: boolean;
  title: string;
  detail: string;
  action: ReactNode;
}

function SetupChecklist({ steps }: { steps: Step[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <Card
      aria-labelledby="setup-heading"
      title={<span id="setup-heading">Get set up</span>}
      aside={`${doneCount} of ${steps.length} done`}
    >
      <ol className="-mx-4 sm:-mx-5">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex flex-col gap-3 border-t border-rule px-4 py-3.5 first:border-t-0 sm:flex-row sm:items-center sm:px-5"
          >
            <div className="flex min-w-0 flex-1 gap-3">
              {step.done ? (
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
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
    </Card>
  );
}

export default function TodayPage() {
  const route = useRoute();
  const profile = useProfileStore((s) => s.profile);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const today = useToday();
  const queue = useReviewQueue();
  const hasAttempt = useProblemStore((s) =>
    Object.values(s.states).some((p) => p.attempts.length > 0),
  );
  const model = useReadiness();
  const { ready: readyAll, fading } = useReadyToLearn(model, 10);
  const plan = useTodayPlan();
  // Concepts already on today's plan aren't repeated here.
  const planned = usePlanStore((s) => s.plans[today]);
  const ready = useMemo(() => {
    const onPlan = new Set(
      (planned?.items ?? []).filter((i) => i.kind === "learn-concept").map((i) => i.refId),
    );
    return readyAll.filter((c) => !onPlan.has(c.id)).slice(0, 5);
  }, [readyAll, planned]);
  const fadingDue = queue.concepts.filter((c) => c.state.status === "fading").length;

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
  const calm = interviewDay(today, profile?.interviewDate);
  const showPlan = route.query.get("view") === "plan";
  const adhd = useAdhd();
  const nowOn = adhd.on && adhd.parts.nowCard;
  const calmScreen = adhd.on && adhd.parts.calm;
  const [more, setMore] = useState(false);

  if (calm && !showPlan) {
    return (
      <PageFrame>
        <TodayHead profile={profile} model={model} plan={plan} today={today} calm />
        <InterviewDayView which={calm} today={today} />
      </PageFrame>
    );
  }

  const notes = (
    <>
      {calm && (
        <p className="-mt-2 mb-4 text-sm">
          <a href={routeHref("/today")} className="text-accent hover:underline">
            Back to the interview day view
          </a>
        </p>
      )}
      {adhd.on && adhd.parts.gentle && (
        <div className="mb-6">
          <WelcomeBack date={today} />
        </div>
      )}
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
      {profile?.onboardingDone && weeklyReviewDue(new Date(), profile) && (
        <Callout
          className="mb-6"
          icon={CalendarRange}
          title="Your weekly review is ready"
          actions={
            <Button variant="primary" href="#/weekly">
              Open the weekly review
            </Button>
          }
        >
          A short look back at the week, and a focus for the next one.
        </Callout>
      )}
    </>
  );

  const main = (
    <>
      {adhd.on && adhd.parts.startHelp && <StartLine date={today} />}
      {nowOn ? (
        <>
          <NowCard today={plan} />
          {plan && <ThenMore today={plan} />}
        </>
      ) : (
        <>
          <UpNextCard today={plan} />
          <RouteCard today={plan} />
        </>
      )}
      {adhd.on && adhd.parts.breaks && <BreakHint date={today} />}
      {adhd.on && adhd.parts.rewards && <InkCard today={plan} date={today} />}
    </>
  );

  const setup = !profile ? (
    <Card title="Get set up">
      <div className="space-y-3" role="status" aria-label="Loading">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-3/5" />
      </div>
    </Card>
  ) : (
    doneCount < steps.length && <SetupChecklist steps={steps} />
  );

  const side = (
    <>
      <StreakStrip />
      <ReadyCard ready={ready} fading={fading} />
      <ReviewCount
        problems={queue.problems.length}
        concepts={queue.concepts.length}
        fading={fadingDue}
      />
      <Card
        as="aside"
        aria-labelledby="atlas-heading"
        title={<span id="atlas-heading">Your atlas</span>}
      >
        <ul className="-mx-2 text-base">
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
                className="flex items-center justify-between gap-3 rounded-control px-2 py-1.5 hover:bg-surface-sunken"
              >
                <span className="text-muted">{label}</span>
                <span className="font-medium text-text tabular-nums">{value}</span>
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );

  // ADHD mode's calm screen (F32): one column with the task; the rest folds behind Show more.
  if (calmScreen) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-2xl">
          <TodayHead profile={profile} model={model} plan={plan} today={today} quiet />
          {notes}
        </div>
        <div className="mx-auto max-w-2xl space-y-6">
          {main}
          <div>
            <ShowMore
              open={more}
              onToggle={() => setMore((v) => !v)}
              more="your streak, what's ready, reviews and your atlas"
            />
            {more && (
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div className="min-w-0 space-y-6">{side}</div>
                <div className="min-w-0">{setup}</div>
              </div>
            )}
          </div>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <TodayHead profile={profile} model={model} plan={plan} today={today} />
      {notes}
      {/* On phones the setup checklist comes after the side cards, so the day comes first. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">{main}</div>
        <div className="min-w-0 max-lg:order-last lg:col-start-1 lg:row-start-2">{setup}</div>

        <div
          data-peripheral
          className="min-w-0 space-y-6 self-start lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          {side}
        </div>
      </div>
    </PageFrame>
  );
}
