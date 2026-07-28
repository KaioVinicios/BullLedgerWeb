import { useTranslation } from "react-i18next";
import { IconLoader2 } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLogout } from "@/hooks/useLogout";

/**
 * Placeholder for the authenticated surface Phase 3 replaces with the real
 * shell (nav, header, account menu). Logout lives here in the meantime so the
 * hook built in Phase 2 has somewhere to be reached from — the account menu
 * absorbs this control later; the hook and its behavior do not change.
 */
export function AppPage() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const logout = useLogout();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-1">
        <h1 className="text-2xl">{t("app.signedInTitle")}</h1>
        {user && <p className="text-sm text-muted-foreground">{user.email}</p>}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
      >
        {logout.isPending ? (
          <>
            <IconLoader2 className="animate-spin" aria-hidden />
            {t("app.loggingOut")}
          </>
        ) : (
          t("app.logout")
        )}
      </Button>
    </main>
  );
}
