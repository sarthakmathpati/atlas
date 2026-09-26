// The Ask Claude chat (F20), shared by the drawer and the concept Ask tab: context chips the owner
// can remove before sending, streamed answers with Stop, quick actions under each answer
// (Simpler, Deeper, Give an example, Quiz me on this, Save to concept) and plain errors.
import {
  ArrowUp,
  BookmarkPlus,
  Check,
  Copy,
  Eraser,
  Lightbulb,
  ListChecks,
  RotateCcw,
  Settings,
  Square,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { routeHref } from "@/app/router";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Textarea } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Misc";
import { MultiCombobox, type ComboOption } from "@/components/ui/MultiCombobox";
import { MODE_LABEL } from "@/lib/ai/mode";
import { QUICK_ACTIONS, type QuickAction } from "@/lib/ai/prompts";
import { useAIMode } from "@/stores/aiStore";
import { addSavedAnswer, deleteSavedAnswer } from "@/stores/conceptNoteStore";
import { findConcept, useCustomConceptStore } from "@/stores/customConceptStore";
import { toast } from "@/stores/toastStore";
import { conceptOptions } from "../problems/problemUi";
import {
  clearChat,
  questionBefore,
  retryChat,
  sendChat,
  stopChat,
  useThread,
  type ChatMessage,
} from "./chatStore";
import type { ContextRequest } from "./gather";
import { AIMarkdown, ClaudeTag, Thinking } from "./parts";

export interface ChatChip {
  id: string;
  label: string;
  icon: LucideIcon;
  /** The context this chip adds. */
  context: ContextRequest;
}

export interface ChatStarter {
  label: string;
  text: string;
}

interface ChatPanelProps {
  threadKey: string;
  chips: ChatChip[];
  starters: ChatStarter[];
  /** Default concept for "Save to concept". */
  saveConceptId?: string;
  /** Fill the height of the container, with the messages scrolling (the drawer). */
  fill?: boolean;
  className?: string;
}

const ACTIONS: { key: QuickAction; label: string }[] = [
  { key: "simpler", label: "Simpler" },
  { key: "deeper", label: "Deeper" },
  { key: "example", label: "Give an example" },
  { key: "quiz", label: "Quiz me on this" },
];

function mergeContext(chips: ChatChip[]): ContextRequest {
  const out: ContextRequest = {};
  for (const c of chips) Object.assign(out, c.context);
  return out;
}

const MODE_NOTE = {
  sample: "Answers use your Claude plan.",
  api: "Answers use your API key.",
  copy: "Atlas writes the prompt; you paste Claude's reply back.",
} as const;

