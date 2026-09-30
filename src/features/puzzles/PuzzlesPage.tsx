// Quant puzzle library (F28): every puzzle in the quant bank (and the owner's own quant problems),
// filtered by subject or topic, difficulty, status and kind, grouped by topic. Filters live in the
// URL (#/puzzles?topic=prob&difficulty=medium). Each row opens the puzzle's page, where the
// answer is checked and attempts are saved like any problem's.
import { Puzzle, Shuffle } from "lucide-react";
import { useMemo } from "react";
import { navigate, problemHref, routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip, DifficultyChip } from "@/components/ui/Chip";
import { Select, type SelectOption } from "@/components/ui/Field";
import { EmptyState, PageSkeleton } from "@/components/ui/Misc";
import { SegmentedBar } from "@/components/ui/Progress";
import { subjectById, topicById, topics } from "@/data/syllabus";
import { allProblems, type ProblemInfo } from "@/lib/problems/catalog";
import { latestAttempt, relativeDate, reviewInfo } from "@/lib/problems/progress";
import {
  filterPuzzles,
  isOpenEnded,
  PUZZLE_SUBJECTS,
  puzzleStatus,
  type PuzzleFilters,
  type PuzzleStatus,
} from "@/lib/quant/puzzles";
import { hashSeed } from "@/lib/random";
import { localDate } from "@/lib/time";
import type { Difficulty } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { ProblemStatusGlyph, ResultLabel, ReviewText } from "../problems/parts";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "Any status" },
  { value: "todo", label: "To do" },
  { value: "attempted", label: "Attempted" },
  { value: "solved", label: "Solved" },
  { value: "mastered", label: "Mastered" },
];

