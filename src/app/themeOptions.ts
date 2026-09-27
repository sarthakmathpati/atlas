// The theme choices as the top bar, Settings and the palette show them (12.10.2).
import { Monitor, Moon, Sun, SunMoon, Sunset, type LucideIcon } from "lucide-react";
import type { ThemeChoice } from "@/lib/types";

export const THEME_OPTIONS: { value: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "day", label: "Day", icon: Sun },
  { value: "dusk", label: "Dusk", icon: Sunset },
  { value: "night", label: "Night", icon: Moon },
  { value: "schedule", label: "By time of day", icon: SunMoon },
];

export const THEME_ICON: Record<ThemeChoice, LucideIcon> = Object.fromEntries(
  THEME_OPTIONS.map((o) => [o.value, o.icon]),
) as Record<ThemeChoice, LucideIcon>;
