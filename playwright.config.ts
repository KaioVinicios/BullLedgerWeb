import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:5173";

/**
 * Playwright owns the dev server and nothing else. The API is a manual
 * prerequisite — see `docs/runbook.md` for the one command that starts it with
 * its console mailbox teed to a file the specs read.
 *
 * Deliberate, and deliberately temporary. The suite would be more honest with
 * Playwright owning both processes on ports of its own — an API on 8001 whose
 * stdout it captures itself, and a dev server on 5174 pointed at it — because
 * then no spec can silently read a stale mailbox left by an API someone else
 * started, and an E2E run can never collide with the dev servers already
 * running in another terminal. That is where this goes once there is a second
 * developer or a CI job; until then the manual prerequisite is one line in the
 * runbook and the ports stay the ones the Google console already authorizes.
 */
export default defineConfig({
  testDir: "./e2e",
  /**
   * Runs before the first spec and fails the whole run if either server is not
   * the one this suite means to drive. `reuseExistingServer` below decides by
   * asking only whether *something* answers on the port, and a dev server for
   * another project answers just as well — see `e2e/support/global-setup.ts`.
   */
  globalSetup: "./e2e/support/global-setup.ts",
  fullyParallel: true,
  /**
   * One at a time, and not because the specs share state — they do not: each
   * brings a user nobody else uses. The API's development database is SQLite,
   * which takes a single writer, so concurrent registrations answer
   * `database is locked` with a 500. Two writes on the *server* side fix it —
   * `PRAGMA journal_mode=WAL` and a busy timeout, or the Postgres the CI job
   * will need anyway — and this line comes straight back out when they land.
   */
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
