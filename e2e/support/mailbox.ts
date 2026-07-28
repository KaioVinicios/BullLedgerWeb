import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The development mailbox.
 *
 * In development the API prints messages instead of sending them, so the
 * emailed keys a spec needs — verification, password reset — are in the API's
 * own stdout. The runbook's start command tees that stream to a file; this
 * module reads it.
 *
 * It is the one place in the suite that reaches outside the browser, and it
 * exists because the alternative is worse: a spec that fakes the email is no
 * longer proving that the API mints a working key and points it at the SPA.
 */

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

/**
 * Where the runbook says to send the API's output.
 *
 * Deliberately not under `test-results/`: Playwright empties its output
 * directory at the start of every run, and the API — still holding the file it
 * was started with — would go on writing to a deleted inode. Every emailed key
 * would then be unreachable, reported as an email that never arrived.
 */
export const MAILBOX_PATH = path.resolve(
  REPO_ROOT,
  process.env.E2E_API_LOG ?? ".e2e-mailbox/api.log",
);

/** Django's console backend writes this rule between messages. */
const MESSAGE_SEPARATOR = /^-{79}$/m;

/** The emailed links this app sends, named by the SPA route they land on. */
export type EmailedLinkKind = "verify-email" | "reset-password";

const MISSING_MAILBOX = [
  `No API mailbox at ${MAILBOX_PATH}.`,
  "These specs read the emailed keys from the API's console output, so the",
  "API has to be started with its stream teed there — see the End-to-end",
  "tests section of docs/runbook.md.",
].join(" ");

function readMailbox(): string {
  if (!existsSync(MAILBOX_PATH)) throw new Error(MISSING_MAILBOX);

  // Re-join the quoted-printable soft wraps before anything else looks at the
  // text. The backend breaks long lines with a trailing "=", which lands in
  // the middle of every link it sends; a key read without re-joining fails its
  // HMAC signature and 404s, which reads exactly like an expired link. This
  // has already cost two false bug reports.
  return readFileSync(MAILBOX_PATH, "utf8").replace(/=\r?\n/g, "");
}

/**
 * Every link of one kind sent to one address, oldest first.
 *
 * Filtering by recipient is what keeps the specs independent: the file
 * accumulates across runs, and each spec brings an address nothing else has
 * used.
 */
export function emailedLinks(recipient: string, kind: EmailedLinkKind): URL[] {
  const pattern = new RegExp(`https?://[^\\s/]+/${kind}/[^\\s<>"']+`, "g");

  return readMailbox()
    .split(MESSAGE_SEPARATOR)
    .filter((message) => message.includes(`To: ${recipient}`))
    .flatMap((message) =>
      [...message.matchAll(pattern)].map(([link]) => new URL(link)),
    );
}

interface WaitOptions {
  to: string;
  kind: EmailedLinkKind;
  /** Which message to that address to read, 1-based. Defaults to the first. */
  nth?: number;
  timeoutMs?: number;
}

/**
 * Waits for an emailed link to arrive and returns it.
 *
 * Polling rather than watching: the send is a side effect of a request the
 * spec just made, so it is milliseconds away, and a poll needs no teardown
 * that a failing spec could skip.
 */
export async function waitForEmailedLink({
  to,
  kind,
  nth = 1,
  timeoutMs = 10_000,
}: WaitOptions): Promise<URL> {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const links = emailedLinks(to, kind);
    if (links.length >= nth) return links[nth - 1]!;

    if (Date.now() >= deadline) {
      throw new Error(
        `Waited ${timeoutMs}ms for ${kind} link #${nth} to ${to}; ` +
          `${links.length} arrived. Mailbox: ${MAILBOX_PATH}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
