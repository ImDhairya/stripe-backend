import {db, Transaction} from "../../../db";
import {payments} from "../../../db/models";
import {CreatePaymentSchema} from "../schema";
import {getProcessor} from "../../../lib/processors";

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
      ...((result as any).clientSecret ? { clientSecret: (result as any).clientSecret } : {})
    },
  }).returning();

  return payment;
};
