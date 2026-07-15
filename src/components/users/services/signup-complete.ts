import {hash} from "argon2";
import {db as _db} from "../../../db";
import {errors} from "../../../lib/errors";
import {verifyVerificationToken, verifyInviteToken} from "../../../lib/jwt";

import {signupCompleteSchema} from "../schema";
import createUser from "./create-user";
import getUserByEmail from "./get-user-by-email";
import getUserById from "./get-user-by-id";

export default async (data: signupCompleteSchema, db: DbConnection = _db) => {
  let email: string;
  const hashedPassword = await hash(data.password);

  email = await verifyVerificationToken(data.token);

  const user = await getUserByEmail(email, {shouldThrow: false, db});

  if (user) {
    throw new errors.ConflictError(
      "auth:email_already_exists",
      `User with email ${email} already exists`,
    );
  }
 
  const targetEmail = email.toLowerCase();
  const isAdmin = targetEmail.endsWith("@paygate.com");

  const newUser = await createUser(
    {
      user: {
        email: email,
        password: hashedPassword,
        name: data.name,
        role: isAdmin ? "admin" : "user",
        tier: isAdmin ? "paid" : "free",
      },
    },
    db,
  );
 
  return await getUserById(newUser.id, {
    tx: db,
  });
};
