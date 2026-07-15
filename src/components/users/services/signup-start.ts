import {db} from "../../../db";

import {errors} from "../../../lib/errors";
import {generateVerificationToken} from "../../../lib/jwt";
import urls from "../../../lib/urls";
import {SignupSchema} from "../schema";
import getUserByEmail from "./get-user-by-email";

export default async (data: SignupSchema, tx: DbConnection = db) => {
  const user = await getUserByEmail(data.email, {shouldThrow: false});

  if (user) {
    throw new errors.ConflictError(
      "auth:email_already_exists",
      `User with email ${data.email} already exists`,
    );
  }

  const token = await generateVerificationToken(data.email);

  const verificationLink = urls.generateSignupUrl({token, email: data.email});

  console.log(`Sending verification email to ${data.email} with link: ${verificationLink}`);

  return verificationLink;
};
