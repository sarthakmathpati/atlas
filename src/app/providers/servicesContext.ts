import { createContext, useContext } from "react";
import type { AIService } from "@/lib/ai/service";
import type { FileSaver } from "@/lib/files/FileSaver";
import type { RuntimeInfo } from "@/lib/runtime/detect";
import type { Repository } from "@/lib/storage/Repository";

export interface Services {
  runtime: RuntimeInfo;
  repository: Repository;
  fileSaver: FileSaver;
  /** Which Claude providers this view offers (built-in, API key, copy prompt). */
  ai: AIService;
  /** A one-time message about storage (for example, "saved in this browser only"). */
  storageNotice?: string;
}

export type ServicesState =
  | { status: "connecting" }
  | { status: "ready"; services: Services }
  | { status: "error"; message: string; retry: () => void };

export const ServicesContext = createContext<ServicesState>({ status: "connecting" });

/** The current services state; screens render a skeleton while it is "connecting". */
export function useServicesState(): ServicesState {
  return useContext(ServicesContext);
}

/** Services, for components rendered only once storage is ready. */
export function useServices(): Services {
  const state = useContext(ServicesContext);
  if (state.status !== "ready") throw new Error("useServices() called before storage was ready");
  return state.services;
}
