// Story practice (F27): a random question (or the one the plan picked), a 2-minute timer, and an
// answer typed as you'd say it, or a story from the bank delivered as it is. Then a self-check
// (offline) and, with Claude, a critique with a tighter version (prompt 13). Saving keeps the
// answer on its story (or on "Unsorted practice") and records a check on the behavioral concepts.
import { CheckCircle2, Play, RotateCcw, Save, Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { routeHref } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Select, Textarea } from "@/components/ui/Field";
import { HorizonLine } from "@/components/ui/Horizon";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatClock, useTimer } from "@/components/ui/timer";
import { BEHAVIORAL_QUESTIONS } from "@/data/behavioral.seed";
import { storyCritiquePrompt } from "@/lib/ai/prompts";
import type { StoryCritique } from "@/lib/ai/schemas";
import { relativeDate } from "@/lib/problems/progress";
import { hashSeed } from "@/lib/random";
import {
  allPractice,
  critiqueScore,
  isIntro,
  ownStories,
  pickQuestion,
  PRACTICE_SECONDS,
  readCritique,
  SELF_CHECK,
  storiesForQuestion,
  storyText,
  UNSORTED_TITLE,
} from "@/lib/stories/stories";
import { localDate } from "@/lib/time";
import type { Story } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { savePractice } from "@/stores/storyStore";
import { toast } from "@/stores/toastStore";
import { promptEnv } from "../ai/gather";
import { AIRunView } from "../ai/parts";
import { useAIRequest } from "../ai/useAI";
import { CritiqueView, SpokenLength } from "./Critique";

type Mode = "typed" | "story";

const questionById = new Map(BEHAVIORAL_QUESTIONS.map((q) => [q.id, q]));

