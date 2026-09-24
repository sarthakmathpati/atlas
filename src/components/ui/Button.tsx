// Buttons (section 12.7): primary (at most one per view), secondary, ghost, and danger for
// destructive confirmations. Touch targets grow to 44 px on phones (F30).
import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "./cx";
import { Tooltip } from "./Tooltip";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover border border-transparent",
  secondary:
    "bg-surface text-text border border-rule hover:bg-surface-sunken hover:border-rule-strong",
  ghost: "bg-transparent text-text border border-transparent hover:bg-surface-sunken",
  danger: "bg-danger text-on-danger hover:bg-danger-hover border border-transparent",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 max-md:min-h-11 max-md:h-auto",
  md: "h-10 px-4 text-base gap-2 max-md:h-11",
};

function buttonClasses(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return cx(
    "inline-flex shrink-0 items-center justify-center rounded-control font-medium whitespace-nowrap select-none",
    "transition-colors duration-100 disabled:pointer-events-none disabled:opacity-55",
    "aria-disabled:pointer-events-none aria-disabled:opacity-55",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Icon after the label (for example a chevron on a menu button). */
  trailingIcon?: LucideIcon;
  children?: ReactNode;
  className?: string;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  "aria-label"?: string;
  title?: string;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/** A button, or a link styled as one when `href` is set (use `#/route` for in-app links). */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = "secondary",
      size = "md",
      icon: Icon,
      trailingIcon: Trailing,
      children,
      className,
    } = props;
    const iconSize = size === "sm" ? 15 : 16;
    const content = (
      <>
        {Icon && <Icon size={iconSize} aria-hidden="true" className="shrink-0" />}
        {children}
        {Trailing && (
          <Trailing size={iconSize} aria-hidden="true" className="shrink-0 opacity-70" />
        )}
      </>
    );
    const classes = buttonClasses(variant, size, className);
    if (props.href !== undefined) {
      const { href, target, rel, onClick, title } = props;
      const external = /^https?:/.test(href);
      return (
        <a
          ref={ref as Ref<HTMLAnchorElement>}
          href={href}
          target={target ?? (external ? "_blank" : undefined)}
          rel={rel ?? (external ? "noopener noreferrer" : undefined)}
          onClick={onClick}
          title={title}
          aria-label={props["aria-label"]}
          className={classes}
        >
          {content}
        </a>
      );
    }
    const {
      variant: _v,
      size: _s,
      icon: _i,
      trailingIcon: _t,
      children: _c,
      className: _cn,
      href: _h,
      type = "button",
      ...rest
    } = props;
    return (
      <button ref={ref as Ref<HTMLButtonElement>} type={type} className={classes} {...rest}>
        {content}
      </button>
    );
  },
);

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "aria-label"
> {
  icon: LucideIcon;
  /** Accessible name, also shown as a tooltip. */
  label: string;
  variant?: "ghost" | "secondary" | "primary";
  size?: "sm" | "md";
  /** Hide the hover tooltip (for example when a visible label sits next to the button). */
  noTooltip?: boolean;
  /** Extra text for the tooltip, such as a shortcut. */
  shortcut?: string;
}

/** An icon-only button with an accessible label and a tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon: Icon,
    label,
    variant = "ghost",
    size = "md",
    noTooltip,
    shortcut,
    className,
    type = "button",
    ...rest
  },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-control transition-colors duration-100",
        "disabled:pointer-events-none disabled:opacity-55",
        size === "sm" ? "size-8 max-md:size-11" : "size-9 max-md:size-11",
        variant === "ghost" && "text-muted hover:bg-surface-sunken hover:text-text",
        variant === "secondary" &&
          "border border-rule bg-surface text-text hover:bg-surface-sunken",
        variant === "primary" && "bg-accent text-on-accent hover:bg-accent-hover",
        className,
      )}
      {...rest}
    >
      <Icon size={size === "sm" ? 16 : 18} aria-hidden="true" />
    </button>
  );
  if (noTooltip) return button;
  return (
    <Tooltip content={label} shortcut={shortcut}>
      {button}
    </Tooltip>
  );
});
