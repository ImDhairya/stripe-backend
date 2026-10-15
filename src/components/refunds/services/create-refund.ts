import {eq, and} from "drizzle-orm";
import {Transaction} from "../../../db";
import {payments, refunds} from "../../../db/models";
import {CreateRefundSchema} from "../schema";
import {getProcessor} from "../../../lib/processors";
import {NotFoundError, BadRequestError} from "../../../lib/errors";
import {validateStateTransition} from "../../../lib/state-machine";
import {logAudit} from "../../../lib/audit";
import {dispatchWebhookEvent} from "../../../lib/webhook-dispatcher";

export const createRefund = async (
  userId: string,
  userTier: "free" | "paid",
  paymentId: string,
  data: CreateRefundSchema,
  tx: Transaction
) => {
  const [payment] = await tx.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.userId, userId)));
  if (!payment) {
    throw new NotFoundError("resource:not_found", "payments", "Payment not found");
  }

  try {
    validateStateTransition(payment.status, "refunded");
  } catch (err: any) {
    throw new BadRequestError("validation:bad_params", "Cannot refund payment in its current state.");
  }

  const processor = getProcessor(payment.processor as "stripe" | "dummy", userTier);
  const result = await processor.refund(payment.processorPaymentId!, data.amount, data.reason);

  const refundAmount = data.amount ? data.amount.toString() : (payment.capturedAmount || payment.amount);

  const [refund] = await tx.insert(refunds).values({
    userId,
    paymentId,
    amount: refundAmount,
    status: result.status,
    processorRefundId: result.processorRefundId,
    reason: data.reason,
  }).returning();

  if (!refund) {
    throw new Error("Failed to insert refund");
  }

  // If refund immediately succeeded, update payment refunded amount
  if (result.status === "succeeded") {
    const newRefundedAmount = Number(payment.refundedAmount || 0) + Number(refund.amount);
    const newPaymentStatus = newRefundedAmount >= Number(payment.capturedAmount || payment.amount) ? "refunded" : payment.status;

    await tx.update(payments)
      .set({
        refundedAmount: newRefundedAmount.toString(),
        status: newPaymentStatus,
      })
      .where(eq(payments.id, paymentId));
  }

  // Audit log
  await logAudit(tx, {
    userId,
    action: "payment.refunded",
    resourceType: "refund",
    resourceId: refund.id,
    metadata: {
      paymentId,
      refundAmount: refund.amount,
      reason: refund.reason,
      status: refund.status,
    },
  });

  // Outbound Webhook on commit
  (tx as any).onCommit?.(async () => {
    const eventType = refund.status === "succeeded" ? "refund.succeeded" : "refund.pending";
    await dispatchWebhookEvent(userId, eventType, {
      id: refund.id,
      paymentId: refund.paymentId,
      amount: refund.amount,
      status: refund.status,
      reason: refund.reason,
      createdAt: refund.createdAt,
    });
  });

  return refund;
};
