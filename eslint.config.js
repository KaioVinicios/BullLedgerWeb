import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier/flat";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // src/types/api.d.ts is generated from the OpenAPI schema. Linting or
  // formatting it would make the CI drift diff meaningless.
  globalIgnores(["dist", "src/types/api.d.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettierConfig,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // shadcn-generated files export cva variants next to components, and
    // route files export route objects — both are incompatible with the
    // components-only constraint fast refresh wants.
    files: ["src/components/ui/**/*.tsx", "src/routes/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
]);
