import type { Archetype } from "@/schemas/apiEnums";
import type { components } from "@/types/api";

/**
 * Pure derivation over the server's spec table — the data itself is fetched
 * (`services/movementTypes.ts`), never declared here.
 *
 * Every function takes the table as its first argument rather than reading a
 * module-level copy. That is what keeps this file testable against a captured
 * fixture with no network, no query client, and no React, and it is why the
 * matrix can live on the server without the client growing a second one.
 */
export type MovementType = components["schemas"]["TypeEnum"];
export type MovementTypeSpec = components["schemas"]["MovementTypeSpec"];
export type MovementShape = components["schemas"]["MovementShape"];
export type MovementSpecs = readonly MovementTypeSpec[];

/**
 * The two types the movement endpoint refuses: `POST /api/movements/` answers
 * `movement_use_record_transfer`, because a transfer is two linked legs written
 * atomically by `POST /api/movements/transfer/`. They are filtered out of every
 * offered list here rather than in the form, so no screen can offer a type it
 * cannot record.
 */
export const TRANSFER_TYPES = ["TRANSFER_IN", "TRANSFER_OUT"] as const;

export function isTransferType(type: MovementType): boolean {
  return (TRANSFER_TYPES as readonly string[]).includes(type);
}

export function specFor(
  specs: MovementSpecs,
  type: MovementType,
): MovementTypeSpec | undefined {
  return specs.find((spec) => spec.type === type);
}

/**
 * The types the entry form may offer.
 *
 * With an asset, that is the archetype's column of the matrix. Without one, it
 * is the types that also have a pure-cash form (`asset_required: false`) — a
 * movement of the account's own cash rather than of a holding.
 */
export function typesFor(
  specs: MovementSpecs,
  archetype: Archetype | null,
): MovementType[] {
  return specs
    .filter((spec) => !isTransferType(spec.type))
    .filter((spec) =>
      archetype === null
        ? !spec.asset_required
        : spec.archetypes.includes(archetype),
    )
    .map((spec) => spec.type);
}

/**
 * Crypto transfers move units with no cash, which is the one place a type has
 * two shapes. Everything else has one, and `crypto_shape` is present-and-null
 * there rather than absent — so this never probes for a key.
 */
export function shapeFor(
  spec: MovementTypeSpec,
  archetype: Archetype | null,
): MovementShape {
  return archetype === "CRYPTO" && spec.crypto_shape !== null
    ? spec.crypto_shape
    : spec.shape;
}

/** The lot rules apply to the asset-carrying form only; a cash row has none. */
export function requiresLot(
  spec: MovementTypeSpec,
  hasAsset: boolean,
): boolean {
  return hasAsset && spec.lot === "REQUIRES";
}

export function createsLot(spec: MovementTypeSpec, hasAsset: boolean): boolean {
  return hasAsset && spec.lot === "CREATES";
}

export function allowsFee(spec: MovementTypeSpec): boolean {
  return spec.fee_allowed;
}

export function carriesUnitPrice(spec: MovementTypeSpec): boolean {
  return spec.unit_price === "WITH_QUANTITY";
}

export function acceptsQuantity(shape: MovementShape): boolean {
  return shape.quantity !== "NULL";
}

/**
 * Whether this form must state its quantity — the one rule the table cannot
 * express.
 *
 * `BUY` publishes `POSITIVE_OR_NULL` for all four archetypes it serves, but the
 * server narrows it: `movement_quantity_required` lets only a lump-principal
 * `FIXED_INCOME` position omit its units, because a CDB is a sum of money
 * rather than a number of things. Encoded here rather than inside the form so
 * the exception lives beside the rules it qualifies, and is covered by the same
 * tests.
 */
export function quantityRequired(
  shape: MovementShape,
  archetype: Archetype | null,
): boolean {
  if (!acceptsQuantity(shape)) return false;

  return requiresQuantity(shape) || archetype !== "FIXED_INCOME";
}

export function requiresQuantity(shape: MovementShape): boolean {
  return (
    shape.quantity === "POSITIVE" ||
    shape.quantity === "NEGATIVE" ||
    shape.quantity === "NONZERO"
  );
}
