import {
  ALL_FIELDS,
  DETAIL,
  NON_FIELD_ERRORS,
  type ApiClientError,
} from "@/lib/apiError";
import { translateServerMessage, type ErrorsKey } from "@/lib/serverMessages";
import { formatDecimal } from "@/utils/decimal";
import { formatMoney, type Currency } from "@/utils/money";

export interface PartitionedServerErrors {
  /** Keyed exactly as the server sent them, including `steps.0.rate`. */
  fieldErrors: Record<string, string[]>;
  /** Problems that belong to no single input. */
  formErrors: string[];
}

/** Splits any `{field: [...]}` map the way the server groups it: per-field vs. form-level. */
function partitionMap<T>(map: Record<string, T[]>): {
  fieldErrors: Record<string, T[]>;
  formErrors: T[];
} {
  const fieldErrors: Record<string, T[]> = {};
  const formErrors: T[] = [];

  for (const [key, values] of Object.entries(map)) {
    if (key === NON_FIELD_ERRORS || key === DETAIL || key === ALL_FIELDS) {
      formErrors.push(...values);
    } else {
      fieldErrors[key] = values;
    }
  }

  return { fieldErrors, formErrors };
}

/**
 * Splits a server rejection into per-field messages and form-level ones.
 *
 * Keys are left verbatim — dotted and indexed paths included — so a form can
 * address a nested field by the same name it submits it under, and nothing
 * has to guess at a mapping.
 *
 * Deliberately independent of any form library: it returns plain data, and
 * the form binds it. That keeps this correct across TanStack Form versions
 * and testable without rendering anything.
 */
export function partitionServerErrors(
  error: ApiClientError,
): PartitionedServerErrors {
  return partitionMap(error.fields);
}

/**
 * Moves any field error the form has no input for into the form-level list.
 *
 * Found live in Phase 5: the API rejected a certificate with an error keyed
 * on `issuer` before the form carried that field, and the message rendered
 * nowhere — the user watched a submit do nothing. A form claims the names it
 * renders (a claim covers its dotted children, so `face_value` claims
 * `face_value.amount`); whatever is left lands in the banner, prefixed with
 * the server's own key so the sentence still names its subject.
 */
export function claimFieldErrors(
  errors: PartitionedServerErrors,
  claimed: readonly string[],
): PartitionedServerErrors {
  const isClaimed = (key: string) =>
    claimed.some((name) => key === name || key.startsWith(`${name}.`));

  const fieldErrors: Record<string, string[]> = {};
  const formErrors = [...errors.formErrors];

  for (const [key, values] of Object.entries(errors.fieldErrors)) {
    if (isClaimed(key)) {
      fieldErrors[key] = values;
    } else {
      formErrors.push(...values.map((message) => `${key}: ${message}`));
    }
  }

  return { fieldErrors, formErrors };
}

/**
 * The sentence to show when a rejection named nothing at all.
 *
 * A form that renders no message on failure is worse than one that renders the
 * wrong message: it clears the previous errors, re-enables the button, and
 * leaves the user believing nothing happened. That is what a dropped connection
 * looked like on every form — `network` and `malformed` are generated here
 * rather than by the server, so they carry no `fields` for the partition to
 * find, and the banner stayed empty. A conforming body whose `errors` map is
 * `{}` fell into the same hole while carrying a perfectly good top-level
 * sentence.
 *
 * In preference order: the client's own translated key, then whatever the
 * server said for itself, then a generic apology. Something always gets said.
 */
function fallbackMessage(
  error: ApiClientError,
  t: (key: ErrorsKey, values?: Record<string, unknown>) => string,
): string {
  if (error.messageKey) return t(error.messageKey);
  if (error.message.trim()) return error.message;
  return t("unexpected");
}

/**
 * Translates the fixed strings the API answers with — it speaks English by
 * design (NFR-L10N-001 is a frontend concern) — into the caller's active
 * language, via `@/lib/serverMessages`'s dictionary. Matches by the server's
 * stable `code`, never by the English text (authentication-design.md §9): a
 * message the dictionary's code does not know is passed through unchanged,
 * showing English rather than nothing.
 *
 * Takes the `ApiClientError` directly rather than an already-partitioned
 * result, because it needs `.fields` and `.codes` paired up field by field
 * and message by message — `codes` mirrors `fields`'s shape and order
 * exactly, so the same partitioning runs over both and zips them back
 * together. It is also what lets this guarantee a non-empty result, which a
 * partitioned map alone could not: see `fallbackMessage`.
 */
export function translateServerErrors(
  error: ApiClientError,
  t: (key: ErrorsKey, values?: Record<string, unknown>) => string,
  locale: string,
): PartitionedServerErrors {
  const messages = partitionMap(error.fields);
  const codes = partitionMap(error.codes);
  const params = partitionMap(error.params);

  const translateAll = (
    values: string[],
    forField: string[],
    withParams: Record<string, unknown>[],
  ) =>
    values.map((message, index) =>
      translateServerMessage(
        message,
        forField[index],
        displayParams(withParams[index], locale),
        t,
      ),
    );

  const fieldErrors = Object.fromEntries(
    Object.entries(messages.fieldErrors).map(([field, values]) => [
      field,
      translateAll(
        values,
        codes.fieldErrors[field] ?? [],
        params.fieldErrors[field] ?? [],
      ),
    ]),
  );
  const formErrors = translateAll(
    messages.formErrors,
    codes.formErrors,
    params.formErrors,
  );

  if (formErrors.length === 0 && Object.keys(fieldErrors).length === 0) {
    formErrors.push(fallbackMessage(error, t));
  }

  return { fieldErrors, formErrors };
}

/** The wire shape money travels in, everywhere in this API. */
function isMoney(
  value: unknown,
): value is { amount: number; currency: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { amount?: unknown }).amount === "number" &&
    typeof (value as { currency?: unknown }).currency === "string"
  );
}

/** A canonical decimal string, as the server writes quantities and rates. */
const DECIMAL = /^-?\d+(\.\d+)$/;

/**
 * Server params → what a sentence in this locale should print.
 *
 * The server sends the figure, never its spelling: `BRL 1,000.00` is correct
 * English and wrong Portuguese for the same number, and only the client knows
 * which language the reader is in. Money arrives in the wire shape every other
 * endpoint uses, so the same formatter renders it.
 *
 * A plain integer string is left alone deliberately — grouping "10" into
 * "10" changes nothing, and a quantity of 1000 units reads better ungrouped
 * next to a label than as "1.000".
 */
function displayValue(value: unknown, locale: string): unknown {
  if (isMoney(value)) {
    return formatMoney(
      { amount: value.amount, currency: value.currency as Currency },
      locale,
    );
  }
  if (typeof value === "string" && DECIMAL.test(value)) {
    const decimals = value.split(".")[1]?.length ?? 0;
    return formatDecimal(value, locale, decimals);
  }
  if (Array.isArray(value)) {
    return value.map((item) => displayValue(item, locale)).join(", ");
  }
  return value;
}

function displayParams(
  params: Record<string, unknown> | undefined,
  locale: string,
): Record<string, unknown> | undefined {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      displayValue(value, locale),
    ]),
  );
}
