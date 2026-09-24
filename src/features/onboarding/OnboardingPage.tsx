// Welcome (F5): a short, skippable wizard on first run, re-runnable from Settings.
//   1. Name and target track   2. Interview date and main language   3. Daily time and balance
//   4. What you already know: per subject "Haven't started", "Some" or "Comfortable", with its
//      topics to tick. Nothing turns strong from this: comfortable topics get quick reviews,
//      spread over the coming days (at most 15 a day).
//   5. How to use Claude in this runtime   6. Importing problems tracked elsewhere.
// Answers are saved when the owner finishes; skipping keeps the defaults.
import { ArrowLeft, ArrowRight, Check, FileUp } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useServicesState } from "@/app/providers/servicesContext";
import { navigate } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Field, Input, Slider } from "@/components/ui/Field";
import { PageSkeleton } from "@/components/ui/Misc";
import { ProgressBar } from "@/components/ui/Progress";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SubjectIcon } from "@/components/ui/SubjectIcon";
import { subjects, topicsBySubject } from "@/data/syllabus";
import { inScope, inTrack } from "@/lib/concepts/scope";
import {
  assessmentFromStates,
  planSelfAssessment,
  type AssessLevel,
  type SelfAssessment,
} from "@/lib/onboarding/selfAssess";
import { formatMinutes, localDate } from "@/lib/time";
import type { AIMode, PrimaryLanguage, Profile, Track } from "@/lib/types";
import { applyConceptStates, useConceptStateStore } from "@/stores/conceptStateStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";

const STEPS = [
  "About you",
  "Your interview",
  "Your time",
  "What you know",
  "Claude",
  "Your problems",
];
const DAILY = [15, 30, 60, 90, 120];
const LANGUAGES: { value: PrimaryLanguage; label: string }[] = [
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "python", label: "Python" },
];

interface Draft {
  name: string;
  track: Track;
  interviewDate: string;
  primaryLanguage: PrimaryLanguage;
  addCpp: boolean;
  dailyMinutes: number;
  problems: number;
  ai: AIMode;
  assessment: SelfAssessment;
}

function Choice({
  selected,
  onClick,
  title,
  detail,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  detail: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex w-full flex-col items-start gap-1 rounded-panel border p-3 text-left transition-colors disabled:opacity-55",
        selected
          ? "border-accent bg-accent-soft"
          : "border-rule bg-surface hover:border-rule-strong",
      )}
    >
      <span className="flex w-full items-center justify-between gap-2 font-medium text-text">
        {title}
        {selected && <Check size={16} aria-hidden="true" className="text-accent" />}
      </span>
      <span className="text-sm text-muted">{detail}</span>
    </button>
  );
}

function StepFrame({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="step-title" className="space-y-5">
      <div>
        <h2 id="step-title" className="text-xl font-semibold text-text">
          {title}
        </h2>
        <p className="mt-1 max-w-[62ch] text-base text-muted">{intro}</p>
      </div>
      {children}
    </section>
  );
}

