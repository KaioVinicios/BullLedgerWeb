import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import { createAppRouter } from "@/routes/router";
import { TEST_API_URL } from "@/mocks/env";

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

async function submitNewPassword() {
  await userEvent.type(await screen.findByLabelText("Password"), "hunter3333");
  await userEvent.type(screen.getByLabelText("Confirm password"), "hunter3333");
  await userEvent.click(
    screen.getByRole("button", { name: "Set new password" }),
  );
}

describe("ResetPasswordPage", () => {
  it("confirms the email is on its way without revealing whether the account exists", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/auth/password/reset/`, () =>
        HttpResponse.json({ detail: "ok" }),
      ),
    );

    mount("/reset-password");

    await userEvent.type(
      await screen.findByLabelText("Email"),
      "nobody@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send reset link" }),
    );

    expect(await screen.findByText("Check your inbox")).toBeInTheDocument();
  });
});

describe("ResetPasswordConfirmPage", () => {
  it("sends the uid and token from the link with the new password", async () => {
    let body: unknown;

    server.use(
      http.post(
        `${TEST_API_URL}/api/auth/password/reset/confirm/`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ detail: "ok" });
        },
      ),
    );

    mount("/reset-password/MQ/set-token");
    await submitNewPassword();

    expect(await screen.findByText("Password updated")).toBeInTheDocument();
    expect(body).toEqual({
      uid: "MQ",
      token: "set-token",
      new_password1: "hunter3333",
      new_password2: "hunter3333",
    });
  });

  it("lifts an expired-token message into the banner, since no input owns it", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/auth/password/reset/confirm/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            // The real endpoint's exact string — no trailing period.
            errors: { token: ["Invalid value"] },
            codes: { token: ["reset_link_invalid"] },
          },
          { status: 400 },
        ),
      ),
    );

    mount("/reset-password/MQ/expired-token");
    await submitNewPassword();

    // Translated into an explanation, not the validator's raw "Invalid
    // value" — see forms/serverErrors.ts.
    expect(
      await screen.findByText("This link has expired or already been used."),
    ).toBeInTheDocument();
    // It belongs to the form, not to either password input.
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("shows the expired-link message once, even when both token and uid fail", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/auth/password/reset/confirm/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: { token: ["Invalid value"], uid: ["Invalid value"] },
            codes: {
              token: ["reset_link_invalid"],
              uid: ["reset_link_invalid"],
            },
          },
          { status: 400 },
        ),
      ),
    );

    mount("/reset-password/bad-uid/expired-token");
    await submitNewPassword();

    expect(
      await screen.findAllByText("This link has expired or already been used."),
    ).toHaveLength(1);
  });
});
