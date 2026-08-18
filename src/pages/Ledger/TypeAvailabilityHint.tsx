/**
 * Why the type list looks the way it does.
 *
 * The list is filtered by the server's matrix, which is right — an invalid
 * combination should be unofferable rather than merely rejected. But a list
 * that silently shrinks answers a question the user did not ask and leaves the
 * one they did: *where is Dividend?* Without an answer, a rule reads as a bug.
 *
 * Two lines, both derived from the same spec table the form validates against
 * (`GET /api/movement-types/`), so neither can drift from what the server will
 * actually accept: which types this asset takes, and what the chosen one will
 * ask for once selected.
 *
 * Renders nothing without an asset. A movement of the account's own cash has
 * no archetype to explain, and a hint that is always on screen stops being
 * read by the time it matters.
 */
import { useTranslation } from "react-i18next";

import type { Archetype } from "@/schemas/apiEnums";
import {
  acceptsQuantity,
  allowsFee,
  requiresLot,
  shapeFor,
  specFor,
  typesFor,
  type MovementShape,
  type MovementSpecs,
  type MovementType,
  type MovementTypeSpec,
} from "@/schemas/movementSpec";

type TypeAvailabilityHintProps = {
  specs: MovementSpecs;
  archetype: Archetype | null;
  type: MovementType;
};

/**
 * Which sentence describes what this type will ask for.
 *
 * Read off the shape rather than off the type, so a rule change on the server
 * moves the sentence with it. The lot question comes first because it is the
 * one a user cannot guess: quantity and price announce themselves as inputs,
 * while "this draws from a contribution you have to pick" does not.
 */
function expectationOf(
  spec: MovementTypeSpec,
  shape: MovementShape,
): "unitsAndLot" | "units" | "lot" | "unitsNoCash" | "cashOnly" {
  const units = acceptsQuantity(shape);
  const lot = requiresLot(spec, true);

  if (units && lot) return "unitsAndLot";
  if (lot) return "lot";
  if (units) return shape.cash === "ZERO" ? "unitsNoCash" : "units";

  return "cashOnly";
}

export function TypeAvailabilityHint({
  specs,
  archetype,
  type,
}: TypeAvailabilityHintProps) {
  const { t } = useTranslation("app");

  if (archetype === null) return null;

  const spec = specFor(specs, type);
  if (!spec) return null;

  const offered = typesFor(specs, archetype);
  const shape = shapeFor(spec, archetype);

  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>
        {t("ledger.form.typesForArchetype", {
          archetype: t(`enums.archetype.${archetype}`),
          types: offered
            .map((each) => t(`enums.movementType.${each}`))
            .join(", "),
        })}
      </p>
      <p>
        {t(`ledger.form.typeExpects.${expectationOf(spec, shape)}` as const)}
        {allowsFee(spec) ? ` ${t("ledger.form.typeExpectsFee")}` : ""}
      </p>
    </div>
  );
}
