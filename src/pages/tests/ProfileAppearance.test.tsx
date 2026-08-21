import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import app from "@/i18n/locales/en/app.json";
import { AppearanceSection } from "@/pages/Profile/AppearanceSection";
import { useMotionPreference } from "@/store/motionPreference";

const copy = app.profile.appearance;
const realMatchMedia = window.matchMedia;

function systemPrefersReducedMotion() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

const background = () =>
  screen.getByRole("checkbox", { name: copy.hideBackground });
const animations = () =>
  screen.getByRole("checkbox", { name: copy.reduceMotion });

beforeEach(() => {
  useMotionPreference.setState({ reduceMotion: false, hideBackground: false });
});

afterEach(() => {
  useMotionPreference.setState({ reduceMotion: false, hideBackground: false });
  window.matchMedia = realMatchMedia;
});

describe("AppearanceSection", () => {
  it("offers both switches, neither of them on to begin with", () => {
    render(<AppearanceSection />);

    expect(background()).not.toBeChecked();
    expect(animations()).not.toBeChecked();
    expect(screen.getByText(copy.reduceMotionHint)).toBeInTheDocument();
  });

  it("saves on the click, with no Save button to look for", async () => {
    render(<AppearanceSection />);

    await userEvent.click(background());

    expect(useMotionPreference.getState().hideBackground).toBe(true);
    expect(
      screen.queryByRole("button", { name: app.profile.actions.save }),
    ).not.toBeInTheDocument();
  });

  it("hands the wider switch the narrower one, and says which is winning", async () => {
    render(<AppearanceSection />);

    await userEvent.click(animations());

    expect(background()).toBeDisabled();
    expect(screen.getByText(copy.coveredByReduceMotion)).toBeInTheDocument();
    expect(screen.queryByText(copy.hideBackgroundHint)).not.toBeInTheDocument();
  });

  it("keeps showing what the background switch actually stores", async () => {
    // Not flipped to checked while it is overruled: the reader is owed the
    // truth about what they set, or they cannot tell which switch to undo.
    useMotionPreference.setState({ hideBackground: false });
    render(<AppearanceSection />);

    await userEvent.click(animations());

    expect(background()).not.toBeChecked();
    expect(useMotionPreference.getState().hideBackground).toBe(false);
  });

  it("gives the narrower switch back when the wider one is released", async () => {
    render(<AppearanceSection />);

    await userEvent.click(animations());
    await userEvent.click(animations());

    expect(background()).toBeEnabled();
    expect(screen.getByText(copy.hideBackgroundHint)).toBeInTheDocument();
  });

  it("says nothing about the system unless the system has said something", () => {
    render(<AppearanceSection />);

    expect(screen.queryByText(copy.systemReduced)).not.toBeInTheDocument();
  });

  it("states the system preference as a fact when it is set", () => {
    systemPrefersReducedMotion();
    render(<AppearanceSection />);

    expect(screen.getByText(copy.systemReduced)).toBeInTheDocument();
  });
});
