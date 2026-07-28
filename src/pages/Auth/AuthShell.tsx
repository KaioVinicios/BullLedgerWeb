import { Link } from "@tanstack/react-router";

import { BullLedgerLogo } from "@/components/BullLedgerLogo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { PATHS } from "@/routes/path";

interface AuthShellProps {
  children: React.ReactNode;
  /**
   * Companion panel for the one screen that has to *persuade*. Passing it
   * turns the frame into two columns; leaving it out keeps a single centered
   * one, and every screen here that is a task rather than a pitch leaves it
   * out. Someone confirming an email or resetting a password has already
   * decided — beside that task, a preview of someone else's portfolio wins the
   * page from the only thing on it that matters.
   */
  aside?: React.ReactNode;
}

// The auth frame. One centered column by default; two when a caller supplies
// an aside, in which case the form keeps the wider side. The logo links home
// so the pre-launch marketing page stays one tap away.
export function AuthShell({ children, aside }: AuthShellProps) {
  return (
    <main
      className={cn(
        "relative grid min-h-svh",
        aside && "lg:grid-cols-[minmax(0,65fr)_35fr]",
      )}
    >
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="flex flex-col justify-center px-6 py-16 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-sm">
          <Link
            to={PATHS.HOME}
            className="inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <BullLedgerLogo aria-hidden className="size-7" />
            <span className="font-heading text-lg font-semibold tracking-tight">
              BullLedger
            </span>
          </Link>

          {children}
        </div>
      </div>

      {aside}
    </main>
  );
}
