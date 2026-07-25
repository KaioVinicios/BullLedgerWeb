import { useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { TextField } from "@/forms/TextField";

type PasswordFieldProps = Omit<
  ComponentProps<typeof TextField>,
  "type" | "trailing"
>;

// A text field that owns its own reveal state. The toggle is a real button
// with aria-pressed, so the current state is announced rather than implied by
// the icon alone.
export function PasswordField({ className, ...props }: PasswordFieldProps) {
  const { t } = useTranslation("common");
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      className={cn("pr-10", className)}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible ? t("field.hidePassword") : t("field.showPassword")
          }
          aria-pressed={visible}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 flex items-center rounded-md px-3 outline-none focus-visible:ring-3"
        >
          {visible ? (
            <IconEyeOff className="size-4" />
          ) : (
            <IconEye className="size-4" />
          )}
        </button>
      }
    />
  );
}
