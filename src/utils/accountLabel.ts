/**
 * The one place the account label rule lives
 * (`docs/backend/business-rules.md`, accounts section).
 *
 * `label = institution · qualifier`, and the qualifier is the nickname the
 * user typed, else the tax wrapper when the registration is a real one, else
 * nothing. Most accounts are 1:1 with their institution — "Santander",
 * "Inter" — so most carry no nickname at all, and the label is the
 * institution's own name.
 *
 * The composition happens here and not on the server because the wrapper's
 * name is localized (`enums.registration.*`): a server-built string would
 * read English in a Portuguese UI.
 */
import type { TFunction } from "i18next";

import type { Registration } from "@/schemas/apiEnums";
import type { Account } from "@/services/accounts";

/**
 * Both the account rows and the sale rows' nested account satisfy this. `name`
 * is optional because the schema marks it so — it is blank far more often than
 * it is set.
 */
export type AccountLike = Pick<
  Account,
  "name" | "institution_name" | "registration"
>;

/** The registrations that mean "no wrapper" — they qualify nothing. */
const PLAIN_REGISTRATIONS: readonly Registration[] = [
  "BR_TAXABLE",
  "US_TAXABLE",
  "CA_NON_REGISTERED",
];

const SEPARATOR = " · ";

/** Case- and accent-insensitive, so "conta ITAU" still matches "Itaú". */
function foldable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

export function accountLabel(
  account: AccountLike,
  t: TFunction<"app">,
  { withRegistration = true }: { withRegistration?: boolean } = {},
): string {
  const institution = account.institution_name;
  const nickname = (account.name ?? "").trim();

  // No institution: the nickname is the whole identity, and the API requires
  // one in exactly that case.
  if (!institution) return nickname;

  // A nickname that already names the institution would otherwise read
  // "Santander · Conta Santander".
  if (nickname && foldable(nickname).includes(foldable(institution))) {
    return nickname;
  }

  const qualifier =
    nickname ||
    (withRegistration && !PLAIN_REGISTRATIONS.includes(account.registration)
      ? t(`enums.registration.${account.registration}`)
      : "");

  return qualifier ? `${institution}${SEPARATOR}${qualifier}` : institution;
}

/**
 * The label of the account a row names by id — the shape every screen that
 * renders movements, lots, or coverage rows needs, since those carry the id
 * and not the record.
 */
export function labelAccountById(
  accounts: ReadonlyArray<AccountLike & { id: string }> | undefined,
  id: string | null,
  t: TFunction<"app">,
  fallback = "—",
): string {
  const row = id ? accounts?.find((account) => account.id === id) : undefined;
  return row ? accountLabel(row, t) : fallback;
}

/**
 * Orders accounts the way the label reads — institution first, nickname
 * second — matching the server's own `?ordering=name`.
 *
 * It needs no `t`: the wrapper suffix never changes which institution a row
 * belongs to, so translating it would not move a single row. An account with
 * no institution sorts last, where its em dash is.
 */
export function compareAccounts(a: AccountLike, b: AccountLike): number {
  if (!a.institution_name) return b.institution_name ? 1 : 0;
  if (!b.institution_name) return -1;

  return (
    a.institution_name.localeCompare(b.institution_name) ||
    (a.name ?? "").localeCompare(b.name ?? "")
  );
}
