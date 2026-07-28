import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { ApiClientError } from "@/lib/apiError";
import { TEST_API_URL } from "@/mocks/env";
import {
  authKeys,
  confirmPasswordReset,
  currentUserQuery,
  getCurrentUser,
  login,
  logout,
  register,
  requestPasswordReset,
  resendVerificationEmail,
  verifyEmail,
} from "@/services/auth";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

/** Every 401 test needs this: sessionRecovery tries a refresh before failing. */
const refreshFails = http.post(`${TEST_API_URL}/api/auth/token/refresh/`, () =>
  HttpResponse.json({}, { status: 401 }),
);

describe("authKeys", () => {
  it("names one key for the single who-am-I resource", () => {
    expect(authKeys.user()).toEqual(["auth", "user"]);
  });
});

describe("currentUserQuery", () => {
  it("never retries, because a 401 is an answer rather than a failure", () => {
    expect(currentUserQuery.queryKey).toEqual(["auth", "user"]);
    expect(currentUserQuery.retry).toBe(false);
  });
});

describe("getCurrentUser", () => {
  it("returns the bare user payload, with no envelope to unwrap", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    );

    await expect(getCurrentUser()).resolves.toEqual(user);
  });

  it("rejects with an auth error when nobody is signed in", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/auth/user/`, () =>
        HttpResponse.json(
          {
            status: 401,
            message: "Authentication credentials were not provided.",
            errors: {
              detail: ["Authentication credentials were not provided."],
            },
          },
          { status: 401 },
        ),
      ),
      refreshFails,
    );

    await expect(getCurrentUser()).rejects.toMatchObject({
      kind: "auth",
      status: 401,
    });
  });
});

describe("login", () => {
  it("returns the nested user payload", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/auth/login/`, () =>
        HttpResponse.json({ user }),
      ),
    );

    const result = await login({ email: user.email, password: "hunter2222" });

    expect(result.user.email).toBe(user.email);
  });

  it("surfaces field errors with their keys intact", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/auth/login/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: { password: ["This field is required."] },
          },
          { status: 400 },
        ),
      ),
    );

    const promise = login({ email: user.email, password: "" });

    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toSatisfy(
      (error: ApiClientError) =>
        error.fieldErrors("password")[0] === "This field is required.",
    );
  });
});

describe("register", () => {
  it("sends both password fields and the reporting currency", async () => {
    let body: unknown;

    server.use(
      http.post(
        `${TEST_API_URL}/api/auth/registration/`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(
            { email: user.email, reporting_currency: "BRL" },
            { status: 201 },
          );
        },
      ),
    );

    const created = await register({
      email: user.email,
      password1: "hunter2222",
      password2: "hunter2222",
      reporting_currency: "BRL",
    });

    expect(body).toEqual({
      email: user.email,
      password1: "hunter2222",
      password2: "hunter2222",
      reporting_currency: "BRL",
    });
    expect(created.email).toBe(user.email);
  });
});

describe("logout", () => {
  it("returns the stock detail body", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/auth/logout/`, () =>
        HttpResponse.json({ detail: "Successfully logged out." }),
      ),
    );

    await expect(logout()).resolves.toEqual({
      detail: "Successfully logged out.",
    });
  });
});

describe("verifyEmail", () => {
  it("posts the emailed key", async () => {
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

    await verifyEmail({ key: "abc123" });

    expect(body).toEqual({ key: "abc123" });
  });
});

describe("resendVerificationEmail", () => {
  it("posts the address to resend to", async () => {
    let body: unknown;

    server.use(
      http.post(
        `${TEST_API_URL}/api/auth/registration/resend-email/`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ detail: "ok" }, { status: 201 });
        },
      ),
    );

    await resendVerificationEmail({ email: user.email });

    expect(body).toEqual({ email: user.email });
  });
});

describe("password reset", () => {
  it("requests a reset by email", async () => {
    let body: unknown;

    server.use(
      http.post(
        `${TEST_API_URL}/api/auth/password/reset/`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ detail: "ok" });
        },
      ),
    );

    await requestPasswordReset({ email: user.email });

    expect(body).toEqual({ email: user.email });
  });

  it("confirms with the uid, token, and both new passwords", async () => {
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

    await confirmPasswordReset({
      uid: "MQ",
      token: "set-password-token",
      new_password1: "hunter3333",
      new_password2: "hunter3333",
    });

    expect(body).toEqual({
      uid: "MQ",
      token: "set-password-token",
      new_password1: "hunter3333",
      new_password2: "hunter3333",
    });
  });
});
