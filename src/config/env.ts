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

  /**
   * Where a donation to the project goes. Every one is optional and every one
   * is public by design — a receiving key exists to be read, and the donation
   * screen shows only the methods the deployment actually configured.
   *
   * Public is the whole constraint. A `VITE_` variable is inlined into the
   * bundle the browser downloads, so a private key or a seed phrase must never
   * be spelled here — only the address someone else pays *into*.
   *
   * Empty is a misconfiguration rather than an absence, exactly as it is for
   * the Google client id above: a variable that is present but blank is a
   * `.env` someone half-filled, and failing at boot is kinder than a screen
   * that silently offers one fewer way to pay.
   */
  VITE_DONATE_PIX_KEY: z.string().min(1).optional(),
  VITE_DONATE_BTC_ADDRESS: z.string().min(1).optional(),
  VITE_DONATE_ETH_ADDRESS: z.string().min(1).optional(),
  VITE_DONATE_USDT_TRC20_ADDRESS: z.string().min(1).optional(),
  VITE_DONATE_USDT_SOLANA_ADDRESS: z.string().min(1).optional(),
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
  VITE_DONATE_PIX_KEY: import.meta.env.VITE_DONATE_PIX_KEY,
  VITE_DONATE_BTC_ADDRESS: import.meta.env.VITE_DONATE_BTC_ADDRESS,
  VITE_DONATE_ETH_ADDRESS: import.meta.env.VITE_DONATE_ETH_ADDRESS,
  VITE_DONATE_USDT_TRC20_ADDRESS: import.meta.env
    .VITE_DONATE_USDT_TRC20_ADDRESS,
  VITE_DONATE_USDT_SOLANA_ADDRESS: import.meta.env
    .VITE_DONATE_USDT_SOLANA_ADDRESS,
});
