import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { apiClientErrorFromBody } from "@/lib/apiError";
import { partitionServerErrors } from "@/forms/serverErrors";
import { TextField } from "@/forms/TextField";

const rejection = apiClientErrorFromBody(
  {
    status: 400,
    message: "Invalid input.",
    errors: {
      email: ["Enter a valid email address."],
      "steps.0.rate": ["A valid number is required."],
    },
  },
  400,
);

/** A minimal form standing in for a real one, to prove the wiring only. */
function Fixture() {
  const { fieldErrors } = partitionServerErrors(rejection);

  return (
    <form>
      <TextField name="email" label="Email" errors={fieldErrors.email ?? []} />
      <TextField
        name="steps.0.rate"
        label="Rate"
        errors={fieldErrors["steps.0.rate"] ?? []}
      />
      <TextField name="name" label="Name" errors={fieldErrors.name ?? []} />
    </form>
  );
}

describe("server errors on form inputs", () => {
  it("lands each message on the input that produced it", () => {
    render(<Fixture />);

    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Enter a valid email address.",
    );
    expect(screen.getByLabelText("Rate")).toHaveAccessibleDescription(
      "A valid number is required.",
    );
  });

  it("marks only the rejected inputs invalid", () => {
    render(<Fixture />);

    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("announces the message to assistive technology", () => {
    render(<Fixture />);

    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });
});
