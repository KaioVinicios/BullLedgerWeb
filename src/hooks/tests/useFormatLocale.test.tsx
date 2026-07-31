import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { useFormatLocale } from "@/hooks/useFormatLocale";
import i18n from "@/i18n/config";

function Probe() {
  return <span data-testid="tag">{useFormatLocale()}</span>;
}

describe("useFormatLocale", () => {
  // The i18n instance is shared across the whole suite; leave it as found or
  // every later file inherits Portuguese.
  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
  });

  it("follows the active interface language", async () => {
    render(<Probe />);

    expect(screen.getByTestId("tag")).toHaveTextContent("en-US");

    await act(async () => {
      await i18n.changeLanguage("pt");
    });

    expect(screen.getByTestId("tag")).toHaveTextContent("pt-BR");
  });
});
