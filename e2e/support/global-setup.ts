/**
 * Proves, once per run, that the two servers the suite talks to are the two it
 * means to talk to.
 *
 * `webServer.reuseExistingServer` is `true` outside CI, and it decides by
 * asking one question: does anything answer on this port? Anything does. A
 * Vite dev server for a *different* project on 5173 answers 200, Playwright
 * concludes the server is already up, never starts this one, and every spec
 * then drives a stranger's app.
 *
 * That failure is expensive to read. `/app/*` does not exist over there, so
 * forty specs time out waiting for controls that will never render, each
 * reporting a locator that "was not found" — and none of them reporting the
 * one fact that matters. It cost a full debugging session to find; this turns
 * it into a single sentence before the first spec runs.
 *
 * Same question asked of the API, for the same reason: `E2E_API_URL` can point
 * at something that answers without being this API.
 */
import { API_ORIGIN } from "./config";

/** The app's `<title>`, which is the cheapest thing that identifies it. */
const APP_TITLE = "BullLedger";

async function documentTitleAt(url: string): Promise<string> {
  const response = await fetch(url, { redirect: "follow" });
  const html = await response.text();

  return /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
}

async function assertAppIsOurs(baseURL: string): Promise<void> {
  let title: string;
  try {
    title = await documentTitleAt(baseURL);
  } catch (cause) {
    throw new Error(
      `Nothing answered at ${baseURL}, so the dev server never came up.\n` +
        `See docs/runbook.md — Playwright starts it itself, so this usually ` +
        `means the start command failed.`,
      { cause },
    );
  }

  if (title !== APP_TITLE) {
    throw new Error(
      `${baseURL} is serving "${title}", not "${APP_TITLE}".\n\n` +
        `Another project's dev server already holds that port, and Playwright ` +
        `reused it instead of starting this one (webServer.reuseExistingServer ` +
        `is true outside CI). Every spec would drive the wrong app.\n\n` +
        `Stop whatever is on that port and run again:\n` +
        `  lsof -nP -iTCP:${new URL(baseURL).port} -sTCP:LISTEN`,
    );
  }
}

async function assertApiIsUp(): Promise<void> {
  const url = `${API_ORIGIN}/system/schema/`;
  let ok: boolean;
  try {
    ok = (await fetch(url)).ok;
  } catch {
    ok = false;
  }

  if (!ok) {
    throw new Error(
      `The API did not answer at ${API_ORIGIN}.\n\n` +
        `It is a manual prerequisite, and *how* it is started matters — the ` +
        `specs read emailed keys out of its console output. The one command ` +
        `is in docs/runbook.md, under "End-to-end tests".`,
    );
  }
}

export default async function globalSetup(config: {
  projects: { use: { baseURL?: string } }[];
}): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error("No baseURL configured for the suite.");

  await assertAppIsOurs(baseURL);
  await assertApiIsUp();
}
