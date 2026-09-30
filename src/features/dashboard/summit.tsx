// The dashboard's readiness ring split into subject colors, and the summit profile (12.10.7):
// readiness per week as a hiking elevation profile from the first week with data, the interview
// as a summit flag and the projection as a dashed trail. Every point is an ExplainNumber; the
// points are one tab stop (arrow keys move between them), and the chart has "Show as table".
import { useState, type KeyboardEvent } from "react";
import { cx } from "@/components/ui/cx";
import { LineDrawing } from "@/components/ui/LineDrawing";
import { SubjectMark } from "@/components/ui/SubjectEmblem";
import { subjectById } from "@/data/syllabus";
import { PACE_DAYS, PROJECTION_SPREAD, type SubjectRow } from "@/lib/insight/dashboard";
import { summitProjection, type SummitProjection } from "@/lib/insight/summit";
import { daysBetween, parseLocalDate } from "@/lib/time";
import { Formula, MathTable, ExplainNumber } from "../insight/Explain";
import { useSummit, type SummitPoint } from "../insight/useSummit";

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;
const dayMonth = (day: string) =>
  parseLocalDate(day).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const dateLong = (day: string) =>
  parseLocalDate(day).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

// ----- the ring ------------------------------------------------------------------------------------

/**
 * Overall readiness as a ring filled to the score, each subject's share (weight × readiness ÷ Σ
 * weights) in its own color, largest first. The legend beside it names the colors.
 */
