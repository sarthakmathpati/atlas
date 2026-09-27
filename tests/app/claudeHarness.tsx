// Runs the real app with a stand-in Claude in one of the three modes (the same harness as
// claudeModes.test.tsx): a fake `sample` capability (built-in Claude), a mocked, streamed fetch of
// the Messages API (API key), or replies pasted into the copy prompt modal (copy prompt). The
// stand-in is lib/runtime/fakeSampleDemo.ts. No network, no real key.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { expect, vi } from "vitest";
import { App } from "@/app/App";
import { createFakeClaude, createFakeSample } from "@/lib/runtime/fakeClaude";
import { demoSampleResponder } from "@/lib/runtime/fakeSampleDemo";
import type { AIMode } from "@/lib/types";
import { saveApiKey, useAIStore } from "@/stores/aiStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";

export type Global = { claude?: unknown };
export type User = ReturnType<typeof userEvent.setup>;

export async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

/** Server-sent events for one streamed reply, split into a few deltas. */
export function sse(text: string, pieces = 3): Response {
  const size = Math.max(1, Math.ceil(text.length / pieces));
  const deltas: string[] = [];
  for (let i = 0; i < text.length; i += size) deltas.push(text.slice(i, i + size));
  const events = [
    { type: "message_start", message: { id: "msg" } },
    ...deltas.map((d) => ({
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: d },
    })),
    { type: "message_delta", delta: { stop_reason: "end_turn" } },
    { type: "message_stop" },
  ];
  return new Response(
    events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(""),
    { status: 200 },
  );
}

/** The request bodies the mocked Messages API received (API key mode). */
export const apiRequests: { system: string; messages: { role: string; content: string }[] }[] = [];

export async function setupMode(mode: AIMode, extra?: (repoReady: void) => void) {
  apiRequests.length = 0;
  if (mode === "sample") {
    const sample = createFakeSample({ responder: (input) => demoSampleResponder(input) });
    (globalThis as Global).claude = createFakeClaude({ sample, uid: null });
  }
  if (mode === "api") {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as {
          system: string;
          messages: { role: string; content: string }[];
        };
        apiRequests.push(body);
        return sse(
          demoSampleResponder([body.system, ...body.messages.map((m) => m.content)].join("\n\n")),
        );
      }),
    );
  }
  render(<App />);
  await waitFor(() => {
    expect(useProfileStore.getState().profile).not.toBeNull();
    expect(useProblemStore.getState().loaded).toBe(true);
    expect(useAIStore.getState().service).not.toBeNull();
  });
  if (mode === "api") await saveApiKey("sk-ant-test-modes");
  const profile = useProfileStore.getState().profile!;
  act(() => useProfileStore.getState().update({ ai: { ...profile.ai, mode } }));
  extra?.();
}

/** In copy prompt mode, answers the modal with what the stand-in Claude says to its prompt. */
export async function answerCopy(mode: AIMode, user: User) {
  if (mode !== "copy") return;
  const box = await screen.findByRole("textbox", { name: "Claude's reply" }, { timeout: 4000 });
  const modal = box.closest("dialog")!;
  const prompt = (
    within(modal).getByRole("textbox", { name: "The prompt for Claude" }) as HTMLTextAreaElement
  ).value;
  await user.click(box);
  await user.paste(demoSampleResponder(prompt));
  await user.click(within(modal).getByRole("button", { name: "Use this reply" }));
}

export function resetClaude() {
  useAIStore.setState({ sampleBlocked: false, copy: null });
  delete (globalThis as Global).claude;
  vi.unstubAllGlobals();
}
