import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "@/mocks/server";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";

// The Google SDK never loads in jsdom, so the hook is mocked at the module
// boundary. `vi.mock` is hoisted, hence `vi.hoisted` for the shared handle.
const captured = vi.hoisted(() => ({
  options: undefined as
    | {
        onSuccess?: (r: { code: string; scope: string }) => void;
        onError?: (r: { error?: string }) => void;
        onNonOAuthError?: (e: { type: string }) => void;
      }
    | undefined,
}));

vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
  useGoogleLogin: (options: unknown) => {
    captured.options = options as typeof captured.options;
    return () =>
      captured.options?.onSuccess?.({ code: "auth-code", scope: "" });
  },
}));

vi.mock("@/config/env", () => ({
  env: {
    VITE_API_URL: TEST_API_URL,
    VITE_GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
  },
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => async () => {},
}));

async function mount(onError: (message: string) => void = () => {}) {
  const { GoogleSignIn } = await import("@/pages/Auth/GoogleSignIn");

  render(
    <QueryClientProvider client={createQueryClient()}>
      <GoogleSignIn onError={onError} />
    </QueryClientProvider>,
  );
}

describe("GoogleSignIn", () => {
  it("posts the authorization code to the API", async () => {
    let body: unknown;

    server.use(
      http.post(`${TEST_API_URL}/api/auth/google/`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
      http.get(`${TEST_API_URL}/api/auth/user/`, () =>
        HttpResponse.json({ pk: 1, email: "ana@example.com" }),
      ),
    );

    await mount();
    await userEvent.click(screen.getByRole("button"));

    await vi.waitFor(() => expect(body).toEqual({ code: "auth-code" }));
  });

  it("reports a blocked popup as an ordinary form error", async () => {
    const onError = vi.fn();

    await mount(onError);
    captured.options?.onNonOAuthError?.({ type: "popup_failed_to_open" });

    expect(onError).toHaveBeenCalledWith(
      "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.",
    );
  });

  it("stays quiet when the user simply closes the popup", async () => {
    const onError = vi.fn();

    await mount(onError);
    captured.options?.onNonOAuthError?.({ type: "popup_closed" });

    expect(onError).not.toHaveBeenCalled();
  });

  it("reports a declined consent screen", async () => {
    const onError = vi.fn();

    await mount(onError);
    captured.options?.onError?.({ error: "access_denied" });

    expect(onError).toHaveBeenCalledWith(
      "Google sign-in didn’t complete. Please try again.",
    );
  });
});
