import {eq, and} from "drizzle-orm";
import {Transaction} from "../../../db";
import {payments} from "../../../db/models";
import {CapturePaymentSchema} from "../schema";
import {getProcessor} from "../../../lib/processors";
import {NotFoundError, BadRequestError} from "../../../lib/errors";
import {validateStateTransition} from "../../../lib/state-machine";
import {logAudit} from "../../../lib/audit";
import {dispatchWebhookEvent} from "../../../lib/webhook-dispatcher";

export const capturePayment = async (
  userId: string,
  userTier: "free" | "paid",
  paymentId: string,
  data: CapturePaymentSchema,
  tx: Transaction
) => {
  const [payment] = await tx.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.userId, userId)));
  if (!payment) {
    throw new NotFoundError("resource:not_found", "payments", "Payment not found");
  }

  if (payment.status !== "authorized") {
    throw new BadRequestError("validation:bad_params", `Cannot capture payment with status ${payment.status}. Payment must be in authorized state.`);
  }

  try {
    validateStateTransition(payment.status, "succeeded");
  } catch (err: any) {
    throw new BadRequestError("validation:bad_params", err.message);
  }

  if (data.amount !== undefined && data.amount > Number(payment.amount)) {
    throw new BadRequestError("validation:bad_params", `Capture amount (${data.amount}) cannot exceed authorized amount (${payment.amount})`);
  }

  const processor = getProcessor(payment.processor as "stripe" | "dummy", userTier);
  const result = await processor.capture(payment.processorPaymentId!, data.amount);

  const capturedAmount = data.amount ? data.amount.toString() : payment.amount;

  const [updatedPayment] = await tx.update(payments)
    .set({
      status: result.status,
      capturedAmount,
    })
    .where(eq(payments.id, paymentId))
    .returning();

  if (!updatedPayment) {
    throw new Error("Failed to update payment during capture");
  }

  // Audit log
  await logAudit(tx, {
    userId,
    action: "payment.captured",
    resourceType: "payment",
    resourceId: payment.id,
    metadata: {
      previousStatus: payment.status,
      newStatus: updatedPayment.status,
      capturedAmount,
    },
  });

  // Outbound Webhook on commit
  (tx as any).onCommit?.(async () => {
    await dispatchWebhookEvent(userId, "payment.captured", {
      id: updatedPayment.id,
      previousStatus: payment.status,
      status: updatedPayment.status,
      capturedAmount,
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
      processor: updatedPayment.processor,
      updatedAt: updatedPayment.updatedAt,
    });
  });

  return updatedPayment;
};
