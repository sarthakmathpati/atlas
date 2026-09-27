// Ask Claude (F20) opens from the top bar or the "a" key: a side drawer on desktop, a bottom sheet
// on phones. Context chips come from the current screen (the concept on screen or open in the
// map's panel, the problem with the owner's code); the owner can leave any of them out. One chat
// thread runs for the whole visit.
import { BookOpen, Code2, ListChecks } from "lucide-react";
import { useMemo } from "react";
import { BottomSheet, Drawer } from "@/components/ui/Dialog";
import { useIsMobile } from "@/components/ui/hooks";
import { ChatPanel, type ChatChip, type ChatStarter } from "@/features/ai/ChatPanel";
import { problemInfo } from "@/lib/problems/catalog";
import { useConcept } from "@/stores/customConceptStore";
import { useProblemStore } from "@/stores/problemStore";
import { useUiStore } from "@/stores/uiStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { Route } from "../router";

export const DRAWER_THREAD = "drawer";

function useChips(route: Route): {
  chips: ChatChip[];
  starters: ChatStarter[];
  conceptId?: string;
} {
  const conceptId =
    route.name === "concept"
      ? route.id
      : route.name === "map"
        ? (route.query.get("focus") ?? undefined)
        : undefined;
  const concept = useConcept(conceptId ?? undefined);
  const problemId =
    (route.name === "problem" || route.name === "design") && route.id ? route.id : undefined;
  const problemState = useProblemStore((s) => (problemId ? s.states[problemId] : undefined));
  const problem = problemId ? problemInfo(problemId, problemState) : undefined;
  const hasCode = useWorkspaceStore(
    (s) => Boolean(problemId) && s.problemId === problemId && s.code.trim() !== "",
  );
  const language = useWorkspaceStore((s) => s.language);
  const hideOwnWork = useWorkspaceStore((s) => s.problemId === problemId && s.hideOwnWork);

  return useMemo(() => {
    const chips: ChatChip[] = [];
    let starters: ChatStarter[];
    if (concept) {
      chips.push({
        id: `concept:${concept.id}`,
        label: concept.name,
        icon: BookOpen,
        context: { conceptId: concept.id },
      });
      starters = [
        {
          label: "Explain it simply",
          text: `Explain ${concept.name} simply, with an everyday analogy.`,
        },
        {
          label: "What do interviewers ask?",
          text: `What do interviewers usually ask about ${concept.name}, and what makes a strong answer?`,
        },
        {
          label: "Show a worked example",
          text: `Walk me through a small worked example of ${concept.name}, step by step.`,
        },
      ];
    } else if (problem) {
      chips.push({
        id: `problem:${problem.id}`,
        label: problem.title,
        icon: ListChecks,
        context: { problemId: problem.id, hideOwnWork },
      });
      if (hasCode) {
        chips.push({
          id: `code:${problem.id}`,
          label: "Your code",
          icon: Code2,
          context: {
            code: {
              language,
              // Read at send time from the store, so the latest keystrokes are included.
              get code() {
                return useWorkspaceStore.getState().code;
              },
            },
          },
        });
      }
      starters = [
        {
          label: "A small hint",
          text: "Give me a small hint for this problem, without the solution.",
        },
        {
          label: "What edge cases matter?",
          text: "Which edge cases should I test for this problem?",
        },
        ...(hasCode
          ? [
              {
                label: "Why might my code fail?",
                text: "Where might my code go wrong? Point me to it without rewriting it.",
              },
            ]
          : []),
      ];
    } else {
      starters = [
        {
          label: "Quiz me on a strong concept",
          text: "Quiz me with one question on a concept I'm strong at.",
        },
        {
          label: "Help me plan a session",
          text: "Help me plan a focused 60-minute study session.",
        },
      ];
    }
    return { chips, starters, conceptId: concept?.id };
  }, [concept, problem, hasCode, language, hideOwnWork]);
}

function Body({ route }: { route: Route }) {
  const { chips, starters, conceptId } = useChips(route);
  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-4 sm:px-5">
      <ChatPanel
        threadKey={DRAWER_THREAD}
        chips={chips}
        starters={starters}
        saveConceptId={conceptId}
        fill
        className="min-h-0 flex-1"
      />
    </div>
  );
}

export function AskClaudePanel({ route }: { route: Route }) {
  const open = useUiStore((s) => s.askOpen);
  const setOpen = useUiStore((s) => s.setAskOpen);
  const isMobile = useIsMobile();
  const close = () => setOpen(false);
  return isMobile ? (
    <BottomSheet open={open} onClose={close} title="Ask Claude">
      <div className="h-[70vh]">{open && <Body route={route} />}</div>
    </BottomSheet>
  ) : (
    <Drawer
      open={open}
      onClose={close}
      title="Ask Claude"
      description="A tutor that knows what you're working on."
      width={440}
      resizable
      storageKey="atlas.askWidth"
    >
      {open && <Body route={route} />}
    </Drawer>
  );
}
