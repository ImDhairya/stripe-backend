import {PaymentProcessor, ProcessorPaymentResult, ProcessorRefundResult, ProcessorSubscriptionResult} from "./types";
import {v4 as uuidv4} from "uuid";

/**
 * Dummy deterministic simulator for free tier.
 * Outcomes depend on the amount:
 * - If amount ends in .99, it fails.
 * - Otherwise, it succeeds.
 */
export class DummyProcessor implements PaymentProcessor {
  private isFailureAmount(amount: number): boolean {
    // Check if amount ends in .99
    return amount.toString().endsWith(".99");
  }

  async createCharge(amount: number, currency: string, metadata?: Record<string, any>): Promise<ProcessorPaymentResult> {
    if (this.isFailureAmount(amount)) {
      return {
        processorPaymentId: `dummy_ch_${uuidv4()}`,
        status: "failed",
      };
    }
    return {
      processorPaymentId: `dummy_ch_${uuidv4()}`,
      status: "succeeded",
    };
  }

  async authorize(amount: number, currency: string, metadata?: Record<string, any>): Promise<ProcessorPaymentResult> {
    if (this.isFailureAmount(amount)) {
      return {
        processorPaymentId: `dummy_pi_${uuidv4()}`,
        status: "failed",
      };
    }
    return {
      processorPaymentId: `dummy_pi_${uuidv4()}`,
      status: "authorized",
    };
  }

  async capture(processorPaymentId: string, amount?: number): Promise<ProcessorPaymentResult> {
    return {
      processorPaymentId,
      status: "succeeded",
    };
  }

  async cancel(processorPaymentId: string): Promise<ProcessorPaymentResult> {
    return {
      processorPaymentId,
      status: "failed", // effectively failed/cancelled
    };
  }

  async refund(processorPaymentId: string, amount?: number, reason?: string): Promise<ProcessorRefundResult> {
    return {
      processorRefundId: `dummy_re_${uuidv4()}`,
      status: "succeeded",
    };
  }

  async createSubscription(customerId: string, priceId: string): Promise<ProcessorSubscriptionResult> {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);
    
    return {
      processorSubscriptionId: `dummy_sub_${uuidv4()}`,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
    };
  }

  async updateSubscription(processorSubscriptionId: string, newPriceId: string): Promise<ProcessorSubscriptionResult> {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);
    
    return {
      processorSubscriptionId,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
    };
  }

  async cancelSubscription(processorSubscriptionId: string, immediate?: boolean): Promise<ProcessorSubscriptionResult> {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);

    return {
      processorSubscriptionId,
      status: immediate ? "canceled" : "active",
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
    };
  }
}
