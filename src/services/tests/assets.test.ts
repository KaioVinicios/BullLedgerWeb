import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { TEST_API_URL } from "@/mocks/env";
import { ApiClientError } from "@/lib/apiError";
import {
  archiveAsset,
  createAsset,
  listAssets,
  unarchiveAsset,
  updateAsset,
  type Asset,
} from "@/services/assets";

const asset: Asset = {
  id: "3c2d1e0f-9a8b-4c6d-8e4f-5a3b2c1d0e9f",
  name: "Bitcoin",
  archetype: "CRYPTO",
  currency: "USD",
  country: "US",
  pricing_mode: "MARKET",
  archived_at: null,
  symbol: "BTC",
  decimals: 18,
  price_currency: "USD",
  chain: null,
};

describe("listAssets", () => {
  it("passes the server-side archetype filter as a query parameter", async () => {
    let url: URL | undefined;

    server.use(
      http.get(`${TEST_API_URL}/api/assets/`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({
          status: 200,
          data: { count: 1, next: null, previous: null, results: [asset] },
        });
      }),
    );

    const page = await listAssets({ archetype: "CRYPTO", ordering: "name" });

    expect(url?.searchParams.get("archetype")).toBe("CRYPTO");
    expect(url?.searchParams.get("ordering")).toBe("name");
    expect(page.count).toBe(1);
  });

  it("surfaces a rejected filter as a field error keyed on archetype", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/assets/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: { archetype: ["Select a valid choice."] },
          },
          { status: 400 },
        ),
      ),
    );

    const promise = listAssets({
      archetype: "BOGUS" as unknown as Asset["archetype"],
    });

    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toSatisfy(
      (error: ApiClientError) =>
        error.fieldErrors("archetype")[0] === "Select a valid choice.",
    );
  });
});

describe("createAsset", () => {
  it("returns the created asset from inside the envelope", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/assets/`, () =>
        HttpResponse.json({ status: 201, data: asset }, { status: 201 }),
      ),
    );

    const created = await createAsset({
      name: "Bitcoin",
      archetype: "CRYPTO",
      currency: "USD",
      country: "US",
      symbol: "BTC",
      decimals: 18,
      price_currency: "USD",
    });

    expect(created.id).toBe(asset.id);
    expect(created.archetype).toBe("CRYPTO");
  });
});

describe("updateAsset", () => {
  it("PATCHes the detail path without an archetype in the body", async () => {
    let patched: Record<string, unknown> | undefined;

    server.use(
      http.patch(
        `${TEST_API_URL}/api/assets/${asset.id}/`,
        async ({ request }) => {
          patched = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            status: 200,
            data: { ...asset, name: "BTC (cold wallet)" },
          });
        },
      ),
    );

    const updated = await updateAsset(asset.id, { name: "BTC (cold wallet)" });

    expect(patched).toEqual({ name: "BTC (cold wallet)" });
    expect(updated.name).toBe("BTC (cold wallet)");
  });
});

describe("archiveAsset / unarchiveAsset", () => {
  it("POSTs to the dedicated sub-paths and unwraps the updated resource", async () => {
    const archivedAt = "2026-07-31T12:00:00Z";

    server.use(
      http.post(`${TEST_API_URL}/api/assets/${asset.id}/archive/`, () =>
        HttpResponse.json({
          status: 200,
          data: { ...asset, archived_at: archivedAt },
        }),
      ),
      http.post(`${TEST_API_URL}/api/assets/${asset.id}/unarchive/`, () =>
        HttpResponse.json({ status: 200, data: asset }),
      ),
    );

    const archived = await archiveAsset(asset.id);
    expect(archived.archived_at).toBe(archivedAt);

    const restored = await unarchiveAsset(asset.id);
    expect(restored.archived_at).toBeNull();
  });
});
