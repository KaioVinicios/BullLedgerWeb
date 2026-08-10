import { describe, expect, it } from "vitest";

import { MOVEMENT_TYPE_SPECS } from "@/mocks/movementTypes";
import { ARCHETYPES, type Archetype } from "@/schemas/apiEnums";
import {
  acceptsQuantity,
  allowsFee,
  createsLot,
  entryTypes,
  quantityRequired,
  requiresLot,
  requiresQuantity,
  shapeFor,
  specFor,
  typesFor,
  type MovementType,
} from "@/schemas/movementSpec";

const specs = MOVEMENT_TYPE_SPECS;

/** The matrix as `business-rules.md` prints it, minus the transfer pair. */
const EXPECTED: Record<Archetype, MovementType[]> = {
  CASH_DEPOSIT: ["DEPOSIT", "WITHDRAWAL", "INTEREST", "FEE", "TAX"],
  FIXED_INCOME: [
    "BUY",
    "INTEREST",
    "COUPON",
    "MATURITY",
    "REDEMPTION",
    "FEE",
    "TAX",
  ],
  EXCHANGE_SECURITY: [
    "BUY",
    "SELL",
    "DIVIDEND",
    "DISTRIBUTION",
    "FEE",
    "TAX",
    "SPLIT",
    "BONUS",
  ],
  NAV_FUND: ["BUY", "SELL", "DISTRIBUTION", "FEE", "TAX"],
  CRYPTO: ["BUY", "SELL", "DISTRIBUTION", "FEE", "TAX"],
};

describe("typesFor", () => {
  it("offers exactly the matrix's types for each archetype", () => {
    for (const archetype of ARCHETYPES) {
      expect(typesFor(specs, archetype).sort()).toEqual(
        [...EXPECTED[archetype]].sort(),
      );
    }
  });

  it("never offers a type the archetype forbids", () => {
    // The four the roadmap calls out by name, and which the server would
    // reject if a form let them through.
    expect(typesFor(specs, "CASH_DEPOSIT")).not.toContain("DIVIDEND");
    expect(typesFor(specs, "NAV_FUND")).not.toContain("SPLIT");
    expect(typesFor(specs, "FIXED_INCOME")).not.toContain("SELL");
    expect(typesFor(specs, "CRYPTO")).not.toContain("DIVIDEND");
  });

  it("offers only the asset-less types when no asset is chosen", () => {
    expect(typesFor(specs, null).sort()).toEqual(
      ["DEPOSIT", "FEE", "TAX", "WITHDRAWAL"].sort(),
    );
  });

  it("excludes transfers everywhere — they are a different endpoint", () => {
    for (const archetype of [...ARCHETYPES, null]) {
      const offered = typesFor(specs, archetype);
      expect(offered).not.toContain("TRANSFER_IN");
      expect(offered).not.toContain("TRANSFER_OUT");
    }
  });
});

describe("shapeFor", () => {
  it("returns the crypto shape only for a crypto asset", () => {
    const transferOut = specFor(specs, "TRANSFER_OUT")!;

    expect(shapeFor(transferOut, "CRYPTO")).toEqual({
      quantity: "NEGATIVE",
      cash: "ZERO",
    });
    expect(shapeFor(transferOut, "CASH_DEPOSIT")).toEqual({
      quantity: "NULL",
      cash: "NEGATIVE",
    });
    // No asset at all is the pure-cash form, which is the default shape.
    expect(shapeFor(transferOut, null)).toEqual({
      quantity: "NULL",
      cash: "NEGATIVE",
    });
  });

  it("returns the default shape for a type with no second one", () => {
    const buy = specFor(specs, "BUY")!;
    expect(shapeFor(buy, "CRYPTO")).toEqual(buy.shape);
  });
});

