import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";

import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";

// A separate file because the env mock differs from GoogleSignIn.test.tsx and
// `vi.mock` is per-module-graph.
vi.mock("@/config/env", () => ({
  env: {
    VITE_API_URL: TEST_API_URL,
    VITE_GOOGLE_CLIENT_ID: undefined,
  },
}));

describe("GoogleSignIn without a client id", () => {
  it("renders nothing at all rather than a button that cannot work", async () => {
    const { GoogleSignIn } = await import("@/pages/Auth/GoogleSignIn");

    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <GoogleSignIn onError={() => {}} />
      </QueryClientProvider>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
