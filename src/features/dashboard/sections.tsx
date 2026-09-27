// The dashboard's sections (F17). Each figure is an ExplainNumber: the value with a popover that
// shows the data and the formula behind it (section 11.3 for readiness, 11.2 for practice).
import { Flame, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { conceptHref, routeHref } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { ProgressRing, SegmentedBar } from "@/components/ui/Progress";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { STATUS_LABEL } from "@/components/ui/labels";
import type { StreakInfo } from "@/lib/activity/streak";
import {
  practiceLevel,
  PACE_DAYS,
  PROJECTION_SPREAD,
  RETENTION_DAYS,
  UNTOUCHED_DAYS,
  type MemoryHealth,
  type PatternTile,
  type Projection,
  type SubjectRow,
  type WeaknessReport,
} from "@/lib/insight/dashboard";
import { plural } from "@/lib/planner/reasons";
import { problemLabel } from "@/lib/problems/catalog";
import type { ConceptEval, ReadinessModel } from "@/lib/readiness/model";
import { parseLocalDate } from "@/lib/time";
import type { Status, Track } from "@/lib/types";
import { ExplainButton, ExplainNumber, Formula, MathTable } from "../insight/Explain";

const TRACK_NAME: Record<Track, string> = { sde: "SDE", quant: "Quant", both: "SDE and quant" };
const r1 = (n: number) => Math.round(n * 10) / 10;
const r0 = (n: number) => Math.round(n);
const dateLong = (day: string) =>
  parseLocalDate(day).toLocaleDateString(undefined, { day: "numeric", month: "long" });

export function Card({
  title,
  id,
  actions,
  children,
  className,
}: {
  title?: string;
  id: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={title ? id : undefined}
      className={cx("min-w-0 rounded-panel border border-rule bg-surface", className)}
    >
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-rule px-4 py-2.5 sm:px-5">
          <h2 id={id} className="text-md font-semibold text-text">
            {title}
          </h2>
          {actions}
        </div>
      )}
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

function conceptScoreText(e: ConceptEval): ReactNode {
  const r = e.result;
  if (!r) return <p>Not started, so it scores 0.</p>;
  const base = r.hasLinkedProblems ? 0.5 * r.knowledge + 0.5 * r.practice : r.knowledge;
  const recency = r.overdue ? Math.max(0.5, 1 - r.overdueDays / (2 * Math.max(1, r.overdueInterval))) : 1;
  return (
    <>
      <Formula>
        {r.hasLinkedProblems
          ? `base = 0.5 × knowledge ${r1(r.knowledge)} + 0.5 × practice ${r1(r.practice)} = ${r1(base)}`
          : `base = knowledge = ${r1(base)}`}
      </Formula>
      <Formula>
        {r.overdue
          ? `recency = max(0.5, 1 − ${r.overdueDays} days late ÷ (2 × ${r.overdueInterval}-day interval)) = ${r1(recency)}`
          : "recency = 1 (not overdue)"}
      </Formula>
      <Formula>
        score = 100 × {r1(base)} × {r1(recency)} = {r0(e.score)}
      </Formula>
    </>
  );
}

// ----- readiness ---------------------------------------------------------------------------------

export function ReadinessCard({
  model,
  subjects,
  projection,
}: {
  model: ReadinessModel;
  subjects: SubjectRow[];
  projection: Projection | null;
}) {
  const counted = subjects.filter((s) => s.weight > 0);
  const explain = (
    <>
      <p>
        The weighted mean of subject readiness, with the {TRACK_NAME[model.track]} weights
        {model.track === "both" ? " (the average of the SDE and Quant columns)" : ""}. Subjects
        with weight 0 don't count for this track.
      </p>
      <MathTable
        head={["Subject", "Weight", "Ready", "Adds"]}
        rows={counted.map((s) => [s.name, r1(s.weight), r0(s.readiness), r1(s.contribution)])}
      />
      <Formula>
        Σ(weight × readiness) ÷ Σ weight = {r1(model.overall * model.totalWeight)} ÷{" "}
        {r1(model.totalWeight)} = {r0(model.overall)}
      </Formula>
    </>
  );
  return (
    <Card title="Overall readiness" id="readiness-heading">
      <div className="flex flex-wrap items-center gap-5">
        <ProgressRing
          value={model.overall / 100}
          size={112}
          thickness={9}
          label={`Overall readiness ${r0(model.overall)} out of 100`}
        >
          <span className="text-2xl">{r0(model.overall)}</span>
        </ProgressRing>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-base text-text">
            <ExplainNumber
              label="Overall readiness"
              valueText={`${r0(model.overall)} out of 100`}
              explain={explain}
              wide
            >
              {r0(model.overall)} out of 100
            </ExplainNumber>{" "}
            for the {TRACK_NAME[model.track]} track
          </p>
          <p className="text-sm text-muted">
            {model.counts.strong} strong, {model.counts.learning} learning,{" "}
            {model.counts.fading} fading of {model.byId.size} concepts in your track.
          </p>
        </div>
      </div>
      {projection && <ProjectionLine p={projection} />}
    </Card>
  );
}

function ProjectionLine({ p }: { p: Projection }) {
  const when = p.daysLeft === 0 ? "today" : `by ${dateLong(p.interviewDate)}`;
  const explain = (
    <>
      <p>
        Pace is the must-know concepts that turned strong in the last {PACE_DAYS} days (since{" "}
        {dateLong(p.since)}), per day.
      </p>
      <Formula>
        pace = {p.recentStrong} ÷ {PACE_DAYS} = {p.pace.toFixed(2)} a day
      </Formula>
      <Formula>
        {p.strongMust} strong now + {p.pace.toFixed(2)} × {p.daysLeft} days = {r1(p.projected)}
        {p.projected >= p.totalMust ? ` (capped at ${p.totalMust})` : ""}
      </Formula>
      <p>
        Pace varies, so the range is ±{PROJECTION_SPREAD * 100}% of the growth: {r0(p.low)} to{" "}
        {r0(p.high)}.
      </p>
    </>
  );
  return (
    <p className="mt-4 border-t border-rule pt-3 text-base text-text">
      At your pace over the last {PACE_DAYS} days, you'll reach about{" "}
      <ExplainNumber
        label="Projection"
        valueText={`${r0(p.low)} to ${r0(p.high)} of ${p.totalMust}`}
        explain={explain}
      >
        {r0(p.low) === r0(p.high) ? r0(p.projected) : `${r0(p.low)} to ${r0(p.high)}`}
      </ExplainNumber>{" "}
      of {p.totalMust} must-know concepts {when}.
      {p.recentStrong === 0 && (
        <span className="block text-sm text-muted">
          None turned strong in the last {PACE_DAYS} days, so this assumes no new ones. A quick
          quiz on a learning concept is the fastest way to move it.
        </span>
      )}
    </p>
  );
}

// ----- subjects ----------------------------------------------------------------------------------

export function SubjectBars({ subjects }: { subjects: SubjectRow[] }) {
  const [all, setAll] = useState(false);
  const counted = subjects.filter((s) => s.weight > 0);
  const rest = subjects.filter((s) => s.weight <= 0);
  const rows = all ? [...counted, ...rest] : counted;
  return (
    <Card
      title="Subjects, weakest first"
      id="subjects-heading"
      actions={
        <ExplainButton
          label="Subject readiness"
          explain={
            <>
              <p>
                The mean of concept scores in the subject, weighted by importance: must-know 3,
                important 2, advanced 0.5. Concepts outside your track, hidden ones and other
                languages' topics are left out.
              </p>
              <Formula>concept score = 100 × base × recency (0 when not started)</Formula>
              <p>Open a subject's number to see its sums.</p>
            </>
          }
        />
      }
    >
      <ul className="space-y-2">
        {rows.map((s) => (
          <li key={s.subjectId} className="flex items-center gap-3">
            <a
              href={routeHref("/map", undefined, { subject: s.subjectId })}
              title={s.name}
              className="w-24 shrink-0 truncate text-sm text-text hover:underline sm:w-32"
            >
              {s.shortName}
            </a>
            <span
              className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-sunken"
              role="meter"
              aria-label={`${s.name} readiness`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={r0(s.readiness)}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${Math.min(100, s.readiness)}%`,
                  background: s.weight > 0 ? "var(--chart-series)" : "var(--rule-strong)",
                }}
              />
            </span>
            <ExplainNumber
              className="w-8 shrink-0 text-right text-sm text-muted tabular-nums"
              label={`${s.name} readiness`}
              valueText={`${r0(s.readiness)} out of 100`}
              explain={
                <>
                  <Formula>
                    Σ(importance × score) ÷ Σ importance = {r0(s.weightedScore)} ÷{" "}
                    {r1(s.importanceWeight)} = {r1(s.readiness)}
                  </Formula>
                  <MathTable
                    head={["Status", "Concepts"]}
                    rows={(["strong", "learning", "fading", "not_started"] as Status[]).map(
                      (k) => [STATUS_LABEL[k], s.counts[k]],
                    )}
                  />
                  <p>
                    Must-know: {s.must.strong} strong of {s.must.total}.{" "}
                    {s.weight > 0
                      ? `Weight ${r1(s.weight)} in the overall score.`
                      : "It doesn't count toward this track's overall score."}
                  </p>
                </>
              }
            >
              {r0(s.readiness)}
            </ExplainNumber>
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-3 text-sm text-accent hover:underline"
        >
          {all ? "Hide subjects outside the track's weights" : `Show ${rest.length} more that don't count for this track`}
        </button>
      )}
    </Card>
  );
}

// ----- pattern grid ------------------------------------------------------------------------------

const TINT = [0, 14, 26, 38, 50];

function PatternTileView({ t }: { t: PatternTile }) {
  const level = practiceLevel(t.practice);
  const counts = `E ${t.alone.easy}, M ${t.alone.medium}, H ${t.alone.hard}`;
  const explain = (
    <>
      <p>
        {STATUS_LABEL[t.status]}. Each linked problem counts by its latest attempt: solved alone
        in full, with hints half; easy 0.5, medium 1, hard 1.5.
      </p>
      <MathTable
        head={["", "Easy", "Medium", "Hard"]}
        rows={[
          ["Solved alone", t.alone.easy, t.alone.medium, t.alone.hard],
          ["With hints", t.withHints.easy, t.withHints.medium, t.withHints.hard],
          ["Linked problems", t.linked.easy, t.linked.medium, t.linked.hard],
        ]}
      />
      <Formula>
        practice = min(1, {r1(t.sum)} ÷ 3) = {Math.round(t.practice * 100)}%
      </Formula>
      {t.noHard && <p>No hard problem solved alone yet (the dashed outline).</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" href={conceptHref(t.conceptId)}>
          Open the pattern
        </Button>
        <Button size="sm" variant="ghost" href={routeHref("/drill", undefined, { pattern: t.conceptId })}>
          Drill it
        </Button>
      </div>
    </>
  );
  return (
    <li>
      <ExplainNumber
        label={t.name}
        valueText={`practice ${Math.round(t.practice * 100)}%, solved alone ${counts}`}
        explain={explain}
        className={cx(
          "flex h-full min-h-16 w-full flex-col gap-1 rounded-control border p-2.5 no-underline hover:border-accent",
          t.noHard ? "border-dashed border-rule-strong" : "border-rule",
        )}
        style={{ background: `color-mix(in srgb, var(--heat-2) ${TINT[level]}%, var(--surface))` }}
      >
        <span className="line-clamp-2 text-sm font-medium text-text">{t.name}</span>
        <span className="mt-auto flex items-baseline justify-between gap-2 text-xs text-muted tabular-nums">
          <span>{counts}</span>
          <span>{Math.round(t.practice * 100)}%</span>
        </span>
        <span className="sr-only">Level {level}</span>
      </ExplainNumber>
    </li>
  );
}

export function PatternGrid({ tiles }: { tiles: PatternTile[] }) {
  return (
    <Card
      title="DSA patterns"
      id="patterns-heading"
      actions={
        <ExplainButton
          label="The pattern grid"
          explain={
            <>
              <p>
                One tile per pattern in your track, darker as practice grows (section 11.2):
                practice = min(1, weighted solves ÷ 3). E, M and H count linked problems whose
                latest attempt was solved alone.
              </p>
              <p>A dashed outline means no hard problem solved alone yet.</p>
            </>
          }
        />
      }
    >
      {tiles.length === 0 ? (
        <p className="text-base text-muted">No DSA patterns are in your track.</p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {tiles.map((t) => (
              <PatternTileView key={t.conceptId} t={t} />
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>Practice:</span>
            {["0", "under a third", "under two thirds", "almost", "complete"].map((l, i) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block size-3 rounded-[3px] border border-rule"
                  style={{
                    background: `color-mix(in srgb, var(--heat-2) ${TINT[i]}%, var(--surface))`,
                  }}
                />
                {l}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block size-3 rounded-[3px] border border-dashed border-rule-strong"
              />
              no hard solved alone
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

// ----- status mix --------------------------------------------------------------------------------

export function StatusMix({ subjects }: { subjects: SubjectRow[] }) {
  const [table, setTable] = useState(false);
  const rows = subjects.filter((s) => s.weight > 0);
  const order: Status[] = ["strong", "learning", "fading", "not_started"];
  return (
    <Card
      title="Status mix by subject"
      id="mix-heading"
      actions={
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          aria-pressed={table}
          className="h-8 rounded-control px-2 text-sm text-accent hover:bg-accent-soft max-md:h-10"
        >
          {table ? "Show as chart" : "Show as table"}
        </button>
      }
    >
      {table ? (
        <MathTable
          head={["Subject", "Strong", "Learning", "Fading", "Not started"]}
          rows={rows.map((s) => [s.name, ...order.map((k) => s.counts[k])])}
        />
      ) : (
        <>
          <ul className="space-y-2.5">
            {rows.map((s) => (
              <li key={s.subjectId} className="flex items-center gap-3">
                <span title={s.name} className="w-24 shrink-0 truncate text-sm text-text sm:w-32">
                  {s.shortName}
                </span>
                <SegmentedBar counts={s.counts} height={10} className="flex-1" />
                <span className="w-10 shrink-0 text-right text-xs text-muted tabular-nums">
                  {s.concepts}
                </span>
              </li>
            ))}
          </ul>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {order.map((k) => (
              <li key={k} className="inline-flex items-center gap-1.5">
                <StatusGlyph status={k} size={12} />
                {STATUS_LABEL[k]}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

// ----- memory health -------------------------------------------------------------------------------

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-semibold text-text tabular-nums">{value}</p>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function MemoryHealthCard({ memory }: { memory: MemoryHealth }) {
  const due = memory.dueToday.problems + memory.dueToday.concepts;
  const late = memory.overdue.problems + memory.overdue.concepts;
  const ret = memory.retention;
  return (
    <Card
      title="Memory health"
      id="memory-heading"
      actions={
        <a href="#/review" className="text-sm text-accent hover:underline">
          Open Review
        </a>
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <Stat
          label="Due today"
          value={
            <ExplainNumber
              label="Due today"
              valueText={String(due)}
              explain={
                <p>
                  Reviews whose date is today: {plural(memory.dueToday.problems, "problem")} to
                  re-solve and {plural(memory.dueToday.concepts, "concept")} to review.
                </p>
              }
            >
              {due}
            </ExplainNumber>
          }
        />
        <Stat
          label="Overdue"
          value={
            <ExplainNumber
              label="Overdue"
              valueText={String(late)}
              explain={
                <p>
                  Reviews dated before today and not done yet:{" "}
                  {plural(memory.overdue.problems, "problem")} and{" "}
                  {plural(memory.overdue.concepts, "concept")}. They stay in Review until done;
                  concepts past their grace period turn fading.
                </p>
              }
            >
              {late}
            </ExplainNumber>
          }
        />
        <Stat
          label="Retention"
          value={
            <ExplainNumber
              label="Retention"
              valueText={ret.rate === null ? "no re-solves yet" : `${Math.round(ret.rate * 100)}%`}
              explain={
                <>
                  <p>
                    Re-solves (any attempt after a problem's first) saved in the last{" "}
                    {RETENTION_DAYS} days, since {dateLong(ret.since)}, and how many were solved
                    alone.
                  </p>
                  <Formula>
                    {ret.total === 0
                      ? "No re-solves in this window yet."
                      : `${ret.alone} solved alone ÷ ${ret.total} re-solves = ${Math.round((ret.rate ?? 0) * 100)}%`}
                  </Formula>
                </>
              }
            >
              {ret.rate === null ? "–" : `${Math.round(ret.rate * 100)}%`}
            </ExplainNumber>
          }
          sub={ret.total ? `${ret.alone} of ${ret.total}` : "no re-solves yet"}
        />
      </div>
    </Card>
  );
}

// ----- weakness report ---------------------------------------------------------------------------

export function WeaknessCard({
  weakness,
  onAddConcept,
  onAddPattern,
  onAddSubject,
}: {
  weakness: WeaknessReport;
  onAddConcept: (e: ConceptEval) => void;
  onAddPattern: (t: WeaknessReport["patterns"][number]) => void;
  onAddSubject: (subjectId: string) => void;
}) {
  const empty =
    weakness.concepts.length + weakness.patterns.length + weakness.subjects.length === 0;
  const add = (label: string, onClick: () => void) => (
    <Button size="sm" variant="ghost" icon={Plus} onClick={onClick} aria-label={label}>
      Add to today
    </Button>
  );
  return (
    <Card title="Weakness report" id="weakness-heading">
      {empty ? (
        <p className="text-base text-muted">
          Nothing to flag yet. As you study, the weakest must-know concepts, patterns without a
          hard problem, and subjects left alone for {UNTOUCHED_DAYS} days show here.
        </p>
      ) : (
        <div className="space-y-5">
          {weakness.concepts.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-semibold text-text">Weakest must-know concepts</h3>
              <ul className="divide-y divide-rule rounded-control border border-rule">
                {weakness.concepts.map((e) => (
                  <li key={e.concept.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <StatusGlyph status={e.status} size={14} />
                    <a href={conceptHref(e.concept.id)} className="min-w-0 flex-1 text-base text-text hover:underline">
                      {e.concept.name}
                    </a>
                    <ExplainNumber
                      label={`${e.concept.name} score`}
                      valueText={`${r0(e.score)} out of 100`}
                      explain={conceptScoreText(e)}
                      className="text-sm text-muted tabular-nums"
                    >
                      {r0(e.score)}
                    </ExplainNumber>
                    {add(`Add ${e.concept.name} to today`, () => onAddConcept(e))}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {weakness.patterns.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-semibold text-text">Patterns with no hard problem solved</h3>
              <ul className="divide-y divide-rule rounded-control border border-rule">
                {weakness.patterns.map((t) => (
                  <li key={t.conceptId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <a href={conceptHref(t.conceptId)} className="text-base text-text hover:underline">
                        {t.name}
                      </a>
                      <span className="block text-sm text-muted">
                        Solved alone: {t.alone.easy} easy, {t.alone.medium} medium. Next: {problemLabel(t.hardProblem)}.
                      </span>
                    </span>
                    {add(`Add a hard ${t.name} problem to today`, () => onAddPattern(t))}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {weakness.subjects.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-semibold text-text">
                Subjects untouched for {UNTOUCHED_DAYS} days or more
              </h3>
              <ul className="divide-y divide-rule rounded-control border border-rule">
                {weakness.subjects.map((s) => (
                  <li key={s.subjectId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="text-base text-text">{s.name}</span>
                      <span className="block text-sm text-muted">
                        Last studied {dateLong(s.lastActive)}, {s.daysSince} days ago.
                      </span>
                    </span>
                    {add(`Add something from ${s.name} to today`, () => onAddSubject(s.subjectId))}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ----- activity ------------------------------------------------------------------------------------

export function StreakFacts({ streak, freezeOn }: { streak: StreakInfo; freezeOn: boolean }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-base text-text">
      <Flame size={18} aria-hidden="true" className={streak.current ? "text-warning" : "text-faint"} />
      <ExplainNumber
        label="Streak"
        valueText={`${streak.current} days`}
        explain={
          <>
            <p>
              A day is active with at least 10 minutes of activity, or any attempt, check or
              finished plan item. The streak counts active days in a row ending today (or
              yesterday, until today is active).
            </p>
            <p>
              {freezeOn
                ? `One freeze a week covers a single missed day between active days. ${
                    streak.frozenDays.length
                      ? `It covered ${streak.frozenDays.map(dateLong).join(", ")} (outlined on the heatmap); covered days don't add to the count.`
                      : "It hasn't been needed in this streak."
                  }`
                : "The weekly freeze is off in Settings, so a missed day ends the streak."}
            </p>
          </>
        }
      >
        {streak.current} {streak.current === 1 ? "day" : "days"}
      </ExplainNumber>
      <span className="text-sm text-muted">
        {streak.activeToday ? "including today" : "today still counts once you start"}
      </span>
    </p>
  );
}
