import "../lib/tracing";
import {createWorker, INBOUND_STRIPE_EVENTS_QUEUE, OUTBOUND_WEBHOOKS_QUEUE} from "../lib/bullmq";
import {processInboundStripe} from "./processors/inbound-stripe";
import {processOutboundWebhook} from "./processors/outbound-webhook";
import pino from "pino";

const logger = pino({ name: "worker-daemon" });

logger.info("Starting worker daemon...");

const inboundWorker = createWorker(INBOUND_STRIPE_EVENTS_QUEUE, processInboundStripe);
const outboundWorker = createWorker(OUTBOUND_WEBHOOKS_QUEUE, processOutboundWebhook);

process.on("SIGTERM", async () => {
  logger.info("Shutting down workers...");
  await inboundWorker.close();
  await outboundWorker.close();
  process.exit(0);
});
