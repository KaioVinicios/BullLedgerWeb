import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { delay, http, HttpResponse } from "msw";

import app from "@/i18n/locales/en/app.json";
import { createQueryClient } from "@/lib/queryClient";
import { TEST_API_URL } from "@/mocks/env";
import { server } from "@/mocks/server";
import { StepsEditor } from "@/pages/Targets/StepsEditor";
import { PATHS } from "@/routes/path";
import { createAppRouter } from "@/routes/router";
import type { Account } from "@/services/accounts";
import type { Asset } from "@/services/assets";
import type { Target } from "@/services/targets";
import { EMPTY_STEP, type StepDraft } from "@/utils/targetWire";

const user = { pk: 1, email: "ana@example.com", first_name: "", last_name: "" };

const account: Account = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Binance",
  institution: null,
  country: "BR",
  registration: "BR_TAXABLE",
  base_currency: "BRL",
  account_number: "",
  contribution_room: null,
  plan_type: null,
  deductible: null,
  tax_regime: null,
  taxed_on: null,
  archived_at: null,
};

const btc: Asset = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "BTC",
  archetype: "CRYPTO",
  currency: "BRL",
  country: "BR",
  pricing_mode: "MARKET",
  archived_at: null,
  symbol: "BTC",
  decimals: 8,
  price_currency: "USD",
  chain: "",
};

/**
 * An account that has been archived, and a target that was authored on it
 * before it was. The lookups this form walks pass `include_archived: true`, so
 * both of these arrive in the same array the selects are built from — which is
 * exactly why the options are filtered and the name lookup is not.
 */
const archivedAccount: Account = {
  ...account,
  id: "44444444-4444-4444-8444-444444444444",
  name: "Old Broker",
  archived_at: "2025-01-01T00:00:00Z",
};

const existing: Target = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  scope: "HOLDING",
  account: account.id,
  asset: btc.id,
  loss_limit_pct: null,
  loss_limit_period: null,
  steps: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      from_month: 0,
      rate: "0.12",
      rate_period: "ANNUAL",
    },
  ],
  archived_at: null,
};

/** The same target, at a scope whose account has since been archived. */
const onArchived: Target = {
  ...existing,
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  account: archivedAccount.id,
};

function page<T>(results: T[], count = results.length) {
  return { status: 200, data: { count, next: null, previous: null, results } };
}

