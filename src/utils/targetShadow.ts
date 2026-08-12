import type { Archetype } from "@/schemas/apiEnums";
import type { Target } from "@/services/targets";

/**
 * Which more-specific targets cover part of a broader one's reach.
 *
 * `business-rules.md` resolves a holding's target across three levels and
 * takes the first match as a whole package. So a portfolio default for Crypto
 * still governs every crypto holding that no narrower target names — and
 * governs *none* of the ones that do. That partial relationship is the whole
 * fact this function reports, and it is why the copy beside it says "covers
 * part of this reach" and never "this target has no effect".
 *
 * Pure, and it takes a lookup rather than the asset list, so it never has to
 * know what an `Asset` is. The lookup returns `undefined` for an asset the
 * caller has not loaded, and an unknown archetype **never matches**: a warning
 * invented from a cache miss would be worse than a warning that arrives a
 * frame late.
 *
 * An archived target governs nothing. It neither shadows nor is shadowed.
 */
export type ArchetypeOf = (assetId: string) => Archetype | undefined;

export function findShadowers(
  target: Target,
  all: readonly Target[],
  archetypeOf: ArchetypeOf,
): Target[] {
  // The most specific level has nothing above it to be covered by, and an
  // archived target has no reach to cover.
  if (target.scope === "HOLDING") return [];
  if (target.archived_at !== null) return [];

  return all.filter((other) => {
    if (other.id === target.id) return false;
    if (other.archived_at !== null) return false;

    if (target.scope === "ACCOUNT_ARCHETYPE") {
      return (
        other.scope === "HOLDING" &&
        other.account === target.account &&
        archetypeOf(other.asset) === target.archetype
      );
    }

    // PORTFOLIO_ARCHETYPE — covered from both levels below it.
    if (other.scope === "ACCOUNT_ARCHETYPE") {
      return other.archetype === target.archetype;
    }
    if (other.scope === "HOLDING") {
      return archetypeOf(other.asset) === target.archetype;
    }

    return false;
  });
}
