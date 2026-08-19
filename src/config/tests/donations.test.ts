import { describe, expect, it } from "vitest";

import type { Env } from "@/config/env";
import { donationMethods } from "@/config/donations";

const API = { VITE_API_URL: "https://bull-ledger.voynan.com" } as const;

/** Every receiving address configured at once, in the order the page shows. */
const all: Env = {
  ...API,
  VITE_DONATE_PIX_KEY: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  VITE_DONATE_BTC_ADDRESS: "bc1qexampleexampleexampleexampleexampl",
  VITE_DONATE_ETH_ADDRESS: "0x1111111111111111111111111111111111111111",
  VITE_DONATE_USDT_TRC20_ADDRESS: "TExampleExampleExampleExampleExample",
  VITE_DONATE_USDT_SOLANA_ADDRESS: "ExampleSoLanaAddress1111111111111111111111",
};

describe("donationMethods", () => {
  it("lists every configured method, Brazil before international", () => {
    expect(donationMethods(all)).toEqual([
      { id: "pix", region: "brazil", value: all.VITE_DONATE_PIX_KEY },
      {
        id: "btc",
        region: "international",
        value: all.VITE_DONATE_BTC_ADDRESS,
      },
      {
        id: "eth",
        region: "international",
        value: all.VITE_DONATE_ETH_ADDRESS,
      },
      {
        id: "usdtTrc20",
        region: "international",
        value: all.VITE_DONATE_USDT_TRC20_ADDRESS,
      },
      {
        id: "usdtSolana",
        region: "international",
        value: all.VITE_DONATE_USDT_SOLANA_ADDRESS,
      },
    ]);
  });

  it("omits a method whose address is not configured", () => {
    // The point of the whole module: a deployment that has not been given a
    // Tron address must show four blocks, never a fifth one that is blank.
    const rest: Env = { ...all };
    delete rest.VITE_DONATE_USDT_TRC20_ADDRESS;

    expect(donationMethods(rest).map((method) => method.id)).toEqual([
      "pix",
      "btc",
      "eth",
      "usdtSolana",
    ]);
  });

  it("returns nothing when the deployment configured no address at all", () => {
    // Not an error: an unfunded fork of this app is a legitimate deployment,
    // and the screen renders an empty state rather than a broken list.
    expect(donationMethods(API)).toEqual([]);
  });

  it("keeps each region's methods together", () => {
    const regions = donationMethods(all).map((method) => method.region);

    expect(regions.indexOf("brazil")).toBeLessThan(
      regions.indexOf("international"),
    );
    expect(regions.lastIndexOf("brazil")).toBeLessThan(
      regions.indexOf("international"),
    );
  });
});
