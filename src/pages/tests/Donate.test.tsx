import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DonatePage } from "@/pages/Donate";
import app from "@/i18n/locales/en/app.json";
import common from "@/i18n/locales/en/common.json";
import type { DonationMethod } from "@/config/donations";

// The screen reads the environment through this module, and vite.config.ts
// gives the suite a full set of fake addresses. Mocking it is how the empty
// deployment — the branch no environment variable can produce mid-suite —
// becomes reachable.
const { donationMethods } = vi.hoisted(() => ({
  donationMethods: vi.fn<() => DonationMethod[]>(),
}));

vi.mock("@/config/donations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/config/donations")>()),
  donationMethods,
}));

const CONFIGURED: DonationMethod[] = [
  {
    id: "pix",
    region: "brazil",
    value: "11111111-2222-4333-8444-555555555555",
  },
  { id: "btc", region: "international", value: "bc1qexampleaddress" },
  { id: "usdtSolana", region: "international", value: "SoLanaExampleAddress" },
];

beforeEach(() => {
  donationMethods.mockReturnValue(CONFIGURED);
});

describe("the donation screen", () => {
  it("shows every configured address, grouped by where the reader is", () => {
    render(<DonatePage />);

    const brazil = screen.getByRole("region", {
      name: app.donate.regions.brazil,
    });
    const international = screen.getByRole("region", {
      name: app.donate.regions.international,
    });

    expect(within(brazil).getByText(CONFIGURED[0].value)).toBeInTheDocument();
    expect(
      within(international).getByText(CONFIGURED[1].value),
    ).toBeInTheDocument();
    expect(
      within(international).getByText(CONFIGURED[2].value),
    ).toBeInTheDocument();
    // A Brazilian key must never surface under the international heading:
    // the split is the whole point of the grouping.
    expect(
      within(international).queryByText(CONFIGURED[0].value),
    ).not.toBeInTheDocument();
  });

  it("omits a region the deployment configured nothing for", () => {
    // A Brazil-only deployment must not print an empty "International"
    // heading over nothing.
    donationMethods.mockReturnValue([CONFIGURED[0]]);

    render(<DonatePage />);

    expect(screen.getByText(app.donate.regions.brazil)).toBeInTheDocument();
    expect(
      screen.queryByText(app.donate.regions.international),
    ).not.toBeInTheDocument();
  });

  it("warns about the network before the addresses it applies to", () => {
    render(<DonatePage />);

    const warning = screen.getByText(app.donate.networkWarning);
    const address = screen.getByText(CONFIGURED[1].value);

    // Sending USDT on the wrong chain loses the money, so the warning has to
    // reach the reader before they copy — not underneath what they copied.
    expect(
      warning.compareDocumentPosition(address) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("copies an address and confirms it where the reader is looking", async () => {
    // `setup()` installs jsdom's missing clipboard itself, so the assertion
    // reads back through the same stub the component wrote to.
    const user = userEvent.setup();

    render(<DonatePage />);

    const button = screen.getByRole("button", {
      name: new RegExp(app.donate.methods.btc.label),
    });
    await user.click(button);

    expect(await navigator.clipboard.readText()).toBe(CONFIGURED[1].value);
    // Confirmed on the control the reader just pressed, not in a corner of
    // the screen they are not looking at.
    expect(button).toHaveTextContent(common.copy.done);
    // And the accessible name follows the visible word, so the button is
    // still addressable by what it says (WCAG 2.5.3).
    expect(button).toHaveAccessibleName(new RegExp(`^${common.copy.done}\\b`));
  });

  it("names what each button copies, so five of them are told apart", () => {
    render(<DonatePage />);

    // Every copy button reads "Copy" on screen. Without a distinct accessible
    // name a screen-reader user hears the same word three times and has no
    // way to know which address they are about to take.
    const names = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));

    expect(new Set(names).size).toBe(names.length);
  });

  it("says so plainly when the deployment funds nobody", () => {
    donationMethods.mockReturnValue([]);

    render(<DonatePage />);

    expect(screen.getByText(app.donate.empty.title)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
