import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import i18n from "i18next";

import common from "@/i18n/locales/en/common.json";
import { LanguageOptions } from "@/components/LanguageOptions";
import { ThemeOptions } from "@/components/ThemeOptions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function openMenu(children: React.ReactNode) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>menu</DropdownMenuTrigger>
        <DropdownMenuContent>{children}</DropdownMenuContent>
      </DropdownMenu>
    </ThemeProvider>,
  );
}

describe("ThemeOptions", () => {
  it("offers all three themes and marks the current one", async () => {
    openMenu(<ThemeOptions />);

    expect(
      await screen.findByRole("menuitemradio", { name: common.theme.light }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: common.theme.system }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: common.theme.dark }),
    ).toBeChecked();
  });
});

describe("LanguageOptions", () => {
  it("switches the interface language", async () => {
    openMenu(<LanguageOptions />);

    await userEvent.click(
      await screen.findByRole("menuitemradio", { name: common.language.pt }),
    );

    expect(i18n.resolvedLanguage).toBe("pt");

    // Leave the shared i18n instance as this suite found it.
    await i18n.changeLanguage("en");
  });
});
