// @vitest-environment jsdom
// Phase 3 screens in the real app: the library's filters and quick add (F6), re-solve mode's
// hidden content (F9), the review queue and badge (F9), and the mistake journal (F8).
import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/app/App";
import { planCsvImport } from "@/lib/problems/csv";
import { applyCsvPlan, saveAttempt, updateProblem, useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

async function ready() {
  render(<App />);
  await waitFor(() => {
    expect(useProfileStore.getState().profile).not.toBeNull();
    expect(useProblemStore.getState().loaded).toBe(true);
  });
}

const csvOptions = {
  monthFirst: false,
  defaultResult: "solved_alone" as const,
  addUnmatched: true,
};

describe("problem tracker screens", () => {
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    useUiStore.setState({ quickAddOpen: false, csvImportOpen: false, paletteOpen: false });
  });

  it("lists problems and filters them from the URL and the search box", async () => {
    const user = userEvent.setup();
    await ready();
    await go("#/problems?difficulty=hard&topic=dsa.arrays");
    const table = await screen.findByRole("table", { name: "Problems" }, { timeout: 4000 });
    expect(
      within(table).getByRole("link", { name: "41. First Missing Positive" }),
    ).toBeInTheDocument();
    expect(within(table).queryByRole("link", { name: "1. Two Sum" })).toBeNull();
    await go("#/problems");
    const search = await screen.findByRole("searchbox", { name: /Search problems/ });
    await user.type(search, "743");
    await waitFor(() => expect(window.location.hash).toContain("q=743"));
    const rows = within(await screen.findByRole("table", { name: "Problems" })).getAllByRole(
      "link",
      {
        name: /^\d+\. /,
      },
    );
    expect(rows.map((r) => r.textContent)).toEqual(["743. Network Delay Time"]);
  });

  it("quick add opens a match, or adds a new problem prefilled from its link", async () => {
    const user = userEvent.setup();
    await ready();
    await go("#/problems");
    await user.click(await screen.findByRole("button", { name: "Add problem" }));
    const dialog = await screen.findByRole("dialog", { name: "Add a problem" });
    const input = within(dialog).getByRole("textbox");
    await user.type(input, "https://leetcode.com/problems/two-sum/");
    expect(await within(dialog).findByText("Already in your library")).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, "https://leetcode.com/problems/count-lucky-triplets/");
    await user.click(within(dialog).getByRole("button", { name: "Add it as a new problem" }));
    expect(within(dialog).getByLabelText("Title")).toHaveValue("Count Lucky Triplets");
    await user.click(within(dialog).getByRole("button", { name: "Add problem" }));
    expect(await within(dialog).findByText("Choose a difficulty.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("radio", { name: "Medium" }));
    await user.click(within(dialog).getByRole("button", { name: "Add problem" }));
    await waitFor(() => expect(window.location.hash).toMatch(/^#\/problems\/custom-/));
    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: "Count Lucky Triplets" },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
  });

  it("hides the insight and attempts during a re-solve until revealed", async () => {
    const user = userEvent.setup();
    await ready();
    act(() => {
      saveAttempt({
        problemId: "lc-1",
        startedAt: new Date().toISOString(),
        language: "cpp",
        code: "secret code",
        result: "solved_alone",
        hintsUsed: 0,
        mistakeTagIds: [],
        mode: "normal",
      });
      updateProblem("lc-1", { insight: "Store complements in a map" });
    });
    await go("#/problems/lc-1?mode=resolve");
    // Narrow layout (jsdom has no media queries): a re-solve opens on the Code tab.
    await user.click(await screen.findByRole("tab", { name: "Problem" }, { timeout: 4000 }));
    expect(
      await screen.findByText("Your insight is hidden during the re-solve.", undefined, {
        timeout: 4000,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Store complements in a map")).toBeNull();
    expect(
      screen.getByText("Your earlier attempts are hidden during the re-solve."),
    ).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Reveal" })[0]!);
    const confirm = await screen.findByRole("dialog", { name: "Reveal your earlier work?" });
    await user.click(within(confirm).getByRole("button", { name: "Reveal" }));
    expect(await screen.findByDisplayValue("Store complements in a map")).toBeInTheDocument();
    await waitFor(
      () => expect(useProblemStore.getState().states["lc-1"]?.draft?.sawSolution).toBe(true),
      {
        timeout: 4000,
      },
    );
  });

  it("lists due problems in Review with a badge, most overdue first", async () => {
    await ready();
    act(() => {
      const text =
        "title,date,result\nClimbing Stairs,2026-01-10,solved\nNetwork Delay Time,2026-01-20,solved";
      applyCsvPlan(planCsvImport(text, useProblemStore.getState().states, csvOptions), csvOptions);
    });
    await go("#/review");
    const panel = await screen.findByRole(
      "region",
      { name: /Problems to re-solve/ },
      { timeout: 4000 },
    );
    const links = within(panel)
      .getAllByRole("link")
      .filter((a) => a.textContent && /^\d+\./.test(a.textContent));
    expect(links.map((a) => a.textContent)).toEqual([
      "70. Climbing Stairs",
      "743. Network Delay Time",
    ]);
    expect(links[0]).toHaveAttribute("href", "#/problems/lc-70?mode=resolve");
    const nav = screen.getAllByRole("link", { name: /Review/ });
    expect(nav.some((a) => a.textContent?.includes("2"))).toBe(true);
  });

  it("rolls tagged attempts up in the mistake journal", async () => {
    await ready();
    act(() => {
      for (const id of ["lc-704", "lc-35"]) {
        saveAttempt({
          problemId: id,
          startedAt: new Date().toISOString(),
          language: "cpp",
          code: "",
          result: "not_solved",
          hintsUsed: 0,
          mistakeTagIds: ["mt-off-by-one"],
          mode: "normal",
        });
      }
    });
    await go("#/mistakes");
    const top = await screen.findByRole("region", { name: "Top mistakes" }, { timeout: 4000 });
    expect(within(top).getByRole("button", { name: /Off-by-one/ })).toHaveTextContent("2");
    const checklist = screen.getByRole("region", { name: "My pre-interview checklist" });
    expect(within(checklist).getByText("Off-by-one")).toBeInTheDocument();
    await go("#/mistakes?tag=mt-off-by-one");
    expect(await screen.findByText("2 attempts with this mistake")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "704. Binary Search" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^#\/problems\/lc-704\?attempt=/),
    );
  });
});
