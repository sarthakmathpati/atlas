// "Suggest with Claude" on the pre-interview checklist (F8): Claude drafts a one-line "how to avoid
// it" for each of the top mistakes, from the tag, its category and where it happened. Drafts are
// only suggestions: the owner uses one with a click (with Undo), and an owner-written line is
// never replaced without that click.
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { mistakeAdvicePrompt } from "@/lib/ai/prompts";
import type { MistakeAdvice } from "@/lib/ai/schemas";
import { problemInfo } from "@/lib/problems/catalog";
import { CATEGORY_LABEL, type TagCount, type TaggedAttempt } from "@/lib/mistakes/stats";
import { updateMistakeTag } from "@/stores/mistakeTagStore";
import { useProblemStore } from "@/stores/problemStore";
import { toast } from "@/stores/toastStore";
import { promptEnv } from "../ai/gather";
import { AIRunView, ClaudeTag } from "../ai/parts";
import { useAIRequest } from "../ai/useAI";

export function MistakeAdviceButton({
  items,
  tagged,
}: {
  items: TagCount[];
  tagged: readonly TaggedAttempt[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        icon={Sparkles}
        disabled={items.length === 0}
        onClick={() => setOpen(true)}
      >
        Suggest with Claude
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="How to avoid your top mistakes"
        description="Claude drafts one line for each. Use the ones that fit, in your own words if you like."
        size="md"
      >
        {open && <AdviceBody items={items} tagged={tagged} onDone={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function AdviceBody({
  items,
  tagged,
  onDone,
}: {
  items: TagCount[];
  tagged: readonly TaggedAttempt[];
  onDone: () => void;
}) {
  const request = useAIRequest<MistakeAdvice>();
  const states = useProblemStore((s) => s.states);
  const [used, setUsed] = useState<ReadonlySet<string>>(new Set());

  const ask = () =>
    void request.start(
      () => ({
        spec: mistakeAdvicePrompt(
          promptEnv(),
          items.map((c) => ({
            label: c.tag.label,
            category: CATEGORY_LABEL[c.tag.category],
            description: c.tag.description,
            examples: [
              ...new Set(
                tagged
                  .filter((t) => t.tagId === c.tag.id)
                  .map((t) => problemInfo(t.problemId, states[t.problemId])?.title)
                  .filter((t): t is string => Boolean(t)),
              ),
            ].slice(0, 3),
          })),
        ),
      }),
      { title: "How to avoid your top mistakes" },
    );

  const norm = (s: string) => s.trim().toLowerCase();
  const use = (c: TagCount, line: string) => {
    const before = c.tag.howToAvoid;
    updateMistakeTag(c.tag.id, { howToAvoid: line });
    setUsed(new Set([...used, c.tag.id]));
    toast(`Saved for ${c.tag.label}.`, {
      action: {
        label: "Undo",
        onClick: () => {
          updateMistakeTag(c.tag.id, { howToAvoid: before ?? "" });
          setUsed((u) => new Set([...u].filter((id) => id !== c.tag.id)));
        },
      },
    });
  };

  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
      {request.state.phase === "idle" && (
        <>
          <p className="text-base text-text">
            Claude reads your top {items.length} mistakes, their categories and the problems where
            they happened, and writes a practical line for each.
          </p>
          <div className="flex justify-end">
            <Button variant="primary" icon={Sparkles} onClick={ask}>
              Suggest how to avoid them
            </Button>
          </div>
        </>
      )}
      <AIRunView request={request} showStream={false} thinkingLabel="Thinking about your mistakes…">
        {(state) => (
          <ul className="divide-y divide-rule rounded-control border border-rule">
            {items.map((c) => {
              const advice = state.data?.find((a) => norm(a.tag) === norm(c.tag.label));
              const done = used.has(c.tag.id);
              return (
                <li key={c.tag.id} className="space-y-1.5 px-3 py-2.5">
                  <p className="flex items-center gap-2 font-medium text-text">
                    {c.tag.label}
                    {advice && <ClaudeTag />}
                  </p>
                  {advice ? (
                    <>
                      <p className="text-base text-text">{advice.howToAvoid}</p>
                      {c.tag.howToAvoid && !done && (
                        <p className="text-sm text-muted">Yours now: {c.tag.howToAvoid}</p>
                      )}
                      {done ? (
                        <p className="flex items-center gap-1 text-sm text-success">
                          <Check size={14} aria-hidden="true" /> Saved
                        </p>
                      ) : (
                        <Button size="sm" onClick={() => use(c, advice.howToAvoid)}>
                          {c.tag.howToAvoid ? "Use this instead" : "Use this"}
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted">
                      Claude didn't suggest anything for this one.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AIRunView>
      {request.state.phase === "done" && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={onDone}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