function SavePanel({
  message,
  messages,
  defaultConceptId,
  onDone,
}: {
  message: ChatMessage;
  messages: ChatMessage[];
  defaultConceptId?: string;
  onDone: () => void;
}) {
  const custom = useCustomConceptStore((s) => s.concepts);
  const options = useMemo<ComboOption[]>(
    () => [
      ...Object.values(custom).map((c) => ({ value: c.id, label: c.name, detail: "Your concept" })),
      ...conceptOptions(),
    ],
    [custom],
  );
  const [value, setValue] = useState<string[]>(defaultConceptId ? [defaultConceptId] : []);
  const save = () => {
    const conceptId = value[0];
    if (!conceptId) return;
    const id = addSavedAnswer(conceptId, {
      question: questionBefore(messages, message.id),
      answer: message.content,
      source: message.mode ?? "copy",
    });
    onDone();
    toast(`Saved to the notes of ${findConcept(conceptId)?.name ?? "the concept"}.`, {
      action: { label: "Undo", onClick: () => deleteSavedAnswer(conceptId, id) },
    });
  };
  return (
    <div className="mt-2 space-y-2 rounded-control border border-rule bg-surface p-3">
      <MultiCombobox
        label="Save to concept"
        options={options}
        value={value}
        onChange={setValue}
        max={1}
        placeholder="Search concepts"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" disabled={!value[0]} onClick={save}>
          Save answer
        </Button>
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  messages,
  last,
  onAction,
  onRetry,
  defaultConceptId,
}: {
  message: ChatMessage;
  messages: ChatMessage[];
  last: boolean;
  onAction: (action: QuickAction) => void;
  onRetry: () => void;
  defaultConceptId?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const finished = message.state === "done" || message.state === "stopped";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
    } catch {
      toast("Couldn't copy here. Select the text and press Ctrl+C (or long-press and Copy).", {
        tone: "error",
      });
    }
  };
  return (
    <div className="space-y-2">
      <ClaudeTag />
      {message.state === "thinking" && <Thinking mode={message.mode ?? "copy"} />}
      {message.content.trim() && <AIMarkdown compact>{message.content}</AIMarkdown>}
      {message.state === "stopped" && <p className="text-sm text-muted">Stopped.</p>}
      {message.state === "error" && message.error && (
        <Callout
          tone={message.error.code === "refused" ? "info" : "warning"}
          actions={
            <>
              {message.error.action === "settings" && (
                <Button size="sm" icon={Settings} href={`${routeHref("/settings")}#claude`}>
                  Open Settings
                </Button>
              )}
              {last && message.error.action !== "none" && (
                <Button size="sm" icon={RotateCcw} onClick={onRetry}>
                  Try again
                </Button>
              )}
            </>
          }
        >
          {message.error.message}
        </Callout>
      )}
      {finished && (
        <div className="flex flex-wrap items-center gap-1">
          {last &&
            ACTIONS.map((a) => (
              <Button
                key={a.key}
                size="sm"
                variant="ghost"
                icon={a.key === "quiz" ? ListChecks : a.key === "example" ? Lightbulb : undefined}
                onClick={() => onAction(a.key)}
                className="text-muted"
              >
                {a.label}
              </Button>
            ))}
          <Button
            size="sm"
            variant="ghost"
            icon={BookmarkPlus}
            aria-expanded={saving}
            onClick={() => setSaving((v) => !v)}
            className="text-muted"
          >
            Save to concept
          </Button>
          <IconButton
            size="sm"
            icon={copied ? Check : Copy}
            label={copied ? "Copied" : "Copy answer"}
            onClick={() => void copy()}
          />
          {last && message.state === "stopped" && (
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}
      {saving && (
        <SavePanel
          message={message}
          messages={messages}
          defaultConceptId={defaultConceptId}
          onDone={() => setSaving(false)}
        />
      )}
    </div>
  );
}

export function ChatPanel({
  threadKey,
  chips,
  starters,
  saveConceptId,
  fill,
  className,
}: ChatPanelProps) {
  const messages = useThread(threadKey);
  const { mode } = useAIMode();
  const [draft, setDraft] = useState("");
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const active = chips.filter((c) => !removed.has(c.id));
  const context = mergeContext(active);
  const lastMessage = messages[messages.length - 1];
  const busy = lastMessage?.state === "thinking" || lastMessage?.state === "streaming";

  // Keep the newest text in view while it streams (only when already near the bottom).
  const lastLength = lastMessage?.content.length ?? 0;
  useEffect(() => {
    const el = listRef.current;
    if (!el || !fill) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastLength, fill]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    setDraft("");
    void sendChat(threadKey, text, context);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(draft);
    }
  };

  const conceptForSave =
    saveConceptId ?? active.map((c) => c.context.conceptId).find((id) => id !== undefined);

  return (
    <div className={cx("flex flex-col", fill && "h-full min-h-0", className)}>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 pb-3">
        <span className="mr-1 text-sm text-muted">Claude sees</span>
        {active.map((c) => {
          const Icon = c.icon;
          return (
            <span
              key={c.id}
              className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-rule bg-surface-sunken pr-1 pl-2.5 text-sm text-text max-md:h-9"
            >
              <Icon size={14} aria-hidden="true" className="shrink-0 text-muted" />
              <span className="max-w-[16rem] truncate">{c.label}</span>
              <button
                type="button"
                onClick={() => setRemoved(new Set([...removed, c.id]))}
                aria-label={`Leave out ${c.label}`}
                className="grid size-5 place-items-center rounded-full text-muted hover:bg-surface hover:text-text max-md:size-7"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <span className="inline-flex h-7 items-center rounded-full border border-dashed border-rule px-2.5 text-sm text-muted max-md:h-9">
          Your progress
        </span>
        {removed.size > 0 && (
          <button
            type="button"
            onClick={() => setRemoved(new Set())}
            className="text-sm text-accent hover:underline"
          >
            Add back
          </button>
        )}
        {messages.length > 0 && (
          <IconButton
            size="sm"
            icon={Eraser}
            label="Clear this conversation"
            onClick={() => clearChat(threadKey)}
            className="ml-auto"
          />
        )}
      </div>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with Claude"
        className={cx("space-y-5", fill && "min-h-0 flex-1 overflow-y-auto pr-1")}
      >
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-base text-muted">
              Ask anything about what's on screen. Claude already knows the context above and how
              you're doing.
            </p>
            <div className="flex flex-wrap gap-2">
              {starters.map((s) => (
                <Button key={s.label} size="sm" onClick={() => send(s.text)}>
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={m.id}
                className="ml-auto w-fit max-w-[85%] rounded-panel bg-surface-sunken px-3 py-2 text-base whitespace-pre-wrap text-text"
              >
                {m.content}
              </div>
            ) : (
              <AssistantMessage
                key={m.id}
                message={m}
                messages={messages}
                last={i === messages.length - 1}
                defaultConceptId={conceptForSave}
                onAction={(action) => send(QUICK_ACTIONS[action])}
                onRetry={() => void retryChat(threadKey, context)}
              />
            ),
          )
        )}
      </div>

      <div className="shrink-0 pt-4">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Message to Claude"
            placeholder="Ask Claude…"
            className="min-h-11 flex-1 resize-none"
          />
          {busy ? (
            <IconButton
              icon={Square}
              label="Stop"
              variant="secondary"
              onClick={() => stopChat(threadKey)}
              className="size-11"
            />
          ) : (
            <IconButton
              icon={ArrowUp}
              label="Send"
              variant="primary"
              disabled={draft.trim() === ""}
              onClick={() => send(draft)}
              className="size-11"
            />
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {MODE_LABEL[mode]}. {MODE_NOTE[mode]} Enter sends, Shift+Enter adds a line.
        </p>
      </div>
    </div>
  );
}
