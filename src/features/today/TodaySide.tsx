// The right side of Today (12.10.8): the 7-day streak strip (the weekly freeze as a hatched day),
// ready-to-learn cards with subject tiles, and the review count as one big number.
import { ArrowRight } from "lucide-react";
import { routeHref } from "@/app/router";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { INK_CLASS } from "@/components/ui/labels";
import { Skeleton } from "@/components/ui/Misc";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { subjectById } from "@/data/syllabus";
import { heatLevel } from "@/lib/activity/heatmap";
import { isActiveDay } from "@/lib/activity/streak";
import { addDaysToDate, formatMinutes, parseLocalDate } from "@/lib/time";
import type { Concept } from "@/lib/types";
import { useConceptStatus } from "@/stores/conceptStateStore";
import { useToday } from "@/stores/clockStore";
import { useProfileStore } from "@/stores/profileStore";
import { useActivityInsight } from "../insight/useInsight";

const weekday = (date: string, style: "narrow" | "long") =>
  parseLocalDate(date).toLocaleDateString(undefined, { weekday: style });

/** Hatching for a day the weekly freeze covered. */
const HATCH =
  "repeating-linear-gradient(135deg, var(--rule-strong) 0 1.5px, transparent 1.5px 5px)";

/** The streak and the last 7 days (F16, F29): each day tinted by its minutes. */
export function StreakStrip() {
  const { lookup, streak, frozen, loaded } = useActivityInsight();
  const today = useToday();
  const freezeOn = useProfileStore((s) => s.profile?.prefs.streakFreeze ?? true);
  if (!loaded) return <Skeleton className="h-40 w-full" />;
  const days = Array.from({ length: 7 }, (_, i) => addDaysToDate(today, i - 6));
  const frozenThisWeek = days.filter((d) => frozen.has(d));
  return (
    <Card
      aria-labelledby="streak-heading"
      title={<span id="streak-heading">Streak</span>}
      aside={
        freezeOn && frozenThisWeek.length > 0
          ? `Freeze used ${weekday(frozenThisWeek[0]!, "long")}`
          : undefined
      }
    >
      <p className="flex flex-wrap items-baseline gap-x-2 text-base text-text">
        <span className="font-display text-4xl font-semibold tabular-nums">{streak.current}</span>
        <span>{streak.current === 1 ? "day" : "days"}</span>
        {!streak.activeToday && streak.current > 0 && (
          <span className="text-sm text-muted">(today still counts once you start)</span>
        )}
      </p>
      <ol className="mt-3 grid grid-cols-7 gap-1.5" aria-label="The last 7 days">
        {days.map((d) => {
          const day = lookup(d);
          const minutes = day?.minutes ?? 0;
          const covered = frozen.has(d);
          const active = isActiveDay(day);
          const level = Math.max(heatLevel(minutes), active ? 1 : 0);
          const isToday = d === today;
          return (
            <li key={d} className="flex flex-col items-center gap-1">
              <span
                aria-hidden="true"
                className={cx(
                  "block aspect-square w-full rounded-[8px]",
                  covered && "border border-rule-strong",
                  isToday && "ring-2 ring-text ring-offset-2 ring-offset-surface",
                )}
                style={{ background: covered ? HATCH : `var(--heat-${level})` }}
              />
              <span aria-hidden="true" className="text-xs text-muted">
                {weekday(d, "narrow")}
              </span>
              <span className="sr-only">
                {weekday(d, "long")}
                {isToday ? " (today)" : ""}:{" "}
                {covered
                  ? "covered by the weekly freeze"
                  : minutes
                    ? formatMinutes(minutes)
                    : active
                      ? "active"
                      : "no activity"}
              </span>
            </li>
          );
        })}
      </ol>
      <a href="#/dashboard" className="mt-3 inline-block text-sm text-accent hover:underline">
        The whole year on the dashboard
      </a>
    </Card>
  );
}

function ReadyRow({ concept }: { concept: Concept }) {
  const status = useConceptStatus(concept.id);
  const subject = subjectById.get(concept.subjectId);
  return (
    <li>
      <a
        href={routeHref("/map", undefined, { focus: concept.id })}
        className="-mx-2 flex items-center gap-3 rounded-control px-2 py-2 hover:bg-surface-sunken"
      >
        <span
          data-subject={concept.subjectId}
          className="grid size-10 shrink-0 place-items-center rounded-control bg-subject-tint"
        >
          <StatusGlyph status={status} size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate", INK_CLASS[status])}>{concept.name}</span>
          <span className="block truncate text-sm text-muted">
            {subject?.shortName} · {concept.estMinutes} min
          </span>
        </span>
        <ArrowRight size={15} aria-hidden="true" className="shrink-0 text-faint" />
      </a>
    </li>
  );
}

/** Ready to learn next (section 11.5), without what's already planned today. */
export function ReadyCard({ ready, fading }: { ready: Concept[]; fading: number }) {
  return (
    <Card
      aria-labelledby="ready-heading"
      title={<span id="ready-heading">Ready to learn</span>}
      aside={
        <a
          href={routeHref("/map", undefined, { ready: "1" })}
          className="text-accent hover:underline"
        >
          See all on the map
        </a>
      }
    >
      {ready.length === 0 ? (
        <p className="text-base text-muted">
          Nothing is waiting: everything you can start is under way. Open the map to pick something
          new.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {ready.map((c) => (
            <ReadyRow key={c.id} concept={c} />
          ))}
        </ul>
      )}
      {fading > 0 && (
        <a
          href="#/review"
          className="-mx-2 mt-2 flex items-center gap-3 rounded-control px-2 py-2 text-sm hover:bg-surface-sunken"
        >
          <StatusGlyph status="fading" size={14} />
          <span className="flex-1 text-text">
            {fading} {fading === 1 ? "concept is" : "concepts are"} fading. Review them to bring
            them back.
          </span>
          <ArrowRight size={15} aria-hidden="true" className="text-faint" />
        </a>
      )}
    </Card>
  );
}

/** The review count as one big number. */
export function ReviewCount({
  problems,
  concepts,
  fading,
}: {
  problems: number;
  concepts: number;
  fading: number;
}) {
  const total = problems + concepts;
  return (
    <a
      href="#/review"
      className="group block rounded-panel bg-surface p-4 transition-colors hover:bg-surface-raised sm:p-5"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-display text-lg font-semibold text-text">Review</span>
        <ArrowRight
          size={15}
          aria-hidden="true"
          className="text-faint transition-colors group-hover:text-accent"
        />
      </span>
      <span className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold text-text tabular-nums">{total}</span>
        <span className="text-base text-muted">due</span>
      </span>
      <span className="mt-1 flex items-center gap-2 text-sm text-muted">
        {total === 0 ? (
          "Nothing is due for review."
        ) : (
          <>
            {fading > 0 && <StatusGlyph status="fading" size={12} />}
            <span>
              {problems} {problems === 1 ? "problem" : "problems"} and {concepts}{" "}
              {concepts === 1 ? "concept" : "concepts"}
              {fading > 0 ? `, ${fading} fading` : ""}
            </span>
          </>
        )}
      </span>
    </a>
  );
}
