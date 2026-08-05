import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";

import app from "@/i18n/locales/en/app.json";
import type { Target } from "@/services/targets";
import {
  isScopeComplete,
  matchesScope,
  selectionScopeName,
  targetScopeName,
  type ScopeSelection,
} from "@/utils/targetScope";

const ACCOUNT = "11111111-1111-4111-8111-111111111111";
const ASSET = "22222222-2222-4222-8222-222222222222";

// The real `t` is typed against the English resources; for a pure unit the
// lookup is all that matters, so this walks the same JSON the app ships.
const t = ((key: string) =>
  key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      app,
    ) as string) as unknown as TFunction<"app">;

const names = {
  accountName: (id: string) => (id === ACCOUNT ? "Binance" : id),
  assetName: (id: string) => (id === ASSET ? "BTC" : id),
};

const step = {
  id: "33333333-3333-4333-8333-333333333333",
  from_month: 0,
  rate: "0.12",
  rate_period: "ANNUAL" as const,
};

const holding: Target = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  scope: "HOLDING",
  account: ACCOUNT,
  asset: ASSET,
  loss_limit_pct: null,
  loss_limit_period: null,
  steps: [step],
  archived_at: null,
};

const accountLevel: Target = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  scope: "ACCOUNT_ARCHETYPE",
  account: ACCOUNT,
  archetype: "CRYPTO",
  loss_limit_pct: null,
  loss_limit_period: null,
  steps: [step],
  archived_at: null,
};

const portfolioLevel: Target = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  scope: "PORTFOLIO_ARCHETYPE",
  archetype: "CRYPTO",
  loss_limit_pct: null,
  loss_limit_period: null,
  steps: [step],
  archived_at: null,
};

describe("targetScopeName", () => {
  it("names a holding by its asset and account", () => {
    expect(targetScopeName(holding, names, t)).toBe("BTC · Binance");
  });

  it("names an account default by its archetype and account", () => {
    expect(targetScopeName(accountLevel, names, t)).toBe("Crypto · Binance");
  });

  it("names a portfolio default by its archetype alone", () => {
    expect(targetScopeName(portfolioLevel, names, t)).toBe("Crypto");
  });

  it("falls back to the id when a name has not loaded yet", () => {
    const unknown: Target = { ...holding, asset: "not-cached" };

    expect(targetScopeName(unknown, names, t)).toBe("not-cached · Binance");
  });
});

describe("isScopeComplete", () => {
  const base: ScopeSelection = {
    scope: "HOLDING",
    account: "",
    asset: "",
    archetype: "CRYPTO",
  };

  it("needs both halves of a holding", () => {
    expect(isScopeComplete(base)).toBe(false);
    expect(isScopeComplete({ ...base, account: ACCOUNT })).toBe(false);
    expect(isScopeComplete({ ...base, account: ACCOUNT, asset: ASSET })).toBe(
      true,
    );
  });

  it("needs an account for an account default", () => {
    const selection = { ...base, scope: "ACCOUNT_ARCHETYPE" as const };

    expect(isScopeComplete(selection)).toBe(false);
    expect(isScopeComplete({ ...selection, account: ACCOUNT })).toBe(true);
  });

  it("is always complete for a portfolio default, which needs only an archetype", () => {
    expect(isScopeComplete({ ...base, scope: "PORTFOLIO_ARCHETYPE" })).toBe(
      true,
    );
  });
});

describe("matchesScope", () => {
  const selection: ScopeSelection = {
    scope: "HOLDING",
    account: ACCOUNT,
    asset: ASSET,
    archetype: "CRYPTO",
  };

  it("matches the same holding", () => {
    expect(matchesScope(holding, selection)).toBe(true);
  });

  it("does not match a different level at the same coordinates", () => {
    expect(matchesScope(accountLevel, selection)).toBe(false);
    expect(matchesScope(portfolioLevel, selection)).toBe(false);
  });

  it("does not match a different asset in the same account", () => {
    expect(matchesScope({ ...holding, asset: "other" }, selection)).toBe(false);
  });

  it("matches an account default on account and archetype together", () => {
    const accountSelection = {
      ...selection,
      scope: "ACCOUNT_ARCHETYPE" as const,
    };

    expect(matchesScope(accountLevel, accountSelection)).toBe(true);
    expect(
      matchesScope(accountLevel, {
        ...accountSelection,
        archetype: "CASH_DEPOSIT",
      }),
    ).toBe(false);
    expect(
      matchesScope(accountLevel, { ...accountSelection, account: "other" }),
    ).toBe(false);
  });

  it("ignores the asset when matching an archetype default", () => {
    // A portfolio default has no account and no asset; only the archetype can
    // disagree with it.
    const portfolioSelection = {
      ...selection,
      scope: "PORTFOLIO_ARCHETYPE" as const,
      account: "",
      asset: "",
    };

    expect(matchesScope(portfolioLevel, portfolioSelection)).toBe(true);
  });
});

describe("selectionScopeName", () => {
  it("names an incomplete selection by what it has", () => {
    expect(
      selectionScopeName(
        { scope: "HOLDING", account: ACCOUNT, asset: "", archetype: "CRYPTO" },
        names,
        t,
      ),
    ).toBe("— · Binance");
  });
});