function Round({
  questionId,
  stories,
  initialStoryId,
  onNext,
}: {
  questionId: string;
  stories: Story[];
  initialStoryId?: string;
  onNext: (avoid: string) => void;
}) {
  const question = questionById.get(questionId)!;
  const linked = storiesForQuestion(stories, questionId);
  const mine = ownStories(stories);
  const [mode, setMode] = useState<Mode>(initialStoryId ? "story" : "typed");
  const [text, setText] = useState("");
  const [storyId, setStoryId] = useState<string>(initialStoryId ?? "");
  const [phase, setPhase] = useState<"answer" | "review" | "saved">("answer");
  const [ticked, setTicked] = useState<string[]>([]);
  const [timeUp, setTimeUp] = useState(false);
  const timer = useTimer({ countdownMs: PRACTICE_SECONDS * 1000, onFinish: () => setTimeUp(true) });
  const critic = useAIRequest<StoryCritique>();
  const [critique, setCritique] = useState<StoryCritique | null>(null);

  const story = storyId ? stories.find((s) => s.id === storyId) : undefined;
  const answer = mode === "story" ? (story ? storyText(story) : "") : text;
  const remaining = timer.remainingMs ?? 0;
  const elapsed = Math.min(PRACTICE_SECONDS, timer.elapsedMs / 1000);

  const storyOptions = useMemo(() => {
    const order = [...linked, ...mine.filter((s) => !linked.includes(s))];
    return [
      {
        value: "",
        label: mode === "story" ? "Choose a story" : "No story (save under “Unsorted practice”)",
      },
      ...order.map((s) => ({
        value: s.id,
        label: `${s.title}${linked.includes(s) ? " (linked)" : ""}${isIntro(s) ? " (your script)" : ""}`,
      })),
    ];
  }, [linked, mine, mode]);

  const finish = () => {
    timer.pause();
    setPhase("review");
  };

  const askClaude = () =>
    void critic.start(
      () => ({
        spec: storyCritiquePrompt(
          promptEnv(),
          mode === "story" && story && !isIntro(story)
            ? {
                title: story.title,
                situation: story.situation,
                task: story.task,
                action: story.action,
                result: story.result,
              }
            : { answer, title: story?.title },
          question.text,
        ),
      }),
      {
        title: `Critique of my answer to “${question.text}”`,
        onDone: (result) => {
          if (result.data) setCritique(result.data);
        },
      },
    );

  const score = critique ? critiqueScore(critique) : ticked.length / SELF_CHECK.length;

  const save = () => {
    const saved = savePractice({
      questionId,
      answer,
      storyId: storyId || undefined,
      mode,
      seconds: elapsed,
      critique: critique ?? undefined,
      score,
      selfCheck: ticked,
    });
    setPhase("saved");
    toast(`Practice saved to “${saved.title}”.`, { tone: "success" });
  };

  const canFinish = answer.trim().length > 0;
  return (
    <section
      aria-label="Practice question"
      className="space-y-4 rounded-panel bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">The question</p>
          <p className="text-xl font-semibold text-text">{question.text}</p>
        </div>
        <span
          role="timer"
          aria-label="Time left"
          className={cx(
            "flex items-center gap-2 text-lg font-semibold tabular-nums",
            timeUp ? "text-warning" : "text-text",
          )}
        >
          {formatClock(remaining)}
        </span>
      </div>
      {/* The round's horizon line (F31): 5-second steps, dotted in the last quarter. */}
      <HorizonLine
        elapsedMs={PRACTICE_SECONDS * 1000 - remaining}
        totalMs={PRACTICE_SECONDS * 1000}
        label="Time left"
      />

      {phase === "answer" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl<Mode>
              label="How you answer"
              value={mode}
              onChange={(m) => {
                setMode(m);
                if (m === "story" && !storyId && linked[0]) setStoryId(linked[0].id);
              }}
              options={[
                { value: "typed", label: "Type my answer" },
                { value: "story", label: "Deliver a story" },
              ]}
            />
            {!timer.running && remaining > 0 && (
              <Button size="sm" icon={Play} onClick={timer.start}>
                {timer.elapsedMs > 0 ? "Resume the timer" : "Start the timer"}
              </Button>
            )}
          </div>
          {mode === "typed" ? (
            <div className="space-y-1.5">
              <label htmlFor="practice-answer" className="text-sm font-medium text-text">
                Your answer, as you'd say it
              </label>
              <Textarea
                id="practice-answer"
                rows={7}
                value={text}
                onChange={(e) => {
                  if (!timer.running && timer.elapsedMs === 0) timer.start();
                  setText(e.target.value);
                }}
                placeholder="Start with the situation in a sentence, then what you did and what changed."
              />
              <SpokenLength text={text} />
            </div>
          ) : mine.length === 0 ? (
            <p className="text-base text-muted">
              You have no stories yet.{" "}
              <a
                href={routeHref("/stories", undefined, { tab: "stories" })}
                className="text-accent hover:underline"
              >
                Write one
              </a>
              , or type your answer instead.
            </p>
          ) : (
            story && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-text">
                  Say it out loud, then press I'm done
                </p>
                <p className="max-w-[70ch] rounded-control bg-surface-sunken px-3 py-2.5 text-base whitespace-pre-wrap text-text">
                  {storyText(story) || "This story is still empty."}
                </p>
                <SpokenLength text={storyText(story)} />
              </div>
            )
          )}
          {(mode === "typed" || mine.length > 0) && (
            <div className="max-w-md space-y-1.5">
              <label htmlFor="practice-story" className="text-sm font-medium text-text">
                {mode === "story" ? "The story" : "Which story is this about? (optional)"}
              </label>
              <Select
                id="practice-story"
                value={storyId}
                onChange={(e) => {
                  setStoryId(e.target.value);
                  if (mode === "story" && !timer.running && timer.elapsedMs === 0) timer.start();
                }}
                options={storyOptions}
              />
            </div>
          )}
          {timeUp && (
            <p className="text-sm text-warning" role="status">
              Two minutes are up. In an interview, wrap up with the result now.
            </p>
          )}
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" icon={Shuffle} onClick={() => onNext(questionId)}>
              Another question
            </Button>
            <Button variant="primary" icon={CheckCircle2} onClick={finish} disabled={!canFinish}>
              I'm done
            </Button>
          </div>
        </>
      )}

      {phase !== "answer" && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted">
              Your answer{story ? ` (${story.title})` : ""}
              {elapsed >= 1 ? `, in ${formatClock(elapsed * 1000)} of the two minutes` : ""}
            </p>
            <p className="mt-1 max-w-[70ch] text-base whitespace-pre-wrap text-text">{answer}</p>
            <SpokenLength text={answer} className="mt-1" />
          </div>
          {phase === "review" && (
            <fieldset className="space-y-1.5">
              <legend className="mb-1 text-sm font-medium text-text">
                Check your answer: tick what it did
              </legend>
              {SELF_CHECK.map((line) => (
                <label key={line} className="flex min-h-9 items-center gap-2.5 text-base text-text">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--accent)]"
                    checked={ticked.includes(line)}
                    onChange={(e) =>
                      setTicked((t) =>
                        e.target.checked ? [...t, line] : t.filter((x) => x !== line),
                      )
                    }
                  />
                  {line}
                </label>
              ))}
            </fieldset>
          )}
          {!critique && phase === "review" && critic.state.phase === "idle" && (
            <Button size="sm" icon={Sparkles} onClick={askClaude}>
              Critique it with Claude
            </Button>
          )}
          {!critique && (
            <AIRunView request={critic} showStream={false} thinkingLabel="Reading your answer…" />
          )}
          {critique && <CritiqueView critique={critique} />}
          {phase === "review" ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="mr-auto text-sm text-muted">
                {critique
                  ? `Counts as ${Math.round(score * 100)}% (Claude's four scores).`
                  : `Counts as ${Math.round(score * 100)}% (${ticked.length} of ${SELF_CHECK.length} ticked).`}{" "}
                It will be kept {storyId ? `with “${story?.title}”` : `under “${UNSORTED_TITLE}”`}.
              </span>
              <Button variant="ghost" onClick={() => setPhase("answer")}>
                Keep editing
              </Button>
              <Button variant="primary" icon={Save} onClick={save}>
                Save practice
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="primary" icon={RotateCcw} onClick={() => onNext(questionId)}>
                Practice another question
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function Practice({
  stories,
  questionId,
  storyId,
  onQuestion,
}: {
  stories: Story[];
  questionId: string | null;
  storyId?: string;
  onQuestion: (id: string) => void;
}) {
  const today = useToday();
  const [round, setRound] = useState(0);
  const [randomId, setRandomId] = useState(
    () => pickQuestion(BEHAVIORAL_QUESTIONS, hashSeed(`${Date.now()}`))!.id,
  );
  const current = questionId && questionById.has(questionId) ? questionId : randomId;
  const recent = allPractice(stories).slice(0, 8);

  const next = (avoid: string) => {
    const q = pickQuestion(BEHAVIORAL_QUESTIONS, hashSeed(`${Date.now()}|${round}`), avoid)!;
    setRandomId(q.id);
    setRound((r) => r + 1);
    onQuestion(q.id);
  };

  return (
    <div className="space-y-6">
      <div className="max-w-md">
        <label htmlFor="practice-question" className="text-sm font-medium text-text">
          Question
        </label>
        <Select
          id="practice-question"
          className="mt-1.5"
          value={current}
          onChange={(e) => {
            setRound((r) => r + 1);
            onQuestion(e.target.value);
          }}
          options={BEHAVIORAL_QUESTIONS.map((q) => ({ value: q.id, label: q.text }))}
        />
      </div>
      <Round
        key={`${current}|${round}`}
        questionId={current}
        stories={stories}
        initialStoryId={storyId}
        onNext={next}
      />
      {recent.length > 0 && (
        <section aria-labelledby="recent-practice" className="space-y-2">
          <h2 id="recent-practice" className="text-md font-semibold text-text">
            Recent practice
          </h2>
          <ul className="divide-y divide-rule rounded-panel bg-surface">
            {recent.map(({ story, practice }) => {
              const c = readCritique(practice.critique);
              return (
                <li key={`${story.id}|${practice.createdAt}`} className="px-3 py-2.5">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-x-3 text-base text-text">
                      <span>
                        {questionById.get(practice.questionId)?.text ?? practice.questionId}
                      </span>
                      <span className="text-sm text-muted">
                        {story.title},{" "}
                        {relativeDate(localDate(new Date(practice.createdAt)), today)}
                        {practice.score !== undefined && `, ${Math.round(practice.score * 100)}%`}
                      </span>
                    </summary>
                    <p className="mt-2 text-base whitespace-pre-wrap text-muted">
                      {practice.answer}
                    </p>
                    {c && <CritiqueView critique={c} className="mt-2" />}
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
