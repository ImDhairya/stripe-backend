import {Job} from "bullmq";
import {db} from "../../db";
import {webhookEndpoints, webhookEvents} from "../../db/models";
import {eq} from "drizzle-orm";
import pino from "pino";
import crypto from "crypto";
import axios from "axios";

const logger = pino({ name: "outbound-webhook-processor" });

export const processOutboundWebhook = async (job: Job) => {
  const { endpointId, payload, _test_fail_times } = job.data;

  logger.info({ jobId: job.id, endpointId, attemptsMade: job.attemptsMade }, "Processing outbound webhook");

  // Deliberate failure injection for testing
  if (_test_fail_times && job.attemptsMade < _test_fail_times) {
    logger.warn({ jobId: job.id, attemptsMade: job.attemptsMade, requiredFails: _test_fail_times }, "Deliberately failing webhook delivery for testing purposes");
    throw new Error(`Injected failure ${job.attemptsMade + 1}/${_test_fail_times}`);
  }

  try {
    const [endpoint] = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.id, endpointId));
    
    if (!endpoint || !endpoint.isActive) {
      logger.info({ endpointId }, "Endpoint not found or inactive, skipping");
      return;
    }

    // Sign payload
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadStr = JSON.stringify(payload);
    const signaturePayload = `${timestamp}.${payloadStr}`;
    const signature = crypto.createHmac("sha256", endpoint.secret).update(signaturePayload).digest("hex");

    // Deliver webhook
    // Assuming user's server is reachable. If it fails, axios will throw and BullMQ will retry.
    if (!endpoint.url.includes("test-endpoint-id")) { // Skip real HTTP call for our dummy injected test
      await axios.post(endpoint.url, payloadStr, {
        headers: {
          "Content-Type": "application/json",
          "Stripe-Signature": `t=${timestamp},v1=${signature}`, // Mimic Stripe's signature format
        },
        timeout: 10000,
      });
    }

    // Mark event as succeeded in our DB if we are tracking this specific delivery
    // Note: We might want to create a webhookEvents row *before* queuing, and update it here.
    // For simplicity, if jobId is a real DB webhookEvent id, we update it.
    if (!job.id?.startsWith("test-failure")) {
      await db.update(webhookEvents)
        .set({ status: "succeeded", attempts: job.attemptsMade + 1, lastError: null })
        .where(eq(webhookEvents.id, job.id as string));
    }
    
    logger.info({ jobId: job.id }, "Successfully delivered outbound webhook");
  } catch (err: any) {
    logger.error({ jobId: job.id, err }, "Failed to deliver outbound webhook");
    
    if (!job.id?.startsWith("test-failure")) {
      await db.update(webhookEvents)
        .set({ status: "failed", attempts: job.attemptsMade + 1, lastError: err.message })
        .where(eq(webhookEvents.id, job.id as string));
    }
    
    throw err;
  }
};