function signedIn(targets: Target[] = []) {
  return [
    http.get(`${TEST_API_URL}/api/auth/user/`, () => HttpResponse.json(user)),
    http.get(`${TEST_API_URL}/api/accounts/`, () =>
      HttpResponse.json(page([account])),
    ),
    http.get(`${TEST_API_URL}/api/assets/`, () =>
      HttpResponse.json(page([btc])),
    ),
    http.get(`${TEST_API_URL}/api/targets/`, () =>
      HttpResponse.json(page(targets)),
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

function Harness({
  initial = [{ ...EMPTY_STEP }],
  fieldErrors = {},
  onChange,
}: {
  initial?: StepDraft[];
  fieldErrors?: Record<string, string[]>;
  /** Observes the array the editor emits — what would reach the wire. */
  onChange?: (steps: StepDraft[]) => void;
}) {
  const [steps, setSteps] = useState(initial);

  return (
    <StepsEditor
      steps={steps}
      onChange={(next) => {
        onChange?.(next);
        setSteps(next);
      }}
      fieldErrors={fieldErrors}
    />
  );
}

const stepLabel = (template: string, index: number) =>
  template.replace("{{index}}", String(index));

/** One rung's controls, reached by the sr-only legend that names it. */
const rung = (index: number) =>
  within(
    screen.getByRole("group", {
      name: stepLabel(app.targets.form.steps.rung, index),
    }),
  );

describe("the steps editor", () => {
  it("starts at one step and adds another on request", async () => {
    render(<Harness />);

    expect(screen.getByLabelText(app.targets.form.steps.rate)).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: app.targets.form.steps.add }),
    );

    expect(rung(2).getByLabelText(app.targets.form.steps.rate)).toBeVisible();
  });

  it("will not remove the last step, because a target needs one", async () => {
    render(<Harness />);

    expect(
      screen.getByRole("button", {
        name: stepLabel(app.targets.form.steps.remove, 1),
      }),
    ).toBeDisabled();

    await userEvent.click(
      screen.getByRole("button", { name: app.targets.form.steps.add }),
    );

    expect(
      screen.getByRole("button", {
        name: stepLabel(app.targets.form.steps.remove, 1),
      }),
    ).toBeEnabled();
  });

  it("removes the row it was asked to, not the last one", async () => {
    render(
      <Harness
        initial={[
          { from_month: "0", rate: "12", rate_period: "ANNUAL" },
          { from_month: "24", rate: "8", rate_period: "ANNUAL" },
        ]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: stepLabel(app.targets.form.steps.remove, 1),
      }),
    );

    // The survivor is the second row's data, now renumbered as row 1.
    expect(screen.getByLabelText(app.targets.form.steps.rate)).toHaveValue("8");
    // A count, not `queryByLabelText`: with the index gone from the label, a
    // query for "the second row's rate" would find the survivor and the
    // assertion would silently invert.
    expect(screen.getAllByLabelText(app.targets.form.steps.rate)).toHaveLength(
      1,
    );
  });

  it("moves focus into the surviving row after a removal, never to nothing", async () => {
    render(
      <Harness
        initial={[
          { from_month: "0", rate: "12", rate_period: "ANNUAL" },
          { from_month: "24", rate: "8", rate_period: "ANNUAL" },
        ]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: stepLabel(app.targets.form.steps.remove, 1),
      }),
    );

    // The rate, not the month: row 1's month is fixed at 0 and renders as text,
    // so the rate is the first control that row has.
    expect(screen.getByLabelText(app.targets.form.steps.rate)).toHaveFocus();
  });

  it("fixes the first row's month rather than offering it as an input", () => {
    render(
      <Harness
        initial={[
          { from_month: "0", rate: "12", rate_period: "ANNUAL" },
          { from_month: "24", rate: "8", rate_period: "ANNUAL" },
        ]}
      />,
    );

    // The API requires a step at month 0 and rejects a ladder without one after
    // the fact. Two rows, and only one month input between them: row 1 has no
    // month control at all, so it cannot be authored wrong.
    expect(
      screen.getAllByLabelText(app.targets.form.steps.fromMonth),
    ).toHaveLength(1);
    expect(screen.getByLabelText(app.targets.form.steps.fromMonth)).toHaveValue(
      "24",
    );

    // The constraint is still stated, in row 1's own words where the month
    // input would be — a hidden constraint is not the same as an enforced one.
    //
    // Scoped, and exact: `when.only` is this same string lowercased, and
    // `{ exact: false }` is case-insensitive substring matching, so an
    // unscoped fuzzy query would throw "found multiple elements" the moment a
    // fixture put both on the page.
    expect(
      rung(1).getByText(app.targets.form.steps.firstMonthFixed),
    ).toBeInTheDocument();
  });

  it("promotes the next rung to month 0 when the first is removed", async () => {
    const onChange = vi.fn();

    render(
      <Harness
        initial={[
          { from_month: "0", rate: "12", rate_period: "ANNUAL" },
          { from_month: "24", rate: "8", rate_period: "ANNUAL" },
        ]}
        onChange={onChange}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: stepLabel(app.targets.form.steps.remove, 1),
      }),
    );

    // Not "the ladder now starts in month 24" — that is a ladder the server
    // rejects and a period the user never said was uncovered.
    expect(onChange).toHaveBeenCalledWith([
      { from_month: "0", rate: "8", rate_period: "ANNUAL" },
    ]);
  });

  it("lands an indexed server error on the row it names", () => {
    render(
      <Harness
        initial={[
          { from_month: "0", rate: "12", rate_period: "ANNUAL" },
          { from_month: "24", rate: "8", rate_period: "ANNUAL" },
        ]}
        fieldErrors={{ "steps.1.rate": ["A valid number is required."] }}
      />,
    );

    const second = rung(2).getByLabelText(app.targets.form.steps.rate);

    expect(second).toHaveAttribute("aria-invalid", "true");
    expect(second).toHaveAccessibleDescription(/A valid number is required\./);

    // And not on the first, which the server said nothing about.
    expect(rung(1).getByLabelText(app.targets.form.steps.rate)).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("names each input with the server's own key, so no mapping table exists", () => {
    render(<Harness />);

    expect(screen.getByLabelText(app.targets.form.steps.rate)).toHaveAttribute(
      "id",
      "steps.0.rate",
    );
  });

  // The caption depends on the month alone, so it appears while the rate is
  // still empty — which is exactly when a reader is deciding what to type.
  it("echoes what each rung's month means, before its rate is filled in", async () => {
    render(<Harness />);

    await userEvent.click(
      screen.getByRole("button", { name: app.targets.form.steps.add }),
    );
    await userEvent.type(
      screen.getByLabelText(app.targets.form.steps.fromMonth),
      "3",
    );

    expect(screen.getByText("for the first 3 months")).toBeVisible();
    expect(screen.getByText("from month 3 onwards")).toBeVisible();
  });

  // A lone rung's caption is `when.only` — the same sentence row 1 already
  // states where its month input would be. The form opens in exactly this
  // state, so getting it wrong prints the sentence twice on first render, and
  // three times after one add.
  it("states the fixed first month once, not once as text and again as a caption", async () => {
    render(<Harness />);

    // Case-insensitive substring, deliberately: `when.only` is this string
    // lowercased, so a lenient matcher is what catches the restatement.
    const stated = () =>
      screen.getAllByText(app.targets.form.steps.firstMonthFixed, {
        exact: false,
      });

    expect(stated()).toHaveLength(1);
    expect(stated()[0]).toBeVisible();

    // A second rung starts with no month, so it earns no caption either.
    await userEvent.click(
      screen.getByRole("button", { name: app.targets.form.steps.add }),
    );

    expect(
      rung(2).getByLabelText(app.targets.form.steps.fromMonth),
    ).toHaveValue("");
    expect(stated()).toHaveLength(1);
  });

  it("names each rung for assistive tech without printing an index", async () => {
    render(<Harness />);

    await userEvent.click(
      screen.getByRole("button", { name: app.targets.form.steps.add }),
    );

    // The rung is a named group for a screen reader…
    expect(
      screen.getByRole("group", {
        name: stepLabel(app.targets.form.steps.rung, 2),
      }),
    ).toBeInTheDocument();

    // …and the visible labels carry no index, which is why both rows answer to
    // the same one. Do not assert the legend is absent from the DOM: it is
    // `sr-only`, so it is present and `queryByText` would find it.
    expect(screen.getAllByLabelText(app.targets.form.steps.rate)).toHaveLength(
      2,
    );
  });
});

