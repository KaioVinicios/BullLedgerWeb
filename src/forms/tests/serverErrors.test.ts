import { describe, expect, it } from "vitest";

import i18n from "@/i18n/config";
import {
  apiClientErrorFromBody,
  apiClientErrorFromTransport,
} from "@/lib/apiError";
import {
  claimFieldErrors,
  partitionServerErrors,
  translateServerErrors,
} from "@/forms/serverErrors";

describe("partitionServerErrors", () => {
  it("keeps field errors addressable by their exact key", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: {
          email: ["This field is required."],
          "steps.0.rate": ["A valid number is required."],
          "steps.2.from_month": ["Must be a whole number of months."],
        },
        codes: {
          email: ["required"],
          "steps.0.rate": ["invalid"],
          "steps.2.from_month": ["invalid"],
        },
      },
      400,
    );

    const { fieldErrors } = partitionServerErrors(error);

    expect(fieldErrors["steps.0.rate"]).toEqual([
      "A valid number is required.",
    ]);
    expect(fieldErrors["steps.2.from_month"]).toEqual([
      "Must be a whole number of months.",
    ]);
    expect(fieldErrors.email).toEqual(["This field is required."]);
  });

  it("routes non_field_errors and detail to the form level", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: {
          non_field_errors: ["Only one target per scope."],
          detail: ["Not found."],
          email: ["Required."],
        },
        codes: {
          non_field_errors: ["invalid"],
          detail: ["not_found"],
          email: ["required"],
        },
      },
      400,
    );

    const { fieldErrors, formErrors } = partitionServerErrors(error);

    expect(formErrors).toEqual(["Only one target per scope.", "Not found."]);
    expect(fieldErrors).not.toHaveProperty("non_field_errors");
    expect(fieldErrors).not.toHaveProperty("detail");
  });

  it("routes __all__ to the form level too — a model constraint is not a field", () => {
    // The Phase 9 live walk: a second target on a taken scope is rejected by a
    // *model* constraint, and Django keys those `__all__` rather than
    // `non_field_errors`. Read as a field name it belongs to no input, so the
    // banner printed `__all__: …` at the user.
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: {
          __all__: ["Constraint “target_unique_holding” is violated."],
        },
        codes: { __all__: ["invalid"] },
      },
      400,
    );

    const { fieldErrors, formErrors } = partitionServerErrors(error);

    expect(formErrors).toEqual([
      "Constraint “target_unique_holding” is violated.",
    ]);
    expect(fieldErrors).not.toHaveProperty("__all__");
  });

  it("returns empty maps for an error carrying no fields", () => {
    const { fieldErrors, formErrors } = partitionServerErrors(
      apiClientErrorFromTransport(new TypeError("Failed to fetch")),
    );

    expect(fieldErrors).toEqual({});
    expect(formErrors).toEqual([]);
  });
});

/**
 * The API answers in English by design — translating those fixed strings is
 * the frontend's job (authentication-design.md §5, NFR-L10N-001) — but no
 * screen ever did it, so a Portuguese-speaking user reading "Unable to log in
 * with provided credentials." was the reported bug.
 *
 * That first fix matched the exact English text, which is fragile: a library
 * upgrade rewording the sentence, or an interpolated number, breaks the match
 * silently. The API now carries a stable `code` alongside every message
 * (authentication-design.md §9) — every fixture here mirrors what it sends,
 * confirmed live against the running API, and translation matches on that
 * code, never on the English text.
 */
