// The keyboard shortcuts list (F30), opened with "?".
import { Fragment } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Misc";
import { MOD_KEY } from "@/components/ui/platform";
import { useUiStore } from "@/stores/uiStore";
import { SHORTCUT_GROUPS } from "./shortcuts";

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" size="sm">
      <div className="space-y-5 px-4 py-4 sm:px-5">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-sm font-semibold text-muted">{group.title}</h3>
            <dl className="divide-y divide-rule rounded-control border border-rule">
              {group.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 px-3 py-2">
                  <dt className="text-base text-text">{item.label}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {item.keys.map((k, i) => (
                      <Fragment key={i}>
                        {i > 0 && item.keys[0] === "G" && (
                          <span className="text-xs text-faint">then</span>
                        )}
                        <Kbd>{k === "Mod" ? MOD_KEY : k}</Kbd>
                      </Fragment>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p className="text-sm text-muted">
          Single-key shortcuts work when you're not typing in a text field.
        </p>
      </div>
    </Dialog>
  );
}
