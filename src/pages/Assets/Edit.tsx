import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { AssetForm } from "@/pages/Assets/AssetForm";
import { PATHS } from "@/routes/path";
import { assetQuery } from "@/services/assets";

const route = getRouteApi(PATHS.ASSETS_EDIT);

/** The edit form is the asset's detail view; see the institutions twin. */
export function AssetEditPage() {
  const { t } = useTranslation("app");
  const { id } = route.useParams();
  const { data: asset } = useQuery(assetQuery(id));

  if (!asset) return <PageSkeleton />;

  return (
    <PageContainer width="form">
      <PageHeader
        title={asset.name}
        description={t("assets.form.editDescription")}
      />
      <AssetForm key={asset.id} asset={asset} />
    </PageContainer>
  );
}
