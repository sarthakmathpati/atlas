// @vitest-environment jsdom
// The focus layer on screen (F31, session 9.3): starting a block with its line (top bar, `f`,
// a plan item), the line in the top bar, the horizon line and the lens, held notes, the break
// view with the outcome, breathing (with and without motion) and Esc, Park it and thoughts
// coming back, interview day, the wrap-up note, the memory walk, timed rounds and Settings.
import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/app/App";
import { addDaysToDate, localDate } from "@/lib/time";
import { useActivityStore } from "@/stores/activityStore";
import { closeConceptDialogs } from "@/stores/conceptDialogStore";
import { leaveBreak, useFocusTimerStore } from "@/stores/focusTimerStore";
import { useDataReady } from "@/stores/hydrate";
import { closePark, useParkStore } from "@/stores/parkStore";
import { usePlanStore } from "@/stores/planStore";
import { useProfileStore } from "@/stores/profileStore";
import { useToastStore } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

async function start(
  extra: Parameters<ReturnType<typeof useProfileStore.getState>["update"]>[0] = {},
) {
  render(<App />);
  await waitFor(() => {
    expect(useProfileStore.getState().profile).not.toBeNull();
    expect(useDataReady.getState().ready).toBe(true);
  });
  act(() => useProfileStore.getState().update({ onboardingDone: true, track: "sde", ...extra }));
}

const planNow = () => usePlanStore.getState().plans[localDate()];
const clock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Moves the running block's start back, as if `ms` had passed. */
function pass(ms: number) {
  act(() => {
    const s = useFocusTimerStore.getState();
    if (s.startedAt !== null) useFocusTimerStore.setState({ startedAt: s.startedAt - ms });
  });
}

beforeEach(async () => {
  window.location.hash = "#/settings";
  localStorage.clear();
  document.documentElement.removeAttribute("data-motion");
  await new Promise((resolve) => {
    const r = indexedDB.deleteDatabase("atlas");
    r.onsuccess = r.onerror = r.onblocked = () => resolve(null);
  });
});

afterEach(() => {
  cleanup();
  act(() => {
    leaveBreak();
    closePark();
    closeConceptDialogs();
  });
  useFocusTimerStore.setState({ held: [], heldShown: false, asking: null, ended: null });
  useToastStore.setState({ toasts: [] });
  useUiStore.setState({ paletteOpen: false });
});

