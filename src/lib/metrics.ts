import client from "prom-client";
import {inboundQueue, outboundQueue} from "./bullmq";
import {RequestHandler} from "express";

// Initialize default metrics (CPU, RAM, Event Loop)
client.collectDefaultMetrics();

// Custom Metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "code"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const webhookProcessingLag = new client.Gauge({
  name: "webhook_processing_lag_seconds",
  help: "Lag in processing inbound webhooks",
});

export const failedPaymentRetryQueueDepth = new client.Gauge({
  name: "failed_payment_retry_queue_depth",
  help: "Depth of the queue retrying failed payments/webhooks",
});

export const errorRates = new client.Counter({
  name: "app_error_rates_total",
  help: "Total number of errors encountered",
  labelNames: ["type", "component"],
});

// Async metric collection for BullMQ
setInterval(async () => {
  try {
    const inboundDepth = await inboundQueue.getJobCounts();
    const outboundDepth = await outboundQueue.getJobCounts();
    
    // Simplistic mapping for the specific metric requested
    failedPaymentRetryQueueDepth.set((outboundDepth.delayed || 0) + (outboundDepth.waiting || 0));
  } catch (e) {}
}, 5000);

export const metricsEndpoint: RequestHandler = async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.send(await client.register.metrics());
};
