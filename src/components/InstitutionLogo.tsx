import { Avatar as AvatarPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * An institution's own mark, wherever the institution is named.
 *
 * **Recognition, not decoration.** A user scanning a list of custodians reads
 * the Nubank purple or the XP black before they read either name, so the mark
 * earns its row width by making the list scannable — `PRODUCT.md`'s "earned
 * familiarity". It never appears without the name beside it, which is why the
 * whole tile is `aria-hidden`: to assistive technology it is a duplicate of
 * text already in the cell, and an `alt` here would make every row say the
 * institution twice.
 *
 * **A tile, not a circle.** `ui/avatar` crops to a circle with `object-cover`,
 * which is right for a face and wrong for a brand: a wordmark loses its ends
 * and a square logotype loses its corners. This composes the same Radix
 * primitive into a rounded square that *contains* the image, so whatever the
 * user pasted arrives intact.
 *
 * **The image sits on white; the fallback does not.** A logo is an arbitrary
 * third-party asset — usually a transparent PNG drawn in dark ink, which
 * vanishes on a dark surface. A constant light tile is the only ground that
 * renders every mark legibly in both themes. The initials fallback has no such
 * problem, so it stays in the neutral ramp and rows without a logo add no
 * brightness to the table.
 */
const SIZES = {
  sm: "size-5 rounded-sm",
  default: "size-6 rounded-md",
  lg: "size-8 rounded-md",
} as const;

const TEXT = {
  sm: "text-[0.5rem]",
  default: "text-[0.625rem]",
  lg: "text-xs",
} as const;

/**
 * Up to two letters, from the first two words — the same shorthand a bank
 * statement uses. Spread before indexing so an astral first character survives
 * as one glyph instead of half a surrogate pair.
 */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("")
    .toUpperCase();
}

export function InstitutionLogo({
  name,
  logo,
  size = "default",
  className,
}: {
  name: string;
  /** The URL the user recorded on the institution, if they recorded one. */
  logo?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-border/70 bg-muted select-none",
        SIZES[size],
        className,
      )}
    >
      {logo && (
        <AvatarPrimitive.Image
          src={logo}
          alt=""
          // No inset: `object-contain` already keeps a wide mark whole, and a
          // padded full-bleed logo picks up a white hairline halo against the
          // tile it is supposed to fill.
          className="size-full bg-white object-contain"
        />
      )}
      {/* Delayed only when a logo is on its way, so a cached image never
          flashes its initials first. Without one there is nothing to wait for,
          and `undefined` is what makes Radix render on the first paint —
          `delayMs={0}` still costs a timeout, and the tile would blink empty. */}
      <AvatarPrimitive.Fallback
        delayMs={logo ? 300 : undefined}
        className={cn(
          "flex size-full items-center justify-center font-medium text-muted-foreground",
          TEXT[size],
        )}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
