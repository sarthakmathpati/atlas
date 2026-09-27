// Ask Claude chats (F20): one thread for the drawer and one per concept for its Ask tab. History
// stays in memory for this visit only; answers persist only when the owner saves them to a
// concept. Every send is an explicit owner action; nothing calls Claude on load.
import { nanoid } from "nanoid";
import { create } from "zustand";
import type { AIErrorCode, AIMode, ChatTurn } from "@/lib/ai/AIProvider";
import { aiErrorCopy, type AIErrorAction } from "@/lib/ai/errors";
import { chatPrompt } from "@/lib/ai/prompts";
import { askAI, currentAIMode } from "@/stores/aiStore";
import { fitPrompt, gatherContext, promptEnv, type ContextRequest } from "./gather";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  state: "thinking" | "streaming" | "done" | "stopped" | "error";
  mode?: AIMode;
  error?: { code: AIErrorCode; message: string; action: AIErrorAction };
  /** Part of the context was left out to fit. */
  trimmed?: boolean;
}

interface ChatState {
  threads: Record<string, ChatMessage[]>;
}

export const useChatStore = create<ChatState>(() => ({ threads: {} }));

const controllers = new Map<string, AbortController>();
const EMPTY: ChatMessage[] = [];

export function useThread(key: string): ChatMessage[] {
  return useChatStore((s) => s.threads[key] ?? EMPTY);
}

function setThread(key: string, change: (list: ChatMessage[]) => ChatMessage[]) {
  useChatStore.setState((s) => ({
    threads: { ...s.threads, [key]: change(s.threads[key] ?? []) },
  }));
}

function patchMessage(key: string, id: string, patch: Partial<ChatMessage>) {
  setThread(key, (list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));
}

/** The conversation Claude sees: finished turns only, ending on the new user message. */
export function turnsFor(messages: readonly ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of messages) {
    if (m.role === "user") turns.push({ role: "user", content: m.content });
    else if ((m.state === "done" || m.state === "stopped") && m.content.trim())
      turns.push({ role: "assistant", content: m.content });
  }
  return turns;
}

export function isChatBusy(key: string): boolean {
  return controllers.has(key);
}

async function run(key: string, context: ContextRequest, assistantId: string) {
  controllers.get(key)?.abort();
  const controller = new AbortController();
  controllers.set(key, controller);
  const history = (useChatStore.getState().threads[key] ?? []).filter((m) => m.id !== assistantId);
  const turns = turnsFor(history);
  try {
    const blocks = await gatherContext(context);
    const env = promptEnv();
    const { spec, trimmed } = fitPrompt(blocks, (ctx) => chatPrompt(env, ctx, turns));
    const result = await askAI(spec, {
      signal: controller.signal,
      noCache: true,
      title: "Ask Claude",
      onText: (text) =>
        patchMessage(key, assistantId, { content: text, state: "streaming", trimmed }),
    });
    if (result.ok) {
      patchMessage(key, assistantId, {
        content: result.text,
        state: "done",
        mode: result.mode,
        trimmed,
      });
    } else if (result.code === "cancelled") {
      if (result.partialText)
        patchMessage(key, assistantId, { content: result.partialText, state: "stopped" });
      // Nothing arrived: drop the empty answer, keep the question for editing or resending.
      else setThread(key, (list) => list.filter((m) => m.id !== assistantId));
    } else {
      patchMessage(key, assistantId, {
        content: result.partialText ?? "",
        state: "error",
        mode: result.mode,
        error: {
          code: result.code,
          message: result.message,
          action: aiErrorCopy(result.code, result.mode).action,
        },
      });
    }
  } catch (e) {
    console.error("Ask Claude failed", e);
    patchMessage(key, assistantId, {
      state: "error",
      error: {
        code: "invalid_request",
        message: "Atlas couldn't prepare this message. Reload the page, then try again.",
        action: "retry",
      },
    });
  } finally {
    if (controllers.get(key) === controller) controllers.delete(key);
  }
}

/** Sends a message with the given context and streams Claude's answer into the thread. */
export async function sendChat(key: string, text: string, context: ContextRequest): Promise<void> {
  const content = text.trim();
  if (!content || isChatBusy(key)) return;
  const assistantId = nanoid(8);
  setThread(key, (list) => [
    ...list,
    { id: nanoid(8), role: "user", content, state: "done" },
    {
      id: assistantId,
      role: "assistant",
      content: "",
      state: "thinking",
      mode: currentAIMode().mode,
    },
  ]);
  await run(key, context, assistantId);
}

/** Asks again for the last answer (after an error or a stop). */
export async function retryChat(key: string, context: ContextRequest): Promise<void> {
  const list = useChatStore.getState().threads[key] ?? [];
  const last = list[list.length - 1];
  if (!last || isChatBusy(key)) return;
  const assistantId = nanoid(8);
  setThread(key, (items) => [
    ...(last.role === "assistant" ? items.slice(0, -1) : items),
    {
      id: assistantId,
      role: "assistant",
      content: "",
      state: "thinking",
      mode: currentAIMode().mode,
    },
  ]);
  await run(key, context, assistantId);
}

export function stopChat(key: string): void {
  controllers.get(key)?.abort();
}

export function clearChat(key: string): void {
  stopChat(key);
  setThread(key, () => []);
}

/** The question an answer replied to (for "Save to concept"). */
export function questionBefore(messages: readonly ChatMessage[], answerId: string): string {
  const at = messages.findIndex((m) => m.id === answerId);
  for (let i = at - 1; i >= 0; i--) if (messages[i]!.role === "user") return messages[i]!.content;
  return "";
}
