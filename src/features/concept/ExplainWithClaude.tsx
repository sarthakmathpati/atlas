// "Explain with Claude" (F3, F20):
//   - for a concept with nothing written (the owner's own concepts): Claude writes a simple level,
//     interview points and questions (prompt 2); the owner keeps it in the concept's note, where
//     flashcards and explain it back use it, or discards it;
//   - for any written concept: Claude explains it another way at a chosen level (prompt 1), and the
//     owner can save that answer to the concept's notes.
// Nothing is called on load; each request starts from a button.
import { BookmarkPlus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { explainConceptPrompt, generateContentPrompt, type ExplainLevel } from "@/lib/ai/prompts";
import type { GeneratedContent } from "@/lib/ai/schemas";
import type { Concept, ConceptNote } from "@/lib/types";
import { useAIMode } from "@/stores/aiStore";
import { addSavedAnswer, deleteSavedAnswer, setGeneratedContent } from "@/stores/conceptNoteStore";
import { toast } from "@/stores/toastStore";
import { fitPrompt, gatherContext, promptEnv } from "../ai/gather";
import { AIMarkdown, AIRunView, ClaudeTag } from "../ai/parts";
import { useAIRequest } from "../ai/useAI";

const LEVEL_LABEL: Record<ExplainLevel, string> = {
  simple: "Simple",
  interview: "Interview",
  deep: "Deep",
};

/** Writes study material for a concept that has none, for the owner to keep or discard. */
export function GenerateContent({ concept }: { concept: Concept }) {
  const request = useAIRequest<GeneratedContent>();
  const { mode } = useAIMode();
  const start = () =>
    void request.start(async () =>
      fitPrompt(await gatherContext({ conceptId: concept.id }), (ctx) =>
        generateContentPrompt(promptEnv(), ctx, concept.name, concept.isPattern),
      ),
    );
  const keep = (data: GeneratedContent) => {
    setGeneratedContent(concept.id, {
      simple: data.simple,
      interview: data.interview,
      questions: data.questions,
    });
    request.reset();
    toast(`Kept in the notes of ${concept.name}. Flashcards and explain it back use it too.`);
  };

  if (request.state.phase === "idle") {
    return (
      <Button size="sm" icon={Sparkles} onClick={start}>
        Explain with Claude
      </Button>
    );
  }
  return (
    <div className="w-full space-y-3 rounded-panel border border-rule bg-surface p-4 text-left">
      <AIRunView
        request={request}
        showStream={false}
        thinkingLabel={
          mode === "copy"
            ? undefined
            : `Writing a simple level, interview points and questions for ${concept.name}…`
        }
      >
        {(state) =>
          state.data && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ClaudeTag />
                <span className="text-sm text-muted">A draft for you to check</span>
              </div>
              <AIMarkdown compact>
                {[
                  state.data.simple,
                  "",
                  ...state.data.interview.map((p) => `- ${p}`),
                  "",
                  `${state.data.questions.length} interview questions with answers.`,
                ].join("\n")}
              </AIMarkdown>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={() => keep(state.data!)}>
                  Keep it
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={RotateCcw}
                  onClick={() => void request.retry()}
                >
                  Write it again
                </Button>
                <Button size="sm" variant="ghost" icon={X} onClick={request.reset}>
                  Discard
                </Button>
              </div>
            </div>
          )
        }
      </AIRunView>
    </div>
  );
}

/** What Claude wrote for a concept without written text, kept in its note. */
export function GeneratedLevels({
  concept,
  generated,
}: {
  concept: Concept;
  generated: NonNullable<ConceptNote["generated"]>;
}) {
  const [level, setLevel] = useState<"simple" | "interview">("simple");
  const remove = () => {
    setGeneratedContent(concept.id, null);
    toast("Claude's explanation removed.", {
      action: {
        label: "Undo",
        onClick: () =>
          setGeneratedContent(concept.id, {
            simple: generated.simple,
            interview: generated.interview,
            questions: generated.questions,
          }),
      },
    });
  };
  const text =
    level === "simple"
      ? (generated.simple ?? "")
      : (generated.interview ?? []).map((p) => `- ${p}`).join("\n");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl<"simple" | "interview">
          label="Depth"
          value={level}
          onChange={setLevel}
          options={[
            { value: "simple", label: "Simple" },
            { value: "interview", label: "Interview" },
          ]}
        />
        <ClaudeTag label="Written by Claude" />
      </div>
      <AIMarkdown>{text}</AIMarkdown>
      <p className="text-sm text-muted">
        Claude wrote this from the concept's name and what it covers. Check it against a trusted
        source before relying on it.
      </p>
      <Button size="sm" variant="ghost" icon={Trash2} onClick={remove}>
        Remove Claude's explanation
      </Button>
    </div>
  );
}

/** "Explain it another way": a fresh explanation at a chosen level, to read or save. */
export function ExplainAnotherWay({
  concept,
  initialLevel,
  onClose,
}: {
  concept: Concept;
  initialLevel: ExplainLevel;
  onClose: () => void;
}) {
  const [level, setLevel] = useState<ExplainLevel>(initialLevel);
  const request = useAIRequest();
  const { mode } = useAIMode();
  const explain = () =>
    void request.start(async () =>
      fitPrompt(await gatherContext({ conceptId: concept.id }), (ctx) =>
        explainConceptPrompt(promptEnv(), ctx, concept.name, level),
      ),
    );
  const save = () => {
    const id = addSavedAnswer(concept.id, {
      question: `${concept.name}, explained at the ${LEVEL_LABEL[level].toLowerCase()} level`,
      answer: request.state.text,
      source: request.state.mode,
    });
    toast("Saved to this concept's notes.", {
      action: { label: "Undo", onClick: () => deleteSavedAnswer(concept.id, id) },
    });
    request.reset();
  };
  return (
    <section
      aria-label="Explain with Claude"
      className="space-y-3 rounded-panel border border-rule bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ClaudeTag />
        <span className="flex-1 text-base font-medium text-text">Explain it another way</span>
        <Button size="sm" variant="ghost" icon={X} onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl<ExplainLevel>
          label="Level"
          size="sm"
          value={level}
          onChange={setLevel}
          options={(["simple", "interview", "deep"] as const).map((l) => ({
            value: l,
            label: LEVEL_LABEL[l],
          }))}
        />
        <Button size="sm" variant="primary" disabled={request.busy} onClick={explain}>
          {`Explain at the ${LEVEL_LABEL[level].toLowerCase()} level`}
        </Button>
      </div>
      {mode === "copy" && request.state.phase === "idle" && (
        <p className="text-sm text-muted">
          Atlas writes the prompt for you to paste into claude.ai, then you paste the answer back.
        </p>
      )}
      <AIRunView request={request}>
        {(state) => (
          <div className="space-y-3">
            <AIMarkdown>{state.text}</AIMarkdown>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={BookmarkPlus} onClick={save}>
                Save to notes
              </Button>
              <Button size="sm" variant="ghost" icon={X} onClick={request.reset}>
                Discard
              </Button>
            </div>
          </div>
        )}
      </AIRunView>
    </section>
  );
}
