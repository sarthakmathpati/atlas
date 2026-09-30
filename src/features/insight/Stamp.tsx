// Weekly stamps (12.10.7): a week with 5 or more active days earns a stamp, "Week NN" with the
// emblem of the subject studied most that week (checks plus attempts). Derived from the records,
// never stored, never removed. Shown on the dashboard (the last 12 weeks) and the weekly review.
import { cx } from "@/components/ui/cx";
import { LineDrawing } from "@/components/ui/LineDrawing";
import { SubjectEmblem } from "@/components/ui/SubjectEmblem";
import { subjectById } from "@/data/syllabus";
import { STAMP_DAYS, type WeekStamp } from "@/lib/insight/summit";
import { hashSeed } from "@/lib/random";
import { addDaysToDate, parseLocalDate } from "@/lib/time";

const weekRange = (monday: string) => {
  const opts = { day: "numeric", month: "short" } as const;
  return `${parseLocalDate(monday).toLocaleDateString(undefined, opts)} to ${parseLocalDate(
    addDaysToDate(monday, 6),
  ).toLocaleDateString(undefined, opts)}`;
};

export function Stamp({ stamp, size = 84 }: { stamp: WeekStamp; size?: number }) {
  const subject = stamp.subjectId ? subjectById.get(stamp.subjectId) : undefined;
  // A slight, steady tilt per week, like a real stamp.
  const tilt = (hashSeed(stamp.week) % 13) - 6;
  return (
    <figure
      data-subject={stamp.subjectId}
      className="m-0 flex shrink-0 flex-col items-center"
      title={`Week ${stamp.number}, ${weekRange(stamp.week)}: ${stamp.activeDays} active days${
        subject ? `, mostly ${subject.name}` : ""
      }`}
    >
      <span
        aria-hidden="true"
        className={cx(
          "relative grid place-items-center rounded-full border-2",
          subject ? "border-subject text-subject" : "border-accent text-accent",
        )}
        style={{ width: size, height: size, transform: `rotate(${tilt}deg)` }}
      >
        <span className="absolute inset-1 rounded-full border border-dashed border-current opacity-70" />
        <span className="flex flex-col items-center gap-0.5">
          <span className="text-[11px] leading-none font-semibold">Week {stamp.number}</span>
          {subject ? (
            <SubjectEmblem subjectId={subject.id} size={Math.round(size * 0.38)} variant="bare" />
          ) : (
            <LineDrawing name="flag" size={Math.round(size * 0.38)} />
          )}
          <span className="text-[10px] leading-none font-medium">
            {subject?.shortName ?? `${stamp.activeDays} days`}
          </span>
        </span>
      </span>
      <figcaption className="sr-only">
        Week {stamp.number} ({weekRange(stamp.week)}): {stamp.activeDays} active days
        {subject ? `, mostly ${subject.name}` : ""}.
      </figcaption>
    </figure>
  );
}

/** A row of stamps, or a line saying how one is earned. */
export function StampRow({ stamps, className }: { stamps: WeekStamp[]; className?: string }) {
  if (stamps.length === 0)
    return (
      <p className={cx("text-base text-muted", className)}>
        A week with {STAMP_DAYS} or more active days earns a stamp with the emblem of the subject
        you studied most.
      </p>
    );
  return (
    <ul className={cx("flex flex-wrap gap-3", className)}>
      {stamps.map((s) => (
        <li key={s.week}>
          <Stamp stamp={s} />
        </li>
      ))}
    </ul>
  );
}
