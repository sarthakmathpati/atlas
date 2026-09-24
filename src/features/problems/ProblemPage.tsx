// A problem (F7 precursor): what the seed knows about it, with links to its patterns and to
// LeetCode. The workspace (code editor, attempts, timer) arrives with the problem tracker.
import { ArrowUpRight, Code2 } from "lucide-react";
import { useEffect } from "react";
import { conceptHref, navigate, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip, DifficultyChip, PatternChip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Misc";
import { leetCodeUrl } from "@/data/problems.seed";
import { seedProblemById } from "@/data/seed";
import { conceptById, topicById } from "@/data/syllabus";
import { NotFoundPage } from "../placeholder/pages";

export default function ProblemPage() {
  const route = useRoute();
  const problem = route.id ? seedProblemById.get(route.id) : undefined;
  const isDesign = problem?.source === "design-lld" || problem?.source === "design-hld";
  // Design prompts live on their own page.
  useEffect(() => {
    if (isDesign && problem)
      navigate(`/designs/${encodeURIComponent(problem.id)}`, { replace: true });
  }, [isDesign, problem]);
  if (!problem) return <NotFoundPage />;
  if (isDesign) return null;
  const isQuant = problem.source === "quant";
  const topic = topicById.get(problem.topicId);

  return (
    <PageFrame>
      <PageHeader
        documentTitle={problem.title}
        eyebrow={isQuant ? "Quant puzzle" : topic?.name}
        title={problem.number ? `${problem.number}. ${problem.title}` : problem.title}
        actions={
          problem.slug ? (
            <Button href={leetCodeUrl(problem.slug)} trailingIcon={ArrowUpRight} variant="primary">
              Open on LeetCode
            </Button>
          ) : undefined
        }
      />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <DifficultyChip difficulty={problem.difficulty} />
        {problem.premium && <Chip>Premium</Chip>}
        {problem.language === "sql" && <Chip>SQL</Chip>}
        {problem.conceptIds.map((id) => {
          const concept = conceptById.get(id);
          return concept ? (
            <PatternChip key={id} label={concept.name} href={conceptHref(id)} />
          ) : null;
        })}
      </div>

      <div className="max-w-3xl space-y-6">
        {isQuant && problem.prompt && (
          <section
            aria-labelledby="prompt-heading"
            className="rounded-panel border border-rule bg-surface p-4 sm:p-5"
          >
            <h2 id="prompt-heading" className="text-md font-semibold text-text">
              The puzzle
            </h2>
            <p className="mt-2 max-w-[70ch] text-md text-text">{problem.prompt}</p>
            <p className="mt-3 text-sm text-muted">
              Answer checking, hints and the explanation arrive with quant practice in phase 8.
            </p>
          </section>
        )}
        <EmptyState
          icon={Code2}
          title={
            isQuant
              ? "Tracking attempts arrives soon"
              : "The workspace arrives with the problem tracker"
          }
          actions={
            problem.slug ? (
              <Button href={leetCodeUrl(problem.slug)} trailingIcon={ArrowUpRight}>
                Solve it on LeetCode
              </Button>
            ) : undefined
          }
        >
          {isQuant
            ? "You'll save each attempt and your reasoning here, and the puzzle will come back for review before you forget it."
            : "In phase 3 you'll write your code here with a timer, save every attempt, note the one insight worth remembering, and get reminders to re-solve it."}
        </EmptyState>
      </div>
    </PageFrame>
  );
}
