import { Link } from "@tanstack/react-router";

import { BullLedgerLogo } from "@/components/BullLedgerLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/routes/path";

export function HomePage() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {/* Decorative here: the adjacent h1 already carries the name. */}
      <BullLedgerLogo aria-hidden className="size-16" />
      <div className="space-y-2">
        <h1>BullLedger</h1>
        <p className="text-muted-foreground max-w-md">
          Track your investments with clarity: positions, transactions, and
          performance in one place.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-muted-foreground text-sm">
          BullLedger is still being built and isn&apos;t open yet.
        </p>
        <Button asChild variant="outline">
          <Link to={PATHS.DESIGN_SYSTEM}>Preview the interface</Link>
        </Button>
      </div>
    </main>
  );
}