describe("the target form", () => {
  it("reveals the fields the chosen level needs, and no others", async () => {
    server.use(...signedIn());
    mount(PATHS.TARGETS_NEW);

    // Holding is the default level: account and asset, no archetype.
    expect(
      await screen.findByLabelText(app.targets.form.account),
    ).toBeVisible();
    expect(screen.getByLabelText(app.targets.form.asset)).toBeVisible();
    expect(
      screen.queryByLabelText(app.targets.form.archetype),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("radio", {
        name: app.enums.targetScope.PORTFOLIO_ARCHETYPE,
      }),
    );

    expect(screen.getByLabelText(app.targets.form.archetype)).toBeVisible();
    expect(
      screen.queryByLabelText(app.targets.form.account),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(app.targets.form.asset),
    ).not.toBeInTheDocument();
  });

  it("takes the prefill a holding's link wrote", async () => {
    server.use(...signedIn());
    mount(
      `${PATHS.TARGETS_NEW}?scope=HOLDING&account=${account.id}&asset=${btc.id}`,
    );

    // The trigger renders the selected item's own text, so this can only be
    // asserted once the accounts and assets lists have landed.
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: app.targets.form.account }),
      ).toHaveTextContent("Binance"),
    );
    expect(
      screen.getByRole("combobox", { name: app.targets.form.asset }),
    ).toHaveTextContent("BTC");
  });

  it("surfaces a taken scope before the submit, and points at the target that took it", async () => {
    server.use(...signedIn([existing]));
    mount(
      `${PATHS.TARGETS_NEW}?scope=HOLDING&account=${account.id}&asset=${btc.id}`,
    );

    expect(
      await screen.findByText(
        app.targets.form.taken.title.replace("{{name}}", "BTC · Binance"),
      ),
    ).toBeVisible();

    // The rest of the form is not offered: there is nothing to author here.
    expect(
      screen.queryByRole("button", { name: app.targets.form.create }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: app.targets.form.steps.add }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: app.targets.form.taken.action }),
    ).toHaveAttribute("href", `/app/targets/${existing.id}/edit`);
  });

  it("never asks for archived rows when checking whether a scope is taken", async () => {
    let includeArchived: string | null = "unset";

    // Ahead of `signedIn()`, which registers its own `/api/targets/` handler:
    // MSW takes the first match, so an override has to come first.
    server.use(
      http.get(`${TEST_API_URL}/api/targets/`, ({ request }) => {
        includeArchived = new URL(request.url).searchParams.get(
          "include_archived",
        );

        return HttpResponse.json(page([]));
      }),
      ...signedIn(),
    );
    mount(
      `${PATHS.TARGETS_NEW}?scope=HOLDING&account=${account.id}&asset=${btc.id}`,
    );

    // The server's rule is one target per scope among NON-ARCHIVED rows, so an
    // archived target at the same scope must not block a create.
    expect(
      await screen.findByRole("button", { name: app.targets.form.create }),
    ).toBeVisible();
    expect(includeArchived).toBeNull();
  });

  it("sends the union member the scope calls for, with rates shifted", async () => {
    let body: unknown = null;

    server.use(
      ...signedIn(),
      http.post(`${TEST_API_URL}/api/targets/`, async ({ request }) => {
        body = await request.json();

        return HttpResponse.json(
          { status: 201, data: existing },
          { status: 201 },
        );
      }),
    );
    mount(
      `${PATHS.TARGETS_NEW}?scope=HOLDING&account=${account.id}&asset=${btc.id}`,
    );

    // Two places, filled from the right: 12% is four keystrokes, not two.
    await userEvent.type(
      await screen.findByLabelText(app.targets.form.steps.rate),
      "1200",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.targets.form.create }),
    );

    await screen.findByText(
      app.targets.form.created.replace("{{name}}", "BTC · Binance"),
    );

    expect(body).toEqual({
      scope: "HOLDING",
      account: account.id,
      asset: btc.id,
      steps: [{ from_month: 0, rate: "0.12", rate_period: "ANNUAL" }],
      loss_limit_pct: null,
      loss_limit_period: null,
    });
  });

  it("refuses an unconvertible rate visibly, rather than doing nothing", async () => {
    server.use(...signedIn());
    mount(
      `${PATHS.TARGETS_NEW}?scope=HOLDING&account=${account.id}&asset=${btc.id}`,
    );

    // Left blank: `toTargetRequest` would return null and the submit would be
    // a button that does nothing. Phase 5's defect, refused here.
    await userEvent.click(
      await screen.findByRole("button", { name: app.targets.form.create }),
    );

    expect(await screen.findByText(app.targets.form.errors.rate)).toBeVisible();
  });

  it("renders the scope as a badge on edit, because the update body carries none of it", async () => {
    server.use(
      ...signedIn([existing]),
      http.get(`${TEST_API_URL}/api/targets/${existing.id}/`, () =>
        HttpResponse.json({ status: 200, data: existing }),
      ),
    );
    mount(`/app/targets/${existing.id}/edit`);

    expect(await screen.findByText("BTC · Binance")).toBeVisible();
    expect(
      screen.queryByRole("radio", { name: app.enums.targetScope.HOLDING }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(app.targets.form.account),
    ).not.toBeInTheDocument();
  });

  // The badge names its scope through `names`, which falls back to the id it
  // was asked about — so painting it before the lookups land does not degrade
  // to a blank, it degrades to a pair of UUIDs in prose. The summary panel is
  // held back for exactly this reason; this is the other place that reads.
  it("holds the edit badge back rather than naming the scope with UUIDs", async () => {
    server.use(
      // Neither ever answers: the walk still in flight is the subject, and a
      // handler that resolved would race the assertions against its own fetch.
      http.get(`${TEST_API_URL}/api/accounts/`, () => delay("infinite")),
      http.get(`${TEST_API_URL}/api/assets/`, () => delay("infinite")),
      ...signedIn([existing]),
      http.get(`${TEST_API_URL}/api/targets/${existing.id}/`, () =>
        HttpResponse.json({ status: 200, data: existing }),
      ),
    );
    mount(`/app/targets/${existing.id}/edit`);

    // The form painted: the ladder only renders once the target read landed,
    // so the absences below are statements about the scope block rather than
    // about a screen that never rendered at all.
    expect(
      await screen.findByLabelText(app.targets.form.steps.rate),
    ).toBeVisible();

    // The exact string the fallback would produce, not a loose pattern.
    expect(
      screen.queryByText(`${existing.asset} · ${existing.account}`),
    ).toBeNull();
    expect(
      screen.queryByText(app.targets.form.scopeFixed),
    ).not.toBeInTheDocument();
    // And the wait is announced rather than left as a silent gap.
    expect(screen.getAllByText(app.loading).length).toBeGreaterThan(0);
  });

  it("sends only the mutable surface on save", async () => {
    let body: unknown = null;

    server.use(
      ...signedIn([existing]),
      http.get(`${TEST_API_URL}/api/targets/${existing.id}/`, () =>
        HttpResponse.json({ status: 200, data: existing }),
      ),
      http.patch(
        `${TEST_API_URL}/api/targets/${existing.id}/`,
        async ({ request }) => {
          body = await request.json();

          return HttpResponse.json({ status: 200, data: existing });
        },
      ),
    );
    mount(`/app/targets/${existing.id}/edit`);

    const rate = await screen.findByLabelText(app.targets.form.steps.rate);
    await userEvent.clear(rate);
    await userEvent.type(rate, "1500");
    await userEvent.click(
      screen.getByRole("button", { name: app.targets.form.save }),
    );

    await screen.findByText(app.targets.form.saved);

    expect(body).toEqual({
      steps: [{ from_month: 0, rate: "0.15", rate_period: "ANNUAL" }],
      loss_limit_pct: null,
      loss_limit_period: null,
    });
  });

  it("sends the floor as a pair when it is switched on", async () => {
    let body: Record<string, unknown> | null = null;

    server.use(
      ...signedIn(),
      http.post(`${TEST_API_URL}/api/targets/`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;

        return HttpResponse.json(
          { status: 201, data: existing },
          { status: 201 },
        );
      }),
    );
    mount(
      `${PATHS.TARGETS_NEW}?scope=HOLDING&account=${account.id}&asset=${btc.id}`,
    );

    // Two places, filled from the right: 12% is four keystrokes, not two.
    await userEvent.type(
      await screen.findByLabelText(app.targets.form.steps.rate),
      "1200",
    );
    await userEvent.click(
      screen.getByRole("switch", { name: app.targets.form.floor.toggle }),
    );
    await userEvent.type(
      screen.getByLabelText(app.targets.form.floor.rate),
      "1000",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.targets.form.create }),
    );

    await screen.findByText(
      app.targets.form.created.replace("{{name}}", "BTC · Binance"),
    );

    expect(body).toMatchObject({
      loss_limit_pct: "0.1",
      loss_limit_period: "ANNUAL",
    });
  });

  // The other door onto the silent refusal. While the lookups walk their pages
  // the scope block is a skeleton, but the footer is on screen — so a submit
  // taken here would raise "Choose an account." into an unmounted `ScopeField`
  // and render it nowhere. `listAllAccounts` walks pages sequentially, so this
  // window is as long as the tenant is large.
  it("will not take a submit while the scope selector is still a skeleton", async () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    // Ahead of `signedIn()`, which registers its own `/api/accounts/` handler:
    // MSW takes the first match, so an override has to come first.
    server.use(
      http.get(`${TEST_API_URL}/api/accounts/`, async () => {
        await held;

        return HttpResponse.json(page([account]));
      }),
      ...signedIn(),
    );
    mount(
      `${PATHS.TARGETS_NEW}?scope=HOLDING&account=${account.id}&asset=${btc.id}`,
    );

    const create = await screen.findByRole("button", {
      name: app.targets.form.create,
    });

    expect(create).toBeDisabled();
    // Cancel is the escape hatch and stays live: it navigates away and cannot
    // reach the refusal the submit can.
    expect(
      screen.getByRole("button", { name: app.targets.form.cancel }),
    ).toBeEnabled();

    release();

    // And it releases — the gate is on the lookup settling, not on something
    // that never resolves.
    await waitFor(() => expect(create).toBeEnabled());
    expect(screen.getByLabelText(app.targets.form.account)).toBeVisible();
  });

  // The pair that pins the two-source arrangement: archived rows are kept out
  // of the *options*, while the *name* lookup still sees them. One filter
  // without the other, or neither, breaks exactly one of these two.
  it("keeps an archived account out of the scope selector", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json(page([account, archivedAccount])),
      ),
      ...signedIn(),
    );
    mount(PATHS.TARGETS_NEW);

    await userEvent.click(
      await screen.findByRole("combobox", { name: app.targets.form.account }),
    );

    // The live one is offered — the anchor, so this cannot pass against a list
    // that simply failed to open.
    expect(screen.getByRole("option", { name: "Binance" })).toBeVisible();
    expect(
      screen.queryByRole("option", { name: "Old Broker" }),
    ).not.toBeInTheDocument();
  });

  it("still names an archived account on a target already scoped to it", async () => {
    server.use(
      http.get(`${TEST_API_URL}/api/accounts/`, () =>
        HttpResponse.json(page([account, archivedAccount])),
      ),
      ...signedIn([onArchived]),
      http.get(`${TEST_API_URL}/api/targets/${onArchived.id}/`, () =>
        HttpResponse.json({ status: 200, data: onArchived }),
      ),
    );
    mount(`/app/targets/${onArchived.id}/edit`);

    // Archiving an account does not un-name the targets already on it. If the
    // name lookup were built from the filtered list this would read
    // "BTC · 44444444-4444-4444-8444-444444444444".
    expect(await screen.findByText("BTC · Old Broker")).toBeVisible();
  });

  // The schema's `superRefine` is the only thing that says "Choose an
  // account.", and it reaches the select through the form's field meta rather
  // than through `serverErrors` — nothing on the server round-trip populates it,
  // because there is no round-trip: the submit is refused before one. Without
  // this the create button would fail silently, which is the defect this
  // file's own docblock exists to prevent.
  it("names the missing coordinate instead of refusing the submit in silence", async () => {
    server.use(...signedIn());
    mount(PATHS.TARGETS_NEW);

    // Holding is the default level and nothing prefilled it, so both
    // coordinates are empty. The rate is filled so the ladder is not what is
    // being complained about.
    await userEvent.type(
      await screen.findByLabelText(app.targets.form.steps.rate),
      "300",
    );
    await userEvent.click(
      screen.getByRole("button", { name: app.targets.form.create }),
    );

    expect(
      await screen.findByText(app.targets.form.errors.account),
    ).toBeVisible();
    expect(screen.getByText(app.targets.form.errors.asset)).toBeVisible();
  });

  it("rewrites the summary as the ladder is typed", async () => {
    server.use(...signedIn());
    mount(
      `${PATHS.TARGETS_NEW}?scope=HOLDING&account=${account.id}&asset=${btc.id}`,
    );

    const panel = await screen.findByRole("complementary", {
      name: app.targets.form.summaryTitle,
    });

    // The scope arrived from the prefill, so the panel describes it before a
    // rate is typed — the positive anchor for the "and then it changes"
    // assertions below.
    expect(
      within(panel).getByText(
        app.targets.sentence.scope.HOLDING.replace("{{asset}}", "BTC").replace(
          "{{account}}",
          "Binance",
        ),
      ),
    ).toBeVisible();
    expect(
      within(panel).getByText(app.targets.sentence.ladderEmpty),
    ).toBeVisible();

    // Two places, filled from the right — the same mask the neighbouring
    // submit test types against: 3% is four keystrokes at two mask places.
    await userEvent.type(
      screen.getByLabelText(app.targets.form.steps.rate),
      "300",
    );

    expect(within(panel).getByText("3% annual")).toBeVisible();
    expect(within(panel).getByText("from the first purchase")).toBeVisible();
    expect(
      within(panel).queryByText(app.targets.sentence.ladderEmpty),
    ).not.toBeInTheDocument();
  });

  // The field shows −3,00% and the wire must still receive 0.03. A negative is
  // rejected by the API with `target_loss_limit_positive`, so a well-meaning
  // "fix" to the displayed sign would break saving. This is the guard.
  it("sends the floor as a positive magnitude despite the minus on screen", async () => {
    let body: unknown;

    server.use(
      ...signedIn(),
      http.post(`${TEST_API_URL}/api/targets/`, async ({ request }) => {
        body = await request.json();

        return HttpResponse.json(
          { status: 201, data: existing },
          { status: 201 },
        );
      }),
    );
    mount(
      `${PATHS.TARGETS_NEW}?scope=HOLDING&account=${account.id}&asset=${btc.id}`,
    );

    const panel = await screen.findByRole("complementary", {
      name: app.targets.form.summaryTitle,
    });

    await userEvent.type(
      await screen.findByLabelText(app.targets.form.steps.rate),
      "300",
    );
    await userEvent.click(
      screen.getByRole("switch", { name: app.targets.form.floor.toggle }),
    );
    await userEvent.type(
      screen.getByLabelText(app.targets.form.floor.rate),
      "300",
    );

    // The minus really is on screen: the guard below is only meaningful if the
    // sign it protects against is actually being displayed. U+2212, the
    // character `targets.sentence.floorRate` carries.
    expect(within(panel).getByText("−3% annual")).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: app.targets.form.create }),
    );

    await screen.findByText(
      app.targets.form.created.replace("{{name}}", "BTC · Binance"),
    );
    expect(body).toMatchObject({ loss_limit_pct: "0.03" });
  });
});
