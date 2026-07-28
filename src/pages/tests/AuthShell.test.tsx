import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import { createAppRouter } from "@/routes/router";
import { TEST_API_URL } from "@/mocks/env";

/** The panel's own caption — the one string no other surface renders. */
const PREVIEW_CAPTION = /illustrative preview/i;

const signedOut = [
  http.get(`${TEST_API_URL}/api/auth/user/`, () =>
    HttpResponse.json(
      {
        status: 401,
        message: "Authentication credentials were not provided.",
        errors: { detail: ["Authentication credentials were not provided."] },
      },
      { status: 401 },
    ),
  ),
  http.post(`${TEST_API_URL}/api/auth/token/refresh/`, () =>
    HttpResponse.json({}, { status: 401 }),
  ),
  http.post(`${TEST_API_URL}/api/auth/registration/verify-email/`, () =>
    HttpResponse.json({ detail: "ok" }),
  ),
];

function mount(path: string) {
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("the auth frame's product preview", () => {
  it("sits beside registration, where the visitor is still deciding", async () => {
    server.use(...signedOut);

    mount("/register");
    await screen.findByLabelText("Email");

    expect(screen.getByText(PREVIEW_CAPTION)).toBeInTheDocument();
  });

  it.each([
    ["sign-in", "/login", () => screen.findByLabelText("Password")],
    [
      "email verification",
      "/verify-email/some-key",
      () => screen.findByText("Email confirmed"),
    ],
    [
      "resend verification",
      "/resend-verification",
      () => screen.findByLabelText("Email"),
    ],
    [
      "password reset",
      "/reset-password",
      () => screen.findByLabelText("Email"),
    ],
    [
      "password reset confirmation",
      "/reset-password/1/token",
      () => screen.findByLabelText("Password"),
    ],
  ])(
    "stays off %s, which is a task and not a pitch",
    async (_, path, ready) => {
      server.use(...signedOut);

      mount(path);
      await ready();

      expect(screen.queryByText(PREVIEW_CAPTION)).not.toBeInTheDocument();
    },
  );
});
