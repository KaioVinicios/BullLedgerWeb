import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { ApiClientError } from "@/lib/apiError";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import {
  listAllMovementsFor,
  listMovements,
  recordMovement,
  recordTransfer,
  replaceMovement,
  voidMovement,
  type Movement,
} from "@/services/movements";

const movement: Movement = {
  id: "44444444-4444-4444-8444-444444444444",
  account: "11111111-1111-4111-8111-111111111111",
  asset: "22222222-2222-4222-8222-222222222222",
  lot: "33333333-3333-4333-8333-333333333333",
  type: "BUY",
  occurred_on: "2026-03-04",
  quantity_delta: "10",
  unit_price: "19.40",
  cash_delta: { amount: -20_400, currency: "BRL" },
  fee: { amount: 1_000, currency: "BRL" },
  fx_rate: "1",
  note: "",
  replaces: null,
  transfer_of: null,
  created_at: "2026-03-04T12:00:00Z",
  voided_at: null,
};

describe("listMovements", () => {
  it("passes every filter the schema declares", async () => {
    let url: URL | undefined;

    server.use(
      http.get(`${TEST_API_URL}/api/movements/`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({
          status: 200,
          data: { count: 1, next: null, previous: null, results: [movement] },
        });
      }),
    );

    const page = await listMovements({
      account: movement.account,
      asset: movement.asset!,
      type: "BUY",
      occurred_after: "2026-01-01",
      occurred_before: "2026-12-31",
      include_voided: true,
      page: 2,
    });

    expect(url?.searchParams.get("account")).toBe(movement.account);
    expect(url?.searchParams.get("type")).toBe("BUY");
    expect(url?.searchParams.get("occurred_after")).toBe("2026-01-01");
    expect(url?.searchParams.get("include_voided")).toBe("true");
    expect(page.count).toBe(1);
  });
});

describe("recordMovement", () => {
  it("returns the recorded movement from inside the envelope", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json({ status: 201, data: movement }, { status: 201 }),
      ),
    );

    const recorded = await recordMovement({
      account: movement.account,
      type: "BUY",
      occurred_on: "2026-03-04",
      cash_delta: { amount: -20_400, currency: "BRL" },
    });

    expect(recorded.id).toBe(movement.id);
  });

  it("surfaces the lot rejection as a field error keyed on lot", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/movements/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: {
              lot: ["The lot holds 4 at 2026-03-04; this exit needs 9."],
            },
            codes: { lot: ["movement_lot_overdrawn"] },
          },
          { status: 400 },
        ),
      ),
    );

    const promise = recordMovement({
      account: movement.account,
      type: "SELL",
      occurred_on: "2026-03-04",
      cash_delta: { amount: 8_400, currency: "BRL" },
    });

    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toSatisfy(
      (error: ApiClientError) =>
        error.fieldCodes("lot")[0] === "movement_lot_overdrawn",
    );
  });
});

describe("replaceMovement", () => {
  it("POSTs to the replace sub-path and returns the successor", async () => {
    let posted: Record<string, unknown> | undefined;

    server.use(
      http.post(
        `${TEST_API_URL}/api/movements/${movement.id}/replace/`,
        async ({ request }) => {
          posted = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(
            {
              status: 201,
              data: {
                ...movement,
                id: "55555555-5555-4555-8555-555555555555",
                replaces: movement.id,
              },
            },
            { status: 201 },
          );
        },
      ),
    );

    const successor = await replaceMovement(movement.id, {
      account: movement.account,
      type: "BUY",
      occurred_on: "2026-03-05",
      cash_delta: { amount: -20_400, currency: "BRL" },
    });

    // The successor is a different row that points back at the original — the
    // whole reason this is not a PATCH.
    expect(successor.id).not.toBe(movement.id);
    expect(successor.replaces).toBe(movement.id);
    expect(posted).toMatchObject({ occurred_on: "2026-03-05" });
  });
});

describe("voidMovement", () => {
  it("POSTs to the void sub-path and returns the voided row", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/movements/${movement.id}/void/`, () =>
        HttpResponse.json({
          status: 200,
          data: { ...movement, voided_at: "2026-03-06T09:00:00Z" },
        }),
      ),
    );

    const voided = await voidMovement(movement.id);

    expect(voided.voided_at).toBe("2026-03-06T09:00:00Z");
  });
});

describe("recordTransfer", () => {
  it("returns both legs, which is what makes it one action", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/movements/transfer/`, () =>
        HttpResponse.json(
          {
            status: 201,
            data: {
              out: { ...movement, type: "TRANSFER_OUT" },
              in: {
                ...movement,
                id: "66666666-6666-4666-8666-666666666666",
                type: "TRANSFER_IN",
                transfer_of: movement.id,
              },
            },
          },
          { status: 201 },
        ),
      ),
    );

    const legs = await recordTransfer({
      source_account: movement.account,
      destination_account: "77777777-7777-4777-8777-777777777777",
      occurred_on: "2026-03-04",
      cash_amount: { amount: 10_000, currency: "BRL" },
    });

    expect(legs.out.type).toBe("TRANSFER_OUT");
    expect(legs.in.type).toBe("TRANSFER_IN");
  });
});

describe("listAllMovementsFor", () => {
  it("walks every page, because a long position outruns one", async () => {
    // PAGE_SIZE is 50 with no client override, so a position held for years
    // arrives in several pages and a first-page read would silently lose the
    // oldest lots — which are exactly the ones a purchase date is wanted for.
    const rows = (n: number, from: number) =>
      Array.from({ length: n }, (_, i) => ({
        ...movement,
        id: `m${from + i}`,
        lot: `lot${from + i}`,
      }));

    server.use(
      http.get(`${TEST_API_URL}/api/movements/`, ({ request }) => {
        const page = new URL(request.url).searchParams.get("page") ?? "1";

        return HttpResponse.json({
          status: 200,
          data: {
            count: 60,
            next: page === "1" ? "http://next" : null,
            previous: null,
            results: page === "1" ? rows(50, 0) : rows(10, 50),
          },
        });
      }),
    );

    const result = await listAllMovementsFor("acc", "ast");

    expect(result).toHaveLength(60);
    expect(result[59].id).toBe("m59");
  });

  it("sends both filters, so the walk is one position's history", async () => {
    let seen: URLSearchParams | undefined;

    server.use(
      http.get(`${TEST_API_URL}/api/movements/`, ({ request }) => {
        seen = new URL(request.url).searchParams;

        return HttpResponse.json({
          status: 200,
          data: { count: 0, next: null, previous: null, results: [] },
        });
      }),
    );

    await listAllMovementsFor("acc-1", "ast-1");

    expect(seen?.get("account")).toBe("acc-1");
    expect(seen?.get("asset")).toBe("ast-1");
  });
});
