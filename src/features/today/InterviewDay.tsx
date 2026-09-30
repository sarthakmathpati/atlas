// Interview day (F31): on the interview date and the day before, Today opens this calm view
// instead of the plan: the 1-day revision sheet, the mistake checklist, "Breathe for a minute"
// and "Park a worry" with a when. Nothing new to learn. A link shows the normal plan. (No promise
// is made that writing worries down helps scores: that didn't replicate.)
import { ArrowRight, ListChecks, ScrollText, SquareParking, Wind } from "lucide-react";
import { useMemo } from "react";
import { routeHref } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { Card, CardLabel } from "@/components/ui/Card";
import { LineDrawing } from "@/components/ui/LineDrawing";
import { checklistTags, taggedAttempts } from "@/lib/mistakes/stats";
import type { InterviewDay } from "@/lib/focus/interviewDay";
import { useMistakeTagStore } from "@/stores/mistakeTagStore";
import { useProblemStore } from "@/stores/problemStore";
import { Breathing } from "../focus/Breathing";
import { ParkForm } from "../focus/Park";

function MistakeChecklist({ today }: { today: string }) {
  const problems = useProblemStore((s) => s.states);
  const tagMap = useMistakeTagStore((s) => s.tags);
  const list = useMemo(
    () => checklistTags(taggedAttempts(problems), Object.values(tagMap), today),
    [problems, tagMap, today],
  );
  return (
    <Card
      aria-labelledby="interview-checklist"
      title={
        <span id="interview-checklist" className="inline-flex items-center gap-2">
          <ListChecks size={18} aria-hidden="true" className="text-accent" />
          Your mistake checklist
        </span>
      }
    >
      {list.length === 0 ? (
        <p className="text-base text-muted">
          No mistakes are logged yet. Read each problem twice and test with a small input before you
          say you're done.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {list.map(({ tag }, i) => (
            <li key={tag.id} className="flex gap-3">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-sm font-semibold text-muted tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-base font-medium text-text">{tag.label}</p>
                {tag.howToAvoid && <p className="text-sm text-muted">{tag.howToAvoid}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function InterviewDayView({ which, today }: { which: InterviewDay; today: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-8">
      <div className="min-w-0 space-y-6">
        <Card focal aria-labelledby="interview-day" className="flex items-start gap-5">
          <LineDrawing name="flag" size={72} className="shrink-0 max-sm:hidden" />
          <div className="min-w-0 space-y-2">
            <CardLabel>{which === "today" ? "Interview day" : "The day before"}</CardLabel>
            <h2 id="interview-day" className="font-display text-2xl font-semibold text-text">
              {which === "today" ? "Your interview is today" : "Your interview is tomorrow"}
            </h2>
            <p className="max-w-[60ch] text-md text-muted">
              {which === "today"
                ? "Nothing new to learn today. Read your 1-day sheet, look over your checklist, and go in rested."
                : "Nothing new to learn today. A light read of your 1-day sheet and your checklist, then an early night."}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                variant="primary"
                icon={ScrollText}
                href={routeHref("/revision", undefined, { scope: "day" })}
                className="h-12 px-6 text-md max-sm:w-full"
              >
                Open the 1-day revision sheet
              </Button>
              <Button
                variant="ghost"
                trailingIcon={ArrowRight}
                href={routeHref("/today", undefined, { view: "plan" })}
              >
                Show today's plan
              </Button>
            </div>
          </div>
        </Card>
        <MistakeChecklist today={today} />
      </div>
      <div className="min-w-0 space-y-6">
        <Card
          aria-labelledby="interview-breathe"
          title={
            <span id="interview-breathe" className="inline-flex items-center gap-2">
              <Wind size={18} aria-hidden="true" className="text-accent" />
              Breathe for a minute
            </span>
          }
        >
          <p className="mb-3 text-base text-muted">
            Six slow breaths, about ten seconds each. Good before you start, or any time the day
            feels fast.
          </p>
          <Breathing className="flex justify-center" />
        </Card>
        <Card
          aria-labelledby="interview-park"
          title={
            <span id="interview-park" className="inline-flex items-center gap-2">
              <SquareParking size={18} aria-hidden="true" className="text-accent" />
              Park a worry
            </span>
          }
        >
          <p className="mb-3 text-base text-muted">
            Write it down with a time to think about it, then let it go for now.
          </p>
          <ParkForm
            initialWhen="tonight"
            label="What's on your mind?"
            placeholder="What if they ask about graphs?"
          />
        </Card>
      </div>
    </div>
  );
}
