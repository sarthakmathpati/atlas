// Settings (F24): profile, appearance, learning, Claude, data and about. A section list on wide
// screens; #/settings?section=<id> scrolls to a section.
import { Keyboard, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { useServicesState, type Services } from "@/app/providers/servicesContext";
import { useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { prefersReducedMotion } from "@/components/ui/hooks";
import { PageSkeleton } from "@/components/ui/Misc";
import { syllabus } from "@/data/syllabus";
import { SEED_PROBLEMS } from "@/data/seed";
import { APP_NAME, APP_VERSION, SCHEMA_VERSION } from "@/lib/constants";
import { RUNTIME_CONTRACT } from "@/lib/runtime/claude";
import type { Profile } from "@/lib/types";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { ClaudeSection } from "./ClaudeSection";
import { DataSection } from "./DataSection";
import { SettingsRow, SettingsSection } from "./layout";
import { AppearanceSection, LearningSection } from "./PreferenceSections";
import { ProfileSection } from "./ProfileSection";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "learning", label: "Learning" },
  { id: "claude", label: "Claude" },
  { id: "data", label: "Data" },
  { id: "about", label: "About" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function useStorageUsage(kind: string | undefined): string | null {
  const [usage, setUsage] = useState<string | null>(null);
  useEffect(() => {
    if (kind !== "dexie") return;
    let cancelled = false;
    navigator.storage
      ?.estimate?.()
      .then((e) => {
        if (!cancelled && typeof e.usage === "number") setUsage(formatBytes(e.usage));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [kind]);
  return usage;
}

function AboutSection({ services }: { services: Services | null }) {
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const usage = useStorageUsage(services?.repository.kind);
  const runtime = services?.runtime;
  const rows: [string, string][] = [
    ["Version", APP_VERSION],
    [
      "Running as",
      !runtime
        ? "Checking…"
        : runtime.kind === "artifact"
          ? `A Claude artifact (runtime ${RUNTIME_CONTRACT})`
          : runtime.inClaudeFrame
            ? "A Claude artifact without synced storage"
            : "A web app",
    ],
    [
      "Storage",
      !services
        ? "Checking…"
        : services.repository.kind === "claude-db"
          ? "Synced document store on your Claude account"
          : services.repository.kind === "dexie"
            ? `This browser's database${usage ? `, about ${usage} used` : ""}`
            : "Memory only (not saved)",
    ],
    ["Data version", String(SCHEMA_VERSION)],
    [
      "Content",
      `${syllabus.counts.concepts} concepts in ${syllabus.counts.topics} topics, ${SEED_PROBLEMS.length} practice problems`,
    ],
  ];
  return (
    <SettingsSection id="about" title="About">
      <dl className="divide-y divide-rule">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-6 sm:px-5">
            <dt className="text-sm text-muted sm:w-40 sm:shrink-0">{label}</dt>
            <dd className="text-base text-text">{value}</dd>
          </div>
        ))}
      </dl>
      <SettingsRow
        label="Publishing and updates"
        description={`How to put ${APP_NAME} on GitHub Pages or publish it as a Claude artifact, and how to update it without losing data, is in DEPLOY.md in the project's repository.`}
      >
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={Keyboard} onClick={() => setShortcutsOpen(true)}>
            Keyboard shortcuts
          </Button>
          <Button size="sm" icon={Palette} href="#/kit">
            Design kit
          </Button>
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}

function Sections({ profile, services }: { profile: Profile; services: Services | null }) {
  return (
    <div className="min-w-0 space-y-10">
      <ProfileSection profile={profile} />
      <AppearanceSection profile={profile} />
      <LearningSection profile={profile} />
      <ClaudeSection profile={profile} services={services} />
      {services ? (
        <DataSection profile={profile} services={services} />
      ) : (
        <SettingsSection id="data" title="Data">
          <p className="px-5 py-4 text-base text-muted">Connecting to storage…</p>
        </SettingsSection>
      )}
      <AboutSection services={services} />
    </div>
  );
}

export default function SettingsPage() {
  const route = useRoute();
  const state = useServicesState();
  const services = state.status === "ready" ? state.services : null;
  const profile = useProfileStore((s) => s.profile);
  const section = route.query.get("section");
  const [active, setActive] = useState(section ?? "profile");

  // Deep links such as #/settings?section=data scroll to that section once it has rendered.
  useEffect(() => {
    if (!section || !profile) return;
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`settings-${section}`)
        ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      setActive(section);
    });
    return () => cancelAnimationFrame(frame);
  }, [section, profile]);

  return (
    <PageFrame>
      <PageHeader title="Settings" description="Everything here is saved as you change it." />
      {!profile ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
          <nav aria-label="Settings sections" className="hidden lg:block">
            <ul className="sticky top-6 space-y-0.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#/settings?section=${s.id}`}
                    aria-current={active === s.id ? "true" : undefined}
                    onClick={() => setActive(s.id)}
                    className={cx(
                      "flex h-9 items-center rounded-control px-3 text-base transition-colors",
                      active === s.id
                        ? "bg-accent-soft font-medium text-text"
                        : "text-muted hover:bg-surface-sunken hover:text-text",
                    )}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <Sections profile={profile} services={services} />
        </div>
      )}
    </PageFrame>
  );
}
