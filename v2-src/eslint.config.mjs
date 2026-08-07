import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Our export target. `distDir` puts minified bundles here; linting them
    // buries the real findings under thousands of warnings from generated code.
    ".dist/**",
    ".v2-dist/**",
    "public/data/**",
  ]),
]);

export default eslintConfig;
