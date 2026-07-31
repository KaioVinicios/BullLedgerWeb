import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { AccountForm } from "@/pages/Accounts/AccountForm";

export function AccountNewPage() {
  const { t } = useTranslation("app");

  return (
    <PageContainer width="form">
      <PageHeader
        title={t("accounts.form.createTitle")}
        description={t("accounts.form.createDescription")}
      />
      <AccountForm />
    </PageContainer>
  );
}
