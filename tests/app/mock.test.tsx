// @vitest-environment jsdom
// F15 mock interviews in the real app: a coding mock end to end with streamed replies, Stop, a
// reload mid-way and saved feedback (built-in Claude through a slow fake `sample`); theory and
// behavioral rounds through a mocked, streamed Messages API (API key); a design round in the
// design workspace; and copy prompt mode's script with the form for the feedback. No network, no
// real key.
import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/app/App";
import { clearAICache } from "@/lib/ai/run";
import { createFakeClaude, createFakeSample } from "@/lib/runtime/fakeClaude";
import { demoSampleResponder } from "@/lib/runtime/fakeSampleDemo";
import { localDate } from "@/lib/time";
import { useActivityStore } from "@/stores/activityStore";
import { useAIStore } from "@/stores/aiStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { updateSection, useDesignStore } from "@/stores/designStore";
import { createMock, getMock, setMockCode, useMockStore } from "@/stores/mockStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { apiRequests, go, resetClaude, setupMode, type Global } from "./claudeHarness";

const CODE = `vector<int> dailyTemperatures(vector<int>& t) {
  vector<int> ans(t.size()), st;
  for (int i = 0; i < (int)t.size(); i++) {
    while (!st.empty() && t[st.back()] < t[i]) { ans[st.back()] = i - st.back(); st.pop_back(); }
    st.push_back(i);
  }
  return ans;
}`;

async function loaded() {
  await waitFor(() => {
    expect(useProfileStore.getState().profile).not.toBeNull();
    expect(useProblemStore.getState().loaded).toBe(true);
    expect(useMockStore.getState().loaded).toBe(true);
    expect(useDesignStore.getState().loaded).toBe(true);
    expect(useAIStore.getState().service).not.toBeNull();
  });
}

/** Built-in Claude that streams slowly enough to press Stop part way. */
async function slowSample() {
  const sample = createFakeSample({
    responder: (input) => demoSampleResponder(input),
    delayMs: 60,
    chunks: 10,
  });
  (globalThis as Global).claude = createFakeClaude({ sample, uid: null });
  render(<App />);
  await loaded();
  const profile = useProfileStore.getState().profile!;
  act(() => useProfileStore.getState().update({ ai: { ...profile.ai, mode: "sample" } }));
}

function mocksToday() {
  const today = localDate();
  return useActivityStore.getState().months[today.slice(0, 7)]?.days[today]?.mocks ?? 0;
}

