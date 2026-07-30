import { useTranslation } from "react-i18next";

import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export function TargetsPage() {
  const { t } = useTranslation("app");

  return (
    <>
      <PageHeader
        title={t("screens.targets.title")}
        description={t("screens.targets.description")}
      />
      <ComingSoon description={t("comingSoon.targets")} />
    </>
  );
}
