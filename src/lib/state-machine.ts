export type PaymentStatus =
  | "requires_payment_method"
  | "processing"
  | "authorized"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

const VALID_TRANSITIONS: Record<PaymentStatus, Set<PaymentStatus>> = {
  requires_payment_method: new Set(["processing", "failed", "cancelled"]), // failed/cancelled can happen if aborted early
  processing: new Set(["authorized", "succeeded", "failed"]),
  authorized: new Set(["succeeded", "cancelled"]),
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

export type SubscriptionStatus = 
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

const VALID_SUB_TRANSITIONS: Record<SubscriptionStatus, Set<SubscriptionStatus>> = {
  incomplete: new Set(["active", "incomplete_expired", "canceled"]),
  incomplete_expired: new Set([]),
  trialing: new Set(["active", "past_due", "canceled"]),
  active: new Set(["past_due", "canceled", "unpaid", "paused"]),
  past_due: new Set(["active", "canceled", "unpaid"]),
  unpaid: new Set(["active", "canceled"]),
  paused: new Set(["active", "canceled"]),
  canceled: new Set([]),
};

export const validateSubscriptionTransition = (currentStatus: SubscriptionStatus, newStatus: SubscriptionStatus): void => {
  if (currentStatus === newStatus) return;
  
  const allowed = VALID_SUB_TRANSITIONS[currentStatus];
  if (!allowed.has(newStatus)) {
    throw new Error(`Invalid subscription transition from ${currentStatus} to ${newStatus}`);
  }
};
