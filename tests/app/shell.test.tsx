// @vitest-environment jsdom
// F1 "done when": every route renders inside the shell, and navigation works from the keyboard.
import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/app/App";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";

const ROUTES: [string, string | RegExp][] = [
  ["#/today", /^Good (morning|afternoon|evening)|^Working late/],
  ["#/map", "Map"],
  ["#/concept/dsa.graph-basics.bfs", "BFS"],
  ["#/problems", "Problems"],
  ["#/problems/lc-1", "1. Two Sum"],
  ["#/review", "Review"],
  ["#/practice", "Practice"],
  ["#/drill", "Pattern drill"],
  ["#/quiz", "Flashcards and quizzes"],
  ["#/mental-math", "Mental math"],
  ["#/puzzles", "Quant puzzles"],
  ["#/mock", "Mock interview"],
  ["#/mock/some-session", "Mock interview"],
  ["#/designs", "Designs"],
  ["#/designs/lld-parking-lot", "Parking lot"],
  ["#/stories", "Stories"],
  ["#/mistakes", "Mistakes"],
  ["#/dashboard", "Dashboard"],
  ["#/weekly", "Weekly review"],
  ["#/revision", "Revision"],
  ["#/settings", "Settings"],
  ["#/somewhere-else", "Page not found"],
];

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

describe("app shell", () => {
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    useUiStore.setState({
      paletteOpen: false,
      askOpen: false,
      moreOpen: false,
      shortcutsOpen: false,
    });
  });

  it("renders every route with its heading", async () => {
    render(<App />);
    await waitFor(() => expect(useProfileStore.getState().profile).not.toBeNull());
    for (const [hash, heading] of ROUTES) {
      await go(hash);
      const h1 = await screen.findByRole("heading", { level: 1, name: heading }, { timeout: 4000 });
      expect(h1, hash).toBeInTheDocument();
    }
  }, 30_000);

  it("marks the current page in the navigation", async () => {
    render(<App />);
    await go("#/problems/lc-1");
    const nav = await screen.findAllByRole("link", { name: "Problems" });
    expect(nav.some((a) => a.getAttribute("aria-current") === "page")).toBe(true);
  });

  it("opens search with Ctrl+K and jumps to a result with Enter", async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(useProfileStore.getState().profile).not.toBeNull());
    await user.keyboard("{Control>}k{/Control}");
    const input = await screen.findByPlaceholderText("Search concepts, problems and pages");
    await user.type(input, "network delay");
    await screen.findByText("743. Network Delay Time");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(window.location.hash).toBe("#/problems/lc-743"));
    expect(useUiStore.getState().paletteOpen).toBe(false);
  });

  it("follows g-then-letter shortcuts, but not while typing", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 1 });
    await user.keyboard("gm");
    await waitFor(() => expect(window.location.hash).toBe("#/map"));
    const filter = await screen.findByPlaceholderText(/Filter \d+ concepts/);
    await user.click(filter);
    await user.keyboard("gp");
    expect(window.location.hash).toBe("#/map");
    expect(filter).toHaveValue("gp");
  });

  it("saves settings to the profile", async () => {
    const user = userEvent.setup();
    render(<App />);
    await go("#/settings");
    const name = await screen.findByLabelText("Your name");
    await user.type(name, "Asha");
    await waitFor(() => expect(useProfileStore.getState().profile?.name).toBe("Asha"), {
      timeout: 3000,
    });
    await user.click(screen.getByRole("radio", { name: "Quant" }));
    expect(useProfileStore.getState().profile?.track).toBe("quant");
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("atlas.theme")).toBe("dark");
  });
});
