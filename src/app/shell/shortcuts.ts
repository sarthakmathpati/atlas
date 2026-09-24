// Global keyboard shortcuts (F30). Single-key shortcuts only work when focus is not in a text
// field or the code editor, and never while a dialog is open. Ctrl/Cmd + K works everywhere.
import { useEffect } from "react";
import { isEditableTarget } from "@/components/ui/hooks";
import { useUiStore } from "@/stores/uiStore";
import { navigate } from "../router";
import { ALL_NAV_ITEMS } from "./nav";

export interface ShortcutInfo {
  keys: string[];
  label: string;
}

export const SHORTCUT_GROUPS: { title: string; items: ShortcutInfo[] }[] = [
  {
    title: "Anywhere",
    items: [
      { keys: ["Mod", "K"], label: "Search and commands" },
      { keys: ["/"], label: "Search" },
      { keys: ["A"], label: "Ask Claude" },
      { keys: ["?"], label: "Show keyboard shortcuts" },
      { keys: ["Esc"], label: "Close a panel or dialog" },
    ],
  },
  {
    title: "Go to",
    items: ALL_NAV_ITEMS.filter((item) => item.goKey).map((item) => ({
      keys: ["G", item.goKey!.toUpperCase()],
      label: item.label,
    })),
  },
];

const GO_TIMEOUT_MS = 1200;

function modalOpen(): boolean {
  return Boolean(document.querySelector("dialog[open].atlas-modal"));
}

export function useGlobalShortcuts(): void {
  useEffect(() => {
    let goPending = false;
    let goTimer: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      const ui = useUiStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.setPaletteOpen(!ui.paletteOpen);
        return;
      }
      if (mod || e.altKey || e.defaultPrevented) return;
      if (isEditableTarget(e.target) || modalOpen()) return;

      if (goPending) {
        goPending = false;
        if (goTimer) clearTimeout(goTimer);
        const item = ALL_NAV_ITEMS.find((n) => n.goKey === e.key.toLowerCase());
        if (item) {
          e.preventDefault();
          navigate(item.path);
        }
        return;
      }
      switch (e.key) {
        case "/":
          e.preventDefault();
          ui.setPaletteOpen(true);
          break;
        case "?":
          e.preventDefault();
          ui.setShortcutsOpen(true);
          break;
        case "a":
        case "A":
          e.preventDefault();
          ui.setAskOpen(true);
          break;
        case "g":
        case "G":
          goPending = true;
          goTimer = setTimeout(() => (goPending = false), GO_TIMEOUT_MS);
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (goTimer) clearTimeout(goTimer);
    };
  }, []);
}
