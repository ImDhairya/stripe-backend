import {Job} from "bullmq";
import Stripe from "stripe";
import {db} from "../../db";
import {stripeEvents, payments} from "../../db/models";
import {eq} from "drizzle-orm";
import pino from "pino";
import {dispatchWebhookEvent} from "../../lib/webhook-dispatcher";

const logger = pino({ name: "inbound-stripe-processor" });

export const processInboundStripe = async (job: Job) => {
  const event = job.data as Stripe.Event;

  logger.info({ eventId: event.id, type: event.type }, "Processing inbound stripe event");

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.processorPaymentId, paymentIntent.id));

      if (payment) {
        const [updated] = await db
          .update(payments)
          .set({
            status: "succeeded",
            capturedAmount: payment.amount,
          })
          .where(eq(payments.id, payment.id))
          .returning();

        if (updated) {
          logger.info({ paymentId: payment.id }, "Synced payment status to succeeded via webhook");

          await dispatchWebhookEvent(payment.userId, "payment.succeeded", {
            id: updated.id,
            amount: updated.amount,
            currency: updated.currency,
            status: updated.status,
            processor: updated.processor,
            capturedAmount: updated.capturedAmount,
          });
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.processorPaymentId, paymentIntent.id));

      if (payment) {
        const [updated] = await db
          .update(payments)
          .set({
            status: "failed",
          })
          .where(eq(payments.id, payment.id))
          .returning();

        if (updated) {
          logger.info({ paymentId: payment.id }, "Synced payment status to failed via webhook");

          await dispatchWebhookEvent(payment.userId, "payment.failed", {
            id: updated.id,
            amount: updated.amount,
            currency: updated.currency,
            status: updated.status,
            processor: updated.processor,
          });
        }
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = (charge.payment_intent as string) || charge.id;
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.processorPaymentId, paymentIntentId));

      if (payment) {
        const refundAmount = charge.amount_refunded
          ? charge.amount_refunded.toString()
          : payment.amount;

        const [updated] = await db
          .update(payments)
          .set({
            status: "refunded",
            refundedAmount: refundAmount,
          })
          .where(eq(payments.id, payment.id))
          .returning();

        if (updated) {
          logger.info({ paymentId: payment.id }, "Synced payment status to refunded via webhook");

          await dispatchWebhookEvent(payment.userId, "refund.succeeded", {
            id: updated.id,
            paymentId: updated.id,
            amount: refundAmount,
            status: "succeeded",
          });
        }
      }
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
