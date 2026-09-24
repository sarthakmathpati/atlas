// Popover and Menu (section 12.7).
// - Popover: a click-opened panel next to its trigger. Focus moves inside and returns on close.
// - Menu: a Popover with role="menu", arrow-key navigation, and optional radio items.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import type { Placement } from "@floating-ui/react-dom";
import { Check, type LucideIcon } from "lucide-react";
import { cx } from "./cx";
import { FloatingPanel } from "./floating";

export interface TriggerProps {
  ref: (el: HTMLElement | null) => void;
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-haspopup": "dialog" | "menu";
  "aria-controls": string | undefined;
}

interface PopoverProps {
  renderTrigger: (props: TriggerProps, open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  placement?: Placement;
  /** Accessible name for the panel. */
  label: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useControllable(open: boolean | undefined, onOpenChange?: (open: boolean) => void) {
  const [inner, setInner] = useState(false);
  const value = open ?? inner;
  const set = useCallback(
    (next: boolean) => {
      if (open === undefined) setInner(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );
  return [value, set] as const;
}

export function Popover({
  renderTrigger,
  children,
  placement = "bottom-start",
  label,
  className,
  open: openProp,
  onOpenChange,
}: PopoverProps) {
  const [open, setOpen] = useControllable(openProp, onOpenChange);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const close = useCallback(() => {
    setOpen(false);
    anchor?.focus({ preventScroll: true });
  }, [anchor, setOpen]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const first =
        panel.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <>
      {renderTrigger(
        {
          ref: setAnchor,
          onClick: () => setOpen(!open),
          "aria-expanded": open,
          "aria-haspopup": "dialog",
          "aria-controls": open ? id : undefined,
        },
        open,
      )}
      <FloatingPanel
        anchor={anchor}
        open={open}
        placement={placement}
        onDismiss={() => setOpen(false)}
        role="dialog"
        aria-label={label}
        id={id}
        className={cx("p-3", className)}
      >
        <div ref={panelRef} tabIndex={-1} className="outline-none">
          {children(close)}
        </div>
      </FloatingPanel>
    </>
  );
}

export type MenuItem =
  | {
      kind?: "action";
      id: string;
      label: string;
      icon?: LucideIcon;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
      hint?: string;
    }
  | {
      kind: "radio";
      id: string;
      label: string;
      icon?: LucideIcon;
      checked: boolean;
      onSelect: () => void;
    }
  | { kind: "separator"; id: string }
  | { kind: "label"; id: string; label: string };

interface MenuProps {
  renderTrigger: (props: TriggerProps, open: boolean) => ReactNode;
  items: MenuItem[];
  label: string;
  placement?: Placement;
}

interface MenuListProps {
  items: MenuItem[];
  label: string;
  id?: string;
  /** Called before an item's action runs (closes the menu). */
  onClose: (restoreFocus?: boolean) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
}

function menuFocusable(list: HTMLDivElement | null): HTMLElement[] {
  return Array.from(
    list?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? [],
  );
}

/** The items of a menu with arrow-key navigation and type-ahead (shared by Menu and ContextMenu). */
function MenuList({ items, label, id, onClose, listRef }: MenuListProps) {
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const list = menuFocusable(listRef.current);
    const index = list.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (index + 1) % list.length;
    else if (e.key === "ArrowUp") next = (index - 1 + list.length) % list.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = list.length - 1;
    else if (e.key === "Tab") {
      onClose(false);
      return;
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const lower = e.key.toLowerCase();
      const start = index + 1;
      for (let i = 0; i < list.length; i++) {
        const el = list[(start + i) % list.length];
        if (el?.textContent?.trim().toLowerCase().startsWith(lower)) {
          next = (start + i) % list.length;
          break;
        }
      }
    }
    if (next >= 0) {
      e.preventDefault();
      list[next]?.focus();
    }
  };

  return (
    <div ref={listRef} role="menu" aria-label={label} id={id} onKeyDown={onKeyDown}>
      {items.map((item) => {
        if (item.kind === "separator")
          return <div key={item.id} role="separator" className="my-1 h-px bg-rule" />;
        if (item.kind === "label")
          return (
            <div key={item.id} role="presentation" className="px-2.5 pt-2 pb-1 text-xs text-muted">
              {item.label}
            </div>
          );
        const Icon = item.icon;
        const isRadio = item.kind === "radio";
        const disabled = !isRadio && item.disabled;
        return (
          <div
            key={item.id}
            role={isRadio ? "menuitemradio" : "menuitem"}
            aria-checked={isRadio ? item.checked : undefined}
            aria-disabled={disabled || undefined}
            tabIndex={-1}
            onClick={() => {
              if (disabled) return;
              onClose();
              item.onSelect();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (disabled) return;
                onClose();
                item.onSelect();
              }
            }}
            className={cx(
              "flex h-9 cursor-pointer items-center gap-2.5 rounded-control px-2.5 text-base outline-none select-none max-md:h-11",
              "hover:bg-surface-sunken focus-visible:bg-accent-soft focus:bg-accent-soft",
              !isRadio && item.danger ? "text-danger" : "text-text",
              disabled && "cursor-default opacity-50",
            )}
          >
            {Icon && <Icon size={16} aria-hidden="true" className="shrink-0 text-muted" />}
            <span className="flex-1">{item.label}</span>
            {isRadio && item.checked && (
              <Check size={15} aria-hidden="true" className="shrink-0 text-accent" />
            )}
            {!isRadio && item.hint && <span className="text-xs text-faint">{item.hint}</span>}
          </div>
        );
      })}
    </div>
  );
}

function useFocusFirstItem(open: boolean, listRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const list = menuFocusable(listRef.current);
      (list.find((el) => el.getAttribute("aria-checked") === "true") ?? list[0])?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, listRef]);
}

