// The ADHD mode switch (F32): at the right of the top bar on every page, Today and Dashboard
// included. A pill with the words and a small track; on phones the words shorten to "ADHD".
import { cx } from "@/components/ui/cx";
import { Tooltip } from "@/components/ui/Tooltip";
import { setAdhdOn, useAdhdOn } from "@/stores/adhdStore";
import { useProfileStore } from "@/stores/profileStore";

export function AdhdSwitch() {
  const on = useAdhdOn();
  const ready = useProfileStore((s) => s.profile !== null);
  return (
    <Tooltip content={on ? "ADHD mode is on. Turn it off" : "Turn on ADHD mode"}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="ADHD mode"
        disabled={!ready}
        onClick={() => setAdhdOn(!on)}
        data-peripheral
        className={cx(
          "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border-[1.5px] bg-surface pr-1.5 pl-3 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-55 max-md:h-11 max-md:pl-2.5",
          on
            ? "border-accent text-accent"
            : "border-rule text-muted hover:border-rule-strong hover:text-text",
        )}
      >
        <span className="max-sm:hidden">ADHD mode</span>
        <span className="sm:hidden">ADHD</span>
        <span
          aria-hidden="true"
          className={cx(
            "relative inline-block h-[18px] w-[30px] rounded-full transition-colors",
            on ? "bg-accent" : "bg-surface-sunken",
          )}
        >
          <span
            className={cx(
              "absolute top-0.5 left-0.5 size-3.5 rounded-full transition-transform",
              on ? "translate-x-3 bg-on-accent" : "bg-faint",
            )}
          />
        </span>
      </button>
    </Tooltip>
  );
}
