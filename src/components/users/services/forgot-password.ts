import {db as _db} from "../../../db";
import {generateVerificationToken} from "../../../lib/jwt";
import env from "../../../lib/env";
import {ForgotPasswordSchema} from "../schema";
import getUserByEmail from "./get-user-by-email";

const forgotPassword = async (
  data: ForgotPasswordSchema,
  tx: DbConnection = _db,
) => {
  const user = await getUserByEmail(data.email, {shouldThrow: false, db: tx});

  // Always return success to avoid leaking whether the email exists
  if (!user) {
    return {message: "If that email exists, a reset link has been sent."};
  }

  const token = await generateVerificationToken(data.email);

  const resetLink = `${env.FRONTEND_URL}/auth?mode=reset-password&token=${token}&email=${encodeURIComponent(data.email)}`;

  // TODO: Uncomment when email service is ready
  // await send({
  //   to: data.email,
  //   data: { resetLink },
  //   template: "forgot-password",
  // });

  return {
    message: "If that email exists, a reset link has been sent.",
    // Remove resetLink in production — only here for dev convenience
    resetLink,
  };
};

export default forgotPassword;
