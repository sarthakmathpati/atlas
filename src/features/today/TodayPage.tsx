// Today (home, F16). The daily plan arrives with the planner in phase 7; until then this page greets
// the owner, counts down to the interview, and offers a short setup checklist that reads real data.
import { Check, Circle, Search } from "lucide-react";
import type { ReactNode } from "react";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Kbd, Skeleton } from "@/components/ui/Misc";
import { MOD_KEY } from "@/components/ui/platform";
import { ProgressBar } from "@/components/ui/Progress";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import { LEETCODE_PROBLEMS } from "@/data/problems.seed";
import { QUANT_PUZZLES } from "@/data/quant.seed";
import { syllabus } from "@/data/syllabus";
import { daysBetween, localDate } from "@/lib/time";
import { useMinutesOn } from "@/stores/activityStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { setupStepDone } from "./setupSteps";

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
  const today = localDate();
  const minutes = useMinutesOn(today);
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
          done: profile.name.trim().length > 0,
          title: "Tell Atlas about you",
          detail: "Your name, target track and daily time shape the plan and the readiness score.",
          action: (
            <Button size="sm" href="#/settings?section=profile">
              Open settings
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div className="space-y-6">
          <section
            aria-labelledby="plan-heading"
            className="rounded-panel border border-rule bg-surface"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3 sm:px-5">
              <h2 id="plan-heading" className="text-md font-semibold text-text">
                Today's plan
              </h2>
              <span className="text-sm text-muted tabular-nums">
                {Math.round(minutes)} of {profile?.dailyMinutes ?? 90} min
              </span>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <ProgressBar
                value={minutes / (profile?.dailyMinutes ?? 90)}
                label="Minutes today against your daily time"
              />
              <p className="mt-4 text-base text-muted">
                Your daily plan will appear here: three to eight things sized to your time, each
                with a plain reason, such as a problem due for a re-solve or a concept you're ready
                to learn. It arrives once the problem tracker and the map are in place.
              </p>
              <p className="mt-2 text-base text-muted">
                Meanwhile, the focus timer in the top bar counts your study minutes toward today and
                your streak.
              </p>
            </div>
          </section>

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
        </div>

        <aside
          aria-labelledby="atlas-heading"
          className="self-start rounded-panel border border-rule bg-surface"
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
    </PageFrame>
  );
}
