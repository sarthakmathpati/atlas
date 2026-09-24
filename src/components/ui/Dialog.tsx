// Dialog, Drawer and BottomSheet (section 12.7), all built on the native <dialog> element:
// it gives a real modal (focus kept inside, the page behind made inert), Escape to close, and the
// top layer. Motion lives in components.css (150 ms dialogs, 180 ms panels; none when reduced).
import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cx } from "./cx";
import { useLatest, usePresence } from "./hooks";
import { IconButton } from "./Button";

type LayerKind = "dialog" | "drawer" | "sheet";

interface LayerProps {
  open: boolean;
  onClose: () => void;
  kind: LayerKind;
  /** Modal layers trap focus and dim the page. Non-modal drawers leave the page usable. */
  modal?: boolean;
  labelledBy?: string;
  label?: string;
  describedBy?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Clicking the dimmed backdrop closes the layer (default true). */
  closeOnBackdrop?: boolean;
  children: ReactNode;
  dialogRef?: React.RefObject<HTMLDialogElement | null>;
}

function Layer({
  open,
  onClose,
  kind,
  modal = true,
  labelledBy,
  label,
  describedBy,
  className,
  style,
  closeOnBackdrop = true,
  children,
  dialogRef,
}: LayerProps) {
  const ownRef = useRef<HTMLDialogElement>(null);
  const ref = dialogRef ?? ownRef;
  const onCloseRef = useLatest(onClose);
  const mounted = usePresence(open, 220);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      try {
        if (modal) dialog.showModal();
        else dialog.show();
      } catch {
        dialog.setAttribute("open", "");
      }
      // Opening moves focus to the first focusable element; a field marked data-autofocus (the
      // search input, a name field) should get it instead.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      const target = returnFocus.current;
      returnFocus.current = null;
      if (target?.isConnected) target.focus({ preventScroll: true });
    }
  }, [open, modal, ref, mounted]);

  // Escape (the native "cancel" event): let React state drive the close so animations run.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onCloseRef.current();
    };
    const onNativeClose = () => {
      if (open) onCloseRef.current();
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onNativeClose);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onNativeClose);
    };
  }, [open, ref, onCloseRef, mounted]);

  // Non-modal drawers still close with Escape when focus is inside them.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (!modal && e.key === "Escape" && !e.defaultPrevented) {
      e.preventDefault();
      onClose();
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDialogElement>) => {
    // A press on the ::backdrop targets the dialog element itself, outside its content box.
    if (!modal || !closeOnBackdrop || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inside) onClose();
  };

  if (!mounted) return null;
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-label={label}
      aria-describedby={describedBy}
      aria-modal={modal || undefined}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      className={cx(
        "atlas-layer",
        modal && "atlas-modal",
        kind === "dialog" && "atlas-dialog",
        kind === "drawer" && "atlas-drawer",
        kind === "sheet" && "atlas-sheet",
        className,
      )}
      style={style}
    >
      {children}
    </dialog>
  );
}

interface LayerHeaderProps {
  title: ReactNode;
  titleId: string;
  description?: ReactNode;
  descriptionId?: string;
  onClose: () => void;
  actions?: ReactNode;
}

function LayerHeader({
  title,
  titleId,
  description,
  descriptionId,
  onClose,
  actions,
}: LayerHeaderProps) {
  return (
    <div className="flex shrink-0 items-start gap-3 border-b border-rule px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1 pt-1">
        <h2 id={titleId} className="text-lg font-semibold text-text">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-1 text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      {actions}
      <IconButton icon={X} label="Close" onClick={onClose} noTooltip className="-mr-1.5" />
    </div>
  );
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons for the footer; put the primary action last. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  closeOnBackdrop?: boolean;
  /** Hide the header (the content provides its own title, labelled by `label`). */
  bare?: boolean;
  label?: string;
  className?: string;
}

