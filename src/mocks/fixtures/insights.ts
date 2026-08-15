/**
 * Captured from a real API response, not written by hand.
 *
 * Phase 8 shipped a defect that every MSW test missed because the fixtures
 * were invented: `AllocationSlice.key` is typed `string`, so a made-up value
 * type-checks exactly like the real `FREE_CASH` one. Typed fixtures do not
 * catch value-level surprises. These were copied from the server —
 * `GET /api/portfolio/{history,performance,forecast,allocation}/` as the
 * seeded `alice@bullledger.dev`, on 2026-08-15.
 */
import type {
  AssetRanking,
  PortfolioAllocation,
  PortfolioForecast,
  PortfolioSeries,
} from "@/services/portfolio";

export const historyFixture: PortfolioSeries = {
  reporting_currency: "BRL",
  points: [
    {
      month: "2025-03",
      as_of: "2025-03-31",
      partial: false,
      total_value: {
        amount: 301500,
        currency: "BRL",
      },
      invested: {
        amount: 536050,
        currency: "BRL",
      },
      gain: {
        amount: 1500,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: null,
      complete: true,
    },
    {
      month: "2025-04",
      as_of: "2025-04-30",
      partial: false,
      total_value: {
        amount: 616695,
        currency: "BRL",
      },
      invested: {
        amount: 2176172,
        currency: "BRL",
      },
      gain: {
        amount: 16695,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "0.03365449",
      complete: true,
    },
    {
      month: "2025-05",
      as_of: "2025-05-31",
      partial: false,
      total_value: {
        amount: 887688,
        currency: "BRL",
      },
      invested: {
        amount: 2795040,
        currency: "BRL",
      },
      gain: {
        amount: -12312,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "-0.03783382",
      complete: true,
    },
    {
      month: "2025-06",
      as_of: "2025-06-30",
      partial: false,
      total_value: {
        amount: 1324777,
        currency: "BRL",
      },
      invested: {
        amount: 3358259,
        currency: "BRL",
      },
      gain: {
        amount: 124777,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "0.13211004",
      complete: true,
    },
    {
      month: "2025-07",
      as_of: "2025-07-31",
      partial: false,
      total_value: {
        amount: 1515619,
        currency: "BRL",
      },
      invested: {
        amount: 3984309,
        currency: "BRL",
      },
      gain: {
        amount: 15619,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "-0.07401661",
      complete: true,
    },
    {
      month: "2025-08",
      as_of: "2025-08-31",
      partial: false,
      total_value: {
        amount: 1948934,
        currency: "BRL",
      },
      invested: {
        amount: 4635648,
        currency: "BRL",
      },
      gain: {
        amount: 148934,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "0.08003931",
      complete: true,
    },
    {
      month: "2025-09",
      as_of: "2025-09-30",
      partial: false,
      total_value: {
        amount: 2253402,
        currency: "BRL",
      },
      invested: {
        amount: 5196238,
        currency: "BRL",
      },
      gain: {
        amount: 155392,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "0.0021287",
      complete: true,
    },
    {
      month: "2025-10",
      as_of: "2025-10-31",
      partial: false,
      total_value: {
        amount: 2677339,
        currency: "BRL",
      },
      invested: {
        amount: 5869993,
        currency: "BRL",
      },
      gain: {
        amount: 279329,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "0.05156732",
      complete: true,
    },
    {
      month: "2025-11",
      as_of: "2025-11-30",
      partial: false,
      total_value: {
        amount: 2835848,
        currency: "BRL",
      },
      invested: {
        amount: 6519358,
        currency: "BRL",
      },
      gain: {
        amount: 137838,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "-0.05004388",
      complete: true,
    },
    {
      month: "2025-12",
      as_of: "2025-12-31",
      partial: false,
      total_value: {
        amount: 3490959,
        currency: "BRL",
      },
      invested: {
        amount: 7108590,
        currency: "BRL",
      },
      gain: {
        amount: 492949,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "0.11893137",
      complete: true,
    },
    {
      month: "2026-01",
      as_of: "2026-01-31",
      partial: false,
      total_value: {
        amount: 3475500,
        currency: "BRL",
      },
      invested: {
        amount: 7765363,
        currency: "BRL",
      },
      gain: {
        amount: 177490,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "-0.08664173",
      complete: true,
    },
    {
      month: "2026-02",
      as_of: "2026-02-28",
      partial: false,
      total_value: {
        amount: 4092249,
        currency: "BRL",
      },
      invested: {
        amount: 8448771,
        currency: "BRL",
      },
      gain: {
        amount: 494239,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "0.08736698",
      complete: true,
    },
    {
      month: "2026-03",
      as_of: "2026-03-31",
      partial: false,
      total_value: {
        amount: 4383099,
        currency: "BRL",
      },
      invested: {
        amount: 9033901,
        currency: "BRL",
      },
      gain: {
        amount: 485089,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "-0.00215687",
      complete: true,
    },
    {
      month: "2026-04",
      as_of: "2026-04-30",
      partial: false,
      total_value: {
        amount: 4928841,
        currency: "BRL",
      },
      invested: {
        amount: 9741290,
        currency: "BRL",
      },
      gain: {
        amount: 730831,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "0.0542106",
      complete: true,
    },
    {
      month: "2026-05",
      as_of: "2026-05-31",
      partial: false,
      total_value: {
        amount: 4951392,
        currency: "BRL",
      },
      invested: {
        amount: 10421152,
        currency: "BRL",
      },
      gain: {
        amount: 453382,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "-0.05462841",
      complete: true,
    },
    {
      month: "2026-06",
      as_of: "2026-06-30",
      partial: false,
      total_value: {
        amount: 5845470,
        currency: "BRL",
      },
      invested: {
        amount: 11036396,
        currency: "BRL",
      },
      gain: {
        amount: 1056160,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "0.1164541",
      complete: true,
    },
    {
      month: "2026-07",
      as_of: "2026-07-31",
      partial: false,
      total_value: {
        amount: 5586997,
        currency: "BRL",
      },
      invested: {
        amount: 11723892,
        currency: "BRL",
      },
      gain: {
        amount: 497687,
        currency: "BRL",
      },
      net_flow: {
        amount: 300000,
        currency: "BRL",
      },
      monthly_return: "-0.09314916",
      complete: true,
    },
    {
      month: "2026-08",
      as_of: "2026-08-15",
      partial: true,
      total_value: {
        amount: 6064958,
        currency: "BRL",
      },
      invested: {
        amount: 11723892,
        currency: "BRL",
      },
      gain: {
        amount: 975648,
        currency: "BRL",
      },
      net_flow: {
        amount: 0,
        currency: "BRL",
      },
      monthly_return: "0.08554882",
      complete: true,
    },
  ],
};

export const performanceFixture: AssetRanking = {
  reporting_currency: "BRL",
  ranked_assets_count: 2,
  best: [
    {
      asset: {
        id: "669049fb-9333-4c4d-bbde-959e9202700e",
        name: "Petrobras PN",
        archetype: "EXCHANGE_SECURITY",
      },
      monthly_profit_rate: "0.01210773",
      sales_count: 1,
      profit: {
        amount: 2700,
        currency: "BRL",
      },
      avg_holding_period_days: 375,
      last_sold_on: "2026-03-22",
    },
    {
      asset: {
        id: "3ba9cfdb-bd45-47fd-b5e5-c846eab70514",
        name: "CDB Nubank 110% CDI",
        archetype: "FIXED_INCOME",
      },
      monthly_profit_rate: "0",
      sales_count: 1,
      profit: {
        amount: 0,
        currency: "BRL",
      },
      avg_holding_period_days: 412,
      last_sold_on: "2026-05-27",
    },
  ],
  worst: [
    {
      asset: {
        id: "3ba9cfdb-bd45-47fd-b5e5-c846eab70514",
        name: "CDB Nubank 110% CDI",
        archetype: "FIXED_INCOME",
      },
      monthly_profit_rate: "0",
      sales_count: 1,
      profit: {
        amount: 0,
        currency: "BRL",
      },
      avg_holding_period_days: 412,
      last_sold_on: "2026-05-27",
    },
    {
      asset: {
        id: "669049fb-9333-4c4d-bbde-959e9202700e",
        name: "Petrobras PN",
        archetype: "EXCHANGE_SECURITY",
      },
      monthly_profit_rate: "0.01210773",
      sales_count: 1,
      profit: {
        amount: 2700,
        currency: "BRL",
      },
      avg_holding_period_days: 375,
      last_sold_on: "2026-03-22",
    },
  ],
};

export const forecastFixture: PortfolioForecast = {
  reporting_currency: "BRL",
  monthly_rate: "0.01461357",
  volatility: "0.0748709",
  sample_months: 16,
  points: [
    {
      month: "2026-09",
      expected: {
        amount: 6153588,
        currency: "BRL",
      },
      low: {
        amount: 5699499,
        currency: "BRL",
      },
      high: {
        amount: 6607677,
        currency: "BRL",
      },
    },
    {
      month: "2026-10",
      expected: {
        amount: 6243514,
        currency: "BRL",
      },
      low: {
        amount: 5356063,
        currency: "BRL",
      },
      high: {
        amount: 7198962,
        currency: "BRL",
      },
    },
    {
      month: "2026-11",
      expected: {
        amount: 6334754,
        currency: "BRL",
      },
      low: {
        amount: 5033321,
        currency: "BRL",
      },
      high: {
        amount: 7843157,
        currency: "BRL",
      },
    },
    {
      month: "2026-12",
      expected: {
        amount: 6427328,
        currency: "BRL",
      },
      low: {
        amount: 4730026,
        currency: "BRL",
      },
      high: {
        amount: 8544998,
        currency: "BRL",
      },
    },
    {
      month: "2027-01",
      expected: {
        amount: 6521254,
        currency: "BRL",
      },
      low: {
        amount: 4445007,
        currency: "BRL",
      },
      high: {
        amount: 9309643,
        currency: "BRL",
      },
    },
    {
      month: "2027-02",
      expected: {
        amount: 6616553,
        currency: "BRL",
      },
      low: {
        amount: 4177163,
        currency: "BRL",
      },
      high: {
        amount: 10142711,
        currency: "BRL",
      },
    },
    {
      month: "2027-03",
      expected: {
        amount: 6713244,
        currency: "BRL",
      },
      low: {
        amount: 3925458,
        currency: "BRL",
      },
      high: {
        amount: 11050326,
        currency: "BRL",
      },
    },
    {
      month: "2027-04",
      expected: {
        amount: 6811349,
        currency: "BRL",
      },
      low: {
        amount: 3688921,
        currency: "BRL",
      },
      high: {
        amount: 12039159,
        currency: "BRL",
      },
    },
    {
      month: "2027-05",
      expected: {
        amount: 6910887,
        currency: "BRL",
      },
      low: {
        amount: 3466636,
        currency: "BRL",
      },
      high: {
        amount: 13116477,
        currency: "BRL",
      },
    },
    {
      month: "2027-06",
      expected: {
        amount: 7011880,
        currency: "BRL",
      },
      low: {
        amount: 3257746,
        currency: "BRL",
      },
      high: {
        amount: 14290198,
        currency: "BRL",
      },
    },
    {
      month: "2027-07",
      expected: {
        amount: 7114348,
        currency: "BRL",
      },
      low: {
        amount: 3061443,
        currency: "BRL",
      },
      high: {
        amount: 15568949,
        currency: "BRL",
      },
    },
    {
      month: "2027-08",
      expected: {
        amount: 7218314,
        currency: "BRL",
      },
      low: {
        amount: 2876968,
        currency: "BRL",
      },
      high: {
        amount: 16962128,
        currency: "BRL",
      },
    },
  ],
  unavailable_reason: null,
};

export const allocationFixture: PortfolioAllocation = {
  on_date: "2026-08-15",
  reporting_currency: "BRL",
  total_value: {
    amount: 6064958,
    currency: "BRL",
  },
  complete: true,
  by_archetype: [
    {
      key: "CASH_DEPOSIT",
      value: {
        amount: 5125500,
        currency: "BRL",
      },
      weight: "0.84510066",
      complete: true,
    },
    {
      key: "CRYPTO",
      value: {
        amount: 3629500,
        currency: "BRL",
      },
      weight: "0.59843778",
      complete: true,
    },
    {
      key: "EXCHANGE_SECURITY",
      value: {
        amount: 2548850,
        currency: "BRL",
      },
      weight: "0.42025847",
      complete: true,
    },
    {
      key: "FIXED_INCOME",
      value: {
        amount: 700000,
        currency: "BRL",
      },
      weight: "0.11541712",
      complete: true,
    },
    {
      key: "NAV_FUND",
      value: {
        amount: 232390,
        currency: "BRL",
      },
      weight: "0.03831684",
      complete: true,
    },
    {
      key: "FREE_CASH",
      value: {
        amount: -6171282,
        currency: "BRL",
      },
      weight: "-1.01753087",
      complete: true,
    },
  ],
  by_currency: [
    {
      key: "BRL",
      value: {
        amount: 6064958,
        currency: "BRL",
      },
      weight: "1",
      complete: true,
    },
  ],
  by_country: [
    {
      key: "BR",
      value: {
        amount: 6064958,
        currency: "BRL",
      },
      weight: "1",
      complete: true,
    },
  ],
  by_asset: [
    {
      asset: {
        id: "2515f057-630e-4fed-8ce9-6ef7cb2602c5",
        name: "Bitcoin",
        archetype: "CRYPTO",
      },
      value: {
        amount: 3629500,
        currency: "BRL",
      },
      invested: {
        amount: 3094320,
        currency: "BRL",
      },
      weight: "0.59843778",
      complete: true,
    },
    {
      asset: {
        id: "3ba9cfdb-bd45-47fd-b5e5-c846eab70514",
        name: "CDB Nubank 110% CDI",
        archetype: "FIXED_INCOME",
      },
      value: {
        amount: 700000,
        currency: "BRL",
      },
      invested: {
        amount: 1000000,
        currency: "BRL",
      },
      weight: "0.11541712",
      complete: true,
    },
    {
      asset: {
        id: "8a037265-b86f-48f6-b064-7e64e5fd8005",
        name: "Fundo Multimercado XP",
        archetype: "NAV_FUND",
      },
      value: {
        amount: 232390,
        currency: "BRL",
      },
      invested: {
        amount: 218348,
        currency: "BRL",
      },
      weight: "0.03831684",
      complete: true,
    },
    {
      asset: {
        id: "10559b46-0423-47e6-bd04-784ecdd36880",
        name: "Itaú Unibanco PN",
        archetype: "EXCHANGE_SECURITY",
      },
      value: {
        amount: 420200,
        currency: "BRL",
      },
      invested: {
        amount: 390930,
        currency: "BRL",
      },
      weight: "0.06928325",
      complete: true,
    },
    {
      asset: {
        id: "669049fb-9333-4c4d-bbde-959e9202700e",
        name: "Petrobras PN",
        archetype: "EXCHANGE_SECURITY",
      },
      value: {
        amount: 509450,
        currency: "BRL",
      },
      invested: {
        amount: 483462,
        currency: "BRL",
      },
      weight: "0.08399893",
      complete: true,
    },
    {
      asset: {
        id: "fd5456db-dd8b-46db-9635-969fa987a591",
        name: "Poupança Nubank",
        archetype: "CASH_DEPOSIT",
      },
      value: {
        amount: 5125500,
        currency: "BRL",
      },
      invested: {
        amount: 5100000,
        currency: "BRL",
      },
      weight: "0.84510066",
      complete: true,
    },
    {
      asset: {
        id: "2a365b98-85fd-40d4-b2f2-3bb1798b80de",
        name: "iShares Ibovespa",
        archetype: "EXCHANGE_SECURITY",
      },
      value: {
        amount: 1619200,
        currency: "BRL",
      },
      invested: {
        amount: 1436832,
        currency: "BRL",
      },
      weight: "0.26697629",
      complete: true,
    },
    {
      asset: null,
      value: {
        amount: -6171282,
        currency: "BRL",
      },
      invested: null,
      weight: "-1.01753087",
      complete: true,
    },
  ],
  missing: [],
};
