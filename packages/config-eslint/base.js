import js from "@eslint/js";
import parser from "@typescript-eslint/parser";
import tseslint from "typescript-eslint";
import noLiteralStrings from "./rules/no-literal-strings.js";

/** Local plugin: the rule lives in this package so every app lints with the same copy. */
const rsvp = { rules: { "no-literal-strings": noLiteralStrings } };

/** Strings that are not language: brand name and technical path fragments rendered next to translated text. */
export const ALLOWED_LITERALS = ["RSVP", "· /c/"];

/**
 * Screens whose copy still lives in the component. This is a debt list, not a permission: every
 * entry belongs to another lane and must be removed when that lane moves its text into the
 * catalogs (`packages/i18n/locales`). Adding an entry needs a reason in review.
 */
export const LEGACY_LITERAL_FILES = [
  "apps/seo-web/app/c/[[]slug]/rsvp/[[]token]/page.tsx", // F15/F16 guest RSVP page
  "apps/seo-web/components/rsvp/**" // F15/F16 RSVP form and status
];

/** Every file that renders visible text for people. */
export const SCREEN_FILES = [
  "apps/universal/app/**/*.tsx",
  "apps/universal/src/**/*.tsx",
  "apps/seo-web/app/**/*.tsx",
  "apps/seo-web/components/**/*.tsx",
  "packages/ui/src/**/*.tsx",
  "packages/ui-web/src/**/*.tsx",
  "packages/celebration-theme/src/**/*.tsx"
];

/**
 * Code-quality rules for the whole monorepo (F01, REQ-F01-04). Type-aware rules are left out on
 * purpose: `tsc` already runs in every workspace's `typecheck`; these catch what tsc does not.
 */
const codeQuality = tseslint.config(
  { ignores: ["**/generated/**", "**/*.d.ts", "docs/**", "**/scripts/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "off",
      // tsc already reports undefined identifiers in TypeScript; the plain JS configs are tiny.
      "no-undef": "off",
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }]
    }
  }
);

export default [
  { ignores: ["**/dist/**", "**/.next/**", "**/.next-*/**", "**/test-results/**", "**/playwright-report/**", "**/node_modules/**", "**/web-build/**", "**/web-build-*/**", "**/.expo/**", "**/coverage/**"] },
  ...codeQuality,
  {
    files: SCREEN_FILES,
    ignores: ["**/*.test.tsx", "**/test/**", "**/tests/**", ...LEGACY_LITERAL_FILES],
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" } },
    plugins: { rsvp },
    rules: { "rsvp/no-literal-strings": ["error", { allow: ALLOWED_LITERALS }] }
  }
];
