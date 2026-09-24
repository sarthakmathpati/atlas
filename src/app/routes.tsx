// Route table (F1): every hash route renders a page. Pages load on demand so the shell paints
// first (in the single-file artifact everything is inlined, and lazy() simply resolves at once).
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type * as PlaceholderPages from "@/features/placeholder/pages";
import type { RouteName } from "./router";

type Page = LazyExoticComponent<ComponentType>;

const placeholder = (name: keyof typeof PlaceholderPages): Page =>
  lazy(() => import("@/features/placeholder/pages").then((m) => ({ default: m[name] })));

export const PAGES: Record<RouteName, Page> = {
  today: lazy(() => import("@/features/today/TodayPage")),
  map: lazy(() => import("@/features/map/MapPage")),
  concept: lazy(() => import("@/features/concept/ConceptPage")),
  problems: lazy(() => import("@/features/problems/ProblemsPage")),
  problem: lazy(() => import("@/features/problems/ProblemPage")),
  review: lazy(() => import("@/features/review/ReviewPage")),
  practice: placeholder("PracticePage"),
  drill: placeholder("DrillPage"),
  quiz: lazy(() => import("@/features/review/QuizPage")),
  "mental-math": placeholder("MentalMathPage"),
  puzzles: placeholder("PuzzlesPage"),
  mock: placeholder("MockPage"),
  "mock-session": placeholder("MockPage"),
  designs: placeholder("DesignsPage"),
  design: lazy(() => import("@/features/designs/DesignPage")),
  stories: placeholder("StoriesPage"),
  mistakes: lazy(() => import("@/features/mistakes/MistakesPage")),
  dashboard: placeholder("DashboardPage"),
  weekly: placeholder("WeeklyPage"),
  revision: placeholder("RevisionPage"),
  settings: lazy(() => import("@/features/settings/SettingsPage")),
  kit: lazy(() => import("@/features/kit/KitPage")),
  welcome: lazy(() => import("@/features/onboarding/OnboardingPage")),
  "not-found": placeholder("NotFoundPage"),
};
