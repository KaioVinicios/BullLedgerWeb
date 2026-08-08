import { describe, expect, it } from "vitest";

import type { Target } from "@/services/targets";
import {
  defaultFormValues,
  toTargetRequest,
  toTargetUpdate,
  validateFormValues,
  type TargetFormValues,
} from "@/utils/targetWire";

const ACCOUNT = "11111111-1111-4111-8111-111111111111";
const ASSET = "22222222-2222-4222-8222-222222222222";

const base: TargetFormValues = {
  scope: "HOLDING",
  account: ACCOUNT,
  asset: ASSET,
  archetype: "CRYPTO",
  steps: [{ from_month: "0", rate: "12", rate_period: "ANNUAL" }],
  floorEnabled: false,
  loss_limit_pct: "",
  loss_limit_period: "ANNUAL",
};

describe("toTargetRequest", () => {
  it("builds the holding member, and only the holding member", () => {
    const body = toTargetRequest(base, "en-US");

    expect(body).toEqual({
      scope: "HOLDING",
      account: ACCOUNT,
      asset: ASSET,
      steps: [{ from_month: 0, rate: "0.12", rate_period: "ANNUAL" }],
      loss_limit_pct: null,
      loss_limit_period: null,
    });
    // A holding target carries no archetype: the asset already has one.
    expect(body).not.toHaveProperty("archetype");
  });

  it("builds the account member with both coordinates and no asset", () => {
    const body = toTargetRequest(
      { ...base, scope: "ACCOUNT_ARCHETYPE" },
      "en-US",
    );

    expect(body).toMatchObject({
      scope: "ACCOUNT_ARCHETYPE",
      account: ACCOUNT,
      archetype: "CRYPTO",
    });
    expect(body).not.toHaveProperty("asset");
  });

  it("builds the portfolio member with neither id", () => {
    const body = toTargetRequest(
      { ...base, scope: "PORTFOLIO_ARCHETYPE" },
      "en-US",
    );

    expect(body).toMatchObject({
      scope: "PORTFOLIO_ARCHETYPE",
      archetype: "CRYPTO",
    });
    expect(body).not.toHaveProperty("account");
    expect(body).not.toHaveProperty("asset");
  });

  it("shifts every rate by 100 through Big, in the reader's locale", () => {
    const body = toTargetRequest(
      {
        ...base,
        steps: [
          { from_month: "0", rate: "12,5", rate_period: "MONTHLY" },
          { from_month: "24", rate: "8", rate_period: "ANNUAL" },
        ],
      },
      "pt-BR",
    );

    expect(body?.steps).toEqual([
      { from_month: 0, rate: "0.125", rate_period: "MONTHLY" },
      { from_month: 24, rate: "0.08", rate_period: "ANNUAL" },
    ]);
  });

  it("sorts the ladder by from_month, whatever order it was typed in", () => {
    const body = toTargetRequest(
      {
        ...base,
        steps: [
          { from_month: "24", rate: "8", rate_period: "ANNUAL" },
          { from_month: "0", rate: "12", rate_period: "ANNUAL" },
          { from_month: "12", rate: "10", rate_period: "ANNUAL" },
        ],
      },
      "en-US",
    );

    expect(body?.steps.map((step) => step.from_month)).toEqual([0, 12, 24]);
  });

  it("sends the floor as a pair, or not at all", () => {
    const withFloor = toTargetRequest(
      {
        ...base,
        floorEnabled: true,
        loss_limit_pct: "10",
        loss_limit_period: "ANNUAL",
      },
      "en-US",
    );

    expect(withFloor).toMatchObject({
      loss_limit_pct: "0.1",
      loss_limit_period: "ANNUAL",
    });

    // Off means both null: half a floor is not a floor.
    expect(toTargetRequest(base, "en-US")).toMatchObject({
      loss_limit_pct: null,
      loss_limit_period: null,
    });
  });

  it("refuses rather than rounding when a rate cannot be held exactly", () => {
    expect(
      toTargetRequest(
        {
          ...base,
          steps: [
            { from_month: "0", rate: "1.2345678", rate_period: "ANNUAL" },
          ],
        },
        "en-US",
      ),
    ).toBeNull();
  });

  it("refuses a from_month that is not a whole count of months", () => {
    expect(
      toTargetRequest(
        {
          ...base,
          steps: [{ from_month: "1.5", rate: "12", rate_period: "ANNUAL" }],
        },
        "en-US",
      ),
    ).toBeNull();
    expect(
      toTargetRequest(
        {
          ...base,
          steps: [{ from_month: "-1", rate: "12", rate_period: "ANNUAL" }],
        },
        "en-US",
      ),
    ).toBeNull();
    expect(
      toTargetRequest(
        {
          ...base,
          steps: [{ from_month: "", rate: "12", rate_period: "ANNUAL" }],
        },
        "en-US",
      ),
    ).toBeNull();
  });

  it("refuses a floor that is switched on and empty", () => {
    expect(
      toTargetRequest(
        { ...base, floorEnabled: true, loss_limit_pct: "" },
        "en-US",
      ),
    ).toBeNull();
  });
});

