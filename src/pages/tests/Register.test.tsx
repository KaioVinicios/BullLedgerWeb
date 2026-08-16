import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import { createAppRouter } from "@/routes/router";
import { TEST_API_URL } from "@/mocks/env";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

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
];

function mount() {
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: ["/register"] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

async function fill(password: string, confirm: string) {
  await userEvent.type(screen.getByLabelText("Email"), user.email);
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.type(screen.getByLabelText("Confirm password"), confirm);
  await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("RegisterPage", () => {
  it("refuses to submit when the two passwords differ", async () => {
    server.use(...signedOut);

    mount();
    await screen.findByLabelText("Email");

    await fill("hunter2222", "hunter3333");

    expect(
      await screen.findByText("Both passwords must match."),
    ).toBeInTheDocument();
  });

  it("registers, then reads back who is signed in and enters the app", async () => {
    server.use(...signedOut);

    const router = mount();
    await screen.findByLabelText("Email");

    server.use(
      http.post(`${TEST_API_URL}/api/auth/registration/`, () =>
        HttpResponse.json(
          { email: user.email, reporting_currency: "BRL" },
          { status: 201 },
        ),
      ),
      http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    );

    await fill("hunter2222", "hunter2222");

    await waitFor(() => expect(router.state.location.pathname).toBe("/app"));
  });

  it("lands a server field error on the email input", async () => {
    server.use(...signedOut);

    mount();
    await screen.findByLabelText("Email");

    server.use(
      http.post(`${TEST_API_URL}/api/auth/registration/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: {
              email: ["A user is already registered with this e-mail address."],
            },
            codes: { email: ["email_taken"] },
          },
          { status: 400 },
        ),
      ),
    );

    await fill("hunter2222", "hunter2222");

    // Translated, not the server's raw string — see forms/serverErrors.ts.
    await waitFor(() =>
      expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
        "An account with this email already exists.",
      ),
    );
  });

  // The ghost submit: with the API unreachable the form cleared its errors,
  // re-enabled the button, and said nothing at all — worst here of all, since
  // the user cannot tell a failed signup from a silent one and may try again
  // with a different email.
  it("says the server is unreachable instead of failing silently", async () => {
    server.use(...signedOut);

    mount();
    await screen.findByLabelText("Email");

    server.use(
      http.post(`${TEST_API_URL}/api/auth/registration/`, () =>
        HttpResponse.error(),
      ),
    );

    await fill("hunter2222", "hunter2222");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the server. Check your connection and try again.",
    );
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });
});
