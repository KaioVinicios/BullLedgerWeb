import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { InstitutionForm } from "@/pages/Institutions/InstitutionForm";

export function InstitutionNewPage() {
  const { t } = useTranslation("app");

  return (
    <PageContainer width="form">
      <PageHeader
        title={t("institutions.form.createTitle")}
        description={t("institutions.form.createDescription")}
      />
      <InstitutionForm />
    </PageContainer>
  );
}
