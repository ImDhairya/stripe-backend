import {db, Transaction} from "../../../db";
import {subscriptions} from "../../../db/models";
import {CreateSubscriptionSchema} from "../schema";
import {getProcessor} from "../../../lib/processors";

export const createSubscription = async (
  userId: string,
  userTier: "free" | "paid",
  stripeCustomerId: string | null,
  data: CreateSubscriptionSchema,
  tx: Transaction
) => {
  const processor = getProcessor(data.processor, userTier);
  
  const customerId = data.processor === "stripe" ? (stripeCustomerId || "cus_fake") : `dummy_cus_${userId}`;
  const result = await processor.createSubscription(customerId, data.planId);

  const [sub] = await tx.insert(subscriptions).values({
    userId,
    planId: data.planId,
    status: result.status,
    processorSubscriptionId: result.processorSubscriptionId,
    currentPeriodStart: result.currentPeriodStart,
    currentPeriodEnd: result.currentPeriodEnd,
  }).returning();

  return sub;
};
