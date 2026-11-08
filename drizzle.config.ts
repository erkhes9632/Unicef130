import { defineConfig } from "drizzle-kit";

// Only used to *generate* SQL migrations. They are applied with wrangler
// (`bun run db:migrate:local`), which reads `migrations_dir` from wrangler.jsonc.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  casing: "snake_case",
  strict: true,
  verbose: true,
});
