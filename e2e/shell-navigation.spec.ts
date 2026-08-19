import app from "@/i18n/locales/en/app.json" with { type: "json" };
import { PATHS } from "@/routes/path";

import { expect, test } from "./support/fixtures";
import { createSignedInAccount, freshUser } from "./support/users";

/** `v1-e2e-todo.md` Phase 3 — moving across the authenticated surface. */

// Which landmark holds each link: the portfolio areas live in "Main", the two
// product destinations in the footer's own landmark.
const MAIN = app.sidebar.label;
const SUPPORT = app.footer.label;

const DESTINATIONS = [
  {
    path: PATHS.APP,
    landmark: MAIN,
    label: app.nav.overview,
    title: app.screens.overview.title,
  },
  {
    path: PATHS.INSTITUTIONS,
    landmark: MAIN,
    label: app.nav.institutions,
    title: app.screens.institutions.title,
  },
  {
    path: PATHS.ACCOUNTS,
    landmark: MAIN,
    label: app.nav.accounts,
    title: app.screens.accounts.title,
  },
  {
    path: PATHS.ASSETS,
    landmark: MAIN,
    label: app.nav.assets,
    title: app.screens.assets.title,
  },
  {
    path: PATHS.LEDGER,
    landmark: MAIN,
    label: app.nav.ledger,
    title: app.screens.ledger.title,
  },
  {
    path: PATHS.PRICING,
    landmark: MAIN,
    label: app.nav.pricing,
    title: app.screens.pricing.title,
  },
  {
    path: PATHS.TARGETS,
    landmark: MAIN,
    label: app.nav.targets,
    title: app.screens.targets.title,
  },
  {
    path: PATHS.HELP,
    landmark: SUPPORT,
    label: app.footer.links.help,
    title: app.screens.help.title,
  },
  {
    path: PATHS.FEEDBACK,
    landmark: SUPPORT,
    label: app.footer.links.feedback,
    title: app.screens.feedback.title,
  },
  {
    path: PATHS.DONATE,
    landmark: SUPPORT,
    label: app.footer.links.donate,
    title: app.screens.donate.title,
  },
];

test("walks every area, and each one survives a reload", async ({ page }) => {
  await createSignedInAccount(page, freshUser());
  await page.goto(PATHS.APP);

  for (const { path, landmark, label, title } of DESTINATIONS) {
    const nav = page.getByRole("navigation", { name: landmark });
    await nav.getByRole("link", { name: label }).click();

    await expect(page).toHaveURL(path);
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();

    // The current item is marked, and it is the only one — the Overview link
    // is a prefix of every other route, so this is where a missing
    // `activeOptions.exact` would show up.
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Counted across the whole page rather than within one landmark: the brand
    // mark points at /app from the sidebar header, and a landmark-scoped count
    // is exactly what failed to see it the first time.
    await expect(page.locator("a[aria-current='page']")).toHaveCount(1);
  }

  // A deep route reloaded is the same screen, not a bounce to the root.
  await page.reload();
  await expect(page).toHaveURL(PATHS.FEEDBACK);
  await expect(
    page.getByRole("heading", { level: 1, name: app.screens.feedback.title }),
  ).toBeVisible();
});

test("opens a legal document in a new tab, leaving the app where it was", async ({
  page,
  context,
}) => {
  await createSignedInAccount(page, freshUser());
  await page.goto(PATHS.APP);

  const support = page.getByRole("navigation", { name: app.footer.label });
  const terms = support.getByRole("link", {
    name: `${app.footer.legal.terms} (${app.footer.newTab})`,
  });

  await expect(terms).toHaveAttribute("target", "_blank");
  await expect(terms).toHaveAttribute("rel", /noopener/);

  const opened = context.waitForEvent("page");
  await terms.click();
  const tab = await opened;

  await expect(tab).toHaveURL(new RegExp(`${PATHS.TERMS}$`));
  // The document opened beside the application, not on top of it.
  await expect(page).toHaveURL(PATHS.APP);
});

test("keeps Help reachable when collapsed, and the small print out of the way", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  await page.goto(PATHS.APP);

  const support = page.getByRole("navigation", { name: app.footer.label });
  const help = support.getByRole("link", { name: app.footer.links.help });
  const terms = support.getByRole("link", {
    name: `${app.footer.legal.terms} (${app.footer.newTab})`,
  });

  await expect(help).toBeVisible();
  await expect(terms).toBeVisible();

  // The header trigger, addressed by slot: the rail shares its accessible
  // name, so a role query would match two elements.
  await page.locator("[data-slot='sidebar-trigger']").click();

  // This is the trade-off the design accepted, pinned as an intention: the two
  // rows survive as icons, the 12px line does not survive at all.
  await expect(help).toBeVisible();
  await expect(terms).toBeHidden();

  await help.click();
  await expect(page).toHaveURL(PATHS.HELP);
  await expect(
    page.getByRole("heading", { level: 1, name: app.screens.help.title }),
  ).toBeVisible();
});

test("drops its animation when the visitor asks for less motion", async ({
  page,
}) => {
  await createSignedInAccount(page, freshUser());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PATHS.APP);

  // The sidebar's width transition is not ours — it ships inside the
  // generated component — which is exactly why the base layer has to answer
  // for it. Anything above a frame or two means the rule stopped applying.
  const seconds = await page
    .locator("[data-slot='sidebar-gap']")
    .evaluate((node) =>
      Number.parseFloat(getComputedStyle(node).transitionDuration),
    );

  expect(seconds).toBeLessThan(0.01);
});