describe("translateServerErrors", () => {
  const tPt = i18n.getFixedT("pt", "errors");
  const tEn = i18n.getFixedT("en", "errors");

  it("translates a known form-level message into the active language", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: {
          non_field_errors: ["Unable to log in with provided credentials."],
        },
        codes: { non_field_errors: ["invalid_credentials"] },
      },
      400,
    );

    const { formErrors } = translateServerErrors(error, tPt, "pt-BR");

    expect(formErrors).toEqual(["E-mail ou senha incorretos."]);
  });

  it("translates a known field-level message, keeping it on its field", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: {
          email: ["A user is already registered with this e-mail address."],
        },
        codes: { email: ["email_taken"] },
      },
      400,
    );

    const { fieldErrors } = translateServerErrors(error, tPt, "pt-BR");

    expect(fieldErrors.email).toEqual(["Já existe uma conta com este e-mail."]);
  });

  it("translates every known message in the current password-signup set", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: {
          non_field_errors: ["The two password fields didn't match."],
          password1: [
            "This password is too short. It must contain at least 8 characters.",
            "This password is too common.",
          ],
        },
        codes: {
          non_field_errors: ["password_mismatch"],
          // Django's own stable codes, never relabeled server-side.
          password1: ["password_too_short", "password_too_common"],
        },
      },
      400,
    );

    const { fieldErrors, formErrors } = translateServerErrors(
      error,
      tPt,
      "pt-BR",
    );

    expect(formErrors).toEqual(["As duas senhas precisam ser iguais."]);
    expect(fieldErrors.password1).toEqual([
      "A senha precisa ter pelo menos 8 caracteres.",
      "Esta senha é muito comum. Escolha uma mais forte.",
    ]);
  });

  it("translates the reset-link token/uid rejection into an explanation", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: { token: ["Invalid value"] },
        codes: { token: ["reset_link_invalid"] },
      },
      400,
    );

    const { fieldErrors } = translateServerErrors(error, tPt, "pt-BR");

    expect(fieldErrors.token).toEqual(["Este link expirou ou já foi usado."]);
  });

  it("resolves to English when that is the active language", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: {
          non_field_errors: ["Unable to log in with provided credentials."],
        },
        codes: { non_field_errors: ["invalid_credentials"] },
      },
      400,
    );

    const { formErrors } = translateServerErrors(error, tEn, "pt-BR");

    expect(formErrors).toEqual(["Incorrect email or password."]);
  });

  it("leaves an unmapped code's message unchanged rather than dropping it", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: { name: ["This field may not be blank."] },
        codes: { name: ["blank"] },
      },
      400,
    );

    const { fieldErrors } = translateServerErrors(error, tPt, "pt-BR");

    expect(fieldErrors.name).toEqual(["This field may not be blank."]);
  });

  it("falls back to the message when the server sent no codes at all", () => {
    // An older fixture or a body from before `codes` existed — `translateServerMessage`
    // must not throw just because the field it would look up is absent.
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: {
          non_field_errors: ["Unable to log in with provided credentials."],
        },
      },
      400,
    );

    const { formErrors } = translateServerErrors(error, tPt, "pt-BR");

    expect(formErrors).toEqual(["Unable to log in with provided credentials."]);
  });

  /**
   * A rejection that names no field used to render nothing at all: the form
   * cleared its previous errors, the button re-enabled, and the user watched a
   * submit do nothing — the ghost submit. `translateServerErrors` reads only
   * `fields`, and the two client-generated kinds (`network`, `malformed`) carry
   * none, so the banner stayed empty on exactly the failures that most need a
   * sentence.
   */
  it("surfaces the network sentence when the request never reached the server", () => {
    const error = apiClientErrorFromTransport(new TypeError("Failed to fetch"));

    const { fieldErrors, formErrors } = translateServerErrors(
      error,
      tPt,
      "pt-BR",
    );

    expect(formErrors).toEqual([
      "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    ]);
    expect(fieldErrors).toEqual({});
  });

  it("surfaces a generic sentence when the body was unreadable", () => {
    // The live API answers `POST /api/auth/login/` with a Django debug page —
    // normalized to `malformed`, which carries no fields either.
    const error = apiClientErrorFromBody(
      "<!DOCTYPE html><h1>Server Error",
      500,
    );

    const { formErrors } = translateServerErrors(error, tPt, "pt-BR");

    expect(formErrors).toEqual(["Algo deu errado. Tente novamente."]);
  });

  it("falls back to the server's own sentence when it named no field", () => {
    const error = apiClientErrorFromBody(
      { status: 400, message: "Invalid input.", errors: {} },
      400,
    );

    const { formErrors } = translateServerErrors(error, tPt, "pt-BR");

    expect(formErrors).toEqual(["Invalid input."]);
  });

  it("adds no fallback when the server already said something", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: { email: ["This field is required."] },
        codes: { email: ["required"] },
      },
      400,
    );

    const { formErrors } = translateServerErrors(error, tPt, "pt-BR");

    expect(formErrors).toEqual([]);
  });

  it("pairs each field's messages with its codes positionally", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: { password1: ["This field may not be blank.", "Too common."] },
        codes: { password1: ["blank", "password_too_common"] },
      },
      400,
    );

    const { fieldErrors } = translateServerErrors(error, tPt, "pt-BR");

    expect(fieldErrors.password1).toEqual([
      "This field may not be blank.",
      "Esta senha é muito comum. Escolha uma mais forte.",
    ]);
  });
});

