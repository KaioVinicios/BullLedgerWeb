import { useRouter } from "@tanstack/react-router";

import type { PATHS } from "@/routes/path";

type ShellPath = (typeof PATHS)[keyof typeof PATHS];

/**
 * An anchor to somewhere in the shell that must not claim to be the current
 * page.
 *
 * `Link` appends `aria-current="page"` whenever its target matches and spreads
 * it last, so no prop can suppress it — `BrandLink` found that out first and
 * this is its handler, lifted so a second caller cannot re-derive it slightly
 * differently. Two callers, two different reasons, one behaviour:
 *
 * - the brand points at /app, a prefix of every screen, so `Link` had it
 *   claiming the current page everywhere;
 * - the record shortcut points at one leaf, so it would claim it on exactly
 *   one route — the same route where the Ledger nav item already does.
 *
 * Both end up in the same place: the shell answers "where am I" once. The
 * navigation landmark owns that answer, and everything else in here is either
 * a brand or a verb.
 *
 * `href` keeps middle-click and open-in-new-tab honest; the handler keeps an
 * ordinary click on the client side.
 */
export function useShellAnchor(to: ShellPath) {
  const router = useRouter();

  return {
    href: to,
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      const wantsNewContext =
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey;
      if (event.defaultPrevented || wantsNewContext) return;

      event.preventDefault();
      void router.navigate({ to });
    },
  };
}