describe("toTargetUpdate", () => {
  it("carries the mutable surface and none of the scope", () => {
    const body = toTargetUpdate(
      {
        ...base,
        floorEnabled: true,
        loss_limit_pct: "10",
        loss_limit_period: "MONTHLY",
      },
      "en-US",
    );

    expect(body).toEqual({
      steps: [{ from_month: 0, rate: "0.12", rate_period: "ANNUAL" }],
      loss_limit_pct: "0.1",
      loss_limit_period: "MONTHLY",
    });
    expect(body).not.toHaveProperty("scope");
    expect(body).not.toHaveProperty("account");
    expect(body).not.toHaveProperty("asset");
    expect(body).not.toHaveProperty("archetype");
  });
});

describe("defaultFormValues", () => {
  it("starts a create with one empty step and the floor off", () => {
    const values = defaultFormValues(undefined, {}, "en-US");

    expect(values.steps).toEqual([
      { from_month: "0", rate: "", rate_period: "ANNUAL" },
    ]);
    expect(values.floorEnabled).toBe(false);
    expect(values.scope).toBe("HOLDING");
  });

  it("takes the prefill a link supplied", () => {
    const values = defaultFormValues(
      undefined,
      { scope: "HOLDING", account: ACCOUNT, asset: ASSET },
      "en-US",
    );

    expect(values).toMatchObject({ account: ACCOUNT, asset: ASSET });
  });

  it("prefills an edit in the reader's locale, not the wire's", () => {
    const target: Target = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      scope: "HOLDING",
      account: ACCOUNT,
      asset: ASSET,
      loss_limit_pct: "0.1",
      loss_limit_period: "ANNUAL",
      steps: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          from_month: 24,
          rate: "0.085",
          rate_period: "MONTHLY",
        },
      ],
      archived_at: null,
    };

    const values = defaultFormValues(target, {}, "pt-BR");

    // 0.085 → 8,50 — a reader in pt-BR must not be handed the wire's dot, or
    // the next save reads it as a thousands separator. Phase 6's defect.
    //
    // The two decimal places are `MASK_PLACES`, not decoration: `PercentField`
    // fills from the right at that width, so a prefill of `8,5` would be
    // re-read as the digits `85` by the first keystroke and land on `0,85`.
    expect(values.steps).toEqual([
      { from_month: "24", rate: "8,50", rate_period: "MONTHLY" },
    ]);
    expect(values.floorEnabled).toBe(true);
    expect(values.loss_limit_pct).toBe("10,00");
  });
});

describe("validateFormValues", () => {
  const messages = {
    fromMonth: "Enter a whole number of months, 0 or more.",
    duplicateMonth: "Two steps cannot start at the same month.",
    rate: "Enter a rate.",
    floor: "Enter a loss limit, or switch it off.",
  };

  it("passes a ladder the wire can carry", () => {
    expect(validateFormValues(base, "en-US", messages)).toEqual({});
  });

  it("refuses a rate it cannot convert, on the row that holds it", () => {
    const values: TargetFormValues = {
      ...base,
      steps: [
        { from_month: "0", rate: "12", rate_period: "ANNUAL" },
        { from_month: "12", rate: "banana", rate_period: "ANNUAL" },
      ],
    };

    // Keyed exactly as the server keys its own, so one prop feeds the editor.
    expect(validateFormValues(values, "en-US", messages)).toEqual({
      "steps.1.rate": [messages.rate],
    });
  });

  it("names the row that repeats a month, which the server cannot", () => {
    const values: TargetFormValues = {
      ...base,
      steps: [
        { from_month: "0", rate: "12", rate_period: "ANNUAL" },
        { from_month: "12", rate: "8", rate_period: "ANNUAL" },
        { from_month: "12", rate: "6", rate_period: "ANNUAL" },
      ],
    };

    // The API rejects this with `{"steps": ["from_month values must be
    // unique."]}` — true, but it names no row. The second 12 is the repeat;
    // the first is left alone.
    expect(validateFormValues(values, "en-US", messages)).toEqual({
      "steps.2.from_month": [messages.duplicateMonth],
    });
  });

  it("reads the floor in the reader's locale, not the wire's", () => {
    const values: TargetFormValues = {
      ...base,
      floorEnabled: true,
      loss_limit_pct: "10,5",
    };

    // A pt-BR comma is a decimal point here, so the floor converts and nothing
    // is refused — the Phase 6 defect, asserted from the other side.
    expect(validateFormValues(values, "pt-BR", messages)).toEqual({});
  });
});
