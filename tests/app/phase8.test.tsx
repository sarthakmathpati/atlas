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
import { saveSprint, useMentalMathStore } from "@/stores/mentalMathStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { savePractice, useStoryStore } from "@/stores/storyStore";
import { finishDesign, startDesign, useDesignStore } from "@/stores/designStore";
import { completeMock, createMock, useMockStore } from "@/stores/mockStore";
import { addPlanItems, usePlanStore } from "@/stores/planStore";
import { localDate } from "@/lib/time";
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

describe("story bank", () => {
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
  });
  afterEach(() => cleanup());

  it("writes a story, links questions both ways and shows the coverage matrix", async () => {
    const user = userEvent.setup();
    await ready();
    await waitFor(() => expect(useStoryStore.getState().loaded).toBe(true));
    await go("#/stories");
    await user.click(
      await screen.findByRole("button", { name: "Write your first story" }, { timeout: 4000 }),
    );
    await waitFor(() => expect(window.location.hash).toMatch(/story=story-/));
    const id = new URLSearchParams(window.location.hash.split("?")[1]).get("story")!;
    const title = await screen.findByRole("textbox", { name: "Title" });
    await user.clear(title);
    await user.type(title, "Checkout outage");
    await user.type(
      screen.getByRole("textbox", { name: "Action" }),
      "I added logging and traced the double charge to a retry.",
    );
    await user.tab();
    await waitFor(() =>
      expect(useStoryStore.getState().stories[id]).toMatchObject({
        title: "Checkout outage",
        action: "I added logging and traced the double charge to a retry.",
      }),
    );
    // Link from the matrix...
    await go("#/stories?tab=coverage");
    expect(await screen.findByText(/of 30 questions have a story/)).toBeInTheDocument();
    expect(screen.getAllByText("No story yet")).toHaveLength(30);
    await user.click(
      screen.getByRole("checkbox", {
        name: "Checkout outage answers “Tell me about a time you failed”",
      }),
    );
    await waitFor(() =>
      expect(useStoryStore.getState().stories[id]?.questionIds).toEqual([
        "bq-tell-me-about-a-time-you-failed",
      ]),
    );
    expect(screen.getAllByText("No story yet")).toHaveLength(29);
    // ...and the story editor shows the same link.
    await go(`#/stories?story=${id}`);
    const questions = await screen
      .findByRole("group", { name: /Questions it answers/ })
      .catch(() => null);
    expect(
      (questions ?? document.body).textContent?.includes("Tell me about a time you failed"),
    ).toBe(true);
  }, 20_000);

  it("practices a question with a typed answer and the self-check, saved as unsorted", async () => {
    const user = userEvent.setup();
    await ready();
    await go("#/stories?question=bq-why-this-role");
    expect(
      await screen.findByText("Why this role?", { selector: "p" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Your answer, as you'd say it" }),
      "I like building systems that many people rely on, and this team does exactly that.",
    );
    expect(screen.getByText(/15 words, about 0:06 spoken/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "I'm done" }));
    await user.click(
      screen.getByRole("checkbox", { name: "I set the scene in a sentence or two." }),
    );
    await user.click(screen.getByRole("checkbox", { name: "I finished within two minutes." }));
    await user.click(screen.getByRole("checkbox", { name: /I said what I was responsible for/ }));
    await user.click(screen.getByRole("button", { name: "Save practice" }));
    await waitFor(() => {
      const unsorted = useStoryStore.getState().stories["story-unsorted"];
      expect(unsorted?.title).toBe("Unsorted practice");
      expect(unsorted?.practice?.at(-1)).toMatchObject({
        questionId: "bq-why-this-role",
        mode: "typed",
        score: 0.5,
      });
    });
    const checks =
      useConceptStateStore.getState().checks[
        "career.behavioral.why-this-company-and-why-this-role"
      ];
    expect(checks?.at(-1)).toMatchObject({ kind: "explain", score: 0.5 });
  }, 20_000);

  it("builds a 90-second script with a word count and speaking time", async () => {
    await ready();
    await go("#/stories?tab=intro");
    const present = await screen.findByRole(
      "textbox",
      { name: "Present: who you are now" },
      { timeout: 4000 },
    );
    const words = (n: number, w: string) => Array.from({ length: n }, () => w).join(" ");
    fireEvent.change(present, { target: { value: words(40, "now") } });
    fireEvent.change(screen.getByRole("textbox", { name: "Past: what brought you here" }), {
      target: { value: words(120, "then") },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Why this role" }), {
      target: { value: words(50, "next") },
    });
    fireEvent.blur(present);
    expect(await screen.findByText("210 words at 140 words a minute")).toBeInTheDocument();
    expect(screen.getByText("1:30")).toBeInTheDocument();
    expect(screen.getByText("About right for 90 seconds.")).toBeInTheDocument();
    await waitFor(() =>
      expect(useStoryStore.getState().stories["story-intro"]).toMatchObject({
        kind: "intro",
        questionIds: ["bq-tell-me-about-yourself"],
      }),
    );
  }, 20_000);
});

