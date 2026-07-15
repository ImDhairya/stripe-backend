import Stripe from "stripe";
import env from "../env";
import {PaymentProcessor, ProcessorPaymentResult, ProcessorRefundResult, ProcessorSubscriptionResult} from "./types";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20" as any,
});

export class StripeProcessor implements PaymentProcessor {
  async createCharge(amount: number, currency: string, metadata?: Record<string, any>): Promise<ProcessorPaymentResult & { clientSecret?: string }> {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency,
      metadata,
      automatic_payment_methods: { enabled: true }
    });

    return {
      processorPaymentId: paymentIntent.id,
      status: paymentIntent.status === "succeeded" ? "succeeded" : "processing",
      clientSecret: paymentIntent.client_secret || undefined,
    };
  }

  async authorize(amount: number, currency: string, metadata?: Record<string, any>): Promise<ProcessorPaymentResult & { clientSecret?: string }> {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata,
      capture_method: "manual",
      automatic_payment_methods: { enabled: true }
    });

    return {
      processorPaymentId: paymentIntent.id,
      status: paymentIntent.status === "requires_capture" ? "authorized" : "processing",
      clientSecret: paymentIntent.client_secret || undefined,
    };
  }

  async capture(processorPaymentId: string, amount?: number): Promise<ProcessorPaymentResult> {
    const options = amount ? { amount_to_capture: Math.round(amount * 100) } : {};
    const paymentIntent = await stripe.paymentIntents.capture(processorPaymentId, options);
    
    return {
      processorPaymentId: paymentIntent.id,
      status: paymentIntent.status === "succeeded" ? "succeeded" : "processing",
    };
  }

  async cancel(processorPaymentId: string): Promise<ProcessorPaymentResult> {
    const paymentIntent = await stripe.paymentIntents.cancel(processorPaymentId);
    
    return {
      processorPaymentId: paymentIntent.id,
      status: paymentIntent.status === "canceled" ? "failed" : "processing",
    };
  }

  async refund(processorPaymentId: string, amount?: number, reason?: string): Promise<ProcessorRefundResult> {
    const options: Stripe.RefundCreateParams = {
      payment_intent: processorPaymentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason as Stripe.RefundCreateParams.Reason,
    };
    const refund = await stripe.refunds.create(options);
    
    return {
      processorRefundId: refund.id,
      status: refund.status === "succeeded" ? "succeeded" : "pending",
    };
  }

  async createSubscription(customerId: string, priceId: string): Promise<ProcessorSubscriptionResult> {
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    return {
      processorSubscriptionId: sub.id,
      status: sub.status as any,
      currentPeriodStart: new Date((sub as any).current_period_start * 1000),
      currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
    };
  }

  async updateSubscription(processorSubscriptionId: string, newPriceId: string): Promise<ProcessorSubscriptionResult> {
    const sub = await stripe.subscriptions.retrieve(processorSubscriptionId);
    const updatedSub = await stripe.subscriptions.update(processorSubscriptionId, {
      items: [{
        id: sub.items.data[0]!.id,
        price: newPriceId,
      }],
      proration_behavior: "create_prorations",
    });

    return {
      processorSubscriptionId: updatedSub.id,
      status: updatedSub.status as any,
      currentPeriodStart: new Date((updatedSub as any).current_period_start * 1000),
      currentPeriodEnd: new Date((updatedSub as any).current_period_end * 1000),
    };
  }

  async cancelSubscription(processorSubscriptionId: string, immediate?: boolean): Promise<ProcessorSubscriptionResult> {
    let sub: Stripe.Subscription;
    if (immediate) {
      sub = await stripe.subscriptions.cancel(processorSubscriptionId);
    } else {
      sub = await stripe.subscriptions.update(processorSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return {
      processorSubscriptionId: sub.id,
      status: sub.status as any,
      currentPeriodStart: new Date((sub as any).current_period_start * 1000),
      currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
    };
  }
}
