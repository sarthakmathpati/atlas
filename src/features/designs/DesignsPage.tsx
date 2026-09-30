// Design practice (F26): every low-level and system design prompt with its status (not started,
// in progress, done) and last score. Each opens the 45-minute workspace.
import { DraftingCompass } from "lucide-react";
import { useMemo } from "react";
import { navigate, routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { DifficultyChip } from "@/components/ui/Chip";
import { PageSkeleton } from "@/components/ui/Misc";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import { summarizeDesign, type DesignSummary } from "@/lib/designs/designs";
import { relativeDate } from "@/lib/problems/progress";
import { localDate } from "@/lib/time";
import type { SeedProblem, Status } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { attemptsForProblem, useDesignStore } from "@/stores/designStore";

type Filter = "all" | "lld" | "hld";

const GLYPH: Record<DesignSummary["status"], Status> = {
  not_started: "not_started",
  in_progress: "learning",
  done: "strong",
};
const STATUS_TEXT: Record<DesignSummary["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};

function Row({ problem, summary }: { problem: SeedProblem; summary: DesignSummary }) {
  const today = useToday();
  return (
    <li className="border-b border-rule last:border-b-0">
      <a
        href={routeHref("/designs", problem.id)}
        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-2.5 hover:bg-surface-sunken sm:grid-cols-[auto_minmax(0,1fr)_6.5rem_8rem_8rem] sm:px-4"
      >
        <StatusGlyph status={GLYPH[summary.status]} title={STATUS_TEXT[summary.status]} />
        <span className="min-w-0">
          <span className="block truncate text-base font-medium text-text">{problem.title}</span>
          <span className="line-clamp-1 text-sm text-muted">{problem.prompt}</span>
        </span>
        <span className="col-start-2 sm:col-start-auto">
          <DifficultyChip difficulty={problem.difficulty} />
        </span>
        <span className="col-start-2 text-sm text-muted sm:col-start-auto">
          {summary.status === "in_progress"
            ? "In progress"
            : summary.lastFinished
              ? relativeDate(localDate(new Date(summary.lastFinished)), today)
              : "Not started"}
        </span>
        <span className="col-start-2 text-sm sm:col-start-auto sm:text-right">
          {summary.lastScore !== undefined ? (
            <span className="font-medium text-text tabular-nums">
              {summary.lastScore}/5{" "}
              <span className="font-normal text-muted">
                {summary.lastScoreBy === "claude" ? "Claude" : "self"}
              </span>
            </span>
          ) : (
            <span className="text-faint max-sm:hidden">No score yet</span>
          )}
        </span>
      </a>
    </li>
  );
}

export default function DesignsPage() {
  const route = useRoute();
  const filter = (
    ["lld", "hld"].includes(route.query.get("kind") ?? "") ? route.query.get("kind") : "all"
  ) as Filter;
  const loaded = useDesignStore((s) => s.loaded);
  const attempts = useDesignStore((s) => s.attempts);
  const summaries = useMemo(
    () =>
      new Map(
        DESIGN_PROBLEMS.map((p) => [
          p.id,
          summarizeDesign(attemptsForProblem(attempts, p.id).filter((a) => a.mode !== "mock")),
        ]),
      ),
    [attempts],
  );
  const groups = (
    [
      ["lld", "Low-level design", DESIGN_PROBLEMS.filter((p) => p.source === "design-lld")],
      ["hld", "System design", DESIGN_PROBLEMS.filter((p) => p.source === "design-hld")],
    ] as const
  ).filter(([k]) => filter === "all" || filter === k);
  const done = [...summaries.values()].filter((s) => s.status === "done").length;
  const inProgress = [...summaries.values()].filter((s) => s.status === "in_progress").length;

  return (
    <PageFrame>
      <PageHeader
        title="Designs"
        description="45-minute practice for design rounds: a section for each part of a strong answer, a sketch drawn from lines like “Client -> API Gateway”, and a review against each prompt's must-discuss points."
      />
      {!loaded ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base text-text" role="status">
              <span className="font-semibold tabular-nums">{done}</span> of {DESIGN_PROBLEMS.length}{" "}
              done
              {inProgress > 0 && <span className="text-muted">, {inProgress} in progress</span>}
            </p>
            <SegmentedControl<Filter>
              label="Kind of design"
              value={filter}
              onChange={(k) =>
                navigate(routeHref("/designs", undefined, k === "all" ? {} : { kind: k }), {
                  replace: true,
                })
              }
              options={[
                { value: "all", label: "All" },
                { value: "lld", label: "Low-level" },
                { value: "hld", label: "System design" },
              ]}
            />
          </div>
          {groups.map(([key, title, list]) => (
            <section key={key} aria-label={title}>
              <h2 className="mb-2 flex items-center gap-2 text-md font-semibold text-text">
                <DraftingCompass size={16} aria-hidden="true" className="text-accent" />
                {title}
                <span className="ml-auto text-sm font-normal text-muted tabular-nums">
                  {list.length}
                </span>
              </h2>
              <ul className="overflow-hidden rounded-panel bg-surface">
                {list.map((p) => (
                  <Row key={p.id} problem={p} summary={summaries.get(p.id)!} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
