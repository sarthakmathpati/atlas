// @vitest-environment jsdom
// ADHD mode on screen (F32, session 9.4): the switch on every page with the card shown the first
// time, the palette and Settings with a switch per part; the calm screen; the Now card with its
// steps, the 2-minute start, "I'm stuck", Swap and Park; time you can see (discs, the chime,
// "Planned 15, took 22", the pace in Settings); where you left off; ink and the week's flag;
// breaks (ADHD block lengths, a movement idea, the 90-minute check-in); the if-then line and its
// reminder; reading one part at a time with a quick check, read aloud and line focus; the focus
// sound; Study with Claude in built-in and API key mode, hidden in copy prompt mode; Fresh start
// and Welcome back. With ADHD mode off, Today stays as it was.
import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { setAudioContextFactory, stopNoise } from "@/features/adhd/sound";
import { useStudyStore } from "@/features/adhd/studyWithClaude";
import { LEETCODE_PROBLEMS } from "@/data/problems.seed";
import { CHECK_IN_AFTER_MS } from "@/lib/adhd/checkIn";
import { MOVEMENT_PROMPTS } from "@/lib/focus/prompts";
import { clearAICache } from "@/lib/ai/run";
import { addDaysToDate, localDate, nowIso } from "@/lib/time";
import type { AdhdPrefs, DayPlan, PlanItem } from "@/lib/types";
import { recordActivity } from "@/stores/activityStore";
import { setAdhd, setAdhdPart, useAdhdUi } from "@/stores/adhdStore";
import { noteActivity, useCheckInStore } from "@/stores/checkInStore";
import { closeConceptDialogs, openFlashcards } from "@/stores/conceptDialogStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { useDesignStore } from "@/stores/designStore";
import { finishBlock, leaveBreak, useFocusTimerStore } from "@/stores/focusTimerStore";
import { useDataReady } from "@/stores/hydrate";
import { resetNow, startNow, tickNow, TRIAL_MS, useNowStore } from "@/stores/nowStore";
import { recordPace } from "@/stores/paceStore";
import { closePark } from "@/stores/parkStore";
import { dismissPlace } from "@/stores/placeStore";
import {
  notePlanWritten,
  setPlanItemDone,
  setPlanItemSkipped,
  usePlanStore,
} from "@/stores/planStore";
import { saveAttempt, useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { useToastStore } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { apiRequests, go, resetClaude, setupMode } from "./claudeHarness";

const CONCEPT = "dsa.sliding-window.variable-size-window";
const ALL_PARTS = "calm nowCard time place rewards breaks startHelp reading gentle";

/** Turns ADHD mode on as if the card had been seen already. */
function adhdOn(changes: Partial<AdhdPrefs> = {}) {
  act(() => setAdhd({ on: true, introSeenAt: nowIso(), ...changes }));
}

async function start(adhd: Partial<AdhdPrefs> | null = {}) {
  render(<App />);
  await waitFor(() => {
    expect(useProfileStore.getState().profile).not.toBeNull();
    expect(useDataReady.getState().ready).toBe(true);
  });
  act(() => useProfileStore.getState().update({ onboardingDone: true, track: "sde" }));
  if (adhd) adhdOn(adhd);
}

function item(id: string, kind: PlanItem["kind"], title: string, extra: Partial<PlanItem> = {}) {
  return {
    id,
    kind,
    title,
    reason: "For the test.",
    estMinutes: 15,
    done: false,
    skipped: false,
    origin: "planner",
    ...extra,
  } satisfies PlanItem;
}

/** Today's plan: a new problem, a lesson and a drill (the planner keeps a plan it already made). */
function plan(): DayPlan {
  const stamp = nowIso();
  const p: DayPlan = {
    date: localDate(),
    budgetMinutes: 60,
    minimumDay: false,
    items: [
      item("p1", "new-problem", "Solve 1. Two Sum", { refId: "lc-1" }),
      item("l1", "learn-concept", "Learn: Variable-size window", {
        refId: CONCEPT,
        estMinutes: 20,
      }),
      item("d1", "drill", "Pattern drill", { estMinutes: 10 }),
    ],
    generatedAt: stamp,
    plannedAt: stamp,
    updatedAt: stamp,
  };
  act(() => notePlanWritten(p));
  return p;
}

const planItem = (id: string) =>
  usePlanStore.getState().plans[localDate()]!.items.find((i) => i.id === id)!;

async function nowCard(title = "Solve 1. Two Sum") {
  return screen.findByRole("region", { name: `Now: ${title}` }, { timeout: 4000 });
}

/** Moves the running block's start back, as if `ms` had passed. */
function pass(ms: number) {
  act(() => {
    const s = useFocusTimerStore.getState();
    if (s.startedAt !== null) useFocusTimerStore.setState({ startedAt: s.startedAt - ms });
  });
}

/** Moves the Now card's clock to `ms` of work and counts it. */
function workFor(ms: number) {
  act(() => {
    const c = useNowStore.getState().clock!;
    useNowStore.setState({ clock: { ...c, workedMs: ms - 1000, lastAt: Date.now() - 1000 } });
    tickNow();
  });
}

/** The switch in the top bar (Settings has its own). */
const topSwitch = () =>
  screen
    .getAllByRole("switch", { name: "ADHD mode" })
    .find((e) => e.hasAttribute("data-peripheral"))!;

/** A callout's box, found by its title. */
const calloutOf = async (title: string) =>
  (await screen.findByText(title, undefined, { timeout: 4000 })).closest(".rounded-panel")!;

const clockText = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

// ----- a stand-in for Web Audio --------------------------------------------------------------

const sounds: string[] = [];

function fakeAudio(): AudioContext {
  const param = () => ({
    value: 0,
    setValueAtTime(v: number) {
      this.value = v;
    },
    linearRampToValueAtTime(v: number) {
      this.value = v;
    },
    exponentialRampToValueAtTime(v: number) {
      this.value = v;
    },
    cancelScheduledValues() {},
  });
  const node = () => ({ connect: () => undefined, disconnect: () => undefined });
  return {
    state: "running",
    sampleRate: 4000,
    currentTime: 0,
    destination: node(),
    createBuffer: (_channels: number, length: number) => {
      const data = new Float32Array(length);
      return { length, getChannelData: () => data };
    },
    createBufferSource: () => ({
      ...node(),
      buffer: null,
      loop: false,
      start: () => sounds.push("noise"),
      stop: () => sounds.push("noise stops"),
    }),
    createGain: () => ({ ...node(), gain: param() }),
    createOscillator: () => {
      sounds.push("tone");
      return { ...node(), type: "sine", frequency: param(), start() {}, stop() {} };
    },
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
  } as unknown as AudioContext;
}

beforeEach(async () => {
  window.location.hash = "#/settings";
  localStorage.clear();
  clearAICache();
  sounds.length = 0;
  document.documentElement.removeAttribute("data-adhd");
  // Wait for the delete itself: when the last test's connection is still open it is blocked
  // until that connection closes, and moving on earlier lets the delete close the next app's
  // connection instead.
  await new Promise((resolve) => {
    const r = indexedDB.deleteDatabase("atlas");
    r.onsuccess = r.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 3000);
  });
});

