// Mock interviews (F15): start a coding (45 minutes), theory rapid-fire (20), design (45) or
// behavioral (20) round, continue one in progress, and look back at past sessions with their
// feedback and score trends. Atlas picks what the round is about unless the owner chooses. With
// Claude connected the interview runs here; in copy prompt mode Atlas writes a script for a
// claude.ai chat and a form for the feedback.
import { History, MessagesSquare, Play, Shuffle, Trash2 } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { navigate, routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Select } from "@/components/ui/Field";
import { Callout, EmptyState, PageSkeleton, Skeleton } from "@/components/ui/Misc";
import { MultiCombobox, type ComboOption } from "@/components/ui/MultiCombobox";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Tabs } from "@/components/ui/Tabs";
import { BEHAVIORAL_QUESTIONS } from "@/data/behavioral.seed";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import { LEETCODE_PROBLEMS } from "@/data/problems.seed";
import { conceptById, subjectById } from "@/data/syllabus";
import { allProblems, problemInfo, problemLabel } from "@/lib/problems/catalog";
import {
  feedbackMean,
  HIRE_LABEL,
  MOCK_KIND_ORDER,
  MOCK_TYPES,
  scoreTrend,
  type MockKind,
} from "@/lib/mock/mock";
import {
  pickBehavioralQuestions,
  pickMockProblem,
  pickTheorySubjects,
  THEORY_SUBJECTS,
} from "@/lib/mock/pick";
import { relativeDate } from "@/lib/problems/progress";
import { localDate } from "@/lib/time";
import type { MockSession } from "@/lib/types";
import { useAIMode } from "@/stores/aiStore";
import { useToday } from "@/stores/clockStore";
import { attemptsForProblem, useDesignStore } from "@/stores/designStore";
import { createMock, deleteMock, restoreMock, useMockStore } from "@/stores/mockStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { useReadiness } from "../insight/useInsight";
import { languageLabel, questionText } from "./context";

const MockHistoryChart = lazy(() => import("./MockHistoryChart"));

type Tab = "new" | "history";

const PROBLEM_OPTIONS: ComboOption[] = LEETCODE_PROBLEMS.filter((p) => p.language !== "sql").map(
  (p) => ({
    value: p.id,
    label: problemLabel(p),
    detail: p.conceptIds.map((c) => conceptById.get(c)?.name ?? c).join(", "),
    keywords: String(p.number ?? ""),
  }),
);

const SUBJECT_OPTIONS: ComboOption[] = THEORY_SUBJECTS.map((id) => ({
  value: id,
  label: subjectById.get(id)?.name ?? id,
}));

function isKind(v: string | null): v is MockKind {
  return v !== null && (MOCK_KIND_ORDER as readonly string[]).includes(v);
}

