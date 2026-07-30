import { useTranslation } from "react-i18next";

import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export function OverviewPage() {
  const { t } = useTranslation("app");

  return (
    <>
      <PageHeader
        title={t("screens.overview.title")}
        description={t("screens.overview.description")}
      />
      <ComingSoon description={t("comingSoon.overview")} />
    </>
  );
}
