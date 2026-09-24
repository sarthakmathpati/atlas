// Navigation destinations (F1): the sidebar on desktop, the bottom tabs and "More" sheet on
// phones, the command palette's "Go to" commands and the `g` shortcuts all read this list.
import {
  CalendarCheck,
  DraftingCompass,
  Dumbbell,
  Gauge,
  ListChecks,
  Map,
  MessageSquareQuote,
  MessagesSquare,
  NotebookPen,
  RotateCcw,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { RouteName } from "../router";

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Routes that highlight this item. */
  routes: RouteName[];
  /** One of the four bottom tabs on phones (the fifth is "More"). */
  tab?: boolean;
  /** `g` + this key jumps here (F30). */
  goKey?: string;
  /** Words the command palette also matches. */
  keywords?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "today",
    label: "Today",
    path: "/today",
    icon: CalendarCheck,
    routes: ["today"],
    tab: true,
    goKey: "t",
    keywords: "home plan",
  },
  {
    id: "map",
    label: "Map",
    path: "/map",
    icon: Map,
    routes: ["map", "concept"],
    tab: true,
    goKey: "m",
    keywords: "syllabus concepts subjects topics",
  },
  {
    id: "problems",
    label: "Problems",
    path: "/problems",
    icon: ListChecks,
    routes: ["problems", "problem"],
    tab: true,
    goKey: "p",
    keywords: "leetcode tracker",
  },
  {
    id: "review",
    label: "Review",
    path: "/review",
    icon: RotateCcw,
    routes: ["review"],
    tab: true,
    goKey: "r",
    keywords: "re-solve due spaced repetition",
  },
  {
    id: "practice",
    label: "Practice",
    path: "/practice",
    icon: Dumbbell,
    routes: ["practice", "drill", "quiz", "mental-math", "puzzles"],
    keywords: "drill quiz flashcards mental math puzzles",
  },
  {
    id: "mock",
    label: "Mock interview",
    path: "/mock",
    icon: MessagesSquare,
    routes: ["mock", "mock-session"],
    keywords: "interview",
  },
  {
    id: "designs",
    label: "Designs",
    path: "/designs",
    icon: DraftingCompass,
    routes: ["designs", "design"],
    keywords: "system design lld hld",
  },
  {
    id: "stories",
    label: "Stories",
    path: "/stories",
    icon: MessageSquareQuote,
    routes: ["stories"],
    keywords: "behavioral star",
  },
  {
    id: "mistakes",
    label: "Mistakes",
    path: "/mistakes",
    icon: NotebookPen,
    routes: ["mistakes"],
    keywords: "journal tags",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: Gauge,
    routes: ["dashboard", "weekly"],
    goKey: "d",
    keywords: "readiness progress weekly",
  },
  {
    id: "revision",
    label: "Revision",
    path: "/revision",
    icon: ScrollText,
    routes: ["revision"],
    keywords: "cheat sheet print",
  },
];

export const SETTINGS_ITEM: NavItem = {
  id: "settings",
  label: "Settings",
  path: "/settings",
  icon: Settings,
  routes: ["settings", "kit"],
  goKey: "s",
  keywords: "profile theme backup export import",
};

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, SETTINGS_ITEM];

export function navItemFor(route: RouteName): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.routes.includes(route));
}
