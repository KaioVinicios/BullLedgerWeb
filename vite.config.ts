/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    // Playwright owns e2e/; Vitest must never try to run those specs.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    env: {
      // src/config/env.ts validates at import time, so tests that pull it in
      // need a valid value here.
      VITE_API_URL: "https://api.test.bullledger.local",
    },
  },
});
