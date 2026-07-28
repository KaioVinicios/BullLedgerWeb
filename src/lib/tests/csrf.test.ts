import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { CSRF_HEADER, createApiClient } from "@/lib/apiClient";
import { TEST_API_URL } from "@/mocks/env";
import {
  CSRF_PATH,
  attachCsrfAcquisition,
  createCsrfAcquisition,
  hasCsrfToken,
} from "@/lib/csrf";

afterEach(() => {
  document.cookie = "csrftoken=; max-age=0";
});

/** Stands in for the server: hands out a cookie the way `GET /csrf/` does. */
function issuer() {
  const calls: string[] = [];
  return {
    calls,
    acquire: vi.fn(async () => {
      calls.push(CSRF_PATH);
      document.cookie = "csrftoken=issued-token";
    }),
  };
}

describe("hasCsrfToken", () => {
  it("reports the cookie only once it exists", () => {
    expect(hasCsrfToken()).toBe(false);

    document.cookie = "csrftoken=tok-123";

    expect(hasCsrfToken()).toBe(true);
  });

  it("is not fooled by another cookie whose name ends in csrftoken", () => {
    document.cookie = "not_csrftoken=tok-123";

    expect(hasCsrfToken()).toBe(false);
  });
});

describe("createCsrfAcquisition", () => {
  it("fetches a token when none is present", async () => {
    const { acquire } = issuer();

    await createCsrfAcquisition(acquire)();

    expect(acquire).toHaveBeenCalledTimes(1);
    expect(hasCsrfToken()).toBe(true);
  });

  it("does not fetch when the cookie is already there", async () => {
    document.cookie = "csrftoken=tok-123";
    const { acquire } = issuer();

    await createCsrfAcquisition(acquire)();

    expect(acquire).not.toHaveBeenCalled();
  });

  it("fetches once for a burst of concurrent callers", async () => {
    const { acquire } = issuer();
    const ensure = createCsrfAcquisition(acquire);

    await Promise.all([ensure(), ensure(), ensure()]);

    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it("retries on a later call when acquisition failed", async () => {
    const acquire = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(undefined);
    const ensure = createCsrfAcquisition(acquire);

    await expect(ensure()).rejects.toThrow("network down");
    await ensure();

    expect(acquire).toHaveBeenCalledTimes(2);
  });
});

describe("attachCsrfAcquisition", () => {
  function recorder() {
    const seen: Request[] = [];
    server.use(
      http.all(`${TEST_API_URL}/*`, ({ request }) => {
        seen.push(request.clone());
        return HttpResponse.json({ status: 200, data: {} });
      }),
    );
    return seen;
  }

  it("acquires the token before an unsafe request, and sends it", async () => {
    const seen = recorder();
    const { acquire } = issuer();
    const client = createApiClient(TEST_API_URL);
    attachCsrfAcquisition(client, createCsrfAcquisition(acquire));

    await client.post("/api/accounts/", {});

    expect(acquire).toHaveBeenCalledTimes(1);
    expect(seen[0]?.headers.get(CSRF_HEADER)).toBe("issued-token");
  });

  it("leaves safe requests alone", async () => {
    recorder();
    const { acquire } = issuer();
    const client = createApiClient(TEST_API_URL);
    attachCsrfAcquisition(client, createCsrfAcquisition(acquire));

    await client.get("/api/accounts/");

    expect(acquire).not.toHaveBeenCalled();
  });

  it("keeps the token off safe requests even when one is held", async () => {
    document.cookie = "csrftoken=tok-123";
    const seen = recorder();
    const { acquire } = issuer();
    const client = createApiClient(TEST_API_URL);
    attachCsrfAcquisition(client, createCsrfAcquisition(acquire));

    await client.get("/api/accounts/");

    expect(seen[0]?.headers.get(CSRF_HEADER)).toBeNull();
  });

  it("skips acquisition when the token is already held", async () => {
    document.cookie = "csrftoken=tok-123";
    const seen = recorder();
    const { acquire } = issuer();
    const client = createApiClient(TEST_API_URL);
    attachCsrfAcquisition(client, createCsrfAcquisition(acquire));

    await client.post("/api/accounts/", {});

    expect(acquire).not.toHaveBeenCalled();
    expect(seen[0]?.headers.get(CSRF_HEADER)).toBe("tok-123");
  });
});
