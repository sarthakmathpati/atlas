// The readiness dashboard (F17, 12.10.8): the readiness ring split into subject colors with the
// projection, the summit profile beside it, subjects weakest first in their colors with emblems,
// weekly stamps, the DSA pattern field, problems solved per week and the status mix, memory
// health, the weakness report with "Add to today", and a year of activity (F29). Every number
// opens a popover with the data and the formula behind it.
import { CalendarRange, ScrollText } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { navigate } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Misc";
import { ESTIMATES } from "@/lib/constants";
import { dashboardModel, type WeaknessReport } from "@/lib/insight/dashboard";
import { bundleMinutes } from "@/lib/planner/planner";
import { problemLabel } from "@/lib/problems/catalog";
import { readinessRecord, type ConceptEval } from "@/lib/readiness/model";
import { rankReady } from "@/lib/recommend/ready";
import { useAdhdPart } from "@/stores/adhdStore";
import { useToday } from "@/stores/clockStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { useDataReady } from "@/stores/hydrate";
import { addPlanItems } from "@/stores/planStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { ShowMore } from "../adhd/ShowMore";
import { Heatmap } from "../insight/Heatmap";
import { StampRow } from "../insight/Stamp";
import { recentMondays, useStamps } from "../insight/stamps";
import { useActivityInsight, useReadiness } from "../insight/useInsight";
import { pointOf } from "../insight/useSummit";
import { SummitProfile } from "./summit";
import {
  Card,
  MemoryHealthCard,
  PatternGrid,
  ReadinessCard,
  StatusMix,
  StreakFacts,
  SubjectBars,
  WeaknessCard,
} from "./sections";

const SolvedChart = lazy(() => import("./SolvedChart"));

function added(n: number, what: string) {
  toast(n > 0 ? `Added to today's plan: ${what}.` : `${what} is already on today's plan.`, {
    action: n > 0 ? { label: "Open Today", onClick: () => navigate("/today") } : undefined,
  });
}

