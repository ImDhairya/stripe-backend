import {Transaction} from "../../../db";
import {payments} from "../../../db/models";
import {CreatePaymentSchema} from "../schema";
import {getProcessor} from "../../../lib/processors";
import {logAudit} from "../../../lib/audit";
import {dispatchWebhookEvent} from "../../../lib/webhook-dispatcher";

export const createPayment = async (
  userId: string,
  userTier: "free" | "paid",
  idempotencyKey: string,
  data: CreatePaymentSchema,
  tx: Transaction
) => {
  const processor = getProcessor(data.processor, userTier);
  
  let result;
  if (data.captureMethod === "manual") {
    result = await processor.authorize(data.amount, data.currency, data.metadata);
  } else {
    result = await processor.createCharge(data.amount, data.currency, data.metadata);
  }

  const [payment] = await tx.insert(payments).values({
    userId,
    amount: data.amount.toString(),
    currency: data.currency,
    status: result.status,
    processor: data.processor,
    processorPaymentId: result.processorPaymentId,
    idempotencyKey,
    metadata: { 
      ...(data.metadata || {}), 
      ...(data.description ? { description: data.description } : {}),
      ...((result as any).clientSecret ? { clientSecret: (result as any).clientSecret } : {})
    },
  }).returning();

  if (!payment) {
    throw new Error("Failed to insert payment");
  }

  // Audit log
  await logAudit(tx, {
    userId,
    action: "payment.created",
    resourceType: "payment",
    resourceId: payment.id,
    metadata: {
      amount: payment.amount,
      currency: payment.currency,
      processor: payment.processor,
      captureMethod: data.captureMethod,
      status: payment.status,
    },
  });

  // Outbound Webhook on commit
  (tx as any).onCommit?.(async () => {
    const eventType =
      payment.status === "authorized"
        ? "payment.authorized"
        : payment.status === "succeeded"
        ? "payment.succeeded"
        : "payment.failed";

    await dispatchWebhookEvent(userId, eventType, {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      processor: payment.processor,
      captureMethod: data.captureMethod,
      metadata: payment.metadata,
      createdAt: payment.createdAt,
    });
  });

  return payment;
};