function SubjectAssessment({
  subjectId,
  value,
  onChange,
}: {
  subjectId: string;
  value: { level: AssessLevel; topics: string[] };
  onChange: (v: { level: AssessLevel; topics: string[] }) => void;
}) {
  const subject = subjects.find((s) => s.id === subjectId)!;
  const topicList = topicsBySubject.get(subjectId) ?? [];
  const ticked = new Set(value.topics);
  return (
    <li className="border-t border-rule px-3 py-3 first:border-t-0 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="text-muted">
            <SubjectIcon name={subject.icon} size={17} />
          </span>
          <span className="font-medium text-text">{subject.name}</span>
        </span>
        <SegmentedControl<AssessLevel>
          label={`How well you know ${subject.name}`}
          size="sm"
          value={value.level}
          onChange={(level) => onChange({ level, topics: level === "none" ? [] : value.topics })}
          options={[
            { value: "none", label: "Haven't started" },
            { value: "some", label: "Some" },
            { value: "comfortable", label: "Comfortable" },
          ]}
        />
      </div>
      {value.level !== "none" && (
        <fieldset className="mt-3 rounded-control border border-rule bg-surface-sunken/50 p-3">
          <legend className="sr-only">Topics you know in {subject.name}</legend>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              Tick the topics you know{value.level === "comfortable" ? " well" : " a little"}.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onChange({ ...value, topics: topicList.map((t) => t.id) })}
              >
                Tick all
              </Button>
              {value.topics.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange({ ...value, topics: [] })}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {topicList.map((t) => (
              <label
                key={t.id}
                className="flex min-h-9 cursor-pointer items-center gap-2 text-base text-text max-md:min-h-11"
              >
                <input
                  type="checkbox"
                  className="size-4 shrink-0 accent-[var(--accent)]"
                  checked={ticked.has(t.id)}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      topics: e.target.checked
                        ? [...value.topics, t.id]
                        : value.topics.filter((x) => x !== t.id),
                    })
                  }
                />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </li>
  );
}

function Wizard({ profile }: { profile: Profile }) {
  const services = useServicesState();
  const states = useConceptStateStore((s) => s.states);
  const update = useProfileStore((s) => s.update);
  const setCsvImportOpen = useUiStore((s) => s.setCsvImportOpen);
  const hasSample = services.status === "ready" && Boolean(services.services.runtime.sample);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => ({
    name: profile.name,
    track: profile.track,
    interviewDate: profile.interviewDate ?? "",
    primaryLanguage: profile.primaryLanguage,
    addCpp: profile.prefs.extraLanguages.includes("cpp"),
    dailyMinutes: profile.dailyMinutes,
    problems: profile.balance.problems,
    ai:
      profile.ai.mode === "sample" && !hasSample
        ? "copy"
        : profile.ai.mode === "api"
          ? "copy"
          : profile.ai.mode,
    assessment: assessmentFromStates(useConceptStateStore.getState().states),
  }));
  const set = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }));

  const trackSubjects = useMemo(
    () => subjects.filter((s) => inTrack(s.mapTracks, draft.track)),
    [draft.track],
  );

  const finish = () => {
    const withoutCpp = profile.prefs.extraLanguages.filter((l) => l !== "cpp");
    const extraLanguages = (
      draft.addCpp && draft.primaryLanguage !== "cpp" ? [...withoutCpp, "cpp" as const] : withoutCpp
    ).filter((l) => l !== draft.primaryLanguage);
    const next: Partial<Profile> = {
      name: draft.name.trim(),
      track: draft.track,
      interviewDate: draft.interviewDate || undefined,
      primaryLanguage: draft.primaryLanguage,
      dailyMinutes: draft.dailyMinutes,
      balance: { problems: draft.problems, theory: 100 - draft.problems },
      ai: { ...profile.ai, mode: draft.ai },
      onboardingDone: true,
      prefs: { ...profile.prefs, extraLanguages },
    };
    update(next);
    // Only subjects on the chosen track are asked about; keep the others as they were.
    const assessment: SelfAssessment = { ...assessmentFromStates(states), ...draft.assessment };
    const scopeProfile = { primaryLanguage: draft.primaryLanguage, prefs: { extraLanguages } };
    const plan = planSelfAssessment(assessment, states, {
      today: localDate(),
      inScope: (c) =>
        inScope(c, {
          track: draft.track,
          profile: scopeProfile,
          isHidden: (id) => Boolean(states[id]?.hidden),
        }),
    });
    applyConceptStates(plan.changed);
    navigate("/today", { replace: true });
    toast(
      plan.learning > 0
        ? `You're set up. ${plan.learning} concepts start as learning${
            plan.scheduled
              ? `; ${plan.scheduled} quick ${plan.scheduled === 1 ? "review" : "reviews"} over the next ${plan.days === 1 ? "day" : `${plan.days} days`} will check them`
              : ""
          }.`
        : "You're set up. Everything on the map starts as not started, ready when you are.",
    );
  };

  const skip = () => {
    update({ onboardingDone: true });
    navigate("/today", { replace: true });
    toast("Setup skipped. You can run it again from Settings → Profile.");
  };

  const last = step === STEPS.length - 1;
  const tickedTopics = Object.values(draft.assessment).reduce(
    (n, a) => n + (a.level === "none" ? 0 : a.topics.length),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </span>
          <button type="button" onClick={skip} className="text-accent hover:underline">
            Skip for now
          </button>
        </div>
        <ProgressBar
          value={(step + 1) / STEPS.length}
          label={`Step ${step + 1} of ${STEPS.length}`}
        />
      </div>

      {step === 0 && (
        <StepFrame
          title="About you"
          intro="Your name greets you on Today. Your track filters the map and shapes your plan."
        >
          <Field label="Your name" className="max-w-sm">
            <Input
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              autoComplete="given-name"
              maxLength={60}
              data-autofocus
            />
          </Field>
          <div role="radiogroup" aria-label="Target track" className="grid gap-3 sm:grid-cols-3">
            <Choice
              selected={draft.track === "sde"}
              onClick={() => set({ track: "sde" })}
              title="SDE"
              detail="Software engineering roles: DSA, system design, OOP, OS, networks, databases."
            />
            <Choice
              selected={draft.track === "quant"}
              onClick={() => set({ track: "quant" })}
              title="Quant"
              detail="Trading and research roles: probability, math, puzzles, markets, plus DSA."
            />
            <Choice
              selected={draft.track === "both"}
              onClick={() => set({ track: "both" })}
              title="Both"
              detail="Keep every door open. The whole map counts."
            />
          </div>
        </StepFrame>
      )}

      {step === 1 && (
        <StepFrame
          title="Your interview"
          intro="With a date, Atlas counts down and shifts toward revision in the last two weeks."
        >
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Interview date">
              <Input
                type="date"
                value={draft.interviewDate}
                onChange={(e) => set({ interviewDate: e.target.value })}
                className="w-48"
              />
            </Field>
            <Button
              variant={draft.interviewDate ? "secondary" : "primary"}
              onClick={() => set({ interviewDate: "" })}
              aria-pressed={!draft.interviewDate}
            >
              No date yet
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Main language</span>
            <SegmentedControl<PrimaryLanguage>
              label="Main language"
              value={draft.primaryLanguage}
              onChange={(primaryLanguage) => set({ primaryLanguage })}
              options={LANGUAGES}
            />
            <p className="text-sm text-muted">
              The editor starts in it, and its language topics count toward readiness.
            </p>
          </div>
          {draft.track !== "sde" && draft.primaryLanguage !== "cpp" && (
            <label className="flex max-w-[62ch] cursor-pointer items-start gap-3 rounded-panel border border-rule bg-surface p-3">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                checked={draft.addCpp}
                onChange={(e) => set({ addCpp: e.target.checked })}
              />
              <span>
                <span className="block font-medium text-text">Count C++ too</span>
                <span className="block text-sm text-muted">
                  Many trading firms use C++, so it's worth learning even if you code in another
                  language.
                </span>
              </span>
            </label>
          )}
        </StepFrame>
      )}

      {step === 2 && (
        <StepFrame
          title="Your time"
          intro="How long you can study on a normal day, and how to split new learning between problems and theory."
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Daily time</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Daily time">
              {DAILY.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={draft.dailyMinutes === m}
                  onClick={() => set({ dailyMinutes: m })}
                  className={cx(
                    "h-10 rounded-control border px-4 text-base font-medium transition-colors max-md:h-11",
                    draft.dailyMinutes === m
                      ? "border-accent bg-accent-soft text-text"
                      : "border-rule bg-surface text-muted hover:text-text",
                  )}
                >
                  {formatMinutes(m)}
                </button>
              ))}
              <Input
                type="number"
                min={10}
                max={600}
                step={5}
                aria-label="Other daily time in minutes"
                placeholder="Other"
                value={DAILY.includes(draft.dailyMinutes) ? "" : draft.dailyMinutes}
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value));
                  if (Number.isFinite(v) && v >= 10 && v <= 600) set({ dailyMinutes: v });
                }}
                className="w-28"
              />
            </div>
          </div>
          <Slider
            label="Problems and theory"
            value={draft.problems}
            min={0}
            max={100}
            step={10}
            onChange={(problems) => set({ problems })}
            format={(v) => `${v}% problems, ${100 - v}% theory`}
            className="max-w-md"
          />
        </StepFrame>
      )}

      {step === 3 && (
        <StepFrame
          title="What you already know"
          intro="So the map doesn't start as a sea of grey. Topics you know a little start as learning. Topics you're comfortable with get quick reviews over the coming days, so nothing turns green until a check confirms it."
        >
          <ul className="overflow-hidden rounded-panel border border-rule bg-surface">
            {trackSubjects.map((s) => (
              <SubjectAssessment
                key={s.id}
                subjectId={s.id}
                value={draft.assessment[s.id] ?? { level: "none", topics: [] }}
                onChange={(v) => set({ assessment: { ...draft.assessment, [s.id]: v } })}
              />
            ))}
          </ul>
          <p className="text-sm text-muted" role="status">
            {tickedTopics === 0
              ? "Nothing ticked yet. That's fine: start from scratch."
              : `${tickedTopics} ${tickedTopics === 1 ? "topic" : "topics"} ticked.`}
          </p>
        </StepFrame>
      )}

      {step === 4 && (
        <StepFrame
          title="Claude"
          intro="Atlas can ask Claude to explain, hint, review your code and quiz you. The Claude features arrive in phase 6; choose how they'll reach Claude here."
        >
          <div role="radiogroup" aria-label="How Atlas uses Claude" className="grid gap-3">
            <Choice
              selected={draft.ai === "sample"}
              disabled={!hasSample}
              onClick={() => set({ ai: "sample" })}
              title="Built-in Claude"
              detail={
                hasSample
                  ? "Answers use your own Claude plan, right inside Atlas. No key needed."
                  : "Available when Atlas runs as a published Claude artifact."
              }
            />
            <Choice
              selected={draft.ai === "copy"}
              onClick={() => set({ ai: "copy" })}
              title="Copy prompt"
              detail="Atlas writes a complete prompt for you to paste into claude.ai. Works everywhere, free."
            />
          </div>
          <p className="text-sm text-muted">
            Using your own API key is an option in Settings once the Claude features arrive.
          </p>
        </StepFrame>
      )}

      {step === 5 && (
        <StepFrame
          title="Your problems"
          intro="Already tracking solved problems in a spreadsheet? Bring them in, with dates and results, so reviews start from where you are."
        >
          <div className="flex flex-wrap gap-2">
            <Button icon={FileUp} onClick={() => setCsvImportOpen(true)}>
              Import from CSV
            </Button>
          </div>
          <p className="text-sm text-muted">
            You can also do this later from Problems, or skip it and start fresh.
          </p>
        </StepFrame>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-rule pt-4">
        <Button
          variant="ghost"
          icon={ArrowLeft}
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          Back
        </Button>
        {last ? (
          <Button variant="primary" icon={Check} onClick={finish}>
            Finish
          </Button>
        ) : (
          <Button variant="primary" trailingIcon={ArrowRight} onClick={() => setStep(step + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const profile = useProfileStore((s) => s.profile);
  return (
    <PageFrame className="max-w-3xl">
      <PageHeader
        title={profile?.onboardingDone ? "Set up Atlas again" : "Welcome to Atlas"}
        description="A few questions so the map, your plan and your reviews fit you. About two minutes; everything can be changed later in Settings."
      />
      {profile ? <Wizard profile={profile} /> : <PageSkeleton />}
    </PageFrame>
  );
}
