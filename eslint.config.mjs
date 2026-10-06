import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".next/**", "src/generated/**", "next-env.d.ts"]),
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/server/**", "src/generated/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: ["@/generated/prisma/*", "**/generated/prisma/*"],
        paths: ["@prisma/client", "@prisma/adapter-pg", "pg"],
      }],
    },
  },
]);
