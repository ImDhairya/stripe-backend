import {eq, and} from "drizzle-orm";
import {db, Transaction} from "../../../db";
import {payments, refunds} from "../../../db/models";
import {CreateRefundSchema} from "../schema";
import {getProcessor} from "../../../lib/processors";
import {NotFoundError, BadRequestError} from "../../../lib/errors";
import {validateStateTransition} from "../../../lib/state-machine";

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

  const [refund] = await tx.insert(refunds).values({
    userId,
    paymentId,
    amount: data.amount ? data.amount.toString() : (payment.capturedAmount || payment.amount),
    status: result.status,
    processorRefundId: result.processorRefundId,
    reason: data.reason,
  }).returning();

  // If refund immediately succeeded, update payment refunded amount
  if (result.status === "succeeded") {
    const newRefundedAmount = Number(payment.refundedAmount || 0) + Number(refund!.amount);
    const newPaymentStatus = newRefundedAmount >= Number(payment.capturedAmount || payment.amount) ? "refunded" : payment.status;

    await tx.update(payments)
      .set({
        refundedAmount: newRefundedAmount.toString(),
        status: newPaymentStatus,
      })
      .where(eq(payments.id, paymentId));
  }

  return refund;
};
