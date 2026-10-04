// Today's page head (12.10.7, 12.10.8): the greeting on living terrain, the countdown drawn as a
// map scale bar, and today's minutes as a ring. The terrain's hills are the focus subjects (or the
// three with the largest weight in the track), as high as their readiness, on a background seeded
// by the ISO week; spot heights show from 480 px and never under the text (ContourCanvas keeps
// its siblings' text clear).
import { useMemo } from "react";
import { usePageHeading } from "@/app/shell/usePageTitle";
import { ContourCanvas } from "@/components/ui/ContourCanvas";
import { ProgressRing } from "@/components/ui/Progress";
import { terrainHills, terrainSeed, terrainSubjects, type TerrainSubject } from "@/lib/art/terrain";
import type { ReadinessModel } from "@/lib/readiness/model";
import { daysBetween } from "@/lib/time";
import type { Profile } from "@/lib/types";
import type { TodayPlan } from "./useTodayPlan";

function greeting(hour: number): string {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const TRACK_LABEL = { sde: "SDE", quant: "Quant", both: "SDE and quant" } as const;

/** Living terrain behind a head: its siblings are the text it keeps clear. */
export function LivingTerrain({ subjects, day }: { subjects: TerrainSubject[]; day: string }) {
  const hills = useMemo(() => terrainHills(subjects), [subjects]);
  return <ContourCanvas seed={terrainSeed(day)} hills={hills} levels={20} className="-z-10" />;
}

/** The countdown as a map scale bar ("70 days to interviews"). */
function ScaleBar({ interviewDate, today }: { interviewDate: string; today: string }) {
  const days = daysBetween(today, interviewDate);
  const text =
    days > 1 ? (
      <>
        <span className="font-semibold tabular-nums">{days} days</span> to interviews
      </>
    ) : days === 1 ? (
      <span className="font-semibold">Interviews tomorrow</span>
    ) : days === 0 ? (
      <span className="font-semibold">Interviews today</span>
    ) : (
      "The interview date has passed"
    );
  return (
    <a
      href="#/settings?section=profile"
      title="Interview date (change it in Settings)"
      className="mt-4 inline-flex items-center gap-2.5 rounded-[4px] text-sm text-text hover:underline"
    >
      <svg width={82} height={8} viewBox="0 0 82 8" aria-hidden="true" className="shrink-0">
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={1 + i * 20}
            y={1}
            width={20}
            height={6}
            fill={i % 2 === 0 ? "var(--text)" : "var(--surface-raised)"}
            stroke="var(--text)"
            strokeWidth={1}
          />
        ))}
      </svg>
      <span>{text}</span>
    </a>
  );
}

/** Minutes done today against the time for today. */
function MinutesRing({ done, budget }: { done: number; budget: number }) {
  return (
    <ProgressRing
      value={budget > 0 ? done / budget : 0}
      size={96}
      thickness={7}
      label={`${done} of ${budget} minutes done today`}
      className="max-sm:size-[76px]"
    >
      <span className="flex flex-col items-center leading-none">
        <span className="text-2xl max-sm:text-xl">{done}</span>
        <span className="mt-1 font-sans text-xs font-normal text-muted">of {budget} min</span>
      </span>
    </ProgressRing>
  );
}

function headLine(profile: Profile, plan: TodayPlan | null): string {
  const base = `Preparing for ${TRACK_LABEL[profile.track]} interviews, about ${profile.dailyMinutes} minutes a day.`;
  if (!plan || plan.shown.length === 0) return base;
  if (plan.allDone) return "Everything on today's route is done. Anything more is a bonus.";
  if (plan.plan.minimumDay) return "A minimum day: one small thing keeps the streak going.";
  const doneStops = plan.shown.filter((i) => i.done).length;
  if (doneStops === 0) return `${plan.planned} minutes planned. Start at the first stop.`;
  return `${doneStops} of ${plan.shown.length} stops done. On to the next one.`;
}

export function TodayHead({
  profile,
  model,
  plan,
  today,
  calm,
  quiet,
}: {
  profile: Profile | null;
  model: ReadinessModel | null;
  plan: TodayPlan | null;
  today: string;
  /** Interview day (F31): a calm line instead of the plan's, and no minutes ring. */
  calm?: boolean;
  /** ADHD mode's calm screen (F32): no terrain and no countdown, only the greeting and ring. */
  quiet?: boolean;
}) {
  const now = new Date();
  const name = profile?.name.trim();
  const title = name ? `${greeting(now.getHours())}, ${name}` : greeting(now.getHours());
  const ref = usePageHeading("Today");
  const dateLine = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const subjects = useMemo(
    () => (profile ? terrainSubjects(profile, model) : []),
    [profile, model],
  );
  return (
    <header className="relative isolate mb-6 overflow-hidden rounded-focal bg-sidebar px-5 py-5 sm:mb-8 sm:px-7 sm:py-6">
      {profile && model && !quiet && <LivingTerrain subjects={subjects} day={today} />}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">{dateLine}</p>
          <h1
            ref={ref}
            tabIndex={-1}
            className="mt-1 font-display text-4xl font-semibold tracking-[-0.01em] text-balance text-text outline-none max-sm:text-[28px]"
          >
            {title}
          </h1>
          {profile && (
            <p className="mt-1.5 max-w-[52ch] text-md text-muted">
              {calm
                ? "A calm day: nothing new, only what helps you go in ready."
                : headLine(profile, plan)}
            </p>
          )}
          {profile?.interviewDate && !quiet && (
            <ScaleBar interviewDate={profile.interviewDate} today={today} />
          )}
        </div>
        {plan && !calm && <MinutesRing done={plan.done} budget={plan.budget} />}
      </div>
    </header>
  );
}