export default function DashboardPage() {
  const profile = useProfileStore((s) => s.profile);
  const ready = useDataReady((s) => s.ready);
  const model = useReadiness();
  const states = useConceptStateStore((s) => s.states);
  const checks = useConceptStateStore((s) => s.checks);
  const problems = useProblemStore((s) => s.states);
  const today = useToday();
  const activity = useActivityInsight();
  const mondays = useMemo(() => recentMondays(today), [today]);
  const stamps = useStamps(mondays);
  const calm = useAdhdPart("calm");
  const [more, setMore] = useState(false);

  const dash = useMemo(() => {
    if (!profile || !model) return null;
    return dashboardModel({
      profile,
      model,
      conceptStates: states,
      checks,
      problemStates: problems,
      today,
      intensity: profile.reviewIntensity,
    });
  }, [profile, model, states, checks, problems, today]);

  const budget = profile?.dailyMinutes;

  const addConcept = (e: ConceptEval) => {
    const fading = e.status === "fading";
    const n = addPlanItems(
      [
        fading
          ? {
              kind: "review-concept",
              refId: e.concept.id,
              refIds: [e.concept.id],
              title: `Review: ${e.concept.name}`,
              reason: `From the weakness report: fading, with a score of ${Math.round(e.score)}.`,
              estMinutes: bundleMinutes(1),
            }
          : {
              kind: "learn-concept",
              refId: e.concept.id,
              title: `Learn: ${e.concept.name}`,
              reason: `From the weakness report: one of your weakest must-know concepts (score ${Math.round(e.score)}).`,
              estMinutes: e.concept.estMinutes,
            },
      ],
      { budget },
    );
    added(n, e.concept.name);
  };

  const addPattern = (t: WeaknessReport["patterns"][number]) => {
    const n = addPlanItems(
      [
        {
          kind: "new-problem",
          refId: t.hardProblem.id,
          title: `New problem: ${problemLabel(t.hardProblem)}`,
          reason: `From the weakness report: no hard ${t.name} problem solved alone yet.`,
          estMinutes: ESTIMATES.newProblem.hard,
        },
      ],
      { budget },
    );
    added(n, problemLabel(t.hardProblem));
  };

  const addSubject = (subjectId: string) => {
    if (!model || !profile) return;
    const inSubject = [...model.byId.values()].filter((e) => e.concept.subjectId === subjectId);
    const fading = inSubject.filter((e) => e.status === "fading").slice(0, 3);
    if (fading.length) {
      const names = fading.map((e) => e.concept.name);
      const n = addPlanItems(
        [
          {
            kind: "review-concept",
            refId: fading.length === 1 ? fading[0]!.concept.id : undefined,
            refIds: fading.map((e) => e.concept.id),
            title: `Flashcards: ${names.join(", ")}`,
            reason: "From the weakness report: this subject hasn't been touched for a while.",
            estMinutes: bundleMinutes(fading.length),
          },
        ],
        { budget },
      );
      added(n, `a review of ${names.join(", ")}`);
      return;
    }
    const next = rankReady(
      inSubject.map((e) => e.concept),
      {
        statusOf: (id) => model.byId.get(id)?.status ?? "not_started",
        inScope: (c) => model.byId.has(c.id),
        track: profile.track,
        focusSubjects: profile.focusSubjects,
        subjectReadiness: readinessRecord(model),
        today,
        interviewDate: profile.interviewDate,
      },
    )[0];
    if (!next) {
      toast("Nothing in this subject is ready to start. Open the map to see what comes first.");
      return;
    }
    const n = addPlanItems(
      [
        {
          kind: "learn-concept",
          refId: next.id,
          title: `Learn: ${next.name}`,
          reason: "From the weakness report: a way back into a subject you haven't touched lately.",
          estMinutes: next.estMinutes,
        },
      ],
      { budget },
    );
    added(n, next.name);
  };

  const header = (
    <PageHeader
      title="Dashboard"
      description="Am I ready, and where am I weak? Open any number to see where it comes from."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button href="#/weekly" icon={CalendarRange}>
            Weekly review
          </Button>
          <Button href="#/revision" icon={ScrollText}>
            Revision sheet
          </Button>
        </div>
      }
    />
  );

  if (!ready || !dash || !model || !profile) {
    return (
      <PageFrame>
        {header}
        <div className="space-y-6" role="status" aria-label="Loading the dashboard">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      {header}
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <ReadinessCard model={model} subjects={dash.subjects} projection={dash.projection} />
          <SummitProfile
            live={pointOf(today, model)}
            today={today}
            interviewDate={profile.interviewDate}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start">
          <SubjectBars subjects={dash.subjects} />
          <div className="min-w-0 space-y-6">
            <Card
              title="Weekly stamps"
              id="stamps-heading"
              actions={<span className="text-sm text-muted">The last 12 weeks</span>}
            >
              <StampRow stamps={stamps} size={70} />
            </Card>
            <MemoryHealthCard memory={dash.memory} />
          </div>
        </div>

        {/* ADHD mode's calm screen (F32): the rest folds behind Show more. */}
        {calm && (
          <ShowMore
            open={more}
            onToggle={() => setMore((v) => !v)}
            more="patterns, charts, weak spots and the year's activity"
          />
        )}
        {(!calm || more) && (
          <>
            <PatternGrid tiles={dash.patterns} recognition={dash.recognition} />

            <div className="grid gap-6 lg:grid-cols-2">
              <Card id="solved-heading">
                <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                  <SolvedChart weeks={dash.weeks} />
                </Suspense>
              </Card>
              <StatusMix subjects={dash.subjects} />
            </div>

            <WeaknessCard
              weakness={dash.weakness}
              onAddConcept={addConcept}
              onAddPattern={addPattern}
              onAddSubject={addSubject}
            />

            <Card title="Activity this year" id="activity-heading">
              <div className="space-y-3">
                <StreakFacts streak={activity.streak} freezeOn={profile.prefs.streakFreeze} />
                <Heatmap
                  lookup={activity.lookup}
                  today={today}
                  weeks={53}
                  frozen={activity.frozen}
                />
              </div>
            </Card>
          </>
        )}
      </div>
    </PageFrame>
  );
}
