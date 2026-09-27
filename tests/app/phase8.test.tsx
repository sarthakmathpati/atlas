// @vitest-environment jsdom
// Phase 8 screens in the real app: quant puzzles (answer checking, grading, saved attempts) and
// the mental math sprint (keyboard, results, history, checks).
import "fake-indexeddb/auto";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "@/app/App";
import { sequencePredictions } from "@/lib/quant/mentalMath";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { useMentalMathStore } from "@/stores/mentalMathStore";
import { useProblemStore } from "@/stores/problemStore";
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
    expect(useMentalMathStore.getState().loaded).toBe(true);
  });
}

describe("quant puzzles", () => {
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    useUiStore.setState({ paletteOpen: false });
  });

  it("lists the bank with filters from the URL", async () => {
    await ready();
    await go("#/puzzles?topic=puzzles.logic&kind=open");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Quant puzzles" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    const list = await screen.findByRole("region", { name: "Logic and strategy puzzles" });
    expect(within(list).getByRole("link", { name: /Two burning ropes/ })).toBeInTheDocument();
    expect(within(list).queryByRole("link", { name: /Egg drop/i })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Kind" })).toHaveValue("open");
  });

  it("checks an answer in an equivalent form and saves a solve", async () => {
    const user = userEvent.setup();
    await ready();
    await go("#/problems/q-monty");
    const box = await screen.findByRole("textbox", { name: "Your answer" }, { timeout: 4000 });
    await user.type(box, "0.5{Enter}");
    expect(await screen.findByText("Not quite. Try again, or take a hint.")).toBeInTheDocument();
    await user.clear(box);
    await user.type(box, "66.67%{Enter}");
    expect(await screen.findByText("Correct on the second try.")).toBeInTheDocument();
    expect(screen.getByText(/The answer: 2\/3/)).toBeInTheDocument();
    // The draft keeps the checked answer.
    await waitFor(
      () =>
        expect(useProblemStore.getState().states["q-monty"]?.draft?.puzzle?.verdict).toBe(
          "correct",
        ),
      { timeout: 4000 },
    );
    await user.click(screen.getByRole("button", { name: "Save attempt" }));
    const dialog = await screen.findByRole("dialog", { name: "Save attempt" });
    expect(within(dialog).getByRole("radio", { name: /Solved alone/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(within(dialog).getByRole("button", { name: "Save attempt" }));
    // The first solve asks for an insight once.
    await user.click(within(dialog).getByRole("button", { name: "Save without insight" }));
    await waitFor(() => {
      const state = useProblemStore.getState().states["q-monty"];
      expect(state?.status).toBe("solved");
      expect(state?.attempts[0]).toMatchObject({
        result: "solved_alone",
        answer: "66.67%",
        answerTries: 2,
      });
    });
    // Linked concepts heard about it.
    const linked =
      useConceptStateStore.getState().states["puzzles.probability.monty-hall-variants"];
    expect(linked?.status ?? "learning").not.toBe("not_started");
  }, 20_000);

  it("locks the solved results until the answer checks out", async () => {
    const user = userEvent.setup();
    await ready();
    await go("#/problems/q-hh");
    const box = await screen.findByRole("textbox", { name: "Your answer" }, { timeout: 4000 });
    await user.type(box, "5{Enter}");
    await screen.findByText("Not quite. Try again, or take a hint.");
    const saveButtons = screen.getAllByRole("button", { name: "Save attempt" });
    await user.click(saveButtons[saveButtons.length - 1]!);
    const dialog = await screen.findByRole("dialog", { name: "Save attempt" });
    const alone = within(dialog).getByRole("radio", { name: /Solved alone/ });
    expect(alone).toHaveAttribute("aria-disabled", "true");
    expect(within(dialog).getAllByText(/didn't match/).length).toBeGreaterThan(0);
  }, 20_000);

  it("self-grades an open-ended puzzle against the answer note", async () => {
    const user = userEvent.setup();
    await ready();
    await go("#/problems/q-ropes");
    const box = await screen.findByRole(
      "textbox",
      { name: "Your answer and reasoning" },
      { timeout: 4000 },
    );
    await user.type(box, "Light one rope at both ends and the other at one end.");
    await user.click(screen.getByRole("button", { name: "Compare with the answer note" }));
    expect(screen.getByText("The answer note")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "I had it" }));
    expect(await screen.findByText("You marked it right.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save attempt" }));
    const dialog = await screen.findByRole("dialog", { name: "Save attempt" });
    await user.click(within(dialog).getByRole("button", { name: "Save attempt" }));
    await user.click(within(dialog).getByRole("button", { name: "Save without insight" }));
    await waitFor(() =>
      expect(useProblemStore.getState().states["q-ropes"]?.attempts[0]).toMatchObject({
        result: "solved_alone",
        grade: { by: "self", score: 1 },
      }),
    );
  }, 20_000);
});

describe("mental math sprint", () => {
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
  });
  afterEach(() => cleanup());

  it("runs a sequences sprint by keyboard, saves the run and records a check", async () => {
    await ready();
    await go("#/mental-math?mode=sequences&tier=easy");
    fireEvent.click(await screen.findByRole("button", { name: "Start sprint" }, { timeout: 4000 }));
    const input = await screen.findByRole("textbox", { name: /Your answer to/ });
    expect(input).toHaveFocus();
    // Skip the first with Tab, then answer the other 19 by working out the next term.
    fireEvent.keyDown(input, { key: "Tab" });
    expect(await screen.findByText(/^Skipped:/)).toBeInTheDocument();
    for (let i = 1; i < 20; i++) {
      const prompt = document.getElementById("mm-question")!.textContent!;
      const terms = prompt
        .replace(", …", "")
        .split(", ")
        .map((t) => Number(t.replace(/,/g, "")));
      const next = sequencePredictions(terms)[0]!;
      fireEvent.change(input, { target: { value: String(next) } });
      fireEvent.keyDown(input, { key: "Enter" });
    }
    expect(await screen.findByText("19 of 20 correct")).toBeInTheDocument();
    const runs = Object.values(useMentalMathStore.getState().runs).filter(
      (r) => r.mode === "sequences",
    );
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      mode: "sequences",
      tier: "easy",
      correct: 19,
      total: 20,
      answered: 19,
    });
    const checks = useConceptStateStore.getState().checks["apt.quant.number-series-and-sequences"];
    expect(checks?.[0]).toMatchObject({ kind: "quiz" });
    // Easy sprints count at 80%.
    expect(checks?.[0]?.score).toBeCloseTo((19 / 20) * 0.8, 5);
    expect(screen.getByText(/Saved\. It counts as a check of 76%/)).toBeInTheDocument();
  }, 20_000);

  it("asks for a number when the answer can't be read, and never saves an ended sprint", async () => {
    const user = userEvent.setup();
    await ready();
    await go("#/mental-math?mode=speed&tier=medium");
    const before = Object.values(useMentalMathStore.getState().runs).length;
    await user.click(
      await screen.findByRole("button", { name: "Start sprint" }, { timeout: 4000 }),
    );
    const input = await screen.findByRole("textbox", { name: /Your answer to/ });
    await user.type(input, "abc{Enter}");
    expect(screen.getByText(/Type a number, such as 282/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "End early" }));
    await user.click(screen.getByRole("button", { name: "End without saving" }));
    expect(await screen.findByRole("button", { name: "Start sprint" })).toBeInTheDocument();
    expect(Object.values(useMentalMathStore.getState().runs)).toHaveLength(before);
  }, 20_000);
});
