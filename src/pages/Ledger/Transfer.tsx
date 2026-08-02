import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { TransferForm } from "@/pages/Ledger/TransferForm";

export function MovementTransferPage() {
  const { t } = useTranslation("app");

  return (
    <PageContainer width="form">
      <PageHeader
        title={t("ledger.transferForm.title")}
        description={t("ledger.transferForm.description")}
      />
      <TransferForm />
    </PageContainer>
  );
}
