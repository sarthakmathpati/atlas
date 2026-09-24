// Tooltip (section 12.7): a short label on hover (after a short delay) or keyboard focus.
// It never appears for touch, and it only repeats what the control's accessible name says, so
// screen readers aren't told twice (aria-describedby is used only for extra shortcut text).
// The anchor is taken from the event, so the child's own ref passes through untouched.
import { cloneElement, isValidElement, useEffect, useId, useState, type ReactElement } from "react";
import type { Placement } from "@floating-ui/react-dom";
import { FloatingPanel } from "./floating";

const OPEN_DELAY_MS = 450;

interface TooltipProps {
  content: string;
  /** Keyboard shortcut shown after the label, for example "Ctrl K". */
  shortcut?: string;
  placement?: Placement;
  children: ReactElement;
}

type ChildProps = {
  onPointerEnter?: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (e: React.PointerEvent<HTMLElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLElement>) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void;
  "aria-describedby"?: string;
};

export function Tooltip({ content, shortcut, placement = "bottom", children }: TooltipProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  /** The element the pointer rests on; the tooltip opens after a short delay. */
  const [hovered, setHovered] = useState<HTMLElement | null>(null);
  const id = useId();

  useEffect(() => {
    if (!hovered) return;
    const t = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => clearTimeout(t);
  }, [hovered]);

  const hide = () => {
    setHovered(null);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!isValidElement(children)) return children;
  const props = children.props as ChildProps;

  return (
    <>
      {cloneElement(children as ReactElement<ChildProps>, {
        "aria-describedby": shortcut && open ? id : props["aria-describedby"],
        onPointerEnter: (e) => {
          props.onPointerEnter?.(e);
          if (e.pointerType === "touch") return;
          setAnchor(e.currentTarget);
          setHovered(e.currentTarget);
        },
        onPointerLeave: (e) => {
          props.onPointerLeave?.(e);
          hide();
        },
        onPointerDown: (e) => {
          props.onPointerDown?.(e);
          hide();
        },
        onFocus: (e) => {
          props.onFocus?.(e);
          // Only keyboard focus shows the tooltip; a click focuses too but shouldn't.
          if (e.currentTarget.matches(":focus-visible")) {
            setAnchor(e.currentTarget);
            setOpen(true);
          }
        },
        onBlur: (e) => {
          props.onBlur?.(e);
          hide();
        },
      })}
      <FloatingPanel
        anchor={anchor}
        open={open && anchor !== null && anchor.isConnected}
        placement={placement}
        passive
        gap={6}
        role="tooltip"
        id={id}
        className="rounded-control px-2 py-1 text-xs font-medium whitespace-nowrap"
      >
        {content}
        {shortcut && <span className="ml-2 text-faint">{shortcut}</span>}
      </FloatingPanel>
    </>
  );
}
