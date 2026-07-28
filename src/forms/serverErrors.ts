import { DETAIL, NON_FIELD_ERRORS, type ApiClientError } from "@/lib/apiError";
import { translateServerMessage, type ErrorsKey } from "@/lib/serverMessages";

export interface PartitionedServerErrors {
  /** Keyed exactly as the server sent them, including `steps.0.rate`. */
  fieldErrors: Record<string, string[]>;
  /** Problems that belong to no single input. */
  formErrors: string[];
}

/** Splits any `{field: [...]}` map the way the server groups it: per-field vs. form-level. */
function partitionMap(map: Record<string, string[]>): PartitionedServerErrors {
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];

  for (const [key, values] of Object.entries(map)) {
    if (key === NON_FIELD_ERRORS || key === DETAIL) {
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
 * together.
 */
export function translateServerErrors(
  error: ApiClientError,
  t: (key: ErrorsKey) => string,
): PartitionedServerErrors {
  const messages = partitionMap(error.fields);
  const codes = partitionMap(error.codes);

  const translateAll = (values: string[], forField: string[]) =>
    values.map((message, index) =>
      translateServerMessage(message, forField[index], t),
    );

  return {
    fieldErrors: Object.fromEntries(
      Object.entries(messages.fieldErrors).map(([field, values]) => [
        field,
        translateAll(values, codes.fieldErrors[field] ?? []),
      ]),
    ),
    formErrors: translateAll(messages.formErrors, codes.formErrors),
  };
}
