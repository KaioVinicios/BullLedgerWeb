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

function mount() {
  const queryClient = createQueryClient();
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: ["/resend-verification"] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("ResendVerificationPage", () => {
  it("sends the link, then refuses to send again while cooling down", async () => {
    server.use(
      http.post(`${TEST_API_URL}/api/auth/registration/resend-email/`, () =>
        HttpResponse.json({ detail: "ok" }, { status: 201 }),
      ),
    );

    mount();

    await userEvent.type(
      await screen.findByLabelText("Email"),
      "ana@example.com",
    );
    // Held by reference: AuthShell also renders theme and language buttons, and
    // this one's label becomes the countdown once the send succeeds.
    const submit = screen.getByRole("button", { name: "Send link" });
    await userEvent.click(submit);

    expect(
      await screen.findByText("Sent — check your inbox."),
    ).toBeInTheDocument();
    await waitFor(() => expect(submit).toBeDisabled());
    expect(submit).toHaveTextContent("You can send another in 60s.");
  });
});
