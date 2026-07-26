import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconArrowLeft, IconFileText } from "@tabler/icons-react";

import { BullLedgerLogo } from "@/components/BullLedgerLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/routes/path";

// Honest pre-launch state for the legal routes: the documents genuinely
// aren't written yet, so we say so rather than ship placeholder legalese.
// Both /terms and /privacy render this with a different document title.
export function LegalPage({ document }: { document: "terms" | "privacy" }) {
  const { t } = useTranslation();

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center px-6 py-16">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md text-center">
        <Link
          to={PATHS.HOME}
          className="inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <BullLedgerLogo aria-hidden className="size-7" />
          <span className="font-heading text-lg font-semibold tracking-tight">
            BullLedger
          </span>
        </Link>

        <div className="mx-auto mt-10 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <IconFileText className="size-6" aria-hidden />
        </div>

        <h1 className="mt-6 text-2xl">{t(`legal.${document}`)}</h1>
        <p className="mt-3 text-pretty text-muted-foreground">
          {t("legal.pending")}
        </p>

        <Button asChild variant="outline" className="mt-8">
          <Link to={PATHS.REGISTER}>
            <IconArrowLeft />
            {t("legal.backToSignup")}
          </Link>
        </Button>
      </div>
    </main>
  );
}
