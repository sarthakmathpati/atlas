// The app shell (F1): sidebar (desktop) or bottom tabs (phones), top bar, notices, the current
// page, and the layers every page can open (Ask Claude, search, shortcuts, More).
import { Suspense, useEffect, useRef } from "react";
import { useMediaQuery } from "@/components/ui/hooks";
import { PageSkeleton } from "@/components/ui/Misc";
import { CommandPalette } from "@/features/palette/CommandPalette";
import { getSearchIndex } from "@/features/palette/docs";
import { CsvImportDialog } from "@/features/problems/CsvImportDialog";
import { QuickAddDialog } from "@/features/problems/QuickAddDialog";
import { useUiStore } from "@/stores/uiStore";
import { ErrorBoundary } from "../ErrorBoundary";
import { PAGES } from "../routes";
import { useRoute } from "../router";
import { AskClaudePanel } from "./AskClaude";
import { FocusTimerController } from "./FocusTimer";
import { BottomTabs, MoreSheet } from "./MobileNav";
import { PageFrame } from "./PageFrame";
import { ShellNotices } from "./ShellNotices";
import { useGlobalShortcuts } from "./shortcuts";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

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

  useGlobalShortcuts();
  usePrebuiltSearchIndex();

  // A new page starts at the top.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [route.path]);

  return (
    <div className="flex h-full">
      <button
        type="button"
        onClick={() => mainRef.current?.focus()}
        className="sr-only z-50 rounded-control bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </button>
      <Sidebar route={route} collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          ref={mainRef}
          id="main"
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto outline-none"
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
        <BottomTabs route={route} />
      </div>
      <MoreSheet route={route} />
      <AskClaudePanel route={route} />
      <ShortcutsDialog />
      <CommandPalette />
      <QuickAddDialog />
      <CsvImportDialog />
      <FocusTimerController />
    </div>
  );
}
