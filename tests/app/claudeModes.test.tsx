// @vitest-environment jsdom
// Every Claude feature in all three modes (BUILD_SPEC.md 13, Phase 6 "done when"): one stand-in
// Claude (lib/runtime/fakeSampleDemo.ts) answers through a fake `sample` capability (built-in
// Claude), through a mocked fetch of the Messages API (API key), and through replies pasted into
// the copy prompt modal (copy prompt). No network, no real key.
import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { useChatStore } from "@/features/ai/chatStore";
import { conceptById, patternConcepts } from "@/data/syllabus";
import { clearAICache } from "@/lib/ai/run";
import { createFakeClaude, createFakeSample } from "@/lib/runtime/fakeClaude";
import { demoSampleResponder } from "@/lib/runtime/fakeSampleDemo";
import type { AIMode } from "@/lib/types";
import { saveApiKey, useAIStore } from "@/stores/aiStore";
import { closeConceptDialogs } from "@/stores/conceptDialogStore";
import { useConceptNoteStore } from "@/stores/conceptNoteStore";
import { addCustomConcept } from "@/stores/customConceptStore";
import { useMistakeTagStore } from "@/stores/mistakeTagStore";
import { saveAttempt, saveDraft, useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";

type Global = { claude?: unknown };
type User = ReturnType<typeof userEvent.setup>;

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

function sse(text: string): Response {
  const events = [
    { type: "message_start", message: { id: "msg" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } },
    { type: "message_delta", delta: { stop_reason: "end_turn" } },
    { type: "message_stop" },
  ];
  return new Response(
    events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(""),
    {
      status: 200,
    },
  );
}

async function setup(mode: AIMode) {
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
          messages: { content: string }[];
        };
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
}

