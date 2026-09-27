// A mock interview in copy prompt mode (F15): Atlas writes the whole interview as one script to
// paste into a claude.ai chat. The interview happens there; when the owner writes END, Claude
// replies with the feedback as JSON, which is pasted back here (with the final code for a coding
// round) and saved like a live mock's.
import { ArrowUpRight, Check, ClipboardPaste, Copy } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useServicesState } from "@/app/providers/servicesContext";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Misc";
import { extractJson, validateJson } from "@/lib/ai/json";
import { mockScriptPrompt } from "@/lib/ai/prompts";
import { mockFeedbackSchema } from "@/lib/ai/schemas";
import { mockBrief } from "@/lib/mock/brief";
import { MOCK_TYPES } from "@/lib/mock/mock";
import type { MockSession } from "@/lib/types";
import { completeMock } from "@/stores/mockStore";
import { toast } from "@/stores/toastStore";
import { promptEnv } from "../ai/gather";
import { briefInput, languageLabel } from "./context";

const CLAUDE_NEW_CHAT = "https://claude.ai/new";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
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

export function CopyMock({ session }: { session: MockSession }) {
  const services = useServicesState();
  const inFrame = services.status === "ready" && services.services.runtime.inClaudeFrame;
  const info = MOCK_TYPES[session.kind];
  const script = useMemo(() => {
    const input = briefInput(session);
    return mockScriptPrompt(promptEnv(), session.kind, input ? mockBrief(input) : "", info.minutes);
  }, [session, info.minutes]);
  const area = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState<"idle" | "copied" | "manual">("idle");
  const [reply, setReply] = useState("");
  const [code, setCode] = useState(session.code ?? "");
  const [problem, setProblem] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied("copied");
    } catch {
      setCopied("manual");
      area.current?.focus();
      area.current?.select();
    }
  };

  const save = () => {
    const found = extractJson(reply);
    if (!found.ok) {
      setProblem(
        "Atlas couldn't find the feedback in what you pasted. Paste all of Claude's last reply, including the part in curly brackets.",
      );
      return;
    }
    const checked = validateJson(mockFeedbackSchema, found.value);
    if (!checked.ok) {
      setProblem(
        `The feedback is missing something Atlas needs (${checked.issues.slice(0, 2).join("; ")}). Ask Claude to reply with only the JSON again, then paste it.`,
      );
      return;
    }
    setProblem(null);
    completeMock(session.id, checked.data, session.kind === "dsa" ? { code } : {});
    toast("Feedback saved.", { tone: "success" });
  };

  return (
    <section aria-label="Mock interview in a Claude chat" className="max-w-3xl space-y-5">
      <Callout tone="info" title="The interview happens in a Claude chat">
        In copy prompt mode, Atlas writes the whole {info.label.toLowerCase()} as one prompt. Run it
        in a new chat, then paste the feedback back here to keep it with your history.
      </Callout>
      <ol className="space-y-6">
        <Step n={1} title="Copy the interview script">
          <textarea
            ref={area}
            readOnly
            value={script}
            aria-label="The interview script for Claude"
            onFocus={(e) => e.currentTarget.select()}
            className="h-44 w-full resize-y rounded-control border border-rule bg-surface-sunken p-3 font-mono text-xs leading-relaxed text-text"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={copied === "copied" ? "secondary" : "primary"}
              icon={copied === "copied" ? Check : Copy}
              onClick={() => void copy()}
            >
              {copied === "copied" ? "Copied" : "Copy script"}
            </Button>
            <span className="text-sm text-muted" role="status">
              {copied === "manual" ? "Press Ctrl+C (or long-press and Copy)." : ""}
            </span>
          </div>
        </Step>
        <Step n={2} title="Do the interview in a new Claude chat">
          <p className="text-base text-muted">
            Paste the script and answer as you would in a real interview. Start each message with
            the time left, such as “[Phase: Code | 18 min left]”, and keep to {info.minutes}{" "}
            minutes. When you're done, write END.
            {session.kind === "dsa" &&
              ` Write your code in ${languageLabel(session.language)}, and paste it into the chat when you share it.`}
          </p>
          {!inFrame && (
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
        <Step n={3} title="Paste the feedback here">
          <Textarea
            rows={7}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            aria-label="Claude's feedback"
            placeholder="Paste Claude's last reply, the one with the scores in curly brackets."
          />
          {session.kind === "dsa" && (
            <div className="space-y-1.5">
              <label htmlFor="copy-mock-code" className="text-sm font-medium text-text">
                Your final code (optional)
              </label>
              <Textarea
                id="copy-mock-code"
                rows={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono text-sm"
                placeholder="Paste it to keep it as a mock attempt on the problem."
              />
            </div>
          )}
          {problem && (
            <p role="alert" className="text-sm text-danger">
              {problem}
            </p>
          )}
          <Button variant="primary" icon={ClipboardPaste} onClick={save} disabled={!reply.trim()}>
            Save the feedback
          </Button>
        </Step>
      </ol>
    </section>
  );
}
