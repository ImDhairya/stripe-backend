import {Job} from "bullmq";
import {db} from "../../db";
import {webhookEndpoints, webhookEvents} from "../../db/models";
import {eq} from "drizzle-orm";
import pino from "pino";
import crypto from "crypto";
import axios from "axios";
import {webhookProcessingLag} from "../../lib/metrics";

const logger = pino({ name: "outbound-webhook-processor" });

export const processOutboundWebhook = async (job: Job) => {
  const { endpointId, payload, _test_fail_times, webhookEventId } = job.data;
  const eventId = webhookEventId || job.id;

  // Measure and record lag in Prometheus metrics
  const enqueuedAt = job.data.enqueuedAt || job.timestamp || Date.now();
  const lagSeconds = Math.max(0, (Date.now() - enqueuedAt) / 1000);
  webhookProcessingLag.set(lagSeconds);

  const currentAttempt = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts || 5;

  logger.info(
    { jobId: job.id, eventId, endpointId, attempt: currentAttempt, maxAttempts, lagSeconds },
    "Processing outbound webhook",
  );

  try {
    // Deliberate failure injection for testing exponential backoff
    if (_test_fail_times && job.attemptsMade < _test_fail_times) {
      logger.warn(
        { jobId: job.id, attempt: currentAttempt, requiredFails: _test_fail_times },
        "Simulating deliberate webhook failure for testing backoff",
      );
      throw new Error(`Deliberate simulated failure ${currentAttempt}/${_test_fail_times}`);
    }

    const [endpoint] = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, endpointId));

    if (!endpoint || !endpoint.isActive) {
      logger.info({ endpointId }, "Endpoint not found or inactive, skipping delivery");
      if (eventId) {
        await db
          .update(webhookEvents)
          .set({
            status: "failed",
            attempts: currentAttempt,
            lastError: !endpoint ? "Endpoint not found" : "Endpoint is inactive",
            nextAttemptAt: null,
          })
          .where(eq(webhookEvents.id, eventId));
      }
      return;
    }

    // Sign payload using HMAC-SHA256
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadStr = JSON.stringify(payload);
    const signaturePayload = `${timestamp}.${payloadStr}`;
    const signature = crypto
      .createHmac("sha256", endpoint.secret)
      .update(signaturePayload)
      .digest("hex");

    // Deliver webhook via HTTP POST
    if (!endpoint.url.includes("test-endpoint-id")) {
      await axios.post(endpoint.url, payloadStr, {
        headers: {
          "Content-Type": "application/json",
          "Stripe-Signature": `t=${timestamp},v1=${signature}`,
        },
        timeout: 10000,
      });
    }

    // On HTTP 2xx success, update webhookEvents record
    if (eventId) {
      await db
        .update(webhookEvents)
        .set({
          status: "succeeded",
          attempts: currentAttempt,
          lastError: null,
          nextAttemptAt: null,
        })
        .where(eq(webhookEvents.id, eventId));
    }

    logger.info({ jobId: job.id, eventId }, "Successfully delivered outbound webhook");
  } catch (err: any) {
    const isFinal = currentAttempt >= maxAttempts;
    // Calculate exponential backoff nextAttemptAt: 2000ms * 2^attemptsMade
    const backoffDelayMs = 2000 * Math.pow(2, job.attemptsMade);
    const nextAttemptAt = isFinal ? null : new Date(Date.now() + backoffDelayMs);

    logger.error(
      { jobId: job.id, eventId, attempt: currentAttempt, isFinal, err: err.message },
      "Failed to deliver outbound webhook",
    );

    if (eventId) {
      await db
        .update(webhookEvents)
        .set({
          status: isFinal ? "failed" : "pending",
          attempts: currentAttempt,
          lastError: err.message || "Unknown delivery error",
          nextAttemptAt,
        })
        .where(eq(webhookEvents.id, eventId));
    }

    throw err;
  }
};
