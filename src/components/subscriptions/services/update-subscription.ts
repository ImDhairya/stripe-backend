import {eq, and} from "drizzle-orm";
import {db, Transaction} from "../../../db";
import {subscriptions} from "../../../db/models";
import {UpdateSubscriptionSchema} from "../schema";
import {getProcessor} from "../../../lib/processors";
import {NotFoundError} from "../../../lib/errors";

export const updateSubscription = async (
  userId: string,
  userTier: "free" | "paid",
  subscriptionId: string,
  data: UpdateSubscriptionSchema,
  tx: Transaction
) => {
  const [sub] = await tx.select().from(subscriptions).where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));
  if (!sub) {
    throw new NotFoundError("resource:not_found", "subscriptions", "Subscription not found");
  }

  // To know which processor was used, we could store it in DB, but for now we'll assume dummy for free and stripe for paid
  // A robust system would add `processor` column to subscriptions table. Let's assume stripe for now if we didn't add the column.
  // Wait, I should add processor to subscriptions model! Let me just use getProcessor with "dummy" or "stripe" based on sub.processorId format.
  const processorName = sub.processorSubscriptionId.startsWith("dummy") ? "dummy" : "stripe";
  const processor = getProcessor(processorName as "stripe" | "dummy", userTier);
  
  const result = await processor.updateSubscription(sub.processorSubscriptionId, data.planId);

  const [updatedSub] = await tx.update(subscriptions).set({
    planId: data.planId,
    status: result.status,
    currentPeriodStart: result.currentPeriodStart,
    currentPeriodEnd: result.currentPeriodEnd,
  }).where(eq(subscriptions.id, subscriptionId)).returning();

  return updatedSub;
};
