/// <reference types="vite/client" />

/** True in the single-file claude.ai artifact build, false in the GitHub Pages build. */
declare const __ARTIFACT__: boolean;
/** package.json version, shown in Settings → About. */
declare const __APP_VERSION__: string;

// Large generated JSON files are imported untyped (typing a multi-megabyte literal slows the
// type checker to a crawl). Typed loaders in src/data cast them to the real types.
declare module "*.json" {
  const value: unknown;
  export default value;
}
