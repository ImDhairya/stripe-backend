export interface ProcessorPaymentResult {
  processorPaymentId: string;
  status: "succeeded" | "failed" | "processing" | "authorized" | "cancelled";
}

export interface ProcessorRefundResult {
  processorRefundId: string;
  status: "succeeded" | "failed" | "pending";
}

export interface PaymentProcessor {
  createCharge(amount: number, currency: string, metadata?: Record<string, any>): Promise<ProcessorPaymentResult>;
  authorize(amount: number, currency: string, metadata?: Record<string, any>): Promise<ProcessorPaymentResult>;
  capture(processorPaymentId: string, amount?: number): Promise<ProcessorPaymentResult>;
  cancel(processorPaymentId: string): Promise<ProcessorPaymentResult>;
  refund(processorPaymentId: string, amount?: number, reason?: string): Promise<ProcessorRefundResult>;
}
