import type { Env } from "@/config/env";
import { env } from "@/config/env";

/**
 * Which half of the screen a method belongs to.
 *
 * Geography rather than technology: someone in Brazil pays by PIX because
 * it is instant and free, and everyone else pays in crypto because a wire is
 * neither. The split is the reader's question — "how do I pay from here?" —
 * not a taxonomy of rails.
 */
export type DonationRegion = "brazil" | "international";

export type DonationId = "pix" | "btc" | "eth" | "usdtTrc20" | "usdtSolana";

export interface DonationMethod {
  id: DonationId;
  region: DonationRegion;
  /** The key or address to pay into, exactly as configured. */
  value: string;
}

/**
 * The methods, in reading order, paired with the variable each one is read
 * from. A stablecoin gets one entry per network on purpose: USDT on Tron and
 * USDT on Solana are different addresses, and sending to the wrong one loses
 * the money. The network is part of the method's identity, never a footnote.
 */
const CATALOGUE: readonly {
  id: DonationId;
  region: DonationRegion;
  variable: keyof Env;
}[] = [
  { id: "pix", region: "brazil", variable: "VITE_DONATE_PIX_KEY" },
  { id: "btc", region: "international", variable: "VITE_DONATE_BTC_ADDRESS" },
  { id: "eth", region: "international", variable: "VITE_DONATE_ETH_ADDRESS" },
  {
    id: "usdtTrc20",
    region: "international",
    variable: "VITE_DONATE_USDT_TRC20_ADDRESS",
  },
  {
    id: "usdtSolana",
    region: "international",
    variable: "VITE_DONATE_USDT_SOLANA_ADDRESS",
  },
];

/**
 * What the donation screen has to show.
 *
 * Derived from the environment rather than hard-coded, so a deployment that
 * was never given a Tron address renders four blocks instead of a fifth blank
 * one — and a fork of this project that funds nobody renders an empty state
 * rather than someone else's addresses.
 *
 * No copy here. The label for `pix` and the warning that a Solana address only
 * takes Solana are translated strings keyed by `id`, because this module has
 * no business holding a sentence in two languages.
 *
 * `source` defaults to the parsed environment and is a parameter so tests can
 * reach every branch — the same reason `version.ts` takes its stamp.
 */
export function donationMethods(source: Env = env): DonationMethod[] {
  return CATALOGUE.flatMap(({ id, region, variable }) => {
    const value = source[variable];
    return value ? [{ id, region, value }] : [];
  });
}
