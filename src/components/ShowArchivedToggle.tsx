import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * The explicit ask that brings archived rows into a list. A switch rather
 * than a filter menu because it is the only view option every structure list
 * shares, and its state lives in the URL — the caller wires it there.
 */
export function ShowArchivedToggle({
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
        id="show-archived"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <Label htmlFor="show-archived" className="font-normal">
        {t("structure.showArchived")}
      </Label>
    </div>
  );
}
