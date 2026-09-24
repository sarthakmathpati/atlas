// A design prompt (F26 precursor): the original prompt and the points a strong answer covers.
// The 45-minute workspace, the architecture sketch and Claude's review arrive in phase 8.
import { DraftingCompass } from "lucide-react";
import { conceptHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { DifficultyChip, PatternChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Misc";
import { seedProblemById } from "@/data/seed";
import { conceptById } from "@/data/syllabus";
import { NotFoundPage } from "../placeholder/pages";

export default function DesignPage() {
  const route = useRoute();
  const problem = route.id ? seedProblemById.get(route.id) : undefined;
  if (!problem || (problem.source !== "design-lld" && problem.source !== "design-hld")) {
    return <NotFoundPage />;
  }
  const lld = problem.source === "design-lld";
  return (
    <PageFrame>
      <PageHeader eyebrow={lld ? "Low-level design" : "System design"} title={problem.title} />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <DifficultyChip difficulty={problem.difficulty} />
        {problem.conceptIds.map((id) => {
          const c = conceptById.get(id);
          return c ? <PatternChip key={id} label={c.name} href={conceptHref(id)} /> : null;
        })}
      </div>
      <div className="max-w-3xl space-y-6">
        <section
          aria-labelledby="prompt-heading"
          className="rounded-panel border border-rule bg-surface p-4 sm:p-5"
        >
          <h2 id="prompt-heading" className="text-md font-semibold text-text">
            The prompt
          </h2>
          <p className="mt-2 max-w-[70ch] text-md text-text">{problem.prompt}</p>
        </section>
        {problem.rubric && (
          <section
            aria-labelledby="rubric-heading"
            className="rounded-panel border border-rule bg-surface p-4 sm:p-5"
          >
            <h2 id="rubric-heading" className="text-md font-semibold text-text">
              What a strong answer covers
            </h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-base text-text marker:text-muted">
              {problem.rubric.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ol>
          </section>
        )}
        <EmptyState icon={DraftingCompass} title="The design workspace arrives in phase 8">
          A 45-minute timer, a section for each part of your answer, a diagram drawn from lines like
          “Client -&gt; API Gateway”, and a review from Claude against the points above.
        </EmptyState>
      </div>
    </PageFrame>
  );
}
