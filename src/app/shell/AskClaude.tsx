// Ask Claude (F20) opens from the top bar or the "a" key: a side drawer on desktop, a bottom sheet
// on phones. It already knows what's on screen (the context chips); the chat itself arrives with
// the Claude features (Phase 6), so for now the panel says so and shows which mode will be used.
import { BookOpen, Globe, ListChecks, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useServicesState } from "@/app/providers/servicesContext";
import { BottomSheet, Drawer } from "@/components/ui/Dialog";
import { useIsMobile } from "@/components/ui/hooks";
import { problemInfo } from "@/lib/problems/catalog";
import { conceptById } from "@/data/syllabus";
import { useProblemStore } from "@/stores/problemStore";
import { useUiStore } from "@/stores/uiStore";
import type { Route } from "../router";

interface ContextChip {
  label: string;
  icon: typeof Globe;
}

function contextFor(route: Route): ContextChip {
  if (route.name === "concept" && route.id) {
    const concept = conceptById.get(route.id);
    if (concept) return { label: concept.name, icon: BookOpen };
  }
  if ((route.name === "problem" || route.name === "design") && route.id) {
    const problem = problemInfo(route.id, useProblemStore.getState().states[route.id]);
    if (problem) return { label: problem.title, icon: ListChecks };
  }
  return { label: "General", icon: Globe };
}

function Body({ route }: { route: Route }) {
  const services = useServicesState();
  const chip = contextFor(route);
  const Icon = chip.icon;
  const hasSample = services.status === "ready" && Boolean(services.services.runtime.sample);
  return (
    <div className="flex flex-col gap-5 px-4 py-4 sm:px-5">
      <div>
        <p className="mb-2 text-sm text-muted">Context Claude will see</p>
        <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-rule bg-surface-sunken px-2.5 text-sm text-text">
          <Icon size={14} aria-hidden="true" className="shrink-0 text-muted" />
          <span className="truncate">{chip.label}</span>
        </span>
      </div>
      <div className="rounded-panel border border-dashed border-rule-strong p-4">
        <span className="mb-3 grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
          <Sparkles size={20} aria-hidden="true" />
        </span>
        <p className="font-semibold text-text">Chatting with Claude arrives in a later update</p>
        <p className="mt-1 text-base text-muted">
          You'll be able to ask about whatever is on screen: the concept you're reading, your code
          for a problem, or anything else. Answers stream in, and you can save the useful ones to a
          concept's notes.
        </p>
        <p className="mt-3 text-base text-muted">
          {hasSample
            ? "Claude is built into this view, so answers will use your own Claude plan."
            : "In this view, Atlas will build a complete prompt for you to paste into claude.ai. You can also add your own API key in Settings once Claude features arrive."}
        </p>
      </div>
    </div>
  );
}

export function AskClaudePanel({ route }: { route: Route }) {
  const open = useUiStore((s) => s.askOpen);
  const setOpen = useUiStore((s) => s.setAskOpen);
  const isMobile = useIsMobile();
  const close = () => setOpen(false);
  const content: ReactNode = <Body route={route} />;
  return isMobile ? (
    <BottomSheet open={open} onClose={close} title="Ask Claude">
      {content}
    </BottomSheet>
  ) : (
    <Drawer
      open={open}
      onClose={close}
      title="Ask Claude"
      description="A tutor that knows what you're working on."
      width={420}
      resizable
      storageKey="atlas.askWidth"
    >
      {content}
    </Drawer>
  );
}
