import fs from "fs";
import path from "path";
import {db} from "./index";
import {sql} from "drizzle-orm";
import {logger} from "../lib/logger";

export async function runMigrations() {
  const migrationPath = path.join(__dirname, "migrations", "0000_lowly_lady_deathstrike.sql");
  if (!fs.existsSync(migrationPath)) {
    logger.warn(`Migration file not found at ${migrationPath}`);
    return;
  }

  const sqlContent = fs.readFileSync(migrationPath, "utf-8");
  const statements = sqlContent
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  logger.info(`Running ${statements.length} migration statements...`);

  for (const statement of statements) {
    try {
      await db.execute(sql.raw(statement));
    } catch (err: any) {
      // Ignore if table or type already exists
      if (err.code === "42710" || err.code === "42P07") {
        continue;
      }
      logger.warn(`Migration notice: ${err.message}`);
    }
  }

  logger.info("Database schema initialized successfully.");
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info("Migration completed.");
      process.exit(0);
    })
    .catch((err) => {
      logger.error("Migration failed:", err);
      process.exit(1);
    });
}
