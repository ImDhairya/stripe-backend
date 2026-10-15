import Stripe from "stripe";
import env from "../env";
import {PaymentProcessor, ProcessorPaymentResult, ProcessorRefundResult} from "./types";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20" as any,
});

export class StripeProcessor implements PaymentProcessor {
  async createCharge(amount: number, currency: string, metadata?: Record<string, any>): Promise<ProcessorPaymentResult & { clientSecret?: string }> {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // minor units (cents/paise)
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
      amount: Math.round(amount),
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
    const options = amount ? { amount_to_capture: Math.round(amount) } : {};
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
      status: paymentIntent.status === "canceled" ? "cancelled" : "processing",
    };
  }

  async refund(processorPaymentId: string, amount?: number, reason?: string): Promise<ProcessorRefundResult> {
    const options: Stripe.RefundCreateParams = {
      payment_intent: processorPaymentId,
      amount: amount ? Math.round(amount) : undefined,
      reason: reason as Stripe.RefundCreateParams.Reason,
    };
    const refund = await stripe.refunds.create(options);
    
    return {
      processorRefundId: refund.id,
      status: refund.status === "succeeded" ? "succeeded" : "pending",
    };
  }
}
