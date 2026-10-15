import {asyncHandler} from "../../lib/async-handler";
import {outboundQueue, inboundQueue} from "../../lib/bullmq";
import {client} from "../../lib/metrics";
import redis from "../../lib/redis";
import {db} from "../../db";
import {sql} from "drizzle-orm";

export const getSystemTelemetryHandler = asyncHandler(async (req, res) => {
  const user = res.locals.user;

  // 1. BullMQ Queue Counts
  const [outboundCounts, inboundCounts] = await Promise.all([
    outboundQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    inboundQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
  ]);

  // 2. Metrics as JSON
  const metricsJson = await client.register.getMetricsAsJSON();

  // Find webhook lag gauge
  const lagMetric = metricsJson.find((m) => m.name === "webhook_processing_lag_seconds");
  const webhookLagSeconds = (lagMetric?.values?.[0] as any)?.value ?? 0;

  // 3. Live Redis & Postgres Latencies
  let redisLatencyMs = 0;
  try {
    const t0 = Date.now();
    await redis.ping();
    redisLatencyMs = Date.now() - t0;
  } catch (e) {
    redisLatencyMs = -1;
  }

  let postgresLatencyMs = 0;
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    postgresLatencyMs = Date.now() - t0;
  } catch (e) {
    postgresLatencyMs = -1;
  }

  // 4. Current user rate-limit & monthly quota usage
  let userRateLimit = { current: 0, limit: 30, remaining: 30 };
  let userQuota = {
    count: 0,
    countLimit: 100,
    volume: 0,
    volumeLimit: 500000,
    monthKey: new Date().toISOString().slice(0, 7),
  };

  if (user) {
    const tier = user.tier as "free" | "paid";
    const rlLimit = tier === "paid" ? 300 : 30;
    const now = Date.now();
    const windowStart = now - 60000;
    const rateLimitKey = `ratelimit:${user.id}`;
    
    try {
      const rlCount = await redis.zcount(rateLimitKey, windowStart, now);
      userRateLimit = {
        current: rlCount,
        limit: rlLimit,
        remaining: Math.max(0, rlLimit - rlCount),
      };
    } catch (e) {}

    const monthKey = new Date().toISOString().slice(0, 7);
    const countKey = `quota:count:${user.id}:${monthKey}`;
    const volumeKey = `quota:volume:${user.id}:${monthKey}`;

    try {
      const [cVal, vVal] = await Promise.all([
        redis.get(countKey),
        redis.get(volumeKey),
      ]);
      const quotaLimits = tier === "paid"
        ? { count: 10000, volume: 50000000 }
        : { count: 100, volume: 500000 };

      userQuota = {
        count: Number(cVal || 0),
        countLimit: quotaLimits.count,
        volume: Number(vVal || 0),
        volumeLimit: quotaLimits.volume,
        monthKey,
      };
    } catch (e) {}
  }

  return res.status(200).json({
    success: true,
    data: {
      queues: {
        outbound: outboundCounts,
        inbound: inboundCounts,
      },
      webhookLagSeconds,
      latency: {
        redisMs: redisLatencyMs,
        postgresMs: postgresLatencyMs,
      },
      userUsage: {
        rateLimit: userRateLimit,
        quota: userQuota,
      },
      metrics: metricsJson,
    },
  });
});
