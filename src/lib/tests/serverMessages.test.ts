import { describe, expect, it } from "vitest";

import DOMAIN_ERROR_CODES from "@/lib/tests/fixtures/domainErrorCodes.json";
import {
  KNOWN_SERVER_CODES,
  translateServerMessage,
  type ErrorsKey,
} from "@/lib/serverMessages";

/** A `t` that echoes the key and appends whatever it was given to interpolate. */
const echo = (key: ErrorsKey, values?: Record<string, unknown>) =>
  values && Object.keys(values).length > 0
    ? `${key}:${JSON.stringify(values)}`
    : String(key);

describe("translateServerMessage", () => {
  it("hands the server's figures to the translation", () => {
    const message = translateServerMessage(
      "This contribution has BRL 1,000.00 left.",
      "movement_lot_overdrawn",
      { remaining: "R$ 1.000,00" },
      echo,
    );

    expect(message).toBe(`movementLotOverdrawn:{"remaining":"R$ 1.000,00"}`);
  });

  it("passes an unknown code through in the server's own words", () => {
    // A code the dictionary has not learned yet degrades to English rather
    // than to a blank field or a raw key.
    expect(
      translateServerMessage(
        "Something new.",
        "movement_not_yet_known",
        {},
        echo,
      ),
    ).toBe("Something new.");
  });

  it("passes a message through when the server sent no code at all", () => {
    expect(
      translateServerMessage("No code here.", undefined, undefined, echo),
    ).toBe("No code here.");
  });

  it("translates a known code that takes no parameters", () => {
    expect(
      translateServerMessage(
        "Incorrect.",
        "invalid_credentials",
        undefined,
        echo,
      ),
    ).toBe("loginFailed");
  });
});

describe("KNOWN_SERVER_CODES", () => {
  it("maps every code to a non-empty key", () => {
    for (const [code, key] of Object.entries(KNOWN_SERVER_CODES)) {
      expect(key, `${code} maps to an empty key`).toBeTruthy();
    }
  });

  it("has a translation for every domain code the API publishes", () => {
    // The fixture lists every code the movements and assets apps raise, and
    // the movement half is transcribed from the table in
    // `docs/backend/api-reference.md`. This is the net that catches the
    // dictionary falling behind the server: a new rejection lands as English
    // on a Portuguese screen, and nothing else in the suite would notice.
    const missing = DOMAIN_ERROR_CODES.filter(
      (code) => !(code in KNOWN_SERVER_CODES),
    );

    expect(missing).toEqual([]);
  });
});
