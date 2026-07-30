import { Link, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { BullLedgerLogo } from "@/components/BullLedgerLogo";
import { ACTIVE_ITEM, ACTIVE_MARKER } from "@/components/shell/activeStyles";
import { AppSidebarFooter } from "@/components/shell/AppSidebarFooter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NAV_SECTIONS } from "@/config/navigation";
import { PATHS } from "@/routes/path";

export function AppSidebar() {
  const { t } = useTranslation("app");
  const router = useRouter();

  return (
    <Sidebar
      collapsible="icon"
      mobileTitle={t("sidebar.drawerTitle")}
      mobileDescription={t("sidebar.drawerDescription")}
    >
      <SidebarHeader>
        {/*
          A plain anchor, not a `Link`, and the one place in this file that is.
          `Link` appends `aria-current="page"` whenever its target matches, and
          spreads it last, so no prop can suppress it. The brand points at
          /app — a prefix of every screen — which made it claim to be the
          current page alongside the real nav item everywhere, and `exact`
          only narrows that to /app itself, where Overview claims it too.
          `href` keeps middle-click and open-in-new-tab honest; the handler
          keeps an ordinary click on the client side.
        */}
        <a
          href={PATHS.APP}
          onClick={(event) => {
            const wantsNewContext =
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey;
            if (event.defaultPrevented || wantsNewContext) return;

            event.preventDefault();
            void router.navigate({ to: PATHS.APP });
          }}
          // Collapsed, the mark is 24px against the nav icons' 16px, so
          // sharing their left edge would put its centre 4px to the right of
          // the column. It takes the same 32px box the menu buttons use, for
          // the same reason they do: centring inside the rail instead lands
          // half a pixel off, because the rail's 1px right border makes the
          // padded width odd.
          className="flex items-center gap-2 rounded-md px-2 py-1.5 outline-none group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 focus-visible:ring-3 focus-visible:ring-sidebar-ring"
        >
          {/* Decorative: the wordmark beside it already says the name. */}
          <BullLedgerLogo aria-hidden className="size-6 shrink-0" />
          <span className="font-heading text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            BullLedger
          </span>
        </a>
      </SidebarHeader>

      <SidebarContent>
        {/* The landmark, which shadcn's own wrapper does not provide. */}
        <nav aria-label={t("sidebar.label")}>
          {NAV_SECTIONS.map((section) => (
            <SidebarGroup key={section.id}>
              {section.labelKey && (
                // /85 rather than shadcn's /70: composited over the light
                // sidebar the default is 2.97:1, and this is body-size text.
                <SidebarGroupLabel className="text-sidebar-foreground/85">
                  {t(`sections.${section.labelKey}`)}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.path} className={ACTIVE_MARKER}>
                      <SidebarMenuButton
                        asChild
                        tooltip={t(`nav.${item.labelKey}`)}
                      >
                        <Link
                          to={item.path}
                          activeOptions={{ exact: item.exact ?? false }}
                          className={ACTIVE_ITEM}
                        >
                          <item.icon aria-hidden />
                          <span>{t(`nav.${item.labelKey}`)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>

      <AppSidebarFooter />

      <SidebarRail
        aria-label={t("sidebar.toggle")}
        title={t("sidebar.toggle")}
      />
    </Sidebar>
  );
}
