import { useTranslation } from "react-i18next";

import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export function AssetsPage() {
  const { t } = useTranslation("app");

  return (
    <>
      <PageHeader
        title={t("screens.assets.title")}
        description={t("screens.assets.description")}
      />
      <ComingSoon description={t("comingSoon.assets")} />
    </>
  );
}
