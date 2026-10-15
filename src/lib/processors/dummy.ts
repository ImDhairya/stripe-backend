import {PaymentProcessor, ProcessorPaymentResult, ProcessorRefundResult} from "./types";
import {v4 as uuidv4} from "uuid";

/**
 * Dummy deterministic simulator for free tier.
 * Outcomes depend on the amount:
 * - If amount ends in .99, it fails.
 * - Otherwise, it succeeds.
 */
export class DummyProcessor implements PaymentProcessor {
  private isFailureAmount(amount: number): boolean {
    // Check if amount ends in .99 (either float string ends with .99 or minor units % 100 === 99)
    return Math.round(amount) % 100 === 99 || amount.toString().endsWith(".99");
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
      status: "cancelled",
    };
  }

  async refund(processorPaymentId: string, amount?: number, reason?: string): Promise<ProcessorRefundResult> {
    return {
      processorRefundId: `dummy_re_${uuidv4()}`,
      status: "succeeded",
    };
  }
}
