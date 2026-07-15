import {RequestHandler} from "express";
import {asyncHandler} from "../../lib/async-handler";
import {outboundQueue} from "../../lib/bullmq";
import {v4 as uuidv4} from "uuid";

export const injectFailureHandler = asyncHandler(
  async (req, res) => {
    const jobId = `test-failure-${uuidv4()}`;

    // Add a job to the outbound queue designed to fail exactly 3 times
    await outboundQueue.add("webhook-delivery", {
      _test_fail_times: 3, // special flag picked up by worker
      endpointId: "test-endpoint-id", // dummy endpoint ID
      payload: {
        event: "payment.succeeded",
        id: "pay_test123",
        amount: 1000,
        currency: "usd"
      }
    }, {
      jobId,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000 // 2 second base backoff for test visibility
      }
    });

    return res.status(200).json({
      success: true,
      message: "Deliberate failure job enqueued. It will fail 3 times before succeeding.",
      jobId
    });
  }
);
