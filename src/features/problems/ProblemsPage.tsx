// The problem library (F6): every seed problem (LeetCode, SQL, quant puzzles, design prompts) and
// the owner's own, with filters that live in the URL, sorting by any column, grouping by topic,
// header stats, quick add and CSV import. Rows render progressively so the list stays fast.
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  FileUp,
  ListFilter,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { conceptHref, navigate, routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip, DifficultyChip, PatternChip, TagChip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { BottomSheet } from "@/components/ui/Dialog";
import { Field, Input, Select, Switch, type SelectOption } from "@/components/ui/Field";
import { useIsMobile } from "@/components/ui/hooks";
import { EmptyState, PageSkeleton } from "@/components/ui/Misc";
import { MultiCombobox } from "@/components/ui/MultiCombobox";
import { Popover, type TriggerProps } from "@/components/ui/Popover";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DIFFICULTY_LABEL } from "@/components/ui/labels";
import { conceptById, subjectById, subjects, topicById, topics } from "@/data/syllabus";
import { allProblems, problemLabel } from "@/lib/problems/catalog";
import {
  activeFilterCount,
  applyFilters,
  buildRows,
  DEFAULT_FILTERS,
  filtersToQuery,
  groupByTopic,
  libraryStats,
  parseFilters,
  sortRows,
  type ProblemFilters,
  type ProblemRow,
  type SortKey,
  type SourceFilter,
  type StatusFilter,
} from "@/lib/problems/filters";
import { relativeDate } from "@/lib/problems/progress";
import { localDate } from "@/lib/time";
import type { Difficulty } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { updateProblem, useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { ProblemStatusGlyph, ResultLabel, ReviewText, StarToggle } from "./parts";
import { conceptName, problemPageHref } from "./problemUi";

const PAGE = 150;

const SORT_LABEL: Record<SortKey, string> = {
  order: "Syllabus order",
  title: "Number and title",
  difficulty: "Difficulty",
  status: "Status",
  result: "Last result",
  last: "Last attempted",
  next: "Next review",
};

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "leetcode", label: "LeetCode" },
  { value: "sql", label: "SQL (LeetCode database)" },
  { value: "quant", label: "Quant puzzles" },
  { value: "design", label: "Design prompts" },
  { value: "custom", label: "Added by me" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "attempted", label: "Attempted" },
  { value: "solved", label: "Solved" },
  { value: "mastered", label: "Mastered" },
];

function useFilters(): [ProblemFilters, (changes: Partial<ProblemFilters>) => void] {
  const route = useRoute();
  const filters = useMemo(() => parseFilters(route.query), [route.query]);
  const set = (changes: Partial<ProblemFilters>) =>
    navigate(routeHref("/problems", undefined, filtersToQuery({ ...filters, ...changes })), {
      replace: true,
    });
  return [filters, set];
}

// ----- header stats -----------------------------------------------------------------------------

function Stat({
  label,
  value,
  href,
  className,
}: {
  label: string;
  value: number;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <span className="block text-sm text-muted">{label}</span>
      <span className="block text-lg font-semibold text-text tabular-nums sm:text-xl">{value}</span>
    </>
  );
  const classes = cx("block bg-surface px-3 py-2 sm:px-4 sm:py-3", className);
  return href ? (
    <a href={href} className={cx(classes, "hover:bg-surface-sunken")}>
      {body}
    </a>
  ) : (
    <div className={classes}>{body}</div>
  );
}

function StatsStrip({ rows, today }: { rows: ProblemRow[]; today: string }) {
  const s = libraryStats(rows, today);
  const solvedHref = (d: Difficulty) =>
    routeHref("/problems", undefined, { status: "solved", difficulty: d });
  // A 1 px gap over a rule-colored background draws the dividers at every width.
  return (
    <section
      aria-label="Progress"
      className="mb-5 grid grid-cols-6 gap-px overflow-hidden rounded-panel border border-rule bg-rule sm:grid-cols-5"
    >
      <Stat
        label="Easy solved"
        value={s.solved.easy}
        href={solvedHref("easy")}
        className="col-span-2 sm:col-span-1"
      />
      <Stat
        label="Medium solved"
        value={s.solved.medium}
        href={solvedHref("medium")}
        className="col-span-2 sm:col-span-1"
      />
      <Stat
        label="Hard solved"
        value={s.solved.hard}
        href={solvedHref("hard")}
        className="col-span-2 sm:col-span-1"
      />
      <Stat
        label="Solved this week"
        value={s.solvedThisWeek}
        className="col-span-3 sm:col-span-1"
      />
      <Stat
        label="Due today"
        value={s.dueToday}
        href="#/review"
        className="col-span-3 sm:col-span-1"
      />
    </section>
  );
}

