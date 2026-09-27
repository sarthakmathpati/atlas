// The copy prompt modal (F21): the full prompt with a Copy button, Open Claude in a new tab (the
// web app only; the artifact never depends on window.open), and a box to paste Claude's reply
// back. If the clipboard is blocked, the prompt is selected with a "Press Ctrl+C" hint (2.5).
import { ArrowUpRight, Check, ClipboardPaste, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { useServicesState } from "@/app/providers/servicesContext";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Field";
import { useAIStore } from "@/stores/aiStore";

const CLAUDE_NEW_CHAT = "https://claude.ai/new";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium text-text">{title}</p>
        {children}
      </div>
    </li>
  );
}

function CopyPromptBody() {
  const copy = useAIStore((s) => s.copy);
  const services = useServicesState();
  const inFrame = services.status === "ready" && services.services.runtime.inClaudeFrame;
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const [reply, setReply] = useState("");
  if (!copy) return null;
  const { view, resolve } = copy;

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(view.prompt);
      setCopyState("copied");
    } catch {
      setCopyState("manual");
      promptRef.current?.focus();
      promptRef.current?.select();
    }
  };

  return (
    <>
      <ol className="flex flex-col gap-5 px-4 py-4 sm:px-5">
        <Step n={1} title="Copy the prompt">
          <textarea
            ref={promptRef}
            readOnly
            value={view.prompt}
            aria-label="The prompt for Claude"
            onFocus={(e) => e.currentTarget.select()}
            className="h-40 w-full resize-y rounded-control border border-rule bg-surface-sunken p-3 font-mono text-xs leading-relaxed text-text"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={copyState === "copied" ? "secondary" : "primary"}
              size="sm"
              icon={copyState === "copied" ? Check : Copy}
              onClick={() => void copyPrompt()}
            >
              {copyState === "copied" ? "Copied" : "Copy prompt"}
            </Button>
            <span className="text-sm text-muted" role="status">
              {copyState === "manual" ? "Press Ctrl+C (or long-press and Copy)." : ""}
            </span>
          </div>
        </Step>
        <Step n={2} title="Paste it into a new Claude chat">
          {inFrame ? (
            <p className="text-sm text-muted">
              Open a new chat on claude.ai in another tab, paste the prompt and send it.
            </p>
          ) : (
            <Button
              size="sm"
              icon={ArrowUpRight}
              href={CLAUDE_NEW_CHAT}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Claude
            </Button>
          )}
        </Step>
        <Step n={3} title="Paste Claude's reply here">
          <Textarea
            rows={6}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            aria-label="Claude's reply"
            placeholder={
              view.expectsJson
                ? "Paste all of Claude's reply, including the part in brackets."
                : "Paste Claude's reply."
            }
          />
          {view.expectsJson && (
            <p className="text-sm text-muted">
              Atlas reads the structured part of the reply, so paste all of it.
            </p>
          )}
        </Step>
      </ol>
      <div className="flex flex-wrap justify-end gap-2 border-t border-rule px-4 py-3 sm:px-5">
        <Button variant="ghost" onClick={() => resolve(null)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          icon={ClipboardPaste}
          disabled={reply.trim() === ""}
          onClick={() => resolve(reply)}
        >
          Use this reply
        </Button>
      </div>
    </>
  );
}

/** Rendered once in the shell; opens whenever a feature asks Claude in copy prompt mode. */
export function CopyPromptModal() {
  const copy = useAIStore((s) => s.copy);
  return (
    <Dialog
      open={copy !== null}
      onClose={() => copy?.resolve(null)}
      title={copy?.view.title ?? "Ask Claude"}
      description="Copy this prompt into Claude, then paste the reply back here."
      size="lg"
      closeOnBackdrop={false}
    >
      {/* Keyed by prompt, so each request starts with an empty reply box. */}
      {copy && <CopyPromptBody key={copy.view.prompt} />}
    </Dialog>
  );
}
