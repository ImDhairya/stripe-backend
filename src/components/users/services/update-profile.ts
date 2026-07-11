import {eq} from "drizzle-orm";
import {db as _db} from "../../../db";
import {users} from "../../../db/models";
import {errors} from "../../../lib/errors";
import {UpdateProfileSchema} from "../schema";
import getUserByEmail from "./get-user-by-email";
import getUserById from "./get-user-by-id";

const updateProfile = async (
  userId: string,
  data: UpdateProfileSchema,
  tx: DbConnection = _db,
) => {
  // If email is being changed, check it's not already taken
  if (data.email) {
    const existing = await getUserByEmail(data.email, {
      shouldThrow: false,
      db: tx,
    });
    if (existing && existing.id !== userId) {
      throw new errors.ConflictError(
        "auth:email_already_exists",
        `User with email ${data.email} already exists`,
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email.toLowerCase();
  updateData.updatedAt = new Date();

  if (Object.keys(updateData).length <= 1) {
    // Only updatedAt — nothing to update
    return await getUserById(userId, {tx});
  }

  await tx.update(users).set(updateData).where(eq(users.id, userId));

  return await getUserById(userId, {tx});
};

export default updateProfile;
