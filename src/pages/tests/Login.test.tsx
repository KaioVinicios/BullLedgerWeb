import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import i18n from "@/i18n/config";
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

function mount(initialPath = "/login") {
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText("Email"), user.email);
  await userEvent.type(screen.getByLabelText("Password"), "hunter2222");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginPage", () => {
  it("signs in and lands on the intended destination", async () => {
    server.use(...signedOut);

    const router = mount("/login?redirect=%2Fapp");
    await screen.findByLabelText("Email");

    server.use(
      http.post(`${TEST_API_URL}/api/auth/login/`, () =>
        HttpResponse.json({ user }),
      ),
      http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    );

    await fillAndSubmit();

    await waitFor(() => expect(router.state.location.pathname).toBe("/app"));
  });

  it("lands a field error on the input that produced it", async () => {
    server.use(...signedOut);

    mount();
    await screen.findByLabelText("Email");

    server.use(
      http.post(`${TEST_API_URL}/api/auth/login/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: { password: ["This password is too short."] },
          },
          { status: 400 },
        ),
      ),
    );

    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
        "This password is too short.",
      ),
    );
  });

  it("shows a whole-form error in the banner rather than on an input", async () => {
    server.use(...signedOut);

    mount();
    await screen.findByLabelText("Email");

    server.use(
      http.post(`${TEST_API_URL}/api/auth/login/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: {
              non_field_errors: ["Unable to log in with provided credentials."],
            },
            codes: { non_field_errors: ["invalid_credentials"] },
          },
          { status: 400 },
        ),
      ),
    );

    await fillAndSubmit();

    // The server always answers in English (NFR-L10N-001 is a frontend
    // concern); the test environment resolves to English too, so this is the
    // translated string, not a pass-through of the raw server text.
    expect(
      await screen.findByText("Incorrect email or password."),
    ).toBeInTheDocument();
  });

  // Reproduces the reported bug: with Portuguese selected, a wrong password
  // used to surface the server's raw English string regardless of language.
  it("translates a wrong-password error when Portuguese is selected", async () => {
    await i18n.changeLanguage("pt");
    server.use(...signedOut);

    mount();
    await screen.findByLabelText("E-mail");

    server.use(
      http.post(`${TEST_API_URL}/api/auth/login/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: {
              non_field_errors: ["Unable to log in with provided credentials."],
            },
            codes: { non_field_errors: ["invalid_credentials"] },
          },
          { status: 400 },
        ),
      ),
    );

    await userEvent.type(screen.getByLabelText("E-mail"), user.email);
    await userEvent.type(screen.getByLabelText("Senha"), "hunter2222");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText("E-mail ou senha incorretos."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Unable to log in with provided credentials."),
    ).not.toBeInTheDocument();
  });

  // The ghost submit: with the API unreachable the form cleared its errors,
  // re-enabled the button, and said nothing at all — the user pressed "Sign in"
  // and watched it do nothing. A transport failure carries no fields, and the
  // banner only ever read fields.
  it("says the server is unreachable instead of failing silently", async () => {
    server.use(...signedOut);

    mount();
    await screen.findByLabelText("Email");

    server.use(
      http.post(`${TEST_API_URL}/api/auth/login/`, () => HttpResponse.error()),
    );

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not reach the server. Check your connection and try again.",
    );
    // Re-enabled, so the message is an invitation to retry rather than a
    // dead end.
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });
});
