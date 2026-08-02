import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { listMovementTypes } from "@/services/movementTypes";

describe("listMovementTypes", () => {
  it("returns the array from inside the envelope, unpaginated", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/movement-types/`, () =>
        HttpResponse.json({
          status: 200,
          data: [
            {
              type: "SELL",
              archetypes: ["EXCHANGE_SECURITY", "NAV_FUND", "CRYPTO"],
              asset_required: true,
              shape: { quantity: "NEGATIVE", cash: "POSITIVE" },
              crypto_shape: null,
              unit_price: "WITH_QUANTITY",
              fee_allowed: true,
              lot: "REQUIRES",
            },
          ],
        }),
      ),
    );

    const specs = await listMovementTypes();

    // `data` is the array itself — there is no `results`/`count` wrapper here,
    // which is why this resource does not go through `usePaginatedQuery`.
    expect(specs).toHaveLength(1);
    expect(specs[0]?.lot).toBe("REQUIRES");
  });
});
