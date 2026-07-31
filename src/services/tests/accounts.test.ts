import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { ApiClientError } from "@/lib/apiError";
import {
  archiveAccount,
  createAccount,
  listAccounts,
  unarchiveAccount,
  updateAccount,
} from "@/services/accounts";
import { TEST_API_URL } from "@/mocks/env";

const account = {
  id: "6f1b5f6e-6d3a-4a0e-9f6d-2c1b7a4e8d90",
  name: "Nubank",
  country: "BR" as const,
  registration: "BR_TAXABLE" as const,
  base_currency: "BRL" as const,
  archived_at: null,
};

describe("listAccounts", () => {
  it("returns the page from inside the envelope", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json({
          status: 200,
          data: { count: 1, next: null, previous: null, results: [account] },
        }),
      ),
    );

    const page = await listAccounts({});

    expect(page.count).toBe(1);
    expect(page.results[0]?.name).toBe("Nubank");
  });

  it("passes page and include_archived as query parameters", async () => {
    let url: URL | undefined;

    server.use(
      http.get(`${TEST_API_URL}/api/accounts/`, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json({
          status: 200,
          data: { count: 0, next: null, previous: null, results: [] },
        });
      }),
    );

    await listAccounts({ page: 3, include_archived: true });

    expect(url?.searchParams.get("page")).toBe("3");
    expect(url?.searchParams.get("include_archived")).toBe("true");
  });

  it("throws a normalized auth error on 401", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json(
          {
            status: 401,
            message: "Authentication credentials were not provided.",
            errors: {
              detail: ["Authentication credentials were not provided."],
            },
          },
          { status: 401 },
        ),
      ),
      http.post(`${TEST_API_URL}/api/auth/token/refresh/`, () =>
        HttpResponse.json({}, { status: 401 }),
      ),
    );

    await expect(listAccounts({})).rejects.toMatchObject({
      kind: "auth",
      status: 401,
    });
  });
});

describe("createAccount", () => {
  it("returns the created account from inside the envelope", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json({ status: 201, data: account }, { status: 201 }),
      ),
    );

    const created = await createAccount({
      name: "Nubank",
      country: "BR",
      registration: "BR_TAXABLE",
      base_currency: "BRL",
    });

    expect(created.id).toBe(account.id);
  });

  it("surfaces field errors on 400 with their keys intact", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: { registration: ["Not valid for country BR."] },
          },
          { status: 400 },
        ),
      ),
    );

    const promise = createAccount({
      name: "Nubank",
      country: "BR",
      registration: "CA_TFSA",
      base_currency: "BRL",
    });

    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toSatisfy(
      (error: ApiClientError) =>
        error.fieldErrors("registration")[0] === "Not valid for country BR.",
    );
  });
});

describe("updateAccount", () => {
  it("PATCHes the detail path and unwraps the envelope", async () => {
    let patched: unknown;

    server.use(
      http.patch(
        `${TEST_API_URL}/api/accounts/${account.id}/`,
        async ({ request }) => {
          patched = await request.json();
          return HttpResponse.json({
            status: 200,
            data: { ...account, name: "Nubank PJ" },
          });
        },
      ),
    );

    const updated = await updateAccount(account.id, { name: "Nubank PJ" });

    expect(patched).toEqual({ name: "Nubank PJ" });
    expect(updated.name).toBe("Nubank PJ");
  });
});

describe("archiveAccount / unarchiveAccount", () => {
  it("POSTs to the dedicated sub-paths and unwraps the updated resource", async () => {
    const archivedAt = "2026-07-31T12:00:00Z";

    server.use(
      http.post(`${TEST_API_URL}/api/accounts/${account.id}/archive/`, () =>
        HttpResponse.json({
          status: 200,
          data: { ...account, archived_at: archivedAt },
        }),
      ),
      http.post(`${TEST_API_URL}/api/accounts/${account.id}/unarchive/`, () =>
        HttpResponse.json({ status: 200, data: account }),
      ),
    );

    const archived = await archiveAccount(account.id);
    expect(archived.archived_at).toBe(archivedAt);

    const restored = await unarchiveAccount(account.id);
    expect(restored.archived_at).toBeNull();
  });
});