describe("focus blocks", () => {
  it("start with `f` and a line from the plan, show it in the top bar and dim the edges", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/today");
    await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 });
    const first = planNow()!.items[0]!;
    await user.keyboard("f");
    const dialog = await screen.findByRole("dialog", { name: "Start a focus block" });
    const field = within(dialog).getByLabelText("In this block I will…");
    expect((field as HTMLInputElement).value).toMatch(
      /^(Re-solve|Solve|Learn|Review|Read|Do|Design|Finish|Practice)/,
    );
    await user.clear(field);
    await user.type(field, "Re-solve 69. Sqrt(x){Enter}");

    expect(useFocusTimerStore.getState()).toMatchObject({
      mode: "focus",
      running: true,
      intention: "Re-solve 69. Sqrt(x)",
    });
    expect(screen.queryByRole("dialog", { name: "Start a focus block" })).toBeNull();
    expect(screen.getAllByTestId("focus-line")[0]).toHaveTextContent(
      "In this block: re-solve 69. Sqrt(x)",
    );
    // The horizon line runs along the top edge, and the lens dims what's marked peripheral.
    const horizon = screen.getByTestId("window-horizon");
    expect(within(horizon).getByText("", { selector: "[data-horizon='solid']" })).toBeTruthy();
    expect(document.documentElement).toHaveAttribute("data-focus-lens");
    expect(screen.getAllByRole("navigation", { name: "Main" })[0]).toHaveAttribute(
      "data-peripheral",
    );
    // A plan item's own button is gone while the block runs.
    const upNext = screen.getByRole("region", { name: `Up next: ${first.title}` });
    expect(within(upNext).queryByRole("button", { name: "Start a focus block" })).toBeNull();
  });

  it("start from a plan item with its line, and turn the lens off when dimming is off", async () => {
    const user = userEvent.setup();
    await start();
    act(() => useProfileStore.getState().updatePrefs({ focus: { dim: false } }));
    await go("#/today");
    await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 });
    const first = planNow()!.items[0]!;
    const upNext = screen.getByRole("region", { name: `Up next: ${first.title}` });
    await user.click(within(upNext).getByRole("button", { name: "Start a focus block" }));
    const dialog = await screen.findByRole("dialog", { name: "Start a focus block" });
    await user.click(within(dialog).getByRole("button", { name: "Start the block" }));
    expect(useFocusTimerStore.getState().planItemId).toBe(first.id);
    expect(document.documentElement).not.toHaveAttribute("data-focus-lens");
  });

  it("end in the break view: say how it went, breathe, then go back to work", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/map");
    await user.keyboard("f");
    const dialog = await screen.findByRole("dialog", { name: "Start a focus block" });
    await user.type(within(dialog).getByLabelText("In this block I will…"), "Learn paging{Enter}");
    pass(25 * 60_000);
    const view = await screen.findByRole("dialog", { name: "Break" }, { timeout: 3000 });
    // The horizon line stops at the break; the tide line shows the break's time instead.
    expect(screen.queryByTestId("window-horizon")).toBeNull();
    expect(within(view).getByTestId("tide-line")).toBeInTheDocument();
    expect(within(view).getByText(/How did it go\?/)).toHaveTextContent("learn paging");
    await user.click(within(view).getByRole("button", { name: /^Done/ }));
    const day = useActivityStore.getState().months[localDate().slice(0, 7)]!.days[localDate()]!;
    expect(day.focusBlocks).toEqual({ done: 1 });
    expect(within(view).getByText("Counted as done.")).toBeInTheDocument();

    await user.click(within(view).getByRole("button", { name: "Breathe for a minute" }));
    const ring = within(view).getByTestId("breath-ring");
    expect(ring).toHaveAttribute("data-phase", "in");
    expect(within(view).getByText("Breathe in")).toBeInTheDocument();
    expect(within(view).getByText("Breath 1 of 6")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Break" })).toBeNull());
    expect(useFocusTimerStore.getState()).toMatchObject({ mode: "focus", running: false });
  });

  it("breathe with a text count when motion is reduced", async () => {
    const user = userEvent.setup();
    await start();
    act(() => useProfileStore.getState().updatePrefs({ reducedMotion: "on" }));
    await go("#/map");
    await user.click(screen.getByRole("button", { name: "Focus timer" }));
    await user.click(await screen.findByRole("button", { name: /minute break/ }));
    const view = await screen.findByRole("dialog", { name: "Break" });
    await user.click(within(view).getByRole("button", { name: "Breathe for a minute" }));
    expect(within(view).queryByTestId("breath-ring")).toBeNull();
    expect(within(view).getByTestId("breath-count")).toHaveTextContent("1");
    await user.click(within(view).getByRole("button", { name: "Back to work" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Break" })).toBeNull());
  });

  it("hold notes for the break: the backup reminder waits and the top bar counts it", async () => {
    await start({ createdAt: new Date(Date.now() - 40 * 86_400_000).toISOString() });
    await go("#/map");
    expect(await screen.findByText("Time for a backup")).toBeInTheDocument();
    act(() =>
      useFocusTimerStore.setState({
        mode: "focus",
        running: true,
        startedAt: Date.now(),
        intention: "Learn paging",
      }),
    );
    await waitFor(() => expect(screen.queryByText("Time for a backup")).toBeNull());
    expect(screen.getByRole("button", { name: "1 note held for your break" })).toBeInTheDocument();
    pass(25 * 60_000);
    await screen.findByRole("dialog", { name: "Break" }, { timeout: 3000 });
    act(() => leaveBreak());
    expect(await screen.findByText("Time for a backup")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /held for your break/ })).toBeNull();
  });
});

describe("Park it", () => {
  it("parks a thought with `p`, and brings it back at its time with Add to today", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/map");
    await user.keyboard("p");
    const dialog = await screen.findByRole("dialog", { name: "Park a thought" });
    await user.click(within(dialog).getByRole("radio", { name: "Tonight" }));
    await user.type(
      within(dialog).getByLabelText("What's on your mind?"),
      "Look up TCP slow start{Enter}",
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Park a thought" })).toBeNull(),
    );
    const [thought] = Object.values(useParkStore.getState().thoughts);
    expect(thought).toMatchObject({ text: "Look up TCP slow start", when: "tonight" });
    expect(screen.queryByRole("region", { name: /parked is back/ })).toBeNull();

    // Its time comes.
    act(() =>
      useParkStore.setState((s) => ({
        thoughts: {
          [thought!.id]: {
            ...s.thoughts[thought!.id]!,
            dueAt: new Date(Date.now() - 1000).toISOString(),
          },
        },
      })),
    );
    const back = await screen.findByRole("region", { name: "A thought you parked is back" });
    expect(within(back).getByText("Look up TCP slow start")).toBeInTheDocument();
    expect(within(back).getByText("Parked for tonight")).toBeInTheDocument();
    await user.click(within(back).getByRole("button", { name: "Add to today" }));
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "A thought you parked is back" })).toBeNull(),
    );
    expect(
      planNow()!.items.some((i) => i.kind === "thought" && i.title === "Look up TCP slow start"),
    ).toBe(true);
  });
});

