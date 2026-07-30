import { describe, expect, it } from "vitest";

import { APP_SEGMENTS, PATHS } from "@/routes/path";

describe("the authenticated route surface", () => {
  it.each(Object.entries(APP_SEGMENTS))(
    "derives PATHS.%s from its segment",
    (name, segment) => {
      const key = name as keyof typeof APP_SEGMENTS;
      expect(PATHS[key]).toBe(`${PATHS.APP}/${segment}`);
    },
  );

  it("keeps every derived path under the guarded prefix", () => {
    for (const name of Object.keys(APP_SEGMENTS)) {
      const key = name as keyof typeof APP_SEGMENTS;
      expect(PATHS[key].startsWith(`${PATHS.APP}/`)).toBe(true);
    }
  });

  it("uses bare segments in APP_SEGMENTS, never whole paths", () => {
    // TanStack joins a child's path onto its parent's, so a leading slash
    // here would produce /app/app/accounts at runtime.
    for (const segment of Object.values(APP_SEGMENTS)) {
      expect(segment.startsWith("/")).toBe(false);
    }
  });

  it("keeps the derived paths as literal types, not string", () => {
    // Compile-time assertion: if the template literal widened to `string`,
    // TanStack could no longer type-check <Link to>, and this line fails tsc.
    const accounts: "/app/accounts" = PATHS.ACCOUNTS;
    expect(accounts).toBe("/app/accounts");
  });
});
