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
  ...input
}: TextFieldProps) {
  const invalid = errors.length > 0;

  const describedBy: string[] = [];
  if (hint) describedBy.push(`${name}-hint`);
  if (invalid) describedBy.push(`${name}-error`);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
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
        <p id={`${name}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      <FieldError id={`${name}-error`} errors={errors} />
    </div>
  );
}
