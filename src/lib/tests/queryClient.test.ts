import { afterEach, describe, expect, it } from "vitest";
import { MutationObserver, type QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { ApiClientError, type ApiErrorKind } from "@/lib/apiError";
import { createQueryClient, wireSessionRecovery } from "@/lib/queryClient";
import {
  REFRESH_PATH,
  notifySessionLost,
  setOnSessionLost,
} from "@/lib/sessionRecovery";
import { listAccounts } from "@/services/accounts";

const API = "https://api.test.bullledger.local";

function errorOfKind(kind: ApiErrorKind, status: number): ApiClientError {
  return new ApiClientError({ status, kind, message: `a ${kind} failure` });
}

/**
 * Runs a query through the real client defaults and reports how many times the
 * query function was called. `retryDelay` is the one option overridden — the
 * default is exponential backoff, which would trade seconds for nothing. The
 * `retry` predicate under test is left exactly as the client defines it.
 */
async function attemptsFor(
  client: QueryClient,
  error: ApiClientError,
): Promise<number> {
  let calls = 0;

  await client
    .fetchQuery({
      queryKey: [error.kind, Math.random()],
      queryFn: () => {
        calls += 1;
        return Promise.reject(error);
      },
      retryDelay: 0,
    })
    .catch(() => {});

  return calls;
}

afterEach(() => {
  // `setOnSessionLost` is module-level state; leave it as we found it.
  setOnSessionLost(() => {});
});

describe("createQueryClient retry policy", () => {
  it("never retries an auth failure, because recovery already ran", async () => {
    expect(
      await attemptsFor(createQueryClient(), errorOfKind("auth", 401)),
    ).toBe(1);
  });

  it("never retries a validation failure, which would re-send a wrong payload", async () => {
    expect(
      await attemptsFor(createQueryClient(), errorOfKind("validation", 400)),
    ).toBe(1);
  });

  it("never retries a not-found", async () => {
    expect(
      await attemptsFor(createQueryClient(), errorOfKind("notFound", 404)),
    ).toBe(1);
  });

  it("never retries a malformed response", async () => {
    expect(
      await attemptsFor(createQueryClient(), errorOfKind("malformed", 500)),
    ).toBe(1);
  });

  it("retries a network failure twice, then gives up", async () => {
    expect(
      await attemptsFor(createQueryClient(), errorOfKind("network", 0)),
    ).toBe(3);
  });

  it("retries a server failure twice, then gives up", async () => {
    expect(
      await attemptsFor(createQueryClient(), errorOfKind("server", 500)),
    ).toBe(3);
  });

  it("does not retry an error that is not ours", async () => {
    let calls = 0;

    await createQueryClient()
      .fetchQuery({
        queryKey: ["foreign"],
        queryFn: () => {
          calls += 1;
          return Promise.reject(new Error("something else entirely"));
        },
        retryDelay: 0,
      })
      .catch(() => {});

    expect(calls).toBe(1);
  });

  it("never retries a mutation, even a transient one", async () => {
    let calls = 0;
    const client = createQueryClient();

    const observer = new MutationObserver(client, {
      mutationFn: () => {
        calls += 1;
        return Promise.reject(errorOfKind("network", 0));
      },
    });

    await observer.mutate().catch(() => {});

    expect(calls).toBe(1);
  });
});

describe("query and transport together", () => {
  it("recovers once in transport and does not retry again in the cache", async () => {
    let accountsCalls = 0;
    let refreshCalls = 0;

    server.use(
      http.get(`${API}/api/accounts/`, () => {
        accountsCalls += 1;
        return HttpResponse.json(
          {
            status: 401,
            message: "Authentication credentials were not provided.",
            errors: {
              detail: ["Authentication credentials were not provided."],
            },
          },
          { status: 401 },
        );
      }),
      http.post(`${API}${REFRESH_PATH}`, () => {
        refreshCalls += 1;
        return HttpResponse.json({});
      }),
    );

    const client = createQueryClient();
    const error = await client
      .fetchQuery({
        queryKey: ["accounts"],
        queryFn: () => listAccounts({}),
        retryDelay: 0,
      })
      .catch((cause: unknown) => cause);

    // The interceptor refreshed and replayed once: two calls, one refresh.
    expect(refreshCalls).toBe(1);
    expect(accountsCalls).toBe(2);
    // The cache added nothing on top — a 401 that survived recovery is final.
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ kind: "auth", status: 401 });
  });
});

describe("wireSessionRecovery", () => {
  it("drops every cached figure when the session is lost", () => {
    const client = createQueryClient();
    client.setQueryData(["accounts"], { count: 1 });
    wireSessionRecovery(client);

    expect(client.getQueryData(["accounts"])).toEqual({ count: 1 });

    // Exactly what the interceptor calls when a refresh fails.
    notifySessionLost();

    expect(client.getQueryData(["accounts"])).toBeUndefined();
  });
});