afterEach(() => {
  cleanup();
  act(() => {
    leaveBreak();
    closePark();
    closeConceptDialogs();
    resetNow();
    dismissPlace();
    stopNoise();
  });
  setAudioContextFactory(null);
  useAdhdUi.setState({ introOpen: false });
  useCheckInStore.setState({ due: false });
  useStudyStore.setState({ start: null, end: null });
  useFocusTimerStore.setState({ held: [], heldShown: false, asking: null, ended: null });
  useToastStore.setState({ toasts: [] });
  useUiStore.setState({ paletteOpen: false, askOpen: false });
  resetClaude();
  vi.restoreAllMocks();
});

describe("the switch", () => {
  it("sits at the right of the top bar on every page; the first time, a card lists what changed", async () => {
    const user = userEvent.setup();
    await start(null);
    for (const hash of ["#/today", "#/dashboard", "#/map", "#/problems/lc-1"]) {
      await go(hash);
      expect(topSwitch()).toHaveAttribute("aria-checked", "false");
    }
    expect(document.documentElement).not.toHaveAttribute("data-adhd");

    await go("#/today");
    // With ADHD mode off, Today is as it was: Up next and the route, no Now card.
    await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 });
    expect(screen.queryByRole("region", { name: /^Now/ })).toBeNull();
    expect(screen.queryByText("Today's ink")).toBeNull();

    await user.click(topSwitch());
    const card = await screen.findByRole("dialog", { name: "ADHD mode is on" });
    expect(within(card).getByText("Calm screen:")).toBeInTheDocument();
    expect(
      within(card).getByText("focus blocks of 15 minutes with 5-minute breaks."),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(/Focus sound and Study with Claude stay off/),
    ).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-adhd")).toBe(ALL_PARTS);
    expect(localStorage.getItem("atlas.adhd")).toBe(ALL_PARTS);
    expect(useProfileStore.getState().profile!.prefs.adhd).toMatchObject({
      on: true,
      blockMinutes: 15,
      breakMinutes: 5,
      sound: "off",
      studyWithClaude: false,
    });

    await user.click(within(card).getByRole("button", { name: "Open its settings" }));
    await waitFor(() => expect(window.location.hash).toBe("#/settings?section=adhd"));
    expect(await screen.findByRole("region", { name: "ADHD mode" })).toBeInTheDocument();

    // Off and on again: the card doesn't come back.
    await user.click(topSwitch());
    expect(document.documentElement).not.toHaveAttribute("data-adhd");
    expect(localStorage.getItem("atlas.adhd")).toBeNull();
    await user.click(topSwitch());
    expect(useProfileStore.getState().profile!.prefs.adhd?.on).toBe(true);
    expect(screen.queryByRole("dialog", { name: "ADHD mode is on" })).toBeNull();
  });

  it("turns on from the palette, and each part turns off on its own in Settings", async () => {
    const user = userEvent.setup();
    await start(null);
    await go("#/map");
    await user.keyboard("{Control>}k{/Control}");
    const input = await screen.findByPlaceholderText("Search concepts, problems and pages");
    await user.type(input, "ADHD");
    // The first keystroke builds the search index, which takes seconds on a loaded machine (CI).
    await user.click(await screen.findByText("Turn on ADHD mode", undefined, { timeout: 12_000 }));
    expect(useProfileStore.getState().profile!.prefs.adhd?.on).toBe(true);
    await user.click(await screen.findByRole("button", { name: "Got it" }));

    await go("#/settings?section=adhd");
    const section = await screen.findByRole("region", { name: "ADHD mode" });
    await user.click(within(section).getByRole("switch", { name: "Calm screen" }));
    expect(useProfileStore.getState().profile!.prefs.adhd?.calm).toBe(false);
    expect(document.documentElement.getAttribute("data-adhd")).toBe(ALL_PARTS.replace("calm ", ""));
    // Options of a part show under its switch: the block and break lengths.
    await user.selectOptions(
      within(section).getByLabelText("Focus block length in ADHD mode"),
      "20",
    );
    expect(useProfileStore.getState().profile!.prefs.adhd?.blockMinutes).toBe(20);
    await user.click(within(section).getByRole("switch", { name: "Breaks that work" }));
    expect(within(section).queryByLabelText("Focus block length in ADHD mode")).toBeNull();
    // Turning the mode off keeps every choice for next time.
    await user.click(within(section).getByRole("switch", { name: "ADHD mode" }));
    expect(useProfileStore.getState().profile!.prefs.adhd).toMatchObject({
      on: false,
      calm: false,
      breaks: false,
      blockMinutes: 20,
    });
    expect(within(section).getByText(/The parts below apply while ADHD mode is on/)).toBeTruthy();
  });
});

