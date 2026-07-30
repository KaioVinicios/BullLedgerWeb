import { describe, expect, it } from "vitest";

import { APP_VERSION, buildStamp } from "@/config/version";

describe("the build stamp", () => {
  // Vite's `define` is a textual substitution, and Vitest has to apply it too
  // or this import throws ReferenceError before any assertion runs. That is
  // the entire point of this first test.
  it("resolves the injected global under the test runner", () => {
    expect(typeof APP_VERSION).toBe("string");
  });

  it("is a hex SHA or empty, never a placeholder", () => {
    expect(APP_VERSION).toMatch(/^[0-9a-f]*$/);
  });

  it("says so in development rather than showing a stale SHA", () => {
    // A dev build's SHA is a lie: the working tree has already moved past it.
    expect(buildStamp("a1b2c3d", true)).toEqual({ kind: "dev" });
  });

  it("shows the SHA in a production build", () => {
    expect(buildStamp("a1b2c3d", false)).toEqual({
      kind: "sha",
      version: "a1b2c3d",
    });
  });

  it("shows nothing at all when git could not be read", () => {
    // An empty stamp is worse than no stamp — it reads as a rendering bug.
    expect(buildStamp("", false)).toBeNull();
  });
});