function Setup() {
  const route = useRoute();
  const kind: MockKind = isKind(route.query.get("type"))
    ? (route.query.get("type") as MockKind)
    : "dsa";
  const setKind = (k: MockKind) =>
    navigate(routeHref("/mock", undefined, { type: k }), { replace: true });
  const profile = useProfileStore((s) => s.profile);
  const states = useProblemStore((s) => s.states);
  const designs = useDesignStore((s) => s.attempts);
  const model = useReadiness();
  const ai = useAIMode();
  const [seed, setSeed] = useState(() => Date.now());
  const [problemChoice, setProblemChoice] = useState<"auto" | "pick">("auto");
  const [problemId, setProblemId] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[] | null>(null);
  const [designId, setDesignId] = useState<string | null>(null);

  const autoProblem = useMemo(() => {
    if (!model || !profile) return null;
    const patterns = [...model.byId.values()]
      .filter((e) => e.concept.isPattern)
      .map((e) => ({
        id: e.concept.id,
        status: e.status,
        practice: e.result?.practice ?? 0,
        order: e.concept.order,
      }));
    return pickMockProblem({
      patterns,
      problems: allProblems(states),
      states,
      hidePremium: profile.hidePremium,
      seed: `${localDate()}|${seed}`,
    });
  }, [model, profile, states, seed]);

  const autoSubjects = useMemo(
    () =>
      model && profile
        ? pickTheorySubjects({ readiness: model.subjects, focus: profile.focusSubjects })
        : ["os", "cn"],
    [model, profile],
  );
  const chosenSubjects = subjects ?? autoSubjects;

  const autoDesign = useMemo(() => {
    const hld = profile?.track !== "quant";
    const pool = DESIGN_PROBLEMS.filter((p) =>
      hld ? p.source === "design-hld" : p.source === "design-lld",
    );
    return (
      pool.find((p) => attemptsForProblem(designs, p.id).every((a) => !a.finishedAt)) ?? pool[0]!
    ).id;
  }, [designs, profile?.track]);
  const chosenDesign = designId ?? autoDesign;

  const questions = useMemo(() => pickBehavioralQuestions(BEHAVIORAL_QUESTIONS, seed), [seed]);

  const delivery = ai.mode === "copy" ? "copy" : "live";
  const chosenProblem = problemChoice === "pick" ? problemId[0] : autoProblem?.problemId;
  const canStart =
    kind === "dsa" ? Boolean(chosenProblem) : kind === "theory" ? chosenSubjects.length > 0 : true;

  const start = () => {
    if (!canStart || !profile) return;
    const session = createMock({
      kind,
      delivery,
      ...(kind === "dsa"
        ? { topicOrProblemId: chosenProblem!, language: profile.primaryLanguage }
        : kind === "theory"
          ? { subjects: chosenSubjects }
          : kind === "design"
            ? { topicOrProblemId: chosenDesign }
            : { questionIds: questions }),
    });
    navigate(routeHref("/mock", session.id));
  };

  const info = MOCK_TYPES[kind];
  const autoPattern = autoProblem ? conceptById.get(autoProblem.patternId)?.name : null;
  return (
    <section aria-labelledby="mock-setup" className="space-y-5 rounded-panel bg-surface p-4 sm:p-5">
      <h2 id="mock-setup" className="flex items-center gap-2 text-md font-semibold text-text">
        <MessagesSquare size={18} aria-hidden="true" className="text-accent" />
        Start a mock interview
      </h2>
      <div role="radiogroup" aria-label="Kind of interview" className="grid gap-2 sm:grid-cols-2">
        {MOCK_KIND_ORDER.map((k) => {
          const t = MOCK_TYPES[k];
          const checked = k === kind;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => setKind(k)}
              className={cx(
                "flex flex-col items-start gap-1 rounded-panel border px-3 py-2.5 text-left transition-colors",
                checked
                  ? "border-accent bg-accent-soft"
                  : "border-rule bg-surface hover:border-rule-strong hover:bg-surface-sunken",
              )}
            >
              <span className="font-medium text-text">
                {t.label} <span className="font-normal text-muted">({t.minutes} min)</span>
              </span>
              <span className="text-sm text-muted">{t.description}</span>
            </button>
          );
        })}
      </div>

      {kind === "dsa" && (
        <div className="space-y-3">
          <SegmentedControl<"auto" | "pick">
            label="Which problem"
            value={problemChoice}
            onChange={setProblemChoice}
            options={[
              { value: "auto", label: "Pick one for me" },
              { value: "pick", label: "Choose a problem" },
            ]}
          />
          {problemChoice === "auto" ? (
            <p className="flex flex-wrap items-center gap-2 text-base text-muted">
              {autoProblem
                ? `An unsolved problem on your weakest pattern under way${autoPattern ? `: ${autoPattern}` : ""}. The interviewer states it in their own words, so you won't see its name until the end.`
                : "Atlas couldn't find an unsolved problem to pick. Choose one instead."}
              {autoProblem && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Shuffle}
                  onClick={() => setSeed(Date.now())}
                >
                  Another one
                </Button>
              )}
            </p>
          ) : (
            <MultiCombobox
              label="Problem"
              options={PROBLEM_OPTIONS}
              value={problemId}
              onChange={setProblemId}
              max={1}
              placeholder="Search by name or number"
            />
          )}
          <p className="text-sm text-muted">
            You code in {languageLabel(profile?.primaryLanguage)} (change it in Settings).
          </p>
        </div>
      )}
      {kind === "theory" && (
        <MultiCombobox
          label="Subjects (up to 3)"
          options={SUBJECT_OPTIONS}
          value={chosenSubjects}
          onChange={setSubjects}
          max={3}
          placeholder="Search subjects"
        />
      )}
      {kind === "design" && (
        <div className="max-w-md space-y-1.5">
          <label htmlFor="mock-design" className="text-sm font-medium text-text">
            Design prompt
          </label>
          <Select
            id="mock-design"
            value={chosenDesign}
            onChange={(e) => setDesignId(e.target.value)}
            options={DESIGN_PROBLEMS.map((p) => ({
              value: p.id,
              label: p.title,
              group: p.source === "design-lld" ? "Low-level design" : "System design",
            }))}
          />
          <p className="text-sm text-muted">
            You'll write it in the design workspace while the interviewer asks questions.
          </p>
        </div>
      )}
      {kind === "behavioral" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-text">Questions</p>
          <ol className="list-decimal space-y-1 pl-5 text-base text-text marker:text-muted">
            {questions.map((q) => (
              <li key={q}>{questionText(q)}</li>
            ))}
          </ol>
          <Button size="sm" variant="ghost" icon={Shuffle} onClick={() => setSeed(Date.now())}>
            Other questions
          </Button>
        </div>
      )}

      {delivery === "copy" && (
        <Callout tone="info">
          You're in copy prompt mode, so Atlas writes the interview as one script for a claude.ai
          chat, with a form to paste the feedback back.
        </Callout>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="text-sm text-muted">
          {info.minutes} minutes, with a visible countdown.
        </span>
        <Button variant="primary" icon={Play} onClick={start} disabled={!canStart}>
          Start the interview
        </Button>
      </div>
    </section>
  );
}

