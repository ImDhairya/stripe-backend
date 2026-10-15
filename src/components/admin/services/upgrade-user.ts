import {eq} from "drizzle-orm";
import {Transaction} from "../../../db";
import {users} from "../../../db/models";
import {NotFoundError} from "../../../lib/errors";
import {logAudit} from "../../../lib/audit";
import redis from "../../../lib/redis";

const upgradeUser = async (
  userId: string,
  tier: "free" | "paid",
  tx: Transaction,
) => {
  const [user] = await tx
    .update(users)
    .set({tier})
    .where(eq(users.id, userId))
    .returning();

  if (!user) {
    throw new NotFoundError("resource:not_found", "users", "User not found");
  }

  // Update Redis cache immediately so active user sessions get the new tier instantaneously
  await redis.set(`user:tier:${userId}`, tier, "EX", 86400).catch(console.error);

  // Audit log
  await logAudit(tx, {
    userId,
    action: "user.tier_updated",
    resourceType: "user",
    resourceId: userId,
    metadata: {
      targetUserId: userId,
      newTier: tier,
    },
  });

  return user;
};

export default upgradeUser;
