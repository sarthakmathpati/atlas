// @vitest-environment jsdom
// Phase 8's Claude features in all three modes (built-in Claude through a fake `sample`, an API
// key through a mocked, streamed Messages API, and copy prompt through the modal): grading an
// open-ended puzzle (prompt 16). No network, no real key.
import "fake-indexeddb/auto";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearAICache } from "@/lib/ai/run";
import type { AIMode } from "@/lib/types";
import { useProblemStore } from "@/stores/problemStore";
import { answerCopy, go, resetClaude, setupMode } from "./claudeHarness";

describe.each(["sample", "api", "copy"] as AIMode[])(
  "Phase 8 Claude features in %s mode",
  (mode) => {
    beforeEach(() => {
      window.location.hash = "#/today";
      localStorage.clear();
      clearAICache();
    });
    afterEach(() => {
      cleanup();
      resetClaude();
    });

    it("grades an open-ended puzzle and saves the attempt with the grade", async () => {
      const user = userEvent.setup();
      await setupMode(mode);
      await go("#/problems/q-dice-market");
      const box = await screen.findByRole(
        "textbox",
        { name: "Your answer and reasoning" },
        { timeout: 4000 },
      );
      await user.type(
        box,
        "The sum is 7 on average, so quote 6.5 bid and 7.5 offer. If someone lifts my offer I raise both sides a little and widen, because they may know more.",
      );
      await user.click(screen.getByRole("button", { name: "Grade with Claude" }));
      await answerCopy(mode, user);
      expect(
        await screen.findByText("Claude marked it right.", {}, { timeout: 4000 }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Right answer, and you said why it works/)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Save attempt" }));
      const dialog = await screen.findByRole("dialog", { name: "Save attempt" });
      await user.click(within(dialog).getByRole("button", { name: "Save attempt" }));
      // The first solve asks for an insight once (earlier modes in this file already solved it).
      const skip = within(dialog).queryByRole("button", { name: "Save without insight" });
      if (skip) await user.click(skip);
      await waitFor(() =>
        expect(useProblemStore.getState().states["q-dice-market"]?.attempts.at(-1)).toMatchObject({
          result: "solved_alone",
          grade: { by: "claude", correct: true, score: 0.9 },
        }),
      );
    }, 20_000);
  },
);
