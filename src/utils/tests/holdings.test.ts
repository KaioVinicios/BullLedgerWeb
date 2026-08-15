import { describe, expect, it } from "vitest";

import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";
import type { Institution } from "@/services/institutions";
import type { HoldingSummary, PortfolioOverview } from "@/services/portfolio";
import {
  groupByAsset,
  groupByCustody,
  isOpenPosition,
  NO_INSTITUTION,
} from "@/utils/holdings";

const BRL = (amount: number) => ({ amount, currency: "BRL" as const });

/** A unit-based row: shares carry a quantity and a basis. */
const share = (overrides: Partial<HoldingSummary> = {}): HoldingSummary =>
  ({
    account: "a",
    asset: "b",
    archetype: "EXCHANGE_SECURITY",
    quantity: "10",
    cost_basis_remaining_native: BRL(100_000),
    current_value_native: BRL(120_000),
    value: BRL(120_000),
    invested: BRL(100_000),
    realized_gain: BRL(0),
    unrealized_gain: BRL(20_000),
    income_received: BRL(0),
    total_return: "0.2",
    complete: true,
    target_status: null,
    ...overrides,
  }) as HoldingSummary;

/** A principal-based row: a CDB has no unit count, only a basis. */
const cdb = (overrides: Partial<HoldingSummary> = {}): HoldingSummary =>
  share({
    archetype: "FIXED_INCOME",
    quantity: null,
    cost_basis_remaining_native: BRL(500_000),
    ...overrides,
  });

describe("isOpenPosition", () => {
  it("holds a share position with units left", () => {
    expect(isOpenPosition(share())).toBe(true);
  });

  it("drops a share position sold down to nothing", () => {
    expect(isOpenPosition(share({ quantity: "0" }))).toBe(false);
  });

  it("reads a scaled zero as zero, which a string comparison would not", () => {
    expect(isOpenPosition(share({ quantity: "0.000000" }))).toBe(false);
  });

  it("holds a principal-based position with principal left", () => {
    expect(isOpenPosition(cdb())).toBe(true);
  });

  it("drops a principal-based position fully redeemed", () => {
    expect(isOpenPosition(cdb({ cost_basis_remaining_native: BRL(0) }))).toBe(
      false,
    );
  });

  it("keeps a held position the server could not value", () => {
    // NO_QUOTE / NO_FX: the position exists, its worth is unknown. A test on
    // `value` would hide it, which is the whole reason the test is on quantity.
    expect(isOpenPosition(share({ value: null, complete: false }))).toBe(true);
  });

  it("keeps a short position, which is held rather than closed", () => {
    expect(isOpenPosition(share({ quantity: "-5" }))).toBe(true);
  });
});

const XP_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NU_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const BROKER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PENSION_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const WALLET_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const institution = (id: string, name: string): Institution => ({
  id,
  name,
  kinds: ["BROKERAGE"],
  country: "BR",
  archived_at: null,
});

const account = (
  id: string,
  name: string,
  inst: string | null,
  institutionName = "",
): Account => ({
  id,
  name,
  institution: inst,
  institution_name: institutionName,
  country: "BR",
  registration: "BR_TAXABLE",
  base_currency: "BRL",
  account_number: "",
  contribution_room: null,
  plan_type: null,
  deductible: null,
  tax_regime: null,
  taxed_on: null,
  archived_at: null,
});

const overviewOf = (
  accounts: PortfolioOverview["accounts"],
): PortfolioOverview => ({
  on_date: "2026-08-07",
  reporting_currency: "BRL",
  total_value: BRL(0),
  free_cash: BRL(0),
  complete: true,
  accounts,
  archetypes: [],
  nominal_return: null,
  real_return: null,
  missing: [],
});

