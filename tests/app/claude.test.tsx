// @vitest-environment jsdom
// Phase 6 in the real app, without network access or real keys: every Claude feature through
// built-in Claude (a fake `sample` capability), an API key (a mocked fetch) and copy prompt
// (the modal, pasting replies), with errors, invalid JSON, a blocked capability and a wrong key.
import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { useChatStore } from "@/features/ai/chatStore";
import { conceptById } from "@/data/syllabus";
import { clearAICache } from "@/lib/ai/run";
import type { SampleInput } from "@/lib/runtime/claude";
import { createFakeClaude, createFakeSample, type FakeSample } from "@/lib/runtime/fakeClaude";
import { demoSampleResponder } from "@/lib/runtime/fakeSampleDemo";
import { DexieRepository } from "@/lib/storage/DexieRepository";
import type { AIMode } from "@/lib/types";
import { saveApiKey, testApiConnection, useAIStore } from "@/stores/aiStore";
import { closeConceptDialogs, openQuickQuiz } from "@/stores/conceptDialogStore";
import { useConceptNoteStore } from "@/stores/conceptNoteStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { saveDraft, useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";

const CONCEPT = "os.processes.context-switching";
const CONCEPT_NAME = conceptById.get(CONCEPT)!.name;
const PROBLEM = "lc-3";

type Global = { claude?: unknown };

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

async function ready(mode: AIMode) {
  render(<App />);
  await waitFor(() => {
    expect(useProfileStore.getState().profile).not.toBeNull();
    expect(useProblemStore.getState().loaded).toBe(true);
    expect(useAIStore.getState().service).not.toBeNull();
  });
  const profile = useProfileStore.getState().profile!;
  act(() => useProfileStore.getState().update({ ai: { ...profile.ai, mode } }));
}

function withSample(responder?: (input: SampleInput) => string): FakeSample {
  const sample = createFakeSample({
    responder: responder ?? ((input) => demoSampleResponder(input)),
  });
  (globalThis as Global).claude = createFakeClaude({ sample, uid: null });
  return sample;
}

/** Answers the copy prompt modal with `reply`. */
async function pasteReply(user: ReturnType<typeof userEvent.setup>, reply: string) {
  const box = await screen.findByRole("textbox", { name: "Claude's reply" }, { timeout: 4000 });
  const modal = box.closest("dialog")!;
  expect(within(modal).getByRole("textbox", { name: "The prompt for Claude" })).toHaveValue();
  await user.click(box);
  await user.paste(reply);
  await user.click(within(modal).getByRole("button", { name: "Use this reply" }));
}

function sse(text: string, stop = "end_turn"): Response {
  const events = [
    { type: "message_start", message: { id: "msg" } },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: stop } },
    { type: "message_stop" },
  ];
  const body = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

