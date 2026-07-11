import {eq} from "drizzle-orm";
import {hash} from "argon2";
import {db as _db} from "../../../db";
import {users} from "../../../db/models";
import {errors} from "../../../lib/errors";
import {verifyVerificationToken} from "../../../lib/jwt";
import {ResetPasswordSchema} from "../schema";
import getUserByEmail from "./get-user-by-email";

const resetPassword = async (
  data: ResetPasswordSchema,
  tx: DbConnection = _db,
) => {
  const email = await verifyVerificationToken(data.token);

  const user = await getUserByEmail(email, {shouldThrow: false, db: tx});

  if (!user) {
    throw new errors.NotFoundError(
      "resource:not_found",
      "users",
      "User not found.",
    );
  }

  const hashedPassword = await hash(data.newPassword);

  await tx
    .update(users)
    .set({password: hashedPassword, updatedAt: new Date()})
    .where(eq(users.id, user.id));

  return {message: "Password has been reset successfully."};
};

export default resetPassword;
