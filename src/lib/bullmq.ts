import {Queue, Worker, QueueEvents} from "bullmq";
import Redis from "ioredis";
import env from "./env";
import pino from "pino";

const logger = pino({ name: "bullmq" });

export const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const INBOUND_STRIPE_EVENTS_QUEUE = "inbound-stripe-events";
export const OUTBOUND_WEBHOOKS_QUEUE = "outbound-webhooks";
export const DAILY_CLEANUP_QUEUE = "daily-cleanup";

export const inboundQueue = new Queue(INBOUND_STRIPE_EVENTS_QUEUE, { connection: connection as any });
export const outboundQueue = new Queue(OUTBOUND_WEBHOOKS_QUEUE, { connection: connection as any });
export const cleanupQueue = new Queue(DAILY_CLEANUP_QUEUE, { connection: connection as any });

export const createWorker = (queueName: string, processor: any, concurrency: number = 5) => {
  const worker = new Worker(queueName, processor, { connection: connection as any, concurrency });
  
  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, queueName }, "Job completed successfully");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, queueName, err }, "Job failed");
  });

  return worker;
};
