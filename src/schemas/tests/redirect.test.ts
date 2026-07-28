import { describe, expect, it } from "vitest";

import { PATHS } from "@/routes/path";
import { authSearchSchema, redirectSchema } from "@/schemas/redirect";

describe("redirectSchema", () => {
  it("accepts a same-origin path", () => {
    expect(redirectSchema.parse("/app")).toBe("/app");
    expect(redirectSchema.parse("/app/ledger?page=2")).toBe(
      "/app/ledger?page=2",
    );
  });

  it("rejects a protocol-relative URL that would leave the origin", () => {
    expect(redirectSchema.parse("//evil.example")).toBe(PATHS.APP);
  });

  it("rejects an absolute URL", () => {
    expect(redirectSchema.parse("https://evil.example")).toBe(PATHS.APP);
  });

  it("rejects a javascript: URL", () => {
    expect(redirectSchema.parse("javascript:alert(1)")).toBe(PATHS.APP);
  });

  it("falls back for a non-string, so a hand-edited link never throws at the user", () => {
    expect(redirectSchema.parse(undefined)).toBe(PATHS.APP);
    expect(redirectSchema.parse(42)).toBe(PATHS.APP);
  });
});

describe("authSearchSchema", () => {
  it("treats a bare /login with no search params as valid, adding nothing", () => {
    // Absent stays absent, so the router never writes a `?redirect=` the user
    // did not ask for back into the URL.
    expect(authSearchSchema.parse({})).toEqual({});
  });

  it("keeps a safe destination", () => {
    expect(authSearchSchema.parse({ redirect: "/app/ledger" })).toEqual({
      redirect: "/app/ledger",
    });
  });

  it("still refuses to carry an off-origin destination", () => {
    expect(
      authSearchSchema.parse({ redirect: "https://evil.example" }),
    ).toEqual({ redirect: PATHS.APP });
  });
});
