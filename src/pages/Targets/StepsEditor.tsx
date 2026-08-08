import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { IntegerField } from "@/forms/IntegerField";
import { PercentField } from "@/forms/PercentField";
import { SelectField } from "@/forms/SelectField";
import { PERIODS, type Period } from "@/schemas/apiEnums";
import { EMPTY_STEP, type StepDraft } from "@/utils/targetWire";

/**
 * The rate ladder: one row per step, each a month, a rate, and the period the
 * rate is authored in.
 *
 * **Controlled, and outside TanStack Form's array machinery on purpose.** The
 * form holds the whole ladder in one field and hands it here. That buys two
 * things: the component is testable with no form mounted, and — the reason that
 * matters — TanStack spells an array path `steps[0].rate` while the server
 * spells it `steps.0.rate`. A component that owns neither spelling cannot get
 * the bridge wrong. Every input here is named with **the server's key
 * verbatim**, so an indexed rejection lands on the right input with no mapping
 * table between them.
 *
 * **"At least one step" is the control, not a message.** Remove is disabled on
 * the last row, so the rule is discovered by the button being unavailable
 * rather than by a validation error after a submit. Rows are not sorted while
 * typing — moving a row under the cursor is hostile — and `toTargetRequest`
 * sorts by `from_month` at the wire.
 *
 * **"A step must start at month 0" is a control too.** The API requires one and
 * says so with `{"steps": ["A step with from_month 0 is required."]}` — a
 * rejection that arrives after a submit and names no row. So the first row's
 * month is not an input at all: it reads 0 and every array leaving here has 0
 * at index 0, including after the first row is removed and the next is promoted
 * into its place. The rule cannot be broken, so it is never reported.
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
   * the ladder covers its whole period no matter which row was removed —
   * removing the first rung promotes the next one to the start rather than
   * leaving a ladder that begins in month 12.
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
    // above. Queued so the DOM has re-rendered first.
    //
    // The first row has no month input, so focus falls to its rate — the first
    // control that row actually has.
    queueMicrotask(() => {
      const next = Math.min(index, steps.length - 2);
      const row = rowsRef.current;
      const landing =
        row?.querySelector<HTMLInputElement>(`#steps\\.${next}\\.from_month`) ??
        row?.querySelector<HTMLInputElement>(`#steps\\.${next}\\.rate`);

      landing?.focus();
    });
  };

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-sm font-medium">
        {t("targets.form.steps.title")}
      </legend>
      <p className="text-xs text-muted-foreground">
        {t("targets.form.steps.description")}{" "}
        {t("targets.form.steps.firstStepFixed")}
      </p>

      <div ref={rowsRef} className="space-y-4">
        {steps.map((step, index) => (
          <div
            // The index is the identity here: a step has no id until the server
            // gives it one, and reordering is not offered.
            key={index}
            className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[7rem_1fr_10rem_auto] sm:items-start"
          >
            {index === 0 ? (
              // Not a disabled input: a control a user can reach, focus, and
              // fail to change is a worse account of a fixed value than plain
              // text is. The number is still shown, in the same tabular
              // treatment as the rows below, so the column reads as a column.
              <div className="space-y-2">
                <span className="text-sm font-medium">
                  {t("targets.form.steps.fromMonth", { index: 1 })}
                </span>
                <p className="flex h-9 items-center font-mono text-sm text-muted-foreground tabular-nums">
                  {step.from_month}
                </p>
              </div>
            ) : (
              <IntegerField
                name={`steps.${index}.from_month`}
                label={t("targets.form.steps.fromMonth", { index: index + 1 })}
                value={step.from_month}
                onBlur={() => undefined}
                onChange={(value) => update(index, { from_month: value })}
                errors={fieldErrors[`steps.${index}.from_month`] ?? []}
              />
            )}

            <PercentField
              name={`steps.${index}.rate`}
              label={t("targets.form.steps.rate", { index: index + 1 })}
              value={step.rate}
              onBlur={() => undefined}
              onChange={(value) => update(index, { rate: value })}
              errors={fieldErrors[`steps.${index}.rate`] ?? []}
            />

            <SelectField
              name={`steps.${index}.rate_period`}
              label={t("targets.form.steps.period", { index: index + 1 })}
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
              aria-label={t("targets.form.steps.remove", { index: index + 1 })}
              onClick={() => remove(index)}
            >
              <IconTrash aria-hidden />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={add}>
        <IconPlus aria-hidden />
        {t("targets.form.steps.add")}
      </Button>
    </fieldset>
  );
}
