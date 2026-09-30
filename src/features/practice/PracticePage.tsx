// The practice hub (F1 route #/practice): every kind of practice in one place, each tile with a
// one-line summary of where the owner stands (drill accuracy, reviews due, the latest sprint,
// puzzles solved, mocks, designs and stories), so the next step is one tap away.
import {
  Calculator,
  DraftingCompass,
  Dumbbell,
  Layers,
  MessageSquareQuote,
  MessagesSquare,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { cx } from "@/components/ui/cx";
import { LineDrawing } from "@/components/ui/LineDrawing";
import { BEHAVIORAL_QUESTIONS } from "@/data/behavioral.seed";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import { QUANT_PUZZLES } from "@/data/quant.seed";
import { patternAccuracy, STATS_DAYS } from "@/lib/drill/drill";
import { feedbackMean, MOCK_TYPES } from "@/lib/mock/mock";
import { plural } from "@/lib/planner/reasons";
import { relativeDate } from "@/lib/problems/progress";
import { SPRINT_MODES, type SprintMode } from "@/lib/quant/mentalMath";
import { puzzleStatus } from "@/lib/quant/puzzles";
import { coverageMatrix } from "@/lib/stories/stories";
import { localDate } from "@/lib/time";
import { useToday } from "@/stores/clockStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { useDesignStore } from "@/stores/designStore";
import { useMentalMathStore } from "@/stores/mentalMathStore";
import { useMockStore } from "@/stores/mockStore";
import { useProblemStore } from "@/stores/problemStore";
import { useStoryStore } from "@/stores/storyStore";
import { useReviewQueue } from "../review/useReviewQueue";

interface HubTile {
  href: string;
  icon: LucideIcon;
  title: string;
  text: string;
  /** Where the owner stands, or null before any practice. */
  status: string | null;
  /** Shown when there is nothing yet. */
  start: string;
}

const day = (iso: string) => localDate(new Date(iso));

/** "today", "3 days ago" or "on 12 Sep", to follow a comma in a sentence. */
function when(iso: string, today: string): string {
  const r = relativeDate(day(iso), today);
  return r === "Today" || r === "Yesterday" || r.endsWith("ago") ? r.toLowerCase() : `on ${r}`;
}

function useHubTiles(): HubTile[] {
  const today = useToday();
  const checks = useConceptStateStore((s) => s.checks);
  const states = useProblemStore((s) => s.states);
  const runs = useMentalMathStore((s) => s.runs);
  const mocks = useMockStore((s) => s.sessions);
  const designs = useDesignStore((s) => s.attempts);
  const stories = useStoryStore((s) => s.stories);
  const queue = useReviewQueue();

  return useMemo(() => {
    const accuracy = patternAccuracy(Object.values(checks).flat(), today);
    const answered = accuracy.reduce((n, a) => n + a.total, 0);
    const right = accuracy.reduce((n, a) => n + a.correct, 0);

    const lastRun = Object.values(runs).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    const solvedPuzzles = QUANT_PUZZLES.filter((p) => {
      const s = puzzleStatus(states[p.id]);
      return s === "solved" || s === "mastered";
    }).length;

    const sessions = Object.values(mocks);
    const finished = sessions
      .filter((s) => s.feedback)
      .sort((a, b) => ((a.endedAt ?? "") < (b.endedAt ?? "") ? 1 : -1));
    const open = sessions.length - finished.length;
    const lastMock = finished[0];

    const practiced = new Set(
      Object.values(designs)
        .filter((d) => d.finishedAt)
        .map((d) => d.problemId),
    ).size;
    const matrix = coverageMatrix(Object.values(stories), BEHAVIORAL_QUESTIONS);

    const mockStatus = [
      lastMock
        ? `${plural(finished.length, "mock")} finished; the last (${MOCK_TYPES[lastMock.kind].short.toLowerCase()}, ${when(lastMock.endedAt ?? lastMock.startedAt, today)}) scored ${feedbackMean(lastMock.feedback!)}/5`
        : null,
      open ? `${open} in progress` : null,
    ]
      .filter(Boolean)
      .join(". ");

    return [
      {
        href: "#/drill",
        icon: Dumbbell,
        title: "Pattern drill",
        text: "Spot the technique behind short original prompts, two minutes each.",
        status: answered
          ? `${Math.round((right / answered) * 100)}% of ${plural(answered, "prompt")} recognized in ${STATS_DAYS} days.`
          : null,
        start: "Five prompts take about six minutes.",
      },
      {
        href: "#/quiz",
        icon: Layers,
        title: "Flashcards and quizzes",
        text: "Quick checks on theory from each concept's interview questions.",
        status: queue.concepts.length
          ? `${plural(queue.concepts.length, "concept")} due for review.`
          : "No concept reviews due today.",
        start: "",
      },
      {
        href: "#/mental-math",
        icon: Calculator,
        title: "Mental math",
        text: "Speed arithmetic, fractions and percentages, sequences and estimation sprints.",
        status: lastRun
          ? `Last sprint: ${lastRun.correct} of ${lastRun.total} (${(SPRINT_MODES[lastRun.mode as SprintMode]?.label ?? lastRun.mode).toLowerCase()}), ${when(lastRun.createdAt, today)}.`
          : null,
        start: "80 questions in 8 minutes, keyboard first.",
      },
      {
        href: "#/puzzles",
        icon: Puzzle,
        title: "Quant puzzles",
        text: `${QUANT_PUZZLES.length} original puzzles with checked answers and a hint ladder.`,
        status: solvedPuzzles ? `${solvedPuzzles} of ${QUANT_PUZZLES.length} solved.` : null,
        start: "Answers are checked in any equivalent form.",
      },
      {
        href: "#/mock",
        icon: MessagesSquare,
        title: "Mock interviews",
        text: "Coding, theory, design and behavioral rounds with Claude as the interviewer.",
        status: mockStatus ? `${mockStatus}.` : null,
        start: "Scored feedback at the end, and a history of your scores.",
      },
      {
        href: "#/designs",
        icon: DraftingCompass,
        title: "Design practice",
        text: `${DESIGN_PROBLEMS.length} low-level and system design prompts in a 45-minute workspace.`,
        status: practiced ? `${practiced} of ${DESIGN_PROBLEMS.length} practiced.` : null,
        start: "Type lines like “Client -> API” and get a diagram.",
      },
      {
        href: "#/stories",
        icon: MessageSquareQuote,
        title: "Stories",
        text: "STAR stories for behavioral rounds, timed practice and “Tell me about yourself”.",
        status: matrix.stories.length
          ? `${plural(matrix.stories.length, "story", "stories")}; ${matrix.covered} of ${BEHAVIORAL_QUESTIONS.length} questions covered.`
          : null,
        start: "Write a story once, then practice it in two minutes.",
      },
    ];
  }, [checks, states, runs, mocks, designs, stories, queue.concepts.length, today]);
}

export default function PracticePage() {
  const tiles = useHubTiles();
  return (
    <PageFrame>
      <PageHeader
        title="Practice"
        description="Short, focused practice that feeds your progress on the map."
      />
      {/* One tile leads (12.10.5): the drill, the quickest daily practice; the rest step back. */}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t, i) => {
          const Icon = t.icon;
          const lead = i === 0;
          return (
            <li key={t.href} className={cx(lead && "sm:col-span-2")}>
              <a
                href={t.href}
                className={cx(
                  "flex h-full gap-4 p-4 transition-colors sm:p-5",
                  lead
                    ? "rounded-focal bg-surface-raised shadow-focal hover:bg-surface"
                    : "rounded-panel bg-surface hover:bg-surface-sunken",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span
                      className={cx(
                        "font-display font-semibold text-text",
                        lead ? "text-xl" : "text-lg",
                      )}
                    >
                      {t.title}
                    </span>
                  </span>
                  <span className={cx("text-muted", lead ? "text-base" : "text-sm")}>{t.text}</span>
                  <span
                    className={cx("mt-auto pt-2 text-sm", t.status ? "text-text" : "text-muted")}
                  >
                    {t.status ?? t.start}
                  </span>
                </span>
                {lead && (
                  <LineDrawing name="trail" size={88} className="self-center max-sm:hidden" />
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </PageFrame>
  );
}
