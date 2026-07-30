import { useTranslation } from "react-i18next";

import { ComingSoon } from "@/components/ComingSoon";
import { PageHeader } from "@/components/PageHeader";

export function LedgerPage() {
  const { t } = useTranslation("app");

  return (
    <>
      <PageHeader
        title={t("screens.ledger.title")}
        description={t("screens.ledger.description")}
      />
      <ComingSoon description={t("comingSoon.ledger")} />
    </>
  );
}
