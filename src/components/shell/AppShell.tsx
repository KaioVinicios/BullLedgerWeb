import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PulseField } from "@/components/PulseField";
import { AppHeader } from "@/components/shell/AppHeader";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { readSidebarOpen } from "@/lib/sidebarState";

export function AppShell() {
  const { t } = useTranslation("app");

  return (
    <SidebarProvider defaultOpen={readSidebarOpen()}>
      {/* First in the tab order, and out of flow until focused: roughly eight
          navigation links precede the content on every screen. */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-3 focus:ring-ring"
      >
        {t("skipToContent")}
      </a>

      <AppSidebar />

      {/* Not shadcn's <SidebarInset>: it renders a <main>, which would put the
          site header inside the main landmark. Same layout, correct semantics.

          `min-w-0` is the one addition, and it is load-bearing. This is a flex
          item in the provider's row, so it defaults to `min-width: auto` and
          refuses to shrink below its content's intrinsic width — `w-full` and
          `flex-1` do not override that. Anything wide inside (a scope strip, a
          table) therefore pushed this wrapper past the viewport and scrolled
          the whole document sideways, instead of scrolling inside its own box.
          Every `overflow-x-auto` on every screen was quietly inert for the
          same reason. shadcn's own `SidebarInset` omits it too, so this is an
          upstream gap rather than a divergence from it. */}
      <div className="relative flex w-full min-w-0 flex-1 flex-col bg-background">
        <AppHeader />
        <main
          id="content"
          tabIndex={-1}
          className="relative isolate flex-1 px-4 py-6 outline-none md:px-6"
        >
          {/* Scoped to the content region deliberately: the header, the
              sidebar, and every nav keep a flat surface, because chrome that
              shimmers is chrome you end up looking at. `isolate` is the
              load-bearing half of the pair — without it the field's negative
              z-index escapes this element and lands behind the wrapper's
              background, where nobody sees it again. */}
          <PulseField />
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
