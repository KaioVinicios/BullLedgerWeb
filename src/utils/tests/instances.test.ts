import { describe, expect, it } from "vitest";

import { MOVEMENT_TYPE_SPECS } from "@/mocks/movementTypes";
import type { Movement } from "@/services/movements";
import type { LotProjection } from "@/services/portfolio";
import { toInstances } from "@/utils/instances";

const BRL = (amount: number) => ({ amount, currency: "BRL" as const });
const PAIR = (amount: number) => ({ native: BRL(amount), base: BRL(amount) });

const LOT_A = "11111111-1111-4111-8111-111111111111";
const LOT_B = "22222222-2222-4222-8222-222222222222";

const specs = MOVEMENT_TYPE_SPECS;

const lot = (id: string, overrides: Partial<LotProjection> = {}) =>
  ({
    lot: id,
    label: "",
    status: "OPEN",
    quantity_remaining: "10",
    principal_remaining: null,
    invested: PAIR(100_000),
    income_attributed: PAIR(0),
    realized_gain: PAIR(0),
    unrealized_gain: PAIR(20_000),
    lot_return: "0.2",
    ...overrides,
  }) as LotProjection;

const movement = (
  id: string,
  lotId: string | null,
  overrides: Record<string, unknown> = {},
) =>
  ({
    id,
    account: "acc",
    asset: "ast",
    lot: lotId,
    type: "BUY",
    occurred_on: "2026-03-04",
    quantity_delta: "10",
    unit_price: "20.00",
    cash_delta: BRL(-20_000),
    fee: null,
    fx_rate: "1",
    note: "",
    replaces: null,
    transfer_of: null,
    created_at: "2026-03-04T00:00:00Z",
    voided_at: null,
    ...overrides,
  }) as Movement;

describe("toInstances", () => {
  it("dates and prices a lot from the movement that opened it", () => {
    const result = toInstances([lot(LOT_A)], [movement("m1", LOT_A)], specs);

    expect(result).toHaveLength(1);
    expect(result[0].openedOn).toBe("2026-03-04");
    expect(result[0].unitPrice).toBe("20.00");
  });

  it("ignores the movements that consumed the lot", () => {
    // A SELL names the lot too. Taking the latest row rather than the entry
    // would date the purchase from the day part of it was sold.
    const result = toInstances(
      [lot(LOT_A)],
      [
        movement("m1", LOT_A),
        movement("m2", LOT_A, {
          type: "SELL",
          occurred_on: "2026-05-01",
          unit_price: "31.00",
          quantity_delta: "-4",
        }),
      ],
      specs,
    );

    expect(result[0].openedOn).toBe("2026-03-04");
    expect(result[0].unitPrice).toBe("20.00");
  });

  it("drops a closed lot, which is history rather than a holding", () => {
    const result = toInstances(
      [lot(LOT_A), lot(LOT_B, { status: "CLOSED", quantity_remaining: "0" })],
      [movement("m1", LOT_A), movement("m2", LOT_B)],
      specs,
    );

    expect(result.map((row) => row.lot.lot)).toEqual([LOT_A]);
  });

  it("keeps a lot whose entry it cannot find, without a date", () => {
    // The entry was voided, so the lot survives in the projection with no row
    // to date it. Dropping it would lose units the position still holds.
    const result = toInstances([lot(LOT_A)], [], specs);

    expect(result).toHaveLength(1);
    expect(result[0].openedOn).toBeNull();
    expect(result[0].unitPrice).toBeNull();
  });

  it("carries a principal-based lot with no unit price", () => {
    const result = toInstances(
      [
        lot(LOT_A, {
          quantity_remaining: null,
          principal_remaining: PAIR(500_000),
        }),
      ],
      [
        movement("m1", LOT_A, {
          type: "DEPOSIT",
          quantity_delta: null,
          unit_price: null,
          cash_delta: BRL(500_000),
        }),
      ],
      specs,
    );

    expect(result[0].openedOn).toBe("2026-03-04");
    expect(result[0].unitPrice).toBeNull();
  });

  it("orders instances oldest first, with undatable ones last", () => {
    const result = toInstances(
      [lot(LOT_A), lot(LOT_B)],
      [movement("m2", LOT_B, { occurred_on: "2026-01-09" })],
      specs,
    );

    expect(result.map((row) => row.openedOn)).toEqual(["2026-01-09", null]);
  });
});
