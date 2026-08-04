import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PriceQuoteForm } from "@/pages/Pricing/PriceQuoteForm";

export function PriceQuoteNewPage() {
  const { t } = useTranslation("app");

  return (
    <PageContainer width="form">
      <PageHeader
        title={t("pricing.form.createTitle")}
        description={t("pricing.form.createDescription")}
      />
      <PriceQuoteForm />
    </PageContainer>
  );
}
