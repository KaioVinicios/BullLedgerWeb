import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import explain from "@/i18n/locales/en/explain.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import type { Asset } from "@/services/assets";
import type { Institution } from "@/services/institutions";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const bitcoin: Asset = {
  id: "3c2d1e0f-9a8b-4c6d-8e4f-5a3b2c1d0e9f",
  name: "Bitcoin",
  archetype: "CRYPTO",
  currency: "USD",
  country: "US",
  pricing_mode: "MARKET",
  archived_at: null,
  symbol: "BTC",
  decimals: 18,
  price_currency: "USD",
  chain: null,
};

/** A certificate must name one of the user's institutions as its issuer. */
const institution: Institution = {
  id: "7f6e5d4c-3b2a-4190-8e7d-6c5b4a392817",
  name: "Banco Inter",
  kinds: ["BANK"],
  country: "BR",
  archived_at: null,
};

function page<T>(results: T[], count = results.length) {
  return { status: 200, data: { count, next: null, previous: null, results } };
}

function signedIn() {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    // The form fetches institutions for the fixed-income issuer select.
    http.get(`${TEST_API_URL}/api/institutions/`, () =>
      HttpResponse.json(page([])),
    ),
  ];
}

function mount(initialPath: string) {
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

  return { router, queryClient };
}

describe("the assets list", () => {
  it("filters by archetype through the URL and the server, never client-side", async () => {
    const seen: Array<string | null> = [];

    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/assets/`, ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.searchParams.get("archetype"));
        return HttpResponse.json(
          url.searchParams.get("archetype") === "CRYPTO"
            ? page([bitcoin])
            : page([bitcoin], 2),
        );
      }),
    );

    const { router } = mount(PATHS.ASSETS);
    await screen.findByText("Bitcoin");

    await userEvent.click(
      screen.getByRole("combobox", { name: app.assets.filter.label }),
    );
    await userEvent.click(
      await screen.findByRole("option", {
        name: app.enums.archetype.CRYPTO,
      }),
    );

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({
        archetype: "CRYPTO",
      }),
    );
    await waitFor(() => expect(seen).toEqual([null, "CRYPTO"]));
  });

  it("offers a way back when the filter matches nothing", async () => {
    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/assets/`, ({ request }) =>
        HttpResponse.json(
          new URL(request.url).searchParams.get("archetype") === "NAV_FUND"
            ? page([])
            : page([bitcoin]),
        ),
      ),
    );

    mount(`${PATHS.ASSETS}?archetype=NAV_FUND`);

    expect(await screen.findByText(app.assets.noMatches.title)).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: app.assets.noMatches.clear }),
    );

    expect(await screen.findByText("Bitcoin")).toBeVisible();
  });
});