const DIALOG_WIDTH = {
  sm: "min(420px, calc(100vw - 32px))",
  md: "min(560px, calc(100vw - 32px))",
  lg: "min(760px, calc(100vw - 32px))",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop,
  bare,
  label,
  className,
}: DialogProps) {
  const titleId = useId();
  const descId = useId();
  return (
    <Layer
      open={open}
      onClose={onClose}
      kind="dialog"
      labelledBy={bare ? undefined : titleId}
      label={bare ? label : undefined}
      describedBy={description && !bare ? descId : undefined}
      closeOnBackdrop={closeOnBackdrop}
      style={{ width: DIALOG_WIDTH[size] }}
      className={className}
    >
      <div className="flex max-h-[min(86vh,860px)] flex-col">
        {!bare && (
          <LayerHeader
            title={title}
            titleId={titleId}
            description={description}
            descriptionId={descId}
            onClose={onClose}
          />
        )}
        {children && <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>}
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-rule px-4 py-3 sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </Layer>
  );
}

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Width in px; the owner can drag the left edge when `resizable` (saved per `storageKey`). */
  width?: number;
  resizable?: boolean;
  storageKey?: string;
  modal?: boolean;
  headerActions?: ReactNode;
}

const MIN_DRAWER = 320;

function readWidth(key: string | undefined, fallback: number): number {
  if (!key) return fallback;
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v >= MIN_DRAWER ? v : fallback;
  } catch {
    return fallback;
  }
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 440,
  resizable,
  storageKey,
  modal = false,
  headerActions,
}: DrawerProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [initialWidth] = useState(() => readWidth(storageKey, width));
  const widthRef = useRef(initialWidth);

  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const max = Math.max(MIN_DRAWER, window.innerWidth - 240);
      const next = Math.min(max, Math.max(MIN_DRAWER, window.innerWidth - ev.clientX));
      widthRef.current = next;
      dialog.style.width = `${next}px`;
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, String(Math.round(widthRef.current)));
        } catch {
          /* a remembered width is only a convenience */
        }
      }
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  const onResizeKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const dialog = dialogRef.current;
    if (!dialog || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const delta = e.key === "ArrowLeft" ? 24 : -24;
    const max = Math.max(MIN_DRAWER, window.innerWidth - 240);
    widthRef.current = Math.min(max, Math.max(MIN_DRAWER, widthRef.current + delta));
    dialog.style.width = `${widthRef.current}px`;
  };

  return (
    <Layer
      open={open}
      onClose={onClose}
      kind="drawer"
      modal={modal}
      labelledBy={titleId}
      describedBy={description ? descId : undefined}
      dialogRef={dialogRef}
      style={{ width: `min(${initialWidth}px, 100vw)` }}
    >
      <div className="relative flex h-full flex-col">
        {resizable && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            tabIndex={0}
            onPointerDown={startResize}
            onKeyDown={onResizeKey}
            className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize outline-none hover:bg-accent-soft focus-visible:bg-accent-soft max-md:hidden"
          />
        )}
        <LayerHeader
          title={title}
          titleId={titleId}
          description={description}
          descriptionId={descId}
          onClose={onClose}
          actions={headerActions}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-rule px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </Layer>
  );
}

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Show the title visually (default) or only to screen readers. */
  hideTitle?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

/** A sheet that slides up from the bottom on phones. Drag the handle down to close it. */
export function BottomSheet({
  open,
  onClose,
  title,
  hideTitle,
  children,
  footer,
}: BottomSheetProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const startY = e.clientY;
    const startT = performance.now();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    dialog.dataset.dragging = "";
    let dy = 0;
    const move = (ev: PointerEvent) => {
      dy = Math.max(0, ev.clientY - startY);
      dialog.style.setProperty("--sheet-drag", `${dy}px`);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      delete dialog.dataset.dragging;
      const velocity = dy / Math.max(1, performance.now() - startT);
      const shouldClose = dy > dialog.offsetHeight * 0.25 || velocity > 0.6;
      dialog.style.setProperty("--sheet-drag", "0px");
      if (shouldClose) onClose();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  useEffect(() => {
    if (!open) dialogRef.current?.style.setProperty("--sheet-drag", "0px");
  }, [open]);

  return (
    <Layer open={open} onClose={onClose} kind="sheet" labelledBy={titleId} dialogRef={dialogRef}>
      <div className="flex max-h-[inherit] flex-col">
        <div
          onPointerDown={startDrag}
          className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-1.5"
          aria-hidden="true"
        >
          <span className="h-1 w-10 rounded-full bg-rule-strong" />
        </div>
        <div
          className={cx(
            "flex items-center justify-between gap-3 px-4 pb-2",
            hideTitle && "sr-only",
          )}
        >
          <h2 id={titleId} className="text-md font-semibold text-text">
            {title}
          </h2>
          <IconButton icon={X} label="Close" onClick={onClose} noTooltip className="-mr-2" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-rule px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </Layer>
  );
}