/** In copy prompt mode, answers the modal with what the stand-in Claude says to its prompt. */
async function answer(mode: AIMode, user: User) {
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

const CODE =
  "int f(vector<int>& a) {\n  int best = 0;\n  for (int i = 0; i <= a.size(); i++) best += a[i];\n  return best;\n}";

describe.each(["sample", "api", "copy"] as AIMode[])("Claude features in %s mode", (mode) => {
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
    clearAICache();
  });
  afterEach(() => {
    cleanup();
    closeConceptDialogs();
    useUiStore.setState({ askOpen: false, quickAddOpen: false, paletteOpen: false });
    useAIStore.setState({ sampleBlocked: false, copy: null });
    useChatStore.setState({ threads: {} });
    delete (globalThis as Global).claude;
    vi.unstubAllGlobals();
  });

  it("writes an explanation for the owner's own concept and keeps it in the note", async () => {
    const user = userEvent.setup();
    await setup(mode);
    let id = "";
    act(() => {
      id = addCustomConcept({
        topicId: "dsa.graph-basics",
        name: `Euler tour (${mode})`,
        scope: "flattening a tree with entry and exit times",
        importance: "important",
      });
    });
    await go(`#/concept/${id}`);
    await user.click(
      await screen.findByRole("button", { name: "Explain with Claude" }, { timeout: 4000 }),
    );
    await answer(mode, user);
    await user.click(await screen.findByRole("button", { name: "Keep it" }, { timeout: 4000 }));
    await waitFor(() =>
      expect(useConceptNoteStore.getState().notes[id]?.generated?.questions).toHaveLength(3),
    );
    expect(await screen.findByText(/running tally/)).toBeInTheDocument();
  }, 20_000);

  it("explains a written concept another way and saves it to its notes", async () => {
    const user = userEvent.setup();
    await setup(mode);
    const concept = conceptById.get("dsa.graph-basics.bfs")!;
    await go(`#/concept/${concept.id}`);
    await screen.findByRole("heading", { level: 1, name: concept.name }, { timeout: 4000 });
    await user.click(screen.getByRole("button", { name: "Explain with Claude" }));
    const panel = screen.getByRole("region", { name: "Explain with Claude" });
    await user.click(within(panel).getByRole("radio", { name: "Simple" }));
    await user.click(within(panel).getByRole("button", { name: "Explain at the simple level" }));
    await answer(mode, user);
    await within(panel).findByText(/ticket counter/, {}, { timeout: 4000 });
    // The answer streams first; the actions appear once it is complete.
    await user.click(
      await within(panel).findByRole("button", { name: "Save to notes" }, { timeout: 4000 }),
    );
    await waitFor(() =>
      expect(useConceptNoteStore.getState().notes[concept.id]?.savedAnswers.at(-1)?.source).toBe(
        mode,
      ),
    );
  }, 20_000);

  it("dry runs the code in the editor and keeps the run with the attempt", async () => {
    const user = userEvent.setup();
    await setup(mode);
    const id = `lc-1`;
    act(() =>
      saveDraft(id, {
        language: "cpp",
        code: CODE,
        updatedAt: new Date().toISOString(),
        mode: "normal",
      }),
    );
    await go(`#/problems/${id}`);
    await user.click(await screen.findByRole("button", { name: "Dry run" }, { timeout: 4000 }));
    const panel = await screen.findByRole("region", { name: "Dry run" });
    await user.click(
      within(panel).getByRole("button", { name: "Dry run on an input Claude picks" }),
    );
    await answer(mode, user);
    await within(panel).findByText(/This matches the expected answer/, {}, { timeout: 4000 });
    await waitFor(
      () => expect(useProblemStore.getState().states[id]!.draft?.dryRuns).toHaveLength(1),
      {
        timeout: 5000,
      },
    );
  }, 20_000);

  it("explains the full solution after asking, and marks the attempt as seen", async () => {
    const user = userEvent.setup();
    await setup(mode);
    const id = "lc-49";
    // Phones and narrow tests show Problem and Code tabs; a draft opens on the code.
    act(() =>
      saveDraft(id, {
        language: "cpp",
        code: CODE,
        updatedAt: new Date().toISOString(),
        mode: "normal",
      }),
    );
    await go(`#/problems/${id}`);
    await user.click(await screen.findByRole("button", { name: "I'm stuck" }, { timeout: 4000 }));
    const hints = await screen.findByRole("region", { name: "Hints" });
    await user.click(within(hints).getByRole("button", { name: "Show full solution" }));
    await user.click(await screen.findByRole("button", { name: "Explain it with Claude" }));
    await answer(mode, user);
    await within(hints).findByText(/store what you've seen in a hash map/, {}, { timeout: 4000 });
    await waitFor(
      () => expect(useProblemStore.getState().states[id]!.draft?.sawSolution).toBe(true),
      {
        timeout: 5000,
      },
    );
  }, 20_000);

  it("suggests patterns for a new problem from Claude, keeping only known ids", async () => {
    const user = userEvent.setup();
    await setup(mode);
    act(() => useUiStore.getState().setQuickAddOpen(true));
    const dialog = await screen.findByRole("dialog", { name: "Add a problem" });
    await user.type(within(dialog).getByRole("textbox"), "Sliding puzzle of window blinds");
    await user.click(within(dialog).getByRole("button", { name: "Add it as a new problem" }));
    await user.click(within(dialog).getByRole("button", { name: "Ask Claude" }));
    await answer(mode, user);
    const ids = new Set(patternConcepts.map((c) => c.name));
    const chips = await within(dialog).findAllByRole(
      "button",
      { name: /window/i },
      { timeout: 4000 },
    );
    expect(chips.some((c) => ids.has(c.textContent!.trim()))).toBe(true);
    expect(within(dialog).getByText(/Claude thinks it's medium/)).toBeInTheDocument();
  }, 20_000);

  it("drafts how to avoid the top mistakes, used with one click", async () => {
    const user = userEvent.setup();
    await setup(mode);
    act(() => {
      saveAttempt({
        problemId: "lc-704",
        startedAt: new Date().toISOString(),
        language: "cpp",
        code: "",
        result: "not_solved",
        hintsUsed: 0,
        mistakeTagIds: ["mt-off-by-one"],
        mode: "normal",
      });
    });
    await go("#/mistakes");
    await user.click(
      await screen.findByRole("button", { name: "Suggest with Claude" }, { timeout: 4000 }),
    );
    await user.click(await screen.findByRole("button", { name: "Suggest how to avoid them" }));
    await answer(mode, user);
    const use = await screen.findAllByRole("button", { name: /Use this/ }, { timeout: 4000 });
    await user.click(use[0]!);
    await waitFor(() =>
      expect(useMistakeTagStore.getState().tags["mt-off-by-one"]?.howToAvoid).toMatch(/tiny input/),
    );
  }, 20_000);

  it("grades a typed drill approach", async () => {
    const user = userEvent.setup();
    await setup(mode);
    await go("#/drill");
    await user.click(await screen.findByRole("button", { name: "Start drill" }, { timeout: 4000 }));
    const card = await screen.findByRole("region", { name: /Prompt 1 of 5/ });
    await user.type(
      within(card).getByRole("textbox", { name: /Your approach/ }),
      "Keep a running window.",
    );
    await user.click(within(card).getByRole("button", { name: /reveal/i }));
    await user.click(within(card).getByRole("button", { name: "Grade my approach with Claude" }));
    await answer(mode, user);
    await within(card).findByText(/Right pattern and a clear plan/, {}, { timeout: 4000 });
    expect(within(card).getByText(/Approach 80%/)).toBeInTheDocument();
  }, 20_000);

  it("chats in the concept Ask tab", async () => {
    const user = userEvent.setup();
    await setup(mode);
    const concept = conceptById.get("dsa.graph-basics.bfs")!;
    await go(`#/concept/${concept.id}`);
    await screen.findByRole("heading", { level: 1, name: concept.name }, { timeout: 4000 });
    await user.click(screen.getByRole("tab", { name: "Ask" }));
    await user.click(await screen.findByRole("button", { name: "Quiz me" }));
    await answer(mode, user);
    expect(
      await screen.findByText(/Here's the first question/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
  }, 20_000);
});
