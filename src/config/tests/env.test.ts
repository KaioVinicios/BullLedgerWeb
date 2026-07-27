import { describe, expect, it } from "vitest";

import { parseEnv } from "@/config/env";

const valid = {
  VITE_API_URL: "https://bull-ledger.voynan.com",
  VITE_GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com",
};

describe("parseEnv", () => {
  it("returns the parsed environment when every variable is valid", () => {
    expect(parseEnv(valid)).toEqual(valid);
  });

  it("treats VITE_GOOGLE_CLIENT_ID as optional", () => {
    const { VITE_API_URL } = valid;

    expect(parseEnv({ VITE_API_URL })).toEqual({ VITE_API_URL });
  });

  it("throws naming the variable when VITE_API_URL is missing", () => {
    expect(() => parseEnv({})).toThrowError(/VITE_API_URL/);
  });

  it("throws when VITE_API_URL is not a URL", () => {
    expect(() =>
      parseEnv({ ...valid, VITE_API_URL: "not-a-url" }),
    ).toThrowError(/VITE_API_URL/);
  });

  it("rejects an empty VITE_GOOGLE_CLIENT_ID rather than treating it as absent", () => {
    expect(() =>
      parseEnv({ ...valid, VITE_GOOGLE_CLIENT_ID: "" }),
    ).toThrowError(/VITE_GOOGLE_CLIENT_ID/);
  });
});
