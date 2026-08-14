import type { TFunction } from "i18next";

import type { Period } from "@/schemas/apiEnums";
import type { Target } from "@/services/targets";
import { formatPercent, percentToFraction } from "@/utils/decimal";
import type { ScopeNames } from "@/utils/targetScope";
import type { TargetFormValues } from "@/utils/targetWire";

/**
 * A target, said out loud.
 *
 * The twin of `targetScope.ts` and pure for the same reason: the list card,
 * the form's summary panel, and the holding's target block must describe one
 * target identically, and three components would drift. `t` is passed in the
 * way `translateServerErrors` takes it, which keeps this testable with no
 * provider mounted.
 *
 * **Clauses, not one string.** The panel gives the figure typographic weight
 * and the qualifier none, and a single string cannot be split that way without
 * `<Trans>` — a pattern this project uses nowhere. So each rung comes back as
 * `{ rate, when }` plus the two already joined as `text`, and the join itself
 * is a translatable key, so a locale needing qualifier-first order can have
 * it.
 *
 * **Every number here is a number the user typed.** The first rung's own month
 * is always 0 and is fixed by `StepsEditor` rather than entered, so it is
 * never printed: that rung is bounded by the *next* rung's month, which was
 * typed. There is no derived ordinal anywhere, and therefore no off-by-one to
 * argue about between a field and the prose beside it.
 *
 * **The floor is displayed signed and stored unsigned.** `loss_limit_pct` is a
 * positive magnitude on the wire — a negative is rejected with
 * `target_loss_limit_positive` — so the `−` is added here, at the last
 * possible moment, and `targetWire.ts` still never flips a sign.
 */
export interface StepClause {
  /** The figure, rendered emphasised. `"3% monthly"`. */
  rate: string;
  /** The qualifier, rendered muted. `"for the first 3 months"`. */
  when: string;
  /** The two joined, for one-line renderings and `aria-describedby`. */
  text: string;
}

export interface FloorClause {
  /** `"−3% monthly"`. */
  rate: string;
  /** `"a floor of −3% monthly"`. */
  text: string;
}

export interface TargetClauses {
  /** A whole sentence, ending in a full stop. */
  scope: string;
  /** In ladder order. Empty when nothing readable was authored yet. */
  steps: StepClause[];
  floor: FloorClause | null;
}

export interface SentenceContext {
  names: ScopeNames;
  t: TFunction<"app">;
  locale: string;
}

/** What both entry points reduce to before any prose is built. */
interface Rung {
  from_month: number;
  /** Already localised, e.g. `"3%"`. */
  rate: string;
  rate_period: Period;
}

const SUMMARY_SEPARATOR = " · ";

function rateText(rung: Rung, t: TFunction<"app">): string {
  return t("targets.sentence.rate", {
    rate: rung.rate,
    period: t(`enums.period.${rung.rate_period}`),
  });
}

/**
 * Where each month sits in the ladder, in ascending order.
 *
 * Exported because the ladder editor captions a row as soon as its **month**
 * is readable, which is before its rate is. Positioning has to be reachable
 * from months alone — a caption indexed into a rate-filtered list would
 * misalign the moment one rung had a month typed and no rate yet.
 */
export function describeMonths(
  months: readonly number[],
  t: TFunction<"app">,
): string[] {
  const sorted = [...months].sort((a, b) => a - b);

  return sorted.map((month, index) => {
    // Keyed on the month's own value, never on its position in the array.
    // `StepsEditor` pins the genuine first rung to month 0, so month 0 is what
    // "from the first purchase" means. Position would lie in the one case that
    // matters: a ladder still being typed, whose month-0 rung has no rate yet.
    // Its later rung is then the lowest entry present without being the first
    // rung, and calling it "from the first purchase" would assert a rate runs
    // from inception that nobody entered.
    const startsAtInception = month === 0;
    const isLast = index === sorted.length - 1;

    if (startsAtInception && isLast) return t("targets.sentence.when.only");
    if (startsAtInception)
      return t("targets.sentence.when.first", { count: sorted[1] });
    if (isLast) return t("targets.sentence.when.last", { from: month });

    return t("targets.sentence.when.middle", {
      from: month,
      until: sorted[index + 1],
    });
  });
}

function toClauses(rungs: readonly Rung[], t: TFunction<"app">): StepClause[] {
  const sorted = [...rungs].sort((a, b) => a.from_month - b.from_month);
  const whens = describeMonths(
    sorted.map((rung) => rung.from_month),
    t,
  );

  return sorted.map((rung, index) => {
    const rate = rateText(rung, t);
    const when = whens[index];

    return { rate, when, text: t("targets.sentence.stepJoin", { rate, when }) };
  });
}

function floorClause(
  pct: string | null | undefined,
  period: Period | null | undefined,
  { t }: SentenceContext,
): FloorClause | null {
  if (pct == null || period == null) return null;

  const values = { rate: pct, period: t(`enums.period.${period}`) };

  return {
    rate: t("targets.sentence.floorRate", values),
    text: t("targets.sentence.floorText", values),
  };
}

