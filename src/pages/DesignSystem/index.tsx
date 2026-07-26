import { Link } from "@tanstack/react-router";

import { BullLedgerLogo } from "@/components/BullLedgerLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ButtonsSection } from "@/pages/DesignSystem/sections/ButtonsSection";
import { ColorsSection } from "@/pages/DesignSystem/sections/ColorsSection";
import { DataSection } from "@/pages/DesignSystem/sections/DataSection";
import { FeedbackSection } from "@/pages/DesignSystem/sections/FeedbackSection";
import { FormsSection } from "@/pages/DesignSystem/sections/FormsSection";
import { OverlaysSection } from "@/pages/DesignSystem/sections/OverlaysSection";
import { RadiusSection } from "@/pages/DesignSystem/sections/RadiusSection";
import { TypographySection } from "@/pages/DesignSystem/sections/TypographySection";
import { PATHS } from "@/routes/path";

const sections = [
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "radius", label: "Radius & spacing" },
  { id: "buttons", label: "Buttons" },
  { id: "forms", label: "Form controls" },
  { id: "feedback", label: "Feedback" },
  { id: "overlays", label: "Overlays" },
  { id: "data", label: "Data display" },
];

export function DesignSystemPage() {
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Link
              to={PATHS.HOME}
              className="flex items-center gap-2 font-heading font-semibold"
            >
              <BullLedgerLogo aria-hidden className="size-7" />
              BullLedger
            </Link>
            <span className="text-sm text-muted-foreground">
              / Design System
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10">
        <aside className="hidden w-44 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-16 pb-24">
          <div className="space-y-3">
            <h1>Design System</h1>
            <p className="max-w-2xl text-muted-foreground">
              The foundations and components that BullLedger is built from —
              tokens, type, and the shadcn component set, themed for both light
              and dark. Everything on this page uses the exact styles shipped to
              the app.
            </p>
          </div>

          <ColorsSection />
          <TypographySection />
          <RadiusSection />
          <ButtonsSection />
          <FormsSection />
          <FeedbackSection />
          <OverlaysSection />
          <DataSection />
        </main>
      </div>
    </div>
  );
}
