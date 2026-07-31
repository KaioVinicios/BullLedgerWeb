import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { IdentitySection } from "@/pages/Profile/IdentitySection";
import { ReportingSection } from "@/pages/Profile/ReportingSection";
import { currentUserQuery } from "@/services/auth";
import { profileQuery } from "@/services/profile";

export function ProfilePage() {
  const { t } = useTranslation("app");
  const { data: user } = useQuery(currentUserQuery);
  const { data: profile } = useQuery(profileQuery);

  // `requireAuth` resolved the user and the route loader resolved the profile
  // before this rendered, so both are warm on first paint and this branch is
  // unreachable in practice. It is here because the cache is *typed* as
  // possibly empty, and a skeleton is a more honest answer to that than a
  // non-null assertion.
  if (!user || !profile) return <PageSkeleton />;

  return (
    <PageContainer width="form">
      <PageHeader
        title={t("screens.profile.title")}
        description={t("screens.profile.description")}
      />
      <div className="space-y-6">
        <IdentitySection user={user} />
        <ReportingSection profile={profile} />
      </div>
    </PageContainer>
  );
}
