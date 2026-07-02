import { Link } from "@tanstack/react-router";

import { BullLedgerLogo } from "@/components/BullLedgerLogo";
import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <BullLedgerLogo className="size-16" />
      <div className="space-y-2">
        <h1>BullLedger</h1>
        <p className="text-muted-foreground max-w-md">
          Track your investments with clarity. The app is under construction —
          meanwhile, explore the design system.
        </p>
      </div>
      <Button asChild size="lg">
        <Link to="/design-system">Open design system</Link>
      </Button>
    </main>
  );
}
