import {RequestHandler} from "express";
import {UnauthenticatedError} from "../lib/errors";
import {verifyAccessToken} from "../lib/jwt";
import redis from "../lib/redis";
import {db} from "../db";
import {users} from "../db/models";
import {eq} from "drizzle-orm";

/**
 * Middleware to authenticate requests using JWT from cookies or Authorization header.
 * Attaches the decoded user payload to `res.locals.user`.
 * Synchronizes user tier dynamically from Redis/DB so tier changes reflect immediately.
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

    // Dynamic tier resolution: check Redis cache first, then DB, fallback to payload
    let currentTier = payload.tier;
    try {
      const cachedTier = await redis.get(`user:tier:${payload.id}`);
      if (cachedTier === "free" || cachedTier === "paid") {
        currentTier = cachedTier;
      } else {
        const [dbUser] = await db
          .select({ tier: users.tier })
          .from(users)
          .where(eq(users.id, payload.id));
        if (dbUser?.tier) {
          currentTier = dbUser.tier;
          await redis.set(`user:tier:${payload.id}`, dbUser.tier, "EX", 300).catch(() => {});
        }
      }
    } catch {
      // In case Redis/DB lookup encounters transient issues, fallback to token payload tier
    }

    res.locals.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      tier: currentTier,
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
