import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { InstitutionForm } from "@/pages/Institutions/InstitutionForm";
import { PATHS } from "@/routes/path";
import { institutionQuery } from "@/services/institutions";

const route = getRouteApi(PATHS.INSTITUTIONS_EDIT);

/**
 * The edit form is the resource's detail view (design decision 5): a
 * structure record has nothing derived to show that its row doesn't already
 * show, so the screen titles itself with the record's own name and gets to
 * the point.
 */
export function InstitutionEditPage() {
  const { t } = useTranslation("app");
  const { id } = route.useParams();
  const { data: institution } = useQuery(institutionQuery(id));

  // The route loader resolved this before rendering, so the branch is
  // unreachable in practice — but the cache is typed as possibly empty, and
  // a skeleton is a more honest answer to that than a non-null assertion.
  if (!institution) return <PageSkeleton />;

  return (
    <PageContainer width="form">
      <PageHeader
        title={institution.name}
        description={t("institutions.form.editDescription")}
      />
      {/* Keyed so switching records remounts the form with fresh defaults —
          TanStack Form reads defaultValues once. */}
      <InstitutionForm key={institution.id} institution={institution} />
    </PageContainer>
  );
}
