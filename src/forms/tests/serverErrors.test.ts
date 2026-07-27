import { describe, expect, it } from "vitest";

import {
  apiClientErrorFromBody,
  apiClientErrorFromTransport,
} from "@/lib/apiError";
import { partitionServerErrors } from "@/forms/serverErrors";

describe("partitionServerErrors", () => {
  it("keeps field errors addressable by their exact key", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: {
          email: ["This field is required."],
          "steps.0.rate": ["A valid number is required."],
          "steps.2.from_month": ["Must be a whole number of months."],
        },
      },
      400,
    );

    const { fieldErrors } = partitionServerErrors(error);

    expect(fieldErrors["steps.0.rate"]).toEqual([
      "A valid number is required.",
    ]);
    expect(fieldErrors["steps.2.from_month"]).toEqual([
      "Must be a whole number of months.",
    ]);
    expect(fieldErrors.email).toEqual(["This field is required."]);
  });

  it("routes non_field_errors and detail to the form level", () => {
    const error = apiClientErrorFromBody(
      {
        status: 400,
        message: "Invalid input.",
        errors: {
          non_field_errors: ["Only one target per scope."],
          detail: ["Not found."],
          email: ["Required."],
        },
      },
      400,
    );

    const { fieldErrors, formErrors } = partitionServerErrors(error);

    expect(formErrors).toEqual(["Only one target per scope.", "Not found."]);
    expect(fieldErrors).not.toHaveProperty("non_field_errors");
    expect(fieldErrors).not.toHaveProperty("detail");
  });

  it("returns empty maps for an error carrying no fields", () => {
    const { fieldErrors, formErrors } = partitionServerErrors(
      apiClientErrorFromTransport(new TypeError("Failed to fetch")),
    );

    expect(fieldErrors).toEqual({});
    expect(formErrors).toEqual([]);
  });
});