describe("design practice", () => {
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
  });
  afterEach(() => cleanup());

  it("lists the 46 prompts with their status", async () => {
    await ready();
    await go("#/designs?kind=hld");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Designs" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/of 46 done/)).toBeInTheDocument();
    const list = screen.getByRole("region", { name: "System design" });
    expect(within(list).getByRole("link", { name: /URL shortener/ })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Low-level design" })).toBeNull();
  });

  it("autosaves sections, explains a bad sketch line, and saves a self-reviewed attempt as practice", async () => {
    const user = userEvent.setup();
    await ready();
    await waitFor(() => expect(useDesignStore.getState().loaded).toBe(true));
    await go("#/designs/hld-url-shortener");
    await user.click(
      await screen.findByRole("button", { name: "Start the design" }, { timeout: 4000 }),
    );
    const api = await screen.findByRole("textbox", { name: "API" });
    await user.type(api, "POST /links returns a short code");
    await user.tab();
    const sketch = screen.getByRole("textbox", { name: "Architecture sketch" });
    fireEvent.change(sketch, {
      target: {
        value:
          "Client -> API Gateway : HTTPS\nAPI Gateway => Links DB\nAPI Gateway -> Links DB [db]",
      },
    });
    const errors = await screen.findByRole("list", { name: "Lines to fix" });
    expect(within(errors).getByRole("button", { name: "Line 2" })).toBeInTheDocument();
    expect(errors.textContent).toMatch(/Write it as “->”/);
    expect(await screen.findByText("3 boxes, 2 arrows")).toBeInTheDocument();
    await waitFor(
      () => {
        const open = Object.values(useDesignStore.getState().attempts).find(
          (a) => a.problemId === "hld-url-shortener" && !a.finishedAt,
        );
        expect(open?.sections).toMatchObject({
          api: "POST /links returns a short code",
          sketch: expect.stringContaining("Client -> API Gateway"),
        });
      },
      { timeout: 4000 },
    );
    await user.click(screen.getByRole("button", { name: "Finish and review" }));
    const save = screen.getByRole("button", { name: "Save attempt" });
    expect(save).toBeDisabled();
    for (const group of screen
      .getAllByRole("radiogroup")
      .filter((g) => within(g).queryByRole("radio", { name: "Covered" }))) {
      await user.click(within(group).getByRole("radio", { name: "Covered" }));
    }
    expect(screen.getByText(/Counts as 5\/5/)).toBeInTheDocument();
    await user.click(save);
    await waitFor(() => {
      const state = useProblemStore.getState().states["hld-url-shortener"];
      expect(state?.attempts.at(-1)).toMatchObject({ result: "solved_alone", language: "text" });
      expect(state?.inReview).toBe(false);
    });
    const finished = Object.values(useDesignStore.getState().attempts).find(
      (a) => a.problemId === "hld-url-shortener" && a.finishedAt,
    );
    expect(finished?.selfReview).toEqual([2, 2, 2, 2, 2]);
    expect(await screen.findByText("Earlier attempts")).toBeInTheDocument();
    // It counts as practice for the classic concept.
    expect(useConceptStateStore.getState().states["sysd.classics.url-shortener"]?.status).not.toBe(
      "not_started",
    );
  }, 30_000);
});

