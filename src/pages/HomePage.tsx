import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { BullLedgerLogo } from "@/components/BullLedgerLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/routes/path";

export function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      {/* Decorative here: the adjacent h1 already carries the name. */}
      <BullLedgerLogo aria-hidden className="size-16" />
      <div className="space-y-2">
        <h1>BullLedger</h1>
        <p className="max-w-md text-muted-foreground">{t("home.tagline")}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">{t("home.notOpen")}</p>
        <Button asChild variant="outline">
          <Link to={PATHS.DESIGN_SYSTEM}>{t("home.previewCta")}</Link>
        </Button>
      </div>
    </main>
  );
}