describe("mock interviews", () => {
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
    clearAICache();
  });
  afterEach(() => {
    cleanup();
    resetClaude();
  });

  it("runs a coding mock end to end: streamed replies, Stop, a reload mid-way, feedback", async () => {
    const user = userEvent.setup();
    await slowSample();
    const before = mocksToday();
    let id = "";
    act(() => {
      id = createMock({
        kind: "dsa",
        delivery: "live",
        topicOrProblemId: "lc-739",
        language: "cpp",
      }).id;
    });
    await go(`#/mock/${id}`);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Coding interview" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    // The problem's name stays hidden until the end; the interviewer states it in their words.
    expect(screen.queryByText(/Daily Temperatures/)).toBeNull();
    expect(screen.getByRole("timer", { name: "Time left in the interview" })).toHaveTextContent(
      "45:00",
    );

    await user.click(screen.getByRole("button", { name: "Start the interview" }));
    // The opening streams in with a Stop button.
    expect(await screen.findByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(await screen.findByText(/in my words/, {}, { timeout: 4000 })).toBeInTheDocument();
    await waitFor(() => expect(getMock(id)?.turns).toHaveLength(2));
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();

    // A question, with the reply stopped part way: what arrived is kept.
    const box = screen.getByRole("textbox", { name: "Your answer" });
    await user.type(box, "Can the list be empty?{Enter}");
    expect(getMock(id)?.turns[2]?.content).toMatch(
      /^\[Phase: Clarify \| 4\d min left\] Can the list be empty\?$/,
    );
    await screen.findByText(/Good question/, {}, { timeout: 4000 });
    await user.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() =>
      expect(getMock(id)?.turns.at(-1)).toMatchObject({
        role: "assistant",
        content: expect.stringMatching(/^Good question.* …$/s),
      }),
    );
    expect(getMock(id)?.turns.at(-1)?.content).not.toContain("What approach comes to mind?");
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();

    // The phase stepper: the next turn carries the new phase.
    await user.click(screen.getByRole("button", { name: /Approach/ }));
    expect(getMock(id)?.phase).toBe("Approach");
    await user.type(box, "Keep a stack of days still waiting for a warmer one.{Enter}");
    expect(await screen.findByText(/can you do better/, {}, { timeout: 4000 })).toBeInTheDocument();
    await waitFor(() => expect(getMock(id)?.turns).toHaveLength(6));
    act(() => setMockCode(id, CODE));
    const saved = getMock(id)!;
    expect(saved.elapsedMs).toBeGreaterThan(0);

    // Reload: everything comes back from storage and the interview carries on.
    cleanup();
    await waitFor(() => expect(useMockStore.getState().loaded).toBe(false));
    render(<App />);
    await loaded();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Coding interview" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(getMock(id)).toMatchObject({ turns: saved.turns, code: CODE, phase: "Approach" });
    expect(screen.getByText(/can you do better/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approach/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    // The clock resumes from where it was, not from 45:00.
    expect(getMock(id)!.elapsedMs).toBeGreaterThanOrEqual(saved.elapsedMs!);

    // End the interview and get the feedback.
    await user.click(screen.getByRole("button", { name: "End interview" }));
    await user.click(screen.getByRole("button", { name: "End and get feedback" }));
    expect(await screen.findByText(/A solid interview/, {}, { timeout: 6000 })).toBeInTheDocument();
    const done = getMock(id)!;
    expect(done.feedback).toMatchObject({
      hireSignal: "yes",
      scores: { problemSolving: 4, communication: 3, codeQuality: 4 },
    });
    expect(done.endedAt).toBeDefined();
    // The code became an attempt with mode "mock" (problem solving 4 counts as solved alone).
    const attempt = useProblemStore.getState().states["lc-739"]?.attempts.at(-1);
    expect(attempt).toMatchObject({ mode: "mock", result: "solved_alone", code: CODE });
    expect(done.attemptId).toBe(attempt!.id);
    expect(mocksToday()).toBe(before + 1);
    // Now the problem's name shows.
    expect(screen.getByRole("link", { name: /Daily Temperatures/ })).toBeInTheDocument();

    // The history lists it with its score.
    await go("#/mock?tab=history");
    const list = await screen.findByRole("list", { name: "Past interviews" }, { timeout: 4000 });
    expect(within(list).getByText(/Daily Temperatures/)).toBeInTheDocument();
    expect(within(list).getByText("3.6/5")).toBeInTheDocument();
  }, 30_000);

  it("runs theory and behavioral rounds through the API with the time note on every turn", async () => {
    const user = userEvent.setup();
    await setupMode("api");
    await loaded();
    const checksBefore =
      useConceptStateStore.getState().checks["career.behavioral.the-star-method"]?.length ?? 0;

    // Theory from the setup screen: Atlas picks two subjects.
    await go("#/mock?type=theory");
    const setup = await screen.findByRole(
      "region",
      { name: "Start a mock interview" },
      {
        timeout: 4000,
      },
    );
    expect(within(setup).getByRole("radio", { name: /Theory rapid-fire/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(within(setup).getByRole("button", { name: "Start the interview" }));
    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: "Theory rapid-fire" },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start the interview" }));
    expect(await screen.findByText(/calls fork\(\)/, {}, { timeout: 4000 })).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Your answer" }),
      "The child gets a copy of the address space, copy-on-write.{Enter}",
    );
    expect(
      await screen.findByText(/process and a thread/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    const last = apiRequests.at(-1)!;
    expect(last.system).toContain("for a theory interview");
    expect(last.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(last.messages[2]!.content).toMatch(/^\[Phase: Warm-up \| 20 min left\] The child/);
    await user.click(screen.getByRole("button", { name: "End interview" }));
    await user.click(screen.getByRole("button", { name: "End and get feedback" }));
    expect(await screen.findByText(/A solid interview/, {}, { timeout: 6000 })).toBeInTheDocument();

    // Behavioral: four questions from the bank, starting with Tell me about yourself.
    await go("#/mock?type=behavioral");
    const setup2 = await screen.findByRole(
      "region",
      { name: "Start a mock interview" },
      {
        timeout: 4000,
      },
    );
    expect(within(setup2).getAllByRole("listitem")[0]).toHaveTextContent(/Tell me about yourself/);
    await user.click(within(setup2).getByRole("button", { name: "Start the interview" }));
    await user.click(
      await screen.findByRole("button", { name: "Start the interview" }, { timeout: 4000 }),
    );
    expect(
      await screen.findByText(/tell me about yourself/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Your answer" }),
      "I'm a final-year student who likes making slow things fast.{Enter}",
    );
    expect(
      await screen.findByText(/under time pressure/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "End interview" }));
    await user.click(screen.getByRole("button", { name: "End and get feedback" }));
    expect(await screen.findByText(/A solid interview/, {}, { timeout: 6000 })).toBeInTheDocument();
    // A behavioral round is a check on telling STAR stories.
    const checks = useConceptStateStore.getState().checks["career.behavioral.the-star-method"];
    expect(checks).toHaveLength(checksBefore + 1);
    expect(checks!.at(-1)!.score).toBeCloseTo(3.6 / 5);

    // Both show in the history, with a trend per kind.
    await go("#/mock?tab=history");
    const list = await screen.findByRole("list", { name: "Past interviews" }, { timeout: 4000 });
    expect(within(list).getByText(/Theory rapid-fire/)).toBeInTheDocument();
    expect(within(list).getByText(/Behavioral interview/)).toBeInTheDocument();
  }, 30_000);

  it("runs a design round in the design workspace and finishes its design attempt", async () => {
    const user = userEvent.setup();
    await slowSample();
    let id = "";
    act(() => {
      id = createMock({ kind: "design", delivery: "live", topicOrProblemId: "lld-parking-lot" }).id;
    });
    const designId = getMock(id)!.designAttemptId!;
    expect(useDesignStore.getState().attempts[designId]).toMatchObject({
      problemId: "lld-parking-lot",
      mode: "mock",
      mockId: id,
    });
    await go(`#/mock/${id}`);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Design interview" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    // The workspace sits beside the chat (or behind a Design tab on narrow screens).
    const tab = screen.queryByRole("tab", { name: "Design" });
    if (tab) await user.click(tab);
    expect(
      await screen.findByRole("textbox", { name: /Requirements/ }, { timeout: 4000 }),
    ).toBeInTheDocument();
    const chatTab = screen.queryByRole("tab", { name: "Chat" });
    if (chatTab) await user.click(chatTab);
    await user.click(screen.getByRole("button", { name: "Start the interview" }));
    expect(
      await screen.findByText(/requirements would you like to pin down/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    act(() => updateSection(designId, "requirements", "Cars, bikes and trucks; hourly pricing."));
    await user.type(
      screen.getByRole("textbox", { name: "Your answer" }),
      "Which vehicle types, and how is pricing done?{Enter}",
    );
    expect(await screen.findByText(/rough numbers/, {}, { timeout: 4000 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "End interview" }));
    await user.click(screen.getByRole("button", { name: "End and get feedback" }));
    expect(await screen.findByText(/A solid interview/, {}, { timeout: 6000 })).toBeInTheDocument();
    const design = useDesignStore.getState().attempts[designId]!;
    expect(design.finishedAt).toBeDefined();
    // The design attempt counts as practice on the classic, scored by the mock's average.
    const attempt = useProblemStore.getState().states["lld-parking-lot"]?.attempts.at(-1);
    expect(attempt?.designAttemptId).toBe(designId);
    expect(screen.getByRole("link", { name: /Parking lot/i })).toBeInTheDocument();
  }, 30_000);

  it("in copy prompt mode, writes the whole interview as a script and saves pasted feedback", async () => {
    const user = userEvent.setup();
    await setupMode("copy");
    await loaded();
    const before = mocksToday();
    let id = "";
    act(() => {
      id = createMock({
        kind: "dsa",
        delivery: "copy",
        topicOrProblemId: "lc-739",
        language: "cpp",
      }).id;
    });
    await go(`#/mock/${id}`);
    const region = await screen.findByRole(
      "region",
      { name: "Mock interview in a Claude chat" },
      { timeout: 4000 },
    );
    const script = (
      within(region).getByRole("textbox", {
        name: "The interview script for Claude",
      }) as HTMLTextAreaElement
    ).value;
    expect(script).toContain("The interview lasts 45 minutes");
    expect(script).toContain("When I write END");
    expect(script).toContain('"problemSolving": 1-5');
    // The script names the problem for Claude but never holds a LeetCode statement.
    expect(script).toContain("Describe the problem in your own words");
    expect(within(region).getByRole("link", { name: "Open Claude" })).toHaveAttribute(
      "href",
      "https://claude.ai/new",
    );

    // Something that isn't the feedback is refused with a plain reason.
    const reply = within(region).getByRole("textbox", { name: "Claude's feedback" });
    await user.click(reply);
    await user.paste("Thanks for the interview.");
    await user.click(within(region).getByRole("button", { name: "Save the feedback" }));
    expect(await within(region).findByRole("alert")).toHaveTextContent(
      "Atlas couldn't find the feedback",
    );

    await user.clear(reply);
    await user.click(reply);
    await user.paste(
      `Here's your feedback.\n\n\`\`\`json\n${JSON.stringify({
        scores: {
          problemSolving: 3,
          communication: 4,
          codeQuality: 3,
          complexity: 4,
          edgeCases: 2,
        },
        strengths: ["Clear questions up front."],
        improvements: ["Test the empty input before saying you're done."],
        hireSignal: "lean no",
        summary: "A reasonable start that needed a hint to reach the stack.",
      })}\n\`\`\``,
    );
    const code = within(region).getByRole("textbox", { name: "Your final code (optional)" });
    await user.click(code);
    await user.paste(CODE);
    await user.click(within(region).getByRole("button", { name: "Save the feedback" }));
    expect(
      await screen.findByText(/needed a hint to reach the stack/, {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(getMock(id)?.feedback?.hireSignal).toBe("lean no");
    const attempt = useProblemStore.getState().states["lc-739"]?.attempts.at(-1);
    expect(attempt).toMatchObject({ mode: "mock", result: "solved_with_hints", code: CODE });
    expect(mocksToday()).toBe(before + 1);
  }, 30_000);
});
