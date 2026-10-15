import "../lib/tracing";
import {createWorker, INBOUND_STRIPE_EVENTS_QUEUE, OUTBOUND_WEBHOOKS_QUEUE} from "../lib/bullmq";
import {processInboundStripe} from "./processors/inbound-stripe";
import {processOutboundWebhook} from "./processors/outbound-webhook";
import pino from "pino";

const logger = pino({ name: "worker-daemon" });

let inboundWorker: any = null;
let outboundWorker: any = null;

export const startWorkers = () => {
  if (inboundWorker && outboundWorker) {
    return { inboundWorker, outboundWorker };
  }

  logger.info("Starting worker daemon...");
  inboundWorker = createWorker(INBOUND_STRIPE_EVENTS_QUEUE, processInboundStripe);
  outboundWorker = createWorker(OUTBOUND_WEBHOOKS_QUEUE, processOutboundWebhook);

  return { inboundWorker, outboundWorker };
};

export const stopWorkers = async () => {
  logger.info("Shutting down workers...");
  if (inboundWorker) await inboundWorker.close();
  if (outboundWorker) await outboundWorker.close();
  inboundWorker = null;
  outboundWorker = null;
};

// If run directly (e.g. node dist/worker/index.js or npm run worker)
if (require.main === module) {
  startWorkers();

  process.on("SIGTERM", async () => {
    await stopWorkers();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await stopWorkers();
    process.exit(0);
  });
}
