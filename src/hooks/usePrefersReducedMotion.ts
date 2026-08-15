import { useSyncExternalStore } from "react";

/**
 * Whether the reader asked the system to reduce motion.
 *
 * `src/index.css` already answers this for everything the browser animates —
 * it flattens every CSS animation and transition in one base-layer rule. What
 * it cannot reach is motion driven from JavaScript, which is how Recharts
 * animates: `react-smooth` interpolates on a timer and writes attributes, so
 * no CSS declaration is involved and no media query can flatten it.
 *
 * Hence this hook, read by the one component that needs it, following the
 * `useIsMobile` pattern — `useSyncExternalStore` rather than an effect, so the
 * first render already has the right answer instead of animating once and then
 * correcting itself.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** No SSR here, but the hook still owes the signature a server snapshot. */
function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
