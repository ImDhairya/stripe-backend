import {eq} from "drizzle-orm";
import {db, Transaction} from "../../../db";
import {users} from "../../../db/models";
import {NotFoundError} from "../../../lib/errors";

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

  return user;
};

export default upgradeUser;
