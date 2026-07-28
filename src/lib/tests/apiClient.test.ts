import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { CSRF_HEADER, createApiClient } from "@/lib/apiClient";
import { TEST_API_URL } from "@/mocks/env";

/** Records every request MSW sees, so assertions read the real wire. */
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

afterEach(() => {
  document.cookie = "csrftoken=; max-age=0";
});

describe("createApiClient", () => {
  it("sends cookies with every request", async () => {
    const client = createApiClient(TEST_API_URL);

    expect(client.defaults.withCredentials).toBe(true);
  });

  it("echoes the csrftoken cookie as X-CSRFToken", async () => {
    document.cookie = "csrftoken=tok-123";
    const seen = recorder();

    await createApiClient(TEST_API_URL).post("/api/accounts/", {});

    expect(seen[0]?.headers.get(CSRF_HEADER)).toBe("tok-123");
  });

  it("omits X-CSRFToken when no cookie exists", async () => {
    const seen = recorder();

    await createApiClient(TEST_API_URL).post("/api/accounts/", {});

    expect(seen[0]?.headers.get(CSRF_HEADER)).toBeNull();
  });

  it("resolves paths against the base URL", async () => {
    const seen = recorder();

    await createApiClient(TEST_API_URL).get("/api/accounts/");

    expect(seen[0]?.url).toBe(`${TEST_API_URL}/api/accounts/`);
  });

  it("sends a JSON body as JSON", async () => {
    const seen = recorder();

    await createApiClient(TEST_API_URL).post("/api/accounts/", {
      name: "Nubank",
    });

    expect(seen[0]?.headers.get("content-type")).toContain("application/json");
    await expect(seen[0]?.json()).resolves.toEqual({ name: "Nubank" });
  });
});
