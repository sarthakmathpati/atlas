// "Get set up" steps that aren't stored data (opening the map, using search). They are a
// per-browser convenience in localStorage, wrapped in try/catch because storage can be blocked.
export type SetupFlag = "map" | "search";

const key = (flag: SetupFlag) => `atlas.setup.${flag}`;

export function markSetupStep(flag: SetupFlag): void {
  try {
    localStorage.setItem(key(flag), "1");
  } catch {
    /* only a convenience */
  }
}

export function setupStepDone(flag: SetupFlag): boolean {
  try {
    return localStorage.getItem(key(flag)) === "1";
  } catch {
    return false;
  }
}
