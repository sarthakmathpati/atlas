// Standalone web app target (GitHub Pages). `base: "./"` keeps every asset path relative,
// so the site works from https://<user>.github.io/<repo>/ without extra configuration.
import { defineConfig, mergeConfig } from "vite";
import { sharedConfig } from "./vite.shared";

export default defineConfig(
  mergeConfig(sharedConfig("pages", "dist"), {
    build: {
      chunkSizeWarningLimit: 1500,
    },
  }),
);
