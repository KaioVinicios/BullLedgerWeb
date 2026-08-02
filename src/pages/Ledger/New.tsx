import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { MovementForm } from "@/pages/Ledger/MovementForm";

export function MovementNewPage() {
  const { t } = useTranslation("app");

  return (
    <PageContainer width="form">
      <PageHeader
        title={t("ledger.form.createTitle")}
        description={t("ledger.form.createDescription")}
      />
      <MovementForm />
    </PageContainer>
  );
}
