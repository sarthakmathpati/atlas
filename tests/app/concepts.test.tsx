// @vitest-environment jsdom
// Phase 4 screens in the real app: the welcome questions (F5), the concept page with "Why this
// color?" (F3, F4), flashcards (F14), explaining it back offline (F13) and concept reviews (F9).
import "fake-indexeddb/auto";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/app/App";
import { conceptById, conceptsByTopic } from "@/data/syllabus";
import { closeConceptDialogs } from "@/stores/conceptDialogStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";

// Tests share storage within this file: the welcome test marks OS processes, so the concept tests
// use DBMS concepts.
const DB_CONCEPT = "dbms.fundamentals.dbms-vs-file-systems";
const DB_CONCEPT_2 = "dbms.fundamentals.data-models";

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

async function ready() {
  render(<App />);
  await waitFor(() => expect(useProfileStore.getState().profile).not.toBeNull());
}

describe("map and concept screens", () => {
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    closeConceptDialogs();
    useUiStore.setState({ paletteOpen: false, askOpen: false, csvImportOpen: false });
  });

  it("welcomes a new owner and turns the self-assessment into a starting map", async () => {
    const user = userEvent.setup();
    await ready();
    // The first visit to Today hands over to the welcome questions.
    await waitFor(() => expect(window.location.hash).toBe("#/welcome"));
    await screen.findByRole("heading", { level: 1, name: "Welcome to Atlas" });
    await user.type(screen.getByLabelText("Your name"), "Asha");
    await user.click(screen.getByRole("radio", { name: /^SDE/ }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("radio", { name: "1 h" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    // Step 4: Operating systems, comfortable, one topic ticked.
    const os = screen.getByRole("radiogroup", { name: "How well you know Operating systems" });
    await user.click(within(os).getByRole("radio", { name: "Comfortable" }));
    await user.click(screen.getByRole("checkbox", { name: "Processes" }));
    expect(screen.getByRole("status")).toHaveTextContent("1 topic ticked.");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() => expect(window.location.hash).toBe("#/today"));
    const profile = useProfileStore.getState().profile!;
    expect(profile).toMatchObject({
      name: "Asha",
      track: "sde",
      dailyMinutes: 60,
      onboardingDone: true,
    });
    const states = useConceptStateStore.getState().states;
    for (const c of conceptsByTopic.get("os.processes")!) {
      expect(states[c.id]).toMatchObject({ selfAssessed: 0.5, status: "learning" });
      expect(states[c.id]!.srs.dueAt).toBeDefined();
    }
    expect(await screen.findByText(/concepts start as learning/)).toBeInTheDocument();
  }, 20_000);

  it("shows a concept, explains its color, and records flashcards", async () => {
    const user = userEvent.setup();
    await ready();
    await go(`#/concept/${DB_CONCEPT}`);
    await screen.findByRole("heading", { level: 1, name: "DBMS vs file systems" });
    await user.click(screen.getByRole("button", { name: "Mark as studied" }));
    expect(useConceptStateStore.getState().states[DB_CONCEPT]).toMatchObject({
      studied: true,
      status: "learning",
    });

    await user.click(screen.getByRole("button", { name: /Learning\. Why this color\?/ }));
    const why = await screen.findByRole("dialog", { name: "Why this color?" });
    expect(within(why).getByText("Knowledge 30%")).toBeInTheDocument();
    expect(within(why).getByText("Marked as studied: at least 30%.")).toBeInTheDocument();
    expect(
      within(why).getByText("Score 80% or more on a quick quiz or explain it back"),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Flashcards" }));
    // The dialog waits for the subject's text chunk, which is lazy loaded (slow under a busy suite).
    const dialog = await screen.findByRole(
      "dialog",
      { name: "Flashcards: DBMS vs file systems" },
      { timeout: 4000 },
    );
    // One card per written question; rate every card Easy to finish the session.
    const cards = conceptById.get(DB_CONCEPT)!.written.questions;
    expect(cards).toBeGreaterThan(0);
    for (let i = 0; i < cards; i++) {
      await user.click(
        await within(dialog).findByRole("button", { name: "Show answer" }, { timeout: 4000 }),
      );
      await user.click(within(dialog).getByRole("button", { name: /^Easy/ }));
    }
    expect(await within(dialog).findByText("Session saved")).toBeInTheDocument();
    const checks = useConceptStateStore.getState().checks[DB_CONCEPT]!;
    expect(checks.at(-1)).toMatchObject({ kind: "flashcard", score: 1 });
    // Flashcards weigh 0.9, so a perfect card is 90% knowledge: strong for a concept without problems.
    expect(useConceptStateStore.getState().states[DB_CONCEPT]!.status).toBe("strong");
  }, 20_000);

  it("explains it back offline: at least 40 words, then tick what was covered", async () => {
    const user = userEvent.setup();
    await ready();
    await go(`#/concept/${DB_CONCEPT_2}`);
    await screen.findByRole("heading", { level: 1, name: "Data models" });
    await user.click(screen.getByRole("button", { name: "Explain it back" }));
    const dialog = await screen.findByRole("dialog", { name: /Explain it back/ });
    const check = within(dialog).getByRole("button", { name: "Check my explanation" });
    expect(check).toBeDisabled();
    await user.type(within(dialog).getByRole("textbox"), "word ".repeat(40));
    expect(check).toBeEnabled();
    await user.click(check);
    const boxes = within(dialog).getAllByRole("checkbox");
    await user.click(boxes[0]!);
    await user.click(within(dialog).getByRole("button", { name: "Save result" }));
    expect(await within(dialog).findByText(/You covered 1 of/)).toBeInTheDocument();
    const last = useConceptStateStore.getState().checks[DB_CONCEPT_2]!.at(-1)!;
    expect(last.kind).toBe("explain");
    expect(last.score).toBeCloseTo(1 / boxes.length);
    expect((last.detail as { text: string }).text).toContain("word");
  }, 20_000);
});
