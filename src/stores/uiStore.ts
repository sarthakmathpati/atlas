// Shell state: which panels are open and whether the sidebar is collapsed. The sidebar choice is
// a per-browser convenience kept in localStorage (wrapped in try/catch: storage can be blocked).
import { create } from "zustand";

const SIDEBAR_KEY = "atlas.sidebar";

function readSidebar(): boolean | null {
  try {
    const v = localStorage.getItem(SIDEBAR_KEY);
    return v === "collapsed" ? true : v === "expanded" ? false : null;
  } catch {
    return null;
  }
}

interface UiState {
  /** null means "not chosen": collapsed below 1024 px, expanded above. */
  sidebarCollapsed: boolean | null;
  paletteOpen: boolean;
  askOpen: boolean;
  moreOpen: boolean;
  shortcutsOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  setAskOpen: (open: boolean) => void;
  setMoreOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: readSidebar(),
  paletteOpen: false,
  askOpen: false,
  moreOpen: false,
  shortcutsOpen: false,
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
    } catch {
      /* only a convenience */
    }
  },
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setAskOpen: (askOpen) => set({ askOpen }),
  setMoreOpen: (moreOpen) => set({ moreOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
}));
