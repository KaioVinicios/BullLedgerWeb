import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/forms/FieldError";

type SelectFieldProps<T extends string> = {
  name: string;
  label: string;
  value: T;
  options: readonly T[];
  /** Renders one option's visible text; usually a `t()` over the enum value. */
  renderOption: (option: T) => ReactNode;
  onChange: (value: T) => void;
  errors?: unknown[];
  hint?: ReactNode;
};

/**
 * The enum-field twin of `TextField`: one owner for the label ↔ trigger ↔
 * hint ↔ error wiring, so ten enum fields on one form cannot each invent
 * their own aria plumbing. A select rather than radios, because archetype
 * field sets stack several of these and a page of radio groups would bury
 * the fields that need real typing.
 */
export function SelectField<T extends string>({
  name,
  label,
  value,
  options,
  renderOption,
  onChange,
  errors = [],
  hint,
}: SelectFieldProps<T>) {
  const invalid = errors.length > 0;

  const describedBy: string[] = [];
  if (hint) describedBy.push(`${name}-hint`);
  if (invalid) describedBy.push(`${name}-error`);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger
          id={name}
          className="w-full"
          aria-invalid={invalid}
          aria-describedby={describedBy.join(" ") || undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {renderOption(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={`${name}-error`} errors={errors} />
    </div>
  );
}
