import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PageContainer } from "@/components/PageContainer";

describe("PageContainer", () => {
  it("leaves a screen at the full content region by default", () => {
    render(
      <PageContainer>
        <p>figures</p>
      </PageContainer>,
    );

    // A table screen must not inherit a cap it never asked for.
    expect(screen.getByText("figures").parentElement?.className).not.toMatch(
      /max-w-/,
    );
  });

  it("gives a form its own measure", () => {
    render(
      <PageContainer width="form">
        <p>fields</p>
      </PageContainer>,
    );

    expect(screen.getByText("fields").parentElement).toHaveClass("max-w-3xl");
  });

  it("gives a form that reads beside something more room than the form measure", () => {
    render(
      <PageContainer width="form-wide">
        <p>fields and a summary</p>
      </PageContainer>,
    );

    // The target form puts a live summary panel next to its fields. Pinned to
    // the token rather than to "wider than form", because the point of this
    // module is that the number lives in one place.
    expect(screen.getByText("fields and a summary").parentElement).toHaveClass(
      "max-w-5xl",
    );
  });

  it("does not centre the column", () => {
    render(
      <PageContainer width="form">
        <p>fields</p>
      </PageContainer>,
    );

    // The left edge stays put across navigations. Centring would move it
    // whenever a narrow screen follows a wide one.
    expect(screen.getByText("fields").parentElement?.className).not.toMatch(
      /\bmx-auto\b/,
    );
  });
});
