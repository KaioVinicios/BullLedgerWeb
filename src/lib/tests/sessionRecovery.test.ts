import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import type { AxiosInstance } from "axios";

import { server } from "@/mocks/server";
import { CSRF_HEADER, createApiClient } from "@/lib/apiClient";
import { TEST_API_URL } from "@/mocks/env";
import {
  REFRESH_PATH,
  type SessionRecoveryOptions,
  attachSessionRecovery,
} from "@/lib/sessionRecovery";

const REFRESH_URL = `${TEST_API_URL}${REFRESH_PATH}`;

/**
 * Builds a recovered client whose refresh goes through a separate plain
 * instance — the same arrangement `apiClient` wires in production.
 */
function makeClient(
  overrides: Partial<SessionRecoveryOptions> = {},
): AxiosInstance {
  const client = createApiClient(TEST_API_URL);
  const refreshClient = createApiClient(TEST_API_URL);

  attachSessionRecovery(client, {
    refresh: () => refreshClient.post(REFRESH_PATH, {}),
    onSessionLost: () => {},
    csrfHeader: CSRF_HEADER,
    ...overrides,
  });

  return client;
}

describe("attachSessionRecovery", () => {
  it("refreshes once and replays the original request", async () => {
    let accountsCalls = 0;
    let refreshCalls = 0;

    server.use(
      http.get(`${TEST_API_URL}/api/accounts/`, () => {
        accountsCalls += 1;
        return accountsCalls === 1
          ? HttpResponse.json({ status: 401 }, { status: 401 })
          : HttpResponse.json({ status: 200, data: { count: 0 } });
      }),
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return HttpResponse.json({});
      }),
    );

    const response = await makeClient().get("/api/accounts/");

    expect(response.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(accountsCalls).toBe(2);
  });

  it("retries at most once, so a second 401 rejects", async () => {
    let refreshCalls = 0;

    server.use(
      http.get(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json({ status: 401 }, { status: 401 }),
      ),
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return HttpResponse.json({});
      }),
    );

    await expect(makeClient().get("/api/accounts/")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshCalls).toBe(1);
  });

  it("fires onSessionLost when the refresh itself fails", async () => {
    let lost = 0;

    server.use(
      http.get(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json({ status: 401 }, { status: 401 }),
      ),
      http.post(REFRESH_URL, () => HttpResponse.json({}, { status: 401 })),
    );

    const client = makeClient({ onSessionLost: () => (lost += 1) });

    await expect(client.get("/api/accounts/")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(lost).toBe(1);
  });

  it("triggers exactly one refresh for a burst of concurrent 401s", async () => {
    const seenFirst = new Set<string>();
    let refreshCalls = 0;

    server.use(
      http.get(`${TEST_API_URL}/api/:resource/`, ({ params }) => {
        const resource = String(params.resource);
        if (seenFirst.has(resource)) {
          return HttpResponse.json({ status: 200, data: { count: 0 } });
        }
        seenFirst.add(resource);
        return HttpResponse.json({ status: 401 }, { status: 401 });
      }),
      http.post(REFRESH_URL, async () => {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return HttpResponse.json({});
      }),
    );

    const client = makeClient();
    const responses = await Promise.all([
      client.get("/api/accounts/"),
      client.get("/api/assets/"),
      client.get("/api/movements/"),
    ]);

    expect(refreshCalls).toBe(1);
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
  });

  it("never recurses: the refresh call bypasses the interceptor", async () => {
    let refreshCalls = 0;

    server.use(
      http.get(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json({ status: 401 }, { status: 401 }),
      ),
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return HttpResponse.json({}, { status: 401 });
      }),
    );

    await expect(makeClient().get("/api/accounts/")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshCalls).toBe(1);
  });

  it("replays the original body on the retry", async () => {
    let attempts = 0;
    const bodies: unknown[] = [];

    server.use(
      http.post(`${TEST_API_URL}/api/accounts/`, async ({ request }) => {
        attempts += 1;
        bodies.push(await request.json());
        return attempts === 1
          ? HttpResponse.json({ status: 401 }, { status: 401 })
          : HttpResponse.json({ status: 201, data: {} }, { status: 201 });
      }),
      http.post(REFRESH_URL, () => HttpResponse.json({})),
    );

    await makeClient().post("/api/accounts/", { name: "Nubank" });

    expect(bodies).toEqual([{ name: "Nubank" }, { name: "Nubank" }]);
  });

  it("passes non-401 failures straight through without refreshing", async () => {
    let refreshCalls = 0;

    server.use(
      http.get(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json({ status: 500 }, { status: 500 }),
      ),
      http.post(REFRESH_URL, () => {
        refreshCalls += 1;
        return HttpResponse.json({});
      }),
    );

    await expect(makeClient().get("/api/accounts/")).rejects.toMatchObject({
      response: { status: 500 },
    });
    expect(refreshCalls).toBe(0);
  });
});
