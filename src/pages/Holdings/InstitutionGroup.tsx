import { useId } from "react";
import { useTranslation } from "react-i18next";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

import { MoneyValue } from "@/components/MoneyValue";
import { AccountBlock } from "@/pages/Holdings/AccountBlock";
import type { Asset } from "@/services/assets";
import type { MissingFigure } from "@/services/portfolio";
import type { CustodyInstitutionGroup } from "@/utils/holdings";

/**
 * One institution, and the accounts it holds.
 *
 * The level the API does not have and a person always uses: the rollup groups
 * by account because that is where a movement is recorded, while "what is at my
 * broker" is asked one level up.
 *
 * **A single-account institution renders as one row, not two.** The nesting
 * exists to separate an institution from the several accounts inside it; a
 * broker with one account has nothing to separate, and printing "XP
 * Investimentos" above "XP Corretora" would spend a whole level of hierarchy
 * saying the same thing twice. The account keeps its own name in the header, so
 * nothing is lost — only the redundant frame.
 */
export function InstitutionGroup({
  group,
  isOpen,
  onToggle,
  closedAccounts,
  onToggleAccount,
  assets,
  missing,
}: {
  group: CustodyInstitutionGroup;
  isOpen: boolean;
  onToggle: () => void;
  closedAccounts: readonly string[];
  onToggleAccount: (accountId: string) => void;
  assets: readonly Asset[];
  missing: readonly MissingFigure[];
}) {
  const { t } = useTranslation("app");
  const titleId = useId();
  const bodyId = useId();

  const name = group.institution?.name ?? t("holdings.noInstitution");
  const only = group.accounts.length === 1 ? group.accounts[0] : null;

  // Merged, the account's own disclosure would be a second control for the
  // same content, so the header's toggle owns it and the block renders open.
  const label =
    only === null
      ? name
      : `${name} · ${only.account?.name ?? t("holdings.unknownAccount")}`;

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-4 rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex items-center gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          {isOpen ? (
            <IconChevronDown aria-hidden className="size-4 shrink-0" />
          ) : (
            <IconChevronRight aria-hidden className="size-4 shrink-0" />
          )}
          <span id={titleId} className="font-medium">
            {label}
          </span>
          {!group.complete && (
            <span className="text-xs font-normal text-muted-foreground">
              {t("holdings.groupIncomplete")}
            </span>
          )}
        </button>

        <div className="flex items-center gap-6 text-sm">
          {only?.cash && (
            <span className="text-muted-foreground">
              {t("holdings.cash")}{" "}
              <MoneyValue value={only.cash} className="text-foreground" />
            </span>
          )}
          <MoneyValue value={group.subtotal} className="font-medium" />
        </div>
      </div>

      <div id={bodyId} hidden={!isOpen} className="space-y-6">
        {only !== null ? (
          <AccountBlock
            group={only}
            isOpen
            onToggle={onToggle}
            assets={assets}
            missing={missing}
            headerless
          />
        ) : (
          group.accounts.map((account) => (
            <AccountBlock
              key={account.accountId}
              group={account}
              isOpen={!closedAccounts.includes(account.accountId)}
              onToggle={() => onToggleAccount(account.accountId)}
              assets={assets}
              missing={missing}
            />
          ))
        )}
      </div>
    </section>
  );
}
