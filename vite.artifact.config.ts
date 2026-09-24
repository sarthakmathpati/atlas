// claude.ai artifact target: ONE self-contained HTML file (dist-artifact/index.html).
// Every script, style sheet, font and image is inlined, because a published artifact page
// may not load anything from the network (see BUILD_SPEC.md section 2.5).
import { defineConfig, mergeConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { sharedConfig } from "./vite.shared";

export default defineConfig(
  mergeConfig(sharedConfig("artifact", "dist-artifact"), {
    plugins: [viteSingleFile({ removeViteModuleLoader: true })],
    build: {
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      chunkSizeWarningLimit: 20_000,
      modulePreload: false,
    },
  }),
);
