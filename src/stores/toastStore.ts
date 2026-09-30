// Toasts (F1): short confirmations such as "Attempt saved. Next review in 3 days". A destructive
// action always offers Undo through `action`. A toast marked `notice` isn't an answer to what the
// owner just did (a sync notice, a reminder): while a focus block runs it waits for the break
// (F31 held notices, decided by the gate the focus timer sets).
import { nanoid } from "nanoid";
import { create } from "zustand";

export type ToastTone = "neutral" | "success" | "error";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
  /** Milliseconds before it hides itself; toasts with an action stay longer. */
  duration: number;
  /** Not a direct answer to the owner's action: may wait for the break during a focus block. */
  notice?: boolean;
}

type ToastGate = (item: ToastItem) => boolean;
let gate: ToastGate | null = null;

/** Lets the focus layer hold notices: the gate returns true when it keeps the toast for later. */
export function setToastGate(next: ToastGate | null): void {
  gate = next;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id" | "duration" | "tone"> & Partial<ToastItem>) => string;
  dismiss: (id: string) => void;
}

const MAX_VISIBLE = 3;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = toast.id ?? nanoid(8);
    const item: ToastItem = {
      tone: "neutral",
      duration: toast.action ? 8000 : 4500,
      ...toast,
      id,
    };
    if (item.notice && gate?.(item)) return id;
    set((s) => ({ toasts: [...s.toasts.filter((t) => t.id !== id), item].slice(-MAX_VISIBLE) }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Shows a toast from anywhere (components, stores, event handlers). */
export function toast(
  message: string,
  options: {
    tone?: ToastTone;
    action?: ToastItem["action"];
    id?: string;
    duration?: number;
    notice?: boolean;
  } = {},
): string {
  return useToastStore.getState().push({ message, ...options });
}
