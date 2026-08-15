import type enErrors from "@/i18n/locales/en/errors.json";

/** A key in the `errors` namespace — English is the source of truth (see `i18next.d.ts`). */
export type ErrorsKey = keyof typeof enErrors;

/**
 * Stable codes the API answers with today, mapped to a key in the `errors`
 * i18n namespace.
 *
 * The API answers in English by design (NFR-L10N-001 is a frontend concern —
 * authentication-design.md §5), so translating it is entirely this
 * dictionary's job; nothing on the server ever will. Matching by `code`
 * rather than by the English message is deliberate (authentication-design.md
 * §9): a first version matched exact text and broke the moment a message
 * carried an interpolated number or got reworded by a library upgrade — the
 * code is the stable half of the contract, the English sentence never was.
 * Typing the values as `ErrorsKey` catches a typo'd translation key at
 * compile time, the same way a typo'd `t()` call does.
 */
export const KNOWN_SERVER_CODES: Readonly<Record<string, ErrorsKey>> = {
  invalid_credentials: "loginFailed",
  email_taken: "emailTaken",
  password_mismatch: "passwordMismatch",
  // Django's own password-validator codes — never relabeled server-side,
  // just read as they come (authentication-design.md §9).
  password_too_short: "passwordTooShort",
  password_too_common: "passwordTooCommon",
  reset_link_invalid: "resetLinkInvalid",
  // The account label rules (business-rules.md, accounts): both land on the
  // `name` field, which the form claims, so they render on the input itself.
  account_label_not_unique: "accountLabelNotUnique",
  name_required_without_institution: "accountNameRequired",
};

/**
 * Translates a server-emitted message when its code is known; returns the
 * message as-is otherwise — including when the server sent no code at all
 * (an older fixture, a body predating this field).
 */
export function translateServerMessage(
  message: string,
  code: string | undefined,
  t: (key: ErrorsKey) => string,
): string {
  const key = code ? KNOWN_SERVER_CODES[code] : undefined;
  return key ? t(key) : message;
}
