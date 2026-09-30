// The app shell (F1): sidebar (desktop) or bottom tabs (phones), top bar, notices, the current
// page, and the layers every page can open (Ask Claude, search, shortcuts, More).
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/components/ui/hooks";
import { PageSkeleton } from "@/components/ui/Misc";
import { CopyPromptModal } from "@/features/ai/CopyPromptModal";
import { CommandPalette } from "@/features/palette/CommandPalette";
import { getSearchIndex } from "@/features/palette/docs";
import { FocusLayer } from "@/features/focus/FocusLayer";
import { CsvImportDialog } from "@/features/problems/CsvImportDialog";
import { QuickAddDialog } from "@/features/problems/QuickAddDialog";
import { useReviewQueue } from "@/features/review/useReviewQueue";
import { weeklyReviewDue } from "@/lib/insight/weekly";
import { useConceptDialogs } from "@/stores/conceptDialogStore";
import { holdingNotices } from "@/stores/focusTimerStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { ErrorBoundary } from "../ErrorBoundary";
import { PAGES } from "../routes";
import { navigate, parseHash, useRoute } from "../router";
import { AskClaudePanel } from "./AskClaude";
import { FocusTimerController } from "./FocusTimer";
import { BottomTabs, MoreSheet } from "./MobileNav";
import { PageFrame } from "./PageFrame";
import { ShellNotices } from "./ShellNotices";
import { useGlobalShortcuts } from "./shortcuts";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const ConceptDialogs = lazy(() => import("@/features/review/concepts/ConceptDialogs"));

/** Flashcards, quick quizzes, explain it back, concept reviews, status and "add a concept":
 *  loaded on first use. */
function ConceptDialogHost() {
  const open = useConceptDialogs((s) =>
    Boolean(s.flashcards || s.quiz || s.explain || s.review || s.status || s.addConcept !== null),
  );
  const [used, setUsed] = useState(false);
  if (open && !used) setUsed(true);
  if (!used) return null;
  return (
    <Suspense fallback={null}>
      <ConceptDialogs />
    </Suspense>
  );
}

/** On the very first visit, Today hands over to the welcome questions (F5). */
function useFirstRunWelcome() {
  const loaded = useProfileStore((s) => s.profile !== null);
  const done = useProfileStore((s) => s.profile?.onboardingDone ?? true);
  const checked = useRef(false);
  useEffect(() => {
    if (!loaded || checked.current) return;
    checked.current = true;
    if (!done && parseHash(window.location.hash).name === "today") {
      navigate("/welcome", { replace: true });
    }
  }, [loaded, done]);
}

/**
 * After Sunday 18:00, the first visit to Today hands over to the weekly review once (F18). A
 * deep link elsewhere isn't interrupted; Today then shows a note instead. During a focus block
 * (F31) the hand-over waits: a note is held for the break instead.
 */
function useWeeklyReviewPrompt() {
  const profile = useProfileStore((s) => s.profile);
  const checked = useRef(false);
  useEffect(() => {
    if (!profile || checked.current) return;
    checked.current = true;
    if (!profile.onboardingDone || parseHash(window.location.hash).name !== "today") return;
    if (!weeklyReviewDue(new Date(), profile)) return;
    if (holdingNotices()) {
      toast("Your weekly review is ready.", {
        notice: true,
        id: "weekly-review",
        action: { label: "Open", onClick: () => navigate("/weekly") },
      });
      return;
    }
    navigate("/weekly", { replace: true });
  }, [profile]);
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/** Builds the search index while the browser is idle, so the first Ctrl+K is instant. */
function usePrebuiltSearchIndex() {
  useEffect(() => {
    const w = window as IdleWindow;
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => getSearchIndex(), { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => getSearchIndex(), 1500);
    return () => clearTimeout(t);
  }, []);
}

export function AppShell() {
  const route = useRoute();
  const collapsedPref = useUiStore((s) => s.sidebarCollapsed);
  const wide = useMediaQuery("(min-width: 1024px)");
  const collapsed = collapsedPref ?? !wide;
  const mainRef = useRef<HTMLElement>(null);
  const Page = PAGES[route.name];
  const reviewCount = useReviewQueue().count;
  const badges = { review: reviewCount };

  useGlobalShortcuts();
  usePrebuiltSearchIndex();
  useFirstRunWelcome();
  useWeeklyReviewPrompt();

  // A new page starts at the top.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [route.path]);

  return (
    <div className="flex h-full print:block print:h-auto">
      <button
        type="button"
        onClick={() => mainRef.current?.focus()}
        className="sr-only z-50 rounded-control bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </button>
      <Sidebar route={route} collapsed={collapsed} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <TopBar />
        <main
          ref={mainRef}
          id="main"
          tabIndex={-1}
          className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto outline-none print:overflow-visible"
        >
          <ShellNotices />
          <ErrorBoundary key={route.path} inline>
            <Suspense
              fallback={
                <PageFrame>
                  <PageSkeleton />
                </PageFrame>
              }
            >
              <Page />
            </Suspense>
          </ErrorBoundary>
        </main>
        <BottomTabs route={route} badges={badges} />
      </div>
      <MoreSheet route={route} />
      <AskClaudePanel route={route} />
      <ShortcutsDialog />
      <CommandPalette />
      <QuickAddDialog />
      <CsvImportDialog />
      <FocusTimerController />
      <FocusLayer />
      <ConceptDialogHost />
      <CopyPromptModal />
    </div>
  );
}
