/// <reference types="vitest/config" />
import { execSync } from "node:child_process";
import path from "node:path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// Relative, not `@/mocks/env`: the alias below is what this file is declaring,
// so it does not resolve while the config itself is loading.
import { TEST_API_URL } from "./src/mocks/env";

// The build stamp the sidebar footer shows. A short SHA identifies the code
// exactly, which is what a bug report needs and what package.json's 0.0.0
// cannot give. Resolved once at config load; empty when git is unavailable,
// because the footer renders nothing rather than an empty stamp.
function resolveBuildSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(resolveBuildSha()),
  },
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
      VITE_API_URL: TEST_API_URL,
    },
  },
});
