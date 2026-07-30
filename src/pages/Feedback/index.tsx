import { useTranslation } from "react-i18next";

import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export function FeedbackPage() {
  const { t } = useTranslation("app");

  return (
    <>
      <PageHeader
        title={t("screens.feedback.title")}
        description={t("screens.feedback.description")}
      />
      <ComingSoon description={t("comingSoon.feedback")} />
    </>
  );
}
