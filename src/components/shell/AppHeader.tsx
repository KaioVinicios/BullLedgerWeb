import { useTranslation } from "react-i18next";

import { AccountMenu } from "@/components/shell/AccountMenu";
import { BrandLink } from "@/components/shell/BrandLink";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  const { t } = useTranslation("app");

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
      {/* The generated trigger carries an English sr-only label; an aria-label
          on the button wins over its content, which is how this stays
          translated without editing the generated file. */}
      <SidebarTrigger aria-label={t("sidebar.toggle")} />

      {/* Below `md` the sidebar is an off-canvas sheet, so nothing on screen
          says which product this is until the drawer is opened — the collapsed
          icon rail that carries the mark on wider viewports does not exist
          here. The rule and the brand end at the same breakpoint the sidebar
          changes form at (`useIsMobile` is 768px, which is `md`), so above it
          the rail owns the brand and the header stays a single mark wide.

          The rule stands in for the rail's 1px right border: without it the
          toggle glyph and the bull sit 8px apart and read as one muddled pair.
          Padding is 6px rather than the shared 8px so the wordmark's optical
          distance from the rule matches the toggle's, whose 16px glyph is
          already inset 8px inside its 32px box; `py-1` puts the brand in the
          same 32px box as the toggle. */}
      <Separator
        orientation="vertical"
        // `data-vertical:self-center` is not decoration: the generated
        // component ships `data-vertical:self-stretch`, which outranks the
        // header's `items-center` on specificity, and `align-self: stretch`
        // against a definite height falls back to start — measured y=0 in a
        // 56px header rather than 18. The variant has to be re-stated to be
        // overridden.
        className="h-5 self-center md:hidden data-vertical:self-center"
      />
      <BrandLink className="px-1.5 py-1 md:hidden" />

      <div className="ml-auto">
        <AccountMenu />
      </div>
    </header>
  );
}
