// Routes whose features arrive in later phases (section 13). Each page explains what it will do.
import {
  Calculator,
  Compass,
  DraftingCompass,
  Dumbbell,
  Layers,
  MessageSquareQuote,
  MessagesSquare,
  Puzzle,
} from "lucide-react";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { MOD_KEY } from "@/components/ui/platform";
import { Tile } from "@/components/ui/Progress";
import { BEHAVIORAL_QUESTIONS } from "@/data/behavioral.seed";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import { QUANT_PUZZLES } from "@/data/quant.seed";
import { syllabus } from "@/data/syllabus";
import { ComingSoon } from "./ComingSoon";

const PRACTICE = "Practice extensions";

export function PracticePage() {
  const tiles = [
    {
      href: "#/drill",
      icon: Dumbbell,
      title: "Pattern drill",
      text: "Spot the technique behind short original prompts in two minutes each.",
      when: null,
    },
    {
      href: "#/quiz",
      icon: Layers,
      title: "Flashcards and quizzes",
      text: "Quick checks on theory from each concept's interview questions.",
      when: null,
    },
    {
      href: "#/mental-math",
      icon: Calculator,
      title: "Mental math",
      text: "Speed arithmetic, fractions, sequences and estimation sprints.",
      when: "Phase 8",
    },
    {
      href: "#/puzzles",
      icon: Puzzle,
      title: "Quant puzzles",
      text: `${QUANT_PUZZLES.length} original puzzles with checked answers.`,
      when: "Phase 8",
    },
  ];
  return (
    <PageFrame>
      <PageHeader
        title="Practice"
        description="Short, focused practice that feeds your progress on the map."
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Tile
                href={t.href}
                className="h-full p-4"
                title={
                  <span className="flex items-center gap-2.5">
                    <Icon size={18} aria-hidden="true" className="text-accent" />
                    {t.title}
                  </span>
                }
                footer={
                  t.when ? (
                    <span className="text-xs text-faint">Arrives in {t.when.toLowerCase()}</span>
                  ) : (
                    <span className="text-xs text-success">Ready</span>
                  )
                }
              >
                {t.text}
              </Tile>
            </li>
          );
        })}
      </ul>
    </PageFrame>
  );
}

export function MentalMathPage() {
  return (
    <ComingSoon
      title="Mental math"
      description="Fast arithmetic for quant interviews, practiced offline."
      icon={Calculator}
      phase={8}
      phaseName={PRACTICE}
      features={[
        "Speed arithmetic: 80 questions in 8 minutes, keyboard first.",
        "Fractions and percentages, number sequences and estimation modes.",
        "A chart of your score and speed over time.",
      ]}
    />
  );
}

export function PuzzlesPage() {
  return (
    <ComingSoon
      title="Quant puzzles"
      description={`${QUANT_PUZZLES.length} original puzzles covering probability, math, logic, games and markets.`}
      icon={Puzzle}
      phase={8}
      phaseName={PRACTICE}
      features={[
        "Answers are checked automatically, including fractions and forms like 1/e.",
        "A hint ladder when you're stuck, and a short explanation after you answer.",
        "Every attempt counts toward the concepts it is linked to on the map.",
      ]}
      links={QUANT_PUZZLES.slice(0, 3).map((p) => ({ label: p.title, href: `#/problems/${p.id}` }))}
    />
  );
}

export function MockPage() {
  return (
    <ComingSoon
      title="Mock interview"
      description="Practice under interview conditions, with Claude as the interviewer."
      icon={MessagesSquare}
      phase={8}
      phaseName={PRACTICE}
      features={[
        "Coding (45 minutes), theory rapid-fire (20), design (45) and behavioral (20) rounds.",
        "A visible countdown, follow-up questions, and a phase stepper for coding rounds.",
        "Scored feedback at the end, and a history of past sessions.",
      ]}
    />
  );
}

export function StoriesPage() {
  return (
    <ComingSoon
      title="Stories"
      description="Prepared, specific stories for behavioral rounds."
      icon={MessageSquareQuote}
      phase={8}
      phaseName={PRACTICE}
      features={[
        "Write stories in the situation, task, action, result format.",
        `Link them to the ${BEHAVIORAL_QUESTIONS.length} common questions and see which have no story yet.`,
        "Timed practice answers, and a builder for “Tell me about yourself”.",
      ]}
    />
  );
}

export function DesignsPage() {
  const lld = DESIGN_PROBLEMS.filter((p) => p.source === "design-lld");
  const hld = DESIGN_PROBLEMS.filter((p) => p.source === "design-hld");
  return (
    <ComingSoon
      title="Designs"
      description={`Structured practice for design rounds: ${lld.length} low-level and ${hld.length} system design prompts.`}
      icon={DraftingCompass}
      phase={8}
      phaseName={PRACTICE}
      features={[
        "A 45-minute workspace with a section for each part of a strong answer.",
        "Type lines like “Client -> API Gateway” and get a clean architecture diagram.",
        "Claude reviews your design against each prompt's must-discuss points.",
      ]}
      links={[
        ...lld.slice(0, 2).map((p) => ({ label: p.title, href: `#/designs/${p.id}` })),
        ...hld.slice(0, 2).map((p) => ({ label: p.title, href: `#/designs/${p.id}` })),
      ]}
    />
  );
}

export function NotFoundPage() {
  return (
    <PageFrame>
      <PageHeader title="Page not found" />
      <EmptyState
        icon={Compass}
        title="This link doesn't match any page"
        actions={
          <>
            <Button href="#/today" variant="primary">
              Go to Today
            </Button>
            <Button href="#/map">Browse the syllabus</Button>
          </>
        }
      >
        It may be from an older version of Atlas. Every page is in the sidebar, and {MOD_KEY} K
        searches all {syllabus.counts.concepts} concepts.
      </EmptyState>
    </PageFrame>
  );
}