describe("Claude in the app", () => {
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

  it("asks built-in Claude from the drawer with the concept as context, and saves an answer", async () => {
    const user = userEvent.setup();
    const sample = withSample();
    await ready("sample");
    await go(`#/concept/${CONCEPT}`);
    await screen.findByRole("heading", { level: 1, name: CONCEPT_NAME }, { timeout: 4000 });
    act(() => useUiStore.getState().setAskOpen(true));
    const drawer = await screen.findByRole("dialog", { name: "Ask Claude" }, { timeout: 4000 });
    expect(within(drawer).getByText(CONCEPT_NAME)).toBeInTheDocument();
    await user.click(within(drawer).getByRole("button", { name: "Explain it simply" }));
    await within(drawer).findByText(/ripples/, {}, { timeout: 4000 });
    // Built-in Claude gets the instructions in the first user turn, then the conversation.
    const input = sample.calls[0]!.input as { role: string; content: string }[];
    expect(input[0]!.content).toContain("## Concept");
    expect(input[0]!.content).toContain(CONCEPT_NAME);
    expect(input.at(-1)).toMatchObject({ role: "user" });
    expect(sample.calls[0]!.options.cache).toBe(false);

    await user.click(within(drawer).getByRole("button", { name: "Give an example" }));
    await within(drawer).findByText(/shortest way there/, {}, { timeout: 4000 });
    expect(sample.calls).toHaveLength(2);

    const saves = within(drawer).getAllByRole("button", { name: "Save to concept" });
    await user.click(saves.at(-1)!);
    await user.click(within(drawer).getByRole("button", { name: "Save answer" }));
    await waitFor(
      () =>
        expect(useConceptNoteStore.getState().notes[CONCEPT]?.savedAnswers.at(-1)?.source).toBe(
          "sample",
        ),
      { timeout: 4000 },
    );
  }, 20_000);

  it("switches to copy prompt when built-in Claude isn't allowed, and the copy flow finishes the answer", async () => {
    const user = userEvent.setup();
    const sample = withSample();
    await ready("sample");
    await go("#/today");
    sample.failNext({ code: "not_granted", message: "The viewer declined." });
    act(() => useUiStore.getState().setAskOpen(true));
    const drawer = await screen.findByRole("dialog", { name: "Ask Claude" });
    await user.type(
      within(drawer).getByRole("textbox", { name: "Message to Claude" }),
      "Hello{Enter}",
    );
    await within(drawer).findByText(/switched to copy-prompt mode/, {}, { timeout: 4000 });
    expect(useAIStore.getState().sampleBlocked).toBe(true);
    await user.click(within(drawer).getByRole("button", { name: "Try again" }));
    await pasteReply(user, "A pasted answer from claude.ai.");
    await within(drawer).findByText("A pasted answer from claude.ai.");
    expect(sample.calls).toHaveLength(1);
  }, 20_000);

  it("runs a quick quiz in copy prompt mode, grading short answers with a second prompt", async () => {
    const user = userEvent.setup();
    await ready("copy");
    const concept = conceptById.get(CONCEPT)!;
    act(() =>
      openQuickQuiz({
        conceptIds: [CONCEPT],
        title: `Quick quiz: ${concept.name}`,
        scope: concept.name,
      }),
    );
    const dialog = await screen.findByRole(
      "dialog",
      { name: `Quick quiz: ${concept.name}` },
      { timeout: 4000 },
    );
    await user.click(within(dialog).getByRole("button", { name: "Write my quiz" }));
    const quiz = demoSampleResponder(
      `Write a quick quiz of 5\nConcept ids to use:\n- ${CONCEPT}: ${concept.name}\n`,
    );
    await pasteReply(user, `Here is your quiz:\n\`\`\`json\n${quiz}\n\`\`\``);
    const radios = await within(dialog).findAllByRole("radio");
    await user.click(radios[1]!); // question 1, the right option
    const shorts = within(dialog).getAllByRole("textbox");
    await user.type(shorts[0]!, "Keep earlier results so later steps don't redo them.");
    await user.click(within(dialog).getByRole("button", { name: "Check my answers" }));
    await pasteReply(user, '[{ "index": 2, "score": 1, "feedback": "Spot on." }]');
    await within(dialog).findByText(/Spot on\./, {}, { timeout: 4000 });
    const checks = useConceptStateStore.getState().checks[CONCEPT] ?? [];
    expect(checks.at(-1)).toMatchObject({ kind: "quiz" });
    expect(checks.at(-1)!.score).toBeGreaterThan(0);
  }, 20_000);

  it("shows the raw reply and a way forward when a pasted reply isn't valid JSON", async () => {
    const user = userEvent.setup();
    await ready("copy");
    act(() => openQuickQuiz({ conceptIds: [CONCEPT], title: "Quick quiz: test", scope: "test" }));
    const dialog = await screen.findByRole(
      "dialog",
      { name: "Quick quiz: test" },
      { timeout: 4000 },
    );
    await user.click(within(dialog).getByRole("button", { name: "Write my quiz" }));
    await pasteReply(user, "Sorry, I can't write a quiz right now.");
    await within(dialog).findByText(/couldn't read that reply/, {}, { timeout: 4000 });
    expect(within(dialog).getByText("Claude's reply as it came")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  }, 20_000);

  it("reviews code with an API key through the Messages API, and applies the suggestions", async () => {
    const user = userEvent.setup();
    const review = demoSampleResponder("Review the learner's code for this problem");
    const fetchMock = vi.fn(async () => sse(`\`\`\`json\n${review}\n\`\`\``));
    vi.stubGlobal("fetch", fetchMock);
    await ready("api");
    expect(await saveApiKey("sk-ant-test-0000")).toBe(true);
    act(() =>
      saveDraft(PROBLEM, {
        language: "cpp",
        code: "int f(vector<int>& a) {\n  int n = a.size();\n  for (int i = 0; i <= n; i++) {}\n  return 0;\n}",
        updatedAt: new Date().toISOString(),
        mode: "normal",
      }),
    );
    await go(`#/problems/${PROBLEM}`);
    await user.click(
      await screen.findByRole("button", { name: "Review my code" }, { timeout: 4000 }),
    );
    const panel = await screen.findByRole("region", { name: "Code review" });
    await user.click(within(panel).getByRole("button", { name: "Review my code" }));
    await within(panel).findByText("Has bugs", {}, { timeout: 4000 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("sk-ant-test-0000");
    const body = JSON.parse(String(init.body)) as {
      system: string;
      messages: { content: string }[];
    };
    expect(body.system).toContain("The learner's primary language is C++");
    expect(body.messages[0]!.content).toContain("i <= n");

    await user.click(within(panel).getByRole("button", { name: /Off-by-one/ }));
    await user.click(within(panel).getByRole("button", { name: "Use as insight" }));
    // The draft autosaves 2 seconds after the last change.
    await waitFor(
      () => {
        const state = useProblemStore.getState().states[PROBLEM]!;
        expect(state.insight).toMatch(/Grow the window/);
        expect(state.draft?.review?.verdict).toBe("has bugs");
        expect(state.draft?.pendingTagIds).toContain("mt-off-by-one");
      },
      { timeout: 5000 },
    );
  }, 20_000);

  it("says plainly when the API key is wrong, and Test connection reports each model", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              type: "error",
              error: { type: "authentication_error", message: "invalid x-api-key" },
            }),
            { status: 401 },
          ),
      ),
    );
    await ready("api");
    await saveApiKey("sk-ant-wrong");
    act(() => useUiStore.getState().setAskOpen(true));
    const drawer = await screen.findByRole("dialog", { name: "Ask Claude" });
    await user.type(
      within(drawer).getByRole("textbox", { name: "Message to Claude" }),
      "Hi{Enter}",
    );
    await within(drawer).findByText(/didn't accept your API key/, {}, { timeout: 4000 });
    expect(within(drawer).getByRole("link", { name: "Open Settings" })).toBeInTheDocument();

    const results = await testApiConnection();
    expect(results).toHaveLength(1); // a wrong key stops after the first model
    expect(results[0]).toMatchObject({ tier: "quick", ok: false });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => sse("OK")),
    );
    const fine = await testApiConnection();
    expect(fine.map((r) => r.ok)).toEqual([true, true, true]);
  }, 20_000);

  it("keeps the API key out of backups", async () => {
    await ready("api");
    await saveApiKey("sk-ant-secret-1234");
    // The same browser storage the app opened.
    const repo = await DexieRepository.open();
    const backup = JSON.stringify(await repo.exportAll());
    repo.close();
    expect(backup).not.toContain("sk-ant-secret-1234");
    expect(backup).not.toContain("anthropicApiKey");
  });

  it("writes Claude hints once per level and reuses the saved hint", async () => {
    const user = userEvent.setup();
    const sample = withSample();
    await ready("sample");
    await go(`#/problems/${PROBLEM}`);
    await user.click(await screen.findByRole("button", { name: "I'm stuck" }, { timeout: 4000 }));
    const hints = await screen.findByRole("region", { name: "Hints" });
    await user.click(within(hints).getByRole("button", { name: "Get hint 1" }));
    await within(hints).findByText(/remember as you go/, {}, { timeout: 4000 });
    expect(useProblemStore.getState().states[PROBLEM]!.hints?.[0]?.level).toBe(1);
    const calls = sample.calls.length;
    // Switching sources and back shows the saved hint without asking again.
    await user.click(within(hints).getByRole("radio", { name: "Pattern notes" }));
    await user.click(within(hints).getByRole("radio", { name: "Claude" }));
    expect(within(hints).getByText(/remember as you go/)).toBeInTheDocument();
    expect(sample.calls.length).toBe(calls);
    await waitFor(
      () => expect(useProblemStore.getState().states[PROBLEM]!.draft?.hintsUsed).toBe(1),
      { timeout: 5000 },
    );
  }, 20_000);

  it("grades an explanation with Claude and lets a follow-up answer raise the score", async () => {
    const user = userEvent.setup();
    withSample();
    await ready("sample");
    await go(`#/concept/${CONCEPT}`);
    await screen.findByRole("heading", { level: 1, name: CONCEPT_NAME }, { timeout: 4000 });
    await user.click(screen.getByRole("button", { name: "Explain it back" }));
    const dialog = await screen.findByRole("dialog", { name: /Explain it back/ });
    await user.type(within(dialog).getByRole("textbox"), "word ".repeat(40));
    const grade = within(dialog).getByRole("button", { name: "Grade with Claude" });
    await waitFor(() => expect(grade).toBeEnabled(), { timeout: 4000 });
    await user.click(grade);
    await within(dialog).findByText("4 / 5", {}, { timeout: 4000 });
    let checks = useConceptStateStore.getState().checks[CONCEPT]!;
    expect(checks.at(-1)).toMatchObject({ kind: "explain", score: 0.8 });
    expect((checks.at(-1)!.detail as { mode: string }).mode).toBe("claude");
    await user.click(
      within(dialog).getByRole("button", { name: "Answer it to improve your score" }),
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: "Your answer to the follow-up question" }),
      "Linear time because every item is handled once.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Grade my answer" }));
    await within(dialog).findByText("5 / 5", {}, { timeout: 4000 });
    checks = useConceptStateStore.getState().checks[CONCEPT]!;
    expect(checks.at(-1)!.score).toBe(1);
  }, 20_000);

  it("generates drill prompts for weak patterns and drops ids that aren't patterns", async () => {
    const user = userEvent.setup();
    withSample((input) => {
      const text = typeof input === "string" ? input : input.map((t) => t.content).join("\n");
      if (!text.includes("original pattern-recognition prompts")) return "OK";
      const reply = JSON.parse(demoSampleResponder(input)) as { answerConceptIds: string[] }[];
      reply[0]!.answerConceptIds = ["dsa.not-a-pattern"];
      return JSON.stringify(reply);
    });
    await ready("sample");
    await go("#/drill");
    await user.click(
      await screen.findByRole("button", { name: "Write 5 new prompts" }, { timeout: 4000 }),
    );
    await screen.findByText(/4 new prompts added to your bank \(1 left out/, {}, { timeout: 4000 });
    expect(screen.getByText("Your 4 prompts from Claude")).toBeInTheDocument();
  }, 20_000);
});