// ----- filters --------------------------------------------------------------------------------

function topicOptions(rows: ProblemRow[]): SelectOption[] {
  const used = new Set<string>();
  for (const r of rows) {
    if (r.info.topicId) used.add(r.info.topicId);
    for (const c of r.info.conceptIds) {
      const t = conceptById.get(c)?.topicId;
      if (t) used.add(t);
    }
  }
  const out: SelectOption[] = [{ value: "", label: "All topics" }];
  for (const s of subjects) {
    const list = topics.filter((t) => t.subjectId === s.id && used.has(t.id));
    if (list.length === 0) continue;
    out.push({ value: s.id, label: `All of ${s.shortName}`, group: s.name });
    for (const t of list) out.push({ value: t.id, label: t.name, group: s.name });
  }
  return out;
}

function FilterPanel({
  filters,
  set,
  rows,
  hidePremiumDefault,
}: {
  filters: ProblemFilters;
  set: (c: Partial<ProblemFilters>) => void;
  rows: ProblemRow[];
  hidePremiumDefault: boolean;
}) {
  const topicOpts = useMemo(() => topicOptions(rows), [rows]);
  const patternOpts = useMemo(() => {
    const used = new Set(rows.flatMap((r) => r.info.conceptIds));
    return [...used]
      .map((id) => conceptById.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ value: c.id, label: c.name, detail: topicById.get(c.topicId)?.name }));
  }, [rows]);
  const tagOpts = useMemo(() => {
    const used = new Set(rows.flatMap((r) => r.state?.tags ?? []));
    return [...used].sort().map((t) => ({ value: t, label: t }));
  }, [rows]);
  const hidePremium = filters.premium ? filters.premium === "hide" : hidePremiumDefault;

  const toggleDifficulty = (d: Difficulty) =>
    set({
      difficulty: filters.difficulty.includes(d)
        ? filters.difficulty.filter((x) => x !== d)
        : [...filters.difficulty, d],
    });

  return (
    <div className="flex w-full flex-col gap-4 md:w-[380px]">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text" id="status-filter-label">
          Status
        </span>
        <SegmentedControl<StatusFilter>
          label="Status"
          size="sm"
          full
          value={filters.status}
          onChange={(status) => set({ status })}
          options={STATUS_OPTIONS}
        />
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-text">Difficulty</legend>
        <div className="flex gap-2">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
            const on = filters.difficulty.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDifficulty(d)}
                className={cx(
                  "h-8 flex-1 rounded-control border text-sm font-medium transition-colors max-md:h-11",
                  on
                    ? "border-accent bg-accent-soft text-text"
                    : "border-rule bg-surface text-muted hover:text-text",
                )}
              >
                {DIFFICULTY_LABEL[d]}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Field label="Source">
        <Select
          value={filters.source}
          onChange={(e) => set({ source: e.target.value as SourceFilter })}
          options={SOURCE_OPTIONS}
        />
      </Field>
      <Field label="Topic">
        <Select
          value={filters.topic ?? ""}
          onChange={(e) => set({ topic: e.target.value || undefined })}
          options={topicOpts}
        />
      </Field>
      <MultiCombobox
        label="Pattern"
        options={patternOpts}
        value={filters.pattern ? [filters.pattern] : []}
        onChange={(v) => set({ pattern: v[v.length - 1] })}
        max={1}
        placeholder="Any pattern"
      />
      {tagOpts.length > 0 && (
        <MultiCombobox
          label="Your tags"
          options={tagOpts}
          value={filters.tags}
          onChange={(tags) => set({ tags })}
          placeholder="Any tag"
        />
      )}
      <div className="flex flex-col gap-3 border-t border-rule pt-4">
        <Switch label="Due for re-solve" checked={filters.due} onChange={(due) => set({ due })} />
        <Switch
          label="Starred only"
          checked={filters.starred}
          onChange={(starred) => set({ starred })}
        />
        <Switch
          label="Hide premium problems"
          description={filters.premium ? undefined : "Follows your setting in Settings → Profile."}
          checked={hidePremium}
          onChange={(v) =>
            set({ premium: v === hidePremiumDefault ? undefined : v ? "hide" : "show" })
          }
        />
      </div>
    </div>
  );
}

