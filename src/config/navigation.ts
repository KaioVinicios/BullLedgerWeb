import {
  IconBuildingBank,
  IconCoins,
  IconHelpCircle,
  IconLayoutDashboard,
  IconListDetails,
  IconMessageReport,
  IconTag,
  IconTarget,
  IconWallet,
} from "@tabler/icons-react";

import type appEn from "@/i18n/locales/en/app.json";
import { PATHS } from "@/routes/path";
import type { IconComponent } from "@/types/icon";

/**
 * What the sidebar renders.
 *
 * Data, not JSX, and deliberately not derived from the route tree: most routes
 * do not belong in navigation (profile, the not-found surface, every future
 * detail route), cross-section ordering has no expression in a tree, and a
 * sidebar that reads the router cannot be rendered in a test without one.
 *
 * The label keys are typed against the English resources, so a renamed key
 * fails the build here rather than rendering a raw key in the sidebar.
 */
type NavLabelKey = keyof typeof appEn.nav;
type NavSectionKey = keyof typeof appEn.sections;
type NavPath = (typeof PATHS)[keyof typeof PATHS];

export interface NavItem {
  path: NavPath;
  labelKey: NavLabelKey;
  icon: IconComponent;
  /**
   * Match the route exactly. Only the index needs it: `activeOptions.exact`
   * defaults to false, so `/app` would otherwise read as active on every
   * screen nested under it.
   */
  exact?: boolean;
}

export interface NavSection {
  id: string;
  /** `null` for the leading group, which needs no heading above one item. */
  labelKey: NavSectionKey | null;
  items: readonly NavItem[];
}

/** Profile is absent on purpose: it is reached from the account menu. */
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "primary",
    labelKey: null,
    items: [
      {
        path: PATHS.APP,
        labelKey: "overview",
        icon: IconLayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    id: "structure",
    labelKey: "structure",
    items: [
      {
        path: PATHS.INSTITUTIONS,
        labelKey: "institutions",
        icon: IconBuildingBank,
      },
      { path: PATHS.ACCOUNTS, labelKey: "accounts", icon: IconWallet },
      { path: PATHS.ASSETS, labelKey: "assets", icon: IconCoins },
    ],
  },
  {
    id: "activity",
    labelKey: "activity",
    items: [
      { path: PATHS.LEDGER, labelKey: "ledger", icon: IconListDetails },
      { path: PATHS.PRICING, labelKey: "pricing", icon: IconTag },
      { path: PATHS.TARGETS, labelKey: "targets", icon: IconTarget },
    ],
  },
];

/**
 * What the sidebar footer renders: the destinations that belong to the product
 * rather than to the portfolio.
 *
 * Separate types rather than a reuse of `NavItem`, for a concrete reason.
 * `NavItem.labelKey` is `keyof typeof appEn.nav`, and `AppSidebar.test.tsx`
 * iterates `Object.values(app.nav)` looking *inside* the "Main" landmark.
 * Footer labels living in `app.nav` would break that test, and before that
 * would make `app.nav` misdescribe what primary navigation is.
 */
export interface FooterItem {
  path: NavPath;
  labelKey: keyof typeof appEn.footer.links;
  icon: IconComponent;
}

export interface LegalLink {
  /** Narrowed on purpose: these leave the application for a public page. */
  path: typeof PATHS.TERMS | typeof PATHS.PRIVACY;
  labelKey: keyof typeof appEn.footer.legal;
}

export const FOOTER_ITEMS: readonly FooterItem[] = [
  { path: PATHS.HELP, labelKey: "help", icon: IconHelpCircle },
  { path: PATHS.FEEDBACK, labelKey: "feedback", icon: IconMessageReport },
];

/** Canonical public documents, opened in a new tab — never mirrored under /app. */
export const LEGAL_LINKS: readonly LegalLink[] = [
  { path: PATHS.TERMS, labelKey: "terms" },
  { path: PATHS.PRIVACY, labelKey: "privacy" },
];
