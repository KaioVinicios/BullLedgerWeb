import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { PulseField } from "@/components/PulseField";
import { useMotionPreference } from "@/store/motionPreference";

const realMatchMedia = window.matchMedia;

/** Answers `prefers-reduced-motion` the way a system with it set would. */
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

beforeEach(() => {
  useMotionPreference.setState({ reduceMotion: false, hideBackground: false });
});

afterEach(() => {
  useMotionPreference.setState({ reduceMotion: false, hideBackground: false });
  window.matchMedia = realMatchMedia;
});

describe("PulseField", () => {
  it("lays the field down with its wave running", () => {
    const { container } = render(<PulseField />);

    expect(container.querySelector("[data-pulse-field]")).toBeInTheDocument();
    expect(container.querySelector("[data-pulse-wave]")).toBeInTheDocument();
  });

  it("is hidden from assistive technology, carrying nothing to read", () => {
    const { container } = render(<PulseField />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container).toHaveTextContent("");
  });

  it("goes altogether when the background is switched off", () => {
    useMotionPreference.setState({ hideBackground: true });
    const { container } = render(<PulseField />);

    expect(container.querySelector("[data-pulse-field]")).toBeNull();
  });

  it("goes altogether when every animation is switched off", () => {
    // The wider switch contains the narrower one: an animated background is
    // an animation, so it does not survive on its own stored `false`.
    useMotionPreference.setState({ reduceMotion: true });
    const { container } = render(<PulseField />);

    expect(container.querySelector("[data-pulse-field]")).toBeNull();
  });

  it("keeps the dots and drops the wave when the system asks for stillness", () => {
    // PRODUCT.md asks for a reduced-motion alternative rather than a removal,
    // and the texture was never the moving part.
    systemPrefersReducedMotion();
    const { container } = render(<PulseField />);

    expect(container.querySelector("[data-pulse-field]")).toBeInTheDocument();
    expect(container.querySelector("[data-pulse-wave]")).toBeNull();
  });
});
