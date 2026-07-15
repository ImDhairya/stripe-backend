import Redis from "ioredis";
import env from "./env";

// Singleton Redis instance
const redis = new Redis(env.REDIS_URL);

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

export default redis;
