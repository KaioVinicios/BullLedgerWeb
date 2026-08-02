import { describe, expect, it } from "vitest";

import { MOVEMENT_TYPE_SPECS } from "@/mocks/movementTypes";
import { shapeFor, specFor } from "@/schemas/movementSpec";
import {
  grossMinorUnits,
  negateDecimal,
  signedCash,
  signedQuantity,
  toMovementRequest,
  type MovementFormValues,
} from "@/utils/movementWire";

const specs = MOVEMENT_TYPE_SPECS;

const BASE: MovementFormValues = {
  account: "11111111-1111-4111-8111-111111111111",
  asset: "22222222-2222-4222-8222-222222222222",
  type: "BUY",
  occurred_on: "2026-03-04",
  quantity: "",
  direction: "GAINED",
  unit_price: "",
  amount: "",
  fee: "",
  fx_rate: "",
  note: "",
  lot: "",
};

describe("negateDecimal", () => {
  it("flips the sign without touching the digits", () => {
    expect(negateDecimal("10")).toBe("-10");
    expect(negateDecimal("0.00000000000000001")).toBe("-0.00000000000000001");
    expect(negateDecimal("-10")).toBe("10");
  });

  it("leaves zero unsigned — there is no negative zero on the wire", () => {
    expect(negateDecimal("0")).toBe("0");
    expect(negateDecimal("0.000")).toBe("0.000");
  });
});

describe("signedQuantity", () => {
  it("returns null for a shape that carries no quantity", () => {
    expect(signedQuantity("10", "NULL", "GAINED")).toBeNull();
  });

  it("applies the shape's sign to a magnitude the user typed unsigned", () => {
    expect(signedQuantity("10", "POSITIVE", "GAINED")).toBe("10");
    expect(signedQuantity("10", "NEGATIVE", "GAINED")).toBe("-10");
  });

  it("takes the direction only where the shape allows both", () => {
    expect(signedQuantity("50", "NONZERO", "GAINED")).toBe("50");
    expect(signedQuantity("50", "NONZERO", "LOST")).toBe("-50");
  });

  it("treats an empty magnitude as absent on the *_OR_NULL shapes", () => {
    // The lump-principal fixed-income BUY: a sum of money, no units.
    expect(signedQuantity("", "POSITIVE_OR_NULL", "GAINED")).toBeNull();
    expect(signedQuantity("", "NEGATIVE_OR_NULL", "GAINED")).toBeNull();
    expect(signedQuantity("100", "POSITIVE_OR_NULL", "GAINED")).toBe("100");
    expect(signedQuantity("100", "NEGATIVE_OR_NULL", "GAINED")).toBe("-100");
  });

  it("never lets a typed minus sign double up", () => {
    expect(signedQuantity("-10", "NEGATIVE", "GAINED")).toBe("-10");
  });
});

describe("signedCash", () => {
  const money = { amount: 20_400, currency: "BRL" } as const;

  it("applies the shape's cash rule to a magnitude", () => {
    expect(signedCash(money, "NEGATIVE")).toEqual({
      amount: -20_400,
      currency: "BRL",
    });
    expect(signedCash(money, "POSITIVE")).toEqual({
      amount: 20_400,
      currency: "BRL",
    });
  });

  it("zeroes the amount on a corporate action, keeping the currency", () => {
    expect(signedCash(money, "ZERO")).toEqual({ amount: 0, currency: "BRL" });
  });
});

describe("grossMinorUnits", () => {
  // The server keeps `fee` as a positive magnitude *already folded into*
  // cash_delta, so recovering the trade's gross value means removing it — and
  // which way depends on the direction the cash moved.
  it("removes a buy's fee from what was paid", () => {
    expect(
      grossMinorUnits(
        { amount: -20_400, currency: "BRL" },
        { amount: 1_000, currency: "BRL" },
        "NEGATIVE",
      ),
    ).toBe(19_400);
  });

  it("adds a sell's fee back to what was received", () => {
    expect(
      grossMinorUnits(
        { amount: 18_400, currency: "BRL" },
        { amount: 1_000, currency: "BRL" },
        "POSITIVE",
      ),
    ).toBe(19_400);
  });

  it("is the plain magnitude when there is no fee", () => {
    expect(
      grossMinorUnits({ amount: -19_400, currency: "BRL" }, null, "NEGATIVE"),
    ).toBe(19_400);
  });
});

