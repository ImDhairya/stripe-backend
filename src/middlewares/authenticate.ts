import {RequestHandler} from "express";
import {UnauthenticatedError} from "../lib/errors";
import {verifyAccessToken} from "../lib/jwt";

/**
 * Middleware to authenticate requests using JWT from cookies or Authorization header.
 * Attaches the decoded user payload to `res.locals.user`.
 */
export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new UnauthenticatedError(
        "auth:invalid_token",
        "Authentication token is missing.",
      );
    }

    const payload = await verifyAccessToken(token);

    if (!payload.id || !payload.email) {
      throw new UnauthenticatedError(
        "auth:invalid_token",
        "Invalid authentication token.",
      );
    }

    res.locals.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      tier: payload.tier,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      next(error);
    } else {
      next(
        new UnauthenticatedError(
          "auth:invalid_token",
          "Authentication token is invalid or expired.",
        ),
      );
    }
  }
};