describe("the calm screen", () => {
  it("keeps the sidebar to icons without badges, and folds Today's and the dashboard's extras", async () => {
    const user = userEvent.setup();
    await start(null);
    // A review due today, so the sidebar has a badge to drop.
    act(() => {
      saveAttempt({
        problemId: "lc-1",
        startedAt: nowIso(),
        language: "cpp",
        code: "int main() {}",
        result: "solved_alone",
        hintsUsed: 0,
        mistakeTagIds: [],
        mode: "normal",
      });
    });
    const { setProblemDueDates } = await import("@/stores/problemStore");
    act(() => void setProblemDueDates({ "lc-1": localDate() }));
    await go("#/today");
    await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 });
    const nav = screen.getAllByRole("navigation", { name: "Main" })[0]!;
    expect(within(nav).getByText(/^1/, { selector: "span" })).toHaveTextContent("1 due");
    expect(within(nav).getByRole("button", { name: /(Collapse|Expand) sidebar/ })).toBeTruthy();
    expect(screen.getByText("Your atlas")).toBeInTheDocument();

    adhdOn();
    await screen.findByRole("region", { name: /^Now/ }, { timeout: 4000 });
    expect(within(nav).queryByText(/due$/)).toBeNull();
    expect(within(nav).queryByRole("button", { name: /(Collapse|Expand) sidebar/ })).toBeNull();
    expect(within(nav).getByRole("link", { name: "Review" })).toBeInTheDocument();
    expect(screen.queryByText("Your atlas")).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Show more: your streak/ }));
    expect(screen.getByText("Your atlas")).toBeInTheDocument();

    await go("#/dashboard");
    const more = await screen.findByRole(
      "button",
      { name: /^Show more: patterns, charts/ },
      { timeout: 6000 },
    );
    expect(screen.queryByText("Activity this year")).toBeNull();
    await user.click(more);
    expect(await screen.findByText("Activity this year")).toBeInTheDocument();
  });
});

