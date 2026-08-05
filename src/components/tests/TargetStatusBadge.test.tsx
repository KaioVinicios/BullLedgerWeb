import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { TargetStatusBadge } from "@/components/TargetStatusBadge";
import app from "@/i18n/locales/en/app.json";
import { TARGET_STATUSES } from "@/schemas/apiEnums";

describe("TargetStatusBadge", () => {
  it("always renders the verdict as a word, never as a colour alone", () => {
    for (const status of TARGET_STATUSES) {
      const { unmount } = render(<TargetStatusBadge status={status} />);

      expect(screen.getByText(app.enums.targetStatus[status])).toBeVisible();
      unmount();
    }
  });

  it("gives each verdict its own icon, so the four survive greyscale", () => {
    const icons = TARGET_STATUSES.map((status) => {
      const { container, unmount } = render(
        <TargetStatusBadge status={status} />,
      );
      const icon = container.querySelector("svg")?.getAttribute("class") ?? "";
      unmount();

      return icon;
    });

    expect(new Set(icons).size).toBe(TARGET_STATUSES.length);
  });

  it("hides the icon from assistive technology, because the word already said it", () => {
    const { container } = render(<TargetStatusBadge status="AHEAD" />);

    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("spends a tone on the breached floor and on nothing else", () => {
    // PRODUCT.md principle 3: gains and losses are stated, not dramatized.
    // "Behind" is a fact, not an emergency.
    //
    // Read off `data-variant`, not the class string: `Badge`'s base classes
    // carry `aria-invalid:border-destructive`, so every badge in the app
    // contains the word "destructive" and a substring check proves nothing.
    const variants = TARGET_STATUSES.map((status) => {
      const { container, unmount } = render(
        <TargetStatusBadge status={status} />,
      );
      const variant =
        container.firstElementChild?.getAttribute("data-variant") ?? "";
      unmount();

      return [status, variant] as const;
    });

    expect(variants).toEqual([
      ["AHEAD", "outline"],
      ["ON_TRACK", "outline"],
      ["BEHIND", "outline"],
      ["BELOW_FLOOR", "destructive"],
    ]);
  });
});
