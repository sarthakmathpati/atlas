// Copy prompt (BUILD_SPEC.md 10.1, F21): works everywhere and needs no setup. The provider builds
// one complete text (instructions, then the prompt or the conversation so far), hands it to the
// copy modal through `present`, and resolves with whatever the owner pastes back. Replies meant to
// be JSON are read tolerantly (the whole text, a fenced block, or the first `{` to the last `}`).
import type { AIProvider, AIRequest, AIResult, AITask, ChatTurn } from "./AIProvider";
import { failure } from "./errors";
import { parseReply } from "./json";

export interface CopyPromptView {
  task: AITask;
  /** What this prompt is for, shown as the modal's title. */
  title: string;
  prompt: string;
  expectsJson: boolean;
  signal?: AbortSignal;
}

/** Shows the copy modal; resolves with the pasted reply, or null when the owner cancels. */
export type CopyPresenter = (view: CopyPromptView) => Promise<string | null>;

export const TASK_TITLE: Record<AITask, string> = {
  explain: "An explanation",
  "generate-content": "An explanation for your concept",
  hint: "A hint",
  review: "A review of your code",
  "dry-run": "A dry run of your code",
  "explain-grade": "Feedback on your explanation",
  quiz: "A quick quiz",
  "quiz-grade": "Grading your answers",
  "drill-grade": "Feedback on your approach",
  "drill-generate": "New drill prompts",
  mock: "A mock interview",
  "mock-feedback": "Mock interview feedback",
  "design-review": "A design review",
  "story-critique": "Feedback on your story",
  "weekly-reflection": "Your weekly reflection",
  "revision-tighten": "A tighter revision sheet",
  "puzzle-grade": "Grading your answer",
  "concept-suggest": "Suggested patterns",
  "mistake-advice": "How to avoid these mistakes",
  "full-solution": "The full solution",
  chat: "Ask Claude",
  "test-connection": "A connection test",
};

function renderConversation(turns: ChatTurn[]): string {
  const cleaned = turns.filter((t) => t.content.trim() !== "");
  const last = cleaned[cleaned.length - 1];
  const earlier = last?.role === "user" ? cleaned.slice(0, -1) : cleaned;
  const parts: string[] = [];
  if (earlier.length) {
    parts.push(
      "Our conversation so far:",
      ...earlier.map((t) => `${t.role === "user" ? "Me" : "You"}: ${t.content.trim()}`),
    );
  }
  if (last?.role === "user") parts.push(`My new message:\n${last.content.trim()}`);
  return parts.join("\n\n");
}

/** The single text the owner pastes into claude.ai. */
export function copyPromptText(request: Pick<AIRequest, "instructions" | "input">): string {
  const body =
    typeof request.input === "string" ? request.input : renderConversation(request.input);
  return `${request.instructions.trim()}\n\n${body.trim()}\n`;
}

export class CopyPromptProvider implements AIProvider {
  readonly mode = "copy" as const;

  constructor(private readonly present: CopyPresenter) {}

  async ask<T>(request: AIRequest<T>): Promise<AIResult<T>> {
    if (request.signal?.aborted) return failure("cancelled", this.mode);
    let reply: string | null;
    try {
      reply = await this.present({
        task: request.task,
        title: request.title ?? TASK_TITLE[request.task],
        prompt: copyPromptText(request),
        expectsJson: Boolean(request.json),
        signal: request.signal,
      });
    } catch {
      return failure("unavailable", this.mode);
    }
    if (request.signal?.aborted || reply === null || reply.trim() === "")
      return failure("cancelled", this.mode);
    const text = reply.trim();
    request.onText?.(text);
    if (request.json) {
      const parsed = parseReply(text, request.json);
      if (!parsed.ok) return failure("invalid_json", this.mode, { partialText: text });
      return { ok: true, text, data: parsed.data, truncated: false, mode: this.mode };
    }
    return { ok: true, text, truncated: false, mode: this.mode };
  }
}
