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

  // The ledger vocabulary. The API publishes the full table in
  // `docs/backend/api-reference.md`, and every code there is mirrored in
  // `tests/fixtures/movementErrorCodes.json`, so a rejection the server learns
  // to raise and this dictionary has not learned to translate fails a test
  // rather than reaching a Portuguese screen in English.
  //
  // Several of these interpolate figures the server sends in `params`; the
  // sentences address them by name (`{{remaining}}`), and `serverErrors.ts`
  // formats them for the reader's locale before they arrive.
  movement_type_invalid_for_archetype: "movementTypeInvalidForArchetype",
  movement_asset_required: "movementAssetRequired",
  movement_quantity_forbidden: "movementQuantityForbidden",
  movement_quantity_not_positive: "movementQuantityNotPositive",
  movement_quantity_not_negative: "movementQuantityNotNegative",
  movement_quantity_zero: "movementQuantityZero",
  movement_quantity_required: "movementQuantityRequired",
  movement_cash_not_negative: "movementCashNotNegative",
  movement_cash_not_positive: "movementCashNotPositive",
  movement_cash_not_zero: "movementCashNotZero",
  movement_unit_price_required: "movementUnitPriceRequired",
  movement_unit_price_forbidden: "movementUnitPriceForbidden",
  movement_fee_forbidden: "movementFeeForbidden",
  movement_fee_negative: "movementFeeNegative",
  movement_fee_currency_mismatch: "movementFeeCurrencyMismatch",
  movement_lot_required: "movementLotRequired",
  movement_lot_forbidden: "movementLotForbidden",
  movement_lot_not_accepted: "movementLotNotAccepted",
  movement_lot_overdrawn: "movementLotOverdrawn",
  movement_lot_exhausted: "movementLotExhausted",
  movement_lot_in_use: "movementLotInUse",
  movement_lot_account_mismatch: "movementLotAccountMismatch",
  movement_lot_asset_mismatch: "movementLotAssetMismatch",
  movement_currency_not_native: "movementCurrencyNotNative",
  movement_fx_rate_not_one: "movementFxRateNotOne",
  movement_fx_rate_missing: "movementFxRateMissing",
  movement_fx_rate_unresolvable: "movementFxRateUnresolvable",
  movement_fx_rate_invalid: "movementFxRateInvalid",
  movement_use_record_transfer: "movementUseRecordTransfer",
  movement_transfer_same_account: "movementTransferSameAccount",
  movement_transfer_source_lot_required: "movementTransferSourceLotRequired",
  movement_transfer_not_replaceable: "movementTransferNotReplaceable",
  movement_transfer_link_forbidden: "movementTransferLinkForbidden",
  movement_transfer_pair_invalid: "movementTransferPairInvalid",
  movement_already_voided: "movementAlreadyVoided",
  movement_shape_invalid: "movementShapeInvalid",

  // The asset vocabulary. Unlike the movement matrix, the archetype field
  // table is not published on the wire, so the asset form restates the rules
  // it can offer around — these are what remains when one still escapes.
  certificate_issuer_required: "assetCertificateIssuerRequired",
  bond_issuer_name_required: "assetBondIssuerNameRequired",
  certificate_coupon_frequency: "assetCertificateNoCoupon",
  coupon_rate_missing: "assetCouponRateMissing",
  coupon_frequency_missing: "assetCouponFrequencyMissing",
  archetype_field_required: "assetFieldRequired",
  archetype_field_not_applicable: "assetFieldNotApplicable",
  pricing_mode_archetype_mismatch: "assetPricingModeMismatch",
};

/**
 * Translates a server-emitted message when its code is known; returns the
 * message as-is otherwise — including when the server sent no code at all
 * (an older fixture, a body predating this field).
 *
 * `params` carries the figures the sentence names, already rendered for this
 * locale by the caller. They are handed straight to i18next, so a translation
 * addresses them as `{{remaining}}`. A translation that interpolates nothing
 * simply ignores them, which is why every code can be routed through here
 * whether or not the server sent any.
 */
export function translateServerMessage(
  message: string,
  code: string | undefined,
  params: Record<string, unknown> | undefined,
  t: (key: ErrorsKey, values?: Record<string, unknown>) => string,
): string {
  const key = code ? KNOWN_SERVER_CODES[code] : undefined;
  return key ? t(key, params) : message;
}
