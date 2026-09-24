// Theme picker: system, light or dark (F1). Saved to the profile when storage is ready.
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useServicesState } from "@/app/providers/servicesContext";
import { applyTheme, readStoredTheme, type ThemeChoice } from "@/app/theme";

const OPTIONS: { value: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  const services = useServicesState();
  const [choice, setChoice] = useState<ThemeChoice>(readStoredTheme);

  // Once storage is ready, the profile's theme wins (it may have been changed on another device).
  useEffect(() => {
    if (services.status !== "ready") return;
    let cancelled = false;
    void services.services.repository.profile.get().then((profile) => {
      if (!cancelled && profile && profile.theme !== readStoredTheme()) {
        applyTheme(profile.theme);
        setChoice(profile.theme);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [services]);

  const pick = (value: ThemeChoice) => {
    setChoice(value);
    applyTheme(value);
    if (services.status === "ready") {
      void services.services.repository.profile.patch({ theme: value }).catch(() => undefined);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-control border border-rule bg-surface p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => pick(value)}
            className={`inline-flex h-11 min-w-11 items-center sm:h-9 sm:min-w-9 justify-center gap-1.5 rounded-[5px] px-2.5 text-sm transition-colors ${
              active ? "bg-accent-soft text-accent" : "text-muted hover:text-text"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
