import { describe, expect, it } from "vitest";

import type { components } from "@/types/api";

/**
 * A contract tripwire, not a unit test. The runtime assertions are trivial;
 * the value is in the type annotations, which stop compiling if the API
 * renames or drops one of these members. `bun run typecheck` is what catches
 * the break.
 */
describe("generated api types", () => {
  it("exposes the five asset archetypes", () => {
    const archetypes: components["schemas"]["ArchetypeEnum"][] = [
      "CASH_DEPOSIT",
      "FIXED_INCOME",
      "EXCHANGE_SECURITY",
      "NAV_FUND",
      "CRYPTO",
    ];

    expect(archetypes).toHaveLength(5);
  });

  it("exposes the three reporting currencies", () => {
    const currencies: components["schemas"]["CurrencyEnum"][] = [
      "BRL",
      "USD",
      "CAD",
    ];

    expect(currencies).toHaveLength(3);
  });

  it("models an account id as a uuid string", () => {
    const account: Pick<components["schemas"]["Account"], "id"> = {
      id: "6f1b5f6e-6d3a-4a0e-9f6d-2c1b7a4e8d90",
    };

    expect(account.id).toHaveLength(36);
  });
});
