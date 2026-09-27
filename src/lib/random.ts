// Seeded randomness for anything that must be reproducible: drill sessions (F10) and the daily
// planner's tie-breaks (section 11.4: "deterministic for the same inputs; seed any tie-breaking
// randomness with the date string").

/** FNV-1a hash of a string, as an unsigned 32-bit seed. */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A small deterministic generator: the same seed always gives the same sequence in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable random rank per key for one seed (the same key always gets the same rank). */
export function seededRank(seedText: string): (key: string) => number {
  const cache = new Map<string, number>();
  return (key) => {
    let r = cache.get(key);
    if (r === undefined) {
      r = mulberry32(hashSeed(`${seedText}|${key}`))();
      cache.set(key, r);
    }
    return r;
  };
}
