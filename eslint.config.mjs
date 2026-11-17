import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // Logs go through src/lib/logger.ts (JSON lines, no personal data). CLI scripts, tests and
    // e2e print to the terminal on purpose.
    files: ["src/**/*.{ts,tsx}", "worker.ts"],
    rules: { "no-console": "error" },
  },
  {
    // One import order everywhere (auto-fixed by `bun run lint --fix`): node/bun built-ins,
    // packages, then @/ aliases, then relative files; alphabetical inside each group.
    // Side-effect imports ("server-only", CSS) are left where they are.
    rules: {
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "never",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "cloudflare-env.d.ts",
  ]),
]);

export default eslintConfig;