export function describeTarget(
  target: Target,
  ctx: SentenceContext,
): TargetClauses {
  const { t, locale, names } = ctx;

  const scope =
    target.scope === "HOLDING"
      ? t("targets.sentence.scope.HOLDING", {
          asset: names.assetName(target.asset),
          account: names.accountName(target.account),
        })
      : target.scope === "ACCOUNT_ARCHETYPE"
        ? t("targets.sentence.scope.ACCOUNT_ARCHETYPE", {
            archetype: t(`enums.archetype.${target.archetype}`),
            account: names.accountName(target.account),
          })
        : t("targets.sentence.scope.PORTFOLIO_ARCHETYPE", {
            archetype: t(`enums.archetype.${target.archetype}`),
          });

  const rungs: Rung[] = target.steps.map((step) => ({
    from_month: step.from_month,
    rate: formatPercent(step.rate, locale),
    rate_period: step.rate_period,
  }));

  return {
    scope,
    steps: toClauses(rungs, t),
    floor: floorClause(
      target.loss_limit_pct == null
        ? null
        : formatPercent(target.loss_limit_pct, locale),
      target.loss_limit_period,
      ctx,
    ),
  };
}

/**
 * The same description, from a form still being typed.
 *
 * A rung whose month or rate cannot be read is **skipped rather than
 * guessed** — a half-typed rate must not make the panel claim a figure
 * nobody entered, and a surviving rung must not be promoted into a missing
 * one's timing either. `describeMonths` keys "from the first purchase" on
 * month 0 itself, never on array position, so a survivor keeps the month it
 * was typed at even while the ladder's true first rung is still blank. Every
 * rate goes out through `percentToFraction` to a fraction and back through
 * `formatPercent`, so a draft and a saved target render the same rate
 * identically.
 *
 * **A month typed twice is described once.** `describeMonths` bounds each rung
 * by the *next* month in the ladder, so a repeated month would bound a rung by
 * itself: `[0, 0]` reads "for the first 0 months" and `[0, 12, 12]` reads
 * "from month 12 to 12". Two rungs at one month have one honest answer between
 * them, and the duplicate is refused at submit anyway. The rule lives here
 * rather than in either caller, because the panel and the ladder editor's row
 * captions are the two surfaces this module exists to keep saying the same
 * thing — `StepsEditor` deduplicates the months it captions from for the same
 * reason, and a rule enforced in one consumer and not the other is exactly the
 * drift this file is for. A saved `Target` cannot reach this: the API refuses a
 * ladder with two rungs at one month, so `describeTarget` needs no such guard.
 */
export function describeDraft(
  values: TargetFormValues,
  ctx: SentenceContext,
): TargetClauses {
  const { t, locale, names } = ctx;

  const account = values.account ? names.accountName(values.account) : null;
  const asset = values.asset ? names.assetName(values.asset) : null;
  const archetype = t(`enums.archetype.${values.archetype}`);

  let scope: string;
  if (values.scope === "PORTFOLIO_ARCHETYPE") {
    scope = t("targets.sentence.scope.PORTFOLIO_ARCHETYPE", { archetype });
  } else if (values.scope === "ACCOUNT_ARCHETYPE" && account) {
    scope = t("targets.sentence.scope.ACCOUNT_ARCHETYPE", {
      archetype,
      account,
    });
  } else if (values.scope === "HOLDING" && account && asset) {
    scope = t("targets.sentence.scope.HOLDING", { asset, account });
  } else {
    scope = t("targets.sentence.scope.incomplete");
  }

  const described = new Set<number>();
  const rungs = values.steps.flatMap<Rung>((draft) => {
    const month = /^\d+$/.test(draft.from_month.trim())
      ? Number(draft.from_month.trim())
      : null;
    const fraction = percentToFraction(draft.rate, locale);

    if (month === null || fraction === null) return [];
    // The first readable rung at a month wins, in the order they were
    // authored — the same one `StepsEditor` keeps, so the row caption and this
    // panel bound that month identically.
    if (described.has(month)) return [];
    described.add(month);

    return [
      {
        from_month: month,
        rate: formatPercent(fraction, locale),
        rate_period: draft.rate_period,
      },
    ];
  });

  const floorFraction = values.floorEnabled
    ? percentToFraction(values.loss_limit_pct, locale)
    : null;

  return {
    scope,
    steps: toClauses(rungs, t),
    floor: floorClause(
      floorFraction === null ? null : formatPercent(floorFraction, locale),
      values.loss_limit_period,
      ctx,
    ),
  };
}

/**
 * One line: the rungs and the floor, without the scope. The card's title
 * already names the scope, and repeating it there would say the same thing
 * twice on one row.
 */
export function summarizeClauses(clauses: TargetClauses): string {
  return [...clauses.steps.map((step) => step.text), clauses.floor?.text]
    .filter((part): part is string => Boolean(part))
    .join(SUMMARY_SEPARATOR);
}
