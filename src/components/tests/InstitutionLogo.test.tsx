import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { InstitutionLogo } from "@/components/InstitutionLogo";

/**
 * Radix resolves an avatar's image through `new window.Image()` rather than by
 * mounting the `<img>` and waiting, and jsdom never loads a network image — so
 * without this the loaded branch is unreachable and only the fallback is ever
 * testable. The stub answers the way an already-cached image does: `complete`
 * with a `naturalWidth`, which is exactly what Radix reads to decide.
 */
const RealImage = window.Image;

function stubImageLoading(outcome: "load" | "error") {
  window.Image = class {
    complete = true;
    naturalWidth = outcome === "load" ? 1 : 0;
    referrerPolicy = "";
    crossOrigin: string | null = null;
    src = "";

    addEventListener() {}
    removeEventListener() {}
  } as unknown as typeof window.Image;
}

afterEach(() => {
  window.Image = RealImage;
});

describe("InstitutionLogo", () => {
  // Queried through the DOM rather than by role: `alt=""` is deliberate — the
  // mark is decorative next to the name — so the element has no `img` role to
  // find it by.
  const markIn = (container: HTMLElement) => container.querySelector("img");

  it("shows the mark the user recorded", async () => {
    stubImageLoading("load");
    const { container } = render(
      <InstitutionLogo name="Nu Invest" logo="https://cdn.test/nu.png" />,
    );

    await waitFor(() =>
      expect(markIn(container)).toHaveAttribute(
        "src",
        "https://cdn.test/nu.png",
      ),
    );
  });

  it("falls back to initials when no logo was recorded", () => {
    const { container } = render(<InstitutionLogo name="Banco Inter" />);

    expect(screen.getByText("BI")).toBeInTheDocument();
    expect(markIn(container)).toBeNull();
  });

  it("falls back to initials when the recorded URL does not resolve", async () => {
    // The URL is the user's to get wrong, and a broken image would otherwise
    // leave a hole in every row of the table.
    stubImageLoading("error");
    render(
      <InstitutionLogo
        name="XP Investimentos"
        logo="https://cdn.test/gone.png"
      />,
    );

    expect(await screen.findByText("XI")).toBeInTheDocument();
  });

  it("takes at most two initials, from the first two words", () => {
    render(<InstitutionLogo name="Banco do Brasil Investimentos" />);

    expect(screen.getByText("BD")).toBeInTheDocument();
  });

  it("is hidden from assistive technology, because the name is always beside it", () => {
    const { container } = render(<InstitutionLogo name="Rico" />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
