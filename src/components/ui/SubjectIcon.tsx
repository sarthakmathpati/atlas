// Maps a subject's `icon` name (from content/<subject>/_subject.md) to a Lucide outline icon.
import {
  Boxes,
  Brain,
  ChartCandlestick,
  Code,
  Cpu,
  Database,
  Dice5,
  GitBranch,
  GitMerge,
  LayoutGrid,
  Microchip,
  Network,
  Puzzle,
  Server,
  Sigma,
  Table,
  UserRound,
  Wrench,
  Circle,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  code: Code,
  "git-branch": GitBranch,
  boxes: Boxes,
  "layout-grid": LayoutGrid,
  cpu: Cpu,
  "git-merge": GitMerge,
  microchip: Microchip,
  network: Network,
  database: Database,
  table: Table,
  server: Server,
  "dice-5": Dice5,
  sigma: Sigma,
  puzzle: Puzzle,
  "candlestick-chart": ChartCandlestick,
  brain: Brain,
  wrench: Wrench,
  "user-round": UserRound,
};

export function SubjectIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Circle;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}
