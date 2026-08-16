import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/forms/FieldError";

type TextFieldProps = Omit<ComponentProps<typeof Input>, "id"> & {
  name: string;
  label: string;
  errors: unknown[];
  hint?: ReactNode;
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
          <Label htmlFor={name}>{label}</Label>
          {labelAction}
        </div>
      ) : (
        <Label htmlFor={name}>{label}</Label>
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