function ActiveFilters({
  filters,
  set,
}: {
  filters: ProblemFilters;
  set: (c: Partial<ProblemFilters>) => void;
}) {
  const chips: { key: string; label: string; clear: Partial<ProblemFilters> }[] = [];
  if (filters.status !== "all")
    chips.push({
      key: "status",
      label: STATUS_OPTIONS.find((o) => o.value === filters.status)!.label,
      clear: { status: "all" },
    });
  if (filters.difficulty.length)
    chips.push({
      key: "difficulty",
      label: filters.difficulty.map((d) => DIFFICULTY_LABEL[d]).join(" or "),
      clear: { difficulty: [] },
    });
  if (filters.source !== "all")
    chips.push({
      key: "source",
      label: SOURCE_OPTIONS.find((o) => o.value === filters.source)!.label,
      clear: { source: "all" },
    });
  if (filters.topic)
    chips.push({
      key: "topic",
      label:
        topicById.get(filters.topic)?.name ?? subjectById.get(filters.topic)?.name ?? filters.topic,
      clear: { topic: undefined },
    });
  if (filters.pattern)
    chips.push({
      key: "pattern",
      label: conceptName(filters.pattern),
      clear: { pattern: undefined },
    });
  for (const t of filters.tags)
    chips.push({
      key: `tag-${t}`,
      label: `Tag: ${t}`,
      clear: { tags: filters.tags.filter((x) => x !== t) },
    });
  if (filters.due) chips.push({ key: "due", label: "Due for re-solve", clear: { due: false } });
  if (filters.starred) chips.push({ key: "starred", label: "Starred", clear: { starred: false } });
  if (filters.premium)
    chips.push({
      key: "premium",
      label: filters.premium === "hide" ? "Premium hidden" : "Premium shown",
      clear: { premium: undefined },
    });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <TagChip key={c.key} label={c.label} onRemove={() => set(c.clear)} />
      ))}
      <button
        type="button"
        onClick={() =>
          set({
            ...DEFAULT_FILTERS,
            q: filters.q,
            sort: filters.sort,
            dir: filters.dir,
            group: filters.group,
          })
        }
        className="h-6 rounded-control px-1.5 text-sm text-accent hover:underline max-md:h-10"
      >
        Clear all
      </button>
    </div>
  );
}

// ----- rows ---------------------------------------------------------------------------------------

function PatternChips({ ids, max = 2 }: { ids: string[]; max?: number }) {
  const shown = ids.slice(0, max);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((id) => (
        <PatternChip
          key={id}
          label={conceptName(id)}
          href={conceptHref(id)}
          className="max-w-[180px] truncate"
        />
      ))}
      {ids.length > max && <span className="text-xs text-muted">+{ids.length - max}</span>}
    </span>
  );
}

function titleOf(row: ProblemRow): ReactNode {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <a
        href={problemPageHref(row.info)}
        className="font-medium text-text hover:text-accent hover:underline"
      >
        {problemLabel(row.info)}
      </a>
      {row.info.premium && <Chip className="h-5 px-1.5">Premium</Chip>}
      {row.info.custom && <Chip className="h-5 px-1.5">Mine</Chip>}
      {row.info.language === "sql" && <Chip className="h-5 px-1.5">SQL</Chip>}
    </span>
  );
}

function toggleStar(row: ProblemRow) {
  updateProblem(row.info.id, { starred: !row.state?.starred });
}

function SortHeader({
  label,
  sortKey,
  filters,
  set,
  className,
}: {
  label: string;
  sortKey: SortKey;
  filters: ProblemFilters;
  set: (c: Partial<ProblemFilters>) => void;
  className?: string;
}) {
  const active = filters.sort === sortKey;
  const Icon = !active ? ArrowUpDown : filters.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cx("px-2 py-2 text-left font-medium", className)}
    >
      <button
        type="button"
        onClick={() =>
          set(
            active && filters.dir === "desc"
              ? { sort: "order", dir: "asc" }
              : { sort: sortKey, dir: active ? "desc" : "asc" },
          )
        }
        className={cx(
          "inline-flex items-center gap-1 rounded-control px-1 py-0.5 whitespace-nowrap hover:text-text",
          active ? "text-text" : "text-muted",
        )}
      >
        {label || <span className="sr-only">Status</span>}
        <Icon size={13} aria-hidden="true" className={active ? "" : "opacity-50"} />
      </button>
    </th>
  );
}

