export type PaymentStatus =
  | "requires_payment_method"
  | "processing"
  | "authorized"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

const VALID_TRANSITIONS: Record<PaymentStatus, Set<PaymentStatus>> = {
  requires_payment_method: new Set(["processing", "authorized", "succeeded", "failed", "cancelled"]),
  processing: new Set(["authorized", "succeeded", "failed", "cancelled"]),
  authorized: new Set(["processing", "succeeded", "cancelled"]),
  succeeded: new Set(["refunded"]),
  failed: new Set([]),
  cancelled: new Set([]),
  refunded: new Set([]),
};

export const validateStateTransition = (currentStatus: PaymentStatus, newStatus: PaymentStatus): void => {
  if (currentStatus === newStatus) return; // Ignore no-ops
  
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed.has(newStatus)) {
    throw new Error(`Invalid state transition from ${currentStatus} to ${newStatus}`);
  }
};
