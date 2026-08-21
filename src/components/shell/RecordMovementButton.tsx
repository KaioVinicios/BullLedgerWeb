import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { IconPlus } from "@tabler/icons-react";

import { useShellAnchor } from "@/components/shell/useShellAnchor";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { PATHS } from "@/routes/path";
import { listMovements, movementKeys } from "@/services/movements";

/** One page is all it takes to answer "has this ledger been used yet". */
const FIRST_PAGE = { page: 1 } as const;

/**
 * The one thing this app is for, kept one click from everywhere.
 *
 * Once institutions, accounts, and assets are set up, recording a movement is
 * the only task a user comes back to perform, and it was two clicks deep —
 * the ledger, then its action. The sidebar already carries every destination;
 * this is the one action worth putting beside them.
 *
 * **It is not in `NAV_SECTIONS`, and it sits outside the `<nav>` landmark.**
 * That config describes places, typed against `app.nav`, and this is a verb.
 * Primary navigation goes on answering "where am I" by itself.
 *
 * **A plain anchor, for the reason the brand is one.** On /app/ledger/new this
 * target matches the URL, and so does the Ledger nav item — a `Link` here
 * would put two `aria-current="page"` claims in one column, which
 * `AppSidebar.test.tsx` holds the shell to exactly one of. `useShellAnchor`
 * owns that behaviour for both callers.
 *
 * **The accent.** PRODUCT.md spends gold on the primary action and the current
 * selection, and this puts both in one column: a filled button here, the 3px
 * rail marker there, the same hue in dark. They are allowed to share it
 * because they differ by two orders of magnitude in mass and never mean the
 * same thing — but this is the whole accent budget for the sidebar, and a
 * third gold thing in here would be one too many.
 *
 * **It appears once the ledger has been used, not once it could be.** The
 * first movement belongs to `Overview/FirstRun`, which walks a new user
 * through institution, account, asset, movement and offers exactly one action
 * at a time — a permanent gold button in the sidebar saying something else
 * would be a second instruction competing with that one, loudest at the moment
 * a new user can least afford it. Gating on "an account exists" would do
 * exactly that: it is true from step two, while the checklist is still asking
 * for an asset.
 *
 * So the gate is one recorded movement. That is also what the shortcut is
 * *for* — the second movement and every one after it, which is the task people
 * return to. Before that there is a guided path to the first one and no reason
 * to shout over it.
 *
 * The read is one page deep and keyed the way the ledger screen keys its own,
 * so it is a cache hit for anyone who has been there and a 30-second cache for
 * everyone else. Nothing renders while it is in flight: a button that appears
 * and then withdraws is worse than one that arrives a moment late.
 *
 * Reused copy, not new: `ledger.record` already names this action on the
 * ledger screen, and one action answering to two names would be a worse bug
 * than the coupling.
 */
export function RecordMovementButton() {
  const { t } = useTranslation("app");
  const anchor = useShellAnchor(PATHS.LEDGER_NEW);
  const { data } = useQuery({
    queryKey: movementKeys.list(FIRST_PAGE),
    queryFn: () => listMovements(FIRST_PAGE),
  });

  if ((data?.count ?? 0) === 0) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          // Shown only when the rail is collapsed to icons, which is the one
          // state where the label is gone.
          tooltip={t("ledger.record")}
          // `cn` is tailwind-merge, so these win over the hover pair baked
          // into the variant rather than racing it in the class list. The
          // hover tone is the solid `--primary-hover`, not an alpha of
          // --primary: index.css explains why a composited hover breaks AA.
          //
          // `w-fit` over the variant's `w-full`: the button reads as an object
          // sized by its own label rather than a bar the rail happens to be as
          // wide as, and the empty rail beside it keeps the nav below from
          // looking like more of the same block. `pr-3` because the icon's own
          // 8px on the left is balanced by the gap after it, so the label
          // would otherwise end flush against the edge. Neither survives the
          // collapsed rail, and neither needs to — `size-8!` and `p-2!` in the
          // variant are `!important` and take the icon square back.
          className="w-fit bg-primary pr-3 text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground active:bg-primary-hover active:text-primary-foreground"
        >
          <a {...anchor}>
            <IconPlus aria-hidden />
            <span>{t("ledger.record")}</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
