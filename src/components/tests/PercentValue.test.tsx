import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PercentValue } from "@/components/PercentValue";
import i18n from "@/i18n/config";

describe("PercentValue", () => {
  it("renders a decimal fraction as a percentage", () => {
    render(<PercentValue value="0.1375" locale="en-US" />);

    expect(screen.getByText(/13\.75%/)).toBeInTheDocument();
  });

  it("renders on tabular numerals", () => {
    render(<PercentValue value="0.1375" locale="en-US" />);

    expect(screen.getByText(/13\.75%/)).toHaveClass("tabular-nums");
  });

  describe("without an explicit locale", () => {
    afterEach(async () => {
      await act(async () => {
        await i18n.changeLanguage("en");
      });
    });

    it("follows the active interface language", async () => {
      render(<PercentValue value="0.1375" />);

      expect(screen.getByText(/13\.75%/)).toBeInTheDocument();

      await act(async () => {
        await i18n.changeLanguage("pt");
      });

      expect(screen.getByText(/13,75%/)).toBeInTheDocument();
    });
  });
});
