import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { AssetForm } from "@/pages/Assets/AssetForm";

export function AssetNewPage() {
  const { t } = useTranslation("app");

  return (
    <PageContainer width="form">
      <PageHeader
        title={t("assets.form.createTitle")}
        description={t("assets.form.createDescription")}
      />
      <AssetForm />
    </PageContainer>
  );
}
