// Hash routing (F1): `#/map`, `#/concept/<id>`, `#/problems/lc-1`, `#/map?focus=<id>`.
// Hash routes work on GitHub Pages and inside the claude.ai artifact frame without any server
// configuration. A tiny router is enough: the route table is fixed and flat.
import { useSyncExternalStore } from "react";

export type RouteName =
  | "today"
  | "map"
  | "concept"
  | "problems"
  | "problem"
  | "review"
  | "practice"
  | "drill"
  | "quiz"
  | "mental-math"
  | "puzzles"
  | "mock"
  | "mock-session"
  | "designs"
  | "design"
  | "stories"
  | "mistakes"
  | "dashboard"
  | "weekly"
  | "revision"
  | "settings"
  | "kit"
  | "not-found";

export interface Route {
  name: RouteName;
  /** The `:id` part of routes such as `/concept/:id`, decoded. */
  id?: string;
  query: URLSearchParams;
  /** The path without the query, for example "/problems/lc-1". */
  path: string;
}

const TABLE: [RouteName, RegExp][] = [
  ["today", /^\/(today)?$/],
  ["map", /^\/map$/],
  ["concept", /^\/concept\/([^/]+)$/],
  ["problems", /^\/problems$/],
  ["problem", /^\/problems\/([^/]+)$/],
  ["review", /^\/review$/],
  ["practice", /^\/practice$/],
  ["drill", /^\/drill$/],
  ["quiz", /^\/quiz$/],
  ["mental-math", /^\/mental-math$/],
  ["puzzles", /^\/puzzles$/],
  ["mock", /^\/mock$/],
  ["mock-session", /^\/mock\/([^/]+)$/],
  ["designs", /^\/designs$/],
  ["design", /^\/designs\/([^/]+)$/],
  ["stories", /^\/stories$/],
  ["mistakes", /^\/mistakes$/],
  ["dashboard", /^\/dashboard$/],
  ["weekly", /^\/weekly$/],
  ["revision", /^\/revision$/],
  ["settings", /^\/settings$/],
  ["kit", /^\/kit$/],
];

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Parses a location hash ("#/problems/lc-1?x=1") into a route. */
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "/today";
  const [pathPart = "/", queryPart = ""] = raw.split("?", 2);
  const path = pathPart.startsWith("/") ? pathPart.replace(/\/+$/, "") || "/" : `/${pathPart}`;
  const query = new URLSearchParams(queryPart);
  for (const [name, pattern] of TABLE) {
    const match = pattern.exec(path);
    if (!match) continue;
    const id = name === "today" ? undefined : match[1];
    return {
      name,
      id: id ? safeDecode(id) : undefined,
      query,
      path: path === "/" ? "/today" : path,
    };
  }
  return { name: "not-found", query, path };
}

/** Builds an in-app link: routeHref("/concept", id) → "#/concept/<encoded id>". */
export function routeHref(path: string, id?: string, query?: Record<string, string>): string {
  const base = id === undefined ? path : `${path}/${encodeURIComponent(id)}`;
  const qs = query ? new URLSearchParams(query).toString() : "";
  return `#${base}${qs ? `?${qs}` : ""}`;
}

export function conceptHref(id: string): string {
  return routeHref("/concept", id);
}

export function problemHref(id: string): string {
  return routeHref("/problems", id);
}

/** Goes to an in-app location ("#/map" or "/map"). `replace` avoids a new history entry. */
export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const hash = to.startsWith("#") ? to : `#${to.startsWith("/") ? to : `/${to}`}`;
  if (window.location.hash === hash) return;
  if (options.replace) {
    const url = new URL(window.location.href);
    url.hash = hash;
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = hash;
  }
}

let cachedHash: string | null = null;
let cachedRoute: Route = parseHash("");

function currentRoute(): Route {
  const hash = typeof window === "undefined" ? "" : window.location.hash;
  if (hash !== cachedHash) {
    cachedHash = hash;
    cachedRoute = parseHash(hash);
  }
  return cachedRoute;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** The current route; re-renders when the hash changes. */
export function useRoute(): Route {
  return useSyncExternalStore(subscribe, currentRoute, () => parseHash(""));
}

// After an in-app navigation (not the first load), the new page's heading takes focus so screen
// readers announce it and keyboard users start at the top (F30). PageHeader consumes the flag.
let focusPending = false;
let lastPath = typeof window === "undefined" ? "" : parseHash(window.location.hash).path;

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    const path = parseHash(window.location.hash).path;
    if (path !== lastPath) focusPending = true;
    lastPath = path;
  });
}

export function consumeNavigationFocus(): boolean {
  const pending = focusPending;
  focusPending = false;
  return pending;
}