describe("interview day", () => {
  it("opens a calm view on the interview date and the day before, with a link to the plan", async () => {
    const user = userEvent.setup();
    await start({ interviewDate: localDate() });
    await go("#/today");
    expect(
      await screen.findByRole("heading", { name: "Your interview is today" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Plan items" })).toBeNull();
    expect(screen.getByRole("link", { name: "Open the 1-day revision sheet" })).toHaveAttribute(
      "href",
      "#/revision?scope=day",
    );
    expect(screen.getByRole("heading", { name: "Your mistake checklist" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Park a worry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Breathe for a minute" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Show today's plan" }));
    expect(
      await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to the interview day view" }),
    ).toBeInTheDocument();

    act(() => useProfileStore.getState().update({ interviewDate: addDaysToDate(localDate(), 1) }));
    await go("#/today");
    expect(
      await screen.findByRole("heading", { name: "Your interview is tomorrow" }),
    ).toBeInTheDocument();

    act(() => useProfileStore.getState().update({ interviewDate: addDaysToDate(localDate(), 2) }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: /Your interview is/ })).toBeNull(),
    );
    expect(
      await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});

describe("the wrap-up note", () => {
  it("shows 30 minutes before bedtime and puts tonight's thoughts on tomorrow's plan", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/map");
    expect(screen.queryByText("Wrap up soon")).toBeNull();
    const bedtime = clock(new Date(Date.now() + 20 * 60_000));
    act(() => useProfileStore.getState().updatePrefs({ bedtime }));
    await go("#/review");
    expect(await screen.findByText("Wrap up soon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Park what's left" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Plan tomorrow" }));
    expect(await screen.findByText(/Nothing is parked for tonight/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByText("Wrap up soon")).toBeNull());
  });
});

describe("the memory walk", () => {
  it("orders a topic's flashcards as a walk with a strip of stops", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/quiz");
    await user.selectOptions(await screen.findByLabelText("Subject"), "os");
    await user.selectOptions(screen.getByLabelText("Topic"), "os.memory");
    const buttons = screen.getAllByRole("button", { name: "Start flashcards" });
    await user.click(buttons[buttons.length - 1]!);
    const dialog = await screen.findByRole("dialog", { name: "Flashcards: Memory management" });
    await user.click(within(dialog).getByRole("button", { name: "Start" }));
    const walk = await within(dialog).findByRole(
      "list",
      { name: "Memory walk" },
      { timeout: 5000 },
    );
    expect(within(walk).getAllByRole("listitem").length).toBeGreaterThan(5);
    expect(within(walk).getByText(/, here$/)).toBeInTheDocument();
  });
});

describe("timed rounds", () => {
  it("show the horizon line on a drill prompt", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/drill");
    await user.click(await screen.findByRole("button", { name: /^Start/ }));
    const line = await screen.findByRole("progressbar", { name: "Time left for this prompt" });
    expect(line).toHaveAttribute("data-horizon", "solid");
  });
});

describe("Settings", () => {
  it("has focus sessions and the optional bedtime", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/settings?section=focus");
    const section = await screen.findByRole("region", { name: "Focus sessions" });
    await user.click(within(section).getByRole("switch", { name: "Hold notes for the break" }));
    expect(useProfileStore.getState().profile!.prefs.focus).toMatchObject({
      holdNotices: false,
      dim: true,
    });
    await user.click(within(section).getByRole("switch", { name: "Fill the screen on breaks" }));
    expect(useProfileStore.getState().profile!.prefs.focus?.breakView).toBe(false);

    const appearance = screen.getByRole("region", { name: "Appearance" });
    await user.click(
      within(appearance).getByRole("switch", { name: "Wrap-up note before bedtime" }),
    );
    expect(useProfileStore.getState().profile!.prefs.bedtime).toBe("23:00");
    expect(within(appearance).getByLabelText("Bedtime")).toHaveValue("23:00");
    await user.click(
      within(appearance).getByRole("switch", { name: "Wrap-up note before bedtime" }),
    );
    expect(useProfileStore.getState().profile!.prefs.bedtime).toBeUndefined();
  });
});
