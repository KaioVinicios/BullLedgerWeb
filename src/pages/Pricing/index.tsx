import { useTranslation } from "react-i18next";

import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export function PricingPage() {
  const { t } = useTranslation("app");

  return (
    <>
      <PageHeader
        title={t("screens.pricing.title")}
        description={t("screens.pricing.description")}
      />
      <ComingSoon description={t("comingSoon.pricing")} />
    </>
  );
}
