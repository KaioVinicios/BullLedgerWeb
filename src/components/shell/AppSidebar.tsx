import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ACTIVE_ITEM, ACTIVE_MARKER } from "@/components/shell/activeStyles";
import { AppSidebarFooter } from "@/components/shell/AppSidebarFooter";
import { BrandLink } from "@/components/shell/BrandLink";
import { RecordMovementButton } from "@/components/shell/RecordMovementButton";
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

export function AppSidebar() {
  const { t } = useTranslation("app");

  return (
    <Sidebar
      collapsible="icon"
      mobileTitle={t("sidebar.drawerTitle")}
      mobileDescription={t("sidebar.drawerDescription")}
    >
      <SidebarHeader>
        <BrandLink
          // Collapsed, the mark is 24px against the nav icons' 16px, so
          // sharing their left edge would put its centre 4px to the right of
          // the column. It takes the same 32px box the menu buttons use, for
          // the same reason they do: centring inside the rail instead lands
          // half a pixel off, because the rail's 1px right border makes the
          // padded width odd.
          className="group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 focus-visible:ring-sidebar-ring"
          wordmarkClassName="group-data-[collapsible=icon]:hidden"
        />

        {/* In the header rather than in the content: the header does not
            scroll, and an action this central should not be able to leave
            the screen on a short viewport. */}
        <RecordMovementButton />
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