const DIFFICULTY_OPTIONS: SelectOption[] = [
  { value: "", label: "Any difficulty" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const KIND_OPTIONS: SelectOption[] = [
  { value: "", label: "Any kind" },
  { value: "checked", label: "Checked answers" },
  { value: "open", label: "Open-ended" },
];

function readFilters(q: URLSearchParams): PuzzleFilters {
  const f: PuzzleFilters = {};
  const topic = q.get("topic");
  if (topic && (subjectById.has(topic) || topicById.has(topic))) f.topic = topic;
  const d = q.get("difficulty");
  if (d === "easy" || d === "medium" || d === "hard") f.difficulty = d;
  const s = q.get("status");
  if (s === "todo" || s === "attempted" || s === "solved" || s === "mastered") f.status = s;
  const k = q.get("kind");
  if (k === "checked" || k === "open") f.kind = k;
  return f;
}

function writeFilters(f: PuzzleFilters) {
  const query: Record<string, string> = {};
  if (f.topic) query.topic = f.topic;
  if (f.difficulty) query.difficulty = f.difficulty;
  if (f.status) query.status = f.status;
  if (f.kind) query.kind = f.kind;
  navigate(routeHref("/puzzles", undefined, query), { replace: true });
}

function PuzzleRow({ info }: { info: ProblemInfo }) {
  const state = useProblemStore((s) => s.states[info.id]);
  const intensity = useProfileStore((s) => s.profile?.reviewIntensity ?? "normal");
  const today = useToday();
  const last = latestAttempt(state);
  const review = state ? reviewInfo(state, info.difficulty, intensity, today) : null;
  return (
    <li className="border-b border-rule last:border-b-0">
      <a
        href={problemHref(info.id)}
        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-2.5 hover:bg-surface-sunken sm:grid-cols-[auto_minmax(0,1fr)_11rem_8rem_7rem] sm:px-4"
      >
        <ProblemStatusGlyph state={state} />
        <span className="min-w-0">
          <span className="block truncate text-base font-medium text-text">{info.title}</span>
          <span className="line-clamp-1 text-sm text-muted">{info.prompt}</span>
        </span>
        <span className="col-start-2 flex flex-wrap items-center gap-1.5 sm:col-start-auto">
          <DifficultyChip difficulty={info.difficulty} />
          {isOpenEnded(info) && <Chip>Open-ended</Chip>}
        </span>
        <span className="col-start-2 text-sm sm:col-start-auto">
          {last ? (
            <span className="flex flex-col">
              <ResultLabel result={last.result} short />
              <span className="text-xs text-muted">
                {relativeDate(localDate(new Date(last.finishedAt ?? last.startedAt)), today)}
              </span>
            </span>
          ) : (
            <span className="text-faint max-sm:hidden">Not tried</span>
          )}
        </span>
        <span className="col-start-2 text-sm sm:col-start-auto sm:text-right">
          {review && <ReviewText info={review} />}
        </span>
      </a>
    </li>
  );
}

export default function PuzzlesPage() {
  const route = useRoute();
  const states = useProblemStore((s) => s.states);
  const loaded = useProblemStore((s) => s.loaded);
  const filters = readFilters(route.query);

  const puzzles = useMemo(() => allProblems(states).filter((p) => p.source === "quant"), [states]);
  const shown = useMemo(() => filterPuzzles(puzzles, states, filters), [puzzles, states, filters]);

  const counts = useMemo(() => {
    const c: Record<PuzzleStatus, number> = { todo: 0, attempted: 0, solved: 0, mastered: 0 };
    for (const p of puzzles) c[puzzleStatus(states[p.id])]++;
    return c;
  }, [puzzles, states]);

  const topicOptions = useMemo<SelectOption[]>(() => {
    const used = new Set(puzzles.map((p) => p.topicId));
    const out: SelectOption[] = [{ value: "", label: "All topics" }];
    for (const sid of PUZZLE_SUBJECTS) {
      const subject = subjectById.get(sid);
      if (!subject) continue;
      out.push({ value: sid, label: `All of ${subject.name}`, group: subject.name });
      for (const t of topics) {
        if (t.subjectId === sid && used.has(t.id))
          out.push({ value: t.id, label: t.name, group: subject.name });
      }
    }
    return out;
  }, [puzzles]);

  const groups = useMemo(() => {
    const map = new Map<string, ProblemInfo[]>();
    for (const p of shown) {
      const key = p.topicId ?? "other";
      const list = map.get(key);
      if (list) list.push(p);
      else map.set(key, [p]);
    }
    const order = (id: string) => {
      const t = topicById.get(id);
      const s = t ? PUZZLE_SUBJECTS.indexOf(t.subjectId as (typeof PUZZLE_SUBJECTS)[number]) : 99;
      return s * 1000 + (t?.order ?? 999);
    };
    return [...map.entries()].sort((a, b) => order(a[0]) - order(b[0]));
  }, [shown]);

  const set = (patch: Partial<PuzzleFilters>) => {
    const next = { ...filters, ...patch };
    for (const k of Object.keys(next) as (keyof PuzzleFilters)[]) if (!next[k]) delete next[k];
    writeFilters(next);
  };

  const surprise = () => {
    const pool = shown.filter((p) => puzzleStatus(states[p.id]) === "todo");
    const from = pool.length ? pool : shown;
    if (!from.length) return;
    const pick = from[hashSeed(`${Date.now()}`) % from.length]!;
    navigate(problemHref(pick.id));
  };

  const solved = counts.solved + counts.mastered;
  const active = Object.keys(filters).length > 0;
  return (
    <PageFrame>
      <PageHeader
        title="Quant puzzles"
        description="Probability, math, logic, games and markets. Type your answer and Atlas checks it, accepting equivalent forms such as 2/3, 0.667, 1/e or sqrt(2)."
        actions={
          <Button icon={Shuffle} onClick={surprise} disabled={shown.length === 0}>
            Pick one for me
          </Button>
        }
      />
      {!loaded ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-6">
          <section aria-label="Progress" className="space-y-2">
            <p className="text-base text-text">
              <span className="font-semibold tabular-nums">{solved}</span> of {puzzles.length}{" "}
              solved
              {counts.attempted > 0 && (
                <span className="text-muted">, {counts.attempted} attempted</span>
              )}
            </p>
            <SegmentedBar
              noun="puzzles"
              counts={{
                strong: counts.mastered + counts.solved,
                learning: counts.attempted,
                not_started: counts.todo,
              }}
              className="max-w-md"
            />
          </section>

          <div className="flex flex-wrap items-end gap-2" role="group" aria-label="Filters">
            <Select
              aria-label="Topic"
              value={filters.topic ?? ""}
              onChange={(e) => set({ topic: e.target.value || undefined })}
              options={topicOptions}
              className="w-full sm:w-64"
            />
            <Select
              aria-label="Difficulty"
              value={filters.difficulty ?? ""}
              onChange={(e) => set({ difficulty: (e.target.value || undefined) as Difficulty })}
              options={DIFFICULTY_OPTIONS}
              className="w-[calc(50%-4px)] sm:w-40"
            />
            <Select
              aria-label="Status"
              value={filters.status ?? ""}
              onChange={(e) => set({ status: (e.target.value || undefined) as PuzzleStatus })}
              options={STATUS_OPTIONS}
              className="w-[calc(50%-4px)] sm:w-40"
            />
            <Select
              aria-label="Kind"
              value={filters.kind ?? ""}
              onChange={(e) =>
                set({ kind: (e.target.value || undefined) as PuzzleFilters["kind"] })
              }
              options={KIND_OPTIONS}
              className="w-full sm:w-44"
            />
            {active && (
              <Button variant="ghost" onClick={() => writeFilters({})}>
                Clear filters
              </Button>
            )}
          </div>

          <p className="text-sm text-muted" role="status">
            {shown.length === puzzles.length
              ? `${puzzles.length} puzzles`
              : `${shown.length} of ${puzzles.length} puzzles`}
          </p>

          {shown.length === 0 ? (
            <EmptyState
              icon={Puzzle}
              drawing="telescope"
              title="No puzzles match these filters"
              actions={<Button onClick={() => writeFilters({})}>Clear filters</Button>}
            >
              Try another topic or status.
            </EmptyState>
          ) : (
            groups.map(([topicId, list]) => {
              const t = topicById.get(topicId);
              const s = t ? subjectById.get(t.subjectId) : undefined;
              return (
                <section key={topicId} aria-label={t?.name ?? "Other puzzles"}>
                  <h2 className="mb-2 flex items-baseline gap-2 text-md font-semibold text-text">
                    {t?.name ?? "Your own puzzles"}
                    {s && <span className="text-sm font-normal text-muted">{s.shortName}</span>}
                    <span className="ml-auto text-sm font-normal text-muted tabular-nums">
                      {list.length}
                    </span>
                  </h2>
                  <ul className="overflow-hidden rounded-panel bg-surface">
                    {list.map((p) => (
                      <PuzzleRow key={p.id} info={p} />
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      )}
    </PageFrame>
  );
}
