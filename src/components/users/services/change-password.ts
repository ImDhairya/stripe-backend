import {eq} from "drizzle-orm";
import * as argon from "argon2";
import {db as _db} from "../../../db";
import {users} from "../../../db/models";
import {errors} from "../../../lib/errors";
import {ChangePasswordSchema} from "../schema";

const changePassword = async (
  userId: string,
  data: ChangePasswordSchema,
  tx: DbConnection = _db,
) => {
  const user = await tx.query.users.findFirst({
    where: (users, {eq}) => eq(users.id, userId),
  });

  if (!user) {
    throw new errors.NotFoundError(
      "resource:not_found",
      "users",
      "User not found.",
    );
  }

  const isOldPasswordValid = await argon.verify(
    user.password,
    data.oldPassword,
  );

  if (!isOldPasswordValid) {
    throw new errors.UnauthenticatedError(
      "user:invalid_password",
      "Current password is incorrect.",
    );
  }

  const hashedNewPassword = await argon.hash(data.newPassword);

  await tx
    .update(users)
    .set({password: hashedNewPassword, updatedAt: new Date()})
    .where(eq(users.id, userId));

  return {message: "Password changed successfully."};
};

export default changePassword;
