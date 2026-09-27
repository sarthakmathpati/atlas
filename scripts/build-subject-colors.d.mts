// Types for scripts/build-subject-colors.mjs (used by tests).
export interface SubjectHue {
  id: string;
  order: number;
  hue: number;
}
export interface SubjectColor {
  id: string;
  hue: number;
  dayMark: string;
  dayTint: string;
  darkMark: string;
  darkTint: string;
}
export const SUBJECT_COLOR_LEVELS: Record<
  "dayMark" | "dayTint" | "darkMark" | "darkTint",
  { L: number; C: number }
>;
export function readSubjectHues(contentDir?: string): SubjectHue[];
export function subjectColors(subjects: { id: string; hue: number }[]): SubjectColor[];
export function renderSubjectCss(colors: SubjectColor[]): string;
