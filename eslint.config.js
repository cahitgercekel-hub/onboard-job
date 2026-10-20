import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // App code must use "@/lib/db" so demo mode can swap in the in-memory client.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/db.ts", "src/integrations/**", "src/test/**"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{ name: "@/integrations/supabase/client", message: "Import { supabase } from \"@/lib/db\" instead (demo mode)." }],
        patterns: [{ group: ["**/integrations/supabase/client"], message: "Import { supabase } from \"@/lib/db\" instead (demo mode)." }],
      }],
    },
  },
);