describe("claimFieldErrors", () => {
  it("keeps claimed keys — dotted children included — and banners the rest", () => {
    const result = claimFieldErrors(
      {
        fieldErrors: {
          name: ["Too long."],
          "face_value.amount": ["Must be positive."],
          issuer: ["A certificate must be issued by an institution."],
        },
        formErrors: ["Some general problem."],
      },
      ["name", "face_value"],
    );

    expect(result.fieldErrors).toEqual({
      name: ["Too long."],
      "face_value.amount": ["Must be positive."],
    });
    // Prefixed with the server's own key, so the sentence names its subject
    // — the live-walk case where a rejection rendered nowhere.
    expect(result.formErrors).toEqual([
      "Some general problem.",
      "issuer: A certificate must be issued by an institution.",
    ]);
  });

  it("does not let a claim swallow a merely similar key", () => {
    const result = claimFieldErrors(
      { fieldErrors: { issuer_name: ["Too long."] }, formErrors: [] },
      ["issuer"],
    );

    expect(result.fieldErrors).toEqual({});
    expect(result.formErrors).toEqual(["issuer_name: Too long."]);
  });
});

describe("translateServerErrors params", () => {
  const tPt = i18n.getFixedT("pt", "errors");

  const overdrawn = (params: Record<string, unknown>) =>
    apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: { lot: ["English the reader never sees."] },
        codes: { lot: ["movement_lot_overdrawn"] },
        params: { lot: [params] },
      },
      400,
    );

  const exhausted = (params?: Record<string, unknown>) =>
    apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: { lot: ["English the reader never sees."] },
        codes: { lot: ["movement_lot_exhausted"] },
        ...(params ? { params: { lot: [params] } } : {}),
      },
      400,
    );

  it("spells money the way the reader's language spells it", () => {
    // The same figure, two languages: the server sends {amount, currency} and
    // never the spelling, because the two locales disagree about both the
    // separators and the space after the symbol.
    const error = exhausted({ label: { amount: 100000, currency: "BRL" } });

    const pt = translateServerErrors(error, tPt, "pt-BR");
    const en = translateServerErrors(error, tPt, "en-US");

    // Intl separates the symbol from the digits with U+00A0, not a space, so
    // the assertion normalizes it away. Written as an escape: a literal
    // U+00A0 is invisible in a diff and ESLint rejects it outright.
    const spaces = (value: string | undefined) =>
      value?.replace(/\u00a0/g, " ");

    expect(spaces(pt.fieldErrors.lot?.[0])).toContain("R$ 1.000,00");
    expect(spaces(en.fieldErrors.lot?.[0])).toContain("R$1,000.00");
  });

  it("interpolates the server's figures into the translated sentence", () => {
    const result = translateServerErrors(
      overdrawn({
        label: "Aporte 1",
        remaining: "10.5",
        needed: "25.25",
        date: "2026-07-10",
      }),
      tPt,
      "pt-BR",
    );

    // Decimals follow the locale too: 10.5 reads as 10,5 to this reader.
    expect(result.fieldErrors.lot?.[0]).toBe(
      "Aporte 1 tem 10,5 em 2026-07-10, e este lançamento precisa de 25,25.",
    );
  });

  it("still renders when the server sent no params for a known code", () => {
    const result = translateServerErrors(exhausted(), tPt, "pt-BR");

    expect(result.fieldErrors.lot?.[0]).toContain(
      "já foi totalmente resgatado",
    );
  });
});
