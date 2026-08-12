import { describe, expect, it } from "vitest";

import type { Archetype } from "@/schemas/apiEnums";
import type { Target } from "@/services/targets";
import { findShadowers } from "@/utils/targetShadow";

const BINANCE = "11111111-1111-4111-8111-111111111111";
const XP = "11111111-1111-4111-8111-222222222222";
const BTC = "22222222-2222-4222-8222-111111111111";
const PETR4 = "22222222-2222-4222-8222-222222222222";

const ARCHETYPES: Record<string, Archetype> = {
  [BTC]: "CRYPTO",
  [PETR4]: "EXCHANGE_SECURITY",
};
const archetypeOf = (id: string) => ARCHETYPES[id];

const step = {
  id: "33333333-3333-4333-8333-333333333333",
  from_month: 0,
  rate: "0.03",
  rate_period: "MONTHLY" as const,
};

const holdingTarget = (
  id: string,
  account: string,
  asset: string,
  archived = false,
): Target => ({
  id,
  scope: "HOLDING",
  account,
  asset,
  loss_limit_pct: null,
  loss_limit_period: null,
  steps: [step],
  archived_at: archived ? "2026-08-01T00:00:00Z" : null,
});

const accountTarget = (
  id: string,
  account: string,
  archetype: Archetype,
): Target => ({
  id,
  scope: "ACCOUNT_ARCHETYPE",
  account,
  archetype,
  loss_limit_pct: null,
  loss_limit_period: null,
  steps: [step],
  archived_at: null,
});

const portfolioTarget = (id: string, archetype: Archetype): Target => ({
  id,
  scope: "PORTFOLIO_ARCHETYPE",
  archetype,
  loss_limit_pct: null,
  loss_limit_period: null,
  steps: [step],
  archived_at: null,
});

const ids = (rows: Target[]) => rows.map((row) => row.id).sort();

describe("findShadowers", () => {
  it("never shadows a holding target, the most specific level there is", () => {
    const holding = holdingTarget("h", BINANCE, BTC);
    const all = [holding, accountTarget("a", BINANCE, "CRYPTO")];

    expect(findShadowers(holding, all, archetypeOf)).toEqual([]);
  });

  it("shadows an account target with a holding target of that archetype", () => {
    const account = accountTarget("a", BINANCE, "CRYPTO");
    const holding = holdingTarget("h", BINANCE, BTC);

    expect(
      ids(findShadowers(account, [account, holding], archetypeOf)),
    ).toEqual(["h"]);
  });

  it("does not shadow an account target from another account", () => {
    const account = accountTarget("a", BINANCE, "CRYPTO");
    const elsewhere = holdingTarget("h", XP, BTC);

    expect(findShadowers(account, [account, elsewhere], archetypeOf)).toEqual(
      [],
    );
  });

  it("does not shadow an account target with an asset of another archetype", () => {
    const account = accountTarget("a", BINANCE, "CRYPTO");
    const stock = holdingTarget("h", BINANCE, PETR4);

    expect(findShadowers(account, [account, stock], archetypeOf)).toEqual([]);
  });

  it("shadows a portfolio target from both levels below it", () => {
    const portfolio = portfolioTarget("p", "CRYPTO");
    const all = [
      portfolio,
      accountTarget("a", BINANCE, "CRYPTO"),
      holdingTarget("h", XP, BTC),
      accountTarget("other", BINANCE, "EXCHANGE_SECURITY"),
    ];

    expect(ids(findShadowers(portfolio, all, archetypeOf))).toEqual(["a", "h"]);
  });

  // An archived target governs nothing, so it neither covers nor is covered.
  it("ignores archived targets as shadowers", () => {
    const portfolio = portfolioTarget("p", "CRYPTO");
    const archived = holdingTarget("h", BINANCE, BTC, true);

    expect(
      findShadowers(portfolio, [portfolio, archived], archetypeOf),
    ).toEqual([]);
  });

  it("returns nothing for an archived target", () => {
    const archived: Target = {
      ...portfolioTarget("p", "CRYPTO"),
      archived_at: "2026-08-01T00:00:00Z",
    };
    const holding = holdingTarget("h", BINANCE, BTC);

    expect(findShadowers(archived, [archived, holding], archetypeOf)).toEqual(
      [],
    );
  });

  // While the asset cache is still filling, an unknown asset must not be
  // guessed into a match — a wrong warning is worse than a late one.
  it("does not match an asset whose archetype is unknown", () => {
    const portfolio = portfolioTarget("p", "CRYPTO");
    const unknown = holdingTarget("h", BINANCE, "not-in-the-cache");

    expect(findShadowers(portfolio, [portfolio, unknown], archetypeOf)).toEqual(
      [],
    );
  });
});
