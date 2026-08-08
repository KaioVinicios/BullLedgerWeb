import { useLayoutEffect, useRef } from "react";

import {
  accumulate,
  caretAfterSignificant,
  countSignificantBefore,
  groupWholePart,
  sanitize,
  separatorsFor,
  type Entry,
} from "@/utils/numericInput";

/**
 * `accumulate` fills from the right at a fixed number of places — money and
 * percent. `grouped` types left to right and groups thousands as they appear —
 * quantities, prices, rates, and counts, whose scales are too large for a mask.
 */
export type NumericMode = "accumulate" | "grouped";

type UseNumericInputOptions = {
  mode: NumericMode;
  locale: string;
  /** The controlled value, needed to tell a no-op deletion from a real one. */
  value: string;
  onChange: (value: string) => void;
  /** `accumulate`: decimal places the mask holds. */
  places?: number;
  /** `grouped`: maximum fraction digits, or 0 for an integer field. */
  scale?: number;
  /** `grouped`: maximum digits before the separator. */
  integerDigits?: number;
};

/**
 * Turns a raw keystroke into the value the field is allowed to hold, and puts
 * the caret where the typist expects it.
 *
 * The caret is the whole reason this is a hook rather than a formatter. React
 * re-renders a controlled input with a value the browser did not produce, which
 * resets the selection to the end; that is invisible while typing at the end of
 * a number and maddening while editing the middle of one. The position is
 * therefore computed during the change, stashed, and applied in a layout effect
 * once the new value is actually on the element.
 */
export function useNumericInput({
  mode,
  locale,
  value,
  onChange,
  places = 2,
  scale = 0,
  integerDigits,
}: UseNumericInputOptions) {
  // Captured from the change event rather than through a ref on the input.
  // The element is only ever needed in the instant after a change, and the
  // event hands it over — which spares the field a merged ref it would
  // otherwise have to thread past whatever ref its own caller passed.
  const inputRef = useRef<HTMLInputElement | null>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input || caretRef.current === null) return;

    input.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  });

  /**
   * Where the caret goes, and who puts it there.
   *
   * A change that alters the value schedules a render, so the layout effect
   * above owns the move. A change that does not — a rejected letter, a
   * separator that was already there — schedules nothing, and React instead
   * restores the controlled value straight onto the element, which drops the
   * caret at the end. Typing a letter in the middle of a number would send the
   * cursor to the far side of it. The microtask runs after that restore.
   */
  const applyCaret = (
    input: HTMLInputElement,
    position: number,
    changed: boolean,
  ) => {
    if (changed) {
      caretRef.current = position;
      return;
    }

    queueMicrotask(() => input.setSelectionRange(position, position));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    inputRef.current = event.target;

    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    const inputType = (event.nativeEvent as InputEvent).inputType ?? "";
    const data = (event.nativeEvent as InputEvent).data;
    const entry = entryKind(raw, value, inputType, data);

    if (mode === "accumulate") {
      // A pasted number is not a stream of keystrokes. Read as one, `1.5`
      // becomes `0.15` — the point discarded and the amount divided by ten,
      // which in a ledger is the worst kind of wrong, because it is plausible.
      const next =
        entry === "pasted"
          ? fixPlaces(sanitize(raw, { locale, decimals: true, entry }), {
              locale,
              places,
            })
          : accumulate(raw, { locale, places });

      // Backspace on `0.00` leaves digits `000`, which the zero floor renders
      // straight back as `0.00` — the field would be unclearable. A deletion
      // that changes nothing is a deletion the user meant, so honour it.
      const cleared = inputType.startsWith("delete") && next === value;
      const settled = cleared ? "" : next;

      applyCaret(event.target, settled.length, settled !== value);
      onChange(settled);
      return;
    }

    const { decimal } = separatorsFor(locale);
    const decimals = scale > 0;

    // An Android decimal keypad emits `.` whatever the interface language is,
    // and in pt-BR that character is the *group* separator. Translating the
    // keystroke here — where the caret says exactly which character was just
    // inserted — is what keeps the sanitizer free of guesswork downstream.
    const translated =
      entry === "typed" && decimals && isForeignSeparator(data, decimal)
        ? replaceAt(raw, caret - 1, decimal)
        : raw;

    const clamped = clamp(sanitize(translated, { locale, decimals, entry }), {
      decimal,
      scale,
      integerDigits,
    });
    const next = groupWholePart(clamped, locale);

    applyCaret(
      event.target,
      caretAfterSignificant(
        next,
        countSignificantBefore(translated, caret, decimal),
        decimal,
      ),
      next !== value,
    );
    onChange(next);
  };

  return handleChange;
}

const SEPARATORS = [".", ","];

function isForeignSeparator(
  data: string | null,
  decimal: string,
): data is string {
  return data !== null && data !== decimal && SEPARATORS.includes(data);
}

function replaceAt(value: string, index: number, char: string): string {
  if (index < 0) return value;

  return value.slice(0, index) + char + value.slice(index + 1);
}

/**
 * Pads or trims a sanitized entry to exactly the places the mask holds, so a
 * pasted `1.5` settles at `1.50` rather than being re-read digit by digit.
 */
function fixPlaces(
  value: string,
  { locale, places }: { locale: string; places: number },
): string {
  if (value === "") return "";

  const { decimal } = separatorsFor(locale);
  const at = value.indexOf(decimal);
  const whole = (at === -1 ? value : value.slice(0, at)).replace(
    /^0+(?=\d)/,
    "",
  );
  const fraction = at === -1 ? "" : value.slice(at + 1);

  if (places === 0) return groupWholePart(whole || "0", locale);

  return groupWholePart(
    `${whole || "0"}${decimal}${fraction.slice(0, places).padEnd(places, "0")}`,
    locale,
  );
}

/**
 * Whether this change is one edit to a value this module formatted, or a whole
 * number arriving at once.
 *
 * The length comparison is the load-bearing part. Playwright's `fill()` and
 * some mobile keyboards replace the entire value without reporting `data`, and
 * reading those as single keystrokes would strip a pasted `19.40` down to
 * `1940` in a locale where `.` groups.
 */
function entryKind(
  raw: string,
  previous: string,
  inputType: string,
  data: string | null,
): Entry {
  if (inputType.includes("Paste") || inputType.includes("Drop"))
    return "pasted";
  // One character inserted is a keystroke even when it replaced a selection,
  // which the length comparison below would otherwise misread as a paste.
  if (data !== null) return data.length > 1 ? "pasted" : "typed";
  if (Math.abs(raw.length - previous.length) > 1) return "pasted";

  return "typed";
}

/** Holds the entry inside the digit counts the API's own pattern allows. */
function clamp(
  value: string,
  {
    decimal,
    scale,
    integerDigits,
  }: { decimal: string; scale: number; integerDigits?: number },
): string {
  const at = value.indexOf(decimal);
  const whole = at === -1 ? value : value.slice(0, at);
  const fraction = at === -1 ? null : value.slice(at + 1);

  const cappedWhole = integerDigits ? whole.slice(0, integerDigits) : whole;
  if (fraction === null) return cappedWhole;

  return `${cappedWhole}${decimal}${fraction.slice(0, scale)}`;
}
