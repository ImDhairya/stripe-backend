import "dotenv/config";
import {defineConfig} from "drizzle-kit";

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/models/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: {rejectUnauthorized: false}, // <-- CHANGE THIS LINE
  },
});
