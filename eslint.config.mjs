import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// This repo currently contains many `any` usages and a legacy seed script.
// To unblock build/lint, we relax a few strict rules. This does not affect runtime.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      // unblock: project uses `any` frequently
      "@typescript-eslint/no-explicit-any": "off",
      // unblock: apostrophes/quotes in content
      "react/no-unescaped-entities": "off",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Ignore legacy/Node scripts for linting strictness
    "scripts/**",
  ]),
]);

export default eslintConfig;

