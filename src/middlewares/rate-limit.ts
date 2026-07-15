import {RequestHandler} from "express";
import redis from "../lib/redis";

const WINDOW_SIZE_SECONDS = 60;
const LIMITS = {
  free: 30, // 30 requests per minute
  paid: 300, // 300 requests per minute
};

export const rateLimit: RequestHandler = async (req, res, next) => {
  try {
    const user = res.locals.user;
    if (!user) return next(); // Skip if not authenticated

    const tier = user.tier as "free" | "paid";
    const limit = LIMITS[tier] || LIMITS.free;
    const key = `ratelimit:${user.id}`;
    const now = Date.now();
    const windowStart = now - WINDOW_SIZE_SECONDS * 1000;

    // Redis transaction to clean old requests and count current window
    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.expire(key, WINDOW_SIZE_SECONDS);
    
    const results = await multi.exec();
    if (!results) throw new Error("Redis execution failed");

    // zcard is the 3rd command in multi (index 2)
    const requestCount = results[2]?.[1] as number;

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - requestCount));
    res.setHeader("X-RateLimit-Reset", Math.ceil(now / 1000) + WINDOW_SIZE_SECONDS);

    if (requestCount > limit) {
      return res.status(429).json({
        error: {
          message: "Rate limit exceeded",
          status: 429,
        }
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
