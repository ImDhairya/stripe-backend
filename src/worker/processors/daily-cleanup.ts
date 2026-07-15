import {Job} from "bullmq";
import {db} from "../../db";
import {sql} from "drizzle-orm";
import pino from "pino";

const logger = pino({ name: "daily-cleanup" });

/**
 * Truncates all application tables nightly so the platform starts fresh each day.
 * Uses TRUNCATE ... CASCADE to handle foreign-key constraints in one statement.
 * Table order doesn't matter with CASCADE, but we list them explicitly for clarity.
 */
export const processDailyCleanup = async (_job: Job) => {
  logger.info("Starting nightly database cleanup...");

  const tables = [
    "webhook_events",
    "webhook_endpoints",
    "idempotency_keys",
    "audit_logs",
    "refunds",
    "subscriptions",
    "payments",
    "stripe_events",
    "users",
  ];

  await db.execute(sql.raw(`TRUNCATE TABLE ${tables.join(", ")} CASCADE`));

  logger.info({ tables }, "Nightly cleanup complete — all tables truncated");
};
