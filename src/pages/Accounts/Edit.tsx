import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { AccountForm } from "@/pages/Accounts/AccountForm";
import { PATHS } from "@/routes/path";
import { accountQuery } from "@/services/accounts";
import { accountLabel } from "@/utils/accountLabel";

const route = getRouteApi(PATHS.ACCOUNTS_EDIT);

/** The edit form is the account's detail view; see the institutions twin. */
export function AccountEditPage() {
  const { t } = useTranslation("app");
  const { id } = route.useParams();
  const { data: account } = useQuery(accountQuery(id));

  if (!account) return <PageSkeleton />;

  return (
    <PageContainer width="form">
      <PageHeader
        title={accountLabel(account, t)}
        description={t("accounts.form.editDescription")}
      />
      <AccountForm key={account.id} account={account} />
    </PageContainer>
  );
}
