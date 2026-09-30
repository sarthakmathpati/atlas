// @vitest-environment jsdom
// Phase 7 in the running app: the Today plan (planned on first open, time for today, minimum day,
// Done, Skip, Swap, items that complete themselves), the dashboard's explained numbers, the weekly
// review and "Tighten with Claude" in all three Claude modes (a fake `sample`, a mocked Messages
// API, the copy prompt modal), revision sheet exports in both runtimes, the print fallback and the
// palette command. No network and no real key.
import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { refsOf } from "@/lib/planner/kinds";
import { clearAICache } from "@/lib/ai/run";
import { createFakeClaude, createFakeSample, FakeClaudeDownloads } from "@/lib/runtime/fakeClaude";
import { demoSampleResponder } from "@/lib/runtime/fakeSampleDemo";
import { localDate } from "@/lib/time";
import type { AIMode } from "@/lib/types";
import { saveApiKey, useAIStore } from "@/stores/aiStore";
import { useDataReady } from "@/stores/hydrate";
import { addPlanItems, usePlanStore } from "@/stores/planStore";
import { saveAttempt, useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { useTightenStore } from "@/features/revision/tightenStore";
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
    { status: 200 },
  );
}

async function start(mode: AIMode = "copy", extra: { downloads?: FakeClaudeDownloads } = {}) {
  if (mode === "sample" || extra.downloads) {
    const sample =
      mode === "sample"
        ? createFakeSample({ responder: (input) => demoSampleResponder(input) })
        : null;
    (globalThis as Global).claude = createFakeClaude({
      sample,
      uid: null,
      downloads: extra.downloads ?? null,
    });
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
    expect(useDataReady.getState().ready).toBe(true);
    expect(useAIStore.getState().service).not.toBeNull();
  });
  if (mode === "api") await saveApiKey("sk-ant-test-phase7");
  const profile = useProfileStore.getState().profile!;
  act(() =>
    useProfileStore
      .getState()
      .update({ onboardingDone: true, track: "sde", ai: { ...profile.ai, mode } }),
  );
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

const planNow = () => usePlanStore.getState().plans[localDate()];

/** Where an item's Start, Swap and Skip are: the Up next card for the next stop, else its stop. */
const controlsOf = (title: string): HTMLElement =>
  screen.queryByRole("region", { name: `Up next: ${title}` }) ??
  screen.getByRole("checkbox", { name: `Done: ${title}` }).closest("li")!;

beforeEach(async () => {
  window.location.hash = "#/settings";
  localStorage.clear();
  clearAICache();
  // A fresh owner for every test: the fake IndexedDB would otherwise keep the last test's data.
  await new Promise((resolve) => {
    const r = indexedDB.deleteDatabase("atlas");
    r.onsuccess = r.onerror = r.onblocked = () => resolve(null);
  });
});

