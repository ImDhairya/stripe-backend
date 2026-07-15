export interface ProcessorPaymentResult {
  processorPaymentId: string;
  status: "succeeded" | "failed" | "processing" | "authorized";
}

export interface ProcessorRefundResult {
  processorRefundId: string;
  status: "succeeded" | "failed" | "pending";
}

export interface ProcessorSubscriptionResult {
  processorSubscriptionId: string;
  status: "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "paused";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export interface PaymentProcessor {
  createCharge(amount: number, currency: string, metadata?: Record<string, any>): Promise<ProcessorPaymentResult>;
  authorize(amount: number, currency: string, metadata?: Record<string, any>): Promise<ProcessorPaymentResult>;
  capture(processorPaymentId: string, amount?: number): Promise<ProcessorPaymentResult>;
  cancel(processorPaymentId: string): Promise<ProcessorPaymentResult>;
  refund(processorPaymentId: string, amount?: number, reason?: string): Promise<ProcessorRefundResult>;

  // Subscriptions
  createSubscription(customerId: string, priceId: string): Promise<ProcessorSubscriptionResult>;
  updateSubscription(processorSubscriptionId: string, newPriceId: string): Promise<ProcessorSubscriptionResult>;
  cancelSubscription(processorSubscriptionId: string, immediate?: boolean): Promise<ProcessorSubscriptionResult>;
}
