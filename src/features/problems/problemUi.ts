// Labels and helpers shared by the problem screens (kept apart from components so fast refresh
// works).
import { CircleCheck, CircleX, Eye, LifeBuoy, type LucideIcon } from "lucide-react";
import { problemHref, routeHref } from "@/app/router";
import type { ComboOption } from "@/components/ui/MultiCombobox";
import { conceptById, concepts, topicById } from "@/data/syllabus";
import { isDesignProblem, type ProblemInfo } from "@/lib/problems/catalog";
import type { AttemptResult, ProblemState, Status } from "@/lib/types";

export type ProblemStatusKey = ProblemState["status"] | "mastered";

export const PROBLEM_STATUS_LABEL: Record<ProblemStatusKey, string> = {
  todo: "To do",
  attempted: "Attempted",
  solved: "Solved",
  mastered: "Mastered",
};

/** Problem statuses reuse the concept glyph shapes: ring, half, disc. */
export const PROBLEM_GLYPH: Record<ProblemStatusKey, Status> = {
  todo: "not_started",
  attempted: "learning",
  solved: "strong",
  mastered: "strong",
};

export function problemStatusKey(state: ProblemState | undefined): ProblemStatusKey {
  if (!state) return "todo";
  if (state.srs.retired) return "mastered";
  return state.status;
}

export const RESULT_ICON: Record<AttemptResult, LucideIcon> = {
  solved_alone: CircleCheck,
  solved_with_hints: LifeBuoy,
  saw_solution: Eye,
  not_solved: CircleX,
};

export const RESULT_TONE: Record<AttemptResult, string> = {
  solved_alone: "text-success",
  solved_with_hints: "text-warning",
  saw_solution: "text-muted",
  not_solved: "text-danger",
};

/** Where a problem opens: design prompts have their own page. */
export function problemPageHref(info: Pick<ProblemInfo, "id" | "source">): string {
  return isDesignProblem(info) ? routeHref("/designs", info.id) : problemHref(info.id);
}

let conceptOptionsCache: ComboOption[] | null = null;

/** Concept options for pickers: patterns first, each with its topic as a second line. */
export function conceptOptions(): ComboOption[] {
  conceptOptionsCache ??= [...concepts]
    .sort((a, b) => Number(b.isPattern) - Number(a.isPattern))
    .map((c) => ({
      value: c.id,
      label: c.name,
      detail: `${topicById.get(c.topicId)?.name ?? ""}${c.isPattern ? ", pattern" : ""}`,
      keywords: `${c.id} ${c.scope}`,
    }));
  return conceptOptionsCache;
}

export function conceptName(id: string): string {
  return conceptById.get(id)?.name ?? id;
}
