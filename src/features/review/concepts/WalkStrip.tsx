// The memory walk's strip (F31): one dot per stop (concept) in the order of the walk, joined by
// a dashed line like the route on Today; stops passed are filled, the current one is ringed.
import { cx } from "@/components/ui/cx";

export function WalkStrip({
  stops,
  current,
}: {
  stops: { id: string; name: string }[];
  current: number;
}) {
  if (stops.length < 2) return null;
  const here = stops[current];
  return (
    <div className="flex flex-col gap-1.5" data-testid="walk-strip">
      <ol aria-label="Memory walk" className="relative flex flex-wrap items-center gap-x-2 gap-y-2">
        {stops.map((stop, i) => (
          <li key={stop.id} className="relative flex items-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className="mr-2 inline-block w-2 border-t-2 border-dashed border-rule-strong"
              />
            )}
            <span
              title={stop.name}
              aria-current={i === current ? "step" : undefined}
              className={cx(
                "inline-block size-2.5 rounded-full border-2",
                i < current && "border-accent bg-accent",
                i === current && "border-accent bg-surface ring-3 ring-accent-soft",
                i > current && "border-rule-strong bg-transparent",
              )}
            >
              <span className="sr-only">
                {stop.name}
                {i < current ? ", visited" : i === current ? ", here" : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {here && (
        <p className="text-xs text-muted">
          Memory walk: stop {current + 1} of {stops.length}, cards in the order of their places on
          the map.
        </p>
      )}
    </div>
  );
}
