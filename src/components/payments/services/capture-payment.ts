import {eq, and} from "drizzle-orm";
import {db, Transaction} from "../../../db";
import {payments} from "../../../db/models";
import {CapturePaymentSchema} from "../schema";
import {getProcessor} from "../../../lib/processors";
import {NotFoundError, BadRequestError} from "../../../lib/errors";
import {validateStateTransition} from "../../../lib/state-machine";

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

  try {
    validateStateTransition(payment.status, "processing");
  } catch (err: any) {
    throw new BadRequestError("validation:bad_params", err.message);
  }

  const processor = getProcessor(payment.processor as "stripe" | "dummy", userTier);
  const result = await processor.capture(payment.processorPaymentId!, data.amount);

  const [updatedPayment] = await tx.update(payments)
    .set({
      status: result.status,
      capturedAmount: data.amount ? data.amount.toString() : payment.amount,
    })
    .where(eq(payments.id, paymentId))
    .returning();

  return updatedPayment;
};
