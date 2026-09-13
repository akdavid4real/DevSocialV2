import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
