import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { TargetForm } from "@/pages/Targets/TargetForm";
import { PATHS } from "@/routes/path";
import { targetQuery } from "@/services/targets";

const route = getRouteApi(PATHS.TARGETS_EDIT);

/** The edit form is the target's detail view; see the assets twin. */
export function TargetEditPage() {
  const { t } = useTranslation("app");
  const { id } = route.useParams();
  const { data: target } = useQuery(targetQuery(id));

  if (!target) return <PageSkeleton />;

  return (
    <PageContainer width="form">
      <PageHeader
        title={t("targets.form.editTitle")}
        description={t("targets.form.editDescription")}
      />
      <TargetForm key={target.id} target={target} />
    </PageContainer>
  );
}
