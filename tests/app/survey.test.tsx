// @vitest-environment jsdom
// The Survey screens (Phase 9 session 9.2, BUILD_SPEC.md 12.10.7 and 12.10.8): what the new parts
// do, not how they look. Focus subjects in the sidebar, Today's Up next and route, the streak
// strip, the dashboard's summit profile and stamps, the concept page head and Check yourself,
// and the weekly review's logbook head.
import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/app/App";
import { conceptById } from "@/data/syllabus";
import { addDaysToDate, localDate } from "@/lib/time";
import { useDataReady } from "@/stores/hydrate";
import { usePlanStore } from "@/stores/planStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

async function start(focus: string[] = []) {
  render(<App />);
  await waitFor(() => {
    expect(useProfileStore.getState().profile).not.toBeNull();
    expect(useDataReady.getState().ready).toBe(true);
  });
  act(() =>
    useProfileStore.getState().update({ onboardingDone: true, track: "sde", focusSubjects: focus }),
  );
}

const planNow = () => usePlanStore.getState().plans[localDate()];

beforeEach(async () => {
  window.location.hash = "#/settings";
  localStorage.clear();
  await new Promise((resolve) => {
    const r = indexedDB.deleteDatabase("atlas");
    r.onsuccess = r.onerror = r.onblocked = () => resolve(null);
  });
});

afterEach(() => {
  cleanup();
  useUiStore.setState({ paletteOpen: false });
});

describe("the app frame", () => {
  it("lists the focus subjects in the sidebar, each opening its region on the map", async () => {
    await start(["os", "dsa"]);
    const focus = screen.getByRole("list", { name: "Your focus" });
    const links = within(focus).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "#/map?subject=os",
      "#/map?subject=dsa",
    ]);
  });

  it("shows no focus list without focus subjects", async () => {
    await start([]);
    expect(screen.queryByRole("list", { name: "Your focus" })).toBeNull();
  });
});

describe("Today", () => {
  it("leads with the first stop not done, and moves on when it is done", async () => {
    const user = userEvent.setup();
    await start();
    await go("#/today");
    const route = await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 });
    const plan = planNow()!;
    const [first, second] = plan.items;
    const upNext = screen.getByRole("region", { name: `Up next: ${first!.title}` });
    expect(within(upNext).getByRole("heading", { name: first!.title })).toBeInTheDocument();
    // The next stop is on the route, marked, without its own buttons (they're on the card).
    const stop = within(route)
      .getByRole("checkbox", { name: `Done: ${first!.title}` })
      .closest("li")!;
    expect(within(stop).getByText("Up next")).toBeInTheDocument();
    expect(within(stop).queryByRole("button", { name: "Skip" })).toBeNull();

    await user.click(within(upNext).getByRole("button", { name: "Done" }));
    expect(planNow()!.items[0]!.done).toBe(true);
    expect(
      await screen.findByRole("region", { name: `Up next: ${second!.title}` }),
    ).toBeInTheDocument();
    // The minutes ring counts what is done against the time for today.
    expect(
      screen.getByRole("img", {
        name: `${first!.estMinutes} of ${plan.budgetMinutes} minutes done today`,
      }),
    ).toBeInTheDocument();
  });

  it("shows the last 7 days and the review count", async () => {
    await start();
    await go("#/today");
    const days = await screen.findByRole("list", { name: "The last 7 days" }, { timeout: 4000 });
    expect(within(days).getAllByRole("listitem")).toHaveLength(7);
    expect(within(days).getByText(/\(today\)/)).toBeInTheDocument();
    const review = screen.getByRole("link", { name: /Nothing is due for review/ });
    expect(review).toHaveAttribute("href", "#/review");
  });
});

describe("the dashboard", () => {
  it("starts the summit profile with the first week of study", async () => {
    await start();
    await go("#/dashboard");
    const summit = await screen.findByRole("region", { name: "Summit profile" }, { timeout: 4000 });
    expect(
      await within(summit).findByText(
        /starts with your first week of study/,
        {},
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Weekly stamps" })).toHaveTextContent(
      /5 or more active days earns a stamp/,
    );
  });

  it("climbs toward the interview, every point explained, and shows as a table", async () => {
    const user = userEvent.setup();
    await start();
    act(() => useProfileStore.getState().update({ interviewDate: addDaysToDate(localDate(), 30) }));
    await go("#/dashboard");
    const summit = await screen.findByRole("region", { name: "Summit profile" }, { timeout: 4000 });
    const today = await within(summit).findByRole(
      "button",
      { name: /^Readiness today: 0 out of 100/ },
      { timeout: 4000 },
    );
    expect(today).toHaveAttribute("tabindex", "0");
    expect(within(summit).getByText("Interview")).toBeInTheDocument();
    await user.click(within(summit).getByRole("button", { name: "Show as table" }));
    expect(within(summit).getByRole("table")).toHaveTextContent("Today");
  });
});

describe("the concept page", () => {
  it("ends each level with a short Check yourself", async () => {
    const user = userEvent.setup();
    await start();
    const concept = conceptById.get("dsa.arrays.kadanes-algorithm")!;
    await go(`#/concept/${concept.id}`);
    await screen.findByRole("heading", { level: 1, name: concept.name }, { timeout: 4000 });
    const check = await screen.findByRole("region", { name: "Check yourself" }, { timeout: 4000 });
    expect(within(check).getByRole("button", { name: "Check by explaining it" })).toBeVisible();
    await user.click(screen.getByRole("radio", { name: "Interview" }));
    expect(await screen.findByRole("region", { name: "Interview points" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Check yourself" })).getByRole("button", {
        name: "Check with flashcards",
      }),
    ).toBeInTheDocument();
  });
});

describe("the weekly review", () => {
  it("opens as a logbook page", async () => {
    await start();
    await go("#/weekly");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Weekly review" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "The week before" })).toBeInTheDocument();
  });
});
