import { Link } from "@tanstack/react-router";

import { BullLedgerLogo } from "@/components/BullLedgerLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PATHS } from "@/routes/path";
import { TrustPanel } from "@/pages/Auth/TrustPanel";

// Two-column auth frame shared by register and sign-in: form on the left,
// product-preview panel on the right (panel drops away below lg). The logo
// links home so the pre-launch marketing page stays one tap away.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-svh lg:grid-cols-[minmax(0,65fr)_35fr]">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="flex flex-col justify-center px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-sm">
          <Link
            to={PATHS.HOME}
            className="focus-visible:ring-ring inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-3"
          >
            <BullLedgerLogo aria-hidden className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">
              BullLedger
            </span>
          </Link>

          {children}
        </div>
      </div>

      <TrustPanel className="hidden lg:flex" />
    </main>
  );
}
