import { DETAIL, NON_FIELD_ERRORS, type ApiClientError } from "@/lib/apiError";

export interface PartitionedServerErrors {
  /** Keyed exactly as the server sent them, including `steps.0.rate`. */
  fieldErrors: Record<string, string[]>;
  /** Problems that belong to no single input. */
  formErrors: string[];
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
  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];

  for (const [key, messages] of Object.entries(error.fields)) {
    if (key === NON_FIELD_ERRORS || key === DETAIL) {
      formErrors.push(...messages);
    } else {
      fieldErrors[key] = messages;
    }
  }

  return { fieldErrors, formErrors };
}
