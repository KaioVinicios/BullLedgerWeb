import { describe, expect, it } from "vitest";

import { APP_CHILD_SEGMENTS, APP_SEGMENTS, PATHS } from "@/routes/path";

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

  it.each(Object.entries(APP_CHILD_SEGMENTS))(
    "derives PATHS.%s from its child segment",
    (name, segment) => {
      const key = name as keyof typeof APP_CHILD_SEGMENTS;
      expect(PATHS[key]).toBe(`${PATHS.APP}/${segment}`);
    },
  );

  it("derives every child segment from its parent's segment", () => {
    // A renamed resource must carry its create/edit children with it; a child
    // segment that does not extend a parent segment has drifted.
    const parents = Object.values(APP_SEGMENTS);
    for (const segment of Object.values(APP_CHILD_SEGMENTS)) {
      expect(segment.startsWith("/")).toBe(false);
      expect(parents.some((parent) => segment.startsWith(`${parent}/`))).toBe(
        true,
      );
    }
  });

  it("keeps record params as TanStack segments, never interpolation", () => {
    // Both spellings of "this one record": the structure resources edit, and
    // the ledger corrects — a movement is immutable, so there is no edit.
    for (const name of Object.keys(APP_CHILD_SEGMENTS)) {
      if (!name.endsWith("_EDIT") && !name.endsWith("_CORRECT")) continue;
      const key = name as keyof typeof APP_CHILD_SEGMENTS;
      expect(APP_CHILD_SEGMENTS[key]).toContain("/$id/");
    }
  });

  it("derives every ledger child from the ledger segment", () => {
    expect(PATHS.LEDGER_NEW).toBe("/app/ledger/new");
    expect(PATHS.LEDGER_TRANSFER).toBe("/app/ledger/transfer");
    expect(PATHS.LEDGER_CORRECT).toBe("/app/ledger/$id/correct");
    expect(PATHS.LEDGER_LOTS).toBe("/app/ledger/lots");
  });

  it("keeps the derived paths as literal types, not string", () => {
    // Compile-time assertion: if the template literal widened to `string`,
    // TanStack could no longer type-check <Link to>, and this line fails tsc.
    const accounts: "/app/accounts" = PATHS.ACCOUNTS;
    expect(accounts).toBe("/app/accounts");
  });
});
