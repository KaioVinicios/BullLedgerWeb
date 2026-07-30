import { useTranslation } from "react-i18next";

import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export function HelpPage() {
  const { t } = useTranslation("app");

  return (
    <>
      <PageHeader
        title={t("screens.help.title")}
        description={t("screens.help.description")}
      />
      <ComingSoon description={t("comingSoon.help")} />
    </>
  );
}
