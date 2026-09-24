import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  define: {
    __ARTIFACT__: "false",
    __APP_VERSION__: JSON.stringify("test"),
  },
  test: {
    // Pure logic tests run in Node. Component tests opt in with `// @vitest-environment jsdom`.
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 20_000,
  },
});
