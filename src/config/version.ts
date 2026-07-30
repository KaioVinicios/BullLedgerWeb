/**
 * The build stamp, in one place.
 *
 * Same discipline `env.ts` applies to `import.meta.env`: the injected global
 * and the dev flag are read here and nowhere else, so no component depends on
 * a build-time substitution whose declaration it cannot see.
 */
export const APP_VERSION: string = __APP_VERSION__;

export type BuildStamp =
  { kind: "dev" } | { kind: "sha"; version: string } | null;

/**
 * What the footer should show, if anything.
 *
 * Both parameters default to this module's own values, so callers pass nothing
 * and tests can still reach every branch — under Vitest `import.meta.env.DEV`
 * is always true, which would otherwise leave two of the three unreachable.
 */
export function buildStamp(
  version: string = APP_VERSION,
  isDev: boolean = import.meta.env.DEV,
): BuildStamp {
  if (isDev) return { kind: "dev" };
  return version ? { kind: "sha", version } : null;
}
