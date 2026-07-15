import "../lib/tracing";
import {createWorker, INBOUND_STRIPE_EVENTS_QUEUE, OUTBOUND_WEBHOOKS_QUEUE, DAILY_CLEANUP_QUEUE, cleanupQueue} from "../lib/bullmq";
import {processInboundStripe} from "./processors/inbound-stripe";
import {processOutboundWebhook} from "./processors/outbound-webhook";
import {processDailyCleanup} from "./processors/daily-cleanup";
import pino from "pino";

const logger = pino({ name: "worker-daemon" });

logger.info("Starting worker daemon...");

const inboundWorker = createWorker(INBOUND_STRIPE_EVENTS_QUEUE, processInboundStripe);
const outboundWorker = createWorker(OUTBOUND_WEBHOOKS_QUEUE, processOutboundWebhook);
const cleanupWorker = createWorker(DAILY_CLEANUP_QUEUE, processDailyCleanup, 1);

// Schedule the nightly cleanup as a repeatable cron job — runs at midnight UTC every day.
// BullMQ deduplicates by pattern, so re-starting the worker won't create duplicate schedules.
const scheduleCleanup = async () => {
  await cleanupQueue.upsertJobScheduler(
    "nightly-db-cleanup",
    { pattern: "0 0 * * *" },       // every day at 00:00 UTC
    { name: "nightly-db-cleanup" },
  );
  logger.info("Nightly DB cleanup cron scheduled (midnight UTC)");
};

scheduleCleanup().catch((err) => {
  logger.error({ err }, "Failed to schedule nightly cleanup cron");
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down workers...");
  await inboundWorker.close();
  await outboundWorker.close();
  await cleanupWorker.close();
  process.exit(0);
});