export function Menu({ renderTrigger, items, label, placement = "bottom-end" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();
  useFocusFirstItem(open, listRef);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) anchor?.focus({ preventScroll: true });
  };

  return (
    <>
      {renderTrigger(
        {
          ref: setAnchor,
          onClick: () => setOpen((v) => !v),
          "aria-expanded": open,
          "aria-haspopup": "menu",
          "aria-controls": open ? id : undefined,
        },
        open,
      )}
      <FloatingPanel
        anchor={anchor}
        open={open}
        placement={placement}
        onDismiss={() => setOpen(false)}
        className="min-w-44 p-1"
      >
        <MenuList items={items} label={label} id={id} onClose={close} listRef={listRef} />
      </FloatingPanel>
    </>
  );
}

interface ContextMenuProps {
  /** Where to open (viewport px), or null when closed. */
  at: { x: number; y: number } | null;
  items: MenuItem[];
  label: string;
  onClose: () => void;
  /** Focus goes back here when the menu closes (for example the bubble that was pressed). */
  returnFocus?: HTMLElement | null;
}

/** A menu opened at a point: right-click or long-press on something without its own button. */
export function ContextMenu({ at, items, label, onClose, returnFocus }: ContextMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const open = at !== null;
  useFocusFirstItem(open && anchor !== null, listRef);

  const close = (restore = true) => {
    onClose();
    if (restore && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  };

  return (
    <>
      {open && (
        <span
          ref={setAnchor}
          aria-hidden="true"
          style={{ position: "fixed", left: at.x, top: at.y, width: 1, height: 1 }}
        />
      )}
      <FloatingPanel
        anchor={anchor}
        open={open && anchor !== null}
        placement="bottom-start"
        gap={2}
        onDismiss={() => close(false)}
        className="min-w-52 p-1"
      >
        <MenuList items={items} label={label} onClose={close} listRef={listRef} />
      </FloatingPanel>
    </>
  );
}
