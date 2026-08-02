import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * The explicit ask that brings voided movements into the ledger.
 *
 * A sibling of `ShowArchivedToggle` rather than a reuse of it with a label
 * prop. Archiving and voiding are different acts on different resources — one
 * puts a structure row away, the other withdraws a recorded fact from every
 * projection — and a shared component would eventually mean shared copy, which
 * is where those two words start blurring into each other.
 */
export function ShowVoidedToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const { t } = useTranslation("app");

  return (
    <div className="flex items-center justify-end gap-2">
      <Switch
        id="show-voided"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <Label htmlFor="show-voided" className="font-normal">
        {t("ledger.showVoided")}
      </Label>
    </div>
  );
}