describe("the archetype-driven asset form", () => {
  it("explains face value, which is neither what you paid nor what it is worth", async () => {
    const user = userEvent.setup();
    server.use(...signedIn());
    mount(PATHS.ASSETS_NEW);

    await user.click(
      await screen.findByRole("radio", {
        name: app.enums.archetype.FIXED_INCOME,
      }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: `What is ${explain.asset.face_value.label.toLocaleLowerCase()}?`,
      }),
    );

    expect(
      await screen.findByText(explain.asset.face_value.body),
    ).toBeInTheDocument();
  });

  it("reveals exactly the selected archetype's field set", async () => {
    server.use(...signedIn());
    mount(PATHS.ASSETS_NEW);

    // CASH_DEPOSIT is the default: its fields, and nobody else's.
    expect(
      await screen.findByLabelText(app.assets.form.compounding),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(app.assets.form.ticker),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(app.assets.form.symbol),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("radio", {
        name: app.enums.archetype.EXCHANGE_SECURITY,
      }),
    );
    expect(await screen.findByLabelText(app.assets.form.ticker)).toBeVisible();
    expect(
      screen.queryByLabelText(app.assets.form.compounding),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("radio", { name: app.enums.archetype.FIXED_INCOME }),
    );
    expect(
      await screen.findByLabelText(app.assets.form.maturityDate),
    ).toBeVisible();
    expect(
      screen.getByRole("switch", { name: app.assets.form.taxAdvantaged }),
    ).toBeVisible();
    expect(
      screen.queryByLabelText(app.assets.form.ticker),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("radio", { name: app.enums.archetype.NAV_FUND }),
    );
    expect(
      await screen.findByLabelText(app.assets.form.fundCategory),
    ).toBeVisible();

    await userEvent.click(
      screen.getByRole("radio", { name: app.enums.archetype.CRYPTO }),
    );
    expect(await screen.findByLabelText(app.assets.form.symbol)).toBeVisible();
    expect(
      screen.queryByLabelText(app.assets.form.fundCategory),
    ).not.toBeInTheDocument();
  });

  it("moves the native currency to the country's, as a default not a lock", async () => {
    server.use(...signedIn());
    mount(PATHS.ASSETS_NEW);

    const currencyTrigger = await screen.findByRole("combobox", {
      name: app.assets.form.currency,
    });
    const countryTrigger = screen.getByRole("combobox", {
      name: app.assets.form.country,
    });

    expect(currencyTrigger).toHaveTextContent("BRL");

    await userEvent.click(countryTrigger);
    await userEvent.click(
      await screen.findByRole("option", { name: "United States" }),
    );

    await waitFor(() => expect(currencyTrigger).toHaveTextContent("USD"));

    // A default, not a lock.
    await userEvent.click(currencyTrigger);
    await userEvent.click(await screen.findByRole("option", { name: /^BRL/ }));
    expect(currencyTrigger).toHaveTextContent("BRL");
    expect(countryTrigger).toHaveTextContent("United States");
  });

  it("creates a crypto asset with an integer decimals and uppercased symbol", async () => {
    let posted: Record<string, unknown> | undefined;

    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/assets/`, () =>
        HttpResponse.json(page([bitcoin])),
      ),
      http.post(`${TEST_API_URL}/api/assets/`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { status: 201, data: bitcoin },
          { status: 201 },
        );
      }),
    );

    const { router } = mount(PATHS.ASSETS_NEW);

    await userEvent.click(
      await screen.findByRole("radio", { name: app.enums.archetype.CRYPTO }),
    );
    await userEvent.type(
      screen.getByLabelText(app.assets.form.name),
      "Bitcoin",
    );
    await userEvent.type(screen.getByLabelText(app.assets.form.symbol), "btc");
    await userEvent.click(
      screen.getByRole("button", { name: app.assets.form.create }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.ASSETS),
    );
    expect(posted).toMatchObject({
      archetype: "CRYPTO",
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 18,
    });
  });

  it("converts a typed percent into a fraction string, never a float", async () => {
    let posted: Record<string, unknown> | undefined;

    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/assets/`, () =>
        HttpResponse.json(page([])),
      ),
      http.post(`${TEST_API_URL}/api/assets/`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { status: 201, data: bitcoin },
          { status: 201 },
        );
      }),
    );

    const { router } = mount(PATHS.ASSETS_NEW);

    await userEvent.click(
      await screen.findByRole("radio", {
        name: app.enums.archetype.FIXED_INCOME,
      }),
    );
    // A bond, not a certificate: the certificate path requires an issuing
    // institution, which the live E2E walk covers.
    await userEvent.click(
      screen.getByRole("combobox", { name: app.assets.form.instrumentKind }),
    );
    await userEvent.click(
      await screen.findByRole("option", {
        name: app.enums.instrumentKind.BOND,
      }),
    );
    await userEvent.type(
      screen.getByLabelText(app.assets.form.name),
      "CDB 110%",
    );
    await userEvent.type(
      screen.getByLabelText(app.assets.form.maturityDate),
      "2030-01-15",
    );
    await userEvent.type(
      screen.getByLabelText(app.assets.form.couponRate),
      "13.75",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.assets.form.create }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.ASSETS),
    );
    expect(posted).toMatchObject({
      archetype: "FIXED_INCOME",
      maturity_date: "2030-01-15",
      coupon_rate: "0.1375",
    });
  });

  /**
   * A certificate pays everything back at maturity, so it has no coupon. The
   * form used to ask anyway — offering a frequency and a rate — and the server
   * rejected the answer with `certificate_coupon_frequency`. Reported from the
   * live form: a CDB with a semiannual coupon could be filled in completely
   * and only then refused.
   */
  it("does not ask a certificate for a coupon it cannot have", async () => {
    server.use(...signedIn());
    mount(PATHS.ASSETS_NEW);

    await userEvent.click(
      await screen.findByRole("radio", {
        name: app.enums.archetype.FIXED_INCOME,
      }),
    );

    // CERTIFICATE is the default instrument kind, so this is the resting
    // state — and the absence is silent, like every other field an archetype
    // does not use.
    expect(
      screen.queryByLabelText(app.assets.form.couponRate),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: app.assets.form.couponFrequency }),
    ).not.toBeInTheDocument();
    // A bond does pay a coupon, so both come back.
    await userEvent.click(
      screen.getByRole("combobox", { name: app.assets.form.instrumentKind }),
    );
    await userEvent.click(
      await screen.findByRole("option", {
        name: app.enums.instrumentKind.BOND,
      }),
    );

    expect(screen.getByLabelText(app.assets.form.couponRate)).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: app.assets.form.couponFrequency }),
    ).toBeVisible();
  });

  it("records a certificate as zero-coupon without asking", async () => {
    let posted: Record<string, unknown> | undefined;

    server.use(
      // Ahead of signedIn(), whose empty institutions list would match first.
      http.get(`${TEST_API_URL}/api/institutions/`, () =>
        HttpResponse.json(page([institution])),
      ),
      ...signedIn(),
      http.post(`${TEST_API_URL}/api/assets/`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { status: 201, data: bitcoin },
          { status: 201 },
        );
      }),
    );

    const { router } = mount(PATHS.ASSETS_NEW);

    await userEvent.click(
      await screen.findByRole("radio", {
        name: app.enums.archetype.FIXED_INCOME,
      }),
    );
    await userEvent.type(
      screen.getByLabelText(app.assets.form.name),
      "CDB Inter",
    );
    await userEvent.click(
      screen.getByRole("combobox", { name: app.assets.form.issuer }),
    );
    await userEvent.click(
      await screen.findByRole("option", { name: institution.name }),
    );
    await userEvent.type(
      screen.getByLabelText(app.assets.form.maturityDate),
      "2030-02-09",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.assets.form.create }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.ASSETS),
    );
    // The two values the server requires, supplied without a question.
    expect(posted).toMatchObject({
      instrument_kind: "CERTIFICATE",
      coupon_rate: "0",
      coupon_frequency: "NONE",
    });
  });

  it("lands a dotted-key server error on the input that produced it", async () => {
    server.use(
      ...signedIn(),
      http.post(`${TEST_API_URL}/api/assets/`, () =>
        HttpResponse.json(
          {
            status: 400,
            message: "Invalid input.",
            errors: { "face_value.amount": ["Must be positive."] },
            codes: { "face_value.amount": ["min_value"] },
          },
          { status: 400 },
        ),
      ),
    );

    mount(PATHS.ASSETS_NEW);

    await userEvent.click(
      await screen.findByRole("radio", {
        name: app.enums.archetype.FIXED_INCOME,
      }),
    );
    await userEvent.click(
      screen.getByRole("combobox", { name: app.assets.form.instrumentKind }),
    );
    await userEvent.click(
      await screen.findByRole("option", {
        name: app.enums.instrumentKind.BOND,
      }),
    );
    await userEvent.type(screen.getByLabelText(app.assets.form.name), "CDB");
    await userEvent.type(
      screen.getByLabelText(app.assets.form.maturityDate),
      "2030-01-15",
    );
    await userEvent.type(
      screen.getByLabelText(app.assets.form.couponRate),
      "10",
    );
    await userEvent.type(
      screen.getByLabelText(app.assets.form.faceValue),
      "-1000",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.assets.form.create }),
    );

    expect(await screen.findByText("Must be positive.")).toBeVisible();
    expect(screen.getByLabelText(app.assets.form.faceValue)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("edits with the archetype locked and PATCHes without it", async () => {
    let patched: Record<string, unknown> | undefined;

    server.use(
      ...signedIn(),
      http.get(`${TEST_API_URL}/api/assets/${bitcoin.id}/`, () =>
        HttpResponse.json({ status: 200, data: bitcoin }),
      ),
      http.get(`${TEST_API_URL}/api/assets/`, () =>
        HttpResponse.json(page([bitcoin])),
      ),
      http.patch(
        `${TEST_API_URL}/api/assets/${bitcoin.id}/`,
        async ({ request }) => {
          patched = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            status: 200,
            data: { ...bitcoin, name: "BTC cold" },
          });
        },
      ),
    );

    const { router } = mount(PATHS.ASSETS_EDIT.replace("$id", bitcoin.id));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Bitcoin" }),
    ).toBeVisible();
    // The archetype is a fact here, not a choice.
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText(app.assets.form.archetypeLocked)).toBeVisible();

    const name = screen.getByLabelText(app.assets.form.name);
    expect(name).toHaveValue("Bitcoin");
    await userEvent.clear(name);
    await userEvent.type(name, "BTC cold");
    await userEvent.click(
      screen.getByRole("button", { name: app.assets.form.save }),
    );

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(PATHS.ASSETS),
    );
    expect(patched).toMatchObject({ name: "BTC cold", symbol: "BTC" });
    expect(patched).not.toHaveProperty("archetype");
  });
});
