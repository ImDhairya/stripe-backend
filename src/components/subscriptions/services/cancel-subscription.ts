import {eq, and} from "drizzle-orm";
import {db, Transaction} from "../../../db";
import {subscriptions} from "../../../db/models";
import {CancelSubscriptionSchema} from "../schema";
import {getProcessor} from "../../../lib/processors";
import {NotFoundError} from "../../../lib/errors";

export const cancelSubscription = async (
  userId: string,
  userTier: "free" | "paid",
  subscriptionId: string,
  data: CancelSubscriptionSchema,
  tx: Transaction
) => {
  const [sub] = await tx.select().from(subscriptions).where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));
  if (!sub) {
    throw new NotFoundError("resource:not_found", "subscriptions", "Subscription not found");
  }

  const processorName = sub.processorSubscriptionId.startsWith("dummy") ? "dummy" : "stripe";
  const processor = getProcessor(processorName as "stripe" | "dummy", userTier);
  
  const result = await processor.cancelSubscription(sub.processorSubscriptionId, data.immediate);

  const updateData: any = {
    status: result.status,
    currentPeriodStart: result.currentPeriodStart,
    currentPeriodEnd: result.currentPeriodEnd,
  };
  
  if (!data.immediate) {
    updateData.cancelAtPeriodEnd = result.currentPeriodEnd;
  }

  const [updatedSub] = await tx.update(subscriptions)
    .set(updateData)
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  return updatedSub;
};
