import { useTranslation } from "react-i18next";

import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export function AccountsPage() {
  const { t } = useTranslation("app");

  return (
    <>
      <PageHeader
        title={t("screens.accounts.title")}
        description={t("screens.accounts.description")}
      />
      <ComingSoon description={t("comingSoon.accounts")} />
    </>
  );
}