export function SubjectRing({
  subjects,
  overall,
  size = 148,
  thickness = 14,
}: {
  subjects: SubjectRow[];
  overall: number;
  size?: number;
  thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const parts = subjects
    .filter((s) => s.weight > 0 && s.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution);
  const offsets = parts.map((_, i) =>
    parts.slice(0, i).reduce((n, p) => n + (Math.min(100, p.contribution) / 100) * c, 0),
  );
  const label = `Overall readiness ${r0(overall)} out of 100${
    parts.length ? `: ${parts.map((s) => `${s.name} adds ${r1(s.contribution)}`).join(", ")}` : ""
  }`;
  return (
    <div
      role="img"
      aria-label={label}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth={thickness}
        />
        {parts.map((s, i) => {
          const len = (Math.min(100, s.contribution) / 100) * c;
          const gap = len > 4 ? 2 : 0;
          return (
            <circle
              key={s.subjectId}
              data-subject={s.subjectId}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--subject-mark)"
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(0.5, len - gap)} ${c}`}
              strokeDashoffset={-offsets[i]!}
            />
          );
        })}
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center leading-none"
      >
        <span className="font-display text-4xl font-semibold text-text tabular-nums">
          {r0(overall)}
        </span>
        <span className="mt-1 text-xs text-muted">of 100</span>
      </span>
    </div>
  );
}

/** The ring's legend: the subjects that add most, with their square marks. */
export function RingLegend({ subjects, max = 5 }: { subjects: SubjectRow[]; max?: number }) {
  const parts = subjects
    .filter((s) => s.weight > 0 && s.contribution >= 0.5)
    .sort((a, b) => b.contribution - a.contribution);
  if (parts.length === 0) return null;
  const rest = parts.length - max;
  return (
    <ul className="space-y-1 text-sm" aria-label="What adds most to the score">
      {parts.slice(0, max).map((s) => (
        <li key={s.subjectId} className="flex items-center gap-2">
          <SubjectMark subjectId={s.subjectId} />
          <span className="min-w-0 flex-1 truncate text-text">{s.shortName}</span>
          <span className="text-muted tabular-nums">+{r1(s.contribution)}</span>
        </li>
      ))}
      {rest > 0 && <li className="text-muted">and {rest} more</li>}
    </ul>
  );
}

// ----- the summit profile --------------------------------------------------------------------------

function pointExplain(p: SummitPoint, live: boolean) {
  const rows = [...p.subjects]
    .sort((a, b) => b.weight - a.weight)
    .map((s) => [
      subjectById.get(s.subjectId)?.shortName ?? s.subjectId,
      r1(s.weight),
      r0(s.readiness),
    ]);
  return (
    <>
      <p>
        {live
          ? "Your records as they are now, scored by the same rules as the readiness ring."
          : `Your records as they were on ${dateLong(p.day)} at 23:59: checks and attempts up to then, with review schedules worked out from them. Scored by the same rules as today's readiness.`}
      </p>
      <MathTable head={["Subject", "Weight", "Ready"]} rows={rows} />
      <Formula>
        Σ(weight × readiness) ÷ Σ weight = {r1(p.overall * p.totalWeight)} ÷ {r1(p.totalWeight)} ={" "}
        {r0(p.overall)}
      </Formula>
      <p>
        {p.strong} strong of {p.concepts} concepts in your track.
      </p>
    </>
  );
}

function projectionExplain(p: SummitProjection) {
  return (
    <>
      <p>
        The pace of your readiness over the last {PACE_DAYS} days (since {dateLong(p.since)}),
        carried on to the interview, as in the dashboard's projection.
      </p>
      <Formula>
        pace = ({r1(p.now)} − {r1(p.before)}) ÷ {PACE_DAYS} = {p.pace.toFixed(2)} a day
      </Formula>
      <Formula>
        {r1(p.now)} + {p.pace.toFixed(2)} × {p.daysLeft} days = {r1(p.projected)}
        {p.projected >= 100 ? " (capped at 100)" : ""}
      </Formula>
      <p>
        Pace varies, so the range is ±{PROJECTION_SPREAD * 100}% of the growth: {r0(p.low)} to{" "}
        {r0(p.high)}.
      </p>
    </>
  );
}

const W = 1000;
const H = 240;
const PAD = { l: 34, r: 56, t: 34, b: 30 };

export function SummitProfile({
  live,
  today,
  interviewDate,
}: {
  live: SummitPoint;
  today: string;
  interviewDate?: string;
}) {
  const summit = useSummit(today);
  const [table, setTable] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const points = [...summit.weeks, live];
  const first = points[0]!.day;
  const upcoming = interviewDate && interviewDate >= today ? interviewDate : undefined;
  const end = upcoming ?? today;
  const span = Math.max(7, daysBetween(first, end));
  const x = (day: string) => PAD.l + (daysBetween(first, day) / span) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - Math.min(100, Math.max(0, v)) / 100) * (H - PAD.t - PAD.b);
  const proj =
    summit.before && summit.weeks.length
      ? summitProjection(live.overall, summit.before.overall, today, upcoming)
      : null;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.day)} ${y(p.overall)}`).join("");
  const area = `${line}L${x(live.day)} ${H - PAD.b}L${x(first)} ${H - PAD.b}Z`;
  const current = active ?? points.length - 1;

  const move = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? Math.min(points.length - 1, i + 1)
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? Math.max(0, i - 1)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? points.length - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    const root = e.currentTarget.closest("[data-summit]");
    root?.querySelector<HTMLButtonElement>(`[data-point="${next}"]`)?.focus();
  };

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  return (
    <section
      aria-labelledby="summit-heading"
      className="min-w-0 rounded-panel bg-surface p-4 sm:p-5"
      data-summit
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="summit-heading" className="font-display text-lg font-semibold text-text">
          Summit profile
        </h2>
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          aria-pressed={table}
          className="h-8 rounded-control px-2 text-sm text-accent hover:bg-accent-soft max-md:h-10"
        >
          {table ? "Show as chart" : "Show as table"}
        </button>
      </div>
      <p className="text-sm text-muted">
        Readiness at the end of each week since your first week with data
        {upcoming ? ", climbing toward the interview." : "."}
        {summit.pending > 0 && <span role="status"> Adding {summit.pending} earlier weeks.</span>}
      </p>
      {summit.weeks.length === 0 && summit.pending === 0 && !upcoming ? (
        <div className="mt-4 flex items-center gap-4 rounded-panel bg-surface-sunken px-4 py-4">
          <LineDrawing name="trail" size={64} />
          <p className="text-base text-muted">
            The profile starts with your first week of study: each Sunday adds a point, and an
            interview date adds the summit.
          </p>
        </div>
      ) : table ? (
        <div className="mt-3 max-h-80 overflow-auto rounded-control border border-rule">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-sunken text-left text-muted">
              <tr>
                <th scope="col" className="px-2.5 py-1.5 font-medium">
                  Week ending
                </th>
                <th scope="col" className="px-2.5 py-1.5 text-right font-medium">
                  Readiness
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => {
                const isLive = i === points.length - 1;
                return (
                  <tr key={p.day} className="border-t border-rule first:border-t-0">
                    <th scope="row" className="px-2.5 py-1 text-left font-normal">
                      {isLive ? "Today" : dayMonth(p.day)}
                    </th>
                    <td className="px-2.5 py-1 text-right tabular-nums">
                      <ExplainNumber
                        label={
                          isLive ? "Readiness today" : `Readiness, week ending ${dayMonth(p.day)}`
                        }
                        valueText={`${r0(p.overall)} out of 100`}
                        explain={pointExplain(p, isLive)}
                      >
                        {r0(p.overall)}
                      </ExplainNumber>
                    </td>
                  </tr>
                );
              })}
              {proj && (
                <tr className="border-t border-rule">
                  <th scope="row" className="px-2.5 py-1 text-left font-normal">
                    Interview, {dayMonth(proj.interviewDate)} (projected)
                  </th>
                  <td className="px-2.5 py-1 text-right tabular-nums">
                    <ExplainNumber
                      label="Projected readiness at the interview"
                      valueText={`${r0(proj.low)} to ${r0(proj.high)}`}
                      explain={projectionExplain(proj)}
                    >
                      {r0(proj.low)} to {r0(proj.high)}
                    </ExplainNumber>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-3 h-[220px] max-sm:h-[180px]">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            aria-hidden="true"
          >
            {[25, 50, 75, 100].map((v) => (
              <line
                key={v}
                x1={PAD.l}
                x2={W - PAD.r}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--chart-grid)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--rule-strong)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <path d={area} fill="var(--accent-soft)" />
            {proj && (
              <>
                <path
                  d={`M${x(today)} ${y(live.overall)}L${x(proj.interviewDate)} ${y(proj.high)}L${x(proj.interviewDate)} ${y(proj.low)}Z`}
                  fill="var(--accent-soft)"
                  opacity={0.6}
                />
                <path
                  d={`M${x(today)} ${y(live.overall)}L${x(proj.interviewDate)} ${y(proj.projected)}`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
            <path
              d={line}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {upcoming && (
              <line
                x1={x(upcoming)}
                x2={x(upcoming)}
                y1={y(proj?.projected ?? live.overall)}
                y2={y(proj?.projected ?? live.overall) - 30}
                stroke="var(--text)"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {upcoming && (
            <span
              aria-hidden="true"
              className="absolute block h-[11px] w-4 -translate-y-full bg-accent [clip-path:polygon(0_0,100%_50%,0_100%)]"
              style={{
                left: pct(x(upcoming), W),
                top: `calc(${pct(y(proj?.projected ?? live.overall) - 30, H)} + 11px)`,
              }}
            />
          )}
          {/* Axis words */}
          {[50, 100].map((v) => (
            <span
              key={v}
              aria-hidden="true"
              className="absolute left-0 -translate-y-1/2 text-xs text-muted tabular-nums"
              style={{ top: pct(y(v), H) }}
            >
              {v}
            </span>
          ))}
          {x(today) - x(first) > 90 && (
            <span className="absolute bottom-0 text-xs text-muted" style={{ left: pct(PAD.l, W) }}>
              {dayMonth(first)}
            </span>
          )}
          <span
            className="absolute bottom-0 -translate-x-1/2 text-xs font-medium text-text"
            style={{ left: pct(x(today), W) }}
          >
            Today
          </span>
          {upcoming && daysBetween(today, upcoming) > 6 && (
            <span className="absolute right-0 bottom-0 text-xs text-muted">
              {dayMonth(upcoming)}
            </span>
          )}
          {upcoming && (
            <span
              className="absolute -translate-x-full pr-1.5 text-right text-xs leading-tight text-muted"
              style={{
                left: pct(x(upcoming), W),
                top: `calc(${pct(y(proj?.projected ?? live.overall) - 30, H)} - 6px)`,
              }}
            >
              Interview
              {proj && (
                <>
                  <br />
                  <ExplainNumber
                    label="Projected readiness at the interview"
                    valueText={`${r0(proj.low)} to ${r0(proj.high)}`}
                    explain={projectionExplain(proj)}
                    className="font-semibold text-text"
                  >
                    {r0(proj.projected)}
                  </ExplainNumber>
                </>
              )}
            </span>
          )}
          {/* Points: one tab stop, arrows move between weeks. */}
          {points.map((p, i) => {
            const isLive = i === points.length - 1;
            return (
              <span
                key={p.day}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: pct(x(p.day), W), top: pct(y(p.overall), H) }}
              >
                <ExplainNumber
                  label={isLive ? "Readiness today" : `Readiness, week ending ${dayMonth(p.day)}`}
                  valueText={`${r0(p.overall)} out of 100`}
                  explain={pointExplain(p, isLive)}
                  wide
                  tabIndex={i === current ? 0 : -1}
                  onKeyDown={(e) => move(e, i)}
                  onFocus={() => setActive(i)}
                  dataPoint={i}
                  className={cx(
                    "grid place-items-center rounded-full no-underline",
                    isLive ? "size-6" : "size-4",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      "block rounded-full border-2 border-accent",
                      isLive ? "size-3.5 bg-accent" : "size-2 bg-surface",
                    )}
                  />
                </ExplainNumber>
                {isLive && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 pb-0.5 text-xs font-semibold whitespace-nowrap text-text"
                  >
                    {r0(p.overall)} today
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
