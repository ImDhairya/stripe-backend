import {RequestHandler} from "express";
import redis from "../lib/redis";

const QUOTA_WINDOW_MONTH = 30 * 24 * 60 * 60; // 30 days roughly

const QUOTAS = {
  free: { count: 100, volume: 500000 }, // Max 100 payments or $5000 volume per month
  paid: { count: 10000, volume: 500000 },
};

export const quota: RequestHandler = async (req, res, next) => {
  try {
    const user = res.locals.user;
    if (!user) return next();

    const tier = user.tier as "free" | "paid";
    const limits = QUOTAS[tier] || QUOTAS.free;
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const countKey = `quota:count:${user.id}:${monthKey}`;
    const volumeKey = `quota:volume:${user.id}:${monthKey}`;

    const amount = Number(req.body.amount || 0);

    const [currentCount, currentVolume] = await Promise.all([
      redis.get(countKey),
      redis.get(volumeKey)
    ]);

    const nextCount = Number(currentCount || 0) + 1;
    const nextVolume = Number(currentVolume || 0) + amount;

    if (nextCount > limits.count) {
      return res.status(402).json({
        error: { message: "Monthly transaction count quota exceeded", status: 402 }
      });
    }

    if (nextVolume > limits.volume) {
      return res.status(402).json({
        error: { message: "Monthly transaction volume quota exceeded", status: 402 }
      });
    }

    // Intercept response to only increment on success
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const multi = redis.multi();
        multi.incr(countKey);
        multi.incrbyfloat(volumeKey, amount);
        multi.expire(countKey, QUOTA_WINDOW_MONTH);
        multi.expire(volumeKey, QUOTA_WINDOW_MONTH);
        multi.exec().catch(console.error);
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
};
