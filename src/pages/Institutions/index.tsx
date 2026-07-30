import { useTranslation } from "react-i18next";

import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export function InstitutionsPage() {
  const { t } = useTranslation("app");

  return (
    <>
      <PageHeader
        title={t("screens.institutions.title")}
        description={t("screens.institutions.description")}
      />
      <ComingSoon description={t("comingSoon.institutions")} />
    </>
  );
}