describe("the Now card", () => {
  it("shows the first stop alone with its steps, ticks them, and folds the rest", async () => {
    const user = userEvent.setup();
    await start();
    plan();
    await go("#/today");
    const now = await nowCard();
    expect(within(now).getByText("Now · stop 1 of 3")).toBeInTheDocument();
    expect(within(now).getByText("15 min planned")).toBeInTheDocument();
    const steps = within(now).getByRole("list", { name: "Steps" });
    expect(
      within(steps)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Read itYou are here", "Name the pattern", "Plan", "Code", "Test", "Save"]);
    await user.click(within(steps).getByRole("button", { name: /^Read it/ }));
    expect(planItem("p1").steps).toEqual([true, false, false, false, false, false]);
    expect(within(steps).getByRole("button", { name: /^Read it/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(steps).getByRole("button", { name: /^Name the pattern/ })).toHaveTextContent(
      "You are here",
    );
    // Each finished step drops ink.
    expect(screen.getByRole("img", { name: "1 step done today, 12 to go" })).toBeInTheDocument();

    // The rest of the day is folded until asked for.
    expect(screen.queryByRole("list", { name: "Plan items" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Then: 2 more stops today/ }));
    expect(screen.getByRole("list", { name: "Plan items" })).toBeInTheDocument();

    // Park a thought and Swap this task are on the card.
    await user.click(within(now).getByRole("button", { name: "Park a thought" }));
    expect(await screen.findByRole("dialog", { name: "Park a thought" })).toBeInTheDocument();
    act(() => closePark());
    await user.click(within(now).getByRole("button", { name: "Swap this task" }));
    expect(
      await screen.findByRole("dialog", { name: "Swap Solve 1. Two Sum" }),
    ).toBeInTheDocument();
  });

  it("starts with 2 minutes, then asks to keep going or stop there", async () => {
    const user = userEvent.setup();
    await start();
    const p = plan();
    await go("#/today");
    await user.click(within(await nowCard()).getByRole("button", { name: "Start with 2 minutes" }));
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/problems\/lc-1/));
    expect(useNowStore.getState().clock).toMatchObject({ itemId: "p1", trial: "on" });

    workFor(TRIAL_MS);
    const note = await screen.findByRole("region", { name: "Two minutes done" });
    await user.click(within(note).getByRole("button", { name: "Stop here" }));
    expect(await screen.findByText(/Starting is the hard part, and you did it/)).toBeTruthy();
    expect(useNowStore.getState().clock).toMatchObject({ lastAt: null, trial: undefined });
    expect(planItem("p1").done).toBe(false);

    await go("#/today");
    const card = await nowCard();
    expect(within(card).getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Done with this step" })).toBeInTheDocument();

    // Another 2-minute start, kept going.
    act(() => startNow(p.date, p.items[0]!, { trial: true }));
    workFor(TRIAL_MS + 30_000);
    const again = await screen.findByRole("region", { name: "Two minutes done" });
    await user.click(within(again).getByRole("button", { name: "Keep going" }));
    expect(useNowStore.getState().clock?.trial).toBeUndefined();
    expect(useNowStore.getState().clock?.lastAt).not.toBeNull();
    expect(screen.queryByRole("region", { name: "Two minutes done" })).toBeNull();
  });

  it("opens the hints for a problem, and Ask Claude beside the lesson when stuck on one", async () => {
    const user = userEvent.setup();
    await start();
    plan();
    await go("#/today");
    await user.click(within(await nowCard()).getByRole("button", { name: "I'm stuck" }));
    await waitFor(() => expect(window.location.hash).toBe("#/problems/lc-1?panel=hints"));
    expect(await screen.findByRole("region", { name: "Hints" }, { timeout: 4000 })).toBeTruthy();

    act(() => setPlanItemSkipped(localDate(), "p1", true));
    await go("#/today");
    const lesson = await nowCard("Learn: Variable-size window");
    expect(within(lesson).getByText("Now · stop 1 of 2")).toBeInTheDocument();
    await user.click(within(lesson).getByRole("button", { name: "I'm stuck" }));
    await waitFor(() => expect(window.location.hash).toBe(`#/concept/${CONCEPT}`));
    expect(useUiStore.getState().askOpen).toBe(true);
  });
});

describe("time you can see", () => {
  it("shows a disc on the Now card, the workspace, drills, flashcards and designs, and none when off", async () => {
    const user = userEvent.setup();
    await start();
    plan();
    await go("#/today");
    const now = await nowCard();
    expect(
      within(now).getAllByRole("timer", {
        name: "Time planned for this stop: 15 minutes left of 15",
      }).length,
    ).toBeGreaterThan(0);

    await go("#/problems/lc-1");
    await user.click(await screen.findByRole("tab", { name: "Code" }, { timeout: 4000 }));
    expect(
      await screen.findByRole(
        "timer",
        { name: /^Time planned for this problem, 15 minutes: / },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();

    await go("#/drill");
    await user.click(await screen.findByRole("button", { name: /^Start/ }));
    expect(await screen.findByRole("timer", { name: /^Time for this prompt: / })).toBeTruthy();

    await go("#/today");
    act(() => openFlashcards({ conceptIds: [CONCEPT], title: "Flashcards: Variable-size window" }));
    const cards = await screen.findByRole("dialog", { name: "Flashcards: Variable-size window" });
    // One concept's deck starts at once.
    expect(
      await within(cards).findByRole(
        "timer",
        { name: /^Time for this round, about \d+ minutes: / },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    act(() => closeConceptDialogs());

    await waitFor(() => expect(useDesignStore.getState().loaded).toBe(true));
    await go("#/designs/hld-url-shortener");
    await user.click(
      await screen.findByRole("button", { name: "Start the design" }, { timeout: 4000 }),
    );
    expect(await screen.findByRole("timer", { name: /^Time for the design: / })).toBeTruthy();

    // With the part off there's no disc; the round keeps its own clock.
    act(() => setAdhdPart("time", false));
    await waitFor(() => expect(screen.queryAllByTestId("disc-timer")).toHaveLength(0));
    expect(screen.getByRole("timer", { name: "Time left" })).toBeInTheDocument();
    await go("#/problems/lc-1");
    await user.click(await screen.findByRole("tab", { name: "Code" }, { timeout: 4000 }));
    expect(await screen.findByRole("group", { name: "Attempt timer" })).toBeInTheDocument();
    expect(screen.queryAllByTestId("disc-timer")).toHaveLength(0);
  });

  it("sounds the soft chime at half time when it's chosen", async () => {
    setAudioContextFactory(fakeAudio);
    await start({ chime: true });
    const p = plan();
    await go("#/today");
    await nowCard();
    act(() => startNow(p.date, p.items[0]!));
    workFor(7 * 60_000);
    expect(sounds).toEqual([]);
    workFor(8 * 60_000);
    await waitFor(() => expect(sounds).toEqual(["tone", "tone"]));
  });

  it("says how long an item took against the plan, and shows the pace in Settings", async () => {
    const user = userEvent.setup();
    await start();
    const p = plan();
    await go("#/today");
    const now = await nowCard();
    act(() => startNow(p.date, p.items[0]!));
    workFor(22 * 60_000);
    for (let i = 0; i < 6; i++) {
      await user.click(within(now).getByRole("button", { name: "Done with this step" }));
    }
    expect(planItem("p1")).toMatchObject({ done: true, took: 22 });
    const next = await nowCard("Learn: Variable-size window");
    expect(within(next).getByText("Done: Solve 1. Two Sum. Planned 15, took 22.")).toBeTruthy();
    expect(screen.getByText("Planned 15, took 22.")).toBeInTheDocument();

    expect(within(next).getByText("20 min planned")).toBeInTheDocument();

    // Three timed items of a kind make a pace, and estimates follow it.
    act(() => {
      for (let i = 1; i <= 3; i++) {
        recordPace("learn-concept", {
          id: `${addDaysToDate(localDate(), -i)}:x`,
          planned: 20,
          took: 30,
          at: nowIso(),
        });
      }
    });
    expect(within(next).getByText("20 min planned, about 30 at your pace")).toBeInTheDocument();
    await go("#/settings?section=adhd");
    const section = await screen.findByRole("region", { name: "ADHD mode" });
    const row = within(section).getByText("Learning a concept").closest("li")!;
    expect(row).toHaveTextContent("about 1.5 times the plan (from 3)");
    // One timed new problem isn't a pace yet.
    expect(within(section).queryByText("New problems")).toBeNull();
  });
});

describe("where you left off", () => {
  it("shows after 10 minutes or more away, with the stop and step, and leads back", async () => {
    const user = userEvent.setup();
    await start(null);
    localStorage.setItem(
      "atlas.place",
      JSON.stringify({
        path: "/problems/lc-1",
        title: "1. Two Sum",
        at: Date.now() - 15 * 60_000,
        item: "Solve 1. Two Sum",
        step: { index: 1, count: 6, text: "Name the pattern" },
      }),
    );
    await go("#/map");
    adhdOn();
    const card = (await calloutOf("Where you left off")) as HTMLElement;
    expect(card).toHaveTextContent(
      "You were on 1. Two Sum. Your stop: Solve 1. Two Sum, step 2 of 6: Name the pattern.",
    );
    await user.click(within(card).getByRole("button", { name: "Go back there" }));
    await waitFor(() => expect(window.location.hash).toBe("#/problems/lc-1"));
    expect(screen.queryByText("Where you left off")).toBeNull();
  });
});

describe("rewards right away", () => {
  it("drop ink for every finished step and put a flag on the week for a finished day", async () => {
    await start();
    plan();
    await go("#/today");
    await nowCard();
    expect(screen.getByText(/^A finished day adds a flag here\./)).toBeInTheDocument();
    act(() => {
      for (const id of ["p1", "l1", "d1"]) setPlanItemDone(localDate(), id, true);
    });
    expect(
      await screen.findByRole("img", { name: "13 steps done today" }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/\(today\): plan finished, a flag/)).toBeInTheDocument();
    expect(screen.getByText(/^1 finished day this week\./)).toBeInTheDocument();
    // Undoing a stop takes nothing away.
    act(() => setPlanItemDone(localDate(), "d1", false));
    expect(screen.getByRole("img", { name: /^13 steps done today/ })).toBeInTheDocument();
    expect(screen.getByText(/\(today\): plan finished, a flag/)).toBeInTheDocument();
  });
});

describe("breaks that work", () => {
  it("run 15-minute blocks with a movement idea on the break", async () => {
    const user = userEvent.setup();
    await start();
    plan();
    await go("#/today");
    await nowCard();
    await user.keyboard("f");
    const dialog = await screen.findByRole("dialog", { name: "Start a focus block" });
    expect(
      within(dialog).getByText(/15 minutes of focus, then a 5-minute break\./),
    ).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(await screen.findByText(/^Break in 15 minutes:/)).toBeInTheDocument();
    pass(15 * 60_000);
    const view = await screen.findByRole("dialog", { name: "Break" }, { timeout: 3000 });
    const text = view.textContent!.toLowerCase();
    expect(MOVEMENT_PROMPTS.some((m) => text.includes(m.slice(1).toLowerCase()))).toBe(true);
  });

  it("check in after 90 minutes without a break: Take 5 starts one, Not now waits", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/map");
    act(() => noteActivity(CHECK_IN_AFTER_MS + 60_000));
    const note = await screen.findByRole("region", { name: "Time for water and a stretch?" });
    await user.click(within(note).getByRole("button", { name: "Take 5" }));
    expect(await screen.findByRole("dialog", { name: "Break" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Time for water and a stretch?" })).toBeNull();
    act(() => leaveBreak());

    act(() => useCheckInStore.setState({ due: true }));
    const again = await screen.findByRole("region", { name: "Time for water and a stretch?" });
    await user.click(within(again).getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("region", { name: "Time for water and a stretch?" })).toBeNull();
    expect(useFocusTimerStore.getState().mode).toBe("focus");
  });
});

describe("starting help", () => {
  it("keeps an if-then line for the day or every day, and reminds at its clock time", async () => {
    const user = userEvent.setup();
    await start();
    plan();
    await go("#/today");
    await nowCard();
    // Until there's a line, a slim row asks; it opens the form with the field focused.
    await user.click(screen.getByRole("button", { name: /^Plan your start: when will you begin/ }));
    expect(
      screen.getByLabelText("Plan your start: when will you begin the first stop?"),
    ).toHaveFocus();
    await user.type(
      screen.getByLabelText("Plan your start: when will you begin the first stop?"),
      "I finish dinner",
    );
    await user.click(screen.getByRole("button", { name: "Just for today" }));
    const line = screen.getByRole("region", { name: "Your start plan" });
    expect(line).toHaveTextContent("Your plan: When I finish dinner, I'll start the first stop.");
    expect(line).toHaveTextContent("Just for today.");
    expect(useProfileStore.getState().profile!.prefs.adhd?.startWhenDay).toEqual({
      date: localDate(),
      text: "I finish dinner",
    });

    // A clock time, every day: the reminder shows from that time while Atlas is open.
    const at = clockText(new Date(Date.now() - 2 * 60_000));
    await user.click(within(line).getByRole("button", { name: "Change your start plan" }));
    const field = screen.getByLabelText("Plan your start: when will you begin the first stop?");
    await user.clear(field);
    await user.type(field, `it's ${at}`);
    await user.click(screen.getByRole("button", { name: "Every day" }));
    expect(screen.getByRole("region", { name: "Your start plan" })).toHaveTextContent(
      `Every day. Atlas reminds you at ${at} while it's open.`,
    );
    const note = await screen.findByRole("region", { name: "Time to start" });
    expect(note).toHaveTextContent(`It's ${at}`);
    expect(note).toHaveTextContent("It's Solve 1. Two Sum.");
    await user.click(within(note).getByRole("button", { name: "Go to the first stop" }));
    expect(screen.queryByRole("region", { name: "Time to start" })).toBeNull();
    expect(localStorage.getItem("atlas.startLineShown")).toBe(localDate());
  });
});

describe("reading support", () => {
  it("shows a level one part at a time, each with a quick check recorded as a check", async () => {
    const user = userEvent.setup();
    await start({ lineFocus: true });
    await go(`#/concept/${CONCEPT}`);
    await user.click(await screen.findByRole("radio", { name: "Interview" }, { timeout: 4000 }));
    expect(await screen.findByText("Part 1 of 2")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Part 2 of 2" })).toBeNull();
    // Without the browser's voice, Read aloud stays hidden.
    expect(screen.queryByRole("button", { name: /^Read aloud/ })).toBeNull();
    const check = screen.getByRole("region", { name: "Quick check after part 1" });
    await user.click(within(check).getByRole("button", { name: "Show the answer" }));
    await user.click(within(check).getByRole("button", { name: /^Good/ }));
    expect(within(check).getByText("Saved as a check: Good.")).toBeInTheDocument();
    const [saved] = useConceptStateStore.getState().checks[CONCEPT] ?? [];
    expect(saved).toMatchObject({
      kind: "flashcard",
      score: 0.8,
      detail: { source: "reading", level: "interview", part: 1, rating: "good" },
    });

    await user.click(screen.getByRole("button", { name: "Next part" }));
    expect(await screen.findByRole("region", { name: "Part 2 of 2" })).toBeInTheDocument();
    expect(screen.getByText("Part 2 of 2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next part" })).toBeNull();
    // The line focus marks the reading column.
    expect(document.querySelector("[data-line-focus]")).not.toBeNull();
  });

  it("reads the newest part aloud with the browser's voice, and stops", async () => {
    const spoken: string[] = [];
    const cancel = vi.fn();
    class Utterance {
      text: string;
      onend: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    vi.stubGlobal("speechSynthesis", {
      speak: (u: Utterance) => spoken.push(u.text),
      cancel,
      getVoices: () => [],
    });
    const user = userEvent.setup();
    await start();
    await go(`#/concept/${CONCEPT}`);
    await user.click(await screen.findByRole("radio", { name: "Simple" }, { timeout: 4000 }));
    await user.click(await screen.findByRole("button", { name: "Read aloud: part 1" }));
    expect(spoken.length).toBeGreaterThan(0);
    expect(spoken[0]).not.toMatch(/[*#`]/);
    await user.click(screen.getByRole("button", { name: "Stop reading" }));
    expect(cancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Read aloud: part 1" })).toBeInTheDocument();
  });
});

describe("focus sound", () => {
  it("is off by default, plays while a block runs once chosen, and stops at the block's end", async () => {
    setAudioContextFactory(fakeAudio);
    await start();
    await go("#/map");
    const { startBlock } = await import("@/stores/focusTimerStore");
    act(() => startBlock("Learn paging"));
    expect(sounds).toEqual([]);
    act(() => setAdhd({ sound: "brown", volume: 0.4 }));
    await waitFor(() => expect(sounds).toEqual(["noise"]));
    act(() => finishBlock());
    await waitFor(() => expect(sounds).toEqual(["noise", "noise stops"]));
    await go("#/settings?section=adhd");
    const section = await screen.findByRole("region", { name: "ADHD mode" });
    expect(within(section).getByRole("radio", { name: "Brown" })).toBeChecked();
    expect(within(section).getByRole("button", { name: "Play a sample" })).toBeEnabled();
  });
});

describe("Study with Claude", () => {
  async function block(user: ReturnType<typeof userEvent.setup>, line: string) {
    await go("#/map");
    await user.keyboard("f");
    const dialog = await screen.findByRole("dialog", { name: "Start a focus block" });
    const field = within(dialog).getByLabelText("In this block I will…");
    await user.clear(field);
    await user.type(field, `${line}{Enter}`);
  }

  for (const mode of ["sample", "api"] as const) {
    it(`gives a word at the start and a reply after the block (${mode === "sample" ? "built-in Claude" : "API key"})`, async () => {
      const user = userEvent.setup();
      await setupMode(mode);
      act(() => useProfileStore.getState().update({ onboardingDone: true, track: "sde" }));
      adhdOn();
      await go("#/settings?section=adhd");
      const section = await screen.findByRole("region", { name: "ADHD mode" });
      await user.click(
        within(section).getByRole("switch", { name: "Study with Claude (an experiment)" }),
      );
      expect(useProfileStore.getState().profile!.prefs.adhd?.studyWithClaude).toBe(true);

      await block(user, "Learn paging");
      const note = await screen.findByRole("region", { name: "A word from Claude" });
      await waitFor(() =>
        expect(note).toHaveTextContent(
          'Good plan for 15 minutes. Start by opening it and writing down the first small step of "Learn paging".',
        ),
      );
      if (mode === "api") {
        const body = apiRequests[0] as unknown as {
          model: string;
          messages: { content: string }[];
        };
        expect(body.messages.at(-1)!.content).toContain("starting a 15-minute focus block");
        expect(body.model).toBe(useProfileStore.getState().profile!.ai.tierModels.quick);
      }

      pass(15 * 60_000);
      const view = await screen.findByRole("dialog", { name: "Break" }, { timeout: 3000 });
      await user.type(within(view).getByLabelText(/A note for Claude/), "Got stuck on page tables");
      await user.click(within(view).getByRole("button", { name: /^Partly/ }));
      await waitFor(() =>
        expect(within(view).getByText(/^Part of it is done, and that counts\./)).toBeTruthy(),
      );
      expect(screen.queryByRole("region", { name: "A word from Claude" })).toBeNull();
      if (mode === "api") {
        expect(apiRequests.at(-1)!.messages.at(-1)!.content).toContain(
          'it went: Partly. Their note: "Got stuck on page tables"',
        );
      }
    });
  }

  it("stays hidden in copy prompt mode and never asks", async () => {
    const user = userEvent.setup();
    await setupMode("copy");
    act(() => useProfileStore.getState().update({ onboardingDone: true, track: "sde" }));
    adhdOn({ studyWithClaude: true });
    await go("#/settings?section=adhd");
    const section = await screen.findByRole("region", { name: "ADHD mode" });
    expect(within(section).queryByRole("switch", { name: /Study with Claude/ })).toBeNull();

    await block(user, "Learn paging");
    expect(screen.queryByRole("region", { name: "A word from Claude" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Claude's reply" })).toBeNull();
    pass(15 * 60_000);
    const view = await screen.findByRole("dialog", { name: "Break" }, { timeout: 3000 });
    expect(within(view).queryByLabelText(/A note for Claude/)).toBeNull();
    await user.click(within(view).getByRole("button", { name: /^Done/ }));
    expect(screen.queryByRole("textbox", { name: "Claude's reply" })).toBeNull();
    expect(useStudyStore.getState()).toEqual({ start: null, end: null });
  });
});

describe("gentle language", () => {
  it("offers a fresh start when more than 30 reviews are overdue, and undoes it", async () => {
    const user = userEvent.setup();
    await start();
    const ids = LEETCODE_PROBLEMS.slice(0, 32).map((p) => p.id);
    const past = new Date(Date.now() - 20 * 86_400_000);
    act(() => {
      for (const id of ids)
        saveAttempt(
          {
            problemId: id,
            startedAt: past.toISOString(),
            language: "cpp",
            code: "int main() {}",
            result: "solved_alone",
            hintsUsed: 0,
            mistakeTagIds: [],
            mode: "normal",
          },
          past,
        );
    });
    const due = () => ids.map((id) => useProblemStore.getState().states[id]!.srs.dueAt!);
    const before = due();
    expect(before.every((d) => d < localDate())).toBe(true);
    await go("#/review");
    const offer = (await calloutOf("Make a fresh start?")) as HTMLElement;
    expect(offer).toHaveTextContent("32 reviews are waiting from earlier days.");
    await user.click(within(offer).getByRole("button", { name: "Fresh start" }));
    const after = due();
    expect(after.every((d) => d >= localDate() && d <= addDaysToDate(localDate(), 6))).toBe(true);
    expect(new Set(after).size).toBe(7);
    expect(screen.queryByText("Make a fresh start?")).toBeNull();
    const toast = await screen.findByText(/^A fresh start: 32 reviews spread over the next 7 days/);
    await user.click(
      within(toast.closest("[role]") as HTMLElement).getByRole("button", { name: "Undo" }),
    );
    expect(due()).toEqual(before);
  });

  it("welcomes the owner back after 3 days away without counting the missed days", async () => {
    const user = userEvent.setup();
    await start(null);
    act(() => recordActivity(addDaysToDate(localDate(), -5), { checks: 2 }));
    await go("#/today");
    await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 });
    expect(screen.queryByText("Welcome back")).toBeNull();
    adhdOn();
    const hello = (await calloutOf("Welcome back")) as HTMLElement;
    expect(hello).toHaveTextContent("Good to see you. Start small: the first stop is ready below.");
    expect(hello.textContent).not.toMatch(/\d/);
    await user.click(within(hello).getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Welcome back")).toBeNull();
    expect(localStorage.getItem("atlas.welcomeBack")).toBe(localDate());
  });
});
