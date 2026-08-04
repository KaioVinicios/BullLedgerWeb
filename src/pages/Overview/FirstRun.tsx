import { Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconCheck, IconPointFilled } from "@tabler/icons-react";

import { ListSkeleton } from "@/components/ListSkeleton";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/routes/path";
import { accountKeys, listAccounts } from "@/services/accounts";
import { assetKeys, listAssets } from "@/services/assets";
import { institutionKeys, listInstitutions } from "@/services/institutions";
import { listMovements, movementKeys } from "@/services/movements";

/** One page is all it takes to answer "is there any at all". */
const FIRST_PAGE = { page: 1 } as const;

/**
 * The empty portfolio, as a checklist rather than a list.
 *
 * "Guides a new user into creating an institution, an account, an asset, and a
 * first movement" means knowing where they already are. Four static links would
 * offer step four to someone who has not done step one — a route to a form that
 * cannot be completed, since a movement needs an account and usually an asset.
 *
 * So it reads the four counts and puts the single call to action on the first
 * step still undone. The reads are cheap, happen only on an empty portfolio,
 * and land in the same caches the destination screens use.
 *
 * Done is marked by an icon *and* a word, never by colour alone.
 */
export function FirstRun() {
  const { t } = useTranslation("app");

  const [institutions, accounts, assets, movements] = useQueries({
    queries: [
      {
        queryKey: institutionKeys.list(FIRST_PAGE),
        queryFn: () => listInstitutions(FIRST_PAGE),
      },
      {
        queryKey: accountKeys.list(FIRST_PAGE),
        queryFn: () => listAccounts(FIRST_PAGE),
      },
      {
        queryKey: assetKeys.list(FIRST_PAGE),
        queryFn: () => listAssets(FIRST_PAGE),
      },
      {
        queryKey: movementKeys.list(FIRST_PAGE),
        queryFn: () => listMovements(FIRST_PAGE),
      },
    ],
  });

  // A checklist that visibly re-orders once the counts land is worse than one
  // that waits for them.
  if (
    institutions.isPending ||
    accounts.isPending ||
    assets.isPending ||
    movements.isPending
  ) {
    return <ListSkeleton />;
  }

  const steps = [
    {
      key: "institution",
      path: PATHS.INSTITUTIONS_NEW,
      done: (institutions.data?.count ?? 0) > 0,
    },
    {
      key: "account",
      path: PATHS.ACCOUNTS_NEW,
      done: (accounts.data?.count ?? 0) > 0,
    },
    {
      key: "asset",
      path: PATHS.ASSETS_NEW,
      done: (assets.data?.count ?? 0) > 0,
    },
    {
      key: "movement",
      path: PATHS.LEDGER_NEW,
      done: (movements.data?.count ?? 0) > 0,
    },
  ] as const;

  const next = steps.find((step) => !step.done);

  return (
    <section
      aria-labelledby="first-run-title"
      className="space-y-6 rounded-xl border border-dashed p-6"
    >
      <div className="space-y-1">
        <h2
          id="first-run-title"
          className="font-heading text-base font-semibold tracking-tight"
        >
          {t("overview.firstRun.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("overview.firstRun.description")}
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step) => (
          <li key={step.key} className="flex flex-wrap items-center gap-3">
            {step.done ? (
              <IconCheck aria-hidden className="size-4 shrink-0 text-gain" />
            ) : (
              <IconPointFilled
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
            )}

            <span className={step.done ? "text-muted-foreground" : undefined}>
              {t(`overview.firstRun.${step.key}.label`)}
            </span>

            {step.done && (
              <span className="text-xs text-muted-foreground">
                {t(`overview.firstRun.${step.key}.done`)}
              </span>
            )}

            {/* Exactly one action, on the first step still open. Offering step
                four before step one is offering a form that cannot be
                submitted. */}
            {step.key === next?.key && (
              <Button asChild size="sm">
                <Link to={step.path}>
                  {t(`overview.firstRun.${step.key}.action`)}
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