describe("practice hub", () => {
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    useUiStore.setState({ paletteOpen: false });
  });

  it("links every kind of practice with where the owner stands", async () => {
    await ready();
    await go("#/practice");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Practice" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    const main = within(screen.getByRole("main"));
    const links = [
      ["Pattern drill", "#/drill"],
      ["Flashcards and quizzes", "#/quiz"],
      ["Mental math", "#/mental-math"],
      ["Quant puzzles", "#/puzzles"],
      ["Mock interviews", "#/mock"],
      ["Design practice", "#/designs"],
      ["Stories", "#/stories"],
    ] as const;
    for (const [name, href] of links)
      expect(main.getByRole("link", { name: new RegExp(`^${name}`) })).toHaveAttribute(
        "href",
        href,
      );
    // Earlier tests in this file solved a puzzle and ran a sprint.
    expect(main.getByRole("link", { name: /^Quant puzzles/ })).toHaveTextContent(
      /\d+ of \d+ solved/,
    );
    expect(main.getByRole("link", { name: /^Mental math/ })).toHaveTextContent(/Last sprint:/);
    expect(screen.queryByText(/Arrives in/)).toBeNull();
  });

  it("offers mock interviews in the command palette", async () => {
    const user = userEvent.setup();
    await ready();
    await user.keyboard("{Control>}k{/Control}");
    const input = await screen.findByPlaceholderText("Search concepts, problems and pages");
    await user.type(input, "mock interview");
    await user.click(await screen.findByText("Start a mock interview"));
    await waitFor(() => expect(window.location.hash).toBe("#/mock"));
  });

  it("puts the new plan kinds on Today with the right Start, and ticks them off when done", async () => {
    await ready();
    await waitFor(() => expect(useMockStore.getState().loaded).toBe(true));
    act(() => {
      addPlanItems([
        { kind: "mental-math", title: "Mental math sprint", reason: "Daily.", estMinutes: 8 },
        {
          kind: "story",
          refId: "bq-a-time-you-had-a-conflict-and-how-you-resolved-it",
          title: "Story practice: one behavioral answer",
          reason: "Twice a week.",
          estMinutes: 10,
        },
        {
          kind: "design",
          refId: "hld-rate-limiter-service",
          title: "Design practice: Rate limiter",
          reason: "Once a week.",
          estMinutes: 45,
        },
        { kind: "mock", title: "Mock interview: coding", reason: "Weekly.", estMinutes: 45 },
      ]);
    });
    await go("#/today");
    const list = await screen.findByRole("list", { name: "Plan items" }, { timeout: 4000 });
    // The next stop's Start is on the Up next card; the other stops keep theirs on the route.
    const startOf = (title: string) =>
      within(
        screen.queryByRole("region", { name: `Up next: ${title}` }) ??
          within(list)
            .getByRole("checkbox", { name: `Done: ${title}` })
            .closest("li")!,
      ).getByRole("link", { name: "Start" });
    expect(startOf("Mental math sprint")).toHaveAttribute("href", "#/mental-math?mode=speed");
    expect(startOf("Story practice: one behavioral answer")).toHaveAttribute(
      "href",
      "#/stories?question=bq-a-time-you-had-a-conflict-and-how-you-resolved-it",
    );
    expect(startOf("Design practice: Rate limiter")).toHaveAttribute(
      "href",
      "#/designs/hld-rate-limiter-service",
    );
    expect(startOf("Mock interview: coding")).toHaveAttribute("href", "#/mock?type=dsa");

    const plan = () => usePlanStore.getState().plans[localDate()]!;
    const done = (kind: string) => plan().items.find((i) => i.kind === kind)?.done;
    act(() => {
      saveSprint({ mode: "speed", tier: "easy", correct: 30, answered: 40, seconds: 480 });
      savePractice({
        questionId: "bq-a-time-you-had-a-conflict-and-how-you-resolved-it",
        answer: "A disagreement about a design, settled with a small experiment.",
        mode: "typed",
        score: 0.5,
      });
    });
    await waitFor(() => {
      expect(done("mental-math")).toBe(true);
      expect(done("story")).toBe(true);
    });
    act(() => {
      const d = startDesign("hld-rate-limiter-service");
      finishDesign(d.id, new Date(), { overall: 3 });
      const m = createMock({
        kind: "behavioral",
        delivery: "live",
        questionIds: ["bq-tell-me-about-yourself"],
      });
      completeMock(m.id, {
        scores: { structure: 3, specificity: 3, impact: 3, reflection: 3, communication: 3 },
        strengths: [],
        improvements: [],
        hireSignal: "lean no",
        summary: "Fine.",
      });
    });
    await waitFor(() => {
      expect(done("design")).toBe(true);
      expect(done("mock")).toBe(true);
    });
  });
});
