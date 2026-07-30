import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ACTIVE_ITEM, ACTIVE_MARKER } from "@/components/shell/activeStyles";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { FOOTER_ITEMS, LEGAL_LINKS } from "@/config/navigation";
import { buildStamp } from "@/config/version";
import { cn } from "@/lib/utils";

/**
 * `/70` on the sidebar foreground measures 7.55:1 in the light theme and
 * 8.76:1 in the dark one — a real muted step that still clears the 4.5:1 this
 * text size owes. `/55` is where it would stop clearing it.
 */
const SMALL_PRINT = "px-2 text-xs text-sidebar-foreground/70";

/**
 * Everything below the two rows disappears with the labels it belongs to.
 * A 12px line has no icon form worth inventing, the rail is one click away,
 * and both documents stay linked from the register and login screens.
 */
const EXPANDED_ONLY = "group-data-[collapsible=icon]:hidden";

/**
 * The destinations that belong to the product rather than to the portfolio.
 *
 * Its own landmark, not part of "Main": a screen-reader user gets two entries
 * — the areas they work in, and everything secondary — instead of one list
 * where Privacy sits beside Ledger.
 */
export function AppSidebarFooter() {
  const { t } = useTranslation("app");
  const stamp = buildStamp();

  return (
    <SidebarFooter>
      <SidebarSeparator />

      <nav aria-label={t("footer.label")}>
        <SidebarMenu>
          {FOOTER_ITEMS.map((item) => (
            <SidebarMenuItem key={item.path} className={ACTIVE_MARKER}>
              <SidebarMenuButton
                asChild
                tooltip={t(`footer.links.${item.labelKey}`)}
              >
                <Link to={item.path} className={ACTIVE_ITEM}>
                  <item.icon aria-hidden />
                  <span>{t(`footer.links.${item.labelKey}`)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <p className={cn(SMALL_PRINT, EXPANDED_ONLY, "mt-2")}>
          {LEGAL_LINKS.map((link, index) => (
            <Fragment key={link.path}>
              {index > 0 && <span aria-hidden> · </span>}
              {/*
                A plain anchor, not a `Link`: nothing about a new tab benefits
                from client-side routing, and these leave the application for
                the canonical public document on purpose. The new-tab warning
                is text rather than a glyph — two external-link marks at 12px
                would double the visual weight of the quietest row in the
                shell, whose job is to be findable without competing.

                It rides on `aria-label` rather than an `sr-only` span because
                the name computation concatenates text nodes without inserting
                a separator, so the two would run together as one word. The
                label opens with the visible text, which is what keeps voice
                control able to address it (WCAG 2.5.3).
              */}
              <a
                href={link.path}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t(`footer.legal.${link.labelKey}`)} (${t("footer.newTab")})`}
                className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-sidebar-ring"
              >
                {t(`footer.legal.${link.labelKey}`)}
              </a>
            </Fragment>
          ))}
        </p>
      </nav>

      {/* Outside the landmark: a stamp is not a destination. Absent rather
          than empty when git could not be read at build time. */}
      {stamp && (
        <p className={cn(SMALL_PRINT, EXPANDED_ONLY)}>
          {stamp.kind === "dev"
            ? t("footer.versionDev")
            : t("footer.version", { version: stamp.version })}
        </p>
      )}
    </SidebarFooter>
  );
}