function openRow(e: React.MouseEvent, href: string) {
  if ((e.target as HTMLElement).closest("a, button")) return;
  navigate(href);
}

function TableRows({ rows, today }: { rows: ProblemRow[]; today: string }) {
  return (
    <>
      {rows.map((row) => {
        const href = problemPageHref(row.info);
        return (
          <tr
            key={row.info.id}
            onClick={(e) => openRow(e, href)}
            className="cursor-pointer border-t border-rule transition-colors hover:bg-surface-sunken"
          >
            <td className="w-9 py-2.5 pr-1 pl-4 align-middle">
              <ProblemStatusGlyph state={row.state} />
            </td>
            <td className="min-w-[200px] px-2 py-2.5">
              {titleOf(row)}
              {row.info.conceptIds.length > 0 && (
                <span className="mt-1 block lg:hidden">
                  <PatternChips ids={row.info.conceptIds} max={1} />
                </span>
              )}
            </td>
            <td className="px-2 py-2.5">
              <DifficultyChip difficulty={row.info.difficulty} />
            </td>
            <td className="px-2 py-2.5 max-lg:hidden">
              <PatternChips ids={row.info.conceptIds} />
            </td>
            <td className="px-2 py-2.5 text-sm max-lg:hidden">
              {row.lastResult ? (
                <ResultLabel result={row.lastResult} short />
              ) : (
                <span className="text-faint">–</span>
              )}
            </td>
            <td className="px-2 py-2.5 text-sm whitespace-nowrap text-muted max-xl:hidden">
              {row.lastAt ? relativeDate(localDate(new Date(row.lastAt)), today) : "–"}
            </td>
            <td className="px-2 py-2.5 text-sm">
              <ReviewText info={row.review} />
            </td>
            <td className="w-10 py-1 pr-3 pl-1 text-right">
              <StarToggle
                starred={row.state?.starred ?? false}
                onToggle={() => toggleStar(row)}
                label={row.info.title}
              />
            </td>
          </tr>
        );
      })}
    </>
  );
}

function Cards({ rows, today }: { rows: ProblemRow[]; today: string }) {
  return (
    <>
      {rows.map((row) => (
        <li
          key={row.info.id}
          className="flex gap-3 border-t border-rule px-4 py-3 first:border-t-0"
        >
          <ProblemStatusGlyph state={row.state} className="mt-1" />
          <div className="min-w-0 flex-1 space-y-1.5">
            {titleOf(row)}
            <div className="flex flex-wrap items-center gap-1.5">
              <DifficultyChip difficulty={row.info.difficulty} />
              <PatternChips ids={row.info.conceptIds} max={1} />
            </div>
            {(row.lastResult || row.review.kind !== "none") && (
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <span className="flex items-center gap-2 text-muted">
                  {row.lastResult && <ResultLabel result={row.lastResult} short />}
                  {row.lastAt && (
                    <span>{relativeDate(localDate(new Date(row.lastAt)), today)}</span>
                  )}
                </span>
                <ReviewText info={row.review} />
              </div>
            )}
          </div>
          <StarToggle
            starred={row.state?.starred ?? false}
            onToggle={() => toggleStar(row)}
            label={row.info.title}
            className="-mt-1.5 -mr-2"
          />
        </li>
      ))}
    </>
  );
}

function groupLabel(topicId: string): string {
  const t = topicById.get(topicId);
  if (!t) return "Other problems";
  return `${subjectById.get(t.subjectId)?.shortName ?? ""}: ${t.name}`;
}

function GroupCount({ rows }: { rows: ProblemRow[] }) {
  const solved = rows.filter((r) => r.state?.status === "solved").length;
  return (
    <span className="text-sm font-normal text-muted tabular-nums">
      {solved} of {rows.length} solved
    </span>
  );
}

/** Renders the first rows at once and more as the owner scrolls near the end. */
function useProgressive(total: number, resetKey: string) {
  const [count, setCount] = useState(PAGE);
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setCount(PAGE);
  }
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || count >= total || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setCount((c) => c + PAGE * 2);
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count, total]);
  return { count, sentinel, showAll: () => setCount(total) };
}

