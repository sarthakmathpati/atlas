// Platform details for shortcut hints.
/** True on Apple platforms, where shortcuts use ⌘ instead of Ctrl. */
export const IS_APPLE =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export const MOD_KEY = IS_APPLE ? "⌘" : "Ctrl";
