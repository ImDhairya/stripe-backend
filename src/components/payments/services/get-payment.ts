import Stripe from "stripe";
import env from "../../../lib/env";
import {eq, and} from "drizzle-orm";
import {db} from "../../../db";
import {payments} from "../../../db/models";
import {NotFoundError} from "../../../lib/errors";

export const getPayment = async (
  userId: string,
  paymentId: string
) => {
  let [payment] = await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.userId, userId)));
  if (!payment) {
    throw new NotFoundError("resource:not_found", "payments", "Payment not found");
  }

  // Sync with Stripe if status is pending
  if (payment.processor === "stripe" && (payment.status === "requires_payment_method" || payment.status === "processing")) {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });
    
    try {
      const intent = await stripe.paymentIntents.retrieve(payment.processorPaymentId);
      const newStatus = intent.status === "succeeded" ? "succeeded" : 
                        intent.status === "requires_capture" ? "authorized" : 
                        intent.status === "canceled" ? "failed" : payment.status;
      
      if (newStatus !== payment.status) {
        const [updated] = await db.update(payments)
          .set({ status: newStatus as any, updatedAt: new Date() })
          .where(eq(payments.id, payment.id))
          .returning();
        payment = updated;
      }
    } catch (e) {
      // Ignore stripe retrieve errors to still return the DB payment
    }
  }

  return payment;
};
