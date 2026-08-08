/**
 * The typing layer that sits in front of the numeric parsers.
 *
 * `parseMoneyInput` and `parseDecimalInput` decide whether a finished entry is
 * valid. These functions decide what the field is allowed to *become* while it
 * is being typed, which is a different job: they run on every keystroke, they
 * never reject — they return the nearest legal value — and they know where the
 * caret has to end up afterwards.
 *
 * Pure and DOM-free on purpose. The caret arithmetic is the part most likely to
 * be wrong, and it is far cheaper to pin as a function of (string, index) than
 * through a rendered input.
 */

/**
 * Fifteen digits, because `Number.MAX_SAFE_INTEGER` is sixteen
 * (9007199254740991) and only some sixteen-digit integers are safe. The
 * accumulator stops here so a user cannot type an amount that `parseMoneyInput`
 * would later refuse — the refusal would arrive at submit, long after the
 * keystroke that caused it.
 */
export const MAX_ACCUMULATOR_DIGITS = 15;

export type Separators = { group: string; decimal: string };

/**
 * Discovers a locale's group and decimal separators from Intl itself.
 *
 * Lives here rather than in `money.ts` or `decimal.ts`, which both held a
 * byte-identical private copy before this module existed and now import this
 * one. Three copies of a locale primitive is where they start to drift.
 */
export function separatorsFor(locale: string): Separators {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);

  return {
    group: parts.find((part) => part.type === "group")?.value ?? ",",
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
  };
}

export function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The two characters either locale might mean a decimal point by. */
const SEPARATOR_CHARS = /[.,]/;

/**
 * Removes a separator only where it sits in a grouping position — between a
 * digit and exactly three more digits that are not themselves followed by one.
 *
 * The alternative, stripping every group separator, is what makes a Brazilian
 * Android phone unusable: its decimal key emits `.`, which is also `pt-BR`'s
 * group separator, so `12.5` would become `125`. Position is the only thing
 * that tells the two apart, and it reads `1.234,5` as grouped and `12.5` as
 * decimal, which is what both were meant to be.
 */
function stripGrouping(value: string, group: string): string {
  return value.replace(
    new RegExp(`(\\d)${escapeForRegExp(group)}(?=\\d{3}(?!\\d))`, "g"),
    "$1",
  );
}

/**
 * Where the entry came from, which decides what an ambiguous separator means.
 *
 * `typed` is a value this module formatted a moment ago plus a single edit, so
 * every group separator in it is one we put there — none can be a decimal
 * point, and a foreign separator key is translated by the caller before it gets
 * here. `pasted` is a number someone else wrote, where position is the only
 * evidence available and `stripGrouping`'s heuristic has to read it.
 */
export type Entry = "typed" | "pasted";

export type SanitizeOptions = {
  locale: string;
  decimals: boolean;
  entry?: Entry;
};

/**
 * Reduces a raw entry to what the field may hold: digits, and at most one
 * decimal separator in the locale's own character.
 *
 * Never emits a minus sign. `MovementForm` states the invariant this rests on —
 * every numeric field in this app asks for a magnitude, and the wire applies
 * whatever sign the shape requires.
 */
export function sanitize(
  raw: string,
  { locale, decimals, entry = "pasted" }: SanitizeOptions,
): string {
  const { group, decimal } = separatorsFor(locale);

  if (!decimals) return raw.replace(/\D/g, "");

  const ungrouped =
    entry === "typed" ? raw.split(group).join("") : stripGrouping(raw, group);

  let result = "";
  let seenSeparator = false;

  for (const char of ungrouped) {
    if (char >= "0" && char <= "9") {
      result += char;
      continue;
    }
    // The first separator is the decimal point, whichever character was used
    // to type it. Any later one is a slip and is dropped.
    if (SEPARATOR_CHARS.test(char) && !seenSeparator) {
      result += decimal;
      seenSeparator = true;
    }
  }

  return result;
}

/** Inserts group separators into the whole part, leaving the fraction alone. */
export function groupWholePart(value: string, locale: string): string {
  const { group, decimal } = separatorsFor(locale);

  const at = value.indexOf(decimal);
  const whole = at === -1 ? value : value.slice(0, at);
  // Kept rather than trimmed: mid-typing, the fraction is often just the
  // separator the user pressed a moment ago.
  const rest = at === -1 ? "" : value.slice(at);

  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, group) + rest;
}

export type AccumulateOptions = { locale: string; places: number };

/**
 * The cents mask: digits fill from the right, so `2` is `0.02` and `20000` is
 * `200.00`. Money and percent type this way; nothing else does, because a
 * fixed number of decimal places is what makes it exact.
 *
 * An entry with no digits at all renders empty rather than `0.00`, and that
 * distinction carries meaning downstream: `AccountForm` sends `contribution_room`
 * as `null` when the field is blank and as `{ amount: 0 }` when it holds zero —
 * *not applicable* against *fully used*. A typed zero therefore survives, which
 * is why leading zeros are trimmed only down to a floor.
 */
export function accumulate(
  raw: string,
  { locale, places }: AccumulateOptions,
): string {
  const { decimal } = separatorsFor(locale);

  const digits = raw.replace(/\D/g, "").slice(0, MAX_ACCUMULATOR_DIGITS);
  if (digits === "") return "";

  const padded = digits.replace(/^0+/, "").padStart(places + 1, "0");
  if (places === 0) return groupWholePart(padded, locale);

  const whole = padded.slice(0, -places);
  const fraction = padded.slice(-places);

  return groupWholePart(`${whole}${decimal}${fraction}`, locale);
}

const isDigit = (char: string) => char >= "0" && char <= "9";

/**
 * How many significant characters precede the caret — the only stable way to
 * describe its position across a reformat, because a group separator appearing
 * or disappearing to the left moves every character index but no significant
 * one.
 *
 * Pass `decimal` to count the decimal separator as significant too. Without it,
 * a caret resting just after a freshly typed `1.` counts one character and
 * lands back before the point, so the next digit arrives on the wrong side of
 * it — `1.2` typed as `12.`.
 */
export function countSignificantBefore(
  value: string,
  caretIndex: number,
  decimal?: string,
): number {
  let count = 0;

  for (const char of value.slice(0, caretIndex)) {
    if (isDigit(char) || (decimal !== undefined && char === decimal))
      count += 1;
  }

  return count;
}

/** The inverse: the character index just after the nth significant character. */
export function caretAfterSignificant(
  formatted: string,
  count: number,
  decimal?: string,
): number {
  if (count <= 0) return 0;

  let seen = 0;

  for (let index = 0; index < formatted.length; index += 1) {
    const char = formatted[index];
    if (isDigit(char) || (decimal !== undefined && char === decimal)) {
      seen += 1;
      if (seen === count) return index + 1;
    }
  }

  return formatted.length;
}
