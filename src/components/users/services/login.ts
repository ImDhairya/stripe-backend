import {db} from "../../../db";
import {errors} from "../../../lib/errors";
import {LoginSchema} from "../schema";
import getUserByEmail from "./get-user-by-email";
import * as argon from "argon2";

export default async (data: LoginSchema, tx: DbConnection = db) => {
  const user = await getUserByEmail(data.email, {db: tx});
  const commonError = new errors.UnauthenticatedError(
    "auth:invalid_credentials",
    "Invalid email or password",
  );

  if (!user) throw commonError;

  if (!user.password) throw commonError;

  const isPasswordValid = await argon.verify(user.password, data.password);

  if (!isPasswordValid) {
    throw commonError;
  }
  const {password, ...safeUser} = user;
  return safeUser;
};
