import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { ApiClientError } from "@/lib/apiError";
import { createApiClient } from "@/lib/apiClient";
import { request, unwrap } from "@/lib/request";

const API = "https://api.test.bullledger.local";
const client = createApiClient(API);

describe("unwrap", () => {
  it("returns the data property of an enveloped body", () => {
    expect(unwrap({ status: 200, data: { id: "a" } })).toEqual({ id: "a" });
  });

  it("returns a bare body untouched", () => {
    expect(unwrap({ pk: 1, email: "a@b.c" })).toEqual({
      pk: 1,
      email: "a@b.c",
    });
  });

  it("unwraps a paginated envelope down to the page object", () => {
    const page = { count: 2, next: null, previous: null, results: [1, 2] };

    expect(unwrap({ status: 200, data: page })).toEqual(page);
  });

  it("leaves null and primitive bodies alone", () => {
    expect(unwrap(null)).toBeNull();
    expect(unwrap("detail")).toBe("detail");
  });
});

describe("request", () => {
  it("returns unwrapped data on success", async () => {
    server.use(
      http.get(`${API}/ok`, () =>
        HttpResponse.json({ status: 200, data: { id: "a" } }),
      ),
    );

    await expect(request(client.get(`${API}/ok`))).resolves.toEqual({
      id: "a",
    });
  });

  it("normalizes a validation error, keeping field keys intact", async () => {
    server.use(
      http.get(`${API}/invalid`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: { email: ["This field is required."] },
          },
          { status: 400 },
        ),
      ),
    );

    const promise = request(client.get(`${API}/invalid`));

    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toMatchObject({
      kind: "validation",
      status: 400,
    });
  });

  it("reports a network failure as a network error", async () => {
    server.use(http.get(`${API}/down`, () => HttpResponse.error()));

    await expect(request(client.get(`${API}/down`))).rejects.toMatchObject({
      kind: "network",
      status: 0,
    });
  });

  it("treats a non-conforming error body as malformed", async () => {
    server.use(
      http.get(`${API}/debug-page`, () =>
        HttpResponse.html("<h1>Traceback</h1>", { status: 500 }),
      ),
    );

    await expect(
      request(client.get(`${API}/debug-page`)),
    ).rejects.toMatchObject({
      kind: "malformed",
      messageKey: "errors:unexpected",
    });
  });
});
