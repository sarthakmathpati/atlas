// The "Tell me about yourself" builder (F27): three guided parts (present, past, why this role)
// that make one 90-second script, with its word count and speaking time at 140 words a minute
// (CLAUDE.md decision 73). The script is kept as a story linked to the question, so practice and
// the coverage matrix see it; Claude can critique it (prompt 13).
import { Mic, Sparkles } from "lucide-react";
import { routeHref } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { storyCritiquePrompt } from "@/lib/ai/prompts";
import type { StoryCritique } from "@/lib/ai/schemas";
import {
  clockText,
  INTRO_STORY_ID,
  INTRO_TARGET_SECONDS,
  introScript,
  lengthVerdict,
  readCritique,
  speakingSeconds,
  TMAY_QUESTION_ID,
  WORDS_PER_MINUTE,
  wordCount,
} from "@/lib/stories/stories";
import { introParts, saveIntro, updateStory, useStoryStore } from "@/stores/storyStore";
import { promptEnv } from "../ai/gather";
import { AIRunView } from "../ai/parts";
import { useAIRequest } from "../ai/useAI";
import { AutoField } from "../problems/workspace/fields";
import { CritiqueView } from "./Critique";

const PARTS = [
  {
    key: "present" as const,
    label: "Present: who you are now",
    hint: "Your year and degree or current role, and what you work on. Two sentences.",
    share: "about 20%",
  },
  {
    key: "past" as const,
    label: "Past: what brought you here",
    hint: "One or two highlights with a number: an internship, a project, a result.",
    share: "about 55%",
  },
  {
    key: "why" as const,
    label: "Why this role",
    hint: "What draws you to this kind of work, and what you want to do next.",
    share: "about 25%",
  },
];

const TARGET_WORDS = Math.round((INTRO_TARGET_SECONDS * WORDS_PER_MINUTE) / 60);

export function IntroBuilder() {
  const story = useStoryStore((s) => s.stories[INTRO_STORY_ID]);
  const parts = introParts(story);
  const script = introScript(parts);
  const words = wordCount(script);
  const seconds = speakingSeconds(words);
  const verdict = lengthVerdict(seconds, INTRO_TARGET_SECONDS);
  const critic = useAIRequest<StoryCritique>();
  const review = readCritique(story?.review);

  const critique = () =>
    void critic.start(
      () => ({
        spec: storyCritiquePrompt(
          promptEnv(),
          { answer: script, title: "Tell me about yourself" },
          "Tell me about yourself",
        ),
      }),
      {
        title: "Critique of my “Tell me about yourself”",
        onDone: (result) => {
          if (!result.data) return;
          updateStory(INTRO_STORY_ID, { review: result.data });
          critic.reset();
        },
      },
    );

  const verdictText =
    words === 0
      ? `Aim for about ${TARGET_WORDS} words: 90 seconds at ${WORDS_PER_MINUTE} words a minute.`
      : verdict === "right"
        ? "About right for 90 seconds."
        : verdict === "short"
          ? `Short for 90 seconds: add about ${TARGET_WORDS - words} words, such as one more highlight.`
          : `Long for 90 seconds: trim about ${words - TARGET_WORDS} words.`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
      <div className="space-y-4">
        <p className="text-base text-muted">
          Three short parts make one 90-second answer. Interviewers use it to decide what to ask
          next, so end on the thing you want them to ask about.
        </p>
        {PARTS.map((p) => (
          <div key={p.key}>
            <AutoField
              label={p.label}
              hint={`${p.hint} Aim for ${p.share} of the script: ${wordCount(parts[p.key])} words now.`}
              multiline
              rows={p.key === "past" ? 5 : 3}
              value={parts[p.key]}
              onSave={(v) =>
                saveIntro({
                  ...introParts(useStoryStore.getState().stories[INTRO_STORY_ID]),
                  [p.key]: v,
                })
              }
            />
          </div>
        ))}
      </div>
      <section aria-labelledby="intro-script" className="space-y-3">
        <h2 id="intro-script" className="text-md font-semibold text-text">
          Your script
        </h2>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-2xl font-semibold text-text tabular-nums" aria-live="polite">
            {clockText(seconds)}
          </p>
          <p className="text-base text-muted tabular-nums">
            {words} {words === 1 ? "word" : "words"} at {WORDS_PER_MINUTE} words a minute
          </p>
        </div>
        <p
          className={cx(
            "text-base",
            words > 0 && verdict === "right"
              ? "text-success"
              : words > 0
                ? "text-warning"
                : "text-muted",
          )}
        >
          {verdictText}
        </p>
        <div className="max-w-[70ch] rounded-panel bg-surface px-4 py-3 text-md whitespace-pre-wrap text-text">
          {script || <span className="text-muted">Your script appears here as you write.</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {critic.state.phase === "idle" && (
            <Button size="sm" icon={Sparkles} onClick={critique} disabled={words < 30}>
              {review ? "Critique it again" : "Critique it with Claude"}
            </Button>
          )}
          <Button
            size="sm"
            icon={Mic}
            href={routeHref("/stories", undefined, {
              tab: "practice",
              question: TMAY_QUESTION_ID,
              story: INTRO_STORY_ID,
            })}
            aria-disabled={words === 0 ? true : undefined}
          >
            Practice saying it
          </Button>
        </div>
        <AIRunView request={critic} showStream={false} thinkingLabel="Reading your script…" />
        {review && critic.state.phase === "idle" && <CritiqueView critique={review} />}
      </section>
    </div>
  );
}