function SessionRow({ session }: { session: MockSession }) {
  const today = useToday();
  const states = useProblemStore((s) => s.states);
  const info = MOCK_TYPES[session.kind];
  const about =
    session.kind === "dsa" && session.feedback && session.topicOrProblemId
      ? (() => {
          const p = problemInfo(session.topicOrProblemId, states[session.topicOrProblemId]);
          return p ? problemLabel(p) : "";
        })()
      : session.kind === "design" && session.topicOrProblemId
        ? (DESIGN_PROBLEMS.find((p) => p.id === session.topicOrProblemId)?.title ?? "")
        : session.kind === "theory"
          ? (session.subjects ?? []).map((s) => subjectById.get(s)?.shortName ?? s).join(", ")
          : "";
  return (
    <li className="flex items-center gap-2 border-b border-rule last:border-b-0">
      <a
        href={routeHref("/mock", session.id)}
        className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2.5 hover:bg-surface-sunken sm:px-4"
      >
        <span className="min-w-0">
          <span className="block truncate text-base font-medium text-text">
            {info.label}
            {about && <span className="font-normal text-muted">: {about}</span>}
          </span>
          <span className="text-sm text-muted">
            {relativeDate(localDate(new Date(session.endedAt ?? session.startedAt)), today)}
            {session.delivery === "copy" ? ", in a Claude chat" : ""}
          </span>
        </span>
        <span className="text-right text-sm">
          {session.feedback ? (
            <>
              <span className="block font-medium text-text tabular-nums">
                {feedbackMean(session.feedback)}/5
              </span>
              <span className="text-muted">{HIRE_LABEL[session.feedback.hireSignal]}</span>
            </>
          ) : (
            <span className="text-accent">Continue</span>
          )}
        </span>
      </a>
      {!session.feedback && (
        <IconButton
          icon={Trash2}
          label="Discard this interview"
          size="sm"
          className="mr-2"
          onClick={() => {
            const removed = deleteMock(session.id);
            toast("Interview discarded.", {
              action: removed ? { label: "Undo", onClick: () => restoreMock(removed) } : undefined,
            });
          }}
        />
      )}
    </li>
  );
}

