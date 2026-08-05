import type { Period } from "@/schemas/apiEnums";
import type {
  Target,
  TargetRequest,
  TargetStepRequest,
  TargetUpdate,
} from "@/services/targets";
import { fractionToPercent, percentToFraction } from "@/utils/decimal";
import type { ScopeSelection } from "@/utils/targetScope";

/**
 * The single place the target form's language becomes the wire's — the twin of
 * `movementWire.ts`, and for the same reason: the conversion belongs in one
 * pure function rather than scattered through a form's submit handler.
 *
 * Two conversions happen here and nowhere else in the phase:
 *
 * - **Percent → fraction.** The user authors `12.5`; the wire wants `0.125`.
 *   The shift goes through `percentToFraction`, which goes through Big.
 * - **Month → integer.** `from_month` is the one honest `Number()` on this
 *   path: it is `Format: int64`, a count of whole months, not money.
 *
 * Everything returns `null` rather than a rounded guess when a value cannot be
 * held exactly, for the reason `toMovementRequest` does — passing the refusal
 * through is the only honest option, and the form reads the null as "do not
 * submit".
 */
export interface StepDraft {
  /** A whole month count, kept a string like every numeric input in this app. */
  from_month: string;
  /** A percent as typed, in the reader's locale. */
  rate: string;
  rate_period: Period;
}

export interface TargetFormValues extends ScopeSelection {
  steps: StepDraft[];
  /** The floor is optional; the switch decides whether the pair is sent. */
  floorEnabled: boolean;
  loss_limit_pct: string;
  loss_limit_period: Period;
}

export const EMPTY_STEP: StepDraft = {
  from_month: "0",
  rate: "",
  rate_period: "ANNUAL",
};

/** A whole, non-negative month count — nothing else is a step's start. */
function toMonth(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null;

  return Number(input.trim());
}

function toSteps(
  drafts: readonly StepDraft[],
  locale: string,
): TargetStepRequest[] | null {
  const steps: TargetStepRequest[] = [];

  for (const draft of drafts) {
    const from_month = toMonth(draft.from_month);
    const rate = percentToFraction(draft.rate, locale);

    if (from_month === null || rate === null) return null;

    steps.push({ from_month, rate, rate_period: draft.rate_period });
  }

  // A ladder out of order is not a ladder. Sorting is ordering, not
  // derivation: no figure is computed, and every rate reaches the wire exactly
  // as the shift produced it.
  //
  // Nothing here checks that some step starts at month 0, though the API
  // requires it — `{"steps": ["A step with from_month 0 is required."]}`,
  // confirmed live. `StepsEditor` pins its first row to 0, so the ladder cannot
  // be authored without one; a rule made unreachable is not restated as a
  // validation message here.
  return steps.sort((a, b) => a.from_month - b.from_month);
}

/**
 * Which entries `toMutable` would refuse, keyed **exactly as the server keys
 * its own rejections** — `steps.0.rate` — so client and server errors render
 * through the same path and `StepsEditor` needs one prop rather than two.
 *
 * This exists because a `null` from `toTargetRequest` would otherwise be a
 * submit that silently does nothing, which is the defect the Phase 5 live walk
 * found on `issuer` and the reason `claimFieldErrors` was written. A refusal
 * the user cannot see is worse than a rejection.
 */
export function validateFormValues(
  values: TargetFormValues,
  locale: string,
  messages: {
    fromMonth: string;
    duplicateMonth: string;
    rate: string;
    floor: string;
  },
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const seen = new Set<number>();

  values.steps.forEach((draft, index) => {
    const month = toMonth(draft.from_month);

    if (month === null) {
      errors[`steps.${index}.from_month`] = [messages.fromMonth];
    } else if (seen.has(month)) {
      // Confirmed live: the API answers 400 with `{"steps": ["from_month
      // values must be unique."]}`. Caught here instead so the message lands
      // on the row that repeats the month rather than on the ladder as a
      // whole — the server has no way to say *which* row it meant.
      errors[`steps.${index}.from_month`] = [messages.duplicateMonth];
    } else {
      seen.add(month);
    }

    if (percentToFraction(draft.rate, locale) === null) {
      errors[`steps.${index}.rate`] = [messages.rate];
    }
  });

  if (
    values.floorEnabled &&
    percentToFraction(values.loss_limit_pct, locale) === null
  ) {
    errors.loss_limit_pct = [messages.floor];
  }

  return errors;
}

