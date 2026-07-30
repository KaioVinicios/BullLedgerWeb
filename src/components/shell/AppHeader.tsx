import { useTranslation } from "react-i18next";

import { AccountMenu } from "@/components/shell/AccountMenu";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader() {
  const { t } = useTranslation("app");

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
      {/* The generated trigger carries an English sr-only label; an aria-label
          on the button wins over its content, which is how this stays
          translated without editing the generated file. */}
      <SidebarTrigger aria-label={t("sidebar.toggle")} />
      <div className="ml-auto">
        <AccountMenu />
      </div>
    </header>
  );
}
