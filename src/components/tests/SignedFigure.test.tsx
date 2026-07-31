import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SignedFigure } from "@/components/SignedFigure";
import i18n from "@/i18n/config";

describe("SignedFigure", () => {
  it("marks a gain with an explicit plus sign", () => {
    render(
      <SignedFigure
        value={{ amount: 12345, currency: "USD" }}
        locale="en-US"
      />,
    );

    expect(screen.getByText(/^\+/)).toBeInTheDocument();
  });

  it("marks a loss with an explicit minus sign", () => {
    render(
      <SignedFigure
        value={{ amount: -12345, currency: "USD" }}
        locale="en-US"
      />,
    );

    expect(screen.getByText(/^-/)).toBeInTheDocument();
  });

  it("states the direction in text, so it never depends on colour alone", () => {
    const { container } = render(
      <SignedFigure
        value={{ amount: -12345, currency: "USD" }}
        locale="en-US"
      />,
    );

    expect(container.textContent).toMatch(/loss/i);
  });

  it("treats zero as neither a gain nor a loss", () => {
    const { container } = render(
      <SignedFigure value={{ amount: 0, currency: "USD" }} locale="en-US" />,
    );

    expect(container.textContent).not.toMatch(/gain|loss/i);
  });

  describe("without an explicit locale", () => {
    afterEach(async () => {
      await act(async () => {
        await i18n.changeLanguage("en");
      });
    });

    it("follows the active interface language", async () => {
      render(<SignedFigure value={{ amount: 123456, currency: "BRL" }} />);

      expect(screen.getByText(/1,234\.56/)).toBeInTheDocument();

      await act(async () => {
        await i18n.changeLanguage("pt");
      });

      expect(screen.getByText(/1\.234,56/)).toBeInTheDocument();
    });
  });
});
