import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import { createAppRouter } from "@/routes/router";
import { TEST_API_URL } from "@/mocks/env";

function mount(path: string, { strict = false } = {}) {
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  const tree = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

describe("VerifyEmailPage", () => {
  it("confirms the key from the link and reports success", async () => {
    let body: unknown;

    server.use(
      http.post(
        `${TEST_API_URL}/api/auth/registration/verify-email/`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ detail: "ok" });
        },
      ),
    );

    mount("/verify-email/abc123");

    expect(await screen.findByText("Email confirmed")).toBeInTheDocument();
    expect(body).toEqual({ key: "abc123" });
  });

  it("reports success under StrictMode, spending the key exactly once", async () => {
    let calls = 0;

    server.use(
      http.post(`${TEST_API_URL}/api/auth/registration/verify-email/`, () => {
        calls += 1;
        // A verification key is single-use: the second attempt would 404,
        // which is what makes double-firing a real bug and not just noise.
        return calls === 1
          ? HttpResponse.json({ detail: "ok" })
          : HttpResponse.json(
              {
                status: 404,
                message: "Not found.",
                errors: { detail: ["Not found."] },
              },
              { status: 404 },
            );
      }),
    );

    mount("/verify-email/abc123", { strict: true });

    expect(await screen.findByText("Email confirmed")).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it("explains an expired link and offers a new one", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/auth/registration/verify-email/`, () =>
        HttpResponse.json(
          {
            status: 404,
            message: "Not found.",
            errors: { detail: ["Not found."] },
          },
          { status: 404 },
        ),
      ),
    );

    mount("/verify-email/expired-key");

    expect(
      await screen.findByText("This link didn’t work"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Send a new link" }),
    ).toBeInTheDocument();
  });
});
