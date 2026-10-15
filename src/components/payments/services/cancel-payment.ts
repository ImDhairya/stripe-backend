import {eq, and} from "drizzle-orm";
import {Transaction} from "../../../db";
import {payments} from "../../../db/models";
import {getProcessor} from "../../../lib/processors";
import {NotFoundError, BadRequestError} from "../../../lib/errors";
import {validateStateTransition} from "../../../lib/state-machine";
import {logAudit} from "../../../lib/audit";
import {dispatchWebhookEvent} from "../../../lib/webhook-dispatcher";

export const cancelPayment = async (
  userId: string,
  userTier: "free" | "paid",
  paymentId: string,
  tx: Transaction
) => {
  const [payment] = await tx.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.userId, userId)));
  if (!payment) {
    throw new NotFoundError("resource:not_found", "payments", "Payment not found");
  }

  try {
    validateStateTransition(payment.status, "cancelled");
  } catch (err: any) {
    throw new BadRequestError("validation:bad_params", err.message);
  }

  const processor = getProcessor(payment.processor as "stripe" | "dummy", userTier);
  const result = await processor.cancel(payment.processorPaymentId!);

  const [updatedPayment] = await tx.update(payments)
    .set({
      status: result.status,
    })
    .where(eq(payments.id, paymentId))
    .returning();

  if (!updatedPayment) {
    throw new Error("Failed to update payment during cancellation");
  }

  // Audit log
  await logAudit(tx, {
    userId,
    action: "payment.cancelled",
    resourceType: "payment",
    resourceId: payment.id,
    metadata: {
      previousStatus: payment.status,
      newStatus: updatedPayment.status,
    },
  });

  // Outbound Webhook on commit
  (tx as any).onCommit?.(async () => {
    await dispatchWebhookEvent(userId, "payment.cancelled", {
      id: updatedPayment.id,
      previousStatus: payment.status,
      status: updatedPayment.status,
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
      processor: updatedPayment.processor,
      updatedAt: updatedPayment.updatedAt,
    });
  });

  return updatedPayment;
};
