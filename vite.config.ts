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
    // The other half of the timeout `setupTests.ts` documents. Phase 6 raised
    // Testing Library's `asyncUtilTimeout` to 10s and left Vitest's own
    // per-test budget at its 5s default — so once the suite grew past that,
    // a loaded test was killed at 5s before its 10s query could report, and
    // the failure blamed whichever file lost the race.
    //
    // Measured at Phase 8, not guessed: the full suite failed 1, then 2, then
    // 3 tests across three runs, never the same one twice, every file passed
    // alone, and `--no-file-parallelism` passed 572/572 with aggregate test
    // time of 31s against ~148s parallel.
    //
    // It must stay *above* `asyncUtilTimeout`, or this cap decides the outcome
    // and a genuine query failure never gets to say so. Costs nothing when
    // tests pass; it only bounds how long a real failure takes to report.
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // Playwright owns e2e/; Vitest must never try to run those specs.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    env: {
      // src/config/env.ts validates at import time, so tests that pull it in
      // need a valid value here.
      VITE_API_URL: TEST_API_URL,
      // The donation screen renders whatever addresses the environment gave
      // it, so without these the route and sidebar suites would only ever see
      // its empty state. Obvious fakes: nobody should be able to paste a value
      // out of a test run and have it reach a real wallet.
      VITE_DONATE_PIX_KEY: "00000000-0000-4000-8000-000000000000",
      VITE_DONATE_BTC_ADDRESS: "bc1qtestonlytestonlytestonlytestonlyte",
      VITE_DONATE_ETH_ADDRESS: "0x0000000000000000000000000000000000000000",
      VITE_DONATE_USDT_TRC20_ADDRESS: "TTestOnlyTestOnlyTestOnlyTestOnlyTe",
      VITE_DONATE_USDT_SOLANA_ADDRESS:
        "TestOnlySolanaAddressTestOnlySolanaAddr",
    },
  },
});