afterEach(() => {
  cleanup();
  useUiStore.setState({ askOpen: false, quickAddOpen: false, paletteOpen: false });
  useAIStore.setState({ sampleBlocked: false, copy: null });
  useTightenStore.setState({ sheets: {} });
  delete (globalThis as Global).claude;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the Today plan", () => {
  it("plans the day on first open and keeps done items when the time changes", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/today");
    const list = await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 });
    expect(within(list).getAllByRole("listitem").length).toBeGreaterThanOrEqual(3);
    const plan = planNow()!;
    expect(plan.plannedAt).toBeTruthy();
    expect(plan.budgetMinutes).toBe(90);
    for (const item of plan.items) {
      expect(item.origin).toBe("planner");
      expect(within(list).getByText(item.reason)).toBeInTheDocument();
    }

    const first = plan.items[0]!;
    await user.click(screen.getByRole("checkbox", { name: `Done: ${first.title}` }));
    expect(planNow()!.items[0]!.done).toBe(true);
    expect(screen.getByText(new RegExp(`^${first.estMinutes}$`))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Time for today: 90 minutes/ }));
    await user.click(await screen.findByRole("button", { name: "30" }));
    const after = planNow()!;
    expect(after.budgetMinutes).toBe(30);
    expect(after.items.find((i) => i.id === first.id)?.done).toBe(true);
    const planned = after.items.filter((i) => !i.skipped).reduce((n, i) => n + i.estMinutes, 0);
    expect(planned).toBeLessThanOrEqual(Math.max(33, first.estMinutes + 33));

    await user.click(screen.getByRole("switch", { name: "Minimum day" }));
    const min = planNow()!;
    expect(min.minimumDay).toBe(true);
    expect(min.items.filter((i) => !i.done && i.origin === "planner")).toHaveLength(1);
    expect(min.items.find((i) => i.id === first.id)?.done).toBe(true);
  });

  it("skips and swaps items, never making duplicates", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/today");
    await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 });
    const learn = planNow()!.items.find((i) => i.kind === "learn-concept")!;
    await user.click(within(controlsOf(learn.title)).getByRole("button", { name: "Swap" }));
    const panel = await screen.findByRole("dialog", { name: `Swap ${learn.title}` });
    const options = within(panel).getAllByRole("button");
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThanOrEqual(3);
    await user.click(options[0]!);
    const swapped = planNow()!;
    expect(swapped.items.some((i) => i.id === learn.id)).toBe(false);
    const refs = swapped.items.flatMap(refsOf);
    expect(new Set(refs).size).toBe(refs.length);

    const drill = swapped.items.find((i) => i.kind === "drill")!;
    const drillRow = controlsOf(drill.title);
    expect(within(drillRow).queryByRole("button", { name: "Swap" })).toBeNull();
    await user.click(within(drillRow).getByRole("button", { name: "Skip" }));
    expect(planNow()!.items.find((i) => i.id === drill.id)?.skipped).toBe(true);
    await user.click(screen.getByRole("button", { name: "Skipped today (1)" }));
    await user.click(screen.getByRole("button", { name: `Bring back ${drill.title}` }));
    expect(planNow()!.items.find((i) => i.id === drill.id)?.skipped).toBe(false);
  });

  it("ticks items off when the owner does the thing elsewhere, and keeps the owner's own", async () => {
    await start();
    act(() => {
      addPlanItems([
        {
          kind: "learn-concept",
          refId: "os.processes.process-vs-program",
          title: "Learn: Process vs program",
          reason: "Added by you from the map.",
          estMinutes: 25,
        },
      ]);
    });
    await go("#/today");
    await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 });
    const plan = planNow()!;
    expect(plan.items[0]!.origin).toBe("owner");
    expect(plan.items.filter((i) => i.origin === "planner").length).toBeGreaterThan(0);
    const problem = plan.items.find((i) => i.kind === "new-problem")!;
    act(() => {
      saveAttempt({
        problemId: problem.refId!,
        startedAt: new Date().toISOString(),
        minutes: 18,
        language: "cpp",
        code: "int main() {}",
        result: "solved_alone",
        hintsUsed: 0,
        mistakeTagIds: [],
        mode: "normal",
      });
    });
    await waitFor(() => expect(planNow()!.items.find((i) => i.id === problem.id)?.done).toBe(true));
    expect(useProblemStore.getState().states[problem.refId!]?.status).toBe("solved");
  });
});

describe("the dashboard", () => {
  it("explains its numbers", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/dashboard");
    await screen.findByRole("heading", { name: "DSA patterns" }, { timeout: 4000 });
    await user.click(
      screen.getByRole("button", { name: /^Overall readiness: 0 out of 100\. Show how/ }),
    );
    const pop = await screen.findByRole("dialog", { name: "Overall readiness" });
    expect(pop).toHaveTextContent("The weighted mean of subject readiness, with the SDE weights");
    expect(pop).toHaveTextContent("Σ(weight × readiness) ÷ Σ weight");
    expect(screen.getByText("Activity this year")).toBeInTheDocument();
  });
});

