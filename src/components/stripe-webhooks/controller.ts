import {RequestHandler} from "express";
import Stripe from "stripe";
import env from "../../lib/env";
import {db} from "../../db";
import {stripeEvents} from "../../db/models";
import {inboundQueue} from "../../lib/bullmq";
import {asyncHandler} from "../../lib/async-handler";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20" as any,
});

export const handleStripeWebhook = asyncHandler(
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const rawBody = (req as any).rawBody;

    if (!signature || !rawBody) {
      return res.status(400).json({ error: "Missing signature or raw body" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Deduplicate event using Postgres table
    try {
      await db.insert(stripeEvents).values({
        id: event.id,
        type: event.type,
        processed: false
      });
    } catch (err: any) {
      if (err.code === "23505") { // Postgres unique_violation
        // Already received this event, ignore it safely
        return res.status(200).json({ received: true, duplicate: true });
      }
      throw err;
    }

    // Enqueue for processing
    await inboundQueue.add(event.type, event, {
      jobId: event.id,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000
      }
    });

    return res.status(200).json({ received: true });
  }
);
