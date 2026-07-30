import { useTranslation } from "react-i18next";

import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export function ProfilePage() {
  const { t } = useTranslation("app");

  return (
    <>
      <PageHeader
        title={t("screens.profile.title")}
        description={t("screens.profile.description")}
      />
      <ComingSoon description={t("comingSoon.profile")} />
    </>
  );
}
