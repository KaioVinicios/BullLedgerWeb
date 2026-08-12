import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { IntegerField } from "@/forms/IntegerField";
import { PercentField } from "@/forms/PercentField";
import { SelectField } from "@/forms/SelectField";
import { PERIODS, type Period } from "@/schemas/apiEnums";
import { describeMonths } from "@/utils/targetSentence";
import { EMPTY_STEP, type StepDraft } from "@/utils/targetWire";

/**
 * The rate ladder: one row per rung, each a month, a rate, and the period the
 * rate is authored in.
 *
 * **Each rung says what its number means, live.** A raw `3` in a "from month"
 * field could be read as "for three months" or "starting in the third"; the
 * caption under the row settles it in the same words the summary panel and the
 * list card use, because all three come out of `describeMonths`. A user never
 * has to guess which reading the app took.
 *
 * **Controlled, and outside TanStack Form's array machinery on purpose.** The
 * form holds the whole ladder in one field and hands it here. That buys two
 * things: the component is testable with no form mounted, and — the reason
 * that matters — TanStack spells an array path `steps[0].rate` while the
 * server spells it `steps.0.rate`. A component that owns neither spelling
 * cannot get the bridge wrong. Every input here is named with **the server's
 * key verbatim**, so an indexed rejection lands on the right input with no
 * mapping table between them.
 *
 * **"At least one rung" is the control, not a message.** Remove is disabled on
 * the last row. Rows are not sorted while typing — moving a row under the
 * cursor is hostile — and `toTargetRequest` sorts by `from_month` at the wire.
 *
 * **"A rung must start at month 0" is a control too.** The API requires one
 * and reports it after a submit, naming no row. So the first row's month is
 * not an input at all: it reads as "from the first purchase", and every array
 * leaving here has 0 at index 0, including after the first row is removed and
 * the next is promoted into its place.
 *
 * Per-row disambiguation is an `sr-only` legend rather than an index printed
 * into every visible label. The nested `<fieldset>` is deliberate and is not
 * the case the scope radios avoid: these are three genuinely distinct controls
 * that belong together, not one Radix group naming itself twice.
 */
