import { entryTypes, type MovementSpecs } from "@/schemas/movementSpec";
import type { Movement } from "@/services/movements";
import type { LotProjection } from "@/services/portfolio";

export interface Instance {
  lot: LotProjection;
  /** ISO date of the movement that opened it, or null when that row was voided. */
  openedOn: string | null;
  /** Decimal string, the price paid per unit; null for a principal-based lot. */
  unitPrice: string | null;
}

/**
 * One position's lots, each dated and priced from the movement that opened it.
 *
 * Two reads meet here. The projection knows what is *left* of a lot — the
 * server walks the consumption to get `quantity_remaining` and `status`, and no
 * client should redo that. The movement log knows what the lot *cost* and
 * *when*, in stored columns the lot itself never carries.
 *
 * The entry row is found by rule, not by heuristic: `entryTypes` reads the
 * server's own `LotRule`, so this never picks the earliest row — a backdated
 * correction would win — or the largest, which a partial sale could.
 *
 * `unit_price` and not the lot's remaining basis, on purpose. The basis carries
 * the trade's fee rateably folded in; `unit_price` is the price itself, which
 * is the figure worth setting beside a current quote.
 *
 * **A lot with no findable entry is kept, not dropped.** Its opening movement
 * can be voided while the lot still holds units, and hiding it would remove
 * units the position genuinely has. It renders without a date instead.
 */
export function toInstances(
  lots: readonly LotProjection[],
  movements: readonly Movement[],
  specs: MovementSpecs,
): readonly Instance[] {
  const opens = new Set<string>(entryTypes(specs));

  return lots
    .filter((lot) => lot.status === "OPEN")
    .map((lot) => {
      const entry = movements.find(
        (row) => row.lot === lot.lot && opens.has(row.type),
      );

      return {
        lot,
        openedOn: entry?.occurred_on ?? null,
        unitPrice: entry?.unit_price ?? null,
      };
    })
    .sort(byOpenedOn);
}

/** Oldest first. An undatable lot sorts last, where its em dash is. */
function byOpenedOn(a: Instance, b: Instance): number {
  if (a.openedOn === null) return b.openedOn === null ? 0 : 1;
  if (b.openedOn === null) return -1;
  return a.openedOn.localeCompare(b.openedOn);
}
