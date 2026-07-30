import { afterEach, describe, expect, it } from "vitest";

import { SIDEBAR_COOKIE_NAME, readSidebarOpen } from "@/lib/sidebarState";

afterEach(() => {
  document.cookie = `${SIDEBAR_COOKIE_NAME}=; max-age=0; path=/`;
  document.cookie = `not_${SIDEBAR_COOKIE_NAME}=; max-age=0; path=/`;
});

describe("readSidebarOpen", () => {
  it("falls back when no cookie has been written yet", () => {
    expect(readSidebarOpen()).toBe(true);
    expect(readSidebarOpen(false)).toBe(false);
  });

  it("reads a collapsed sidebar back", () => {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=false; path=/`;

    expect(readSidebarOpen()).toBe(false);
  });

  it("reads an expanded sidebar back", () => {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=true; path=/`;

    expect(readSidebarOpen(false)).toBe(true);
  });

  it("is not fooled by another cookie whose name ends the same way", () => {
    document.cookie = `not_${SIDEBAR_COOKIE_NAME}=false; path=/`;

    expect(readSidebarOpen()).toBe(true);
  });
});