interface Mutable {
  steps: TargetStepRequest[];
  loss_limit_pct: string | null;
  loss_limit_period: Period | null;
}

/** The surface `PATCH` accepts — which is also every field `POST` shares. */
function toMutable(values: TargetFormValues, locale: string): Mutable | null {
  const steps = toSteps(values.steps, locale);
  if (steps === null || steps.length === 0) return null;

  if (!values.floorEnabled) {
    return { steps, loss_limit_pct: null, loss_limit_period: null };
  }

  // The floor travels as a **positive magnitude**: a 10% floor is `0.10`, not
  // `-0.10`. Settled live — the API answers 400 with the code
  // `target_loss_limit_positive` on a negative — so `percentToFraction`'s
  // output is sent as it comes, with no sign flip anywhere on this path.
  const floor = percentToFraction(values.loss_limit_pct, locale);
  if (floor === null) return null;

  return {
    steps,
    loss_limit_pct: floor,
    loss_limit_period: values.loss_limit_period,
  };
}

/**
 * `PATCH` sends the **whole** ladder, and the server **replaces** it rather
 * than merging — verified live by patching a two-step target down to one and
 * reading it back: one step, and a new id for it. So dropping a rung is
 * expressed by sending the ladder without it, and nothing here has to diff
 * against what the server already holds.
 */
export function toTargetUpdate(
  values: TargetFormValues,
  locale: string,
): TargetUpdate | null {
  return toMutable(values, locale);
}

/**
 * The union member the chosen scope calls for, and no other member's fields.
 *
 * Assembled here rather than held as nested per-scope state in the form, for
 * the reason `AssetForm` assembles its archetype member at the wire: switching
 * level by mistake and switching back must not discard what was typed.
 */
export function toTargetRequest(
  values: TargetFormValues,
  locale: string,
): TargetRequest | null {
  const mutable = toMutable(values, locale);
  if (mutable === null) return null;

  switch (values.scope) {
    case "PORTFOLIO_ARCHETYPE":
      return {
        scope: "PORTFOLIO_ARCHETYPE",
        archetype: values.archetype,
        ...mutable,
      };
    case "ACCOUNT_ARCHETYPE":
      return {
        scope: "ACCOUNT_ARCHETYPE",
        account: values.account,
        archetype: values.archetype,
        ...mutable,
      };
    case "HOLDING":
      return {
        scope: "HOLDING",
        account: values.account,
        asset: values.asset,
        ...mutable,
      };
  }
}

/**
 * What the form mounts with.
 *
 * On edit, every stored value is rendered **into the reader's locale** before
 * it reaches an input. Handing the wire's `0.085` to an input whose parser
 * reads pt-BR is the Phase 6 defect: the dot reads as a thousands separator and
 * a rate of eight and a half percent saves as eight hundred and fifty.
 *
 * A holding target carries no archetype, so the fallback below is a value the
 * form holds and never sends — `toTargetRequest`'s `HOLDING` case omits it.
 * That is the flat-state trade-off: one object for every scope, the union
 * picked at the wire.
 */
export function defaultFormValues(
  target: Target | undefined,
  prefill: Partial<ScopeSelection>,
  locale: string,
): TargetFormValues {
  if (!target) {
    return {
      scope: prefill.scope ?? "HOLDING",
      account: prefill.account ?? "",
      asset: prefill.asset ?? "",
      archetype: prefill.archetype ?? "CRYPTO",
      steps: [{ ...EMPTY_STEP }],
      floorEnabled: false,
      loss_limit_pct: "",
      loss_limit_period: "ANNUAL",
    };
  }

  return {
    scope: target.scope,
    account: target.scope === "PORTFOLIO_ARCHETYPE" ? "" : target.account,
    asset: target.scope === "HOLDING" ? target.asset : "",
    archetype: target.scope === "HOLDING" ? "CRYPTO" : target.archetype,
    steps: [...target.steps]
      .sort((a, b) => a.from_month - b.from_month)
      .map((step) => ({
        from_month: String(step.from_month),
        rate: fractionToPercent(step.rate, locale),
        rate_period: step.rate_period,
      })),
    floorEnabled: target.loss_limit_pct != null,
    loss_limit_pct: fractionToPercent(target.loss_limit_pct, locale),
    loss_limit_period: target.loss_limit_period ?? "ANNUAL",
  };
}
