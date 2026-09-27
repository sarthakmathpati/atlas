// Claude's critique of a story or a practice answer (prompt 13): four scores out of 5, a note on
// spoken length, a tighter version to copy, and tips. Stored critiques are validated before use.
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import type { StoryCritique } from "@/lib/ai/schemas";
import { clockText, speakingSeconds, wordCount } from "@/lib/stories/stories";
import { toast } from "@/stores/toastStore";
import { ClaudeTag } from "../ai/parts";

const SCORES: [keyof StoryCritique, string][] = [
  ["clarity", "Clarity"],
  ["specificity", "Specificity"],
  ["impact", "Impact"],
  ["structure", "Structure"],
];

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied.");
  } catch {
    toast("Couldn't copy here. Select the text and press Ctrl+C (or long-press and Copy).", {
      tone: "error",
    });
  }
}

export function CritiqueView({
  critique,
  className,
}: {
  critique: StoryCritique;
  className?: string;
}) {
  const words = wordCount(critique.tighterVersion);
  return (
    <div className={cx("space-y-3 rounded-control border border-rule px-3 py-3", className)}>
      <p className="flex items-center gap-2 text-base font-semibold text-text">
        Claude's critique <ClaudeTag />
      </p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SCORES.map(([key, label]) => (
          <div key={key} className="rounded-control bg-surface-sunken px-2.5 py-1.5">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-md font-semibold text-text tabular-nums">
              {critique[key] as number}/5
            </dd>
          </div>
        ))}
      </dl>
      {critique.lengthNote && <p className="text-base text-text">{critique.lengthNote}</p>}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted">
            A tighter version ({words} words, about {clockText(speakingSeconds(words))} spoken)
          </p>
          <Button
            size="sm"
            variant="ghost"
            icon={Copy}
            onClick={() => void copy(critique.tighterVersion)}
          >
            Copy
          </Button>
        </div>
        <p className="mt-1 max-w-[70ch] text-base whitespace-pre-wrap text-text">
          {critique.tighterVersion}
        </p>
      </div>
      {critique.tips.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted">Tips</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-text">
            {critique.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Words and speaking time at 140 words a minute ("182 words, about 1:18 spoken"). */
export function SpokenLength({ text, className }: { text: string; className?: string }) {
  const words = wordCount(text);
  return (
    <p className={cx("text-sm text-muted tabular-nums", className)} aria-live="polite">
      {words} {words === 1 ? "word" : "words"}, about {clockText(speakingSeconds(words))} spoken
    </p>
  );
}