describe("toMovementRequest", () => {
  const buy = specFor(specs, "BUY")!;

  it("signs a buy: units in, money out, fee as a positive magnitude", () => {
    const body = toMovementRequest({
      values: {
        ...BASE,
        quantity: "10",
        unit_price: "19.40",
        amount: "204.00",
        fee: "10.00",
      },
      spec: buy,
      shape: shapeFor(buy, "EXCHANGE_SECURITY"),
      currency: "BRL",
      locale: "en-US",
    });

    expect(body).toEqual({
      account: BASE.account,
      type: "BUY",
      occurred_on: "2026-03-04",
      asset: BASE.asset,
      quantity_delta: "10",
      unit_price: "19.40",
      cash_delta: { amount: -20_400, currency: "BRL" },
      fee: { amount: 1_000, currency: "BRL" },
      fx_rate: null,
      note: "",
      lot: null,
    });
  });

  it("signs a sell: units out, money in, and names its lot", () => {
    const sell = specFor(specs, "SELL")!;

    const body = toMovementRequest({
      values: {
        ...BASE,
        type: "SELL",
        quantity: "4",
        unit_price: "21.00",
        amount: "84.00",
        lot: "33333333-3333-4333-8333-333333333333",
      },
      spec: sell,
      shape: shapeFor(sell, "EXCHANGE_SECURITY"),
      currency: "BRL",
      locale: "en-US",
    });

    expect(body?.quantity_delta).toBe("-4");
    expect(body?.cash_delta).toEqual({ amount: 8_400, currency: "BRL" });
    expect(body?.fee).toBeNull();
    expect(body?.lot).toBe("33333333-3333-4333-8333-333333333333");
  });

  it("sends a reverse split as a negative quantity with zero cash", () => {
    const split = specFor(specs, "SPLIT")!;

    const body = toMovementRequest({
      values: { ...BASE, type: "SPLIT", quantity: "45", direction: "LOST" },
      spec: split,
      shape: shapeFor(split, "EXCHANGE_SECURITY"),
      currency: "BRL",
      locale: "en-US",
    });

    expect(body?.quantity_delta).toBe("-45");
    expect(body?.cash_delta).toEqual({ amount: 0, currency: "BRL" });
    expect(body?.unit_price).toBeNull();
  });

  it("omits the unit price when the quantity is absent", () => {
    // A CDB: principal, no units — so a price per unit would be meaningless,
    // and the server rejects one (`movement_unit_price_forbidden`).
    const body = toMovementRequest({
      values: { ...BASE, amount: "5000.00", unit_price: "1.00" },
      spec: buy,
      shape: shapeFor(buy, "FIXED_INCOME"),
      currency: "BRL",
      locale: "en-US",
    });

    expect(body?.quantity_delta).toBeNull();
    expect(body?.unit_price).toBeNull();
  });

  it("drops a fee the type cannot carry rather than letting the server reject it", () => {
    const tax = specFor(specs, "TAX")!;

    const body = toMovementRequest({
      values: { ...BASE, type: "TAX", amount: "12.34", fee: "1.00" },
      spec: tax,
      shape: shapeFor(tax, null),
      currency: "BRL",
      locale: "en-US",
    });

    expect(body?.fee).toBeNull();
  });

  it("sends an empty asset and lot as null, not as empty strings", () => {
    const deposit = specFor(specs, "DEPOSIT")!;

    const body = toMovementRequest({
      values: { ...BASE, type: "DEPOSIT", asset: "", amount: "100.00" },
      spec: deposit,
      shape: shapeFor(deposit, null),
      currency: "BRL",
      locale: "en-US",
    });

    expect(body?.asset).toBeNull();
    expect(body?.lot).toBeNull();
  });

  it("reads the amount in the active locale without going through a float", () => {
    const body = toMovementRequest({
      values: {
        ...BASE,
        quantity: "10",
        unit_price: "19.40",
        amount: "1.234,56",
      },
      spec: buy,
      shape: shapeFor(buy, "EXCHANGE_SECURITY"),
      currency: "BRL",
      locale: "pt-BR",
    });

    expect(body?.cash_delta).toEqual({ amount: -123_456, currency: "BRL" });
  });

  it("returns null rather than a wrong number when the amount cannot be parsed", () => {
    expect(
      toMovementRequest({
        values: { ...BASE, amount: "not a number" },
        spec: buy,
        shape: shapeFor(buy, "EXCHANGE_SECURITY"),
        currency: "BRL",
        locale: "en-US",
      }),
    ).toBeNull();
  });
});
