import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { TargetForm } from "@/pages/Targets/TargetForm";
import { PATHS } from "@/routes/path";

const route = getRouteApi(PATHS.TARGETS_NEW);

export function TargetNewPage() {
  const { t } = useTranslation("app");
  const search = route.useSearch();

  return (
    <PageContainer width="form">
      <PageHeader
        title={t("targets.form.createTitle")}
        description={t("targets.form.createDescription")}
      />
      <TargetForm
        prefill={{
          scope: search.scope,
          account: search.account,
          asset: search.asset,
          archetype: search.archetype,
        }}
      />
    </PageContainer>
  );
}
