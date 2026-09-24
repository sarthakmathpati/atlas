// Recently opened palette results: a per-browser convenience in localStorage (never synced).
import type { SearchKind } from "@/lib/search/searchIndex";

export interface RecentItem {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  href: string;
}

const KEY = "atlas.recent";
const MAX = 6;

export function readRecents(): RecentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RecentItem =>
          typeof r === "object" &&
          r !== null &&
          typeof (r as RecentItem).id === "string" &&
          typeof (r as RecentItem).title === "string" &&
          typeof (r as RecentItem).href === "string" &&
          (r as RecentItem).href.startsWith("#/"),
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushRecent(item: RecentItem): RecentItem[] {
  const entry: RecentItem = {
    id: item.id,
    kind: item.kind,
    title: item.title,
    subtitle: item.subtitle,
    href: item.href,
  };
  const next = [entry, ...readRecents().filter((r) => r.id !== item.id)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* only a convenience */
  }
  return next;
}
