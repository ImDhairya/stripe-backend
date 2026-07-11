import {RequestHandler} from "express";
import env from "../lib/env";
import {UnauthenticatedError} from "../lib/errors";

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

    const jose = await import("jose");
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(env.ACCESS_TOKEN_SECRET);

    const {payload} = await jose.jwtVerify(token, secretKey);

    if (!payload.id || !payload.email) {
      throw new UnauthenticatedError(
        "auth:invalid_token",
        "Invalid authentication token.",
      );
    }

    res.locals.user = {
      id: payload.id as string,
      email: payload.email as string,
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
