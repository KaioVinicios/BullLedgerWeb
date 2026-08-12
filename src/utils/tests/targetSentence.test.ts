import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";

import app from "@/i18n/locales/en/app.json";
import type { Target } from "@/services/targets";
import {
  describeDraft,
  describeMonths,
  describeTarget,
  summarizeClauses,
  type SentenceContext,
} from "@/utils/targetSentence";
import type { TargetFormValues } from "@/utils/targetWire";

const ACCOUNT = "11111111-1111-4111-8111-111111111111";
const ASSET = "22222222-2222-4222-8222-222222222222";

// The same walk `targetScope.test.ts` uses: the real `t` is typed against the
// English resources, and for a pure unit the lookup is all that matters.
// Interpolation and the `_one`/`_other` suffix are done here because this fake
// is not i18next.
const t = ((key: string, options?: Record<string, unknown>) => {
  const count = options?.count;
  const suffixed =
    typeof count === "number" ? `${key}_${count === 1 ? "one" : "other"}` : key;

  const lookup = (path: string) =>
    path
      .split(".")
      .reduce<unknown>(
        (node, part) =>
          node === undefined
            ? undefined
            : (node as Record<string, unknown>)[part],
        app,
      );

  const template = (lookup(suffixed) ?? lookup(key)) as string;

  return Object.entries(options ?? {}).reduce(
    (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
}) as unknown as TFunction<"app">;

const ctx: SentenceContext = {
  names: {
    accountName: (id) => (id === ACCOUNT ? "Binance" : id),
    assetName: (id) => (id === ASSET ? "BTC" : id),
  },
  t,
  locale: "en-US",
};

const rung = (from_month: number, rate: string) => ({
  id: `step-${from_month}`,
  from_month,
  rate,
  rate_period: "MONTHLY" as const,
});

const holding = (steps: Target["steps"], floor?: string): Target => ({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  scope: "HOLDING",
  account: ACCOUNT,
  asset: ASSET,
  loss_limit_pct: floor ?? null,
  loss_limit_period: floor ? "MONTHLY" : null,
  steps,
  archived_at: null,
});

describe("describeTarget", () => {
  it("names the scope in prose rather than as a joined pair", () => {
    expect(describeTarget(holding([rung(0, "0.03")]), ctx).scope).toBe(
      "This target covers BTC in Binance.",
    );
  });

  it("describes a portfolio default without naming an account", () => {
    const target: Target = {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      scope: "PORTFOLIO_ARCHETYPE",
      archetype: "CRYPTO",
      loss_limit_pct: null,
      loss_limit_period: null,
      steps: [rung(0, "0.03")],
      archived_at: null,
    };

    expect(describeTarget(target, ctx).scope).toBe(
      "This target covers every Crypto holding, in any account.",
    );
  });

  it("reads a single rung as running from the first purchase", () => {
    const [step] = describeTarget(holding([rung(0, "0.03")]), ctx).steps;

    expect(step.rate).toBe("3% monthly");
    expect(step.when).toBe("from the first purchase");
    expect(step.text).toBe("3% monthly from the first purchase");
  });

  // The governing rule: every number in the sentence is a number the user
  // typed. The first rung's own month is 0 and is never shown; the bound that
  // *is* shown is the next rung's month, which was typed.
  it("bounds the first of several rungs by the next rung's month", () => {
    const clauses = describeTarget(
      holding([rung(0, "0.03"), rung(3, "0.02")]),
      ctx,
    );

    expect(clauses.steps[0].when).toBe("for the first 3 months");
    expect(clauses.steps[1].when).toBe("from month 3 onwards");
  });

  it("bounds a middle rung by both typed months", () => {
    const clauses = describeTarget(
      holding([rung(0, "0.03"), rung(3, "0.02"), rung(12, "0.015")]),
      ctx,
    );

    expect(clauses.steps[1].when).toBe("from month 3 to 12");
    expect(clauses.steps[2].when).toBe("from month 12 onwards");
  });

  it("says month rather than months when the first rung lasts one", () => {
    const clauses = describeTarget(
      holding([rung(0, "0.03"), rung(1, "0.02")]),
      ctx,
    );

    expect(clauses.steps[0].when).toBe("for the first month");
  });

  it("orders rungs by month regardless of the order they arrive in", () => {
    const clauses = describeTarget(
      holding([rung(6, "0.01"), rung(0, "0.03")]),
      ctx,
    );

    expect(clauses.steps[0].when).toBe("for the first 6 months");
  });

  it("renders the floor with a minus sign, from a positive magnitude", () => {
    const clauses = describeTarget(holding([rung(0, "0.03")], "0.03"), ctx);

    expect(clauses.floor?.rate).toBe("−3% monthly");
    expect(clauses.floor?.text).toBe("a floor of −3% monthly");
  });

  it("has no floor clause when no floor is set", () => {
    expect(describeTarget(holding([rung(0, "0.03")]), ctx).floor).toBeNull();
  });
});

describe("describeDraft", () => {
  const draft = (over: Partial<TargetFormValues> = {}): TargetFormValues => ({
    scope: "HOLDING",
    account: ACCOUNT,
    asset: ASSET,
    archetype: "CRYPTO",
    steps: [{ from_month: "0", rate: "3", rate_period: "MONTHLY" }],
    floorEnabled: false,
    loss_limit_pct: "",
    loss_limit_period: "MONTHLY",
    ...over,
  });

  // The panel shows the canonical form of what was typed, so "3" reads back as
  // "3%" — the same string the saved target will produce.
  it("normalises a typed rate the way a stored one renders", () => {
    expect(describeDraft(draft(), ctx).steps[0].rate).toBe("3% monthly");
  });

  it("refuses to name a scope that is not chosen yet", () => {
    expect(describeDraft(draft({ asset: "" }), ctx).scope).toBe(
      "Pick where this target applies to see it described here.",
    );
  });

  // The dangerous half of skipping: when the *first* rung is the unreadable
  // one, the survivor keeps its own month rather than inheriting month 0's
  // meaning.
  it("does not promote a survivor into the missing first rung's timing", () => {
    const clauses = describeDraft(
      draft({
        steps: [
          { from_month: "0", rate: "", rate_period: "MONTHLY" },
          { from_month: "3", rate: "2", rate_period: "MONTHLY" },
        ],
      }),
      ctx,
    );

    expect(clauses.steps).toHaveLength(1);
    expect(clauses.steps[0].when).toBe("from month 3 onwards");
  });

  it("describes the rungs it can read and skips the ones it cannot", () => {
    const clauses = describeDraft(
      draft({
        steps: [
          { from_month: "0", rate: "3", rate_period: "MONTHLY" },
          { from_month: "3", rate: "", rate_period: "MONTHLY" },
        ],
      }),
      ctx,
    );

    expect(clauses.steps).toHaveLength(1);
    expect(clauses.steps[0].when).toBe("from the first purchase");
  });

  it("omits the floor while its switch is off, even with a value typed", () => {
    expect(
      describeDraft(draft({ floorEnabled: false, loss_limit_pct: "3" }), ctx)
        .floor,
    ).toBeNull();
  });
});

describe("describeMonths", () => {
  // The ladder editor captions a row the moment its month is readable, which
  // is before its rate is. So the positioning logic has to be reachable from
  // months alone — indexing into `describeDraft`'s output would misalign the
  // moment one rung had a month and no rate yet.
  it("positions each month among the others", () => {
    expect(describeMonths([0, 3, 12], t)).toEqual([
      "for the first 3 months",
      "from month 3 to 12",
      "from month 12 onwards",
    ]);
  });

  it("calls a lone month the whole period", () => {
    expect(describeMonths([0], t)).toEqual(["from the first purchase"]);
  });

  it("sorts before positioning", () => {
    expect(describeMonths([6, 0], t)).toEqual([
      "for the first 6 months",
      "from month 6 onwards",
    ]);
  });

  // Only a rung at month 0 runs from inception. A ladder whose month-0 rung is
  // absent — which happens while one is still being typed — must not have its
  // earliest surviving rung promoted into that claim.
  it("does not call a month other than 0 the first purchase", () => {
    expect(describeMonths([3], t)).toEqual(["from month 3 onwards"]);
    expect(describeMonths([3, 12], t)).toEqual([
      "from month 3 to 12",
      "from month 12 onwards",
    ]);
  });
});

describe("summarizeClauses", () => {
  it("joins the rungs and the floor, leaving the scope to the card title", () => {
    const clauses = describeTarget(
      holding([rung(0, "0.03"), rung(3, "0.02")], "0.03"),
      ctx,
    );

    expect(summarizeClauses(clauses)).toBe(
      "3% monthly for the first 3 months · 2% monthly from month 3 onwards · a floor of −3% monthly",
    );
  });
});
