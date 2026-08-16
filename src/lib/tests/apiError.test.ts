import { describe, expect, it } from "vitest";

import {
  ApiClientError,
  apiClientErrorFromBody,
  apiClientErrorFromTransport,
} from "@/lib/apiError";

const validationBody = {
  status: 400,
  message: "Invalid input.",
  errors: {
    email: ["This field is required."],
    "steps.0.rate": ["A valid number is required."],
    non_field_errors: ["Some general problem."],
  },
};

describe("apiClientErrorFromBody", () => {
  it("maps a validation body onto fields, preserving dotted and indexed keys", () => {
    const error = apiClientErrorFromBody(validationBody, 400);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.kind).toBe("validation");
    expect(error.status).toBe(400);
    expect(error.message).toBe("Invalid input.");
    expect(error.fieldErrors("steps.0.rate")).toEqual([
      "A valid number is required.",
    ]);
  });

  it("exposes non_field_errors through its own accessor", () => {
    expect(apiClientErrorFromBody(validationBody, 400).nonFieldErrors).toEqual([
      "Some general problem.",
    ]);
  });

  it("treats detail as an array, matching the wire", () => {
    const error = apiClientErrorFromBody(
      {
        status: 401,
        message: "Authentication credentials were not provided.",
        errors: { detail: ["Authentication credentials were not provided."] },
      },
      401,
    );

    expect(error.kind).toBe("auth");
    expect(error.detail).toEqual([
      "Authentication credentials were not provided.",
    ]);
  });

  it("classifies 403 as auth, 404 as notFound, and 5xx as server", () => {
    const body = (status: number) => ({ status, message: "x", errors: {} });

    expect(apiClientErrorFromBody(body(403), 403).kind).toBe("auth");
    expect(apiClientErrorFromBody(body(404), 404).kind).toBe("notFound");
    expect(apiClientErrorFromBody(body(500), 500).kind).toBe("server");
  });

  it("returns an empty array for a field that has no messages", () => {
    expect(
      apiClientErrorFromBody(validationBody, 400).fieldErrors("nope"),
    ).toEqual([]);
  });

  it("marks a non-conforming JSON body as malformed", () => {
    const error = apiClientErrorFromBody({ whatever: true }, 500);

    expect(error.kind).toBe("malformed");
    expect(error.messageKey).toBe("unexpected");
    expect(error.fields).toEqual({});
  });

  it("marks an HTML body as malformed and keeps it out of the message", () => {
    const html = "<!DOCTYPE html><h1>OperationalError</h1>";

    const error = apiClientErrorFromBody(html, 500);

    expect(error.kind).toBe("malformed");
    expect(error.message).not.toContain("OperationalError");
    expect(error.message).not.toContain("<");
  });

  it("marks an absent body as malformed", () => {
    expect(apiClientErrorFromBody(undefined, 500).kind).toBe("malformed");
  });

  it("rejects an errors map whose values are not string arrays", () => {
    const error = apiClientErrorFromBody(
      { status: 400, message: "x", errors: { email: "not an array" } },
      400,
    );

    expect(error.kind).toBe("malformed");
  });
});

describe("apiClientErrorFromTransport", () => {
  it("reports status 0 and the network kind", () => {
    const cause = new TypeError("Failed to fetch");

    const error = apiClientErrorFromTransport(cause);

    expect(error.status).toBe(0);
    expect(error.kind).toBe("network");
    expect(error.messageKey).toBe("network");
    expect(error.cause).toBe(cause);
  });
});