describe("groupByCustody", () => {
  it("gathers an institution's accounts under it and sums their subtotals", () => {
    const result = groupByCustody(
      overviewOf([
        {
          account: BROKER_ID,
          cash: BRL(200_000),
          subtotal: BRL(1_540_000),
          complete: true,
          holdings: [share()],
        },
        {
          account: PENSION_ID,
          cash: null,
          subtotal: BRL(1_000_000),
          complete: true,
          holdings: [cdb()],
        },
      ]),
      [
        account(BROKER_ID, "XP Corretora", XP_ID),
        account(PENSION_ID, "XP Previdência", XP_ID),
      ],
      [institution(XP_ID, "XP Investimentos")],
    );

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe(XP_ID);
    expect(result[0].institution?.name).toBe("XP Investimentos");
    expect(result[0].subtotal).toEqual(BRL(2_540_000));
    expect(result[0].accounts.map((a) => a.account?.name)).toEqual([
      "XP Corretora",
      "XP Previdência",
    ]);
  });

  it("puts accounts with no institution in their own group, last", () => {
    const result = groupByCustody(
      overviewOf([
        {
          account: WALLET_ID,
          cash: BRL(0),
          subtotal: BRL(120_000),
          complete: true,
          holdings: [share()],
        },
        {
          account: BROKER_ID,
          cash: BRL(0),
          subtotal: BRL(500_000),
          complete: true,
          holdings: [share()],
        },
      ]),
      [
        account(WALLET_ID, "Carteira física", null),
        account(BROKER_ID, "XP Corretora", XP_ID),
      ],
      [institution(XP_ID, "XP Investimentos")],
    );

    expect(result.map((g) => g.key)).toEqual([XP_ID, NO_INSTITUTION]);
    expect(result[1].institution).toBeNull();
  });

  it("orders institutions by name", () => {
    const result = groupByCustody(
      overviewOf([
        {
          account: BROKER_ID,
          cash: null,
          subtotal: BRL(1),
          complete: true,
          holdings: [],
        },
        {
          account: PENSION_ID,
          cash: null,
          subtotal: BRL(1),
          complete: true,
          holdings: [],
        },
      ]),
      [
        account(BROKER_ID, "Corretora", XP_ID),
        account(PENSION_ID, "Conta", NU_ID),
      ],
      [institution(XP_ID, "XP Investimentos"), institution(NU_ID, "Nubank")],
    );

    expect(result.map((g) => g.institution?.name)).toEqual([
      "Nubank",
      "XP Investimentos",
    ]);
  });

  it("drops closed positions from each account", () => {
    const result = groupByCustody(
      overviewOf([
        {
          account: BROKER_ID,
          cash: null,
          subtotal: BRL(120_000),
          complete: true,
          holdings: [share(), share({ quantity: "0" })],
        },
      ]),
      [account(BROKER_ID, "XP Corretora", XP_ID)],
      [institution(XP_ID, "XP Investimentos")],
    );

    expect(result[0].accounts[0].holdings).toHaveLength(1);
  });

  it("keeps an account the live list does not know, rather than losing its money", () => {
    // An archived account still appears in the rollup; `listAccounts` excludes
    // it. Dropping the group would make the subtotals stop adding to the total.
    const result = groupByCustody(
      overviewOf([
        {
          account: BROKER_ID,
          cash: null,
          subtotal: BRL(700_000),
          complete: true,
          holdings: [share()],
        },
      ]),
      [],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe(NO_INSTITUTION);
    expect(result[0].accounts[0].account).toBeNull();
    expect(result[0].accounts[0].accountId).toBe(BROKER_ID);
    expect(result[0].subtotal).toEqual(BRL(700_000));
  });

  it("marks an institution incomplete when any of its accounts is", () => {
    const result = groupByCustody(
      overviewOf([
        {
          account: BROKER_ID,
          cash: null,
          subtotal: BRL(1),
          complete: true,
          holdings: [],
        },
        {
          account: PENSION_ID,
          cash: null,
          subtotal: BRL(1),
          complete: false,
          holdings: [],
        },
      ]),
      [
        account(BROKER_ID, "XP Corretora", XP_ID),
        account(PENSION_ID, "XP Previdência", XP_ID),
      ],
      [institution(XP_ID, "XP Investimentos")],
    );

    expect(result[0].complete).toBe(false);
  });
});

const PETR_ID = "99999999-9999-4999-8999-999999999999";
const MGLU_ID = "88888888-8888-4888-8888-888888888888";

const asset = (id: string, name: string): Asset =>
  ({
    id,
    name,
    archetype: "EXCHANGE_SECURITY",
    currency: "BRL",
    country: "BR",
    pricing_mode: "MARKET",
    archived_at: null,
    ticker: name,
    exchange: "B3",
    security_type: "STOCK",
    pays_distributions: true,
  }) as Asset;

/** Ten units at R$100, and fifteen more at R$100, in two different places. */
const tenHere = () => share({ asset: PETR_ID, account: BROKER_ID });
const fifteenThere = () =>
  share({
    asset: PETR_ID,
    account: WALLET_ID,
    quantity: "15",
    cost_basis_remaining_native: BRL(150_000),
    current_value_native: BRL(180_000),
    value: BRL(180_000),
    invested: BRL(150_000),
    unrealized_gain: BRL(30_000),
  });

const twoAccounts = () =>
  overviewOf([
    {
      account: BROKER_ID,
      cash: null,
      subtotal: BRL(120_000),
      complete: true,
      holdings: [tenHere()],
    },
    {
      account: WALLET_ID,
      cash: null,
      subtotal: BRL(180_000),
      complete: true,
      holdings: [fifteenThere()],
    },
  ]);

const bothAccounts = () => [
  account(BROKER_ID, "XP Corretora", XP_ID),
  account(WALLET_ID, "Carteira física", null),
];

describe("groupByAsset", () => {
  it("gathers one asset's positions across accounts and sums what sums", () => {
    const result = groupByAsset(
      twoAccounts(),
      bothAccounts(),
      [asset(PETR_ID, "PETR4")],
      [institution(XP_ID, "XP Investimentos")],
    );

    expect(result).toHaveLength(1);
    expect(result[0].asset?.name).toBe("PETR4");
    expect(result[0].rows).toHaveLength(2);
    expect(result[0].quantity).toBe("25");
    expect(result[0].value).toEqual(BRL(300_000));
    expect(result[0].invested).toEqual(BRL(250_000));
    expect(result[0].unrealizedGain).toEqual(BRL(50_000));
    expect(result[0].complete).toBe(true);
  });

  it("recomputes the return from summed legs rather than averaging two rates", () => {
    // Σgains ÷ Σinvested = 50_000 ÷ 250_000. The mean of two rates is not the
    // rate of the whole, and the difference is invisible when they coincide —
    // which is why the arithmetic is asserted and not the answer alone.
    const result = groupByAsset(
      twoAccounts(),
      bothAccounts(),
      [asset(PETR_ID, "PETR4")],
      [institution(XP_ID, "XP Investimentos")],
    );

    expect(result[0].totalReturn).toBe("0.2");
  });

  it("averages the unit cost over the whole position, in the asset's currency", () => {
    // 250_000 minor over 25 units is R$100.00 each.
    const result = groupByAsset(
      twoAccounts(),
      bothAccounts(),
      [asset(PETR_ID, "PETR4")],
      [institution(XP_ID, "XP Investimentos")],
    );

    expect(result[0].unitCost).toBe("100");
    expect(result[0].currentPrice).toBe("120");
  });

  it("marks the total partial when a row could not be valued", () => {
    const result = groupByAsset(
      overviewOf([
        {
          account: BROKER_ID,
          cash: null,
          subtotal: BRL(120_000),
          complete: false,
          holdings: [
            tenHere(),
            share({
              asset: PETR_ID,
              account: WALLET_ID,
              value: null,
              current_value_native: null,
              complete: false,
            }),
          ],
        },
      ]),
      bothAccounts(),
      [asset(PETR_ID, "PETR4")],
      [institution(XP_ID, "XP Investimentos")],
    );

    // The sum is what could be computed, and it says so rather than implying
    // the unvalued leg is worth nothing.
    expect(result[0].value).toEqual(BRL(120_000));
    expect(result[0].complete).toBe(false);
    expect(result[0].currentPrice).toBeNull();
  });

  it("gives a principal-based asset no unit count and no unit cost", () => {
    const result = groupByAsset(
      overviewOf([
        {
          account: BROKER_ID,
          cash: null,
          subtotal: BRL(500_000),
          complete: true,
          holdings: [cdb({ asset: PETR_ID, account: BROKER_ID })],
        },
      ]),
      [account(BROKER_ID, "XP Corretora", XP_ID)],
      [asset(PETR_ID, "CDB")],
      [institution(XP_ID, "XP Investimentos")],
    );

    expect(result[0].quantity).toBeNull();
    expect(result[0].unitCost).toBeNull();
    expect(result[0].currentPrice).toBeNull();
  });

  it("drops closed positions and the assets left with none", () => {
    const result = groupByAsset(
      overviewOf([
        {
          account: BROKER_ID,
          cash: null,
          subtotal: BRL(0),
          complete: true,
          holdings: [share({ asset: PETR_ID, quantity: "0" })],
        },
      ]),
      [account(BROKER_ID, "XP Corretora", XP_ID)],
      [asset(PETR_ID, "PETR4")],
      [institution(XP_ID, "XP Investimentos")],
    );

    expect(result).toEqual([]);
  });

  it("carries each row's account and institution, for the row to name itself", () => {
    const result = groupByAsset(
      overviewOf([
        {
          account: BROKER_ID,
          cash: null,
          subtotal: BRL(120_000),
          complete: true,
          holdings: [tenHere()],
        },
      ]),
      [account(BROKER_ID, "XP Corretora", XP_ID)],
      [asset(PETR_ID, "PETR4")],
      [institution(XP_ID, "XP Investimentos")],
    );

    expect(result[0].rows[0].account?.name).toBe("XP Corretora");
    expect(result[0].rows[0].institution?.name).toBe("XP Investimentos");
  });

  it("orders assets by value, largest first", () => {
    const result = groupByAsset(
      overviewOf([
        {
          account: BROKER_ID,
          cash: null,
          subtotal: BRL(140_000),
          complete: true,
          holdings: [share({ asset: MGLU_ID, value: BRL(20_000) }), tenHere()],
        },
      ]),
      [account(BROKER_ID, "XP Corretora", XP_ID)],
      [asset(PETR_ID, "PETR4"), asset(MGLU_ID, "MGLU3")],
      [institution(XP_ID, "XP Investimentos")],
    );

    expect(result.map((g) => g.asset?.name)).toEqual(["PETR4", "MGLU3"]);
  });

  it("orders an asset's rows by their account label, not by the raw nickname", () => {
    // The unnamed account belongs to Zeta and must sort after Alpha's. Sorting
    // on the raw name put its empty string first, above every named account.
    const rows = [
      account(BROKER_ID, "Zulu", XP_ID, "Alpha"),
      account(WALLET_ID, "", NU_ID, "Zeta"),
    ];

    const result = groupByAsset(
      twoAccounts(),
      rows,
      [asset(PETR_ID, "PETR4")],
      [institution(XP_ID, "Alpha"), institution(NU_ID, "Zeta")],
    );

    expect(result[0].rows.map((row) => row.account?.institution_name)).toEqual([
      "Alpha",
      "Zeta",
    ]);
  });
});