describe("the lot rules", () => {
  it("requires a lot on the four exits, and only with an asset", () => {
    for (const type of [
      "SELL",
      "REDEMPTION",
      "WITHDRAWAL",
      "TRANSFER_OUT",
    ] as const) {
      const spec = specFor(specs, type)!;
      expect(requiresLot(spec, true)).toBe(true);
      // A pure-cash row carries no lot even when the type otherwise would.
      expect(requiresLot(spec, false)).toBe(false);
    }
  });

  it("creates a lot on the three entries, and never asks for one", () => {
    for (const type of ["BUY", "DEPOSIT", "TRANSFER_IN"] as const) {
      const spec = specFor(specs, type)!;
      expect(createsLot(spec, true)).toBe(true);
      expect(requiresLot(spec, true)).toBe(false);
    }
  });

  it("forbids a lot on income, costs, and corporate actions", () => {
    for (const type of [
      "DIVIDEND",
      "DISTRIBUTION",
      "INTEREST",
      "COUPON",
      "MATURITY",
      "FEE",
      "TAX",
      "SPLIT",
      "BONUS",
    ] as const) {
      const spec = specFor(specs, type)!;
      expect(requiresLot(spec, true)).toBe(false);
      expect(createsLot(spec, true)).toBe(false);
    }
  });
});

describe("allowsFee", () => {
  it("is true for the two trades and false for the other fourteen", () => {
    const withFee = specs.filter(allowsFee).map((spec) => spec.type);
    expect(withFee.sort()).toEqual(["BUY", "SELL"]);
  });
});

describe("the quantity rules", () => {
  it("knows which shapes take a quantity at all", () => {
    expect(acceptsQuantity({ quantity: "NULL", cash: "POSITIVE" })).toBe(false);
    expect(acceptsQuantity({ quantity: "NEGATIVE", cash: "POSITIVE" })).toBe(
      true,
    );
    expect(
      acceptsQuantity({ quantity: "POSITIVE_OR_NULL", cash: "NEGATIVE" }),
    ).toBe(true);
  });

  it("relaxes an optional quantity only for a lump-principal certificate", () => {
    // The table says `POSITIVE_OR_NULL` for every archetype BUY serves, but
    // the server's `movement_quantity_required` is narrower: units are
    // mandatory on a share and omissible on a CDB.
    const buy = specFor(specs, "BUY")!;

    expect(
      quantityRequired(shapeFor(buy, "FIXED_INCOME"), "FIXED_INCOME"),
    ).toBe(false);
    expect(
      quantityRequired(shapeFor(buy, "EXCHANGE_SECURITY"), "EXCHANGE_SECURITY"),
    ).toBe(true);
    expect(quantityRequired(shapeFor(buy, "CRYPTO"), "CRYPTO")).toBe(true);
  });

  it("never asks for a quantity a shape does not carry", () => {
    const dividend = specFor(specs, "DIVIDEND")!;

    expect(
      quantityRequired(
        shapeFor(dividend, "EXCHANGE_SECURITY"),
        "EXCHANGE_SECURITY",
      ),
    ).toBe(false);
  });

  it("distinguishes a required quantity from an optional one", () => {
    // The lump-principal fixed-income BUY is the whole reason this distinction
    // exists: a CDB is a sum of money, not a number of units.
    expect(
      requiresQuantity({ quantity: "POSITIVE_OR_NULL", cash: "NEGATIVE" }),
    ).toBe(false);
    expect(requiresQuantity({ quantity: "NEGATIVE", cash: "POSITIVE" })).toBe(
      true,
    );
    expect(requiresQuantity({ quantity: "NULL", cash: "POSITIVE" })).toBe(
      false,
    );
  });
});

describe("entryTypes", () => {
  it("names the types that open a lot, from the server's own rule", () => {
    expect(entryTypes(specs).sort()).toEqual(
      ["BUY", "DEPOSIT", "TRANSFER_IN"].sort(),
    );
  });

  it("excludes the types that consume a lot rather than open one", () => {
    // SELL, WITHDRAWAL, and TRANSFER_OUT are REQUIRES: they name an existing
    // lot. Treating one as an entry would date a position from its disposal.
    expect(entryTypes(specs)).not.toContain("SELL");
    expect(entryTypes(specs)).not.toContain("WITHDRAWAL");
    expect(entryTypes(specs)).not.toContain("TRANSFER_OUT");
  });

  it("excludes the types that carry no lot at all", () => {
    expect(entryTypes(specs)).not.toContain("DIVIDEND");
    expect(entryTypes(specs)).not.toContain("SPLIT");
  });

  it("reads the rule rather than a list, so a new entry type needs no edit here", () => {
    const invented = [
      { ...specs[0], type: "GRANT" as never, lot: "CREATES" as const },
    ];

    expect(entryTypes(invented)).toEqual(["GRANT"]);
  });
});
