import { z } from "zod";

/**
 * Every environment variable the client reads. Nothing outside this module
 * touches `import.meta.env` — see docs/structure.md.
 *
 * To add a variable: declare it here, document it in `.env.example`, and — if
 * it is a boolean flag — use `z.stringbool()`, since every value arriving from
 * the environment is a string.
 */
const envSchema = z.object({
  /** Base URL of the BullLedger API, without a trailing slash. */
  VITE_API_URL: z.url(),
  /** Google OAuth client id. Absent until Google sign-in ships in Phase 2. */
  VITE_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parses and validates an environment source. Throws an error naming every
 * offending variable, so a misconfigured deployment fails loudly at boot
 * instead of surfacing later as an unexplained network failure.
 */
export function parseEnv(source: unknown): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.data;
}

/**
 * Each variable is named individually rather than handing over the whole
 * `import.meta.env`.
 *
 * This is a build-time concern, not a runtime one. Vite replaces
 * `import.meta.env` with an object literal containing **every** `VITE_`-prefixed
 * variable in the environment, so passing the whole object inlines all of them
 * into the shipped bundle — including any that happen to be secret. Zod
 * stripping unknown keys does not help: the inlining has already happened by
 * the time `parse` runs.
 *
 * Naming each key means a variable reaches the browser only if it appears here.
 */
export const env = parseEnv({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
});
