import {eq, and} from "drizzle-orm";
import {db} from "../../../db";
import {subscriptions} from "../../../db/models";
import {NotFoundError} from "../../../lib/errors";

export const getSubscription = async (
  userId: string,
  subscriptionId: string
) => {
  const [sub] = await db.select().from(subscriptions).where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)));
  if (!sub) {
    throw new NotFoundError("resource:not_found", "subscriptions", "Subscription not found");
  }
  return sub;
};
