// Toasts (F1): short confirmations such as "Attempt saved. Next review in 3 days". A destructive
// action always offers Undo through `action`.
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
    set((s) => ({ toasts: [...s.toasts.filter((t) => t.id !== id), item].slice(-MAX_VISIBLE) }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Shows a toast from anywhere (components, stores, event handlers). */
export function toast(
  message: string,
  options: { tone?: ToastTone; action?: ToastItem["action"]; id?: string; duration?: number } = {},
): string {
  return useToastStore.getState().push({ message, ...options });
}
