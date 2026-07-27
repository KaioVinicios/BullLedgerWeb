import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";

import { createQueryClient } from "@/lib/queryClient";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

const page = {
  count: 137,
  next: "https://host/api/movements/?page=3",
  previous: "https://host/api/movements/?page=1",
  results: [{ id: "a" }, { id: "b" }],
};

describe("usePaginatedQuery", () => {
  it("exposes rows, count, and a page count derived from PAGE_SIZE", async () => {
    const { result } = renderHook(
      () =>
        usePaginatedQuery({
          queryKey: ["movements", "list", { page: 2 }],
          queryFn: async () => page,
          page: 2,
          onPageChange: () => {},
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.count).toBe(137);
    expect(result.current.pageCount).toBe(3);
    expect(result.current.page).toBe(2);
  });

  it("reports neighbours from next and previous rather than arithmetic", async () => {
    const { result } = renderHook(
      () =>
        usePaginatedQuery({
          queryKey: ["movements", "list", { page: 1 }],
          queryFn: async () => ({ ...page, previous: null }),
          page: 1,
          onPageChange: () => {},
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(false);
  });

  it("reports one page and no neighbours for an empty result", async () => {
    const { result } = renderHook(
      () =>
        usePaginatedQuery({
          queryKey: ["movements", "list", { page: 1 }],
          queryFn: async () => ({
            count: 0,
            next: null,
            previous: null,
            results: [],
          }),
          page: 1,
          onPageChange: () => {},
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.rows).toEqual([]);
    expect(result.current.pageCount).toBe(1);
    expect(result.current.hasNext).toBe(false);
  });

  it("forwards page changes to the caller, which owns the URL", async () => {
    const seen: number[] = [];

    const { result } = renderHook(
      () =>
        usePaginatedQuery({
          queryKey: ["movements", "list", { page: 1 }],
          queryFn: async () => page,
          page: 1,
          onPageChange: (next) => seen.push(next),
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    result.current.setPage(2);

    expect(seen).toEqual([2]);
  });
});
