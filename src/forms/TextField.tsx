import type { ComponentProps, ReactNode } from "react";

import { InfoHint } from "@/components/InfoHint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/forms/FieldError";
import type { ExplainMetric } from "@/i18n/explain";

type TextFieldProps = Omit<ComponentProps<typeof Input>, "id"> & {
  name: string;
  label: string;
  errors: unknown[];
  hint?: ReactNode;
  /**
   * The explainer for a field whose *name* is the unfamiliar part — face
   * value, ISIN, deposit insurance. `hint` says how to fill the field in;
   * this says what the field is. A field whose hint already answers that
   * takes no metric: saying it twice on one field is worse than once.
   */
  metric?: ExplainMetric;
  /** Control pinned inside the input, e.g. the password reveal toggle. */
  trailing?: ReactNode;
  /** Static text pinned inside the input's left edge, e.g. a sign. */
  leading?: ReactNode;
  /**
   * A link or control that belongs to this field, set opposite its label —
   * "Forgot your password?" beside `Password`.
   *
   * Deliberately a sibling of the `Label` rather than a child: inside it, a
   * click meant for the link would fall through to focusing the input.
   */
  labelAction?: ReactNode;
};

// Single owner of the label ↔ input ↔ hint ↔ error wiring. `aria-describedby`
// is derived from what is actually rendered, so a field can never point at an
// id that isn't on the page or drop one that is.
export function TextField({
  name,
  label,
  errors,
  hint,
  metric,
  trailing,
  leading,
  labelAction,
  ...input
}: TextFieldProps) {
  const invalid = errors.length > 0;

  const describedBy: string[] = [];
  if (hint) describedBy.push(`${name}-hint`);
  if (invalid) describedBy.push(`${name}-error`);

  return (
    <div className="space-y-2">
      {labelAction ? (
        // Baselines, not boxes: the label and its action are different sizes
        // and weights, and centering their boxes leaves the two texts visibly
        // off each other.
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel name={name} label={label} metric={metric} />
          {labelAction}
        </div>
      ) : (
        <FieldLabel name={name} label={label} metric={metric} />
      )}
      <div className="relative">
        {leading}
        <Input
          id={name}
          name={name}
          aria-invalid={invalid}
          aria-describedby={describedBy.join(" ") || undefined}
          {...input}
        />
        {trailing}
      </div>
      {hint && (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={`${name}-error`} errors={errors} />
    </div>
  );
}

/**
 * A field's label, with its explainer when it has one.
 *
 * The hint is a sibling of the `Label` rather than a child: inside it, a click
 * meant for the popover would fall through to focusing the input — the same
 * reason `labelAction` sits outside.
 */
export function FieldLabel({
  name,
  label,
  metric,
}: {
  name: string;
  label: string;
  metric?: ExplainMetric;
}) {
  if (!metric) return <Label htmlFor={name}>{label}</Label>;

  return (
    <span className="flex items-center gap-0.5">
      <Label htmlFor={name}>{label}</Label>
      <InfoHint metric={metric} />
    </span>
  );
}
