// A story in the bank (F27): title, the four STAR parts (autosaved), tags, the questions it
// answers (linked both ways: the coverage matrix and the practice picker read the same links),
// Claude's critique of the story, and the practice done with it.
import { Mic, Sparkles, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { navigate, routeHref } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { MultiCombobox, type ComboOption } from "@/components/ui/MultiCombobox";
import { BEHAVIORAL_QUESTIONS, STORY_TAGS } from "@/data/behavioral.seed";
import { storyCritiquePrompt } from "@/lib/ai/prompts";
import type { StoryCritique } from "@/lib/ai/schemas";
import { relativeDate } from "@/lib/problems/progress";
import { readCritique, storyText, suggestedQuestions } from "@/lib/stories/stories";
import { localDate } from "@/lib/time";
import type { Story } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { deleteStory, restoreStory, updateStory } from "@/stores/storyStore";
import { toast } from "@/stores/toastStore";
import { promptEnv } from "../ai/gather";
import { AIRunView } from "../ai/parts";
import { useAIRequest } from "../ai/useAI";
import { AutoField } from "../problems/workspace/fields";
import { CritiqueView, SpokenLength } from "./Critique";

const QUESTION_OPTIONS: ComboOption[] = BEHAVIORAL_QUESTIONS.map((q) => ({
  value: q.id,
  label: q.text,
  keywords: q.suggestedTags.join(" "),
}));

const questionText = (id: string) => BEHAVIORAL_QUESTIONS.find((q) => q.id === id)?.text ?? id;

const PARTS: { key: "situation" | "task" | "action" | "result"; label: string; hint: string }[] = [
  {
    key: "situation",
    label: "Situation",
    hint: "Where and when, in a sentence or two. Only what the listener needs.",
  },
  { key: "task", label: "Task", hint: "What you were responsible for, and why it was hard." },
  {
    key: "action",
    label: "Action",
    hint: "What you did, step by step. Say “I”, not “we”. This is most of the story.",
  },
  {
    key: "result",
    label: "Result",
    hint: "What changed, with a number if you can, and what you learned.",
  },
];

export function StoryEditor({ story }: { story: Story }) {
  const today = useToday();
  const critic = useAIRequest<StoryCritique>();
  const review = readCritique(story.review);
  const suggested = useMemo(() => suggestedQuestions(story, BEHAVIORAL_QUESTIONS), [story]);
  const tagOptions = useMemo<ComboOption[]>(() => {
    const all = new Set<string>([...STORY_TAGS, ...story.tags]);
    return [...all].map((t) => ({ value: t, label: t.replace(/-/g, " ") }));
  }, [story.tags]);
  const text = storyText(story);

  const critique = () =>
    void critic.start(
      () => ({
        spec: storyCritiquePrompt(
          promptEnv(),
          {
            title: story.title,
            situation: story.situation,
            task: story.task,
            action: story.action,
            result: story.result,
          },
          story.questionIds[0] ? questionText(story.questionIds[0]) : undefined,
        ),
      }),
      {
        title: `Critique of the story “${story.title}”`,
        onDone: (result) => {
          if (!result.data) return;
          updateStory(story.id, { review: result.data });
          critic.reset();
        },
      },
    );

  const remove = () => {
    const removed = deleteStory(story.id);
    navigate(routeHref("/stories"), { replace: true });
    toast("Story deleted.", {
      action: removed ? { label: "Undo", onClick: () => restoreStory(removed) } : undefined,
    });
  };

  const practice = [...(story.practice ?? [])].reverse();
  return (
    <article aria-label={`Story: ${story.title}`} className="space-y-6">
      <AutoField
        label="Title"
        value={story.title}
        onSave={(v) => updateStory(story.id, { title: v.trim() || "Untitled story" })}
        placeholder="A short name you'll recognise, such as “Payments outage at my internship”"
        inputClassName="h-11 text-md font-medium"
      />
      <div className="space-y-4">
        {PARTS.map((p) => (
          <AutoField
            key={p.key}
            label={p.label}
            hint={p.hint}
            multiline
            rows={p.key === "action" ? 5 : 3}
            value={story[p.key]}
            onSave={(v) => updateStory(story.id, { [p.key]: v })}
          />
        ))}
        <SpokenLength text={text} />
      </div>

      <MultiCombobox
        label="Tags"
        options={tagOptions}
        value={story.tags}
        onChange={(tags) => updateStory(story.id, { tags })}
        placeholder="Search tags, such as conflict or ownership"
        onCreate={(label) => {
          const tag = label.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
          if (tag && !story.tags.includes(tag))
            updateStory(story.id, { tags: [...story.tags, tag] });
        }}
        createLabel={(t) => `Add the tag “${t}”`}
      />

      <div className="space-y-2">
        <MultiCombobox
          label="Questions it answers"
          options={QUESTION_OPTIONS}
          value={story.questionIds}
          onChange={(questionIds) => updateStory(story.id, { questionIds })}
          placeholder="Search the 30 common questions"
        />
        {suggested.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-muted">Suggested for its tags:</span>
            {suggested.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => updateStory(story.id, { questionIds: [...story.questionIds, q.id] })}
                className="inline-flex h-7 items-center rounded-full border border-dashed border-rule-strong px-2.5 text-sm text-text hover:border-accent hover:text-accent max-md:h-9"
              >
                + {q.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <section aria-label="Critique" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {critic.state.phase === "idle" && (
            <Button size="sm" icon={Sparkles} onClick={critique} disabled={text.trim().length < 20}>
              {review ? "Critique it again" : "Critique this story with Claude"}
            </Button>
          )}
          <Button
            size="sm"
            icon={Mic}
            href={routeHref("/stories", undefined, {
              tab: "practice",
              ...(story.questionIds[0] ? { question: story.questionIds[0] } : {}),
              story: story.id,
            })}
          >
            Practice it
          </Button>
        </div>
        <AIRunView request={critic} showStream={false} thinkingLabel="Reading your story…" />
        {review && critic.state.phase === "idle" && <CritiqueView critique={review} />}
      </section>

      {practice.length > 0 && (
        <section aria-labelledby={`practice-${story.id}`} className="space-y-2">
          <h3 id={`practice-${story.id}`} className="text-md font-semibold text-text">
            Practice with this story
          </h3>
          <ul className="divide-y divide-rule rounded-control border border-rule">
            {practice.map((p) => {
              const c = readCritique(p.critique);
              return (
                <li key={p.createdAt} className="px-3 py-2">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-x-3 text-base text-text">
                      <span>{questionText(p.questionId)}</span>
                      <span className="text-sm text-muted">
                        {relativeDate(localDate(new Date(p.createdAt)), today)}
                        {p.score !== undefined && `, ${Math.round(p.score * 100)}%`}
                      </span>
                    </summary>
                    <p className="mt-2 text-base whitespace-pre-wrap text-muted">{p.answer}</p>
                    {c && <CritiqueView critique={c} className="mt-2" />}
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="border-t border-rule pt-4">
        <Button size="sm" variant="ghost" icon={Trash2} onClick={remove} className="text-danger">
          Delete story
        </Button>
      </div>
    </article>
  );
}