describe.each(["sample", "api", "copy"] as AIMode[])("Claude in %s mode", (mode) => {
  it("writes the weekly reflection, and its focus is accepted in one click", async () => {
    const user = userEvent.setup();
    await start(mode);
    await go("#/weekly");
    await user.click(
      await screen.findByRole("button", { name: "Write my reflection" }, { timeout: 4000 }),
    );
    await answer(mode, user);
    const section = (await screen.findByText(/What went well/, {}, { timeout: 4000 })).closest(
      "section",
    )!;
    expect(within(section).getByText("Claude")).toBeInTheDocument();
    await user.click(within(section).getByRole("button", { name: "Use as my focus" }));
    const focus = useProfileStore.getState().profile!.focusSubjects;
    expect(focus.length).toBeGreaterThan(0);
    expect(within(section).getByText("This is your focus now.")).toBeInTheDocument();
    expect(useProfileStore.getState().profile!.weeklyReviewSeenAt).toBeTruthy();
  });

  it("tightens a revision sheet and keeps the original", async () => {
    const user = userEvent.setup();
    await start(mode);
    await go("#/revision?scope=day");
    await screen.findByText("Before you walk in: your mistake checklist", {}, { timeout: 4000 });
    await user.click(screen.getByRole("button", { name: "Tighten with Claude" }));
    await answer(mode, user);
    expect(await screen.findByText("Edited by Claude", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Tightened by Claude" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Your sheet" }));
    expect(screen.queryByText("Edited by Claude")).toBeNull();
    expect(screen.getByText("Insights from starred and tricky problems")).toBeInTheDocument();
  });
});

describe("revision sheet files and printing", () => {
  it("exports Markdown and HTML as browser downloads in the web app", async () => {
    const user = userEvent.setup();
    const created: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => {
      created.push(b);
      return "blob:sheet";
    });
    URL.revokeObjectURL = vi.fn();
    const clicks = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await start();
    await go("#/revision?scope=day");
    await screen.findByText("Before you walk in: your mistake checklist", {}, { timeout: 4000 });
    await user.click(screen.getByRole("button", { name: "Export as Markdown" }));
    await screen.findByText("Sheet exported as Markdown.");
    await user.click(screen.getByRole("button", { name: "Export as HTML" }));
    await screen.findByText("Sheet exported as HTML.");
    expect(clicks).toHaveBeenCalledTimes(2);
    const [md, html] = await Promise.all(created.map((b) => b.text()));
    expect(md).toMatch(/^# 1-day revision sheet/);
    expect(md).toContain("## Before you walk in: your mistake checklist");
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain("<h2>Before you walk in: your mistake checklist</h2>");
  });

  it("saves through the downloads capability inside claude.ai", async () => {
    const user = userEvent.setup();
    const downloads = new FakeClaudeDownloads();
    await start("copy", { downloads });
    await go("#/revision?scope=week");
    await screen.findByText("Your mistake checklist", {}, { timeout: 8000 });
    await user.click(screen.getByRole("button", { name: "Export as HTML" }));
    await waitFor(() => expect(downloads.saved).toHaveLength(1));
    expect(downloads.saved[0]!.filename).toMatch(/^atlas-revision-1-week-\d{4}-\d{2}-\d{2}\.html$/);
    expect(String(downloads.saved[0]!.data)).toMatch(/^<!doctype html>/);
    await user.click(screen.getByRole("button", { name: "Export as Markdown" }));
    await waitFor(() => expect(downloads.saved).toHaveLength(2));
    expect(downloads.saved[1]!.filename).toMatch(/\.md$/);
  });

  it("offers HTML when printing is blocked, and ticks off the revision item when it prints", async () => {
    const user = userEvent.setup();
    await start();
    act(() => {
      addPlanItems([
        {
          kind: "revision",
          refId: "revision-day",
          title: "Revision sheet: the 1-day sheet",
          reason: "Added by you.",
          estMinutes: 20,
        },
      ]);
    });
    await go("#/revision?scope=day");
    await screen.findByText("Before you walk in: your mistake checklist", {}, { timeout: 4000 });
    window.print = vi.fn(); // blocked: nothing happens, beforeprint never fires
    await user.click(screen.getByRole("button", { name: "Print" }));
    expect(
      await screen.findByText("Printing is blocked in this view", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(planNow()!.items[0]!.done).toBe(false);
    window.print = vi.fn(() => window.dispatchEvent(new Event("beforeprint")));
    await user.click(screen.getByRole("button", { name: "Print" }));
    await waitFor(() => expect(planNow()!.items[0]!.done).toBe(true), { timeout: 3000 });
    expect(screen.queryByText("Printing is blocked in this view")).toBeNull();
  });

  it("is one command away in the palette", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/today");
    act(() => useUiStore.getState().setPaletteOpen(true));
    await user.type(await screen.findByRole("combobox"), "1-day revision");
    await user.click(await screen.findByRole("option", { name: /Generate 1-day revision sheet/ }));
    await waitFor(() => expect(window.location.hash).toBe("#/revision?scope=day"));
  });
});
