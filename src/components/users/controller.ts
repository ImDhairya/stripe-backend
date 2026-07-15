import {RequestHandler} from "express";
import {db} from "../../db";
import {asyncHandler} from "../../lib/async-handler";
import {generateAccessToken, verifyRefreshTokenJWT} from "../../lib/jwt";
import {issueRefreshToken, revokeRefreshToken, rotateRefreshToken} from "../../lib/refresh-token";
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
import { UnauthenticatedError } from "../../lib/errors";

const setAuthCookies = (res: any, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 mins
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

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

      const accessToken = await generateAccessToken(result);
      const refreshToken = await issueRefreshToken(result.id);
      setAuthCookies(res, accessToken, refreshToken);

      return res.status(200).json({
        success: true,
        message: "Signup completed successfully.",
        data: {
          user: { id: result.id, email: result.email, role: result.role, tier: result.tier },
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

  const accessToken = await generateAccessToken(result);
  const refreshToken = await issueRefreshToken(result.id);
  setAuthCookies(res, accessToken, refreshToken);

  return res.status(200).json({
    success: true,
    message: "Login successful.",
    data: {
      user: { id: result.id, email: result.email, role: result.role, tier: result.tier },
    },
  });
});

export const refreshTokenHandler = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new UnauthenticatedError("auth:invalid_token", "Refresh token is missing.");
  }
  try {
    const { newRefreshToken, userId } = await rotateRefreshToken(token);
    const user = await getUserById(userId);
    const newAccessToken = await generateAccessToken(user);
    
    setAuthCookies(res, newAccessToken, newRefreshToken);
    
    return res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully",
    });
  } catch (error) {
    throw new UnauthenticatedError("auth:invalid_token", "Refresh token is invalid or expired.");
  }
});

export const logoutHandler = asyncHandler(async (req, res) => {
  const rToken = req.cookies?.refreshToken;
  if (rToken) {
    try {
      const payload = await verifyRefreshTokenJWT(rToken);
      await revokeRefreshToken(payload.id, payload.jti);
    } catch (err) {
      // Ignore invalid token on logout
    }
  }

  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("token", { httpOnly: true, secure: isProd, sameSite: "lax" });
  res.clearCookie("refreshToken", { httpOnly: true, secure: isProd, sameSite: "lax" });

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
    data: { user: { id: user.id, email: user.email, name: user.name, role: user.role, tier: user.tier } },
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
      data: { user: { id: user.id, email: user.email, name: user.name, role: user.role, tier: user.tier } },
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
