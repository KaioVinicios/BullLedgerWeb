import "i18next";

import type common from "./locales/en/common.json";
import type auth from "./locales/en/auth.json";
import type errors from "./locales/en/errors.json";
import type app from "./locales/en/app.json";

// Makes t() keys and namespaces type-checked against the English resources —
// a mistyped key or namespace fails the build. English is the source of truth;
// keep pt/ in structural parity with en/.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      auth: typeof auth;
      errors: typeof errors;
      app: typeof app;
    };
  }
}
