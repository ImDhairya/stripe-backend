import {Job} from "bullmq";
import Stripe from "stripe";
import {db} from "../../db";
import {stripeEvents, subscriptions} from "../../db/models";
import {eq} from "drizzle-orm";
import pino from "pino";

const logger = pino({ name: "inbound-stripe-processor" });

export const processInboundStripe = async (job: Job) => {
  const event = job.data as Stripe.Event;

  logger.info({ eventId: event.id, type: event.type }, "Processing inbound stripe event");

  try {
    // Example: Dunning process for failed subscription payments
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      if ((invoice as any).subscription) {
        // Mark local subscription as past_due
        const subId = (invoice as any).subscription as string;
        await db.update(subscriptions)
          .set({ status: "past_due" })
          .where(eq(subscriptions.processorSubscriptionId, subId));
        
        logger.info({ subId }, "Marked subscription as past_due due to payment failure");
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await db.update(subscriptions)
        .set({ status: "canceled" })
        .where(eq(subscriptions.processorSubscriptionId, sub.id));
      
      logger.info({ subId: sub.id }, "Marked subscription as canceled");
    }

    // Mark event as processed
    await db.update(stripeEvents)
      .set({ processed: true })
      .where(eq(stripeEvents.id, event.id));
      
  } catch (err: any) {
    logger.error({ eventId: event.id, err }, "Failed to process stripe event");
    throw err;
  }
};