export function StepsEditor({
  steps,
  onChange,
  fieldErrors,
  disabled = false,
}: {
  steps: StepDraft[];
  onChange: (steps: StepDraft[]) => void;
  /** Keyed exactly as the server sent them: `steps.0.rate`. */
  fieldErrors: Record<string, string[]>;
  disabled?: boolean;
}) {
  const { t } = useTranslation("app");
  const rowsRef = useRef<HTMLDivElement>(null);

  /**
   * The one exit. Every array leaves through here with month 0 at index 0, so
   * the ladder covers its whole period no matter which row was removed.
   */
  const emit = (next: StepDraft[]) =>
    onChange(
      next.map((step, at) => (at === 0 ? { ...step, from_month: "0" } : step)),
    );

  const update = (index: number, patch: Partial<StepDraft>) =>
    emit(
      steps.map((step, at) => (at === index ? { ...step, ...patch } : step)),
    );

  const add = () => emit([...steps, { ...EMPTY_STEP }]);

  const remove = (index: number) => {
    emit(steps.filter((_, at) => at !== index));

    // Focus must land somewhere real. The row that slides into this index is
    // the natural next target; when the removed row was last, it is the one
    // above. Queued so the DOM has re-rendered first. The first row has no
    // month input, so focus falls to its rate.
    queueMicrotask(() => {
      const next = Math.min(index, steps.length - 2);
      const row = rowsRef.current;
      const landing =
        row?.querySelector<HTMLInputElement>(`#steps\\.${next}\\.from_month`) ??
        row?.querySelector<HTMLInputElement>(`#steps\\.${next}\\.rate`);

      landing?.focus();
    });
  };

  /**
   * The caption under each row: the same words the summary panel and the list
   * card use for that rung's stretch of time, from the same function.
   *
   * Keyed on the **month**, not on the array index, and computed from months
   * alone. A rung is captionable the moment its month reads as a whole number,
   * which is before its rate does — so a row mid-typing says when it applies
   * rather than borrowing the neighbouring row's answer. A row whose month is
   * not readable yet simply has no caption.
   *
   * Months are deduplicated first. `describeMonths` bounds each rung by the
   * *next* month in the ladder, so a repeated month would bound a rung by
   * itself and caption it "for the first 0 months" — which is what a freshly
   * added rung, defaulted to month 0 like the first, would otherwise read as
   * the instant it appeared. Two rows at one month have one honest answer
   * between them, and the duplicate itself is refused at submit.
   */
  const readableMonths = [
    ...new Set(
      steps
        .map((step) => step.from_month.trim())
        .filter((month) => /^\d+$/.test(month))
        .map(Number),
    ),
  ].sort((a, b) => a - b);

  const whens = describeMonths(readableMonths, t);

  const captionFor = (step: StepDraft): string | null => {
    const month = step.from_month.trim();
    if (!/^\d+$/.test(month)) return null;

    return whens[readableMonths.indexOf(Number(month))] ?? null;
  };

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-sm font-medium">
        {t("targets.form.steps.title")}
      </legend>
      <p className="max-w-prose text-xs text-muted-foreground">
        {t("targets.form.steps.description")}
      </p>

      <div ref={rowsRef} className="space-y-3">
        {steps.map((step, index) => {
          const caption = captionFor(step);

          return (
            <fieldset
              // The index is the identity here: a step has no id until the
              // server gives it one, and reordering is not offered.
              key={index}
              // `min-w-0`: a fieldset's UA default is `min-inline-size:
              // min-content`, which preflight does not reset, so without it the
              // row would refuse to shrink and push the card sideways on a
              // narrow viewport.
              className="min-w-0 space-y-2 rounded-xl border p-4"
            >
              <legend className="sr-only">
                {t("targets.form.steps.rung", { index: index + 1 })}
              </legend>

              <div className="grid gap-3 sm:grid-cols-[8rem_1fr_10rem_auto] sm:items-start">
                {index === 0 ? (
                  // Not a disabled input: a control a user can reach, focus,
                  // and fail to change is a worse account of a fixed value
                  // than plain text is.
                  <div className="space-y-2">
                    <span className="text-sm font-medium">
                      {t("targets.form.steps.fromMonth")}
                    </span>
                    {/* `min-h-9`, not `h-9`: it lines up with the inputs beside
                        it at the English length and grows rather than clips
                        when a locale needs two lines. */}
                    <p className="flex min-h-9 items-center text-sm text-muted-foreground">
                      {t("targets.form.steps.firstMonthFixed")}
                    </p>
                  </div>
                ) : (
                  <IntegerField
                    name={`steps.${index}.from_month`}
                    label={t("targets.form.steps.fromMonth")}
                    value={step.from_month}
                    onBlur={() => undefined}
                    onChange={(value) => update(index, { from_month: value })}
                    errors={fieldErrors[`steps.${index}.from_month`] ?? []}
                  />
                )}

                <PercentField
                  name={`steps.${index}.rate`}
                  label={t("targets.form.steps.rate")}
                  value={step.rate}
                  onBlur={() => undefined}
                  onChange={(value) => update(index, { rate: value })}
                  errors={fieldErrors[`steps.${index}.rate`] ?? []}
                />

                <SelectField
                  name={`steps.${index}.rate_period`}
                  label={t("targets.form.steps.period")}
                  value={step.rate_period}
                  options={PERIODS}
                  renderOption={(period: Period) => t(`enums.period.${period}`)}
                  onChange={(period) => update(index, { rate_period: period })}
                  errors={fieldErrors[`steps.${index}.rate_period`] ?? []}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="sm:mt-8"
                  disabled={steps.length === 1}
                  aria-label={t("targets.form.steps.remove", {
                    index: index + 1,
                  })}
                  onClick={() => remove(index)}
                >
                  <IconTrash aria-hidden />
                </Button>
              </div>

              {caption && (
                <p className="text-xs text-muted-foreground">{caption}</p>
              )}
            </fieldset>
          );
        })}
      </div>

      <Button type="button" variant="outline" onClick={add}>
        <IconPlus aria-hidden />
        {t("targets.form.steps.add")}
      </Button>
    </fieldset>
  );
}
