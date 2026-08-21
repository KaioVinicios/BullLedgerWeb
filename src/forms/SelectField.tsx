import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPTY_SELECT_TRIGGER } from "@/forms/emptySelect";
import { FieldError } from "@/forms/FieldError";
import { FieldLabel } from "@/forms/TextField";
import type { ExplainMetric } from "@/i18n/explain";
import { cn } from "@/lib/utils";

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
  /** See `TextField`: what the field *is*, where its name is the hard part. */
  metric?: ExplainMetric;
  /**
   * What the trigger says in place of a value when `options` is empty. Defaults
   * to a generic line; pass the specific reason where the field knows it.
   */
  emptyLabel?: ReactNode;
};

/**
 * The enum-field twin of `TextField`: one owner for the label ↔ trigger ↔
 * hint ↔ error wiring, so ten enum fields on one form cannot each invent
 * their own aria plumbing. A select rather than radios, because archetype
 * field sets stack several of these and a page of radio groups would bury
 * the fields that need real typing.
 *
 * **An empty list closes the field rather than opening onto nothing.** With no
 * options the trigger stops opening and says so in place of the value — see
 * `emptySelect.ts` for why the disabled dimming is put back there. The text is
 * the trigger's own children rather than `SelectValue`'s `placeholder`,
 * because a placeholder shows only while the value is empty: a value left
 * behind by a row that has since been deleted is not empty, matches no item,
 * echoes nothing, and would rest the trigger blank — the state this exists to
 * prevent. The *reason* still belongs in `hint`, which is the field's one
 * place for it and the only one a screen reader reaches once the trigger has
 * left the tab order.
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
  metric,
  emptyLabel,
}: SelectFieldProps<T>) {
  const { t } = useTranslation("common");
  const invalid = errors.length > 0;
  const empty = options.length === 0;

  const describedBy: string[] = [];
  if (hint) describedBy.push(`${name}-hint`);
  if (invalid) describedBy.push(`${name}-error`);

  return (
    <div className="space-y-2">
      <FieldLabel name={name} label={label} metric={metric} />
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger
          id={name}
          className={cn("w-full", empty && EMPTY_SELECT_TRIGGER)}
          disabled={empty}
          aria-invalid={invalid}
          aria-describedby={describedBy.join(" ") || undefined}
        >
          {empty ? (
            // `min-w-0` so it can shrink inside the flex trigger, and `truncate`
            // so a long translation ellipses instead of pushing the chevron out.
            <span className="min-w-0 truncate">
              {emptyLabel ?? t("field.noOptions")}
            </span>
          ) : (
            <SelectValue />
          )}
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
