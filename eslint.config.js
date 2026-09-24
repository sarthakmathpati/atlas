// ESLint flat config. `npm run lint` must pass with zero warnings before every commit.
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default defineConfig([
  globalIgnores(["dist", "dist-artifact", "release", "coverage", "node_modules", "docs/**/*.d.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    // Feature code must go through the adapters (Repository, AIProvider, FileSaver).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/storage/**", "src/lib/runtime/**", "src/lib/ai/**", "src/lib/files/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "dexie", message: "Use the Repository from lib/storage instead." }] },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "claude", message: "Use lib/runtime (claude.use) instead." },
      ],
    },
  },
  {
    files: ["tests/**/*.{ts,tsx}", "**/*.config.ts", "vite.shared.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["scripts/**/*.mjs", "*.config.js"],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: globals.node },
  },
  prettier,
]);
