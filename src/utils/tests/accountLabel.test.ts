import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";

import {
  accountLabel,
  compareAccounts,
  type AccountLike,
} from "@/utils/accountLabel";

/** The registration labels the app renders; the real `t` reads the same keys. */
const LABELS: Record<string, string> = {
  "enums.registration.BR_TAXABLE": "Taxable",
  "enums.registration.BR_PREV_VGBL": "VGBL",
  "enums.registration.CA_TFSA": "TFSA",
};
const t = ((key: string) => LABELS[key] ?? key) as unknown as TFunction<"app">;

const account = (over: Partial<AccountLike> = {}): AccountLike => ({
  name: "",
  institution_name: "Santander",
  registration: "BR_TAXABLE",
  ...over,
});

describe("accountLabel", () => {
  it("renders the institution alone for a plain taxable account", () => {
    expect(accountLabel(account(), t)).toBe("Santander");
  });

  it("appends the wrapper when the registration is a real one", () => {
    expect(accountLabel(account({ registration: "BR_PREV_VGBL" }), t)).toBe(
      "Santander · VGBL",
    );
  });

  it("prefers the nickname the user typed over the wrapper", () => {
    expect(
      accountLabel(
        account({ name: "Secondary", registration: "BR_PREV_VGBL" }),
        t,
      ),
    ).toBe("Santander · Secondary");
  });

  it("drops the institution when the nickname already names it", () => {
    expect(accountLabel(account({ name: "Santander account" }), t)).toBe(
      "Santander account",
    );
  });

  it("ignores accents and case when detecting that repetition", () => {
    expect(
      accountLabel(
        account({ institution_name: "Itaú", name: "conta ITAU" }),
        t,
      ),
    ).toBe("conta ITAU");
  });

  it("falls back to the nickname when the account has no institution", () => {
    expect(
      accountLabel(account({ institution_name: "", name: "Vault" }), t),
    ).toBe("Vault");
  });

  it("survives a row whose name the schema marks optional", () => {
    expect(accountLabel(account({ name: undefined }), t)).toBe("Santander");
  });

  it("omits the wrapper when the caller renders it in its own column", () => {
    expect(
      accountLabel(account({ registration: "CA_TFSA" }), t, {
        withRegistration: false,
      }),
    ).toBe("Santander");
  });

  it("keeps the nickname when the wrapper is suppressed", () => {
    expect(
      accountLabel(account({ name: "Secondary" }), t, {
        withRegistration: false,
      }),
    ).toBe("Santander · Secondary");
  });
});

describe("compareAccounts", () => {
  it("groups an institution's accounts together, nickname breaking the tie", () => {
    const rows = [
      account({ institution_name: "Zeta" }),
      account({ institution_name: "Alpha", name: "Second" }),
      account({ institution_name: "Alpha", name: "First" }),
    ];

    expect(
      [...rows]
        .sort(compareAccounts)
        .map((row) => [row.institution_name, row.name]),
    ).toEqual([
      ["Alpha", "First"],
      ["Alpha", "Second"],
      ["Zeta", ""],
    ]);
  });

  it("sorts an account with no institution last", () => {
    const rows = [
      account({ institution_name: "", name: "Vault" }),
      account({ institution_name: "Zeta" }),
    ];

    expect([...rows].sort(compareAccounts)[0].institution_name).toBe("Zeta");
  });
});
