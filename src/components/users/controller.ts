import {RequestHandler} from "express";
import {db} from "../../db";
import {asyncHandler} from "../../lib/async-handler";
import {generateAccessToken} from "../../lib/jwt";
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  ResetPasswordSchema,
  signupCompleteSchema,
  SignupSchema,
  UpdateProfileSchema,
} from "./schema";
import changePassword from "./services/change-password";
import forgotPassword from "./services/forgot-password";
import login from "./services/login";
import resetPassword from "./services/reset-password";
import signupComplete from "./services/signup-complete";
import signupStart from "./services/signup-start";
import updateProfile from "./services/update-profile";
import getUserById from "./services/get-user-by-id";

// this is a post request here
export const signupStartHandler = asyncHandler<SignupSchema>(
  async (req, res) => {
    const result = await db.transaction(async (tx) => {
      return await signupStart(req.body, tx);
    });

    return res.status(200).json({
      success: true,
      result,
    });
  },
);

export const signupCompleteHandler = asyncHandler<signupCompleteSchema>(
  async (req, res) => {
    try {
      const result = await db.transaction((tx) => {
        return signupComplete(req.body, tx);
      });

      const token = await generateAccessToken(result);
      const day = 24 * 60 * 60 * 1000;

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: day * 7,
      });
      return res.status(200).json({
        success: true,
        message: "Signup completed successfully.",
        data: {
          user: result,
          token,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "An error occurred while completing the signup.",
      });
    }
  },
);
export const loginHandler = asyncHandler<LoginSchema>(async (req, res) => {
  const result = await db.transaction((tx) => {
    return login(req.body, tx);
  });

  const token = await generateAccessToken(result);
  const day = 24 * 60 * 60 * 1000;

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: day * 7, // 7 days
  });

  return res.status(200).json({
    success: true,
    message: "Login successful.",
    data: {
      user: result,
    },
  });
});

export const logoutHandler = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

export const getMeHandler = asyncHandler(async (req, res) => {
  const {id} = res.locals.user;

  const user = await getUserById(id);

  return res.status(200).json({
    success: true,
    data: {user},
  });
});

export const updateProfileHandler = asyncHandler<UpdateProfileSchema>(
  async (req, res) => {
    const {id} = res.locals.user;

    const user = await db.transaction((tx) => {
      return updateProfile(id, req.body, tx);
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: {user},
    });
  },
);

export const changePasswordHandler = asyncHandler<ChangePasswordSchema>(
  async (req, res) => {
    const {id} = res.locals.user;

    const result = await db.transaction((tx) => {
      return changePassword(id, req.body, tx);
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  },
);

export const forgotPasswordHandler =
  asyncHandler<ForgotPasswordSchema>(async (req, res) => {
    const result = await db.transaction((tx) => {
      return forgotPassword(req.body, tx);
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  });

export const resetPasswordHandler =
  asyncHandler<ResetPasswordSchema>(async (req, res) => {
    const result = await db.transaction((tx) => {
      return resetPassword(req.body, tx);
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  });
