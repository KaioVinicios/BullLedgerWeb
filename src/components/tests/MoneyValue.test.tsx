import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MoneyValue } from "@/components/MoneyValue";

describe("MoneyValue", () => {
  it("renders the formatted amount", () => {
    render(
      <MoneyValue value={{ amount: 123456, currency: "BRL" }} locale="pt-BR" />,
    );

    expect(screen.getByText(/1\.234,56/)).toBeInTheDocument();
  });

  it("renders on tabular numerals so columns align", () => {
    render(
      <MoneyValue value={{ amount: 100, currency: "USD" }} locale="en-US" />,
    );

    expect(screen.getByText(/1\.00/)).toHaveClass("tabular-nums");
  });

  it("loses no precision on a very large amount", () => {
    render(
      <MoneyValue
        value={{ amount: 900719925474099, currency: "USD" }}
        locale="en-US"
      />,
    );

    expect(screen.getByText(/9,007,199,254,740\.99/)).toBeInTheDocument();
  });
});
