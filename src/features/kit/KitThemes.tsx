// The design kit's Survey sections (12.10): each theme side by side (drawn in that theme whatever
// the app shows, through data-theme-preview), the subject colors and emblems, and the contour
// texture with its map extras.
import { Play, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardLabel } from "@/components/ui/Card";
import { DifficultyChip, PatternChip, StatusChip } from "@/components/ui/Chip";
import { ContourCanvas } from "@/components/ui/ContourCanvas";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { STATUS_LABEL, STATUS_ORDER } from "@/components/ui/labels";
import { SubjectEmblem, SubjectMark } from "@/components/ui/SubjectEmblem";
import { subjects } from "@/data/syllabus";
import type { ContourHill } from "@/lib/art/contours";
import { THEME_LABEL, type ThemeName } from "@/lib/theme";

const MAP_KIND: Record<ThemeName, { title: string; note: string }> = {
  day: { title: "A survey sheet", note: "Green-gray paper, brown contours and spot heights." },
  dusk: { title: "An old atlas", note: "Dim warm paper, gold contours and a dotted graticule." },
  night: { title: "A sea chart", note: "Charcoal water, cool depth lines and faint soundings." },
};

const SURFACES: [string, string][] = [
  ["Canvas", "var(--canvas)"],
  ["Sidebar", "var(--sidebar)"],
  ["Surface", "var(--surface)"],
  ["Raised", "var(--surface-raised)"],
  ["Sunken", "var(--surface-sunken)"],
];

const PREVIEW_HILLS: ContourHill[] = [
  { x: 0.7, y: 0.62, r: 0.16, height: 1.05, label: "DSA 57" },
  { x: 0.88, y: 0.3, r: 0.1, height: 0.8 },
];

function ThemePreview({ theme }: { theme: ThemeName }) {
  const kind = MAP_KIND[theme];
  return (
    <div
      data-theme-preview={theme}
      className="flex flex-col gap-3 overflow-hidden rounded-focal bg-canvas p-3 text-text"
    >
      <div className="relative isolate overflow-hidden rounded-panel bg-surface-sunken px-4 py-4">
        <ContourCanvas seed={`kit-${theme}`} levels={10} hills={PREVIEW_HILLS} className="-z-10" />
        <p className="text-xs font-medium text-muted">{kind.title}</p>
        <h3 className="font-display text-2xl font-semibold">{THEME_LABEL[theme]}</h3>
        <p className="mt-1 max-w-[24ch] text-sm text-muted">{kind.note}</p>
      </div>

      <div className="grid grid-cols-5 gap-1.5" role="list" aria-label="Surfaces">
        {SURFACES.map(([name, color]) => (
          <div key={name} role="listitem" className="flex flex-col items-center gap-1">
            <span
              className="grid h-10 w-full place-items-center rounded-control text-sm font-semibold shadow-[inset_0_0_0_1px_var(--rule)]"
              style={{ background: color } as CSSProperties}
            >
              Aa
            </span>
            <span className="text-[11px] text-muted">{name}</span>
          </div>
        ))}
      </div>

      <Card className="flex flex-col gap-3">
        <p className="text-base">
          Text, <span className="text-muted">muted text</span>,{" "}
          <span className="text-faint">faint text</span> and{" "}
          <a href="#/kit" className="text-accent underline underline-offset-2">
            a link
          </a>
          .
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {STATUS_ORDER.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-sm">
              <StatusGlyph status={s} size={16} />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusChip status="learning" />
          <DifficultyChip difficulty="medium" />
          <PatternChip label="Two pointers" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" icon={Plus}>
            Primary
          </Button>
          <Button size="sm">Secondary</Button>
          <Button size="sm" variant="ghost">
            Ghost
          </Button>
        </div>
      </Card>

      <Card focal className="p-4 sm:p-4">
        <CardLabel>Up next</CardLabel>
        <div className="mt-2 flex items-center gap-3">
          <SubjectEmblem subjectId="dsa" size={36} />
          <p className="font-display text-lg font-semibold">Re-solve: 69. Sqrt(x)</p>
        </div>
        <p className="mt-1.5 text-sm text-muted">The focal card: raised, with the one shadow.</p>
        <Button size="sm" variant="primary" icon={Play} className="mt-3">
          Start
        </Button>
      </Card>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1 pb-1 text-sm text-muted">
        {["dsa", "os", "sysd", "prob", "career"].map((id) => {
          const subject = subjects.find((s) => s.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-1.5">
              <SubjectMark subjectId={id} />
              {subject?.shortName}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Day, Dusk and Night side by side, whatever theme the app shows. */
export function KitThemes() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {(["day", "dusk", "night"] as const).map((t) => (
        <ThemePreview key={t} theme={t} />
      ))}
    </div>
  );
}

/** Every subject's color: its emblem on its tint, the square mark and its name. */
export function KitSubjects() {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,11.5rem),1fr))] gap-2">
      {subjects.map((s) => (
        <li
          key={s.id}
          data-subject={s.id}
          className="flex items-center gap-2.5 rounded-control bg-subject-tint p-2"
        >
          <SubjectEmblem subjectId={s.id} size={40} variant="bare" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
              <SubjectMark subjectId={s.id} />
              <span className="truncate">{s.shortName}</span>
            </span>
            <span className="block truncate text-xs text-muted">hue {s.regionHue}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The contour texture as a page head uses it: hills with spot heights, text kept clear. */
export function KitContours() {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative isolate overflow-hidden rounded-focal bg-surface-sunken px-5 py-6 sm:px-6">
        <ContourCanvas
          seed={20260927}
          hills={[
            { x: 0.6, y: 0.66, r: 0.17, height: 1.09, label: "DSA 57" },
            { x: 0.73, y: 0.3, r: 0.13, height: 1.12, label: "CN 59" },
            { x: 0.86, y: 0.8, r: 0.11, height: 0.92, label: "OS 44" },
          ]}
          className="-z-10"
        />
        <p className="text-sm text-muted">Sunday, 27 September</p>
        <p className="mt-1 font-display text-page font-semibold max-sm:text-2xl">Good evening</p>
        <p className="mt-1 max-w-[36ch] text-base text-muted">
          A page head on the theme's paper. Spot heights and soundings stay clear of the words.
        </p>
      </div>
      <p className="text-sm text-muted">
        Drawn by <code className="font-mono text-[0.9em]">lib/art/contours.ts</code>: seeded hills
        and waves, marching squares, the same picture every time. Never behind lessons, code, drill
        prompts or flashcards.
      </p>
    </div>
  );
}