function HistoryTab({ sessions }: { sessions: MockSession[] }) {
  const finished = sessions.filter((s) => s.feedback);
  const [kind, setKind] = useState<MockKind>(
    () => (finished[0]?.kind as MockKind | undefined) ?? "dsa",
  );
  if (finished.length === 0)
    return (
      <EmptyState
        icon={History}
        drawing="tent"
        title="No finished mocks yet"
        actions={<Button href="#/mock">Start a mock interview</Button>}
      >
        Each finished interview lands here with its feedback, and your scores over time.
      </EmptyState>
    );
  const kinds = MOCK_KIND_ORDER.filter((k) => finished.some((s) => s.kind === k));
  const shown = kinds.includes(kind) ? kind : kinds[0]!;
  const trend = scoreTrend(finished, shown);
  return (
    <div className="space-y-6">
      <section aria-label="Score trends" className="space-y-3 rounded-panel bg-surface p-4">
        {kinds.length > 1 ? (
          <SegmentedControl<MockKind>
            label="Kind of interview"
            size="sm"
            value={shown}
            onChange={setKind}
            options={kinds.map((k) => ({ value: k, label: MOCK_TYPES[k].short }))}
          />
        ) : (
          <h2 className="text-md font-semibold text-text">{MOCK_TYPES[shown].label}</h2>
        )}
        {trend.length >= 2 ? (
          <Suspense fallback={<Skeleton className="h-60 w-full" />}>
            <MockHistoryChart sessions={finished} kind={shown} label={MOCK_TYPES[shown].short} />
          </Suspense>
        ) : (
          <p className="text-sm text-muted">
            The trend starts with your second finished mock of this kind.
          </p>
        )}
      </section>
      <ul className="overflow-hidden rounded-panel bg-surface" aria-label="Past interviews">
        {finished.map((s) => (
          <SessionRow key={s.id} session={s} />
        ))}
      </ul>
    </div>
  );
}

export default function MockPage() {
  const route = useRoute();
  const loaded = useMockStore((s) => s.loaded);
  const record = useMockStore((s) => s.sessions);
  const sessions = useMemo(
    () =>
      Object.values(record).sort((a, b) =>
        (a.endedAt ?? a.updatedAt) < (b.endedAt ?? b.updatedAt) ? 1 : -1,
      ),
    [record],
  );
  const tab: Tab = route.query.get("tab") === "history" ? "history" : "new";
  const open = sessions.filter((s) => !s.feedback);
  const finished = sessions.filter((s) => s.feedback).length;
  return (
    <PageFrame>
      <PageHeader
        title="Mock interview"
        description="Practice under interview conditions, with Claude as the interviewer: a countdown, follow-up questions, and scored feedback at the end."
      />
      {!loaded ? (
        <PageSkeleton />
      ) : (
        <Tabs<Tab>
          label="Mock interviews"
          value={tab}
          onChange={(t) =>
            navigate(routeHref("/mock", undefined, t === "history" ? { tab: t } : {}))
          }
          className="space-y-6"
          items={[
            { value: "new", label: "New interview" },
            { value: "history", label: "History", count: finished || undefined },
          ]}
        >
          {(t) =>
            t === "history" ? (
              <HistoryTab sessions={sessions} />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <Setup />
                <aside aria-label="Interviews in progress" className="space-y-2">
                  <h2 className="text-md font-semibold text-text">In progress</h2>
                  {open.length ? (
                    <ul className="overflow-hidden rounded-panel bg-surface">
                      {open.map((s) => (
                        <SessionRow key={s.id} session={s} />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">
                      Nothing in progress. An interview you leave part way is kept here, so a reload
                      or a closed tab never loses it.
                    </p>
                  )}
                </aside>
              </div>
            )
          }
        </Tabs>
      )}
    </PageFrame>
  );
}