function ProblemList({
  rows,
  filters,
  set,
  today,
}: {
  rows: ProblemRow[];
  filters: ProblemFilters;
  set: (c: Partial<ProblemFilters>) => void;
  today: string;
}) {
  const isMobile = useIsMobile();
  const resetKey = JSON.stringify(filtersToQuery(filters));
  const { count, sentinel, showAll } = useProgressive(rows.length, resetKey);
  const visible = rows.slice(0, count);
  // Groups are built from every matching row (so their counts are complete); rows inside them
  // render progressively like the flat list.
  const groups = useMemo(() => {
    if (!filters.group) return null;
    let budget = count;
    return groupByTopic(rows)
      .map((g) => {
        const shownRows = g.rows.slice(0, Math.max(0, budget));
        budget -= shownRows.length;
        return { ...g, all: g.rows, rows: shownRows };
      })
      .filter((g) => g.rows.length > 0);
  }, [filters.group, rows, count]);

  const more =
    count < rows.length ? (
      <div ref={sentinel} className="flex justify-center border-t border-rule p-3">
        <Button size="sm" variant="ghost" onClick={showAll}>
          Show all {rows.length}
        </Button>
      </div>
    ) : null;

  if (isMobile) {
    return (
      <div className="overflow-hidden rounded-panel border border-rule bg-surface">
        {groups ? (
          groups.map((g) => (
            <section key={g.topicId} aria-label={groupLabel(g.topicId)}>
              <h2 className="flex items-baseline justify-between gap-2 border-t border-rule bg-surface-sunken px-4 py-2 text-sm font-semibold text-text first:border-t-0">
                {groupLabel(g.topicId)}
                <GroupCount rows={g.all} />
              </h2>
              <ul>
                <Cards rows={g.rows} today={today} />
              </ul>
            </section>
          ))
        ) : (
          <ul>
            <Cards rows={visible} today={today} />
          </ul>
        )}
        {more}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-panel border border-rule bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-base">
          <caption className="sr-only">Problems</caption>
          <thead className="bg-surface-sunken text-sm">
            <tr>
              <SortHeader
                label=""
                sortKey="status"
                filters={filters}
                set={set}
                className="w-9 pl-3"
              />
              <SortHeader label="Problem" sortKey="title" filters={filters} set={set} />
              <SortHeader label="Difficulty" sortKey="difficulty" filters={filters} set={set} />
              <th scope="col" className="px-2 py-2 text-left font-medium text-muted max-lg:hidden">
                Patterns
              </th>
              <SortHeader
                label="Last result"
                sortKey="result"
                filters={filters}
                set={set}
                className="max-lg:hidden"
              />
              <SortHeader
                label="Last tried"
                sortKey="last"
                filters={filters}
                set={set}
                className="max-xl:hidden"
              />
              <SortHeader label="Next review" sortKey="next" filters={filters} set={set} />
              <th scope="col" className="w-10 pr-3">
                <span className="sr-only">Star</span>
              </th>
            </tr>
          </thead>
          {groups ? (
            groups.map((g) => (
              <tbody key={g.topicId}>
                <tr className="border-t border-rule bg-surface-sunken/60">
                  <th scope="rowgroup" colSpan={8} className="px-4 py-2 text-left">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-text">
                        {groupLabel(g.topicId)}
                      </span>
                      <GroupCount rows={g.all} />
                    </span>
                  </th>
                </tr>
                <TableRows rows={g.rows} today={today} />
              </tbody>
            ))
          ) : (
            <tbody>
              <TableRows rows={visible} today={today} />
            </tbody>
          )}
        </table>
      </div>
      {more}
    </div>
  );
}

// ----- the page -------------------------------------------------------------------------------

export default function ProblemsPage() {
  const [filters, set] = useFilters();
  const states = useProblemStore((s) => s.states);
  const loaded = useProblemStore((s) => s.loaded);
  const profile = useProfileStore((s) => s.profile);
  const setQuickAdd = useUiStore((s) => s.setQuickAddOpen);
  const setCsvOpen = useUiStore((s) => s.setCsvImportOpen);
  const isMobile = useIsMobile();
  const today = useToday();
  const [sheetOpen, setSheetOpen] = useState(false);
  const intensity = profile?.reviewIntensity ?? "normal";
  const hidePremium = profile?.hidePremium ?? false;

  const problems = useMemo(() => allProblems(states), [states]);
  const rows = useMemo(
    () => buildRows(problems, states, intensity, today),
    [problems, states, intensity, today],
  );
  const shown = useMemo(
    () => sortRows(applyFilters(rows, filters, hidePremium), filters.sort, filters.dir),
    [rows, filters, hidePremium],
  );
  const activeCount = activeFilterCount(filters);

  const filterButton = (props: Partial<TriggerProps> & { onClick: () => void }) => (
    <Button icon={ListFilter} {...props}>
      Filters
      {activeCount > 0 && (
        <span className="rounded-full bg-accent px-1.5 text-xs text-on-accent tabular-nums">
          {activeCount}
        </span>
      )}
    </Button>
  );

  return (
    <PageFrame className="max-w-7xl">
      <PageHeader
        title="Problems"
        description="Every problem in one place, attached to the map. Open one to write code, save attempts and note what to remember."
        actions={
          <>
            <Button icon={FileUp} onClick={() => setCsvOpen(true)}>
              Import CSV
            </Button>
            <Button icon={Plus} variant="primary" onClick={() => setQuickAdd(true)}>
              Add problem
            </Button>
          </>
        }
      />
      {!loaded ? (
        <PageSkeleton />
      ) : (
        <>
          <StatsStrip rows={rows} today={today} />
          <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              />
              <Input
                type="search"
                aria-label="Search problems by title or number"
                placeholder="Search by title or number"
                value={filters.q}
                onChange={(e) => set({ q: e.target.value })}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isMobile ? (
                <>
                  {filterButton({ onClick: () => setSheetOpen(true) })}
                  <BottomSheet
                    open={sheetOpen}
                    onClose={() => setSheetOpen(false)}
                    title="Filters"
                    footer={
                      <Button variant="primary" onClick={() => setSheetOpen(false)}>
                        Show {shown.length} {shown.length === 1 ? "problem" : "problems"}
                      </Button>
                    }
                  >
                    <div className="px-4 pb-4">
                      <FilterPanel
                        filters={filters}
                        set={set}
                        rows={rows}
                        hidePremiumDefault={hidePremium}
                      />
                    </div>
                  </BottomSheet>
                </>
              ) : (
                <Popover
                  label="Filters"
                  placement="bottom-end"
                  renderTrigger={(props) => filterButton(props)}
                >
                  {() => (
                    <FilterPanel
                      filters={filters}
                      set={set}
                      rows={rows}
                      hidePremiumDefault={hidePremium}
                    />
                  )}
                </Popover>
              )}
              <Button
                icon={CalendarClock}
                aria-pressed={filters.due}
                onClick={() => set({ due: !filters.due })}
                className={cx(filters.due && "border-accent bg-accent-soft")}
              >
                Due
              </Button>
              <Button
                icon={Star}
                aria-pressed={filters.starred}
                onClick={() => set({ starred: !filters.starred })}
                className={cx(filters.starred && "border-accent bg-accent-soft")}
              >
                Starred
              </Button>
              <div className="flex items-center gap-1">
                <Select
                  aria-label="Sort by"
                  value={filters.sort}
                  onChange={(e) => set({ sort: e.target.value as SortKey })}
                  options={(Object.keys(SORT_LABEL) as SortKey[]).map((k) => ({
                    value: k,
                    label: SORT_LABEL[k],
                  }))}
                  className="w-44"
                />
                <IconButton
                  icon={filters.dir === "asc" ? ArrowUp : ArrowDown}
                  label={
                    filters.dir === "asc"
                      ? "Ascending, switch to descending"
                      : "Descending, switch to ascending"
                  }
                  variant="secondary"
                  onClick={() => set({ dir: filters.dir === "asc" ? "desc" : "asc" })}
                />
              </div>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <ActiveFilters filters={filters} set={set} />
            <div className="ml-auto flex items-center gap-4">
              <span className="text-sm text-muted tabular-nums" role="status">
                {shown.length === rows.length
                  ? `${rows.length} problems`
                  : `${shown.length} of ${rows.length} problems`}
              </span>
              <Switch
                label="Group by topic"
                checked={filters.group}
                onChange={(group) => set({ group })}
                className="items-center"
              />
            </div>
          </div>
          {shown.length === 0 ? (
            <EmptyState
              icon={X}
              title="No problems match these filters"
              actions={
                <>
                  <Button onClick={() => set({ ...DEFAULT_FILTERS })}>Clear filters</Button>
                  <Button icon={Plus} onClick={() => setQuickAdd(true)}>
                    Add problem
                  </Button>
                </>
              }
            >
              {filters.q
                ? `Nothing is called “${filters.q}”. Add it as your own problem, or try fewer words.`
                : "Try removing a filter."}
            </EmptyState>
          ) : (
            <ProblemList rows={shown} filters={filters} set={set} today={today} />
          )}
        </>
      )}
    </PageFrame>
  );
}
