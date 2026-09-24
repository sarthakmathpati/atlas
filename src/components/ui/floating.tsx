// The base for popovers, menus, comboboxes and tooltips: a panel anchored to an element,
// positioned with Floating UI and lifted into the browser's top layer (the Popover API), so it
// shows above dialogs and drawers. Outside clicks and Escape dismiss only the topmost layer.
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
  type Placement,
} from "@floating-ui/react-dom";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";
import { useLatest } from "./hooks";
import { isTopLayer, layerStack, POPOVER_MANUAL, showInTopLayer } from "./topLayer";

interface FloatingPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  anchor: HTMLElement | null;
  open: boolean;
  placement?: Placement;
  /** Called on Escape or a click outside the panel and the anchor. */
  onDismiss?: () => void;
  /** Make the panel at least as wide as the anchor (menus, comboboxes). */
  matchWidth?: boolean;
  gap?: number;
  /** Tooltips don't take part in dismissal and never catch pointer events. */
  passive?: boolean;
  children: ReactNode;
}

export function FloatingPanel({
  anchor,
  open,
  placement = "bottom-start",
  onDismiss,
  matchWidth,
  gap = 6,
  passive,
  className,
  style,
  children,
  ...rest
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dismiss = useLatest(onDismiss);
  const { refs, floatingStyles } = useFloating({
    open,
    strategy: "fixed",
    placement,
    elements: { reference: anchor },
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(gap),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, availableWidth, rects, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(120, availableHeight)}px`,
            maxWidth: `${Math.max(160, availableWidth)}px`,
            minWidth: matchWidth ? `${rects.reference.width}px` : "",
          });
        },
      }),
    ],
  });

  useLayoutEffect(() => {
    if (open) showInTopLayer(panelRef.current);
  }, [open]);

  useEffect(() => {
    if (!open || passive) return;
    const token = Symbol("layer");
    layerStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !isTopLayer(token)) return;
      // Stop a surrounding <dialog> from closing too.
      e.preventDefault();
      e.stopPropagation();
      dismiss.current?.();
    };
    const onPointer = (e: PointerEvent) => {
      if (!isTopLayer(token)) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || anchor?.contains(target)) return;
      dismiss.current?.();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer, true);
      const i = layerStack.indexOf(token);
      if (i >= 0) layerStack.splice(i, 1);
    };
  }, [open, passive, anchor, dismiss]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={(el) => {
        panelRef.current = el;
        refs.setFloating(el);
      }}
      popover={POPOVER_MANUAL}
      className={cx("atlas-float", passive && "pointer-events-none")}
      style={{ ...floatingStyles, zIndex: 60 } as CSSProperties}
    >
      <div
        className={cx(
          "atlas-float-panel overflow-auto rounded-panel border border-rule bg-surface-raised text-text shadow-float",
          className,
        )}
        style={{ maxHeight: "inherit", ...style }}
        {...rest}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
