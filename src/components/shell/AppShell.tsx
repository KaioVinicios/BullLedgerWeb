import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

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
          site header inside the main landmark. Same layout, correct semantics. */}
      <div className="relative flex w-full flex-1 flex-col bg-background">
        <AppHeader />
        <main
          id="content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 outline-none md:px-6"
        >
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
