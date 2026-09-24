// Where a concept the owner adds goes on the map (F2): next to its topic, without overlapping
// anything. Tries rings around the topic's center, closest first, at fixed angles; deterministic.

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export function placeNearTopic(
  topic: Circle,
  occupied: readonly Circle[],
  radius: number,
  gap = 26,
): { x: number; y: number } {
  const fits = (x: number, y: number) =>
    occupied.every((o) => Math.hypot(o.x - x, o.y - y) >= o.r + radius + gap);
  for (let ring = 0; ring < 12; ring++) {
    const dist = Math.max(radius, topic.r * 0.55) + ring * (radius + gap);
    const steps = Math.max(8, Math.floor((2 * Math.PI * dist) / (2 * radius + gap)));
    for (let i = 0; i < steps; i++) {
      // Start below the topic's center and go round, so the new bubble lands somewhere visible.
      const angle = Math.PI / 2 + (i * 2 * Math.PI) / steps;
      const x = topic.x + dist * Math.cos(angle);
      const y = topic.y + dist * Math.sin(angle);
      if (fits(x, y)) return { x: Math.round(x), y: Math.round(y) };
    }
  }
  return { x: topic.x, y: topic.y + topic.r + radius + gap };
}
