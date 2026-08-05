import type { TFunction } from "i18next";

import type { Archetype, TargetScope } from "@/schemas/apiEnums";
import type { Target } from "@/services/targets";

/**
 * What a target's scope is called, whether a half-filled one is answerable
 * yet, and whether an existing target already occupies it.
 *
 * Pure and React-free on purpose: these three questions are asked by the list,
 * the archive dialog, the create form, and the edit screen, and a target has
 * to be called the same thing in all four. `t` is passed in the way
 * `translateServerErrors` takes it, which keeps this testable with no provider
 * mounted.
 *
 * A target carries **no name of its own** — nothing on any member of the union
 * is a label — so every name here is built from the scope, joining account and
 * asset names the caller looks up from the resource caches. The join misses
 * while those caches are still loading, which is why `ScopeNames` returns the
 * id rather than throwing: an id on screen for one frame beats a crash.
 */
export interface ScopeSelection {
  scope: TargetScope;
  /** `""` while unchosen. */
  account: string;
  /** `""` while unchosen. */
  asset: string;
  archetype: Archetype;
}

export interface ScopeNames {
  accountName: (id: string) => string;
  assetName: (id: string) => string;
}

const SEPARATOR = " · ";
const UNCHOSEN = "—";

export function targetScopeName(
  target: Target,
  names: ScopeNames,
  t: TFunction<"app">,
): string {
  switch (target.scope) {
    case "PORTFOLIO_ARCHETYPE":
      return t(`enums.archetype.${target.archetype}`);
    case "ACCOUNT_ARCHETYPE":
      return [
        t(`enums.archetype.${target.archetype}`),
        names.accountName(target.account),
      ].join(SEPARATOR);
    case "HOLDING":
      return [
        names.assetName(target.asset),
        names.accountName(target.account),
      ].join(SEPARATOR);
  }
}

/** The same phrase for a scope being chosen rather than one already stored. */
export function selectionScopeName(
  selection: ScopeSelection,
  names: ScopeNames,
  t: TFunction<"app">,
): string {
  const archetype = t(`enums.archetype.${selection.archetype}`);
  const account = selection.account
    ? names.accountName(selection.account)
    : UNCHOSEN;
  const asset = selection.asset ? names.assetName(selection.asset) : UNCHOSEN;

  switch (selection.scope) {
    case "PORTFOLIO_ARCHETYPE":
      return archetype;
    case "ACCOUNT_ARCHETYPE":
      return [archetype, account].join(SEPARATOR);
    case "HOLDING":
      return [asset, account].join(SEPARATOR);
  }
}

/**
 * Whether the selection names a scope the server could answer about.
 *
 * A portfolio default is always complete: the archetype select carries a
 * default value, so there is nothing left to choose. The other two levels wait
 * on ids the user has to pick, and until they do, "does this scope already have
 * a target?" has no answer worth showing.
 */
export function isScopeComplete(selection: ScopeSelection): boolean {
  switch (selection.scope) {
    case "PORTFOLIO_ARCHETYPE":
      return true;
    case "ACCOUNT_ARCHETYPE":
      return selection.account !== "";
    case "HOLDING":
      return selection.account !== "" && selection.asset !== "";
  }
}

/**
 * Does this stored target occupy exactly the scope being selected?
 *
 * Level first, then coordinates: a holding target and an account default at the
 * same account are different scopes and both may exist. That is the whole point
 * of a three-level hierarchy, and getting it wrong here would block a
 * legitimate create.
 */
export function matchesScope(
  target: Target,
  selection: ScopeSelection,
): boolean {
  if (target.scope !== selection.scope) return false;

  switch (target.scope) {
    case "PORTFOLIO_ARCHETYPE":
      return target.archetype === selection.archetype;
    case "ACCOUNT_ARCHETYPE":
      return (
        target.account === selection.account &&
        target.archetype === selection.archetype
      );
    case "HOLDING":
      return (
        target.account === selection.account && target.asset === selection.asset
      );
  }
}
