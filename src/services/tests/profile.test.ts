import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { ApiClientError } from "@/lib/apiError";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { getProfile, updateProfile } from "@/services/profile";

const profile = {
  id: "6f1c0e6e-0000-4000-8000-000000000000",
  reporting_currency: "BRL" as const,
  inflation_reference_country: "BR" as const,
};

describe("the profile service", () => {
  it("unwraps the envelope on read", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/profile/`, () =>
        HttpResponse.json({ status: 200, data: profile }),
      ),
    );

    await expect(getProfile()).resolves.toEqual(profile);
  });

  it("sends exactly the body it is given, and nothing more", async () => {
    let sent: unknown;

    server.use(
      http.patch(`${TEST_API_URL}/api/profile/`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({
          status: 200,
          data: { ...profile, reporting_currency: "USD" },
        });
      }),
    );

    await updateProfile({ reporting_currency: "USD" });

    expect(sent).toEqual({ reporting_currency: "USD" });
  });

  // The schema types this field nullable and the endpoint documents null as
  // "hide real return", so null has to survive the round trip as a value
  // rather than being dropped as an absent key.
  it("carries a null inflation reference through", async () => {
    let sent: Record<string, unknown> | undefined;

    server.use(
      http.patch(`${TEST_API_URL}/api/profile/`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          status: 200,
          data: { ...profile, inflation_reference_country: null },
        });
      }),
    );

    const updated = await updateProfile({
      inflation_reference_country: null,
    });

    expect(sent).toHaveProperty("inflation_reference_country", null);
    expect(updated.inflation_reference_country).toBeNull();
  });

  it("normalizes a rejection into a field-keyed error", async () => {
    server.use(
      http.patch(`${TEST_API_URL}/api/profile/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: { reporting_currency: ['"XXX" is not a valid choice.'] },
            codes: { reporting_currency: ["invalid_choice"] },
          },
          { status: 400 },
        ),
      ),
    );

    await expect(
      updateProfile({ reporting_currency: "USD" }),
    ).rejects.toBeInstanceOf(ApiClientError);

    await expect(
      updateProfile({ reporting_currency: "USD" }),
    ).rejects.toMatchObject({
      fields: { reporting_currency: ['"XXX" is not a valid choice.'] },
    });
  });
});
